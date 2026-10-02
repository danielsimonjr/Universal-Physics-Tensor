/**
 * MathTSEngine implements the autodiff methods. The autograd package is a
 * required dependency, so support is present.
 */
import { describe, expect, it } from 'vitest';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';

describe('MathTSEngine autodiff is present', () => {
  it('hasAutogradSupport is true', () => {
    expect(hasAutogradSupport(new MathTSEngine())).toBe(true);
  });
});
