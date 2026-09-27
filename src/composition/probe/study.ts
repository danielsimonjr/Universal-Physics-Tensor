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
 * @internal
 */

import { readFileSync } from 'node:fs';
import type { Dimension } from '../../dimensional/types.js';
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

export type StudyRole = 'exploratory' | 'holdout' | 'replication';

/** Where the observations came from. `synthetic` is declared, never inferred. @internal */
export interface StudyProvenance {
  readonly synthetic: boolean;
  readonly source: string;
  readonly acquisition?: string;
  readonly calibration?: string;
}

export interface StudyQuantity {
  readonly name: string;
  readonly unit: string;
  readonly dim: Dimension;
  /** Declared unit → SI coherent unit. */
  readonly scale: number;
}

/** One observation, converted to SI coherent units. @internal */
export interface StudyObservation {
  readonly id: string;
  readonly role: StudyRole;
  readonly source: string;
  readonly inputs: Readonly<Record<string, number>>;
  readonly observed: number;
  readonly sigma: number;
}

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
]);
const ROW_KEYS = new Set(['id', 'role', 'source', 'values', 'observed', 'sigma', 'note']);

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
    const sigma = toSi(sigmaRaw, target, `${where} sigma`, 'difference');
    if (!(sigma > 0)) refuse(`${where} sigma`, 'must be positive');
    const source = row.source === undefined ? provenance.source : row.source;
    if (!nonEmptyString(source)) refuse(`${where} source`, 'must be a non-empty string');
    return { id, role: row.role, source, inputs, observed, sigma };
  });
  guardLeakage(rows);
  return rows;
}

/** Withheld rows must not repeat fit rows, and replication must be an independent acquisition. */
function guardLeakage(rows: readonly StudyObservation[]): void {
  const fitKeys = new Map<string, string>();
  const fitSources = new Set<string>();
  for (const r of rows) {
    if (r.role !== 'exploratory') continue;
    fitKeys.set(canonicalJson(r.inputs), r.id);
    fitSources.add(r.source);
  }
  for (const r of rows) {
    if (r.role === 'exploratory') continue;
    const twin = fitKeys.get(canonicalJson(r.inputs));
    if (twin !== undefined) {
      refuse(`observation ${r.id}`, `${r.role} row repeats the inputs of exploratory row ${twin}; withheld data must not be fit data`);
    }
    if (r.role === 'replication' && fitSources.has(r.source)) {
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
  const governing = raw.governing.map((g, i) => quantity(g, `governing[${i}]`));
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
  };
}

/** Load a study JSON file. @internal */
export function loadStudyFromJson(path: string): ProbeStudy {
  return parseStudy(JSON.parse(readFileSync(path, 'utf8')), path);
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

/** Regularized upper incomplete gamma Q(a, x). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 0; n < 1000; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return Math.max(0, 1 - sum * front);
  }
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

function testRows(rows: readonly StudyObservation[], predict: Predictor, fitted: number, alpha: number): SetTest {
  let chi2 = 0;
  let maxAbsZ = 0;
  let worstRow: string | null = null;
  for (const r of rows) {
    const z = (r.observed - predict(r.inputs)) / r.sigma;
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

/** Weighted least-squares c in y ≈ c·f(x), from the exploratory rows only. */
function fitScale(rows: readonly StudyObservation[], shape: Predictor): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const f = shape(r.inputs);
    if (!Number.isFinite(f)) throw new RangeError(`model is not finite on exploratory row ${r.id}`);
    const w = 1 / (r.sigma * r.sigma);
    num += w * f * r.observed;
    den += w * f * f;
  }
  return den > 0 ? num / den : null;
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
}

/**
 * Fit a model's scale on the exploratory rows, then (only if asked) score it on
 * the withheld rows with that scale frozen.
 */
