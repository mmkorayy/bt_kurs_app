# Bookpal Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-HTML landing page with one React app that also holds the panel: login, daily, weekly and monthly views, and clients.

**Architecture:** `frontend/` is its own Vite project (React + TypeScript). Express serves the built `frontend/dist` and returns `index.html` for browser-side routes. Pages call the existing `/api/v1` with the `bookpal_session` cookie; the backend API does not change.

**Tech Stack:** React, react-router, Vite, Vitest + Testing Library + jsdom; backend stays Node + Express 5 + TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-07-bookpal-frontend-design.md`

## Global Constraints

- Visible text is Turkish. File names, folder names, CSS classes and `id`s are English ASCII (URL `/panel/danisanlar`, tab label "Danışanlar").
- Allowed libraries without asking: `react`, `react-dom`, `react-router`; dev `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`, `@types/react`, `@types/react-dom`. Nothing else (no `@types/node`, `user-event`, `jest-dom`, YAML or UI libraries) without Koray's OK.
- Plain CSS in separate files next to the component (`import './X.css'`), class names prefixed per component (`.daily-…`). No `<style>` or `style=""` in markup. Colours only from `:root` variables in `src/styles/tokens.css`. Light theme only.
- Dates are `YYYY-MM-DD` text in local time. Never `toISOString()` or `Date.parse` for them.
- No browser `alert`/`confirm`; modals only. 360px wide, no sideways scrolling.
- `npm` is not installed. Install with `node /snap/kf6-core22/43/usr/lib/node_modules/npm/bin/npm-cli.js install` **after asking Koray**. Run tools directly from `frontend/`: tests `node node_modules/vitest/vitest.mjs run`, types `node node_modules/typescript/bin/tsc --noEmit`, build `node node_modules/vite/bin/vite.js build`. `package.json` still defines `dev`, `test`, `build` scripts (`build` is `tsc --noEmit && vite build`).
- Git: one feature branch per task (`feat/…`), commit when the task's tests pass (Turkish commit titles like the existing history), push the branch, never push `main`, never force-push, never merge. Koray merges the pull request; wait for his go-ahead, then `git switch main`, sync, and start the next task.
- Task completion check: frontend `vitest run` and `tsc --noEmit` pass; backend `node --import tsx --test "src/**/*.test.ts"` and `node node_modules/typescript/bin/tsc` pass; plus a manual browser check with the real backend (`backend/` `npm run dev`, `http://localhost:3000`).

## Review Focus

Inputs the spec implies but a happy-path test would miss, each pinned to the task that owns it:

1. **Day shift:** a date near midnight must not move to the wrong day in Turkey (UTC+3). Task 5 (`date.ts` tests run with `TZ=Europe/Istanbul`).
2. **Bad `?tarih=`** (`abc`, `2026-13-45`, empty): the view falls back to today, no crash. Task 5.
3. **401 mid-session:** the user lands on `/giris` once, with no redirect loop between `/giris` and `/panel`. Task 3.
4. **Deleted client:** editing an appointment of a deleted client lists that client as "Ad Soyad (silinmiş)" and keeps it selected. Task 5.
5. **Direct visit or refresh of `/panel/hafta`** returns the app; a missing file such as `/assets/missing.js` and any `/api/...` miss stay 404. Task 1.

---

## File Structure

```
frontend/                      index.html, package.json, tsconfig.json, vite.config.ts
  src/main.tsx, App.tsx, test-setup.ts, test-utils.tsx
  src/styles/                  tokens.css, base.css
  src/api/                     client.ts, types.ts, auth.ts, clients.ts, appointments.ts
  src/auth/                    AuthProvider.tsx, RequireAuth.tsx
  src/lib/                     date.ts, labels.ts, useApi.ts, useDebouncedValue.ts
  src/components/              Modal.tsx, ConfirmDialog.tsx (+ Modal.css)
  src/pages/landing|login|panel/{daily,weekly,monthly,clients}/   page + .css + test each
backend/src/http/spa-fallback.ts, backend/src/static-dir.ts        (+ tests)
```

Each page folder holds the page, its CSS and its test.

---

### Task 1: Scaffold and serving  (branch `feat/frontend-scaffold`)

**Files:**
- Create: everything under `frontend/` listed above except pages, `api/`, `auth/`, `lib/`, `components/`; `src/App.tsx` is a placeholder that shows "Bookpal" at `/`.
- Create: `backend/src/http/spa-fallback.ts`, `backend/src/http/spa-fallback.test.ts`, `backend/src/static-dir.ts`, `backend/src/static-dir.test.ts`
- Modify: `backend/src/app.ts`, `backend/src/server.ts`, `CLAUDE.md`

