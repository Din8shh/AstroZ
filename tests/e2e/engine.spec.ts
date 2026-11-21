import { expect, test, type Page } from '@playwright/test';
import { SLOW_4G, startThrottledServer } from './support/throttled-server';

// "Throttled mid-range profile" = Lighthouse's mobile defaults for DevTools throttling:
// 4× CPU slowdown + Slow 4G (562.5 ms RTT, 1474.56 kbit/s down, 675 kbit/s up).
//
// Caveats found while writing this (Chromium 1243 via Playwright 1.63):
// - CDP CPU throttling slows the page's main thread (measured 4.7×) but NOT dedicated workers.
//   So the warm-start check also asserts a conservative bound: the whole measure × 4.
// - CDP network emulation does not reliably reach the engine worker's requests, so the cold-start
//   measurement uses a server that throttles every response on one shared link instead.
const MID_RANGE = { cpuRate: 4, latency: 562.5, down: (1474.56 * 1024) / 8, up: (675 * 1024) / 8 };
const BUDGET_MS = 1500;

type InitDetail = { ephemeris: string; ayanamsaJ2000: number; initMs: number };

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: MID_RANGE.cpuRate });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: MID_RANGE.latency, downloadThroughput: MID_RANGE.down, uploadThroughput: MID_RANGE.up,
  });
}

/** Waits for main.tsx's initEngine() and returns the 'engine:init' measure (spawn → ephemeris ready). */
function engineInit(page: Page, timeoutMs = 60_000) {
  return page.evaluate((timeout) => new Promise<{ ms: number; detail: InitDetail }>((resolve, reject) => {
    const t0 = performance.now();
    const check = () => {
      const m = performance.getEntriesByName('engine:init')[0];
      const end = performance.getEntriesByName('engine:init:end')[0] as PerformanceMark | undefined;
      if (m && end) return resolve({ ms: m.duration, detail: end.detail as InitDetail });
      if (performance.now() - t0 > timeout) return reject(new Error('engine:init never finished'));
      setTimeout(check, 25);
    };
    check();
  }), timeoutMs);
}

test('worker loads the ephemeris and passes its self-check in the browser', async ({ page }) => {
  await page.goto('./');
  const { detail } = await engineInit(page);
  expect(detail.ephemeris).toMatch(/^Swiss Ephemeris 2\.10/);
  expect(detail.ayanamsaJ2000).toBeCloseTo(23.853, 2);
});

test(`warm start (offline cache) on a throttled mid-range profile: worker ready < ${BUDGET_MS} ms`, async ({ page }) => {
  // First visit installs the service worker and precaches wasm + data.
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await engineInit(page);

  await throttle(page);
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.reload();
    runs.push((await engineInit(page)).ms);
  }
  const worst = Math.max(...runs);
  const bound = worst * MID_RANGE.cpuRate;
  test.info().annotations.push({ type: 'engine:init warm (ms)', description: runs.map((r) => r.toFixed(0)).join(', ') });
  console.log(`engine:init warm, page 4x CPU + Slow 4G: ${runs.map((r) => r.toFixed(0)).join(' / ')} ms (worst ${worst.toFixed(0)}; ×4 bound for an unthrottled worker thread: ${bound.toFixed(0)} ms)`);
  expect(worst).toBeLessThan(BUDGET_MS);
  expect(bound).toBeLessThan(BUDGET_MS);
});

test('cold first visit over one Slow 4G link (reported, not asserted)', async ({ page }) => {
  test.setTimeout(180_000);
  const server = await startThrottledServer('dist', process.env.VITE_BASE ?? '/AstroZ/', SLOW_4G);
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: MID_RANGE.cpuRate });
    const t0 = Date.now();
    await page.goto(server.url);
    const { ms } = await engineInit(page, 170_000);
    const sinceNav = Date.now() - t0;
    test.info().annotations.push({ type: 'engine:init cold (ms)', description: `${ms.toFixed(0)} (navigation → ready ${sinceNav})` });
    console.log(`engine:init cold first visit, 4x CPU + one Slow 4G link: ${ms.toFixed(0)} ms (navigation → engine ready: ${sinceNav} ms)`);
  } finally {
    await server.close();
  }
});
