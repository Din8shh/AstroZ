// Engine logic over the Ephemeris interface. Runs in the worker, and directly in Vitest.
import { DateTime } from 'luxon';
import { NoSunriseError, type AstroEngine, type BirthChart, type BirthInput, type DayPanchangam, type DayPeriodView, type DayStrength, type EngineInfo, type GeoPlace, type PlacementView, type PositionsResult, type SunTimes } from '../api';
import type { Ephemeris } from '../ephemeris/types';
import { addDays, resolveLocal, startOfLocalDay, toLocal, type LocalMoment } from './time';
import { amantaMasa, ayana, fiveAngas, paksha, ruthu, samvatsara, vara, type AngaSpan } from './panchangam';
import { dayPeriods, type DayFrame } from './dayPeriods';
import { chartAt, nakshatraName, nakshatraOf, rasiName, rasiOf, vimshottariDashas, type Placement } from './chart';
import { namaNakshatra } from './nama';
import { chandrabalam, tarabalam } from '../rules/strength';
import { angles, findCrossing } from './panchangam';
import nakshatraTable from '../tables/nakshatras.json';
import rasiTable from '../tables/rasis.json';

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

    async birthChart(input: BirthInput): Promise<BirthChart> {
      const e = await ready();
      const tz = input.place.tz;
      // Time unknown: Moon at local noon (SPEC §6); lagna is never computed.
      const known = input.timeKnown && !!input.time;
      const moment = resolveLocal({ date: input.date, time: known ? input.time! : '12:00', tz });
      const core = chartAt(e, moment.jdUt, { lat: input.place.lat, lon: input.place.lon }, known);
      const view = (p: Placement): PlacementView => ({
        longitude: p.longitude, rasi: p.rasi, rasiName: rasiName(p.rasi), degree: p.degree,
        nakshatra: p.nakshatra, nakshatraName: nakshatraName(p.nakshatra), pada: p.pada, retrograde: p.retrograde,
      });
      const planets = Object.fromEntries(Object.entries(core.planets).map(([b, p]) => [b, view(p)])) as BirthChart['planets'];
      const { dashas, balanceYears } = vimshottariDashas(core.moon.longitude, moment.jdUt);
      const L = (jd: number) => toLocal(jd, tz);
      const chart: BirthChart = {
        approximate: !known,
        timeNote: known ? moment.note : 'noon',
        moon: view(core.moon),
        planets,
        dasha: {
          balanceYears,
          mahadashas: dashas.map((m) => ({ lord: m.lord, start: L(m.start), end: L(m.end), antardashas: m.antardashas.map((a) => ({ lord: a.lord, start: L(a.start), end: L(a.end) })) })),
        },
      };
      if (core.lagna) chart.lagna = view(core.lagna);
      if (!known) {
        const a = angles(e);
        const t0 = startOfLocalDay(input.date, tz);
        const t1 = startOfLocalDay(addDays(input.date, 1), tz) - 1 / 86_400;
        const span = (x: number, y: number) => (x <= y ? Array.from({ length: y - x + 1 }, (_, i) => x + i) : [x, y]);
        chart.dayRange = {
          nakshatras: span(nakshatraOf(a.moon(t0)), nakshatraOf(a.moon(t1))),
          rasis: span(rasiOf(a.moon(t0)), rasiOf(a.moon(t1))),
        };
      }
      return chart;
    },

    async namaNakshatra(name: string) {
      return namaNakshatra(name);
    },

    async names() {
      return {
        rasis: rasiTable.items.map((r) => ({ en: r.en, te: r.te ?? null })),
        /** Telugu form used before రాశి / లగ్నం (e.g. వృషభ రాశి). */
        rasisCompound: rasiTable.items.map((r) => ({ en: r.en, te: r.teCompound ?? null })),
        nakshatras: nakshatraTable.items.map((r) => ({ en: r.en, te: r.te ?? null })),
      };
    },

    async dayStrength(person: { nakshatra: number; rasi: number }, date: string, place: GeoPlace): Promise<DayStrength> {
      const e = await ready();
      const { f } = day(e, date, place);
      const a = angles(e);
      const L = (jd: number) => toLocal(jd, place.tz);
      // Split the day where the Moon enters a new nakshatra (tarabalam) or rasi (chandrabalam).
      const segments = (span: number, count: number) => {
        const out: { start: number; end: number; index: number }[] = [];
        let start = f.sunrise;
        let index = Math.floor(a.moon(start + 1 / 86_400) / span) + 1;
        while (start < f.nextSunrise) {
          const end = Math.min(f.nextSunrise, findCrossing(a.moon, (index % count) * span, start + 1 / 86_400, 1));
          out.push({ start, end, index });
          start = end;
          index = (index % count) + 1;
        }
        return out;
      };
      return {
        tarabalam: segments(nakshatraTable.spanDegrees, 27).map((s) => ({ start: L(s.start), end: L(s.end), reading: tarabalam(person.nakshatra, s.index) })),
        chandrabalam: segments(rasiTable.spanDegrees, 12).map((s) => ({ start: L(s.start), end: L(s.end), reading: chandrabalam(person.rasi, s.index) })),
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
