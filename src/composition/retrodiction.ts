/**
 * Retrodiction harness (Consequence 2 of
 * docs/planning/Bridge-Inference-Epistemics-Note.md, designed in
 * docs/planning/Retrodiction-Harness-Design-Note.md).
 *
 * The framework's own falsification benchmark. Mask a quantity the graph
 * can compute, recompute it from ground-truth inputs via EACH independent
 * derivation, and check the predictions agree. This operationalizes the
 * identifiability classifier's OVER-DETERMINED verdict: the surplus
 * derivations of an over-determined node are PREDICTED to be consistency
 * constraints; the harness evaluates them and checks that numerically.
 *
 *   - consistent    — ≥2 derivations agree within tolerance.
 *   - inconsistent  — ≥2 derivations DISAGREE (a falsification: two
 *                     encodings of one quantity-name are not the same
 *                     physics).
 *   - single        — exactly one derivation fired (recovered, no check).
 *   - unrecoverable — no derivation fired from the ground truth.
 *
 * "Mask" = compute source values over the graph with every edge INTO the
 * target removed (the classifier's target-removed closure — so the node
 * is genuinely hidden, never read back through its own derivation).
 * Forward evaluation honors `QUANTITY_IDENTIFICATIONS` and is
 * domain-checked (an edge that refuses its domain contributes no
 * prediction). The consistency check needs no external truth and is the
 * re-runnable core; an optional `references` map adds external-value
 * scoring. Pass bar pre-registered in the design note (spread ≤ 1e-6).
 *
 * @module composition/retrodiction
 */

import type { BridgeEdge, EdgeConfidence } from './edge.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';
import { CoefficientUnsetError, evaluateEdge } from './edge.js';
import { DomainViolationError } from '../bridges/evaluation-errors.js';
import { CarrierSignError } from '../bridges/carrier-sign.js';
import { FormulaError } from '../numerical/formula-contract.js';
import { meanOf } from '../numerical/statistics.js';
import type { QuantityIdentification } from './compose.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import { conventionFactor } from '../dimensional/unit-convention.js';
import { classifyAll, forwardClosure } from './identifiability.js';

/**
 * Source values, plus a dimensionless group the edge multiplies when the
 * ground truth names it. The group is not a source: Buckingham cannot see
 * it, and a missing group is the unset coefficient, not a missing input.
 * Exported for the own-equation magnitudes (`own-equation-magnitude.ts`),
 * which evaluate an edge the same way.
 * @internal
 */
export function evaluationInputs(edge: BridgeEdge, values: ReadonlyMap<string, number>): Record<string, number> {
  const inputs: Record<string, number> = {};
  for (const s of edge.sources) inputs[s.name] = values.get(s.name)!;
  const group = CANONICAL_GROUP_PREFACTORS.find((g) => g.id === edge.id);
  if (group !== undefined) {
    const g = values.get(group.group);
    if (g !== undefined) inputs[group.group] = g;
  }
  return inputs;
}

/** Outcome of retrodicting one node. @public */
export type RetrodictionOutcome =
  | 'consistent'
  | 'inconsistent'
  | 'single'
  | 'unrecoverable';

/** One operation that supplied a recovered value, in dependency order. @public */
export type RecoveryStep =
  | { readonly kind: 'edge'; readonly id: string; readonly target: string; readonly inputs: readonly string[]; readonly confidence: EdgeConfidence }
  | { readonly kind: 'identification'; readonly from: string; readonly to: string; readonly rationale: string; readonly confidence: EdgeConfidence };

/** Collect the executed producers by following each edge's actual numeric inputs. */
function recoveryRoute(last: RecoveryStep, producers: ReadonlyMap<string, RecoveryStep>): RecoveryStep[] {
  const steps: RecoveryStep[] = [];
  const seen = new Set<RecoveryStep>();
  const visit = (step: RecoveryStep): void => {
    if (seen.has(step)) return;
    seen.add(step);
    const inputs = step.kind === 'edge' ? step.inputs : [step.from];
    for (const input of inputs) {
      const producer = producers.get(input);
      if (producer !== undefined) visit(producer);
    }
    steps.push(step);
  };
  visit(last);
  return steps;
}

function edgeStep(edge: BridgeEdge, inputs: Record<string, number>): RecoveryStep {
  return { kind: 'edge', id: edge.id, target: edge.target.name, inputs: Object.keys(inputs), confidence: edge.confidence };
}

