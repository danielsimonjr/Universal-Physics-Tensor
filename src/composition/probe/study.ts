/**
 * Falsification-oriented study over calibrated observations (audit §14 I19).
 *
 * A study file carries observations with units and σ, each with a role:
 * `exploratory` rows are the only rows the search and every fit see;
 * `holdout` rows are a withheld test (typically a change of regime);
 * `replication` rows are an independent acquisition, tested but never fit.
 * The file also declares its provenance (`synthetic` is required, never
 * inferred) and optional competing baseline formulas.
 *
 * Every test is a χ² test with the declared σ at a stated α. A searched
 * candidate is credible only if it passes on the exploratory rows AND a
 * constant (null) model is rejected there; otherwise the result is
 * `no-credible-candidate`. Only the selected credible candidate is then
 * scored on the holdout: `survives-holdout` or `refuted-on-holdout`.
 * Replication is reported separately and never folded into the verdict.
 *
 * A study is JSON or CSV (the CSV compiles to the same object, so both are
 * refused for the same reasons). Inputs may carry σ, propagated by the
 * effective-variance method. A file may declare correction families in one
 * or more dimensionless inputs; their terms are admitted only by an F test on
 * the exploratory rows. Replication rows may come from a separate file with
 * its own provenance; replication rows at a study row's inputs that agree
 * with it more closely than independent measurements would are reported as
 * `too-close`, not as a replication.
 *
 * @internal
 */

import { readFileSync } from 'node:fs';
import { DIMENSIONLESS, type Dimension } from '../../dimensional/types.js';
import type { ExprNode } from '../../dimensional/ast-types.js';
import { equals, format } from '../../dimensional/algebra.js';
import { convertValue, parseUnit, UnitError } from '../../dimensional/units.js';
import { parseFormula } from '../../numerical/formula.js';
import { builtinFormulaDimensionChecker } from '../../numerical/formula-dimension.js';
import { evalExpr } from '../expr-eval.js';
import type { SearchBudget, SearchStopReason } from './types.js';
import { SCHEMA_VERSION } from './types.js';
import { datasetFromRows } from './dataset.js';
import { problemFromResidualGap } from './frontier.js';
import { isGapKind, makeResidualGap } from './problem.js';
import { NO_HOLDOUT_WORDING, runProbeSearch } from './pipeline.js';
import { bodyExpression } from './fingerprint.js';
import { canonicalJson, hashCanonical } from './serialize.js';

/** The partition a study row belongs to for fitting, holdout testing or replication. @internal */
export type StudyRole = 'exploratory' | 'holdout' | 'replication';

/** Where the observations came from. `synthetic` is declared, never inferred. @internal */
export interface StudyProvenance {
  readonly synthetic: boolean;
  readonly source: string;
  readonly acquisition?: string;
  readonly calibration?: string;
}

/** A named variable in a study, with its unit conversion and optional input uncertainty. @internal */
export interface StudyQuantity {
  readonly name: string;
  readonly unit: string;
  readonly dim: Dimension;
  /** Declared unit → SI coherent unit. */
  readonly scale: number;
  /** Default σ of this input on every row, SI; absent = the input is exact. */
  readonly sigma?: number;
}

/** One observation, converted to SI coherent units. @internal */
export interface StudyObservation {
  readonly id: string;
  readonly role: StudyRole;
  readonly source: string;
  readonly inputs: Readonly<Record<string, number>>;
  readonly observed: number;
  readonly sigma: number;
  /** σ of each input that has one on this row, SI. */
  readonly inputSigma: Readonly<Record<string, number>>;
}

/** A declared family y = m(x)·(1 + Σ c_k·u^p_k) in one dimensionless input u. @internal */
export interface StudyCorrection {
  readonly input: string;
  readonly powers: readonly number[];
}

/** A declared comparison model formula and whether its scale is fit on exploratory rows. @internal */
export interface StudyBaseline {
  readonly name: string;
  readonly formula: string;
  readonly fitPrefactor: boolean;
}

/** A parsed, validated study. All numbers are SI coherent. @internal */
export interface ProbeStudy {
  readonly source: string;
  readonly gap: { readonly id: string; readonly kind: string; readonly summary: string };
  readonly provenance: StudyProvenance;
  readonly target: StudyQuantity;
  readonly governing: readonly StudyQuantity[];
  readonly observations: readonly StudyObservation[];
  readonly baselines: readonly StudyBaseline[];
  readonly alpha: number;
  readonly design?: Readonly<Record<string, { min: number; max: number; steps: number }>>;
  /** The declared families, in the declared order (one object in the file is a list of one). */
  readonly correction?: readonly StudyCorrection[];
  /** Set when the replication rows came from a separate file. */
  readonly replication?: { readonly source: string; readonly provenance: StudyProvenance };
}

/** The study file was refused: bad units, missing σ, leakage, undeclared keys. @internal */
export class StudyRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudyRefusal';
  }
}

const DEFAULT_ALPHA = 0.001;
const TOP_KEYS = new Set([
  'description', 'gap', 'provenance', 'target', 'governing', 'observations', 'baselines', 'criterion', 'design',
  'correction',
]);
const ROW_KEYS = new Set(['id', 'role', 'source', 'values', 'observed', 'sigma', 'inputSigma', 'note']);
/** The keys a separate replication file may carry; the rest belong in the study file. */
const REPLICATION_KEYS = new Set(['description', 'provenance', 'target', 'governing', 'observations']);
const MAX_CORRECTION_TERMS = 6;

