/**
 * Tests for `src/dimensional/tensor-trace.ts` — TensorTraceNode + validateTensorTrace.
 *
 * Per `docs/architecture/archive/v0.7-be-x-reencoding-design-note.md` §"BE-13 —
 * TensorTraceNode for the Einstein trace". First of four BE-X re-encoding
 * primitives.
 *
 * Covers:
 *   - Happy paths: stress-energy trace, arbitrary symmetric rank-2 tensor,
 *     non-symmetric tensor with overridden symmetry expectation.
 *   - Predicate failures: wrong rank, wrong index variance, non-dimensionless
 *     metric, wrong symmetry.
 *   - Meta-tests: error-keyword discipline, equationKind discriminator.
 *
 * @module tests/dimensional/tensor-trace
 */

import { describe, it, expect } from 'vitest';
import {
  validateTensorTrace,
  type TensorTraceNode,
  type TracableTensorNode,
} from '../../src/dimensional/tensor-trace.js';
import type { MetricTensorNode } from '../../src/dimensional/metric-validators.js';
import type { Dimension } from '../../src/dimensional/types.js';

// ---------------------------------------------------------------------------
// Shared dimension fixtures
// ---------------------------------------------------------------------------

const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const ENERGY_DENSITY: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
const INV_L2: Dimension = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const MASS_DENSITY: Dimension = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

// ---------------------------------------------------------------------------
// Shared node builders
// ---------------------------------------------------------------------------

function makeInverseMetric(): MetricTensorNode {
  return {
    kind: 'metric-tensor',
    name: 'g_inv',
    indices: [
      { label: 'mu', variance: 'upper' },
      { label: 'nu', variance: 'upper' },
    ],
    signature: '+,-,-,-',
    dim: DIMENSIONLESS,
  };
}

function makeSymmetricTensor(componentDim: Dimension): TracableTensorNode {
  return {
    indices: [
      { variance: 'lower' },
      { variance: 'lower' },
    ],
    componentDim,
    symmetry: 'symmetric',
  };
}

