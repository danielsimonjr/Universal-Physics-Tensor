/**
 * The two Phase 0 `exact-equivalence` bridges of design note §3.
 *
 * - `ab-spring-lc` — the lossless mechanical/electrical dictionary, exact with
 *   no side condition beyond positivity and losslessness.
 * - `ab-damped-rlc` — exact only ON a side condition: the two damping ratios
 *   must agree, `b/(2√(mk)) = (R/2)√(C/L)`.
 *
 * **Regimes carry no inequalities.** `RegimeInequality` expresses `<`, `<=`,
 * `>`, `>=` only, so the bridge-2 side condition — an EQUALITY between two
 * derived ratios — cannot be written as one. It is carried in
 * `sideConditions` as prose instead, and the equality is what witness W2
 * executes. Writing an inequality that merely resembles it would be a
 * fabricated constraint, so none is written. `groupDefinitions` is derived
 * from the premise and conclusion parameters by `deriveRegimeGroups`, exactly
 * as the models do; nothing there is hand-authored.
 *
 * **Evidence tags are witness-gated.** A tag appears only because a witness in
 * `tests/atlas/oscillators-exact.test.ts` passes and shows it.
 *
 * @module atlas/oscillators/bridges-exact
 */

import { physjsFormalRef } from '../physjs-ref.js';
import { deriveRegimeGroups } from '../regime.js';
import { getAtlasModel } from './models.js';
import type { AtlasBridge, Regime, RelationContract } from '../types.js';
import { SPRING_LC_RELATIVE_PERIOD_TRANSPORT } from './norm-transport.js';

const FAMILY = 'oscillators';

/** The witness test file every witness below runs in. */
const TEST = 'tests/atlas/oscillators-exact.test.ts';
/** Where the CAS witnesses W1s and W2s are named; the artifact pin runs them. */
const WITNESS_RESULTS_TEST = 'tests/atlas/witness-results.test.ts';

/**
 * Literature for the electromechanical analogy, NOT a pointer at our own plan.
 *
 * The previous value here was `docs/planning/Atlas-Phase-0-Design.md §3, §6` - a citation
 * naming the document that ASSERTED the claim. That is circular, and it is worse than an
 * empty array because it LOOKS sourced and would satisfy any check that only asks whether
 * `citations[]` is non-empty. Same failure class as the evidence-tag theatre that
 * `tests/atlas/evidence-rule.test.ts` exists to catch.
 *
 * Work and topic are cited rather than precise section numbers, because a section number
 * stated without checking the edition in hand is the same fabrication in a more confident
 * costume. `reviewStatus` stays 'proposed' until the independent physicist review lands.
 */
const CITATIONS: readonly string[] = [
  'Olson, Dynamical Analogies - the force-voltage (impedance) analogy between a mass-spring–damper and a series RLC circuit',
  'Feynman, Lectures on Physics Vol. II, chapter on resonance - the LC oscillator and its mechanical counterpart',
];

/**
 * Regime coordinates spanning a bridge's premise and conclusion parameters.
 *
 * The two models' parameter names are disjoint in both bridges, so the union
 * is a legal `deriveRegimeGroups` input.
 */
function bridgeRegime(premiseId: string, conclusionId: string): Regime {
  const parameters = [
    ...getAtlasModel(premiseId).parameters,
    ...getAtlasModel(conclusionId).parameters,
  ];
  return {
    family: FAMILY,
    inequalities: [],
    groupDefinitions: deriveRegimeGroups(FAMILY, parameters, []),
  };
}

/**
 * Bridge 1 — the lossless spring ↔ LC dictionary.
 *
 * `m ↔ L`, `k ↔ 1/C`, `x ↔ q`. Under `u = x/x0` (or `q/q0`) and `τ = ω0 t`
 * both systems become `u'' + u = 0`, so the equivalence is exact and
 * invertible.
 *
 * Its counterexample is W2b, which lives on THIS bridge: it shows that adding
 * a resistor to the LC side breaks the equivalence, so bridge 1 is a statement
 * about the LOSSLESS pair only.
 *
 * @internal
 */
export const BRIDGE_SPRING_LC: AtlasBridge = {
  id: 'ab-spring-lc',
  relation: 'exact-equivalence',
  premises: ['model-spring'],
  conclusion: 'model-lc',
  // Two nondimensionalizations, each with its own ω0; composed, the spring→LC map is
  // q(t) = (q0/x0)·x(ω_LC t / ω_s). The dimensioned frequencies differ (W1a: ω_s = 2,
  // ω_LC = 2√2); what is preserved is the frequency in units of ω0.
  transformation:
    'force–voltage analogy m ↔ L, k ↔ 1/C, x ↔ q (so ω0² = k/m ↔ 1/(LC)); ' +
    'u = x/x0 or q/q0, τ = ω0 t; composed, q(t) = (q0/x0)·x(ω_LC t / ω_s)',
  inverse: 'x = x0 u, t = τ/ω0',
  preserves: ['the natural frequency in units of ω0 (ω = 1 in τ = ω0 t)', 'energy up to scale', 'phase portrait'],
  doesNotPreserve: ['physical interpretation', 'units'],
  sideConditions: ['m, k, L, C > 0', 'lossless', 'unforced', 'x0, q0 nonzero'],
  regime: bridgeRegime('model-spring', 'model-lc'),
  counterexamples: [
    {
      description:
        'adding R to bridge 1 breaks it: the circuit L = 2, C = 0.125 of witness W2b with R = 4 has ' +
        'ζ_RLC = (R/2)√(C/L) = 0.5, ' +
        'which no lossless spring matches — the trajectories separate by more than 1e-2 at τ = π',
      witness: 'W2b',
    },
  ],
  // `symbolically-checked` is NOT stored here any more (Phase 4 S4.3): it is
  // DERIVED from `data/atlas/witness-results.json`, where W1s records the CAS
  // check of this bridge's dictionary. A stored copy would be a second source
  // of truth that no run could falsify.
  witnesses: [
    {
      id: 'W1',
      kind: 'symbolic',
      test: TEST,
      tolerance: 'exact — rational exponent arithmetic, no floating point',
    },
    {
      id: 'W1a',
      kind: 'numeric',
      test: TEST,
      tolerance: '|u_spring − u_lc| < 1e-8; each within 1e-8 of cos τ',
    },
    {
      id: 'W1b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'inverse-mapped trajectory solves m x″ + k x = 0 within 1e-8; a 1% wrong ω0 fails',
    },
    { id: 'W2b', kind: 'numeric', test: TEST, tolerance: 'separation > 1e-2 at τ = π' },
    {
      id: 'W1s',
      kind: 'symbolic',
      test: WITNESS_RESULTS_TEST,
      tolerance: 'CAS: k/m under m ↔ L, k ↔ 1/C minus 1/(LC) simplifies to literal 0',
    },
  ],
  citations: CITATIONS,
  reviewStatus: 'proposed',
  // spring → LC in relative period error only; see ./norm-transport.ts for what is not declared.
  normTransports: [SPRING_LC_RELATIVE_PERIOD_TRANSPORT],
  formalRef: physjsFormalRef('ab-spring-lc'),
};

