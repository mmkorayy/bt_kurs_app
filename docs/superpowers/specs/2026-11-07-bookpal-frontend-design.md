# Bookpal frontend: design

Date: 2026-11-07

## Intent and why

Bookpal has a landing page (`web/`, plain HTML) and a working in-memory API (`backend/`), but nothing a freelancer can actually use after logging in. This work builds the **panel**: the screens where a provider (coach, psychologist, consultant) logs in, sees the day's appointments, and manages clients and the calendar.

It is a **learning project** that follows lesson 4 of the teacher's course. The teacher's Ritma frontend (`../ritma-for-individual/frontend`, spec `docs/superpowers/specs/2026-11-03-ritma-frontend-design.md`) is the read-only reference. Koray follows lessons by recording, so Bookpal should stay close enough to Ritma that he can compare the two, but it keeps its own look and its own names (`clients`, not `customers`).

Success: the flow login, then today's appointments, then the tabs, works end to end in a browser against the real backend; it looks right at 360px width; and the landing page looks and behaves exactly as it does now.

## Goals

- One React + TypeScript + Vite app in `frontend/` that serves both the landing page and the panel. Express serves the built `frontend/dist` (one origin, no CORS, the `bookpal_session` cookie works as is).
- Screens: login, daily view, weekly view, monthly view, clients.
- Add, edit, delete clients; add, edit, cancel, delete appointments. A time clash (409) shows a warning and keeps what was typed.
- Every screen handles three states: loading, empty, error (with a "Yeniden dene" retry button).
- Work on phones: 360px wide, no sideways scrolling, tap targets usable.
- Tests first (Vitest, Testing Library, jsdom), same rhythm as the backend.

## Non-goals

- No database, Google login, pagination, session expiry, or deployment. The database is a separate later piece (lesson 5).
- No end-to-end test tool (Playwright). Real behaviour is checked by hand in the browser at the end of each task.
- No search-engine tuning for the landing page (it becomes a React page; prerendering can come later).
- The `sharpening-prompts` skill from lesson 4 is left out on purpose.
- No dark theme.

## Anti-goals (a failure even if it technically works)

- The landing page looks or behaves differently after the move (including the empty `FORM_ENDPOINT` rule: the form shows an error, never a fake success).
- Dates shift by a day (see "Dates" below).
- Browser `alert`/`confirm` boxes, or any client data written into logs.
- A library added without asking.

## Constraints

- Visible text is Turkish. File names, folder names, CSS classes and `id`s are English ASCII.
- Libraries allowed without asking: `react`, `react-dom`, `react-router`; dev only `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `jsdom`, `@types/react`, `@types/react-dom`. Anything else (Tailwind, UI kit, data-fetching library, calendar library, `user-event`, `jest-dom`, `@types/node`) needs Koray's OK first.
- Styles are plain CSS in separate `.css` files next to each page or component (`import './X.css'`), with component-specific class prefixes (`.daily-…`). No `<style>` or `style=""` in the markup. Colours come only from `:root` variables in `src/styles/tokens.css`.
- `npm` is not installed on Koray's machine. `node_modules` installs use the snap npm described in `CLAUDE.md`. Ask Koray before the first install.
- Follow the repo rules: work on feature branches, one commit per finished task once tests pass, Claude may push the branch, Koray opens and merges the pull request, never push `main`, never force-push.

## Decisions

Decided by Koray:

- Panel layout is **tabs along the top** (option A from the mockup): logo, then Gün / Hafta / Ay / Danışanlar, then the user's name and Çıkış on the right.
- Scope is the frontend only. `sharpening-prompts` is dropped.
- Keep Bookpal's own look ("option J": peach `#fdf1ea` to mint `#eef6f5` gradient, teal `#2a7f7a`, terracotta `#c2552d`, pill buttons, soft shadows, serif logo). Not the teacher's indigo style.

My calls (Koray has not been asked, he can overrule them):

- Same stack and structure as Ritma's frontend: `frontend/` with its own `package.json`, `api/`, `auth/`, `lib/`, `components/`, `pages/<screen>/`, `styles/`.
- Express gets a fallback so that typing `/panel/hafta` directly does not 404: any GET that is not `/api`, `/docs`, or a missing file returns `index.html`. Missing files such as `/assets/missing.js` stay 404.
- In development, Vite runs on 5173 and proxies `/api` and `/docs` to the backend on 3000.
- Pop-up forms are in-page modals; delete confirmation is a modal too.
- Search on the clients screen is debounced and uses the API's `?search=`.
- `web/` is deleted once the landing page has been moved and compared to the old one by screenshot.
- `src/api/types.ts` is written by hand; a small test checks its field names against `api-contract/openapi.yaml`. The test reads the YAML with Vite's `?raw` import and a small line-based reader (like the backend's `contract.test.ts`), so no `@types/node` and no YAML library are needed.
- **`/` between task 1 and task 2:** the landing page must not break. In task 1 Express serves `frontend/dist` when that folder exists and otherwise keeps serving `web/`; task 2 removes `web/` and this either-or. The fallback-route test uses a small fixture folder, so it does not need a built `dist`. `npm start` and `npm run dev` need `npm run build` in `frontend/` first once the app is in use; `CLAUDE.md` says so.
- **Landing page move is a strict port:** same look, same behaviour, including the four known gaps in `CLAUDE.md` (missing `aria-describedby`, focus lost after success, a 500 shown as "check your internet", no fetch timeout). Fixing them is a separate small task 7, so the screenshot comparison in task 2 stays meaningful.
- **Weekly view on a phone:** seven columns on a wide screen; below a breakpoint the days stack vertically (Monday first).

