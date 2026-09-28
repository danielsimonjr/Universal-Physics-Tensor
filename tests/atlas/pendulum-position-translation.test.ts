/**
 * Witnesses W7x and W7xa for `ab-pendulum-linear`'s declared translation of
 * its relative period error into an UPPER BOUND on the pointwise position
 * error |θ(t) − θ_lin(t)| (CLI audit §14 item 8).
 *
 * The bound is checked against an INDEPENDENT integration of both equations
 * of motion (`_ode.ts` RK4, at a dimensioned T0 = 2 the source never uses),
 * not against the source's integrator. Each check is paired with a control
 * showing it fails on a plausible wrong bound: without the waveform term,
 * with the drift term halved, and with the waveform term alone.
 *
 * @module tests/atlas/pendulum-position-translation
 */
import { describe, expect, it } from 'vitest';

import { AB_PENDULUM_LINEAR, pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import { theta0OfPeriodError } from '../../src/atlas/oscillators/pendulum-motion.js';
import {
  FOURIER_SERIES_THETA0S,
  fourierSeriesCheck,
  fundamentalCoefficient,
  PENDULUM_POSITION_TRANSLATION as TR,
  waveformBound,
} from '../../src/atlas/oscillators/position-translation.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { runTranslationCheck } from '../../src/atlas/translation-registry.js';
import type { DominanceWitnessSpec } from '../../src/atlas/witness-dominance.js';
import { runDominanceWitness } from '../../src/atlas/witness-dominance.js';
import { rk4 } from './_ode.js';

const T0 = 2;

/** |θ − θ_lin| at every step, both released from rest at θ0, T0 = 2. */
function measuredError(theta0: number, tEnd: number, stepsPerPeriod: number): { t: number; e: number }[] {
  const w2 = ((2 * Math.PI) / T0) ** 2;
  const steps = Math.ceil((tEnd / T0) * stepsPerPeriod);
  const { samples } = rk4((_t, y) => [y[1]!, -w2 * Math.sin(y[0]!), y[3]!, -w2 * y[2]!], [theta0, 0, theta0, 0], 0, tEnd, steps);
  return samples.map((s) => ({ t: s.t, e: Math.abs(s.y[0]! - s.y[2]!) }));
}

/** max over the samples of measured / candidate(t). */
function worstRatio(rows: { t: number; e: number }[], candidate: (t: number) => number): number {
  let worst = 0;
  for (const r of rows.slice(1)) worst = Math.max(worst, r.e / candidate(r.t));
  return worst;
}

describe('W7x — B(t) = W̄ + 2θ0 sin(min(Δφ, π)/2) bounds |θ − θ_lin| against an independent RK4', () => {
  for (const theta0 of [0.1, 0.3, 0.5]) {
    it(`holds at every step to antiphase and is near-sharp, θ0 = ${theta0}, T0 = ${T0}`, () => {
      const eps = pendulumPeriodErrorAt({ theta0 });
      const tAntiphase = (T0 * (1 + eps)) / (2 * eps);
      const rows = measuredError(theta0, Math.min(tAntiphase, 300 * T0), 800);
      const B = (t: number) => TR.errorAt(eps, t, { T0 });
      const ratio = worstRatio(rows, B);
      expect(ratio).toBeLessThan(1);
      expect(ratio).toBeGreaterThan(0.99);
    });

    it(`controls: the bound without W̄, with the drift halved, or W̄ alone each fails, θ0 = ${theta0}`, () => {
      const eps = pendulumPeriodErrorAt({ theta0 });
      const tAntiphase = (T0 * (1 + eps)) / (2 * eps);
      const rows = measuredError(theta0, Math.min(tAntiphase, 300 * T0), 800);
      const W = waveformBound(theta0);
      const drift = (t: number) => 2 * theta0 * Math.sin(Math.min((2 * Math.PI * (t / T0) * eps) / (1 + eps), Math.PI) / 2);
      expect(worstRatio(rows, drift)).toBeGreaterThan(1.02);
      expect(worstRatio(rows, (t) => W + drift(t) / 2)).toBeGreaterThan(1.5);
      expect(worstRatio(rows, () => W)).toBeGreaterThan(100);
    });
  }

  it('W̄ bounds the waveform distortion |θ(t) − θ0 cos(2πt/T)| over one pendulum period; θ0³/192 does not', () => {
    for (const theta0 of [0.2, 0.5]) {
      const T = T0 * (1 + pendulumPeriodErrorAt({ theta0 }));
      const w2 = ((2 * Math.PI) / T0) ** 2;
      const { samples } = rk4((_t, y) => [y[1]!, -w2 * Math.sin(y[0]!)], [theta0, 0], 0, T, 20000);
      const W = samples.reduce((w, s) => Math.max(w, Math.abs(s.y[0]! - theta0 * Math.cos((2 * Math.PI * s.t) / T))), 0);
      expect(W).toBeLessThan(waveformBound(theta0));
      expect(W).toBeGreaterThan(0.7 * waveformBound(theta0));
      expect(W).toBeGreaterThan(theta0 ** 3 / 192);
    }
  });

  it('the fundamental coefficient 8√q/(1+q) matches a projection of the independent RK4 period', () => {
    const theta0 = 0.4;
    const T = 1 + pendulumPeriodErrorAt({ theta0 });
    const n = 4000;
    const { samples } = rk4((_t, y) => [y[1]!, -((2 * Math.PI) ** 2) * Math.sin(y[0]!)], [theta0, 0], 0, T, n);
    const a0 = (2 / n) * samples.slice(0, n).reduce((acc, s) => acc + s.y[0]! * Math.cos((2 * Math.PI * s.t) / T), 0);
    expect(Math.abs(a0 - fundamentalCoefficient(theta0))).toBeLessThan(1e-10);
    // Control: the small-amplitude value θ0 is off by ≈ θ0³/192, far outside 1e-10.
    expect(Math.abs(a0 - theta0)).toBeGreaterThan(theta0 ** 3 / 400);
  });
});

describe('W7x — the horizon, the floor and the domain supremum', () => {
  it('B reaches the tolerance exactly at t*, and the measured error does not reach it before t*', () => {
    const theta0 = 0.3;
    const eps = pendulumPeriodErrorAt({ theta0 });
    for (const tol of [0.01, 0.1]) {
      const tStar = TR.horizonFor(eps, tol, { T0 });
      expect(TR.errorAt(eps, tStar, { T0 })).toBeCloseTo(tol, 12);
      const rows = measuredError(theta0, tStar * 1.5, 800);
      const first = rows.find((r) => r.e >= tol)!;
      expect(first.t).toBeGreaterThanOrEqual(tStar);
      // Not vacuous: the envelope is attained at zero crossings, every T0/2, so the
      // measured error reaches the tolerance within one period after t*.
      expect(first.t).toBeLessThan(tStar + T0);
    }
  });

  it('a tolerance below the waveform floor W̄ has no horizon (NaN), and one above 2θ0 + W̄ never runs out', () => {
    const eps = pendulumPeriodErrorAt({ theta0: 0.3 });
    const W = TR.floor!(eps);
    expect(W).toBeCloseTo(waveformBound(0.3), 15);
    expect(TR.horizonFor(eps, W * 0.99, { T0 })).toBeNaN();
    expect(TR.horizonFor(eps, W + 0.6 + 1e-9, { T0 })).toBe(Infinity);
  });

  it('θ0 is recovered from ε, and B at the domain supremum gives the shortest horizon', () => {
    for (const theta0 of [0.01, 0.2, 0.5]) expect(theta0OfPeriodError(pendulumPeriodErrorAt({ theta0 }))).toBeCloseTo(theta0, 12);
    const sup = TR.horizonFor(AB_PENDULUM_LINEAR.bound!.delta, 0.05, { T0 });
    for (const theta0 of [0.05, 0.2, 0.35, 0.5]) {
      expect(TR.horizonFor(pendulumPeriodErrorAt({ theta0 }), 0.05, { T0 })).toBeGreaterThanOrEqual(sup * (1 - 1e-12));
    }
  });

  it('is declared an upper bound, against the bound it consumes, and undefined without T0', () => {
    expect(TR.errorKind).toBe('upper-bound');
    expect(TR.fromNorm).toBe(AB_PENDULUM_LINEAR.bound!.norm);
    expect(TR.errorAt(0.01, 1, {})).toBeNaN();
    expect(TR.horizonFor(0.01, 0.1, {})).toBeNaN();
  });
});

describe('W7x — the executable witnesses, the point witness and the evidence derived from them', () => {
  it('the registered W7x, W7xa and W7xs are checked', () => {
    for (const c of TR.checks) expect(runTranslationCheck(c).status).toBe('checked');
  });

  it('control: the registered dominance check against the bound without W̄ is refuted', () => {
    const w7x = TR.checks[0] as DominanceWitnessSpec;
    const W = waveformBound(0.3);
    const r = runDominanceWitness({
      ...w7x,
      evaluate: (res) => {
        const { measured, bound } = w7x.evaluate(res);
        return { measured, bound: bound.map((b) => b - W) };
      },
    });
    expect(r.status).toBe('refuted');
  });

  it('the point witness is checked and its control refuted across the regime, including below the fixture', () => {
    for (const theta0 of [0.001, 0.05, 0.5]) {
      const pc = TR.pointCheck(pendulumPeriodErrorAt({ theta0 }));
      expect('unavailable' in pc).toBe(false);
      if ('unavailable' in pc) continue;
      expect(runTranslationCheck(pc.check).status).toBe('checked');
      expect(runTranslationCheck(pc.control).status).toBe('refuted');
    }
    expect('unavailable' in TR.pointCheck(0)).toBe(true);
  });

  it('derives numerically-supported only from passing witnesses, and never formally-proved', () => {
    expect([...deriveEvidence({ witnesses: TR.witnesses }, new Set(['W7x', 'W7xa', 'W7xs']))]).toEqual(['numerically-supported']);
    expect([...deriveEvidence({ witnesses: TR.witnesses }, NO_PASSING_WITNESSES)]).toEqual(['proposed']);
    expect('formalRef' in TR).toBe(false);
  });
});

/** K(m) = ∫₀^{π/2} dφ/√(1 − m sin²φ) by composite Simpson on 4096 intervals: independent of the source's AGM. */
function ellipticK(m: number): number {
  const n = 4096;
  const h = Math.PI / 2 / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    s += w / Math.sqrt(1 - m * Math.sin(i * h) ** 2);
  }
  return (s * h) / 3;
}

