/**
 * Identity-consequence surfacer — turns a `promising` discovery identification
 * into the ONE algebraic relation it implies, as an UNADJUDICATED proposal.
 *
 * When the discovery funnel flags `a ≟ b` (two canonical quantities of equal
 * dimension), and `a`, `b` are the TARGETS of two canonical equations `Eₐ`, `E_b`,
 * the hypothesised identity `a ≡ b` makes their right-hand sides equal:
 *
 *     Eₐ.scalarAst  =  E_b.scalarAst
 *
 * Eliminating (isolating) one free variable yields a relation among the union of
 * the two governing sets — e.g. Landauer `k_B T ln2` ≟ Planck–Einstein `h ν`
 * gives `ν = (k_B ln2 / h) · T`, the "Landauer photon".
 *
 * CRITICAL — this is NOT new physics and NOT a bridge. It is the algebraic
 * consequence of an UNADJUDICATED identification, surfaced for a physicist to
 * judge (Part-VI §XXVII-B: the enumerator proposes, humans dispose). Every
 * emitted record carries `status: 'unadjudicated'` — a literal that is NOT a
 * member of `BridgeEquationStatus`, so a proposal can never be assigned where a
 * catalog entry is expected. The generator NEVER writes `BRIDGE_EQUATIONS` and a
 * proposal is NEVER added to `CANONICAL_GRAPH` (no coincidence-amplifying loop).
 *
 * Scope (v0.24.0 pilot): canonical-only `promising` candidates whose BOTH source
 * equations (a) have a non-null `dimensional.monomial` (determinate) and (b) are
 * `epistemicStatus: 'fully-quantitative'` (so the eliminated prefactor is a
 * closed numeric constant, not an operator-valued stub — this gates out
 * `CE-jarzynski`). See `docs/planning/v0.24.0-{Design,Review-Findings}.md`.
 *
 * INTERNAL tooling — deliberately NOT re-exported from `src/index.ts`.
 *
 * @module composition/proposed-bridges
 */

import type { ExprNode } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import { sym } from '../dimensional/ast-builders.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { equals, format } from '../dimensional/algebra.js';
import type { DimensionalVariable } from '../dimensional/buckingham.js';
import type { BridgeEquationStatus } from '../bridges/index.js';
import { canonicalByTarget, canonicalById } from '../canonical/registry.js';
import type { KnownIssue } from '../bridges/index.js';
import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import { catalogIdNumber } from '../bridges/catalog-load.js';
import { normalForm } from '../canonical/normal-form.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import { evalExpr } from './expr-eval.js';
import { rankDiscoveries } from './discovery.js';
import type { VettedCandidate } from './discovery.js';
import { CANONICAL_GRAPH } from './canonical-graph.js';
import { CATALOG_GRAPH } from './catalog-graph.js';

// ── monomial algebra over flat ExprNode forms ───────────────────────────────

/** A flat monomial: leaf name → its dimension and (signed, possibly rational)
 *  exponent. `k_B·T·ln2 / h` ⇒ {k_B:+1, T:+1, ln2:+1, h:-1}. */
type Mono = Map<string, { dim: Dimension; exp: number }>;

/** Thrown when an AST is not a product / quotient / integer-power of symbols. @internal */
export class NotAMonomialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAMonomialError';
  }
}

function mergeInto(into: Mono, from: Mono, scale: number): void {
  for (const [name, { dim, exp }] of from) {
    const cur = into.get(name);
    if (cur === undefined) {
      into.set(name, { dim, exp: exp * scale });
    } else {
      if (!equals(cur.dim, dim)) {
        throw new NotAMonomialError(
          `leaf '${name}' appears with inconsistent dimensions`,
        );
      }
      cur.exp += exp * scale;
    }
  }
}

/**
 * Decompose a flat-monomial `ExprNode` into a leaf→exponent map. Throws
 * `NotAMonomialError` on sums, differences, or non-symbol bases — this is the
 * AST-level monomial gate.
 *
 * @internal
 */
