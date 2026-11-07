# Bookpal on Render: free test site, step by step

Written 2026-11-07 from Render's and Neon's official docs and from Bookpal's own code. Render's screens and free-plan limits change, so if a screen differs from this guide, trust Render's current docs. Anything I could not confirm is marked **(Verify)**.

**Goal:** put Bookpal on a free temporary address like `bookpal-xxxx.onrender.com` (HTTPS included) so you can try it in a browser without running it on your computer. This is a test site, not a real launch.

---

## 0. What we are building

- **One service.** The Express backend already serves the built frontend (`frontend/dist`), so Render runs a single web service. No separate frontend host.
- **Database: Neon, not Render's Postgres.** Render's free Postgres expires 30 days after creation. Bookpal already uses Neon, so the test site gets its own **Neon branch** (a copy of your database that does not touch your real one).
- **Code: your GitHub repo `mmkorayy/bt_kurs_app`, branch `main`.** Render builds from `main` and redeploys by itself every time `main` changes (that is, every time you merge a PR).

What Bookpal's code does on Render (checked in the code):

| Topic | What happens |
|---|---|
| Port | The server reads the `PORT` setting (`backend/src/config.ts`) and gives no host, so it listens on all addresses. Render sets `PORT` itself (default 10000). Do not set it. |
| Health check | `GET /api/v1/health` answers `{"status":"ok"}` without a login. |
| Production mode | Render sets `NODE_ENV=production` while the app runs **and while it builds**. A plain `npm ci` then skips dev packages (TypeScript, Vite), so the build command below asks for them with `--include=dev`. |
| Demo accounts | Off by default in production. Bookpal has **only** demo accounts, so with them off nobody can log in. You must set `DEMO_ACCOUNTS_ENABLED=true` for the test. |
| Swagger `/docs` | Off in production. A 404 there is correct. |
| Login cookie | Marked `Secure` in production. That works because Render serves HTTPS. |
| Migrations | **Not** run when the server starts. You apply them by hand (step 2). |
| Wrong database address | The server prints a message and stops. It never silently falls back to memory. |

---

## 1. Create the Render account

1. Go to <https://render.com> and click **Get Started** (or **Sign Up**).
2. Sign up **with GitHub**. It creates the account and makes the repo connection easier. (E-mail sign-up also works; you connect GitHub later in step 3.)
3. Verify your e-mail and answer the questions.
4. A **workspace** is created for you. Everything below happens inside it.

The GitHub sign-in page asks to read your e-mail addresses only. Access to your code is a separate step (step 3), and you can limit it to one repo.

**Card:** Render's docs say no payment is needed for a free web service, but they do not say it plainly, and community posts show some accounts being asked for a card for verification (a small hold of about $1 that is cancelled). **(Verify)** If Render asks for one, that is the reason. Do not choose a paid plan.

---

## 2. Make a Neon branch for the test site

Do not point the test site at your real database.

