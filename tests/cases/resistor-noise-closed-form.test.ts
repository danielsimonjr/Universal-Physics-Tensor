/**
 * case-resistor-noise: the parent integral (Nyquist's spectrum through the
 * input RC, MathTS `quad`) against two closed forms.
 *
 * With C_in = 0 the Planck-weighted band integrates exactly:
 *   V² = 4k_BT R_eff (k_BT/h) [F(x_hi) − F(x_lo)],  x = hf/(k_BT),
 *   F(X) = X ln(1 − e^{−X}) − Li₂(e^{−X}) + π²/6     (F(0) = 0),
 * with Li₂ MathTS `polylog(2, ·)`, a plain series accurate for its argument
 * e^{−X} ≲ e^{−0.01}. Classically (Planck factor 1) the RC-shaped band is
 *   V² = 4k_BT R_eff [atan(2πf R_eff C)]_{f_lo}^{f_hi} / (2π R_eff C),
 * which differs from the parent by the dropped Planck factor, x/2 ≈ 8e-10 in
 * power at 300 K and 10 kHz: the difference is measured, not zero.
 */
import { polylog } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { RESISTOR_NOISE_CASE as C } from '../../src/cases/resistor-noise.js';
import { H_SI, K_B_SI } from '../../src/core/constants.js';

const out = (i: Record<string, number>) => C.run(i).outputs as Record<string, number>;
const rEffOf = (R: number, Rin: number): number => (R * Rin) / (R + Rin);

/** F(X) = X ln(1 − e^{−X}) − Li₂(e^{−X}) + π²/6. */
function F(X: number): number {
  return X * Math.log(-Math.expm1(-X)) - polylog(2, Math.exp(-X)) + Math.PI ** 2 / 6;
}

function quantumBandPower(T: number, rEff: number, fLo: number, fHi: number): number {
  const x = (f: number) => (H_SI * f) / (K_B_SI * T);
  return 4 * K_B_SI * T * rEff * ((K_B_SI * T) / H_SI) * (F(x(fHi)) - F(x(fLo)));
}

function classicalRcPower(T: number, rEff: number, Cin: number, fLo: number, fHi: number): number {
  const at = (f: number) => Math.atan(2 * Math.PI * f * rEff * Cin);
  return (4 * K_B_SI * T * rEff * (at(fHi) - at(fLo))) / (2 * Math.PI * rEff * Cin);
}

describe('case-resistor-noise — the parent integral against the closed forms', () => {
  const quantum = { T_K: 0.02, R_ohm: 50, R_in_ohm: 1e6, C_in_F: 0, f_lo_Hz: 1e9, f_hi_Hz: 2e9, t_avg_s: 10 };
  const valid = { T_K: 300, R_ohm: 1000, R_in_ohm: 1e6, C_in_F: 20e-12, f_lo_Hz: 0, f_hi_Hz: 1e4, t_avg_s: 10 };

  it('20 mK, 1–2 GHz, C_in = 0: the quadrature matches the dilogarithm closed form to 1e-12 (measured 2.2e-15)', () => {
    const o = out(quantum);
    const closed = Math.sqrt(quantumBandPower(0.02, rEffOf(50, 1e6), 1e9, 2e9));
    expect(Math.abs(o.V_rms_parent_V! / closed - 1)).toBeLessThan(1e-12);
    // The Planck factor is far from 1 here (x from 2.4 to 4.8), so the band is not the flat one.
    expect(o.V_rms_parent_V!).toBeLessThan(0.5 * o.V_rms_V!);
  });

  it('300 K, 0–10 kHz through 20 pF: the quadrature matches the classical RC form to the dropped Planck factor, 1e-10 to 1e-9 (measured 2e-10)', () => {
    const o = out(valid);
    const closed = Math.sqrt(classicalRcPower(300, rEffOf(1000, 1e6), 20e-12, 0, 1e4));
    const rel = Math.abs(o.V_rms_parent_V! / closed - 1);
    expect(rel).toBeLessThan(1e-9);
    // Not exact: the parent keeps x/(eˣ − 1) and the classical form does not, and x/2 at the band top is 8e-10 in power.
    expect(rel).toBeGreaterThan(5e-11);
  });

  it('control: the classical form applied to the quantum band is off by more than 10%, so the comparison can fail', () => {
    const o = out(quantum);
    // C_in = 0: the classical RC form reduces to the flat band 4k_BT R_eff B.
    const flat = Math.sqrt(4 * K_B_SI * 0.02 * rEffOf(50, 1e6) * 1e9);
    expect(Math.abs(o.V_rms_parent_V! / flat - 1)).toBeGreaterThan(0.1);
  });

  it('F matches ∫₀^X x/(eˣ − 1) dx = X − X²/4 + X³/36 − … at X = 0.05, within the series’ reach; at X = 1e-9 polylog(2, e^{−X}) is 1e-4 off (its limit near z = 1)', () => {
    expect(Math.abs(F(0.05) - (0.05 - 0.05 ** 2 / 4 + 0.05 ** 3 / 36))).toBeLessThan(2e-7);
    expect(F(2)).toBeGreaterThan(F(1));
    // Negative result: the plain series behind polylog is accurate only for z ≲ e^{−0.01}; F(0) = 0 cannot be reached through it.
    expect(Math.abs(F(1e-9))).toBeGreaterThan(1e-5);
  });
});
