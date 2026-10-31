# Bookpal Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Bookpal's landing page: hero with app preview, problem and solution, how it works, early-access form and footer, in three plain files under `web/`.

**Architecture:** `web/index.html` holds structure and Turkish text, `web/styles.css` holds all styling through `:root` variables, `web/script.js` holds the form logic as two global functions (`validateSignup`, `sendSignup`) plus one DOM wiring function that only runs when a `document` exists. The preview is pure HTML/CSS.

**Tech Stack:** HTML, CSS, vanilla JS. No libraries, build tools or test framework.

**Spec:** `docs/superpowers/specs/2026-10-31-bookpal-landing-design.md`

## Global Constraints

- Plain HTML, CSS, JS only; files `web/index.html`, `web/styles.css`, `web/script.js`. No framework, library, build tool or package manager.
- All text visitors read is Turkish; file names, folder names, CSS classes and `id`s are English ASCII. `<html lang="tr">`, no favicon.
- Works at 360px with no horizontal scroll; the signup button is visible on the first screen at about 360x640.
- Colors only from `:root` variables in `styles.css`. Light theme only.
- Look: background gradient `#fdf1ea` to `#eef6f5` at 135deg; teal `#2a7f7a`; terracotta `#c2552d`; text `#2b2a2a`; secondary text `#7a706a`; logo "Book" teal + "pal" terracotta in Georgia bold; pill buttons, rounded corners, soft shadows.
- Fixed copy: headline "Randevularını ve danışanlarını tek yerde takip et"; slogan "Not defteri ve mesaj kovalamak yok."; button "Erken erişim için kaydol" linking to `#early-access`; footer "© 2026 Bookpal"; privacy line "E-postanız yalnızca Bookpal duyuruları için kullanılacak."; endpoint-empty error "Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin."
- Section ids: `problem-solution`, `how-it-works`, `early-access`. Headings: `h1` hero, `h2` sections, `h3` cards.
- `FORM_ENDPOINT` is `""` and the form must never show success while it is empty.
- No FAQ, pricing, fixed menu, analytics, backend or form service. Nothing is committed or pushed unless Koray asks; Koray does the push himself.

## Review Focus

- Name with only spaces ("   ") must be an error (Task 4 test).
- Email with a space inside ("a b@c.de") and without a dot after the at-sign ("a@b") must be errors (Task 4 test).
- After an error is fixed and the form is resubmitted, old messages and `aria-invalid` must be gone (Task 4 manual check).
- On a network error the typed values stay and the button is enabled again (Task 4 test and manual check).
- At 320px and 768px nothing overflows; hero is two columns only at `min-width: 48rem`; smooth scrolling is off under `prefers-reduced-motion: reduce` (Tasks 1-3 checks).

---

### Task 1: Base, hero and app preview

**Files:**
- Create: `.gitignore` (line `.superpowers/`), `web/index.html`, `web/styles.css`

**Interfaces:**
- Produces: `:root` variables `--bg-from`, `--bg-to`, `--teal`, `--terracotta`, `--fg`, `--muted`, `--surface`, `--border`, `--danger`; classes `.container` (max-width 60rem, centered), `.cta` (pill button), `.card`, `.grid` (`repeat(auto-fit, minmax(16rem, 1fr))`), `section` vertical padding, `.hero`, `.hero-grid`, `.preview`. Later tasks reuse these.

- [ ] **Step 1: Create `.gitignore` and the `index.html` skeleton** (`lang="tr"`, viewport meta, `<title>Bookpal</title>`, links to `styles.css` and `script.js` with `defer`, `<main>`, `<footer>` placeholder).
- [ ] **Step 2: Write `styles.css` base:** variables, gradient body background, Georgia logo style, `.container`, section padding with `clamp()`, `.cta` pill with soft shadow, `:focus-visible` rings, `html { scroll-behavior: smooth }` with a `prefers-reduced-motion: reduce` override to `auto`.
- [ ] **Step 3: Write the hero:** `<section class="hero"><div class="container hero-grid">`; left column logo (`Book` teal, `pal` terracotta), `h1`, slogan, `.cta`; right column `<div class="preview" role="img" aria-label="Bookpal uygulama önizlemesi">` with inner content `aria-hidden="true"`: window bar with three dots, a Mon/Tue/Wed (Pzt/Sal/Çar) mini weekly calendar with two or three made-up appointments, and one selected client card. `.hero-grid` is one column, `@media (min-width: 48rem)` makes it two columns.
- [ ] **Step 4: Verify.** Run `python3 -m http.server 8000` in `web/`, open `http://localhost:8000`.
  - 1200px: two columns, preview on the right. 360x640: one column, button visible, no horizontal scroll. 320px: no overflow.
  - Contrast: white text on the terracotta button, logo, and secondary text each meet 4.5:1 (logo may use 3:1 only if at least 1.5rem bold). If `--muted` fails, darken it.
  - Console has no errors.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add .gitignore web docs && git commit -m "feat: hero and app preview"`.

---

### Task 2: Problem-solution and how-it-works sections

**Files:**
- Modify: `web/index.html` (after the hero, inside `<main>`), `web/styles.css`

**Interfaces:**
- Consumes: `.container`, `.card`, `.grid`, variables (Task 1).
- Produces: `#problem-solution`, `#how-it-works` (footer links point here).

