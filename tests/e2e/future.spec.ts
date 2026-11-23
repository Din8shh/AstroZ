// Future tab: configurable horizon (3 years by month, 10 years by year, whole life by mahadasha).
import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page, name = 'Sravani') {
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await page.goto('./#/family/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Birth date').fill('1995-08-14');
  await page.getByLabel('Birth time').fill('05:40');
  await page.getByRole('combobox', { name: 'Birthplace' }).fill('Vijay');
  await page.getByRole('option', { name: /Vijayawada/ }).first().click();
  await page.getByRole('radio', { name: 'Me', exact: true }).click();
  await page.getByRole('radio', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Show my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
}

test('Future tab: now card, 10 years by default, then 3 years and whole life', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-23T10:00:00+05:30') });
  await seed(page);
  await page.goto('./#/today');
  await page.getByRole('navigation').getByRole('link', { name: 'Future' }).click();
  await expect(page).toHaveURL(/#\/future$/);
  await expect(page.getByRole('radio', { name: '10 years' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('future-now')).toContainText('Ketu mahadasha · Rahu antardasha', { timeout: 20_000 });
  const n10 = await page.getByTestId('future-period').count();
  expect(n10).toBeGreaterThanOrEqual(10);
  expect(n10).toBeLessThanOrEqual(11);
  await expect(page.getByTestId('future-milestone')).toHaveCount(8); // first 8, then "Show more"
  await page.getByRole('button', { name: /^Show \d+ more$/ }).click();
  expect(await page.getByTestId('future-milestone').count()).toBeGreaterThan(8);
  await page.getByRole('button', { name: 'Why?' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Guru transit');
  await page.keyboard.press('Escape');

  await page.getByRole('radio', { name: '3 years' }).click();
  await expect.poll(() => page.getByTestId('future-period').count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(36);
  await expect(page.getByRole('heading', { name: 'Month by month' })).toBeVisible();

  await page.getByRole('radio', { name: 'Whole life' }).click();
  await expect(page.getByRole('heading', { name: 'Mahadasha by mahadasha' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('future-period')).toHaveCount(9);
  await expect(page.getByTestId('future-milestones')).toHaveCount(0);
  await expect(page.locator('[data-testid="future-period"][aria-current="true"]')).toContainText('Ketu');
  expect(page.url()).not.toMatch(/Sravani|1995/);
});

test('Future tab without a saved person asks for birth details', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await page.goto('./#/future');
  await expect(page.getByText('Add birth details to see dashas and transits.')).toBeVisible();
});

for (const width of [360, 390]) {
  test(`Future screenshots @ ${width}px`, async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-11-23T10:00:00+05:30') });
    await seed(page, 'శ్రావణి');
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      await page.goto('./#/future');
      await expect(page.getByTestId('future-now')).toBeVisible({ timeout: 20_000 });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height: h });
      await page.screenshot({ path: `test-results/future/future-${lang}-${width}.png`, fullPage: true, animations: 'disabled' });
      await page.setViewportSize({ width, height: 800 });
    }
    await ctx.close();
  });
}
