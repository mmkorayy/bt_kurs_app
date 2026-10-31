# Bookpal Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Bookpal's in-memory TypeScript/Express API under `backend/`: login, clients, appointments with ownership and overlap rules, served together with `web/`.

**Architecture:** Routes (`http/`) call services (`services/`), which call repository interfaces (`repositories/types.ts`) implemented in memory (`repositories/memory/`). `deps.ts` wires everything, `app.ts` mounts routes, `server.ts` starts it. Login is behind an `IdentityProvider` interface.

**Tech Stack:** Node.js, Express 5, TypeScript, `tsx` (dev), `tsc` (build), Node's built-in test runner. No other libraries.

**Spec:** `docs/superpowers/specs/2026-11-01-bookpal-backend-design.md`

## Global Constraints

- TypeScript + Node.js + Express 5; data in memory; npm; `"type": "module"`; no libraries beyond Express, `typescript`, `tsx`, `@types/node`, `@types/express`.
- Code in `backend/src/`; tests are `*.test.ts` next to the code; run with `node --import tsx --test "src/**/*.test.ts"` from `backend/`. `tsc` excludes `src/**/*.test.ts` and `src/test-support.ts`.
- English ASCII names for files, folders, classes, routes, JSON fields. API error messages are Turkish. No personal data (names, birth dates, notes) in logs.
- API under `/api/v1`, JSON only. Errors: `{ "error": { "code", "message" } }`; codes `validation_error` 400, `unauthorized` 401, `not_found` 404, `conflict` 409, `server_error` 500. Bad JSON is 400.
- Dates `YYYY-MM-DD`, times `HH:mm`; end time after start time; date range at most 366 days; gender `female|male|other|undisclosed`; status `scheduled|completed|cancelled`; birth date required and not in the future.
- Every repository method touching user data takes `userId`. Another user's record is `404`. Overlap (same user, same date, intersecting range, start==end of another is fine, `cancelled` ignored, self excluded on edit) is `409`.
- Session cookie `bookpal_session` (`HttpOnly; SameSite=Lax; Path=/`, plus `Secure` in production) or `Authorization: Bearer`. Demo users `elif@bookpal.demo`/`demo-elif-123` and `mert@bookpal.demo`/`demo-mert-123`, salted scrypt hashes; `DEMO_ACCOUNTS_ENABLED` true/false, default on, off when `NODE_ENV=production`. `PORT` default 3000.
- Work on branch `feat/backend`. Nothing is committed or pushed unless Koray asks. Do not change `web/` except by serving it.

## Review Focus

- A malformed JSON body or a non-object body gives 400, never 500 (Task 7 test).
- Creating an appointment with another user's client id gives 404 (Task 9 test).
- Patching a `cancelled` appointment back to `scheduled` into a taken slot gives 409 (Task 5 test).
- Search "ilker" finds "İlker" and "IŞIK" finds "ışık" (Task 2 and Task 4 tests).
- A request with a missing, unknown or logged-out token gets 401 on every protected route (Task 7 and Task 10 tests).

---

### Task 1: Scaffold and health endpoint

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/.gitignore` (`node_modules`, `dist`), `backend/src/app.ts`
- Test: `backend/src/app.test.ts`

**Interfaces:**
- Produces: `interface AppDeps { production: boolean; staticDir?: string }` (later tasks add fields) and `createApp(deps: AppDeps): express.Express` in `src/app.ts`, with `GET /api/v1/health` answering `200 {"status":"ok"}`.

- [ ] **Step 1: Write the failing test** `app.test.ts`: `health endpoint answers ok` starts `createApp({ production: false }).listen(0)`, fetches `/api/v1/health`, asserts status 200 and JSON `{ status: "ok" }`, then closes the server.
- [ ] **Step 2: Create `package.json`** (name `bookpal-backend`, scripts `test`, `dev` = `node --import tsx --watch src/server.ts`, `build` = `tsc`, `start` = `node dist/server.js`) and `tsconfig.json` (target ES2022, module/moduleResolution NodeNext, strict, esModuleInterop, skipLibCheck, outDir `dist`, rootDir `src`, include `src`, exclude test files and `src/test-support.ts`), then run `npm install express` and `npm install -D typescript tsx @types/node @types/express` in `backend/`.
- [ ] **Step 3: Run the test.** Run `npm test` in `backend/`. Expected: FAIL, `createApp` is missing.
- [ ] **Step 4: Implement `createApp`** with `express.json()` and the health route.
- [ ] **Step 5: Run the test.** Expected: PASS. Run `npm run build`; expected no errors.
- [ ] **Step 6: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: backend iskeleti ve sağlık uç noktası"`.

