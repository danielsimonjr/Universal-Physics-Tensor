/**
 * Shared relation vocabulary.
 *
 * Objects and morphisms are `./category.ts`. Composition delegates to
 * `composeRelation`. `src/atlas/types.ts` re-exports these names, so the
 * public `atlas` namespace and the atlas subpath are unchanged.
 *
 * @module relations/types
 */

import type { PiGroup } from '../dimensional/buckingham.js';

/** The relation a bridge asserts between its premises and its conclusion. @public */
export type RelationType =
  | 'derivation'
  | 'exact-equivalence'
  | 'restriction'
  | 'approximation'
  | 'coarse-graining'
  | 'analytic-continuation'
  | 'structural-analogy'
  | 'deformation-quantization';

/** What kind of support a record carries. Carried only if its witness passes. @public */
export type EvidenceTag =
  | 'proposed'
  | 'reviewed'
  | 'dimension-checked'
  | 'convention-checked'
  | 'symbolically-checked'
  | 'numerically-supported'
  | 'formally-proved'
  | 'formally-proved-property'
  | 'formally-proved-cross-check'
  | 'empirically-supported'
  | 'contradicted'
  | 'unresolved';

/**
 * Every `EvidenceTag`, in declaration order, so a report can name all of them.
 *
 * Lives HERE, not in `coverage.ts` (which re-exports it), because
 * `tests/atlas/derived-tag-literals.test.ts` allows the literals
 * `'formally-proved'` and `'symbolically-checked'` under `src/atlas/` and
 * `src/relations/` in exactly three files: this one (`src/relations/types.ts`,
 * where the union and the tag list are declared), `src/atlas/types.ts`, and
 * `src/atlas/derive-evidence.ts`. A tag that can only be DERIVED must not be
 * spellable anywhere a record could hand-set it.
 *
 * @internal
 */
export const ALL_EVIDENCE_TAGS = [
  'proposed',
  'reviewed',
  'dimension-checked',
  'convention-checked',
  'symbolically-checked',
  'numerically-supported',
  'formally-proved',
  'formally-proved-property',
  'formally-proved-cross-check',
  'empirically-supported',
  'contradicted',
  'unresolved',
] as const satisfies readonly EvidenceTag[];

/**
 * How a formal reference's statement was checked against the physics it claims
 * to state (Phase 4 design note §3).
 *
 * - `'two-formalizers'` — two people formalized it independently and agreed.
 * - `'back-translation'` — a reviewer who had not seen the source translated
 *   the formal statement back to prose and it matched.
 * - `'sanity-lemmas'` — the statement was instantiated on known cases in
 *   `tests/atlas/formal-sanity.test.ts`.
 * - `'unreviewed'` — recorded, not checked. **Earns no tag, by construction.**
 *
 * @internal
 */
export type FormalFidelity =
  | 'two-formalizers'
  | 'back-translation'
  | 'sanity-lemmas'
  | 'unreviewed';

/**
 * What a formal reference certifies.
 *
 * `'bridge'` is the only kind that derives `formally-proved`. `'property'`
 * and `'cross-check'` derive their own labels. A reduction, a limit, and a
 * derivation-step are recorded and derive neither.
 *
 * @internal
 */
export const FORMAL_REF_KINDS = ['bridge', 'property', 'cross-check', 'reduction', 'limit', 'derivation-step'] as const;

/**
 * One of {@link FORMAL_REF_KINDS}. A PhysJS reference takes the `kind` its
 * manifest entry records.
 *
 * @internal
 */
export type FormalRefKind = (typeof FORMAL_REF_KINDS)[number];

/**
 * A machine-checked counterpart of a record's claim in a proof assistant.
 *
 * A proof of the WRONG statement proves nothing about the physics, so the
 * reference carries its `fidelity` — how anyone knows the formal statement says
 * what the bridge says. `formally-proved` is derived from `kind` and `fidelity`
 * and never set. A property and a cross-check are shown under their own labels
 * and are not a proved bridge.
 *
 * @internal
 */