describe('W7xs — the Fourier-series premise, checked against RK4 across the domain (audit I8 limit)', () => {
  it('is registered, checked, and names its grid in the premise it supports', () => {
    const w7xs = TR.checks.find((c) => c.id === 'W7xs');
    expect(w7xs).toBeDefined();
    expect(runTranslationCheck(w7xs!).status).toBe('checked');
    expect(TR.witnesses.map((w) => w.id)).toContain('W7xs');
    expect(FOURIER_SERIES_THETA0S).toEqual([0.01, 0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(TR.premises.join(' ')).toMatch(/Fourier series .* machine-checked against RK4 at θ0 ∈ \{0\.01, 0\.1, 0\.2, 0\.3, 0\.4, 0\.5\} \(W7xs\)/);
  });

  it('control: the same check with (1 − q^{2n+1}) for (1 + q^{2n+1}) in aₙ is refuted', () => {
    expect(runTranslationCheck(fourierSeriesCheck('W7xs-control', 'minus')).status).toBe('refuted');
  });

  it('second method: the coefficients from a quadrature nome match an independent RK4 projection, and Σ(−1)ⁿaₙ = θ0', () => {
    for (const theta0 of [0.1, 0.5]) {
      const m = Math.sin(theta0 / 2) ** 2;
      const q = Math.exp((-Math.PI * ellipticK(1 - m)) / ellipticK(m));
      const a = (n: number) => (8 * q ** (n + 0.5)) / ((2 * n + 1) * (1 + q ** (2 * n + 1)));
      let alt = 0;
      for (let n = 0; n < 12; n++) alt += (-1) ** n * a(n);
      expect(Math.abs(alt - theta0)).toBeLessThan(1e-12);
      // One period T = 4K(m)/(2π) T0 at T0 = 1, by the independent integrator.
      const T = (4 * ellipticK(m)) / (2 * Math.PI);
      const steps = 4000;
      const { samples } = rk4((_t, y) => [y[1]!, -((2 * Math.PI) ** 2) * Math.sin(y[0]!)], [theta0, 0], 0, T, steps);
      for (const n of [0, 1, 2]) {
        let s = 0;
        for (let i = 0; i < steps; i++) s += samples[i]!.y[0]! * Math.cos(((2 * n + 1) * 2 * Math.PI * i) / steps);
        expect(Math.abs((2 * s) / steps - (-1) ** n * a(n))).toBeLessThan(1e-9);
      }
      // Not vacuous: the (1 − q) transcription moves a₀ by far more than the tolerance.
      expect(Math.abs((8 * Math.sqrt(q)) / (1 - q) - a(0))).toBeGreaterThan(1e-6);
    }
  });
});