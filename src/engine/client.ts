// Main-thread handle to the engine worker. Screens call this; they never calculate.
import { wrap, type Remote } from 'comlink';
import type { AstroEngine, EngineInfo } from './api';

let worker: Worker | null = null;
let engine: Remote<AstroEngine> | null = null;
let ready: Promise<EngineInfo> | null = null;
let workerFailed: Promise<never> | null = null;

export function getEngine(): Remote<AstroEngine> {
  if (!engine) {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'astroz-engine' });
    worker = w;
    engine = wrap<AstroEngine>(w);
    // If the worker script itself fails to load (e.g. offline before the service worker controls the page),
    // Comlink calls would never settle: fail them, and build a fresh worker on the next call.
    workerFailed = new Promise<never>((_, reject) => {
      w.addEventListener('error', () => {
        if (worker === w) { worker = null; engine = null; }
        w.terminate();
        reject(new Error('engine worker failed to load'));
      }, { once: true });
    });
    workerFailed.catch(() => undefined);
  }
  return engine;
}

/**
 * Starts the worker and loads the ephemeris. Records performance marks
 * 'engine:init:start' / 'engine:init:end' and the measure 'engine:init'
 * (worker spawn + wasm/data fetch + instantiate), read by tests/e2e/engine.spec.ts.
 */
export function initEngine(): Promise<EngineInfo> {
  ready ??= (async () => {
    performance.mark('engine:init:start');
    const e = getEngine();
    const info = await Promise.race([e.init(), workerFailed!]);
    performance.mark('engine:init:end', { detail: info });
    performance.measure('engine:init', 'engine:init:start', 'engine:init:end');
    return info;
  })().catch((err: unknown) => {
    ready = null; // a failed start (e.g. wasm fetch on a flaky first visit) is retried on the next call
    throw err;
  });
  return ready;
}
