// Renders the PWA icons from the design system's Muggulu motif (bundle.js) with Playwright's Chromium.
// Run: npm run icons   → public/favicon.svg, public/icons/*.png
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const KUMKUM = '#c8102e', ON_KUMKUM = '#ffffff', GOLD = '#f1e2bd';
const ring = 'M8 4A4 4 0 0 1 16 4 4 4 0 0 1 20 8 4 4 0 0 1 20 16 4 4 0 0 1 16 20 4 4 0 0 1 8 20 4 4 0 0 1 4 16 4 4 0 0 1 4 8 4 4 0 0 1 8 4Z';
const loop = 'M12 1.5C16 1.5 16 8 20 8S22.5 12 22.5 12 20 16 16 16 16 22.5 12 22.5 8 16 4 16 1.5 12 1.5 12 4 8 8 8 8 1.5 12 1.5Z';
const dots = [4, 12, 20].flatMap((y) => [4, 12, 20].map((x) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${GOLD}"/>`)).join('');
const motif = `<path d="${ring}" stroke="${ON_KUMKUM}" stroke-width="1.4" fill="none"/>` +
  `<path d="${loop}" stroke="${GOLD}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>${dots}`;

// scale = share of the canvas the 24-unit motif occupies. Maskable keeps it inside the 80% safe circle.
const svg = ({ scale, rounded }) => {
  const s = (512 * scale) / 24, off = (512 - 512 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${KUMKUM}"/>` +
    `<g transform="translate(${off} ${off}) scale(${s})">${motif}</g></svg>`;
};

mkdirSync('public/icons', { recursive: true });
const any = svg({ scale: 0.7, rounded: true });
const maskable = svg({ scale: 0.52, rounded: false });
writeFileSync('public/favicon.svg', any);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const jobs = [
  ['icon-192.png', any, 192], ['icon-512.png', any, 512],
  ['maskable-192.png', maskable, 192], ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
];
for (const [file, markup, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: true });
  console.log('wrote public/icons/' + file);
}
await browser.close();
