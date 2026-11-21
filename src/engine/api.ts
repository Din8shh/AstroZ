// Contract between the UI and the engine worker (docs/SPEC.md §6).
// Phase 2 exposes the ephemeris layer; panchangam, matching, muhurtham etc. join in later phases.
import type { Body, BodyPosition } from './ephemeris/types';
import type { LocalMoment, LocalTime, TimeNote } from './core/time';

export type { LocalMoment, LocalTime, TimeNote };

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

export interface AstroEngine {
  init(): Promise<EngineInfo>;
  positions(at: LocalMoment): Promise<PositionsResult>;
  sunTimes(date: string, place: GeoPlace): Promise<SunTimes>;
  /** Sidereal ascendant (lagna) longitude. Only call when the birth time is known. */
  ascendant(at: LocalMoment, place: GeoPlace): Promise<number>;
}
