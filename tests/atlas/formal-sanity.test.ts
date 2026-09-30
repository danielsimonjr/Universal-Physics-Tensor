/**
 * Atlas Phase 4, S4.6 — sanity lemmas for the formal references.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §3–§4.
 *
 * A formal proof of the WRONG statement proves nothing about the physics. A
 * `formalRef` earns `fidelity: 'sanity-lemmas'` only through this file: each
 * test instantiates the formal statement, as written in the proof assistant, on
 * a known case, and checks that the atlas record asserts the SAME thing there.
 * If the record and the formal statement ever disagree on a known case, the
 * reference is to a different claim and the fidelity is wrong.
 *
 * The pendulum lemmas instantiate the Physlib statement that
 * `PhysJS.Pendulum.linearizedEquationOfMotion_iff` imports. The rank-1 lemmas
 * instantiate each record's dispersion error, which is what
 * `covers_bound_delta` states.
 */

import { describe, expect, it } from 'vitest';
import { AB_PENDULUM_LINEAR, pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import {
  BRIDGE_TELEGRAPH_DIFFUSION,
  BRIDGE_TELEGRAPH_WAVE,
  TELEGRAPH_FICK_MAX_EPS,
  TELEGRAPH_WAVE_MIN_EPS,
} from '../../src/atlas/diffusion/bridges-closure.js';
import { telegraphSlowRateRatio, telegraphWaveFrequencyRatio } from '../../src/atlas/diffusion/numerics.js';
import { BRIDGE_KLEIN_GORDON_WAVE, KG_MAX_DISPERSION_RATIO } from '../../src/atlas/waves/bridges.js';
import { BRIDGE_KG_SCHRODINGER, BRIDGE_STIFF_STRING, KG_NR_MAX_X, STIFF_MAX_BETA } from '../../src/atlas/waves/bridges-closure.js';
import { kgNonrelativisticError, kleinGordonPhaseError, stiffStringPhaseError } from '../../src/atlas/waves/numerics.js';
import type { AtlasBridge } from '../../src/atlas/types.js';

/** A known pendulum: m = 0.3 kg, g = 9.81 m/s², ℓ = 1.2 m. */
const PENDULUM = { m: 0.3, g: 9.81, ell: 1.2 } as const;

describe('ab-pendulum-linear ↔ PhysJS.Pendulum.linearizedEquationOfMotion_iff', () => {
  it('the reference names the PhysJS theorem and a real fidelity', () => {
    const ref = AB_PENDULUM_LINEAR.formalRef;
    expect(ref).toBeDefined();
    expect(ref!.system).toBe('lean4-physjs');
    expect(ref!.statement).toBe('PhysJS.Pendulum.linearizedEquationOfMotion_iff');
    expect(ref!.fidelity).toBe('sanity-lemmas');
    expect(ref!.version).toContain('physjs@0e0594f6ec277b4e0f150c5287c17ab7507e8cc3');
    expect(ref!.covers).toContain('the transformation, not bound.delta');
    expect(ref!.covers).toContain('covers its statement only');
  });

  it('toHarmonicOscillator: mass I = mℓ², spring constant k = mgℓ, so √(k/I) = √(g/ℓ) — the record’s ω0² = g/ℓ', () => {
    // Lean: `toHarmonicOscillator.m := S.inertia` (= m ℓ²), `k := S.m * S.g * S.ℓ`,
    // and `toHarmonicOscillator_ω : S.toHarmonicOscillator.ω = S.ω` with ω = √(g/ℓ).
    const inertia = PENDULUM.m * PENDULUM.ell ** 2;
    const k = PENDULUM.m * PENDULUM.g * PENDULUM.ell;
    const omegaLean = Math.sqrt(k / inertia);
    const omegaRecord = Math.sqrt(PENDULUM.g / PENDULUM.ell);
    expect(omegaLean).toBeCloseTo(omegaRecord, 14);
    // The record states the same dictionary in prose.
    expect(AB_PENDULUM_LINEAR.transformation).toContain('ω0² = g/ℓ');
  });

  it('LinearizedEquationOfMotion: θ(t) = θ0 cos(ωt) satisfies θ̈ + ω²θ = 0 (FD residual → 0)', () => {
    // Lean: `LinearizedEquationOfMotion θ := ∀ t, ∂ₜ (∂ₜ θ) t + (S.ω ^ 2) • θ t = 0`.
    const omega = Math.sqrt(PENDULUM.g / PENDULUM.ell);
    const theta = (t: number) => 0.4 * Math.cos(omega * t);
    const residual = (h: number, t: number) =>
      Math.abs((theta(t + h) - 2 * theta(t) + theta(t - h)) / (h * h) + omega ** 2 * theta(t));
    // Measured: 1.093e-4 at h = 0.01, 2.733e-5 at h = 0.005 — second order, → 0.
    expect(residual(5e-3, 0.37)).toBeLessThan(3e-5);
    expect(residual(1e-2, 0.37) / residual(5e-3, 0.37)).toBeGreaterThan(3.9);
    expect(residual(1e-2, 0.37) / residual(5e-3, 0.37)).toBeLessThan(4.1);
  });

  it('norm_equationOfMotion_residual_le: the linearization error mgℓ|θ − sin θ| ≤ mgℓ|θ|³/6 across the record’s domain θ0 ≤ 0.5', () => {
    // Lean: ‖I θ̈ − τ(θ)‖ ≤ m g ℓ ‖θ‖³ / 6 along a solution of the linearized equation,
    // from `torque_sub_toHarmonicOscillator_force` = m g ℓ (θ − sin θ).
    const mgl = PENDULUM.m * PENDULUM.g * PENDULUM.ell;
    for (const th of [0.01, 0.1, 0.25, 0.4, 0.5]) {
      expect(mgl * Math.abs(th - Math.sin(th))).toBeLessThanOrEqual((mgl * th ** 3) / 6);
    }
    // At the record's domain edge the bound is tight to 1.2%: cubic, as both say.
    const edge = 0.5;
    expect((edge - Math.sin(edge)) / (edge ** 3 / 6)).toBeGreaterThan(0.98);
  });

  it('the formal statement is about the DYNAMICS dictionary, not the period bound — and the record’s bound is not claimed', () => {
    // Physlib's period results (`smallAnglePeriod_le_periodFormula`,
    // `strictMonoOn_periodFormula`) concern `periodFormula`, which Physlib's own
    // TODO has not yet identified with the period of the motion. They are
    // consistent with the record's bound — checked here — but they are NOT the
    // referenced statement, and the reference does not certify `delta`.
    expect(pendulumPeriodErrorAt({ theta0: 0 })).toBeCloseTo(0, 15);
    let prev = -1;
    for (const theta0 of [0.05, 0.1, 0.2, 0.3, 0.4, 0.5]) {
      const e = pendulumPeriodErrorAt({ theta0 });
      expect(e).toBeGreaterThan(0); // T0 ≤ T(θ0): smallAnglePeriod_le_periodFormula
      expect(e).toBeGreaterThan(prev); // strict monotonicity: the edge value is the sup
      prev = e;
    }
  });
});

/**
 * Rank-1 lemmas: the error is monotone on the declared regime, and its value
 * at the edge equals `bound.delta`. A point outside the regime exceeds delta,
 * so a check that the bound held there would fail.
 */
function expectMonotoneEdge(
  bridge: AtlasBridge,
  samples: readonly number[],
  at: (x: number) => number,
): void {
  const delta = bridge.bound?.delta;
  expect(delta).toBeDefined();
  const values = samples.map(at);
  for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]!);
  expect(values[values.length - 1]).toBeCloseTo(delta!, 12);
  expect(bridge.formalRef?.covers).toContain('bound.delta exactly, at the dispersion relation');
  expect(bridge.formalRef?.covers).toContain('covers its statement only');
  expect(bridge.formalRef?.system).toBe('lean4-physjs');
}

