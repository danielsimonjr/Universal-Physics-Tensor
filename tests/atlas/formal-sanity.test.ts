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
import { BRIDGE_DAMPED_RLC, BRIDGE_SPRING_LC } from '../../src/atlas/oscillators/bridges-exact.js';
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
import { BRIDGE_KLEIN_GORDON_WAVE, BRIDGE_WAVE_DALEMBERT, KG_MAX_DISPERSION_RATIO } from '../../src/atlas/waves/bridges.js';
import { BRIDGE_KG_OSCILLATOR, BRIDGE_KG_SCHRODINGER, BRIDGE_STIFF_STRING, KG_NR_MAX_X, STIFF_MAX_BETA } from '../../src/atlas/waves/bridges-closure.js';
import { kgNonrelativisticError, kleinGordonPhaseError, stiffStringPhaseError } from '../../src/atlas/waves/numerics.js';
import { PHYSJS_COMMIT, physjsFormalRef } from '../../src/atlas/physjs-ref.js';
import { PHYSJS_SANITY_LEMMA_KEYS } from '../../src/atlas/physjs-reviewed.js';
import type { AtlasBridge } from '../../src/atlas/types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Whether this file names `key` in a lemma title: `describe('<key> ↔ …')` or `it('<key>: …')`. */
const lemmaNamed = (source: string, key: string): boolean =>
  new RegExp(`(describe|it)\\(['"]${key}( ↔ |: )`).test(source);

/** A known pendulum: m = 0.3 kg, g = 9.81 m/s², ℓ = 1.2 m. */
const PENDULUM = { m: 0.3, g: 9.81, ell: 1.2 } as const;

