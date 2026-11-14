
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
  path.join(__dirname, "internships.db")
);

// Enable foreign key support
db.pragma("foreign_keys = ON");

// Create internships table
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

// Create applications table
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

module.exports = db;
