import te from '../content/te.json';
import en from '../content/en.json';
import { useSettings } from './store/settings';
import type { Lang } from './types';

export type MessageKey = Exclude<keyof typeof en, '$source'>;

const catalogs: Record<Lang, Record<MessageKey, string>> = { te, en };

/** Message for `key`, with {placeholders} filled from `vars`. */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string>): string {
  const msg = catalogs[lang][key];
  return vars ? msg.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : msg;
}

/** Returns t(key, vars?) for the active language. */
export function useT(): (key: MessageKey, vars?: Record<string, string>) => string {
  const lang = useSettings((s) => s.lang);
  return (key, vars) => translate(lang, key, vars);
}

/** Picks the Telugu or English form of an engine-supplied name; falls back to English while a Telugu name is missing. */
export function useName(): (n: { en: string; te: string | null }) => string {
  const lang = useSettings((s) => s.lang);
  return (n) => (lang === 'te' && n.te ? n.te : n.en);
}
