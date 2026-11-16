
require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const {
  pool,
  initializeDatabase,
  closeDatabase,
} = require("./database");

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
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - startTime}ms`
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

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "success",
      message: "Server and database are healthy.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error.name);

    return sendError(res, 503, "Database health check failed.");
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

app.get("/api/internships", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 5)
    );

    const offset = (page - 1) * limit;
    const { domain, mode, search } = req.query;

    let conditions = [];
    let params = [];

    if (domain) {
      params.push(domain);
      conditions.push(`domain = $${params.length}`);
    }

    if (mode) {
      params.push(mode);
      conditions.push(`mode = $${params.length}`);
    }

    if (search) {
      const searchTerm = `%${search}%`;

      params.push(searchTerm);
      const searchPosition = params.length;

      conditions.push(
        `(title ILIKE $${searchPosition} OR domain ILIKE $${searchPosition} OR location ILIKE $${searchPosition})`
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM internships ${whereClause}`,
      params
    );

    const total = countResult.rows[0].total;

    const dataParams = [...params, limit, offset];

    const internshipResult = await pool.query(
      `
        SELECT * FROM internships
        ${whereClause}
        ORDER BY id ASC
        LIMIT $${dataParams.length - 1}
        OFFSET $${dataParams.length}
      `,
      dataParams
    );

    return res.status(200).json({
      status: "success",
      data: internshipResult.rows.map(formatInternship),
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

app.get("/api/internships/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM internships WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Internship not found.");
    }

    return res.status(200).json({
      status: "success",
      data: formatInternship(result.rows[0]),
    });
  } catch (error) {
    console.error("Fetch internship failed:", error.name);

    return sendError(res, 500, "Unable to fetch internship.");
  }
});

// --------------------------------------------------
// CREATE INTERNSHIP (ADMIN ONLY)
// --------------------------------------------------

app.post("/api/internships", async (req, res) => {
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

    const result = await pool.query(
      `
        INSERT INTO internships
        (id, title, domain, mode, location, skills, openings)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `,
      [
        id.trim(),
        title.trim(),
        domain.trim(),
        mode,
        location.trim(),
        JSON.stringify(skills),
        openings,
      ]
    );

    if (result.rows.length === 0) {
      return sendError(res, 409, "Internship already exists.");
    }

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

app.put("/api/internships/:id", async (req, res) => {
  try {
    const validationError = validateInternship(req.body);

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    if (req.body.id.trim() !== req.params.id) {
      return sendError(
        res,
        400,
        "Internship ID cannot be changed."
      );
    }

    const {
      title,
      domain,
      mode,
      location,
      skills,
      openings,
    } = req.body;

    const result = await pool.query(
      `
        UPDATE internships
        SET title = $1,
            domain = $2,
            mode = $3,
            location = $4,
            skills = $5::jsonb,
            openings = $6
        WHERE id = $7
        RETURNING id
      `,
      [
        title.trim(),
        domain.trim(),
        mode,
        location.trim(),
        JSON.stringify(skills),
        openings,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Internship not found.");
    }

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

app.delete("/api/internships/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM internships WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Internship not found.");
    }

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

app.post("/api/applications", async (req, res) => {
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

    const normalizedInternshipId = internshipId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const internship = await pool.query(
      "SELECT id FROM internships WHERE id = $1",
      [normalizedInternshipId]
    );

    if (internship.rows.length === 0) {
      return sendError(res, 404, "Internship not found.");
    }

    const result = await pool.query(
      `
        INSERT INTO applications
        (internship_id, name, email, portfolio)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (internship_id, email) DO NOTHING
        RETURNING id
      `,
      [
        normalizedInternshipId,
        name.trim(),
        normalizedEmail,
        portfolio ? portfolio.trim() : "",
      ]
    );

    if (result.rows.length === 0) {
      return sendError(
        res,
        409,
        "You have already applied for this internship."
      );
    }

    return res.status(201).json({
      status: "success",
      message: "Application submitted successfully.",
      applicationId: result.rows[0].id,
    });
  } catch (error) {
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
// START SERVER AFTER DATABASE INITIALIZATION
// --------------------------------------------------

let server;

async function startServer() {
  try {
    await initializeDatabase();

    server = app.listen(PORT, () => {
      console.log("Internship Board API started.");
      console.log(
        `Environment: ${process.env.NODE_ENV || "development"}`
      );
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: /health`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

// --------------------------------------------------
// GRACEFUL SHUTDOWN
// --------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await closeDatabase();

    console.log("Database connection closed.");
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    console.error("Shutdown error:", error.name);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