function refuse(where: string, why: string): never {
  throw new StudyRefusal(`study refused (${where}): ${why}`);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function quantity(raw: unknown, where: string): StudyQuantity {
  if (!isObject(raw) || !nonEmptyString(raw.name) || typeof raw.unit !== 'string') {
    refuse(where, 'needs {"name", "unit"} ("unit": "" for a dimensionless quantity)');
  }
  let parsed;
  try {
    parsed = parseUnit(raw.unit);
  } catch (e) {
    refuse(where, (e as Error).message);
  }
  if (parsed.affine !== undefined) refuse(where, `declare an absolute unit (K), not '${raw.unit}'`);
  return { name: raw.name, unit: raw.unit, dim: parsed.dim, scale: parsed.scale };
}

/** A number is read in the declared unit; a string may carry its own unit. */
function toSi(raw: unknown, q: StudyQuantity, where: string, reading: 'absolute' | 'difference'): number {
  if (typeof raw !== 'number' && typeof raw !== 'string') refuse(where, 'is not a number or a "value unit" string');
  let v: number;
  try {
    v = convertValue(String(raw), q.unit, reading).value;
  } catch (e) {
    if (e instanceof UnitError) refuse(where, e.message);
    throw e;
  }
  if (!Number.isFinite(v)) refuse(where, 'is not finite');
  return v * q.scale;
}

function positiveSigma(raw: unknown, q: StudyQuantity, where: string): number {
  const s = toSi(raw, q, where, 'difference');
  if (!(s > 0)) refuse(where, 'must be positive');
  return s;
}

function governingQuantity(raw: unknown, where: string): StudyQuantity {
  const q = quantity(raw, where);
  const sigma = (raw as Record<string, unknown>).sigma;
  return sigma === undefined ? q : { ...q, sigma: positiveSigma(sigma, q, `${where}.sigma`) };
}

function parseFamily(raw: unknown, governing: readonly StudyQuantity[], where: string): StudyCorrection {
  if (!isObject(raw) || !nonEmptyString(raw.input) || !Array.isArray(raw.powers)) {
    refuse(where, 'needs {"input": <dimensionless governing input>, "powers": [p, ...]}');
  }
  for (const k of Object.keys(raw)) {
    if (k !== 'input' && k !== 'powers') refuse(where, `undeclared key '${k}'`);
  }
  const q = governing.find((g) => g.name === raw.input);
  if (!q) refuse(`${where}.input`, `'${raw.input}' is not a declared governing input`);
  if (!equals(q.dim, DIMENSIONLESS)) {
    refuse(`${where}.input`, `'${q.name}' is ${format(q.dim)}; a correction family needs a dimensionless input`);
  }
  const powers = raw.powers;
  if (powers.length === 0 || powers.length > MAX_CORRECTION_TERMS) {
    refuse(`${where}.powers`, `must list 1 to ${MAX_CORRECTION_TERMS} powers`);
  }
  if (!powers.every((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0)) {
    refuse(`${where}.powers`, 'must be positive finite numbers');
  }
  if (new Set(powers).size !== powers.length) refuse(`${where}.powers`, 'must be distinct');
  return { input: q.name, powers };
}

/** One family `{input, powers}`, or a list of them, each in a different dimensionless input. */
function parseCorrection(raw: unknown, governing: readonly StudyQuantity[]): StudyCorrection[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [parseFamily(raw, governing, 'correction')];
  if (raw.length === 0) refuse('correction', 'must list at least one family');
  const families = raw.map((f, i) => parseFamily(f, governing, `correction[${i}]`));
  const seen = new Set<string>();
  for (const [i, f] of families.entries()) {
    if (seen.has(f.input)) refuse(`correction[${i}].input`, `'${f.input}' already has a family; give each input one family`);
    seen.add(f.input);
  }
  const total = families.reduce((s, f) => s + f.powers.length, 0);
  if (total > MAX_CORRECTION_TERMS) {
    refuse('correction', `lists ${total} powers across its families; at most ${MAX_CORRECTION_TERMS}`);
  }
  return families;
}

/** Provenance text compared without case, spacing or punctuation: "Lab A" and "lab-a" are one source. */
const provenanceKey = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function parseProvenance(raw: unknown): StudyProvenance {
  if (!isObject(raw)) refuse('provenance', 'is required: {"synthetic": true|false, "source": "..."}');
  if (typeof raw.synthetic !== 'boolean') {
    refuse('provenance.synthetic', 'must be declared true or false; it is never inferred');
  }
  if (!nonEmptyString(raw.source)) refuse('provenance.source', 'must name where the observations came from');
  return {
    synthetic: raw.synthetic,
    source: raw.source,
    ...(nonEmptyString(raw.acquisition) ? { acquisition: raw.acquisition } : {}),
    ...(nonEmptyString(raw.calibration) ? { calibration: raw.calibration } : {}),
  };
}

function parseBaselines(raw: unknown, target: StudyQuantity, governing: readonly StudyQuantity[]): StudyBaseline[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) refuse('baselines', 'must be an array');
  const dims = Object.fromEntries(governing.map((g) => [g.name, g.dim]));
  const checker = builtinFormulaDimensionChecker();
  return raw.map((b, i) => {
    const where = `baselines[${i}]`;
    if (!isObject(b) || !nonEmptyString(b.name) || !nonEmptyString(b.formula)) {
      refuse(where, 'needs {"name", "formula"}');
    }
    let vars: readonly string[];
    try {
      vars = parseFormula(b.formula).variables;
    } catch (e) {
      refuse(where, (e as Error).message);
    }
    const unknown = vars.filter((v) => !(v in dims));
    if (unknown.length > 0) refuse(where, `formula reads undeclared input(s) ${unknown.join(', ')}`);
    const check = checker.check(b.formula, dims);
    if (!check.ok || !check.dim) refuse(where, check.error ?? 'not dimensionally homogeneous');
    if (!equals(check.dim, target.dim)) {
      refuse(where, `formula is ${format(check.dim)}, but the target '${target.name}' is ${format(target.dim)}`);
    }
    if (b.fitPrefactor !== undefined && typeof b.fitPrefactor !== 'boolean') {
      refuse(`${where}.fitPrefactor`, 'must be true or false');
    }
    return { name: b.name, formula: b.formula, fitPrefactor: b.fitPrefactor === true };
  });
}

function parseDesign(
  raw: unknown,
  governing: readonly StudyQuantity[],
): ProbeStudy['design'] {
  if (raw === undefined) return undefined;
  if (!isObject(raw) || !isObject(raw.variables)) refuse('design', 'needs {"variables": {name: {"min", "max"}}}');
  const byName = new Map(governing.map((g) => [g.name, g]));
  const out: Record<string, { min: number; max: number; steps: number }> = {};
  for (const [name, spec] of Object.entries(raw.variables)) {
    const q = byName.get(name);
    const where = `design.variables.${name}`;
    if (!q) refuse(where, 'is not a declared governing input');
    if (!isObject(spec)) refuse(where, 'needs {"min", "max"}');
    const min = toSi(spec.min, q, `${where}.min`, 'absolute');
    const max = toSi(spec.max, q, `${where}.max`, 'absolute');
    if (min > max) refuse(where, 'has min > max');
    const steps = spec.steps === undefined ? 8 : Number(spec.steps);
    if (!Number.isInteger(steps) || steps < 1) refuse(`${where}.steps`, 'must be a positive integer');
    out[name] = { min, max, steps };
  }
  return out;
}

function parseObservations(
  raw: unknown,
  provenance: StudyProvenance,
  target: StudyQuantity,
  governing: readonly StudyQuantity[],
  defaultSigma: unknown,
): StudyObservation[] {
  if (!Array.isArray(raw) || raw.length === 0) refuse('observations', 'must be a non-empty array');
  const ids = new Set<string>();
  const rows = raw.map((row, i): StudyObservation => {
    const id = isObject(row) && nonEmptyString(row.id) ? row.id : `row-${i + 1}`;
    const where = `observation ${id}`;
    if (!isObject(row)) refuse(where, 'is not an object');
    for (const k of Object.keys(row)) {
      if (!ROW_KEYS.has(k)) refuse(where, `undeclared key '${k}'`);
    }
    if (ids.has(id)) refuse(where, 'duplicate id');
    ids.add(id);
    if (row.role !== 'exploratory' && row.role !== 'holdout' && row.role !== 'replication') {
      refuse(where, `role must be exploratory, holdout or replication (got '${String(row.role)}')`);
    }
    if (!isObject(row.values)) refuse(where, 'needs "values": {input: value}');
    for (const k of Object.keys(row.values)) {
      if (!governing.some((g) => g.name === k)) refuse(`${where} values.${k}`, 'is not a declared governing input');
    }
    const inputs: Record<string, number> = {};
    for (const g of governing) {
      if (!(g.name in row.values)) refuse(where, `is missing input '${g.name}'`);
      inputs[g.name] = toSi(row.values[g.name], g, `${where} values.${g.name}`, 'absolute');
    }
    if (row.observed === undefined) refuse(where, `is missing "observed" (${target.name})`);
    const observed = toSi(row.observed, target, `${where} observed`, 'absolute');
    const sigmaRaw = row.sigma ?? defaultSigma;
    if (sigmaRaw === undefined) {
      refuse(where, 'has no uncertainty: give "sigma" on the row or on the target');
    }
    const sigma = positiveSigma(sigmaRaw, target, `${where} sigma`);
    if (row.inputSigma !== undefined && !isObject(row.inputSigma)) refuse(where, '"inputSigma" must be {input: σ}');
    const rowInputSigma = (row.inputSigma ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(rowInputSigma)) {
      if (!governing.some((g) => g.name === k)) refuse(`${where} inputSigma.${k}`, 'is not a declared governing input');
    }
    const inputSigma: Record<string, number> = {};
    for (const g of governing) {
      const s = rowInputSigma[g.name] === undefined
        ? g.sigma
        : positiveSigma(rowInputSigma[g.name], g, `${where} inputSigma.${g.name}`);
      if (s !== undefined) inputSigma[g.name] = s;
    }
    const source = row.source === undefined ? provenance.source : row.source;
    if (!nonEmptyString(source)) refuse(`${where} source`, 'must be a non-empty string');
    return { id, role: row.role, source, inputs, observed, sigma, inputSigma };
  });
  guardLeakage(rows);
  return rows;
}

/** The data of a row, without its id, role or source: equal keys are the same measurement. */
const dataKey = (r: StudyObservation): string =>
  canonicalJson({ inputs: r.inputs, observed: r.observed, sigma: r.sigma, inputSigma: r.inputSigma });

/** Withheld rows must not repeat fit rows, and replication must be an independent acquisition. */
function guardLeakage(rows: readonly StudyObservation[]): void {
  const fitKeys = new Map<string, string>();
  const fitSources = new Set<string>();
  const studyData = new Map<string, StudyObservation>();
  for (const r of rows) {
    if (r.role !== 'replication') studyData.set(dataKey(r), r);
    if (r.role !== 'exploratory') continue;
    fitKeys.set(canonicalJson(r.inputs), r.id);
    fitSources.add(provenanceKey(r.source));
  }
  for (const r of rows) {
    if (r.role === 'exploratory') continue;
    const copy = r.role === 'replication' ? studyData.get(dataKey(r)) : undefined;
    if (copy !== undefined) {
      refuse(
        `observation ${r.id}`,
        `replication row is identical (inputs, observed, σ) to ${copy.role} row ${copy.id} of source '${copy.source}'; ` +
          'the same data under another source name is not an independent acquisition',
      );
    }
    const twin = fitKeys.get(canonicalJson(r.inputs));
    if (twin !== undefined) {
      refuse(`observation ${r.id}`, `${r.role} row repeats the inputs of exploratory row ${twin}; withheld data must not be fit data`);
    }
    if (r.role === 'replication' && fitSources.has(provenanceKey(r.source))) {
      refuse(
        `observation ${r.id}`,
        `replication row has source '${r.source}', which also supplied exploratory rows; ` +
          'replication must come from an independent acquisition (give it its own "source")',
      );
    }
  }
}

/** Parse and validate a study file. Throws {@link StudyRefusal}. @internal */
export function parseStudy(raw: unknown, source = 'inline'): ProbeStudy {
  if (!isObject(raw)) refuse(source, 'is not a JSON object');
  for (const k of Object.keys(raw)) {
    if (!TOP_KEYS.has(k)) refuse(source, `undeclared top-level key '${k}'`);
  }
  const provenance = parseProvenance(raw.provenance);
  const target = quantity(raw.target, 'target');
  if (!Array.isArray(raw.governing) || raw.governing.length === 0) {
    refuse('governing', 'must be a non-empty array of {"name", "unit"}');
  }
  const governing = raw.governing.map((g, i) => governingQuantity(g, `governing[${i}]`));
  const names = [target.name, ...governing.map((g) => g.name)];
  if (new Set(names).size !== names.length) refuse('governing', 'names must be distinct from each other and from the target');
  const gapRaw = isObject(raw.gap) ? raw.gap : {};
  const gap = {
    id: nonEmptyString(gapRaw.id) ? gapRaw.id : 'fg-study',
    kind: nonEmptyString(gapRaw.kind) ? gapRaw.kind : 'unexplained-observation',
    summary: nonEmptyString(gapRaw.summary) ? gapRaw.summary : `study from ${source}`,
  };
  if (!isGapKind(gap.kind)) refuse('gap.kind', `unknown gap kind '${gap.kind}'`);
  let alpha = DEFAULT_ALPHA;
  if (raw.criterion !== undefined) {
    if (!isObject(raw.criterion) || typeof raw.criterion.alpha !== 'number') {
      refuse('criterion', 'needs {"alpha": number}');
    }
    alpha = raw.criterion.alpha;
    if (!(alpha > 0 && alpha < 1)) refuse('criterion.alpha', 'must be in (0, 1)');
  }
  const targetRaw = raw.target as Record<string, unknown>;
  const observations = parseObservations(raw.observations, provenance, target, governing, targetRaw.sigma);
  const baselines = parseBaselines(raw.baselines, target, governing);
  const design = parseDesign(raw.design, governing);
  const correction = parseCorrection(raw.correction, governing);
  return {
    source,
    gap,
    provenance,
    target,
    governing,
    observations,
    baselines,
    alpha,
    ...(design ? { design } : {}),
    ...(correction ? { correction } : {}),
  };
}

/** Load a study JSON file. @internal */
export function loadStudyFromJson(path: string): ProbeStudy {
  return parseStudy(JSON.parse(readFileSync(path, 'utf8')), path);
}

function readStudyRaw(path: string): unknown {
  const text = readFileSync(path, 'utf8');
  if (/\.csv$/i.test(path)) return studyCsvToRaw(text, path);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw e instanceof SyntaxError ? new SyntaxError(`${path}: ${e.message}`) : e;
  }
}

