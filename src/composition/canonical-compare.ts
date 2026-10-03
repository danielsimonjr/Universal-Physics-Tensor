/**
 * Compare a user's formula with the canonical (textbook) equation it restates.
 *
 * Dimensional analysis cannot see a dimensionless prefactor, so `T = π√(ℓ/g)`
 * and `K = m v²` pass every dimensional check. When the registry holds an
 * equation with the same target and the same variables, this module evaluates
 * both sides at {@link FIXED_POINT_EXPONENTS}, fixed points documented here, and
 * classifies the ratio `yours / canonical`:
 *
 * - `agrees`  — constant and equal to 1: the prefactor is checked and right.
 * - `factor`  — constant but not 1: the forms agree and the prefactor does not.
 * - `form`    — not constant across the points: a different law.
 * - `prefactor-unchecked` — the forms agree, but the registry records the law
 *   only up to a constant or only dimensionally, so it holds no prefactor to
 *   compare with. That is reported as unchecked, never as agreement.
 * - `not-compared` — the variables could not be aligned, or an evaluation
 *   failed; `detail` says which.
 *
 * The points are fixed so the output is identical on every run.
 *
 * INTERNAL — surfaced by `upt map --equation` and `upt derive --formula`.
 *
 * @module composition/canonical-compare
 */

import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import { equals } from '../dimensional/algebra.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import type { CanonicalEquation } from '../canonical/canonical-equation.js';
import { CONSTANTS, piMultipleValue } from '../dimensional/symbolic-constants.js';
import { evalExpr } from './expr-eval.js';
import { CANONICAL_GROUP_PREFACTORS, canonicalPrefactor } from './canonical-prefactors.js';
import { formulaNameDimensions } from '../dimensional/formula-names.js';
import { parseUserEquation, resolveToCatalogName } from './user-equation.js';
import { getFormulaParser, parsePhysics } from '../numerical/formula-registry.js';
import { formulaSymbolDimension } from '../numerical/formula-dimension.js';
import type { CompiledFormula } from '../numerical/formula-contract.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import { DIMENSIONLESS } from '../dimensional/types.js';

/**
 * The comparison points: variable `i` (in sorted name order) takes the value
 * `(1.7 + i)^p` at point `p` of this list, the scheme `upt derive` uses to
 * recover a prefactor. Each variable has its own base, so the RATIOS between
 * variables change from point to point too. A common scale factor would leave
 * every ratio such as ℓ/g fixed, and `T ∝ ℓ/g` would then pass as the form of
 * `T ∝ √(ℓ/g)`.
 * @internal
 */
const FIXED_POINT_EXPONENTS: readonly number[] = [1, 1.3, 1.6];

/** Relative tolerance for "the ratio is constant" and "the ratio is 1". @internal */
const RATIO_TOLERANCE = 1e-9;

/**
 * Catalog names for an entry whose frozen target name is a different word.
 * CE-schwarzschild-radius's L0 record calls the target `radius`; the catalog
 * quantity, and the name a student writes, is `schwarzschild-radius`.
 */
const ENTRY_TARGET_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'CE-schwarzschild-radius': ['schwarzschild-radius'],
  // The L0 id keeps the catalog name. The reduced name is the same entry.
  // The non-reduced entry also answers to that catalog name when the formula uses h.
  'CE-compton-wavelength': ['reduced-compton-wavelength'],
  'CE-compton-wavelength-full': ['compton-wavelength'],
};

/** What a dimensionless registry stub stands for, when the symbol is not the latex. */
const STUB_GLOSS: Readonly<Record<string, string>> = {
  one_minus_e_sq: '1-e²',
};

