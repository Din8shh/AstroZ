// Marriage screens at 360/390 px in te and en, for comparison with design/handoff Match*.dc.html.
import { expect, test, type Page } from '@playwright/test';

const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

async function seed(page: Page) {
  const add = async (name: string, date: string, time: string, city: [string, string], relation: string, gender: 'Female' | 'Male') => {
    await page.goto('./#/family/new');
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Birth date').fill(date);
    await page.getByLabel('Birth time').fill(time);
    await page.getByRole('combobox', { name: 'Birthplace' }).fill(city[0]);
    await page.getByRole('option', { name: new RegExp(city[1]) }).first().click();
    await page.getByRole('radio', { name: relation, exact: true }).click();
    await page.getByRole('radio', { name: gender, exact: true }).click();
    await page.getByRole('button', { name: 'Show my chart' }).click();
    await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  };
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await add('శ్రావణి', '1995-08-14', '05:40', ['Vijay', 'Vijayawada'], 'Me', 'Female');
  await add('కిరణ్', '1993-02-10', '10:15', ['Hyder', 'Hyderabad'], 'Spouse', 'Male');
}

async function shot(page: Page, file: string, width: number) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), file).toBeLessThanOrEqual(0);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: `test-results/marriage/${file}`, fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width, height: 800 });
}

for (const width of [360, 390]) {
  test(`marriage screens @ ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: DESIGN_NOW });
    await seed(page);
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      await shot(page, `wishes-${lang}-${width}.png`, width);
      await page.goto('./#/wishes/marriage');
      await shot(page, `pick-${lang}-${width}.png`, width);
      await page.getByRole('button', { name: lang === 'te' ? 'పొంతన చూడండి' : 'See the match' }).click();
      await expect(page.getByTestId('guna-score')).toBeVisible({ timeout: 15_000 });
      await shot(page, `result-${lang}-${width}.png`, width);
      await page.getByTestId('koota-row').nth(6).getByRole('button').click();
      await page.screenshot({ path: `test-results/marriage/why-${lang}-${width}.png`, animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
    await ctx.close();
  });
}