/**
 * Load a study file (`.csv`, else JSON) and, optionally, a separate
 * replication file with its own provenance. Throws {@link StudyRefusal}.
 *
 * @internal
 */
export function loadStudyFile(path: string, replicationPath?: string): ProbeStudy {
  const study = parseStudy(readStudyRaw(path), path);
  return replicationPath === undefined ? study : attachReplication(study, readStudyRaw(replicationPath), replicationPath);
}

const sameDim = (a: StudyQuantity, b: StudyQuantity) => a.name === b.name && equals(a.dim, b.dim);

/**
 * Add the rows of a separate replication file to a study. The file must
 * declare its own provenance, the study's target and inputs (units may
 * differ), and replication rows only. Its source and acquisition must differ
 * from the study's, and no row may repeat a study row's data.
 *
 * @internal
 */
export function attachReplication(study: ProbeStudy, raw: unknown, source: string): ProbeStudy {
  if (!isObject(raw)) refuse(source, 'is not a JSON object');
  for (const k of Object.keys(raw)) {
    if (!REPLICATION_KEYS.has(k)) {
      refuse(source, `'${k}' belongs in the study file; a replication file carries only ${[...REPLICATION_KEYS].join(', ')}`);
    }
  }
  if (study.observations.some((o) => o.role === 'replication')) {
    refuse(source, `the study ${study.source} already has replication rows; give replication in one place`);
  }
  const rep = parseStudy(raw, source);
  const mine = rep.observations.find((o) => o.role !== 'replication');
  if (mine) refuse(`${source} observation ${mine.id}`, `a replication file holds replication rows only (got '${mine.role}')`);
  if (!sameDim(rep.target, study.target)) {
    refuse(`${source} target`, `must be '${study.target.name}' ${format(study.target.dim)}, as in the study`);
  }
  const names = (qs: readonly StudyQuantity[]) => qs.map((q) => q.name).sort().join(', ');
  if (
    rep.governing.length !== study.governing.length ||
    !study.governing.every((g) => rep.governing.some((r) => sameDim(r, g)))
  ) {
    refuse(`${source} governing`, `must declare the study's inputs {${names(study.governing)}} with the same dimensions (got {${names(rep.governing)}})`);
  }
  if (provenanceKey(rep.provenance.source) === provenanceKey(study.provenance.source)) {
    refuse(`${source} provenance.source`, `is '${rep.provenance.source}', the study's own source; replication must be an independent acquisition`);
  }
  if (
    rep.provenance.acquisition !== undefined &&
    study.provenance.acquisition !== undefined &&
    provenanceKey(rep.provenance.acquisition) === provenanceKey(study.provenance.acquisition)
  ) {
    refuse(`${source} provenance.acquisition`, 'is the study\'s own acquisition; replication must be an independent acquisition');
  }
  const ids = new Set(study.observations.map((o) => o.id));
  const clash = rep.observations.find((o) => ids.has(o.id));
  if (clash) refuse(`${source} observation ${clash.id}`, `id is also used in the study ${study.source}`);
  const observations = [...study.observations, ...rep.observations];
  guardLeakage(observations);
  return { ...study, observations, replication: { source, provenance: rep.provenance } };
}

// --- replication closeness -------------------------------------------------

/** One lower-tail χ² test of replication rows against the study rows they pair with. @internal */
export interface ClosenessTest {
  readonly chi2: number;
  readonly dof: number;
  /** P(χ²_ν ≤ chi2): small when the rows agree better than their σ allows. */
  readonly pLower: number;
  /** pLower < α/2. */
  readonly flagged: boolean;
}

/**
 * Whether replication rows are closer to the study rows at the same inputs
 * than independent measurements with the declared σ can be. @internal
 */
export interface ReplicationIndependence {
  /** Replication rows paired with a study row at the same inputs. */
  readonly pairs: number;
  /** y_rep = y_study: Σ Δy²/(σ_rep² + σ_study²) on ν = pairs. Null without a pair. */
  readonly identity: ClosenessTest | null;
  /** y_rep = a + b·y_study, fit with weights 1/(σ_rep² + b²σ_study²), on ν = pairs − 2. Null below 3 pairs or when degenerate. */
  readonly affine: (ClosenessTest & { readonly slope: number; readonly offset: number }) | null;
  readonly tooClose: boolean;
  readonly reason: string;
}

function sameInputs(a: StudyObservation, b: StudyObservation): boolean {
  const keys = Object.keys(a.inputs);
  if (keys.length !== Object.keys(b.inputs).length) return false;
  return keys.every((k) => {
    const x = a.inputs[k];
    const y = b.inputs[k];
    if (x === undefined || y === undefined) return false;
    const sa = a.inputSigma[k] ?? 0;
    const sb = b.inputSigma[k] ?? 0;
    const tol = sa > 0 || sb > 0 ? 3 * Math.hypot(sa, sb) : 1e-9 * Math.max(Math.abs(x), Math.abs(y));
    return Math.abs(x - y) <= tol;
  });
}

function closeness(chi2: number, dof: number, alpha: number): ClosenessTest {
  const pLower = chiSquareCdf(chi2, dof);
  return { chi2, dof, pLower, flagged: pLower < alpha / 2 };
}

/** Weighted straight line y = a + b·x with the effective variance σ_y² + b²σ_x², iterated from b = 1. */
function affineFit(pts: readonly { x: number; sx: number; y: number; sy: number }[]): { a: number; b: number; chi2: number } | null {
  let b = 1;
  let a = 0;
  for (let it = 0; it < 6; it++) {
    const w = pts.map((p) => 1 / (p.sy ** 2 + b * b * p.sx ** 2));
    const W = w.reduce((s, v) => s + v, 0);
    const xm = pts.reduce((s, p, i) => s + w[i]! * p.x, 0) / W;
    const ym = pts.reduce((s, p, i) => s + w[i]! * p.y, 0) / W;
    const sxx = pts.reduce((s, p, i) => s + w[i]! * (p.x - xm) ** 2, 0);
    const sxy = pts.reduce((s, p, i) => s + w[i]! * (p.x - xm) * (p.y - ym), 0);
    if (!(sxx > 0) || !Number.isFinite(sxy)) return null;
    b = sxy / sxx;
    a = ym - b * xm;
  }
  const chi2 = pts.reduce((s, p) => s + (p.y - a - b * p.x) ** 2 / (p.sy ** 2 + b * b * p.sx ** 2), 0);
  return Number.isFinite(chi2) ? { a, b, chi2 } : null;
}

/**
 * Fisher's test of agreement too good to be true. Each replication row is
 * paired with the first unused study row at the same inputs (within 3·√(σ_x²
 * + σ_x'²) when an input σ is declared, else to 1e-9 relative). Independent
 * acquisitions differ by about their σ, so a χ² far in the lower tail means a
 * copy, or an overstated σ. Two tests, each at α/2: identity (y_rep = y_study)
 * and affine (y_rep = a + b·y_study, which catches a rescaled or shifted copy).
 * Only paired rows are tested: a copy moved to other inputs is not caught.
 *
 * @internal
 */
export function replicationIndependence(observations: readonly StudyObservation[], alpha: number): ReplicationIndependence {
  const reps = observations.filter((o) => o.role === 'replication');
  if (reps.length === 0) {
    return { pairs: 0, identity: null, affine: null, tooClose: false, reason: 'no replication rows; the closeness test did not run' };
  }
  const used = new Set<StudyObservation>();
  const pts: { x: number; sx: number; y: number; sy: number }[] = [];
  for (const r of reps) {
    const s = observations.find((o) => o.role !== 'replication' && !used.has(o) && sameInputs(r, o));
    if (!s) continue;
    used.add(s);
    pts.push({ x: s.observed, sx: s.sigma, y: r.observed, sy: r.sigma });
  }
  const n = pts.length;
  if (n === 0) {
    return {
      pairs: 0,
      identity: null,
      affine: null,
      tooClose: false,
      reason: 'no replication row shares its inputs with a study row; the closeness test did not run',
    };
  }
  const identity = closeness(
    pts.reduce((s, p) => s + (p.y - p.x) ** 2 / (p.sy ** 2 + p.sx ** 2), 0),
    n,
    alpha,
  );
  const fit = n >= 3 ? affineFit(pts) : null;
  const affine = fit ? { ...closeness(fit.chi2, n - 2, alpha), slope: fit.b, offset: fit.a } : null;
  const tooClose = identity.flagged || (affine?.flagged ?? false);
  const cmp = (t: ClosenessTest) => `lower-tail p = ${fmtP(t.pLower)} ${t.flagged ? '<' : '≥'} α/2 = ${alpha / 2}`;
  const parts = [
    n === 1 ? '1 replication row shares its inputs with a study row' : `${n} replication rows share their inputs with study rows`,
    ...(n < reps.length ? [`${reps.length - n} other(s) are at inputs no study row has and are not tested`] : []),
    `identity: Σz² = ${identity.chi2.toPrecision(3)} on ν = ${n}, ${cmp(identity)}`,
    affine
      ? `affine: y_rep = ${affine.offset.toPrecision(3)} + ${affine.slope.toPrecision(6)} · y_study, χ² = ${affine.chi2.toPrecision(3)} on ν = ${n - 2}, ${cmp(affine)}`
      : n < 3
        ? 'affine: not run (needs 3 pairs)'
        : 'affine: not run (the paired study values do not vary)',
  ];
  const verdict = tooClose
    ? 'closer than independent measurements with the declared σ allow — not independent, or σ is overstated'
    : 'no closer than independent measurements with the declared σ would be';
  return { pairs: n, identity, affine, tooClose, reason: `${parts.join('; ')}: ${verdict}` };
}

