/**
 * Evaluate applied-case outputs and checks from catalog `expr`, `relation`, and
 * `method` fields.
 *
 * @module cases/engine
 */
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { evaluateFormula } from '../bridges/expr-parse.js';
import { convertValue } from '../dimensional/units.js';
import type { AppliedCaseCheckRecord, AppliedCaseOutputRecord, AppliedCaseRecord } from './catalog.js';
import { CASE_METHODS } from './methods.js';
import { check, requirePositive, type CaseCheck, type CaseResult } from './types.js';

export type CaseOutputMethod = (
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
) => number | null;

const DELEGATED_RUN_METHODS = new Set(['runCaseResistorNoise', 'runCaseLumpedCooling', 'runCaseBrownianSphere']);

const ENGINE_CASE_IDS = new Set(['case-skin-depth', 'case-kepler-rv', 'case-damped-resonator']);

/** True when the record drives outputs through the catalog engine rather than a legacy runner. @internal */
export function usesCatalogEngine(record: AppliedCaseRecord): boolean {
  if (ENGINE_CASE_IDS.has(record.id)) return true;
  const wired = (o: AppliedCaseOutputRecord) =>
    o.expr !== undefined || o.relation !== undefined || o.method !== undefined;
  if (!record.outputs.every(wired)) return false;
  if (record.outputs.every((o) => o.method !== undefined && DELEGATED_RUN_METHODS.has(o.method!))) return false;
  return record.outputs.some(
    (o) =>
      o.expr !== undefined ||
      o.relation !== undefined ||
      (o.method !== undefined && !DELEGATED_RUN_METHODS.has(o.method)),
  );
}

function mergeBindings(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
  extra: Readonly<Record<string, number>> = {},
): Record<string, number> {
  const merged: Record<string, number> = { ...inputs, ...extra };
  for (const [key, value] of Object.entries(outputs)) {
    if (value !== null && Number.isFinite(value)) merged[key] = value;
  }
  return merged;
}

function evalOutputExpr(
  expr: string,
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
  extra: Readonly<Record<string, number>> = {},
): number {
  return evaluateFormula(expr, mergeBindings(inputs, outputs, extra));
}

function evalRelationOutput(
  relationId: string,
  inputMap: Readonly<Record<string, string>>,
  scope: Record<string, number>,
): number {
  const rel = catalogRelations().find((row) => row.id === relationId);
  if (rel === undefined) throw new Error(`applied case: relation '${relationId}' is not in the catalog`);
  const relInputs: Record<string, number> = {};
  for (const [target, expr] of Object.entries(inputMap)) {
    relInputs[target] = evaluateFormula(expr, scope);
  }
  return evaluateCatalogRelation(rel, relInputs);
}

function evalOutput(
  row: AppliedCaseOutputRecord,
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
  extra: Readonly<Record<string, number>> = {},
): number | null {
  const bindings = mergeBindings(inputs, outputs, extra);
  if (row.expr !== undefined) return evalOutputExpr(row.expr, inputs, outputs, extra);
  if (row.relation !== undefined) return evalRelationOutput(row.relation.relation, row.relation.inputs, bindings);
  if (row.method !== undefined) {
    const fn = CASE_METHODS[row.method] as CaseOutputMethod | undefined;
    if (fn === undefined) throw new Error(`applied case: unknown method '${row.method}'`);
    return fn(inputs, outputs);
  }
  throw new Error(`applied case: output '${row.key}' has no expr, relation, or method`);
}

function evalCheck(
  row: AppliedCaseCheckRecord,
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
  extra: Readonly<Record<string, number>> = {},
) {
  const value = evalOutputExpr(row.expr, inputs, outputs, extra);
  return check(row.id, row.premise, row.quantity, value, row.op, row.bound, row.threshold);
}

const SKIN_UNCHECKED = [
  'ρ, μ_r and ε_r are the values at the conductor\'s temperature and at f; τ = l/v assumes one carrier species with one speed',
  'the conductor is planar on the scale of δ (a wire of radius a needs a ≫ δ, not checked here)',
] as const;

const KEPLER_UNCHECKED = [
  'no third body: an outer companion adds its own reflex signal and perturbs P and ω',
  'the companion\'s radius is also small beside r_p (only the star\'s is checked)',
] as const;

const DAMPED_UNDERDAMPED_OUTPUTS = new Set([
  'f_d_Hz',
  'x_m',
  'envelope_m',
  'linewidth_windowed_Hz',
  'windowed_excess',
]);

const DAMPED_DEFERRED_OUTPUTS = new Set(['x_th_rms_m', 'envelope_rms_m']);

