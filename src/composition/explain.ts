/**
 * "Explain this quantity" — the unified entry point over the three
 * bridge-inference primitives (docs/planning/Bridge-Inference-Epistemics-
 * Note.md). Given a target quantity and a set of knowns (names, or
 * name→value), it composes:
 *
 *   1. the identifiability classifier — CAN the graph compute the target
 *      from the knowns, and via how many derivations? Independence is
 *      counted by catalog bridge (`beId`): two routes that restate one bridge
 *      agree by algebra, and the summary says so.
 *   2. the retrodiction harness — when values are supplied, RECOVER the
 *      value via each derivation and (for over-determined targets) check
 *      they agree;
 *   3. the Buckingham-π enumerator — is the known set even DIMENSIONALLY
 *      sufficient to fix the target up to a constant, independent of the
 *      graph's encoded edges?
 *
 * The three answer complementary questions, so the explanation is richer
 * than any one alone: the graph may compute a target whose dimensional
 * closure relies on constants baked into the evaluator (e.g. r_s = 2GM/c²
 * — mass alone is not dimensionally sufficient), and the classifier +
 * Buckingham layer make that explicit together.
 *
 * @module composition/explain
 */

import type { BridgeEdge } from './edge.js';
import type { QuantityIdentification } from './compose.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import type { IdentifiabilityResult } from './identifiability.js';
import { classifyIdentifiability, forwardClosure } from './identifiability.js';
import type { RetrodictionResult } from './retrodiction.js';
import { retrodictNode } from './retrodiction.js';
import type { Dimension } from '../dimensional/types.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';

/**
 * Text form of a recovered quantity: 15 significant digits, the precision an
 * evaluator input is already passed at. JSON keeps the number; this is only
 * the printed form. An integer stays an integer (`1`, not `1.0000e+0`).
 * @internal
 */
export function formatQuantity(value: number): string {
  return String(Number(value.toPrecision(15)));
}
import type { DimensionalDeterminationResult } from '../dimensional/buckingham.js';
import { dimensionallyDetermines } from '../dimensional/buckingham.js';
import { collapseSynonymGovernors } from './aliases.js';
import { formulaShape } from './formula-shape.js';

/** One structural derivation of the target, with the recovered value when
 *  ground-truth values were supplied. @public */
export interface DerivationExplanation {
  readonly edge: string;
  /**
   * The catalog bridge the last edge encodes (`BridgeEdge.beId`), `null` for a
   * law or an uncatalogued edge. Two routes with the same `beId` are one
   * bridge restated, so their agreement is algebra, not a check.
   */
  readonly beId: number | null;
  readonly label: string;
  /** The edge's immediate (last-hop) source quantities. */
  readonly sources: readonly string[];
  /**
   * The LEAF inputs this derivation ultimately depends on — its immediate
   * sources traced back through every intermediate to the known set. The
   * full-chain (leaf-to-target) view, vs `sources` (last-hop). A subset of
   * the known set.
   */
  readonly leafInputs: readonly string[];
  /**
   * The target as a dimensionless-constant-times-monomial in the LEAF
   * inputs, when those leaves dimensionally fix it (Buckingham-π over the
   * full chain). Absent when the leaves rely on dimensionful constants
   * baked into the evaluators (the common case for the bridge graph).
   */
  readonly dimensionalForm?: {
    readonly monomial: Readonly<Record<string, number>>;
    /** e.g. `period ∝ length^1·gravity^-1` (up to a dimensionless constant). */
    readonly formula: string;
  };
  /** Value recovered via this derivation (only when values were given). */
  readonly value?: number;
}

/** Options for {@link explainQuantity}. @public */
export interface ExplainOptions {
  readonly identifications?: readonly QuantityIdentification[];
  /** Consistency tolerance forwarded to the retrodiction harness. */
  readonly tolerance?: number;
  /**
   * Dimensions for known names that are not graph quantities (e.g. raw
   * constants `G`, `c`, `hbar`) — lets the Buckingham layer test a known
   * set richer than the graph's nodes.
   */
  readonly extraDimensions?: Readonly<Record<string, Dimension>>;
}

