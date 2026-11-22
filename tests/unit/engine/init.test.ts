// A failed engine start (e.g. the wasm fetch on a flaky first visit) is retried, not cached (code review).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';

describe('engine init', () => {
  it('retries after a failed load', async () => {
    let calls = 0;
    const engine = createEngine(async () => {
      calls++;
      if (calls === 1) throw new Error('network');
      return loadEphemeris();
    });
    await expect(engine.init()).rejects.toThrow('network');
    const info = await engine.init();
    expect(calls).toBe(2);
    expect(info.ayanamsaJ2000).toBeCloseTo(23.853, 2);
  });
});
