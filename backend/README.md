# Internship Board – REST API & Persistent Data

A RESTful backend for the Responsive Internship Board, built using Node.js, Express.js and SQLite.

## Features

- RESTful CRUD operations for internships.
- SQLite database for persistent data storage.
- Input validation and error handling.
- Pagination and search functionality.
- Filtering by domain and work mode.
- Security middleware using Helmet and Express Rate Limit.
- JSON-based API responses.

## Technology Stack

- Node.js
- Express.js
- SQLite (better-sqlite3)
- JavaScript
- REST API
- PowerShell for API testing

## Project Structure

```text
backend/
├── database.js
├── seed.js
├── server.js
├── internships.db
├── package.json
└── README.md
```

Note: `internships.db` is generated automatically and is excluded from GitHub.

## Installation and Setup

### 1. Install Node.js

Install Node.js from https://nodejs.org/

### 2. Navigate to the backend folder

```bash
cd backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Insert sample internship data

```bash
node seed.js
```

### 5. Start the development server

```bash
npm run dev
```

The API will run at:

`http://localhost:5000`

## Database Schema

The SQLite database contains an `internships` table.

| Column | Data Type | Description |
|---|---|---|
| id | TEXT | Primary key |
| title | TEXT | Internship title |
| domain | TEXT | Internship domain |
| mode | TEXT | Remote, Hybrid or On-site |
| location | TEXT | Internship location |
| skills | TEXT | JSON-encoded skills |
| openings | INTEGER | Number of openings |

## API Endpoints

Base URL: `http://localhost:5000/api/internships`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all internships |
| GET | `/:id` | Get internship by ID |
| POST | `/` | Create an internship |
| PUT | `/:id` | Update an internship |
| DELETE | `/:id` | Delete an internship |

### Pagination

Example:

`GET /api/internships?page=1&limit=2`

### Filtering

Examples:

- `/api/internships?domain=Full%20Stack%20Development`
- `/api/internships?mode=Remote`
- `/api/internships?search=Frontend`

## Sample POST Request

```json
{
  "id": "INT-106",
  "title": "Electronics Engineering Intern",
  "domain": "Electronics",
  "mode": "Remote",
  "location": "Kolkata",
  "skills": ["C", "Embedded Systems", "Arduino"],
  "openings": 2
}
```

## Sample Successful Response

```json
{
  "status": "success",
  "message": "Internship created successfully.",
  "data": {
    "id": "INT-106"
  }
}
```

## Error Handling

The API uses appropriate HTTP status codes:

- 200 – Successful request
- 201 – Resource created
- 400 – Invalid input
- 404 – Resource not found
- 409 – Duplicate internship ID
- 429 – Too many requests
- 500 – Internal server error

## Seed Data

The database is initially populated with five sample internship records:

- INT-101 – Frontend Intern
- INT-102 – API Engineering Intern
- INT-103 – UI/UX Intern
- INT-104 – Data Analyst Intern
- INT-105 – Security Operations Intern

Run `node seed.js` to insert the sample data.

## Author

**Insha Hossain**

Responsive Internship Board – EdVyro Full Stack Development Project