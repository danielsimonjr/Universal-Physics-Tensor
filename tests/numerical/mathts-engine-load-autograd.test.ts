/**
 * Both AD methods of MathTSEngine load `@danielsimonjr/mathts-autograd` through
 * the one `loadAutograd`. A failed import is an EngineCapabilityError that names
 * the method that was called, and keeps the import error as its cause.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@danielsimonjr/mathts-autograd');
  vi.resetModules();
});

describe('MathTSEngine loadAutograd', () => {
  it('names forwardGrad and reverseGrad in the error of a failed import', async () => {
    const boom = new Error('autograd unavailable');
    vi.resetModules();
    vi.doMock('@danielsimonjr/mathts-autograd', () => {
      throw boom;
    });
    const { MathTSEngine } = await import('../../src/numerical/mathts-engine.js');
    const { EngineCapabilityError } = await import('../../src/numerical/errors.js');
    const engine = new MathTSEngine();
    const x = engine.fromNested([1, 2], [2]);
    for (const method of ['forwardGrad', 'reverseGrad'] as const) {
      const err = await engine[method]((t) => t, x).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err, method).toBeInstanceOf(EngineCapabilityError);
      expect((err as InstanceType<typeof EngineCapabilityError>).missingMethod, method).toBe(method);
      expect((err as Error).cause, method).toBeDefined();
    }
  });

  it('is the one loader: neither method imports the package itself', async () => {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(new URL('../../src/numerical/mathts-engine.ts', import.meta.url), 'utf8');
    expect(text.match(/import\('@danielsimonjr\/mathts-autograd'\)/g)).toHaveLength(1);
    expect(text).toContain("await loadAutograd('forwardGrad')");
    expect(text).toContain("await loadAutograd('reverseGrad')");
  });
});
