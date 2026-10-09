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

import type { BridgeEdge } from './edge.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';
import { CoefficientUnsetError, evaluateEdge } from './edge.js';
import { DomainViolationError } from '../bridges/evaluation-errors.js';
import type { QuantityIdentification } from './compose.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import { conventionFactor } from '../dimensional/unit-convention.js';
import { classifyAll } from './identifiability.js';

/**
 * Source values, plus a dimensionless group the edge multiplies when the
 * ground truth names it. The group is not a source: Buckingham cannot see
 * it, and a missing group is the unset coefficient, not a missing input.
 */
function evaluationInputs(edge: BridgeEdge, values: ReadonlyMap<string, number>): Record<string, number> {
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

/** One derivation's recovered value for a masked node. @public */
export interface RetrodictionPrediction {
  /** The edge id that produced this value. */
  readonly edge: string;
  readonly value: number;
}

/** Options for the harness. @public */
export interface RetrodictionOptions {
  /** Identifications honored in forward evaluation (default registered). */
  readonly identifications?: readonly QuantityIdentification[];
  /** Relative-spread tolerance for `consistent` (default 1e-6). */
  readonly tolerance?: number;
  /** External (textbook) values to score recovered nodes against. */
  readonly references?: Readonly<Record<string, number>>;
  /** Relative-error tolerance for reference scoring (default 1e-3). */
  readonly referenceTolerance?: number;
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
   * Derivations that refused the inputs as outside their validity domain.
   * A refusal is not an unset coefficient and not a missing input.
   */
  readonly refusals?: readonly { readonly edge: string; readonly reason: string }[];
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
        // A domain miss or an unset coefficient is "the edge does not fire".
        // Anything else (a sign rejection, an alias conflict, a TypeError in an
        // evaluator) is a different fact and is not hidden as a non-derivation
        // (9.0.0 audit §4 C6).
        if (!(err instanceof DomainViolationError || err instanceof CoefficientUnsetError)) throw err;
        continue;
      }
      if (Number.isFinite(v)) {
        values.set(e.target.name, v);
        changed = true;
      }
    }
  }
  return values;
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
  const values = forwardEvaluate(edgesMinusIntoTarget, groundTruth, idents);

  const predictions: RetrodictionPrediction[] = [];
  const refusals: { edge: string; reason: string }[] = [];
  for (const e of edges) {
    if (e.target.name !== target) continue;
    if (!e.sources.every((s) => values.has(s.name))) continue;
    const inputs = evaluationInputs(e, values);
    let v: number;
    try {
      v = evaluateEdge(e, inputs);
    } catch (err) {
      // A domain miss or an unset coefficient is a recorded refusal of this
      // edge. A sign rejection is the answer for this target, and any other
      // error (an alias conflict, a TypeError in an evaluator) is a different
      // fact: both propagate instead of reading as "unrecoverable" (§4 C6).
      if (err instanceof DomainViolationError || err instanceof CoefficientUnsetError) {
        refusals.push({ edge: e.id, reason: err.message });
        continue;
      }
      throw err;
    }
    if (Number.isFinite(v)) predictions.push({ edge: e.id, value: v });
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
    const mean =
      predictions.reduce((a, p) => a + p.value, 0) / predictions.length;
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
