import { expect, test, type Page } from '@playwright/test';

const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

async function addPerson(page: Page, p: { name: string; date?: string; time?: string; timeUnknown?: boolean; city?: [string, string]; relation?: string }) {
  await page.goto('./#/family/new');
  await page.getByLabel('Name').fill(p.name);
  if (p.date) await page.getByLabel('Birth date').fill(p.date);
  if (p.time) await page.getByLabel('Birth time').fill(p.time);
  if (p.timeUnknown) await page.getByRole('switch', { name: 'Time not known' }).check({ force: true });
  if (p.city) {
    const box = page.getByRole('combobox', { name: 'Birthplace' });
    await box.fill(p.city[0]);
    await page.getByRole('option', { name: new RegExp(p.city[1]) }).first().click();
  }
  if (p.relation) await page.getByRole('radio', { name: p.relation, exact: true }).click();
  await page.getByRole('button', { name: 'Show my chart' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: DESIGN_NOW });
  await page.goto('./#/family');
  await page.getByRole('radio', { name: 'English' }).click();
});

test('add a person with a birth time: Reveal shows rasi, nakshatra, lagna and nama nakshatra', async ({ page }) => {
  await addPerson(page, { name: 'Sravani', date: '1995-08-14', time: '05:40', city: ['Vijay', 'Vijayawada'], relation: 'Me' });
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Sravani · 14 August 1995 · Vijayawada')).toBeVisible();
  await expect(page.getByTestId('reveal-lagna')).toContainText('Karkataka'); // independent chart fixture: lagna 4
  await expect(page.getByText('Uttara Bhadra · 2')).toBeVisible(); // fixture: nakshatra 26, pada 2
  await expect(page.getByTestId('reveal-nama')).toContainText('Shatabhisha');
  await expect(page.getByTestId('reveal-approx')).toHaveCount(0);
  // Birth details never reach the URL.
  expect(page.url()).not.toMatch(/Sravani|1995|05:40|Vijayawada/);
});

test('time not known: no lagna anywhere, approximate label instead', async ({ page }) => {
  await addPerson(page, { name: 'Amma', date: '1970-03-21', timeUnknown: true, city: ['Visakha', 'Visakhapatnam'], relation: 'Mother' });
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('reveal-lagna')).toHaveCount(0);
  await expect(page.getByTestId('reveal-approx')).toContainText('Approximate — birth time not known');
  await page.goto('./#/family');
  const row = page.getByTestId('person-row').filter({ hasText: 'Amma' });
  await expect(row).toContainText('Approximate · time unknown');
  await expect(row).not.toContainText('lagna');
  await expect(row).toContainText('Purva Phalguni · Simha rasi'); // fixture: nakshatra 11, rasi 5
});

test('name only: nama nakshatra, prompt to add birth details', async ({ page }) => {
  await addPerson(page, { name: 'Naveen', relation: 'Father' });
  await expect(page.getByTestId('reveal-nama')).toContainText('Hasta / Anuradha / Uttara Bhadra', { timeout: 15_000 });
  await page.goto('./#/family');
  const row = page.getByTestId('person-row').filter({ hasText: 'Naveen' });
  await expect(row).toContainText('Name only');
  await expect(row).toContainText('Add birth details');
});

test('form errors: a name is required', async ({ page }) => {
  await page.goto('./#/family/new');
  await page.getByRole('button', { name: 'Show my chart' }).click();
  await expect(page.getByRole('alert')).toContainText('Please check the details.');
  await expect(page.getByText('Add a name — we use it for peru balam.')).toBeVisible();
});

test('Today shows tarabalam and chandrabalam for the active person', async ({ page }) => {
  await addPerson(page, { name: 'Sravani', date: '1995-08-14', time: '05:40', city: ['Vijay', 'Vijayawada'], relation: 'Me' });
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  await page.goto('./#/today');
  const card = page.getByTestId('your-day');
  // Birth: Uttara Bhadra (26), Meena (12). Day star at 11:02 = Revati (27) → count 2, Sampat (good);
  // Moon in Meena → house 1 (good).
  await expect(card).toContainText('Today\'s star is number 2 from yours (Sampat tara).', { timeout: 15_000 });
  await expect(card).toContainText('The moon is in house 1 from your rasi.');
  await expect(card).toContainText('Rahu kalam');
  await expect(card).toContainText('Good window: 11:39 – 12:24');
});

test('Settings: export downloads a file; delete everything empties Family', async ({ page }) => {
  await addPerson(page, { name: 'Kiran', date: '1993-02-10', time: '10:15', city: ['Hyder', 'Hyderabad'], relation: 'Spouse' });
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  await page.goto('./#/more');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export details' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^astroz-\d{4}-\d{2}-\d{2}\.json$/);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.goto('./#/family');
  await expect(page.getByTestId('person-row')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('person-row')).toHaveCount(0);
});

test('profiles survive a reload (IndexedDB)', async ({ page }) => {
  await addPerson(page, { name: 'Ravi', date: '1990-05-01', time: '08:00', city: ['Hyder', 'Hyderabad'], relation: 'Son' });
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
  await page.goto('./#/family');
  await page.reload();
  await expect(page.getByTestId('person-row').filter({ hasText: 'Ravi' })).toBeVisible();
});
