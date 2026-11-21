import { expect, test } from '@playwright/test';

// CLAUDE.md "Verification": UI changes get screenshots at 360 and 390 px, te and en,
// to compare by eye with design/handoff/. Output: test-results/screens/*.png
const TABS = ['today', 'wishes', 'family', 'more'] as const;

for (const width of [360, 390]) {
  for (const lang of ['te', 'en'] as const) {
    test(`screens ${lang} @ ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await page.goto('./#/today');
      if (lang === 'en') await page.getByRole('radio', { name: 'English' }).click();
      for (const tab of TABS) {
        await page.goto(`./#/${tab}`);
        await page.evaluate(() => document.fonts.ready);
        // No horizontal scroll at phone widths.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `test-results/screens/${tab}-${lang}-${width}.png`, animations: 'disabled' });
      }
      await ctx.close();
    });
  }
}
