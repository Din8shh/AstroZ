// Renders the design handoff's Today artboards at the same widths as the app screenshots, for side-by-side review.
// The handoff is served from disk through a route handler (no extra server).
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { test } from '@playwright/test';

const ROOT = 'design/handoff';
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

const ARTBOARDS = [
  ['today', 'te', 'TodayTe.dc.html'], ['today', 'en', 'TodayEn.dc.html'],
  ['family', 'te', 'FamilyTe.dc.html'], ['family', 'en', 'FamilyEn.dc.html'],
  ['add', 'te', 'AddPerson.dc.html'], ['add', 'en', 'AddPersonEnglish.dc.html'],
  ['reveal', 'te', 'Reveal.dc.html'],
] as const;

for (const width of [360, 390]) {
  for (const [screen, lang, file] of ARTBOARDS) {
    test(`design ${screen} ${lang} @ ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
      await ctx.route('http://design.local/**', async (route) => {
        const path = decodeURIComponent(new URL(route.request().url()).pathname);
        try {
          const body = await readFile(join(ROOT, path));
          await route.fulfill({ body, contentType: TYPES[extname(path)] ?? 'application/octet-stream' });
        } catch {
          await route.fulfill({ status: 404 });
        }
      });
      const page = await ctx.newPage();
      await page.goto(`http://design.local/${file}`);
      await page.waitForTimeout(1500);
      await page.evaluate(() => document.fonts.ready);
      const dir = screen === 'today' ? 'today' : 'people';
      await page.screenshot({ path: `test-results/${dir}/design-${screen}-${lang}-${width}.png`, fullPage: true });
      await ctx.close();
    });
  }
}
