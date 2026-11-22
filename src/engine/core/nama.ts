// Nama nakshatra: the nakshatra/pada whose Avakahada syllable matches the first sound of a name.
// Telugu script is read by code point (a deterministic script mapping, not translation); Latin input
// cannot separate dental from retroflex sounds, so it returns every matching candidate.
import table from '../tables/nama-syllables.json';
import { nakshatraName } from './chart';
import type { Name } from './panchangam';

export type NamaCandidate = {
  nakshatra: number;
  pada: number;
  name: Name;
  syllable: { devanagari: string; latin: string };
  /** 'exact' = the sound is in the Avakahada; 'near' = matched through a fallback consonant (e.g. ba → va/bha). */
  match: 'exact' | 'near';
};

export type NamaResult = {
  /** The first aksharam (Telugu) or first syllable (Latin) the match is based on. */
  aksharam: string;
  script: 'telugu' | 'latin';
  candidates: NamaCandidate[];
};

type Sound = { consonants: string[]; vowels: string[] };

// --- Telugu -----------------------------------------------------------------
// Consonant letters → consonant codes is script mechanics (Brahmic letters map one-to-one);
// vowel classes come from the table.
const TE_CONSONANT: Record<string, string> = {
  క: 'k', ఖ: 'kh', గ: 'g', ఘ: 'gh', ఙ: 'ng', చ: 'c', ఛ: 'ch', జ: 'j', ఝ: 'jh', ఞ: 'ny',
  ట: 'T', ఠ: 'Th', డ: 'D', ఢ: 'Dh', ణ: 'N', త: 't', థ: 'th', ద: 'd', ధ: 'dh', న: 'n',
  ప: 'p', ఫ: 'ph', బ: 'b', భ: 'bh', మ: 'm', య: 'y', ర: 'r', ఱ: 'r', ల: 'l', ళ: 'L', వ: 'v',
  శ: 'sh', ష: 'Sh', స: 's', హ: 'h',
};
const TE_VOWEL = table.telugu.vowels as Record<string, string>;
const TE_VOCALIC = table.telugu.vocalicVowels as Record<string, string>;
const TE_SIGN = table.telugu.signs as Record<string, string>;
const VIRAMA = '\u0C4D';

function teluguFirst(word: string): { aksharam: string; sound: Sound } | null {
  const chars = [...word];
  const c0 = chars[0];
  if (!c0) return null;
  if (TE_VOCALIC[c0]) return { aksharam: c0, sound: { consonants: ['r'], vowels: [TE_VOCALIC[c0]] } };
  if (TE_VOWEL[c0]) return { aksharam: c0, sound: { consonants: [''], vowels: [TE_VOWEL[c0]] } };
  const first = TE_CONSONANT[c0];
  if (!first) return null;
  // A conjunct (క్ష, శ్ర, …) is one aksharam: consonant (virama consonant)* then an optional vowel sign.
  let i = 1;
  while (chars[i] === VIRAMA && chars[i + 1] && TE_CONSONANT[chars[i + 1]!]) i += 2;
  const sign = chars[i] ? TE_SIGN[chars[i]!] : undefined;
  const aksharam = chars.slice(0, sign ? i + 1 : i).join('');
  return { aksharam, sound: { consonants: [first], vowels: [sign ?? 'a'] } };
}

// --- Latin ------------------------------------------------------------------
const L = table.latin;
const LATIN_CONSONANT = L.consonants as [string, string[]][];
const LATIN_VOWEL = L.vowels as [string, string[]][];
const BEFORE_VOWEL = L.digraphBeforeVowel as unknown as Record<string, string[] | string>;
const isVowel = (ch: string | undefined) => !!ch && 'aeiou'.includes(ch);

