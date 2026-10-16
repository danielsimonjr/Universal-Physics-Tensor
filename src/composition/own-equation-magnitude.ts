/**
 * A magnitude for a quantity from its own equation, for the discovery magnitude gate.
 *
 * The gate (`discovery.ts`, `magnitudeGate`) reads a quantity's magnitude from the sourced
 * representative-value table, else from the value the graph fixes with no anchor input (the
 * target of a source-less equation), else from the anchor. A quantity none of those reach (the
 * Hubble distance, c/H0, whose input the table states but the anchor does not reach) made the gate
 * abstain. This module evaluates such a quantity from an edge into it whose every source is
 * valued: a table value, a registered constant, a no-anchor constant, or a value this module
 * already derived, iterated to a fixed point. It is seeded from the table and the constants only,
 * never from the anchor, so a derived magnitude is not anchor-derived.
 *
 * Three guards, each a refusal the caller sees (`DerivedMagnitudes.refusals`):
 *   - precision: a derived value carries σ in decades of log10|value|, propagated from its inputs
 *     through the edge's log-elasticities, σ = √(Σ (∂log f/∂log xᵢ)² σᵢ²) (σᵢ is the table row's
 *     σ, 0 for a constant, the derived σ for a derived input). The gate uses a value only when σ is
 *     at most {@link DEFAULT_SIGMA_DECADES}, the table's own "good to about one order". The FRET
 *     efficiency from two 5 nm order-of-magnitude scales is exactly 0.5 and carries 3√2 decades: a
 *     number with no magnitude information, which this guard refuses.
 *   - agreement: two edges that derive one quantity and differ by more than a relative
 *     {@link DERIVED_AGREEMENT} give it no value; no edge wins by its place in the list.
 *   - the edge's own evaluation (`evaluateEdge`): a domain refusal, an unset coefficient or a
 *     non-finite or zero result gives no value.
 *
 * Seeds are SI (the table's unit) and are converted into each quantity's evaluator convention
 * (`conventionScaleToSI`; `planck-mass-energy` and `vacuum-expectation-value` speak GeV), and every
 * result is converted back to SI.
 *
 * INTERNAL — read by `discovery.ts`; surfaced through `upt discover` and `upt ground`.
 *
 * @module composition/own-equation-magnitude
 */

import type { BridgeEdge } from './edge.js';
import { evaluateEdge } from './edge.js';
import type { QuantityIdentification } from './compose.js';
import { evaluationInputs, refusesThePoint } from './retrodiction.js';
import { DEFAULT_SIGMA_DECADES, sigmaDecadesOf } from './representative-values.js';
import type { RepresentativeValue } from './representative-values.js';
import { conventionFactor, conventionScaleToSI } from '../dimensional/unit-convention.js';
import { CONSTANT_REGISTRY } from '../dimensional/symbolic-constants.js';
import { centralPartial } from '../numerical/finite-difference.js';
import { byKey, compareCodepoint } from '../core/compare.js';

/**
 * Relative difference above which two edges deriving one quantity disagree. Two encodings of one
 * equation agree to rounding; a factor that differs (2 against 1) is far above it.
 * @internal
 */
export const DERIVED_AGREEMENT = 1e-9;

/**
 * The half-step, in decades of an input, of the central difference that measures a
 * log-elasticity. A power law's elasticity is exact at any step; for another form the truncation
 * error is of order the step squared.
 */
const ELASTICITY_STEP_DECADES = 1e-3;

/**
 * Decades by which a propagated σ may exceed the guard and still pass: room for the central
 * difference's rounding, so a power law of elasticity 1 on a one-decade input is not refused for a
 * last-bit excess (the Hubble distance's σ measures exactly 1). Far below any σ the guard refuses.
 */
const SIGMA_GUARD_SLACK = 1e-9;

