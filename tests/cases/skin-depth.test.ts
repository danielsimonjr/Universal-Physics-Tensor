/**
 * case-skin-depth (audit §14 I20, electromagnetic). δ = √(2ρ/(ωμ)) is checked
 * by hand arithmetic, by a time-domain Crank–Nicolson solution of the magnetic
 * diffusion equation driven at the surface, and the parent penetration depth
 * 1/Im k by a finite-difference solution of the 1-D Maxwell (telegraph)
 * equation in the frequency domain and by its lossy-dielectric limit.
 */
import { describe, expect, it } from 'vitest';
import { EPS_0_SI, MU_0_SI, SKIN_DEPTH_CASE as C, maxwellDepthFactor } from '../../src/cases/skin-depth.js';

const base = { rho_ohm_m: 1.68e-8, f_Hz: 1e6, mu_r: 1, eps_r: 1, l_mfp_m: 39e-9, v_carrier_m_per_s: 1.57e6, thickness_m: 1e-3 };
const run = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i });
const out = (i: Partial<typeof base> = {}) => run(i).outputs as Record<string, number>;
const failed = (i: Partial<typeof base>) => run(i).checks.filter((k) => !k.holds).map((k) => k.id);

/**
 * Crank–Nicolson on ∂H/∂t = D ∂²H/∂x², H(0, t) = sin ωt, H(L, t) = 0, from
 * rest; returns the amplitude and phase of the ω component over the last
 * period at each node. The grid is set by √(D/ω) alone.
 */
function diffusionResponse(D: number, omega: number, periods: number): { dx: number; amp: number[]; phase: number[] } {
  const ell = Math.sqrt(D / omega);
  const N = 600;
  const dx = ell / 40;
  const steps = 400;
  const dt = (2 * Math.PI) / omega / steps;
  const r = (D * dt) / (dx * dx);
  let H = new Array<number>(N + 1).fill(0);
  const a = new Array<number>(N + 1).fill(0);
  const b = new Array<number>(N + 1).fill(0);
  const cp = new Array<number>(N + 1).fill(0);
  const dp = new Array<number>(N + 1).fill(0);
  for (let n = 0; n < periods * steps; n++) {
    const tNext = (n + 1) * dt;
    const next = new Array<number>(N + 1).fill(0);
    next[0] = Math.sin(omega * tNext);
    // Thomas algorithm for −r/2 H_{j−1} + (1 + r) H_j − r/2 H_{j+1} = rhs_j, j = 1..N−1.
    for (let j = 1; j < N; j++) {
      let rhs = (r / 2) * H[j - 1]! + (1 - r) * H[j]! + (r / 2) * H[j + 1]!;
      if (j === 1) rhs += (r / 2) * next[0]!;
      const sub = j === 1 ? 0 : -r / 2;
      const denom = 1 + r - sub * cp[j - 1]!;
      cp[j] = -r / 2 / denom;
      dp[j] = (rhs - sub * dp[j - 1]!) / denom;
    }
    for (let j = N - 1; j >= 1; j--) next[j] = dp[j]! - cp[j]! * next[j + 1]!;
    H = next;
    if (n >= (periods - 1) * steps) {
      for (let j = 0; j <= N; j++) {
        a[j] += (2 / steps) * H[j]! * Math.cos(omega * tNext);
        b[j] += (2 / steps) * H[j]! * Math.sin(omega * tNext);
      }
    }
  }
  const amp = a.map((x, j) => Math.hypot(x, b[j]!));
  const phase = a.map((x, j) => Math.atan2(x, b[j]!));
  for (let j = 1; j <= N; j++) while (phase[j]! - phase[j - 1]! > Math.PI) phase[j] = phase[j]! - 2 * Math.PI;
  for (let j = 1; j <= N; j++) while (phase[j]! - phase[j - 1]! < -Math.PI) phase[j] = phase[j]! + 2 * Math.PI;
  return { dx, amp, phase };
}