export function toMonomial(ast: ExprNode): Mono {
  const out: Mono = new Map();
  switch (ast.kind) {
    case 'symbol':
      out.set(ast.name, { dim: ast.dim, exp: 1 });
      return out;
    case 'op':
      switch (ast.op) {
        case '*':
          for (const a of ast.args) mergeInto(out, toMonomial(a), 1);
          return out;
        case '/': {
          const [num, ...dens] = ast.args;
          mergeInto(out, toMonomial(num), 1);
          for (const d of dens) mergeInto(out, toMonomial(d), -1);
          return out;
        }
        case '^': {
          const [base, expNode] = ast.args;
          if (expNode.kind !== 'symbol') {
            throw new NotAMonomialError('non-literal exponent');
          }
          const n = Number(expNode.name);
          if (!Number.isFinite(n)) {
            throw new NotAMonomialError(`non-numeric exponent '${expNode.name}'`);
          }
          mergeInto(out, toMonomial(base), n);
          return out;
        }
        default:
          throw new NotAMonomialError(`operator '${ast.op}' is not monomial`);
      }
    default:
      throw new NotAMonomialError(`node kind '${ast.kind}' is not monomial`);
  }
}

/** Rebuild a flat-monomial `ExprNode` from a leaf→exponent map (numerator =
 *  positive exponents, denominator = negative). Zero exponents drop out.
 *  @internal */
export function fromMonomial(m: Mono): ExprNode {
  const factor = (name: string, dim: Dimension, e: number): ExprNode =>
    e === 1
      ? sym(name, dim)
      : { kind: 'op', op: '^', args: [sym(name, dim), sym(String(e), DIMENSIONLESS)] };

  const num: ExprNode[] = [];
  const den: ExprNode[] = [];
  for (const [name, { dim, exp }] of [...m].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (exp === 0) continue;
    if (exp > 0) num.push(factor(name, dim, exp));
    else den.push(factor(name, dim, -exp));
  }
  const product = (xs: ExprNode[]): ExprNode =>
    xs.length === 1 ? xs[0] : { kind: 'op', op: '*', args: xs };

  const numerator = num.length === 0 ? sym('1', DIMENSIONLESS) : product(num);
  if (den.length === 0) return numerator;
  return { kind: 'op', op: '/', args: [numerator, product(den)] };
}

// ── the proposal record ─────────────────────────────────────────────────────

/**
 * A machine-DERIVED candidate bridge — the MATH ONLY. The algebraic consequence
 * of an UNADJUDICATED identification; never a status claim. Structurally distinct
 * from `BridgeEquationEntry` (omits every physics-judgment field) and carries the
 * literal `status: 'unadjudicated'`, which is NOT a `BridgeEquationStatus`.
 *
 * @internal
 */
export interface ProposedBridge {
  /** `IC-<sorted-a>--<sorted-b>--<solvedFor>`. */
  readonly id: string;
  readonly derivedFrom: {
    readonly identification: { readonly a: string; readonly b: string; readonly dim: string };
    readonly sourceEquationIds: readonly [string, string];
    readonly solvedFor: string;
  };
  readonly target: DimensionalVariable;
  /** Free (non-constant) inputs of the derived relation. */
  readonly governing: readonly DimensionalVariable[];
  readonly formulaLatex: string;
  /** Dimensionally-VALIDATED derived RHS (round-trips to `dimensionalSignature`). */
  readonly scalarAst: ExprNode;
  /** `format()` of the inferred dimension — same convention as the catalog. */
  readonly dimensionalSignature: string;
  /** Mechanical derivation description — NO physics claim. */
  readonly provenance: string;
  /** Other identifications that derive the SAME relation (same normal form, up
   *  to dimensionless constants), collapsed into this proposal by the dedup pass.
   *  Empty unless a wider candidate scope produced structural duplicates. */
  readonly alsoDerivableFrom: readonly string[];
  /** ALWAYS the literal 'unadjudicated'. NOT a BridgeEquationStatus. */
  readonly status: 'unadjudicated';
  /** Numerically evaluate the derived RHS; constants auto-resolve, supply the
   *  free `governing` leaves (e.g. `{ T: 300 }`). */
  evaluate(values: Readonly<Record<string, number>>): number;
}

