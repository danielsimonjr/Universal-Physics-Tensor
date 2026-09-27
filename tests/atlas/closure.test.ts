/**
 * Atlas Phase 4 — the eight bridges that close Sprint 4's "≥ 20 bridges" exit
 * criterion, and their witnesses WD4, WD4b, WD5, WD6, WD6b, WD7, WD8, WS5,
 * WS5b, WS6, WS7 and WS7b.
 *
 * Every number asserted here was measured at three or more points before its
 * tolerance was written, and is recomputed from scratch here, never read back
 * from the results artifact.
 */

import { describe, expect, it } from 'vitest';
import {
  BRIDGE_HEAT_LAPLACE,
  BRIDGE_LANGEVIN_DIFFUSION,
  BRIDGE_STOKES_EINSTEIN,
  BRIDGE_TELEGRAPH_DIFFUSION,
  BRIDGE_TELEGRAPH_WAVE,
  DIFFUSION_CLOSURE_BRIDGES,
  TELEGRAPH_FICK_MAX_EPS,
  TELEGRAPH_WAVE_MIN_EPS,
} from '../../src/atlas/diffusion/bridges-closure.js';
import {
  heatSteadyDeviation,
  langevinMsdRatio,
  telegraphSlowRateRatio,
  telegraphWaveFrequencyRatio,
} from '../../src/atlas/diffusion/numerics.js';
import {
  BRIDGE_KG_OSCILLATOR,
  BRIDGE_KG_SCHRODINGER,
  BRIDGE_STIFF_STRING,
  KG_NR_MAX_X,
  STIFF_MAX_BETA,
  WAVE_CLOSURE_BRIDGES,
} from '../../src/atlas/waves/bridges-closure.js';
import {
  kgNonrelativisticError,
  kgUniformModeValue,
  stiffStringPhaseError,
  stiffStringPhaseVelocity,
} from '../../src/atlas/waves/numerics.js';
import {
  WD4_FIXTURE,
  WD8_FIXTURE,
  WS6_FIXTURE,
  WS7_FIXTURE,
} from '../../src/atlas/witness-specs.js';
import { admitApproximation, regimeHolds } from '../../src/atlas/regime.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { evalExpr } from '../../src/composition/expr-eval.js';

const CLOSURE = [...DIFFUSION_CLOSURE_BRIDGES, ...WAVE_CLOSURE_BRIDGES];