// --- CSV study files -------------------------------------------------------

const CSV_ROW_COLUMNS = new Set(['id', 'role', 'source', 'sigma', 'note']);

function csvCells(line: string, where: string): string[] {
  const cells: string[] = [];
  let i = 0;
  for (;;) {
    let cell = '';
    if (line[i] === '"') {
      i++;
      for (;;) {
        if (i >= line.length) refuse(where, 'has an unterminated quoted cell');
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        cell += line[i++];
      }
      if (i < line.length && line[i] !== ',') refuse(where, 'has text after a closing quote');
    } else {
      const end = line.indexOf(',', i);
      cell = line.slice(i, end < 0 ? line.length : end);
      i = end < 0 ? line.length : end;
    }
    cells.push(cell.trim());
    if (i >= line.length) return cells;
    i++;
  }
}

/** A declaration value: JSON when it parses as JSON, else the text itself. */
function declValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function setPath(obj: Record<string, unknown>, path: readonly string[], value: unknown, where: string): void {
  let at = obj;
  for (const k of path.slice(0, -1)) {
    if (at[k] === undefined) at[k] = {};
    if (!isObject(at[k])) refuse(where, `'${k}' is already set to a value`);
    at = at[k] as Record<string, unknown>;
  }
  const last = path[path.length - 1]!;
  if (at[last] !== undefined) refuse(where, `'${path.join('.')}' is declared twice`);
  at[last] = value;
}

/**
 * Compile a CSV study into the object {@link parseStudy} reads, so a CSV is
 * refused for exactly the reasons its JSON twin would be.
 *
 * Lines `# key: value` above the header declare the study: `target` names
 * the target column; `target.sigma`, `governing.<input>.sigma` and any other
 * dotted key (`provenance.synthetic`, `provenance.source`, `criterion.alpha`,
 * `baselines`, `design`, `correction`, ...) set that key. A value is JSON
 * when it parses as JSON, else text. The header names `name[unit]` quantity
 * columns (`name[]` when dimensionless) and the reserved columns `id`,
 * `role`, `source`, `sigma` (target σ), `sigma(<input>)` and `note`. An
 * empty cell is an absent value.
 *
 * @internal
 */
export function studyCsvToRaw(text: string, source = 'inline.csv'): Record<string, unknown> {
  const lines = text.split(/\r?\n/).map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => l.trim() !== '');
  const raw: Record<string, unknown> = {};
  let targetName: string | undefined;
  const governingSigma: Record<string, unknown> = {};
  let h = 0;
  for (; h < lines.length && lines[h]!.l.trimStart().startsWith('#'); h++) {
    const { l, n } = lines[h]!;
    const where = `${source} line ${n}`;
    const m = /^\s*#\s*([A-Za-z_][\w.()-]*)\s*:\s?(.*)$/.exec(l);
    if (!m) refuse(where, "a declaration is '# key: value'");
    const [, key, valueText] = m as unknown as [string, string, string];
    const value = declValue(valueText.trim());
    const path = key.split('.');
    if (key === 'target') {
      if (targetName !== undefined) refuse(where, "'target' is declared twice");
      if (!nonEmptyString(value)) refuse(where, "'# target:' names the target column");
      targetName = value;
    } else if (path[0] === 'governing') {
      if (path.length !== 3 || path[2] !== 'sigma') refuse(where, "the only governing declaration is '# governing.<input>.sigma: σ'");
      if (path[1]! in governingSigma) refuse(where, `'${key}' is declared twice`);
      governingSigma[path[1]!] = value;
    } else if (key === 'observations') {
      refuse(where, 'observations are the rows below the header');
    } else {
      setPath(raw, path, value, where);
    }
  }
  if (h >= lines.length) refuse(source, 'has no header row');
  const header = csvCells(lines[h]!.l, `${source} header`);
  if (targetName === undefined) refuse(source, "needs a '# target: <column>' declaration");
  type Column = { kind: 'row'; key: string } | { kind: 'quantity'; name: string; unit: string } | { kind: 'inputSigma'; input: string };
  const seen = new Set<string>();
  const columns: Column[] = header.map((cell) => {
    const where = `${source} header column '${cell}'`;
    let col: Column;
    let name: string;
    const q = /^([A-Za-z_]\w*)\[(.*)\]$/.exec(cell);
    const s = /^sigma\(([A-Za-z_]\w*)\)$/.exec(cell);
    if (CSV_ROW_COLUMNS.has(cell)) {
      col = { kind: 'row', key: cell };
      name = cell;
    } else if (s) {
      col = { kind: 'inputSigma', input: s[1]! };
      name = cell;
    } else if (q) {
      col = { kind: 'quantity', name: q[1]!, unit: q[2]!.trim() };
      name = q[1]!;
    } else {
      refuse(where, `is not ${[...CSV_ROW_COLUMNS].join(', ')}, sigma(<input>) or a quantity 'name[unit]' ('name[]' when dimensionless)`);
    }
    if (seen.has(name)) refuse(where, 'is a duplicate column');
    seen.add(name);
    return col;
  });
  const quantities = columns.filter((c): c is Extract<Column, { kind: 'quantity' }> => c.kind === 'quantity');
  const targetCol = quantities.find((c) => c.name === targetName);
  if (!targetCol) refuse(source, `'# target: ${targetName}' names no 'name[unit]' column`);
  const governing = quantities.filter((c) => c !== targetCol);
  for (const c of columns) {
    if (c.kind === 'inputSigma' && !governing.some((g) => g.name === c.input)) {
      refuse(`${source} header column 'sigma(${c.input})'`, `'${c.input}' is not a governing input column`);
    }
  }
  for (const k of Object.keys(governingSigma)) {
    if (!governing.some((g) => g.name === k)) refuse(`${source} governing.${k}.sigma`, `'${k}' is not a governing input column`);
  }
  if (isObject(raw.target)) {
    for (const k of Object.keys(raw.target)) {
      if (k !== 'sigma') refuse(`${source} target.${k}`, "the target's name and unit come from its column; only 'target.sigma' is declared");
    }
  }
  raw.target = { name: targetCol.name, unit: targetCol.unit, ...(isObject(raw.target) ? raw.target : {}) };
  raw.governing = governing.map((g) => ({
    name: g.name,
    unit: g.unit,
    ...(g.name in governingSigma ? { sigma: governingSigma[g.name] } : {}),
  }));
  raw.observations = lines.slice(h + 1).map(({ l, n }) => {
    const where = `${source} line ${n}`;
    if (l.trimStart().startsWith('#')) refuse(where, 'declarations go above the header row');
    const cells = csvCells(l, where);
    if (cells.length !== columns.length) refuse(where, `has ${cells.length} cells; the header has ${columns.length}`);
    const row: Record<string, unknown> = {};
    const values: Record<string, unknown> = {};
    const inputSigma: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      const cell = cells[i]!;
      if (cell === '') return;
      if (c.kind === 'row') row[c.key] = cell;
      else if (c.kind === 'inputSigma') inputSigma[c.input] = cell;
      else if (c === targetCol) row.observed = cell;
      else values[c.name] = cell;
    });
    row.values = values;
    if (Object.keys(inputSigma).length > 0) row.inputSigma = inputSigma;
    return row;
  });
  return raw;
}

// --- χ² survival function -------------------------------------------------

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  const zz = z - 1;
  let x = LANCZOS[0]!;
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i]! / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** The series for the regularized lower incomplete gamma P(a, x); converges fast for x < a + 1. */
function gammaSeries(a: number, x: number): number {
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  let ap = a;
  let del = 1 / a;
  let sum = del;
  for (let n = 0; n < 1000; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
  }
  return sum * front;
}

/** Regularized upper incomplete gamma Q(a, x). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return Math.max(0, 1 - gammaSeries(a, x));
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return front * h;
}

/** P(χ²_ν ≥ chi2): the probability of a χ² at least this large if the model and σ are right. @internal */
export function chiSquareSurvival(chi2: number, dof: number): number {
  if (!(dof > 0)) throw new RangeError('chiSquareSurvival: dof must be positive');
  if (!(chi2 > 0)) return 1;
  return gammaQ(dof / 2, chi2 / 2);
}

/**
 * P(χ²_ν ≤ chi2), computed directly in the lower tail, where 1 − Q would
 * round a small probability away. @internal
 */
