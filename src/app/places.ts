// Offline places: public/data/cities.json (GeoNames, CC BY 4.0), precached by the service worker.
// Search runs on the main thread; it is string matching, not astrology.
import type { Lang } from './types';

export type Place = { id: string; nameEn: string; nameTe?: string; admin: string; cc: string; lat: number; lon: number; tz: string };

type Raw = { fields: string[]; tz: string[]; rows: [string, string, string, string, number, number, number, string, string][] };

/** Hyderabad: the default home city until the user picks one. */
export const DEFAULT_PLACE: Place = { id: '1269843', nameEn: 'Hyderabad', nameTe: 'హైదరాబాద్', admin: 'Telangana', cc: 'IN', lat: 17.384, lon: 78.4564, tz: 'Asia/Kolkata' };

type Indexed = Place & { keys: string[] };
let loading: Promise<Indexed[]> | null = null;

/** Lower-case, strip accents and punctuation, so "Viśākhapaṭnam" ~ "visakhapatnam". */
export const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();

export function loadPlaces(): Promise<Indexed[]> {
  loading ??= fetch(`${import.meta.env.BASE_URL}data/cities.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`cities.json ${r.status}`);
      return r.json() as Promise<Raw>;
    })
    .then((d) => d.rows.map(([id, en, ascii, te, lat, lon, tz, admin, cc]) => ({
      id, nameEn: en, ...(te && { nameTe: te }), admin, cc, lat, lon, tz: d.tz[tz] ?? 'UTC',
      keys: [fold(en), fold(ascii), te].filter(Boolean),
    })));
  loading.catch(() => { loading = null; });
  return loading;
}

/** Places whose name starts with (best) or contains the query, largest first. */
export async function searchPlaces(query: string, limit = 8): Promise<Place[]> {
  const q = fold(query);
  if (q.length < 2 && !/[ఀ-౿]/.test(query)) return [];
  const all = await loadPlaces();
  const starts: Indexed[] = [], contains: Indexed[] = [];
  for (const p of all) {
    if (p.keys.some((k) => k.startsWith(q) || k.startsWith(query.trim()))) starts.push(p);
    else if (p.keys.some((k) => k.includes(q) || k.includes(query.trim()))) contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit).map(({ keys: _keys, ...p }) => p);
}

export async function placeById(id: string): Promise<Place | undefined> {
  if (id === DEFAULT_PLACE.id) return DEFAULT_PLACE;
  return (await loadPlaces()).find((p) => p.id === id);
}

export const placeName = (p: Place, lang: Lang) => (lang === 'te' && p.nameTe ? p.nameTe : p.nameEn);
export const placeLabel = (p: Place, lang: Lang) => `${placeName(p, lang)}${p.admin ? `, ${p.admin}` : ''}`;
