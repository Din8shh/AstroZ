// Contract between the UI and the engine worker (docs/SPEC.md §6).
// Phase 2 exposes the ephemeris layer; panchangam, matching, muhurtham etc. join in later phases.
import type { Body, BodyPosition } from './ephemeris/types';
import type { LocalMoment, LocalTime, TimeNote } from './core/time';
import type { Name } from './core/panchangam';
import type { PeriodKind, PeriodStatus } from './core/dayPeriods';
import type { Lord } from './core/chart';
import type { NamaResult } from './core/nama';
import type { Reading, Status } from './rules/strength';
import type { KootaResult, KujaResult } from './rules/matching';
import type { Door, EventId, Participant } from './rules/muhurtham';

export type { LocalMoment, LocalTime, TimeNote, Name, PeriodKind, PeriodStatus, Lord, NamaResult, Reading, Status, KootaResult, KujaResult, Door, EventId, Participant };

/** A place as the engine needs it (subset of SPEC `Place`). */
export type GeoPlace = { lat: number; lon: number; tz: string; altitude?: number };

export type EngineInfo = {
  ephemeris: string;
  ayanamsa: 'lahiri';
  node: 'mean' | 'true';
  sunrise: 'upper-limb' | 'disc-centre' | 'hindu';
  /** Time spent inside the worker loading the ephemeris (wasm + data), ms. */
  initMs: number;
  /** Load-time health check: Lahiri ayanamsa at J2000.0 (expected 23.853°). */
  ayanamsaJ2000: number;
};

export type PositionsResult = {
  jdUt: number;
  utc: string;
  note: TimeNote;
  ayanamsa: number;
  bodies: Record<Body, BodyPosition>;
};

export type SunTimes = {
  /** Sunrise on the civil date (first sunrise after local midnight). */
  sunrise: LocalTime | null;
  sunset: LocalTime | null;
  /**
   * The next day's sunrise: the panchangam day runs sunrise → next sunrise.
   * null (even with a sunrise) at high latitudes near midsummer: treat as "no panchangam day".
   */
  nextSunrise: LocalTime | null;
};

/** An anga current during the panchangam day, with its own start and end (local times). */
export type Anga = { number: number; name: Name; start: LocalTime; end: LocalTime };
export type NakshatraAnga = Anga & { padas: { pada: number; end: LocalTime }[] };

/** The panchangam day: sunrise on `date` → next sunrise. */
export type DayPanchangam = {
  date: string;
  tz: string;
  sunrise: LocalTime;
  sunset: LocalTime;
  nextSunrise: LocalTime;
  vara: { number: number; id: string; name: Name };
  tithi: Anga[];
  nakshatra: NakshatraAnga[];
  yoga: Anga[];
  karana: Anga[];
  paksha: { id: 'shukla' | 'krishna'; name: Name };
  masa: { number: number; name: Name; adhika: boolean; kshaya: boolean };
  ruthu: { number: number; name: Name };
  ayana: { id: 'uttarayana' | 'dakshinayana'; name: Name };
  samvatsara: { number: number; name: Name; shaka: number };
};

export type DayPeriodView = {
  kind: PeriodKind;
  name: Name;
  status: PeriodStatus;
  start: LocalTime;
  end: LocalTime;
  verified: boolean;
};

export type BirthInput = {
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm, only when timeKnown
  timeKnown: boolean;
  place: GeoPlace;
};

export type PlacementView = {
  longitude: number;
  rasi: number;
  rasiName: Name;
  degree: number;
  nakshatra: number;
  nakshatraName: Name;
  pada: number;
  retrograde: boolean;
};

export type DashaView = { lord: Lord; start: LocalTime; end: LocalTime };
export type MahadashaView = DashaView & { antardashas: DashaView[] };