/** A magnitude derived from a quantity's own equation. @internal */
export interface DerivedMagnitude {
  /** The value in SI (the table's unit), converted back from the evaluator's convention. */
  readonly value: number;
  /** σ in decades of log10|value|, propagated through the edge's log-elasticities. */
  readonly sigmaDecades: number;
  /** The edge that produced it (`identification:<from>` for a registered identification's copy). */
  readonly edge: string;
  /** The names the edge read, sorted. */
  readonly inputs: readonly string[];
}

/** Why a quantity reached by an equation has no derived magnitude. @internal */
export interface DerivedMagnitudeRefusal {
  readonly name: string;
  /**
   * `imprecise`: the propagated σ is above the guard. `disagreeing-edges`: two edges that derive it
   * differ by more than {@link DERIVED_AGREEMENT}. `precision-unknown`: the edge fired at the point
   * but not at the points the elasticity reads, so σ could not be measured.
   */
  readonly reason: 'imprecise' | 'disagreeing-edges' | 'precision-unknown';
  /** The edges involved, sorted. */
  readonly edges: readonly string[];
  /** The propagated σ, for `imprecise`. */
  readonly sigmaDecades?: number;
  /** One sentence for a reader. */
  readonly detail: string;
}

/** The magnitudes the graph derives from the table and the constants, and the refusals. @internal */
export interface DerivedMagnitudes {
  /** Derived magnitudes the gate may use (σ within the guard), by quantity name. */
  readonly values: ReadonlyMap<string, DerivedMagnitude>;
  /** Every quantity an equation reached that has no usable derived magnitude, sorted by name. */
  readonly refusals: readonly DerivedMagnitudeRefusal[];
}

/** A known value in the evaluator's convention, with its σ in decades. */
interface Known {
  readonly value: number;
  readonly sigmaDecades: number;
}

/** One edge (or identification) that fired for a target. */
interface Firing {
  readonly edge: string;
  readonly value: number;
  /** Undefined when the elasticity could not be measured. */
  readonly sigmaDecades: number | undefined;
  readonly inputs: readonly string[];
}

/** What the caller supplies: the sourced table and the no-anchor constants. @internal */
export interface OwnEquationSeeds {
  /** The sourced representative values, in SI. */
  readonly representativeValues: Readonly<Record<string, RepresentativeValue>>;
  /** The values the graph fixes with no anchor input, in the evaluator's convention (`forwardEvaluate(edges, {}, …)`). */
  readonly constantValues: ReadonlyMap<string, number>;
  /** Identifications honoured as copies, as `forwardEvaluate` honours them. */
  readonly identifications: readonly QuantityIdentification[];
}

/** The seeds: the table (SI → evaluator unit), then a registered constant that is a graph quantity, then a no-anchor constant. */
function seedsOf(edges: readonly BridgeEdge[], seeds: OwnEquationSeeds): Map<string, Known> {
  const known = new Map<string, Known>();
  for (const [name, rv] of Object.entries(seeds.representativeValues)) {
    if (!(Number.isFinite(rv.value) && rv.value !== 0)) continue;
    known.set(name, { value: rv.value / conventionScaleToSI(name), sigmaDecades: sigmaDecadesOf(rv) });
  }
  const names = new Set(edges.flatMap((e) => [e.target.name, ...e.sources.map((s) => s.name)]));
  for (const record of CONSTANT_REGISTRY) {
    const name = record.quantity;
    if (name === undefined || !names.has(name) || known.has(name)) continue;
    known.set(name, { value: record.value / conventionScaleToSI(name), sigmaDecades: 0 });
  }
  for (const [name, value] of seeds.constantValues) {
    if (known.has(name) || !(Number.isFinite(value) && value !== 0)) continue;
    known.set(name, { value, sigmaDecades: 0 });
  }
  return known;
}

/** log10|f| as a function of log10|x_key|, the other inputs held. NaN when the edge refuses. */
function logResponse(edge: BridgeEdge, inputs: Readonly<Record<string, number>>, key: string): (point: Record<string, number>) => number {
  const sign = Math.sign(inputs[key]!);
  return (point) => {
    try {
      return Math.log10(Math.abs(evaluateEdge(edge, { ...inputs, [key]: sign * 10 ** point['u']! })));
    } catch (err) {
      if (!refusesThePoint(err)) throw err;
      return Number.NaN;
    }
  };
}

