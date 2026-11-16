
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Use the cloud database location when provided.
// Otherwise, use the existing local database file.
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "internships.db");

// Ensure the database directory exists.
const databaseDirectory = path.dirname(databasePath);

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

// Connect to SQLite.
const db = new Database(databasePath);

// Enable foreign key support.
db.pragma("foreign_keys = ON");

// Improve reliability for concurrent database access.
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Create internships table.
db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    mode TEXT NOT NULL,
    location TEXT NOT NULL,
    skills TEXT NOT NULL,
    openings INTEGER NOT NULL CHECK(openings > 0)
  )
`);

// Create applications table.
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    portfolio TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (internship_id)
      REFERENCES internships(id)
      ON DELETE CASCADE,

    UNIQUE (internship_id, email)
  )
`);

console.log("Database connected successfully!");
console.log(`Database location: ${databasePath}`);

module.exports = db;
