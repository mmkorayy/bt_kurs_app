# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bookpal is a planned appointment and client-tracking app for people who see clients one-on-one (coaches, psychologists, psychiatrists, consultants). It is a learning project that follows the teacher's Ritma course (`../ritma-for-individual`, read-only reference). The landing page lives in the React app in `frontend/` (moved from the old plain-HTML `web/` folder, now deleted) and there is an in-memory API in `backend/`. The panel screens are being built in `frontend/` step by step; spec `docs/superpowers/specs/2026-11-07-bookpal-frontend-design.md`, plan `docs/superpowers/plans/2026-11-07-bookpal-frontend.md`. All text visitors read is Turkish.

## Stack and layout

- Frontend (`frontend/`): React + TypeScript + Vite with Vitest, its own `package.json`. Only the libraries on the allowed list (see Rules) may be added. Colours come from `frontend/src/styles/tokens.css`; styles are plain CSS in separate files next to each component, with class names prefixed per component (`landing-…`).
- Landing page: `frontend/src/pages/landing/` (`Landing.tsx` structure and text, `SignupForm.tsx`, `signup.ts` form logic, their `.css` and tests).
- Backend (`backend/`): TypeScript, Node.js and Express 5, data in memory. `api-contract/openapi.yaml` describes the API.
- `docs/superpowers/specs/` holds design docs, `docs/superpowers/plans/` holds implementation plans. `.superpowers/` is temporary working space (mockups, ledgers) and stays out of git.

## Design

- Chosen look ("option J"): peach `#fdf1ea` to mint `#eef6f5` gradient, teal `#2a7f7a`, terracotta `#c2552d`, rounded pill buttons, soft shadows, serif logo. Light theme only.
- All colors come from the `:root` variables in `frontend/src/styles/tokens.css`. White on terracotta is 4.53:1 and `--muted` is `#6b625c` for the same reason, so do not lighten them.
- Spec: `docs/superpowers/specs/2026-10-31-bookpal-landing-design.md`. Plan: `docs/superpowers/plans/2026-10-31-bookpal-landing.md`.

## Commands

- View the page: build the frontend, start the backend, open `http://localhost:3000` (see the Frontend and Backend sections below), or run the Vite dev server on 5173.
- `validateSignup` and `sendSignup` are plain exported functions in `frontend/src/pages/landing/signup.ts` with Vitest tests next to them. `SignupForm` takes an optional `endpoint` prop so tests can try a working or failing endpoint without changing `FORM_ENDPOINT`. Keep temporary check scripts out of the project (use the scratchpad).

## Frontend (`frontend/`)

- `npm` is not installed; the snap npm installs: `node /snap/kf6-core22/43/usr/lib/node_modules/npm/bin/npm-cli.js install` (inside `frontend/`, ask Koray first). Without npm, from `frontend/`: tests `node node_modules/vitest/vitest.mjs run`, types `node node_modules/typescript/bin/tsc --noEmit`, build `node node_modules/vite/bin/vite.js build`, dev server `node node_modules/vite/bin/vite.js` (port 5173, proxies `/api` and `/docs` to the backend on 3000, so start the backend too).
- The backend serves `frontend/dist` (`backend/src/static-dir.ts`): build the frontend first and restart the backend after a rebuild. Without a build the API still works and the server prints a hint; pages are a plain 404. Browser-side routes such as `/panel/hafta` return `index.html` (`backend/src/http/spa-fallback.ts`); missing files with an extension and `/api` misses stay 404.
- Routes: `/` landing, `/giris` login, `/panel` (daily), `/panel/hafta`, `/panel/ay`, `/panel/danisanlar` (clients; ASCII URL, label "Danışanlar"). `/panel/*` sits behind `RequireAuth` (no session means `/giris`). Layout: `src/api/` (client, types, endpoints), `src/auth/`, `src/lib/`, `src/components/`, `src/pages/<screen>/`.
- API calls go through `request()` in `src/api/client.ts` (throws `ApiError`; any 401 clears the session, except login and `/auth/me`, which pass `skipUnauthorized`). Tests render screens with `renderApp(<App />, { route })` and fake the network with `stubFetch({ 'GET /api/v1/…': () => ({ body }) })` from `src/test-utils.tsx` (an unmatched call fails the test). `types.test.ts` checks `src/api/types.ts` field names against `api-contract/openapi.yaml`.
- Demo login for hand checks: see Backend (`elif@bookpal.demo`). Panel pages for clients, daily, weekly and monthly are still placeholders until plan tasks 4 to 6.
- Keep temporary servers on spare ports and stop them by exact process ID (find it with `ss -ltnp`), not `pkill`.