const isConstant = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(CONSTANTS, name);

/** The single non-constant leaf of a monomial, or null if 0 or >1. */
function uniqueNonConstantLeaf(m: Mono): { name: string; dim: Dimension; exp: number } | null {
  const free = [...m].filter(([name]) => !isConstant(name));
  if (free.length !== 1) return null;
  const [name, { dim, exp }] = free[0];
  return { name, dim, exp };
}

function latexFromMono(m: Mono): string {
  const num: string[] = [];
  const den: string[] = [];
  for (const [name, { exp }] of [...m].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (exp === 0) continue;
    const tok = Math.abs(exp) === 1 ? name : `${name}^{${Math.abs(exp)}}`;
    (exp > 0 ? num : den).push(tok);
  }
  const n = num.join(' \\cdot ') || '1';
  return den.length ? `\\frac{${n}}{${den.join(' \\cdot ')}}` : n;
}

// ── leaf-name canonicalization ──────────────────────────────────────────────
// A canonical equation's `scalarAst` uses private symbols (`T`) while its
// `dimensional.governing` and the whole composition graph (and bridge `symbolic`
// forms) use quantity names (`temperature`). Aligning the AST leaves to the
// governing names lets a derivation from a canonical equation and one from a
// bridge edge of the SAME physics collapse under `dedupByNormalForm`.

function collectLeafDims(ast: ExprNode, into: Map<string, Dimension>): void {
  if (ast.kind === 'symbol') {
    if (!into.has(ast.name)) into.set(ast.name, ast.dim);
  } else if (ast.kind === 'op') {
    for (const a of ast.args) collectLeafDims(a, into);
  }
}

/** Map each non-constant `scalarAst` leaf to the governing quantity of equal
 *  dimension, when that match is unique (else leave it — never guess). */
function leafCanonMap(
  scalarAst: ExprNode,
  governing: readonly DimensionalVariable[],
): Map<string, string> {
  const leaves = new Map<string, Dimension>();
  collectLeafDims(scalarAst, leaves);
  const govFree = governing.filter((g) => !isConstant(g.name));
  const map = new Map<string, string>();
  for (const [leaf, dim] of leaves) {
    if (isConstant(leaf) || Number.isFinite(Number(leaf))) continue;
    if (govFree.some((g) => g.name === leaf)) continue; // already a graph name
    const matches = govFree.filter((g) => equals(g.dim, dim));
    if (matches.length === 1) map.set(leaf, matches[0].name);
  }
  return map;
}

function renameLeaves(ast: ExprNode, map: ReadonlyMap<string, string>): ExprNode {
  if (map.size === 0) return ast;
  if (ast.kind === 'symbol') {
    const r = map.get(ast.name);
    return r ? { ...ast, name: r } : ast;
  }
  if (ast.kind === 'op') {
    return { ...ast, args: ast.args.map((a) => renameLeaves(a, map)) };
  }
  return ast;
}

// ── the generator ───────────────────────────────────────────────────────────

/**
 * An admissible source for the elimination: a target name backed by a flat
 * monomial `scalarAst` whose prefactor is a closed constant. Canonical equations
 * and bridge edges both project to this shape, so the generator no longer needs
 * to know which it came from.
 */
interface EquationSource {
  /** `CE-…` (canonical) or `BE-<n>` (bridge). */
  readonly id: string;
  readonly kind: 'canonical' | 'bridge';
  readonly scalarAst: ExprNode;
  readonly targetDim: Dimension;
  /** `epistemicStatus` (canonical) or `confidence` (bridge) — recorded, not gated. */
  readonly grade: string;
}

