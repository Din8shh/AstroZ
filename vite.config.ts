/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Must match the GitHub Pages path. CI passes the path from actions/configure-pages;
// locally it defaults to the repository name (Pages paths follow the repo's case).
const base = process.env.VITE_BASE ?? '/AstroZ/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/app/pwa.ts
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'AstroZ',
        short_name: 'AstroZ',
        description: 'Telugu panchangam and jyotisham, on your phone.',
        lang: 'te',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#c8102e', // az-kumkum (light)
        background_color: '#fff8ee', // az-bg (light)
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,woff2,json,png,svg,webmanifest}'],
        // The ephemeris WASM (Phase 2) is larger than Workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
