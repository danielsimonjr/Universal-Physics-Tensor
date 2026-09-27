/**
 * The two Phase 0 APPROXIMATION bridges — design note §3, bridges 3 and 4.
 *
 * - `ab-pendulum-linear` — a REGULAR limit. `θ'' + ω0² sin θ = 0` reduces to
 *   `θ'' + ω0² θ = 0` as `θ0 → 0`. The order of the system does not drop, the
 *   error is `O(θ0²)` in the relative period, and the approximation is
 *   NON-UNIFORM in time: a fixed relative period error accumulates phase
 *   without bound, so the bound carries the horizon `t ≪ 16 T0/θ0²`.
 * - `ab-damped-massless` — a SINGULAR limit. `m x'' + b x' + k x = 0` reduces
 *   to `b x' + k x = 0` as `m → 0`. The order DROPS from two to one, one
 *   initial condition is lost, and the reduced model cannot satisfy `x'(0)`.
 *   The bound therefore holds only OUTSIDE the boundary layer, `t ≥ 5 m/b`.
 *
 * On the position offset of the singular bridge: `x_full − x_red` is an
 * `O((1 + |v0|) m)` deviation that PERSISTS THROUGHOUT THE OUTER REGION and
 * decays only on the slow time scale `b/k`. It is the matched-asymptotics
 * correction, not a boundary-layer transient, and waiting out the fast mode
 * does not remove it. (Design note §9 YELLOW (5) — "non-vanishing" was the
 * imprecise wording this replaces: the offset does go to zero as `t → ∞`.)
 *
 * @module atlas/oscillators/bridges-limits
 */

import { deriveRegimeGroups } from '../regime.js';
import { MissingHorizonError } from '../types.js';
import type { ApproximationBound, AtlasBridge, RelationContract, Regime } from '../types.js';
import { relationContractOf } from './bridges-exact.js';
import { DAMPING, SPRING_CONSTANT } from './dimensions.js';
import { ACCELERATION, LENGTH, MASS } from '../../dimensional/types.js';

const FAMILY = 'oscillators';
const TEST_FILE = 'tests/atlas/oscillators-limits.test.ts';

/**
 * Build an `ApproximationBound`, rejecting one with no prose horizon.
 *
 * Every `approximation` bridge in this module is constructed through here, so
 * the mandatory-horizon rule of `ApproximationBound` has something that FAILS
 * rather than a comment asking for compliance. `horizonHolds` is mandatory by
 * the type; the prose `horizon` is the field a caller can satisfy with `''`,
 * so it is the one checked at run time. `uniformity: null` is accepted: not
 * yet analysed is a real state, and the refusal lives in `boundPath`.
 *
 * @throws MissingHorizonError if `horizon` is empty or whitespace.
 * @internal
 */
export function makeApproximation(bound: ApproximationBound): ApproximationBound {
  if (bound.horizon.trim() === '') {
    throw new MissingHorizonError(
      'an approximation bound requires a non-empty prose horizon beside horizonHolds',
    );
  }
  return bound;
}

