# Design handoff → app mapping

Source: `design/handoff/` (Claude Design export: 54 artboards, `canvas.json`,
`ds/astroz/tokens.json`, `astroz-tokens.css`, `ds/astroz/components/bundle.{js,css}`, 5 woff2 fonts).
Written 2026-11-21, before Phase 1. Treat `design/handoff/` as read-only reference; port into `src/`.

**Source of truth:** the canvas pages P2–P7 plus the P1 Foundations sheets. The 7 "Core screens"
(`Main`, `Today`, `Marriage`, `Muhurtham`, `NewHouse`, `Job`, `Income`) are an earlier English-only
pass and are superseded.

## 1. Screens (SPEC §7 → artboards)

The 360 px, offline, elder and dark variants use the same markup as their base screen with a setting
switched (`offline`, `elder`, `dark`, width 360). Every artboard has `elder` and `dark` switches.

| # | SPEC screen | Route (proposed) | Artboards | States shown |
|---|---|---|---|---|
| 1 | Onboarding | `#/welcome` | `OnbLanguage`, `OnbSlide1`, `OnbSlide2`, `OnbSlide3` | Language pick; 3 slides (panchangam, wishes, privacy) with next/skip |
| 2 | Add person | `#/people/new` | `AddPerson`, `AddPersonError`, `AddPersonTimeUnknown`, `AddPersonEnglish` | Default, error, time unknown, en |
| 3 | Reveal | `#/people/:id/reveal` | `RevealCalculating`, `Reveal` | Calculating (muggulu loader); rasi, nakshatra·pada, lagna, nama nakshatra, each with Why |
| 4 | Today | `#/today` (start tab) | `TodayTe`, `TodayTeOffline`, `TodayTeElder`, `TodayEn`, `TodayTe360` | Default, offline banner, elder (A+), en, 360 |
| 5 | Wishes | `#/wishes` | `WishesHub` | Profile picker + 5 WishCards |
| 6 | Marriage | `#/wishes/marriage`, `…/result`, `…/share` | `MatchPick`, `MatchStrong`, `MatchMixed`, `MatchNamesOnly`, `MatchWhySheet`, `MatchShare`, `MatchStrongEn`, `MatchStrong360` | Pick two; strong 32/36; mixed 22/36 + Kuja; names-only (approximate); Bhakoot Why sheet; WhatsApp share |
| 7 | Muhurtham finder | `#/wishes/muhurtham` | `MhFinder`, `MhNothing` | Ranked results; nothing found + nearest good date |
| 8 | Muhurtham detail | `#/wishes/muhurtham/:date` | `MhDetail`, `MhDetailEn`, `MhDetail360` | Panchanga shuddhi, per-person strength, day ribbon, Add to calendar (.ics) |
| 9 | New house | `#/wishes/house` | `NewHouseTe`, `NewHouseEn` | Door direction, best dates, tithi-by-direction, reminder |
| 10 | Job | `#/wishes/job` | `JobTe`, `JobEn` | Dasha timeline, Guru/Shani transits, 90-day windows, hold-off week |
| 11 | Income & expense | `#/wishes/income` | `IncomeTe`, `IncomeEn`, `IncomeTe360` | Vyayam > aadayam, rajapujyam/avamanam, 12-month strip |
| 12 | Family + Settings | `#/family`, `#/settings` | `FamilyTe`, `FamilyEn`, `SettingsTe`, `SettingsEn`, `SettingsTe360` | Approximate and names-only people, saved dates; export/delete, method, disclaimer |
| — | Design system | — | `Foundations{A,B,C}{Light,Dark}` | All component variants, light and dark |

SPEC §7 states → where designed: calculating (`RevealCalculating`, Button/WishCard loading),
time unknown (`AddPersonTimeUnknown`, ApproxTag everywhere), nothing auspicious (`MhNothing`),
offline (`TodayTeOffline`), mixed signals (`MatchMixed`, Job/Income mixed chips).

## 2. Components (SPEC §4 → bundle)

All 13 SPEC §4 names exist in `bundle.js` with the same names.

| SPEC §4 | Bundle | Props / variants in the design | Port notes |
|---|---|---|---|
| WishCard | `WishCard` | icon, title, subtitle, status, statusLabel; default/pressed/loading/disabled | — |
| ProfileChip | `ProfileChip` | name, initial, relation, approximate, selected, add | Relation label comes from relation + gender (§4.2) |
| DayRibbon | `DayRibbon` | sunrise, sunset, nextSunrise, now, segments[{kind,start,end}], view `bar`/`list`, showLegend | Takes `HH:MM` strings from the engine; its offset maths is layout only. Period names → content |
| GunaDial | `GunaDial` | score, max, status, label, approximate, celebrate, size | Must take `status` from the Reading; drop built-in 24/18 band cut-offs |
| KootaRow | `KootaRow` | koota, score, max, status, note, onWhy | `max` from tables; `status` from Reading; names from tables |
| DoshaCallout | `DoshaCallout` | title, status, cancelled, statusLabel, children, helps[], onWhy | `helps` = remedy ids → `remedies.json` |
| DateResultCard | `DateResultCard` | rank, date, weekday, tithi, score, max, window, status, reasons[≤3], approximate, action | Reasons arrive as `{ruleId, values}` and render via content templates |
| WhySheet | `WhySheet` | open, title, children, factors[{label,value,status}], method, inline | — |
| TodoList | `TodoList` | title, items[{text,when,free,done}] | Items by id → content; "Free" badge unless `free === false` |
| LangToggle | `LangToggle` | value, onChange | Writes `Settings.lang` |
| BottomNav | `BottomNav` | active: today/wishes/family/more | "More" → Settings (§4.4) |
| BirthForm | `BirthForm` | values, state default/error/timeUnknown, submitLabel | Values remapped to SPEC enums (§4.2) |
| ShareCard | `ShareCard` | names, score, max, status, verdict, approximate | Never receives birth data |