describe('rank-1 dispersion bounds ↔ PhysJS covers_bound_delta', () => {
  it('ab-kg-schrodinger: (√(1+x²)−1)/(√(1+x²)+1) is monotone and equals delta at x = 0.1', () => {
    const closed = (x: number): number => {
      const root = Math.sqrt(1 + x * x);
      return (root - 1) / (root + 1);
    };
    expectMonotoneEdge(BRIDGE_KG_SCHRODINGER, [0.02, 0.05, KG_NR_MAX_X], (x) => kgNonrelativisticError(x));
    expect(kgNonrelativisticError(KG_NR_MAX_X)).toBeCloseTo(closed(KG_NR_MAX_X), 12);
    expect(BRIDGE_KG_SCHRODINGER.formalRef?.statement).toBe('PhysJS.KgSchrodinger.covers_bound_delta');
    // The numerator alone is not the error. A record that stored it would not match delta.
    expect(Math.sqrt(1 + KG_NR_MAX_X ** 2) - 1).not.toBeCloseTo(BRIDGE_KG_SCHRODINGER.bound!.delta, 4);
    expect(kgNonrelativisticError(1)).toBeGreaterThan(BRIDGE_KG_SCHRODINGER.bound!.delta);
  });

  it('ab-klein-gordon-wave: √(1+r²)−1 is monotone and equals delta at r = 0.1', () => {
    expectMonotoneEdge(BRIDGE_KLEIN_GORDON_WAVE, [0.02, 0.05, KG_MAX_DISPERSION_RATIO], (ratio) =>
      kleinGordonPhaseError(ratio, 1, 1),
    );
    expect(BRIDGE_KLEIN_GORDON_WAVE.formalRef?.statement).toBe('PhysJS.KleinGordonWave.covers_bound_delta');
    expect(Math.sqrt(1 + KG_MAX_DISPERSION_RATIO ** 2)).not.toBeCloseTo(BRIDGE_KLEIN_GORDON_WAVE.bound!.delta, 4);
    expect(kleinGordonPhaseError(1, 1, 1)).toBeGreaterThan(BRIDGE_KLEIN_GORDON_WAVE.bound!.delta);
  });

  it('ab-stiff-string: √(1+β)−1 is monotone and equals delta at β = 0.01', () => {
    expectMonotoneEdge(BRIDGE_STIFF_STRING, [0.001, 0.005, STIFF_MAX_BETA], (beta) =>
      stiffStringPhaseError(1, beta, 1),
    );
    expect(BRIDGE_STIFF_STRING.formalRef?.statement).toBe('PhysJS.StiffString.covers_bound_delta');
    expect(Math.sqrt(1 + STIFF_MAX_BETA)).not.toBeCloseTo(BRIDGE_STIFF_STRING.bound!.delta, 4);
    expect(stiffStringPhaseError(1, 1, 1)).toBeGreaterThan(BRIDGE_STIFF_STRING.bound!.delta);
  });

  it('ab-telegraph-diffusion: the slow-rate error is monotone and equals delta at ε = 0.05', () => {
    const error = (eps: number): number => telegraphSlowRateRatio(eps, 1, 1) - 1;
    expectMonotoneEdge(BRIDGE_TELEGRAPH_DIFFUSION, [0.01, 0.02, TELEGRAPH_FICK_MAX_EPS], error);
    expect(BRIDGE_TELEGRAPH_DIFFUSION.formalRef?.statement).toBe('PhysJS.TelegraphDiffusion.covers_bound_delta');
    expect(error(0.2)).toBeGreaterThan(BRIDGE_TELEGRAPH_DIFFUSION.bound!.delta);
    expect(telegraphSlowRateRatio(1, 1, 1)).toBeNaN();
  });

  it('ab-telegraph-wave: the frequency error falls as ε grows, and equals delta at ε = 25', () => {
    const error = (eps: number): number => 1 - telegraphWaveFrequencyRatio(eps, 1, 1);
    const edge = error(TELEGRAPH_WAVE_MIN_EPS);
    expect(edge).toBeCloseTo(BRIDGE_TELEGRAPH_WAVE.bound!.delta, 12);
    expect(error(50)).toBeLessThan(edge);
    expect(error(100)).toBeLessThan(error(50));
    expect(error(1)).toBeGreaterThan(edge);
    expect(BRIDGE_TELEGRAPH_WAVE.formalRef?.statement).toBe('PhysJS.TelegraphWave.covers_bound_delta');
    expect(BRIDGE_TELEGRAPH_WAVE.formalRef?.covers).toContain('covers its statement only');
  });
});

describe('formally-proved is derived, and reachable only from a reviewed reference', () => {
  it('ab-pendulum-linear derives formally-proved from its reference and stores nothing', () => {
    expect(deriveEvidence(AB_PENDULUM_LINEAR, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
    // The record's stored set never carries it: `derived-tag-literals.test.ts`
    // forbids spelling it anywhere a record could set it.
    expect(AB_PENDULUM_LINEAR.evidence.has('formally-proved')).toBe(false);
  });

  it('every bridge with a formalRef has a sanity lemma here, or a fidelity that is not sanity-lemmas', () => {
    const withRef = ATLAS_FAMILIES.flatMap((f) => f.bridges).filter((b) => b.formalRef !== undefined);
    expect(withRef.map((b) => b.id)).toEqual([
      'ab-pendulum-linear',
      'ab-telegraph-diffusion',
      'ab-telegraph-wave',
      'ab-klein-gordon-wave',
      'ab-kg-schrodinger',
      'ab-stiff-string',
    ]);
    for (const bridge of withRef) expect(bridge.formalRef!.fidelity).toBe('sanity-lemmas');
  });
});
