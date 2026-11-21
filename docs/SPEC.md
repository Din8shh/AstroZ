# AstroZ — Build Spec (v0.1, 2026-11-21)

## 1. Product
Fun, self-serve Telugu jyotisham PWA for Andhra Pradesh and Telangana households, plus the Telugu diaspora.
Core loop: **Wish → Reading → To-dos and free remedies.** Telugu default, English toggle.

| Module | Telugu | Output | Inputs |
|---|---|---|---|
| Today | నేటి పంచాంగం | Panchangam + day periods for city; tarabalam/chandrabalam for active person | City, profile |
| Marriage | పెళ్లి పొంతన | Ashtakoota /36, Rajju, Vedha, Kuja dosha; names-only peru balam (approximate) | 2 profiles or 2 names |
| Muhurtham | ముహూర్తం | Ranked windows for vivaham, gruhapravesam, vehicle, new job, business start | Event, range, city, participants |
| New house | గృహప్రవేశం | Gruhapravesam dates, entry direction, checklist | Range, family |
| Job | ఉద్యోగం | Dasha/antardasha, Guru/Shani/Rahu transits, best windows (90 days) | Profile |
| Income & expense | ఆదాయ-వ్యయాలు | Ugadi-year aadayam/vyayam/rajapujyam/avamanam + monthly transit strip | Profile |

Out of scope for MVP: accounts, sync, paid features, gemstones/paid remedies, Tamil/other panchangams, full divisional charts.

## 2. Locked decisions
- Real ephemeris in browser (Swiss Ephemeris WASM behind `Ephemeris` interface; astronomy-engine fallback). Licence: repo public under AGPL-3.0-or-later (decided 2026-11-21) — see §11.
- Sidereal, Lahiri, drik ganitam, amanta months, sunrise-to-sunrise day.
- Telugu + English. Remedies simple and free only. Modern-festive design (see `design/handoff/`).

## 3. Stack
Vite · React · TypeScript strict · vite-plugin-pwa (Workbox) · hash routing · Comlink worker · Zustand · idb-keyval (IndexedDB) · Luxon (IANA tz) · CSS modules + `tokens.css` · self-hosted woff2 (Noto Sans Telugu, Noto Sans, Ramabhadra, Fraunces) · Vitest · Playwright.

## 4. Folder layout
```
src/app/ screens/ components/ content/{te,en,remedies}.json styles/tokens.css
src/engine/ephemeris/ core/ rules/ tables/ worker.ts
public/data/cities.json
tests/unit/ tests/fixtures/ tests/e2e/
design/handoff/
```
Component names (shared with Claude Design): WishCard, ProfileChip, DayRibbon, GunaDial, KootaRow, DoshaCallout, DateResultCard, WhySheet, TodoList, LangToggle, BottomNav, BirthForm, ShareCard.

## 5. Data model
```ts
type Profile = { id: string; name: string; nameTe?: string;
  relation: 'self'|'spouse'|'child'|'parent'|'other'; gender: 'f'|'m'|'x';
  birth: { date: string; time?: string; timeKnown: boolean; placeId: string };
  derived?: { rasi: number; nakshatra: number; pada: number; lagna?: number; namaNakshatra?: number[] } };
type Settings = { lang: 'te'|'en'; homePlaceId: string; elderText: boolean; theme: 'system'|'light'|'dark' };
type Place = { id: string; nameEn: string; nameTe?: string; lat: number; lon: number; tz: string };
type Reading = { status: 'good'|'mixed'|'avoid'; score?: number; reasons: {ruleId: string; values: Record<string, unknown>}[];
  todos: {id: string}[]; remedies: string[] };
```

## 6. Engine API (worker, via Comlink)
```ts
interface AstroEngine {
  init(): Promise<void>;
  birthChart(p: BirthInput): Promise<BirthChart>;
  panchangam(date: string, place: Place): Promise<DayPanchangam>;
  dayPeriods(date: string, place: Place): Promise<Period[]>;
  namaNakshatra(name: string): Promise<NamaResult[]>;
  match(a: PersonRef, b: PersonRef): Promise<MatchReading>;
  findMuhurtham(q: MuhurthamQuery): Promise<MuhurthamResult[]>;
  jobOutlook(p: PersonRef, from: string, days: number): Promise<OutlookReading>;
  yearOutlook(p: PersonRef, samvatsara?: string): Promise<YearReading>;
}
```
Pipeline: input → UTC (Luxon) → JD → sidereal positions (Lahiri) → panchangam/chart/dasha/transits (pure functions) → rules (tables) → Reading.
Time unknown: Moon at local noon, warn near nakshatra boundary, skip lagna/house checks, label "approximate".

