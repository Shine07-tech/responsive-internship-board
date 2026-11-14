
# Internship Board – Test Report

## Project
Responsive Internship Board – Secure Application Integration

## Testing Environment
- Frontend: HTML, CSS and JavaScript
- Backend: Node.js and Express.js
- Database: SQLite (better-sqlite3)
- API Base URL: http://localhost:5000/api

## Test Results

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| Fetch internships | Display 5 internships | 5 internships displayed | PASS |
| Valid application | Application submitted | Success response received | PASS |
| Duplicate application | Reject duplicate | Duplicate rejected | PASS |
| Invalid email | Reject invalid email | Validation error displayed | PASS |
| Invalid portfolio URL | Reject non-HTTPS URL | Validation error displayed | PASS |
| Invalid internship ID | Reject unknown internship | Internship not found | PASS |
| API rate limiting | Block requests beyond limit | HTTP 429 received | PASS |
| Security headers | Helmet headers present | Headers verified | PASS |

## Conclusion

The frontend successfully integrates with the backend API.
Application submissions are stored in SQLite, duplicate
applications are prevented, server-side validation works,
and API security mechanisms have been tested successfully.