export interface FormalRef {
  readonly system: 'lean4-physlib' | 'lean4-physjs' | 'other';
  /** The formal statement's name or text, as it appears in `system`. */
  readonly statement: string;
  /** The library version or commit the statement was checked against. */
  readonly version: string;
  /** Axioms the proof depends on beyond the system's core. */
  readonly axioms: readonly string[];
  readonly fidelity: FormalFidelity;
  readonly kind: FormalRefKind;
  /** Permalink to the theorem's source file at `version`'s commit. */
  readonly url: string;
  /**
   * What the statement certifies, and the limit of that certification.
   * A reviewed reference's line contains `covers its statement only`.
   */
  readonly covers: string;
}

/** Whether the limit a bridge takes is regular or singular. @public */
export type LimitCharacter = 'regular' | 'singular' | 'unknown';

/**
 * One inequality on a regime coordinate. The coordinate is either a π-group
 * `buckinghamPi` produced from the family's dimensioned parameters (keyed by
 * `PiGroup.formula`), or a dimensionless INPUT of the model (an initial datum
 * such as θ0, a wavenumber-lattice product qa) declared as a
 * `DimensionalVariable` with the zero dimension, which is its own trivial
 * group. Derived quantities such as ζ = ½ (m k / b²)^(−½) are NOT groups:
 * write the inequality on the group (`m k / b² > 1/4`) and record the display
 * alias in `alias`.
 *
 * @public
 */
export interface RegimeInequality {
  /** `PiGroup.formula`, or the dimensionless input's name. */
  readonly group: string;
  readonly op: '<' | '<=' | '>' | '>=';
  readonly bound: number;
  /** `'ζ < 1'` — for display only, never evaluated. */
  readonly alias?: string;
}

/** Where in parameter space a model or bridge is claimed to apply. @public */
export interface Regime {
  /** `'oscillators'`. */
  readonly family: string;
  readonly inequalities: readonly RegimeInequality[];
  /** Traceability back to the dimension matrix, keyed by `PiGroup.formula`. */
  readonly groupDefinitions: Readonly<Record<string, PiGroup>>;
}

/** A Lipschitz-plus-offset error bound with a mandatory horizon. @public */
export interface ApproximationBound {
  /** Lipschitz constant of the map, in the stated norm. */
  readonly K: number;
  /**
   * Uniform error, same norm: the SUPREMUM OF THE BOUND OVER THE WHOLE
   * DECLARED DOMAIN (`domain` / `parameterRange`), never a sample of it at
   * one convenient fixture point.
   *
   * A parameter-dependent bound evaluated at a fixture is not a bound on the
   * domain it claims: the record would read as covering every admissible
   * parameter while holding only at the one point it was measured. When the
   * supremum is approached but not attained at an open edge of the domain,
   * `delta` is that supremum, and `deltaAt` is what a caller uses to get the
   * tighter value at its own point.
   */
  readonly delta: number;
  /**
   * `'relative period error, normalized by the value of the reduced model'`,
   * `'sup |x − x_reduced| for t ≥ 5 m/b'`, …
   *
   * A RELATIVE norm divides |exact − reduced| by the REDUCED model's value, and
   * says so in this string. The other reading, by the exact value, gives a
   * different number: at x = ck/ω₀ = 1 the non-relativistic kinetic frequency
   * exceeds the exact Klein–Gordon one by 20.7% of the exact value, and by
   * 17.2% of its own value. `tests/atlas/relative-norm-convention.test.ts` recomputes
   * every relative `delta` from closed-form physics and pins the convention.
   */
  readonly norm: string;
  /** Where the bound holds. */
  readonly domain: string;
  /** MANDATORY prose horizon: `'t ≪ 16 T0/θ0²'`. */
  readonly horizon: string;
  /** MANDATORY machine form of `horizon`: true while the bound is claimed to hold. */
  readonly horizonHolds: (t: number, params: Readonly<Record<string, number>>) => boolean;
  /**
   * MACHINE FORM OF `delta`, mirroring what `horizonHolds` is to `horizon`:
   * the bound AT A POINT of the declared domain, in the same norm.
   *
   * `horizon` had a machine counterpart and `delta` had none, so an
   * implementer holding a correct parameter-dependent bound could only freeze
   * it at a single point and hope the reader noticed. `deltaAt` is where that
   * dependence goes; `delta` stays the supremum over the domain, and
   * `deltaAt(p) <= delta` for every admissible `p`.
   *
   * Optional on the interface so a genuinely constant bound need not restate
   * itself, and so `coarse-graining` bounds are unaffected; MANDATORY for an
   * `approximation`, enforced at admission by `admitApproximation`.
   */
  readonly deltaAt?: (params: Readonly<Record<string, number>>) => number;
  /**
   * What `deltaAt` rests on. `'closed-form'`: it returns the EXACT error in
   * closed form, so it is a proven bound, holding with equality. `'numerically-
   * supported'`: a formula that witnesses support numerically but no proof
   * covers. `upt path` prints a point bound only when every step is closed-form.
   */
  readonly deltaAtBasis?: 'closed-form' | 'numerically-supported';
  /** `'θ0 ≤ 0.5 rad'`. */
  readonly parameterRange?: string;
  readonly limitCharacter: LimitCharacter;
  /**
   * What the error is uniform in.
   *
   * `null` means NOT YET ANALYSED. That is a legitimate recorded state:
   * `makeApproximation` accepts it, and the check lives at use (`boundPath`),
   * not at construction. An empty array means the same thing — a universal
   * over nothing must not count as analysed. A non-empty array names the
   * scopes the error is uniform in. A variable a side condition says the
   * error is NOT uniform in is not listed.
   */
  readonly uniformity: readonly string[] | null;
}

