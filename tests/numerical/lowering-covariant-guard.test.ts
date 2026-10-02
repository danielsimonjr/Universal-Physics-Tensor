/**
 * TS-2 regression guard (v0.4.6): CovariantDerivativeNode.of is typed as
 * `unknown` (module-cycle prevents ExprNode import in connection-validators.ts).
 * The `covNode.of as ExprNode` cast in lowering.ts is unchecked — a malformed
 * AST that bypasses validate() would reach `ofExpr.kind` with kind undefined,
 * producing a cryptic TypeError instead of a clear error.
 *
 * This test calls lowerNode directly (bypassing validate()) with a malformed
 * covariant-derivative node whose `of` sub-node has no `kind` field.
 * After the TS-2 fix, a NumericalBackendError is thrown before lowerNode
 * recurses into the malformed subtree.
 */
import { describe, it, expect } from 'vitest';
import { NumericalBackendError } from '../../src/numerical/errors.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { lowerNode } from '../../src/numerical/lowering.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { NumericalInputs } from '../../src/numerical/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

describe('lowering: CovariantDerivativeNode.of runtime guard (TS-2)', () => {
  const engine = new MathTSEngine();
  const inputs: NumericalInputs = {
    tensors: new Map(),
    dimension: 4,
    metricDerivatives: new Map(),
    derivatives: new Map(),
  };

  it('throws NumericalBackendError when of has no kind field', () => {
    // Construct a malformed covariant-derivative node that bypasses validate().
    // The outer node has kind='covariant-derivative' so lowerNode reaches the
    // covariant-derivative case; the inner `of` has no `kind` field, which
    // would cause a cryptic TypeError without the TS-2 guard.
    const malformedNode = {
      kind: 'covariant-derivative',
      of: { /* no kind field */ name: 'bad' },
      wrt: {
        kind: 'tensor-symbol',
        name: 'x',
        indices: [{ label: 'mu', variance: 'lower' }],
        dim: DIMENSIONLESS,
      },
      wrtIndex: { label: 'mu', variance: 'lower' },
      gLower: {
        kind: 'metric-tensor',
        name: 'g',
        indices: [
          { label: 'mu', variance: 'lower' },
          { label: 'nu', variance: 'lower' },
        ],
        dim: DIMENSIONLESS,
        derivativeStrategy: 'zero',
      },
      gInverse: {
        kind: 'metric-tensor',
        name: 'g',
        indices: [
          { label: 'mu', variance: 'upper' },
          { label: 'nu', variance: 'upper' },
        ],
        dim: DIMENSIONLESS,
        derivativeStrategy: 'zero',
      },
    } as unknown as ExprNode;

    expect(() => lowerNode(malformedNode, inputs, engine)).toThrow(
      NumericalBackendError,
    );
  });

  it('throws NumericalBackendError with a message mentioning kind and validate()', () => {
    const malformedNode = {
      kind: 'covariant-derivative',
      of: { name: 'bad' },
      wrt: {
        kind: 'tensor-symbol',
        name: 'x',
        indices: [{ label: 'mu', variance: 'lower' }],
        dim: DIMENSIONLESS,
      },
      wrtIndex: { label: 'mu', variance: 'lower' },
      gLower: {
        kind: 'metric-tensor',
        name: 'g',
        indices: [
          { label: 'mu', variance: 'lower' },
          { label: 'nu', variance: 'lower' },
        ],
        dim: DIMENSIONLESS,
        derivativeStrategy: 'zero',
      },
      gInverse: {
        kind: 'metric-tensor',
        name: 'g',
        indices: [
          { label: 'mu', variance: 'upper' },
          { label: 'nu', variance: 'upper' },
        ],
        dim: DIMENSIONLESS,
        derivativeStrategy: 'zero',
      },
    } as unknown as ExprNode;

    expect(() => lowerNode(malformedNode, inputs, engine)).toThrow(
      /CovariantDerivativeNode\.of.*kind.*validate\(\)/,
    );
  });
});