function makeTensorTraceNode(
  tensorDim: Dimension,
  overrides?: Partial<TensorTraceNode>,
): TensorTraceNode {
  return {
    kind: 'tensor-trace',
    tensor: makeSymmetricTensor(tensorDim),
    metric: makeInverseMetric(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe('validateTensorTrace — happy paths', () => {
  it('traces stress-energy T_μν: result dim = energy density [M L^-1 T^-2]', () => {
    const node = makeTensorTraceNode(ENERGY_DENSITY);
    const r = validateTensorTrace(node);
    expect(r.dim).toEqual(ENERGY_DENSITY);
    expect(r.freeIndices.size).toBe(0);
  });

  it('traces Ricci-scalar proxy (dim [L^-2]): result dim = [L^-2]', () => {
    const node = makeTensorTraceNode(INV_L2);
    const r = validateTensorTrace(node);
    expect(r.dim).toEqual(INV_L2);
    expect(r.freeIndices.size).toBe(0);
  });

  it('traces dimensionless symmetric rank-2 tensor: result dim = dimensionless', () => {
    const node = makeTensorTraceNode(DIMENSIONLESS);
    const r = validateTensorTrace(node);
    expect(r.dim).toEqual(DIMENSIONLESS);
    expect(r.freeIndices.size).toBe(0);
  });

  it('traces mass-density symmetric tensor: result dim = [M L^-3]', () => {
    const node = makeTensorTraceNode(MASS_DENSITY);
    const r = validateTensorTrace(node);
    expect(r.dim).toEqual(MASS_DENSITY);
  });

  it('traces antisymmetric tensor when expectedTensorSymmetry is overridden', () => {
    const antisymTensor: TracableTensorNode = {
      indices: [{ variance: 'lower' }, { variance: 'lower' }],
      componentDim: ENERGY_DENSITY,
      symmetry: 'antisymmetric',
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: antisymTensor,
      metric: makeInverseMetric(),
    };
    const r = validateTensorTrace(node, { expectedTensorSymmetry: 'antisymmetric' });
    expect(r.dim).toEqual(ENERGY_DENSITY);
    expect(r.freeIndices.size).toBe(0);
  });

  it('result freeIndices is always empty (trace collapses to scalar)', () => {
    const node = makeTensorTraceNode(ENERGY_DENSITY);
    const r = validateTensorTrace(node);
    expect(r.freeIndices).toBeInstanceOf(Map);
    expect(r.freeIndices.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Predicate failures (error-keyword discipline)
// ---------------------------------------------------------------------------

describe('validateTensorTrace — predicate failures', () => {
  it('throws with "index" when tensor is rank-1 (not rank-2)', () => {
    const rankOneTensor: TracableTensorNode = {
      indices: [{ variance: 'lower' }],
      componentDim: ENERGY_DENSITY,
      symmetry: 'symmetric',
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: rankOneTensor,
      metric: makeInverseMetric(),
    };
    expect(() => validateTensorTrace(node)).toThrow(/index/);
  });

  it('throws with "index" when tensor has upper index (not lower-lower)', () => {
    const upperTensor: TracableTensorNode = {
      indices: [{ variance: 'upper' }, { variance: 'lower' }],
      componentDim: ENERGY_DENSITY,
      symmetry: 'symmetric',
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: upperTensor,
      metric: makeInverseMetric(),
    };
    expect(() => validateTensorTrace(node)).toThrow(/index/);
  });

  it('throws with "index" when metric has lower index (not upper-upper)', () => {
    const lowerMetric: MetricTensorNode = {
      kind: 'metric-tensor',
      name: 'g_lower',
      indices: [
        { label: 'mu', variance: 'lower' },
        { label: 'nu', variance: 'lower' },
      ],
      signature: '+,-,-,-',
      dim: DIMENSIONLESS,
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: makeSymmetricTensor(ENERGY_DENSITY),
      metric: lowerMetric,
    };
    expect(() => validateTensorTrace(node)).toThrow(/index/);
  });

  it('throws with "dimension" when metric is not dimensionless', () => {
    const dimensionalMetric: MetricTensorNode = {
      kind: 'metric-tensor',
      name: 'g_inv_bad',
      indices: [
        { label: 'mu', variance: 'upper' },
        { label: 'nu', variance: 'upper' },
      ],
      signature: '+,-,-,-',
      dim: INV_L2,  // wrong: inverse metric must be dimensionless
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: makeSymmetricTensor(ENERGY_DENSITY),
      metric: dimensionalMetric,
    };
    expect(() => validateTensorTrace(node)).toThrow(/dimension/);
  });

  it('throws with "symmetry" when tensor symmetry does not match expected (default symmetric)', () => {
    const asymmetricTensor: TracableTensorNode = {
      indices: [{ variance: 'lower' }, { variance: 'lower' }],
      componentDim: ENERGY_DENSITY,
      symmetry: 'none',
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: asymmetricTensor,
      metric: makeInverseMetric(),
    };
    expect(() => validateTensorTrace(node)).toThrow(/symmetry/);
  });
});

// ---------------------------------------------------------------------------
// Meta-tests — error-keyword vocabulary + discriminator
// ---------------------------------------------------------------------------

describe('validateTensorTrace — meta-tests (error-keyword discipline)', () => {
  it('error message names the TensorTraceNode discriminator', () => {
    const rankOneTensor: TracableTensorNode = {
      indices: [{ variance: 'lower' }],
      componentDim: ENERGY_DENSITY,
      symmetry: 'symmetric',
    };
    const node: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: rankOneTensor,
      metric: makeInverseMetric(),
    };
    try {
      validateTensorTrace(node);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('TensorTraceNode');
    }
  });

  it('shares error-keyword vocabulary with field-equation-helpers (dimension / index / symmetry)', () => {
    // dimension keyword: non-dimensionless metric
    const dimensionalMetric: MetricTensorNode = {
      kind: 'metric-tensor',
      name: 'g_bad',
      indices: [
        { label: 'mu', variance: 'upper' },
        { label: 'nu', variance: 'upper' },
      ],
      signature: '+,-,-,-',
      dim: INV_L2,
    };
    const dimNode: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: makeSymmetricTensor(ENERGY_DENSITY),
      metric: dimensionalMetric,
    };
    expect(() => validateTensorTrace(dimNode)).toThrow(/dimension/);

    // symmetry keyword
    const symNode: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: { indices: [{ variance: 'lower' }, { variance: 'lower' }], componentDim: ENERGY_DENSITY, symmetry: 'antisymmetric' },
      metric: makeInverseMetric(),
    };
    expect(() => validateTensorTrace(symNode)).toThrow(/symmetry/);

    // index keyword
    const idxNode: TensorTraceNode = {
      kind: 'tensor-trace',
      tensor: { indices: [{ variance: 'upper' }, { variance: 'lower' }], componentDim: ENERGY_DENSITY, symmetry: 'symmetric' },
      metric: makeInverseMetric(),
    };
    expect(() => validateTensorTrace(idxNode)).toThrow(/index/);
  });
  // A "validator is a function" check stood here; it could not fail (law 3) and was removed 2026-10-15.
});
