// Job and Income at 360/390 px in te and en, for comparison with design/handoff JobTe/JobEn, IncomeTe/IncomeEn.
import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page) {
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await page.goto('./#/family/new');
  await page.getByLabel('Name').fill('శ్రావణి');
  await page.getByLabel('Birth date').fill('1995-08-14');
  await page.getByLabel('Birth time').fill('05:40');
  await page.getByRole('combobox', { name: 'Birthplace' }).fill('Vijay');
  await page.getByRole('option', { name: /Vijayawada/ }).first().click();
  await page.getByRole('radio', { name: 'Me', exact: true }).click();
  await page.getByRole('radio', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Show my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
}

async function shot(page: Page, file: string, width: number) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), file).toBeLessThanOrEqual(0);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: `test-results/outlook/${file}`, fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width, height: 800 });
}

for (const width of [360, 390]) {
  test(`job and income screens @ ${width}px`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-11-22T10:00:00+05:30') });
    await seed(page);
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      await page.goto('./#/wishes/job');
      await expect(page.getByTestId('job-hero')).toBeVisible({ timeout: 20_000 });
      await shot(page, `job-${lang}-${width}.png`, width);
      await page.goto('./#/wishes/income');
      await expect(page.getByTestId('inc-bars')).toBeVisible({ timeout: 20_000 });
      await shot(page, `income-${lang}-${width}.png`, width);
    }
    await ctx.close();
  });
}