/** A case a bridge does NOT cover, and the witness that shows it. @public */
export interface Counterexample {
  readonly description: string;
  /** `'W2b'`. */
  readonly witness: string;
}

/**
 * The relation a record asserts, as a DISCRIMINATED UNION over `RelationType`.
 *
 * This is the Phase 1 overlay (design note §1.2, "One overlay, not two"). Its
 * purpose is to move `AtlasBridge`'s two CONDITIONAL requirements — written
 * there only as doc comments — into the type system:
 *
 *   - `approximation` REQUIRES `bound`, and `ApproximationBound` itself
 *     mandates `horizon` + `horizonHolds`. So an approximation without a
 *     machine horizon is a COMPILE error, not a runtime one.
 *   - `exact-equivalence` REQUIRES `inverse`.
 *
 * Deliberately conservative elsewhere. The design note §2.2 names the fields
 * the other members WOULD need (an analyticity domain, a checkable
 * `preserves` set, an ħ-order) and records that none of them exists before
 * Phase 2. Inventing them here would encode claims the data cannot support,
 * so every other member carries only `transformation`.
 *
 * @internal
 */
export type RelationContract =
  | { readonly type: 'derivation'; readonly transformation: string }
  | {
      readonly type: 'exact-equivalence';
      readonly transformation: string;
      /** REQUIRED: `'x = x0 u, t = τ/ω0'`. An equivalence without an inverse is not one. */
      readonly inverse: string;
    }
  | { readonly type: 'restriction'; readonly transformation: string }
  | {
      readonly type: 'approximation';
      readonly transformation: string;
      /** REQUIRED, and mandates its own machine horizon. */
      readonly bound: ApproximationBound;
    }
  | {
      readonly type: 'coarse-graining';
      readonly transformation: string;
      /** Optional: errors accumulate through `composeBounds` when present. */
      readonly bound?: ApproximationBound;
    }
  | { readonly type: 'analytic-continuation'; readonly transformation: string }
  | { readonly type: 'structural-analogy'; readonly transformation: string }
  | { readonly type: 'deformation-quantization'; readonly transformation: string };

/**
 * Sign and unit choices a record depends on. Every field is optional, and a
 * field is only meaningful when the record actually depends on that choice.
 *
 * Non-emptiness matters downstream: design note §3 requires `conventions` to
 * declare AT LEAST ONE field before `convention-checked` can be derived,
 * because `[].every(…)` is vacuously true and would hand out a free tag.
 *
 * @internal
 */
export interface Conventions {
  /** First law as `dU = Q − W` or `dU = Q + W`. */
  readonly heatWorkSign?: 'Q-W' | 'Q+W';
  readonly metricSignature?: '-+++' | '+---';
  readonly fourierNormalization?: 'unitary' | 'physics' | 'none';
  readonly unitSystem?: 'SI' | 'gaussian' | 'natural';
  readonly capacitorChargeSign?: '+' | '-';
}