/** The unified explanation of one quantity. @public */
export interface QuantityExplanation {
  readonly target: string;
  readonly known: readonly string[];
  /** Structural verdict (under/exactly/over-determined or given). */
  readonly identifiability: IdentifiabilityResult;
  /** One entry per independent derivation the classifier found. */
  readonly derivations: readonly DerivationExplanation[];
  /** Retrodiction result, present when ≥2 derivations fired on values. */
  readonly consistency?: RetrodictionResult;
  /** Agreed recovered value (consistent or single), when values supplied. */
  readonly recoveredValue?: number;
  /**
   * Where the numeric factor came from. `unset` is not the same as a
   * missing `recoveredValue`: the inputs were read and the factor has
   * no source. `group` means a bound dimensionless group supplied it.
   */
  readonly coefficient?: 'sourced' | 'group' | 'unset';
  /** Whether the KNOWN set dimensionally fixes the target (Buckingham-π);
   *  absent when the target has no resolvable dimension. */
  readonly dimensional?: DimensionalDeterminationResult;
  /** Upstream gaps for an under-determined target (from the classifier). */
  readonly blockingFrontier: readonly string[];
  /** Plain-language synthesis of the above. */
  readonly summary: string;
}

/**
 * A Buckingham monomial is the encoded formula only when scaling each known
 * input scales the recovered value by that exponent. A monomial such as
 * `n^(-1/3)` or `∝ 1` can share the target's dimension and still not be the
 * formula, because the formula carries constants the monomial did not use.
 * Samples that the domain refuses leave the monomial in place: this check
 * does not invent a second domain.
 */
function encodedMatchesMonomial(
  edges: readonly BridgeEdge[],
  target: string,
  knownNames: readonly string[],
  monomial: Readonly<Record<string, number>>,
  identifications: readonly QuantityIdentification[],
): boolean {
  if (knownNames.length === 0) return true;
  const base: Record<string, number> = {};
  knownNames.forEach((name, i) => {
    base[name] = 1.7 + 0.3 * i;
  });
  const read = (values: Record<string, number>): number | undefined => {
    const retro = retrodictNode(edges, values, target, { identifications });
    const hit = retro.predictions.find((prediction) => Number.isFinite(prediction.value) && prediction.value !== 0);
    return hit?.value;
  };
  const origin = read(base);
  if (origin === undefined) return true;
  for (const name of knownNames) {
    const current = base[name];
    if (current === undefined) return true;
    const next = read({ ...base, [name]: current * 4 });
    if (next === undefined) return true;
    const exponent = monomial[name] ?? 0;
    // A known name the evaluator does not read (G declared beside a law that
    // already bakes G in) does not move the value. That is not a mismatch.
    const unchanged = Math.abs(next - origin) / Math.max(Math.abs(origin), 1e-300) < 1e-9;
    if (unchanged && Math.abs(exponent) > 1e-9) continue;
    const expected = origin * Math.pow(4, exponent);
    const scale = Math.max(Math.abs(expected), Math.abs(next), 1e-300);
    if (Math.abs(next - expected) / scale > 1e-6) return false;
  }
  return true;
}

function buildDimMap(
  edges: readonly BridgeEdge[],
  extra?: Readonly<Record<string, Dimension>>,
): Map<string, Dimension> {
  const m = new Map<string, Dimension>();
  for (const e of edges) {
    for (const s of e.sources) if (!m.has(s.name)) m.set(s.name, s.dim);
    if (!m.has(e.target.name)) m.set(e.target.name, e.target.dim);
  }
  if (extra) for (const [k, v] of Object.entries(extra)) m.set(k, v);
  return m;
}

/**
 * Trace `startSources` back through every intermediate to the leaf inputs
 * — names in `known`, or terminals that no determinable edge produces.
 * Never expands the target (a self-loop would be circular). The union over
 * alternative sub-derivations of an over-determined intermediate.
 */
