/**
 * Differentiable definite integrals (Gauss–Legendre quadrature under reverse-mode
 * AD). `bridgeGradientAST` over an `integral` node with bounds gives:
 *   - the Leibniz parameter-gradient  ∂/∂θ ∫ f dx = ∫ ∂f/∂θ dx, and
 *   - the boundary-term bound-gradient ∂/∂b ∫_a^b f dx ≈ f(b),
 * both EXACT for the quadrature (which is exact for constant / polynomial-degree
 * ≤ 31 integrands, and a close approximation for smooth transcendental ones).
 *
 * Gated on the optional mathts-autograd peer.
 *
 * @module tests/diff/integral-ad
 */
import { describe, it, expect } from 'vitest';
import { bridgeGradientAST } from '../../src/diff/bridge-ast-gradient.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const peerPresent = hasAutogradSupport(new MathTSEngine());
const op = (o: string, ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args }) as ExprNode;
const integral = (over: ExprNode, integrand: ExprNode, lower: ExprNode, upper: ExprNode): ExprNode =>
  ({ kind: 'integral', over, integrand, lower, upper }) as ExprNode;

describe('bridgeGradientAST — definite integrals', () => {
  it.runIf(peerPresent)('parameter (Leibniz): d/dθ ∫₀¹ θ·x dx = ∫₀¹ x dx = 1/2', async () => {
    // ∫₀¹ θx dx = θ/2; value at θ=2 is 1; ∂/∂θ = 1/2 (exact — linear in x).
    const expr = integral(sym('x', DIMENSIONLESS), op('*', sym('theta', DIMENSIONLESS), sym('x', DIMENSIONLESS)), sym('0', DIMENSIONLESS), sym('1', DIMENSIONLESS));
    const { value, gradient } = await bridgeGradientAST(expr, 'theta', { theta: 2 });
    expect(value).toBeCloseTo(1.0, 10);
    expect(gradient).toBeCloseTo(0.5, 10);
  });

  it.runIf(peerPresent)('boundary term: d/db ∫₀ᵇ x² dx = b² (exact, polynomial)', async () => {
    // ∫₀ᵇ x² dx = b³/3; value at b=2 is 8/3; ∂/∂b = b² = 4.
    const expr = integral(sym('x', DIMENSIONLESS), op('^', sym('x', DIMENSIONLESS), sym('2', DIMENSIONLESS)), sym('0', DIMENSIONLESS), sym('b', DIMENSIONLESS));
    const { value, gradient } = await bridgeGradientAST(expr, 'b', { b: 2 });
    expect(value).toBeCloseTo(8 / 3, 9);
    expect(gradient).toBeCloseTo(4, 9);
  });

  it.runIf(peerPresent)('constant integrand: ∫₀ᴸ k dx = k·L; ∂/∂L = k, ∂/∂k = L (both exact)', async () => {
    const expr = integral(sym('x', DIMENSIONLESS), sym('k', DIMENSIONLESS), sym('0', DIMENSIONLESS), sym('L', DIMENSIONLESS));
    const k = 3;
    const L = 5;
    const byL = await bridgeGradientAST(expr, 'L', { k, L });
    expect(byL.value).toBeCloseTo(k * L, 9);
    expect(byL.gradient).toBeCloseTo(k, 10);
    const byK = await bridgeGradientAST(expr, 'k', { k, L });
    expect(byK.gradient).toBeCloseTo(L, 10);
  });

  it.runIf(peerPresent)('transcendental integrand: d/dθ ∫₀¹ exp(θx) dx at θ=1 = 1 (quadrature-accurate)', async () => {
    // ∫₀¹ e^{θx} dx = (e^θ−1)/θ; ∂/∂θ = ∫₀¹ x e^{θx} dx = 1 at θ=1.
    const expr = integral(
      sym('x', DIMENSIONLESS),
      { kind: 'transcendental', fn: 'exp', arg: op('*', sym('theta', DIMENSIONLESS), sym('x', DIMENSIONLESS)) } as ExprNode,
      sym('0', DIMENSIONLESS),
      sym('1', DIMENSIONLESS),
    );
    const { value, gradient } = await bridgeGradientAST(expr, 'theta', { theta: 1 });
    expect(value).toBeCloseTo(Math.E - 1, 8); // GL16 ~ machine precision for exp
    expect(gradient).toBeCloseTo(1, 8);
  });

  it.runIf(peerPresent)('nested ∫∫: d/dθ ∫₀¹∫₀¹ θ·x·y dx dy = 1/4', async () => {
    // inner = ∫₀¹ θxy dx = θy/2; outer ∫₀¹ θy/2 dy = θ/4; ∂/∂θ = 1/4.
    const inner = integral(sym('x', DIMENSIONLESS), op('*', sym('theta', DIMENSIONLESS), sym('x', DIMENSIONLESS), sym('y', DIMENSIONLESS)), sym('0', DIMENSIONLESS), sym('1', DIMENSIONLESS));
    const outer = integral(sym('y', DIMENSIONLESS), inner, sym('0', DIMENSIONLESS), sym('1', DIMENSIONLESS));
    const { value, gradient } = await bridgeGradientAST(outer, 'theta', { theta: 2 });
    expect(value).toBeCloseTo(0.5, 9);
    expect(gradient).toBeCloseTo(0.25, 9);
  });

  it.runIf(peerPresent)('rejects differentiating w.r.t. the integration variable', async () => {
    const expr = integral(sym('x', DIMENSIONLESS), op('*', sym('theta', DIMENSIONLESS), sym('x', DIMENSIONLESS)), sym('0', DIMENSIONLESS), sym('1', DIMENSIONLESS));
    await expect(bridgeGradientAST(expr, 'x', { x: 1, theta: 1 })).rejects.toThrow(/integration variable/i);
  });

  it.runIf(peerPresent)('rejects a bound-less (abstract) integral', async () => {
    const expr = { kind: 'integral', over: sym('x', DIMENSIONLESS), integrand: sym('theta', DIMENSIONLESS) } as ExprNode;
    await expect(bridgeGradientAST(expr, 'theta', { theta: 1 })).rejects.toThrow(/bound-less|bounds/i);
  });
});