export function chiSquareCdf(chi2: number, dof: number): number {
  if (!(dof > 0)) throw new RangeError('chiSquareCdf: dof must be positive');
  if (!(chi2 > 0)) return 0;
  const a = dof / 2;
  const x = chi2 / 2;
  return x < a + 1 ? Math.min(1, gammaSeries(a, x)) : 1 - gammaQ(a, x);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betaCf(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 1000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function betaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaCf(a, b, x)) / a : 1 - (front * betaCf(b, a, 1 - x)) / b;
}

/** P(F_{d1,d2} ≥ f): the probability of an F ratio at least this large if the extra terms explain nothing. @internal */
export function fSurvival(f: number, d1: number, d2: number): number {
  if (!(d1 > 0 && d2 > 0)) throw new RangeError('fSurvival: degrees of freedom must be positive');
  if (!(f > 0)) return 1;
  if (f === Infinity) return 0;
  return betaI(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

// --- tests of a model on a set of rows -------------------------------------

/** A χ² test of one model on one set of rows. `pass` is null when ν < 1. @internal */
export interface SetTest {
  readonly n: number;
  readonly chi2: number;
  readonly dof: number;
  readonly p: number | null;
  readonly maxAbsZ: number;
  readonly worstRow: string | null;
  readonly pass: boolean | null;
}

/** The category of model being scored in a probe study. @internal */
export type ModelKind = 'candidate' | 'baseline' | 'null';

/** One model scored on each set. Only the exploratory rows ever set its parameter. @internal */
export interface ModelTest {
  readonly id: string;
  readonly kind: ModelKind;
  readonly label: string;
  readonly fittedParameters: number;
  /** SI coherent; 1 for a fixed baseline, the level for the null model. */
  readonly prefactor: number | null;
  readonly exploratory: SetTest | null;
  readonly holdout: SetTest | null;
  readonly replication: SetTest | null;
  readonly error?: string;
}

type Predictor = (inputs: Readonly<Record<string, number>>) => number;

/**
 * The effective σ of one row under a model f: σ_eff² = σ_y² + Σ_i (∂f/∂x_i · σ_xi)²
 * over the inputs with a σ, each derivative by a central difference at the
 * recorded inputs. First order in σ_x: exact for f linear in x_i.
 *
 * @internal
 */
export function effectiveSigma(r: StudyObservation, predict: Predictor): number {
  let v = r.sigma * r.sigma;
  for (const [name, sx] of Object.entries(r.inputSigma)) {
    const x = r.inputs[name]!;
    const h = Math.max(Math.abs(x) * 1e-6, sx * 1e-3);
    const d = (predict({ ...r.inputs, [name]: x + h }) - predict({ ...r.inputs, [name]: x - h })) / (2 * h);
    if (!Number.isFinite(d)) throw new RangeError(`the model's slope in ${name} is not finite on row ${r.id}`);
    v += (d * sx) ** 2;
  }
  return Math.sqrt(v);
}

const hasInputSigma = (rows: readonly StudyObservation[]) => rows.some((r) => Object.keys(r.inputSigma).length > 0);

function testRows(rows: readonly StudyObservation[], predict: Predictor, fitted: number, alpha: number): SetTest {
  let chi2 = 0;
  let maxAbsZ = 0;
  let worstRow: string | null = null;
  for (const r of rows) {
    const z = (r.observed - predict(r.inputs)) / effectiveSigma(r, predict);
    if (!Number.isFinite(z)) throw new RangeError(`prediction is not finite on row ${r.id}`);
    chi2 += z * z;
    if (Math.abs(z) > maxAbsZ) {
      maxAbsZ = Math.abs(z);
      worstRow = r.id;
    }
  }
  const dof = rows.length - fitted;
  const p = dof >= 1 ? chiSquareSurvival(chi2, dof) : null;
  return { n: rows.length, chi2, dof, p, maxAbsZ, worstRow, pass: p === null ? null : p >= alpha };
}

const combine = (basis: readonly Predictor[], coef: readonly number[]): Predictor =>
  (x) => basis.reduce((s, b, j) => s + coef[j]! * b(x), 0);

/** Solve the weighted normal equations for y ≈ Σ a_j·φ_j; null when they are singular. */
function solveWeighted(phi: readonly number[][], y: readonly number[], sigma: readonly number[]): number[] | null {
  const k = phi[0]?.length ?? 0;
  const A = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  phi.forEach((f, i) => {
    const w = 1 / (sigma[i]! * sigma[i]!);
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) A[a]![b]! += w * f[a]! * f[b]!;
      A[a]![k]! += w * f[a]! * y[i]!;
    }
  });
  if (k === 1) return A[0]![0]! > 0 ? [A[0]![1]! / A[0]![0]!] : null;
  // Equilibrate so the pivot test is scale-free, then eliminate with partial pivoting.
  const s = A.map((row, a) => Math.sqrt(row[a]!));
  if (!s.every((v) => v > 0)) return null;
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) A[a]![b]! /= s[a]! * s[b]!;
    A[a]![k]! /= s[a]!;
  }
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    if (Math.abs(A[p]![c]!) < 1e-13) return null;
    [A[c], A[p]] = [A[p]!, A[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const m = A[r]![c]! / A[c]![c]!;
      for (let q = c; q <= k; q++) A[r]![q]! -= m * A[c]![q]!;
    }
  }
  return A.map((row, a) => row[k]! / row[a]! / s[a]!);
}

const EV_ROUNDS = 50;

/**
 * Weighted least squares y ≈ Σ a_j·φ_j(x), from the exploratory rows only.
 * With input σ the weights are 1/σ_eff² of the current fit, iterated to a
 * fixed point (the effective-variance method).
 */
function fitLinear(rows: readonly StudyObservation[], basis: readonly Predictor[]): number[] | null {
  const phi = rows.map((r) =>
    basis.map((b) => {
      const f = b(r.inputs);
      if (!Number.isFinite(f)) throw new RangeError(`model is not finite on exploratory row ${r.id}`);
      return f;
    }),
  );
  const y = rows.map((r) => r.observed);
  let coef = solveWeighted(phi, y, rows.map((r) => r.sigma));
  if (!hasInputSigma(rows)) return coef;
  for (let round = 0; coef !== null && round < EV_ROUNDS; round++) {
    const predict = combine(basis, coef);
    const next = solveWeighted(phi, y, rows.map((r) => effectiveSigma(r, predict)));
    if (next === null) return null;
    const settled = next.every((a, j) => Math.abs(a - coef![j]!) <= 1e-13 * Math.max(Math.abs(a), 1e-300));
    coef = next;
    if (settled) break;
  }
  return coef;
}

interface Split {
  readonly exploratory: readonly StudyObservation[];
  readonly holdout: readonly StudyObservation[];
  readonly replication: readonly StudyObservation[];
}

function split(study: ProbeStudy): Split {
  return {
    exploratory: study.observations.filter((o) => o.role === 'exploratory'),
    holdout: study.observations.filter((o) => o.role === 'holdout'),
    replication: study.observations.filter((o) => o.role === 'replication'),
  };
}

interface FittedModel {
  readonly test: ModelTest;
  readonly predict: Predictor | null;
  /** Fitted coefficients of the basis terms, SI; null when unfit. */
  readonly coef: readonly number[] | null;
}

/** A model as a sum of basis terms; `fit: false` means one fixed term with coefficient 1. */
interface ModelSpec {
  readonly id: string;
  readonly kind: ModelKind;
  readonly label: string;
  readonly basis: readonly Predictor[];
  readonly fit: boolean;
}

/**
 * Fit a model's coefficients on the exploratory rows, then (only if asked)
 * score it on the withheld rows with them frozen.
 */
function scoreModel(spec: ModelSpec, sets: Split, alpha: number, withheld: boolean): FittedModel {
  const { id, kind, label } = spec;
  const k = spec.fit ? spec.basis.length : 0;
  const failed = (error: string): FittedModel => ({
    test: { id, kind, label, fittedParameters: k, prefactor: null, exploratory: null, holdout: null, replication: null, error },
    predict: null,
    coef: null,
  });
  try {
    const coef = spec.fit ? fitLinear(sets.exploratory, spec.basis) : [1];
    if (coef === null) {
      return failed(k === 1
        ? 'model is zero on every exploratory row; no scale can be fit'
        : 'the model\'s terms are degenerate on the exploratory rows; they cannot be fit');
    }
    const predict = combine(spec.basis, coef);
    const on = (rows: readonly StudyObservation[]) => (withheld && rows.length > 0 ? testRows(rows, predict, 0, alpha) : null);
    return {
      test: {
        id,
        kind,
        label,
        fittedParameters: k,
        prefactor: coef[0]!,
        exploratory: sets.exploratory.length > 0 ? testRows(sets.exploratory, predict, k, alpha) : null,
        holdout: on(sets.holdout),
        replication: on(sets.replication),
      },
      predict,
      coef,
    };
  } catch (e) {
    return failed((e as Error).message);
  }
}

/** One step of admitting a correction term. @internal */
export interface CorrectionStep {
  readonly input: string;
  readonly power: number;
  /** Extra-sum-of-squares F = (χ²_{k−1} − χ²_k) / (χ²_k / ν_k); null when not testable. */
  readonly F: number | null;
  readonly dof: number;
  readonly p: number | null;
  readonly admitted: boolean;
  readonly reason: string;
}

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n: number) => [...String(n)].map((d) => SUBSCRIPT[Number(d)]).join('');

/** One admitted term u^p of a correction family. */
interface CorrectionTerm {
  readonly input: string;
  readonly power: number;
}

function correctionBasis(shape: Predictor, terms: readonly CorrectionTerm[]): Predictor[] {
  return [shape, ...terms.map((t) => (x: Readonly<Record<string, number>>) => shape(x) * x[t.input]! ** t.power)];
}

