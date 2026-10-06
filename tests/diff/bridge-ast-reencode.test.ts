/**
 * Validates the v0.18 faithful re-encodings (BE-37 Shapiro, BE-34 Kibble-Zurek):
 * the transcendental stubs are now real `transcendental` nodes, so
 * `bridgeGradientASTById` gives EXACT gradients w.r.t. the variables that were
 * previously hidden inside the stub — while the round-trip dimensional_signature
 * is preserved (asserted in tests/bridges/dimensional-signature-catalog.test.ts,
 * which is registry-driven).
 *
 * Gated on the optional mathts-autograd peer.
 *
 * @module tests/diff/bridge-ast-reencode
 */
import { describe, it, expect } from 'vitest';
import {
  bridgeGradientASTById,
  astDifferentiableBridgeIds,
} from '../../src/diff/bridge-ast-gradient.js';
import { PhysicalConstants } from '../../src/core/types.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const peerPresent = hasAutogradSupport(new MathTSEngine());
const { G, c, kB } = PhysicalConstants;
const relErr = (a: number, b: number) => Math.abs((a - b) / b);

describe('BE-37 Shapiro — faithful ln(R_far/R_near) re-encoding', () => {
  // Δt = (2GM/c³)·ln(R_far/R_near); prefactor 2GM/c³ is const in R.
  const M = 1.989e30;
  const R_far = 1.496e11;
  const R_near = 6.96e8;
  const pref = (2 * G * M) / c ** 3;

  it.runIf(peerPresent)('value matches (2GM/c³)·ln(R_far/R_near)', async () => {
    const { value } = await bridgeGradientASTById('BE-37', 'far-radius', {
      mass: M,
      'far-radius': R_far,
      'near-radius': R_near,
    });
    expect(relErr(value, pref * Math.log(R_far / R_near))).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('∂Δt/∂R_far = (2GM/c³)/R_far — exact, exposed by the re-encoding', async () => {
    const { gradient } = await bridgeGradientASTById('BE-37', 'far-radius', {
      mass: M,
      'far-radius': R_far,
      'near-radius': R_near,
    });
    expect(relErr(gradient, pref / R_far)).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('∂Δt/∂R_near = −(2GM/c³)/R_near', async () => {
    const { gradient } = await bridgeGradientASTById('BE-37', 'near-radius', {
      mass: M,
      'far-radius': R_far,
      'near-radius': R_near,
    });
    expect(relErr(gradient, -pref / R_near)).toBeLessThan(1e-9);
  });
});

describe('BE-34 Kibble-Zurek — faithful exp(−mc²/k_B T_reh) re-encoding', () => {
  // n = (τ_Q/τ_0)^(-0.5)·exp(−arg), arg = m c²/(k_B T_reh).
  // ∂n/∂T_reh = n·arg/T_reh (the exp Boltzmann factor's T-dependence).
  const tau_Q = 1e-3;
  const tau_0 = 1e-6;
  const m_defect = 1e-27;
  const T_reh = 1e12;
  const arg = (m_defect * c * c) / (kB * T_reh);

  it.runIf(peerPresent)('∂n/∂T_reh = n·arg/T_reh — exact (m_defect, c, k_B, T_reh now exposed)', async () => {
    const { value, gradient } = await bridgeGradientASTById('BE-34', 'reheating-temperature', {
      'quench-timescale': tau_Q,
      'microscopic-relaxation-time': tau_0,
      'spatial-dimension': 1,
      'static-exponent-nu': 1,
      'dynamic-exponent-z': 1,
      'defect-rest-mass': m_defect,
      'reheating-temperature': T_reh,
    });
    expect(relErr(gradient, (value * arg) / T_reh)).toBeLessThan(1e-9);
  });

  it.runIf(peerPresent)('∂n/∂m_defect = −n·(c²/(k_B T_reh)) (Boltzmann mass-suppression slope)', async () => {
    const { value, gradient } = await bridgeGradientASTById('BE-34', 'defect-rest-mass', {
      'quench-timescale': tau_Q,
      'microscopic-relaxation-time': tau_0,
      'spatial-dimension': 1,
      'static-exponent-nu': 1,
      'dynamic-exponent-z': 1,
      'defect-rest-mass': m_defect,
      'reheating-temperature': T_reh,
    });
    expect(relErr(gradient, -value * ((c * c) / (kB * T_reh)))).toBeLessThan(1e-9);
  });
});

describe('coverage — re-encoded bridges remain exactly-AD-able', () => {
  it('astDifferentiableBridgeIds still includes BE-37 and BE-34 (now via transcendental nodes)', () => {
    const ids = astDifferentiableBridgeIds();
    expect(ids).toContain(37);
    expect(ids).toContain(34);
  });
});