/** σ of an edge's value from its inputs' σ, through the log-elasticities; undefined when one is not finite. */
function propagatedSigma(edge: BridgeEdge, inputs: Readonly<Record<string, number>>, known: ReadonlyMap<string, Known>): number | undefined {
  let sum = 0;
  for (const key of Object.keys(inputs).sort(compareCodepoint)) {
    const sigma = known.get(key)?.sigmaDecades ?? 0;
    if (sigma === 0) continue;
    const x = inputs[key]!;
    if (!(Number.isFinite(x) && x !== 0)) return undefined;
    const elasticity = centralPartial(logResponse(edge, inputs, key), { u: Math.log10(Math.abs(x)) }, 'u', ELASTICITY_STEP_DECADES);
    if (!Number.isFinite(elasticity)) return undefined;
    sum += elasticity * elasticity * sigma * sigma;
  }
  return Math.sqrt(sum);
}

/** Every edge and identification that fires for an unvalued, unblocked target, from `known` as it stands. */
function firings(
  edges: readonly BridgeEdge[],
  idents: readonly QuantityIdentification[],
  known: ReadonlyMap<string, Known>,
  skip: (name: string) => boolean,
): Map<string, Firing[]> {
  const out = new Map<string, Firing[]>();
  const push = (target: string, f: Firing): void => {
    const list = out.get(target);
    if (list === undefined) out.set(target, [f]);
    else list.push(f);
  };
  for (const id of idents) {
    const from = known.get(id.from);
    if (from === undefined || skip(id.to)) continue;
    const value = from.value * conventionFactor(id.from, id.to);
    if (Number.isFinite(value) && value !== 0) {
      push(id.to, { edge: `identification:${id.from}`, value, sigmaDecades: from.sigmaDecades, inputs: [id.from] });
    }
  }
  const values = new Map([...known].map(([name, k]) => [name, k.value]));
  for (const e of edges) {
    if (skip(e.target.name)) continue;
    if (!e.sources.every((s) => known.has(s.name))) continue;
    const inputs = evaluationInputs(e, values);
    let value: number;
    try {
      value = evaluateEdge(e, inputs);
    } catch (err) {
      if (!refusesThePoint(err)) throw err;
      continue;
    }
    if (!(Number.isFinite(value) && value !== 0)) continue;
    push(e.target.name, { edge: e.id, value, sigmaDecades: propagatedSigma(e, inputs, known), inputs: Object.keys(inputs).sort(compareCodepoint) });
  }
  return out;
}

/** The firings sorted by edge id; and whether any two differ by more than {@link DERIVED_AGREEMENT}. */
function agreement(list: readonly Firing[]): { sorted: Firing[]; agree: boolean } {
  const sorted = [...list].sort(byKey((f) => f.edge));
  const agree = sorted.every(
    (f) => Math.abs(f.value - sorted[0]!.value) <= DERIVED_AGREEMENT * Math.max(Math.abs(f.value), Math.abs(sorted[0]!.value)),
  );
  return { sorted, agree };
}

/**
 * The magnitudes `edges` derive from the sourced table and the constants, with the refusals. A
 * quantity the table or a constant states is a seed and is never derived. Each round fires every
 * edge from the values of the round before, so the edge list's order decides nothing; a quantity
 * that two edges value differently is withdrawn with everything derived from it, and the fixed
 * point is recomputed without it. A value is assigned from the first of its agreeing edges by id.
 *
 * @internal
 */