/** True if the monomial carries a dimensionless leaf that is neither a known
 *  constant, a numeric literal, NOR a declared input quantity — i.e. an
 *  operator-valued STUB (e.g. Jarzynski's `ln_avg_exp_minus_betaW`), not a clean
 *  dimensionless INPUT like a coupling constant (BE-18's `yukawa-coupling`). */
function hasNonConstantStub(m: Mono, inputs: ReadonlySet<string>): boolean {
  for (const [name, { dim }] of m) {
    if (
      equals(dim, DIMENSIONLESS) &&
      !isConstant(name) &&
      !Number.isFinite(Number(name)) &&
      !inputs.has(name)
    ) {
      return true;
    }
  }
  return false;
}

/** ALL admissible sources for `name` — every canonical equation AND every bridge
 *  edge whose target is `name` and whose form is a clean monomial. A target with
 *  several sources (e.g. BE-42 Hawking's two parametrisations) is DE-AMBIGUATED by
 *  enumeration, not skipped; coinciding derivations collapse later under dedup.
 *  @internal */
export function resolveSources(name: string): EquationSource[] {
  const out: EquationSource[] = [];

  // Canonical: a determinate monomial AND a fully-quantitative form.
  for (const e of canonicalByTarget(name)) {
    if (
      e.scalarAst &&
      e.dimensional.monomial !== null &&
      e.epistemicStatus === 'fully-quantitative'
    ) {
      // Align the AST's private leaf symbols (`T`) with the governing quantity
      // names (`temperature`) so canonical- and bridge-sourced derivations of the
      // same relation collapse under dedup.
      const scalarAst = renameLeaves(
        e.scalarAst,
        leafCanonMap(e.scalarAst, e.dimensional.governing),
      );
      out.push({
        id: e.id,
        kind: 'canonical',
        scalarAst,
        targetDim: e.dimensional.target.dim,
        grade: e.epistemicStatus,
      });
    }
  }

  // Bridge: edges carrying a clean-monomial `symbolic` form. `confidence` is about
  // FRAMING, not formula completeness, so it is recorded — not gated; the
  // structural stub check enforces a closed prefactor instead.
  for (const edge of CATALOG_GRAPH) {
    if (edge.target.name !== name || !edge.symbolic) continue;
    let m: Mono;
    try {
      m = toMonomial(edge.symbolic);
    } catch (err) {
      if (err instanceof NotAMonomialError) continue;
      throw err;
    }
    if (hasNonConstantStub(m, new Set(edge.sources.map((s) => s.name)))) continue;
    const dim = validate(edge.symbolic).inferredDimension;
    if (!dim || !equals(dim, edge.target.dim)) continue;
    out.push({
      id: edge.beId !== null ? `BE-${edge.beId}` : edge.id,
      kind: 'bridge',
      scalarAst: edge.symbolic,
      targetDim: edge.target.dim,
      grade: edge.confidence,
    });
  }

  return out;
}

/**
 * Derive the implied relation for each `promising` identification in `candidates`.
 * Returns ONE proposal per admissible candidate (Adam M2), structurally
 * de-duplicated (`dedupByNormalForm`).
 *
 * Candidate-set-agnostic: pass `rankDiscoveries(CANONICAL_GRAPH)` (default),
 * `…(CATALOG_GRAPH)`, or `…([...CATALOG_GRAPH, ...CANONICAL_GRAPH])` to widen the
 * source — the CLI `discover --derive` forwards whichever `--source=` graph is
 * selected. Each endpoint is resolved by `resolveSource` to a canonical equation
 * OR a bridge edge with a clean-monomial `symbolic` form, so a candidate yields a
 * proposal when BOTH endpoints resolve (the Landauer photon, for instance, is
 * derivable both from `CE-landauer` and — at `--source=both` — from the BE-16
 * bridge). A target with SEVERAL admissible sources (BE-42 Hawking's two
 * parametrisations, or a canonical + bridge pair) is de-ambiguated by ENUMERATION
 * — every source pair is tried and coincidences collapse under dedup. HONEST
 * BOUNDARY: an endpoint with no clean-monomial source (a bridge with no `symbolic`
 * form or a non-monomial one) yields nothing.
 *
 * Pure; reads the registries, writes nothing.
 *
 * @internal
 */
