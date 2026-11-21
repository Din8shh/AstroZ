import { expect, test, type Page } from '@playwright/test';

const DESIGN_NOW = new Date('2026-11-21T11:02:00+05:30');

async function addPerson(page: Page, name: string, date: string, time: string | null, city: [string, string], relation: string, gender?: 'Female' | 'Male') {
  await page.goto('./#/family/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Birth date').fill(date);
  if (time) await page.getByLabel('Birth time').fill(time);
  else await page.getByRole('switch', { name: 'Time not known' }).check({ force: true });
  await page.getByRole('combobox', { name: 'Birthplace' }).fill(city[0]);
  await page.getByRole('option', { name: new RegExp(city[1]) }).first().click();
  await page.getByRole('radio', { name: relation, exact: true }).click();
  if (gender) await page.getByRole('radio', { name: gender, exact: true }).click();
  await page.getByRole('button', { name: 'Show my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Your chart is ready' })).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: DESIGN_NOW });
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
});

test('match two saved people: dial, eight kootas, doshas, to-dos, disclaimer', async ({ page }) => {
  await addPerson(page, 'Sravani', '1995-08-14', '05:40', ['Vijay', 'Vijayawada'], 'Me', 'Female');
  await addPerson(page, 'Kiran', '1993-02-10', '10:15', ['Hyder', 'Hyderabad'], 'Spouse', 'Male');
  await page.goto('./#/wishes');
  await page.getByRole('link', { name: /Marriage matching/ }).click();
  await expect(page.getByTestId('slot-Bride')).toContainText('Sravani');
  await expect(page.getByTestId('slot-Groom')).toContainText('Kiran');
  await page.getByRole('button', { name: 'See the match' }).click();
  await expect(page.getByTestId('guna-score')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('koota-row')).toHaveCount(8);
  await expect(page.getByTestId('dosha')).toHaveCount(3); // kuja (or one per person), rajju, vedha
  await expect(page.getByTestId('todos')).toBeVisible();
  await expect(page.getByText(/does not promise outcomes/)).toBeVisible();
  // The score shown equals the sum of the koota rows.
  const rows = await page.getByTestId('koota-row').allInnerTexts();
  const sum = rows.map((r) => Number(r.match(/(\d+(?:\.\d+)?)\/\d+/)![1])).reduce((a, b) => a + b, 0);
  await expect(page.getByTestId('guna-score')).toContainText(String(sum % 1 ? sum.toFixed(1) : sum));
  // No birth details reach the URL or the share card.
  expect(page.url()).not.toMatch(/Sravani|Kiran|1995|1993/);
  const card = await page.getByTestId('share-card').innerText();
  expect(card).not.toMatch(/1995|1993|05:40|10:15|Vijayawada|Hyderabad/);
});

test('Why sheet opens for a koota and closes with Escape', async ({ page }) => {
  await addPerson(page, 'Sravani', '1995-08-14', '05:40', ['Vijay', 'Vijayawada'], 'Me', 'Female');
  await addPerson(page, 'Kiran', '1993-02-10', '10:15', ['Hyder', 'Hyderabad'], 'Spouse', 'Male');
  // The chosen pair is kept in memory only (never in the URL), so go through the picker.
  await page.goto('./#/wishes/marriage');
  await page.getByRole('button', { name: 'See the match' }).click();
  await page.getByTestId('koota-row').filter({ hasText: 'Bhakoot' }).getByRole('button', { name: 'Why?' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/Bhakoot · \d\/7/);
  await expect(dialog).toContainText('Bhakoot looks at the distance between the two Moon signs.');
  await expect(dialog).toContainText('Ashtakoota method');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('opening the result URL directly, with no pair chosen, offers to choose one', async ({ page }) => {
  await page.goto('./#/wishes/marriage/result');
  await expect(page.getByRole('link', { name: 'Change' })).toBeVisible();
});

test('names only: approximate, kuja not checked, candidate chooser for an ambiguous name', async ({ page }) => {
  await page.goto('./#/wishes/marriage');
  await page.getByRole('radio', { name: 'Names only' }).click();
  await page.getByLabel('Bride').fill('Anusha');
  await page.getByLabel('Groom').fill('Tarun');
  await expect(page.getByRole('radiogroup', { name: 'Nama nakshatram' })).toBeVisible(); // Ta: two candidates
  await page.getByRole('button', { name: 'See the match' }).click();
  await expect(page.getByTestId('guna-score')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('This is an approximate result from names')).toBeVisible();
  await expect(page.getByText("Kuja dosha can't be checked without birth charts.")).toBeVisible();
  await expect(page.getByText('Approximate · names only').first()).toBeVisible();
  await expect(page.getByTestId('peru')).toHaveCount(0);
});

test('share image downloads as a PNG', async ({ page }) => {
  await page.goto('./#/wishes/marriage');
  await page.getByRole('radio', { name: 'Names only' }).click();
  await page.getByLabel('Bride').fill('Lavanya');
  await page.getByLabel('Groom').fill('Ravi');
  await page.getByRole('button', { name: 'See the match' }).click();
  await expect(page.getByTestId('share-card')).toBeVisible({ timeout: 15_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as image' }).click()]);
  expect(download.suggestedFilename()).toBe('astroz-match.png');
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  await download.saveAs('test-results/marriage/share-card.png');
});
