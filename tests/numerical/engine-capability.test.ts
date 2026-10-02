import { describe, it, expect } from 'vitest';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { EngineTensor, TensorEngine, EinsumSpec } from '../../src/numerical/tensor-engine.js';
import { hasAutogradSupport, EngineCapabilityError } from '../../src/numerical/tensor-engine.js';

/** Minimal stub engine with no AD methods — used to verify hasAutogradSupport returns false. */
class StubEngine implements TensorEngine {
  readonly name = 'StubEngine';
  fromNested(): EngineTensor { return { shape: [] }; }
  toNested(): number { return 0; }
  einsum(_spec: EinsumSpec, ...operands: EngineTensor[]): EngineTensor { return operands[0] ?? { shape: [] }; }
  matMul(a: EngineTensor): EngineTensor { return a; }
  transpose(a: EngineTensor): EngineTensor { return a; }
  reshape(a: EngineTensor): EngineTensor { return a; }
  add(a: EngineTensor): EngineTensor { return a; }
  sub(a: EngineTensor): EngineTensor { return a; }
  mul(a: EngineTensor): EngineTensor { return a; }
  scale(a: EngineTensor): EngineTensor { return a; }
  identity(): EngineTensor { return { shape: [] }; }
  normInf(): number { return 0; }
}

describe('TensorEngine AD capability detection', () => {
  it('hasAutogradSupport returns false on engines without forwardGrad/reverseGrad', () => {
    const engine = new StubEngine();
    expect(hasAutogradSupport(engine)).toBe(false);
  });

  it('hasAutogradSupport returns true on MathTSEngine (Task 9)', () => {
    const engine = new MathTSEngine();
    expect(hasAutogradSupport(engine)).toBe(true);
  });

  it('EngineCapabilityError carries engine name + missing-method name', () => {
    const err = new EngineCapabilityError('MathTSEngine', 'forwardGrad');
    expect(err.message).toMatch(/MathTSEngine/);
    expect(err.message).toMatch(/forwardGrad/);
    expect(err.name).toBe('EngineCapabilityError');
    expect(err instanceof EngineCapabilityError).toBe(true);
  });
});