/** How a user formula compares with one canonical equation. @internal */
export interface CanonicalComparison {
  readonly id: string;
  readonly name: string;
  readonly kind: 'agrees' | 'factor' | 'form' | 'prefactor-unchecked' | 'not-compared';
  /** `yours / canonical`, present only for `agrees` and `factor`. */
  readonly ratio?: number;
  /** Why the prefactor is unchecked, or why no comparison was made. */
  readonly detail?: string;
  /** `[yours, canonical]` for each variable paired by dimension, not by name (persona finding N1). */
  readonly paired?: readonly (readonly [string, string])[];
  /**
   * True when neither side has a free variable (every name is a registered constant, persona
   * finding W5): the two sides are compared once, at the SI constant values, so the form is not
   * tested, only the value.
   */
  readonly constantsOnly?: true;
  /**
   * Present when your target matched through the catalog bridge this entry restates
   * (`restatesBridge`), not by the entry's own target name: that bridge's id and the entry's target.
   */
  readonly targetVia?: { readonly bridge: string; readonly its: string };
  /**
   * Set when the comparison evaluated c, ħ, h or G at a non-SI value
   * (`--natural` / `--geometrized`). Absent on an SI comparison.
   */
  readonly evaluatedAt?: string;
}

/** A user source variable; with a dimension it may pair with a differently named canonical variable. */
export type ComparisonSource = string | { readonly name: string; readonly dim: Dimension };

const normalize = (name: string): string => name.replace(/_/g, '-');

/**
 * Pair each user source with one canonical variable: by name first, then by a dimension that
 * exactly one remaining canonical variable carries, repeated until nothing changes. `null` when the
 * sources cannot be this entry's variables (a count, a name without a dimension, or a dimension no
 * variable left carries); `'ambiguous'` when every source has a same-dimension partner but the
 * pairing is not unique. Returns user name → canonical name, both normalized.
 */
function pairSources(
  sources: readonly { name: string; dim?: Dimension }[],
  variables: readonly { name: string; dim: Dimension }[],
): Map<string, string> | 'ambiguous' | null {
  if (sources.length !== variables.length) return null;
  const pairs = new Map<string, string>();
  const freeVars = new Map(variables.map((v) => [normalize(v.name), v.dim]));
  let open = sources.filter((s) => {
    if (!freeVars.has(s.name)) return true;
    pairs.set(s.name, s.name);
    freeVars.delete(s.name);
    return false;
  });
  let progress = true;
  while (open.length > 0 && progress) {
    progress = false;
    for (const s of open) {
      if (s.dim === undefined) return null;
      const partners = [...freeVars].filter(([, dim]) => equals(dim, s.dim!));
      if (partners.length === 0) return null;
      if (partners.length === 1) {
        pairs.set(s.name, partners[0]![0]);
        freeVars.delete(partners[0]![0]);
        progress = true;
      }
    }
    open = open.filter((s) => !pairs.has(s.name));
  }
  return open.length === 0 ? pairs : 'ambiguous';
}

/**
 * Peel user sources that restate a CE governing *constant* (persona finding W1).
 *
 * CE-mass-energy lists `c` as governing, but `c` is in {@link CONSTANTS}, so it is not a free
 * variable of the comparison. Writing the catalog quantity `speed-of-light` (same dimension) must
 * not make the source set look larger than `{mass}` and skip the prefactor check. A source pairs
 * with a constant by name, or by a dimension that exactly one remaining constant carries and that
 * no free variable carries (variables win — `velocity` still pairs with CE-kinetic-energy's
 * `speed`). Returns the sources left for {@link pairSources}, plus user→constant name pairs.
 * Leftover sources that match no variable and no unique constant make the entry a non-match
 * (`null` from the caller when `forVariables` then fails to pair).
 */