/**
 * Admit the declared terms one at a time, family by family in the declared
 * order and each family's powers in its declared order, while each lowers the
 * exploratory χ² significantly given the terms already admitted: F on
 * (1, ν_k) with p < α. The first term a family fails ends that family; the
 * next family is then tried. The F ratio divides by the residual χ²/ν, so an
 * understated σ does not inflate it.
 */
function admitCorrection(
  shape: Predictor,
  families: readonly StudyCorrection[],
  rows: readonly StudyObservation[],
  alpha: number,
): { terms: CorrectionTerm[]; steps: CorrectionStep[] } {
  const chi2With = (terms: readonly CorrectionTerm[]): number | null => {
    const basis = correctionBasis(shape, terms);
    const coef = fitLinear(rows, basis);
    return coef === null ? null : testRows(rows, combine(basis, coef), terms.length + 1, alpha).chi2;
  };
  const steps: CorrectionStep[] = [];
  const admitted: CorrectionTerm[] = [];
  let prev = chi2With([]);
  families: for (const family of families) {
    for (const power of family.powers) {
      if (prev === null) break families;
      const term = { input: family.input, power };
      const trial = [...admitted, term];
      const dof = rows.length - (trial.length + 1);
      if (dof < 1) {
        steps.push({ ...term, F: null, dof, p: null, admitted: false, reason: 'ν < 1: too few exploratory rows to test another term' });
        break families;
      }
      const cur = chi2With(trial);
      if (cur === null) {
        steps.push({ ...term, F: null, dof, p: null, admitted: false, reason: 'degenerate with the terms before it on the exploratory rows' });
        break;
      }
      const F = cur > 0 ? Math.max(0, prev - cur) / (cur / dof) : Infinity;
      const p = fSurvival(F, 1, dof);
      const ok = p < alpha;
      steps.push({
        ...term,
        F,
        dof,
        p,
        admitted: ok,
        reason: ok ? `admitted: F = ${F.toPrecision(3)} on (1, ${dof}), p = ${fmtP(p)} < α` : `not admitted: F = ${F.toPrecision(3)} on (1, ${dof}), p = ${fmtP(p)} ≥ α`,
      });
      if (!ok) break;
      admitted.push(term);
      prev = cur;
    }
  }
  return { terms: admitted, steps };
}

/** Infix rendering of a scalar ExprNode for reports. */
export function exprToInfix(e: ExprNode): string {
  if (e.kind === 'symbol') return e.name;
  if (e.kind === 'op') {
    const parts = e.args.map((a) => (a.kind === 'op' && a.op !== '^' ? `(${exprToInfix(a)})` : exprToInfix(a)));
    return e.op === '^' ? `${parts[0]}^${parts[1]}` : parts.join(` ${e.op === '*' ? '·' : e.op} `);
  }
  return JSON.stringify(e);
}

// --- the study -------------------------------------------------------------

/** The main holdout verdict assigned after candidate selection. @internal */
export type StudyVerdict = 'no-credible-candidate' | 'refuted-on-holdout' | 'survives-holdout' | 'untested-on-holdout';
/** The separate replication classification assigned after fitting and holdout handling. @internal */
export type ReplicationOutcome =
  | 'survives-replication'
  | 'refuted-on-replication'
  | 'no-replication-data'
  | 'not-tested'
  | 'too-close';

/** A searched candidate's chi-squared results with its credibility judgement and any admitted correction. @internal */
export interface CandidateTest extends ModelTest {
  readonly credible: boolean;
  readonly credibility: string;
  /** Set on a candidate from the declared correction families: m(x)·(1 + Σ c_k·u_k^p_k). */
  readonly correction?: {
    readonly base: string;
    readonly terms: readonly { readonly input: string; readonly power: number; readonly coefficient: number }[];
  };
}

/** How the declared correction families were searched. @internal */
export interface StudyCorrectionReport {
  readonly families: readonly StudyCorrection[];
  readonly criterion: string;
  readonly perCandidate: readonly { readonly base: string; readonly steps: readonly CorrectionStep[]; readonly error?: string }[];
}

/** A proposed next measurement point or the reason no design suggestion was made. @internal */
export interface StudyDesignSuggestion {
  readonly abstained: boolean;
  readonly reason?: string;
  readonly against?: string;
  /** In the declared units of each input. */
  readonly point?: Readonly<Record<string, number>>;
  readonly discrimination?: number;
  readonly sigma?: number;
  readonly maxExploratoryDiscrimination?: number;
  readonly bounds?: 'declared' | 'exploratory-range';
}

/** The full report of a probe study run, including selection, holdout, replication and caveats. @internal */
export interface ProbeStudyResult {
  readonly studyId: string;
  readonly source: string;
  readonly provenance: StudyProvenance;
  readonly alpha: number;
  readonly target: { readonly name: string; readonly unit: string };
  readonly governing: readonly { readonly name: string; readonly unit: string }[];
  readonly counts: { readonly exploratory: number; readonly holdout: number; readonly replication: number };
  /** Set when the replication rows came from a separate file. */
  readonly replicationFile?: { readonly source: string; readonly provenance: StudyProvenance };
  /** `effective-variance` when any row has an input σ; the inputs that do. */
  readonly uncertainty: { readonly method: 'output-only' | 'effective-variance'; readonly inputs: readonly string[] };
  readonly correction: StudyCorrectionReport | null;
  readonly search: {
    readonly stopReason: SearchStopReason;
    readonly generated: number;
    readonly fitted: number;
    readonly rejected: number;
    readonly notes: readonly string[];
  };
  readonly nullModel: ModelTest;
  readonly candidates: readonly CandidateTest[];
  readonly selected: string | null;
  readonly verdict: StudyVerdict;
  readonly verdictReasons: readonly string[];
  readonly replication: ReplicationOutcome;
  /** Whether the replication rows are closer to the study rows than independent data can be. */
  readonly replicationIndependence: ReplicationIndependence;
  readonly baselines: readonly ModelTest[];
  readonly design: StudyDesignSuggestion;
  readonly caveats: readonly string[];
  readonly schemaVersion: string;
}

/** Runtime overrides controlling search budget and the study's test level. @internal */
export interface ProbeStudyOptions {
  readonly budget?: SearchBudget;
  /** Overrides the file's `criterion.alpha`. */
  readonly alpha?: number;
}

function fmtP(p: number | null): string {
  if (p === null) return 'n/a';
  return p === 0 ? '0 (underflow)' : p < 1e-3 ? p.toExponential(1) : p.toPrecision(2);
}

function credibility(
  t: ModelTest,
  nullTest: ModelTest,
  alpha: number,
): { credible: boolean; credibility: string } {
  if (t.error) return { credible: false, credibility: t.error };
  const ex = t.exploratory;
  if (!ex || ex.pass === null) {
    return { credible: false, credibility: 'too few exploratory rows to test a fitted model (ν < 1)' };
  }
  if (!ex.pass) {
    return { credible: false, credibility: `fails on the exploratory rows (p = ${fmtP(ex.p)} < α = ${alpha})` };
  }
  if (nullTest.exploratory?.pass !== false) {
    return {
      credible: false,
      credibility: 'fits, but so does a constant: the exploratory data show no structure for it to explain',
    };
  }
  return { credible: true, credibility: `passes on the exploratory rows (p = ${fmtP(ex.p)} ≥ α = ${alpha}) and the constant model is rejected there` };
}

function designAgainst(
  study: ProbeStudy,
  sets: Split,
  candidate: FittedModel,
  baselines: readonly FittedModel[],
): StudyDesignSuggestion {
  if (!candidate.predict) return { abstained: true, reason: 'no credible candidate to discriminate' };
  const live = baselines
    .filter((b) => b.predict && b.test.exploratory?.pass === true)
    .sort((a, b) => (b.test.exploratory!.p ?? 0) - (a.test.exploratory!.p ?? 0));
  const best = live[0];
  if (!best) {
    return {
      abstained: true,
      reason: baselines.length === 0
        ? 'no baseline declared; nothing to discriminate the candidate against'
        : 'no declared baseline passes on the exploratory rows; none is a live competitor',
    };
  }
  const sigmas = sets.exploratory.map((r) => r.sigma).sort((a, b) => a - b);
  const sigma = sigmas[Math.floor(sigmas.length / 2)]!;
  const grids = study.governing.map((g) => {
    const spec = study.design?.[g.name] ?? (() => {
      const vs = sets.exploratory.map((r) => r.inputs[g.name]!);
      return { min: Math.min(...vs), max: Math.max(...vs), steps: 8 };
    })();
    const steps = spec.min === spec.max ? 1 : Math.max(2, spec.steps);
    return Array.from({ length: steps }, (_, i) => (steps === 1 ? spec.min : spec.min + (i / (steps - 1)) * (spec.max - spec.min)));
  });
  let bestPoint: Record<string, number> | null = null;
  let bestDisc = -1;
  const idx = new Array<number>(grids.length).fill(0);
  const visit = (d: number): void => {
    if (d === grids.length) {
      const point: Record<string, number> = {};
      study.governing.forEach((g, i) => (point[g.name] = grids[i]![idx[i]!]!));
      let disc: number;
      try {
        disc = Math.abs(candidate.predict!(point) - best.predict!(point)) / sigma;
      } catch {
        return;
      }
      if (Number.isFinite(disc) && disc > bestDisc) {
        bestDisc = disc;
        bestPoint = point;
      }
      return;
    }
    for (let i = 0; i < grids[d]!.length; i++) {
      idx[d] = i;
      visit(d + 1);
    }
  };
  visit(0);
  if (bestPoint === null) return { abstained: true, reason: 'neither model is finite anywhere in the design bounds' };
  const chosen: Record<string, number> = bestPoint;
  const maxEx = Math.max(
    ...sets.exploratory.map((r) => Math.abs(candidate.predict!(r.inputs) - best.predict!(r.inputs)) / r.sigma),
  );
  return {
    abstained: false,
    against: best.test.label,
    point: Object.fromEntries(study.governing.map((g) => [g.name, chosen[g.name]! / g.scale])),
    discrimination: bestDisc,
    sigma: sigma / study.target.scale,
    maxExploratoryDiscrimination: maxEx,
    bounds: study.design ? 'declared' : 'exploratory-range',
  };
}

