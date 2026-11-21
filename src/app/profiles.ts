// People saved on this phone. IndexedDB only (CLAUDE.md "Data and privacy"); never in URLs, logs or share cards.
import { create } from 'zustand';
import { del, get, set } from 'idb-keyval';

/** Stored relation (SPEC §5). The form's finer labels (son, mother…) come from relation + gender. */
export type Relation = 'self' | 'spouse' | 'child' | 'parent' | 'other';
export type Gender = 'f' | 'm' | 'x';

export type Profile = {
  id: string;
  name: string;
  relation: Relation;
  gender: Gender;
  /** Optional: "a name is enough to start" (design). Without it only the nama nakshatra is known. */
  birth?: { date: string; time?: string; timeKnown: boolean; placeId: string };
  derived?: { rasi?: number; nakshatra?: number; pada?: number; lagna?: number; namaNakshatra?: number[] };
  createdAt: number;
};

const KEY = 'profiles';
const ACTIVE = 'activeProfileId';

type State = {
  loaded: boolean;
  profiles: Profile[];
  activeId: string | null;
  load: () => Promise<void>;
  save: (p: Profile) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
};

const persist = async (profiles: Profile[], activeId: string | null) => {
  try {
    await set(KEY, profiles);
    if (activeId) await set(ACTIVE, activeId);
    else await del(ACTIVE);
  } catch {
    /* storage blocked (private mode): the app keeps working for this session */
  }
};

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2)}`);

export const useProfiles = create<State>()((setState, getState) => ({
  loaded: false,
  profiles: [],
  activeId: null,
  load: async () => {
    try {
      const [profiles, activeId] = await Promise.all([get<Profile[]>(KEY), get<string>(ACTIVE)]);
      setState({ profiles: profiles ?? [], activeId: activeId ?? null, loaded: true });
    } catch {
      setState({ loaded: true });
    }
  },
  save: async (p) => {
    const list = getState().profiles;
    const profiles = list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
    const activeId = getState().activeId ?? p.id;
    setState({ profiles, activeId });
    await persist(profiles, activeId);
  },
  remove: async (id) => {
    const profiles = getState().profiles.filter((x) => x.id !== id);
    const activeId = getState().activeId === id ? (profiles[0]?.id ?? null) : getState().activeId;
    setState({ profiles, activeId });
    await persist(profiles, activeId);
  },
  setActive: async (id) => {
    setState({ activeId: id });
    await persist(getState().profiles, id);
  },
  deleteAll: async () => {
    setState({ profiles: [], activeId: null });
    try {
      await Promise.all([del(KEY), del(ACTIVE)]);
    } catch {
      /* nothing stored */
    }
  },
}));

export function activeProfile(s: Pick<State, 'profiles' | 'activeId'>): Profile | undefined {
  return s.profiles.find((p) => p.id === s.activeId) ?? s.profiles.find((p) => p.relation === 'self') ?? s.profiles[0];
}

/** The design's relation chips, mapped onto stored relation + gender. */
export const RELATION_CHOICES = [
  { id: 'self', relation: 'self', gender: undefined },
  { id: 'spouse', relation: 'spouse', gender: undefined },
  { id: 'son', relation: 'child', gender: 'm' },
  { id: 'daughter', relation: 'child', gender: 'f' },
  { id: 'mother', relation: 'parent', gender: 'f' },
  { id: 'father', relation: 'parent', gender: 'm' },
  { id: 'other', relation: 'other', gender: undefined },
] as const satisfies readonly { id: string; relation: Relation; gender: Gender | undefined }[];

export type RelationChoice = (typeof RELATION_CHOICES)[number]['id'];

export function relationChoice(p: Pick<Profile, 'relation' | 'gender'>): RelationChoice {
  if (p.relation === 'child') return p.gender === 'f' ? 'daughter' : 'son';
  if (p.relation === 'parent') return p.gender === 'm' ? 'father' : 'mother';
  return p.relation;
}

/** Export file: everything saved on this phone, for the person to keep. */
export function exportJson(profiles: Profile[]): string {
  return JSON.stringify({ app: 'AstroZ', version: 1, exportedAt: new Date().toISOString(), profiles }, null, 2);
}
