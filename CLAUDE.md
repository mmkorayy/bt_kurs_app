# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bookpal is a planned appointment and client-tracking app for people who see clients one-on-one (coaches, psychologists, psychiatrists, consultants). It is a learning project that follows the teacher's Ritma course (`../ritma-for-individual`, read-only reference). There is a landing page in `web/` and an in-memory API in `backend/` (no dashboard screens yet). All text visitors read is Turkish.

## Stack and layout

- Frontend (`web/`): plain HTML, CSS and JavaScript. No framework, library, build tool or package manager.
- `web/index.html` (structure and text), `web/styles.css` (all styling), `web/script.js` (form logic).
- Backend (`backend/`): TypeScript, Node.js and Express 5, data in memory. `api-contract/openapi.yaml` describes the API.
- `docs/superpowers/specs/` holds design docs, `docs/superpowers/plans/` holds implementation plans. `.superpowers/` is temporary working space (mockups, ledgers) and stays out of git.

## Design

- Chosen look ("option J"): peach `#fdf1ea` to mint `#eef6f5` gradient, teal `#2a7f7a`, terracotta `#c2552d`, rounded pill buttons, soft shadows, serif logo. Light theme only.
- All colors come from the `:root` variables in `web/styles.css`. White on terracotta is 4.53:1 and `--muted` is `#6b625c` for the same reason, so do not lighten them.
- Spec: `docs/superpowers/specs/2026-10-31-bookpal-landing-design.md`. Plan: `docs/superpowers/plans/2026-10-31-bookpal-landing.md`.

## Commands

- View the page: run `python3 -m http.server 8000` inside `web/`, then open `http://localhost:8000`. The frontend has no build, lint or test command (see Backend below for the API).
- `validateSignup` and `sendSignup` are global functions in `web/script.js`. The page wiring (`initSignupForm`) only runs when a `document` exists, so the two functions can be loaded in Node with `node:vm` and tested without a browser. Keep temporary check scripts out of the project (use the scratchpad).
- To check the form by hand with a working or failing endpoint, temporarily change `FORM_ENDPOINT` and set it back to `""` afterwards.

## Backend

Spec: `docs/superpowers/specs/2026-11-01-bookpal-backend-design.md`. Plan: `docs/superpowers/plans/2026-11-01-bookpal-backend.md`. It mirrors the teacher's Ritma backend (clients are called `clients`, not `customers`).

- Commands (inside `backend/`): `npm install` first (`node_modules` is not in git), `npm test` (Node's test runner with `tsx`), `npm run dev` (watch mode), `npm run build` (`dist/`), `npm start`. The server also serves `web/`: run `npm run dev`, open `http://localhost:3000` (`PORT` changes it).
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
- The form POSTs JSON to `FORM_ENDPOINT` at the top of `web/script.js`. While it is `""` the form shows an error and never shows success, so signups are not lost silently. Do not connect an external form service without asking first.
- Do not add a framework or library without asking (the backend uses only Express plus dev tools).
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
