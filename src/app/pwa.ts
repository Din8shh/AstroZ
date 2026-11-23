import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';

// registerType 'prompt': when a new version is installed it waits; the UpdateToast offers to switch now or later.
// Installed apps (iOS especially) are rarely cold-started, so we also look for a new version whenever the app comes
// back to the foreground, every hour while open, and on pull-to-refresh (checkForUpdate).
type UpdateState = { ready: boolean; apply: () => void; dismiss: () => void };
export const useUpdate = create<UpdateState>()((set) => ({ ready: false, apply: () => undefined, dismiss: () => set({ ready: false }) }));

let registration: ServiceWorkerRegistration | undefined;
let lastCheck = 0;
const HOUR = 60 * 60 * 1000;
const MIN_GAP = 60 * 1000;

/** True in the installed app (home-screen PWA), where the browser's own pull-to-refresh is not available. */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function check(force = false): Promise<void> {
  if (!registration || (!force && Date.now() - lastCheck < MIN_GAP)) return;
  lastCheck = Date.now();
  const r = registration;
  try { await r.update(); } catch { return; /* offline: try again later */ }
  // A version found this way is not reported by the plugin's onNeedRefresh: offer it in the toast ourselves.
  if (await installed(r, 15_000)) useUpdate.setState({ ready: true, apply: () => { activateWaiting(r); } });
}

/** Wait (up to `ms`) for a newly found service worker to finish installing. */
function installed(r: ServiceWorkerRegistration, ms: number): Promise<boolean> {
  if (r.waiting) return Promise.resolve(true);
  const sw = r.installing;
  if (!sw) return Promise.resolve(false);
  return new Promise((resolve) => {
    const done = (ok: boolean) => { clearTimeout(timer); sw.removeEventListener('statechange', onState); resolve(ok); };
    const onState = () => { if (sw.state === 'installed') done(true); else if (sw.state === 'redundant') done(false); };
    const timer = setTimeout(() => done(!!r.waiting), ms);
    sw.addEventListener('statechange', onState);
  });
}

/**
 * Switch to the waiting service worker and reload into it. Done directly (SKIP_WAITING message + controllerchange)
 * because the plugin's updateSW(true) only reloads for updates it found itself, not for ones found by
 * registration.update() — which is exactly how pull-to-refresh and the foreground checks find them.
 */
function activateWaiting(r: ServiceWorkerRegistration): boolean {
  const w = r.waiting;
  if (!w) return false;
  let done = false;
  const reload = () => { if (!done) { done = true; window.location.reload(); } };
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  w.postMessage({ type: 'SKIP_WAITING' });
  setTimeout(reload, 4000); // if controllerchange never comes, reload anyway (the new worker serves next load)
  return true;
}

/**
 * Pull-to-refresh: look for a new version now. If one is ready it is activated and the page reloads into it
 * ('updated'); otherwise nothing is changed ('none') and the caller just reloads for fresh data.
 */
export async function checkForUpdate(): Promise<'updated' | 'none'> {
  const r = registration;
  if (!r) return 'none';
  await check(true);
  if (await installed(r, 15_000) && activateWaiting(r)) return 'updated';
  return 'none';
}

export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => useUpdate.setState({ ready: true, apply: () => { if (!registration || !activateWaiting(registration)) void updateSW(true); } }),
    onRegisteredSW: (_url, r) => {
      registration = r;
      if (!r) return;
      setInterval(() => void check(), HOUR);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
    },
  });
}
