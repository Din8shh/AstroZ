# AstroZ — Claude Design Brief

Paste the "Design system" section when creating the AstroZ design system in Claude Design.
Paste "Product brief" as the first message of the "AstroZ PWA" project (mobile frame 390 × 844).
Then run prompts P1–P7 one round at a time.

---

## Product brief

AstroZ is a fun, self-serve Telugu jyotisham companion for Andhra Pradesh and Telangana households (and the Telugu diaspora). People enter birth details, or just a name, and see for themselves what they would otherwise ask the family purohit: marriage matching, muhurtham, new-house dates, job and money outlook, plus simple free remedies and to-dos.

Core idea: **Wishes → readings → to-dos.** The user starts from a wish (కోరిక), not jargon.

| Module | Telugu | What the user gets |
|---|---|---|
| Today | నేటి పంచాంగం | Tithi, nakshatram, Rahu kalam, Varjyam, Durmuhurtham, Amrita kalam for the city + personal tarabalam |
| Marriage | పెళ్లి పొంతన | Guna score /36, 8 koota rows, Rajju, Vedha, Kuja dosha, name-based peru balam |
| Muhurtham | ముహూర్తం | Ranked dates and time windows for vivaham, gruhapravesam, vehicle, new job, business |
| New house | గృహప్రవేశం | Gruhapravesam dates, entry direction, ceremony checklist |
| Job | ఉద్యోగం | Dasha timeline, Guru/Shani transits, best windows in 90 days |
| Income & expense | ఆదాయ-వ్యయాలు | Ugadi-year aadayam, vyayam, rajapujyam, avamanam + monthly outlook |

Audience: 25–40 urban Telugu, smartphone-first; elders who prefer Telugu and larger text; diaspora in other time zones.
Tone: warm, playful, respectful — a cousin who knows the panchangam. Never frightening; doshas shown with context and what helps; no promised outcomes.
Principles: Telugu first with one-tap toggle · show the why on every result · calm about doshas · free remedies only (no gemstones, paid pujas, buy links) · private by default, no login · works offline on low-end Android.

---

## Design system

Feel: **modern-festive** — clean cards on warm paper-white, muggulu line patterns, turmeric and kumkum accents, thoranam green, temple gold. A Telugu wedding card redrawn as a modern app. Not dark-mystical.

### Colour tokens (light / dark)
| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| --az-bg | #FFF8EE | #1A1410 | Background | — |
| --az-surface | #FFFFFF | #241C16 | Cards | — |
| --az-ink | #2B1D14 | #F4EADF | Text | 15.4:1 |
| --az-ink-muted | #6B5848 | #B9A898 | Secondary text | 6.4 / 7.9:1 |
| --az-kumkum | #C8102E | #E5484D | Primary actions | white 5.9:1 |
| --az-turmeric | #F2B705 | #F5C43A | Highlight fills, "now" marker (never text on light) | ink 9.0:1 |
| --az-leaf | #2E7D32 | #4CAF50 | Good | white 5.1:1 |
| --az-caution | #E07A1F | #F0954A | Mixed | ink 5.4:1 |
| --az-avoid | #8E1B1B | #C44545 | Avoid windows (+ stripes + icon) | white 9.0:1 |
| --az-gold | #B8860B | #D4A73A | Borders, muggulu lines (decorative only) | 3.1:1 |

Status: Good (శుభం, lotus icon) · Mixed (మిశ్రమం, half-diya) · Avoid (వర్జించండి, crossed circle). Never colour alone.

### Type
| Role | Telugu | English | Size / LH |
|---|---|---|---|
| Display | Ramabhadra | Fraunces | 28–32 / 1.3 |
| UI/body | Noto Sans Telugu | Noto Sans | 16 (Telugu 17) / 1.6 |
| Times | Noto Sans tabular | Noto Sans tabular | 15 / 1.4 |
Telugu strings run ~30% longer; must wrap. Elder mode +20%.

### Shape
4 px grid · card radius 16 · chips fully rounded · 48 px touch targets · one soft shadow level.