export function deriveOwnEquationMagnitudes(
  edges: readonly BridgeEdge[],
  seeds: OwnEquationSeeds,
  maxSigmaDecades: number = DEFAULT_SIGMA_DECADES,
): DerivedMagnitudes {
  const seeded = seedsOf(edges, seeds);
  const disagreeing = new Map<string, DerivedMagnitudeRefusal>();
  for (;;) {
    const unmeasured = new Map<string, DerivedMagnitudeRefusal>();
    const known = new Map(seeded);
    const derived = new Map<string, Firing>();
    const skip = (name: string): boolean => known.has(name) || disagreeing.has(name) || unmeasured.has(name);
    for (;;) {
      const round = firings(edges, seeds.identifications, known, skip);
      if (round.size === 0) break;
      for (const target of [...round.keys()].sort(compareCodepoint)) {
        const { sorted, agree } = agreement(round.get(target)!);
        const edgeIds = sorted.map((f) => f.edge);
        if (!agree) {
          disagreeing.set(target, disagreement(target, sorted));
          continue;
        }
        const chosen = sorted[0]!;
        if (chosen.sigmaDecades === undefined) {
          unmeasured.set(target, {
            name: target,
            reason: 'precision-unknown',
            edges: edgeIds,
            detail: `${chosen.edge} fires at the point but not at the points its log-elasticity reads, so σ was not measured`,
          });
          continue;
        }
        derived.set(target, chosen);
        known.set(target, { value: chosen.value, sigmaDecades: chosen.sigmaDecades });
      }
    }
    // An edge whose sources were valued only after its target was: it must agree with that value.
    const late: string[] = [];
    const values = new Map([...known].map(([name, k]) => [name, k.value]));
    for (const [target, chosen] of derived) {
      const all: Firing[] = [chosen];
      for (const e of edges) {
        if (e.target.name !== target || e.id === chosen.edge) continue;
        if (!e.sources.every((s) => known.has(s.name))) continue;
        try {
          const value = evaluateEdge(e, evaluationInputs(e, values));
          if (Number.isFinite(value) && value !== 0) all.push({ edge: e.id, value, sigmaDecades: undefined, inputs: [] });
        } catch (err) {
          if (!refusesThePoint(err)) throw err;
        }
      }
      for (const id of seeds.identifications) {
        if (id.to !== target || `identification:${id.from}` === chosen.edge) continue;
        const from = known.get(id.from);
        if (from === undefined) continue;
        const value = from.value * conventionFactor(id.from, id.to);
        if (Number.isFinite(value) && value !== 0) all.push({ edge: `identification:${id.from}`, value, sigmaDecades: undefined, inputs: [] });
      }
      const { sorted, agree } = agreement(all);
      if (!agree) {
        disagreeing.set(target, disagreement(target, sorted));
        late.push(target);
      }
    }
    if (late.length > 0) continue;
    const usable = new Map<string, DerivedMagnitude>();
    const refusals: DerivedMagnitudeRefusal[] = [...disagreeing.values(), ...unmeasured.values()];
    for (const [name, f] of derived) {
      const sigma = f.sigmaDecades!;
      if (sigma > maxSigmaDecades + SIGMA_GUARD_SLACK) {
        refusals.push({
          name,
          reason: 'imprecise',
          edges: [f.edge],
          sigmaDecades: sigma,
          detail:
            `${f.edge} gives ${name} from ${f.inputs.join(', ')} at σ = ${sigma.toPrecision(3)} decades, ` +
            `above the ${maxSigmaDecades}-decade precision the gate requires`,
        });
        continue;
      }
      usable.set(name, { value: f.value * conventionScaleToSI(name), sigmaDecades: sigma, edge: f.edge, inputs: f.inputs });
    }
    refusals.sort(byKey((r) => r.name));
    return { values: usable, refusals };
  }
}

/** The refusal record of two or more edges that value one quantity differently. */
function disagreement(name: string, sorted: readonly Firing[]): DerivedMagnitudeRefusal {
  return {
    name,
    reason: 'disagreeing-edges',
    edges: sorted.map((f) => f.edge),
    detail:
      `${sorted.map((f) => `${f.edge} gives ${f.value.toPrecision(4)}`).join(', ')}: ` +
      `they differ by more than a relative ${DERIVED_AGREEMENT}, so no edge is taken`,
  };
}
