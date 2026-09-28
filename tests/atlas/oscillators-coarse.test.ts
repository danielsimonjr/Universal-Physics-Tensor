/**
 * W9 (dispersion + information loss) and W9b (the chain integrated) for the
 * coarse-graining bridge, and W3 (Buckingham survival) and W3b (isochrony) for
 * the `ax-cubic-spring-lc` rejection.
 */

import { describe, expect, it } from 'vitest';
import { rk4 } from './_ode.js';
import { measureChainDispersionError } from '../../src/atlas/oscillators/limit-witnesses.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';

import { dim } from '../../src/dimensional/ast-builders.js';
import { buckinghamPi } from '../../src/dimensional/buckingham.js';
import { LENGTH, MASS } from '../../src/dimensional/types.js';
import {
  BRIDGE_CHAIN_WAVE,
  chainWaveSpeed,
  continuumDispersion,
  dispersionErrorApproximation,
  latticeBandEdge,
  latticeDispersion,
} from '../../src/atlas/oscillators/bridges-coarse.js';
import { CUBIC_STIFFNESS, SPRING_CONSTANT } from '../../src/atlas/oscillators/dimensions.js';
import { getAtlasModel } from '../../src/atlas/oscillators/models.js';
import { ATLAS_REJECTIONS } from '../../src/atlas/oscillators/rejections.js';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';
import type { RegisteredNumericWitness } from '../../src/atlas/witness-specs.js';

describe('W9 — chain → wave coarse-graining, dispersion', () => {
  const kappa = 1;
  const m = 1;
  const a = 1;

  it('matches the (qa)²/24 leading-order error within 0.5% of itself', () => {
    // Convention: with x = qa/2, 1 − sin x / x = x²/6 − x⁴/120, so (qa)²/24
    // OVERESTIMATES the true error and deviation = (true − approx)/approx is
    // NEGATIVE, ≈ −(qa)²/80. The assertion below is on the MAGNITUDE, so the
    // sign convention does not change it.
    for (const qa of [0.1, 0.2, 0.4]) {
      const q = qa / a;
      const wLattice = latticeDispersion(q, a, kappa, m);
      const wContinuum = continuumDispersion(q, a, kappa, m);
      const trueError = 1 - wLattice / wContinuum;
      const approx = dispersionErrorApproximation(qa);
      const deviation = (trueError - approx) / approx;

      expect(deviation).toBeLessThan(0); // the approximation overestimates
      expect(Math.abs(deviation)).toBeLessThan(0.005);
      // and the deviation itself is the next Taylor term, −(qa)²/80.
      expect(deviation).toBeCloseTo(-(qa * qa) / 80, 5);
    }
  });

  it('carries the wave speed c = a √(κ/m) into the continuum model', () => {
    expect(chainWaveSpeed(a, kappa, m)).toBeCloseTo(1, 12);
    expect(chainWaveSpeed(2, 8, 2)).toBeCloseTo(4, 12);
  });

  it('loses the band edge: ω(qa = π) = 2√(κ/m) on the lattice, unbounded in the continuum', () => {
    const q = Math.PI / a;
    expect(latticeDispersion(q, a, kappa, m)).toBeCloseTo(2 * Math.sqrt(kappa / m), 12);
    expect(latticeBandEdge(kappa, m)).toBeCloseTo(2, 12);

    // The continuum relation has no maximum: it grows without bound in q,
    // so no continuum wavenumber reproduces the lattice band edge.
    const edge = latticeBandEdge(kappa, m);
    for (const q2 of [10, 1e3, 1e6]) {
      expect(continuumDispersion(q2, a, kappa, m)).toBeGreaterThan(edge);
    }
    // Above the edge the lattice simply folds back; it never exceeds 2√(κ/m).
    for (let qa = 0; qa <= 4 * Math.PI; qa += Math.PI / 64) {
      expect(latticeDispersion(qa / a, a, kappa, m)).toBeLessThanOrEqual(edge + 1e-12);
    }
  });

  it('records the loss as a bridge field and a counterexample', () => {
    expect(BRIDGE_CHAIN_WAVE.relation).toBe('coarse-graining');
    expect(BRIDGE_CHAIN_WAVE.premises).toEqual(['model-chain']);
    expect(BRIDGE_CHAIN_WAVE.conclusion).toBe('model-wave-1d');
    expect(BRIDGE_CHAIN_WAVE.doesNotPreserve).toContain('modes with q > π/a');
    expect(BRIDGE_CHAIN_WAVE.sideConditions).toContain('long-wavelength, qa ≪ 1');
    expect(BRIDGE_CHAIN_WAVE.witnesses.map((w) => w.id)).toContain('W9');
    expect(BRIDGE_CHAIN_WAVE.counterexamples.map((c) => c.witness)).toContain('W9');
    // The premises and conclusion resolve to real models.
    expect(getAtlasModel('model-chain').id).toBe('model-chain');
    expect(getAtlasModel('model-wave-1d').id).toBe('model-wave-1d');
  });
});

