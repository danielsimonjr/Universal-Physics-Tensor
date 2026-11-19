import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../vitest.config.ts', import.meta.url), 'utf8');

/** Read a numeric `name: value,` setting from the Vitest config text. */
function setting(name: string): number | undefined {
  const match = new RegExp(`^[ \\t]*${name}:[ \\t]*([0-9]+),`, 'm').exec(source);
  return match ? Number(match[1]) : undefined;
}

describe('vitest config timeouts', () => {
  it('gives hooks the same time budget as tests', () => {
    expect(setting('testTimeout')).toBeGreaterThan(0);
    expect(setting('hookTimeout')).toBe(setting('testTimeout'));
  });
});
