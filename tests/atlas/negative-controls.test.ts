/**
 * Negative controls for the 12 registered witnesses that had none.
 *
 * A witness that has only ever run on its TRUE claim cannot tell "the claim
 * holds" from "the runner accepts anything". Each control below feeds the REAL
 * runner (`runNumericWitness` / `runSymbolicWitness`) a physically plausible
 * WRONG hypothesis — a wrong target, a wrong closure, a wrong dictionary — built
 * from the registered spec by overriding exactly one field, and asserts it does
 * NOT check. Each control is paired with a META-CHECK: the same assertion run on
 * the true spec, which must fail there (the true spec checks). A control whose
 * assertion also held on the true claim would be the S5.1 mistake again: a
 * control that cannot fail.
 *
 * Numeric wrong hypotheses are measured REFUTED. CAS wrong dictionaries are
 * measured UNRESOLVED (the simplifier cannot reduce lhs − rhs to zero), not
 * refuted — so the CAS controls assert `not 'checked'`, which is the property
 * that matters: a wrong dictionary earns no evidence tag.
 *
 * Existing controls (not repeated here): WD2, WD3, WD4, WS1, WS3 numeric; W1s CAS; and W1τ numeric,
 * the norm-transport witness added later, whose control sits beside it in
 * `tests/atlas/spring-lc-norm-transport.test.ts`. W7 and W8b, registered later, have theirs in
 * `tests/atlas/oscillators-limits.test.ts`, and W9 in `tests/atlas/oscillators-coarse.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import type { NumericWitnessSpec } from '../../src/atlas/witness-numeric.js';
import { runSymbolicWitness } from '../../src/atlas/witness-symbolic.js';
import type { SymbolicWitnessSpec } from '../../src/atlas/witness-symbolic.js';
import {
  WD1_FIXTURE,
  WD6_FIXTURE,
  WD7_FIXTURE,
  WD8_FIXTURE,
  WITNESS_REGISTRY,
  WS2_FIXTURE,
  WS4_FIXTURE,
  WS5_FIXTURE,
  WS6_FIXTURE,
  WS7_FIXTURE,
} from '../../src/atlas/witness-specs.js';
import { diffusionKernel, heatSteadyDeviation } from '../../src/atlas/diffusion/numerics.js';
import { dalembert } from '../../src/atlas/waves/numerics.js';
import { isSimplifierAvailable } from '../../src/composition/expr-simplify.js';
import { substitute } from '../../src/composition/expr-subst.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS, ENERGY, LENGTH, MASS } from '../../src/dimensional/types.js';
import {
  CAPACITANCE,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from '../../src/atlas/oscillators/dimensions.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from '../../src/atlas/diffusion/dimensions.js';
import { VISCOSITY } from '../../src/atlas/diffusion/models.js';

const peerPresent = await isSimplifierAvailable();
const peerRequired = process.env.UPT_REQUIRE_PEERS === '1';

function numeric(id: string): NumericWitnessSpec {
  const w = WITNESS_REGISTRY.find((r) => r.spec.id === id);
  if (w === undefined || w.kind !== 'numeric') throw new Error(`${id}: not a registered numeric witness`);
  return w.spec;
}

function symbolic(id: string): SymbolicWitnessSpec {
  const w = WITNESS_REGISTRY.find((r) => r.spec.id === id);
  if (w === undefined || w.kind !== 'symbolic') throw new Error(`${id}: not a registered symbolic witness`);
  return w.spec;
}

// ── Numeric: one WRONG hypothesis per witness ──────────────────────────────

const NUMERIC_CONTROLS: ReadonlyArray<{
  id: string;
  wrong: string;
  override: (spec: NumericWitnessSpec) => NumericWitnessSpec;
}> = [
  {
    id: 'WD1',
    wrong: 'the walk converges to the kernel with D doubled (Δx²/Δt, a dropped factor of 2)',
    override: (s) => ({ ...s, target: diffusionKernel(0, WD1_FIXTURE.t, 2 * WD1_FIXTURE.D) }),
  },
  {
    id: 'WS2',
    wrong: "d'Alembert's form satisfies the wave equation with c' = 1.2c",
    override: (s) => ({
      ...s,
      evaluate: (resolution) => {
        const f = WS2_FIXTURE;
        const c2 = 1.2 * f.c;
        const h = f.h0 / resolution;
        const u = (x: number, t: number): number => dalembert(x, t, f.c);
        const utt = (u(f.x, f.t + h) - 2 * u(f.x, f.t) + u(f.x, f.t - h)) / (h * h);
        const uxx = (u(f.x + h, f.t) - 2 * u(f.x, f.t) + u(f.x - h, f.t)) / (h * h);
        return Math.abs(utt - c2 * c2 * uxx);
      },
    }),
  },
  {
    id: 'WS4',
    wrong: 'the Klein–Gordon phase velocity tends to 1.1c',
    override: (s) => ({ ...s, target: 1.1 * WS4_FIXTURE.c }),
  },
  {
    id: 'WD6',
    wrong: 'the FAST telegraph root (1 + √(1−4ε))/(2ε), not the slow one, tends to Dq²',
    override: (s) => ({
      ...s,
      evaluate: (resolution) => {
        const eps = (WD6_FIXTURE.tau0 / resolution) * WD6_FIXTURE.D * WD6_FIXTURE.q ** 2;
        return (1 + Math.sqrt(1 - 4 * eps)) / (2 * eps);
      },
    }),
  },
  {
    id: 'WD7',
    wrong: 'the telegraph frequency tends to √D·q (wave speed without the 1/√τ)',
    override: (s) => ({
      ...s,
      evaluate: (resolution) => {
        const eps = WD7_FIXTURE.eps0 * resolution * WD7_FIXTURE.D * WD7_FIXTURE.q ** 2;
        return Math.sqrt(4 * eps - 1) / (2 * eps);
      },
    }),
  },
  {
    id: 'WD8',
    wrong: 'the steady state is UNIFORM at the mean end temperature, not the linear profile',
    override: (s) => ({
      ...s,
      evaluate: (resolution) => {
        const mean = (WD8_FIXTURE.tLeft + WD8_FIXTURE.tRight) / 2;
        return heatSteadyDeviation(resolution, WD8_FIXTURE, () => mean);
      },
    }),
  },
  {
    id: 'WS5',
    wrong: 'the kinetic term is x² rather than x²/2 (a dictionary factor error)',
    override: (s) => ({
      ...s,
      evaluate: (resolution) => {
        const x = WS5_FIXTURE.x0 / resolution;
        return Math.abs((Math.sqrt(1 + x * x) - 1) / (x * x) - 1);
      },
    }),
  },
  {
    id: 'WS6',
    wrong: 'the uniform mode oscillates at ω₀², not ω₀',
    override: (s) => ({ ...s, target: Math.cos(WS6_FIXTURE.omega0 ** 2 * WS6_FIXTURE.tEnd) }),
  },
  {
    id: 'WS7',
    wrong: 'the flexible-string limit is √(Fμ), not √(F/μ)',
    override: (s) => ({ ...s, target: Math.sqrt(WS7_FIXTURE.F * WS7_FIXTURE.mu) }),
  },
];

for (const { id, wrong, override } of NUMERIC_CONTROLS) {
  describe(`${id} — negative control`, () => {
    it(`a WRONG hypothesis does not check: ${wrong}`, () => {
      const r = runNumericWitness(override(numeric(id)));
      expect(r.status).not.toBe('checked');
      expect(r.status).toBe('refuted');
    });

    it('META-CHECK: the same assertion FAILS on the true claim (the control can fail)', () => {
      expect(runNumericWitness(numeric(id)).status).toBe('checked');
    });
  });
}

// ── CAS: the premise pushed through a WRONG dictionary ─────────────────────

const op = (o: '*' | '/' | '^', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });
const n = (value: number): ExprNode => sym(String(value), DIMENSIONLESS);

/** Push `expr` through a dictionary, refusing an entry that matches no leaf. */
function through(expr: ExprNode, dictionary: ReadonlyArray<[string, ExprNode]>): ExprNode {
  let out = expr;
  for (const [name, rep] of dictionary) {
    const r = substitute(out, name, rep);
    if (r.count === 0) throw new Error(`control dictionary entry '${name}' matches no leaf`);
    out = r.expr;
  }
  return out;
}