function validateKeplerInputs(id: string, inputs: Readonly<Record<string, number>>): Record<string, number> {
  requirePositive(id, inputs, ['M_star_kg', 'm_p_kg', 'P_s', 'sin_i', 'R_star_m', 'T_obs_s']);
  const e = inputs.eccentricity;
  if (!Number.isFinite(e) || e < 0 || e >= 1) throw new Error(`${id}: eccentricity must be in [0, 1) (got ${e})`);
  if (inputs.sin_i! > 1) throw new Error(`${id}: sin_i must be in (0, 1] (got ${inputs.sin_i})`);
  return { julian_year_s: convertValue('1 yr', 's').value };
}

function validateDampedInputs(id: string, inputs: Readonly<Record<string, number>>): { underdamped: boolean } {
  requirePositive(id, inputs, ['f0_Hz', 'Q', 't_obs_s']);
  const { x0_m: x0, t_s: t } = inputs;
  if (!Number.isFinite(x0)) throw new Error(`${id}: x0_m must be finite (got ${x0})`);
  if (!Number.isFinite(t) || t! < 0) throw new Error(`${id}: t_s must be a finite number ≥ 0 (got ${t})`);
  if ((inputs.T_K === undefined) !== (inputs.k_N_per_m === undefined)) {
    throw new Error(`${id}: give T_K and k_N_per_m together, or neither`);
  }
  return { underdamped: inputs.Q! > 0.5 };
}

function runDampedEngine(record: AppliedCaseRecord, inputs: Readonly<Record<string, number>>): CaseResult {
  const { underdamped } = validateDampedInputs(record.id, inputs);
  const outputs: Record<string, number | null> = {};
  for (const row of record.outputs) {
    if (DAMPED_DEFERRED_OUTPUTS.has(row.key)) continue;
    if (!underdamped && DAMPED_UNDERDAMPED_OUTPUTS.has(row.key)) {
      outputs[row.key] = null;
      continue;
    }
    outputs[row.key] = evalOutput(row, inputs, outputs);
  }
  let xTh: number | null = null;
  if (inputs.T_K !== undefined) {
    requirePositive(record.id, inputs, ['T_K', 'k_N_per_m']);
    xTh = evalOutputExpr('sqrt(k_B*T_K/k_N_per_m)', inputs, outputs);
    outputs.x_th_rms_m = xTh;
    const envelope = outputs.envelope_m;
    outputs.envelope_rms_m =
      envelope === null || xTh === null ? null : evalOutputExpr('sqrt(envelope_m^2 + 2*x_th_rms_m^2)', inputs, outputs);
  } else {
    outputs.x_th_rms_m = null;
    outputs.envelope_rms_m = null;
  }
  const checks: CaseCheck[] = record.checks
    .filter((row) => {
      if (row.id !== 'above-thermal') return true;
      return xTh !== null && outputs.envelope_m !== null;
    })
    .map((row) => evalCheck(row, inputs, outputs));
  const unchecked = underdamped
    ? ['the damping is viscous (velocity-proportional) and the same over the whole ring-down']
    : ['for Q ≤ 1/2 the displacement is x0 (r₂e^{r₁t} − r₁e^{r₂t})/(r₂ − r₁) with real r₁, r₂; this case does not evaluate it'];
  if (inputs.T_K !== undefined) {
    unchecked.push(
      'the thermal motion is in equilibrium with the damping bath at T and uncorrelated with the release; the read-out adds no noise of its own',
    );
  }
  return { outputs, checks, unchecked };
}

/** Run one catalog record whose outputs are wired as expressions or methods. @internal */
export function runAppliedCaseEngine(record: AppliedCaseRecord, inputs: Readonly<Record<string, number>>): CaseResult {
  if (record.id === 'case-damped-resonator') return runDampedEngine(record, inputs);

  let extra: Record<string, number> = {};
  if (record.id === 'case-skin-depth') {
    requirePositive(record.id, inputs, [
      'rho_ohm_m',
      'f_Hz',
      'mu_r',
      'eps_r',
      'l_mfp_m',
      'v_carrier_m_per_s',
      'thickness_m',
    ]);
  } else if (record.id === 'case-kepler-rv') {
    extra = validateKeplerInputs(record.id, inputs);
  }

  const outputs: Record<string, number | null> = {};
  for (const row of record.outputs) {
    outputs[row.key] = evalOutput(row, inputs, outputs, extra);
  }
  const checks = record.checks.map((row) => evalCheck(row, inputs, outputs, extra));
  const unchecked =
    record.id === 'case-skin-depth'
      ? [...SKIN_UNCHECKED]
      : record.id === 'case-kepler-rv'
        ? [...KEPLER_UNCHECKED]
        : [];
  return { outputs, checks, unchecked };
}