describe('Sprint 4 closure — structure', () => {
  it('adds eight bridges', () => {
    expect(CLOSURE).toHaveLength(8);
  });

  it('every closure bridge is admitted and every inequality names a derived group', () => {
    for (const b of CLOSURE) {
      expect(admitApproximation(b)).toBe(b);
      for (const ineq of b.regime.inequalities) {
        expect(Object.keys(b.regime.groupDefinitions)).toContain(ineq.group);
      }
    }
  });

  it('every approximation states its delta as the EXACT error at its domain edge', () => {
    expect(BRIDGE_TELEGRAPH_DIFFUSION.bound!.delta).toBe(
      telegraphSlowRateRatio(TELEGRAPH_FICK_MAX_EPS, 1, 1) - 1,
    );
    expect(BRIDGE_TELEGRAPH_WAVE.bound!.delta).toBe(
      1 - telegraphWaveFrequencyRatio(TELEGRAPH_WAVE_MIN_EPS, 1, 1),
    );
    expect(BRIDGE_KG_SCHRODINGER.bound!.delta).toBe(kgNonrelativisticError(KG_NR_MAX_X));
    expect(BRIDGE_STIFF_STRING.bound!.delta).toBe(stiffStringPhaseError(1, STIFF_MAX_BETA, 1));
  });

  it('each error function is monotone on its domain, so the edge value IS the supremum', () => {
    const checks: Array<[(v: number) => number, number[]]> = [
      [(eps) => telegraphSlowRateRatio(eps, 1, 1) - 1, [0.001, 0.01, 0.03, 0.05]],
      [(eps) => 1 - telegraphWaveFrequencyRatio(eps, 1, 1), [1000, 200, 50, 25]],
      [(x) => kgNonrelativisticError(x), [0.001, 0.01, 0.05, 0.1]],
      [(beta) => stiffStringPhaseError(1, beta, 1), [1e-4, 1e-3, 5e-3, 1e-2]],
    ];
    for (const [f, points] of checks) {
      const values = points.map(f);
      for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });
});

describe('WD4 — Langevin → Fick, the Einstein relation D = k_BT/γ', () => {
  it('⟨x²⟩/(2Dt) is 0.900005 at t = 10 τ_p and 0.990000 at t = 100 τ_p — a factor 10 per decade', () => {
    const coarse = 1 - langevinMsdRatio(10, WD4_FIXTURE);
    const fine = 1 - langevinMsdRatio(100, WD4_FIXTURE);
    expect(coarse).toBeCloseTo(0.0999955, 6);
    expect(fine).toBeCloseTo(0.0100000, 6);
    expect(coarse / fine).toBeGreaterThan(9.9);
  });

  it('the RK4 moments reproduce the closed Ornstein–Uhlenbeck form 1 − (1 − e^{−s})/s', () => {
    for (const s of [0.1, 1, 10]) {
      expect(langevinMsdRatio(s, WD4_FIXTURE)).toBeCloseTo(1 - (1 - Math.exp(-s)) / s, 10);
    }
  });

  it('NEGATIVE CONTROL: a wrong Einstein relation D = k_BT·γ leaves the ratio far from 1', () => {
    const right = langevinMsdRatio(100, WD4_FIXTURE);
    const wrongOverRight = WD4_FIXTURE.gamma ** 2; // (k_BT/γ)/(k_BT·γ)
    expect(Math.abs(right * wrongOverRight - 1)).toBeGreaterThan(0.7);
  });

  it('the regime key is the derived group τ_p/t', () => {
    expect(regimeHolds(BRIDGE_LANGEVIN_DIFFUSION.regime, { 'm · gamma^-1 · t^-1': 0.001 }).ok).toBe(true);
    expect(regimeHolds(BRIDGE_LANGEVIN_DIFFUSION.regime, { 'm · gamma^-1 · t^-1': 0.5 }).ok).toBe(false);
  });
});

describe('WD4b — the ballistic regime is not diffusive', () => {
  it('at t = 0.1 τ_p the ratio is 0.0484', () => {
    expect(langevinMsdRatio(0.1, WD4_FIXTURE)).toBeCloseTo(0.0483742, 6);
  });
});

describe('WD5 — the Stokes–Einstein hyperedge', () => {
  const kT = 1.380649e-23 * 293.15;
  const eta = 1.0016e-3;
  const a = 0.5e-6;
  const ours = kT / (6 * Math.PI * eta * a);

  it('agrees with CE-stokes-einstein up to EXACTLY the dimensionless 6π that entry omits by design', () => {
    const ce = canonicalById('CE-stokes-einstein');
    expect(ce?.epistemicStatus).toBe('scalar-up-to-constant');
    const canonical = evalExpr(ce!.scalarAst!, {
      'boltzmann-constant': 1.380649e-23,
      temperature: 293.15,
      'dynamic-viscosity': eta,
      'particle-radius': a,
    });
    expect(Math.abs((ours * 6 * Math.PI) / canonical - 1)).toBeLessThan(1e-12);
  });

  it('a sphere of radius 0.5 µm (1 µm diameter) in water at 20 °C diffuses at D = 4.29e-13 m²/s', () => {
    expect(ours).toBeCloseTo(4.2873e-13, 16);
  });

  // Audit F06 (2026-09-26): the prose said "a 1 µm sphere", which a reader takes as the radius;
  // at a = 1 µm, D is half the stated value. The record must name every input the test uses.
  it('the WD5 prose states the radius, diameter, temperature and viscosity the test uses', () => {
    const prose = BRIDGE_STOKES_EINSTEIN.witnesses.find((w) => w.id === 'WD5')!.tolerance;
    expect(prose).toMatch(/radius a = 0\.5 µm/);
    expect(prose).toMatch(/1 µm diameter/);
    expect(prose).toMatch(/T = 293\.15 K/);
    expect(prose).toMatch(/η = 1\.0016e-3 Pa·s/);
    expect(a).toBe(0.5e-6);
    expect(eta).toBe(1.0016e-3);
  });

  it('is a HYPEREDGE: Langevin supplies D = k_BT/γ, Stokes supplies γ', () => {
    expect(BRIDGE_STOKES_EINSTEIN.premises).toEqual(['model-langevin', 'model-stokes-drag']);
  });
});

describe('WD6 — telegraph → Fick, the singular limit τ → 0', () => {
  it('the slow-rate error is 0.05573 at τ = 0.05 and 0.02633 at τ = 0.025 — first order, ≈2 per halving', () => {
    const coarse = telegraphSlowRateRatio(0.05, 1, 1) - 1;
    const fine = telegraphSlowRateRatio(0.025, 1, 1) - 1;
    expect(coarse).toBeCloseTo(0.0557281, 6);
    expect(fine).toBeCloseTo(0.0263340, 6);
    expect(coarse / fine).toBeGreaterThan(2.05);
    expect(coarse / fine).toBeLessThan(2.2);
  });

  it('the horizon has a LOWER edge: inside the initial layer (t ≤ 5τ) the bound does not hold', () => {
    const bound = BRIDGE_TELEGRAPH_DIFFUSION.bound!;
    const p = { tau: 0.01, D: 1, q: 1 };
    expect(bound.horizonHolds(0.01, p)).toBe(false);
    expect(bound.horizonHolds(1, p)).toBe(true);
    expect(bound.horizonHolds(1e6, p)).toBe(false);
    expect(bound.limitCharacter).toBe('singular');
  });
});

describe('WD6b — telegraph modes can oscillate; diffusion modes cannot', () => {
  it('at ε = 1 there is no real slow rate', () => {
    expect(Number.isNaN(telegraphSlowRateRatio(1, 1, 1))).toBe(true);
  });
});

describe('WD7 — telegraph → wave for strongly underdamped modes', () => {
  it('the frequency error is 5.01e-3 at ε = 25 and 2.50e-3 at ε = 50', () => {
    const coarse = 1 - telegraphWaveFrequencyRatio(25, 1, 1);
    const fine = 1 - telegraphWaveFrequencyRatio(50, 1, 1);
    expect(coarse).toBeCloseTo(5.01256e-3, 8);
    expect(fine).toBeCloseTo(2.50313e-3, 8);
  });

  it('the machine horizon is 2τ ln(10/9): the wave model ignores the damping beyond it', () => {
    const bound = BRIDGE_TELEGRAPH_WAVE.bound!;
    expect(bound.horizonHolds(0.2, { tau: 1 })).toBe(true);
    expect(bound.horizonHolds(0.22, { tau: 1 })).toBe(false);
  });
});

describe('WD8 — heat → Laplace, the steady state as the attractor', () => {
  it('the deviation from the linear profile is 0.1388 at Fo = 0.2 and 0.01928 at Fo = 0.4', () => {
    expect(heatSteadyDeviation(2, WD8_FIXTURE)).toBeCloseTo(0.138841, 5);
    expect(heatSteadyDeviation(4, WD8_FIXTURE)).toBeCloseTo(0.0192767, 6);
  });

  it('at the regime floor Fo = 1 the deviation is below 1e-4 (≈ e^{−π²})', () => {
    expect(heatSteadyDeviation(10, WD8_FIXTURE)).toBeLessThan(1e-4);
    expect(regimeHolds(BRIDGE_HEAT_LAPLACE.regime, { 'kappa · rho^-1 · cp^-1 · ell^-2 · t': 2 }).ok).toBe(true);
  });
});

describe('WS5 — Klein–Gordon → free Schrödinger, the non-relativistic limit', () => {
  it('the kinetic-frequency error is 2.488e-3 at x = 0.1 and 6.242e-4 at x = 0.05 (≈4)', () => {
    expect(kgNonrelativisticError(0.1)).toBeCloseTo(2.48758e-3, 8);
    expect(kgNonrelativisticError(0.05)).toBeCloseTo(6.24220e-4, 9);
  });

  it('crosses families: premise in waves, conclusion in diffusion', () => {
    expect(BRIDGE_KG_SCHRODINGER.conclusion).toBe('model-schrodinger-free');
  });
});

describe('WS5b — the limit fails at x = 1', () => {
  it('the relative error is 3 − 2√2', () => {
    expect(kgNonrelativisticError(1)).toBeCloseTo(3 - 2 * Math.SQRT2, 15);
  });
});

describe('WS6 — Klein–Gordon restricted to the uniform mode is the oscillator', () => {
  const target = Math.cos(WS6_FIXTURE.omega0 * WS6_FIXTURE.tEnd);

  it('the full PDE with uniform data misses cos(ω₀t) by 1.001e-3 at 50 steps and 2.512e-4 at 100 (≈4)', () => {
    const coarse = Math.abs(kgUniformModeValue(50, WS6_FIXTURE.c, WS6_FIXTURE.omega0, WS6_FIXTURE.tEnd) - target);
    const fine = Math.abs(kgUniformModeValue(100, WS6_FIXTURE.c, WS6_FIXTURE.omega0, WS6_FIXTURE.tEnd) - target);
    expect(coarse).toBeCloseTo(1.00128e-3, 7);
    expect(fine).toBeCloseTo(2.51187e-4, 8);
  });

  it('ends at the oscillator family’s model-spring', () => {
    expect(BRIDGE_KG_OSCILLATOR.conclusion).toBe('model-spring');
  });
});

describe('WS7 — stiff string → flexible string', () => {
  const c = Math.sqrt(WS7_FIXTURE.F / WS7_FIXTURE.mu);

  it('the phase-velocity excess is 0.4988 at k = 10 and 0.1249 at k = 5 (≈4)', () => {
    const at = (res: number) =>
      stiffStringPhaseVelocity(res, WS7_FIXTURE.F, WS7_FIXTURE.mu, WS7_FIXTURE.EI, WS7_FIXTURE.k0) - c;
    expect(at(1)).toBeCloseTo(0.498756, 5);
    expect(at(2)).toBeCloseTo(0.124922, 5);
  });

  it('the regime key is F/(EIk²) = 1/β', () => {
    expect(regimeHolds(BRIDGE_STIFF_STRING.regime, { 'F · EI^-1 · k^-2': 1000 }).ok).toBe(true);
    expect(regimeHolds(BRIDGE_STIFF_STRING.regime, { 'F · EI^-1 · k^-2': 10 }).ok).toBe(false);
  });
});

describe('WS7b — inharmonicity at β = 1', () => {
  it('the phase velocity is √2 times the flexible-string value', () => {
    expect(stiffStringPhaseError(1, 1, 1)).toBeCloseTo(Math.SQRT2 - 1, 15);
  });
});
