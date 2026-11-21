import { registerSW } from 'virtual:pwa-register';

// registerType 'autoUpdate': a new service worker activates and the page reloads on its own.
// TODO(phase 8): update toast — needs te/en copy written by a person (docs/design-mapping.md §4.6).
export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