function traceLeaves(
  edges: readonly BridgeEdge[],
  known: ReadonlySet<string>,
  determinable: ReadonlySet<string>,
  startSources: readonly string[],
  idents: readonly QuantityIdentification[],
  target: string,
): string[] {
  const leaves = new Set<string>();
  const visited = new Set<string>([target]); // never expand the target itself
  const stack = [...startSources];
  while (stack.length) {
    const q = stack.pop()!;
    if (known.has(q)) {
      leaves.add(q);
      continue;
    }
    if (visited.has(q)) continue;
    visited.add(q);
    let expanded = false;
    for (const e of edges) {
      if (e.target.name !== q) continue;
      if (!e.sources.every((s) => determinable.has(s.name))) continue;
      for (const s of e.sources) stack.push(s.name);
      expanded = true;
    }
    if (!expanded) {
      for (const id of idents) {
        if (id.to === q && determinable.has(id.from)) {
          stack.push(id.from);
          expanded = true;
        }
      }
    }
    if (!expanded) leaves.add(q); // a terminal we cannot expand
  }
  return [...leaves].sort();
}

function formatMonomial(m: Readonly<Record<string, number>>): string {
  const parts = Object.entries(m)
    .filter(([, e]) => e !== 0)
    .map(([n, e]) => (e === 1 ? n : `${n}^${e}`));
  return parts.join('·') || '1';
}

function factorsOn(edge: BridgeEdge | undefined): Readonly<Record<string, number>> {
  return edge?.formulaFactors ?? {};
}

function collectFactors(edges: readonly BridgeEdge[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const edge of edges) {
    for (const [name, exp] of Object.entries(factorsOn(edge))) out[name] = exp;
  }
  return out;
}

/**
 * Buckingham cannot see a dimensionless count, so the printed monomial
 * omits it. Put the recorded exponent back for each count the inputs name.
 */
function monomialWithFactors(
  monomial: Readonly<Record<string, number>>,
  factors: Readonly<Record<string, number>>,
  present: ReadonlySet<string>,
): Record<string, number> {
  const merged: Record<string, number> = { ...monomial };
  for (const [name, exp] of Object.entries(factors)) {
    if (present.has(name) && exp !== 0) merged[name] = exp;
  }
  return merged;
}

/** Textbook factors the unit monomial is not. Disclosure, not a formalRef. */
const UNSET_FACTOR: Readonly<Record<string, string>> = {
  'CE-fermi-energy': 'The standard factor (1/2)(3π²)^{2/3} is unset.',
  'CE-fermi-velocity': 'The standard factor (3π²)^{1/3} is unset.',
  'CE-debye-frequency': 'The standard factor (6π²)^{1/3} is unset.',
};