1. Open the Neon console, open your project, go to **Branches**, and create a new branch, for example `render-test`. **(Verify the button names: Neon's page links to a separate guide for them.)** A branch copies the data of its parent by default.
2. Copy its address: click **Connect**, pick the branch `render-test`, and use the **Connection pooling** toggle.
   - **Pooled address** (the host contains `-pooler`): used by the Render service.
   - **Direct address** (no `-pooler`): used for the migration below. Neon recommends the direct one for schema changes.
3. The address must end with `?sslmode=verify-full`. Add it if it is missing (Bookpal warns otherwise).
4. Apply the migration to the new branch from your computer, in `backend/`. This asks for the direct address without showing it and without saving it in your shell history:

   ```bash
   cd backend
   read -rs -p "Direct address of render-test: " DATABASE_URL && export DATABASE_URL
   npm run db:migrate
   unset DATABASE_URL
   ```

   A value set in the shell wins over `backend/.env`, so your real `.env` is not used for this run. Expected: `Uygulandı: 001_init.sql` for an empty branch, or `Yeni migration yok.` if the branch was copied from a database that is already migrated. Either is fine.

Never paste these addresses into chat, a document or a screenshot. They contain a password.

---

## 3. Create the web service

1. In the Render dashboard click **New > Web Service**.
2. Choose **Git Provider**, connect GitHub, and when GitHub asks which repositories Render may see, choose **Only select repositories** and pick `bt_kurs_app`.
3. Select the repository and fill in the form:

   | Field | Value |
   |---|---|
   | Name | `bookpal` (becomes part of the address) |
   | Region | The one closest to your Neon region (check your Neon project's region). |
   | Branch | `main` |
   | Language | Node |
   | Root Directory | Leave empty (the repo root). The commands below use `cd`. **(Verify the field exists in the form.)** |
   | Build Command | `cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci --include=dev && npm run build` |
   | Start Command | `cd backend && npm start` |
   | Instance type | **Free** |

4. Open **Advanced** and add:
   - **Environment variables**
     - `DATABASE_URL` = the **pooled** address of `render-test`, ending `?sslmode=verify-full`. Type it **here in the dashboard**, nowhere else.
     - `DEMO_ACCOUNTS_ENABLED` = `true`
     - `NODE_VERSION` = `24` (optional: Render's default is already 24.x, Bookpal needs a recent Node)
   - **Health Check Path** = `/api/v1/health`
5. Click **Create Web Service**. Render starts the first build. Follow it on the service's **Deploys** page and in the logs.

Why both `npm ci` have `--include=dev`: the build needs TypeScript and Vite, which are dev packages, and Render builds with `NODE_ENV=production`, which makes `npm ci` skip them. Render's docs page on environment variables says `NODE_ENV` is "runtime only", but a real first deploy of the teacher's Ritma project (same layout as Bookpal) failed exactly this way: only 9 packages were installed and `tsc` stopped with `TS2688: Cannot find type definition file for 'vite/client'`. Leaving the flag out of either `npm ci` breaks the build.

---

## 4. Check that it works

1. Open the address Render shows at the top of the service page. The first visit after a pause can take about a minute.
2. Open `/api/v1/health`. It should show `{"status":"ok"}`.
3. The landing page loads. Log in with the demo account from the README.
4. Add a client and an appointment. Add a second appointment at the same hour: you should get the overlap message.
5. In Render's **Logs** you should see `Veriler Postgres veritabanında tutuluyor.` If you see `DATABASE_URL yok`, the setting is missing.
6. Reload `/panel/hafta` directly in the address bar. It should still open (browser routes are handled by the server).

The demo passwords are public. Do not share the address; delete the service when you are done (step 7).

---

## 5. What the free plan means (docs, 2026-11-07)

- **750 free instance hours per month** for the whole workspace. If they run out, free services are suspended until next month.
- The service **goes to sleep after 15 minutes** without visitors and takes about a minute to wake up.
- Files written to disk disappear on sleep or restart. Bookpal keeps everything in Neon, so this does not matter.
- Free web services are not for real production use, and Render may restart them at any time.
- **Build minutes and outbound traffic** are limited too. Without a payment method, going over the limit stops new builds (or all free services) until the end of the month. Auto-deploy builds on every merge to `main`, so many merges use build minutes.
- Outbound mail ports (25, 465, 587) are blocked. Bookpal sends no mail, and the database uses another port.

---

## 6. The Render MCP (optional, only helps with logs and settings)

An **MCP** is a connector that lets Claude use another service's tools. The guide above works fully without it.

**What Render's MCP can do:** list services, read logs and metrics, trigger a deploy, list deploys, set environment variables, create a web service, and run read-only SQL on Render's own Postgres.

**What it cannot do:** it has **no delete tools**; changing an existing service's other settings goes through the dashboard; it cannot deploy from a container image.

**Things to know before using it:**

- It can change environment variables, and `update_environment_variables` takes the **complete list**, so one call can replace all variables. Ask Claude to show the current list before any change. **(Verify: Render's page does not say how existing values are kept.)**
- Render says it does not promise that secrets stay out of the AI's view. **Do not send `DATABASE_URL` through the MCP.** Set it in the dashboard by hand.
- Whether it can create a **free** service is not stated in the docs. **(Verify)** Create the first service in the dashboard (step 3), as above.
- Every action is limited to the selected workspace.

**Setting it up in Claude Code** (two ways; the plugin is simpler and uses a browser sign-in instead of a key):

1. **Plugin (OAuth, no key).** Per Render's page and its install listing: `/plugin install render@claude-plugins-official`, then `/reload-plugins`. If the marketplace or plugin is not found, Render's own repo works: `/plugin marketplace add render-oss/render-plugin-claude-code`, then `/plugin install render`. The first time Claude uses a Render tool, a browser window asks you to authorize. The plugin may also expect Render's command-line tool (`render login`). **(Verify: the exact commands are missing from Render's docs page.)**
2. **API key.** Create a key at <https://dashboard.render.com/u/settings?add-api-key>, then add the server `https://mcp.render.com/mcp` with a header `Authorization: Bearer <key>` using `claude mcp add --transport http ...`. **(Verify: the command text is missing from Render's docs page, and an API key reaches your whole account. Type it only in the terminal, never in chat.)**

Check with `/mcp` inside Claude Code.

---

## 7. Troubleshooting and cleanup

| Problem | Likely cause and fix |
|---|---|
| Build fails in about 10 seconds with `tsc: not found`, `vite: not found` or `TS2688: Cannot find type definition file for 'vite/client'` | Dev packages were skipped. Both `npm ci` in the Build Command need `--include=dev` (frontend and backend). Change it under **Settings > Build Command** and redeploy. |
| Page is a plain 404, log says `Ön yüz derlenmemiş` | The frontend build did not run. Check the Build Command. |
| Deploy fails, log shows a database message | `DATABASE_URL` is wrong or missing `?sslmode=verify-full`. The server stops on purpose. Fix it in the dashboard (this redeploys). |
| You cannot log in | `DEMO_ACCOUNTS_ENABLED=true` is missing, or the migration was never applied to this branch. |
| First page takes a minute | The free service was asleep. Normal. |
| Deploy "live" but health check fails | Check the Health Check Path is exactly `/api/v1/health`. |
| `/docs` is a 404 | Correct in production. |

**When you are done:** in Render open the service, **Settings**, delete (or suspend) it. In Neon delete the branch `render-test`. If you want, remove Render's access under GitHub **Settings > Applications**.

**Later, if you really deploy Bookpal:** add Render to the "Kullanılan teknolojiler" section of the README and write down the live address. Demo accounts should then be switched off and real sign-in added first.
