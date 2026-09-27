/**
 * case-resistor-noise (audit §14 I20a). Every number is checked against a
 * second method: hand arithmetic from the exact SI constants, the closed-form
 * RC integral and the kT/C limit, a trapezoid rule on the quantum spectrum,
 * and a Monte Carlo of the RMS scatter.
 */
import { describe, expect, it } from 'vitest';
import { RESISTOR_NOISE_CASE as C } from '../../src/cases/resistor-noise.js';

const K_B = 1.380649e-23;
const H = 6.62607015e-34;

const base = { T_K: 300, R_ohm: 1000, R_in_ohm: 1e6, C_in_F: 20e-12, f_lo_Hz: 0, f_hi_Hz: 1e4, t_avg_s: 10 };
const out = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i }).outputs as Record<string, number>;
const failed = (i: Partial<typeof base>) => C.run({ ...base, ...i }).checks.filter((k) => !k.holds).map((k) => k.id);

describe('case-resistor-noise — the scalar result', () => {
  it('unloaded: √(4 k_B T R B) = 4.0703547756921635e-7 V at 300 K, 1 kΩ, 10 kHz (the audit §8 value)', () => {
    expect(out().V_rms_unloaded_V).toBeCloseTo(Math.sqrt(4 * K_B * 300 * 1000 * 1e4), 20);
    expect(Math.abs(out().V_rms_unloaded_V / 4.070354775692163e-7 - 1)).toBeLessThan(1e-15);
  });

  it('loaded: the instrument sees R ∥ R_in, and V_rms falls by √(R_in/(R + R_in))', () => {
    const rEff = (1000 * 1e6) / (1000 + 1e6);
    expect(out().R_eff_ohm).toBeCloseTo(rEff, 9);
    expect(Math.abs(out().V_rms_V / Math.sqrt(4 * K_B * 300 * rEff * 1e4) - 1)).toBeLessThan(1e-14);
    expect(out().loading_ratio).toBeCloseTo(Math.sqrt(1e6 / 1.001e6), 14);
  });

  it('control: a 1 kΩ input halves the noise power — the loading is not ignored', () => {
    expect(out({ R_in_ohm: 1000 }).loading_ratio).toBeCloseTo(Math.SQRT1_2, 14);
    expect(out({ R_in_ohm: 1000 }).V_rms_V).not.toBeCloseTo(out({ R_in_ohm: 1000 }).V_rms_unloaded_V, 9);
  });
});

describe('case-resistor-noise — the parent spectrum', () => {
  it('classical band through an RC: matches the closed form (2k_BT/πC)[atan(2πf_hi R C) − atan(2πf_lo R C)]', () => {
    const i = { R_ohm: 1e5, R_in_ohm: 1e12, C_in_F: 1e-10, f_lo_Hz: 1e3, f_hi_Hz: 1e5 };
    const rEff = (1e5 * 1e12) / (1e5 + 1e12);
    const w = (f: number) => 2 * Math.PI * f * rEff * 1e-10;
    const v2 = ((2 * K_B * 300) / (Math.PI * 1e-10)) * (Math.atan(w(1e5)) - Math.atan(w(1e3)));
    expect(out(i).V_rms_parent_V / Math.sqrt(v2) - 1).toBeLessThan(1e-8);
    expect(out(i).V_rms_parent_V / Math.sqrt(v2) - 1).toBeGreaterThan(-1e-8);
  });

  it('the whole band of an RC input gives the k_BT/C noise of the capacitor', () => {
    const v = out({ R_ohm: 1e6, R_in_ohm: 1e15, C_in_F: 1e-11, f_lo_Hz: 0, f_hi_Hz: 1e10 }).V_rms_parent_V;
    expect(Math.abs((v * v) / ((K_B * 300) / 1e-11) - 1)).toBeLessThan(1e-4);
  });

  it('quantum band (20 mK, 1–2 GHz): the adaptive quadrature matches a 200 000-point trapezoid rule', () => {
    const i = { T_K: 0.02, R_ohm: 50, R_in_ohm: 1e6, C_in_F: 0, f_lo_Hz: 1e9, f_hi_Hz: 2e9 };
    const rEff = (50 * 1e6) / (50 + 1e6);
    const s = (f: number) => {
      const x = (H * f) / (K_B * 0.02);
      return (4 * rEff * H * f) / Math.expm1(x);
    };
    const n = 200000;
    const h = 1e9 / n;
    let sum = (s(1e9) + s(2e9)) / 2;
    for (let k = 1; k < n; k++) sum += s(1e9 + k * h);
    const trap = Math.sqrt(sum * h);
    expect(Math.abs(out(i).V_rms_parent_V / trap - 1)).toBeLessThan(1e-8);
    // The flat scalar overstates it about threefold: the reason the classical check refuses this point.
    expect(out(i).parent_deviation).toBeGreaterThan(1.9);
  });

  it('in the checked regime the scalar and the parent agree to better than the thresholds promise', () => {
    expect(Math.abs(out().parent_deviation)).toBeLessThan(1e-6);
  });
});