**In the bundle, not in SPEC §4:** `Button` (primary/secondary/quiet, loading, block), `StatusChip`
(good/mixed/avoid × soft/solid), `Icon` (33 line icons), `Muggulu` (ornament + loader).
Internal helpers: `ApproxTag`, `WhyLink`, `Field`, `Segmented`, `Thoranam`.

**Patterns hand-built in screens, to become components** (proposed names):
`ScreenHeader` (back, title, LangToggle), `OfflineBanner`, `AngaGrid` (value, end time, next),
`DayForYouCard` (tarabalam/chandrabalam), `FactRow` (Reveal), `OnbSlide` + pager, `ChoiceChips`
(event, range, door), `CityPicker`, `DashaTimeline`, `TransitCard`, `AayaVyayaBar`, `MonthStrip`,
`DoorCompass` + tithi table, `PersonRow`, `SavedDateRow`, `SettingsRow` / `Switch` / danger button,
`Disclaimer`, `PrivacyLine`.

Icons: lotus, half-diya, crossed-circle, diya, kalasham, muggulu, thoranam, banana-leaf, palm-leaf,
sunrise, moon, nakshatram, clock, why, check, close, plus, chevron-right, chevron-down, share,
calendar, muhurtham, location, search, offline, lock, rings, house, briefcase, coins, family,
person, more.

## 3. Tokens (`ds/astroz/tokens.json` → `src/app/styles/tokens.css`)

- **Colour** (31 tokens, light + dark): `bg`, `surface`, `surface-sunk`, `ink`, `ink-muted`, `line`,
  `line-strong`; the `kumkum`, `turmeric`, `leaf`, `caution` and `avoid` families (fill, `on-*`,
  `*-ink`, `*-soft`; `turmeric` has no `*-ink`); `gold`, `gold-soft`, `thoranam`, `focus`, `scrim`.
  Status always pairs colour with an icon: lotus = good, half-diya = mixed, crossed-circle = avoid.
- **Type**: display-te Ramabhadra (one weight; never fake bold), display-en Fraunces, body-te
  Noto Sans Telugu, body-en Noto Sans; 5 woff2 subset files. Telugu sizes 32/28/20/17/15/14
  (never below 14); English 32/28/19/16/14/13; `times` 15 tabular-nums; `score` 44.
- **Spacing** 4/8/12/16/20/24/32/48 · **Radius** sm 8, md 12, card 16, pill 999 ·
  **Shadow** one level, `shadow-card` · **Size** touch 48, icon 24, screen 390 · **Scale** elder 1.2.
- **Component vars in `bundle.css`**: `.az-te` / `.az-en` set `--fs-body`, `--fs-label`,
  `--fs-caption`, `--fs-title`, `--fs-display`, `--az-font`, `--az-font-display`; `.az-elder` sets
  `--az-scale`; dark mode is `.az-dark`; one `prefers-reduced-motion` block.

## 4. Decisions (defaults, accepted 2026-11-21)

1. **Focus token.** `astroz-tokens.css` has an unresolved `--az-focus:{az-kumkum-ink}` (both themes).
   The app's `tokens.css` uses `--az-focus: var(--az-kumkum-ink)`, so it is `#c8102e` in light and
   `#f27a7d` in dark. The handoff file is left as exported.
2. **Profile enums follow SPEC §5.** `gender: 'f'|'m'|'x'` (form labels Female/Male/Other).
   `relation: 'self'|'spouse'|'child'|'parent'|'other'`. The design's finer labels come from
   relation + gender: child → Son/Daughter, parent → Mother/Father. Fiancé/కాబోయే భర్త is stored as
   `spouse`; a separate label for it needs new Telugu copy written by a person.
3. **Domain data leaves the components.** Koota names and max points, period names, guna bands
   (24/18 of 36) → `src/engine/tables/*.json`. Status labels, verdicts, nav labels, form copy → 
   `src/content/{te,en}.json`. Components get `status` from the Reading; they never derive it.
   Telugu strings from the bundle move into `te.json` and need a person to review them.
4. **Theme.** `Settings.theme` is `system|light|dark`: `system` follows `prefers-color-scheme`;
   light/dark set the class on the root. Settings gets a theme row (not in the design; copy needs
   writing).
5. **Navigation.** Today is the start tab. Wishes tab = `WishesHub`. "More" opens Settings.
   `Main.dc.html` is not built.
6. **Not designed yet, built from existing parts:** the methodology page ("Read the full method"),
   separate disclaimer and privacy pages (SPEC §12), Edit person (reuses BirthForm), the PWA update
   toast. Compare these with Foundations, not with a handoff screen.

## 5. Content checks done on the handoff

Every remedy and to-do in the screens is free (diya, elders' blessings, daanam, saving habits).
No gemstones, paid pujas or buy links. Dosha copy is calm ("one alone doesn't decide").
Western digits throughout, including Telugu screens.