function peelConstantAliases(
  sources: readonly { name: string; dim?: Dimension }[],
  variables: readonly { name: string; dim: Dimension }[],
  constants: readonly { name: string; dim: Dimension }[],
): { forVariables: { name: string; dim?: Dimension }[]; constPairs: Map<string, string> } {
  const constPairs = new Map<string, string>();
  const freeConsts = new Map(constants.map((c) => [normalize(c.name), c.dim]));
  const forVariables: { name: string; dim?: Dimension }[] = [];
  for (const s of sources) {
    if (variables.some((v) => normalize(v.name) === s.name)) {
      forVariables.push(s);
      continue;
    }
    if (freeConsts.has(s.name)) {
      constPairs.set(s.name, s.name);
      freeConsts.delete(s.name);
      continue;
    }
    if (s.dim !== undefined) {
      const varHits = variables.filter((v) => equals(v.dim, s.dim!));
      if (varHits.length > 0) {
        forVariables.push(s);
        continue;
      }
      // h and ħ are both action. A formula that writes one is not the other.
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, s.name)) {
        forVariables.push(s);
        continue;
      }
      const constHits = [...freeConsts].filter(([, dim]) => equals(dim, s.dim!));
      if (constHits.length === 1) {
        constPairs.set(s.name, constHits[0]![0]);
        freeConsts.delete(constHits[0]![0]);
        continue;
      }
    }
    forVariables.push(s);
  }
  return { forVariables, constPairs };
}

/** A governing variable that is a registered physical constant of the same dimension. */
function isConstant(v: { name: string; dim: Dimension }): boolean {
  const c = CONSTANTS[v.name];
  return c !== undefined && equals(c.dim, v.dim);
}

/**
 * The catalog bridge through which `wantTarget` names this entry's target: the entry records that
 * it restates that bridge (`restatesBridge`), and the bridge's graph edge has `wantTarget` as its
 * target (persona finding W7: `landauer-erasure-energy` is BE-16's target, and CE-landauer, which
 * restates BE-16, names it `erasure-energy`). A recorded restatement, never a shared dimension.
 */
function targetThroughRestatedBridge(entry: CanonicalEquation, wantTarget: string): string | undefined {
  if (entry.restatesBridge === undefined) return undefined;
  const beId = Number(entry.restatesBridge);
  return CATALOG_GRAPH.find((e) => e.beId === beId && normalize(e.target.name) === wantTarget)?.id;
}

/** The free (non-constant, non-literal) symbols of an AST, with their dimensions. */
function freeSymbols(node: ExprNode, out: Map<string, Dimension>): Map<string, Dimension> {
  if (node.kind === 'symbol') {
    const literal = Number.isFinite(Number(node.name));
    if (!literal && CONSTANTS[node.name] === undefined && piMultipleValue(node.name) === undefined) {
      out.set(node.name, node.dim);
    }
    return out;
  }
  const args = (node as { args?: readonly ExprNode[] }).args ?? [];
  for (const a of args) freeSymbols(a, out);
  return out;
}

/**
 * Dimensionless symbols the entry's AST holds that its governing set does not, and that the user
 * names too: CE-ideal-gas writes `P = N k_B T/V` with the count `N` in its AST only (persona finding
 * L6). They join the comparison variables BY NAME only; pairing a dimensionless stub such as
 * `one_minus_e_sq` with any dimensionless user quantity by dimension would compare different laws.
 */
function astOnlyCounts(
  entry: CanonicalEquation,
  userNames: ReadonlySet<string>,
): { name: string; dim: Dimension }[] {
  if (entry.scalarAst === undefined) return [];
  const governing = new Set(entry.dimensional.governing.map((g) => normalize(g.name)));
  return [...freeSymbols(entry.scalarAst, new Map())]
    .filter(([name, dim]) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name) && equals(dim, DIMENSIONLESS))
    .filter(([name]) => !governing.has(normalize(name)) && userNames.has(normalize(name)))
    .map(([name, dim]) => ({ name, dim }));
}

/**
 * Every way to map free AST symbols onto governing variables: by name first,
 * then any bijection that respects dimension. One map when each remaining
 * symbol has a unique dimension; several when a product such as m₁ m₂ can be
 * assigned either way. Empty when the counts differ or a symbol has no
 * variable of its dimension. More than 24 bijections is treated as empty —
 * that pairing is not checked, rather than searched.
 */
