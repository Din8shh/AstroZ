// Contract between the UI and the engine worker (docs/SPEC.md §6).
// Phase 2 exposes the ephemeris layer; panchangam, matching, muhurtham etc. join in later phases.
import type { Body, BodyPosition } from './ephemeris/types';
import type { LocalMoment, LocalTime, TimeNote } from './core/time';
import type { Name } from './core/panchangam';
import type { PeriodKind, PeriodStatus } from './core/dayPeriods';

export type { LocalMoment, LocalTime, TimeNote, Name, PeriodKind, PeriodStatus };

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
}