describe('ab-pendulum-linear ↔ PhysJS.Pendulum.linearizedEquationOfMotion_iff', () => {
  it('the reference names the PhysJS theorem and a real fidelity', () => {
    const ref = AB_PENDULUM_LINEAR.formalRef;
    expect(ref).toBeDefined();
    expect(ref!.system).toBe('lean4-physjs');
    expect(ref!.statement).toBe('PhysJS.Pendulum.linearizedEquationOfMotion_iff');
    expect(ref!.fidelity).toBe('sanity-lemmas');
    expect(ref!.version).toContain(`physjs@${PHYSJS_COMMIT}`);
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
    // `strictMonoOn_periodFormula`) concern `periodFormula`, which an open note in
    // Physlib has not yet identified with the period of the motion. They are
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

describe('ab-kg-oscillator ↔ PhysJS.KgOscillator.uniform_solves_equationOfMotion', () => {
  it('the reference names the uniform-mode restriction and covers its statement only', () => {
    const ref = BRIDGE_KG_OSCILLATOR.formalRef;
    expect(ref?.system).toBe('lean4-physjs');
    expect(ref?.statement).toBe('PhysJS.KgOscillator.uniform_solves_equationOfMotion');
    expect(ref?.fidelity).toBe('sanity-lemmas');
    expect(ref?.covers).toContain("the restriction, in Physlib's own terms");
    expect(ref?.covers).toContain('covers its statement only');
    expect(ref?.covers).not.toContain('bound.delta');
    expect(BRIDGE_KG_OSCILLATOR.transformation).toContain('u(x, t) = u(t)');
    expect(BRIDGE_KG_OSCILLATOR.transformation).toContain('ω₀² ↦ k/m');
  });

  it('a uniform field cos(ω₀ t) solves u_tt = −ω₀² u, and ω₀² is k/m', () => {
    // Lean: u x = f, so the second space derivative is 0, and
    // u_tt = c² u_xx − ω₀² u reduces to f'' = −ω₀² f when S.ω = ω₀.
    const omega0 = 2;
    const c = 5;
    const f = (t: number): number => Math.cos(omega0 * t);
    const u = (_x: number, t: number): number => f(t);
    const spaceSecond = (x: number, t: number, h: number): number =>
      (u(x + h, t) - 2 * u(x, t) + u(x - h, t)) / (h * h);
    const timeSecond = (x: number, t: number, h: number): number =>
      (u(x, t + h) - 2 * u(x, t) + u(x, t - h)) / (h * h);
    expect(Math.abs(spaceSecond(0.4, 0.3, 1e-4))).toBeLessThan(1e-8);
    const kgResidual = (h: number): number =>
      Math.abs(timeSecond(0.4, 0.3, h) - (c ** 2 * spaceSecond(0.4, 0.3, h) - omega0 ** 2 * u(0.4, 0.3)));
    // Truncation of the second difference, not a leftover PDE term: it falls as h².
    expect(kgResidual(1e-3)).toBeLessThan(2e-6);
    expect(kgResidual(1e-3) / kgResidual(5e-4)).toBeGreaterThan(3.9);
    expect(kgResidual(1e-3) / kgResidual(5e-4)).toBeLessThan(4.1);
    const m = 1;
    const k = m * omega0 ** 2;
    expect(k / m).toBeCloseTo(omega0 ** 2, 12);
    // A travelling mode's dispersion is not the uniform-mode frequency when c k ≠ 0.
    const kWave = 0.5;
    expect(c * kWave).not.toBe(0);
    expect(c ** 2 * kWave ** 2 + omega0 ** 2).not.toBeCloseTo(omega0 ** 2, 6);
  });
});

describe('ab-spring-lc ↔ PhysJS.SpringLc.time_rescale_equationOfMotion', () => {
  it('the reference names the oscillator dictionary, not a Physlib circuit', () => {
    const ref = BRIDGE_SPRING_LC.formalRef;
    expect(ref?.statement).toBe('PhysJS.SpringLc.time_rescale_equationOfMotion');
    expect(ref?.fidelity).toBe('sanity-lemmas');
    expect(ref?.covers).toBe('the oscillator dictionary — covers its statement only');
    expect(BRIDGE_SPRING_LC.transformation).toContain('m ↔ L');
    expect(BRIDGE_SPRING_LC.transformation).toContain('k ↔ 1/C');
    expect(BRIDGE_SPRING_LC.transformation).toContain('q(t) = (q0/x0)·x(ω_LC t / ω_s)');
  });

  it('rescaling time by ω_LC/ω_s sends a spring solution to an LC solution; the source frequency does not', () => {
    // W1a: m = 1, k = 4 so ω_s = 2; L = 2, C = 0.125 so ω_LC = 2√2.
    // Lean: y(t) = β • x((ω_target / ω_source) • t), with m ↦ L and k ↦ 1/C.
    const omegaS = 2;
    const omegaLc = 2 * Math.sqrt(2);
    const beta = -1.9 / 0.37;
    const x = (t: number): number => Math.cos(omegaS * t);
    const alpha = omegaLc / omegaS;
    const y = (t: number): number => beta * x(alpha * t);
    const second = (fn: (t: number) => number, t: number, h: number): number =>
      (fn(t + h) - 2 * fn(t) + fn(t - h)) / (h * h);
    const lcResidual = (fn: (t: number) => number, t: number): number =>
      Math.abs(second(fn, t, 1e-4) + omegaLc ** 2 * fn(t));
    expect(lcResidual(y, 0.37)).toBeLessThan(1e-6);
    const wrong = (t: number): number => beta * x(t);
    expect(lcResidual(wrong, 0.37)).toBeGreaterThan(1);
    expect(omegaLc / omegaS).not.toBeCloseTo(1, 6);
  });
});

describe('ab-damped-rlc ↔ PhysJS.DampedRlc.time_rescale_equationOfMotion', () => {
  it('the reference names the oscillator dictionary and the damping-ratio side condition', () => {
    const ref = BRIDGE_DAMPED_RLC.formalRef;
    expect(ref?.statement).toBe('PhysJS.DampedRlc.time_rescale_equationOfMotion');
    expect(ref?.fidelity).toBe('sanity-lemmas');
    expect(ref?.covers).toBe('the oscillator dictionary — covers its statement only');
    expect(BRIDGE_DAMPED_RLC.transformation).toContain('m ↔ L, k ↔ 1/C, b ↔ R');
    expect(BRIDGE_DAMPED_RLC.sideConditions[0]).toContain('ζ_mech = b/(2√(mk)) equals ζ_RLC');
  });

  it('equal damping ratios and the frequency ratio match; a matched γ/m with unequal frequencies does not', () => {
    // Lean: dampingRatio = γ / (2 √(m k)). The RLC reading is (R/2) √(C/L).
    // y(t) = β • x((ω_RLC / ω) • t) solves the target iff the ratios agree.
    const zeta = 0.25;
    const omegaS = 2;
    const omegaT = 4;
    const m = 1;
    const k = m * omegaS ** 2;
    const b = 2 * zeta * Math.sqrt(m * k);
    const L = 2;
    const C = 1 / (L * omegaT ** 2);
    const R = 2 * zeta * Math.sqrt(L / C);
    expect(b / (2 * Math.sqrt(m * k))).toBeCloseTo(zeta, 12);
    expect((R / 2) * Math.sqrt(C / L)).toBeCloseTo(zeta, 12);
    const omegaD = omegaS * Math.sqrt(1 - zeta ** 2);
    const x = (t: number): number => {
      const decay = Math.exp(-zeta * omegaS * t);
      return decay * (Math.cos(omegaD * t) + ((zeta * omegaS) / omegaD) * Math.sin(omegaD * t));
    };
    const alpha = omegaT / omegaS;
    const beta = 1.5;
    const y = (t: number): number => beta * x(alpha * t);
    const deriv = (fn: (t: number) => number, t: number, h: number): number => (fn(t + h) - fn(t - h)) / (2 * h);
    const second = (fn: (t: number) => number, t: number, h: number): number =>
      (fn(t + h) - 2 * fn(t) + fn(t - h)) / (h * h);
    const residual = (fn: (t: number) => number, omega: number, t: number): number =>
      Math.abs(second(fn, t, 1e-4) + 2 * zeta * omega * deriv(fn, t, 1e-4) + omega ** 2 * fn(t));
    expect(residual(x, omegaS, 0.2)).toBeLessThan(1e-5);
    expect(residual(y, omegaT, 0.2)).toBeLessThan(1e-4);
    const unscaled = (t: number): number => beta * x(t);
    expect(residual(unscaled, omegaT, 0.2)).toBeGreaterThan(1);
    const rateMatchedR = (b / m) * L;
    const rateMatchedZeta = (rateMatchedR / 2) * Math.sqrt(C / L);
    expect(rateMatchedR / L).toBeCloseTo(b / m, 12);
    expect(rateMatchedZeta).not.toBeCloseTo(zeta, 6);
  });
});

describe("ab-wave-dalembert ↔ PhysJS.WaveDalembert.solution_eq_profiles", () => {
  it("the reference names the missing direction of d'Alembert's formula", () => {
    const ref = BRIDGE_WAVE_DALEMBERT.formalRef;
    expect(ref?.statement).toBe('PhysJS.WaveDalembert.solution_eq_profiles');
    expect(ref?.fidelity).toBe('sanity-lemmas');
    expect(ref?.covers).toBe("the missing direction of d'Alembert's formula — covers its statement only");
    expect(BRIDGE_WAVE_DALEMBERT.transformation).toContain('ξ = x − ct');
    expect(BRIDGE_WAVE_DALEMBERT.transformation).toContain('η = x + ct');
    expect(BRIDGE_WAVE_DALEMBERT.preserves).toContain('every C² solution on the whole line');
  });

  it('a standing wave is F(x − ct) + G(x + ct); sending both profiles the same way is a different field', () => {
    // Lean: a jointly C² solution at c ≠ 0 equals F(x − c t) + G(x + c t).
    // sin(x) cos(c t) = [sin(x − c t) + sin(x + c t)] / 2.
    const c = 2;
    const standing = (x: number, t: number): number => Math.sin(x) * Math.cos(c * t);
    const right = (s: number): number => Math.sin(s) / 2;
    const left = (s: number): number => Math.sin(s) / 2;
    const profiles = (x: number, t: number): number => right(x - c * t) + left(x + c * t);
    const sameWay = (x: number, t: number): number => right(x - c * t) + left(x - c * t);
    const x = 0.7;
    const t = 0.4;
    expect(profiles(x, t)).toBeCloseTo(standing(x, t), 12);
    expect(sameWay(x, t)).not.toBeCloseTo(standing(x, t), 4);
    const h = 1e-3;
    const utt = (standing(x, t + h) - 2 * standing(x, t) + standing(x, t - h)) / (h * h);
    const uxx = (standing(x + h, t) - 2 * standing(x, t) + standing(x - h, t)) / (h * h);
    expect(Math.abs(utt - c ** 2 * uxx)).toBeLessThan(1e-5);
    // At speed zero the equation does not force this shape: u = t has u_tt = 0.
    const linear = (time: number): number => time;
    expect(linear(t)).not.toBeCloseTo(right(x) + left(x), 4);
  });
});

describe('formally-proved is derived, and reachable only from a reviewed reference', () => {
  it('ab-pendulum-linear derives formally-proved from its reference and stores nothing', () => {
    expect(deriveEvidence(AB_PENDULUM_LINEAR, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
    // The record stores no evidence set at all: `derived-tag-literals.test.ts`
    // forbids spelling the tag anywhere a record could set it, and the type
    // has no field to set.
    expect(Object.hasOwn(AB_PENDULUM_LINEAR, 'evidence')).toBe(false);
  });

  it('the sanity-lemma keys are exactly the atlas bridges with a formalRef, and each has a lemma in THIS file', () => {
    const withRef = ATLAS_FAMILIES.flatMap((f) => f.bridges).filter((b) => b.formalRef !== undefined);
    expect([...withRef.map((b) => b.id)].sort()).toEqual([...PHYSJS_SANITY_LEMMA_KEYS].sort());
    // A key earns `sanity-lemmas` only through a lemma here: a describe
    // header `'<key> ↔ …'`, or an `it('<key>: …')` inside the rank-1 block.
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    for (const key of PHYSJS_SANITY_LEMMA_KEYS) {
      expect(lemmaNamed(source, key), `${key} is listed in PHYSJS_SANITY_LEMMA_KEYS and has no lemma in formal-sanity.test.ts`).toBe(true);
    }
    for (const bridge of withRef) expect(bridge.formalRef!.fidelity, bridge.id).toBe('sanity-lemmas');
    // A catalog key has no lemma here and does not carry this fidelity.
    expect(PHYSJS_SANITY_LEMMA_KEYS.some((key) => key.startsWith('be-'))).toBe(false);
    expect(physjsFormalRef('be-16').fidelity).not.toBe('sanity-lemmas');
  });

  it('CONTROL: the lemma scan finds a named key and not an absent one', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    expect(lemmaNamed(source, 'ab-pendulum-linear')).toBe(true);
    expect(lemmaNamed(source, 'ab-kg-schrodinger')).toBe(true);
    expect(lemmaNamed(source, 'be-16')).toBe(false);
    expect(lemmaNamed(source, 'ab-chain-wave')).toBe(false);
  });
});
