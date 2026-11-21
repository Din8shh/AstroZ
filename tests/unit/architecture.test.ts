// Enforces CLAUDE.md "Architecture rules" that a type checker cannot.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
const SRC = files('src').map((p) => ({ path: relative('.', p).split(sep).join('/'), text: readFileSync(p, 'utf8') }));
const imports = (text: string) => [...text.matchAll(/(?:import|from)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');

describe('architecture', () => {
  it('only src/engine/ephemeris/ imports the ephemeris library', () => {
    const offenders = SRC.filter((f) => !f.path.startsWith('src/engine/ephemeris/'))
      .filter((f) => imports(f.text).some((i) => /swisseph|astronomy-engine/.test(i)))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('the UI reaches the engine only through client.ts and api.ts', () => {
    const offenders = SRC.filter((f) => !f.path.startsWith('src/engine/'))
      .flatMap((f) => imports(f.text).filter((i) => /engine\//.test(i) && !/engine\/(client|api)$/.test(i)).map((i) => `${f.path} → ${i}`));
    expect(offenders).toEqual([]);
  });
});