**Interfaces:**
- Produces: `createSpaFallback(staticDir: string): express.RequestHandler` (GET/HEAD only; skips `/api`, `/docs`, and paths with a file extension; otherwise sends `index.html`). `resolveStaticDir(repoRoot: string): string` returns `<repoRoot>/frontend/dist` if its `index.html` exists, else `<repoRoot>/web`.
- Produces: `frontend/src/styles/tokens.css` with the `:root` variables copied from `web/styles.css`; `base.css` with the reset, body gradient and `:focus-visible` rules from the same file.

- [ ] **Step 1: Ask Koray to approve `npm install` in `frontend/`.** Then create `package.json` with the allowed libraries, `vite.config.ts` (react plugin, `server.fs.allow: ['..']`, proxy `/api` and `/docs` to `http://localhost:3000`, vitest `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test-setup.ts'`, `css: false`), `tsconfig.json` (`strict`, `jsx: react-jsx`, `types: ["vite/client", "vitest/globals"]`), `index.html` (`lang="tr"`, `<div id="root">`). Install.
- [ ] **Step 2: Write the failing test** `src/App.test.tsx`: rendering `<App />` in a `MemoryRouter` at `/` shows text "Bookpal". Run vitest; expect FAIL (no `App`).
- [ ] **Step 3: Implement** `App.tsx`, `main.tsx` (`BrowserRouter`), `tokens.css`, `base.css`, `test-setup.ts` (empty). Vitest passes; `tsc --noEmit` passes.
- [ ] **Step 4: Write failing backend tests.** `spa-fallback.test.ts` uses a fixture folder from `fs.mkdtempSync(os.tmpdir())` holding an `index.html` containing "Bookpal App" and a real server (`startTestServer(buildTestDeps({ staticDir }))`): `GET /panel/hafta` is 200 with "Bookpal App"; `GET /assets/missing.js` is 404; `GET /api/v1/nope` is 404 with `{ error: { code: 'not_found' } }`; `GET /docs` is not swallowed. `static-dir.test.ts`: returns the `frontend/dist` path when its `index.html` exists in a temp repo root, otherwise the `web` path. Run; expect FAIL.
- [ ] **Step 5: Implement** both modules; in `app.ts` add `app.use(createSpaFallback(deps.staticDir))` right after `express.static`; in `server.ts` use `resolveStaticDir(path.resolve(import.meta.dirname, '../..'))`. Backend tests and `tsc` pass.
- [ ] **Step 6: Manual check.** Run the backend without a `frontend/dist` folder: `http://localhost:3000` shows the old landing page. Build the frontend and restart: `/` shows the "Bookpal" placeholder and `/panel/hafta` loads it too. Run Vite dev (`5173`) and confirm `/api/v1/health` is proxied.
- [ ] **Step 7: Update `CLAUDE.md`:** stack and layout (now two projects), frontend commands, the "no framework" rule replaced by the allowed-library list, `npm run build` in `frontend/` before `npm start`. Commit, push the branch.

---

### Task 2: Landing page moved  (branch `feat/frontend-landing`)

**Files:**
- Create: `frontend/src/pages/landing/{Landing.tsx,Landing.css,SignupForm.tsx,SignupForm.css,signup.ts,signup.test.ts,Landing.test.tsx,SignupForm.test.tsx}`
- Modify: `frontend/src/App.tsx`, `backend/src/server.ts`, `backend/src/static-dir.ts` (+ test), `backend/src/e2e.test.ts`, `CLAUDE.md`
- Delete: `web/` (last step)

**Interfaces:**
- Produces in `signup.ts`: `FORM_ENDPOINT = ''`, `validateSignup(values: SignupValues): SignupErrors`, `sendSignup(values: SignupValues, endpoint?: string): Promise<SendResult>`, ported from `web/script.js` with identical rules and messages. `SignupValues` is `{ name: string; email: string; profession: string }`.

