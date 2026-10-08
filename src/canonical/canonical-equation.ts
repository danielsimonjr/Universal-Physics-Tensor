/**
 * Canonical (textbook) physics equations — the ground-truth L-layer of the
 * universal tensor (Π = L + B + E). A `CanonicalEquation` is the *answer key*
 * that bridge equations (the B-layer) are validated against; it is NOT a
 * speculative claim.
 *
 * Entries carry whichever FIDELITY LEVELS they can:
 *   - L0 (mandatory) — `dimensional`: target dim + governing vars (+ monomial
 *     when dimensionally determined). Reproduced by the Buckingham-π engine.
 *   - L1 (optional)  — `scalarAst`: an `ExprNode` RHS, validated dimensionally.
 *   - L2 (optional)  — `fieldEquation`: a tensor/PDE predicate node.
 *
 * Epistemic honesty (review finding F1): an L0-only entry must never read as
 * more than "dimensionally consistent". `epistemicStatus` is the highest claim
 * the entry supports; `freeDimensionlessGroups > 0` means dimensions cannot pin
 * the form. Consumers must not use an entry above its `epistemicStatus`.
 *
 * See `docs/planning/Canonical-Equation-Registry-A-Design.md`.
 *
 * @module canonical/canonical-equation
 */
import type { ExprNode } from '../dimensional/validator.js';
import type { DimensionalVariable } from '../dimensional/buckingham.js';
import type { TensorIndices } from '../core/types.js';
import type { EinsteinFieldEquationNode } from '../dimensional/einstein-equation.js';
import type { Conventions } from '../relations/types.js';

/** Physics domain — indexes the registry and (later) the discovery kind filter. */
export type CanonicalDomain =
  | 'mechanics'
  | 'gravitation'
  | 'general-relativity'
  | 'cosmology'
  | 'electromagnetism'
  | 'quantum'
  | 'thermodynamics'
  | 'statistical'
  | 'information'
  | 'condensed-matter';

/**
 * The strongest claim an entry supports:
 *   - `dimensional`          — only the dimensional signature (L0).
 *   - `scalar-up-to-constant`— the algebraic form, leading constant aside (L1).
 *   - `fully-quantitative`   — the complete relation incl. the constant.
 */
export type EpistemicStatus =
  | 'dimensional'
  | 'scalar-up-to-constant'
  | 'fully-quantitative';

/** A field-equation predicate node (L2). Concrete node kinds live in the
 *  dimensional layer; widen this union as Maxwell/Klein–Gordon nodes land. */
export type FieldEquationNode = EinsteinFieldEquationNode;

/** Disambiguators for forms that share a dimensional signature (finding F3). */
export interface CanonicalForms {
  /** Bekenstein–Hawking depends on horizon AREA, not radius. */
  readonly areaOrRadius?: 'area' | 'radius';
  /** Landauer uses the NATURAL log. */
  readonly logBase?: 'e' | '2' | '10';
  /** Stefan–Boltzmann `j=σT⁴` is a FLUX; luminosity `L=σAT⁴` changes σ. */
  readonly quantityKind?: 'flux' | 'power' | 'energy';
}

/** One sourced prefactor: the exact dimensionless factor and the verbatim text it is read from. */
export interface SourcedPrefactor {
  readonly value: number;
  /** Verbatim source text the factor is read from. */
  readonly quote: string;
  /** Where the quote is: page, revision id and wikitext line. */
  readonly locator: string;
}

/** A sourced prefactor that is `coefficient · group^exponent` of a dimensionless group the record does not carry. */
export interface SourcedGroupPrefactor {
  /** The group as the entry's formula names it (`'gamma'` for γ). */
  readonly group: string;
  readonly coefficient: number;
  readonly exponent: number;
  readonly quote: string;
  readonly locator: string;
}

/** A canonical (textbook) physics equation. */
export interface CanonicalEquation {
  /** Stable id, e.g. 'CE-newton-gravitation'. */
  readonly id: string;
  readonly name: string;
  readonly domain: CanonicalDomain;
  /** LaTeX rendering (display only). */
  readonly formula_latex: string;

  // ── epistemic honesty (F1) ──────────────────────────────────────────────
  readonly epistemicStatus: EpistemicStatus;
  /** 0 ⇒ the L0 monomial is fully determined; ≥1 ⇒ dimensions can't pin it. */
  readonly freeDimensionlessGroups: number;

  // ── L0 (always present) ─────────────────────────────────────────────────
  readonly dimensional: {
    readonly target: DimensionalVariable;
    readonly governing: readonly DimensionalVariable[];
    /** Textbook monomial exponents, or null when there are free groups. */
    readonly monomial: Readonly<Record<string, number>> | null;
  };
  // ── L1 / L2 (optional) ──────────────────────────────────────────────────
  readonly scalarAst?: ExprNode;
  readonly fieldEquation?: FieldEquationNode;

  // ── disambiguation (F3) ─────────────────────────────────────────────────
  readonly forms?: CanonicalForms;

  // ── placement + provenance ──────────────────────────────────────────────
  /** L-layer cell coordinates. */
  readonly regime: TensorIndices;
  /** Implicit regime assumptions (e.g. 'blackbody equilibrium'). */
  readonly assumptions: readonly string[];
  readonly references: readonly string[];
  /** Bridges this law is the intended correspondence partner for (advisory;
   *  the check itself is Sub-project B). */
  readonly partnerBridges: readonly string[];
  /** Set when this law is LITERALLY a bridge's own relation (BH≡BE-21, …);
   *  Sub-project B uses it to discount the trivial X≡X match (finding F4). */
  readonly restatesBridge?: string;

  // ── facts of this equation that side tables once held ──────────────────
  /** Validity condition over the governing names, in the holds grammar. Absent: permissive. */
  readonly holds?: string;
  /** The exact dimensionless prefactor in front of the AST or monomial, with its verbatim source. */
  readonly prefactor?: SourcedPrefactor;
  /** A prefactor that is a power of a dimensionless group the record does not carry (√γ). */
  readonly groupPrefactor?: SourcedGroupPrefactor;
  /** Disclosure printed when the factor is unset: the textbook factor the unit monomial is not. */
  readonly unsetFactorNote?: string;
  /** Convention line a comparison prints beside this entry. */
  readonly conventionNote?: string;
  /** Entries that share a group are one law under different conventions; a formula agreeing with any of them has matched that law. */
  readonly conventionGroup?: string;
  /** Target names this entry answers to in a comparison besides its own target. */
  readonly targetAliases?: readonly string[];

  // ── Atlas Phase 1 overlay (OPTIONAL; an entry without it is unchanged) ──
  /**
   * Sign/unit choices the equation depends on (first-law sign, metric
   * signature, Fourier normalization, unit system, …). A canonical equation
   * asserts no BETWEEN-model relation, so it takes `conventions` only — no
   * `relation` and no `counterexamples`.
   */
  readonly conventions?: Conventions;

  // ── Atlas Phase 3 overlay (OPTIONAL; an entry without it is unchanged) ──
  /**
   * The `Model` this equation is stated WITHIN (`'model-spring'`, …), as an
   * `AtlasModel.id`. ROADMAP Phase 3 makes the model the unit rather than the
   * equation; an entry whose model is not recorded omits the field rather
   * than naming a plausible one.
   */
  readonly model?: string;
}
