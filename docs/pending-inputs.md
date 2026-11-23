# AstroZ: inputs needed from people

> **Status 2026-11-23: your research is integrated.** The research itself is kept as `docs/inputs/research-2026-11-23.md`. Integrated:
>
> - **§1 Matching:** 9 onlinejyotish reports and 3 astrotyke cross-checks are in `tests/fixtures/matching-golden.json`. **7 of 13 full reports reproduce every koota exactly.** The 6 that differ are recorded, not hidden:
>   - **Gana:** the onlinejyotish calculator reads the gana matrix in the reverse direction from its own Gana article. AstroZ follows the article, and astrotyke agrees with AstroZ.
>   - **Vashya:** half-point table differences, plus one pada that straddles the 15° split.
>   - **Still needed:** SPEC's "10 reproduce" is not met yet (7). Pandit Q3 on gana direction, or 3 more matching reports from another site, would close it.
>   - **Note A was a mix-up:** the 17/36 verdict case is Ashwini × *Purva Bhadrapada*, not × Shatabhisha (14/36 in AstroZ, 14.5 on onlinejyotish).
> - **§2 Panchangam:**
>   - **Existing rows:** 6 rows filled out (tithi, nakshatra, yoga, karana, masa…), and Thursday Durmuhurtham added.
>   - **New rows:** **Tirupati 20 Dec 2026**, a second Thursday (3 Dec), and an **adhika Chaitra day (1 Apr 2029)**. All 12 rows pass (sunrise ±1 min, other times ±2 min).
>   - **Two corrections:** 3 Dec masa was recorded as 8 (amanta Kartika); the "9" was Drik's purnimanta name, see the row note. The 2029 Amrita kalam is left for a person: AstroZ finds a second pre-sunrise slot the read missed, the same as the second slots on 26 and 28 Nov.
>   - **Still `verified: false`:** a person must check the rows.
> - **§3 Charts:** 5 onlinejyotish charts are in `tests/fixtures/charts-published.json`. Every planet, the lagna and the Moon are within the site's arcminute truncation. Nakshatra and pada match exactly, and every current mahadasha and antardasha date matches to the day.
> - **§4 Pandit research applied, all provisional:**
>   - **Gruhapravesam doors:** the full Muhurta Chintamani scheme is now used (east purna, south nanda, west bhadra, north jaya). This **changes east from bhadra to purna**.
>   - **Gruhapravesam nakshatras and Chaturmas:** avoid-nakshatras added, and Chaturmas is excluded.
>   - **New job:** confirmed from Muhurta Chintamani 2.26. Pitru paksha and Dhanu kharmas are now excluded.
>   - **Citations only:** Chaturmas limits, gochara houses, the adhika-Chaitra and kshaya-Ugadi rules, and sandhi.
>   - **Remedies:** a safety and "optional" note now shows under every remedies list (Q19).
>   - **Not applied, recorded instead:** the Q6 yoni table (62 cells differ), the Q13 Ardra amrita 35 vs 45, Hasta 21 vs 22, and Q12 business rules (one secondary source, and they would need eclipse calculations).
> - **Still open, needs people:**
>   - a pandit, for the tradition choices in §4;
>   - a person, to check fixture rows;
>   - human Telugu (§5; machine drafts can't ship);
>   - real-device tests (§6);
>   - the Plavanga table at Ugadi 2027 (§7).


What the code can't produce by itself. Everything else in SPEC §12 is done. Each section says **what** to collect, **from where**, the **exact fields** to collect, and **how to hand it over**. You can paste values into a chat or fill the CSVs in `docs/inputs/`. I'll turn them into fixtures and tables, and the tests will show whether AstroZ agrees.

Ground rules for everything you collect:
- **Copy what the source prints. Don't correct it.** If AstroZ disagrees, that's the point of the check. I'll report the disagreement and won't adjust anything to make it pass.
- **No real family birth details** unless that person agrees. The repo is public. Published example charts, celebrity charts from books, or made-up birth details run through a trusted site are all fine.
- **A screenshot or URL for every value** is ideal, so a second person can check it later.
- **Never** solve or get around a website's captcha with a tool. Do it yourself in a normal browser.

Priority: **A** blocks a launch-checklist line. **B** improves accuracy or trust. **C** is nice to have.

---

## 1. Marriage matching reports (A): 9 more needed

SPEC Phase 5 requires **10 published reports that reproduce koota points**. We have **1 full report** (asksoma, Hasta p2 bride × Rohini p2 groom = 25/36). We also have 13 partial pages that don't say which partner is the bride. Those can only check the 5 symmetric kootas.

**Where:** any Telugu or Indian matching site or printed report that shows all 8 koota points, e.g. onlinejyotish.com (Telugu Porutham), Drik Panchang (Kundali Milan), astrosage, prokerala, or a printed report from an astrologer. Different sources are welcome.

**For each report, copy:**

| Field | Example |
|---|---|
| Source (site name + URL, or "printed report by …") | onlinejyotish.com/…porutham… |
| Date you read it | 2026-11-25 |
| **Bride** nakshatra + pada | Revati 4 |
| **Bride** rasi (as printed) | Meena |
| **Groom** nakshatra + pada | Krittika 1 |
| **Groom** rasi (as printed) | Mesha |
| Varna (out of 1) | 1 |
| Vashya (out of 2) | 0.5 |
| Tara / Dina (out of 3) | 1.5 |
| Yoni (out of 4) | 2 |
| Graha Maitri (out of 5) | 4 |
| Gana (out of 6) | 6 |
| Bhakoot / Rasi (out of 7) | 0 |
| Nadi (out of 8) | 8 |
| **Total (out of 36)** | 23 |
| Optional: Rajju / Vedha / Kuja shown? (yes/no + wording) | "Rajju dosha: no" |
| Screenshot | file |

(The example numbers above are placeholders. Copy what the source prints.)

**Important:** the bride and groom must be **clearly labelled** on the page. If the site uses "boy/girl", that's fine. If it only says "person 1/2", note that.

**Suggested pairs.** These are chosen to exercise every koota, including the hard cases. Any 9 different pairs are fine, but try to include these kinds:

| # | Bride | Groom | Why |
|---|---|---|---|
| 1 | Revati 4 | Krittika 1 | slot already in the fixture |
| 2 | Chitra 3 | Dhanishta 3 | slot already in the fixture |
| 3 | Ashwini 1 (Mesha) | Shatabhisha 1 (Kumbha) | your Mesha–Kumbha, same-nadi case |
| 4 | Bharani 2 (Mesha) | Hasta 1 (Kanya) | 6/8 rasi relation (bhakoot) |
| 5 | Magha 1 (Simha) | Uttara Phalguni 2 (Kanya) | 2/12 rasi relation |
| 6 | Mula 1 | Purva Ashadha 1 | same rasi, different nakshatra |
| 7 | Pushya 1 | Pushya 3 | same nakshatra, different pada |
| 8 | Revati 2 | Ashlesha 2 | deva × rakshasa gana |
| 9 | Uttara Bhadrapada 2 | Ardra 3 | different rasi and nadi, mixed |

**Bonus (B):** for 2–3 of these, the **same pair from two different sites**. Sites disagree on yoni and graha maitri tables, and this shows where.

---

## 2. Panchangam checks (A)

Launch-checklist line: "Golden fixtures pass (Hyderabad, Vijayawada, Tirupati, Dallas)". Two gaps:
- there is **no Tirupati row**;
- **no row has been confirmed by a person**. All 9 were read by an automated agent and are marked `verified: false`.

### 2a. Confirm the 9 existing rows

For each row below, open Drik Panchang (Telugu or English, day panchang) for the place and date. Then tick or correct each value in `tests/fixtures/panchangam-golden.json`, or just send me "row X: all match" or "row X: sunset is 17:41, not 17:40".

| Row id | Place | Date | Note |
|---|---|---|---|
| hyd-2026-11-21 | Hyderabad | 2026-11-21 (Sat) | |
| hyd-2026-11-23 | Hyderabad | 2026-11-23 (Mon) | |
| hyd-2026-11-24 | Hyderabad | 2026-11-24 (Tue) | |
| hyd-2026-11-26 | Hyderabad | 2026-11-26 (Thu) | **Durmuhurtham missing**: please add both slots |
| hyd-2026-11-27 | Hyderabad | 2026-11-27 (Fri) | |
| hyd-2026-11-28 | Hyderabad | 2026-11-28 (Sat) | |
| hyd-2026-12-09 | Hyderabad | 2026-12-09 (Wed) | |
| vij-2027-04-07 | Vijayawada | 2027-04-07 (Wed) | |
| dal-2026-03-08 | Dallas | 2026-03-08 (Sun) | US daylight-saving starts that day |

### 2b. New rows (A): at least 1

1. **Tirupati**, any date. A festival day (e.g. Vaikunta Ekadashi 2026/27) is a good choice.
2. Nice to have (B): a second Thursday (Durmuhurtham slots differ most between sources), an **adhika masa** day (the next is in 2029; Drik shows future dates), and a day when **a tithi is skipped** (kshaya).

**Fields per day** (all clock times local, 24 h, as printed):

| Group | Fields |
|---|---|
| Sun | sunrise, sunset |
| Calendar | vara (weekday), samvatsara, masa (amanta, mark if adhika), paksha, shaka year |
| Tithi | name + end time; if a second tithi starts the same day, its name + end time too |
| Nakshatra | name + end time (and the next one if it changes) |
| Yoga | name + end time |
| Karana | names + end times (usually 2–3) |
| Periods | Rahu kalam, Yamagandam, Gulika kalam, Abhijit, Durmuhurtham (both slots if two), Varjyam (all slots), Amrita kalam (all slots): start–end each |
| Optional (B) | Sun and Moon sidereal longitude at a stated time. Drik doesn't print these. A Telugu panchangam book's graha sphutam table, or Jagannatha Hora, would be an independent check. |

A **screenshot of the whole Drik page** is enough. I can read the values off it.

---

## 3. Birth charts and dasha (B)

The 5 chart and 5 dasha fixtures were computed by a second, independent library, not taken from published charts. They match, but nothing human-published backs them.

**Need:** 5 charts from a published source (book, astrologer's printout, Jagannatha Hora, or a site like onlinejyotish or prokerala), using made-up or consented birth details.

**Fields per chart:**
- **Input:** date, time, place (city), and the time zone the source used.
- **Moon:** rasi, nakshatra + pada.
- **Lagna:** rasi (and degree if shown).
- **Planets:** the rasi of each of Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu (degrees if shown). Note whether Rahu is "mean" or "true" if the source says. AstroZ uses mean.
- **Dasha:** the dasha balance at birth (lord + years/months/days). Also the start and end dates of the current mahadasha and antardasha.

Try to include one chart **born before 1950** (historical time zones) and one **born outside India**.

---

## 4. Pandit review (A for the launch checklist, B for accuracy)

Find a pandit or experienced astrologer (AP/TS tradition, amanta) to answer these. Short answers are fine. Please write down the **book or tradition** they're following for each answer. Each answer becomes a table entry in `src/engine/tables/` with `source: "Pandit <name>, <date>"`. The name is only included if they agree.

**Marriage** (`kootas.json`, `doshas.json`, `match-guidance.json`):
1. **Nadi dosha cancellations.** Which do you accept? For example: same rasi but different nakshatra; same nakshatra but different pada; rasi lords friends or the same. For the Mesha–Kumbha same-Adi-nadi example (17/36, rajju and vedha clear, kuja balanced), what would you tell the family?
2. **Bhakoot (6/8, 2/12, 5/9) cancellations.** Same lord or friendly lords, nadi clear?
3. **Gana cancellations.** Deva × rakshasa when the tara or graha maitri is good?
   - Piyushadhara: do friendly rasi lords and a good tara cancel gana each on their own (OR), or only together (the verse's "ca", AND)?
   - Bhakoot 5/9: when the bride's sign is 5th from the groom's (which Jyotih Prakasam does not cancel) but the rasi lords are friends, does the dosha stand? AstroZ currently cancels it.
   - Not applied yet, please rule on each: the Muhurta Pradipa list of harmless 6/8 pairs (incl. Cancer–Sagittarius; "Gemini–Virgo" as printed is not 6/8); Kala Prakasika's "one sign under the influence of the other" for 2/12; friendly navamsha lords for nadi.
   - Same nakshatra and same rasi: AstroZ keeps nadi standing even though the lords are the same. Is that right?
4. **Kuja dosha.** Which houses (1, 2, 4, 7, 8, 12)? Counted from the Moon, the lagna, Venus, or all three? Which cancellations: own or exalted sign, Jupiter's aspect, both partners having it?
5. **Overall wording.** At what point would you call a match "Strong", "Fair, a few points to talk about", or "needs a careful look"? Is it the total score, or certain kootas or doshas?
6. **Yoni table.** Please check the 14×14 animal table (only the same-yoni and enemy pairs are confirmed so far).
7. Is checking **Rajju and Vedha** with only nakshatras correct in your tradition?

**Muhurtham and New house** (`muhurtham.json`):

8. **Gruhapravesam door direction and tithi.** East and south are sourced. What about the **north and west** doors?
9. Gruhapravesam: is **Monday** allowed? Which nakshatras must be avoided?
10. **New job / joining:** good tithis, nakshatras, weekdays and lagnas. Nothing reliable was found online.
11. **Chaturmas:** its exact limits (Ashadha Shukla Ekadashi to Kartika Shukla Ekadashi?), and which events it blocks.
12. **Business start:** do Mercury retrograde and eclipse days matter?
13. **Varjyam:** please check the ghati table. **Durmuhurtham:** please check the slot table, including the two Thursday slots.

**Calendar** (`outlook.json`, `calendar.json`):

14. **Adhika Chaitra year (2029):** does Ugadi fall at the start of the adhika month (current rule), or of the nija Chaitra (about 14 April 2029)?
15. The **Ugadi rule** when pratipada is kshaya (skipped): is it the day pratipada begins? That is what AstroZ does.

**Job and Future** (`gochara.json`, `outlook.json`, `future.json`):

16. **Gochara good houses** from janma rasi for Guru, Shani and Rahu, and the Sade Sati or ashtama Shani wording.
17. **Sandhi kalam** around a mahadasha change: how many days before and after is "hold off"?
18. **Dasha meanings:** a one-line, calm meaning per lord (9 lords). These appear on the Job and Future tabs.

**Remedies** (`content/remedies.json`):

19. Please check that every remedy is traditional, **free**, and calm. These are stotram names, temple visits, fasting "if your health allows", daanam, and colours and days.

---

## 5. Telugu text (A): written by a person, never machine-translated

Two CSVs are ready. Fill the last column with Telugu.

| File | Rows | What |
|---|---|---|
| `docs/inputs/telugu-content.csv` | **208** | App sentences: `verdict` and `match.ask` (marriage overall picture, 49), `todo.safetyNote`, `future` (25), `mhx` muhurtham extras (14), `job` (11), `gochara` (11), `inc` income (11), `settings` (10), `mh`, `mhr` (8 each), `dasha` (8), `method` (8), and smaller groups |
| `docs/inputs/telugu-names.csv` | **141** | Names in tables: samvatsaras (59), koota labels (27), yogas (25), karanas (8), calendar terms (7), tarabalam (6), rasis (5), grahas (2), tithi (1), vara (1) |

Notes for the translator:
- Keep `{a}`, `{b}`, `{date}` and similar placeholders exactly as they are. They are filled in by the app.
- Tone: warm, calm, plain everyday Telugu, the way an elder in the family would say it. Doshas never sound scary.
- For names (samvatsaras, yogas…), use the spelling found in standard Telugu panchangams. Please name the panchangam you used.
- Where the English is unclear, leave a note in a 5th column and I'll explain the context.

---

## 6. Real-device tests (A): about 20 minutes, no skills needed

Launch-checklist line: "Installs on Android Chrome + iOS Safari". Run this on **one Android phone (Chrome)** and **one iPhone (Safari)**. App URL: https://din8shh.github.io/AstroZ/

| # | Step | Expected |
|---|---|---|
| 1 | Open the URL | App opens in Telugu |
| 2 | Android: ⋮ → *Install app* / iPhone: Share → *Add to Home Screen* | Icon appears on the home screen |
| 3 | Open from the icon | Full-screen, no browser bar |
| 4 | Look at Today, Wishes, Future and Family | Each loads |
| 5 | Turn on **airplane mode**, close the app fully, reopen it | App still opens; Today still shows panchangam |
| 6 | Airplane mode off. **Pull down** from the top of Today | Spinner, then the page refreshes |
| 7 | Toggle English and back | Text switches |
| 8 | Settings → elder text, and dark theme | Text bigger; dark colours readable |
| 9 | Add a person, then delete all data in Settings | Person is gone |

For each step, send: phone model, OS version, and pass or fail (plus a screenshot on fail).

---

## 7. Yearly table at Ugadi 2027 (B, time-bound)

A scheduled reminder fires on **24 March 2027**. At that point I need the **Plavanga (2027–28) aadayam–vyayam** for all 12 rasis, from onlinejyotish (the Parabhava source) or a Telugu panchangam book:

| Rasi | Aadayam (/15) | Vyayam (/15) | Rajapujyam (/7) | Avamanam (/7) |
|---|---|---|---|---|
| Mesha … Meena (12 rows) | | | | |

Plus the source and the Ugadi date that source states.

---

## 8. Still waiting on you (not data)

- **Design enhancements.** The attachment never arrived. Please re-send the image or file.
- **Marriage "overall verdict" layer** is built with PROVISIONAL rules (`src/engine/tables/match-verdict.json`). The pandit's answers to §4 Q1–5 replace them as table edits.

## Quickest wins

| Effort | Item | Closes |
|---|---|---|
| 20 min | §6 device test | 1 checklist line |
| 1–2 h | §1 nine matching reports (screenshots are fine) | Phase 5 "10 reports" |
| 1 h | §2 Tirupati + Thursday + confirm 9 rows (screenshots) | 1 checklist line |
| translator | §5 CSVs | all `$pending` English placeholders |
| pandit, 1 sitting | §4 | 1 checklist line, plus the verdict layer |
