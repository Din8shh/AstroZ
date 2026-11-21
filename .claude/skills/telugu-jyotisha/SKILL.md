---
name: telugu-jyotisha
description: Telugu panchangam and jyotisham rules for AstroZ (nama nakshatra, marriage matching, muhurtham, gruhapravesam, day periods, dasha, gochara, aadayam-vyayam). Use when writing or changing anything in src/engine/ or src/engine/tables/.
---
# Telugu jyotisham for AstroZ

## Conventions (do not change without asking)
- Sidereal zodiac, Lahiri (Chitrapaksha) ayanamsa, drik (astronomical) ganitam.
- Amanta lunar months (new moon to new moon), named by the Sun's sidereal rasi at the starting new moon; a month with no sankranti is adhika.
- Day = sunrise to next sunrise. Vara = weekday at sunrise. Sunrise definition is a setting; match the reference fixtures.
- Rahu: mean node by default (setting). Ketu = Rahu + 180°.
- Year starts at Ugadi (Chaitra shukla padyami). 2026–27 = Parabhava; 2027–28 = Plavanga.
- Chart style for display: South Indian square. Houses: whole sign from lagna rasi.

## Formulas (longitudes sidereal, degrees, mod 360)
- tithi = floor(((Moon − Sun) mod 360) / 12) + 1 (1–30; 1–15 shukla, 16–30 krishna)
- nakshatra = floor(Moon / 13.3333…) + 1; pada = floor((Moon mod 13.3333…) / 3.3333…) + 1
- yoga = floor(((Sun + Moon) mod 360) / 13.3333…) + 1
- karana = half-tithi (6° steps); fixed karanas at the month's end
- rasi = floor(λ / 30) + 1
- End times: bisection on the angle function to 1 second.
- Varjyam start = nakshatra start + (ghati/60) × nakshatra duration; length = (4/60) × duration. Amrita kalam: same shape, own table.
- Rahu kalam / Yamagandam / Gulika: daytime ÷ 8, slot by weekday table. Durmuhurtham: daytime ÷ 15, slots by weekday table. Abhijit: 8th of 15.
- Vimshottari: first dasha lord = Moon's nakshatra lord; balance = unelapsed fraction × lord years; antardashas proportional, same order.

## Readings
Every rule returns `{ status: 'good'|'mixed'|'avoid', score?, reasons: Reason[], todos: Todo[], remedies: RemedyId[] }`.
Reason = `{ ruleId, values }` (no prose). The content layer writes Telugu/English.

## Tables
All tables and their sources are in [reference.md](reference.md). Port each into `src/engine/tables/<name>.json` with `source`, `version`, `notes`.
Tables marked "standard" were not verified against a single published source: confirm against the golden fixtures and flag disagreements instead of guessing.

## Matching specifics
- Ashtakoota total 36; ≥ 18 traditionally acceptable.
- Rajju same group → flag (serious in many families). Vedha pair → flag.
- Kuja dosha: Mars in 2, 4, 7, 8, 12 from lagna, also check from Moon. Both partners having it is commonly treated as balanced. Present as "worth discussing with an astrologer".
- Names only (no birth time): use nama nakshatra for both, label result "approximate", skip lagna-based checks.

## Nama nakshatra from a name
- Take the first aksharam (a conjunct like క్ష, క్ర, కృ, శ్ర is one unit), normalise Telugu script and Latin spellings to a sound, look up the syllable table.
- If a sound fits several padas (e.g. "Ta" appears under Purva Phalguni and Swati in the Latin table), return all candidates and let the user choose.

## Muhurtham scoring order
1. Hard exclusions: month rules (adhika, kshaya, chaturmas, Sun in Dhanu for vivaham), combust Venus/Jupiter (vivaham), event-specific bad nakshatras/tithis/weekdays.
2. Panchanga shuddhi score: tithi, nakshatra, vara, yoga, karana against the event table.
3. Personal: tarabalam + chandrabalam for every participant.
4. Windows: remove Rahu kalam, Yamagandam, Gulika (event-dependent), Varjyam, Durmuhurtham; prefer Amrita kalam and Abhijit; lagna checks when implemented.
5. Return top windows with the 3 strongest reasons.
