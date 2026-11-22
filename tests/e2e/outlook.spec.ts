import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function addSravani(page: Page) {
  await page.goto('./#/family/new');
  await page.getByLabel('Name').fill('Sravani');
  await page.getByLabel('Birth date').fill('1995-08-14');
  await page.getByLabel('Birth time').fill('05:40');
  await page.getByRole('combobox', { name: 'Birthplace' }).fill('Vijay');
  await page.getByRole('option', { name: /Vijayawada/ }).first().click();
  await page.getByRole('radio', { name: 'Me', exact: true }).click();
  await page.getByRole('radio', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Show my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
}

async function start(page: Page, now: string) {
  await page.clock.install({ time: new Date(now) });
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await addSravani(page);
}

test('job: dasha now, three transits, windows, joining days, free to-dos, .ics without birth details', async ({ page }) => {
  await start(page, '2026-11-22T10:00:00+05:30');
  await page.goto('./#/wishes');
  await page.getByRole('link', { name: /^Job/ }).click();
  await expect(page.getByTestId('job-hero')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('job-sub')).toContainText('Sravani · Uttara Bhadra');
  // Dasha fixture (tests/fixtures/dasha-golden.json, vij-1995-08-14): Ketu mahadasha, Rahu antardasha on 2026-11-22.
  await expect(page.getByTestId('antar-now')).toContainText('Ketu – Rahu antardasha');
  await expect(page.getByTestId('transit')).toHaveCount(3);
  await expect(page.getByTestId('transit').first()).toContainText('Guru transit');
  expect(await page.getByTestId('job-window').count()).toBeLessThanOrEqual(3);
  expect(await page.getByTestId('join-day').count()).toBeLessThanOrEqual(2);
  await expect(page.getByTestId('todos').locator('li')).toHaveCount(4);
  await page.getByTestId('transit').first().getByRole('button', { name: 'Why?' }).click();
  await expect(page.getByRole('dialog')).toContainText('Mahadasha');
  await page.keyboard.press('Escape');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add these windows to calendar' }).click()]);
  const ics = await readFile((await dl.path())!, 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).not.toMatch(/Sravani|1995|05:40|Vijayawada/);
  expect(page.url()).not.toMatch(/Sravani|1995/);
});

test('income: Parabhava year for Meena rasi, 13 months with Karthikam now, Friday reminder repeats weekly', async ({ page }) => {
  await start(page, '2026-11-22T10:00:00+05:30');
  await page.goto('./#/wishes/income');
  await expect(page.getByTestId('inc-sub')).toHaveText('Parabhava year · Ugadi 2026 – Ugadi 2027', { timeout: 20_000 });
  // Parabhava 2026–27 table (reference.md §11), Meena: aadayam 14, vyayam 11, rajapujyam 7, avamanam 2.
  await expect(page.getByTestId('aadayam')).toHaveText('14');
  await expect(page.getByTestId('vyayam')).toHaveText('11');
  await expect(page.getByTestId('gauge').first()).toContainText('7/7');
  await expect(page.getByTestId('gauge').nth(1)).toContainText('2/7');
  await expect(page.getByTestId('month')).toHaveCount(13);
  await expect(page.locator('[data-testid="month"][aria-current="date"]')).toContainText('Karthikam');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Set a Friday saving reminder' }).click()]);
  expect(await readFile((await dl.path())!, 'utf8')).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR');
});

test('income rolls over at Ugadi 2027: Plavanga with no table yet, months still shown', async ({ page }) => {
  await start(page, '2027-04-07T10:00:00+05:30');
  await page.goto('./#/wishes/income');
  await expect(page.getByTestId('inc-sub')).toContainText('Plavanga year · Ugadi 2027 – Ugadi 2028', { timeout: 20_000 });
  await expect(page.getByTestId('inc-missing')).toBeVisible();
  await expect(page.locator('[data-testid="month"][aria-current="date"]')).toContainText('Chaitram');
});