describe('case-resistor-noise — regime checks', () => {
  it('hf/k_BT at the band top is checked, and the thresholds are the stated ones', () => {
    const c = C.run({ ...base, T_K: 0.02, R_ohm: 50, C_in_F: 0, f_lo_Hz: 1e9, f_hi_Hz: 2e9 }).checks.find((k) => k.id === 'classical')!;
    expect(c.value).toBeCloseTo((H * 2e9) / (K_B * 0.02), 10);
    expect(c.bound).toBe(0.01);
    expect(c.holds).toBe(false);
  });

  it('the input RC pole is checked against the band top', () => {
    expect(failed({ R_ohm: 1e6, R_in_ohm: 1e7, C_in_F: 100e-12, f_hi_Hz: 1e5 })).toEqual(['flat-band']);
    expect(failed({ C_in_F: 0 })).toEqual([]);
  });

  it('refuses a band with f_lo ≥ f_hi and a non-positive resistance', () => {
    expect(() => C.run({ ...base, f_lo_Hz: 1e4 })).toThrow(/f_lo_Hz < f_hi_Hz/);
    expect(() => C.run({ ...base, R_ohm: 0 })).toThrow(/R_ohm must be/);
    expect(() => C.run({ ...base, C_in_F: -1e-12 })).toThrow(/C_in_F/);
  });
});

describe('case-resistor-noise — the statistical scatter of a measured RMS', () => {
  // mulberry32: a seeded generator, so the Monte Carlo is reproducible.
  const rng = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('1/(2√(B t_avg)) matches the spread of RMS estimates from 2 B t_avg independent Gaussian samples', () => {
    const B = 100;
    const tAvg = 1;
    const predicted = out({ f_lo_Hz: 0, f_hi_Hz: B, t_avg_s: tAvg }).V_rms_rel_sigma;
    expect(predicted).toBeCloseTo(0.05, 12);
    const u = rng(20260927);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
    const n = 2 * B * tAvg;
    const trials = 4000;
    const rms: number[] = [];
    for (let t = 0; t < trials; t++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += gauss() ** 2;
      rms.push(Math.sqrt(s / n));
    }
    const mean = rms.reduce((a, b) => a + b, 0) / trials;
    const sd = Math.sqrt(rms.reduce((a, b) => a + (b - mean) ** 2, 0) / (trials - 1));
    expect(Math.abs(sd / mean / predicted - 1)).toBeLessThan(0.05);
  });
});

