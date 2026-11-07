# Bookpal database: design

Date: 2026-11-07

## Intent and why

The backend keeps everything in memory, so every restart wipes clients, appointments and logins. This work makes the data permanent by storing it in a free cloud PostgreSQL (Neon). Services, HTTP routes and the API contract do not change; only the storage layer gets a second, Postgres-backed version.

It is a **learning project** that follows lesson 5 of the teacher's course. Koray missed the lesson live and watches the recording, so Bookpal copies the teacher's design for Ritma (`../ritma-for-individual/docs/superpowers/specs/2026-11-05-ritma-database-design.md`, read-only) as closely as it can, with Bookpal's own names (`clients`, not `customers`; `bookpal_session`). Koray said "just copy his design"; the choices below are his, adopted as they are.

Success (all three must hold):
1. With `DATABASE_URL` set, add a client and an appointment, restart the server: both are still there after logging in again.
2. A second appointment in the same time slot for the same user is refused with 409, as today.
3. With `DATABASE_URL` empty, the app and all existing tests work exactly as today.

## Goals, non-goals, anti-goals

- Goals: permanent data; the overlap rule enforced by the database itself; the same behaviour tests run against both the memory and the Postgres storage.
- Non-goals (separate jobs): Google sign-in, session expiry, an ORM, backups, moving existing data (memory data is throwaway anyway), a database for the frontend.
- Anti-goals: the connection address must never appear in chat, logs, error messages, test output or git; the server must never silently fall back to memory when `DATABASE_URL` is set but unreachable.

## Decisions (copied from the teacher's design)

- Service: Neon free plan. The connection address is `DATABASE_URL` in `backend/.env` (git-ignored; `backend/.env.example` is the template). The address should end with `?sslmode=verify-full`.
- Client library: `pg` (+ `@types/pg` for development). No ORM, no migration library. These two packages are new libraries: Koray confirms before they are installed.
- Migrations: plain numbered `.sql` files in `db/migrations/` at the repo root, applied in name order by a small runner script. A change to the schema is a new numbered file; an applied file is never edited.
- `DATABASE_URL` empty: memory storage, as today; the tests stay on memory.
- Node reads `.env` itself (`--env-file-if-exists=.env`) in `dev`, `start`, `db:migrate` and `db:check`; `npm test` does not load it.
- Users live in a `users` table; the two demo users (`demo-user-elif`, `demo-user-mert`) are inserted (upsert) at start-up when demo accounts are on. Demo accounts stay off in production by default, so nothing demo is written there.

## Schema (`db/migrations/001_init.sql`)

Extension `btree_gist` (needed for the overlap rule). Column names are `snake_case`; ids and foreign keys are `text` so the existing ids keep working.

- `users`: `id` text PK; `email` text not null with a unique index on `lower(email)`; `display_name` text not null; `created_at` timestamptz default `now()`.
- `clients`: `id` text PK; `user_id` → `users(id)`; `first_name`, `last_name` text not null; `birth_date` date not null; `gender` text not null, CHECK one of `female`, `male`, `other`, `undisclosed`; `deleted_at` timestamptz null (soft delete). Partial index on `user_id` where `deleted_at is null`.
- `appointments`: `id` text PK; `user_id` → `users(id)`; `client_id` → `clients(id)`; `date` date; `start_time`, `end_time` time, CHECK `end_time > start_time`; `status` text CHECK `scheduled`, `completed`, `cancelled`; `note` text not null default `''`. Overlap rule in the database: `EXCLUDE USING gist (user_id WITH =, tsrange(date + start_time, date + end_time) WITH &&) WHERE (status <> 'cancelled')`, so the check and the write are one atomic step. Index on `(user_id, date)`.
- `sessions`: `token_hash` text PK (SHA-256 of the token, hex; the plain token is never stored); `user_id` → `users(id)` ON DELETE CASCADE; `created_at` timestamptz default `now()`.
- `schema_migrations` (created by the runner): `name` text PK, `applied_at` timestamptz.

## Code layout

- `backend/src/db/pool.ts`: builds the `pg.Pool`. `date` comes back as `'YYYY-MM-DD'` text and `time` as `'HH:MM'` text (otherwise `pg` turns dates into local-time `Date` objects and the day shifts; the frontend relies on text dates).
- `backend/src/repositories/postgres/`: `client-repository.ts`, `appointment-repository.ts`, `session-store.ts`, implementing the existing interfaces in `repositories/types.ts`. `saveIfNoConflict` is an `INSERT ... ON CONFLICT (id) DO UPDATE`; error code `23P01` (exclusion violation) becomes `undefined`, which the service already turns into 409.
- `backend/src/db/migrate.ts` and `backend/scripts/migrate.ts` (`npm run db:migrate`): each file runs in one transaction; on error that file is rolled back and the runner stops.
- `backend/scripts/db-check.ts` (`npm run db:check`): connects, runs a simple query, prints the database name only, never the address.
- `backend/src/config.ts` gets `databaseUrl`; `deps.ts` chooses Postgres or memory; `buildDeps` becomes async and `server.ts` awaits it.

## Errors

If `DATABASE_URL` is set but the server cannot connect at start-up, it stops with a clear Turkish message that does not contain the address. Other database errors go to the existing error handler and answer 500; the message never contains the address.

## Tests

- The 108 existing backend tests keep running on memory, unchanged.
- Postgres tests run only when `TEST_DATABASE_URL` is set, otherwise they are skipped. It must be the direct (not "pooled") address of a separate Neon branch. Each run creates a temporary schema with a random name and drops it at the end; the real `DATABASE_URL` is never touched by tests.
- Memory and Postgres storage share the same behaviour tests (`repositories/contract/`): isolation per user, soft delete, date-range order, overlap refusal, cancelled appointments not blocking, session create/find/delete.

## Left to the builder

Exact SQL and file names beyond those above; how the contract tests are parameterised; wording of the Turkish error messages.

## Process notes

- One plan task is one branch and one PR, as before. Koray runs the commands that need his `.env` only through the npm scripts; Claude never reads `.env`.
- Koray must create a Neon branch for tests and put its direct address in `backend/.env` as `TEST_DATABASE_URL` before the first Postgres test can run (plan Task 2).
- Adding deny rules for `.env` to `.claude/settings.json`, as the teacher did, is a separate yes/no for Koray; the `CLAUDE.md` rule already covers it in words.