const m = sym('m', MASS);
const k = sym('k', SPRING_CONSTANT);
const b = sym('b', DAMPING);
const L = sym('L', INDUCTANCE);
const C = sym('C', CAPACITANCE);
const R = sym('R', RESISTANCE);
const kappa = sym('kappa', THERMAL_CONDUCTIVITY);
const rho = sym('rho', DENSITY);
const cp = sym('cp', SPECIFIC_HEAT);
const D = sym('D', DIFFUSIVITY);
const q = sym('q', { ...LENGTH, L: -1 });
const kT = sym('kT', ENERGY);
const gamma = sym('gamma', DAMPING);
const eta = sym('eta', VISCOSITY);
const a = sym('a', LENGTH);
const pi = sym('pi', DIMENSIONLESS);

const CAS_CONTROLS: ReadonlyArray<{ id: string; wrong: string; lhs: () => ExprNode }> = [
  {
    id: 'W2s',
    wrong: 'b ↦ 1/R (conductance) instead of b ↦ R',
    lhs: () =>
      through(op('/', op('^', b, n(2)), op('*', n(4), m, k)), [
        ['m', L],
        ['k', op('/', n(1), C)],
        ['b', op('/', n(1), R)],
      ]),
  },
  {
    id: 'WD2s',
    wrong: 'κ ↦ D/(ρ c_p) — the dictionary inverted',
    lhs: () =>
      through(op('/', op('*', kappa, op('^', q, n(2))), op('*', rho, cp)), [
        ['kappa', op('/', D, op('*', rho, cp))],
      ]),
  },
  {
    id: 'WD5s',
    wrong: 'γ ↦ 6πη/a — Stokes drag with the radius in the denominator',
    lhs: () => through(op('/', kT, gamma), [['gamma', op('/', op('*', n(6), pi, eta), a)]]),
  },
];

for (const { id, wrong, lhs } of CAS_CONTROLS) {
  describe(`${id} — negative control`, () => {
    it(`a WRONG dictionary does not check: ${wrong}`, async () => {
      if (!peerPresent && !peerRequired) return;
      const r = await runSymbolicWitness({ ...symbolic(id), id: `${id}-wrong`, lhs: lhs() });
      expect(r.status).not.toBe('checked');
    });

    it('META-CHECK: the same assertion FAILS on the true claim (the control can fail)', async () => {
      if (!peerPresent && !peerRequired) return;
      expect((await runSymbolicWitness(symbolic(id))).status).toBe('checked');
    });
  });
}

describe('coverage — every registered witness now has a negative control', () => {
  it('the 12 here plus the 10 elsewhere are exactly the registry', () => {
    const here = [...NUMERIC_CONTROLS.map((c) => c.id), ...CAS_CONTROLS.map((c) => c.id)];
    const elsewhere = ['WD2', 'WD3', 'WD4', 'WS1', 'WS3', 'W1s', 'W1τ', 'W7', 'W8b', 'W9'];
    expect(here.length).toBe(12);
    expect([...here, ...elsewhere].sort()).toEqual(WITNESS_REGISTRY.map((w) => w.spec.id).sort());
  });
});
