// Pull-to-refresh in the installed app (home-screen PWA on iPhone/Android): a swipe down at the top checks for a new
// version and reloads. Standalone mode is emulated by making matchMedia('(display-mode: standalone)') match.
import { expect, test, type Page } from '@playwright/test';

async function swipeDown(page: Page, from: number, to: number, release = true) {
  const cdp = await page.context().newCDPSession(page); // one session per gesture: touch state lives in it
  const x = 180;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
  for (let y = from; y <= to; y += 20) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  if (release) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return cdp;
}

function standalone(page: Page) {
  return page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone')
      ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
      : real(q));
  });
}

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });

test('installed app: swipe down at the top shows the indicator and reloads into the latest version', async ({ page }) => {
  await standalone(page);
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('section[aria-labelledby="panchangam-h"]')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => { (window as unknown as { __marker: number }).__marker = 1; });

  // A short pull is not enough: the indicator says "Pull", then goes away without reloading.
  const short = await swipeDown(page, 120, 220, false);
  await expect(page.getByTestId('ptr')).toHaveAttribute('data-phase', 'pull');
  await expect(page.getByTestId('ptr')).toContainText('Pull down to refresh');
  await short.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByTestId('ptr')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);

  // A long pull: "Release to refresh", then the app checks for an update and reloads.
  const long = await swipeDown(page, 120, 420, false);
  await expect(page.getByTestId('ptr')).toHaveAttribute('data-phase', 'release');
  await expect(page.getByTestId('ptr')).toContainText('Release to refresh');
  const reloaded = page.waitForEvent('load');
  await long.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await reloaded;
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBeUndefined();
  await expect(page.locator('section[aria-labelledby="panchangam-h"]')).toBeVisible({ timeout: 15_000 });
});

test('installed app: no pull-to-refresh when scrolled down or while a sheet is open', async ({ page }) => {
  await standalone(page);
  await page.goto('./');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('section[aria-labelledby="panchangam-h"]')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 600));
  await swipeDown(page, 120, 420);
  await expect(page.getByTestId('ptr')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Why?' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await swipeDown(page, 120, 420);
  await expect(page.getByTestId('ptr')).toHaveCount(0);
});

test('browser tab: the app does not add its own gesture (the browser has one)', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1').first()).toBeVisible();
  await swipeDown(page, 120, 420);
  await expect(page.getByTestId('ptr')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains('az-standalone'))).toBe(false);
});

// The real point: a new deploy reaches an already-open installed app when the person pulls down.
// Serve a copy of dist/, open the app, then "deploy" a new version into that copy (new index.html with a marker and
// a service worker whose precache changed). A pull must activate it and reload into the new version.
test('installed app: pulling down picks up a new deploy', async ({ page }) => {
  test.setTimeout(90_000);
  const { cp, mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { startThrottledServer } = await import('./support/throttled-server');
  const base = process.env.VITE_BASE ?? '/AstroZ/';
  const root = await mkdtemp(join(tmpdir(), 'astroz-deploy-'));
  await cp('dist', root, { recursive: true });
  const server = await startThrottledServer(root, base, { latencyMs: 0, downKbps: 1e9 });
  try {
    await standalone(page);
    await page.goto(server.url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expect(page.locator('meta[name="astroz-build"]')).toHaveCount(0);

    // Deploy v2: index.html gets a marker; sw.js changes because index.html's precache revision changes.
    const html = await readFile(join(root, 'index.html'), 'utf8');
    await writeFile(join(root, 'index.html'), html.replace('<title>', '<meta name="astroz-build" content="v2" /><title>'));
    const sw = await readFile(join(root, 'sw.js'), 'utf8');
    const next = sw.replace(/(url:"index\.html",revision:")[0-9a-f]+(")/, '$1v2deploy$2');
    expect(next).not.toBe(sw);
    await writeFile(join(root, 'sw.js'), next);

    await expect(page.locator('h1').first()).toBeVisible();
    const pull = await swipeDown(page, 120, 420, false);
    await expect(page.getByTestId('ptr')).toHaveAttribute('data-phase', 'release');
    await pull.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('meta[name="astroz-build"]')).toHaveAttribute('content', 'v2', { timeout: 30_000 });
    await expect(page.locator('h1').first()).toBeVisible();
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});

// Coming back to the app (visibilitychange) also looks for a new version and offers it in the update toast.
test('back in the foreground: a new deploy is offered in the update toast and applied on tap', async ({ page }) => {
  test.setTimeout(90_000);
  const { cp, mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { startThrottledServer } = await import('./support/throttled-server');
  const base = process.env.VITE_BASE ?? '/AstroZ/';
  const root = await mkdtemp(join(tmpdir(), 'astroz-deploy-'));
  await cp('dist', root, { recursive: true });
  const server = await startThrottledServer(root, base, { latencyMs: 0, downKbps: 1e9 });
  try {
    await page.goto(server.url);
    await page.getByRole('radio', { name: 'English' }).click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const html = await readFile(join(root, 'index.html'), 'utf8');
    await writeFile(join(root, 'index.html'), html.replace('<title>', '<meta name="astroz-build" content="v2" /><title>'));
    const sw = await readFile(join(root, 'sw.js'), 'utf8');
    await writeFile(join(root, 'sw.js'), sw.replace(/(url:"index\.html",revision:")[0-9a-f]+(")/, '$1v2toast$2'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const toast = page.getByTestId('update-toast');
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await toast.getByRole('button', { name: 'Update now' }).click();
    await expect(page.locator('meta[name="astroz-build"]')).toHaveAttribute('content', 'v2', { timeout: 20_000 });
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