- [ ] **Step 1: Capture "before" screenshots** of the old page at 1200px and 360px width into the scratchpad (browser pane or headless Chrome).
- [ ] **Step 2: Write failing tests.** `signup.test.ts`: one test per rule in `web/script.js` `validateSignup` (empty name, bad email, missing profession, valid input returns no errors); `sendSignup` with `FORM_ENDPOINT` empty returns a failure and never success; with a stubbed `fetch` returning 200 it succeeds and POSTs JSON. `SignupForm.test.tsx`: error messages appear under fields; with the empty endpoint the thank-you text never shows. `Landing.test.tsx`: headings "Randevularını ve danışanlarını tek yerde takip et" and "Nasıl çalışır?" exist, and a "Giriş" link points to `/giris`. Run; expect FAIL.
- [ ] **Step 3: Implement** the components one-to-one from `web/index.html` and `web/styles.css` (same classes, same text; split CSS per component, variables from `tokens.css`) and add the `/` route. Port logic from `web/script.js` as is, including its known gaps (spec: strict port). Tests, `tsc` and build pass.
- [ ] **Step 4: Compare.** Build, run backend, take "after" screenshots at 1200px and 360px, show Koray both sets side by side. Do not continue until he agrees they match.
- [ ] **Step 5: Remove `web/`.** Make `resolveStaticDir` return only `<repoRoot>/frontend/dist` (update its test); change the e2e test "the server also serves the web folder" into one that serves `frontend/dist`-like fixture and expects "Bookpal"; `git rm -r web`. Update `CLAUDE.md` (remove `web/` text and the old landing commands; keep the `FORM_ENDPOINT` rule with the new path `frontend/src/pages/landing/signup.ts`).
- [ ] **Step 6: Commit, push the branch.**

---

### Task 3: API client, session, login  (branch `feat/frontend-login`)

**Files:**
- Create: `frontend/src/api/{types.ts,client.ts,auth.ts}`, `src/api/types.test.ts`, `src/api/client.test.ts`, `src/auth/{AuthProvider.tsx,RequireAuth.tsx,auth.test.tsx}`, `src/lib/useApi.ts`, `src/test-utils.tsx`, `src/pages/login/{Login.tsx,Login.css,Login.test.tsx}`, `src/pages/panel/{PanelLayout.tsx,PanelLayout.css,PanelLayout.test.tsx}`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces `types.ts`: `User { id; email; displayName }`, `Gender`, `AppointmentStatus`, `Client`, `ClientInput`, `AppointmentView` (with `client: { id; firstName; lastName }`), `AppointmentInput`, matching `api-contract/openapi.yaml`.
- Produces `client.ts`: `class ApiError extends Error { status: number; code: string }`; `request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T>` (always `/api/v1` + path, JSON, cookie sent, 204 returns `undefined`, errors throw `ApiError` with the backend message, unreachable server throws `ApiError` with message "Sunucuya ulaşılamadı." and `status` 0); `setUnauthorizedHandler(fn: () => void): void` (called on any 401).
- Produces `AuthProvider` context `{ user: User | null; status: 'loading' | 'ready'; login(email: string, password: string): Promise<void>; logout(): Promise<void> }` and `useAuth()`; `RequireAuth` (renders `<Outlet />` or redirects to `/giris`); `useApi<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: ApiError | undefined; reload(): void }`.
- Produces `test-utils.tsx`: `renderApp(ui, { route })` (MemoryRouter + AuthProvider) and `stubFetch(handlers: Record<string, handler>)` keyed `"GET /api/v1/auth/me"`, returning `{ calls }`; an unmatched call throws so the test fails. `renderApp` always triggers `GET /api/v1/auth/me`.
- Produces `PanelLayout`: top bar with the logo, tabs Gün (`/panel`), Hafta (`/panel/hafta`), Ay (`/panel/ay`), Danışanlar (`/panel/danisanlar`), the user's `displayName` and a "Çıkış" button; the four routes render placeholder pages.

- [ ] **Step 1: Write failing tests.** `types.test.ts`: reads `../../../api-contract/openapi.yaml?raw` with a small line reader and asserts each field name used in `User`, `ClientInput`, `AppointmentInput`, `AppointmentView` exists in the matching schema. `client.test.ts`: 204 gives `undefined`; 400 gives `ApiError` with `code: 'validation_error'` and the Turkish message; a rejected `fetch` gives "Sunucuya ulaşılamadı."; a 401 calls the handler. `auth.test.tsx`: `/panel` without a session redirects to `/giris`; **after a 401 on any later call the user ends on `/giris` once and `GET /auth/me` is not retried in a loop** (Review Focus 3); logout calls `POST /api/v1/auth/logout` and returns to `/giris`. `Login.test.tsx`: wrong password shows the backend message under the form and keeps the typed email; success goes to `/panel`. `PanelLayout.test.tsx`: four tabs with the exact labels, the active one marked `aria-current="page"`. Run; expect FAIL.
- [ ] **Step 2: Implement** the modules above. Login form fields: "E-posta", "Parola", button "Giriş yap". Layout styling follows the mockup (option A: pill tabs, teal active tab, terracotta action buttons) using tokens only; tabs and rows must fit 360px.
- [ ] **Step 3: Tests, `tsc`, build pass. Manual check** in the browser with `elif@bookpal.demo` / `demo-elif-123`: log in, see the four tabs, refresh `/panel` and stay logged in, log out.
- [ ] **Step 4: Commit, push the branch.**

