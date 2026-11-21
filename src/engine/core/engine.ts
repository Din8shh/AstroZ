// Engine logic over the Ephemeris interface. Runs in the worker, and directly in Vitest.
import { DateTime } from 'luxon';
import { NoSunriseError, type AstroEngine, type BirthChart, type BirthInput, type DayPanchangam, type DayPeriodView, type DayStrength, type EngineInfo, type GeoPlace, type PlacementView, type PositionsResult, type SunTimes } from '../api';
import type { Ephemeris } from '../ephemeris/types';
import { addDays, resolveLocal, startOfLocalDay, toLocal, type LocalMoment } from './time';
import { amantaMasa, ayana, fiveAngas, names as angaNames, paksha, ruthu, samvatsara, vara, type AngaSpan, type Masa } from './panchangam';
import { dayPeriods, type DayFrame } from './dayPeriods';
import { chartAt, nakshatraName, nakshatraOf, rasiName, rasiOf, vimshottariDashas, type Placement } from './chart';
import { namaNakshatra } from './nama';
import { chandrabalam, tarabalam } from '../rules/strength';
import { guidanceFor, matchCore, type MatchSide } from '../rules/matching';
import type { MatchPersonInput, MatchReading, MatchSideView } from '../api';
import { angles, findCrossing } from './panchangam';
import { dayExclusions, scoreDay, type DayContext, type DayHead, type VaraId, type Window } from '../rules/muhurtham';
import muhurthamTable from '../tables/muhurtham.json';
import tarabalamTable from '../tables/tarabalam.json';
import type { Door, MuhurthamQuery, MuhurthamResult, MuhurthamWindowView } from '../api';
import nakshatraTable from '../tables/nakshatras.json';
import rasiTable from '../tables/rasis.json';
import kootaTable from '../tables/kootas.json';

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
  // A lunar month spans ~30 days: reuse it for every sunrise inside it (two new-moon searches per month, not per day).
  const masas: Masa[] = [];
  const masaAt = (e: Ephemeris, jd: number) => {
    let m = masas.find((x) => jd >= x.startNewMoon && jd < x.endNewMoon);
    if (!m) {
      m = amantaMasa(e, jd);
      masas.push(m);
      if (masas.length > 8) masas.shift();
    }
    return m;
  };
  const computeDay = (e: Ephemeris, date: string, place: GeoPlace) => {
    const f = dayFrame(e, date, place);
    const angas = fiveAngas(e, f.sunrise, f.nextSunrise);
    const v = vara(f.isoWeekday);
    const masa = masaAt(e, f.sunrise);
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

  /** Spans of the day where the Moon stays in one nakshatra (span 13°20′) or rasi (30°). */
  const moonSpans = (e: Ephemeris, from: number, to: number, span: number, count: number) => {
    const a = angles(e);
    const out: { start: number; end: number; index: number }[] = [];
    let start = from;
    let index = Math.floor(a.moon(start + 1 / 86_400) / span) + 1;
    while (start < to) {
      const end = Math.min(to, findCrossing(a.moon, (index % count) * span, start + 1 / 86_400, 1));
      out.push({ start, end, index });
      start = end;
      index = (index % count) + 1;
    }
    return out;
  };

  const periodsOf = (d: ReturnType<typeof computeDay>) =>
    dayPeriods({ sunrise: d.f.sunrise, sunset: d.f.sunset, nextSunrise: d.f.nextSunrise, vara: d.v.id as DayFrame['vara'] }, d.angas.nakshatra);

  /** The month, sunrise tithi, Sun and combust facts of a day: enough for day-level exclusions, without the angas. */
  const dayHead = (e: Ephemeris, sunrise: number): DayHead => {
    const pos = e.positions(sunrise);
    const sep = (x: number) => Math.abs((((x - pos.sun.longitude) % 360) + 540) % 360 - 180);
    const masa = masaAt(e, sunrise);
    const elongation = (((pos.moon.longitude - pos.sun.longitude) % 360) + 360) % 360;
    return {
      masa: { number: masa.number, adhika: masa.adhika, kshaya: masa.kshaya },
      sunriseTithi: Math.floor(elongation / 12) + 1,
      sunRasi: rasiOf(pos.sun.longitude),
      planets: {
        venus: { separation: sep(pos.venus.longitude), retrograde: pos.venus.speed < 0 },
        jupiter: { separation: sep(pos.jupiter.longitude), retrograde: pos.jupiter.speed < 0 },
      },
    };
  };

  const dayContext = (e: Ephemeris, date: string, place: GeoPlace): { ctx: DayContext; d: ReturnType<typeof computeDay> } => {
    const d = day(e, date, place);
    const prev = day(e, addDays(date, -1), place);
    const { f, angas, v } = d;
    const periods = [...periodsOf(prev).filter((p) => p.end > f.sunrise), ...periodsOf(d)];
    const ctx: DayContext = {
      date, sunrise: f.sunrise, sunset: f.sunset, nextSunrise: f.nextSunrise,
      vara: v.id as VaraId,
      ...dayHead(e, f.sunrise),
      tithi: angas.tithi, nakshatra: angas.nakshatra, yoga: angas.yoga, karana: angas.karana,
      moonRasi: moonSpans(e, f.sunrise, f.nextSunrise, rasiTable.spanDegrees, 12),
      periods,
    };
    return { ctx, d };
  };

  const windowView = (e: Ephemeris, raw: Window, ctx: DayContext, d: ReturnType<typeof computeDay>, place: GeoPlace): MuhurthamWindowView => {
    const L = (jd: number) => toLocal(jd, place.tz);
    // Shown to the minute: round inward so the displayed window never touches a neighbouring avoid period.
    const w = { ...raw, start: Math.ceil(raw.start * 1440 - 1e-6) / 1440, end: Math.floor(raw.end * 1440 + 1e-6) / 1440 };
    const span = (spans: AngaSpan[], n: number, name: (k: number) => { en: string; te: string | null }) => {
      const s = spans.find((x) => x.number === n && x.start < w.end && x.end > w.start) ?? spans[0]!;
      return { number: n, name: name(n), start: L(s.start), end: L(s.end) };
    };
    const before = ctx.karana.filter((k) => k.end <= w.start && k.end > ctx.sunrise).pop();
    const lagnaRasi = rasiOf(e.ascendant(w.start, { lat: place.lat, lon: place.lon }));
    const taraName = (n: number) => { const t = tarabalamTable.taras.find((x) => x.tara === n)!; return { en: t.en, te: t.te ?? null }; };
    return {
      date: ctx.date, start: L(w.start), end: L(w.end), score: w.score, status: w.status,
      reasons: w.reasons, top: w.reasons.slice(0, 3),
      panchanga: {
        vara: d.v, paksha: paksha(w.panchanga.tithi), masa: { number: d.masa.number, name: d.masa.name },
        tithi: span(ctx.tithi, w.panchanga.tithi, angaNames.tithi),
        nakshatra: span(ctx.nakshatra, w.panchanga.nakshatra, angaNames.nakshatra),
        yoga: span(ctx.yoga, w.panchanga.yoga, angaNames.yoga),
        karana: span(ctx.karana, w.panchanga.karana, angaNames.karana),
        ...(before && before.number !== w.panchanga.karana && { karanaBefore: { number: before.number, name: angaNames.karana(before.number), end: L(before.end) } }),
        moonRasi: { number: w.panchanga.moonRasi, name: rasiName(w.panchanga.moonRasi) },
      },
      people: w.people.map((p) => ({ id: p.id, tara: { number: p.tara, name: taraName(p.tara) }, taraStatus: p.taraStatus, house: p.house, chandraStatus: p.chandraStatus })),
      lagna: { rasi: lagnaRasi, name: rasiName(lagnaRasi) },
      ...(w.door && { door: w.door }),
    };
  };

  const api: AstroEngine = {
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
        // Step forward around the circle (the Moon only moves forward): 26 → 1 is [26, 27, 1].
        const around = (x: number, y: number, count: number) => {
          const out = [x];
          for (let n = x; n !== y; ) out.push((n = (n % count) + 1));
          return out;
        };
        chart.dayRange = {
          nakshatras: around(nakshatraOf(a.moon(t0)), nakshatraOf(a.moon(t1)), 27),
          rasis: around(rasiOf(a.moon(t0)), rasiOf(a.moon(t1)), 12),
        };
      }
      return chart;
    },

    async namaNakshatra(name: string) {
      return namaNakshatra(name);
    },

    async match(input: { bride: MatchPersonInput; groom: MatchPersonInput; basis: 'chart' | 'names' }): Promise<MatchReading> {
      await ready();
      const NAK = nakshatraTable.spanDegrees;

      /** A side from a nama-nakshatra pada (names basis): Moon taken at the middle of that pada. */
      const fromName = (p: MatchPersonInput): { side: MatchSide; view: MatchSideView } | null => {
        const nama = namaNakshatra(p.name);
        const c = nama?.candidates[p.namaChoice ?? 0] ?? nama?.candidates[0];
        if (!nama || !c) return null;
        const lon = (c.nakshatra - 1) * NAK + (c.pada - 0.5) * (NAK / 4);
        const lo = (c.nakshatra - 1) * NAK + (c.pada - 1) * (NAK / 4), hi = lo + NAK / 4;
        const base = (rasiOf(lon) - 1) * 30;
        return {
          side: { nakshatra: c.nakshatra, rasi: rasiOf(lon), moonDegree: lon % 30, moonDegreeRange: [lo - base, hi - base] },
          view: { name: p.name, nakshatra: c.nakshatra, pada: c.pada, rasi: rasiOf(lon), approximate: true, aksharam: nama.aksharam, namaAmbiguous: nama.candidates.length > 1 && p.namaChoice === undefined },
        };
      };

      /** A side from a birth chart: Moon, Mars, and the lagna only when the birth time is known. */
      const fromChart = async (p: MatchPersonInput): Promise<{ side: MatchSide; view: MatchSideView }> => {
        if (!p.birth) throw new Error('birth details needed for a chart match');
        const c = await api.birthChart(p.birth);
        const side: MatchSide = { nakshatra: c.moon.nakshatra, rasi: c.moon.rasi, moonDegree: c.moon.degree, mars: { rasi: c.planets.mars.rasi } };
        if (c.lagna) side.lagnaRasi = c.lagna.rasi;
        return { side, view: { name: p.name, nakshatra: c.moon.nakshatra, pada: c.moon.pada, rasi: c.moon.rasi, approximate: c.approximate, ...(c.dayRange && { dayRange: c.dayRange }) } };
      };

      const namesB = fromName(input.bride), namesG = fromName(input.groom);
      let b: { side: MatchSide; view: MatchSideView }, g: { side: MatchSide; view: MatchSideView };
      if (input.basis === 'chart') {
        [b, g] = await Promise.all([fromChart(input.bride), fromChart(input.groom)]);
      } else {
        if (!namesB || !namesG) throw new Error('a name gives no nama nakshatra');
        b = namesB; g = namesG;
      }
      const core = matchCore(b.side, g.side);
      const names = input.basis === 'names';
      const peru = namesB && namesG ? matchCore(namesB.side, namesG.side) : null;
      const { todos, remedies } = guidanceFor(core, names);
      return {
        basis: input.basis,
        approximate: names || b.view.approximate || g.view.approximate,
        status: core.status, score: core.score, max: core.max,
        kootas: core.kootas, rajju: core.rajju, vedha: core.vedha, kuja: core.kuja,
        bride: b.view, groom: g.view,
        ...(peru && { peruBalam: { status: peru.status, score: peru.score, max: peru.max, ambiguous: !!(namesB!.view.namaAmbiguous || namesG!.view.namaAmbiguous) } }),
        reasons: [{ ruleId: 'match.total', values: { score: core.score, max: core.max, status: core.status, basis: input.basis } }],
        todos, remedies,
      };
    },

    async findMuhurtham(q: MuhurthamQuery): Promise<MuhurthamResult> {
      const e = await ready();
      const t0 = performance.now();
      const counts = new Map<string, { days: number; values: Record<string, unknown> }>();
      const scan = (date: string) => {
        let ctx: DayContext, d: ReturnType<typeof computeDay>;
        try {
          // Day-level rules first: a month or combust exclusion needs no angas, periods or windows.
          const f = dayFrame(e, date, q.place);
          const head = dayExclusions(q.event, dayHead(e, f.sunrise));
          if (head.length) return { r: { best: null, windows: [], excluded: head.slice(0, 1) } };
          ({ ctx, d } = dayContext(e, date, q.place));
        } catch (err) { if (err instanceof NoSunriseError) return null; throw err; }
        const r = scoreDay(q.event, ctx, q.people, q.door);
        return { r, ctx, d };
      };
      const views: MuhurthamWindowView[] = [];
      const kept: { w: Window; ctx: DayContext; d: ReturnType<typeof computeDay> }[] = [];
      for (let i = 0; i < q.days; i++) {
        const date = addDays(q.from, i);
        const s = scan(date);
        if (!s) continue;
        if (s.r.best && s.ctx && s.d) kept.push({ w: s.r.best, ctx: s.ctx, d: s.d });
        else for (const x of s.r.excluded) {
          const c = counts.get(x.ruleId) ?? { days: 0, values: x.values };
          c.days++;
          counts.set(x.ruleId, c);
        }
      }
      kept.sort((a, b) => b.w.score - a.w.score || a.w.start - b.w.start);
      for (const k of kept) views.push(windowView(e, k.w, k.ctx, k.d, q.place));
      let nearest: MuhurthamWindowView | undefined;
      if (!views.length) {
        for (let i = 0; i < muhurthamTable.nearestDays && !nearest; i++) {
          const s = scan(addDays(q.from, q.days + i));
          if (s?.r.best && s.ctx && s.d) nearest = windowView(e, s.r.best, s.ctx, s.d, q.place);
        }
      }
      return {
        event: q.event, results: views, ...(nearest && { nearest }), daysSearched: q.days,
        ...(q.event === 'gruhapravesam' && { guide: {
          byDoor: muhurthamTable.events.gruhapravesam.entry.byDoor as Record<Door, string | null>,
          groups: muhurthamTable.events.gruhapravesam.entry.groups,
          checklist: muhurthamTable.events.gruhapravesam.checklist,
        } }),
        exclusions: [...counts.entries()].map(([ruleId, c]) => ({ ruleId, days: c.days, values: c.values })).sort((a, b) => b.days - a.days),
        ms: Math.round(performance.now() - t0),
      };
    },

    async names() {
      return {
        rasis: rasiTable.items.map((r) => ({ en: r.en, te: r.te ?? null })),
        /** Telugu form used before రాశి / లగ్నం (e.g. వృషభ రాశి). */
        rasisCompound: rasiTable.items.map((r) => ({ en: r.en, te: r.teCompound ?? null })),
        nakshatras: nakshatraTable.items.map((r) => ({ en: r.en, te: r.te ?? null })),
        tithis: Array.from({ length: 30 }, (_, i) => angaNames.tithi(i + 1)),
        kootas: Object.fromEntries(Object.entries(kootaTable.kootas).map(([id, k]) => [id, { en: k.name.en, te: k.name.te ?? null }])),
        classes: Object.fromEntries(Object.entries(kootaTable.classNames).map(([id, n]) => [id, { en: n.en, te: n.te ?? null }])),
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
  return api;
}
