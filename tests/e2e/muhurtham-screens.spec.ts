// Muhurtham finder / nothing found / detail and New house at 360/390 px in te and en,
// for comparison with design/handoff MhFinder, MhNothing, MhDetail(En), NewHouseTe/En.
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
  await page.screenshot({ path: `test-results/muhurtham/${file}`, fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width, height: 800 });
}

for (const width of [360, 390]) {
  test(`muhurtham screens @ ${width}px`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: DESIGN_NOW });
    await seed(page);
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      const find = () => page.locator('main').getByRole('button', { name: lang === 'te' ? 'తేదీలు వెతకండి' : 'Find dates' }).click();
      // Finder with results
      await page.goto('./#/wishes/muhurtham');
      await find();
      await expect(page.getByTestId('mh-results')).toBeVisible({ timeout: 15_000 });
      await shot(page, `finder-${lang}-${width}.png`, width);
      // Detail of the first date
      await page.getByTestId('date-card').first().getByRole('link').click();
      await expect(page.getByTestId('mh-window')).toBeVisible();
      await expect(page.getByTestId('shuddhi-row').first()).toBeVisible();
      await page.waitForTimeout(300);
      await shot(page, `detail-${lang}-${width}.png`, width);
      // Nothing found: gruhapravesam this week
      await page.goto('./#/wishes/muhurtham');
      await page.locator('main').getByRole('radio').nth(1).click(); // gruhapravesam
      await page.locator('main').getByRole('radio').nth(6).click(); // this week
      await find();
      await expect(page.getByTestId('mh-none')).toBeVisible({ timeout: 15_000 });
      await shot(page, `nothing-${lang}-${width}.png`, width);
      // New house
      await page.goto('./#/wishes/house');
      await expect(page.getByTestId('nh-results')).toBeVisible({ timeout: 15_000 });
      await shot(page, `house-${lang}-${width}.png`, width);
    }
    await ctx.close();
  });
}