describe('W3 — Buckingham survival, ax-cubic-spring-lc', () => {
  it('leaves the cubic spring exactly one group ∝ {β: 1, x0: 2, k: −1, m: 0}', () => {
    const result = buckinghamPi([
      { name: 'm', dim: MASS },
      { name: 'k', dim: SPRING_CONSTANT },
      { name: 'beta', dim: CUBIC_STIFFNESS },
      { name: 'x0', dim: LENGTH },
    ]);

    expect(result.verdict).toBe('single-invariant');
    expect(result.piGroups).toHaveLength(1);

    const e = result.piGroups[0].exponents;
    expect(e.beta).not.toBe(0);
    const scale = e.beta; // normalise so β carries exponent 1
    expect(e.x0 / scale).toBeCloseTo(2, 12);
    expect(e.k / scale).toBeCloseTo(-1, 12);
    expect(e.m / scale).toBeCloseTo(0, 12);
  });

  it('leaves the LC model dimensionally independent (no group at all)', () => {
    // The brief's variable set {L, C, q0}; q0 is charge, I·T.
    const withCharge = buckinghamPi([
      { name: 'L', dim: dim(2, 1, -2, -2) },
      { name: 'C', dim: dim(-2, -1, 4, 2) },
      { name: 'q0', dim: dim(0, 0, 1, 1) },
    ]);
    expect(withCharge.verdict).toBe('dimensionally-independent');

    // …and the model as the atlas actually declares it, {L, C}: same verdict.
    const declared = buckinghamPi(getAtlasModel('model-lc').parameters);
    expect(declared.verdict).toBe('dimensionally-independent');
  });

  it('records the rejection with witness W3', () => {
    const rejection = ATLAS_REJECTIONS.find((r) => r.id === 'ax-cubic-spring-lc');
    expect(rejection).toBeDefined();
    expect(rejection?.claimed).toBe('exact-equivalence');
    // The claimed relation runs cubic spring → LC; LC is the conclusion, not also a premise (D6).
    expect(rejection?.premises).toEqual(['model-cubic-spring']);
    expect(rejection?.conclusion).toBe('model-lc');
    expect(rejection?.survivingGroup).toBe('β x0² / k');
    expect(rejection?.witnesses.map((w) => w.id)).toContain('W3');
  });
});

describe('rejections — the conclusion is not also a premise (persona finding D6)', () => {
  const rejections = ATLAS_FAMILIES.flatMap((f) => f.rejections);

  it('the atlas has at least one rejection to check', () => {
    expect(rejections.length).toBeGreaterThan(0);
  });

  it.each(rejections.map((r) => [r.id, r] as const))('%s lists its conclusion only as the conclusion', (_id, r) => {
    expect(r.premises).not.toContain(r.conclusion);
  });
});

/** The first time after 0 at which `x(t)` crosses zero, by linear interpolation between RK4 samples. */
function firstZero(samples: ReadonlyArray<{ t: number; y: readonly number[] }>, index = 0): number {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (a.y[index]! > 0 && b.y[index]! <= 0) return a.t + ((b.t - a.t) * a.y[index]!) / (a.y[index]! - b.y[index]!);
  }
  throw new Error('no zero crossing in the integration window');
}

