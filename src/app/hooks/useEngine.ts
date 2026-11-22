import { useEffect, useState } from 'react';
import type { BirthChart, JobOutlook, MuhurthamQuery, MuhurthamResult, Name, NamaResult, YearOutlook } from '../../engine/api';
import { getEngine, initEngine } from '../../engine/client';
import { placeById } from '../places';
import type { Profile } from '../profiles';

type Names = { rasis: Name[]; rasisCompound: Name[]; nakshatras: Name[]; tithis: Name[]; kootas: Record<string, Name>; classes: Record<string, Name> };
let namesCache: Promise<Names> | null = null;

/** Rasi / nakshatra names from the engine tables (loaded once). */
export function useNames(): Names | null {
  const [names, setNames] = useState<Names | null>(null);
  useEffect(() => {
    let live = true;
    namesCache ??= initEngine().then(() => getEngine().names());
    namesCache.then((n) => { if (live) setNames(n); }).catch(() => { namesCache = null; });
    return () => { live = false; };
  }, []);
  return names;
}

export type ChartState =
  | { status: 'loading' }
  | { status: 'ready'; chart: BirthChart | null; nama: NamaResult | null; placeName?: { en: string; te?: string } }
  | { status: 'error' };

/** Birth chart (when birth details exist) and nama nakshatra for a profile, computed in the worker. */
export function useChart(profile: Profile | undefined): ChartState {
  const [state, setState] = useState<ChartState>({ status: 'loading' });
  const key = profile ? JSON.stringify([profile.name, profile.birth]) : '';
  useEffect(() => {
    if (!profile) return;
    let live = true;
    setState({ status: 'loading' });
    (async () => {
      await initEngine();
      const engine = getEngine();
      const nama = await engine.namaNakshatra(profile.name);
      let chart: BirthChart | null = null;
      let placeName: { en: string; te?: string } | undefined;
      if (profile.birth) {
        const place = await placeById(profile.birth.placeId);
        if (!place) throw new Error('unknown place');
        placeName = { en: place.nameEn, ...(place.nameTe && { te: place.nameTe }) };
        chart = await engine.birthChart({
          date: profile.birth.date,
          ...(profile.birth.time && { time: profile.birth.time }),
          timeKnown: profile.birth.timeKnown,
          place: { lat: place.lat, lon: place.lon, tz: place.tz },
        });
      }
      if (live) setState({ status: 'ready', chart, nama, ...(placeName && { placeName }) });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** The numbers stored on a profile (SPEC §5 `derived`), from a computed chart. Lagna only when the time is known. */
export function derivedFrom(chart: BirthChart | null, nama: NamaResult | null): NonNullable<Profile['derived']> {
  const namaNakshatra = nama ? [...new Set(nama.candidates.map((c) => c.nakshatra))] : undefined;
  return {
    ...(chart && { rasi: chart.moon.rasi, nakshatra: chart.moon.nakshatra, pada: chart.moon.pada }),
    ...(chart?.lagna && { lagna: chart.lagna.rasi }),
    ...(namaNakshatra?.length && { namaNakshatra }),
  };
}

export type MatchState = { status: 'loading' } | { status: 'ready'; reading: import('../../engine/api').MatchReading } | { status: 'error' } | { status: 'incomplete' };

/** Runs the match for the pair in the match store (chart basis: saved people; names basis: typed names). */
export function useMatchReading(sel: {
  basis: 'chart' | 'names';
  bride?: Profile | undefined; groom?: Profile | undefined;
  brideName: string; groomName: string; brideChoice: number; groomChoice: number;
}): MatchState {
  const [state, setState] = useState<MatchState>({ status: 'loading' });
  const key = JSON.stringify([sel.basis, sel.bride?.id, sel.bride?.birth, sel.groom?.id, sel.groom?.birth, sel.brideName, sel.groomName, sel.brideChoice, sel.groomChoice]);
  useEffect(() => {
    let live = true;
    (async () => {
      await initEngine();
      const engine = getEngine();
      const person = async (p: Profile) => {
        const place = p.birth ? await placeById(p.birth.placeId) : undefined;
        if (!p.birth || !place) throw new Error('no birth details');
        return {
          name: p.name,
          birth: { date: p.birth.date, ...(p.birth.time && { time: p.birth.time }), timeKnown: p.birth.timeKnown, place: { lat: place.lat, lon: place.lon, tz: place.tz } },
        };
      };
      let reading;
      if (sel.basis === 'chart') {
        if (!sel.bride || !sel.groom) { if (live) setState({ status: 'incomplete' }); return; }
        reading = await engine.match({ basis: 'chart', bride: await person(sel.bride), groom: await person(sel.groom) });
      } else {
        if (!sel.brideName.trim() || !sel.groomName.trim()) { if (live) setState({ status: 'incomplete' }); return; }
        reading = await engine.match({ basis: 'names', bride: { name: sel.brideName, namaChoice: sel.brideChoice }, groom: { name: sel.groomName, namaChoice: sel.groomChoice } });
      }
      if (live) setState({ status: 'ready', reading });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export type MuhurthamState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; result: MuhurthamResult } | { status: 'error' };

/** Runs findMuhurtham in the worker on demand (not on every render): call `run(query)`. */
export function useMuhurthamSearch(): [MuhurthamState, (q: MuhurthamQuery) => Promise<MuhurthamResult | null>] {
  const [state, setState] = useState<MuhurthamState>({ status: 'idle' });
  const run = async (q: MuhurthamQuery) => {
    setState({ status: 'loading' });
    try {
      await initEngine();
      const result = await getEngine().findMuhurtham(q);
      setState({ status: 'ready', result });
      return result;
    } catch {
      setState({ status: 'error' });
      return null;
    }
  };
  return [state, run];
}

export type Load<T> = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

/** Job outlook for a saved person (needs birth details) over `days` from `from`, in the worker. */
export function useJobOutlook(profile: Profile | undefined, from: string, days: number, place: { lat: number; lon: number; tz: string }): Load<JobOutlook> {
  const [state, setState] = useState<Load<JobOutlook>>({ status: 'idle' });
  const key = JSON.stringify([profile?.id, profile?.birth, from, days, place.lat, place.lon, place.tz]);
  useEffect(() => {
    if (!profile?.birth) { setState({ status: 'idle' }); return; }
    let live = true;
    setState({ status: 'loading' });
    (async () => {
      const bp = await placeById(profile.birth!.placeId);
      if (!bp) throw new Error('no birthplace');
      await initEngine();
      const data = await getEngine().jobOutlook({
        person: { id: profile.id, birth: { date: profile.birth!.date, ...(profile.birth!.time && { time: profile.birth!.time }), timeKnown: profile.birth!.timeKnown, place: { lat: bp.lat, lon: bp.lon, tz: bp.tz } } },
        from, days, place: { lat: place.lat, lon: place.lon, tz: place.tz },
      });
      if (live) setState({ status: 'ready', data });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** The Ugadi year containing `date` for a janma rasi, in the worker. */
export function useYearOutlook(rasi: number | undefined, date: string, place: { lat: number; lon: number; tz: string }): Load<YearOutlook> {
  const [state, setState] = useState<Load<YearOutlook>>({ status: 'idle' });
  useEffect(() => {
    if (!rasi) { setState({ status: 'idle' }); return; }
    let live = true;
    setState({ status: 'loading' });
    (async () => {
      await initEngine();
      const data = await getEngine().yearOutlook({ rasi, date, place: { lat: place.lat, lon: place.lon, tz: place.tz } });
      if (live) setState({ status: 'ready', data });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [rasi, date, place.lat, place.lon, place.tz]);
  return state;
}