export type BirthChart = {
  /** true when the birth time is unknown: Moon taken at local noon, no lagna, label "approximate". */
  approximate: boolean;
  /** How the birth time was read: DST gap/ambiguity, or 'noon' when the time is unknown. */
  timeNote: TimeNote | 'noon';
  moon: PlacementView;
  /** Absent whenever the birth time is unknown. Never estimate it. */
  lagna?: PlacementView;
  planets: Record<Body, PlacementView>;
  /** Time unknown only: the nakshatras / rasis the Moon passes through on the birth date (more than one = uncertain). */
  dayRange?: { nakshatras: number[]; rasis: number[] };
  dasha: { balanceYears: number; mahadashas: MahadashaView[] };
};

export type StrengthSegment<R> = { start: LocalTime; end: LocalTime; reading: R };
export type TarabalamReading = Reading & { tara: { number: number; name: Name } };
export type ChandrabalamReading = Reading & { house: number };
export type DayStrength = {
  tarabalam: StrengthSegment<TarabalamReading>[];
  chandrabalam: StrengthSegment<ChandrabalamReading>[];
};

export type MatchPersonInput = {
  name: string;
  /** Required for basis 'chart'. */
  birth?: BirthInput;
  /** Which nama-nakshatra candidate to use when the name is ambiguous (default 0). */
  namaChoice?: number;
};

export type MatchSideView = {
  name: string;
  nakshatra: number;
  pada: number;
  rasi: number;
  /** Time unknown (chart) or name-based. */
  approximate: boolean;
  /** Names basis: the first sound used. */
  aksharam?: string;
  /** The name fits several nama-nakshatra padas and no choice was passed (the first candidate was used). */
  namaAmbiguous?: boolean;
  /** Chart basis, time unknown: the nakshatras / rasis the Moon passed through on the birth date. */
  dayRange?: { nakshatras: number[]; rasis: number[] };
};

export type MatchReading = {
  basis: 'chart' | 'names';
  approximate: boolean;
  status: Status;
  score: number;
  max: number;
  kootas: KootaResult[];
  rajju: { present: boolean; status: Status; reasons: Reading['reasons'] };
  vedha: { present: boolean; status: Status; reasons: Reading['reasons'] };
  kuja: KujaResult;
  bride: MatchSideView;
  groom: MatchSideView;
  /** Name strength (ashtakoota on the nama nakshatras); always approximate. Absent if a name gives no candidate. */
  peruBalam?: { status: Status; score: number; max: number; ambiguous: boolean };
  reasons: Reading['reasons'];
  todos: { id: string }[];
  remedies: string[];
};

export type MuhurthamQuery = {
  event: EventId;
  /** First civil date searched (the panchangam day starting at that sunrise). */
  from: string;
  days: number;
  place: GeoPlace;
  /** Everyone whose tarabalam / chandrabalam counts (birth star and Moon rasi). */
  people: Participant[];
  /** Gruhapravesam: the direction the main door faces. */
  door?: Door;
};

export type MuhurthamWindowView = {
  date: string;
  start: LocalTime;
  end: LocalTime;
  score: number;
  status: Status;
  /** Every reason, strongest first; `top` = the three shown on a card. */
  reasons: Reading['reasons'];
  top: Reading['reasons'];
  panchanga: {
    vara: { number: number; id: string; name: Name };
    paksha: { id: 'shukla' | 'krishna'; name: Name };
    masa: { number: number; name: Name };
    tithi: { number: number; name: Name; start: LocalTime; end: LocalTime };
    nakshatra: { number: number; name: Name; start: LocalTime; end: LocalTime };
    yoga: { number: number; name: Name; start: LocalTime; end: LocalTime };
    karana: { number: number; name: Name; start: LocalTime; end: LocalTime };
    /** Karanas earlier the same day that were avoided (e.g. Vishti until 08:10). */
    karanaBefore?: { number: number; name: Name; end: LocalTime };
    moonRasi: { number: number; name: Name };
  };
  people: { id: string; tara: { number: number; name: Name }; taraStatus: Status; house: number; chandraStatus: Status }[];
  /** Lagna rising at the window's start: information only, not scored yet. */
  lagna: { rasi: number; name: Name };
  door?: { door: Door; group: string | null; fits: boolean };
};