describe('W3b — isochrony: the cubic spring period depends on amplitude, the linear period does not', () => {
  // Any change of variables that rescales time by a constant multiplies EVERY period by the same
  // factor, so the ratio of two periods is an invariant. The LC (linear) oscillator is isochronous:
  // every amplitude has the same period. If the cubic spring's periods differ across amplitudes, no
  // such change of variables can map it onto the LC. This is the decisive fact behind the rejection;
  // the surviving group β x0²/k (W3) is necessary evidence, not sufficient.
  const periodAt = (beta: number, amplitude: number): number => {
    const { samples } = rk4((_t, y) => [y[1]!, -(y[0]! + beta * y[0]! ** 3)], [amplitude, 0], 0, Math.PI / 2 + 0.05, 20_000);
    return 4 * firstZero(samples);
  };

  it('the linear oscillator (β = 0) has period 2π at every amplitude', () => {
    for (const A of [0.5, 1, 2]) expect(Math.abs(periodAt(0, A) - 2 * Math.PI)).toBeLessThan(1e-6);
  });

  it('the cubic spring (β x0²/k = 0.1 at A = 1) does not: its periods spread by more than 10%', () => {
    const periods = [0.5, 1, 2].map((A) => periodAt(0.1, A));
    expect(periods[0]).toBeCloseTo(6.22514, 4);
    expect(periods[1]).toBeCloseTo(6.06066, 4);
    expect(periods[2]).toBeCloseTo(5.51685, 4);
    expect(Math.max(...periods) / Math.min(...periods) - 1).toBeGreaterThan(0.1);
  });
});

describe('W9b — the chain integrated on a ring: dispersion from the dynamics, and superposition', () => {
  // W9 compares two formulas. This witness integrates the model itself,
  // m u_n″ = κ(u_{n+1} − 2u_n + u_{n−1}), on a ring of N masses, so a change to the dynamics fails it.
  const N = 64;
  const [m, kappa, a] = [1, 1, 1];

  const ring = (kappaSim: number, onsiteCubic = 0) => (_t: number, y: readonly number[]): number[] => {
    const u = y.slice(0, N);
    const v = y.slice(N);
    const acc = u.map((un, n) => (kappaSim / m) * (u[(n + 1) % N]! - 2 * un + u[(n - 1 + N) % N]!) - onsiteCubic * un ** 3);
    return [...v, ...acc];
  };
  const mode = (j: number, amp = 1, phase = 0): number[] =>
    Array.from({ length: N }, (_, n) => amp * Math.cos((2 * Math.PI * j * n) / N + phase));

  /** ω measured from u_0(t) = cos ωt, started at rest in mode `j`. */
  const measuredOmega = (j: number, kappaSim = kappa): number => {
    const qa = (2 * Math.PI * j) / N;
    const tQuarter = Math.PI / (2 * latticeDispersion(qa / a, a, kappa, m));
    const { samples } = rk4(ring(kappaSim), [...mode(j), ...new Array(N).fill(0)], 0, 1.3 * tQuarter, Math.ceil(1.3 * tQuarter * 1000));
    return Math.PI / (2 * firstZero(samples));
  };

  it('the measured ω matches the lattice dispersion within 1e-9, and the coarse-graining error is (qa)²/24 within 1%', () => {
    for (const j of [2, 4]) {
      const qa = (2 * Math.PI * j) / N;
      const omega = measuredOmega(j);
      expect(Math.abs(omega / latticeDispersion(qa / a, a, kappa, m) - 1)).toBeLessThan(1e-9);
      const coarseError = 1 - omega / continuumDispersion(qa / a, a, kappa, m);
      expect(Math.abs(coarseError / dispersionErrorApproximation(qa) - 1)).toBeLessThan(0.01);
    }
  });

  it('NEGATIVE CONTROL: integrating with a 10% wrong κ misses the dispersion by more than 1e-3', () => {
    const qa = (2 * Math.PI * 2) / N;
    expect(Math.abs(measuredOmega(2, 1.1 * kappa) / latticeDispersion(qa / a, a, kappa, m) - 1)).toBeGreaterThan(1e-3);
  });

  const endState = (f: (t: number, y: readonly number[]) => number[], u0: readonly number[]): number[] =>
    rk4(f, [...u0, ...new Array(N).fill(0)], 0, 5, 5000).y;
  const superpositionGap = (f: (t: number, y: readonly number[]) => number[]): number => {
    const A = mode(2);
    const B = mode(5, 0.5, 0.3);
    const sum = endState(f, A.map((x, n) => x + B[n]!));
    const a1 = endState(f, A);
    const b1 = endState(f, B);
    return Math.max(...sum.map((x, i) => Math.abs(x - (a1[i]! + b1[i]!))));
  };

  it('linearity: the chain obeys superposition within 1e-10', () => {
    expect(superpositionGap(ring(kappa))).toBeLessThan(1e-10);
  });

  it('NEGATIVE CONTROL: a cubic on-site force breaks superposition by more than 1e-3', () => {
    expect(superpositionGap(ring(kappa, 0.5))).toBeGreaterThan(1e-3);
  });
});

