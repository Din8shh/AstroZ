# AstroZ

Mobile-first, offline-first PWA for Telugu jyotisham (AP/TS tradition). Telugu default, English toggle.
Static site on GitHub Pages. No backend, no accounts. Full spec: @docs/SPEC.md

## Commands
- `npm run dev` / `npm run build` / `npm run preview`
- `npm test` (Vitest, engine + rules) · `npm run test:e2e` (Playwright, screens)
- `npm run test -- tests/unit/<file>` to run one file; prefer single files while iterating

## Architecture rules
- ALL astrology math runs in the web worker (`src/engine/`, Comlink). Screens never calculate.
- Only `src/engine/ephemeris/` may import the ephemeris library. Everything else uses the `Ephemeris` interface.
- Rules are DATA: every rule table lives in `src/engine/tables/*.json` with `source`, `version`, `notes`. Never hardcode a rule table in TS.
- Rules return structured readings `{status, score?, reasons[], todos[], remedies[]}`. Reasons carry rule ids + values, never prose. Copy comes from `src/content/{te,en}.json`.
- Sidereal, Lahiri ayanamsa, drik ganitam, amanta months. Day = sunrise to next sunrise.
- Hash routing only (GitHub Pages has no SPA fallback). Vite `base` must match the Pages path.

## Data and privacy
- Profiles live in IndexedDB only. Birth details never go in URLs, logs, analytics or share cards.

## Content rules
- Doshas: calm and factual, never "do not marry", never predict harm. Every result links to a Why sheet.
- Remedies: simple and free only (stotram names, temple visit, fasting, daanam, colours/days). NEVER gemstones, paid pujas or buy links. Every remedy has `free: true` (a test enforces it).
- Telugu strings are written by a human; never machine-translate astrology terms. Names come from tables.

## Verification
- IMPORTANT: engine changes must pass `tests/fixtures/*golden*.json` (sunrise ±1 min, other times ±2 min). Show test output as evidence.
- UI changes: Playwright screenshot at 360 and 390 px, te and en; compare with `design/handoff/`.
- When a source table and the fixtures disagree, report it; do not tweak tolerances to pass.

## Domain knowledge
- Use the `telugu-jyotisha` skill for any astrology logic. Use the `astro-verifier` agent before finishing an engine phase.

## When compacting
Preserve the list of modified files, failing fixture names, and the current phase from docs/SPEC.md.
