import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/styles/tokens.css';
import './app/styles/base.css';
import { App } from './app/App';
import { useSettings } from './app/store/settings';
import { registerPwa } from './app/pwa';
import { initEngine } from './engine/client';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

void useSettings.getState().load();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
registerPwa();

// Warm the engine worker once the page has loaded, so the first reading is instant.
window.addEventListener('load', () => {
  initEngine().catch((err: unknown) => console.error('engine init failed', err));
}, { once: true });
