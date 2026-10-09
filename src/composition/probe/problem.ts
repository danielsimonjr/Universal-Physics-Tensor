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

/** Return whether a string names a supported frontier-gap kind for probe problems. @internal */
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

/**
 * A JSON file that is not a search-problem file: a field it must carry is missing or holds a
 * value of another kind. The message names the field; it never reports what a JavaScript engine
 * said on reading it. @internal
 */
export class ProblemFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProblemFileError';
  }
}

/** What a JSON value is, in the words a file author would use. */
function kindOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'string') return 'text';
  if (typeof v === 'number') return 'a number';
  if (typeof v === 'boolean') return 'true or false';
  return typeof v === 'object' ? 'an object' : typeof v;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A `{"name", "dim"}` variable, read from `raw` and located by `where` in any refusal. */
function varFromJson(raw: unknown, where: string): DimensionalVariableRef {
  if (!isRecord(raw)) {
    throw new ProblemFileError(`${where} must be {"name": text, "dim": text} (found ${kindOf(raw)})`);
  }
  const { name, dim } = raw;
  if (typeof name !== 'string' || name === '') {
    throw new ProblemFileError(`${where} needs a "name" (text)${name === undefined ? '' : `, found ${kindOf(name)}`}`);
  }
  if (typeof dim !== 'string' || dim === '') {
    throw new ProblemFileError(`${where} needs a "dim" (text)${dim === undefined ? '' : `, found ${kindOf(dim)}`}`);
  }
  return { name, dim: parseDimensionSpec(dim) };
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
  // `ProblemFile` is what a well-formed file holds; a file read from disk is any JSON value, so
  // each field is checked here before it is read, and a refusal names the field.
  const file: unknown = raw;
  if (!isRecord(file)) {
    throw new ProblemFileError(`the top level must be a JSON object with "target" and "governing" (found ${kindOf(file)})`);
  }
  if (file.target === undefined) throw new ProblemFileError('it has no "target" ({"name": text, "dim": text})');
  if (file.governing === undefined) throw new ProblemFileError('it has no "governing" list ([{"name": text, "dim": text}, ...])');
  if (!Array.isArray(file.governing)) {
    throw new ProblemFileError(`"governing" must be a list of {"name": text, "dim": text} (found ${kindOf(file.governing)})`);
  }
  if (file.gap !== undefined && !isRecord(file.gap)) {
    throw new ProblemFileError(`"gap" must be an object (found ${kindOf(file.gap)})`);
  }
  for (const field of ['id', 'kind', 'summary'] as const) {
    const v: unknown = raw.gap?.[field];
    if (v !== undefined && typeof v !== 'string') {
      throw new ProblemFileError(`gap.${field} must be text (found ${kindOf(v)})`);
    }
  }
  const kindRaw = raw.gap?.kind ?? 'unexplained-observation';
  if (!isGapKind(kindRaw)) {
    throw new ProblemFileError(`unknown gap kind '${kindRaw}' in gap.kind (see \`upt help probe\`, PROBLEM FILE)`);
  }
  if (kindRaw === 'relation-link' || kindRaw === 'regime-transition') {
    throw new ProblemFileError(`gap.kind '${kindRaw}' is a Product A gap: use \`upt discover\`, not probe`);
  }
  const gapId = raw.gap?.id ?? 'fg-inline';
  if (!gapId.startsWith('fg-')) {
    throw new ProblemFileError(`gap.id '${gapId}' must start with "fg-"`);
  }
  const gap = makeResidualGap(gapId, raw.gap?.summary ?? `search problem from ${source}`, kindRaw);
  const target = varFromJson(raw.target, '"target"');
  const governing = raw.governing.map((g, i) => varFromJson(g, `governing[${i}]`));
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
    throw new Error(`${path} is not an ExprNode JSON object`);
  }
  const node = raw as { kind: unknown };
  if (node.kind === 'symbol') {
    const sym = raw as { name?: unknown; dim?: unknown };
    if (typeof sym.name !== 'string' || sym.name.length === 0) {
      throw new Error(`${path} symbol node missing name`);
    }
    if (!sym.dim || typeof sym.dim !== 'object') {
      throw new Error(`${path} symbol node missing dim`);
    }
    return raw as ExprNode;
  }
  if (node.kind === 'op') {
    const op = raw as { op?: unknown; args?: unknown };
    if (typeof op.op !== 'string' || !Array.isArray(op.args)) {
      throw new Error(`${path} op node missing op/args`);
    }
    for (let i = 0; i < op.args.length; i++) {
      assertMinimalExprNode(op.args[i], `${path}#args[${i}]`);
    }
    return raw as ExprNode;
  }
  if (typeof node.kind !== 'string' || node.kind.length === 0) {
    throw new Error(`${path} has invalid kind`);
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
  throw new Error(`${path} is not an ExprNode JSON object`);
}
