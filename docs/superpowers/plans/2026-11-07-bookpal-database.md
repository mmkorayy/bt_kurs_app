# Bookpal Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The backend keeps clients, appointments and sessions permanently in Neon PostgreSQL when `DATABASE_URL` is set, and works exactly as today (memory) when it is empty.

**Architecture:** Postgres versions of `ClientRepository`, `AppointmentRepository` and `SessionStore` go into `repositories/postgres/`; services and HTTP stay unchanged. The schema is plain `.sql` in `db/migrations/`, applied by a small runner. Memory and Postgres versions share one set of behaviour ("contract") tests. `deps.ts` picks the storage from `DATABASE_URL`.

**Tech Stack:** Node.js 24, TypeScript, `pg` and `@types/pg` (new: Koray confirms before install), `node:test` + `tsx`. No other package.

**Spec:** `docs/superpowers/specs/2026-11-07-bookpal-database-design.md` (copied from the teacher's `ritma-database-design.md`; his plan `ritma-for-individual/docs/superpowers/plans/2026-11-05-ritma-database.md` is the reference, read-only).

## Global Constraints

- No library besides `pg` and `@types/pg`; ask Koray before installing them (no `npm` on his machine: snap npm `node /snap/kf6-core22/43/usr/lib/node_modules/npm/bin/npm-cli.js install pg` and `... install -D @types/pg`, run inside `backend/`).
- File and folder names are English ASCII. Schema files live in `db/migrations/` at the repo root; code under `backend/`. Visible text (error messages) is Turkish.
- API contract and service behaviour do not change: `api-contract/openapi.yaml` is not edited; the 108 existing backend tests keep passing on memory without `DATABASE_URL`.
- Dates are `YYYY-MM-DD` text and times `HH:MM` text when read back (never `Date`, never `'09:30:00'`).
- Overlap rule: the same user cannot have two non-cancelled appointments overlapping on one day; one ending at `11:00` and another starting at `11:00` is allowed.
- Session tokens are stored only as SHA-256 hex; `Session.token` returned to the caller is the plain token.
- Never read, print or edit `.env`. The real `DATABASE_URL` is touched only by `db:check`, `db:migrate` and the running server; tests use `TEST_DATABASE_URL` and skip Postgres tests when it is unset. The connection address never appears in any output, error message or log.
- Backend work is test first (red watched, then green). `npm test` does not type-check: also run `npm run build`. Run without npm: tests `node --import tsx --test "src/**/*.test.ts"`, one file `node --import tsx --test src/<path>.test.ts`, build `node node_modules/typescript/bin/tsc` (inside `backend/`); with the test database: add `--env-file=.env` after `node`.
- One task is one feature branch (`feat/db-...`) and one PR; Koray merges. Never push `main`.

## Review Focus

1. Date/time drift: `birth_date` `'2000-01-01'`, appointment `date` `'2026-11-05'`, times `'09:30'` read back unchanged (Tasks 2 and 3).
2. Back-to-back appointments `10:00–11:00` and `11:00–12:00` are both accepted (Task 3).
3. A cancelled appointment does not hold its slot; turning a cancelled one back to `scheduled` into an occupied slot is refused (Task 3).
4. Two simultaneous `saveIfNoConflict` for the same slot: exactly one wins (Task 3).
5. An unknown or empty session token makes `find` return `undefined`, never throw; a deleted session is gone (Task 4).
6. A migration that fails halfway is rolled back and not recorded; a second run does nothing (Task 2).
7. `DATABASE_URL` set but unreachable: the server stops with a clear message that does not contain the address, and does not fall back to memory (Task 6).

---

### Task 1: Setup (packages, `.env` loading, `databaseUrl`, `db:check`)

Branch `feat/db-setup`.

**Files:**
- Modify: `backend/package.json`, `backend/package-lock.json` (via install), `backend/src/config.ts`, `backend/src/config.test.ts` (create it if no config test file exists), `backend/.env.example`, `CLAUDE.md`
- Create: `backend/scripts/db-check.ts`

**Interfaces:**
- Produces: `Config.databaseUrl: string | undefined` (`loadConfig(env)`; trimmed `env.DATABASE_URL`, empty or missing means `undefined`).
- Produces: scripts `dev`, `start`, `db:check` that load `.env` with `node --env-file-if-exists=.env` (`test` and `build` do not); `"db:check": "node --env-file-if-exists=.env --import tsx scripts/db-check.ts"`.

- [ ] **Step 1: Ask Koray, then install** `pg` (dependency) and `@types/pg` (dev) in `backend/` with the snap npm; check `package.json` lists exactly those two additions.
- [ ] **Step 2: Write the failing test** for `loadConfig`: `loadConfig({ DATABASE_URL: ' postgres://u:p@h/db ' }).databaseUrl` is `'postgres://u:p@h/db'`; `loadConfig({}).databaseUrl` and `loadConfig({ DATABASE_URL: '  ' }).databaseUrl` are `undefined`. Run it; expect FAIL (property missing).
- [ ] **Step 3: Implement** `databaseUrl` in `config.ts`. Run; expect PASS.
- [ ] **Step 4: Write `scripts/db-check.ts`** copied in spirit from the teacher's (`ritma-for-individual/backend/scripts/db-check.ts`): exit 1 with a Turkish "DATABASE_URL tanımlı değil" message when unset; otherwise `pg.Client` connect, query `current_database()`, print only `Bağlantı başarılı. Veritabanı: <name>`; on failure print only `error.message` after checking it does not contain the address (replace the address with `***` if it does); always `client.end()`.
- [ ] **Step 5: Update scripts and docs.** Add the `--env-file-if-exists=.env` flag to `dev` and `start`, add `db:check`. In `.env.example` add `TEST_DATABASE_URL=` with a comment: direct (not pooled) address of a separate Neon branch, Postgres tests are skipped when empty. In `CLAUDE.md` Backend section note the new scripts and that `npm run dev` watch mode does not pick up `package.json` script changes (restart by hand).
- [ ] **Step 6: Verify.** `node --import tsx --test "src/**/*.test.ts"` → 108+ pass; build clean. Koray runs `npm run db:check` himself (or Claude runs it and only quotes the two-line output); expect "Bağlantı başarılı". Commit `feat: pg kurulumu, .env yükleme ve db:check`, push the branch.

---

### Task 2: Schema, pool, migration runner, test database helper

Branch `feat/db-schema`. Needs `TEST_DATABASE_URL` in Koray's `backend/.env` (a separate Neon branch, direct address): ask him to add it before Step 2.

**Files:**
- Create: `db/migrations/001_init.sql`, `backend/src/db/pool.ts`, `backend/src/db/migrate.ts`, `backend/src/test-db.ts`, `backend/scripts/migrate.ts`
- Test: `backend/src/db/migrate.test.ts`
- Modify: `backend/tsconfig.json` (`exclude` also `src/test-db.ts` and `src/repositories/contract`), `backend/package.json` (`"db:migrate": "node --env-file-if-exists=.env --import tsx scripts/migrate.ts"`)

**Interfaces:**
- Produces: `createPool(databaseUrl: string): pg.Pool` (`db/pool.ts`; type parsers passed via the pool's `types` option, not global: OID 1082 `date` returned as is (`'YYYY-MM-DD'`), OID 1083 `time` cut to the first 5 characters).
- Produces: `runMigrations(pool: pg.Pool, dir: string): Promise<string[]>` (`db/migrate.ts`; `.sql` files in name order, each in one transaction `BEGIN`/`COMMIT`/`ROLLBACK`, row written to `schema_migrations(name text primary key, applied_at timestamptz not null default now())` in the same transaction; returns the file names applied in this run). `MIGRATIONS_DIR: string` = `path.resolve(import.meta.dirname, '../../../db/migrations')`.
- Produces (`src/test-db.ts`): `testDbEnabled: boolean` (`TEST_DATABASE_URL` set); `openTestDb(): Promise<{ pool: pg.Pool; reset(): Promise<void>; close(): Promise<void> }>` (random-named schema, pool with `max: 1` and `search_path` set to that schema then `public`, migrations applied; `reset()` truncates `appointments, clients, sessions, users` with CASCADE; `close()` drops the schema and ends the pool); `withTestDb(run: (pool: pg.Pool) => Promise<void>): Promise<void>`. If the given address is a Neon pooled one (`-pooler` in the host), use the direct host (remove `-pooler`).

- [ ] **Step 1: Write `001_init.sql`** exactly as the spec's Schema section: `btree_gist` extension in `public`, `users` (+ unique index on `lower(email)`), `clients` (+ partial index), `appointments` (CHECKs, the `EXCLUDE USING gist` rule, `(user_id, date)` index), `sessions`.
- [ ] **Step 2: Write the failing test `migrate.test.ts`**, every test `{ skip: !testDbEnabled }`: (a) inside `withTestDb` the tables `users, clients, appointments, sessions, schema_migrations` exist and a second `runMigrations` returns `[]`; (b) with a temp folder (`os.tmpdir()`) holding `001_ok.sql` (`create table t1(id int);`) and `002_bad.sql` (`create table t2(id int); select 1/0;`), `runMigrations` rejects, `t1` exists, `t2` does not, and only `001_ok.sql` is recorded (Review Focus 6); (c) `createPool(...)` returns `{ d: '2000-01-01', t: '09:30' }` for `select '2000-01-01'::date as d, '09:30'::time as t` (Review Focus 1).
- [ ] **Step 3: Run it** (`node --env-file=.env --import tsx --test src/db/migrate.test.ts`); expect FAIL on missing modules.
- [ ] **Step 4: Implement** `pool.ts`, `migrate.ts`, `test-db.ts` (signatures above), `scripts/migrate.ts` (use `loadConfig(process.env).databaseUrl`; Turkish error and exit 1 if unset; print applied files or "Yeni migration yok"; close the pool), the `db:migrate` script and the tsconfig change.
- [ ] **Step 5: Verify.** Step 3 command → PASS. Without `--env-file`: `npm test` equivalent → Postgres tests skipped, rest pass; build clean. Commit `feat: veritabanı şeması ve migration çalıştırıcı`, push.

---

### Task 3: Client repository and shared contract tests

Branch `feat/db-clients`.

**Files:**
- Create: `backend/src/repositories/contract/client-repository.contract.ts`, `backend/src/repositories/postgres/client-repository.ts`
- Test: `backend/src/repositories/postgres/client-repository.test.ts`
- Modify: `backend/src/repositories/memory/client-repository.test.ts` (also runs the contract)

**Interfaces:**
- Consumes: `withTestDb`/`openTestDb`/`testDbEnabled` (Task 2); `ClientRepository` (`repositories/types.ts`).
- Produces: `RepoContext = { seedUser(id: string): Promise<void> }` (exported from this contract file; Postgres inserts a `users` row, memory does nothing).
- Produces: `clientRepositoryContract(label: string, setup: () => Promise<{ repo: ClientRepository } & RepoContext>, options?: { skip?: boolean }): void` (registers `node:test` tests).
- Produces: `class PostgresClientRepository implements ClientRepository` with `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Write the contract tests.** Scenarios: `create` then `findById` returns the same client (`birthDate: '2000-01-01'` as text); another user's `findById` is `undefined`; `listActive` returns only that user's non-deleted clients; after `update` with `deletedAt` set the client leaves `listActive` but `findById` still finds it; `update` saves a name change.
- [ ] **Step 2: Call the contract from the memory test file and run it;** expect PASS (if a scenario disagrees with memory behaviour, memory is the reference: fix the contract).
- [ ] **Step 3: Write the Postgres test file** (`before` opens the test db, `after` closes, each `setup` calls `reset()`; `{ skip: !testDbEnabled }`). Run with `--env-file=.env`; expect FAIL (class missing).
- [ ] **Step 4: Implement `PostgresClientRepository`.** Map `first_name`↔`firstName`, `birth_date`↔`birthDate`, `deleted_at`↔`deletedAt` (ISO text or `null`; a given ISO string must read back as the same `toISOString()` form); `update` is an `UPDATE ... WHERE id` (and `user_id`); `listActive` filters `deleted_at is null`.
- [ ] **Step 5: Verify** with and without `--env-file`, plus build. Commit `feat: danışan deposunun Postgres gerçeklemesi`, push.

---

### Task 4: Appointment repository

Branch `feat/db-appointments`.

**Files:**
- Create: `backend/src/repositories/contract/appointment-repository.contract.ts`, `backend/src/repositories/postgres/appointment-repository.ts`
- Test: `backend/src/repositories/postgres/appointment-repository.test.ts`
- Modify: `backend/src/repositories/memory/appointment-repository.test.ts`

**Interfaces:**
- Consumes: `RepoContext` (Task 3), `AppointmentRepository`, `withTestDb`.
- Produces: `appointmentRepositoryContract(label, setup: () => Promise<{ repo: AppointmentRepository; seedClient(userId: string, clientId: string): Promise<void> } & RepoContext>, options?)`.
- Produces: `class PostgresAppointmentRepository implements AppointmentRepository` with `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Write the contract tests**, covering the existing memory behaviours plus: `10:00–11:00` then `11:00–12:00` both saved (Focus 2); `10:30–11:30` against `10:00–11:00` returns `undefined` and writes nothing; a cancelled `10:00–11:00` does not block the same slot; changing a cancelled one to `scheduled` into an occupied slot returns `undefined` (Focus 3); another user's identical slot is not a conflict; `findById`/`delete` for another user give `undefined`/`false`; `listByDateRange` is inclusive at both ends and ordered by date then start time; `Promise.all` of two different appointments for one slot gives exactly one `undefined` (Focus 4); `date: '2026-11-05'`, `startTime: '09:30'` read back unchanged (Focus 1).
- [ ] **Step 2: Call the contract from the memory test and run;** expect PASS.
- [ ] **Step 3: Write the Postgres test file** (same open/reset/close pattern; `seedClient` inserts a `clients` row). Run; expect FAIL.
- [ ] **Step 4: Implement `PostgresAppointmentRepository`.** `saveIfNoConflict`: `INSERT ... ON CONFLICT (id) DO UPDATE` setting every column except `id` and `user_id`; catch SQLSTATE `23P01` and return `undefined`, rethrow anything else. `listByDateRange`: `ORDER BY date, start_time`. `delete`: `true` when a row was removed.
- [ ] **Step 5: Verify** with and without `--env-file`, plus build. Commit `feat: randevu deposunun Postgres gerçeklemesi`, push.

---

### Task 5: Session store

Branch `feat/db-sessions`.

**Files:**
- Create: `backend/src/repositories/contract/session-store.contract.ts`, `backend/src/repositories/postgres/session-store.ts`
- Test: `backend/src/repositories/postgres/session-store.test.ts`
- Modify: `backend/src/repositories/memory/session-store.test.ts`

**Interfaces:**
- Consumes: `RepoContext`, `SessionStore`, `Session`.
- Produces: `sessionStoreContract(label, setup: () => Promise<{ store: SessionStore } & RepoContext>, options?)`; `class PostgresSessionStore implements SessionStore` with `constructor(pool: pg.Pool)`.

- [ ] **Step 1: Write the contract tests:** a created session can be found; after `delete` it cannot; two tokens differ and match `/^[0-9a-f]{64}$/`; `find('yok')` and `find('')` return `undefined` without throwing (Focus 5); `createdAt` is an ISO string; `delete` of an unknown token does not throw.
- [ ] **Step 2: Call the contract from the memory test and run;** expect PASS.
- [ ] **Step 3: Write the Postgres test file** plus one extra test: `select token_hash from sessions` is not equal to `session.token` and matches `/^[0-9a-f]{64}$/`. Run; expect FAIL.
- [ ] **Step 4: Implement `PostgresSessionStore`:** `create` makes `randomBytes(32).toString('hex')`, stores `createHash('sha256').update(token).digest('hex')`, returns the plain token in `Session.token`; `find` and `delete` hash the incoming token first.
- [ ] **Step 5: Verify** with and without `--env-file`, plus build. Commit `feat: oturum deposunun Postgres gerçeklemesi`, push.

---

### Task 6: Wiring (`buildDeps`), demo users, end-to-end

Branch `feat/db-wiring`.

**Files:**
- Modify: `backend/src/deps.ts`, `backend/src/server.ts`, `backend/src/e2e.test.ts` (add `await` to its `buildDeps` calls), `backend/src/auth/demo-identity-provider.ts` (export the user part)
- Create: `backend/src/db/users.ts`
- Test: `backend/src/db/users.test.ts`, `backend/src/deps.test.ts`, `backend/src/e2e-postgres.test.ts`

**Interfaces:**
- Consumes: `createPool`, the three `Postgres*` classes, `loadConfig(env).databaseUrl`.
- Produces: `buildDeps(env: NodeJS.ProcessEnv): Promise<AppDeps>` (now async; the pool stays open for the life of the process).
- Produces: `upsertUsers(pool: pg.Pool, users: readonly User[]): Promise<void>` (`db/users.ts`; `INSERT ... ON CONFLICT (id) DO UPDATE SET email, display_name`).
- Produces: `DEMO_USERS: readonly User[]` exported from `demo-identity-provider.ts` (users only, passwords stay private).

- [ ] **Step 1: Write `users.test.ts`** (`{ skip: !testDbEnabled }`): `upsertUsers` twice keeps the row count; a changed `displayName` is updated.
- [ ] **Step 2: Write `deps.test.ts`** (no Postgres needed): `await buildDeps({})` works on memory and a demo login succeeds; `await buildDeps({ DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db' })` rejects with a Turkish message saying the database could not be reached and not containing `u:p@` (Focus 7).
- [ ] **Step 3: Write `e2e-postgres.test.ts`** (`{ skip: !testDbEnabled }`): with a Postgres-backed `AppDeps` on the test pool (demo users upserted): Elif logs in, creates a client and an appointment (201), a second appointment in the same slot gets 409, and a second app instance built on the same pool still returns the data (persistence). Use `ELIF` from `test-support.ts`.
- [ ] **Step 4: Run the new tests;** expect FAIL (`buildDeps` is sync and never connects).
- [ ] **Step 5: Implement** `upsertUsers`, the `DEMO_USERS` export, and async `buildDeps`: with `databaseUrl` set, `createPool`, check the connection with `SELECT 1` (on failure throw a Turkish error without the address), upsert `DEMO_USERS` when `demoAccountsEnabled`, wire the Postgres repositories (clients, appointments, sessions); otherwise the current memory wiring. In `server.ts` `await buildDeps(process.env)`; on error print the message and `process.exit(1)`.
- [ ] **Step 6: Verify:** `npm test` equivalent without `--env-file` (all pass, Postgres ones skipped), with `--env-file=.env` for `db/users`, `deps` and `e2e-postgres`, and build. Commit `feat: DATABASE_URL varsa Postgres depolarını kullan`, push.

---

### Task 7: Real database check and docs

Branch `docs/db-verification`.

**Files:**
- Modify: `CLAUDE.md` (Backend section)

- [ ] **Step 1: Apply the migration to the real database:** `npm run db:migrate` in `backend/`. Expect `001_init.sql` applied; a second run prints "Yeni migration yok".
- [ ] **Step 2: Start the server** (`npm run dev` on a spare port such as 3139 with `PORT=3139`; wait for the "Bookpal http://localhost:3139 adresinde çalışıyor" line) and in the browser: log in as Elif, add a client and an appointment, a second appointment in the same slot gives the 409 warning, stop and restart the server, log in again: client and appointment are still there. Stop the server by exact PID.
- [ ] **Step 3: Check the third success point:** `npm test` without `--env-file` passes everything on memory.
- [ ] **Step 4: Update `CLAUDE.md`:** state that data is in Neon when `DATABASE_URL` is set and in memory otherwise; list `db:migrate`, `db:check`, `TEST_DATABASE_URL` and `db/migrations/`; add `repositories/postgres/`, `repositories/contract/` and `db/` to the layout line; note the `.env` rules.
- [ ] **Step 5: Run everything a last time** (`npm test`, build, the Postgres tests with `--env-file=.env`, frontend tests untouched). Commit `docs: CLAUDE.md veritabanı bilgileriyle güncellendi`, push.
