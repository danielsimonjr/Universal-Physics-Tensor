import { describe, expect, it } from 'vitest';

/** The resolved Vitest config object, loaded from the file, not matched as text. */
async function loadTestConfig(): Promise<Record<string, unknown>> {
  const url = new URL('../../vitest.config.ts', import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ url)) as { default: { test?: Record<string, unknown> } };
  return mod.default.test ?? {};
}

describe('vitest config timeouts', () => {
  it('gives hooks the same time budget as tests', async () => {
    const test = await loadTestConfig();
    expect(test.testTimeout).toBeTypeOf('number');
    expect(test.testTimeout as number).toBeGreaterThan(0);
    expect(test.hookTimeout).toBe(test.testTimeout);
  });
});
