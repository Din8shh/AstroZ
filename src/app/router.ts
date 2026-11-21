import { useSyncExternalStore } from 'react';

// Hash routing only: GitHub Pages has no SPA fallback.
export const TABS = ['today', 'wishes', 'family', 'more'] as const;
export type Tab = (typeof TABS)[number];
export const DEFAULT_TAB: Tab = 'today';

export function parseHash(hash: string): Tab {
  const seg = hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (TABS as readonly string[]).includes(seg) ? (seg as Tab) : DEFAULT_TAB;
}

export function hrefFor(tab: Tab): string {
  return `#/${tab}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Tab {
  return useSyncExternalStore(subscribe, () => parseHash(window.location.hash), () => DEFAULT_TAB);
}
