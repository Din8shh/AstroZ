// Phase 8 polish: Settings (larger text, theme, default city, method/privacy/disclaimer, source link), header A+,
// reduced motion, offline state on every tab, dark-mode screenshots.
import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-11-22T10:00:00+05:30');

async function english(page: Page) {
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
}

test('settings: larger text, theme, default city, pages and source link; settings survive a reload', async ({ page }) => {
  await page.clock.install({ time: NOW });
  await english(page);
  await page.goto('./#/more');
  const sw = page.getByRole('switch', { name: 'Larger text' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.az-elder').first()).toBeAttached();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /Change town/ }).click();
  await page.getByRole('searchbox', { name: 'Search a town' }).fill('Vijay');
  await page.getByRole('option', { name: /Vijayawada/ }).first().click();
  await expect(page.getByText(/Vijayawada.*sunrise from this city/)).toBeVisible();
  await expect(page.getByTestId('source-link')).toHaveAttribute('href', 'https://github.com/Din8shh/AstroZ');
  // Settings are kept in IndexedDB.
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Larger text' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('./#/today');
  await expect(page.getByText('Vijayawada').first()).toBeVisible({ timeout: 15_000 });
  // Method, privacy and disclaimer pages.
  for (const [link, id] of [['Read the full method', 'method'], ['Privacy', 'privacy'], ['Read the full disclaimer', 'disclaimer']] as const) {
    await page.goto('./#/more');
    await page.getByRole('link', { name: new RegExp(`^${link}`) }).click();
    await expect(page.getByTestId(`info-${id}`)).toBeVisible();
  }
  await expect(page.getByTestId('info-disclaimer')).toContainText('does not promise outcomes');
});

test('header A+ toggles larger text everywhere; the setting is a pressed button with a name in both languages', async ({ page }) => {
  await english(page);
  const btn = page.getByRole('button', { name: 'Larger text' });
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  const before = await page.locator('h1').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  const after = await page.locator('h1').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(after / before).toBeCloseTo(1.2, 1);
  await page.getByRole('radio', { name: 'తెలుగు' }).click();
  await expect(page.getByRole('button', { name: 'పెద్ద అక్షరాలు' })).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion: no transitions or animations', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('./#/more');
  const d = await page.locator('[role="switch"] span').first().evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(d).toBe('0s');
  await ctx.close();
});

test('offline after the first visit: every tab opens, Today still computes, the banner says so', async ({ page, context }) => {
  await page.clock.install({ time: NOW });
  await english(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Visit the lazy screens once online, then go offline (they are precached anyway).
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="panchangam-h"]')).toContainText('Trayodashi', { timeout: 20_000 }); // computed on the phone, offline
  for (const tab of ['wishes', 'family', 'more']) {
    await page.goto(`./#/${tab}`);
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  }
  // A lazily loaded screen also opens offline (its chunk is precached).
  await page.goto('./#/wishes/muhurtham');
  await expect(page.getByRole('button', { name: 'Find dates' })).toBeVisible({ timeout: 15_000 });
  await context.setOffline(false);
});

for (const width of [360, 390]) {
  test(`dark mode screenshots @ ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height: 800 }, deviceScaleFactor: 2, timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await page.clock.install({ time: NOW });
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      for (const [name, url] of [['today', './#/today'], ['settings', './#/more']] as const) {
        await page.goto(url);
        if (name === 'today') await expect(page.locator('section[aria-labelledby="panchangam-h"]')).toBeVisible({ timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width, height: h });
        await page.screenshot({ path: `test-results/polish/dark-${name}-${lang}-${width}.png`, fullPage: true, animations: 'disabled' });
        await page.setViewportSize({ width, height: 800 });
      }
    }
    await ctx.close();
  });
}