---

### Task 2: Domain types, errors, validation, search folding

**Files:**
- Create: `backend/src/domain/types.ts`, `errors.ts`, `validation.ts`, `search.ts`
- Test: `backend/src/domain/validation.test.ts`, `backend/src/domain/search.test.ts`

**Interfaces:**
- Produces in `types.ts`: `Gender`, `AppointmentStatus`, `GENDERS`, `APPOINTMENT_STATUSES`, `User {id,email,displayName}`, `Client {id,userId,firstName,lastName,birthDate,gender,deletedAt: string|null}`, `Appointment {id,userId,clientId,date,startTime,endTime,status,note}`, `ClientInput {firstName,lastName,birthDate,gender}`, `AppointmentInput {clientId,date,startTime,endTime,status,note}`.
- Produces in `errors.ts`: `ErrorCode`, `class AppError(status: 400|401|404|409, code, message)`, and `validationError`, `unauthorized`, `notFound`, `conflict` (each `(message: string) => AppError`).
- Produces in `validation.ts`: `isValidDate(s)`, `isValidTime(s)`, `parseClientInput(body: unknown, today: string): ClientInput`, `parseClientPatch(body, today): Partial<ClientInput>`, `parseAppointmentInput(body): AppointmentInput` (status defaults `scheduled`, note defaults `""`), `parseAppointmentPatch(body): Partial<AppointmentInput>`, `parseDateRange(from: unknown, to: unknown): {from, to}`. All throw `validationError` with a Turkish message.
- Produces in `search.ts`: `foldForSearch(s: string): string` (lowercases, maps İ/I/ı to i, strips accents).

- [ ] **Step 1: Write the failing tests.** `validation.test.ts`: `isValidDate` accepts `2026-02-28`, rejects `2026-02-30` and `2026-2-3`; `isValidTime` accepts `00:00` and `23:59`, rejects `24:00` and `9:30`; `parseClientInput` rejects a blank first name, a birth date after `today`, an unknown gender, and a non-object body, and trims names; `parseClientPatch` rejects `{}`; `parseAppointmentInput` rejects `endTime <= startTime` and accepts `endTime` of `10:30` after `10:00`, defaulting status and note; `parseDateRange` rejects `to < from` and a range of 367 days and accepts 366 days. `search.test.ts`: `foldForSearch("İlker") === foldForSearch("ilker")`, `foldForSearch("IŞIK") === foldForSearch("ışık")`, accents are stripped (`"Çağla"` equals `"cagla"` after folding).
- [ ] **Step 2: Run them.** `npm test` in `backend/`. Expected: FAIL, modules missing.
- [ ] **Step 3: Implement the four modules** with the signatures above.
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: alan tipleri, hata sınıfları ve girdi doğrulama"`.

---

### Task 3: Repository interfaces and in-memory implementations

**Files:**
- Create: `backend/src/repositories/types.ts`, `repositories/memory/client-repository.ts`, `appointment-repository.ts`, `session-store.ts`
- Test: matching `*.test.ts` next to each memory file

