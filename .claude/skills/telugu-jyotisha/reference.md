# AstroZ rule tables (v0.1, 2026-11-21)

Port each section into `src/engine/tables/*.json`. Keep the `source` line. Have a Telugu pandit review before launch.
"standard" = common jyotisha practice, not checked against one published page; verify against fixtures.

## 1. Nakshatras

Sources: syllables — onlinejyotish Avakahada chart (has Telugu script too; port and cross-check):
https://www.onlinejyotish.com/free-astrology/rashi-nakshatra-with-name.php
Varjyam ghatis — Drik Panchang thyajyam table: https://www.drikpanchang.com/tutorials/panchang-utilities/nakshatra-thyajyam.html
Lords and rajju — standard.

| # | Nakshatra | Telugu | Lord | Syllables pada 1–4 | Varjyam start ghati | Rajju |
|---|---|---|---|---|---|---|
| 1 | Ashwini | అశ్విని | Ketu | Chu, Che, Cho, La | 51 | Pada |
| 2 | Bharani | భరణి | Venus | Li, Lu, Le, Lo | 25 | Kati |
| 3 | Krittika | కృత్తిక | Sun | A, I, U, E | 31 | Nabhi |
| 4 | Rohini | రోహిణి | Moon | O, Va, Vi, Vu | 41 | Kantha |
| 5 | Mrigashira | మృగశిర | Mars | Ve, Vo, Ka, Ki | 15 | Siro |
| 6 | Ardra | ఆర్ద్ర | Rahu | Ku, Gha, Ng, Chha | 22 | Kantha |
| 7 | Punarvasu | పునర్వసు | Jupiter | Ke, Ko, Ha, Hi | 31 | Nabhi |
| 8 | Pushya | పుష్యమి | Saturn | Hu, He, Ho, Da | 21 | Kati |
| 9 | Ashlesha | ఆశ్లేష | Mercury | Di, Du, De, Do | 33 | Pada |
| 10 | Magha | మఖ | Ketu | Ma, Mi, Mu, Me | 31 | Pada |
| 11 | Purva Phalguni | పుబ్బ | Venus | Mo, Ta, Ti, Tu | 21 | Kati |
| 12 | Uttara Phalguni | ఉత్తర | Sun | Te, To, Pa, Pi | 19 | Nabhi |
| 13 | Hasta | హస్త | Moon | Pu, Sha, Na, Tha | 22 | Kantha |
| 14 | Chitra | చిత్త | Mars | Pe, Po, Ra, Ri | 21 | Siro |
| 15 | Swati | స్వాతి | Rahu | Ru, Re, Ro, Ta | 15 | Kantha |
| 16 | Vishakha | విశాఖ | Jupiter | Ti, Tu, Te, To | 15 | Nabhi |
| 17 | Anuradha | అనూరాధ | Saturn | Na, Ni, Nu, Ne | 11 | Kati |
| 18 | Jyeshtha | జ్యేష్ఠ | Mercury | No, Ya, Yi, Yu | 15 | Pada |
| 19 | Mula | మూల | Ketu | Ye, Yo, Bha, Bhi | 57 | Pada |
| 20 | Purva Ashadha | పూర్వాషాఢ | Venus | Bhu, Dha, Pha, Dha | 25 | Kati |
| 21 | Uttara Ashadha | ఉత్తరాషాఢ | Sun | Bhe, Bho, Ja, Ji | 21 | Nabhi |
| 22 | Shravana | శ్రవణం | Moon | Ju/Khi, Je/Khu, Jo/Khe, Kho | 11 | Kantha |
| 23 | Dhanishta | ధనిష్ఠ | Mars | Ga, Gi, Gu, Ge | 11 | Siro |
| 24 | Shatabhisha | శతభిషం | Rahu | Go, Sa, Si, Su | 19 | Kantha |
| 25 | Purva Bhadra | పూర్వాభాద్ర | Jupiter | Se, So, Da, Di | 17 | Nabhi |
| 26 | Uttara Bhadra | ఉత్తరాభాద్ర | Saturn | Du, Tha, Jha, Na | 25 | Kati |
| 27 | Revati | రేవతి | Mercury | De, Do, Cha, Chi | 31 | Pada |

Notes: other sources give slightly different Varjyam ghatis (e.g. 50 for Ashwini). Latin syllables collide (Ta, Ti, Tu, Te, To, Da, Di, Du, De, Do, Na, Dha) because the Devanagari original separates dental/retroflex sounds; the Telugu-script table resolves most of these (త vs ట, ద vs డ, న vs ణ). Use the Telugu table as primary.

## 2. Ashtakoota (source: https://www.onlinejyotish.com/astrology-lessons/lesson_116.php)

| Koota | Max | Compares |
|---|---|---|
| Varna | 1 | Varna of Moon signs |
| Vashya | 2 | Vashya group of Moon signs |
| Tara | 3 | Star count both ways |
| Yoni | 4 | Animal of each nakshatra |
| Graha Maitri | 5 | Friendship of Moon-sign lords |
| Gana | 6 | Deva / Manushya / Rakshasa |
| Bhakoot | 7 | Moon-sign distance (2/12, 6/8, 5/9 = dosha) |
| Nadi | 8 | Adi / Madhya / Antya (same = dosha) |