---

### Task 4: Clients screen  (branch `feat/frontend-clients`)

**Files:**
- Create: `frontend/src/api/clients.ts`, `src/lib/{labels.ts,labels.test.ts,useDebouncedValue.ts}`, `src/components/{Modal.tsx,Modal.css,ConfirmDialog.tsx}`, `src/pages/panel/clients/{ClientsPage.tsx,ClientsPage.css,ClientForm.tsx,ClientForm.css,ClientsPage.test.tsx}`
- Modify: `frontend/src/App.tsx` (real page on `/panel/danisanlar`)

**Interfaces:**
- Produces `clients.ts`: `listClients(search?: string): Promise<Client[]>` (`GET /clients?search=` with the value URL-encoded), `createClient(input: ClientInput): Promise<Client>`, `updateClient(id: string, patch: Partial<ClientInput>): Promise<Client>`, `deleteClient(id: string): Promise<void>`.
- Produces `labels.ts`: `genderLabel(g: Gender): string`, `statusLabel(s: AppointmentStatus): string` with the spec's Turkish texts. `useDebouncedValue<T>(value: T, ms: number): T`. `Modal({ title, onClose, children })`, `ConfirmDialog({ message, confirmLabel, onConfirm, onCancel })`.

- [ ] **Step 1: Write failing tests** (`labels.test.ts`, `ClientsPage.test.tsx`): loading text, empty text ("Henüz danışan yok"), error with "Yeniden dene" that reloads; the list shows "Soyad Ad"; typing "İ ş" sends `?search=%C4%B0%20%C5%9F` after the debounce (fake timers only while typing, real timers before `findBy…`); adding opens a modal, a 400 response shows its message inside the open modal and keeps the typed values; delete asks in a `ConfirmDialog`, no `window.confirm` call. Run; expect FAIL.
- [ ] **Step 2: Implement.** Client form fields: "Ad", "Soyad", "Doğum tarihi", "Cinsiyet" (the four labels). Modal closes on Escape and on the close button, and focus returns to the opener.
- [ ] **Step 3: Tests, `tsc`, build pass. Manual check:** add, edit, search, delete a client; try a future birth date and read the message. **Commit, push the branch.**

---

### Task 5: Daily view and appointment form  (branch `feat/frontend-daily`)

**Files:**
- Create: `frontend/src/lib/{date.ts,date.test.ts}`, `src/api/appointments.ts`, `src/pages/panel/daily/{DailyPage.tsx,DailyPage.css,AppointmentForm.tsx,AppointmentForm.css,DailyPage.test.tsx}`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces `date.ts`: `toDateString(d: Date): string`, `parseDate(s: string): Date | undefined` (undefined when the text is not a real date, e.g. `2026-13-45`), `today(): string`, `addDays(s: string, n: number): string`, `formatLong(s: string): string` (Turkish, e.g. "7 Kasım Cumartesi"), `dateFromQuery(value: string | null): string` (valid date, else `today()`).
- Produces `appointments.ts`: `listAppointments(from: string, to: string): Promise<AppointmentView[]>`, `createAppointment(input: AppointmentInput): Promise<AppointmentView>`, `updateAppointment(id: string, patch: Partial<AppointmentInput>): Promise<AppointmentView>`, `deleteAppointment(id: string): Promise<void>`.

