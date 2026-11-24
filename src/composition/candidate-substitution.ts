/**
 * Counterfactual evaluations of the first equations that consume either
 * endpoint of a proposed identification. Each run starts from a single
 * explicitly sourced scenario.
 * @module composition/candidate-substitution
 */

import { DomainViolationError } from '../bridges/evaluation-errors.js';
import { equals, siUnitOf } from '../dimensional/algebra.js';
import { DIMENSIONLESS, type Dimension } from '../dimensional/types.js';
import { conventionScaleToSI, quantityConventionUnit } from '../dimensional/unit-convention.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';
import { evaluateEdge, type BridgeEdge } from './edge.js';
import { evaluationInputs, refusesThePoint } from './retrodiction.js';
import { REPRESENTATIVE_VALUES, type RepresentativeValue } from './representative-values.js';

/** One coherent, sourced operating point for a relation. Values are in SI. @public */
export interface SubstitutionScenario {
  readonly label: string;
  readonly inputs: Readonly<Record<string, RepresentativeValue>>;
}

/** One directional substitution into a consuming relation. @public */
export interface CandidateSubstitution {
  readonly edgeId: string;
  readonly target: string;
  readonly from: string;
  readonly to: string;
  /** Outcome at the specified operating point. */
  readonly status: 'evaluated' | 'refused' | 'abstained';
  readonly scenario?: string;
  /** Actual values passed to the evaluator, in the edge's input units. */
  readonly inputs: Readonly<Record<string, { readonly value: number; readonly unit: string; readonly source: string }>>;
  readonly reason?: string;
  /** Original value of the substituted input, in the same edge unit. */
  readonly baselineInput?: CandidateSubstitution['inputs'][string];
  /** Prediction at the operating point before replacement. */
  readonly baselinePrediction?: { readonly value: number; readonly unit: string };
  readonly prediction?: { readonly value: number; readonly unit: string };
}

function representativeInputs(names: readonly string[]): Record<string, RepresentativeValue> {
  return Object.fromEntries(names.map((name) => [name, REPRESENTATIVE_VALUES[name]!]));
}

const wkbInputs = Object.fromEntries(Object.entries(
  representativeInputs(['attempt-frequency', 'tunneling-mass', 'barrier-height', 'barrier-width']),
).map(([name, input]) => [name, { ...input, source: `Illustrative representative assumption: ${input.source}` }]));
const wkbLabel = 'Illustrative proton-transfer operating point (~0.20 eV, 1 Å)';

/** Curated single operating points indexed by the catalog relation's output quantity. */
const SCENARIOS_BY_CATALOG_TARGET: Readonly<Record<string, SubstitutionScenario>> = {
  'fret-efficiency': {
    label: 'Representative FRET pair (5 nm Förster radius and separation)',
    inputs: representativeInputs(['foerster-radius', 'donor-acceptor-distance']),
  },
  'wkb-tunneling-rate': { label: wkbLabel, inputs: wkbInputs },
  'mutation-rate': {
    label: wkbLabel,
    inputs: {
      ...wkbInputs,
      'biological-rate-correction': {
        value: 0.5,
        source: 'Illustrative correction factor from the BE-26 catalog reference example',
      },
    },
  },
};

/** Bind built-in operating points to their catalog relations in the selected graph. @internal */
export function defaultSubstitutionScenarios(
  edges: readonly BridgeEdge[],
): Readonly<Record<string, SubstitutionScenario>> {
  const scenarios: Record<string, SubstitutionScenario> = {};
  for (const edge of edges) {
    if (edge.beId === null) continue;
    const target = edge.target.name;
    if (Object.hasOwn(SCENARIOS_BY_CATALOG_TARGET, target)) {
      scenarios[edge.id] = SCENARIOS_BY_CATALOG_TARGET[target]!;
    }
  }
  return scenarios;
}

/** Graph indices and scenario data reused across candidates in one discovery run. @internal */
export interface SubstitutionContext {
  readonly consumers: ReadonlyMap<string, readonly number[]>;
  readonly dimensions: ReadonlyMap<string, readonly Dimension[]>;
  readonly scenarios: Readonly<Record<string, SubstitutionScenario>>;
}

/** Index exact source names; dimensions include producers and consumers to detect ambiguity. @internal */
export function buildSubstitutionContext(
  edges: readonly BridgeEdge[],
  scenarios: Readonly<Record<string, SubstitutionScenario>>,
): SubstitutionContext {
  const consumers = new Map<string, number[]>();
  const dimensions = new Map<string, Dimension[]>();
  for (const [index, edge] of edges.entries()) {
    for (const name of new Set(edge.sources.map((source) => source.name))) {
      const list = consumers.get(name) ?? [];
      list.push(index);
      consumers.set(name, list);
    }
    for (const quantity of [...edge.sources, edge.target]) {
      const list = dimensions.get(quantity.name) ?? [];
      if (!list.some((dim) => equals(dim, quantity.dim))) list.push(quantity.dim);
      dimensions.set(quantity.name, list);
    }
  }
  return { consumers, dimensions, scenarios };
}