/**
 * Bridge 2 — damped spring ↔ RLC, exact ON a side condition.
 *
 * The undamped dictionary of bridge 1 does not extend for free: `b` and `R`
 * are independent parameters, and the nondimensional systems coincide only
 * when the damping ratios match. The side condition is that equality, and W2
 * DERIVES `R` from it rather than assuming a value.
 *
 * @internal
 */
export const BRIDGE_DAMPED_RLC: AtlasBridge = {
  id: 'ab-damped-rlc',
  relation: 'exact-equivalence',
  premises: ['model-damped-spring'],
  conclusion: 'model-rlc',
  transformation:
    'force–voltage analogy m ↔ L, k ↔ 1/C, b ↔ R, x ↔ q; ' +
    'u = x/x0 or q/q0, τ = ω0 t; composed, q(t) = (q0/x0)·x(ω_RLC t / ω_mech)',
  inverse: 'x = x0 u, t = τ/ω0',
  preserves: ['the natural frequency in units of ω0 (ω = 1 in τ = ω0 t)', 'damping ratio', 'phase portrait'],
  doesNotPreserve: ['physical interpretation', 'units'],
  sideConditions: [
    'b/√(mk) = R√(C/L), equivalently ζ_mech = b/(2√(mk)) equals ζ_RLC = (R/2)√(C/L)',
    'm, b, k, L, R, C > 0',
    'unforced',
    'x0, q0 nonzero',
  ],
  regime: bridgeRegime('model-damped-spring', 'model-rlc'),
  counterexamples: [],
  witnesses: [
    {
      id: 'W2',
      kind: 'numeric',
      test: TEST,
      tolerance: 'R derived exactly; |u_mech − u_rlc| < 1e-8 at four τ',
    },
    {
      id: 'W2s',
      kind: 'symbolic',
      test: WITNESS_RESULTS_TEST,
      tolerance: 'CAS: b²/(4mk) under m ↔ L, k ↔ 1/C, b ↔ R minus R²C/(4L) simplifies to literal 0',
    },
  ],
  citations: CITATIONS,
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-damped-rlc'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 re-registration: the Sprint 0 bridges through `RelationContract`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-register an `AtlasBridge` through the Phase 1 `RelationContract` union.
 *
 * `AtlasBridge` states its two conditional requirements — `exact-equivalence`
 * needs `inverse`, `approximation` needs `bound` — only in doc comments, so a
 * record that breaks them type-checks. `RelationContract` states them in the
 * type system. This function is the one place the Sprint 0 records cross from
 * the weaker shape to the stronger one, and it THROWS on the two cases the
 * doc comments could only describe.
 *
 * It copies rather than restates: every field comes off the bridge, so a
 * contract cannot drift from the record it re-registers.
 *
 * @throws TypeError when the bridge omits the field its relation requires.
 * @internal
 */
export function relationContractOf(bridge: AtlasBridge): RelationContract {
  const { relation, transformation } = bridge;
  switch (relation) {
    case 'exact-equivalence': {
      if (bridge.inverse === undefined) {
        throw new TypeError(`${bridge.id}: exact-equivalence without an inverse`);
      }
      return { type: relation, transformation, inverse: bridge.inverse };
    }
    case 'approximation': {
      if (bridge.bound === undefined) {
        throw new TypeError(`${bridge.id}: approximation without a bound`);
      }
      return { type: relation, transformation, bound: bridge.bound };
    }
    case 'coarse-graining':
      // `bound` is OPTIONAL here: the chain/wave bridge carries none, and the
      // union allows that rather than forcing an invented one.
      return bridge.bound === undefined
        ? { type: relation, transformation }
        : { type: relation, transformation, bound: bridge.bound };
    default:
      return { type: relation, transformation };
  }
}

/** Bridge 1 re-registered through the Phase 1 contract. @internal */
export const CONTRACT_SPRING_LC: RelationContract = relationContractOf(BRIDGE_SPRING_LC);

/** Bridge 2 re-registered through the Phase 1 contract. @internal */
export const CONTRACT_DAMPED_RLC: RelationContract = relationContractOf(BRIDGE_DAMPED_RLC);