function scoreModel(
  id: string,
  kind: ModelKind,
  label: string,
  shape: Predictor,
  fitPrefactor: boolean,
  sets: Split,
  alpha: number,
  withheld: boolean,
): FittedModel {
  try {
    const c = fitPrefactor ? fitScale(sets.exploratory, shape) : 1;
    if (c === null) {
      return {
        test: { id, kind, label, fittedParameters: 1, prefactor: null, exploratory: null, holdout: null, replication: null, error: 'model is zero on every exploratory row; no scale can be fit' },
        predict: null,
      };
    }
    const predict: Predictor = (x) => c * shape(x);
    const k = fitPrefactor ? 1 : 0;
    const on = (rows: readonly StudyObservation[]) => (withheld && rows.length > 0 ? testRows(rows, predict, 0, alpha) : null);
    return {
      test: {
        id,
        kind,
        label,
        fittedParameters: k,
        prefactor: c,
        exploratory: sets.exploratory.length > 0 ? testRows(sets.exploratory, predict, k, alpha) : null,
        holdout: on(sets.holdout),
        replication: on(sets.replication),
      },
      predict,
    };
  } catch (e) {
    return {
      test: { id, kind, label, fittedParameters: fitPrefactor ? 1 : 0, prefactor: null, exploratory: null, holdout: null, replication: null, error: (e as Error).message },
      predict: null,
    };
  }
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

export type StudyVerdict = 'no-credible-candidate' | 'refuted-on-holdout' | 'survives-holdout' | 'untested-on-holdout';
export type ReplicationOutcome = 'survives-replication' | 'refuted-on-replication' | 'no-replication-data' | 'not-tested';

export interface CandidateTest extends ModelTest {
  readonly credible: boolean;
  readonly credibility: string;
}

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

/** @internal */
export interface ProbeStudyResult {
  readonly studyId: string;
  readonly source: string;
  readonly provenance: StudyProvenance;
  readonly alpha: number;
  readonly target: { readonly name: string; readonly unit: string };
  readonly governing: readonly { readonly name: string; readonly unit: string }[];
  readonly counts: { readonly exploratory: number; readonly holdout: number; readonly replication: number };
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
  readonly baselines: readonly ModelTest[];
  readonly design: StudyDesignSuggestion;
  readonly caveats: readonly string[];
  readonly schemaVersion: string;
}

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
  const studyId = `ps-${hashCanonical({ ...study, alpha }).slice(0, 12)}`;

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

  const nullModel = scoreModel('null', 'null', 'constant', () => 1, true, sets, alpha, false).test;

  const fitted = search.candidates.filter((c) => c.id in search.fits);
  const scored = fitted.map((c) => {
    const expr = bodyExpression(c.body);
    const shape: Predictor = (x) => evalExpr(expr, x);
    const m = scoreModel(c.id, 'candidate', `ĉ · ${exprToInfix(expr)}`, shape, true, sets, alpha, false);
    return { model: m, shape, complexity: c.complexity, ...credibility(m.test, nullModel, alpha) };
  });
  const credibleOnes = scored
    .filter((s) => s.credible)
    .sort((a, b) => (b.model.test.exploratory!.p! - a.model.test.exploratory!.p!) || a.complexity.astNodes - b.complexity.astNodes);
  const chosen = credibleOnes[0];

  const baselines = study.baselines.map((b) => {
    const f = parseFormula(b.formula);
    return scoreModel(`baseline:${b.name}`, 'baseline', b.name, (x) => f.evaluate({ ...x }), b.fitPrefactor, sets, alpha, true);
  });

  // Design is computed from exploratory fits only, before any withheld row is read.
  const design = chosen
    ? designAgainst(study, sets, chosen.model, baselines)
    : { abstained: true, reason: 'no credible candidate to discriminate' };

  const verdictReasons: string[] = [];
  let verdict: StudyVerdict;
  let replication: ReplicationOutcome = sets.replication.length === 0 ? 'no-replication-data' : 'not-tested';
  let selected: CandidateTest | null = null;
  const candidates: CandidateTest[] = scored.map((s) => ({ ...s.model.test, credible: s.credible, credibility: s.credibility }));

  if (!chosen) {
    verdict = 'no-credible-candidate';
    if (fitted.length === 0) {
      verdictReasons.push(`the search produced no candidate that could be fit (search stop: ${search.stopReason})`);
    } else {
      for (const s of scored) verdictReasons.push(`${s.model.test.id}: ${s.credibility}`);
    }
    verdictReasons.push('the withheld rows were not consulted for any candidate');
  } else {
    const withheld = scoreModel(chosen.model.test.id, 'candidate', chosen.model.test.label, chosen.shape, true, sets, alpha, true).test;
    selected = { ...withheld, credible: true, credibility: chosen.credibility };
    const i = candidates.findIndex((c) => c.id === selected!.id);
    candidates[i] = selected;
    const h = selected.holdout;
    if (!h) {
      verdict = 'untested-on-holdout';
      verdictReasons.push('the file has no holdout rows; the candidate is credible on exploratory data only');
    } else if (h.pass) {
      verdict = 'survives-holdout';
      verdictReasons.push(`holdout χ² = ${h.chi2.toPrecision(3)} on ν = ${h.dof} (p = ${fmtP(h.p)} ≥ α = ${alpha}) with the exploratory prefactor frozen`);
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
  ];

  return {
    studyId,
    source: study.source,
    provenance: study.provenance,
    alpha,
    target: { name: study.target.name, unit: study.target.unit },
    governing: study.governing.map((g) => ({ name: g.name, unit: g.unit })),
    counts: { exploratory: sets.exploratory.length, holdout: sets.holdout.length, replication: sets.replication.length },
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
  L.push(
    `  criterion: χ² with the declared σ at α = ${r.alpha}. A candidate is credible only if it passes on the ` +
      'exploratory rows and a constant model is rejected there.',
  );
  L.push('');
  L.push(
    `  search (exploratory rows only): ${r.search.generated} candidate(s) generated, ${r.search.fitted} fit, ` +
      `${r.search.rejected} rejected`,
  );
  for (const n of r.search.notes.slice(0, 6)) L.push(`    ${n}`);
  L.push(`  null model (constant ${r.target.name}) — ${setLine('exploratory', r.nullModel.exploratory)}`);
  L.push('');
  for (const c of r.candidates) {
    const pre = c.prefactor === null ? '' : `, ĉ = ${c.prefactor.toPrecision(5)} (SI)`;
    L.push(`  candidate ${c.id}: ${c.label}${pre}`);
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
        `${d.discrimination!.toPrecision(3)}σ (σ = ${Number(d.sigma!.toPrecision(3))} ${r.target.unit}, the median exploratory σ; ` +
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
  L.push('');
  for (const c of r.caveats) L.push(`  ⚠ ${c}`);
  return L.join('\n');
}
