/**
 * Atlas Phase 4, S4.3 — the EXECUTABLE witness registry.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §3.
 *
 * A `Witness` record names a check and the test file that runs it; it carries
 * nothing a runner can execute. This module holds the executable form of every
 * witness the results artifact covers, keyed by the record it supports. The
 * Lead-run `scripts/emit-witness-results.mjs` runs exactly this list, and
 * `tests/atlas/witness-results.test.ts` deep-equals the committed artifact
 * against a fresh run of it.
 *
 * ## The symbolic specs apply the bridge's DICTIONARY, they do not restate it
 *
 * Writing `lhs` and `rhs` as two hand-typed ASTs that happen to be equal would
 * check nothing but the typist. Each spec below starts from the PREMISE
 * model's expression and pushes it through the bridge's variable dictionary
 * with `substitute`; the CAS then has to show that the result equals the
 * CONCLUSION model's expression. What is checked is the dictionary.
 *
 * @module atlas/witness-specs
 * @internal
 */

import type { ExprNode } from '../dimensional/ast-types.js';
import { sym } from '../dimensional/ast-builders.js';
import { DIMENSIONLESS, ENERGY, LENGTH, MASS } from '../dimensional/types.js';
import { substitute } from '../composition/expr-subst.js';
import {
  CAPACITANCE,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from './oscillators/dimensions.js';
import {
  heatSteadyDeviation,
  langevinMsdRatio,
  telegraphSlowRateRatio,
  telegraphWaveFrequencyRatio,
  diffusionKernel,
  gaussianSpread,
  heatFtcsCentre,
  randomWalkCentralDensity,
  wickHeatResidual,
} from './diffusion/numerics.js';
import type {
  HeatFixture,
  LangevinFixture,
  SteadyStateFixture,
  WickFixture,
} from './diffusion/numerics.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from './diffusion/dimensions.js';
import { VISCOSITY } from './diffusion/models.js';
import { wickRotatedFreeKernel } from './witnesses/quantum-support.js';
import {
  kgNonrelativisticError,
  kgUniformModeValue,
  stiffStringPhaseVelocity,
  acousticLeapfrogQuarter,
  dalembertResidual,
  kleinGordonPhaseVelocity,
  stringLeapfrogMidpoint,
} from './waves/numerics.js';
import type { AcousticFixture, DalembertFixture, StringFixture } from './waves/numerics.js';
import { pendulumPeriodErrorAt } from './oscillators/bridges-limits.js';
import { SPRING_LC_RELATIVE_PERIOD_TRANSPORT, W1TAU_FIXTURE } from './oscillators/norm-transport.js';
import { measureTransportedPeriodError } from './oscillators/norm-transport-witness.js';
import { dampedOffsetBoundAt } from './oscillators/bridges-limits.js';
import { dispersionErrorApproximation } from './oscillators/bridges-coarse.js';
import {
  measureChainDispersionError,
  measureMasslessOffset,
  measurePendulumPeriodRatio,
  W7_FIXTURE,
  W8B_FIXTURE,
  W9_FIXTURE,
} from './oscillators/limit-witnesses.js';
import type { NumericWitnessSpec } from './witness-numeric.js';
import type { SymbolicWitnessSpec } from './witness-symbolic.js';

/** A symbolic spec bound to the record it supports. @internal */
export interface RegisteredSymbolicWitness {
  /** The `AtlasBridge.id` (or other record id) the witness belongs to. */
  readonly recordId: string;
  readonly kind: 'symbolic';
  readonly spec: SymbolicWitnessSpec;
}

/**
 * The claim of its record a witness tests. `tests/atlas/witness-claims.test.ts`
 * checks each attribution against the spec.
 *
 * - `'bound'`: at `at(fineResolution)`, a point inside the record's regime, the
 *   witness's error is the bound's own quantity in the bound's norm (it equals
 *   `deltaAt` there: the bound is sharp), and its tolerance is no looser than
 *   `delta`, so the bound failing there refutes the witness.
 * - `'bound-holds-at'`: for a bound that is not sharp. At that point, inside the
 *   regime, the witness's error is measured in the bound's norm and its
 *   tolerance IS `deltaAt` there, so the bound failing at that point refutes the
 *   witness. That the spec measures the bound's norm is checked beside the spec.
 * - `'preserves'`: the witness tests `item`, one entry of the record's
 *   `preserves`, at a point inside the regime.
 *
 * @internal
 */
export type WitnessClaim =
  | {
      readonly name: 'bound' | 'bound-holds-at';
      /** The point the spec evaluates at a resolution, in the names the bound's `deltaAt` reads. */
      readonly at: (resolution: number) => Readonly<Record<string, number>>;
    }
  | {
      readonly name: 'preserves';
      /** One entry of the record's `preserves`, verbatim. */
      readonly item: string;
      /** The point the spec evaluates at a resolution, in the names the regime's groups read. */
      readonly at: (resolution: number) => Readonly<Record<string, number>>;
    };

/** A numeric spec bound to the record it supports. @internal */
export interface RegisteredNumericWitness {
  readonly recordId: string;
  readonly kind: 'numeric';
  readonly spec: NumericWitnessSpec;
  /** Absent: the witness is not attributed to any one claim of its record. */
  readonly claim?: WitnessClaim;
}

/** One entry of the registry. @internal */
export type RegisteredWitness = RegisteredSymbolicWitness | RegisteredNumericWitness;

const op = (o: '*' | '/' | '+' | '-' | '^', ...args: ExprNode[]): ExprNode => ({
  kind: 'op',
  op: o,
  args,
});
const n = (value: number): ExprNode => sym(String(value), DIMENSIONLESS);

/**
 * Push `expr` through a variable dictionary, REFUSING a mapping that matches no
 * leaf. A zero-occurrence substitution is a silent no-op that would leave the
 * premise variable in place and let the check pass or fail for the wrong
 * reason — the same guard `composeSymbolic` applies (Adam A-3).
 */
function applyDictionary(expr: ExprNode, dictionary: Readonly<Record<string, ExprNode>>): ExprNode {
  let out = expr;
  for (const [name, replacement] of Object.entries(dictionary)) {
    const r = substitute(out, name, replacement);
    if (r.count === 0) {
      throw new Error(`witness-specs: dictionary entry '${name}' matches no leaf`);
    }
    out = r.expr;
  }
  return out;
}

// Spring and LC symbols, with the dimensions the oscillator models declare.
const m = sym('m', MASS);
const k = sym('k', SPRING_CONSTANT);
const b = sym('b', DAMPING);
const L = sym('L', INDUCTANCE);
const C = sym('C', CAPACITANCE);
const R = sym('R', RESISTANCE);

/** The spring ↔ circuit dictionary of `ab-spring-lc` / `ab-damped-rlc`: m ↔ L, k ↔ 1/C, b ↔ R. */
const SPRING_TO_CIRCUIT: Readonly<Record<string, ExprNode>> = {
  m: L,
  k: op('/', n(1), C),
  b: R,
};

// ── Diffusion family (S4.4) ────────────────────────────────────────────────

/** WD1 fixture: D and t, fixed while the walk is refined. @internal */
export const WD1_FIXTURE = { D: 0.5, t: 2 } as const;

/**
 * WD2 fixture. κ, ρ and c_p are chosen so the heat equation's own variables
 * are all different from 1 while κ/(ρ c_p) = 1: a dictionary that dropped or
 * inverted a factor would move the answer.
 *
 * @internal
 */
export const WD2_FIXTURE: HeatFixture = {
  kappa: 2,
  rho: 4,
  cp: 0.5,
  s0: 0.05,
  tEnd: 0.2,
  halfWidth: 4,
};

/** WD3 fixture: an off-centre point, so no symmetry zeroes a derivative. @internal */
export const WD3_FIXTURE: WickFixture = { hbar: 1, m: 0.5, s: 0.7, x: 0.3, tau: 0.4, h0: 0.1 };

const kappa = sym('kappa', THERMAL_CONDUCTIVITY);
const rho = sym('rho', DENSITY);
const cp = sym('cp', SPECIFIC_HEAT);
const D = sym('D', DIFFUSIVITY);
const q = sym('q', { ...LENGTH, L: -1 });

// ── Wave family (S4.5) ─────────────────────────────────────────────────────

/** WS1 fixture: F and μ both ≠ 1 while c = √(F/μ) = 2. @internal */
export const WS1_FIXTURE: StringFixture = { tension: 2, mu: 0.5, tEnd: 0.3 };

/** WS2 fixture: an off-centre point where both profiles contribute. @internal */
export const WS2_FIXTURE: DalembertFixture = { c: 1.5, x: 0.4, t: 0.3, h0: 0.1 };

/** WS3 fixture: γ = 1.4 with nondimensional p₀ = 1, ρ₀ = 1.2. @internal */
export const WS3_FIXTURE: AcousticFixture = { p0: 1, rho0: 1.2, gamma: 1.4, tEnd: 0.37 };

/** WS4 fixture: ω₀ = c = 1, base wavenumber k₀ = 10 (the domain edge ω₀/(ck) = 0.1). @internal */
export const WS4_FIXTURE = { omega0: 1, c: 1, k0: 10 } as const;

// ── Sprint 4 closure ───────────────────────────────────────────────────────

/** WD4 fixture: m, γ, k_BT all ≠ 1; τ_p = m/γ = 4. @internal */
export const WD4_FIXTURE: LangevinFixture = { m: 2, gamma: 0.5, kT: 1.5 };

/** WD6 base: τ₀ = 0.1 with D = q = 1, so ε = τ at the resolution's τ = τ₀/resolution. @internal */
export const WD6_FIXTURE = { tau0: 0.1, D: 1, q: 1 } as const;

/** WD7 base: ε = 25 · resolution with D = q = 1. @internal */
export const WD7_FIXTURE = { eps0: 25, D: 1, q: 1 } as const;

/** WD8 fixture: a unit rod held at 2 and 5, base time 0.1 (Fourier number 0.1 per unit). @internal */
export const WD8_FIXTURE: SteadyStateFixture = {
  alpha: 1,
  ell: 1,
  tLeft: 2,
  tRight: 5,
  t0: 0.1,
  cells: 40,
};

/** WS5 base: x₀ = ck/ω₀ = 0.1, halved per resolution step. @internal */
export const WS5_FIXTURE = { x0: 0.1 } as const;

/** WS6 fixture: c = 1, ω₀ = 2, t = 3; resolution = time steps. @internal */
export const WS6_FIXTURE = { c: 1, omega0: 2, tEnd: 3 } as const;

/** WS7 fixture: F = 100, μ = 0.01 (so √(F/μ) = 100), EI = 0.01, k₀ = 10 (β = 0.01 at res 1). @internal */
export const WS7_FIXTURE = { F: 100, mu: 0.01, EI: 0.01, k0: 10 } as const;

const kT = sym('kT', ENERGY);
const gammaSym = sym('gamma', DAMPING);
const eta = sym('eta', VISCOSITY);
const a = sym('a', LENGTH);
const pi = sym('pi', DIMENSIONLESS);

/**
 * Every witness the results artifact covers, in a fixed order (the artifact is
 * emitted in this order, so reordering is a reviewable diff, not churn).
 *
 * @internal
 */
export const WITNESS_REGISTRY: readonly RegisteredWitness[] = [
  {
    // ω0² of the spring, pushed through the dictionary, is ω0² of the LC circuit.
    recordId: 'ab-spring-lc',
    kind: 'symbolic',
    spec: {
      id: 'W1s',
      lhs: applyDictionary(op('/', k, m), { m: SPRING_TO_CIRCUIT['m']!, k: SPRING_TO_CIRCUIT['k']! }),
      rhs: op('/', n(1), op('*', L, C)),
    },
  },
  {
    // ζ² of the damped spring, b²/(4mk), pushed through the dictionary, is ζ² of
    // the RLC circuit, R²C/(4L). The squared form avoids a fractional exponent
    // on a dimensioned base, which the grammar forbids.
    recordId: 'ab-damped-rlc',
    kind: 'symbolic',
    spec: {
      id: 'W2s',
      lhs: applyDictionary(op('/', op('^', b, n(2)), op('*', n(4), m, k)), SPRING_TO_CIRCUIT),
      rhs: op('/', op('*', op('^', R, n(2)), C), op('*', n(4), L)),
    },
  },
  {
    // Norm transport, not a bridge claim: the pendulum's image under ab-spring-lc's
    // map, integrated in circuit time, has K times the pendulum's relative period
    // error against the circuit. Keyed by the transport id, so the bridge's own
    // evidence is not derived from it (ADR-transported-norm-composition.md §4).
    recordId: SPRING_LC_RELATIVE_PERIOD_TRANSPORT.id,
    kind: 'numeric',
    spec: {
      id: SPRING_LC_RELATIVE_PERIOD_TRANSPORT.witness.id,
      evaluate: (steps) => measureTransportedPeriodError(W1TAU_FIXTURE.theta0, steps),
      target: SPRING_LC_RELATIVE_PERIOD_TRANSPORT.KAt({}) * pendulumPeriodErrorAt({ theta0: W1TAU_FIXTURE.theta0 }),
      coarseResolution: 160,
      fineResolution: 640,
      tolerance: 1e-9,
    },
  },
  {
    // Coarse-graining: the walk's density at the origin converges to the
    // diffusion kernel as the closure D = Δx²/(2Δt) is held and Δt → 0.
    recordId: 'ab-walk-diffusion',
    kind: 'numeric',
    spec: {
      id: 'WD1',
      evaluate: (steps) => randomWalkCentralDensity(steps, WD1_FIXTURE.D, WD1_FIXTURE.t),
      target: diffusionKernel(0, WD1_FIXTURE.t, WD1_FIXTURE.D),
      coarseResolution: 100,
      fineResolution: 1000,
      tolerance: 1e-4,
    },
  },
  {
    // Exact equivalence: the HEAT equation, solved in κ, ρ, c_p, reproduces the
    // FICK solution with D = κ/(ρ c_p).
    recordId: 'ab-heat-diffusion',
    kind: 'numeric',
    spec: {
      id: 'WD2',
      evaluate: (cells) => heatFtcsCentre(cells, WD2_FIXTURE),
      target: gaussianSpread(
        0,
        WD2_FIXTURE.tEnd,
        WD2_FIXTURE.kappa / (WD2_FIXTURE.rho * WD2_FIXTURE.cp),
        WD2_FIXTURE.s0,
      ),
      coarseResolution: 80,
      fineResolution: 160,
      tolerance: 5e-4,
    },
  },
  {
    // The heat side's Fourier-mode decay rate κq²/(ρ c_p), pushed through the
    // inverse dictionary κ ↦ D ρ c_p, is the Fick side's D q².
    recordId: 'ab-heat-diffusion',
    kind: 'symbolic',
    spec: {
      id: 'WD2s',
      lhs: applyDictionary(op('/', op('*', kappa, op('^', q, n(2))), op('*', rho, cp)), {
        kappa: op('*', D, rho, cp),
      }),
      rhs: op('*', D, op('^', q, n(2))),
    },
  },
  {
    // Analytic continuation: the Wick-rotated free kernel satisfies the
    // diffusion equation with D = ħ/(2m); the residual's target is zero.
    recordId: 'ab-schrodinger-diffusion',
    kind: 'numeric',
    spec: {
      id: 'WD3',
      evaluate: (resolution) => wickHeatResidual(resolution, WD3_FIXTURE, wickRotatedFreeKernel),
      target: 0,
      coarseResolution: 1,
      fineResolution: 4,
      tolerance: 1e-3,
    },
  },
  {
    // Restriction: the string, solved in F and μ, reproduces the 1-D wave
    // solution with c = √(F/μ).
    recordId: 'ab-string-wave',
    kind: 'numeric',
    spec: {
      id: 'WS1',
      evaluate: (cells) => stringLeapfrogMidpoint(cells, WS1_FIXTURE),
      target:
        Math.sin(Math.PI * 0.5) *
        Math.cos(Math.PI * Math.sqrt(WS1_FIXTURE.tension / WS1_FIXTURE.mu) * WS1_FIXTURE.tEnd),
      coarseResolution: 40,
      fineResolution: 80,
      tolerance: 2e-4,
    },
  },
  {
    // Derivation: d'Alembert's form satisfies the wave equation; residual → 0.
    recordId: 'ab-wave-dalembert',
    kind: 'numeric',
    spec: {
      id: 'WS2',
      evaluate: (resolution) => dalembertResidual(resolution, WS2_FIXTURE),
      target: 0,
      coarseResolution: 4,
      fineResolution: 8,
      tolerance: 2e-3,
    },
  },
  {
    // Hyperedge: linearized Euler closed by the adiabatic EOS reproduces the
    // sound model with c_s² = γp₀/ρ₀.
    recordId: 'ab-sound-speed',
    kind: 'numeric',
    spec: {
      id: 'WS3',
      evaluate: (cells) => acousticLeapfrogQuarter(cells, WS3_FIXTURE),
      target: Math.cos(
        2 * Math.PI * Math.sqrt((WS3_FIXTURE.gamma * WS3_FIXTURE.p0) / WS3_FIXTURE.rho0) * WS3_FIXTURE.tEnd,
      ),
      coarseResolution: 64,
      fineResolution: 128,
      tolerance: 2e-4,
    },
  },
  {
    // Approximation: the Klein–Gordon phase velocity tends to c as k grows.
    recordId: 'ab-klein-gordon-wave',
    kind: 'numeric',
    spec: {
      id: 'WS4',
      evaluate: (resolution) =>
        kleinGordonPhaseVelocity(resolution, WS4_FIXTURE.omega0, WS4_FIXTURE.c, WS4_FIXTURE.k0),
      target: WS4_FIXTURE.c,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 2e-3,
    },
    claim: {
      name: 'bound',
      at: (resolution) => ({ omega0: WS4_FIXTURE.omega0, c: WS4_FIXTURE.c, k: WS4_FIXTURE.k0 * resolution }),
    },
  },
  // ── Sprint 4 closure ─────────────────────────────────────────────────────
  {
    // Coarse-graining: Langevin second moments at t = resolution · τ_p, over 2Dt.
    recordId: 'ab-langevin-diffusion',
    kind: 'numeric',
    spec: {
      id: 'WD4',
      evaluate: (resolution) => langevinMsdRatio(resolution, WD4_FIXTURE),
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 0.02,
    },
  },
  {
    // Hyperedge: γ = 6πηa pushed into Einstein's D = k_BT/γ.
    recordId: 'ab-stokes-einstein',
    kind: 'symbolic',
    spec: {
      id: 'WD5s',
      lhs: applyDictionary(op('/', kT, gammaSym), { gamma: op('*', n(6), pi, eta, a) }),
      rhs: op('/', kT, op('*', n(6), pi, eta, a)),
    },
  },
  {
    // Singular limit τ → 0: the telegraph slow rate over Dq² tends to 1.
    recordId: 'ab-telegraph-diffusion',
    kind: 'numeric',
    spec: {
      id: 'WD6',
      evaluate: (resolution) =>
        telegraphSlowRateRatio(WD6_FIXTURE.tau0 / resolution, WD6_FIXTURE.D, WD6_FIXTURE.q),
      target: 1,
      coarseResolution: 2,
      fineResolution: 4,
      tolerance: 0.03,
    },
    claim: {
      name: 'bound',
      at: (resolution) => ({ tau: WD6_FIXTURE.tau0 / resolution, D: WD6_FIXTURE.D, q: WD6_FIXTURE.q }),
    },
  },
  {
    // ε → ∞: the telegraph oscillation frequency over c q tends to 1.
    recordId: 'ab-telegraph-wave',
    kind: 'numeric',
    spec: {
      id: 'WD7',
      evaluate: (resolution) =>
        telegraphWaveFrequencyRatio(WD7_FIXTURE.eps0 * resolution, WD7_FIXTURE.D, WD7_FIXTURE.q),
      target: 1,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 3e-3,
    },
    claim: {
      name: 'bound',
      at: (resolution) => ({
        tau: (WD7_FIXTURE.eps0 * resolution) / (WD7_FIXTURE.D * WD7_FIXTURE.q ** 2),
        D: WD7_FIXTURE.D,
        q: WD7_FIXTURE.q,
      }),
    },
  },
  {
    // Steady state: the heat solution's deviation from the Laplace profile → 0.
    recordId: 'ab-heat-laplace',
    kind: 'numeric',
    spec: {
      id: 'WD8',
      evaluate: (resolution) => heatSteadyDeviation(resolution, WD8_FIXTURE),
      target: 0,
      coarseResolution: 2,
      fineResolution: 4,
      tolerance: 0.025,
    },
  },
  {
    // Non-relativistic limit: kinetic-frequency error → 0 as x = ck/ω₀ halves.
    recordId: 'ab-kg-schrodinger',
    kind: 'numeric',
    spec: {
      id: 'WS5',
      evaluate: (resolution) => kgNonrelativisticError(WS5_FIXTURE.x0 / resolution),
      target: 0,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 1e-3,
    },
    // The spec reads only x = ck/ω₀; c = ω₀ = 1 is one point with that x.
    claim: { name: 'bound', at: (resolution) => ({ c: 1, omega0: 1, k: WS5_FIXTURE.x0 / resolution }) },
  },
  {
    // Uniform-mode restriction: the full KG PDE, uniform data, vs cos(ω₀t).
    recordId: 'ab-kg-oscillator',
    kind: 'numeric',
    spec: {
      id: 'WS6',
      evaluate: (steps) =>
        kgUniformModeValue(steps, WS6_FIXTURE.c, WS6_FIXTURE.omega0, WS6_FIXTURE.tEnd),
      target: Math.cos(WS6_FIXTURE.omega0 * WS6_FIXTURE.tEnd),
      coarseResolution: 50,
      fineResolution: 100,
      tolerance: 3e-4,
    },
  },
  {
    // Flexible-string limit: stiff-string phase velocity → √(F/μ) as k shrinks.
    recordId: 'ab-stiff-string',
    kind: 'numeric',
    spec: {
      id: 'WS7',
      evaluate: (resolution) =>
        stiffStringPhaseVelocity(resolution, WS7_FIXTURE.F, WS7_FIXTURE.mu, WS7_FIXTURE.EI, WS7_FIXTURE.k0),
      target: Math.sqrt(WS7_FIXTURE.F / WS7_FIXTURE.mu),
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 0.15,
    },
    claim: {
      name: 'bound',
      at: (resolution) => ({
        F: WS7_FIXTURE.F,
        mu: WS7_FIXTURE.mu,
        EI: WS7_FIXTURE.EI,
        k: WS7_FIXTURE.k0 / resolution,
      }),
    },
  },
  // ── The three oscillator bridges that had no in-process witness ──────────
  {
    // Regular limit θ0 → 0: T/T0 of the pendulum, integrated by RK4, tends to 1.
    // The tolerance is the upper end W7 records, 0.002507 at θ0 = 0.2; the
    // bound's deltaAt there is the AGM form, a second method.
    recordId: 'ab-pendulum-linear',
    kind: 'numeric',
    spec: {
      id: 'W7',
      evaluate: (resolution) => measurePendulumPeriodRatio(W7_FIXTURE.theta0 / resolution),
      target: 1,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 0.002507,
    },
    claim: { name: 'bound', at: (resolution) => ({ theta0: W7_FIXTURE.theta0 / resolution }) },
  },
  {
    // Singular limit m → 0: the full damped spring's offset from the reduced
    // model outside the layer, integrated by RK4; the tolerance is the bound's
    // own deltaAt at the fine mass, which is not sharp there.
    recordId: 'ab-damped-massless',
    kind: 'numeric',
    spec: {
      id: 'W8b',
      evaluate: (resolution) => measureMasslessOffset(W8B_FIXTURE.m / resolution),
      target: 0,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: dampedOffsetBoundAt({ m: W8B_FIXTURE.m / 2, b: W8B_FIXTURE.b, k: W8B_FIXTURE.k, x0: W8B_FIXTURE.x0, v0: W8B_FIXTURE.v0 }),
    },
    claim: {
      name: 'bound-holds-at',
      at: (resolution) => ({ m: W8B_FIXTURE.m / resolution, b: W8B_FIXTURE.b, k: W8B_FIXTURE.k, x0: W8B_FIXTURE.x0, v0: W8B_FIXTURE.v0 }),
    },
  },
  {
    // Coarse-graining, long wavelength: 1 − ω/(c q) measured on the integrated
    // ring, over (qa)²/24, tends to 1 within the 0.5% W9 records.
    recordId: 'ab-chain-wave',
    kind: 'numeric',
    spec: {
      id: 'W9',
      evaluate: (resolution) => {
        const masses = W9_FIXTURE.masses * resolution;
        return measureChainDispersionError(masses) / dispersionErrorApproximation((2 * Math.PI) / masses);
      },
      target: 1,
      coarseResolution: 1,
      fineResolution: 2,
      tolerance: 0.005,
    },
    claim: {
      name: 'preserves',
      item: 'long-wavelength dispersion ω ≈ c q',
      at: (resolution) => ({ qa: (2 * Math.PI) / (W9_FIXTURE.masses * resolution) }),
    },
  },
];
