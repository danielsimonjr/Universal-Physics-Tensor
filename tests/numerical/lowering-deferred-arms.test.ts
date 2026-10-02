/**
 * v0.9.0 Phase 4 (S-9) — DEFERRED_EVALUATOR_REGISTRY exhaustiveness +
 * dispatch pins (Adam A-8 mitigation: the registry and the default-arm
 * prose must not silently drift).
 */
import { describe, it, expect } from 'vitest';
import {
  DEFERRED_EVALUATOR_REGISTRY,
  lowerNode,
} from '../../src/numerical/lowering.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const engine = new MathTSEngine();
const inputs = { tensors: new Map(), dimension: 4 } as const;

const DEFERRED_KINDS = [
  'killing-vector',
  'conserved-charge',
  'stress-energy',
  'cosmological-constant',
  'einstein-equation',
] as const;

describe('S-9 DEFERRED_EVALUATOR_REGISTRY (v0.9.0 Phase 4)', () => {
  it('registry keys are exactly the five deferred kinds (exhaustiveness pin)', () => {
    expect(Object.keys(DEFERRED_EVALUATOR_REGISTRY).sort()).toEqual(
      [...DEFERRED_KINDS].sort(),
    );
  });

  it('every entry names a canonical evaluator and a module hint', () => {
    for (const entry of Object.values(DEFERRED_EVALUATOR_REGISTRY)) {
      expect(entry.canonicalEvaluatorName).toMatch(/^(verify|evaluate)[A-Z]/);
      expect(entry.moduleHint).toMatch(/^src\/numerical\/.+\.ts$/);
    }
  });

  for (const kind of DEFERRED_KINDS) {
    it(`'${kind}' raises the registry-driven error naming its canonical evaluator`, () => {
      const node = { kind } as unknown as ExprNode;
      const entry =
        DEFERRED_EVALUATOR_REGISTRY[kind as keyof typeof DEFERRED_EVALUATOR_REGISTRY];
      expect(() => lowerNode(node, inputs, engine)).toThrow(
        new RegExp(
          `'${kind}' numerical evaluation is not yet implemented[\\s\\S]*` +
            `${entry.canonicalEvaluatorName}\\(\\)`,
        ),
      );
    });
  }

  it('truly-unknown kinds still hit the generic exhaustiveness error', () => {
    const node = { kind: 'no-such-kind' } as unknown as ExprNode;
    expect(() => lowerNode(node, inputs, engine)).toThrow(
      /unknown ExprNode\.kind/,
    );
  });
});
