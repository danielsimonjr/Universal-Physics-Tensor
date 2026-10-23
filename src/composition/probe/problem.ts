/**
 * Search-problem construction and JSON loading for Product B.
 *
 * @internal
 */

import { readJsonFile } from '../../core/data-file.js';
import { isPlainObject } from '../../core/json-schema.js';
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
 * A JSON file that is not a search-problem file, or not an expression file: a field it must carry
 * is missing or holds a value of another kind. The message names the field; it never reports what
 * a JavaScript engine said on reading it. @internal
 */
export class ProblemFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProblemFileError';
  }
}

/** The `DiscrepancyKind` union as a runtime set, for a file's `discrepancy.kind`. */
const DISCREPANCY_KINDS: ReadonlySet<string> = new Set([
  'additive', 'relative', 'log-ratio', 'standardized', 'likelihood',
  'vector', 'tensor', 'distributional', 'operator', 'custom',
]);

/** What a JSON value is, in the words a file author would use. */
function kindOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'string') return 'text';
  if (typeof v === 'number') return 'a number';
  if (typeof v === 'boolean') return 'true or false';
  return typeof v === 'object' ? 'an object' : typeof v;
}

/** A `{"name", "dim"}` variable, read from `raw` and located by `where` in any refusal. */
function varFromJson(raw: unknown, where: string): DimensionalVariableRef {
  if (!isPlainObject(raw)) {
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

/** The JSON shape of a probe problem file, as read before validation. */
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
  const raw = readJsonFile(path) as ProblemFile;
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
  if (!isPlainObject(file)) {
    throw new ProblemFileError(`the top level must be a JSON object with "target" and "governing" (found ${kindOf(file)})`);
  }
  if (file.target === undefined) throw new ProblemFileError('it has no "target" ({"name": text, "dim": text})');
  if (file.governing === undefined) throw new ProblemFileError('it has no "governing" list ([{"name": text, "dim": text}, ...])');
  if (!Array.isArray(file.governing)) {
    throw new ProblemFileError(`"governing" must be a list of {"name": text, "dim": text} (found ${kindOf(file.governing)})`);
  }
  if (file.gap !== undefined && !isPlainObject(file.gap)) {
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
  if (file.observationsPath !== undefined && typeof file.observationsPath !== 'string') {
    throw new ProblemFileError(`"observationsPath" must be text (found ${kindOf(file.observationsPath)})`);
  }
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
  // The secondary fields. Each was once passed through unread, so `limits: 5` or
  // `assumptions: "x"` reached `runProbeSearch` and threw a raw TypeError there.
  return {
    ...problem,
    baseline: file.baseline === undefined ? undefined : assertExprNode(file.baseline, '"baseline"'),
    discrepancy: file.discrepancy === undefined ? problem.discrepancy : discrepancyFromJson(file.discrepancy),
    assumptions: file.assumptions === undefined ? gap.assumptions : textList(file.assumptions, 'assumptions'),
    limits: file.limits === undefined ? undefined : limitsFromJson(file.limits),
    claimedRegimes: file.claimedRegimes === undefined ? undefined : textRecord(file.claimedRegimes, 'claimedRegimes'),
    observationalBoundIds:
      file.observationalBoundIds === undefined ? undefined : textList(file.observationalBoundIds, 'observationalBoundIds'),
  };
}

/** A list of text, located by its field name. */
function textList(raw: unknown, field: string): readonly string[] {
  const label = field.includes('.') ? field : `"${field}"`;
  if (!Array.isArray(raw)) throw new ProblemFileError(`${label} must be a list of text (found ${kindOf(raw)})`);
  return raw.map((v, i) => {
    if (typeof v !== 'string') throw new ProblemFileError(`${field}[${i}] must be text (found ${kindOf(v)})`);
    return v;
  });
}

/** A `{name: text}` object, located by its field name. */
function textRecord(raw: unknown, field: string): Readonly<Record<string, string>> {
  if (!isPlainObject(raw)) throw new ProblemFileError(`"${field}" must be {name: text} (found ${kindOf(raw)})`);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') throw new ProblemFileError(`${field}.${k} must be text (found ${kindOf(v)})`);
    out[k] = v;
  }
  return out;
}

function discrepancyFromJson(raw: unknown): DiscrepancyDefinition {
  if (!isPlainObject(raw)) throw new ProblemFileError(`"discrepancy" must be {"kind": text, "observableIds": [text]} (found ${kindOf(raw)})`);
  if (typeof raw.kind !== 'string' || !DISCREPANCY_KINDS.has(raw.kind)) {
    throw new ProblemFileError(
      `discrepancy.kind '${String(raw.kind)}' is not a discrepancy kind (${[...DISCREPANCY_KINDS].join(', ')})`,
    );
  }
  const observableIds = textList(raw.observableIds, 'discrepancy.observableIds');
  for (const key of ['covarianceRef', 'implementationRef'] as const) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') {
      throw new ProblemFileError(`discrepancy.${key} must be text (found ${kindOf(raw[key])})`);
    }
  }
  return {
    kind: raw.kind as DiscrepancyDefinition['kind'],
    observableIds,
    ...(typeof raw.covarianceRef === 'string' ? { covarianceRef: raw.covarianceRef } : {}),
    ...(typeof raw.implementationRef === 'string' ? { implementationRef: raw.implementationRef } : {}),
  };
}

