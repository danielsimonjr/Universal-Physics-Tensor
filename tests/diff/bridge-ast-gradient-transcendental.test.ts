/**
 * Reverse-mode AD over the new `transcendental` scalar-AST node, via
 * `bridgeGradientAST`. Confirms exp/ln/logₙ/trig lower onto mathts-autograd's
 * TapedTensor methods and yield exact derivatives — and that the variable
 * inside the transcendental's argument is now visible to differentiation
 * (the whole point of replacing typed-stub symbols).
 *
 * Gated on the optional mathts-autograd peer.
 *
 * @module tests/diff/bridge-ast-gradient-transcendental
 */
import { describe, it, expect } from 'vitest';
import { bridgeGradientAST } from '../../src/diff/bridge-ast-gradient.js';
import type { ExprNode, TranscendentalFn } from '../../src/dimensional/validator.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const peerPresent = hasAutogradSupport(new MathTSEngine());

const fn = (f: TranscendentalFn, arg: ExprNode): ExprNode =>
  ({ kind: 'transcendental', fn: f, arg }) as ExprNode;

interface UnaryCase {
  readonly fn: TranscendentalFn;
  readonly deriv: (x: number) => number;
  readonly x: number;
}

// d/dx of each transcendental at a well-conditioned point.
const CASES: UnaryCase[] = [
  { fn: 'exp', deriv: (x) => Math.exp(x), x: 0.7 },
  { fn: 'ln', deriv: (x) => 1 / x, x: 2.5 },
  { fn: 'log2', deriv: (x) => 1 / (x * Math.LN2), x: 3 },
  { fn: 'log10', deriv: (x) => 1 / (x * Math.LN10), x: 4 },
  { fn: 'sin', deriv: (x) => Math.cos(x), x: 0.6 },
  { fn: 'cos', deriv: (x) => -Math.sin(x), x: 0.6 },
  { fn: 'tan', deriv: (x) => 1 / Math.cos(x) ** 2, x: 0.5 },
  { fn: 'sinh', deriv: (x) => Math.cosh(x), x: 0.8 },
  { fn: 'cosh', deriv: (x) => Math.sinh(x), x: 0.8 },
  { fn: 'tanh', deriv: (x) => 1 - Math.tanh(x) ** 2, x: 0.8 },
];

describe('bridgeGradientAST — transcendental nodes', () => {
  for (const c of CASES) {
    it.runIf(peerPresent)(`${c.fn}(x): exact d/dx`, async () => {
      const { gradient } = await bridgeGradientAST(fn(c.fn, sym('x', DIMENSIONLESS)), 'x', { x: c.x });
      expect(gradient).toBeCloseTo(c.deriv(c.x), 10);
    });
  }

  it.runIf(peerPresent)('chain rule: d/dx ln(a/x) = -1/x (variable inside the argument)', async () => {
    // ln(a/x); ∂/∂x = -1/x. This is the BE-37 shape (ln of a ratio).
    const expr = fn('ln', { kind: 'op', op: '/', args: [sym('a', DIMENSIONLESS), sym('x', DIMENSIONLESS)] } as ExprNode);
    const { value, gradient } = await bridgeGradientAST(expr, 'x', { a: 10, x: 2 });
    expect(value).toBeCloseTo(Math.log(10 / 2), 12);
    expect(gradient).toBeCloseTo(-1 / 2, 10);
  });

  it.runIf(peerPresent)('chain rule: d/dx exp(-x²) = -2x·exp(-x²)', async () => {
    // exp of a composite arg: -(x^2). ∂/∂x = -2x·exp(-x²).
    const negXsq: ExprNode = {
      kind: 'op',
      op: '*',
      args: [sym('neg1', DIMENSIONLESS), { kind: 'op', op: '^', args: [sym('x', DIMENSIONLESS), sym('2', DIMENSIONLESS)] } as ExprNode],
    } as ExprNode;
    const { value, gradient } = await bridgeGradientAST(fn('exp', negXsq), 'x', { x: 0.9, neg1: -1, 2: 2 });
    const x = 0.9;
    expect(value).toBeCloseTo(Math.exp(-(x * x)), 12);
    expect(gradient).toBeCloseTo(-2 * x * Math.exp(-(x * x)), 10);
  });
});
