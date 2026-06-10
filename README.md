# White Orchid Events (praktikum1)

A small event-organizer marketplace prototype built for Praktikum 1 (FERI IPT).

- Backend: Node.js + Express + PostgreSQL
- Frontend: static HTML/CSS/JavaScript in `src/frontend`

## Authors

- Ivan Todic
- Janja Djokic
- Mihailo Petkovic
- Branka Jelaca

This README explains how to run the project locally, initialize the database, and where to find important pieces of the code.

---

## Quick start (local development)

Prerequisites:

- Node.js (v16+ recommended) and npm
- PostgreSQL

Steps:

1. Open a terminal and go to the project `src` folder:

   ```sh
   cd praktikum1/src
   ```

2. Install Node dependencies:

   ```sh
   npm install
   ```

3. Create (or choose) a PostgreSQL database. The project defaults to a database named `moja_baza`.

   Example (run as a user with permission to create DBs):

   ```sh
   psql -h localhost -U postgres -c "CREATE DATABASE moja_baza;"
   ```

4. Initialize the schema and seed data (file included):

   ```sh
   psql -h localhost -U postgres -d moja_baza -f backend/initPostgre.sql
   ```

   This creates tables and inserts test data (clients, organizers, events, invitations, reviews).

5. Create an environment file (`praktikum1/src/.env`) or export environment variables. Example `.env`:

   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=moja_baza
   DB_USER=postgres
   DB_PASSWORD=superVarnoGeslo

   # Server
   PORT=3000
   APP_BASE_URL=http://localhost:3000

   # Optional: SMTP (for real email sending). If not set, server will simulate sending and return links.
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-pass
   SMTP_FROM=no-reply@example.com
   SMTP_SECURE=false
   ```

   Note: Do not commit `.env` to version control.

6. Start the server from `praktikum1/src`:

   ```sh
   npm start
   ```

   The server will serve the frontend at `http://localhost:3000` (default) and expose the API at `/api/*`.

7. Open your browser at `http://localhost:3000`.

---

## Seed data and login

- The SQL initializer `src/backend/initPostgre.sql` inserts sample organizers and clients. Organizer rows use plain-text passwords like `orgpw1`, `orgpw2`, ... for convenience in the practical exercise.
- The frontend also contains a localStorage-based seed (`src/frontend/script.js`) to allow working without the backend for some flows.

Quick test login (example):

- Organizer: `info@elegantevents.si` / `orgpw1`
- Client accounts are defined in the SQL as well (see `initPostgre.sql`).

You can test the login endpoint via curl:

```sh
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@elegantevents.si","passwordHash":"orgpw1"}'
```

The server accepts either a SHA-256 passwordHash (frontend hashes passwords before sending) or the plain seed password inserted by `initPostgre.sql`.

---

## Important environment variables

- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD — PostgreSQL connection
- PORT — server port (default 3000)
- APP_BASE_URL — base URL used when building email links (defaults to http://localhost:3000)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE — configure these to enable real outgoing email. If SMTP is not configured the server will return generated RSVP / review links in responses but will not send email.

---

## Project structure (important files)

- `src/`
  - `backend/`
    - `server.js` — Express server, API routes and DB interactions
    - `initPostgre.sql` — DB schema and seed data for testing
    - `package.json` / `package-lock.json`
  - `frontend/` — static HTML/CSS/JS used for the UI (many pages in this folder)
    - `index.html`, `profile-detail.html`, `login.html`, `register.html`, etc.
    - `script.js` — frontend logic (client-side hashing, localStorage seed, UI helpers)
- `docs/` — diagrams and design documents (ER diagram, etc.)
- `todo.md` — project TODO list

---

## API (overview)

A selection of the most useful endpoints (see `src/backend/server.js` for full details):

- GET /api/organizers — list organizers (supports query params: `search`, `city`, `tip_eventa`, `min_price`, `max_price`, `ocena_min`)
- GET /api/organizers/:id — get organizer details
- POST /api/organizers — register new organizer (expects `ime`, `priimek`, `email`, `geslo` (hash), `city`, `telefon`, `tip_eventa`)
- POST /api/client — register client
- POST /api/login — login (send `email` + `passwordHash`). Server accepts either SHA-256 hash or plain seed password for seeded accounts
- GET /api/events — list events
- GET /api/events/:id/reviews — guest reviews for an event
- POST /api/events/:id/review-links/generate — generate guest review links (returns simulated emails with links)
- POST /api/requests — create a client request for an organizer
- POST /api/rsvp — submit RSVP (token + status accepted/declined)

There are also endpoints for uploading images (`/api/organizers/:id/image`), event images, organizer reviews and many helper routes for RSVP and review flows. Check `src/backend/server.js` for details and parameters.

---

## Development notes & tips

- The backend serves the frontend files from `src/frontend`. Many frontend pages call `/api/*` endpoints, so running the backend is recommended for full functionality.
- Client-side password hashing: the frontend uses `crypto.subtle.digest('SHA-256')` before sending the `passwordHash` to the API. For quick local testing the SQL seed uses plain passwords — the server accepts either.
- Email sending is optional. If you want to send real emails, configure the SMTP variables in `.env`. If you don't, the API endpoints that would send emails will include the generated links in their JSON responses to help you test flows.
- Uploaded images are stored in the DB as base64/text; server limits base64 image size to ~2MB.

---

## Where to look next

- To change the UI: edit files in `src/frontend`.
- To change API or DB logic: edit `src/backend/server.js` and update `src/backend/initPostgre.sql` if you need schema changes.
- To reset the database: drop the DB and run the `initPostgre.sql` file again.

---
