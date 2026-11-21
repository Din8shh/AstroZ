// The Ephemeris interface. Everything outside src/engine/ephemeris/ talks to this,
// never to the ephemeris library itself (CLAUDE.md "Architecture rules").

/** Grahas in vara order, then the nodes. */
export const BODIES = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'] as const;
export type Body = (typeof BODIES)[number];

export type BodyPosition = {
  /** Sidereal (Lahiri) ecliptic longitude, degrees in [0, 360). */
  longitude: number;
  /** Ecliptic latitude, degrees. */
  latitude: number;
  /** Longitude speed, degrees per day (negative = retrograde). */
  speed: number;
};

export type GeoLocation = {
  lat: number; // degrees, north positive
  lon: number; // degrees, east positive
  altitude?: number; // metres above sea level
};

/**
 * Which point of the Sun counts as rising. The tradition leaves this as a setting
 * (telugu-jyotisha skill): match the golden fixtures.
 * - 'upper-limb': upper edge of the disc on the horizon, with atmospheric refraction
 *   (civil almanacs; believed to match Drik Panchang — confirm with fixtures).
 * - 'disc-centre': centre of the disc, with refraction.
 * - 'hindu': centre of the disc, no refraction, ecliptic latitude ignored (classic Hindu rising).
 */
export type SunriseMode = 'upper-limb' | 'disc-centre' | 'hindu';

/** Rahu from the mean node (default, per the skill) or the true node. Ketu = Rahu + 180°. */
export type NodeMode = 'mean' | 'true';

export type EphemerisOptions = {
  node?: NodeMode;
  sunrise?: SunriseMode;
};

export interface Ephemeris {
  /** Library and data description, e.g. "Swiss Ephemeris 2.10.03 (swisseph-wasm 0.1.0)". */
  readonly name: string;
  readonly options: Readonly<Required<EphemerisOptions>>;

  /** Lahiri ayanamsa at jdUt (true, i.e. including nutation, as used for the positions). */
  ayanamsa(jdUt: number): number;

  /** Sidereal position of one body at jdUt (Julian Day, Universal Time). */
  position(body: Body, jdUt: number): BodyPosition;

  /** Sidereal positions of all nine grahas at jdUt. */
  positions(jdUt: number): Record<Body, BodyPosition>;

  /** First sunrise strictly after jdUt, as Julian Day UT; null if the Sun does not rise (polar). */
  sunrise(jdUtFrom: number, at: GeoLocation): number | null;

  /** First sunset strictly after jdUt; null if the Sun does not set (polar). */
  sunset(jdUtFrom: number, at: GeoLocation): number | null;

  /** Sidereal longitude of the ascendant (lagna) at jdUt for a place, degrees in [0, 360). */
  ascendant(jdUt: number, at: GeoLocation): number;
}