/**
 * Run a study: search and fit on exploratory rows only, then test on withheld
 * rows. Never mutates the study.
 *
 * @internal
 */
export async function runProbeStudy(study: ProbeStudy, opts: ProbeStudyOptions = {}): Promise<ProbeStudyResult> {
  const alpha = opts.alpha ?? study.alpha;
  const sets = split(study);
  const inputsWithSigma = study.governing
    .map((g) => g.name)
    .filter((n) => study.observations.some((o) => n in o.inputSigma));
  // The id hashes the data, not the file paths: the same study as CSV or JSON has one id.
  const { source: _path, replication: repFile, ...content } = study;
  const studyId = `ps-${hashCanonical({ ...content, replicationProvenance: repFile?.provenance ?? null, alpha }).slice(0, 12)}`;

  // The search sees the exploratory rows and nothing else.
  const exploratoryRows = sets.exploratory.map((r) => ({ ...r.inputs, [study.target.name]: r.observed }));
  const gap = makeResidualGap(study.gap.id, study.gap.summary, study.gap.kind as Parameters<typeof makeResidualGap>[2]);
  const problem = problemFromResidualGap(
    gap,
    { name: study.target.name, dim: study.target.dim },
    study.governing.map((g) => ({ name: g.name, dim: g.dim })),
    datasetFromRows(exploratoryRows, study.target.name, 'exploratory-fit', `${studyId}#exploratory`),
    undefined,
  );
  const search = await runProbeSearch(problem, {
    budget: opts.budget,
    runId: `dr-${studyId.slice(3)}`,
    now: '1970-01-01T00:00:00.000Z',
  });

  const nullModel = scoreModel({ id: 'null', kind: 'null', label: 'constant', basis: [() => 1], fit: true }, sets, alpha, false).test;

  const fitted = search.candidates.filter((c) => c.id in search.fits);
  const corr = study.correction;
  const perCandidate: StudyCorrectionReport['perCandidate'][number][] = [];
  const specs = fitted.flatMap((c) => {
    const expr = bodyExpression(c.body);
    const shape: Predictor = (x) => evalExpr(expr, x);
    const label = `ĉ · ${exprToInfix(expr)}`;
    const base = { spec: { id: c.id, kind: 'candidate' as const, label, basis: [shape], fit: true }, complexity: c.complexity.astNodes };
    if (!corr) return [base];
    let admission: ReturnType<typeof admitCorrection>;
    try {
      admission = admitCorrection(shape, corr, sets.exploratory, alpha);
    } catch (e) {
      perCandidate.push({ base: c.id, steps: [], error: (e as Error).message });
      return [base];
    }
    perCandidate.push({ base: c.id, steps: admission.steps });
    const admitted = admission.terms;
    if (admitted.length === 0) return [base];
    const terms = admitted.map((t, j) => `c${sub(j + 1)}·${t.input}^${t.power}`).join(' + ');
    return [
      base,
      {
        spec: {
          id: `${c.id}×(1+${admitted.map((t) => `${t.input}^${t.power}`).join('+')})`,
          kind: 'candidate' as const,
          label: `${label} · (1 + ${terms})`,
          basis: correctionBasis(shape, admitted),
          fit: true,
        },
        complexity: c.complexity.astNodes + 4 * admitted.length,
        correction: { base: c.id, terms: admitted },
      },
    ];
  });
  const correctionOf = (
    s: (typeof specs)[number],
    coef: readonly number[] | null,
  ): Pick<CandidateTest, 'correction'> =>
    'correction' in s && s.correction && coef
      ? {
          correction: {
            base: s.correction.base,
            terms: s.correction.terms.map((t, j) => ({ input: t.input, power: t.power, coefficient: coef[j + 1]! / coef[0]! })),
          },
        }
      : {};
  const scored = specs.map((s) => {
    const m = scoreModel(s.spec, sets, alpha, false);
    return { model: m, spec: s.spec, complexity: s.complexity, extra: correctionOf(s, m.coef), ...credibility(m.test, nullModel, alpha) };
  });
  const credibleOnes = scored
    .filter((s) => s.credible)
    .sort((a, b) => (b.model.test.exploratory!.p! - a.model.test.exploratory!.p!) || a.complexity - b.complexity);
  const chosen = credibleOnes[0];

  const baselines = study.baselines.map((b) => {
    const f = parseFormula(b.formula);
    return scoreModel(
      { id: `baseline:${b.name}`, kind: 'baseline', label: b.name, basis: [(x) => f.evaluate({ ...x })], fit: b.fitPrefactor },
      sets,
      alpha,
      true,
    );
  });

  // Design is computed from exploratory fits only, before any withheld row is read.
  const design = chosen
    ? designAgainst(study, sets, chosen.model, baselines)
    : { abstained: true, reason: 'no credible candidate to discriminate' };

  const verdictReasons: string[] = [];
  let verdict: StudyVerdict;
  let replication: ReplicationOutcome = sets.replication.length === 0 ? 'no-replication-data' : 'not-tested';
  let selected: CandidateTest | null = null;
  const candidates: CandidateTest[] = scored.map((s) => ({ ...s.model.test, credible: s.credible, credibility: s.credibility, ...s.extra }));

  if (!chosen) {
    verdict = 'no-credible-candidate';
    if (fitted.length === 0) {
      verdictReasons.push(`the search produced no candidate that could be fit (search stop: ${search.stopReason})`);
    } else {
      for (const s of scored) verdictReasons.push(`${s.model.test.id}: ${s.credibility}`);
    }
    verdictReasons.push('the withheld rows were not consulted for any candidate');
  } else {
    const withheld = scoreModel(chosen.spec, sets, alpha, true).test;
    selected = { ...withheld, credible: true, credibility: chosen.credibility, ...chosen.extra };
    const i = candidates.findIndex((c) => c.id === selected!.id);
    candidates[i] = selected;
    const h = selected.holdout;
    if (!h) {
      verdict = 'untested-on-holdout';
      verdictReasons.push('the file has no holdout rows; the candidate is credible on exploratory data only');
    } else if (h.pass) {
      verdict = 'survives-holdout';
      const frozen = selected.fittedParameters > 1 ? 'coefficients' : 'prefactor';
      verdictReasons.push(`holdout χ² = ${h.chi2.toPrecision(3)} on ν = ${h.dof} (p = ${fmtP(h.p)} ≥ α = ${alpha}) with the exploratory ${frozen} frozen`);
    } else {
      verdict = 'refuted-on-holdout';
      verdictReasons.push(
        `holdout χ² = ${h.chi2.toPrecision(3)} on ν = ${h.dof} (p = ${fmtP(h.p)} < α = ${alpha}); ` +
          `worst row ${h.worstRow} at ${h.maxAbsZ.toPrecision(3)}σ`,
      );
    }
    const rep = selected.replication;
    if (rep) replication = rep.pass ? 'survives-replication' : 'refuted-on-replication';
  }
  // Rows closer to the study's than independent data can be are not a replication, whatever they agree with.
  const independence = replicationIndependence(study.observations, alpha);
  if (independence.tooClose) replication = 'too-close';
  const corrInputs = corr?.map((c) => `'${c.input}'`).join(', ') ?? '';
  const sharedCalibration =
    repFile?.provenance.calibration !== undefined &&
    study.provenance.calibration !== undefined &&
    provenanceKey(repFile.provenance.calibration) === provenanceKey(study.provenance.calibration);

  const caveats = [
    'A fit is not a mechanism: a candidate that survives a holdout was not refuted by these rows; ' +
      'that does not make it the causal explanation.',
    'Every test assumes independent Gaussian errors with the declared σ; a mis-stated σ changes every verdict.',
    ...(study.baselines.length > 0
      ? ['The baselines are the file author\'s; UPT cannot verify they were chosen before the holdout was seen.']
      : []),
    ...(study.provenance.synthetic
      ? ['SYNTHETIC DATA: these rows were generated, not measured. A result on them is a control of the method, not evidence about nature.']
      : ['The file declares these rows measured; UPT has not verified that provenance.']),
    ...(study.provenance.synthetic || repFile?.provenance.synthetic
      ? ['A synthetic control whose generating law was chosen knowing the answer shows only that the method recovers ' +
          'that law; it is not a blind test of finding an unknown one. UPT ships no blind control.']
      : []),
    ...(repFile
      ? [`The replication rows come from ${repFile.source}, whose provenance is its author's declaration. UPT checked only ` +
          'that its source and acquisition differ from the study\'s (ignoring case, spacing and punctuation), that no row ' +
          'repeats a study row\'s data exactly, and that rows at a study row\'s inputs are not closer to it than their σ ' +
          'allows, as an identical or an affine (rescaled or shifted) copy, each tested at α/2. A copy at altered inputs, ' +
          'or of rows the study does not contain, is not caught.']
      : sets.replication.length > 0
        ? ['The replication rows are in the study file and share its provenance block (calibration included); only their ' +
            'row source differs from the fit rows\'.']
        : []),
    ...(sharedCalibration
      ? [`The replication file declares the study's own calibration ('${study.provenance.calibration}'): whatever that ` +
          'calibration gets wrong, both share, so the replication does not test it.']
      : []),
    ...(inputsWithSigma.length > 0
      ? ['Input σ is propagated to first order (effective variance): exact for a model linear in the input, ' +
          'approximate when the model curves appreciably over ±σ_x.']
      : []),
    ...(corr && corr.length === 1
      ? [`The correction family in ${corrInputs} was declared by the file; only that family was searched, and UPT ` +
          'cannot verify it was declared before the data were seen.']
      : corr
        ? [`The correction families in ${corrInputs} were declared by the file; only those families were searched, and UPT ` +
            'cannot verify they were declared before the data were seen. The families are additive: a cross term (u·v) ' +
            'is not in them, and the order they were declared in decides which terms are tried first.']
        : []),
  ];

  return {
    studyId,
    source: study.source,
    provenance: study.provenance,
    alpha,
    target: { name: study.target.name, unit: study.target.unit },
    governing: study.governing.map((g) => ({ name: g.name, unit: g.unit })),
    counts: { exploratory: sets.exploratory.length, holdout: sets.holdout.length, replication: sets.replication.length },
    ...(repFile ? { replicationFile: repFile } : {}),
    uncertainty: { method: inputsWithSigma.length > 0 ? 'effective-variance' : 'output-only', inputs: inputsWithSigma },
    correction: corr
      ? {
          families: corr,
          criterion:
            `m(x)·(1 + ${corr.map((c) => `Σ c_k·${c.input}^p_k`).join(' + ')}) for each searched monomial m, fit on the ` +
            'exploratory rows only; terms admitted in the declared order' +
            (corr.length > 1 ? ', family by family (the first term a family fails ends that family),' : '') +
            ` while each passes an extra-sum-of-squares F test at p < α = ${alpha}`,
          perCandidate,
        }
      : null,
    search: {
      stopReason: search.stopReason,
      generated: search.candidates.length,
      fitted: fitted.length,
      rejected: search.rejections.length,
      // The search is given no withheld rows by design; the study tests them itself.
      notes: [...new Set(search.wording)].filter((w) => w !== NO_HOLDOUT_WORDING),
    },
    nullModel,
    candidates,
    selected: selected?.id ?? null,
    verdict,
    verdictReasons,
    replication,
    replicationIndependence: independence,
    baselines: baselines.map((b) => b.test),
    design,
    caveats,
    schemaVersion: SCHEMA_VERSION,
  };
}