## Backend

Spec: `docs/superpowers/specs/2026-11-01-bookpal-backend-design.md`. Plan: `docs/superpowers/plans/2026-11-01-bookpal-backend.md`. It mirrors the teacher's Ritma backend (clients are called `clients`, not `customers`).

- Commands (inside `backend/`): `npm install` first (`node_modules` is not in git), `npm test` (Node's test runner with `tsx`), `npm run dev` (watch mode), `npm run build` (`dist/`), `npm start`. The server also serves the built frontend (`frontend/dist`): run `npm run dev`, open `http://localhost:3000` (`PORT` changes it).
- API docs: with the server running, open `http://localhost:3000/docs` (Swagger UI from `swagger-ui-dist`, reads `api-contract/openapi.yaml`, so contract changes show up by themselves). Log in with `POST /auth/login` and later "Try it out" calls use the cookie, or paste the token into "Authorize". The route (`src/http/docs-routes.ts`, wired through `AppDeps.docs`) is not mounted when `NODE_ENV=production`.
- `npm` is not installed on Koray's machine (only Node bundled with the balena tool). Installs were done with the npm inside a snap: `node /snap/kf6-core22/43/usr/lib/node_modules/npm/bin/npm-cli.js install`. Tests and the build run without npm: `node --import tsx --test "src/**/*.test.ts"` and `node node_modules/typescript/bin/tsc`.
- One test file: `node --import tsx --test src/services/appointment-service.test.ts`.
- `npm test` does not type-check and test files are not part of the `tsc` build: run `npm run build` for type errors.
- Layers: `http/` routes, `services/` rules, `repositories/types.ts` interfaces with in-memory implementations in `repositories/memory/`. `deps.ts` (`buildDeps`) wires them, `app.ts` (`createApp`) mounts the routes. HTTP tests use `startTestServer()` / `buildTestDeps()` from `src/test-support.ts` (real server and `fetch`, no mocks).
- Every repository method takes `userId`; another user's record is a 404. Clients are soft-deleted (`deletedAt`). Overlap is checked inside `AppointmentRepository.saveIfNoConflict`. Services throw `AppError`, one error handler formats `{ error: { code, message } }`, and it never logs request bodies (client data stays out of logs).
- API is under `/api/v1`; auth is `Authorization: Bearer <token>` or the `bookpal_session` cookie. Demo accounts `elif@bookpal.demo` / `demo-elif-123` and `mert@bookpal.demo` / `demo-mert-123`; `DEMO_ACCOUNTS_ENABLED=true|false` controls them (off by default when `NODE_ENV=production`).
- A new route needs an entry in `api-contract/openapi.yaml` and in `ROUTES` in `contract.test.ts`; that test fails when they disagree.
- Build backend code test-first (failing test, then code).

## Rules

- File names, folder names, CSS classes and `id`s are English ASCII. Visible text is Turkish.
- The page must work at 360px width with no horizontal scrolling, and the signup button must be visible on the first screen.
- The form POSTs JSON to `FORM_ENDPOINT` at the top of `frontend/src/pages/landing/signup.ts`. While it is `""` the form shows an error and never shows success, so signups are not lost silently. Do not connect an external form service without asking first.
- Do not add a framework or library without asking. Allowed without asking: backend Express, `swagger-ui-dist` and dev tools; frontend `react`, `react-dom`, `react-router` and, for development, `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`, `@types/react`, `@types/react-dom`. Anything else (Tailwind, UI kits, `@types/node`, YAML or date libraries) needs Koray's OK.
- Frontend work is test first (Vitest). Dates are `YYYY-MM-DD` text in local time; never `toISOString()` or `Date.parse` for them.
- Backend work happens on a feature branch (`feat/...`) rather than straight on `main`.
- Commit after each completed plan task, once its tests pass, on a feature branch (`feat/...`, `docs/...`). Koray allows Claude to push those branches (`github.com/mmkorayy/bt_kurs_app`). Never push `main`, never force-push, and never merge: Koray opens and merges the pull request himself (`gh` is not installed). If a push fails because of authentication, say so and let Koray push.

## Workflow

Larger work goes brainstorm, then a design doc in `docs/superpowers/specs/`, then a plan in `docs/superpowers/plans/`, then the build, using the `superpowers` plugin.

## Known gaps (deferred from the review of the first build)

Fix these before a real endpoint is connected:
- Error messages are not linked to their fields with `aria-describedby`.
- After a successful signup, keyboard focus is lost because the focused button is hidden.
- A server error (for example 500) shows the "check your internet" message.
- The `fetch` has no timeout, so a server that never answers leaves the button disabled.