function symbolAlignments(
  symbols: ReadonlyMap<string, Dimension>,
  governing: readonly { name: string; dim: Dimension }[],
): Map<string, string>[] {
  if (symbols.size !== governing.length) return [];
  const assignment = new Map<string, string>();
  const free = new Set(governing.map((g) => g.name));
  for (const s of [...symbols.keys()].sort()) {
    if (free.has(s)) {
      assignment.set(s, s);
      free.delete(s);
    }
  }
  const rest = [...symbols.entries()]
    .filter(([s]) => !assignment.has(s))
    .sort(([a], [b]) => a.localeCompare(b));
  const out: Map<string, string>[] = [];
  const CAP = 24;
  const rec = (i: number): void => {
    if (out.length > CAP) return;
    if (i === rest.length) {
      out.push(new Map(assignment));
      return;
    }
    const [s, dim] = rest[i]!;
    const candidates = governing
      .filter((g) => free.has(g.name) && equals(g.dim, dim))
      .map((g) => g.name)
      .sort();
    for (const c of candidates) {
      assignment.set(s, c);
      free.delete(c);
      rec(i + 1);
      free.add(c);
      assignment.delete(s);
      if (out.length > CAP) return;
    }
  };
  rec(0);
  return out.length > CAP ? [] : out;
}

/** Why an AST could not be aligned, naming a dimensionless stub the user did not. */
function alignmentDetail(
  symbols: ReadonlyMap<string, Dimension>,
  variables: readonly { name: string; dim: Dimension }[],
): string {
  const named = new Set(variables.map((v) => v.name));
  const stubs = [...symbols.entries()]
    .filter(([name, dim]) => !named.has(name) && equals(dim, DIMENSIONLESS))
    .map(([name]) => name)
    .sort();
  if (symbols.size !== variables.length && stubs.length > 0) {
    const shown = stubs.map((s) => (STUB_GLOSS[s] === undefined ? s : `${s} (${STUB_GLOSS[s]})`));
    return `its formula depends on ${shown.join(', ')}, which your formula does not name`;
  }
  return 'its variables could not be aligned by name or by a unique dimension';
}

/** True when every alignment produced the same ratio at each fixed point. */
function sameRatios(series: readonly (readonly number[])[]): boolean {
  const first = series[0];
  if (first === undefined) return false;
  return series.every((s) =>
    s.every((r, i) => {
      const r0 = first[i]!;
      return Number.isFinite(r) && Number.isFinite(r0) && r0 !== 0 && Math.abs(r / r0 - 1) <= RATIO_TOLERANCE;
    }),
  );
}

function classify(
  entry: CanonicalEquation,
  ratios: readonly number[],
  recordsPrefactor: boolean,
): CanonicalComparison {
  const base = { id: entry.id, name: entry.name };
  const r0 = ratios[0]!;
  const constant = ratios.every((r) => Math.abs(r / r0 - 1) <= RATIO_TOLERANCE);
  if (!constant) return { ...base, kind: 'form' };
  if (!recordsPrefactor) {
    return {
      ...base,
      kind: 'prefactor-unchecked',
      detail:
        entry.epistemicStatus === 'dimensional'
          ? 'the registry records its dimensional form only'
          : entry.epistemicStatus === 'fully-quantitative' && entry.fieldEquation !== undefined
            ? 'the registry records its prefactor only in its field equation, and its scalar record is the dimensional monomial'
            : entry.epistemicStatus === 'fully-quantitative'
              ? 'its scalar record is the dimensional monomial only'
              : 'the registry records it only up to a constant',
    };
  }
  return Math.abs(r0 - 1) <= RATIO_TOLERANCE
    ? { ...base, kind: 'agrees', ratio: r0 }
    : { ...base, kind: 'factor', ratio: r0 };
}

/**
 * Compare a user formula with every canonical equation that has the same
 * target and the same non-constant variables. The target must match by name
 * (after `_` → `-`): pairing it by dimension would reach every law of that
 * dimension. Each source matches a variable by name, or, when the source
 * carries a dimension, by a dimension exactly one remaining variable carries
 * (`velocity` → CE-kinetic-energy's `speed`); such pairs are listed in
 * `paired`. A non-unique pairing is reported as `not-compared`, never guessed.
 * `evaluateUser` receives values keyed by the user's (normalized) source names.
 * Returns one comparison per matching entry, in registry order; empty when
 * no entry matches.
 *
 * @internal
 */
