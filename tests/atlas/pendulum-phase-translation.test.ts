/**
 * Witness W7p for `ab-pendulum-linear`'s declared translation of its relative
 * period error into the accumulated phase error (CLI audit §14 item 8).
 *
 * The closed form is checked against an INDEPENDENT integration of both
 * equations of motion (`_phase-drift.ts`, on `_ode.ts` RK4), not against the
 * source's own integrator. Each check is paired with a control showing it
 * fails on a plausible wrong translation — the same map without its (1+ε)
 * factor, which differs by ε relative.
 *
 * @module tests/atlas/pendulum-phase-translation
 */
import { describe, expect, it } from 'vitest';

import { AB_PENDULUM_LINEAR, pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import { PENDULUM_PHASE_TRANSLATION as TR } from '../../src/atlas/oscillators/phase-translation.js';
import { OBSERVABLE_TRANSLATIONS } from '../../src/atlas/translation-registry.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import { runTranslationCheck } from '../../src/atlas/translation-registry.js';
import { PHASE_POINT_MAX_PERIODS } from '../../src/atlas/oscillators/phase-translation.js';
import { measuredDrift, measuredHorizon } from './_phase-drift.js';

const T0 = 2;
const withoutOnePlusEps = (eps: number, t: number): number => 2 * Math.PI * (t / T0) * eps;

describe('W7p — the phase translation is declared against the bound it consumes', () => {
  it('every registered translation names an atlas bridge whose bound norm is the one it translates', () => {
    const bridges = ATLAS_FAMILIES.flatMap((f) => f.bridges);
    for (const tr of OBSERVABLE_TRANSLATIONS) {
      const b = bridges.find((x) => x.id === tr.bridgeId);
      expect(b?.bound?.norm).toBe(tr.fromNorm);
      expect(tr.witnesses.map((w) => w.id).sort()).toEqual(tr.checks.map((c) => c.id).sort());
    }
    expect(TR.fromNorm).toBe(AB_PENDULUM_LINEAR.bound!.norm);
  });
});

describe('W7p — Δφ(t) = 2π (t/T0) ε/(1+ε) against an independent RK4 integration', () => {
  for (const theta0 of [0.1, 0.3, 0.5]) {
    it(`matches the measured drift at every pendulum crossing, θ0 = ${theta0}, T0 = ${T0}`, () => {
      const eps = pendulumPeriodErrorAt({ theta0 });
      const tEnd = TR.horizonFor(eps, 1, { T0 });
      const rows = measuredDrift(theta0, T0, tEnd, 400);
      expect(rows.length).toBeGreaterThan(10);
      const worst = Math.max(...rows.map((r) => Math.abs(r.drift - TR.errorAt(eps, r.t, { T0 }))));
      expect(worst).toBeLessThan(1e-5);
      // Control: the map without (1+ε) is off by ≈ ε rad at 1 rad of drift, far outside 1e-5.
      const wrong = Math.max(...rows.map((r) => Math.abs(r.drift - withoutOnePlusEps(eps, r.t))));
      expect(wrong).toBeGreaterThan(1e-3 * (theta0 / 0.5) ** 2);
    });

    it(`puts t* where the measured drift reaches the tolerance, θ0 = ${theta0}`, () => {
      const eps = pendulumPeriodErrorAt({ theta0 });
      for (const tol of [0.1, 1]) {
        const tStar = TR.horizonFor(eps, tol, { T0 });
        const measured = measuredHorizon(theta0, T0, tol, tStar + 2 * T0, 400);
        expect(Math.abs(measured - tStar) / tStar).toBeLessThan(1e-5);
        expect(Math.abs(measured - (tol * T0) / (2 * Math.PI * eps)) / tStar).toBeGreaterThan(eps / 2);
      }
    });
  }

  it('uses the domain supremum for the shortest horizon: ε/(1+ε) is increasing', () => {
    const tol = 0.1;
    const sup = TR.horizonFor(AB_PENDULUM_LINEAR.bound!.delta, tol, { T0 });
    for (const theta0 of [0.05, 0.2, 0.35, 0.5]) {
      expect(TR.horizonFor(pendulumPeriodErrorAt({ theta0 }), tol, { T0 })).toBeGreaterThanOrEqual(sup);
    }
  });

  it('is undefined without T0, and never accumulates at ε = 0', () => {
    expect(TR.horizonFor(0.01, 0.1, {})).toBeNaN();
    expect(TR.errorAt(0.01, 1, {})).toBeNaN();
    expect(TR.horizonFor(0, 0.1, { T0 })).toBe(Infinity);
  });
});

describe('W7p — the executable witness, and the evidence derived from it', () => {
  it('the registered check integrates both motions and is checked, with refinement converging', () => {
    const r = runNumericWitness(TR.checks[0] as Parameters<typeof runNumericWitness>[0]);
    expect(r.status).toBe('checked');
    expect(r.convergence!.ratio).toBeGreaterThan(10);
  });

  it('control: the same check against the horizon without (1+ε) is refuted', () => {
    const eps = pendulumPeriodErrorAt({ theta0: 0.2 });
    const r = runNumericWitness({ ...(TR.checks[0] as Parameters<typeof runNumericWitness>[0]), target: 1 / (2 * Math.PI * eps) });
    expect(r.status).toBe('refuted');
  });

  it('derives numerically-supported only from a passing W7p, and never formally-proved', () => {
    expect([...deriveEvidence({ witnesses: TR.witnesses }, new Set(['W7p']))]).toEqual(['numerically-supported']);
    expect([...deriveEvidence({ witnesses: TR.witnesses }, NO_PASSING_WITNESSES)]).toEqual(['proposed']);
    expect('formalRef' in TR).toBe(false);
  });
});

describe("W7p@point — the witness at the caller's θ0, bounded, with its control", () => {
  it('is checked at points away from the fixture, and its (1+ε) control is refuted wherever ε exceeds its 1e-5 tolerance', () => {
    for (const theta0 of [0.02, 0.1, 0.35, 0.5]) {
      const pc = TR.pointCheck(pendulumPeriodErrorAt({ theta0 }));
      if ('unavailable' in pc) throw new Error(pc.unavailable);
      expect(runTranslationCheck(pc.check).status).toBe('checked');
      expect(runTranslationCheck(pc.control).status).toBe('refuted');
    }
  });

  it('the control cannot fail where ε is below the witness tolerance (θ0 = 0.01): disclosed, not hidden', () => {
    const eps = pendulumPeriodErrorAt({ theta0: 0.01 });
    expect(eps).toBeLessThan(1e-5);
    const pc = TR.pointCheck(eps);
    if ('unavailable' in pc) throw new Error(pc.unavailable);
    expect(runTranslationCheck(pc.check).status).toBe('checked');
    expect(runTranslationCheck(pc.control).status).toBe('checked');
  });

  it('agrees with the independent _ode.ts measurement at the same point', () => {
    const theta0 = 0.35;
    const eps = pendulumPeriodErrorAt({ theta0 });
    const pc = TR.pointCheck(eps);
    if ('unavailable' in pc) throw new Error(pc.unavailable);
    const spec = pc.check as Parameters<typeof runNumericWitness>[0];
    const independent = measuredHorizon(theta0, 1, 1, spec.target + 2, 800);
    expect(Math.abs(independent - spec.target) / spec.target).toBeLessThan(1e-5);
  });

  it(`is bounded: at most ${PHASE_POINT_MAX_PERIODS} T0 are integrated, and below the resolvable drift it is not run`, () => {
    for (const theta0 of [0.008, 0.05, 0.5]) {
      const pc = TR.pointCheck(pendulumPeriodErrorAt({ theta0 }));
      if ('unavailable' in pc) throw new Error(pc.unavailable);
      const periods = Number(/, (\d+) T0 integrated$/.exec(pc.claim)![1]);
      expect(periods).toBeLessThanOrEqual(PHASE_POINT_MAX_PERIODS + 2);
    }
    const tiny = TR.pointCheck(pendulumPeriodErrorAt({ theta0: 0.001 }));
    expect(tiny).toEqual({ unavailable: expect.stringMatching(/below the 0\.01 rad this witness resolves; not run$/) });
    expect(TR.pointCheck(0)).toEqual({ unavailable: expect.stringMatching(/no phase drift accumulates/) });
  });
});
