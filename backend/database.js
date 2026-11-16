
const { Pool } = require("pg");

// Connect to Neon PostgreSQL in production and local development.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the environment.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Create the required tables if they do not already exist.
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS internships (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      mode TEXT NOT NULL,
      location TEXT NOT NULL,
      skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      openings INTEGER NOT NULL CHECK (openings > 0)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id BIGSERIAL PRIMARY KEY,
      internship_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      portfolio TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

      CONSTRAINT unique_internship_application
        UNIQUE (internship_id, email)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_internships_domain
    ON internships(domain)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_internships_mode
    ON internships(mode)
  `);

  console.log("Neon PostgreSQL connected successfully!");
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  pool,
  initializeDatabase,
  closeDatabase,
};
