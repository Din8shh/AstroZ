import { expect, test } from '@playwright/test';

test('bottom nav switches tabs via the hash', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('నేటి పంచాంగం');
  await page.getByRole('link', { name: 'కోరికలు' }).click();
  await expect(page).toHaveURL(/#\/wishes$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('మీ కోరికలు');
  await page.getByRole('link', { name: 'మరిన్ని' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('సెట్టింగ్స్');
});

test('language toggle switches te ↔ en and persists across reloads', async ({ page }) => {
  await page.goto('./#/family');
  await expect(page.locator('html')).toHaveAttribute('lang', 'te');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Family');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Wishes' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Family');
  await page.getByRole('radio', { name: 'తెలుగు' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('కుటుంబం');
});

test('installs a service worker and opens offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Wait until the worker controls the page, so precache is complete.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('./#/wishes');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('మీ కోరికలు');
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  // Fonts come from the precache too.
  const fontsOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Noto Sans Telugu"', 'తె');
  });
  expect(fontsOk).toBe(true);
});