describe('W9 — the registered in-process spec: the ring integrated, against the dispersion formulas', () => {
  const entry = (): RegisteredNumericWitness => {
    const e = WITNESS_REGISTRY.find((w) => w.spec.id === 'W9');
    if (e === undefined || e.kind !== 'numeric') throw new Error('W9: not a registered numeric witness');
    return e;
  };
  const qaAt = (r: number): number => (2 * Math.PI) / (16 * r);

  it('is registered under ab-chain-wave and attributed to the preserved long-wavelength dispersion', () => {
    const e = entry();
    expect(e.recordId).toBe('ab-chain-wave');
    expect(e.claim?.name).toBe('preserves');
    expect(e.claim?.name === 'preserves' ? e.claim.item : null).toBe('long-wavelength dispersion ω ≈ c q');
    expect(BRIDGE_CHAIN_WAVE.preserves).toContain('long-wavelength dispersion ω ≈ c q');
    expect(e.claim?.at(e.spec.fineResolution)).toEqual({ qa: qaAt(2) });
  });

  it('integrates the ring: its value equals (1 − ω_lattice/ω_continuum)/((qa)²/24) from the formulas within 1e-9', () => {
    // Second method: the spec reads ω off the integrated motion; the formulas are the closed-form dispersions.
    const { spec } = entry();
    for (const r of [spec.coarseResolution, spec.fineResolution]) {
      const qa = qaAt(r);
      const formula = (1 - latticeDispersion(qa, 1, 1, 1) / continuumDispersion(qa, 1, 1, 1)) / dispersionErrorApproximation(qa);
      expect(Math.abs(spec.evaluate(r) - formula)).toBeLessThan(1e-9);
    }
  });

  it('checks within 0.5% of (qa)²/24 at N = 32, the deviation is −(qa)²/80, and doubling N cuts it about 4×', () => {
    const { spec } = entry();
    const qa = qaAt(spec.fineResolution);
    expect(spec.evaluate(spec.fineResolution) - 1).toBeCloseTo(-(qa * qa) / 80, 5);
    const r = runNumericWitness(spec);
    expect(r.status).toBe('checked');
    expect(r.convergence!.ratio).toBeGreaterThan(3.9);
    expect(r.convergence!.ratio).toBeLessThan(4.1);
  });

  it('the measurement itself, off the fixture: the integrated 1 − ω/(cq) at N = 24 equals the formulas within 1e-9', () => {
    const qa = (2 * Math.PI) / 24;
    const formula = 1 - latticeDispersion(qa, 1, 1, 1) / continuumDispersion(qa, 1, 1, 1);
    expect(Math.abs(measureChainDispersionError(24) - formula)).toBeLessThan(1e-9);
  });

  it('NEGATIVE CONTROL: the coefficient (qa)²/12 in place of (qa)²/24 is refuted', () => {
    const { spec } = entry();
    const wrong = { ...spec, evaluate: (r: number) => spec.evaluate(r) / 2 };
    expect(runNumericWitness(wrong).status).toBe('refuted');
  });

  it('META-CHECK: the same assertion FAILS on the true spec (the control can fail)', () => {
    expect(runNumericWitness(entry().spec).status).not.toBe('refuted');
  });
});