- [ ] **Step 1: Write failing tests.** `date.test.ts` (run with `TZ=Europe/Istanbul`): `toDateString(new Date(2026, 10, 7, 23, 59))` is `'2026-11-07'`; `addDays('2026-10-31', 1)` is `'2026-11-01'`; `addDays('2026-03-01', -1)` is `'2026-02-28'`; `parseDate('2026-13-45')` is `undefined`; `dateFromQuery('abc')`, `dateFromQuery('')` and `dateFromQuery(null)` all give `today()` (Review Focus 1, 2). `DailyPage.test.tsx`: reads `?tarih=`, calls `GET /api/v1/appointments?from=D&to=D`, rows are ordered by time with client name, status label and note; arrows change `?tarih=`; the three states; "Randevu ekle" opens the form with fields "Danışan", "Tarih", "Başlangıç", "Bitiş", "Durum", "Not"; a **409 keeps the modal open, shows the server message and keeps the typed values**; cancelling sets `status: 'cancelled'`; delete goes through `ConfirmDialog`; **editing an appointment whose client is missing from the client list shows "Ad Soyad (silinmiş)" selected** (Review Focus 4). Run; expect FAIL.
- [ ] **Step 2: Implement.** The client picker loads `listClients()` only when the form opens. Start/end are `<input type="time">`; the end time is not auto-filled (spec: undecided, keep plain).
- [ ] **Step 3: Tests (also with `TZ=Europe/Istanbul`), `tsc`, build pass. Manual check:** book two overlapping appointments and see the warning; move between days; refresh keeps `?tarih=`. **Commit, push the branch.**

---

### Task 6: Weekly and monthly views  (branch `feat/frontend-calendar`)

**Files:**
- Create: `frontend/src/pages/panel/weekly/{WeeklyPage.tsx,WeeklyPage.css,WeeklyPage.test.tsx}`, `src/pages/panel/monthly/{MonthlyPage.tsx,MonthlyPage.css,MonthlyPage.test.tsx}`
- Modify: `frontend/src/lib/{date.ts,date.test.ts}`, `frontend/src/App.tsx`, `CLAUDE.md`

**Interfaces:**
- Consumes: `listAppointments`, `dateFromQuery`, `addDays`, `formatLong` from Task 5.
- Produces `date.ts`: `weekStart(s: string): string` (Monday), `weekDays(s: string): string[]` (7 dates), `monthGrid(s: string): string[][]` (rows of 7 starting Monday, covering the whole month), `monthRange(s: string): { from: string; to: string }` (first and last day of the month).

- [ ] **Step 1: Write failing tests.** `date.test.ts`: `weekStart('2026-11-08')` (a Sunday) is `'2026-11-02'`; `weekStart('2026-11-02')` is itself; `monthGrid('2026-11-15')` has rows starting `2026-10-26` and ending `2026-12-06`; `monthRange('2026-02-10')` is `2026-02-01`..`2026-02-28`. Page tests: weekly calls `GET /appointments` once with Monday and Sunday as `from`/`to` and shows each appointment under its day; monthly calls it once with `monthRange` and shows the count per day; clicking a day in either goes to `/panel?tarih=…`; loading, empty and error states with "Yeniden dene". Run; expect FAIL.
- [ ] **Step 2: Implement.** Weekly: seven columns wide, days stacked vertically below a breakpoint at phone width (Monday first). Monthly: grid with counts; days outside the month dimmed.
- [ ] **Step 3: Tests, `tsc`, build pass. Manual check** at 360px and desktop width for both views.
- [ ] **Step 4: Update `CLAUDE.md`** with the `revise-claude-md` skill (stack, layout, routes, commands, rules). **Commit, push the branch.**

---

### Task 7: Landing page fixes (optional)  (branch `feat/landing-fixes`)

**Files:**
- Modify: `frontend/src/pages/landing/{SignupForm.tsx,signup.ts,SignupForm.test.tsx,signup.test.ts}`, `CLAUDE.md` (remove the "Known gaps" section)

- [ ] **Step 1: Write four failing tests.** Each error message is linked to its field with `aria-describedby`; after a successful signup keyboard focus moves to the thank-you heading; a 500 response shows a server-error message, not "check your internet"; a `fetch` that never answers gives up after a timeout (use fake timers) and re-enables the button. Run; expect FAIL.
- [ ] **Step 2: Implement** the four fixes in `SignupForm.tsx` / `signup.ts` (timeout via `AbortController`). Tests, `tsc`, build pass. **Commit, push the branch.**

---

## Self-review notes

- Spec sections map to tasks: scaffold and serving (1), landing (2), session and login (3), clients (4), daily and form (5), weekly and monthly (6), gaps (7); `CLAUDE.md` updates in 1, 2, 6, 7.
- Names used across tasks match their Interfaces blocks (`request`, `ApiError`, `useApi`, `renderApp`, `stubFetch`, `dateFromQuery`, `addDays`).