/** Arithmetic–geometric mean, the standard evaluation route for `K`. @internal */
export function agm(a0: number, b0: number): number {
  let a = a0;
  let b = b0;
  for (let i = 0; i < 60 && a !== b; i++) {
    [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  }
  return a;
}

/**
 * The EXACT relative period error of the pendulum at amplitude `theta0`:
 * `(2/π) K(sin(θ0/2)) − 1 = 1/AGM(1, cos(θ0/2)) − 1`.
 *
 * This is the machine form of `ab-pendulum-linear`'s `delta`. It is SHARP —
 * the bound equals the error it bounds — and it is strictly increasing in
 * `|θ0|`, so its value at the edge of a declared amplitude range is the
 * supremum over that range. That last property is what lets the record state
 * one scalar for the whole domain honestly.
 *
 * The series `θ0²/16` is the LEADING TERM of this quantity, not an upper bound
 * on it: at the domain edge `θ0 = 0.5` the series gives `0.0156250` while the
 * exact error is `0.0158525311`, so the series UNDERSTATES by 1.456%. A record
 * that declares the series value is violated at its own boundary.
 *
 * @returns `Infinity` outside `|θ0| < π`, where no finite period error exists.
 * @internal
 */
export function pendulumPeriodErrorAt(params: Readonly<Record<string, number>>): number {
  const { theta0 } = params;
  if (!Number.isFinite(theta0) || Math.abs(theta0) >= Math.PI) return Infinity;
  return 1 / agm(1, Math.cos(theta0 / 2)) - 1;
}

/**
 * The position-offset bound of `ab-damped-massless` at a point:
 * `2 (1 + |v0|) m / b`, the formula this record's docstring has always
 * carried. It is a bound ONLY at the witness normalisation `b = k = x0 = 1`:
 * the leading offset is `(m/b)(v0 + k x0/b)`, and the formula has no `k` or
 * `x0` in it. At `m = 1e-3, b = 1, k = 100` (inside `m k/b² < 1/4`) the true
 * error is more than 20 times the formula.
 *
 * @returns `Infinity` unless `m`, `b`, `k`, `x0` and `v0` are all finite and
 *   `b = k = x0 = 1` — a missing parameter would otherwise silently return a
 *   bound for a normalisation the caller did not ask about.
 * @internal
 */
export function dampedOffsetBoundAt(params: Readonly<Record<string, number>>): number {
  const { m, b, k, x0, v0 } = params;
  if (![m, b, k, x0, v0].every(Number.isFinite)) return Infinity;
  if (b !== 1 || k !== 1 || x0 !== 1) return Infinity;
  return (2 * (1 + Math.abs(v0)) * m) / b;
}

/** Pendulum regime: `θ0 ≤ 0.5 rad`, stated on the dimensionless input. @internal */
const PENDULUM_REGIME: Regime = {
  family: FAMILY,
  inequalities: [{ group: 'theta0', op: '<=', bound: 0.5, alias: 'θ0 ≤ 0.5 rad' }],
  groupDefinitions: deriveRegimeGroups(
    FAMILY,
    [
      { name: 'g', dim: ACCELERATION },
      { name: 'ell', dim: LENGTH },
    ],
    ['theta0'],
  ),
};

/**
 * Damped-spring regime: overdamped, `m k / b² < 1/4`.
 *
 * The inequality is written on the π-group, not on `ζ = ½ (m k / b²)^(−½)`,
 * which is a derived quantity and not a group (`RegimeInequality` doc).
 * `m k / b² < 1/4` is exactly `ζ > 1`, recorded as the display alias.
 *
 * @internal
 */
const DAMPED_REGIME: Regime = {
  family: FAMILY,
  inequalities: [{ group: 'm · b^-2 · k', op: '<', bound: 0.25, alias: 'ζ > 1' }],
  groupDefinitions: deriveRegimeGroups(
    FAMILY,
    [
      { name: 'm', dim: MASS },
      { name: 'b', dim: DAMPING },
      { name: 'k', dim: SPRING_CONSTANT },
    ],
    [],
  ),
};

/**
 * `ab-pendulum-linear` — small-angle pendulum → harmonic spring.
 *
 * `θ0²/16` is the leading term of the exact relative period error
 * `(2/π) K(sin(θ0/2)) − 1`. At `θ0 = 0.2` the residual is `5.744e-6`, which
 * the next series term `11 θ0⁴/3072 = 5.729e-6` accounts for to `1.5e-8`.
 *
 * `delta` is the EXACT error at the edge of the declared range, not that
 * series term. The record previously declared `0.5²/16 = 0.0156250`, which is
 * the series evaluated at `θ0 = 0.5` — and the exact error there is
 * `0.0158525311`, so the declared bound was VIOLATED AT ITS OWN BOUNDARY by
 * 1.456%. A truncated series is an approximation of the error, not a bound on
 * it, and the sign of its omitted tail decides which. Here the tail is
 * positive, so the series sits below what it was asked to cover.
 *
 * @internal
 */
export const AB_PENDULUM_LINEAR: AtlasBridge = {
  id: 'ab-pendulum-linear',
  relation: 'approximation',
  premises: ['model-pendulum'],
  conclusion: 'model-spring',
  transformation: 'sin θ → θ, with x ↔ ℓ θ and ω0² = g/ℓ',
  preserves: ['harmonic frequency ω0 to O(θ0²)', 'energy conservation', 'time-reversal symmetry'],
  doesNotPreserve: ['the amplitude dependence of the period', 'phase over times t ≳ 16 T0/θ0²'],
  sideConditions: ['θ0 ≤ 0.5 rad', 'the bound is a PERIOD error and is not uniform in time'],
  bound: makeApproximation({
    K: 1,
    // Sup over `θ0 ≤ 0.5`: the error is strictly increasing in |θ0|, so the
    // edge value IS the supremum. 0.0158525311014... (AGM), independently
    // reproduced by quadrature of the complete elliptic integral.
    delta: pendulumPeriodErrorAt({ theta0: 0.5 }),
    deltaAt: pendulumPeriodErrorAt,
    deltaAtBasis: 'closed-form',
    norm: 'relative period error, normalized by the value of the reduced model',
    domain: 'θ0 ≤ 0.5 rad',
    horizon: 't ≪ 16 T0/θ0²; machine form t < 4 T0/θ0², the π/2-drift time',
    // ⚠ The machine form is a QUARTER of the prose scale, and it must be.
    // `16 T0/θ0²` is the time at which the accumulated phase drift reaches a
    // FULL 2π (measured: 400 T0 at θ0 = 0.2, drift 6.2976 rad) — by then the
    // approximation has lapped, so `t < 16 T0/θ0²` is not a horizon at all.
    // The `≪` is what carries the whole claim, and `<` does not render it.
    // `4 T0/θ0²` is the π/2-drift time, which is exactly what W7b measures
    // independently (99.77 cycles at θ0 = 0.2). It is also what makes
    // `horizonHolds(200 T0)` false and `horizonHolds(10 T0)` true.
    horizonHolds: (t, params) => {
      const { T0, theta0 } = params;
      if (!Number.isFinite(T0) || !Number.isFinite(theta0) || theta0 === 0) return false;
      return t < (4 * T0) / theta0 ** 2;
    },
    parameterRange: 'θ0 ≤ 0.5 rad',
    limitCharacter: 'regular',
    // A period error. The record says it is not uniform in time, so time is
    // not listed.
    uniformity: ['one period, for θ0 in the stated domain'],
  }),
  regime: PENDULUM_REGIME,
  counterexamples: [
    {
      description:
        'the approximation is non-uniform in time: at θ0 = 0.2 the phase drift reaches π/2 ' +
        'after ~100 cycles, however small the per-cycle error is',
      witness: 'W7b',
    },
  ],
  evidence: new Set(['numerically-supported']),
  witnesses: [
    {
      id: 'W7',
      kind: 'numeric',
      test: TEST_FILE,
      tolerance: 'T/T0 − 1 ∈ [0.002505, 0.002507]; residual ∈ [5.70e-6, 5.76e-6] at θ0 = 0.2',
    },
    {
      id: 'W7b',
      kind: 'numeric',
      test: TEST_FILE,
      tolerance: 'cycles to π/2 drift ∈ [99, 101] at θ0 = 0.2',
    },
    {
      id: 'W7c',
      kind: 'numeric',
      test: TEST_FILE,
      tolerance: 'RK4 zero-crossing lag within 0.05° of the elliptic prediction 89.98°',
    },
  ],
  citations: [
    'Landau & Lifshitz, Mechanics §11 (pendulum period as a complete elliptic integral)',
    'Abramowitz & Stegun §17.6 (AGM evaluation of K)',
  ],
  reviewStatus: 'proposed',
  // Phase 4 S4.6. A checked counterpart of this bridge's TRANSFORMATION — the
  // linearized pendulum IS the harmonic oscillator with mass mℓ², spring
  // constant mgℓ, hence ω0² = g/ℓ. It does NOT certify `bound.delta`: Physlib's
  // period results concern `periodFormula`, which its own TODO has not yet tied
  // to the motion. Axioms measured with `#print axioms` on a local build at
  // this commit (positive control: a `sorry` prints `sorryAx`; none here). The probes and
  // their gate: `formal/physlib/`, `tools/formalref-axiom-gate/`.
  // Fidelity is earned in tests/atlas/formal-sanity.test.ts.
  formalRef: {
    system: 'lean4-physlib',
    statement:
      'ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff: for a smooth lift θ, ' +
      'θ̈ + ω²θ = 0 iff θ solves the equation of motion of toHarmonicOscillator (mass mℓ², ' +
      'spring constant mgℓ); with toHarmonicOscillator_ω, ω = √(g/ℓ)',
    version: 'physlib@5ad56e24de155462acd8478458292347393d5908 lean4:v4.34.0',
    axioms: ['propext', 'Classical.choice', 'Quot.sound'],
    fidelity: 'sanity-lemmas',
  },
};

/**
 * `ab-damped-massless` — the SINGULAR `m → 0` limit of the damped spring.
 *
 * `deltaAt = 2(1 + |v0|) m/b` bounds the position offset outside the boundary
 * layer, and `delta` is its supremum over the declared range rather than its
 * value at one fixture. The lost initial condition is visible in the VELOCITY: inside the
 * layer the reduced model's `x'` is wrong by O(1/m·…), and it is only after
 * `t ≈ 5 m/b` that the fast mode has decayed.
 *
 * @internal
 */
export const AB_DAMPED_MASSLESS: AtlasBridge = {
  id: 'ab-damped-massless',
  relation: 'approximation',
  premises: ['model-damped-spring'],
  conclusion: 'model-first-order',
  transformation: 'm → 0, dropping the m x″ term',
  preserves: ['the slow relaxation rate k/b to O(m)', 'the sign and monotonicity of the decay'],
  doesNotPreserve: [
    'the order of the system (two → one)',
    "the initial condition x'(0), which the reduced model cannot satisfy",
    'the fast mode r ≈ −b/m',
  ],
  sideConditions: [
    'overdamped: m k / b² < 1/4',
    'the bound holds only outside the boundary layer, t ≥ 5 m/b',
  ],
  bound: makeApproximation({
    K: 1,
    // Sup over the DECLARED range, not the fixture. `2(1+|v0|)m/b` increases
    // in both m and |v0|, and the declared range is `m k/b² < 1/4` with
    // `|v0| ≤ 5`; at the witness normalisation `b = k = 1` that is `m < 1/4`,
    // so the supremum is `2·(1+5)·(1/4) = 3`, approached at the open edge and
    // not attained. The record previously declared `2·(1+5)·1e-3 = 0.012`,
    // the same formula frozen at the ONE fixture mass `m = 1e-3` — true error
    // there is 5.96e-3, but at m = 0.24 it is 5.19e-1, forty times the
    // declared bound.
    // KNOWN LOOSENESS (0.47.0 persona re-test, L9 residual; documented, not
    // tightened): for x0 = 1 the measured sup of |x − x_reduced| over the whole
    // declared range (m < 1/4, |v0| ≤ 5, t ≥ 5m/b) is 0.524, at m ≈ 0.21 and
    // v0 = +5, and it does not grow toward critical damping (0.514 at
    // m = 0.249999). So δ = 3 holds but is 5.7× loose, and it exceeds the unit
    // signal it bounds. A tighter δ needs a bound with its own basis, not a grid
    // maximum; until then `upt path` withholds the point bound
    // (deltaAtBasis below). Independent check: the persona's
    // checks/recheck_047.py and a 115 × 2 grid over (m, ±5).
    delta: dampedOffsetBoundAt({ m: 0.25, b: 1, k: 1, x0: 1, v0: 5 }),
    deltaAt: dampedOffsetBoundAt,
    // Witness W8b supports it numerically for m ∈ {1e-1, 1e-2, 1e-3}; no proof covers it.
    deltaAtBasis: 'numerically-supported',
    norm: 'sup |x − x_reduced| for t ≥ 5 m/b',
    domain: 't ≥ 5 m/b, overdamped, at the witness normalisation b = k = 1',
    horizon: 't ≥ 5 m/b (outside the boundary layer)',
    horizonHolds: (t, params) => {
      const { m, b } = params;
      if (!Number.isFinite(m) || !Number.isFinite(b) || b === 0) return false;
      return t >= (5 * m) / b;
    },
    parameterRange: 'm k / b² < 1/4, |v0| ≤ 5; with b = k = 1 this is m < 1/4',
    limitCharacter: 'singular',
    uniformity: [
      't ≥ 5 m/b, overdamped, at the witness normalisation b = k = 1',
      'm k / b² < 1/4, |v0| ≤ 5',
    ],
  }),
  regime: DAMPED_REGIME,
  counterexamples: [
    {
      description:
        "inside the boundary layer the reduced model's velocity is wrong by O(1): at " +
        "t = 0.5 m/b with v0 = 5 the velocity error is 3.6, against x'_red = −1",
      witness: 'W8b',
    },
  ],
  evidence: new Set(['numerically-supported']),
  witnesses: [
    {
      id: 'W8',
      kind: 'numeric',
      test: TEST_FILE,
      tolerance: '|r_slow + k/b| < 2m and |r_fast·m + b| < 2m for m ∈ {1e-1, 1e-2, 1e-3}',
    },
    {
      id: 'W8b',
      kind: 'numeric',
      test: TEST_FILE,
      tolerance:
        "|x_full − x_red| < 2(1+v0)·m for t ≥ 5 m/b; |x'| error > 1 at 0.5 m/b and < 0.05 at 5 m/b",
    },
  ],
  citations: [
    "Kevorkian & Cole, Multiple Scale and Singular Perturbation Methods §2 (Tikhonov's theorem)",
    'Verhulst, Methods and Applications of Singular Perturbations §8 (boundary layers)',
  ],
  reviewStatus: 'proposed',
};

/** The two approximation bridges of this module, in design-note order. @internal */
export const LIMIT_BRIDGES: readonly AtlasBridge[] = [AB_PENDULUM_LINEAR, AB_DAMPED_MASSLESS];

/**
 * The two approximation bridges re-registered through `RelationContract`.
 *
 * The union REQUIRES `bound` on an `approximation`, and `ApproximationBound`
 * requires its own machine `horizonHolds`, so these two lines are what turn
 * Sprint 0's doc-comment requirement into a compile-and-throw one. Both bounds
 * are the records' own, measured ones — nothing is restated here.
 *
 * @internal
 */
export const CONTRACT_PENDULUM_LINEAR: RelationContract =
  relationContractOf(AB_PENDULUM_LINEAR);

/** @internal */
export const CONTRACT_DAMPED_MASSLESS: RelationContract =
  relationContractOf(AB_DAMPED_MASSLESS);

/** The two limit contracts, in design-note order. @internal */
export const LIMIT_CONTRACTS: readonly RelationContract[] = [
  CONTRACT_PENDULUM_LINEAR,
  CONTRACT_DAMPED_MASSLESS,
];
