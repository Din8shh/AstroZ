# AstroZ launch evidence (Phase 8, 2026-11-22)

Status of each line in docs/SPEC.md §12, with the evidence. Unticked lines need a person.

## Done

| Checklist line | Evidence |
|---|---|
| Lighthouse ≥ 90 (PWA, a11y, perf), throttled mobile | Lighthouse 11.7.1, mobile, preview build at `/AstroZ/`. **Simulated throttling (median of 5, Lighthouse's recommended method):** performance 99 (runs: 99, 99, 99, 99, 98); accessibility, best practices and PWA 100 every run. One earlier single run scored 88 (LCP 3.8 s): on localhost the simulation sometimes attributes LCP to the app's first render instead of the static shell. **DevTools throttling** (Slow 4G, 4× CPU): performance 98, the others 100; FCP 1.4 s, LCP 1.4 s, TBT 100 ms, CLS 0.007. |
| te/en at 360 px with elder text | `tests/e2e/polish.spec.ts`, "elder text at 360 px": 7 screens × 2 languages with no horizontal overflow; screenshots in `test-results/polish/elder-*`. |
| Disclaimer, methodology, privacy pages | `#/more/disclaimer`, `#/more/method`, `#/more/privacy`, linked from Settings; e2e "settings…". |
| LICENSE | AGPL-3.0-or-later (`LICENSE`, `THIRD_PARTY_NOTICES.md`). |
| In-app Source link (AGPL §13) | Settings → About → Source code → https://github.com/Din8shh/AstroZ (e2e checks the href). |
| Parabhava table, Plavanga reminder | `src/engine/tables/yearly/parabhava-2026-27.json`: 12 rasis, all 48 values match the source. A one-time scheduled task fires 24 Mar 2027 to add `plavanga-2027-28.json` before Ugadi (7 Apr 2027). Until that file exists, the Income screen says the table isn't loaded yet. |

## Also checked in Phase 8
- **Accessibility:** axe (wcag2a/aa, 21aa) on 12 screens in te and en, light and dark: no serious or critical issues (`tests/e2e/a11y.spec.ts`). Every screen-reader label comes from `src/content/{te,en}.json`.
- **Display:** dark mode and reduced motion are covered by e2e; larger text works from Settings and from the header అ+ / A+ button.
- **Offline:**
  - after the first visit every tab opens offline and Today still computes;
  - lazily loaded screens open offline because their chunks are precached;
  - a failed engine start is retried rather than stuck.
- **Updates:** a new version waits for the update toast instead of reloading in the middle of a form.
- **Tests:** `npm test` 543 passed, 10 todo; `npx playwright test` 96 passed.
- **Code review of the full diff:** 12 findings, all fixed and re-checked. That covers the muhurtham date after midnight, Today's date in the home city's zone and before sunrise, engine-start retry, Why sheets and a disclaimer on Today, name initials, the update toast and delete-all clearing memory. Follow-ups also added a worker-load failure retry and an error boundary for lazy screens.

## Needs a person before an honest launch
1. **Pandit review**
   - All rule tables, and the dosha copy.
   - Specific open choices:
     - the gruhapravesam door ↔ tithi groups, where sources disagree;
     - the new-job muhurtham table, which is unverified;
     - the chaturmas limits;
     - the adhika-Chaitra Ugadi convention (`outlook.json` `year.adhikaChaitra`; next case is Ugadi 2029);
     - Monday for gruhapravesam;
     - which events the nine bad yogas and the fixed karanas apply to;
     - kuja cancellations.
2. **Golden fixtures**
   - Add a Tirupati panchangam row; add a Thursday Durmuhurtham entry.
   - Have a person confirm every row against its reference and set `verified: true`:
     - `panchangam-golden.json` (9 rows);
     - `charts-golden.json` (5);
     - `dasha-golden.json` (5);
     - `matching-golden.json`, where the 10 published reports are still empty.
   - Replace the panchangam longitudes sampled from the engine itself with independent ones.
3. **Telugu copy:** 122 content strings (`te.json` `$pending`) and 112 table names (yogas, karanas, samvatsaras, some rasis and taras, Sunday, Surya, Ketu, …) need human-written Telugu. Until then, Telugu users see English for these.
4. **Devices:** install and run offline on a real Android Chrome phone and on iOS Safari.

## Known accuracy notes (within tolerance, recorded)
- **Systematic offset:** sidereal longitudes are 0.0044–0.0049° ahead of the independent chart fixtures, the same for the Moon and the lagna across 1943–2012. That points to a constant ayanamsa or frame difference (SE_SIDM_LAHIRI vs "Lahiri (IAE)").
- **Lag against Drik Panchang:** tithi, nakshatra and karana end times are 0.7–1.6 min later than Drik. That is within ±2 min but uses up to 79% of the tolerance. The cause needs finding before claiming ±2 min accuracy in public.