/** Least-squares slope of y against j·dx over nodes lo..hi. */
function slope(y: readonly number[], dx: number, lo: number, hi: number): number {
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  const n = hi - lo + 1;
  for (let j = lo; j <= hi; j++) {
    const x = j * dx;
    sx += x; sy += y[j]!; sxx += x * x; sxy += x * y[j]!;
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

/**
 * Frequency-domain finite differences on H″ + k²H = 0, k² = ω²με + iωμσ,
 * H(0) = 1, H(L) = 0 (complex Thomas algorithm); returns ln|H| at the nodes.
 */
function maxwellLogAmplitude(k2re: number, k2im: number, dx: number, N: number): number[] {
  const dRe = -2 + k2re * dx * dx;
  const dIm = k2im * dx * dx;
  const cRe = new Array<number>(N + 1).fill(0), cIm = new Array<number>(N + 1).fill(0);
  const gRe = new Array<number>(N + 1).fill(0), gIm = new Array<number>(N + 1).fill(0);
  for (let j = 1; j < N; j++) {
    // denom = d − c_{j−1} (sub = sup = 1); rhs_1 = −H_0 = −1.
    const qRe = dRe - (j === 1 ? 0 : cRe[j - 1]!);
    const qIm = dIm - (j === 1 ? 0 : cIm[j - 1]!);
    const m2 = qRe * qRe + qIm * qIm;
    cRe[j] = qRe / m2;
    cIm[j] = -qIm / m2;
    const rRe = (j === 1 ? -1 : 0) - (j === 1 ? 0 : gRe[j - 1]!);
    const rIm = j === 1 ? 0 : -gIm[j - 1]!;
    gRe[j] = (rRe * qRe + rIm * qIm) / m2;
    gIm[j] = (rIm * qRe - rRe * qIm) / m2;
  }
  const hRe = new Array<number>(N + 1).fill(0), hIm = new Array<number>(N + 1).fill(0);
  hRe[0] = 1;
  for (let j = N - 1; j >= 1; j--) {
    hRe[j] = gRe[j]! - (cRe[j]! * hRe[j + 1]! - cIm[j]! * hIm[j + 1]!);
    hIm[j] = gIm[j]! - (cRe[j]! * hIm[j + 1]! + cIm[j]! * hRe[j + 1]!);
  }
  return hRe.map((x, j) => Math.log(Math.hypot(x, hIm[j]!)));
}

describe('case-skin-depth — δ and R_s', () => {
  it('copper (ρ = 1.68e-8 Ω·m) at 1 MHz: δ = √(2ρ/(ωμ0)) ≈ 65.2 µm by hand; at 60 Hz ≈ 8.4 mm', () => {
    const hand = Math.sqrt((2 * 1.68e-8) / (2 * Math.PI * 1e6 * 4 * Math.PI * 1e-7));
    // μ0 = 4π×10⁻⁷ is the pre-2019 exact value; CODATA 2018 differs by 5.4e-10.
    expect(Math.abs(out().delta_m / hand - 1)).toBeLessThan(1e-9);
    expect(out().delta_m).toBeCloseTo(65.23e-6, 8);
    expect(out({ f_Hz: 60 }).delta_m).toBeCloseTo(8.42e-3, 5);
  });

  it('μ0 is CODATA 2018 and ε0 = 1/(μ0c²) reproduces CODATA 2018 ε0 = 8.8541878128e-12 F/m', () => {
    expect(MU_0_SI / (4 * Math.PI * 1e-7) - 1).toBeCloseTo(5.4e-10, 10);
    expect(Math.abs(EPS_0_SI / 8.8541878128e-12 - 1)).toBeLessThan(1e-10);
  });

  it('R_s = ρ/δ = √(ωμρ/2), and δ scales as 1/√(f μ_r)', () => {
    expect(out().R_s_ohm).toBeCloseTo(Math.sqrt((2 * Math.PI * 1e6 * MU_0_SI * 1.68e-8) / 2), 15);
    expect(out({ f_Hz: 4e6 }).delta_m / out().delta_m).toBeCloseTo(0.5, 14);
    expect(out({ mu_r: 100 }).delta_m / out().delta_m).toBeCloseTo(0.1, 14);
  });

  it('control: the check would catch a dropped factor 2 (δ = √(ρ/(ωμ)) is off by √2)', () => {
    const wrong = Math.sqrt(1.68e-8 / (2 * Math.PI * 1e6 * MU_0_SI));
    expect(Math.abs(out().delta_m / wrong - 1)).toBeGreaterThan(0.4);
  });
});

describe('case-skin-depth — the parent, solved numerically', () => {
  it('Crank–Nicolson on the driven diffusion equation: amplitude and phase both fall by one unit per δ (to 2e-4)', () => {
    const rho = 1.68e-8;
    const omega = 2 * Math.PI * 1e6;
    const { dx, amp, phase } = diffusionResponse(rho / MU_0_SI, omega, 30);
    const lnA = amp.map((x) => Math.log(x));
    // Nodes 40..200: x from √(D/ω) to 5√(D/ω), about 0.7δ to 3.5δ, far from the H(L) = 0 wall.
    const fromAmplitude = -1 / slope(lnA, dx, 40, 200);
    const fromPhase = -1 / slope(phase, dx, 40, 200);
    expect(Math.abs(fromAmplitude / out().delta_m - 1)).toBeLessThan(2e-4);
    expect(Math.abs(fromPhase / out().delta_m - 1)).toBeLessThan(2e-4);
  });

  it('frequency-domain FD on the full 1-D Maxwell equation: its decay length is delta_maxwell_m, for a metal and for doped silicon', () => {
    for (const i of [{}, { rho_ohm_m: 0.1, f_Hz: 1e10, eps_r: 11.7, thickness_m: 1e-2 }]) {
      const o = out(i);
      const p = { ...base, ...i };
      const omega = 2 * Math.PI * p.f_Hz;
      const k2re = omega * omega * MU_0_SI * p.mu_r * p.eps_r * EPS_0_SI;
      const k2im = (omega * MU_0_SI * p.mu_r) / p.rho_ohm_m;
      const scale = 1 / Math.sqrt(Math.hypot(k2re, k2im));
      const dx = scale / 60;
      const N = 1500;
      const lnA = maxwellLogAmplitude(k2re, k2im, dx, N);
      const numeric = -1 / slope(lnA, dx, 60, 300);
      expect(Math.abs(numeric / o.delta_maxwell_m - 1), JSON.stringify(i)).toBeLessThan(1e-4);
    }
  });

  it('in doped silicon at 10 GHz the parent penetrates 36% deeper than δ; in copper the two agree to 1e-12', () => {
    const si = out({ rho_ohm_m: 0.1, f_Hz: 1e10, eps_r: 11.7, thickness_m: 1e-2 });
    expect(si.delta_maxwell_m / si.delta_m).toBeCloseTo(1.358, 3);
    expect(Math.abs(out().maxwell_deviation)).toBeLessThan(1e-12);
  });

  it('1/Im k has the right limits: δ at ωε/σ → 0, and the lossy-dielectric 2ρ√(ε/μ) at ωε/σ ≫ 1', () => {
    expect(maxwellDepthFactor(0)).toBe(1);
    expect(maxwellDepthFactor(1e-6) - 1).toBeCloseTo(5e-7, 12);
    // Dielectric limit: attenuation (σ/2)√(μ/ε), so the depth is (2/σ)√(ε/μ) = δ√(2r).
    const o = out({ rho_ohm_m: 1e4, f_Hz: 1e10, eps_r: 4 });
    const dielectric = 2 * 1e4 * Math.sqrt((4 * EPS_0_SI) / MU_0_SI);
    expect(Math.abs(o.delta_maxwell_m / dielectric - 1)).toBeLessThan(1e-4);
  });
});

describe('case-skin-depth — regime checks', () => {
  it('each threshold fires on its own side: l/δ, ωτ, ωε/σ and d/δ', () => {
    const d = out().delta_m;
    expect(failed({ l_mfp_m: 0.1 * d * 0.999 })).toEqual([]);
    expect(failed({ l_mfp_m: 0.1 * d * 1.001, v_carrier_m_per_s: 1e12 })).toEqual(['local']);
    const omega = 2 * Math.PI * 1e6;
    expect(failed({ v_carrier_m_per_s: (omega * 39e-9) / 0.1 / 1.001 })).toEqual(['dc-conductivity']);
    expect(failed({ thickness_m: 5 * d * 0.999 })).toEqual(['thick']);
    expect(failed({ thickness_m: 5 * d * 1.001 })).toEqual([]);
    expect(failed({ rho_ohm_m: 0.01 / (omega * EPS_0_SI) * 1.001, l_mfp_m: 1e-12, thickness_m: 1e3 })).toEqual(['good-conductor']);
  });

  it('cold copper at 10 GHz fails both the local and the DC-conductivity premise (ωτ ≈ 1.6)', () => {
    const i = { rho_ohm_m: 1.68e-11, f_Hz: 1e10, l_mfp_m: 39e-6 };
    expect(out(i).omega_tau).toBeCloseTo((2 * Math.PI * 1e10 * 39e-6) / 1.57e6, 12);
    expect(failed(i)).toEqual(['local', 'dc-conductivity']);
  });

  it('back_field_ratio is e^{−d/δ}: e^{−5} at the thickness threshold', () => {
    expect(out({ thickness_m: 5 * out().delta_m }).back_field_ratio).toBeCloseTo(Math.exp(-5), 14);
  });

  it('refuses a non-positive input', () => {
    expect(() => run({ rho_ohm_m: 0 })).toThrow(/rho_ohm_m must be/);
    expect(() => run({ thickness_m: -1 })).toThrow(/thickness_m must be/);
  });
});