function buildSummary(
  target: string,
  id: IdentifiabilityResult,
  derivations: readonly DerivationExplanation[],
  consistency: RetrodictionResult | undefined,
  recoveredValue: number | undefined,
  dimensional: DimensionalDeterminationResult | undefined,
  knownNames: readonly string[],
  formulaIsSum: boolean,
  encodedMatchesMonomial: boolean,
  unsetSentence: string | undefined,
): string {
  const known = knownNames.length
    ? `{${knownNames.join(', ')}}`
    : '{} (no inputs)';
  const ids = derivations.map((d) => d.edge).join(', ');
  let s: string;

  switch (id.verdict) {
    case 'given':
      s = `'${target}' is a supplied input.`;
      if (derivations.length) {
        s += ` ${derivations.length} graph derivation(s) (${ids}) can cross-check it`;
        s += consistency
          ? consistency.outcome === 'consistent'
            ? `, and they are consistent (relative spread ${consistency.relativeSpread.toExponential(1)}).`
            : ` — and they are INCONSISTENT (relative spread ${consistency.relativeSpread.toExponential(1)}).`
          : '.';
      }
      break;
    case 'under-determined':
      s = `'${target}' is in the graph, but cannot be determined from ${known}: the graph has no derivation path.`;
      if (id.blockingFrontier.length) {
        s += ` Knowing one of {${id.blockingFrontier.join(', ')}} would unblock it.`;
      }
      break;
    case 'exactly-determined':
      s = `'${target}' is determined from ${known} via ${derivations[0]?.edge} (${derivations[0]?.label}).`;
      if (recoveredValue !== undefined) {
        s += ` Recovered value: ${formatQuantity(recoveredValue)}.`;
      }
      break;
    case 'over-determined':
    default: {
      // Independence is counted by BRIDGE, not by edge: be-42 and be-42-via-rs
      // are one bridge written in M and in r_s, and agree by algebra.
      const bridges = [...new Set(derivations.map((d) => (d.beId === null ? d.edge : `BE-${d.beId}`)))];
      const oneBridge = bridges.length === 1 && derivations.length > 1;
      if (bridges.length === derivations.length) {
        s = `'${target}' is over-determined from ${known}: ${derivations.length} independent derivations (${ids}).`;
      } else if (oneBridge) {
        s = `'${target}' is over-determined from ${known}: ${derivations.length} derivation routes (${ids}) restate ONE bridge (${bridges[0]}).`;
      } else {
        s = `'${target}' is over-determined from ${known}: ${derivations.length} derivation routes (${ids}) over ${bridges.length} distinct bridges (${bridges.join(', ')}).`;
      }
      if (consistency) {
        const spread = consistency.relativeSpread.toExponential(1);
        if (consistency.outcome === 'consistent') {
          s += oneBridge
            ? ` They agree (relative spread ${spread}) — agreement by construction, not an independent check.`
            : ` They agree (relative spread ${spread}) — a passing consistency check.`;
        } else {
          s += oneBridge
            ? ` They DISAGREE (relative spread ${spread}) — two forms of one bridge disagree: an encoding error.`
            : ` They DISAGREE (relative spread ${spread}) — a falsification.`;
        }
      } else if (oneBridge) {
        s += ` The routes restate one bridge, so they carry no independent constraint.`;
      } else {
        s += ` The ${id.surplusConstraints} surplus derivation(s) are falsifiable consistency constraints (supply values to check them).`;
      }
      if (recoveredValue !== undefined) {
        s += ` Recovered value: ${formatQuantity(recoveredValue)}.`;
      }
      break;
    }
  }

  if (dimensional?.determined && dimensional.monomial && formulaIsSum) {
    s += ` The encoded formula adds dimensionful terms, so it is not a proportionality.`;
  } else if (dimensional?.determined && dimensional.monomial && !encodedMatchesMonomial) {
    s += ` Dimensionally, those inputs alone do not fix it — the encoded formula carries dimensionful constants.`;
  } else if (dimensional?.determined && dimensional.monomial) {
    s += ` Dimensionally, ${known} fix it up to a dimensionless constant: ${target} ∝ ${formatMonomial(dimensional.monomial)}.`;
    if (unsetSentence !== undefined) s += ` ${unsetSentence}`;
  } else if (dimensional?.outsideGoverningSpan && knownNames.length) {
    s += ` Dimensionally, those inputs alone do not fix it — the encoded formula carries dimensionful constants.`;
  } else if (dimensional && !dimensional.determined && knownNames.length) {
    s += ` Dimensionally, those inputs alone do not fix a unique monomial.`;
  }
  return s;
}

/**
 * Explain a quantity: synthesize the identifiability verdict, the
 * recovered value + consistency (when values are supplied), and the
 * dimensional sufficiency of the known set into one report.
 *
 * `known` may be a list of names (structural + dimensional analysis only)
 * or a `name → value` map (adds value recovery and the over-determined
 * consistency check).
 *
 * @public
 */
