// Main-thread handle to the engine worker. Screens call this; they never calculate.
import { wrap, type Remote } from 'comlink';
import type { AstroEngine, EngineInfo } from './api';

let worker: Worker | null = null;
let engine: Remote<AstroEngine> | null = null;
let ready: Promise<EngineInfo> | null = null;

export function getEngine(): Remote<AstroEngine> {
  if (!engine) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'astroz-engine' });
    engine = wrap<AstroEngine>(worker);
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
    const info = await getEngine().init();
    performance.mark('engine:init:end', { detail: info });
    performance.measure('engine:init', 'engine:init:start', 'engine:init:end');
    return info;
  })();
  return ready;
}
