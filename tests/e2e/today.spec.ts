import { expect, test } from '@playwright/test';

// Same moment as the design artboards: Saturday 21 Nov 2026, 11:02 in Hyderabad.
const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

for (const width of [360, 390]) {
  for (const lang of ['te', 'en'] as const) {
    test(`Today ${lang} @ ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
      const page = await ctx.newPage();
      await page.clock.install({ time: DESIGN_NOW });
      await page.goto('./#/today');
      if (lang === 'en') await page.getByRole('radio', { name: 'English' }).click();
      await expect(page.getByRole('heading', { name: lang === 'te' ? 'పంచాంగం' : 'Panchangam', exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('ribbon-now')).toBeAttached();
      await expect(page.getByTestId('ribbon-now')).toContainText('11:02');
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      // Grow the viewport to the whole page so the sticky bottom nav sits at the end, as in the design artboard.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: `test-results/today/app-today-${lang}-${width}.png`, fullPage: true, animations: 'disabled' });
      await ctx.close();
    });
  }
}

test('Today shows the engine values for 21 Nov 2026, Hyderabad', async ({ page }) => {
  await page.clock.install({ time: DESIGN_NOW });
  await page.goto('./#/today');
  await page.getByRole('radio', { name: 'English' }).click();
  const card = page.locator('section[aria-labelledby="panchangam-h"]');
  await expect(card).toContainText('Ekadashi', { timeout: 15_000 });
  await expect(card).toContainText('06:32'); // Drik: Ekadashi upto 06:31
  await expect(card).toContainText('Uttara Bhadra');
  await expect(card).toContainText('Siddhi');
  await expect(card).toContainText('Vishti');
  await expect(page.getByText('Parabhava')).toBeVisible();
  await expect(page.getByText('Karthikam')).toBeVisible();
  const list = page.locator('ol').first();
  await expect(list.locator('li')).toHaveCount(8); // incl. Saturday's two Durmuhurtham slots
  await expect(list).toContainText('Rahu kalam');
  await expect(list).toContainText('09:13 – 10:37'); // Drik (geoname 1269843, same coordinates): 09:13 – 10:38
  // 11:02 falls in no period; Abhijit (11:39) is next.
  await expect(list.locator('li', { hasText: 'Now' })).toHaveCount(0);
});

test('date picker changes the day', async ({ page }) => {
  await page.clock.install({ time: DESIGN_NOW });
  await page.goto('./#/today');
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByLabel('Date').fill('2027-04-07');
  await expect(page.getByTestId('today-date')).toHaveText('Wed, 7 Apr');
  await expect(page.getByText('Plavanga')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Chaitram')).toBeVisible();
  await expect(page.getByTestId('ribbon-now')).toHaveCount(0); // not today
});
