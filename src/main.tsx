import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/styles/tokens.css';
import './app/styles/base.css';
import { App } from './app/App';
import { useSettings } from './app/store/settings';
import { useProfiles } from './app/profiles';
import { registerPwa } from './app/pwa';
import { initEngine } from './engine/client';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

void useSettings.getState().load();
void useProfiles.getState().load();
// Let the static shell in index.html paint first, then mount the app one frame later (~16 ms):
// the first paint never waits for React, on fast and slow devices alike.
requestAnimationFrame(() => setTimeout(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  registerPwa();
}, 0));

// Warm the engine worker once the page has loaded, so the first reading is instant.
window.addEventListener('load', () => {
  initEngine().catch((err: unknown) => console.error('engine init failed', err));
}, { once: true });
