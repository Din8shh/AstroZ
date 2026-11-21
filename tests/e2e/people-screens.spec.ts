// Screenshots of the Phase 4 screens at 360/390 px in te and en, for comparison with design/handoff.
// Output: test-results/people/*.png
import { expect, test, type Page } from '@playwright/test';

const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

async function seed(page: Page) {
  const add = async (name: string, date: string, time: string | null, city: [string, string], relation: string) => {
    await page.goto('./#/family/new');
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Birth date').fill(date);
    if (time) await page.getByLabel('Birth time').fill(time);
    else await page.getByRole('switch', { name: 'Time not known' }).check({ force: true });
    await page.getByRole('combobox', { name: 'Birthplace' }).fill(city[0]);
    await page.getByRole('option', { name: new RegExp(city[1]) }).first().click();
    await page.getByRole('radio', { name: relation, exact: true }).click();
    await page.getByRole('button', { name: 'Show my chart' }).click();
    await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  };
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await add('శ్రావణి', '1995-08-14', '05:40', ['Vijay', 'Vijayawada'], 'Me');
  await add('Kiran', '1993-02-10', '10:15', ['Hyder', 'Hyderabad'], 'Spouse');
  await add('Amma', '1970-03-21', null, ['Visakha', 'Visakhapatnam'], 'Mother');
}

async function shot(page: Page, file: string, width: number) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${file}: horizontal scroll`).toBeLessThanOrEqual(0);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: `test-results/people/${file}`, fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width, height: 800 });
}

for (const width of [360, 390]) {
  test(`people screens @ ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: DESIGN_NOW });
    await seed(page);
    const firstId = await page.evaluate(() => location.hash.split('/')[2]);
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/family');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      await shot(page, `family-${lang}-${width}.png`, width);
      await page.goto('./#/family/new');
      await shot(page, `add-${lang}-${width}.png`, width);
      await page.goto(`./#/family/${firstId}/reveal`);
      await expect(page.getByTestId('reveal-nama')).toBeVisible({ timeout: 15_000 });
      await shot(page, `reveal-${lang}-${width}.png`, width);
      await page.goto('./#/today');
      await expect(page.getByTestId('your-day')).toBeVisible({ timeout: 15_000 });
      await shot(page, `today-${lang}-${width}.png`, width);
    }
    await ctx.close();
  });
}