/** One derivation's recovered value for a masked node. @public */
export interface RetrodictionPrediction {
  /** The edge id that produced this value. */
  readonly edge: string;
  readonly value: number;
  readonly route?: readonly RecoveryStep[];
}

/** Options for the harness. @public */
export interface RetrodictionOptions {
  /** Identifications honored in forward evaluation (default registered). */
  readonly identifications?: readonly QuantityIdentification[];
  /** Include the evaluated edge and identification provenance for each prediction. */
  readonly includeRoutes?: boolean;
  /** Relative-spread tolerance for `consistent` (default 1e-6). */
  readonly tolerance?: number;
  /** External (textbook) values to score recovered nodes against. */
  readonly references?: Readonly<Record<string, number>>;
  /** Relative-error tolerance for reference scoring (default 1e-3). */
  readonly referenceTolerance?: number;
}

/** One refused edge in a retrodiction, with the kind of refusal. @public */
export interface RetrodictionRefusal {
  readonly edge: string;
  /**
   * `domain`: the validity domain rejected the point. `coefficient-unset`: the edge has no
   * sourced prefactor, whatever the values. `carrier-sign`: the carrier charge and the
   * mobility had opposite signs. `formula`: the relation's formula did not evaluate at the
   * point (a 0/0, say). Four facts, kept apart (AGENTS law 4).
   */
  readonly kind: 'domain' | 'coefficient-unset' | 'carrier-sign' | 'formula';
  readonly reason: string;
}

/** The result of retrodicting one node. @public */
export interface RetrodictionResult {
  readonly target: string;
  readonly outcome: RetrodictionOutcome;
  /** Recovered values, one per derivation that fired. */
  readonly predictions: readonly RetrodictionPrediction[];
  /** (max − min)/|mean| across predictions; 0 when fewer than two. */
  readonly relativeSpread: number;
  readonly tolerance: number;
  /**
   * Edges that refused the supplied values. `kind` keeps the refusals apart (AGENTS law 4):
   * `domain`, `carrier-sign` and `formula` are the point (the edge does not fire there);
   * `coefficient-unset` is the edge's own state (no sourced prefactor), whatever the values.
   */
  readonly refusals?: readonly RetrodictionRefusal[];
  /** `outcome !== 'inconsistent'` — the falsification gate. */
  readonly pass: boolean;
  /** Supplied external value, when scored. */
  readonly referenceValue?: number;
  /** |mean(predictions) − reference| / |reference|, when scored. */
  readonly referenceRelError?: number;
  readonly referencePass?: boolean;
}

/** Aggregate report across the swept nodes. @public */
export interface RetrodictionReport {
  readonly results: readonly RetrodictionResult[];
  /** Nodes with ≥2 derivations (consistent + inconsistent). */
  readonly checked: number;
  readonly consistent: number;
  readonly inconsistent: number;
  /** The headline gate: no inconsistent node was found. */
  readonly allConsistent: boolean;
}

/** The refusal an evaluator error is, or `undefined` when it is not a refusal at all. */
function refusalKind(err: unknown): RetrodictionRefusal['kind'] | undefined {
  if (err instanceof DomainViolationError) return 'domain';
  if (err instanceof CoefficientUnsetError) return 'coefficient-unset';
  if (err instanceof CarrierSignError) return 'carrier-sign';
  if (err instanceof FormulaError) return 'formula';
  return undefined;
}

/**
 * True when the error says the edge does not fire here (or at all, for an unset coefficient).
 * Exported so the own-equation magnitudes read an edge's refusal by this one rule.
 * @internal
 */
export function refusesThePoint(err: unknown): boolean {
  return refusalKind(err) !== undefined;
}

/**
 * Monotone forward EVALUATION: propagate values from `groundTruth` through
 * the graph (domain-checked; identifications supply identified names;
 * non-finite or domain-refused edges do not fire). Each node is assigned
 * the value of the first edge that fires for it.
 *
 * Exported `@internal` so the discovery magnitude-gate can read a quantity's
 * value AT THE REGISTERED ANCHOR when the static representative-value table
 * has no entry for it (graph-derived quantities like `schwarzschild-radius`).
 *
 * @internal
 */