function latinFirst(word: string): { aksharam: string; sound: Sound } | null {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  let consonants = [''];
  let rest = w;
  if (!isVowel(w[0])) {
    const hit = LATIN_CONSONANT.find(([sp]) => w.startsWith(sp));
    if (!hit) return null;
    consonants = hit[1];
    rest = w.slice(hit[0].length);
    // Vocalic ṛ: consonant + r + u/i (Kruthi, Krishna, Mrudula) — same reading as the Telugu sign ృ.
    const vocalic = L.vocalicR.after as Record<string, string[]>;
    const r = Object.keys(vocalic).find((sp) => rest.startsWith(sp));
    if (r && hit[0] !== 'r') {
      const used = w.length - rest.length + r.length;
      return { aksharam: w.slice(0, used), sound: { consonants, vowels: vocalic[r]! } };
    }
    rest = rest.replace(/^[^aeiouy]+/, ''); // rest of a cluster (Sravani → a…)
    // y after the first consonant: glide before a vowel (Jyothi → o), "ai" before a consonant (Vyshnavi → e).
    if (rest.startsWith('y')) {
      if (isVowel(rest[1])) rest = rest.slice(1);
      else {
        const used = w.length - rest.length + 1;
        return { aksharam: w.slice(0, used), sound: { consonants, vowels: L.yGlide.beforeConsonant } };
      }
    }
  }
  const v = LATIN_VOWEL.find(([sp]) => rest.startsWith(sp));
  let vowels = v ? v[1] : ['a'];
  // ai / ay / au followed by another vowel is a + glide (Jayanth, Gayathri → a).
  if (v && v[0].length === 2 && isVowel(rest[2]) && Array.isArray(BEFORE_VOWEL[v[0]])) vowels = BEFORE_VOWEL[v[0]] as string[];
  const aksharam = w.slice(0, w.length - rest.length + (v ? v[0].length : 0));
  return { aksharam, sound: { consonants, vowels } };
}

// --- Lookup -----------------------------------------------------------------
const fallbacks = table.fallbacks.consonants as Record<string, string[]>;

function lookup(sound: Sound): NamaCandidate[] {
  const find = (cons: string[], match: 'exact' | 'near') =>
    table.items.filter((x) => cons.includes(x.consonant) && sound.vowels.includes(x.vowel)).map((x): NamaCandidate => ({
      nakshatra: x.nakshatra, pada: x.pada, name: nakshatraName(x.nakshatra),
      syllable: { devanagari: x.devanagari, latin: x.latin }, match,
    }));
  const exact = find(sound.consonants, 'exact');
  if (exact.length) return exact;
  // Fallback tiers: the fallbacks of the sound, then their fallbacks (f → ph → p). First tier with a match wins.
  const tried = new Set(sound.consonants);
  let tier = sound.consonants;
  for (let depth = 0; depth < 3; depth++) {
    tier = [...new Set(tier.flatMap((c) => fallbacks[c] ?? []))].filter((c) => !tried.has(c));
    if (!tier.length) break;
    tier.forEach((c) => tried.add(c));
    const near = find(tier, 'near');
    if (near.length) return near;
  }
  return [];
}

const dedupe = (cs: NamaCandidate[]) => {
  const seen = new Set<string>();
  return cs.filter((c) => {
    const k = `${c.nakshatra}-${c.pada}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export function namaNakshatra(fullName: string): NamaResult | null {
  // "K.Lakshmi" → "K. Lakshmi"; then skip an honorific and any initials ("K.", "K", "కె.") before the name itself.
  const words = fullName.trim().replace(/\.(?=\S)/g, '. ').split(/\s+/).filter(Boolean);
  const honorifics = new Set(table.honorifics.map((h) => h.toLowerCase()));
  let i = 0;
  if (words.length > 1 && honorifics.has(words[0]!.toLowerCase())) i++;
  const isInitial = (w: string) => w.endsWith('.') || /^[A-Za-z]$/.test(w);
  while (i < words.length - 1 && isInitial(words[i]!)) i++;
  const word = words[i];
  if (!word) return null;
  const telugu = /[ఀ-౿]/.test(word);
  const parsed = telugu ? teluguFirst(word) : latinFirst(word);
  if (!parsed) return null;
  return { aksharam: parsed.aksharam, script: telugu ? 'telugu' : 'latin', candidates: dedupe(lookup(parsed.sound)).sort((a, b) => a.nakshatra - b.nakshatra || a.pada - b.pada) };
}
