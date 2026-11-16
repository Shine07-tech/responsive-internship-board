# InternHub – Internship Management Platform

InternHub is a responsive full-stack internship platform that allows users to explore internship opportunities, search and filter listings, view internship details, and submit applications.

## Features

### Frontend
- Responsive interface for desktop and mobile.
- Internship search functionality.
- Filter by domain and work mode.
- Paginated internship listings.
- Detailed internship information.
- Application submission form.
- Loading, error, empty and success states.

### Backend
- REST API built using Node.js and Express.
- SQLite database using better-sqlite3.
- Internship listing, retrieval, creation, updating and deletion.
- Application submission and duplicate application prevention.
- Admin API-key authentication.
- Input validation and error handling.
- CORS, Helmet security headers and rate limiting.

## Technology Stack

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- SQLite
- better-sqlite3

## Project Structure

```text
responsive-internship-board/
│
├── index.html
├── styles.css
├── app.js
├── README.md
│
└── backend/
    ├── server.js
    ├── database.js
    ├── package.json
    ├── .env.example
    └── .gitignore
```

## Local Installation

1. Clone the repository:

```bash
git clone https://github.com/Shine07-tech/responsive-internship-board.git
```

2. Open the project directory:

```bash
cd responsive-internship-board
```

3. Navigate to the backend:

```bash
cd backend
```

4. Install dependencies:

```bash
npm install
```

5. Configure environment variables using `.env.example` as a reference. Never commit your actual `.env` file.

6. Start the backend:

```bash
node server.js
```

The API runs at `http://localhost:5000`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server health check |
| GET | `/api/internships` | Retrieve internships |
| GET | `/api/internships/:id` | Retrieve internship details |
| POST | `/api/internships` | Create an internship (admin) |
| PUT | `/api/internships/:id` | Update an internship (admin) |
| DELETE | `/api/internships/:id` | Delete an internship (admin) |
| POST | `/api/applications` | Submit an application |

Admin endpoints require a valid API key.

## Security

- Admin authentication for internship management.
- Environment variables for sensitive configuration.
- Request validation.
- Rate limiting.
- Helmet security headers.
- Restricted CORS origins.
- SQLite-based data persistence.

## Future Improvements

- Admin dashboard.
- User authentication.
- Resume upload functionality.
- Internship application tracking.
- Production deployment with persistent database storage.

## Author

**Insha Hossain**

Electronics and Communication Engineering Student  
B.P. Poddar Institute of Management and Technology, Kolkata

GitHub: https://github.com/Shine07-tech

---

*Developed as a Full Stack Development capstone project.*