export function explainQuantity(
  edges: readonly BridgeEdge[],
  target: string,
  known: readonly string[] | Readonly<Record<string, number>>,
  opts: ExplainOptions = {},
): QuantityExplanation {
  const identifications = opts.identifications ?? QUANTITY_IDENTIFICATIONS;
  const hasValues = !Array.isArray(known);
  const values = hasValues ? (known as Record<string, number>) : null;
  const rawNames = hasValues
    ? Object.keys(values!)
    : [...new Set(known as string[])];
  const sourceNames = new Set<string>();
  for (const e of edges) {
    if (e.target.name !== target) continue;
    for (const s of e.sources) sourceNames.add(s.name);
  }
  // A copied synonym is the same quantity. Buckingham and the printed
  // known set see one name. The value map still carries both spellings
  // so the edge source evaluates.
  const knownNames = collapseSynonymGovernors(rawNames, sourceNames, values);

  const identifiability = classifyIdentifiability(edges, knownNames, target, {
    identifications,
  });

  const byId = new Map(edges.map((e) => [e.id, e] as const));

  let consistency: RetrodictionResult | undefined;
  let recoveredValue: number | undefined;
  const valueByEdge = new Map<string, number>();
  if (values) {
    const references =
      target in values ? { [target]: values[target] } : undefined;
    const retro = retrodictNode(edges, values, target, {
      identifications,
      tolerance: opts.tolerance,
      references,
    });
    for (const p of retro.predictions) valueByEdge.set(p.edge, p.value);
    if (retro.predictions.length >= 2) consistency = retro;
    if (
      (retro.outcome === 'consistent' || retro.outcome === 'single') &&
      retro.predictions.length > 0
    ) {
      recoveredValue =
        retro.predictions.reduce((a, p) => a + p.value, 0) /
        retro.predictions.length;
    }
  }

  const dimMap = buildDimMap(edges, opts.extraDimensions);
  const knownSet = new Set(knownNames);
  const determinable = forwardClosure(edges, knownNames, identifications);

  const derivations: DerivationExplanation[] = identifiability.derivations.map(
    (eid) => {
      const e = byId.get(eid);
      const sources = e ? e.sources.map((s) => s.name) : [];
      // Full-chain: trace the immediate sources back to the leaf inputs.
      const leafInputs = e
        ? traceLeaves(
            edges,
            knownSet,
            determinable,
            sources,
            identifications,
            target,
          )
        : [];
      // Dimensional form in terms of those leaves, when they fix the target.
      let dimensionalForm: DerivationExplanation['dimensionalForm'];
      const targetDimForChain = dimMap.get(target);
      if (targetDimForChain && leafInputs.length) {
        const factors = factorsOn(e);
        const governing = leafInputs
          .filter((n) => n !== target && dimMap.has(n) && factors[n] === undefined)
          .map((n) => ({ name: n, dim: dimMap.get(n)! }));
        const det = dimensionallyDetermines(
          { name: target, dim: targetDimForChain },
          governing,
        );
        const symbolic = e?.symbolic;
        const sum = symbolic !== undefined && formulaShape(symbolic) === 'dimensional-sum';
        const leaves = leafInputs.filter((name) => name !== target);
        const missingCount = Object.keys(factors).some((name) => !leaves.includes(name));
        const merged =
          det.determined && det.monomial !== undefined
            ? monomialWithFactors(det.monomial, factors, new Set(leaves))
            : undefined;
        const agrees =
          merged !== undefined &&
          encodedMatchesMonomial(edges, target, leaves, merged, identifications);
        if (!sum && !missingCount && merged !== undefined && agrees) {
          dimensionalForm = {
            monomial: merged,
            formula: `${target} ∝ ${formatMonomial(merged)}`,
          };
        }
      }
      return {
        edge: eid,
        beId: e?.beId ?? null,
        label: e?.label ?? eid,
        sources,
        leafInputs,
        ...(dimensionalForm ? { dimensionalForm } : {}),
        ...(valueByEdge.has(eid) ? { value: valueByEdge.get(eid) } : {}),
      };
    },
  );

  // Dimensional sufficiency of the KNOWN set, independent of the graph.
  // A dimensionless count is stripped before Buckingham (it is a π-group and
  // would make the monomial non-unique) and written back into the monomial
  // the summary prints. An edge whose other sources are known, but whose
  // count is not, does not get to claim the count-free monomial.
  const firedEdges = identifiability.derivations
    .map((id) => byId.get(id))
    .filter((edge): edge is BridgeEdge => edge !== undefined);
  const firedFactors = collectFactors(firedEdges);
  const boundGroupExponents: Record<string, number> = {};
  if (values) {
    for (const edge of firedEdges) {
      const group = CANONICAL_GROUP_PREFACTORS.find((p) => p.id === edge.id);
      if (group !== undefined && Number.isFinite(values[group.group])) {
        boundGroupExponents[group.group] = group.exponent;
      }
    }
  }
  const blockedByCount = edges.filter((edge) => {
    if (edge.target.name !== target) return false;
    const factors = factorsOn(edge);
    const names = Object.keys(factors);
    if (names.length === 0 || names.every((name) => knownSet.has(name))) return false;
    return edge.sources
      .filter((source) => factors[source.name] === undefined)
      .every((source) => knownSet.has(source.name) || determinable.has(source.name));
  });
  let dimensional: DimensionalDeterminationResult | undefined;
  const targetDim = dimMap.get(target);
  if (targetDim) {
    const strip = new Set<string>([
      ...Object.keys(firedFactors),
      ...blockedByCount.flatMap((edge) => Object.keys(factorsOn(edge))),
    ]);
    const governing = knownNames
      .filter((n) => n !== target && dimMap.has(n) && !strip.has(n))
      .map((n) => ({ name: n, dim: dimMap.get(n)! }));
    const det = dimensionallyDetermines({ name: target, dim: targetDim }, governing);
    const hideCountFree = blockedByCount.length > 0 && firedEdges.length === 0;
    if (hideCountFree) {
      dimensional = {
        ...det,
        determined: false,
        monomial: undefined,
        reason: 'a dimensionless count in the formula is not among the inputs',
      };
    } else if (det.determined && det.monomial !== undefined) {
      dimensional = {
        ...det,
        monomial: monomialWithFactors(
          det.monomial,
          { ...firedFactors, ...boundGroupExponents },
          knownSet,
        ),
      };
    } else {
      dimensional = det;
    }
  }

  const formulaIsSum = identifiability.derivations.some((eid) => {
    const symbolic = byId.get(eid)?.symbolic;
    return symbolic !== undefined && formulaShape(symbolic) === 'dimensional-sum';
  });
  const encodedAgrees =
    dimensional?.determined === true && dimensional.monomial !== undefined
      ? encodedMatchesMonomial(edges, target, knownNames, dimensional.monomial, identifications)
      : true;

  const unsetEdge = derivations
    .map((d) => byId.get(d.edge))
    .find((e) => e?.coefficientUnset === true);
  const groupBound =
    unsetEdge !== undefined &&
    CANONICAL_GROUP_PREFACTORS.some(
      (p) => p.id === unsetEdge.id && values !== null && Number.isFinite(values[p.group]),
    );
  const unsetSentence =
    unsetEdge === undefined || groupBound
      ? undefined
      : 'The factor is unset.' +
        (UNSET_FACTOR[unsetEdge.id] !== undefined ? ` ${UNSET_FACTOR[unsetEdge.id]}` : '');

  const coefficient: QuantityExplanation['coefficient'] =
    unsetEdge !== undefined && !groupBound
      ? 'unset'
      : groupBound
        ? 'group'
        : recoveredValue !== undefined
          ? 'sourced'
          : undefined;

  const summary = buildSummary(
    target,
    identifiability,
    derivations,
    consistency,
    recoveredValue,
    dimensional,
    knownNames,
    formulaIsSum,
    encodedAgrees,
    unsetSentence,
  );

  return {
    target,
    known: knownNames,
    identifiability,
    derivations,
    ...(consistency ? { consistency } : {}),
    ...(recoveredValue !== undefined ? { recoveredValue } : {}),
    ...(coefficient !== undefined ? { coefficient } : {}),
    ...(dimensional ? { dimensional } : {}),
    blockingFrontier: identifiability.blockingFrontier,
    summary,
  };
}