export type MuhurthamResult = {
  event: EventId;
  /** Best window of each qualifying day, highest score first. */
  results: MuhurthamWindowView[];
  /** Only when nothing qualified: the first qualifying day after the range (searched up to nearestDays). */
  nearest?: MuhurthamWindowView;
  daysSearched: number;
  /** Why days had no window: the main exclusion of each such day, counted. */
  exclusions: { ruleId: string; days: number; values: Record<string, unknown> }[];
  /** Gruhapravesam only: the entry-direction table (door → tithi group, null = no rule yet) and the checklist ids. */
  guide?: { byDoor: Record<Door, string | null>; groups: Record<string, number[]>; checklist: { id: string; when: string | null }[] };
  ms: number;
};

export type TransitView = {
  planet: 'jupiter' | 'saturn' | 'rahu';
  name: Name;
  rasi: number;
  rasiName: Name;
  /** House from the janma (Moon) rasi. */
  house: number;
  status: Status;
  phase?: 'sadeSati' | 'ardhashtama' | 'ashtama';
  /** When it moves to the next rasi (within ~3 years), and where. */
  until?: LocalTime;
  nextRasi?: number;
  reasons: Reading['reasons'];
};

export type DashaSpan = { lord: Lord; name: Name; short: Name; start: LocalTime; end: LocalTime; /** Full length of this lord's mahadasha (vimshottari.json). */ years: number };

export type JobOutlookInput = { person: { id: string; birth: BirthInput }; from: string; days: number; place: GeoPlace };
export type JobOutlook = {
  person: { id: string; nakshatra: number; rasi: number };
  /** Birth time unknown: dasha dates are approximate. */
  approximate: boolean;
  status: Status;
  dasha: {
    mahadashas: DashaSpan[];
    current: DashaSpan;
    antardashas: DashaSpan[];
    currentAntar: DashaSpan;
    /** The antardasha after the current one (may be in the next mahadasha). */
    nextAntar?: DashaSpan;
    /** A mahadasha change within the next 12 months. */
    nextMaha?: DashaSpan;
  };
  transits: TransitView[];
  /** Best stretches of days in the range (tarabalam + chandrabalam + transits). */
  windows: { start: string; end: string; score: number; status: Status; reasons: Reading['reasons'] }[];
  /** Good days to join (findMuhurtham 'job'), outside any hold-off. */
  joining: MuhurthamWindowView[];
  /** Days around a mahadasha change: hold off on joining. */
  holdOff: { start: string; end: string; reasons: Reading['reasons'] }[];
  reasons: Reading['reasons'];
  todos: { id: string }[];
  remedies: string[];
};

export type YearOutlookInput = { rasi: number; date: string; place: GeoPlace };
export type YearOutlook = {
  samvatsara: { number: number; name: Name; shaka: number };
  /** Civil dates of this Ugadi and the next one. */
  ugadi: { start: string; end: string };
  /** Null when this year's table is not loaded yet (add tables/yearly/<name>-<years>.json at Ugadi). */
  table: { aadayam: number; vyayam: number; rajapujyam: number; avamanam: number; scale: { aadayam: number; vyayam: number; rajapujyam: number; avamanam: number }; source: string;
    /** outlook.json income.honour: rajapujyam ≥ avamanam → good, else mixed. */
    honour: Status } | null;
  status: Status;
  months: { masa: { number: number; name: Name; adhika: boolean }; start: string; end: string; status: Status; transits: { planet: 'jupiter' | 'saturn' | 'rahu'; house: number; status: Status }[] }[];
  /** Index into months for `date`. */
  current: number;
  reasons: Reading['reasons'];
  todos: { id: string }[];
  remedies: string[];
};