- [ ] **Step 1: Add `<section id="problem-solution">`:** `h2` plus a `.grid` with two `.card`s with `h3`: "Sorun" (a `ul` of three items: scattered notebooks, chasing appointments in messages, forgotten client notes) and "Çözüm" (one place for calendar and client history). Turkish wording is yours, friendly like the headline.
- [ ] **Step 2: Add `<section id="how-it-works">`:** `h2` plus a `.grid` of three `.card`s, each with a terracotta number badge (1, 2, 3), an `h3` and one sentence: set your available hours; your clients book appointments; follow notes and history in one place.
- [ ] **Step 3: Verify.** At 1200px cards sit side by side; at 360px and 320px they stack with no overflow; text and badge contrast is readable on the cards.
- [ ] **Step 4: Commit — ask Koray first.** If yes: `git add web && git commit -m "feat: problem-solution and how-it-works sections"`.

---

### Task 3: Early-access form markup, footer and styling

**Files:**
- Modify: `web/index.html` (form section, footer), `web/styles.css`

**Interfaces:**
- Consumes: `.container`, `.card`, `.cta`, `--danger`, `--border` (Tasks 1-2).
- Produces (ids that Task 4's script relies on): form `#signup-form`; inputs `#signup-name`, `#signup-email`, select `#signup-profession`; per-field message elements `#signup-name-error`, `#signup-email-error`, `#signup-profession-error` (each `role="alert"`, empty at start); form-level `#signup-error` (`role="alert"`, `hidden`); success region `#signup-success` (`aria-live="polite"`, `hidden`, holds the thank-you text); submit button `#signup-submit`.

- [ ] **Step 1: Add `<section id="early-access">`:** `h2`, then `<form id="signup-form" method="post" novalidate>` inside a `.card`. Each field has a `<label>`. Profession options: an empty first option, then Koç, Psikolog, Psikiyatrist, Danışman, Diğer. Add the privacy line under the form and a `<noscript>` note saying the form needs JavaScript.
- [ ] **Step 2: Add the footer:** "© 2026 Bookpal", a short slogan, and links to `#problem-solution`, `#how-it-works`, `#early-access`. No privacy or contact links.
- [ ] **Step 3: Style the form:** full-width fields, rounded corners, visible focus ring, error text in `--danger` (readable on the card), `[aria-invalid="true"]` gets a `--danger` border, `[hidden]` stays hidden.
- [ ] **Step 4: Verify.** Hero button and footer links scroll to the right sections; Tab order is name, email, profession, button; at 320px and 360px the form has no overflow; with JavaScript off the `<noscript>` note shows.
- [ ] **Step 5: Commit — ask Koray first.** If yes: `git add web && git commit -m "feat: early-access form markup and footer"`.

---

### Task 4: Form logic in script.js

**Files:**
- Create: `web/script.js`
- Test: `check-signup.mjs` in the session scratchpad directory, not in the project (loads `web/script.js` into a `node:vm` context with no `document`, and a stub `fetch`)

**Interfaces:**
- Consumes: the ids produced by Task 3.
- Produces in `script.js`:
  - `const FORM_ENDPOINT = ""` with a comment that the POST body is JSON and may change with the chosen service.
  - `validateSignup(values: {name: string, email: string, profession: string}): {name?: string, email?: string, profession?: string}`; returns an empty object when valid, otherwise a Turkish message per invalid field. Name is invalid if empty or only spaces; email must match `/^\S+@\S+\.\S+$/`; profession must be non-empty.
  - `sendSignup(values, endpoint = FORM_ENDPOINT): Promise<{ok: true} | {ok: false, reason: "no_endpoint" | "network"}>`; empty endpoint returns `no_endpoint` without calling `fetch`; otherwise a JSON POST, with a thrown error or non-2xx answer returning `network`.
  - `initSignupForm(): void` (the submit handler, see Step 5), called at the bottom only when `typeof document !== "undefined"`.

- [ ] **Step 1: Write the failing check script** with these assertions: `validateSignup({name:"   ", email:"a@b.co", profession:"Koç"})` has a `name` key and no others; `email:"a b@c.de"` and `email:"a@b"` each have an `email` key; empty `profession` has a `profession` key; a fully valid object returns `{}`; `sendSignup(valid, "")` resolves `{ok:false, reason:"no_endpoint"}` and the stub `fetch` was not called; with endpoint `"/x"` and a stub returning `{ok:true}` it resolves `{ok:true}`; with a stub that throws it resolves `{ok:false, reason:"network"}`.
- [ ] **Step 2: Run it** with `node <scratchpad>/check-signup.mjs`. Expected: fails because `script.js` does not exist yet.
- [ ] **Step 3: Implement `validateSignup`, `sendSignup`, `FORM_ENDPOINT`** in `web/script.js` as specified above.
- [ ] **Step 4: Run the check script.** Expected: all assertions pass.
- [ ] **Step 5: Implement `initSignupForm`.** On submit: prevent default; clear all messages and `aria-invalid`; run `validateSignup`; if there are errors, show each under its field with `aria-invalid="true"` and focus the first invalid field; otherwise disable `#signup-submit`, await `sendSignup`, then on `ok` hide the form and show `#signup-success`, on `no_endpoint` show `#signup-error` with the fixed endpoint-empty message, on `network` show `#signup-error` with a network-error message; in every failure case keep typed values and re-enable the button.
- [ ] **Step 6: Verify in the browser.**
  - Empty submit shows three messages and focuses the name field. Fix one field and resubmit: its old message and `aria-invalid` are gone.
  - Valid data with empty `FORM_ENDPOINT` shows the endpoint-empty error, keeps the values, never shows success.
  - Temporarily set `FORM_ENDPOINT` to a working fake address: the thank-you message appears. Set an unreachable address: error shows, values stay, button works again. Restore `""` afterwards.
  - Console has no errors.
- [ ] **Step 7: Commit — ask Koray first.** If yes: `git add web && git commit -m "feat: signup form validation and sending"`.