export function deriveProposedBridges(
  candidates: readonly VettedCandidate[] = rankDiscoveries(CANONICAL_GRAPH),
): readonly ProposedBridge[] {
  const out: ProposedBridge[] = [];
  for (const cand of candidates) {
    if (cand.verdict !== 'promising') continue;
    const [t0, t1] = [cand.a, cand.b].sort();
    // Enumerate every admissible source pair (de-ambiguation by enumeration).
    for (const E1 of resolveSources(t0)) {
      for (const E2 of resolveSources(t1)) {
        const p = derivePair(cand, t0, t1, E1, E2);
        if (p) out.push(p);
      }
    }
  }
  return disambiguateIds(dedupByNormalForm(out));
}

/** Derive one proposal from a fixed source pair, or null if inadmissible. */
function derivePair(
  cand: VettedCandidate,
  t0: string,
  t1: string,
  E1: EquationSource,
  E2: EquationSource,
): ProposedBridge | null {
  let m1: Mono;
  let m2: Mono;
  try {
    m1 = toMonomial(E1.scalarAst);
    m2 = toMonomial(E2.scalarAst);
  } catch (e) {
    if (e instanceof NotAMonomialError) return null;
    throw e;
  }

  const solveFor = uniqueNonConstantLeaf(m2);
  if (!solveFor) return null; // no single observable to isolate
  if (m1.has(solveFor.name)) return null; // degenerate overlap (Design §5.2)

  // Isolate solveFor from `m1 = m2`:  solveFor^e = m1 / (m2 without solveFor).
  const result: Mono = new Map();
  mergeInto(result, m1, 1);
  const m2NoSolve: Mono = new Map(m2);
  m2NoSolve.delete(solveFor.name);
  mergeInto(result, m2NoSolve, -1);
  if (solveFor.exp !== 1) {
    for (const v of result.values()) v.exp /= solveFor.exp;
  }

  const scalarAst = fromMonomial(result);
  const dim = validate(scalarAst).inferredDimension;
  if (!dim || !equals(dim, solveFor.dim)) return null; // round-trip guard

  const governing: DimensionalVariable[] = [...result]
    .filter(([name]) => !isConstant(name))
    .map(([name, { dim: d }]) => ({ name, dim: d }));

  const src = (e: EquationSource) => `${e.id} (${e.kind}, ${e.grade})`;
  const provenance =
    `Monomial elimination of the UNADJUDICATED identification ${cand.a} ≡ ${cand.b} ` +
    `(${src(E1)}.rhs = ${src(E2)}.rhs), solved for '${solveFor.name}'. ` +
    `Algebraic consequence of a hypothesised identity — NOT a new physical ` +
    `relation and NOT a bridge. Invertible (any free leaf may be isolated).`;

  return {
    id: `IC-${t0}--${t1}--${solveFor.name}`,
    derivedFrom: {
      identification: { a: cand.a, b: cand.b, dim: cand.dim },
      sourceEquationIds: [E1.id, E2.id],
      solvedFor: solveFor.name,
    },
    target: { name: solveFor.name, dim: solveFor.dim },
    governing,
    formulaLatex: `${solveFor.name} = ${latexFromMono(result)}`,
    scalarAst,
    dimensionalSignature: format(dim),
    provenance,
    alsoDerivableFrom: [],
    status: 'unadjudicated',
    evaluate: (values) => evalExpr(scalarAst, values),
  };
}

/** Make ids unique: when distinct proposals (different source pairs) collide on
 *  the base `IC-<a>--<b>--<solveFor>` id, suffix each with its source pair. */
function disambiguateIds(
  proposals: readonly ProposedBridge[],
): readonly ProposedBridge[] {
  const counts = new Map<string, number>();
  for (const p of proposals) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  return proposals.map((p) =>
    (counts.get(p.id) ?? 0) > 1
      ? { ...p, id: `${p.id}--${p.derivedFrom.sourceEquationIds.join('+')}` }
      : p,
  );
}