## Routes

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/giris` | Login |
| `/panel` | Daily view |
| `/panel/hafta` | Weekly view |
| `/panel/ay` | Monthly view |
| `/panel/danisanlar` | Clients |

`/panel/*` needs a session; without one it redirects to `/giris`. Daily, weekly and monthly views read the day, week or month from `?tarih=YYYY-MM-DD` (today if missing). The week starts on Monday. Clicking a day in the weekly or monthly view opens `/panel?tarih=…`.

(The URL `danisanlar` is ASCII on purpose; the tab label says "Danışanlar".)

## Screens

- **Daily:** date navigator (previous, next, today). That day's appointments by time: start–end, client name, status, note. Add, edit, cancel, delete (with confirmation).
- **Weekly:** Monday to Sunday columns, each with its appointments.
- **Monthly:** month grid with the number of appointments per day.
- **Clients:** list sorted by last name, search by name, add, edit, delete. Invalid input (for example a future birth date) is explained next to the form.
- **Login:** email and password. A wrong login shows the backend's message under the form and keeps the email.

Forms: the appointment form has client, date, start, end, status, note. The client form has first name, last name, birth date, gender. A 400 or 409 shows the server message in the open pop-up and keeps the typed data.

Labels: gender `female` Kadın, `male` Erkek, `other` Diğer, `undisclosed` Belirtmek istemiyorum. Status `scheduled` Planlandı, `completed` Tamamlandı, `cancelled` İptal.

Open detail for the builder to settle: whether the end time should auto-fill one hour after the start (the teacher added this on 05.11). Not decided; default is no, keep the form plain.

## Session and API client

- On start, `GET /api/v1/auth/me`. An `AuthProvider` holds the user; `RequireAuth` guards the panel routes. Logout is `POST /api/v1/auth/logout`. The session is the `bookpal_session` HttpOnly cookie; no token in `localStorage`.
- Any 401 clears the session and goes to `/giris`.
- One `request()` function handles 204 and JSON and throws `ApiError { status, code, message }`. Backend messages are Turkish and shown as they are. No server reached: "Sunucuya ulaşılamadı."
- A small `useApi` hook returns `{ data, loading, error, reload }`.
- The appointment response already carries `client: { id, firstName, lastName }`, even for a deleted client, so rows show the name directly. The client list is loaded only for the form's client picker. When editing an appointment of a deleted client, the picker lists that client with "(silinmiş)".

## Dates

Dates travel as `YYYY-MM-DD` text and are handled in local time. Never use `toISOString()` or `Date.parse` to build or read them (in Turkey this can move a day back). Helpers live in `src/lib/date.ts` with their own tests (week start, month grid, day shifts).

## Order of work

Each task leaves a working app, is built test first, and is its own branch and pull request. Koray merges before the next one starts.

1. **Scaffold and serving:** `frontend/` with Vite, `tokens.css`, proxy; Express serves `frontend/dist`; fallback route (tested with `startTestServer()`).
2. **Landing page moved** to React with identical look and the same signup behaviour (`validateSignup` / `sendSignup` ported with their tests); compare to the old page by screenshot; delete `web/`.
3. **API client, session, login:** `/giris`, `AuthProvider`, `RequireAuth`, panel shell with the top tabs, logout.
4. **Clients screen.**
5. **Daily view and appointment form,** including the clash warning.
6. **Weekly and monthly views.**
7. **Landing page fixes (small, optional):** the four known gaps listed in `CLAUDE.md`, each with a test.

After the last task, update `CLAUDE.md` (stack, layout, commands, rules) with `revise-claude-md`. Task 1 or 2 should already change the "no framework" rule in `CLAUDE.md`, since it stops being true.

## Testing

| Layer | What | How |
|---|---|---|
| Pure logic | `date.ts`, labels, `validateSignup` | Direct function tests |
| API client | 204/JSON, `ApiError`, 401 redirect, network failure | `fetch` stubbed at the network edge |
| Pages | login, client and appointment forms, clash warning, loading/empty/error, `RequireAuth` | What the user sees and clicks |
| Contract | `types.ts` field names match `openapi.yaml` | Small test, YAML read with `?raw` |
| Backend | the fallback route | `startTestServer()`, real server |
| Real behaviour | the whole flow | By hand in a browser, at the end of each task |

`npm test` and `npm run build` (type check included) must pass at each task's end. Note the existing backend gap: `npm test` does not type-check.

## Left to the builder

Component breakdown, CSS details, exact copy for empty/error states, and the shape of `useApi`, as long as it stays inside the constraints above.

## Risks

- Landing page look drifting during the move: checked by screenshot.
- Vite (5173) and Express (3000) on different ports: the proxy handles cookies and `/api`; check in task 1.
- Date shifting: covered by the `date.ts` rule and tests.
- No `npm` on the machine: the snap workaround must be re-checked before task 1 starts.
