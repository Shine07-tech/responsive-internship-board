
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many requests. Please try again later."
    }
  })
);

// Consistent error response
function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    status: "error",
    message
  });
}

// Validate internship input
function validateInternship(body) {
  const { id, title, domain, mode, location, skills, openings } = body;

  if (
    typeof id !== "string" ||
    !/^INT-\d{3,}$/.test(id.trim())
  ) {
    return "A valid ID such as INT-106 is required.";
  }

  const requiredStrings = [title, domain, mode, location];

  if (
    requiredStrings.some(
      value => typeof value !== "string" || !value.trim()
    )
  ) {
    return "Title, domain, mode and location are required.";
  }

  if (!["Remote", "Hybrid", "On-site"].includes(mode)) {
    return "Mode must be Remote, Hybrid or On-site.";
  }

  if (
    !Array.isArray(skills) ||
    skills.length === 0 ||
    skills.some(
      skill => typeof skill !== "string" || !skill.trim()
    )
  ) {
    return "Skills must be a non-empty array of strings.";
  }

  if (
    !Number.isInteger(openings) ||
    openings < 1 ||
    openings > 1000
  ) {
    return "Openings must be a positive integer.";
  }

  if (
    title.length > 150 ||
    domain.length > 100 ||
    location.length > 100 ||
    skills.length > 20 ||
    skills.some(skill => skill.length > 50)
  ) {
    return "One or more fields exceed the allowed length.";
  }

  return null;
}

// Convert database record into API format
function formatInternship(record) {
  return {
    ...record,
    skills: JSON.parse(record.skills)
  };
}

// Welcome route
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Internship Board REST API is running!"
  });
});

// 1. GET all internships with pagination and filters
app.get("/api/internships", (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 5);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 50
    ) {
      return sendError(
        res,
        400,
        "Page must be positive and limit must be between 1 and 50."
      );
    }

    const { search, domain, mode } = req.query;

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push(
        "(title LIKE ? OR domain LIKE ? OR location LIKE ?)"
      );
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (domain) {
      conditions.push("domain = ?");
      params.push(domain);
    }

    if (mode) {
      conditions.push("mode = ?");
      params.push(mode);
    }

    const where = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM internships ${where}`
    ).get(...params).count;

    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const records = db.prepare(`
      SELECT * FROM internships
      ${where}
      ORDER BY id
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      status: "success",
      data: records.map(formatInternship),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    sendError(res, 500, "Unable to fetch internships.");
  }
});

// 2. GET internship by ID
app.get("/api/internships/:id", (req, res) => {
  try {
    const record = db.prepare(
      "SELECT * FROM internships WHERE id = ?"
    ).get(req.params.id);

    if (!record) {
      return sendError(res, 404, "Internship not found.");
    }

    res.json({
      status: "success",
      data: formatInternship(record)
    });

  } catch (error) {
    sendError(res, 500, "Unable to fetch internship.");
  }
});

// 3. POST - Create internship
app.post("/api/internships", (req, res) => {
  const error = validateInternship(req.body);

  if (error) {
    return sendError(res, 400, error);
  }

  try {
    const { id, title, domain, mode, location, skills, openings } =
      req.body;

    db.prepare(`
      INSERT INTO internships
      (id, title, domain, mode, location, skills, openings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id.trim(),
      title.trim(),
      domain.trim(),
      mode,
      location.trim(),
      JSON.stringify(skills),
      openings
    );

    res.status(201).json({
      status: "success",
      message: "Internship created successfully.",
      data: {
        id: id.trim(),
        title: title.trim(),
        domain: domain.trim(),
        mode,
        location: location.trim(),
        skills,
        openings
      }
    });

  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
        error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return sendError(res, 409, "Internship ID already exists.");
    }

    sendError(res, 500, "Unable to create internship.");
  }
});

// 4. PUT - Update internship
app.put("/api/internships/:id", (req, res) => {
  const error = validateInternship(req.body);

  if (error) {
    return sendError(res, 400, error);
  }

  if (req.body.id.trim() !== req.params.id) {
    return sendError(res, 400, "ID cannot be changed.");
  }

  try {
    const existing = db.prepare(
      "SELECT id FROM internships WHERE id = ?"
    ).get(req.params.id);

    if (!existing) {
      return sendError(res, 404, "Internship not found.");
    }

    const { title, domain, mode, location, skills, openings } =
      req.body;

    db.prepare(`
      UPDATE internships
      SET title = ?, domain = ?, mode = ?, location = ?,
          skills = ?, openings = ?
      WHERE id = ?
    `).run(
      title.trim(),
      domain.trim(),
      mode,
      location.trim(),
      JSON.stringify(skills),
      openings,
      req.params.id
    );

    res.json({
      status: "success",
      message: "Internship updated successfully.",
      data: formatInternship(
        db.prepare("SELECT * FROM internships WHERE id = ?")
          .get(req.params.id)
      )
    });

  } catch (error) {
    sendError(res, 500, "Unable to update internship.");
  }
});

// 5. DELETE - Delete internship
app.delete("/api/internships/:id", (req, res) => {
  try {
    const result = db.prepare(
      "DELETE FROM internships WHERE id = ?"
    ).run(req.params.id);

    if (result.changes === 0) {
      return sendError(res, 404, "Internship not found.");
    }

    res.json({
      status: "success",
      message: "Internship deleted successfully.",
      data: { id: req.params.id }
    });

  } catch (error) {
    sendError(res, 500, "Unable to delete internship.");
  }
});

// Handle unknown routes
app.use((req, res) => {
  sendError(res, 404, "Route not found.");
});

// Handle invalid JSON and other errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "Invalid JSON request body.");
  }

  if (res.headersSent) {
    return next(err);
  }

  sendError(res, 500, "Internal server error.");
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