/**
 * Collapse proposals that derive the SAME relation — equal `normalForm` (up to
 * dimensionless constants) AND equal target dimension — into the first, recording
 * the others' identifications in `alsoDerivableFrom`. Distinct stubs do NOT
 * collapse (e.g. Landauer's dropped `ln2` vs an operator stub hash differently),
 * so this only merges genuine structural twins that a wider candidate scope can
 * produce (Design §9 #2). Deterministic: input order is preserved.
 *
 * @internal
 */
export function dedupByNormalForm(
  proposals: readonly ProposedBridge[],
): readonly ProposedBridge[] {
  const byKey = new Map<string, ProposedBridge>();
  const order: string[] = [];
  const extras = new Map<string, string[]>();

  for (const p of proposals) {
    const key = `${normalForm(p.scalarAst)}::${p.dimensionalSignature}`;
    const kept = byKey.get(key);
    if (kept === undefined) {
      byKey.set(key, p);
      order.push(key);
      extras.set(key, [...p.alsoDerivableFrom]);
    } else {
      const tag = `${p.derivedFrom.identification.a} ≡ ${p.derivedFrom.identification.b}`;
      extras.get(key)!.push(tag, ...p.alsoDerivableFrom);
    }
  }

  return order.map((key) => {
    const p = byKey.get(key)!;
    const merged = [...new Set(extras.get(key)!)].sort();
    return merged.length === p.alsoDerivableFrom.length
      ? p
      : { ...p, alsoDerivableFrom: merged };
  });
}

// ── promotion gate (guardrail #5) ───────────────────────────────────────────

/** The human inputs a proposal CANNOT supply — fabricating them is forbidden. */
interface PromotionEvidence {
  /** Literature anchor establishing the relation (appears / contradicts / neither). */
  readonly citation: string;
  /** Human-chosen catalog status — never defaulted. */
  readonly status: BridgeEquationStatus;
  /** Path to the recorded adversarial + literature review. */
  readonly reviewRef: string;
}

/** A review-ready promotion request — the artifact a human turns into a catalog
 *  entry. Holding one does NOT mutate `BRIDGE_EQUATIONS`. */
interface PromotionRequest {
  readonly proposal: ProposedBridge;
  readonly evidence: PromotionEvidence;
}

/** Thrown when a proposal is promoted without the evidence the promotion requires. @internal */
export class MissingEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingEvidenceError';
  }
}

/**
 * Gate a proposal toward the catalog. THROWS `MissingEvidenceError` unless every
 * human input is present and non-blank (operationalises "null, not guessed").
 * Returns a `PromotionRequest`; it deliberately does NOT synthesise a
 * `BridgeEquationEntry` — the physics-judgment fields are human work.
 *
 * @internal
 */
export function promoteProposal(
  proposal: ProposedBridge,
  evidence: PromotionEvidence,
): PromotionRequest {
  const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';
  if (blank(evidence.citation)) throw new MissingEvidenceError('citation required');
  if (blank(evidence.reviewRef)) throw new MissingEvidenceError('reviewRef required');
  if (!evidence.status) throw new MissingEvidenceError('status required (not defaulted)');
  return { proposal, evidence };
}

// ── PROPOSED_BRIDGES review surface (catalog field-shape, own registry) ──────

/**
 * A derived proposal in the catalog's field SHAPE, for review — but in its OWN
 * registry and carrying `status: 'unadjudicated'` (NOT a `BridgeEquationStatus`).
 * This is deliberately NOT a `BridgeEquationEntry`: it omits the spec-only fields
 * (`source_part`/`source_section`/numeric `id`) and never enters `BRIDGE_EQUATIONS`,
 * which stays the faithful encoding of the specification.
 *
 * @internal
 */
