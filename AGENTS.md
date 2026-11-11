# AGENTS.md

Source of truth for AI agents and humans working in this repository.
Based on the team template [ulricst3/AXA_HackathonTemplate](https://github.com/ulricst3/AXA_HackathonTemplate);
deviations from it are recorded under [Decisions](#decisions).

## Project

**RetroBoard Lite** – a digital sticky-note wall for sprint retrospectives, built as an example mini app for
«AXA Mini Apps – Citizen Development Boost Factory» («AXA LOS!») at the AXA hackathon, 10/11 November 2026.
Plain HTML, CSS, and JavaScript, no build step, deployed to GitHub Pages. The repository root *is* the website.

- **Purpose:** a team collects notes in three columns (good / bad / change), votes, discusses one note large on
  the projector, and copies the result into Teams — without an external retro tool (shadow IT).
- **Audience:** scrum masters, team leads, and every team that runs retrospectives. One person moderates and
  shares the screen; the others speak or write in the meeting chat.
- **Non-goals:** several people writing at the same time from their own devices, login, sync between devices,
  connections to Jira, Confluence or e-mail, AI features. Each of these raises the risk level in `miniapp.json`.
- **Live:** https://ganemmah.github.io/axa-miniapp-retrolos/

## Stack

HTML5 · hand-written CSS · vanilla JavaScript · no dependencies.

**HTML and CSS carry the site.** Every page must render, read, and navigate with JavaScript disabled or still
loading. JavaScript is for operations layered on top — never for building the page, routing, or delivering the
content a visitor came for. There is no toolchain and no dev server either.

**Never introduce** without recording the decision in this file:

- Frameworks (React, Vue, Svelte, Angular) and client-side routers
- Build tools, bundlers, `package.json`, `node_modules`, any lockfile
- CSS frameworks or preprocessors (Tailwind, Bootstrap, Sass, PostCSS)
- TypeScript — there is no compile step to strip types
- CDN `<script>` tags, and any server-side runtime

Allowed file types: `.html`, `.css`, `.js`, `.md`, `.csv`, and images (`.svg`, `.png`, `.jpg`, `.webp`),
plus `.json` for the mini-app profile (D-04). Anything else needs a decision here.

## Commands

| Task | Command |
|---|---|
| install / build | none — no dependencies, and the repository root is the website |
| run | open `index.html` in a browser (double-click is enough) |
| test | `node --test` (Node 22 or newer; finds `tests/*.test.js`, no `package.json` needed — D-01) |
| lint / format | none |

Opening the file directly works because pages do not depend on JavaScript, and it is why scripts must be
classic and deferred rather than ES modules — `file://` blocks module loading and `fetch()`.

## Layout

| File | Purpose |
|---|---|
| `index.html` | entry point: toolbar (title, timer), three columns, buttons, empty `<dialog>` for the zoom view |
| `styles.css` | all styling, `:root` token block, dark mode |
| `retro-core.js` | pure logic without DOM: settings (columns, limits, timer), board, votes, summary, timer state (D-05) |
| `app.js` | operations on `index.html`: cards, voting, timer, gong, zoom, copy, localStorage |
| `favicon.svg` | tab icon |
| `miniapp.json` | mini-app profile: purpose, owner, risk level, lifecycle, data, hosting (D-04) |
| `tests/*.test.js` | unit tests for `retro-core.js` and guardrail tests for the conventions in this file |
| `specs/` | `_template/spec.md` and one spec per feature (`001-retro-board`) |
| `docs/` | user guide, demo script, screenshots (D-04) |

**Typical changes:** rename a column or change a limit or timer duration → only `retro-core.js` (settings at
the top); column titles also appear in `index.html`, and a test checks that both match. Then `node --test`.

## Conventions

**Paths** — relative only. `href="styles.css"`, never `/styles.css`. A Pages project site is served from
`/<repo-name>/`, so a leading slash breaks every asset.

**HTML** — semantic elements first (`<button>`, `<nav>`, `<main>`, `<label>`); ARIA only where no native
element fits. One `<h1>` per page, heading levels not skipped. `alt` on every image, a `<label>` for every form
control. No inline scripts, no `<style>` blocks, no `style` attributes, no `on…` attributes — the
Content-Security-Policy meta tag forbids them (D-03).

**CSS** — design tokens as custom properties on `:root`, declared once at the top of `styles.css` and named
`--color-*`, `--space-*`, `--font-*`, `--radius`, `--container`; rules reference tokens, never raw values (a test
checks colours). Light palette on bare `:root`, overridden under `@media (prefers-color-scheme: dark)`. Class
names lowercase and hyphenated, one block per component (`.card`, `.card-text`). No inline `style` and no
`!important` unless overriding a browser default with no other hook — comment why. `box-sizing: border-box`
globally; Flexbox for one-dimensional layout, Grid for two-dimensional; mobile-first with `min-width` queries.
Never remove a focus ring without replacing it. Honour `prefers-reduced-motion`. Text contrast at least WCAG AA.
Brand palette: see D-07.

**JS** — optional and additive only. Enhance what the HTML already shows. Load it as
`<script src="app.js" defer></script>`, **not** `type="module"`. `const`/`let`, no globals (one exception: D-05),
cache DOM queries, prefer native HTML (`<dialog>`, form submission). Insert text only as text nodes — never
`innerHTML` or HTML strings (card texts come from users). Every `localStorage` access in `try/catch`; the app
must work without it.

**Language** — English for code, identifiers, file names, and documentation. User-facing text is Swiss German
(«ss» instead of «ß»), see D-08.

## Workflow

1. Copy `specs/_template/spec.md` to `specs/<nnn>-<feature>/spec.md` and fill in the acceptance criteria — they
   are both the prompt and the review checklist.
2. Implement two or three acceptance criteria at a time, not a whole spec.
3. Open the page in a browser and check it against those criteria; run `node --test`.
4. Branch off `main`, commit, open a pull request. Commit messages: English, imperative, one logical change
   each. Do not push to `main` directly (the very first commit to the empty repository was the exception).

**Definition of Done**

- [ ] A spec exists and its acceptance criteria are met
- [ ] Opened locally in a browser, with JavaScript disabled as well
- [ ] `node --test` is green (the deploy refuses otherwise — D-02)
- [ ] Documentation updated in the same change
- [ ] No secrets committed

Required approvals, merge strategy, branch protection: TODO: Human clarification needed.

## Deployment

`.github/workflows/deploy.yml` runs on push to `main`: **test** (`node --test`) → checkout → `touch .nojekyll` →
publish the repository root to GitHub Pages. About a minute. It warns when `index.html` is missing.

One-time setup per clone: **Settings → Pages → Build and deployment → Source = GitHub Actions**.

`.nojekyll` is created in CI rather than committed. Without it GitHub runs Jekyll, which hides
underscore-prefixed paths — including `specs/_template/`.

Rollback: revert the commit and push (or re-run an earlier workflow run in the Actions tab).

## Do / Don't

- **Do** read this file and the feature's `spec.md` first, write the spec before the code, and record each
  decision in the change that introduces it.
- **Don't** make a page depend on JavaScript to render, add anything from the exclusion list, or use a
  leading-slash path.
- **Don't** commit a secret. Every file is publicly readable at a predictable URL.
- **Don't** rely on a server at runtime (API routes, SSR, database). Browser storage works, per device.
- **Don't** add personal or customer data, or a feature that would collect it, without updating the risk level in
  `miniapp.json`.
- **Don't** replace a `TODO: Human clarification needed` marker with a guess.

## Decisions

Newest at the bottom. Each entry: what was decided and why.

| ID | Decision | Why |
|---|---|---|
| D-01 | **Tests with `node --test`, without `package.json`.** Tests are CommonJS files in `tests/`; `retro-core.js` exports itself via `module.exports` in Node. | The template leaves tests open (TODO). Automated checks protect the guardrails; `node --test` needs no install and no `package.json`, so the stack exclusions still hold. |
| D-02 | **`deploy.yml` gets a `test` job before `deploy`.** Otherwise the workflow is the template's, including the action versions. | Nothing broken or non-compliant is published. |
| D-03 | **Content-Security-Policy as a meta tag** (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`). | Even if text were injected, the browser would not run it or load anything from elsewhere. Works on GitHub Pages and on `file://` (checked in Chrome). |
| D-04 | **File-type and layout exceptions:** `miniapp.json` (mini-app profile), `tests/` and `docs/` folders. | The profile is the governance proposal of AXA LOS! and must be machine-readable. Tests and docs are not part of the website and would clutter the root. |
| D-05 | **Two scripts:** `retro-core.js` defines exactly one global, `RetroCore`; `app.js` is an IIFE without globals. | Classic scripts cannot import each other. One namespace lets the pure logic be shared between the page and the Node tests. |
| D-06 | **JavaScript is required for the operations** (adding notes, voting, timer). Without it the page still renders the toolbar, columns, and buttons, plus a `<noscript>` notice. | A retro board is an interactive tool; the HTML carries the structure as the template demands. |
| D-07 | **Brand palette from the design tokens on axa.ch** (checked 2026-11-11): interactive `#00008F`, strong `#FF1721`/`#CC0009`, neutrals `#F7F7F8`–`#1A1D21`, fully rounded buttons. Typeface «Source Sans Pro» only if installed locally. **No AXA logo;** the banner «keine offizielle AXA-Anwendung» stays. | Fits AXA without pretending to be an official AXA application. Web fonts would violate the CSP. |
| D-08 | **User-facing text in Swiss German**, code and docs in English. | The users are AXA Switzerland staff; the template asks for English code and docs. |
| D-09 | **Single user:** one person moderates and shares the screen. | Several people writing at once needs shared storage, i.e. a server — a higher risk level and a security review. Target picture for that stage: a Teams app with Live Share in the AXA tenant. |
| D-10 | **No shared Markdown file on GitHub as a «server».** | GitHub Pages only serves files. Writing would need a GitHub token with write access visible in the browser, the content would be public, and changes would only appear after a deploy. |
| D-11 | **Voting never reorders the board; the button «Nach Stimmen sortieren» sorts once** and the order is saved. | Bug found by the team: with live sorting, a card jumped away after a vote and the next click hit another card. Reproduced with real mouse clicks (A = 2, B = 2 instead of A = 3, B = 1) and re-checked after the fix. |
| D-12 | **Top topic = red frame** (most votes per column, all on a tie, none without votes). **Fixed card numbers** (#1, #2 …) from the id, never reused. | Calm and readable on a projector; «#7» is easy to refer to while moderating, and does not change when sorting. |
| D-13 | **Gong via the Web Audio API**, prepared on the click on «Start». | No audio file, nothing to download; browsers block sound without a prior user action. |
| D-14 | **Zoom view as a native `<dialog>`** with arrow keys, Esc, and focus returning to the card. | Accessible without custom focus handling. |
| D-15 | **Kept deliberately small:** removed formats, action items with owners, retrospective review, Markdown export, printing, editing, in-app guide. | Feedback from the team: an earlier version overwhelmed users. A mini app should solve one problem. |