### Components
WishCard · ProfileChip · DayRibbon (sunrise→sunrise bar: Rahu kalam, Yamagandam, Gulika, Varjyam, Durmuhurtham, Amrita kalam, Abhijit, "now" marker) · GunaDial (muggulu ring /36) · KootaRow · DoshaCallout (calm) · DateResultCard · WhySheet · TodoList (remedies marked free) · LangToggle (తె / EN) · BottomNav (Today, Wishes, Family, More) · BirthForm (time-not-known switch, offline place search) · ShareCard (no birth details).

### Illustration and motion
Original flat art: muggulu, diya, thoranam, kalasham, banana leaf, palm-leaf manuscript. 1.5 px line icons. No deity figures, film imagery or copied art.
Muggulu draw-in as loading; 2 px card lift on tap; marigold petals on high match; 150–300 ms; respect reduced motion.

---

## Screens
1 Onboarding (language first) · 2 Add person · 3 Reveal · 4 Today · 5 Wishes · 6 Marriage result · 7 Muhurtham finder · 8 Muhurtham detail · 9 New house · 10 Job · 11 Income & expense · 12 Family + Settings.
States: calculating · time unknown (approximate) · nothing auspicious in range · offline · mixed signals.

---

## Prompts (one per round)

**P1 · Foundations sheet**
Make a one-page component sheet at 390 px wide showing every AstroZ component in its states: default, pressed, disabled, loading, Good/Mixed/Avoid. Show each text component in Telugu and English to check wrapping and vowel-sign clipping. Light and dark side by side.

**P2 · Onboarding, add a person, reveal**
Design screens 1–3 for a 390 × 844 phone: (1) onboarding with the Telugu/English choice first, then three slides: "Your wishes, read by the Telugu panchangam", "Matching, muhurtham, new house, job, money", "Your details stay on this phone". (2) Add a person: name, gender, birth date, birth time with a "time not known" switch, birthplace search, relation; show error and time-unknown states. (3) Reveal: rasi, nakshatram and pada, lagna, the name's nama nakshatram, with a muggulu line drawing itself. Telugu default; one English variant of screen 2.

**P3 · Today**
Design Today: city, date, samvatsaram, masam, paksham; a panchangam card (tithi, nakshatram, yogam, karanam with end times); the DayRibbon sunrise-to-sunrise with all period segments and a turmeric "now" marker, plus a list view; "Your day" with tarabalam and chandrabalam as Good/Mixed/Avoid with one-line reasons; wish shortcuts. Include offline and elder-mode variants. Use placeholder values.

**P4 · Wishes hub and marriage**
Design the Wishes hub (five wish cards) and the marriage flow: pick two people or add a partner; result with GunaDial /36, eight KootaRows (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi), calm DoshaCallouts for Rajju, Vedha, Kuja dosha, peru balam from names, to-dos and free remedies, and a WhatsApp ShareCard without birth details. Variants: strong match, mixed match with a dosha, names-only match labelled approximate. Also the WhySheet open on one koota.

**P5 · Muhurtham and new house**
Design the finder (event type, date range with "next 90 days", city, participants) with ranked DateResultCards (score + top three reasons); a detail screen (panchanga shuddhi checklist, tarabalam per participant, best and avoid windows on the DayRibbon, add to calendar); the New house screen (best dates, entry direction for the tithi, ceremony checklist); and the "nothing auspicious in this range" state.

**P6 · Job and income**
Design Job outlook: horizontal Vimshottari dasha timeline with current mahadasha/antardasha highlighted, Guru and Shani transit cards from the person's rasi, best windows for interviews and joining in 90 days, to-dos. Then Income & expense: aadayam vs vyayam bars, rajapujyam and avamanam gauges, month-by-month strip, money to-dos and free remedies. Encouraging tone even when vyayam > aadayam.

**P7 · Family, settings, polish**
Design Family and Settings (language, default city, elder text, export data, delete all, methodology, disclaimer, about). Then polish all screens: English pass for overflow, dark mode contrast, 360 px width, every result has a Why link, every Avoid has an icon.

---

## Review before handoff
Telugu never clips · te/en at 360 and 390 px · dark mode contrast · icons with every status · Why link on every result · calm dosha copy · free remedies only · approximate labels · share card without birth details · no deity/film/copied art · disclaimer reachable.
Handoff: Export → Handoff to Claude Code → Send to local coding agent. Save the bundle in `design/handoff/` and tokens as `src/styles/tokens.css`.
