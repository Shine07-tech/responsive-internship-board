
"use strict";

require("dotenv").config();

const Database = require("better-sqlite3");
const path = require("path");

const {
  pool,
  initializeDatabase,
  closeDatabase,
} = require("./database");

async function migrateData() {
  let sqlite;
  let client;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing from backend/.env");
    }

    const sqlitePath = path.join(__dirname, "internships.db");

    sqlite = new Database(sqlitePath, { readonly: true });

    console.log("Reading local SQLite database...");

    const internships = sqlite
      .prepare("SELECT * FROM internships ORDER BY id")
      .all();

    const applications = sqlite
      .prepare("SELECT * FROM applications ORDER BY id")
      .all();

    console.log(`Found ${internships.length} local internships.`);
    console.log(`Found ${applications.length} local applications.`);

    await initializeDatabase();

    client = await pool.connect();

    let copiedInternships = 0;
    let copiedApplications = 0;

    await client.query("BEGIN");

    // Migrate internships.
    for (const item of internships) {
      const skills =
        typeof item.skills === "string"
          ? JSON.parse(item.skills)
          : item.skills;

      const result = await client.query(
        `
          INSERT INTO internships
          (id, title, domain, mode, location, skills, openings)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [
          item.id,
          item.title,
          item.domain,
          item.mode,
          item.location,
          JSON.stringify(skills),
          item.openings,
        ]
      );

      copiedInternships += result.rowCount;
    }

    // Migrate existing applications, preserving their IDs.
    for (const item of applications) {
      const result = await client.query(
        `
          INSERT INTO applications
          (id, internship_id, name, email, portfolio, created_at)
          VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [
          item.id,
          item.internship_id,
          item.name,
          item.email,
          item.portfolio || "",
          item.created_at || null,
        ]
      );

      copiedApplications += result.rowCount;
    }

    // Keep the PostgreSQL application ID sequence in sync.
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('applications', 'id'),
        COALESCE((SELECT MAX(id) FROM applications), 1),
        EXISTS (SELECT 1 FROM applications)
      )
    `);

    await client.query("COMMIT");

    const internshipCount = await client.query(
      "SELECT COUNT(*)::int AS total FROM internships"
    );

    const applicationCount = await client.query(
      "SELECT COUNT(*)::int AS total FROM applications"
    );

    console.log("\n========== NEON MIGRATION SUMMARY ==========");
    console.log(`Local internships: ${internships.length}`);
    console.log(`New internships copied: ${copiedInternships}`);
    console.log(`Local applications: ${applications.length}`);
    console.log(`New applications copied: ${copiedApplications}`);
    console.log(
      `Total internships in Neon: ${internshipCount.rows[0].total}`
    );
    console.log(
      `Total applications in Neon: ${applicationCount.rows[0].total}`
    );
    console.log("============================================");
    console.log("Neon migration completed successfully!");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("\nNeon migration failed:", error.message);
    process.exitCode = 1;

  } finally {
    if (client) {
      client.release();
    }

    if (sqlite) {
      sqlite.close();
    }

    await closeDatabase();
  }
}

migrateData();