function finite(value: RepresentativeValue | undefined): value is RepresentativeValue {
  return value !== undefined && Number.isFinite(value.value);
}

function sourceUnit(name: string, dim: Dimension): string {
  return quantityConventionUnit(name) ?? siUnitOf(dim);
}

function evaluateSubstitution(
  edge: BridgeEdge,
  from: string,
  to: string,
  ctx: SubstitutionContext,
  magnitude: (name: string) => RepresentativeValue | undefined,
): CandidateSubstitution {
  const scope = { edgeId: edge.id, target: edge.target.name, from, to };
  const scenario = ctx.scenarios[edge.id];
  if (scenario === undefined) {
    return { ...scope, status: 'abstained', inputs: {}, reason: 'No coherent operating point is recorded for this relation.' };
  }

  const evidence = { ...scope, scenario: scenario.label };
  const sources = edge.sources.filter((source) => source.name === to);
  const fromDims = ctx.dimensions.get(from);
  if (fromDims?.length !== 1 || !sources.every((source) => equals(fromDims[0]!, source.dim))) {
    return { ...evidence, status: 'abstained', inputs: {}, reason: 'Endpoint dimensions are incompatible or ambiguous for this input.' };
  }

  const existing = new Map<string, number>();
  const inputs: Record<string, { value: number; source: string; unit: string }> = {};
  const missing: string[] = [];
  const group = CANONICAL_GROUP_PREFACTORS.find(({ id }) => id === edge.id)?.group;
  const bindings = group !== undefined && Object.hasOwn(scenario.inputs, group)
    ? [...edge.sources, { name: group, dim: DIMENSIONLESS }]
    : edge.sources;
  for (const { name, dim } of bindings) {
    const input = scenario.inputs[name];
    if (!finite(input)) {
      missing.push(name);
      continue;
    }
    const value = input.value / conventionScaleToSI(name);
    if (!Number.isFinite(value)) {
      missing.push(name);
      continue;
    }
    existing.set(name, value);
    inputs[name] = { value, source: input.source, unit: sourceUnit(name, dim) };
  }
  if (missing.length > 0) {
    return { ...evidence, status: 'abstained', inputs, reason: `Operating point lacks usable inputs: ${missing.join(', ')}.` };
  }
  const replacement = scenario.inputs[from] ?? magnitude(from);
  if (!finite(replacement)) {
    return { ...evidence, status: 'abstained', inputs, reason: `No independently sourced value for ${from}.` };
  }
  const replacementValue = replacement.value / conventionScaleToSI(to);
  if (!Number.isFinite(replacementValue)) {
    return { ...evidence, status: 'abstained', inputs, reason: `${from} cannot be represented in the evaluator's unit.` };
  }

  // Baseline validation prevents attributing an already-invalid scenario to the substitution.
  let baseline: number;
  try {
    baseline = evaluateEdge(edge, evaluationInputs(edge, existing));
  } catch (err) {
    if (!refusesThePoint(err)) throw err;
    return { ...evidence, status: 'abstained', inputs, reason: `Baseline evaluation refused: ${(err as Error).message}` };
  }
  if (!Number.isFinite(baseline)) {
    return { ...evidence, status: 'abstained', inputs, reason: 'Baseline evaluation returned a non-finite prediction.' };
  }

  const unit = sourceUnit(edge.target.name, edge.target.dim);
  const baselinePrediction = { value: baseline, unit };
  const baselineInput = inputs[to]!;
  const changedInputs = { ...inputs, [to]: { ...baselineInput, value: replacementValue, source: replacement.source } };
  existing.set(to, replacementValue);
  const run = { ...evidence, inputs: changedInputs, baselineInput, baselinePrediction };
  try {
    const value = evaluateEdge(edge, evaluationInputs(edge, existing));
    return Number.isFinite(value)
      ? { ...run, status: 'evaluated', prediction: { value, unit } }
      : { ...run, status: 'abstained', reason: 'Substituted evaluation returned a non-finite prediction.' };
  } catch (err) {
    if (!refusesThePoint(err)) throw err;
    return {
      ...run,
      status: err instanceof DomainViolationError ? 'refused' : 'abstained',
      reason: (err as Error).message,
    };
  }
}

/** Try both directions at each immediate consumer of the replaced quantity. @internal */
export function candidateSubstitutions(
  edges: readonly BridgeEdge[],
  a: string,
  b: string,
  ctx: SubstitutionContext,
  magnitude: (name: string) => RepresentativeValue | undefined,
): CandidateSubstitution[] {
  return ([[a, b], [b, a]] as const).flatMap(([from, to]) =>
    (ctx.consumers.get(to) ?? []).map((index) => evaluateSubstitution(edges[index]!, from, to, ctx, magnitude)),
  );
}
