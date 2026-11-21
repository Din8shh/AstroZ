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

export type { LocalMoment, LocalTime, TimeNote, Name, PeriodKind, PeriodStatus, Lord, NamaResult, Reading, Status, KootaResult, KujaResult };

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
  names(): Promise<{ rasis: Name[]; rasisCompound: Name[]; nakshatras: Name[]; kootas: Record<string, Name>; classes: Record<string, Name> }>;
}