Total 36; ≥ 18 acceptable. Per-nakshatra Gana/Yoni/Nadi and the point matrices: port from a published Ashtakoota reference and test with 10 published reports.

## 3. Vedha pairs (standard)
Ashwini–Jyeshtha, Bharani–Anuradha, Krittika–Vishakha, Rohini–Swati, Ardra–Shravana, Punarvasu–Uttara Ashadha, Pushya–Purva Ashadha, Ashlesha–Mula, Magha–Revati, Purva Phalguni–Uttara Bhadra, Uttara Phalguni–Purva Bhadra, Hasta–Shatabhisha; Mrigashira, Chitra, Dhanishta mutually.

## 4. Tarabalam (count birth star → day star inclusive, mod 9)
1 Janma mixed · 2 Sampat good · 3 Vipat avoid · 4 Kshema good · 5 Pratyak avoid · 6 Sadhana good · 7 Naidhana avoid · 8 Mitra good · 0/9 Parama Mitra good.

## 5. Chandrabalam (standard)
Day Moon in house 1, 3, 6, 7, 10, 11 from birth rasi = good.

## 6. Day periods (standard; daytime ÷ 8, slot number)

| Weekday | Rahu kalam | Yamagandam | Gulika |
|---|---|---|---|
| Sun | 8 | 5 | 7 |
| Mon | 2 | 4 | 6 |
| Tue | 7 | 3 | 5 |
| Wed | 5 | 2 | 4 |
| Thu | 6 | 1 | 3 |
| Fri | 4 | 7 | 2 |
| Sat | 3 | 6 | 1 |

Durmuhurtham: daytime ÷ 15; weekday slot numbers DIFFER between sources (e.g. https://astrosight.ai/dur-muhurtam/guntur). Fill from the reference panchangam and lock with fixtures.
Amrita kalam ghati table: see https://www.wisdomlib.org/hinduism/essay/significance-of-the-moon-in-ancient-civilizations/d/doc1187665.html ; verify against Drik Panchang daily pages.

## 7. Vivaha muhurtham
- Nakshatras: fixed stars (Rohini, Uttara Phalguni, Uttara Ashadha, Uttara Bhadra) + Mrigashira, Revati, Anuradha, Mula, Swati, Magha, Hasta. Tithis 2, 3, 5, 7, 10, 11, 13. Lagna: 7th and 8th empty. (https://vedastrology.blogspot.com/2011/06/vivaham-marriage.html)
- Exclude: Adhika/Kshaya masa, Chaturmas, Sun in Dhanu (kharmas) (https://www.drikpanchang.com/shubh-dates/info/choosing-auspicious-marriage-date.html); Venus or Jupiter combust (https://www.astrogle.com/astrology/marriage-muhurtham-rules.html).
- Personal: tarabalam + chandrabalam for bride and groom.

## 8. Gruhapravesam
- Months (Uttarayanam): Magha, Phalguna, Vaishakha, Jyeshtha (https://gotirupati.com/?p=58899)
- Nakshatras: Rohini, Pushya, Dhanishta, Mrigashira, Shatabhisha, Uttara Bhadra + other Uttaras (https://www.hindu-blog.com/2021/07/griha-pravesh-rules-in-hinduism.html); also Chitra, Anuradha, Revati (https://assureshift.in/blog/griha-pravesh-dates-shubh-muhurat)
- Weekdays: Mon, Wed, Thu, Fri
- Entry: nanda tithis 1, 6, 11 → south; bhadra 2, 7, 12 → east (hindu-blog above); others from pandit review
- Later: Kalasha / Vrishabha chakra on Sun's nakshatra (https://www.onlinejyotish.com/articles/online-muhurta-finder-article.php)

## 9. Vimshottari years (standard)
Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17 = 120.

## 10. Gochara from birth rasi (standard)
Jupiter good: 2, 5, 7, 9, 11. Saturn good: 3, 6, 11; Sade Sati 12/1/2; Ardhashtama 4; Ashtama 8. Rahu/Ketu good: 3, 6, 11.

## 11. Aadayam-vyayam, Parabhava 2026–27
Source: https://www.onlinejyotish.com/free-astrology/parabhava-samvatsaramu/adaya-vyayamulu.php (no formula published; ship yearly data)

| Rasi | Aadayam | Vyayam | Rajapujyam | Avamanam |
|---|---|---|---|---|
| Mesha | 11 | 5 | 2 | 4 |
| Vrishabha | 5 | 14 | 5 | 4 |
| Mithuna | 8 | 11 | 1 | 7 |
| Karkataka | 2 | 11 | 4 | 7 |
| Simha | 5 | 5 | 7 | 7 |
| Kanya | 8 | 11 | 3 | 3 |
| Tula | 5 | 14 | 6 | 3 |
| Vrischika | 11 | 5 | 2 | 6 |
| Dhanus | 14 | 11 | 5 | 6 |
| Makara | 2 | 8 | 1 | 2 |
| Kumbha | 2 | 8 | 4 | 2 |
| Meena | 14 | 11 | 7 | 2 |

Sanity test: rasis with the same lord share aadayam/vyayam.