**Interfaces:**
- Consumes: `Client`, `Appointment` (Task 2).
- Produces in `types.ts`: `ClientRepository { create(client): Promise<Client>; findById(userId, id): Promise<Client|undefined> /* includes deleted */; listActive(userId): Promise<Client[]>; update(client): Promise<Client> }`; `AppointmentRepository { findById(userId, id); listByDateRange(userId, from, to): Promise<Appointment[]> /* inclusive, sorted by date then startTime */; saveIfNoConflict(appointment): Promise<Appointment|undefined> /* insert or update by id; undefined and nothing written on overlap */; delete(userId, id): Promise<boolean> }`; `Session {token,userId,createdAt}`; `SessionStore { create(userId): Promise<Session>; find(token): Promise<Session|undefined>; delete(token): Promise<void> }`.
- Produces: `MemoryClientRepository`, `MemoryAppointmentRepository`, `MemorySessionStore` implementing them.

- [ ] **Step 1: Write the failing tests.** Client repo: a client is invisible to another `userId` in `findById` and `listActive`; `listActive` skips a client with `deletedAt` set while `findById` still returns it. Appointment repo: `saveIfNoConflict` returns `undefined` and stores nothing for an overlapping active appointment (same user, same date, `10:00-11:00` vs `10:30-11:30`); allows `11:00-12:00` after `10:00-11:00`; ignores a `cancelled` one; saving the same `id` again does not conflict with itself; saving a `cancelled` appointment never conflicts; a different user's overlapping slot is allowed; `listByDateRange` is inclusive, user-scoped and sorted; `delete` returns `false` for another user's id. Session store: `create` gives a 64-hex-character token, `find` returns it, `delete` removes it.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the interfaces and the three memory classes** (Map-based; no `await` between the overlap check and the write in `saveIfNoConflict`).
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: depo arayüzleri ve bellek gerçeklemeleri"`.

---

### Task 4: ClientService

**Files:**
- Create: `backend/src/services/client-service.ts`
- Test: `backend/src/services/client-service.test.ts`