export function forwardEvaluate(
  edges: readonly BridgeEdge[],
  groundTruth: Readonly<Record<string, number>>,
  idents: readonly QuantityIdentification[],
  producers?: Map<string, RecoveryStep>,
  refusedEdges?: Map<string, RetrodictionRefusal>,
): Map<string, number> {
  // Finite-seed guard (matches the computed-value guard below and the
  // library-wide finiteness discipline): a NaN/∞ seed would propagate silently
  // through the graph and spoof downstream magnitude/consistency checks.
  for (const [name, v] of Object.entries(groundTruth)) {
    if (!Number.isFinite(v)) {
      throw new TypeError(
        `forwardEvaluate: ground-truth seed '${name}' must be a finite number, got ${v}.`,
      );
    }
  }
  const values = new Map<string, number>(Object.entries(groundTruth));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of idents) {
      const fromVal = values.get(id.from);
      if (fromVal !== undefined && !values.has(id.to)) {
        const converted = fromVal * conventionFactor(id.from, id.to);
        if (Number.isFinite(converted)) {
          values.set(id.to, converted);
          producers?.set(id.to, {
            kind: 'identification', from: id.from, to: id.to, rationale: id.rationale,
            confidence: id.confidence ?? 'speculative',
          });
          changed = true;
        }
      }
    }
    for (const e of edges) {
      if (values.has(e.target.name)) continue;
      if (!e.sources.every((s) => values.has(s.name))) continue;
      const inputs = evaluationInputs(e, values);
      let v: number;
      try {
        v = evaluateEdge(e, inputs);
      } catch (err) {
        // The edge refusing this point (a domain miss, opposite carrier signs, a formula
        // that has no finite value there) or an unset coefficient is "the edge does not
        // fire". Anything else (an alias conflict, a TypeError in an evaluator) is a
        // different fact and is not hidden as a non-derivation (9.0.0 audit §4 C6).
        const kind = refusalKind(err);
        if (kind === undefined) throw err;
        refusedEdges?.set(e.id, { edge: e.id, kind, reason: (err as Error).message });
        continue;
      }
      if (Number.isFinite(v)) {
        values.set(e.target.name, v);
        producers?.set(e.target.name, edgeStep(e, inputs));
        changed = true;
      }
    }
  }
  return values;
}

/** Find recorded refusals on structurally reachable routes blocked by missing values. */
function upstreamRefusals(
  edges: readonly BridgeEdge[],
  idents: readonly QuantityIdentification[],
  seeds: readonly string[],
  values: ReadonlyMap<string, number>,
  target: string,
  refusedEdges: ReadonlyMap<string, RetrodictionRefusal>,
): RetrodictionRefusal[] {
  const reachable = forwardClosure(
    edges.filter((edge) => edge.target.name !== target), seeds,
    idents.filter((id) => id.to !== target),
  );
  const visited = new Set<string>();
  const refusals = new Map<string, RetrodictionRefusal>();
  const visit = (name: string): void => {
    if (values.has(name) || visited.has(name)) return;
    visited.add(name);
    for (const edge of edges) {
      if (edge.target.name !== name || !edge.sources.every((source) => reachable.has(source.name))) continue;
      const refusal = refusedEdges.get(edge.id);
      if (refusal !== undefined) refusals.set(edge.id, refusal);
      else for (const source of edge.sources) visit(source.name);
    }
    for (const id of idents) {
      if (id.to === name && reachable.has(id.from)) visit(id.from);
    }
  };
  visit(target);
  return [...refusals.values()];
}

/**
 * Retrodict one node: mask it (source values from the target-removed
 * graph), recover it via each incoming edge, and score the spread.
 *
 * @public
 */
