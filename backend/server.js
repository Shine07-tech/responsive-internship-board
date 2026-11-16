
require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// PRODUCTION CONFIGURATION
// --------------------------------------------------

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// --------------------------------------------------
// SECURITY MIDDLEWARE
// --------------------------------------------------

app.use(helmet());

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    allowedHeaders: ["Content-Type", "x-admin-key"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "10kb" }));

// --------------------------------------------------
// REQUEST LOGGING
// --------------------------------------------------

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
});

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// --------------------------------------------------
// ADMIN AUTHENTICATION
// --------------------------------------------------

function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.headers["x-admin-key"];

  // Temporary diagnostic logging. Never log secret values.
  console.log("ADMIN AUTH DIAGNOSTICS:", {
    adminKeyLoaded: Boolean(adminKey),
    adminKeyLength: adminKey ? adminKey.length : 0,
    receivedHeader: Boolean(providedKey),
    receivedKeyLength:
      typeof providedKey === "string" ? providedKey.length : 0,
  });

  if (!adminKey || typeof providedKey !== "string") {
    return res.status(401).json({
      status: "error",
      message: "Admin authentication required.",
    });
  }

  const expectedBuffer = Buffer.from(adminKey);
  const providedBuffer = Buffer.from(providedKey);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return res.status(403).json({
      status: "error",
      message: "Invalid admin credentials.",
    });
  }

  next();
}

// Protect all internship-changing operations.
app.use("/api/internships", (req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    return requireAdminKey(req, res, next);
  }

  next();
});

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    status: "error",
    message,
  });
}

function validateInternship(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Invalid internship data.";
  }

  const { id, title, domain, mode, location, skills, openings } = data;

  if (
    typeof id !== "string" ||
    !/^INT-\d{3}$/.test(id.trim())
  ) {
    return "Internship ID must follow the format INT-101.";
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 100
  ) {
    return "A valid internship title is required.";
  }

  if (
    typeof domain !== "string" ||
    !domain.trim() ||
    domain.length > 100
  ) {
    return "A valid internship domain is required.";
  }

  if (!["Remote", "Hybrid", "On-site"].includes(mode)) {
    return "Mode must be Remote, Hybrid, or On-site.";
  }

  if (
    typeof location !== "string" ||
    !location.trim() ||
    location.length > 100
  ) {
    return "A valid location is required.";
  }

  if (
    !Array.isArray(skills) ||
    skills.length === 0 ||
    !skills.every(
      (skill) =>
        typeof skill === "string" &&
        skill.trim().length > 0 &&
        skill.length <= 50
    )
  ) {
    return "Skills must be a non-empty array of valid strings.";
  }

  if (
    !Number.isInteger(openings) ||
    openings < 1 ||
    openings > 1000
  ) {
    return "Openings must be between 1 and 1000.";
  }

  return null;
}

function formatInternship(row) {
  return {
    ...row,
    skills:
      typeof row.skills === "string"
        ? JSON.parse(row.skills)
        : row.skills,
  };
}

function validateApplication(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Invalid application data.";
  }

  const { internshipId, name, email, portfolio } = data;

  if (
    typeof internshipId !== "string" ||
    !/^INT-\d{3}$/.test(internshipId.trim())
  ) {
    return "A valid internship ID is required.";
  }

  if (
    typeof name !== "string" ||
    !/^[\p{L}\p{M} .'-]{2,80}$/u.test(name.trim())
  ) {
    return "Please enter a valid name.";
  }

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Please enter a valid email address.";
  }

  if (portfolio !== undefined && portfolio !== "") {
    if (
      typeof portfolio !== "string" ||
      portfolio.length > 500
    ) {
      return "Portfolio URL must be under 500 characters.";
    }

    try {
      const parsedUrl = new URL(portfolio);

      if (
        parsedUrl.protocol !== "https:" ||
        !parsedUrl.hostname.includes(".")
      ) {
        return "Portfolio URL must use a valid HTTPS address.";
      }
    } catch {
      return "Please enter a valid portfolio URL.";
    }
  }

  return null;
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();

    return res.status(200).json({
      status: "success",
      message: "Server and database are healthy.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error.name);

    return res.status(503).json({
      status: "error",
      message: "Database health check failed.",
    });
  }
});

// --------------------------------------------------
// HOME ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Internship Board REST API is running!",
  });
});

// --------------------------------------------------
// GET ALL INTERNSHIPS
// --------------------------------------------------

app.get("/api/internships", (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 5)
    );

    const offset = (page - 1) * limit;

    const { domain, mode, search } = req.query;

    let query = "SELECT * FROM internships WHERE 1 = 1";
    let countQuery =
      "SELECT COUNT(*) AS total FROM internships WHERE 1 = 1";

    const params = [];
    const countParams = [];

    if (domain) {
      query += " AND domain = ?";
      countQuery += " AND domain = ?";

      params.push(domain);
      countParams.push(domain);
    }

    if (mode) {
      query += " AND mode = ?";
      countQuery += " AND mode = ?";

      params.push(mode);
      countParams.push(mode);
    }

    if (search) {
      query +=
        " AND (title LIKE ? OR domain LIKE ? OR location LIKE ?)";

      countQuery +=
        " AND (title LIKE ? OR domain LIKE ? OR location LIKE ?)";

      const searchTerm = `%${search}%`;

      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const total = db
      .prepare(countQuery)
      .get(...countParams).total;

    query += " ORDER BY id ASC LIMIT ? OFFSET ?";

    params.push(limit, offset);

    const internships = db
      .prepare(query)
      .all(...params)
      .map(formatInternship);

    return res.status(200).json({
      status: "success",
      data: internships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch internships failed:", error.name);

    return sendError(res, 500, "Unable to fetch internships.");
  }
});

