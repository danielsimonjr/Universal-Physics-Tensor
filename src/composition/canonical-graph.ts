/**
 * Canonical-only graph — project the standard-physics L-layer
 * (`CANONICAL_EQUATIONS`) into the composition-graph edge vocabulary so the
 * discovery/analysis funnel (`upt discover` / `candidates` / `map`) can run on
 * established textbook physics ALONE, with the speculative bridge catalog
 * excluded.
 *
 * WHY this exists: `CATALOG_GRAPH` mixes the 8 established bridges with 36
 * speculative ones, so a `promising` discovery there is polluted by
 * speculation. Feeding ONLY canonical equations gives (a) a new-candidate
 * review surface motivated by textbook physics, and (b) a regression harness —
 * discovery on canonical-only must introduce no numerical contradiction
 * (standard physics, fed to the inference suite, stays self-consistent).
 *
 * DESIGN — parity with the bridge graph:
 *   - Universal constants (G, c, ℏ, k_B, ε₀, σ_sb, b, e) are BAKED INTO the
 *     evaluator, exactly as the catalog edges bake them — they are not graph
 *     nodes. This keeps the candidate proposer about physical OBSERVABLES and
 *     lets the numeric filter fire from the standard `{ mass }` anchor (an
 *     anchor cannot supply G/c/ℏ). A `governing` entry is a constant iff its
 *     name is registered in `CANONICAL_CONSTANT_SI`; everything else is a
 *     physical variable and becomes a source/target node.
 *   - Every canonical equation is `established` physics, so every edge is
 *     `confidence: 'established'` — the canonical graph IS the anchored core.
 *   - `kind: 'law'` (within-domain ground truth, not a cross-regime bridge);
 *     `beId: null` (not a catalog bridge). **Annotation-correctness note:**
 *     `toEdge` hardcodes `kind:'law'` and `regimesDiffer` has zero call sites.
 *     The information-axis mapping is annotation-only; there is no edge-kind
 *     path and no delta to measure.
 *   - Evaluator: the dimensional MONOMIAL gives the power law over the variable
 *     sources, times the baked constant factor. A fully-quantitative scalar
 *     AST that restates a catalog bridge, and whose extra factors are a closed
 *     dimensionless coefficient (ln 2, …), multiplies that coefficient in, so
 *     the number matches the catalog evaluator of the same law. A sourced
 *     prefactor from `canonicalPrefactor` multiplies as well. A dimensionless
 *     group in `CANONICAL_GROUP_PREFACTORS` multiplies only when that input is
 *     present (`√γ` for sound speed); absent, the leading factor stays 1 and
 *     the coefficient stays unset. That table is
 *     outside this tree. `scalar-up-to-constant` is not a license to drop ½,
 *     2π, or 6π. An entry with no table row and no recorded coefficient — no
 *     AST, no restatement, a sum, an unresolved stub — still takes the leading
 *     factor as 1. A fully-quantitative dimensionless count (`N`,
 *     `1-e²`) is a source in `formulaFactors`, not a stub that drops the
 *     rest of the coefficient: the evaluator multiplies it, and a missing
 *     count does not return the count-free value. A `scalar-up-to-constant`
 *     stub (Jarzynski's log average) stays out of that list. A G-closure
 *     is not given a second constant here. Where
 *     dimensions cannot pin a monomial
 *     (`monomial: null`), a fully-quantitative product, quotient, or integer
 *     power is evaluated from that AST, so a numeric leaf (4, 6π, 8π) is not
 *     dropped and Newton's two same-dim masses still return G m₁ m₂ / r².
 *     A sum, a transcendental, or a `scalar-up-to-constant` stub still carries
 *     a NaN evaluator; `retrodict` accepts only finite derivations, so it
 *     abstains on those rather than inventing a monomial.
 *
 * The public counterpart to `CATALOG_GRAPH` (the bridge-catalog graph): exported
 * from the package manifest and surfaced via the CLI's `--source=canonical`
 * flag on `discover` / `candidates` / `map`.
 *
 * @module composition/canonical-graph
 */

import type { BridgeEdge, ValidityDomain } from './edge.js';
import type { Quantity, RegimeAttributes } from './quantity.js';
import type { CanonicalEquation } from '../canonical/canonical-equation.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import { assertCarrierProductSign } from '../bridges/carrier-sign.js';
import { CONSTANTS, piMultipleValue } from '../dimensional/symbolic-constants.js';
import { E_SI, M_E_SI } from '../core/constants.js';
import type { Dimension } from '../dimensional/types.js';
import type { InformationMeasure } from '../core/types.js';
import { CHARGE, DIMENSIONLESS, MASS } from '../dimensional/types.js';
import { equals } from '../dimensional/algebra.js';
import type { ExprNode } from '../dimensional/validator.js';
import { CANONICAL_GROUP_PREFACTORS, canonicalGroupPrefactor, canonicalPrefactor } from './canonical-prefactors.js';

