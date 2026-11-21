// Engine logic over the Ephemeris interface. Runs in the worker, and directly in Vitest.
import { DateTime } from 'luxon';
import { NoSunriseError, type AstroEngine, type DayPanchangam, type DayPeriodView, type EngineInfo, type GeoPlace, type PositionsResult, type SunTimes } from '../api';
import type { Ephemeris } from '../ephemeris/types';
import { addDays, resolveLocal, startOfLocalDay, toLocal, type LocalMoment } from './time';
import { amantaMasa, ayana, fiveAngas, paksha, ruthu, samvatsara, vara, type AngaSpan } from './panchangam';
import { dayPeriods, type DayFrame } from './dayPeriods';

export function createEngine(load: () => Promise<Ephemeris>): AstroEngine {
  let eph: Ephemeris | null = null;
  let info: EngineInfo | null = null;
  let loading: Promise<EngineInfo> | null = null;

  const init = (): Promise<EngineInfo> => {
    if (info) return Promise.resolve(info);
    loading ??= (async () => {
      const t0 = performance.now();
      eph = await load();
      // A broken wasm or data file shows up here rather than as wrong readings later.
      const ayanamsaJ2000 = eph.ayanamsa(2451545.0);
      if (!(Math.abs(ayanamsaJ2000 - 23.853) < 0.01)) throw new Error(`ephemeris self-check failed: ${ayanamsaJ2000}`);
      info = {
        ephemeris: eph.name,
        ayanamsa: 'lahiri',
        node: eph.options.node,
        sunrise: eph.options.sunrise,
        initMs: Math.round(performance.now() - t0),
        ayanamsaJ2000,
      };
      return info;
    })();
    return loading;
  };

  const ready = async (): Promise<Ephemeris> => {
    await init();
    if (!eph) throw new Error('ephemeris failed to load');
    return eph;
  };

  const geo = (place: GeoPlace) => ({ lat: place.lat, lon: place.lon, ...(place.altitude !== undefined && { altitude: place.altitude }) });

  /** Sunrise on `date`, sunset after it, and the next sunrise, as JD UT. */
  const dayFrame = (e: Ephemeris, date: string, place: GeoPlace) => {
    const loc = geo(place);
    const dayStart = startOfLocalDay(date, place.tz);
    const dayEnd = startOfLocalDay(addDays(date, 1), place.tz);
    const sunrise = e.sunrise(dayStart, loc);
    if (sunrise === null || sunrise >= dayEnd) throw new NoSunriseError('no sunrise on this date at this place');
    const sunset = e.sunset(sunrise, loc);
    const nextSunrise = e.sunrise(sunrise + 1 / 1440, loc);
    if (sunset === null || nextSunrise === null) throw new NoSunriseError('no sunset or next sunrise at this place');
    const isoWeekday = DateTime.fromISO(date, { zone: place.tz }).weekday;
    return { sunrise, sunset, nextSunrise, isoWeekday };
  };

  // One day's computation serves both panchangam() and dayPeriods().
  const cache = new Map<string, ReturnType<typeof computeDay>>();
  const computeDay = (e: Ephemeris, date: string, place: GeoPlace) => {
    const f = dayFrame(e, date, place);
    const angas = fiveAngas(e, f.sunrise, f.nextSunrise);
    const v = vara(f.isoWeekday);
    const masa = amantaMasa(e, f.sunrise);
    return { f, angas, v, masa };
  };
  const day = (e: Ephemeris, date: string, place: GeoPlace) => {
    const key = `${date}|${place.lat}|${place.lon}|${place.tz}`;
    let d = cache.get(key);
    if (!d) {
      d = computeDay(e, date, place);
      cache.set(key, d);
      if (cache.size > 16) cache.delete(cache.keys().next().value as string);
    }
    return d;
  };

  return {
    init,

    async positions(at: LocalMoment): Promise<PositionsResult> {
      const e = await ready();
      const r = resolveLocal(at);
      return { jdUt: r.jdUt, utc: r.utc, note: r.note, ayanamsa: e.ayanamsa(r.jdUt), bodies: e.positions(r.jdUt) };
    },

    async sunTimes(date: string, place: GeoPlace): Promise<SunTimes> {
      const e = await ready();
      const loc = { lat: place.lat, lon: place.lon, ...(place.altitude !== undefined && { altitude: place.altitude }) };
      const dayStart = startOfLocalDay(date, place.tz);
      const dayEnd = startOfLocalDay(addDays(date, 1), place.tz);
      // Polar night: the library returns null. A sunrise on a later civil date is not this date's.
      const found = e.sunrise(dayStart, loc);
      const sunrise = found !== null && found < dayEnd ? found : null;
      const sunset = e.sunset(sunrise ?? dayStart, loc);
      const nextSunrise = sunrise === null ? null : e.sunrise(sunrise + 1 / 1440, loc);
      const local = (jd: number | null) => (jd === null ? null : toLocal(jd, place.tz));
      return { sunrise: local(sunrise), sunset: local(sunset), nextSunrise: local(nextSunrise) };
    },

    async ascendant(at: LocalMoment, place: GeoPlace): Promise<number> {
      const e = await ready();
      return e.ascendant(resolveLocal(at).jdUt, { lat: place.lat, lon: place.lon });
    },

    async panchangam(date: string, place: GeoPlace): Promise<DayPanchangam> {
      const e = await ready();
      const { f, angas, v, masa } = day(e, date, place);
      const L = (jd: number) => toLocal(jd, place.tz);
      const anga = (s: AngaSpan) => ({ number: s.number, name: s.name, start: L(s.start), end: L(s.end) });
      const firstTithi = angas.tithi[0];
      if (!firstTithi) throw new Error('no tithi at sunrise');
      return {
        date,
        tz: place.tz,
        sunrise: L(f.sunrise),
        sunset: L(f.sunset),
        nextSunrise: L(f.nextSunrise),
        vara: v,
        tithi: angas.tithi.map(anga),
        nakshatra: angas.nakshatra.map((s) => ({ ...anga(s), padas: s.padas.map((p) => ({ pada: p.pada, end: L(p.end) })) })),
        yoga: angas.yoga.map(anga),
        karana: angas.karana.map(anga),
        paksha: paksha(firstTithi.number),
        masa: { number: masa.number, name: masa.name, adhika: masa.adhika, kshaya: masa.kshaya },
        ruthu: ruthu(masa.ruthu),
        ayana: ayana(e.position('sun', f.sunrise).longitude),
        samvatsara: samvatsara(masa),
      };
    },

    async dayPeriods(date: string, place: GeoPlace): Promise<DayPeriodView[]> {
      const e = await ready();
      const { f, angas, v } = day(e, date, place);
      const frame: DayFrame = { sunrise: f.sunrise, sunset: f.sunset, nextSunrise: f.nextSunrise, vara: v.id as DayFrame['vara'] };
      return dayPeriods(frame, angas.nakshatra).map((p) => ({
        kind: p.kind, name: p.name, status: p.status, verified: p.verified,
        start: toLocal(p.start, place.tz), end: toLocal(p.end, place.tz),
      }));
    },
  };
}