**Interfaces:**
- Consumes: `ClientRepository`, `Client`, `ClientInput`, `notFound`, `foldForSearch`.
- Produces: `class ClientService(clients: ClientRepository, clock: () => Date = () => new Date())` with `create(userId, input: ClientInput): Promise<Client>` (new uuid, `deletedAt: null`), `get(userId, id): Promise<Client>` (404 `notFound` for missing, other user's or deleted), `search(userId, query = ''): Promise<Client[]>` (active clients, folded "contains" match on `"first last"`, sorted by last then first name with `localeCompare(..., 'tr')`), `update(userId, id, patch: Partial<ClientInput>): Promise<Client>`, `softDelete(userId, id): Promise<void>` (sets `deletedAt` to `clock().toISOString()`).

- [ ] **Step 1: Write the failing tests** (using `MemoryClientRepository`): created client is returned by `get`; another user gets `notFound` (`AppError` with status 404); `search("ilker")` finds a client named `İlker`; `search("IŞIK")` finds `ışık`; empty query lists all active, sorted; `update` changes only given fields; `softDelete` hides the client from `search` and `get` and sets `deletedAt` to the injected clock's ISO time; deleting twice gives 404.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `ClientService`** as specified.
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: danışan servisi (sahiplik, arama, soft delete)"`.

---

### Task 5: AppointmentService

**Files:**
- Create: `backend/src/services/appointment-service.ts`
- Test: `backend/src/services/appointment-service.test.ts`

**Interfaces:**
- Consumes: `AppointmentRepository`, `ClientRepository`, `Appointment`, `AppointmentInput`, `conflict`, `notFound`, `validationError`.
- Produces: `interface AppointmentView extends Appointment { client: { id; firstName; lastName } }` and `class AppointmentService(appointments: AppointmentRepository, clients: ClientRepository)` with `list(userId, from, to): Promise<AppointmentView[]>`, `get(userId, id)`, `create(userId, input: AppointmentInput)` (client must exist, belong to the user and be active, else 404; overlap gives 409 `conflict` "Bu saat aralığında başka bir randevunuz var."), `update(userId, id, patch: Partial<AppointmentInput>)` (merged record must still have `endTime > startTime` else 400; client re-checked only when `clientId` changes; overlap re-checked through `saveIfNoConflict`), `remove(userId, id): Promise<void>` (404 when missing). A view's client name still resolves for a soft-deleted client.

- [ ] **Step 1: Write the failing tests:** creating with another user's client id is `notFound`; creating with a deleted client is `notFound`; an overlapping create is a 409 `AppError` with code `conflict`; `10:00-11:00` then `11:00-12:00` is allowed; cancelling frees the slot for a new appointment; `update` of an appointment's own time range does not conflict with itself; patching `cancelled` back to `scheduled` into a taken slot is 409; patching `endTime` before `startTime` is 400; `get` of another user's id is 404; `list` shows the client name after the client is soft-deleted; `remove` then `get` is 404.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `AppointmentService`** as specified.
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: randevu servisi (çakışma, sahiplik, durum geçişleri)"`.

---

### Task 6: Identity provider, demo accounts, session service

**Files:**
- Create: `backend/src/auth/identity-provider.ts`, `auth/demo-identity-provider.ts`, `auth/session-service.ts`
- Test: `demo-identity-provider.test.ts`, `session-service.test.ts` next to them

**Interfaces:**
- Consumes: `User`, `SessionStore`, `unauthorized`.
- Produces: `interface Credentials {email; password}`, `interface IdentityProvider { authenticate(c: Credentials): Promise<User|undefined>; findUser(id: string): Promise<User|undefined> }`, `class DemoIdentityProvider implements IdentityProvider` (two demo users from the spec, salted scrypt hashes, email compared trimmed and lowercased, `timingSafeEqual`), `class SessionService(provider: IdentityProvider, store: SessionStore)` with `login(c): Promise<{token; user}>` (401 `unauthorized` "E-posta veya parola hatalı." on failure), `authenticateToken(token: string|undefined): Promise<User>` (401 "Oturum açmanız gerekiyor." for missing or unknown token or unknown user), `logout(token): Promise<void>`.

- [ ] **Step 1: Write the failing tests:** demo provider accepts both accounts, trims and lowercases the email (`" ELIF@bookpal.demo "`), rejects a wrong password and an unknown email, `findUser("demo-user-elif")` returns the user; session service: login gives a token usable in `authenticateToken`, wrong password is a 401 `AppError`, `undefined` and unknown tokens are 401, after `logout` the token is 401.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the three files** as specified (user ids `demo-user-elif` and `demo-user-mert`, display names `Elif Yıldız` and `Mert Kaya`).
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: kimlik sağlayıcı arayüzü, demo hesaplar ve oturum servisi"`.

---

### Task 7: HTTP foundations, auth routes, test support

**Files:**
- Create: `backend/src/http/error-handler.ts`, `http/cookies.ts`, `http/auth-middleware.ts`, `http/auth-routes.ts`, `backend/src/test-support.ts`
- Modify: `backend/src/app.ts` (add `sessions: SessionService` to `AppDeps`, mount auth router at `/api/v1/auth`, mount a catch-all for unknown `/api/...` paths that raises `notFound("Adres bulunamadı.")`, serve `staticDir` when given, then `errorHandler`)
- Test: `backend/src/http/auth-routes.test.ts`

**Interfaces:**
- Consumes: `SessionService`, `AppError`, `parseCookies`.
- Produces: `errorHandler: ErrorRequestHandler` (maps `AppError`; Express JSON parse failure `entity.parse.failed` to 400 `validation_error`; anything else to 500 `server_error` with a generic message and no body details logged); `SESSION_COOKIE = "bookpal_session"`, `parseCookies(header)`, `sessionCookie(token, production)`, `clearedSessionCookie(production)`; `extractToken(req): string|undefined` (Bearer first, then cookie), `requireAuth(sessions): RequestHandler` (sets `req.user`); `createAuthRouter(sessions, production): Router` with `POST /login` (400 if email or password is not a string), `POST /logout` (204, clears cookie), `GET /me`; in `test-support.ts`: `ELIF`/`MERT` credentials constants, `buildTestDeps(over?: Partial<AppDeps>): AppDeps` (demo provider, memory stores, `production: false`), `startTestServer(deps = buildTestDeps()): { baseUrl; close(): void; login(credentials): Promise<{ token; api(path: string, init?: {method?; body?}): Promise<Response> }> }` where `api` sends `Authorization: Bearer` to `/api/v1` + path.

- [ ] **Step 1: Write the failing tests** (real server + `fetch`): login with `ELIF` answers 200 with `token` and `user.email`, and a `Set-Cookie` header containing `bookpal_session=`, `HttpOnly` and `SameSite=Lax`; wrong password is 401 with `error.code === "unauthorized"`; login body `{}` is 400 `validation_error`; malformed JSON body (`{bad`) on login is 400 `validation_error`; `GET /auth/me` works with the Bearer token and with the cookie and returns 401 without either; logout is 204 and the same token then gets 401; an unknown `/api/v1/nope` path is 404 `not_found` JSON.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the files and the `app.ts` changes** as specified.
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: HTTP hata işleyici, kimlik doğrulama ve auth rotaları"`.

---

### Task 8: Client routes

**Files:**
- Create: `backend/src/http/client-routes.ts`
- Modify: `backend/src/app.ts` (add `clients: ClientService` to `AppDeps`, mount at `/api/v1/clients`), `backend/src/test-support.ts` (`buildTestDeps` adds a `ClientService`)
- Test: `backend/src/http/client-routes.test.ts`

**Interfaces:**
- Consumes: `ClientService`, `requireAuth`, `parseClientInput`, `parseClientPatch`.
- Produces: `todayLocal(now = new Date()): string` (local `YYYY-MM-DD`) and `createClientRouter(sessions, clients): Router`: `GET /` (optional `search` query) answering `{ clients: [...] }`, `POST /` answering 201 `{ client }`, `GET /:id`, `PATCH /:id` answering `{ client }`, `DELETE /:id` answering 204. Every route requires auth.

- [ ] **Step 1: Write the failing tests:** unauthenticated `GET /clients` is 401; create answers 201 with the new client; list `?search=ilker` finds `İlker`; invalid body (blank first name) is 400; `GET /:id` of another user's client is 404; `PATCH` changes a field; `DELETE` is 204 and the client is gone from the list and `GET` is 404; `PATCH {}` is 400.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the router and wiring.**
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: danışan rotaları"`.

---

### Task 9: Appointment routes

**Files:**
- Create: `backend/src/http/appointment-routes.ts`
- Modify: `backend/src/app.ts` (add `appointments: AppointmentService` to `AppDeps`, mount at `/api/v1/appointments`), `backend/src/test-support.ts` (`buildTestDeps` adds `AppointmentService` sharing the client repository)
- Test: `backend/src/http/appointment-routes.test.ts`

**Interfaces:**
- Consumes: `AppointmentService`, `requireAuth`, `parseAppointmentInput`, `parseAppointmentPatch`, `parseDateRange`.
- Produces: `createAppointmentRouter(sessions, appointments): Router`: `GET /?from=&to=` answering `{ appointments: AppointmentView[] }`, `POST /` answering 201 `{ appointment }`, `GET /:id`, `PATCH /:id`, `DELETE /:id` answering 204. Every route requires auth.

- [ ] **Step 1: Write the failing tests:** unauthenticated list is 401; create answers 201 with `appointment.client.firstName`; creating with another user's client id is 404; an overlapping create is 409 `conflict`; a touching one (`11:00-12:00` after `10:00-11:00`) is 201; list without `from` is 400; list over 367 days is 400; list is user-scoped; `PATCH` to `status: "cancelled"` then a new appointment in that slot is 201; `DELETE` is 204 then `GET` is 404.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the router and wiring.**
- [ ] **Step 4: Run the tests.** Expected: PASS; `npm run build` passes.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: randevu rotaları"`.

---

### Task 10: Config, wiring, server entry, end-to-end test

**Files:**
- Create: `backend/src/config.ts`, `backend/src/deps.ts`, `backend/src/server.ts`
- Test: `backend/src/config.test.ts`, `backend/src/e2e.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `interface Config { port: number; production: boolean; demoAccountsEnabled: boolean }` and `loadConfig(env: NodeJS.ProcessEnv): Config` (port `Number(env.PORT) || 3000`; production when `NODE_ENV === "production"`; demo accounts `true`/`false` from `DEMO_ACCOUNTS_ENABLED`, else on unless production); `buildDeps(env: NodeJS.ProcessEnv): AppDeps` (with demos off, a provider whose `authenticate` and `findUser` always return `undefined`); `server.ts` starts `createApp({ ...buildDeps(process.env), staticDir })` where `staticDir` is `../../web` relative to `src/` and `dist/`, logging only the port.

- [ ] **Step 1: Write the failing tests.** `config.test.ts`: defaults (3000, not production, demos on); `PORT=4000`; `NODE_ENV=production` turns demos off; `DEMO_ACCOUNTS_ENABLED=true` overrides production; `=false` overrides default. `e2e.test.ts` (real server): `ELIF` logs in, creates a client and an appointment, the overlapping one is 409, `MERT` logs in and sees an empty client list and gets 404 for ELIF's client id; with `staticDir` set to `bt_kurs_app/web` `GET /` returns the page containing `Bookpal`; with `buildDeps({ DEMO_ACCOUNTS_ENABLED: "false" })` login fails with 401.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the three files.**
- [ ] **Step 4: Run the tests and the build.** `npm test`, `npm run build`. Expected: all PASS, build clean. Then run `npm run dev`, open `http://localhost:3000`, check the page loads and `curl http://localhost:3000/api/v1/health` answers `{"status":"ok"}`; stop the server.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add backend && git commit -m "feat: sunucu girişi, statik servis ve uçtan uca test"`.

---

### Task 11: API contract and project docs

**Files:**
- Create: `api-contract/openapi.yaml`, `backend/src/contract.test.ts`
- Modify: `CLAUDE.md` (add a Backend section: commands, layers, routes rule, demo accounts, one-test command)

**Interfaces:**
- Consumes: `startTestServer`, `buildTestDeps`.
- Produces: `api-contract/openapi.yaml` (OpenAPI 3, server `/api/v1`, paths and methods listed in the spec's API section, request and response schemas, the error shape, both auth schemes); `contract.test.ts` holding a constant `ROUTES` list of `"METHOD /path"` strings for every implemented operation.

- [ ] **Step 1: Write the failing test** `contract.test.ts`: reads `openapi.yaml` as text, extracts `METHOD /path` pairs (path keys at two-space indent, methods at four-space indent), asserts the set equals `ROUTES` in both directions, and for each route asserts an unauthenticated request through `startTestServer` is not the 404 `"Adres bulunamadı."` (protected routes answer 401, login answers 400 or 401).
- [ ] **Step 2: Run it.** Expected: FAIL, `openapi.yaml` missing.
- [ ] **Step 3: Write `openapi.yaml`** with exactly the operations in `ROUTES`.
- [ ] **Step 4: Run the whole suite and build.** Expected: PASS, build clean.
- [ ] **Step 5: Update `CLAUDE.md`'s Backend section,** keeping it short and matching the existing file.
- [ ] **Step 6: Commit — ask Koray first.** If yes: `git add api-contract backend CLAUDE.md docs && git commit -m "docs: API sözleşmesi ve backend belgeleri"`.