/** A universal constant a canonical `governing` list may name: SI value + dim. */
interface ConstantDef {
  readonly value: number;
  readonly dim: Dimension;
}

/**
 * The universal constants a canonical `governing` list may name, with SI value
 * AND dimension. Reuses the symbolic-composition `CONSTANTS` registry (single
 * source for ℏ/c/G/k_B/ε₀/σ_sb/b and the elementary charge `e`) and adds the
 * `boltzmann` alias, repeats `e`, and adds the electron mass `m_e` — all universal constants,
 * not observables. A governing entry is BAKED into the evaluator iff its name
 * AND dimension match an entry here; everything else is a physical variable (a
 * graph node). The dimension guard is load-bearing: it stops a future
 * same-named physical variable (e.g. orbital eccentricity `e`, dimensionless)
 * from being silently replaced by a constant of the same name.
 */
export const CANONICAL_CONSTANTS: Readonly<Record<string, ConstantDef>> = {
  ...Object.fromEntries(
    Object.entries(CONSTANTS).map(([name, c]) => [name, { value: c.value, dim: c.dim }]),
  ),
  boltzmann: { value: CONSTANTS.k_B.value, dim: CONSTANTS.k_B.dim },
  e: { value: E_SI, dim: CHARGE },
  m_e: { value: M_E_SI, dim: MASS },
};

/**
 * Map camelCase `InformationMeasure` (from canonical regime) to kebab-case
 * `RegimeAttributes.information` (for composition graph).
 */
const INFO_MAP: Record<InformationMeasure, NonNullable<RegimeAttributes['information']>> = {
  vonNeumann: 'von-neumann',
  shannon: 'shannon',
  kolmogorov: 'kolmogorov',
  quantumDiscord: 'discord',
};

/** A governing entry is a baked constant iff its name AND dimension match. */
const constantValue = (name: string, dim: Dimension): number | null => {
  const c = CANONICAL_CONSTANTS[name];
  return c !== undefined && equals(c.dim, dim) ? c.value : null;
};

/**
 * Carry the scale/force/information regime axes (shared with `RegimeAttributes`).
 * The registry's information enum spelling differs from `RegimeAttributes`,
 * so it is mapped via `INFO_MAP`.
 */
function attributesOf(eq: CanonicalEquation): RegimeAttributes {
  const attrs: {
    scale?: RegimeAttributes['scale'];
    force?: RegimeAttributes['force'];
    information?: RegimeAttributes['information'];
  } = {};
  if (eq.regime.scale) attrs.scale = eq.regime.scale;
  if (eq.regime.force) attrs.force = eq.regime.force;
  if (eq.regime.information) attrs.information = INFO_MAP[eq.regime.information];
  return attrs;
}

const PERMISSIVE_DOMAIN: ValidityDomain = {
  description: 'standard-physics regime (canonical L-layer)',
  predicate: () => true,
};