// --------------------------------------------------
// GET INTERNSHIP BY ID
// --------------------------------------------------

app.get("/api/internships/:id", (req, res) => {
  try {
    const internship = db
      .prepare("SELECT * FROM internships WHERE id = ?")
      .get(req.params.id);

    if (!internship) {
      return sendError(res, 404, "Internship not found.");
    }

    return res.status(200).json({
      status: "success",
      data: formatInternship(internship),
    });
  } catch (error) {
    console.error("Fetch internship failed:", error.name);

    return sendError(res, 500, "Unable to fetch internship.");
  }
});

// --------------------------------------------------
// CREATE INTERNSHIP (ADMIN ONLY)
// --------------------------------------------------

app.post("/api/internships", (req, res) => {
  try {
    const validationError = validateInternship(req.body);

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const {
      id,
      title,
      domain,
      mode,
      location,
      skills,
      openings,
    } = req.body;

    const existing = db
      .prepare("SELECT id FROM internships WHERE id = ?")
      .get(id);

    if (existing) {
      return sendError(res, 409, "Internship already exists.");
    }

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

    return res.status(201).json({
      status: "success",
      message: "Internship created successfully.",
    });
  } catch (error) {
    console.error("Create internship failed:", error.name);

    return sendError(res, 500, "Unable to create internship.");
  }
});

// --------------------------------------------------
// UPDATE INTERNSHIP (ADMIN ONLY)
// --------------------------------------------------

app.put("/api/internships/:id", (req, res) => {
  try {
    const validationError = validateInternship(req.body);

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    if (req.body.id !== req.params.id) {
      return sendError(
        res,
        400,
        "Internship ID cannot be changed."
      );
    }

    const existing = db
      .prepare("SELECT id FROM internships WHERE id = ?")
      .get(req.params.id);

    if (!existing) {
      return sendError(res, 404, "Internship not found.");
    }

    const {
      title,
      domain,
      mode,
      location,
      skills,
      openings,
    } = req.body;

    db.prepare(`
      UPDATE internships
      SET title = ?,
          domain = ?,
          mode = ?,
          location = ?,
          skills = ?,
          openings = ?
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

    return res.status(200).json({
      status: "success",
      message: "Internship updated successfully.",
    });
  } catch (error) {
    console.error("Update internship failed:", error.name);

    return sendError(res, 500, "Unable to update internship.");
  }
});

// --------------------------------------------------
// DELETE INTERNSHIP (ADMIN ONLY)
// --------------------------------------------------

app.delete("/api/internships/:id", (req, res) => {
  try {
    const existing = db
      .prepare("SELECT id FROM internships WHERE id = ?")
      .get(req.params.id);

    if (!existing) {
      return sendError(res, 404, "Internship not found.");
    }

    db.prepare("DELETE FROM internships WHERE id = ?")
      .run(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Internship deleted successfully.",
    });
  } catch (error) {
    console.error("Delete internship failed:", error.name);

    return sendError(res, 500, "Unable to delete internship.");
  }
});

// --------------------------------------------------
// SUBMIT APPLICATION
// --------------------------------------------------

app.post("/api/applications", (req, res) => {
  try {
    const validationError = validateApplication(req.body);

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const {
      internshipId,
      name,
      email,
      portfolio,
    } = req.body;

    const internship = db
      .prepare("SELECT id FROM internships WHERE id = ?")
      .get(internshipId);

    if (!internship) {
      return sendError(res, 404, "Internship not found.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingApplication = db
      .prepare(`
        SELECT id FROM applications
        WHERE internship_id = ? AND email = ?
      `)
      .get(internshipId, normalizedEmail);

    if (existingApplication) {
      return sendError(
        res,
        409,
        "You have already applied for this internship."
      );
    }

    const result = db.prepare(`
      INSERT INTO applications
      (internship_id, name, email, portfolio)
      VALUES (?, ?, ?, ?)
    `).run(
      internshipId,
      name.trim(),
      normalizedEmail,
      portfolio ? portfolio.trim() : null
    );

    return res.status(201).json({
      status: "success",
      message: "Application submitted successfully.",
      applicationId: result.lastInsertRowid,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return sendError(
        res,
        409,
        "You have already applied for this internship."
      );
    }

    console.error("Application submission failed:", error.name);

    return sendError(res, 500, "Unable to submit application.");
  }
});

// --------------------------------------------------
// UNKNOWN ROUTES
// --------------------------------------------------

app.use((req, res) => {
  return sendError(res, 404, "Route not found.");
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return sendError(res, 400, "Invalid JSON request body.");
  }

  if (error.message === "Origin not allowed by CORS") {
    return sendError(res, 403, "This origin is not allowed.");
  }

  console.error("Unexpected server error:", error.name);

  return sendError(res, 500, "Internal server error.");
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const server = app.listen(PORT, () => {
  console.log("Internship Board API started.");
  console.log(
    `Environment: ${process.env.NODE_ENV || "development"}`
  );
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// --------------------------------------------------
// GRACEFUL SHUTDOWN
// --------------------------------------------------

function shutdown(signal) {
  console.log(`${signal} received. Shutting down server...`);

  server.close(() => {
    try {
      db.close();
      console.log("Database connection closed.");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error.name);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error(
      "Could not close connections in time. Forcing shutdown."
    );
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