function overrideValue(
  name: string,
  si: number,
  overrides: Readonly<Record<string, number>> | undefined,
): number {
  if (overrides !== undefined && Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name]!;
  return si;
}

/** A short label for a non-SI constant table, or undefined when the table is SI. */
function overrideLabel(overrides: Readonly<Record<string, number>> | undefined): string | undefined {
  if (overrides === undefined) return undefined;
  const bits: string[] = [];
  if (overrides.c === 1) bits.push('c = 1');
  if (overrides.hbar === 1) bits.push('ħ = 1');
  if (overrides.h === 2 * Math.PI) bits.push('h = 2π');
  if (overrides.G === 1) bits.push('G = 1');
  return bits.length === 0 ? undefined : bits.join(', ');
}

/** Compare a user expression against the canonical equations that share its target and source quantities. `evaluateUser` is called only for the user's expression; each canonical value comes from that entry's `scalarAst` or from its registry monomial. */
export function compareWithCanonical(
  target: string,
  sources: readonly ComparisonSource[],
  evaluateUser: (values: Readonly<Record<string, number>>) => number,
  entries: readonly CanonicalEquation[] = CANONICAL_EQUATIONS,
  constantOverrides?: Readonly<Record<string, number>>,
): CanonicalComparison[] {
  const wantTarget = normalize(target);
  const wantSources = new Map<string, { name: string; dim?: Dimension }>();
  for (const s of sources) {
    const name = normalize(typeof s === 'string' ? s : s.name);
    if (!wantSources.has(name)) wantSources.set(name, typeof s === 'string' ? { name } : { name, dim: s.dim });
  }
  const results: CanonicalComparison[] = [];

  for (const entry of entries) {
    const d = entry.dimensional;
    const via = normalize(d.target.name) === wantTarget ? undefined : targetThroughRestatedBridge(entry, wantTarget);
    const alias = (ENTRY_TARGET_ALIASES[entry.id] ?? []).includes(wantTarget);
    if (normalize(d.target.name) !== wantTarget && via === undefined && !alias) continue;
    const targetVia = via === undefined ? {} : { targetVia: { bridge: via, its: d.target.name } };
    let variables = d.governing.filter((g) => !isConstant(g));
    const constants = d.governing.filter(isConstant);
    // W1: sources that restate a governing constant (speed-of-light ↔ c) peel off first so they
    // do not inflate the free-variable count and skip the prefactor check.
    const { forVariables, constPairs } = peelConstantAliases(
      [...wantSources.values()],
      variables,
      constants,
    );
    // A dimensionless group the record does not carry (sound-speed γ) is checked only when the
    // user wrote it. Friedmann's curvature term is CE-friedmann-curvature, not an extension of the flat entry.
    const groupSpec = CANONICAL_GROUP_PREFACTORS.find((g) => g.id === entry.id);
    let boundGroup: string | undefined;
    if (groupSpec) {
      const idx = forVariables.findIndex((s) => s.name === groupSpec.group);
      if (idx >= 0) {
        boundGroup = forVariables[idx]!.name;
        forVariables.splice(idx, 1);
      }
    }
    let pairing = pairSources(forVariables, variables);
    if (pairing === null) {
      // L6: a count the AST holds but the governing set does not (CE-ideal-gas's N), named by the user.
      const counts = astOnlyCounts(entry, new Set(forVariables.map((s) => s.name)));
      if (counts.length > 0) {
        const widened = [...variables, ...counts];
        pairing = pairSources(forVariables, widened);
        if (pairing !== null) variables = widened;
      }
    }
    if (pairing === null) continue;
    if (pairing === 'ambiguous') {
      results.push({
        id: entry.id,
        name: entry.name,
        kind: 'not-compared',
        detail: 'your variable names differ from its names, and they pair with its variables by dimension in more than one way',
        ...targetVia,
      });
      continue;
    }
    const byDimension = [...pairing, ...constPairs]
      .filter(([u, c]) => u !== c)
      .sort(([a], [b]) => a.localeCompare(b));
    const paired = byDimension.length > 0 ? { paired: byDimension } : {};
    const names = variables.map((g) => normalize(g.name)).sort();

    const points = FIXED_POINT_EXPONENTS.map((p) => {
      const row: Record<string, number> = Object.fromEntries(names.map((n, i) => [n, Math.pow(1.7 + i, p)]));
      if (boundGroup !== undefined) row['__group'] = Math.pow(2.3, p);
      return row;
    });
    // Constant aliases bind to the registered SI value (same as the canonical AST's CONSTANTS
    // lookup), not to a fixed-point sample — otherwise the ratio would wander with the points.
    const constBindings = Object.fromEntries(
      [...constPairs].map(([u, cName]) => {
        const c = CONSTANTS[cName];
        if (c === undefined) {
          throw new Error(`compareWithCanonical: governing constant '${cName}' is not in CONSTANTS`);
        }
        return [u, overrideValue(cName, c.value, constantOverrides)];
      }),
    );
    const userAt = (p: Readonly<Record<string, number>>) =>
      evaluateUser({
        ...Object.fromEntries([...pairing].map(([u, c]) => [u, p[c]!])),
        ...constBindings,
        ...(boundGroup === undefined ? {} : { [boundGroup]: p['__group']! }),
      });

    // A prefactor the entry does not record may come from the sourced table,
    // which lives outside the pinned src/canonical tree.
    const tabled = entry.epistemicStatus === 'fully-quantitative' ? undefined : canonicalPrefactor(entry.id);
    const extraFactor = (p: Readonly<Record<string, number>>): number =>
      boundGroup === undefined || groupSpec === undefined
        ? 1
        : groupSpec.coefficient * Math.pow(p['__group']!, groupSpec.exponent);
    const scale = (flat: number, p: Readonly<Record<string, number>>): number =>
      (tabled ?? 1) * extraFactor(p) * flat;
    let canonicalAt: (p: Readonly<Record<string, number>>) => number;
    if (entry.scalarAst !== undefined) {
      const ast = entry.scalarAst;
      const symbols = freeSymbols(ast, new Map());
      const alignments = symbolAlignments(symbols, variables);
      const at = (alignment: ReadonlyMap<string, string>) => (p: Readonly<Record<string, number>>) =>
        scale(
          evalExpr(ast, {
            ...(constantOverrides ?? {}),
            ...Object.fromEntries([...alignment].map(([sym, g]) => [sym, p[normalize(g)]!])),
          }),
          p,
        );
      if (alignments.length === 0) {
        results.push({
          id: entry.id,
          name: entry.name,
          kind: 'not-compared',
          detail: alignmentDetail(symbols, variables),
          ...paired, ...targetVia,
        });
        continue;
      }
      if (alignments.length === 1) {
        const alignment = alignments[0]!;
        canonicalAt = at(alignment);
      } else {
        let series: number[][];
        try {
          series = alignments.map((alignment) => points.map((p) => userAt(p) / at(alignment)(p)));
        } catch (e) {
          results.push({
            id: entry.id,
            name: entry.name,
            kind: 'not-compared',
            detail: `an evaluation failed (${e instanceof Error ? e.message : String(e)})`,
            ...paired, ...targetVia,
          });
          continue;
        }
        if (!sameRatios(series)) {
          results.push({
            id: entry.id,
            name: entry.name,
            kind: 'not-compared',
            detail: 'swapping its same-dimension symbols changes the ratio, so they were not paired',
            ...paired, ...targetVia,
          });
          continue;
        }
        // The ratio does not depend on which same-dimension symbol takes which
        // variable (m₁ m₂ = m₂ m₁). One assignment is enough; none is named.
        canonicalAt = at(alignments[0]!);
      }
    } else if (d.monomial !== null) {
      // W4: a governing constant takes its SI value, as on the user side and in the AST branch. A
      // name that is neither a variable nor a constant has no value, so the ratio is not finite and
      // the entry is reported as not compared; reading it as 1 made Kepler III "factor 122404".
      const monomial = d.monomial;
      const constValues = new Map(
        constants.map((g) => [normalize(g.name), overrideValue(g.name, CONSTANTS[g.name]!.value, constantOverrides)]),
      );
      canonicalAt = (p) =>
        scale(
          Object.entries(monomial).reduce(
            (acc, [n, e]) => acc * Math.pow(p[normalize(n)] ?? constValues.get(normalize(n)) ?? Number.NaN, e),
            1,
          ),
          p,
        );
    } else {
      continue;
    }

    let ratios: number[];
    try {
      ratios = points.map((p) => userAt(p) / canonicalAt(p));
    } catch (e) {
      results.push({
        id: entry.id,
        name: entry.name,
        kind: 'not-compared',
        detail: `an evaluation failed (${e instanceof Error ? e.message : String(e)})`,
        ...paired, ...targetVia,
      });
      continue;
    }
    if (!ratios.every((r) => Number.isFinite(r) && r !== 0)) {
      results.push({ id: entry.id, name: entry.name, kind: 'not-compared', detail: 'a ratio was zero or not finite', ...paired, ...targetVia });
      continue;
    }
    // A monomial-only record carries no prefactor. A fully-quantitative scalar AST does.
    const recordsPrefactor =
      tabled !== undefined ||
      boundGroup !== undefined ||
      (entry.epistemicStatus === 'fully-quantitative' && entry.scalarAst !== undefined);
    const extension =
      boundGroup !== undefined && groupSpec !== undefined
        ? `the dimensionless group ${groupSpec.group} is bound, so the prefactor includes ${groupSpec.coefficient}·${groupSpec.group}^${groupSpec.exponent}`
        : undefined;
    const classified = classify(entry, ratios, recordsPrefactor);
    results.push({
      ...classified,
      ...(extension !== undefined && classified.detail === undefined ? { detail: extension } : {}),
      ...(names.length === 0 ? { constantsOnly: true as const } : {}),
      ...paired, ...targetVia,
    });
  }
  const label = overrideLabel(constantOverrides);
  return label === undefined ? results : results.map((r) => ({ ...r, evaluatedAt: label }));
}

