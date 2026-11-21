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
const TE_CONSONANT: Record<string, string> = {
  క: 'k', ఖ: 'kh', గ: 'g', ఘ: 'gh', ఙ: 'ng', చ: 'c', ఛ: 'ch', జ: 'j', ఝ: 'jh', ఞ: 'ny',
  ట: 'T', ఠ: 'Th', డ: 'D', ఢ: 'Dh', ణ: 'N', త: 't', థ: 'th', ద: 'd', ధ: 'dh', న: 'n',
  ప: 'p', ఫ: 'ph', బ: 'b', భ: 'bh', మ: 'm', య: 'y', ర: 'r', ఱ: 'r', ల: 'l', ళ: 'L', వ: 'v',
  శ: 'sh', ష: 'Sh', స: 's', హ: 'h',
};
const TE_VOWEL: Record<string, string> = { అ: 'a', ఆ: 'a', ఇ: 'i', ఈ: 'i', ఉ: 'u', ఊ: 'u', ఎ: 'e', ఏ: 'e', ఐ: 'e', ఒ: 'o', ఓ: 'o', ఔ: 'o' };
const TE_SIGN: Record<string, string> = { 'ా': 'a', 'ి': 'i', 'ీ': 'i', 'ు': 'u', 'ూ': 'u', 'ృ': 'i', 'ౄ': 'i', 'ె': 'e', 'ే': 'e', 'ై': 'e', 'ొ': 'o', 'ో': 'o', 'ౌ': 'o' };
const VIRAMA = '్';

function teluguFirst(word: string): { aksharam: string; sound: Sound } | null {
  const chars = [...word];
  const c0 = chars[0];
  if (!c0) return null;
  if (c0 === 'ఋ' || c0 === 'ౠ') return { aksharam: c0, sound: { consonants: ['r'], vowels: ['i'] } };
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
// Longest-first initial consonant spellings → possible Avakahada consonants.
const LATIN_CONSONANT: [string, string[]][] = [
  ['chh', ['ch']], ['ksh', ['k']], ['shr', ['sh', 'Sh']], ['sh', ['sh', 'Sh']],
  ['kh', ['kh']], ['gh', ['gh']], ['ch', ['c']], ['jh', ['jh']], ['th', ['t', 'th', 'T', 'Th']],
  ['dh', ['dh', 'Dh']], ['ph', ['ph']], ['bh', ['bh']], ['gn', ['g']], ['kr', ['k']],
  ['k', ['k']], ['g', ['g']], ['c', ['k', 's']], ['j', ['j']], ['t', ['t', 'T']], ['d', ['d', 'D']],
  ['n', ['n', 'N', 'ny']], ['p', ['p']], ['f', ['f']], ['b', ['b']], ['m', ['m']], ['y', ['y']],
  ['r', ['r']], ['l', ['l']], ['v', ['v']], ['w', ['w']], ['s', ['s']], ['h', ['h']],
  ['z', ['z']], ['q', ['q']], ['x', ['x']],
];
// Vowel spellings → vowel classes (digraphs like "ai" are ambiguous: Sai = sā-i, Chaitanya = cai).
const LATIN_VOWEL: [string, string[]][] = [
  ['aa', ['a']], ['ai', ['e', 'a']], ['au', ['o', 'a']], ['ay', ['e', 'a']], ['ee', ['i']], ['ii', ['i']],
  ['ei', ['e']], ['oo', ['u']], ['ou', ['o', 'u']], ['uu', ['u']], ['ri', ['i']],
  ['a', ['a']], ['e', ['e']], ['i', ['i']], ['o', ['o']], ['u', ['u']], ['y', ['i']],
];

function latinFirst(word: string): { aksharam: string; sound: Sound } | null {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  let consonants = [''];
  let rest = w;
  if (!/^[aeiou]/.test(w)) {
    const hit = LATIN_CONSONANT.find(([sp]) => w.startsWith(sp));
    if (!hit) return null;
    consonants = hit[1];
    rest = w.slice(hit[0].length).replace(/^[^aeiouy]+/, ''); // skip the rest of a cluster (Sravani → a…)
  }
  const v = LATIN_VOWEL.find(([sp]) => rest.startsWith(sp));
  const vowels = v ? v[1] : ['a'];
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
  const near = [...new Set(sound.consonants.flatMap((c) => fallbacks[c] ?? []))];
  return find(near, 'near');
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
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const honorifics = new Set(table.honorifics.map((h) => h.toLowerCase()));
  const word = words.length > 1 && honorifics.has(words[0]!.toLowerCase()) ? words[1]! : words[0];
  if (!word) return null;
  const telugu = /[ఀ-౿]/.test(word);
  const parsed = telugu ? teluguFirst(word) : latinFirst(word);
  if (!parsed) return null;
  return { aksharam: parsed.aksharam, script: telugu ? 'telugu' : 'latin', candidates: dedupe(lookup(parsed.sound)).sort((a, b) => a.nakshatra - b.nakshatra || a.pada - b.pada) };
}
