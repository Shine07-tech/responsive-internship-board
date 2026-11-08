
const db = require("./database");

// Five internship records supplied in the EdVyro task
const internships = [
  {
    id: "INT-101",
    title: "Frontend Intern",
    domain: "Full Stack Development",
    mode: "Remote",
    location: "India",
    skills: ["HTML", "CSS", "JavaScript"],
    openings: 3
  },
  {
    id: "INT-102",
    title: "API Engineering Intern",
    domain: "Full Stack Development",
    mode: "Hybrid",
    location: "Pune",
    skills: ["Node.js", "SQL", "Testing"],
    openings: 2
  },
  {
    id: "INT-103",
    title: "UI/UX Intern",
    domain: "UI/UX",
    mode: "Remote",
    location: "India",
    skills: ["Figma", "Research", "Accessibility"],
    openings: 1
  },
  {
    id: "INT-104",
    title: "Data Analyst Intern",
    domain: "Data Analytics",
    mode: "On-site",
    location: "Bengaluru",
    skills: ["Excel", "SQL", "Data visualisation"],
    openings: 2
  },
  {
    id: "INT-105",
    title: "Security Operations Intern",
    domain: "Cyber Security",
    mode: "Remote",
    location: "India",
    skills: ["Linux", "Logs", "Networking"],
    openings: 1
  }
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO internships
  (id, title, domain, mode, location, skills, openings)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((records) => {
  for (const internship of records) {
    insert.run(
      internship.id,
      internship.title,
      internship.domain,
      internship.mode,
      internship.location,
      JSON.stringify(internship.skills),
      internship.openings
    );
  }
});

insertMany(internships);

console.log("Internship seed data inserted successfully!");

const total = db.prepare(
  "SELECT COUNT(*) AS count FROM internships"
).get();

console.log("Total internships in database:", total.count);

db.close();