/**
 * Compare a `TARGET = EXPR` user equation (the `upt map --equation` input) with
 * the canonical registry. Names resolve onto `catalogDims` the way
 * `analyzeUserEquation` resolves them; `pi` and `tau` are the only named numbers.
 * The right-hand side is dimension-checked through `parsePhysics` and evaluated by
 * the active formula parser, the one `upt eval` uses, so a comparison accepts every
 * function `eval` accepts (`ln(2)`, `asin`, `atan2`; persona finding W7). A registered
 * constant takes its SI value, as in the canonical AST, unless
 * `constantOverrides` replaces c, ħ, h or G (`--natural` / `--geometrized`).
 * Returns `[]` when the equation does not parse or no entry matches.
 *
 * @internal
 */
export async function compareUserEquation(
  equation: string,
  catalogDims: ReadonlyMap<string, Dimension>,
  options?: { readonly bindShortNames?: boolean; readonly constantOverrides?: Readonly<Record<string, number>> },
): Promise<CanonicalComparison[]> {
  const dimsIn = new Map(catalogDims);
  for (const [name, dim] of formulaNameDimensions()) {
    if (!dimsIn.has(name)) dimsIn.set(name, dim);
  }
  const catalogNames = new Set(dimsIn.keys());
  const bindShort = options?.bindShortNames === true;
  const declined = (token: string): boolean => !bindShort && token.length === 1 && catalogNames.has(token);
  // W2: same kebab→underscore rewrite as analyzeUserEquation, so comparison and
  // dimensional check see one formula.
  const eq = await parseUserEquation(equation, catalogNames);
  const resolved = new Map(
    eq.sources.map((s) => [s, declined(s) ? s : (resolveToCatalogName(s, catalogNames) ?? s)]),
  );
  const target = declined(eq.target) ? eq.target : (resolveToCatalogName(eq.target, catalogNames) ?? eq.target);
  const dims: Record<string, Dimension> = {};
  for (const [name, c] of Object.entries(CONSTANTS)) dims[name] = c.dim;
  for (const [s, r] of resolved) {
    dims[s] = declined(s) ? DIMENSIONLESS : (dimsIn.get(r) ?? formulaSymbolDimension(s) ?? DIMENSIONLESS);
  }
  const rhs = eq.text.slice(eq.text.indexOf('=') + 1);
  let compiled: CompiledFormula;
  try {
    await parsePhysics(rhs, dims);
    compiled = (await getFormulaParser()).parse(rhs);
  } catch {
    return [];
  }
  const overrides = options?.constantOverrides;
  const constantValues = Object.fromEntries(
    Object.entries(CONSTANTS).map(([name, c]) => [name, overrideValue(name, c.value, overrides)]),
  );
  // A name the catalog does not know carries no dimension, so it never pairs by dimension.
  const sources = [...resolved.entries()].map(([token, r]) => {
    if (declined(token)) return r;
    const dim = dimsIn.get(r);
    return dim === undefined ? r : { name: r, dim };
  });
  return compareWithCanonical(
    target,
    sources,
    (values) =>
      compiled.evaluate({
        ...constantValues,
        ...Object.fromEntries([...resolved].map(([s, r]) => [s, values[normalize(r)]!])),
      }),
    CANONICAL_EQUATIONS,
    overrides,
  );
}