export function retrodictNode(
  edges: readonly BridgeEdge[],
  groundTruth: Readonly<Record<string, number>>,
  target: string,
  opts: RetrodictionOptions = {},
): RetrodictionResult {
  const idents = opts.identifications ?? QUANTITY_IDENTIFICATIONS;
  const tolerance = opts.tolerance ?? 1e-6;

  // Masked source values: never let the target be assigned (so no
  // derivation reads it back — circular self-support excluded).
  const edgesMinusIntoTarget = edges.filter((e) => e.target.name !== target);
  const producers = opts.includeRoutes === true ? new Map<string, RecoveryStep>() : undefined;
  const seeds = Object.fromEntries(Object.entries(groundTruth).filter(([name]) => name !== target));
  const refusedEdges = new Map<string, RetrodictionRefusal>();
  const values = forwardEvaluate(edgesMinusIntoTarget, seeds, idents.filter((id) => id.to !== target), producers, refusedEdges);

  const predictions: RetrodictionPrediction[] = [];
  const refusals: RetrodictionRefusal[] = [];
  for (const e of edges) {
    if (e.target.name !== target) continue;
    if (!e.sources.every((s) => values.has(s.name))) continue;
    const inputs = evaluationInputs(e, values);
    let v: number;
    try {
      v = evaluateEdge(e, inputs);
    } catch (err) {
      // A refusal of the point or an unset coefficient is a recorded refusal of
      // this edge, under its own kind. Any other error (an alias conflict, a
      // TypeError in an evaluator) is a different fact and propagates instead of
      // reading as "unrecoverable" (§4 C6).
      const kind = refusalKind(err);
      if (kind === undefined) throw err;
      refusals.push({ edge: e.id, kind, reason: (err as Error).message });
      continue;
    }
    if (Number.isFinite(v)) {
      const route = producers === undefined ? undefined : recoveryRoute(edgeStep(e, inputs), producers);
      predictions.push({ edge: e.id, value: v, ...(route === undefined ? {} : { route }) });
    }
  }

  // An identification into the masked node is a candidate prediction. It
  // never seeds a path that reads the target back into its own reconstruction.
  for (const id of idents) {
    if (id.to !== target) continue;
    const fromValue = values.get(id.from);
    if (fromValue === undefined) continue;
    const value = fromValue * conventionFactor(id.from, id.to);
    if (!Number.isFinite(value)) continue;
    const step: RecoveryStep = {
      kind: 'identification', from: id.from, to: id.to, rationale: id.rationale,
      confidence: id.confidence ?? 'speculative',
    };
    const route = producers === undefined ? undefined : recoveryRoute(step, producers);
    predictions.push({
      edge: `identify:${id.from}:${id.to}`,
      value,
      ...(route === undefined ? {} : { route }),
    });
  }

  if (predictions.length === 0 && refusedEdges.size > 0) {
    refusals.push(...upstreamRefusals(edges, idents, Object.keys(seeds), values, target, refusedEdges));
  }

  let relativeSpread = 0;
  if (predictions.length >= 2) {
    const vals = predictions.map((p) => p.value);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    // Normalize the (max − min) span by the largest MAGNITUDE, not the mean:
    // opposite-sign predictions (e.g. +6 and −6) cancel in the mean → a ~0
    // denominator → spurious Infinity, even though the true relative spread is
    // finite (12/6 = 2). `maxAbs === 0` only when every value is 0 (max = min),
    // so the span is 0 too.
    const maxAbs = Math.max(...vals.map(Math.abs));
    relativeSpread = maxAbs > 0 ? (max - min) / maxAbs : 0;
  }

  let outcome: RetrodictionOutcome;
  if (predictions.length === 0) outcome = 'unrecoverable';
  else if (predictions.length === 1) outcome = 'single';
  else outcome = relativeSpread <= tolerance ? 'consistent' : 'inconsistent';

  const result: RetrodictionResult = {
    target,
    outcome,
    predictions,
    relativeSpread,
    tolerance,
    ...(refusals.length > 0 ? { refusals } : {}),
    pass: outcome !== 'inconsistent',
  };

  const ref = opts.references?.[target];
  if (ref !== undefined && predictions.length >= 1) {
    const mean = meanOf(predictions.map((p) => p.value));
    const referenceRelError = Math.abs(mean - ref) / (Math.abs(ref) || 1);
    return {
      ...result,
      referenceValue: ref,
      referenceRelError,
      referencePass: referenceRelError <= (opts.referenceTolerance ?? 1e-3),
    };
  }

  return result;
}

/**
 * Sweep the graph: retrodict every over-determined node (the classifier
 * is the feeder), plus any node with a supplied reference value. Returns
 * the per-node results and the headline `allConsistent` gate.
 *
 * @public
 */
export function retrodict(
  edges: readonly BridgeEdge[],
  groundTruth: Readonly<Record<string, number>>,
  opts: RetrodictionOptions = {},
): RetrodictionReport {
  const idents = opts.identifications ?? QUANTITY_IDENTIFICATIONS;
  const known = Object.keys(groundTruth);
  const classified = classifyAll(edges, known, { identifications: idents });

  const overDetermined = classified
    .filter((r) => r.verdict === 'over-determined')
    .map((r) => r.target);
  const refTargets = opts.references ? Object.keys(opts.references) : [];
  const targets = [...new Set([...overDetermined, ...refTargets])].sort();

  const results = targets.map((t) =>
    retrodictNode(edges, groundTruth, t, opts),
  );

  const consistent = results.filter((r) => r.outcome === 'consistent').length;
  const inconsistent = results.filter(
    (r) => r.outcome === 'inconsistent',
  ).length;

  return {
    results,
    checked: consistent + inconsistent,
    consistent,
    inconsistent,
    allConsistent: inconsistent === 0,
  };
}