interface ProposedBridgeEntry {
  readonly id: string;
  readonly name: string;
  readonly category: 'Z';
  readonly category_name: 'Machine-Derived Identity Consequences (UNADJUDICATED)';
  /** The two regimes bridged — the source equations' domains. */
  readonly bridges: readonly [string, string];
  /** ALWAYS 'unadjudicated' — not a catalog status. */
  readonly status: 'unadjudicated';
  readonly context: string;
  readonly formula_latex: string;
  readonly dimensional_signature: string;
  /** Honest references: a derivation note + the SOURCE equations' citations,
   *  never a fabricated citation for the derived relation itself. */
  readonly references: readonly string[];
  readonly known_issues: readonly KnownIssue[];
  readonly derivedFrom: ProposedBridge['derivedFrom'];
  readonly notes: string;
}

/** Domain label + citations for a source id — canonical (`CE-…`) or bridge
 *  (`BE-<n>`), so the entry surface works for either source kind. */
function equationMeta(id: string): { domain: string; references: readonly string[] } {
  const ce = canonicalById(id);
  if (ce) return { domain: ce.domain, references: ce.references };
  const n = catalogIdNumber(id);
  const be = n === undefined ? undefined : BRIDGE_EQUATIONS.find((e) => e.id === n);
  if (be) return { domain: `${be.bridges[0]}↔${be.bridges[1]} (${be.status})`, references: be.references };
  return { domain: 'unknown', references: [] };
}

/** Render a `ProposedBridge` into the catalog field-shape, filled honestly. @internal */
export function toProposedEntry(p: ProposedBridge): ProposedBridgeEntry {
  const [id1, id2] = p.derivedFrom.sourceEquationIds;
  const M1 = equationMeta(id1);
  const M2 = equationMeta(id2);
  const { a, b } = p.derivedFrom.identification;
  const srcRefs = [
    [id1, M1] as const,
    [id2, M2] as const,
  ].flatMap(([id, m]) => m.references.map((r) => `source ${id}: ${r}`));
  return {
    id: p.id,
    name: `${a} ≡ ${b} ⇒ ${p.derivedFrom.solvedFor} (derived)`,
    category: 'Z',
    category_name: 'Machine-Derived Identity Consequences (UNADJUDICATED)',
    bridges: [M1.domain, M2.domain],
    status: 'unadjudicated',
    context:
      `Algebraic consequence of the UNADJUDICATED identification ${a} ≡ ${b} ` +
      `(${id1}.rhs = ${id2}.rhs), solved for ${p.derivedFrom.solvedFor}. A ` +
      `dimensional coincidence surfaced by the discovery funnel — no physical ` +
      `mechanism is asserted, and it is NOT a bridge.`,
    formula_latex: p.formulaLatex,
    dimensional_signature: p.dimensionalSignature,
    references: [
      'Machine-derived; the combined relation has no independent literature.',
      ...srcRefs,
    ],
    known_issues: [
      {
        severity: 'phenomenological-ansatz',
        description:
          'Machine-derived dimensional coincidence: the algebraic consequence ' +
          'of an unadjudicated identification, with no mechanism and no ' +
          'independent literature. Promotion to BRIDGE_EQUATIONS requires an ' +
          'adversarial + literature review (Part-VI §XXVII-B) via promoteProposal().',
        fixable: 'unknown',
      },
    ],
    derivedFrom: p.derivedFrom,
    notes:
      p.provenance +
      (p.alsoDerivableFrom.length
        ? ` Also derivable from: ${p.alsoDerivableFrom.join('; ')}.`
        : ''),
  };
}

/**
 * The PROPOSED-BRIDGE review surface: derived identity-consequences in the
 * catalog's field shape, in their OWN registry, every entry `status:
 * 'unadjudicated'`. Separate from `BRIDGE_EQUATIONS` (the faithful spec
 * encoding), which this never mutates. Default scope: canonical-only — widen with
 * `deriveProposedBridges(rankDiscoveries(graph)).map(toProposedEntry)`.
 *
 * @internal
 */
export const PROPOSED_BRIDGES: readonly ProposedBridgeEntry[] =
  deriveProposedBridges().map(toProposedEntry);