/** Deterministic Gaussian samples: a 32-bit LCG through Box–Muller. */
function gaussian(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 2 ** 32;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

describe('case-resistor-noise — amplifier noise (e_n, i_n)', () => {
  const amp = { e_n2_V2_per_Hz: 1e-18, i_n2_A2_per_Hz: 1e-24 };
  const outA = (i: Record<string, number> = {}) => C.run({ ...base, ...amp, ...i }).outputs as Record<string, number | null>;
  const failedA = (i: Record<string, number> = {}) => C.run({ ...base, ...amp, ...i }).checks.filter((k) => !k.holds).map((k) => k.id);

  it('by hand at 1 kΩ ∥ 1 MΩ, 300 K, 1 nV/√Hz and 1 pA/√Hz: φ = 0.89229, T_n = 36.215 K, V_rms,total = 4.3069e-7 V', () => {
    const rEff = 1e9 / 1001000;
    const S = 4 * K_B * 300 * rEff;
    const excess = 1e-18 + 1e-24 * rEff * rEff;
    expect(outA().resistor_fraction).toBeCloseTo(S / (S + excess), 14);
    expect(outA().resistor_fraction).toBeCloseTo(0.89229, 5);
    expect(outA().T_n_K).toBeCloseTo(36.215, 3);
    expect(Math.abs(outA().V_rms_total_V! / Math.sqrt((S + excess) * 1e4) - 1)).toBeLessThan(1e-14);
    expect(outA().V_rms_total_V).toBeCloseTo(4.3069e-7, 11);
  });

  it('a second route through the noise temperature: (V_rms,total/V_rms)² = 1 + T_n/T', () => {
    for (const T of [4.2, 77, 300]) {
      const o = outA({ T_K: T });
      expect((o.V_rms_total_V! / o.V_rms_V!) ** 2 / (1 + o.T_n_K! / T) - 1, `T = ${T}`).toBeCloseTo(0, 13);
    }
  });

  it("control: i_n enters through R_eff — at R = 1 MΩ it dominates a term the 1 kΩ reading barely feels", () => {
    const small = outA({ e_n2_V2_per_Hz: 0 });
    const large = outA({ e_n2_V2_per_Hz: 0, R_ohm: 1e6, C_in_F: 0 });
    expect(small.T_n_K).toBeCloseTo((1e-24 * (1e9 / 1001000)) / (4 * K_B), 6);
    expect(large.T_n_K! / small.T_n_K!).toBeCloseTo(5e5 / (1e9 / 1001000), 3);
  });

  it('the amplifier check is 1/(φ√(B t_avg)); a Monte Carlo of the subtracted power reproduces that scatter', () => {
    // 2B t_avg Nyquist samples of total power P, minus the known amplifier power P(1 − φ), over φP.
    const [B, tAvg, phi] = [50, 1, 0.25];
    const n = 2 * B * tAvg;
    const g = gaussian(20260927);
    const est: number[] = [];
    for (let k = 0; k < 20000; k++) {
      let p = 0;
      for (let j = 0; j < n; j++) p += g() ** 2;
      est.push((p / n - (1 - phi)) / phi);
    }
    const mean = est.reduce((a, b) => a + b, 0) / est.length;
    const sd = Math.sqrt(est.reduce((a, b) => a + (b - mean) ** 2, 0) / (est.length - 1));
    expect(Math.abs(mean - 1)).toBeLessThan(0.01);
    expect(Math.abs(sd / (1 / (phi * Math.sqrt(B * tAvg))) - 1)).toBeLessThan(0.02);
    const k = C.run({ ...base, ...amp }).checks.find((c) => c.id === 'amplifier')!;
    expect(k.value).toBeCloseTo(1 / (outA().resistor_fraction! * Math.sqrt(1e4 * 10)), 14);
  });

  it('a 10 Ω resistor behind 4 nV/√Hz fails the amplifier check; the 1 kΩ one passes; shortening t_avg makes it fail', () => {
    expect(failedA()).toEqual([]);
    expect(failedA({ R_ohm: 10, e_n2_V2_per_Hz: 1.6e-17 })).toEqual(['amplifier']);
    expect(failedA({ t_avg_s: 0.01 })).toEqual(['amplifier']);
  });

  it('without e_n2 and i_n2: no amplifier outputs or check; one alone takes the other as 0 and says so; a negative density is refused', () => {
    const r = C.run(base);
    expect(r.outputs.V_rms_total_V).toBeNull();
    expect(r.outputs.resistor_fraction).toBeNull();
    expect(r.checks.map((k) => k.id)).toEqual(['classical', 'flat-band']);
    const onlyEn = C.run({ ...base, e_n2_V2_per_Hz: 1e-18 });
    expect(onlyEn.unchecked.join(' ')).toMatch(/i_n was not given and is taken as 0/);
    expect(onlyEn.outputs.T_n_K).toBeCloseTo(1e-18 / (4 * K_B * (1e9 / 1001000)), 8);
    expect(() => C.run({ ...base, i_n2_A2_per_Hz: -1e-24 })).toThrow(/i_n2_A2_per_Hz must be/);
  });
});
