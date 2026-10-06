/**
 * v0.19 faithful re-encoding batch: BE-25, BE-40, BE-41, BE-45, BE-46 now use
 * `transcendental` (and BE-41 the new `abs`) nodes instead of typed-stub symbols,
 * so `bridgeGradientASTById` gives exact gradients w.r.t. the previously-hidden
 * variables. Round-trip dimensional_signature preservation is covered by the
 * registry-driven tests/bridges/dimensional-signature-catalog.test.ts.
 *
 * Gated on the optional mathts-autograd peer.
 *
 * @module tests/diff/bridge-ast-reencode-batch
 */
import { describe, it, expect } from 'vitest';
import {
  bridgeGradientAST,
  bridgeGradientASTById,
  astDifferentiableBridgeIds,
} from '../../src/diff/bridge-ast-gradient.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const peerPresent = hasAutogradSupport(new MathTSEngine());
const relErr = (a: number, b: number) => Math.abs((a - b) / b);

describe('v0.19 re-encodings — exact AD w.r.t. exposed variables', () => {
  it.runIf(peerPresent)('BE-25 IIT: ∂ii/∂p_marg = −p_cond/(p_marg·ln2)', async () => {
    const p_cond = 0.7;
    const p_marg = 0.3;
    const { gradient } = await bridgeGradientASTById('BE-25', 'marginal-probability', {
      'conditional-probability': p_cond,
      'marginal-probability': p_marg,
    });
    expect(relErr(gradient, -p_cond / (p_marg * Math.LN2))).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('BE-46 anthropic: ∂P/∂α = −P/Λ (exp(−α/Λ))', async () => {
    const A = 1.0;
    const alpha = 2.0;
    const Lambda = 5.0;
    const { value, gradient } = await bridgeGradientASTById('BE-46', 'anthropic-model-parameter', {
      'measure-normalization': A,
      'anthropic-model-parameter': alpha,
      'landscape-parameter': Lambda,
    });
    expect(relErr(gradient, -value / Lambda)).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('BE-45 TCC: ∂N/∂r = −γ/r (γ·ln(r/0.01) term)', async () => {
    const M_P = 1e3;
    const H_inf = 1e-2;
    const gamma = 1.5;
    const r = 0.02;
    const { gradient } = await bridgeGradientASTById('BE-45', 'tensor-to-scalar-ratio', {
      'planck-mass-energy': M_P,
      'inflation-hubble-energy': H_inf,
      'tcc-correction-coefficient': gamma,
      'tensor-to-scalar-ratio': r,
    });
    expect(relErr(gradient, -gamma / r)).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('BE-41 Swampland: ∂m/∂φ = −m·α/M_P (φ>φ₀; exercises the abs node)', async () => {
    const m_0 = 1.0;
    const alpha = 0.8;
    const phi = 3.0;
    const phi_0 = 1.0;
    const M_P = 10.0;
    const { value, gradient } = await bridgeGradientASTById('BE-41', 'scalar-field-value', {
      'reference-mass': m_0,
      'swampland-coefficient': alpha,
      'scalar-field-value': phi,
      'scalar-field-reference': phi_0,
      'planck-mass': M_P,
    });
    // φ > φ₀ ⟹ d|φ−φ₀|/dφ = +1; arg = −α(φ−φ₀)/M_P; ∂value/∂φ = value·(−α/M_P).
    expect(relErr(gradient, value * (-alpha / M_P))).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('BE-40 composite Higgs: gradient w.r.t. h is finite (sin/cos exposed)', async () => {
    const { gradient } = await bridgeGradientASTById('BE-40', 'higgs-field', {
      'higgs-field': 0.5,
      'higgs-decay-constant': 1.0,
      'composite-higgs-alpha': 0.3,
      'composite-higgs-beta': 0.2,
    });
    expect(Number.isFinite(gradient)).toBe(true);
    expect(gradient).not.toBe(0);
  });

  it('all five re-encoded bridges are now exactly-AD-eligible', () => {
    const ids = astDifferentiableBridgeIds();
    for (const id of [25, 40, 41, 45, 46]) expect(ids).toContain(id);
  });
});

describe('abs node — AD (dimension-preserving)', () => {
  const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: {} }) as ExprNode;
  const abs = (arg: ExprNode): ExprNode => ({ kind: 'abs', arg }) as ExprNode;

  it.runIf(peerPresent)('d/dx |x| = sign(x): +1 for x>0, −1 for x<0', async () => {
    const pos = await bridgeGradientAST(abs(sym('x')), 'x', { x: 3 });
    expect(pos.value).toBe(3);
    expect(pos.gradient).toBeCloseTo(1, 10);
    const neg = await bridgeGradientAST(abs(sym('x')), 'x', { x: -4 });
    expect(neg.value).toBe(4);
    expect(neg.gradient).toBeCloseTo(-1, 10);
  });
});