/** A registered or literal dimensionless number, or undefined when `name` is not one. */
function dimensionlessLeaf(name: string): number | undefined {
  const c = CONSTANTS[name];
  if (c !== undefined && equals(c.dim, DIMENSIONLESS)) return c.value;
  const pi = piMultipleValue(name);
  if (pi !== undefined) return pi;
  const n = Number(name);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The dimensionless coefficient of a product or quotient. Dimensionful symbols
 * contribute 1 — the monomial evaluator already carries them. A sum, a
 * non-scalar arm, or a non-literal exponent is not a closed coefficient.
 */
function dimensionlessCoefficient(node: ExprNode): number | undefined {
  if (node.kind === 'symbol') {
    const v = dimensionlessLeaf(node.name);
    return v !== undefined ? v : 1;
  }
  if (node.kind !== 'op') return undefined;
  if (node.op === '*') {
    let acc = 1;
    for (const a of node.args) {
      const c = dimensionlessCoefficient(a);
      if (c === undefined) return undefined;
      acc *= c;
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const n = dimensionlessCoefficient(node.args[0]!);
    const d = dimensionlessCoefficient(node.args[1]!);
    if (n === undefined || d === undefined || d === 0) return undefined;
    return n / d;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const exp = node.args[1];
    if (base === undefined || exp === undefined || exp.kind !== 'symbol') return undefined;
    const e = Number(exp.name);
    if (!Number.isFinite(e)) return undefined;
    if (base.kind === 'symbol') {
      const v = dimensionlessLeaf(base.name);
      return v !== undefined ? Math.pow(v, e) : 1;
    }
    const inner = dimensionlessCoefficient(base);
    return inner === undefined ? undefined : Math.pow(inner, e);
  }
  return undefined;
}

/** A symbol the coefficient walker would treat as 1 but that is not a constant or a governing name. */
function hasUnresolvedStub(node: ExprNode, governing: ReadonlySet<string>): boolean {
  if (node.kind === 'symbol') {
    if (dimensionlessLeaf(node.name) !== undefined) return false;
    if (governing.has(node.name)) return false;
    if (node.name in CONSTANTS) return false;
    return true;
  }
  if (node.kind === 'op') return node.args.some((a) => hasUnresolvedStub(a, governing));
  return true;
}

/**
 * The closed dimensionless factor a fully-quantitative AST records in front of
 * its dimensional monomial. `undefined` when there is nothing to multiply
 * (no AST, not fully quantitative, a stub, a sum, or a factor of ±1).
 */
function recordedDimensionlessCoefficient(eq: CanonicalEquation): number | undefined {
  // Only a declared restatement has a catalog evaluator to agree with. Other
  // fully-quantitative coefficients stay out of this evaluator: folding
  // 1/(32π²) into CE-rydberg-energy moved a pinned magnitude by 2.5 orders
  // and is not the Landauer disagreement.
  if (eq.restatesBridge === undefined) return undefined;
  if (eq.epistemicStatus !== 'fully-quantitative' || eq.scalarAst === undefined) return undefined;
  const governing = new Set(eq.dimensional.governing.map((g) => g.name));
  if (hasUnresolvedStub(eq.scalarAst, governing)) return undefined;
  const c = dimensionlessCoefficient(eq.scalarAst);
  if (c === undefined || !Number.isFinite(c) || c === 0) return undefined;
  if (Math.abs(Math.abs(c) - 1) < 1e-12) return undefined;
  return c;
}

/**
 * Exponents of every symbol in a product, quotient, or integer power.
 * Undefined for a sum or any node that is not that monomial.
 */
function monomialExponents(node: ExprNode | undefined): Map<string, number> | undefined {
  if (node === undefined) return undefined;
  if (node.kind === 'symbol') return new Map([[node.name, 1]]);
  if (node.kind !== 'op') return undefined;
  if (node.op === '*') {
    const acc = new Map<string, number>();
    for (const arg of node.args) {
      const part = monomialExponents(arg);
      if (part === undefined) return undefined;
      for (const [name, exp] of part) acc.set(name, (acc.get(name) ?? 0) + exp);
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const numerator = monomialExponents(node.args[0]);
    const denominator = monomialExponents(node.args[1]);
    if (numerator === undefined || denominator === undefined) return undefined;
    for (const [name, exp] of denominator) numerator.set(name, (numerator.get(name) ?? 0) - exp);
    return numerator;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const expNode = node.args[1];
    if (base === undefined || expNode === undefined || expNode.kind !== 'symbol') return undefined;
    const exp = Number(expNode.name);
    if (!Number.isFinite(exp)) return undefined;
    const inner = monomialExponents(base);
    if (inner === undefined) return undefined;
    for (const [name, innerExp] of inner) inner.set(name, innerExp * exp);
    return inner;
  }
  return undefined;
}

/**
 * Dimensionless counts a fully-quantitative AST multiplies in and Buckingham
 * cannot see. `scalar-up-to-constant` stays excluded: that stub is the
 * unfixed factor, not a required input.
 */
function formulaFactorExponents(eq: CanonicalEquation): Record<string, number> {
  if (eq.epistemicStatus !== 'fully-quantitative' || eq.scalarAst === undefined) return {};
  const powers = monomialExponents(eq.scalarAst);
  if (powers === undefined) return {};
  const governing = new Set(eq.dimensional.governing.map((g) => g.name));
  const dims = new Map<string, Dimension>();
  const collectDims = (node: ExprNode): void => {
    if (node.kind === 'symbol') dims.set(node.name, node.dim);
    else if (node.kind === 'op') for (const arg of node.args) collectDims(arg);
  };
  collectDims(eq.scalarAst);
  const factors: Record<string, number> = {};
  for (const [name, exp] of powers) {
    if (exp === 0) continue;
    const dim = dims.get(name);
    if (dim === undefined || !equals(dim, DIMENSIONLESS)) continue;
    if (dimensionlessLeaf(name) !== undefined) continue;
    if (governing.has(name) || name in CONSTANTS) continue;
    factors[name] = exp;
  }
  return factors;
}

type InputParity = 'even' | 'odd' | 'neither' | 'absent';

/**
 * Sign parity of `node` as a function of `name`. A product of two odd
 * factors is even. An absolute value is even. An even integer power is
 * even. A fractional power of an even subexpression stays even
 * (`√(q²)`), and a fractional power of an odd one is not a magnitude.
 */
function inputParity(node: ExprNode, name: string): InputParity {
  if (node.kind === 'symbol') return node.name === name ? 'odd' : 'absent';
  if (node.kind === 'abs') {
    const inner = inputParity(node.arg, name);
    if (inner === 'absent' || inner === 'neither') return inner;
    return 'even';
  }
  if (node.kind === 'transcendental' || node.kind === 'dirac-delta') {
    const inner = inputParity(node.arg, name);
    return inner === 'absent' ? 'absent' : 'neither';
  }
  if (node.kind !== 'op') return 'neither';
  if (node.op === '+' || node.op === '-') {
    const parts = node.args.map((arg) => inputParity(arg, name)).filter((p) => p !== 'absent');
    if (parts.length === 0) return 'absent';
    if (parts.some((p) => p === 'neither')) return 'neither';
    if (parts.every((p) => p === 'even')) return 'even';
    if (parts.every((p) => p === 'odd')) return 'odd';
    return 'neither';
  }
  if (node.op === '*' || node.op === '/') {
    let acc: InputParity = 'absent';
    for (const arg of node.args) {
      const part = inputParity(arg, name);
      if (part === 'neither') return 'neither';
      if (part === 'absent') continue;
      if (acc === 'absent') acc = part;
      else if (acc === 'odd' && part === 'odd') acc = 'even';
      else if (acc === 'odd' || part === 'odd') acc = 'odd';
      else acc = 'even';
    }
    return acc;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const expNode = node.args[1];
    if (base === undefined || expNode === undefined || expNode.kind !== 'symbol') return 'neither';
    const exp = Number(expNode.name);
    const inner = inputParity(base, name);
    if (!Number.isFinite(exp) || inner === 'neither') return inner === 'absent' ? 'absent' : 'neither';
    if (inner === 'absent' || exp === 0) return 'absent';
    if (Number.isInteger(exp) && Math.abs(exp) % 2 === 0) return 'even';
    if (Number.isInteger(exp)) return inner;
    return inner === 'even' ? 'even' : 'neither';
  }
  return 'neither';
}

/** Names whose scalar AST is an even function. A magnitude uses these absolutely. */
function evenInputNames(node: ExprNode | undefined): ReadonlySet<string> {
  if (node === undefined) return new Set();
  const names = new Set<string>();
  const walk = (n: ExprNode): void => {
    if (n.kind === 'symbol') names.add(n.name);
    else if (n.kind === 'op') for (const arg of n.args) walk(arg);
    else if (n.kind === 'abs' || n.kind === 'transcendental' || n.kind === 'dirac-delta') walk(n.arg);
  };
  walk(node);
  const even = new Set<string>();
  for (const name of names) {
    if (inputParity(node, name) === 'even') even.add(name);
  }
  return even;
}

function magnitudeBase(name: string, value: number, even: ReadonlySet<string>): number {
  return even.has(name) ? Math.abs(value) : value;
}

/** Evaluate a fully-quantitative monomial AST, including its dimensionless counts. */
function evaluateAstMonomial(
  eq: CanonicalEquation,
  powers: ReadonlyMap<string, number>,
): (inputs: Record<string, number>) => number {
  const dimByName = new Map(eq.dimensional.governing.map((g) => [g.name, g.dim]));
  let constFactor = 1;
  const varExps: Array<[string, number]> = [];
  for (const [name, exp] of powers) {
    if (exp === 0) continue;
    const leaf = dimensionlessLeaf(name);
    if (leaf !== undefined) {
      constFactor *= Math.pow(leaf, exp);
      continue;
    }
    const dim = dimByName.get(name) ?? CONSTANTS[name]?.dim;
    const cv = dim !== undefined ? constantValue(name, dim) : null;
    if (cv !== null) constFactor *= Math.pow(cv, exp);
    else varExps.push([name, exp]);
  }
  const monomial = eq.dimensional.monomial;
  const even = evenInputNames(eq.scalarAst);
  return (inputs: Record<string, number>): number => {
    if (monomial !== null) assertCarrierProductSign(monomial, inputs);
    let v = constFactor;
    for (const [name, exp] of varExps) {
      const x = inputs[name];
      if (x === undefined || !Number.isFinite(x)) return Number.NaN;
      v *= Math.pow(magnitudeBase(name, x, even), exp);
    }
    return v;
  };
}

/**
 * Build the evaluator for one canonical equation, keyed by its VARIABLE source
 * names. Variables carry the monomial exponent from `inputs`; constants
 * contribute a fixed baked factor. A fully-quantitative restatement multiplies
 * its recorded dimensionless coefficient and the sourced table prefactor.
 * A fully-quantitative AST that names a dimensionless count, or whose
 * Buckingham monomial is null, is evaluated from that AST so the count and
 * the numeric leaves (6π) are not dropped. A variable the AST is even in
 * (q² under a square root, or |q|) is taken as an absolute value, so a
 * magnitude stays positive. An odd formula, including a cyclotron frequency
 * and a Hall coefficient, stays signed.
 * Returns NaN when the monomial is null and the AST is not that monomial
 * — `retrodict` then abstains.
 */
function makeEvaluate(
  eq: CanonicalEquation,
): (inputs: Record<string, number>) => number {
  const powers = eq.epistemicStatus === 'fully-quantitative' ? monomialExponents(eq.scalarAst) : undefined;
  const factors = formulaFactorExponents(eq);
  if (powers !== undefined && (Object.keys(factors).length > 0 || eq.dimensional.monomial === null)) {
    return evaluateAstMonomial(eq, powers);
  }
  const monomial = eq.dimensional.monomial;
  if (monomial === null) return () => NaN;
  const dimByName = new Map(eq.dimensional.governing.map((g) => [g.name, g.dim]));
  let constFactor = 1;
  const varExps: Array<[string, number]> = [];
  for (const [name, exp] of Object.entries(monomial)) {
    const dim = dimByName.get(name);
    const cv = dim !== undefined ? constantValue(name, dim) : null;
    if (cv !== null) constFactor *= Math.pow(cv, exp);
    else varExps.push([name, exp]);
  }
  const recorded = recordedDimensionlessCoefficient(eq) ?? 1;
  const tabled = canonicalPrefactor(eq.id) ?? 1;
  const group = CANONICAL_GROUP_PREFACTORS.find((p) => p.id === eq.id);
  const even = evenInputNames(eq.scalarAst);
  return (inputs: Record<string, number>): number => {
    assertCarrierProductSign(monomial, inputs);
    let v = constFactor * recorded * tabled;
    if (group !== undefined) {
      const g = inputs[group.group];
      if (g !== undefined && Number.isFinite(g)) {
        const factor = canonicalGroupPrefactor(eq.id, g);
        if (factor !== undefined) v *= factor;
      }
    }
    for (const [name, exp] of varExps) {
      const x = inputs[name];
      v *= Math.pow(x === undefined ? Number.NaN : magnitudeBase(name, x, even), exp);
    }
    return v;
  };
}

/** Project one canonical equation to a composition-graph edge. */
function toEdge(eq: CanonicalEquation): BridgeEdge {
  const attributes = attributesOf(eq);
  const target: Quantity = {
    name: eq.dimensional.target.name,
    symbol: eq.dimensional.target.name,
    dim: eq.dimensional.target.dim,
    attributes,
  };
  const factors = formulaFactorExponents(eq);
  const sources: Quantity[] = eq.dimensional.governing
    .filter((g) => constantValue(g.name, g.dim) === null)
    .map((g) => ({ name: g.name, symbol: g.name, dim: g.dim, attributes }));
  for (const name of Object.keys(factors)) {
    sources.push({ name, symbol: name, dim: DIMENSIONLESS, attributes });
  }
  return {
    id: eq.id,
    beId: null,
    kind: 'law',
    label: eq.name,
    sources,
    target,
    confidence: 'established',
    domain: PERMISSIVE_DOMAIN,
    evaluate: makeEvaluate(eq),
    citation: eq.references[0] ?? eq.id,
    ...(eq.epistemicStatus === 'dimensional' && canonicalPrefactor(eq.id) === undefined
      ? { coefficientUnset: true as const }
      : {}),
    ...(Object.keys(factors).length > 0 ? { formulaFactors: factors } : {}),
  };
}

/**
 * Project canonical equations into composition-graph edges (defaults to the
 * full registry). See the module docstring for the modelling decisions.
 *
 * @internal
 */
export function canonicalToEdges(
  equations: readonly CanonicalEquation[] = CANONICAL_EQUATIONS,
): BridgeEdge[] {
  return equations.map(toEdge);
}

/**
 * The standard-physics composition graph: every canonical equation as an
 * `established` `law` edge. The bridge-free counterpart to `CATALOG_GRAPH`.
 *
 * @internal
 */
export const CANONICAL_GRAPH: readonly BridgeEdge[] = canonicalToEdges();