function limitsFromJson(raw: unknown): NonNullable<SearchProblem['limits']> {
  const shape = '{"id": text, "regime": {name: text}}';
  if (!Array.isArray(raw)) throw new ProblemFileError(`"limits" must be a list of ${shape} (found ${kindOf(raw)})`);
  return raw.map((l, i) => {
    if (!isPlainObject(l)) throw new ProblemFileError(`limits[${i}] must be ${shape} (found ${kindOf(l)})`);
    if (typeof l.id !== 'string' || l.id === '') throw new ProblemFileError(`limits[${i}].id must be text`);
    if (!isPlainObject(l.regime)) throw new ProblemFileError(`limits[${i}].regime must be {name: text} (found ${kindOf(l.regime)})`);
    const regime = textRecord(l.regime, `limits[${i}].regime`);
    if (l.description !== undefined && typeof l.description !== 'string') {
      throw new ProblemFileError(`limits[${i}].description must be text (found ${kindOf(l.description)})`);
    }
    return { id: l.id, regime, ...(typeof l.description === 'string' ? { description: l.description } : {}) };
  });
}

/** The scalar operators an `op` node may carry. */
const SCALAR_OPS: ReadonlySet<string> = new Set(['+', '-', '*', '/', '^']);
/** The `TranscendentalFn` union as a runtime set. */
const TRANSCENDENTAL_FNS: ReadonlySet<string> = new Set(['exp', 'ln', 'log2', 'log10', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh']);
/** A decimal literal, as the validator reads a numeric-literal symbol. */
const DECIMAL_LITERAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const DIM_KEYS = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const SCALAR_KINDS = 'symbol, op, integral, derivative, dirac-delta, variational-derivative, transcendental, abs';

/** `raw[field]` as a child node, or a refusal that names the field. */
function child(raw: Record<string, unknown>, field: string, path: string, what: string): ExprNode {
  if (raw[field] === undefined) throw new ProblemFileError(`${path} ${what} node needs ${field === 'args' ? '' : 'an '}"${field}" node`);
  return assertExprNode(raw[field], `${path}#${field}`);
}

/**
 * Check that a JSON value has the shape of a scalar `ExprNode`, recursively:
 * a kind per node, the children each kind owns, a finite literal where a
 * symbol's name is a decimal literal, and the seven dimension exponents on a
 * symbol. A tensor kind is refused here: the probe evaluates scalars.
 * Refusals are {@link ProblemFileError}, located by `path`.
 */
function assertExprNode(raw: unknown, path: string): ExprNode {
  if (!isPlainObject(raw) || !('kind' in raw)) {
    throw new ProblemFileError(`${path} is not an ExprNode JSON object (found ${kindOf(raw)})`);
  }
  const kind = raw.kind;
  if (typeof kind !== 'string' || kind.length === 0) {
    throw new ProblemFileError(`${path} has invalid kind (found ${kindOf(kind)})`);
  }
  switch (kind) {
    case 'symbol': {
      if (typeof raw.name !== 'string' || raw.name.length === 0) {
        throw new ProblemFileError(`${path} symbol node missing name (needs "name": text)`);
      }
      if (!isPlainObject(raw.dim)) throw new ProblemFileError(`${path} symbol node missing dim`);
      for (const k of DIM_KEYS) {
        if (!(k in raw.dim)) throw new ProblemFileError(`${path} symbol node dim needs the exponents ${DIM_KEYS.join(', ')}`);
        if (typeof raw.dim[k] !== 'number' || !Number.isFinite(raw.dim[k])) {
          throw new ProblemFileError(`${path} symbol node dim.${k} must be a finite number (found ${kindOf(raw.dim[k])})`);
        }
      }
      if (DECIMAL_LITERAL.test(raw.name) && !Number.isFinite(Number(raw.name))) {
        throw new ProblemFileError(`${path} literal '${raw.name}' is not a finite number`);
      }
      return raw as unknown as ExprNode;
    }
    case 'op': {
      if (typeof raw.op !== 'string' || !Array.isArray(raw.args)) {
        throw new ProblemFileError(`${path} op node needs "op" and an "args" list (op node missing op/args)`);
      }
      if (!SCALAR_OPS.has(raw.op)) throw new ProblemFileError(`${path} op node has op '${raw.op}', not one of + - * / ^`);
      raw.args.forEach((a, i) => assertExprNode(a, `${path}#args[${i}]`));
      return raw as unknown as ExprNode;
    }
    case 'integral': {
      child(raw, 'over', path, 'integral');
      child(raw, 'integrand', path, 'integral');
      for (const bound of ['lower', 'upper']) if (raw[bound] !== undefined) assertExprNode(raw[bound], `${path}#${bound}`);
      return raw as unknown as ExprNode;
    }
    case 'derivative':
      child(raw, 'of', path, 'derivative');
      child(raw, 'wrt', path, 'derivative');
      return raw as unknown as ExprNode;
    case 'dirac-delta':
    case 'abs':
      child(raw, 'arg', path, kind);
      return raw as unknown as ExprNode;
    case 'variational-derivative':
      for (const f of ['functional', 'field', 'over']) child(raw, f, path, kind);
      return raw as unknown as ExprNode;
    case 'transcendental': {
      if (typeof raw.fn !== 'string' || !TRANSCENDENTAL_FNS.has(raw.fn)) {
        throw new ProblemFileError(`${path} transcendental node has fn '${String(raw.fn)}', not one of ${[...TRANSCENDENTAL_FNS].join(', ')}`);
      }
      child(raw, 'arg', path, kind);
      return raw as unknown as ExprNode;
    }
    default:
      throw new ProblemFileError(`${path} has kind '${kind}', which is not a scalar expression node (${SCALAR_KINDS})`);
  }
}

/**
 * Load an ExprNode from a JSON file (`{expression}` wrapper or bare node). The node shape is
 * checked recursively; a file that is not an expression raises {@link ProblemFileError}. @internal
 */
export function parseExprJson(path: string): ExprNode {
  const raw: unknown = readJsonFile(path);
  if (isPlainObject(raw) && 'kind' in raw) return assertExprNode(raw, path);
  if (isPlainObject(raw) && 'expression' in raw && raw.expression) {
    return assertExprNode(raw.expression, path);
  }
  throw new ProblemFileError(`${path} is not an ExprNode JSON object`);
}
