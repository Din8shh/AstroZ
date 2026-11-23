// Accessibility sweep (Phase 8): axe on every main screen, in Telugu and English, light and dark.
// Fails on serious or critical violations (missing names/labels, contrast, ARIA misuse).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page) {
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
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

const SCREENS: [string, string][] = [
  ['today', './'], ['wishes', './#/wishes'], ['family', './#/family'], ['settings', './#/more'],
  ['method', './#/more/method'], ['privacy', './#/more/privacy'], ['match', './#/wishes/marriage'],
  ['muhurtham', './#/wishes/muhurtham'], ['house', './#/wishes/house'], ['job', './#/wishes/job'], ['income', './#/wishes/income'], ['future', './#/future'],
  ['add', './#/family/new'],
];

for (const scheme of ['light', 'dark'] as const) {
  test(`axe: no serious or critical issues on any screen, te and en (${scheme})`, async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-11-22T10:00:00+05:30') });
    await seed(page);
    const problems: string[] = [];
    for (const lang of ['te', 'en'] as const) {
      await page.goto('./#/wishes');
      await page.getByRole('radio', { name: lang === 'te' ? 'తెలుగు' : 'English' }).click();
      for (const [name, url] of SCREENS) {
        await page.goto(url);
        await page.waitForTimeout(name === 'job' || name === 'income' || name === 'house' || name === 'future' ? 2500 : 900);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        for (const v of r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
          problems.push(`${scheme} ${lang} ${name}: ${v.id} (${v.impact}) — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        }
      }
    }
    await ctx.close();
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
