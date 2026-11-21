import { useSyncExternalStore } from 'react';

// Hash routing only: GitHub Pages has no SPA fallback. Never put birth details in a route.
export const TABS = ['today', 'wishes', 'family', 'more'] as const;
export type Tab = (typeof TABS)[number];
export const DEFAULT_TAB: Tab = 'today';

export type Route = { tab: Tab; rest: string[] };

export function parseRoute(hash: string): Route {
  const [path = ''] = hash.replace(/^#\/?/, '').split('?');
  const [seg = '', ...rest] = path.split('/').filter(Boolean);
  return (TABS as readonly string[]).includes(seg) ? { tab: seg as Tab, rest } : { tab: DEFAULT_TAB, rest: [] };
}

/** Kept for callers that only need the tab. */
export const parseHash = (hash: string): Tab => parseRoute(hash).tab;

export function hrefFor(tab: Tab, ...rest: string[]): string {
  return `#/${[tab, ...rest].join('/')}`;
}

export function navigate(tab: Tab, ...rest: string[]): void {
  window.location.hash = hrefFor(tab, ...rest);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const snapshot = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot, () => '');
  return parseRoute(hash);
}
