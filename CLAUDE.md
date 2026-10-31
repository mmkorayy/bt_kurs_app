# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bookpal is a planned appointment and client-tracking app for people who see clients one-on-one (coaches, psychologists, psychiatrists, consultants). It is a learning project that follows the teacher's Ritma course (`../ritma-for-individual`, read-only reference). Today there is only a landing page in `web/`; there is no backend yet. All text visitors read is Turkish.

## Stack and layout

- Plain HTML, CSS and JavaScript. No framework, library, build tool or package manager.
- `web/index.html` (structure and text), `web/styles.css` (all styling), `web/script.js` (form logic).
- `docs/superpowers/specs/` holds design docs, `docs/superpowers/plans/` holds implementation plans. `.superpowers/` is temporary working space (mockups, ledgers) and stays out of git.
- A backend, if it comes, follows the teacher's layout: `backend/` (TypeScript, Node.js, Express) and `api-contract/`. Only start it when asked.

## Design

- Chosen look ("option J"): peach `#fdf1ea` to mint `#eef6f5` gradient, teal `#2a7f7a`, terracotta `#c2552d`, rounded pill buttons, soft shadows, serif logo. Light theme only.
- All colors come from the `:root` variables in `web/styles.css`. White on terracotta is 4.53:1 and `--muted` is `#6b625c` for the same reason, so do not lighten them.
- Spec: `docs/superpowers/specs/2026-10-31-bookpal-landing-design.md`. Plan: `docs/superpowers/plans/2026-10-31-bookpal-landing.md`.

## Commands

- View the page: run `python3 -m http.server 8000` inside `web/`, then open `http://localhost:8000`. There is no build, lint or test command.
- `validateSignup` and `sendSignup` are global functions in `web/script.js`. The page wiring (`initSignupForm`) only runs when a `document` exists, so the two functions can be loaded in Node with `node:vm` and tested without a browser. Keep temporary check scripts out of the project (use the scratchpad).
- To check the form by hand with a working or failing endpoint, temporarily change `FORM_ENDPOINT` and set it back to `""` afterwards.

## Rules

- File names, folder names, CSS classes and `id`s are English ASCII. Visible text is Turkish.
- The page must work at 360px width with no horizontal scrolling, and the signup button must be visible on the first screen.
- The form POSTs JSON to `FORM_ENDPOINT` at the top of `web/script.js`. While it is `""` the form shows an error and never shows success, so signups are not lost silently. Do not connect an external form service without asking first.
- Do not add a framework or library without asking.
- Never commit or push without being asked. Pushing needs Koray's own GitHub login (`github.com/mmkorayy/bt_kurs_app`).

## Workflow

Larger work goes brainstorm, then a design doc in `docs/superpowers/specs/`, then a plan in `docs/superpowers/plans/`, then the build, using the `superpowers` plugin.

## Known gaps (deferred from the review of the first build)

Fix these before a real endpoint is connected:
- Error messages are not linked to their fields with `aria-describedby`.
- After a successful signup, keyboard focus is lost because the focused button is hidden.
- A server error (for example 500) shows the "check your internet" message.
- The `fetch` has no timeout, so a server that never answers leaves the button disabled.