## 7. Screens
1 Onboarding · 2 Add person · 3 Reveal · 4 Today · 5 Wishes · 6 Marriage result · 7 Muhurtham finder · 8 Muhurtham detail (.ics export) · 9 New house · 10 Job · 11 Income & expense · 12 Family + Settings (export/delete data, methodology, disclaimer).
States: calculating, time unknown, nothing auspicious in range, offline, mixed signals.

## 8. Content rules
- Readings composed from templates: headline + ≤3 reasons + to-dos + ≤3 remedies. Every reason → Why sheet.
- Doshas calm and factual; never "do not marry"; no health/legal/financial guarantees. Disclaimer on every result.
- Remedies (`content/remedies.json`, keyed by planet/dosha, te+en, `free: true`): stotram names, temple visit, fasting ("if your health allows"), daanam, colours/days. Never gemstones, paid pujas, products or links to buy.
- Astrology names from tables in both scripts; never machine-translated. Western digits default.

## 9. Phases (one fresh Claude Code session each; plan mode; tests as evidence; /clear between)
| Phase | Scope | Done when |
|---|---|---|
| 1 | Shell, tokens, fonts, i18n toggle, PWA, Pages workflow | Build passes; installs and opens offline |
| 2 | Ephemeris adapter in worker, time handling, golden fixture schema | Sunrise ±1 min, longitudes ±0.01°; worker < 1.5 s |
| 3 | Panchangam + day periods from tables; Today screen | Golden fixtures ±2 min; screenshots te/en at 360/390 |
| 4 | Profiles, birth form, offline city search, birth chart, dasha, nama nakshatra, Reveal | 5 chart + 30 name fixtures pass; no lagna when time unknown |
| 5 | Matching + Marriage UI + share card | 10 published reports reproduce koota points |
| 6 | Muhurtham scorer, finder, detail, .ics, New house | 90-day search < 2 s; property test: no window overlaps avoid periods |
| 7 | Job outlook, year outlook, yearly tables | Dasha fixtures; Parabhava table loads for 12 rasis; Ugadi rollover |
| 8 | Polish: elder text, dark, reduced motion, a11y, settings, methodology | Lighthouse PWA/a11y/perf ≥ 90 throttled mobile; launch checklist done |

## 10. Deploy
- `base: '/astroz/'` (or `/` with CNAME). Pages source = GitHub Actions.
- `.github/workflows/deploy.yml`: on push to main → checkout → setup-node → `npm ci` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact` (`./dist`) → `actions/deploy-pages`. Permissions: `contents: read`, `pages: write`, `id-token: write`.
- PWA: `start_url` and `scope` = base; `registerType: 'autoUpdate'` + update toast; `globPatterns` include `**/*.{js,css,html,wasm,woff2,json}`; maskable icons; `lang: 'te'`.

## 11. Risks
- Swiss Ephemeris is AGPL-3.0 or commercial. **Decided 2026-11-21: keep the repo public under AGPL-3.0-or-later** (`LICENSE`, `THIRD_PARTY_NOTICES.md`). AGPL §13: the deployed app must offer its source — README links it; add an in-app "Source" link in Phase 8 (Settings → About). Alternatives were a commercial licence or astronomy-engine (MIT, ±1′ ≈ up to ~2 min on nakshatra times).
- Sources disagree (Varjyam ghatis, Durmuhurtham slots): data tables + one reference (Drik Panchang Telugu) + fixtures.
- No public aadayam-vyayam formula: yearly tables, add at each Ugadi.
- Historical time zones, Telugu name ambiguity, cultural harm from dosha copy: see mitigations in the build guide.

## 12. Launch checklist
- [ ] Golden fixtures pass (Hyderabad, Vijayawada, Tirupati, Dallas)
- [ ] Pandit review of tables and dosha copy
- [ ] Installs on Android Chrome + iOS Safari; works offline after first visit
- [ ] Lighthouse ≥ 90 (PWA, a11y, perf) on throttled mobile
- [ ] te/en at 360 px with elder text
- [ ] Disclaimer, methodology, privacy pages
- [x] LICENSE matches ephemeris choice (AGPL-3.0-or-later)
- [ ] In-app "Source" link (AGPL §13)
- [ ] Parabhava 2026–27 table loaded; reminder for Plavanga 2027–28 at Ugadi