/**
 * The report lines for a comparison result, shared by `upt map --equation` and
 * `upt derive`. An empty result is itself a line: a dimensional MATCH never
 * checks a prefactor, and the reader must not take silence for a check.
 * @internal
 */
export function describeComparisons(cs: readonly CanonicalComparison[]): string[] {
  return cs.length === 0
    ? ['· no canonical equation has this target and these variables, so the prefactor is NOT checked']
    : cs.map(describeComparison);
}

/** One report line per comparison. @internal */
export function describeComparison(c: CanonicalComparison): string {
  const pairs = [
    ...(c.targetVia === undefined
      ? []
      : [`your target as its ${c.targetVia.its}, the target of ${c.targetVia.bridge}, which it restates`]),
    ...(c.paired === undefined ? [] : [`${c.paired.map(([yours, its]) => `your ${yours} as its ${its}`).join(', ')}, paired by dimension`]),
  ];
  const who = `${c.id} (${c.name}${pairs.length === 0 ? '' : `; ${pairs.join('; ')}`})`;
  const at =
    c.constantsOnly === true
      ? `at the ${c.evaluatedAt ?? 'SI'} constant values (no free variable, so only the value is compared, not the form)`
      : `at ${FIXED_POINT_EXPONENTS.length} fixed points${c.evaluatedAt === undefined ? '' : ` (${c.evaluatedAt})`}`;
  switch (c.kind) {
    case 'agrees':
      return `✓ agrees with ${who}, prefactor included: yours/canonical = 1 ${at}${c.detail ? ` (${c.detail})` : ''}`;
    case 'factor':
      return `⚠ differs from ${who} by a constant factor: yours/canonical = ${c.ratio!.toPrecision(6)} ${at}`;
    case 'form':
      return `⚠ differs in FORM from ${who}: yours/canonical is not constant across ${FIXED_POINT_EXPONENTS.length} fixed points`;
    case 'prefactor-unchecked':
      return `· same form as ${who}, but ${c.detail}, so your prefactor is NOT checked`;
    case 'not-compared':
      return `· ${who} shares your target and variables, but was not compared: ${c.detail}`;
  }
}
