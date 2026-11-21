import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

async function addPerson(page: Page, name: string, date: string, time: string, city: [string, string], relation: string, gender: 'Female' | 'Male') {
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
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: DESIGN_NOW });
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await addPerson(page, 'Sravani', '1995-08-14', '05:40', ['Vijay', 'Vijayawada'], 'Me', 'Female');
  await addPerson(page, 'Kiran', '1993-02-10', '10:15', ['Hyder', 'Hyderabad'], 'Spouse', 'Male');
});

test('finder: 90-day vivaham search in the worker < 2 s, ranked cards, detail, .ics without birth details', async ({ page }) => {
  await page.goto('./#/wishes');
  await page.getByRole('link', { name: /Muhurtham/ }).click();
  await expect(page.getByRole('radio', { name: 'Vivaham' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: /Sravani/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Kiran/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('range-label')).toHaveText('21 November 2026 – 18 February 2027');
  await page.getByRole('button', { name: 'Find dates' }).click();
  const results = page.getByTestId('mh-results');
  await expect(results).toBeVisible({ timeout: 15_000 });
  const ms = Number(await results.getAttribute('data-ms'));
  console.log(`findMuhurtham vivaham 90 days in the browser worker: ${ms} ms`);
  test.info().annotations.push({ type: 'findMuhurtham worker (ms)', description: String(ms) });
  expect(ms).toBeLessThan(2000);

  const cards = page.getByTestId('date-card');
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  expect(await cards.count()).toBeLessThanOrEqual(3);
  const scores = (await cards.allInnerTexts()).map((x) => Number(x.match(/(\d+)\/100/)![1]));
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  await expect(cards.first().locator('li')).toHaveCount(3);

  // Why sheet
  await cards.first().getByRole('button', { name: 'Why?' }).click();
  await expect(page.getByRole('dialog')).toContainText('Tithi');
  await page.keyboard.press('Escape');

  // .ics from the first card
  const [dl] = await Promise.all([page.waitForEvent('download'), cards.first().getByRole('button', { name: 'Add to calendar' }).click()]);
  const ics = await readFile((await dl.path())!, 'utf8');
  expect(ics).toContain('BEGIN:VEVENT');
  expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(ics).toContain('SUMMARY:Wedding muhurtham');
  expect(ics).not.toMatch(/Sravani|Kiran|1995|1993|05:40|10:15|Vijayawada/);

  // Detail screen: the route carries only the date.
  await cards.first().getByRole('link').click();
  await expect(page).toHaveURL(/#\/wishes\/muhurtham\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByTestId('mh-window')).toBeVisible();
  await expect(page.getByTestId('shuddhi-row')).toHaveCount(6);
  await expect(page.getByTestId('person-strength')).toHaveCount(2);
  await expect(page.getByText('Only the date and time are sent — no birth details.')).toBeVisible();
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar' }).click()]);
  expect(await readFile((await dl2.path())!, 'utf8')).not.toMatch(/Sravani|Kiran|1995|1993/);
  expect(page.url()).not.toMatch(/Sravani|Kiran|1995|1993/);
});

test('nothing in range: this week has no gruhapravesam → nearest good date', async ({ page }) => {
  await page.goto('./#/wishes/muhurtham');
  await page.getByRole('radio', { name: 'Gruhapravesam' }).click();
  await page.getByRole('radio', { name: 'This week' }).click();
  await page.getByRole('button', { name: 'Find dates' }).click();
  const none = page.getByTestId('mh-none');
  await expect(none).toBeVisible({ timeout: 15_000 });
  await expect(none).toContainText('No good muhurtham for gruhapravesam');
  await expect(none.getByTestId('date-card')).toHaveCount(1);
  await none.getByRole('button', { name: 'Why?' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Outside the months used for gruhapravesam');
});

test('new house: door, best dates, entry direction table, checklist, reminder .ics', async ({ page }) => {
  await page.goto('./#/wishes');
  await page.getByRole('link', { name: /Gruhapravesam|New house/ }).first().click();
  await expect(page.getByRole('radio', { name: 'East' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('nh-results')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('nh-results')).toContainText('Bhadra tithis, for the east door');
  await expect(page.getByTestId('door-row')).toHaveCount(4);
  await expect(page.getByTestId('door-row').filter({ hasText: 'south door' })).toContainText('Nanda tithis');
  await expect(page.getByTestId('door-row').filter({ hasText: 'north door' })).toContainText('Ask your purohit');
  await expect(page.getByTestId('todos').locator('li')).toHaveCount(5);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Set a reminder for/ }).click()]);
  const ics = await readFile((await dl.path())!, 'utf8');
  expect(ics).toContain('BEGIN:VALARM');
  expect(ics).toContain('TRIGGER:-PT1440M');
  await page.getByRole('radio', { name: 'North' }).click();
  await expect(page.getByTestId('nh-results')).toContainText('No tithi rule for the north door yet', { timeout: 15_000 });
});
