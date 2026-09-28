/**
 * Search-problem construction and JSON loading for Product B.
 *
 * @internal
 */

import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { parseDimensionSpec } from '../../dimensional/dimension-spec.js';
import type { ExprNode } from '../../dimensional/ast-types.js';
import type {
  DimensionalVariableRef,
  DiscrepancyDefinition,
  FrontierGap,
  FrontierGapKind,
  ProbeDataset,
  SearchProblem,
} from './types.js';
import { problemFromResidualGap } from './frontier.js';
import { asDatasetSafe, loadSplitDatasetsFromJson } from './dataset.js';

/** @internal */
export function isGapKind(s: string): s is FrontierGapKind {
  return (
    s === 'prediction-residual' ||
    s === 'relation-link' ||
    s === 'regime-transition' ||
    s === 'parameter-tension' ||
    s === 'assumption-conflict' ||
    s === 'missing-operator' ||
    s === 'unexplained-observation' ||
    s === 'model-disagreement' ||
    s === 'causal-mechanism' ||
    s === 'other'
  );
}

/** Residual / unexplained-observation gap template. @internal */
export function makeResidualGap(
  id: string,
  summary: string,
  kind: FrontierGapKind = 'unexplained-observation',
): FrontierGap {
  if (!id.startsWith('fg-')) {
    throw new RangeError(`makeResidualGap: id must start with 'fg-' (got '${id}')`);
  }
  if (kind === 'relation-link' || kind === 'regime-transition') {
    throw new RangeError(`makeResidualGap: ${kind} is Product A — use upt discover, not probe`);
  }
  return {
    id,
    kind,
    participants: [],
    observations: [],
    regimes: [],
    assumptions: [],
    constraints: [],
    evidence: { summary, sourceIds: [] },
    identifiability: {
      kind: 'parametric',
      parametric: { status: 'unknown', reasons: ['not yet assessed'] },
    },
    searchability: { searchable: true, reasons: ['residual gap'] },
    status: 'identified',
  };
}

function varFromJson(raw: { name: string; dim: string }): DimensionalVariableRef {
  return { name: raw.name, dim: parseDimensionSpec(raw.dim) };
}

export interface ProblemFile {
  readonly gap?: {
    readonly id?: string;
    readonly kind?: string;
    readonly summary?: string;
  };
  readonly target: { readonly name: string; readonly dim: string };
  readonly governing: readonly { readonly name: string; readonly dim: string }[];
  readonly exploratory?: unknown;
  readonly holdout?: unknown;
  readonly observationsPath?: string;
  readonly baseline?: ExprNode;
  readonly discrepancy?: DiscrepancyDefinition;
  readonly assumptions?: readonly string[];
  readonly limits?: SearchProblem['limits'];
  readonly claimedRegimes?: Readonly<Record<string, string>>;
  readonly observationalBoundIds?: readonly string[];
}

/** Load a SearchProblem from a JSON file (optionally with inline datasets). @internal */
export function loadSearchProblemFromJson(path: string): SearchProblem {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as ProblemFile;
  return searchProblemFromFile(raw, path);
}

/**
 * The observations file a problem file names, resolved against the problem file's directory
 * (the working directory for an inline problem), or null when it names none. @internal
 */
export function resolveObservationsPath(raw: Pick<ProblemFile, 'observationsPath'>, source = 'inline'): string | null {
  if (!raw.observationsPath) return null;
  return isAbsolute(raw.observationsPath)
    ? raw.observationsPath
    : resolve(source === 'inline' ? process.cwd() : dirname(source), raw.observationsPath);
}

/** Build a SearchProblem from an already-parsed problem file. @internal */
export function searchProblemFromFile(raw: ProblemFile, source = 'inline'): SearchProblem {
  const kindRaw = raw.gap?.kind ?? 'unexplained-observation';
  if (!isGapKind(kindRaw)) {
    throw new RangeError(`unknown gap kind '${kindRaw}'`);
  }
  const gap = makeResidualGap(
    raw.gap?.id ?? 'fg-inline',
    raw.gap?.summary ?? `search problem from ${source}`,
    kindRaw,
  );
  const target = varFromJson(raw.target);
  const governing = raw.governing.map(varFromJson);
  let exploratory: ProbeDataset | undefined;
  let holdout: ProbeDataset | undefined;
  const observationsPath = resolveObservationsPath(raw, source);
  if (observationsPath !== null) {
    const split = loadSplitDatasetsFromJson(observationsPath);
    exploratory = split.exploratory;
    holdout = split.holdout;
  }
  if (raw.exploratory) {
    exploratory = asDatasetSafe(raw.exploratory, `${source}#exploratory`, 'exploratory-fit');
  }
  if (raw.holdout) {
    holdout = asDatasetSafe(raw.holdout, `${source}#holdout`, 'validation-holdout');
  }
  const problem = problemFromResidualGap(gap, target, governing, exploratory, holdout);
  return {
    ...problem,
    baseline: raw.baseline,
    discrepancy: raw.discrepancy ?? problem.discrepancy,
    assumptions: raw.assumptions ?? gap.assumptions,
    limits: raw.limits,
    claimedRegimes: raw.claimedRegimes,
    observationalBoundIds: raw.observationalBoundIds,
  };
}

function assertMinimalExprNode(raw: unknown, path: string): ExprNode {
  if (!raw || typeof raw !== 'object' || !('kind' in raw)) {
    throw new Error(`parseExprJson: ${path} is not an ExprNode JSON object`);
  }
  const node = raw as { kind: unknown };
  if (node.kind === 'symbol') {
    const sym = raw as { name?: unknown; dim?: unknown };
    if (typeof sym.name !== 'string' || sym.name.length === 0) {
      throw new Error(`parseExprJson: ${path} symbol node missing name`);
    }
    if (!sym.dim || typeof sym.dim !== 'object') {
      throw new Error(`parseExprJson: ${path} symbol node missing dim`);
    }
    return raw as ExprNode;
  }
  if (node.kind === 'op') {
    const op = raw as { op?: unknown; args?: unknown };
    if (typeof op.op !== 'string' || !Array.isArray(op.args)) {
      throw new Error(`parseExprJson: ${path} op node missing op/args`);
    }
    for (let i = 0; i < op.args.length; i++) {
      assertMinimalExprNode(op.args[i], `${path}#args[${i}]`);
    }
    return raw as ExprNode;
  }
  if (typeof node.kind !== 'string' || node.kind.length === 0) {
    throw new Error(`parseExprJson: ${path} has invalid kind`);
  }
  return raw as ExprNode;
}

/** Load an ExprNode from a JSON file (`{expression}` wrapper or bare node). @internal */
export function parseExprJson(path: string): ExprNode {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { expression?: ExprNode } | ExprNode;
  if (raw && typeof raw === 'object' && 'kind' in raw) return assertMinimalExprNode(raw, path);
  if (
    raw &&
    typeof raw === 'object' &&
    'expression' in raw &&
    (raw as { expression?: ExprNode }).expression
  ) {
    return assertMinimalExprNode((raw as { expression: unknown }).expression, path);
  }
  throw new Error(`parseExprJson: ${path} is not an ExprNode JSON object`);
}
