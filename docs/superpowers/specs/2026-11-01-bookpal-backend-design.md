# Bookpal backend: design

Date: 2026-11-01

## Intent and why

Bookpal is an appointment and client-tracking app for people who see clients one-on-one (coaches, psychologists, psychiatrists, consultants). So far there is only the landing page in `web/`. This work builds the product's first working backend: a provider logs in, sees the day's appointments, and manages clients and calendar.

It is a **learning project** that mirrors the teacher's Ritma backend (`../ritma-for-individual/backend`, lesson 3), so Koray can compare the two. The backend's first job is appointments and clients. It is **not** to collect early-access signups: the landing page form keeps its empty `FORM_ENDPOINT`.

## Goals

- A provider logs in and sees only their own data.
- List appointments for a date range (day, week and month are the same call with different ranges).
- Search, list, add, edit and delete clients.
- Create, edit, delete and cancel appointments by choosing a date and start and end time.
- Overlapping appointments of the same provider are rejected.
- Moving to a database or to Google login later changes one layer each, not the rest.

## Non-goals (first version)

- A persistent database: data lives in memory and disappears when the server restarts.
- Sign-up (account creation), Google login (only easy migration to it), a backend for the early-access form.
- Teams or staff accounts: each account is one provider.
- Notifications, email, SMS, payments.
- The dashboard screens (a separate task). Only the API is built.

## Anti-goals (a failure even if it "works")

- One provider can see or change another provider's clients or appointments.
- Two active appointments that overlap can be saved.
- The login method (demo accounts) leaks into the session, user or data layers: adding Google must only mean adding another identity provider.
- Client data (names, birth dates, notes) is written to server logs. Clients may be health-related, so logs stay free of personal data.

## Decided by Koray

- Same stack as the teacher: TypeScript, Node.js and Express. Data in memory.
- Same folder layout: `backend/` (API), `web/` (existing page), `api-contract/` (API description), `docs/`.
- Koray asked to skip the design questions, so everything below is the designer's call, based on the teacher's design.

## Domain

**User (provider):** `id`, `email`, `displayName`.

**Client:** `id`, `userId`, `firstName`, `lastName`, `birthDate` (required, not in the future), `gender` (`female` | `male` | `other` | `undisclosed`), `deletedAt` (null while active).

**Appointment:** `id`, `userId`, `clientId`, `date`, `startTime`, `endTime`, `status` (`scheduled` | `completed` | `cancelled`), `note` (free text, optional, default empty).

Formats: dates `YYYY-MM-DD`, times `HH:mm` (24h), one local time zone assumed and not stored. End time must be after start time; no appointment crosses midnight; past dates are allowed. Identifiers in code and JSON are English. Error messages returned by the API are Turkish.

## Behavior rules

- **Ownership:** every client and appointment belongs to one user. Another user's record answers `404` (its existence is not revealed). Creating an appointment with another user's client id is also `404`.
- **Overlap:** two appointments of the same user on the same date overlap when their time ranges intersect. An appointment that starts exactly when another ends is not an overlap. `cancelled` appointments are ignored by the check. `completed` ones count. When editing, the appointment itself is excluded. Moving `cancelled` back to `scheduled` re-runs the check. Rejected with `409 conflict`.
- **Client delete is soft:** `deletedAt` is set. A deleted client disappears from the list and search, cannot get new appointments, but old appointments stay reachable and still show the client's name. No restore in the first version.
- **Search:** among the user's active clients by first and last name, "contains" match, ignoring case, accents and Turkish dotted/dotless i (İ/ı). Results sorted by last name, then first name (Turkish collation).
- **Date range:** the list takes `from` and `to` (both inclusive), at most 366 days. No paging.
- **Statuses:** free movement between them. Deleting an appointment removes it for good; cancelling keeps it.
- **Validation:** every input is validated; unknown body shapes give `400 validation_error`. `PATCH` needs at least one known field.

## Architecture

- Layers: HTTP routes, then services (rules: ownership, overlap), then repositories (data access).
- Every repository is an interface; the first implementation is in memory. Every repository method that touches user data takes the user id.
- The overlap check and the write happen as one repository call (`saveIfNoConflict`), so a database version can make it a transaction or constraint.
- **Identity provider:** login sits behind an `IdentityProvider` interface (`authenticate`, `findUser`). The first implementation checks the demo accounts. After success the rest of the system knows only the user id.
- **Sessions:** kept on the server in memory; token is random. Web uses the cookie `bookpal_session` (`HttpOnly`, `SameSite=Lax`, `Secure` in production); other clients use `Authorization: Bearer <token>`. Same token either way.
- The same Express server also serves the files in `web/`, so there is no CORS setup.
- API under `/api/v1`, JSON only. Errors look like `{ "error": { "code", "message" } }` with codes `validation_error` (400), `unauthorized` (401), `not_found` (404), `conflict` (409), `server_error` (500). Bad JSON is a `400`.

## API

- `GET /api/v1/health`
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `GET/POST /api/v1/clients` (list with optional `search`, create), `GET/PATCH/DELETE /api/v1/clients/:id`
- `GET/POST /api/v1/appointments` (list by `from` and `to`, create), `GET/PATCH/DELETE /api/v1/appointments/:id`
- Appointment responses include a `client` object with `id`, `firstName` and `lastName`.
- The API is described in `api-contract/openapi.yaml`, and a test fails when the contract and the real routes disagree.

## Demo accounts

Two demo users defined in code, passwords stored as salted scrypt hashes: `elif@bookpal.demo` / `demo-elif-123` and `mert@bookpal.demo` / `demo-mert-123`. They are demo-only and not real passwords. Controlled by `DEMO_ACCOUNTS_ENABLED=true|false`; the default is on, and off when `NODE_ENV=production`. With the demos off nobody can log in. No sample data: each user starts empty.

## Tooling (designer's calls)

- npm; `"type": "module"`; Express 5.
- `tsx` to run TypeScript directly in development (`npm run dev` watches), `tsc` to build into `dist/` (`npm run build`, `npm start`).
- Tests with Node's built-in runner (`node --import tsx --test`). No other libraries. Configuration through `PORT` (default 3000), `NODE_ENV`, `DEMO_ACCOUNTS_ENABLED`.
- `tsc` builds `src/` but excludes the test files, so `npm test` does not check types: run `npm run build` for that.

## Constraints

- File, folder, class and route names in English ASCII; user-facing API messages in Turkish.
- Do not add libraries beyond Express and the dev tools above without asking.
- Never commit or push without being asked. Work happens on branch `feat/backend`.
- The landing page and its `FORM_ENDPOINT` are not changed by this work, except that `backend/` may serve the `web/` folder.

## How to check

- Services and in-memory repositories: automated tests, especially ownership, overlap and soft delete.
- Routes: tests with a real server and `fetch`, no mocks.
- At least one end-to-end run: login, create client, create appointment, overlap rejected, other user cannot see it.
- Contract test between `openapi.yaml` and the routes. `npm run build` passes.

## Left to the builder

- Exact folder and file structure under `backend/src/`, and test helper design.
- Exact wording of the Turkish error messages.
- The structure of `openapi.yaml` beyond what the API section lists.

## Open points

- The dashboard UI is not part of this work.
- Because the questions were skipped, Koray has not reviewed the designer's calls above; they follow the teacher's backend design.