// --- report ----------------------------------------------------------------

function setLine(name: string, t: SetTest | null): string {
  if (!t) return `${name}: no rows`;
  const verdict = t.pass === null ? 'undecidable (ν < 1)' : t.pass ? 'pass' : 'FAIL';
  const nu = t.dof >= 1 ? `χ²/ν = ${(t.chi2 / t.dof).toPrecision(3)} (ν = ${t.dof})` : `χ² = ${t.chi2.toPrecision(3)}`;
  return `${name}: ${nu}, p = ${fmtP(t.p)}, max |z| = ${t.maxAbsZ.toPrecision(3)}${t.worstRow ? ` at ${t.worstRow}` : ''} — ${verdict}`;
}

function fmtPoint(point: Readonly<Record<string, number>>, governing: ProbeStudyResult['governing']): string {
  return governing.map((g) => `${g.name}=${Number(point[g.name]!.toPrecision(4))}${g.unit ? ` ${g.unit}` : ''}`).join(', ');
}

/** Scientist-facing study report. @internal */
export function formatProbeStudy(r: ProbeStudyResult): string {
  const L: string[] = [];
  L.push(`upt probe study — fit on exploratory rows, test on withheld rows  [study ${r.studyId}]`);
  L.push('⚠ experimental Product B. Not a discovery claim. `upt discover` is the identification funnel.');
  if (r.provenance.synthetic) {
    L.push(`⚠ SYNTHETIC DATA — generated, not measured. source: ${r.provenance.source}`);
  } else {
    L.push(`  data declared measured (not verified by UPT). source: ${r.provenance.source}`);
  }
  if (r.provenance.acquisition) L.push(`  acquisition: ${r.provenance.acquisition}`);
  if (r.provenance.calibration) L.push(`  calibration: ${r.provenance.calibration}`);
  L.push(
    `  rows: ${r.counts.exploratory} exploratory (searched and fit) · ${r.counts.holdout} holdout (withheld) · ` +
      `${r.counts.replication} replication (withheld, independent source)`,
  );
  const rf = r.replicationFile;
  if (rf) {
    L.push(
      rf.provenance.synthetic
        ? `  replication file: ${rf.source} — ⚠ SYNTHETIC DATA, generated, not measured. source: ${rf.provenance.source}`
        : `  replication file: ${rf.source} — declared measured (not verified by UPT). source: ${rf.provenance.source}`,
    );
    if (rf.provenance.acquisition) L.push(`    acquisition: ${rf.provenance.acquisition}`);
  }
  L.push(
    `  criterion: χ² with the declared σ at α = ${r.alpha}. A candidate is credible only if it passes on the ` +
      'exploratory rows and a constant model is rejected there.',
  );
  L.push(
    r.uncertainty.method === 'effective-variance'
      ? `  uncertainty: σ_eff² = σ_y² + Σ_i (∂f/∂x_i · σ_x_i)² over {${r.uncertainty.inputs.join(', ')}} (effective variance; ` +
          'each model\'s own slopes at the recorded inputs, fits reweighted to a fixed point; first order in σ_x)'
      : '  uncertainty: σ on the target only; the inputs are taken as exact',
  );
  L.push('');
  L.push(
    `  search (exploratory rows only): ${r.search.generated} candidate(s) generated, ${r.search.fitted} fit, ` +
      `${r.search.rejected} rejected; stop: ${r.search.stopReason}`,
  );
  for (const n of r.search.notes.slice(0, 6)) L.push(`    ${n}`);
  if (r.correction) {
    L.push(`  declared correction ${r.correction.families.length > 1 ? 'families' : 'family'}: ${r.correction.criterion}`);
    for (const pc of r.correction.perCandidate) {
      const steps = pc.error ?? (pc.steps.map((s) => `${s.input}^${s.power} ${s.reason}`).join('; ') || 'no term tested');
      L.push(`    on ${pc.base}: ${steps}`);
    }
  }
  L.push(`  null model (constant ${r.target.name}) — ${setLine('exploratory', r.nullModel.exploratory)}`);
  L.push('');
  for (const c of r.candidates) {
    const pre = c.prefactor === null ? '' : `, ĉ = ${c.prefactor.toPrecision(5)} (SI)`;
    L.push(`  candidate ${c.id}: ${c.label}${pre}`);
    if (c.correction) {
      L.push(`    ${c.correction.terms.map((t, j) => `c${sub(j + 1)} = ${t.coefficient.toPrecision(4)}`).join(', ')} (fit on exploratory rows)`);
    }
    L.push(`    ${setLine('exploratory', c.exploratory)}`);
    L.push(`    ${c.credible ? 'credible' : 'not credible'}: ${c.credibility}`);
    if (c.id === r.selected) {
      L.push(`    ${setLine('holdout', c.holdout)}`);
      L.push(`    ${setLine('replication', c.replication)}`);
    }
  }
  if (r.candidates.length === 0) L.push('  no candidate could be fit.');
  if (r.baselines.length > 0) {
    L.push('');
    L.push('  baselines (declared by the file; same rows, same criterion):');
    for (const b of r.baselines) {
      const how = b.fittedParameters === 0 ? 'fixed, no fitted parameter' : `prefactor fit on exploratory rows = ${b.prefactor?.toPrecision(5)}`;
      L.push(`    ${b.label}  [${how}]`);
      if (b.error) {
        L.push(`      not evaluable: ${b.error}`);
        continue;
      }
      for (const [name, t] of [['exploratory', b.exploratory], ['holdout', b.holdout], ['replication', b.replication]] as const) {
        L.push(`      ${setLine(name, t)}`);
      }
    }
  }
  L.push('');
  const d = r.design;
  L.push('  discriminating measurement (a suggestion, not evidence):');
  if (d.abstained) {
    L.push(`    abstained: ${d.reason}`);
  } else {
    L.push(
      `    the candidate and '${d.against}' differ most at ${fmtPoint(d.point!, r.governing)}: ` +
        `${d.discrimination!.toPrecision(3)}σ (σ = ${Number(d.sigma!.toPrecision(3))} ${r.target.unit}, the median exploratory ` +
        `${r.uncertainty.method === 'effective-variance' ? 'target σ, input σ not included' : 'σ'}; ` +
        `${d.bounds === 'declared' ? 'declared design bounds' : 'bounds = exploratory range; declare "design" to look beyond it'})`,
    );
    L.push(
      `    on the exploratory rows they differ by at most ${d.maxExploratoryDiscrimination!.toPrecision(2)}σ` +
        (d.maxExploratoryDiscrimination! < 1 ? ': those rows cannot tell them apart' : ''),
    );
  }
  L.push('');
  L.push(`  verdict: ${r.verdict}`);
  for (const why of r.verdictReasons) L.push(`    ${why}`);
  L.push(`  replication: ${r.replication}`);
  if (r.counts.replication > 0) L.push(`    closeness: ${r.replicationIndependence.reason}`);
  L.push('');
  for (const c of r.caveats) L.push(`  ⚠ ${c}`);
  return L.join('\n');
}
