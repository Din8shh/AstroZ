import te from '../content/te.json';
import en from '../content/en.json';
import { useSettings } from './store/settings';
import type { Lang } from './types';

export type MessageKey = Exclude<keyof typeof en, '$source'>;

const catalogs: Record<Lang, Record<MessageKey, string>> = { te, en };

export function translate(lang: Lang, key: MessageKey): string {
  return catalogs[lang][key];
}

/** Returns t(key) for the active language. */
export function useT(): (key: MessageKey) => string {
  const lang = useSettings((s) => s.lang);
  return (key) => translate(lang, key);
}
