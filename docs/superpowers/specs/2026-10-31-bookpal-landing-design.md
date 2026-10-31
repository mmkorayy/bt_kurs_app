# Bookpal landing page: design

Date: 2026-10-31

## Intent and why

Bookpal is an appointment and client-tracking app for people who see clients one-on-one (coaches, psychologists, psychiatrists, consultants, trainers). This task is the first step: a single landing page. It is a **learning project** that mirrors the teacher's Ritma landing page (`ritma-for-individual`, lesson 2), with its own name, look and copy. It does not need to collect real signups or measure real interest.

The audience is deliberately broad ("anyone who sees clients"), so the copy speaks to "you who see clients" and does not name one profession.

## Goals

- A visitor understands in a few seconds what Bookpal is and sees a signup form.
- The page follows the same structure and engineering habits as Ritma's: small, accessible, phone-friendly, honest about what the form can do.
- Koray (a beginner) can read the code and learn from it: separate HTML, CSS and JS files, plain and tidy.

## Non-goals

- No FAQ, pricing, fixed top menu, analytics or counters.
- No backend, database or real form service. No privacy or contact pages.
- No frameworks, libraries, build tools or package manager.

## Anti-goals (failure even if it "works")

- The form must never pretend a signup was saved when it was not (see Form).
- The page must not claim real customers, user counts or other made-up facts.
- No file, folder or `id` names with Turkish characters or Turkish words.

## Constraints

- **Stack:** plain HTML, CSS and JavaScript only.
- **Files** (same layout as the teacher's repo): `web/index.html`, `web/styles.css`, `web/script.js`. Design docs live in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.
- **Language:** all text visitors read is Turkish. File names, folder names, CSS classes and `id`s are English ASCII.
- **Phone:** works at 360px width with no horizontal scrolling; the signup button is visible without scrolling on the first screen.
- **Colors** come from CSS variables in `:root` in `styles.css`.
- **Git:** nothing is committed or pushed unless Koray asks. The remote (`github.com/mmkorayy/bt_kurs_app`) needs Koray's own login, so Koray does the push.

## Look (chosen by Koray: "option J")

Soft and warm, rounded, calm. Values below come from the mockup and are a starting point; the builder may adjust them for readability (see Accessibility).

- Page background: gradient from peach `#fdf1ea` to mint `#eef6f5` at 135 degrees.
- Teal `#2a7f7a` for supporting details and the first half of the logo.
- Terracotta `#c2552d` for the signup button and the second half of the logo.
- Text: dark gray `#2b2a2a`; secondary text warm gray `#7a706a`.
- Logo: "Book" in teal and "pal" in terracotta, serif font (Georgia), bold.
- Buttons are rounded pills with a soft shadow; cards and the preview use rounded corners and soft shadows.
- Light theme only (builder's call: no dark theme, to keep it simple).

## Page structure (in order)

1. **Hero:** on desktop two columns: left the logo, headline, one-line slogan and the signup button; right the app preview. On a phone one column: text and button first, preview below.
   - Headline: "Randevularını ve danışanlarını tek yerde takip et".
   - Slogan: "Not defteri ve mesaj kovalamak yok."
   - Button: "Erken erişim için kaydol", linking to `#early-access`.
2. **Problem and solution** (`id="problem-solution"`): two cards. Problem: scattered notebooks, chasing appointments in messages, forgotten client notes. Solution: one place for the calendar and client history.
3. **How it works** (`id="how-it-works"`): three numbered step cards: set your available hours; your clients book appointments; follow notes and history in one place.
4. **Early-access form** (`id="early-access"`): see below.
5. **Footer:** "© 2026 Bookpal", a short slogan, links to the three sections. No privacy or contact links.

## Hero preview

- A small app window drawn with HTML and CSS only: a weekly calendar with two or three made-up appointments and one selected client card.
- No image files and no libraries. Made-up first names only.
- It is decoration: hidden from screen readers (`aria-hidden="true"` on the inside), with a short `aria-label` on the container: "Bookpal uygulama önizlemesi".

## Early-access form

- **Fields:** full name, email, profession (select: Koç, Psikolog, Psikiyatrist, Danışman, Diğer). Each field has a `<label>`.
- **Validation (in the browser, JS):** name must not be empty or only spaces; email must match `/^\S+@\S+\.\S+$/`; a profession must be chosen. An invalid field gets `aria-invalid="true"` and a message below it with `role="alert"`; focus goes to the first invalid field. Fixing a field and resubmitting clears old errors. The form has `novalidate`.
- **Sending:** `fetch` POST to one constant `FORM_ENDPOINT` at the top of `script.js`. The button is disabled while sending.
- **Placeholder state:** `FORM_ENDPOINT` starts as `""`. While it is empty the form sends nothing and shows the error "Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin." It never shows success. (Same as Ritma; chosen by Koray.)
- **Success:** the form hides and a thank-you message appears in an `aria-live="polite"` region.
- **Network or service error:** the form stays open, typed values stay, an error message shows, and the button is enabled again.
- **No JavaScript:** the form uses `method="post"` and shows a `<noscript>` note, so an email never ends up in the URL.
- **Privacy line under the form:** "E-postanız yalnızca Bookpal duyuruları için kullanılacak." (Builder's draft, copied from Ritma's pattern. It is a promise, so the owner must confirm it before any real use.)

## Accessibility

- Headings: `h1` in the hero, `h2` for sections, `h3` for cards.
- Visible focus rings on buttons, links and form fields (`:focus-visible`).
- Text and button colors must be readable on their backgrounds, including white text on the terracotta button and the error message color. The builder checks contrast and adjusts the values in the Look section if needed.
- Smooth scrolling for in-page links, turned off when `prefers-reduced-motion: reduce` is set.

## How to check (by hand; there is no test setup)

1. From `web/`, run `python -m http.server 8000` and open `http://localhost:8000`.
2. Walk through all sections on a wide window and at 360px: no horizontal scroll, hero becomes one column, button visible on the first screen.
3. Form states: empty submit, invalid email, empty `FORM_ENDPOINT` (must show the error), a temporary working fake endpoint (must show the thank-you), and a network error (form stays open with values kept).
4. Hero button and footer links scroll to the right sections; Tab order and focus rings look right.
5. The browser console has no errors.

## Left to the builder

- Exact Turkish wording for the problem, solution and three step cards, and the footer slogan, in the same friendly tone as the headline.
- Which made-up names and appointment times appear in the preview.
- Spacing, font sizes and small visual details, within the Look section.

## Small calls made by the designer (not discussed with Koray; change if you disagree)

- The form sends JSON in the POST body, with a comment next to `FORM_ENDPOINT` saying the format may change with the chosen service.
- On submit, field validation runs first. Only if the fields are valid and `FORM_ENDPOINT` is empty does the form show the "Şu an kayıt alamıyoruz..." error.
- The no-JavaScript note (`<noscript>`) says the form needs JavaScript.
- Extra Turkish text not given above (thank-you message, network-error message, page `<title>`) is written by the builder in the same friendly tone; the page has `lang="tr"`; no favicon.
- The "button visible on the first screen" check uses about 360x640.
- `bt_kurs_app/` is already a git repo with Koray's GitHub remote, so no `git init`. The plan only adds a `.gitignore` file.

## Open points

- No form service is chosen. Until one is, `FORM_ENDPOINT` stays empty and the form shows the error. Adding a service needs Koray's explicit OK.
- The privacy line needs the owner's confirmation before real use.
- A `.gitignore` is needed so `.superpowers/` (temporary brainstorm files) is not pushed. It is created in the plan stage, not now.