export type FutureInput = { person: { id: string; birth: BirthInput }; from: string; /** 0 = whole life */ years: number; place: GeoPlace };
export type FuturePeriod = {
  start: string;
  end: string;
  /** Mahadasha and antardasha running at the period's middle. */
  mahadasha: DashaSpan;
  antardasha: DashaSpan;
  /** Every mahadasha–antardasha pair that runs during the period, in order (a period can hold a change). */
  segments: { mahadasha: DashaSpan; antardasha: DashaSpan }[];
  /** Transit houses from the janma rasi at the middle (absent for whole-life periods). */
  transits?: { planet: 'jupiter' | 'saturn' | 'rahu'; house: number; status: Status }[];
  status?: Status;
};
export type TransitMilestone = { planet: 'jupiter' | 'saturn' | 'rahu'; name: Name; date: string; rasi: number; rasiName: Name; house: number; status: Status; phase?: 'sadeSati' | 'ardhashtama' | 'ashtama' };
export type FutureOutlook = {
  person: { id: string; nakshatra: number; rasi: number };
  approximate: boolean;
  horizon: { from: string; to: string; years: number; granularity: 'month' | 'year' | 'mahadasha' };
  now: { mahadasha: DashaSpan; antardasha: DashaSpan; transits: TransitView[] };
  /** Mahadashas that touch the horizon, each with its antardashas inside it. */
  dashas: (DashaSpan & { antardashas: DashaSpan[] })[];
  periods: FuturePeriod[];
  /** Sign changes of Guru, Shani and Rahu inside the horizon (none for whole life). */
  milestones: TransitMilestone[];
  reasons: Reading['reasons'];
  remedies: string[];
};

export class NoSunriseError extends Error {
  override name = 'NoSunriseError';
}

export interface AstroEngine {
  init(): Promise<EngineInfo>;
  positions(at: LocalMoment): Promise<PositionsResult>;
  sunTimes(date: string, place: GeoPlace): Promise<SunTimes>;
  /** Sidereal ascendant (lagna) longitude. Only call when the birth time is known. */
  ascendant(at: LocalMoment, place: GeoPlace): Promise<number>;
  /** Panchangam for the day that starts at sunrise on `date`. Rejects with NoSunriseError at polar latitudes. */
  panchangam(date: string, place: GeoPlace): Promise<DayPanchangam>;
  /** Rahu kalam, Yamagandam, Gulika, Durmuhurtham, Abhijit, Varjyam, Amrita kalam for that day, by start time. */
  dayPeriods(date: string, place: GeoPlace): Promise<DayPeriodView[]>;
  /** Birth chart with Vimshottari dasha. No lagna when the birth time is unknown. */
  birthChart(input: BirthInput): Promise<BirthChart>;
  /** Nama nakshatra from the first sound of a name (Telugu script or Latin); several candidates when ambiguous. */
  namaNakshatra(name: string): Promise<NamaResult | null>;
  /** Tarabalam and chandrabalam for a person on a panchangam day, split where the Moon changes nakshatra / rasi. */
  dayStrength(person: { nakshatra: number; rasi: number }, date: string, place: GeoPlace): Promise<DayStrength>;
  /** Marriage matching (Ashtakoota, Rajju, Vedha, Kuja). basis 'names' = peru balam from names only, approximate. */
  match(input: { bride: MatchPersonInput; groom: MatchPersonInput; basis: 'chart' | 'names' }): Promise<MatchReading>;
  /** Rasi and nakshatra names (index 0 = number 1), for showing stored profile numbers. */
  /** Dasha now, Guru/Shani/Rahu transits from janma rasi, best windows and joining days over a range. */
  jobOutlook(q: JobOutlookInput): Promise<JobOutlook>;
  /** The Ugadi year containing `date`: aadayam-vyayam (tables/yearly), month-by-month transit strip. */
  yearOutlook(q: YearOutlookInput): Promise<YearOutlook>;
  /** Dasha timeline, transit milestones and a period strip from `from` for `years` (0 = whole life). */
  futureOutlook(q: FutureInput): Promise<FutureOutlook>;
  /** Ranked muhurtham windows for an event over a date range (rules: tables/muhurtham.json). */
  findMuhurtham(q: MuhurthamQuery): Promise<MuhurthamResult>;
  names(): Promise<{ rasis: Name[]; rasisCompound: Name[]; nakshatras: Name[]; tithis: Name[]; futureHorizons: { options: number[]; default: number }; kootas: Record<string, Name>; classes: Record<string, Name> }>;
}
