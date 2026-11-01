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
import { check, requirePositive, type CaseResult } from './types.js';

export type CaseOutputMethod = (
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
) => number | null;

const DELEGATED_RUN_METHODS = new Set(['runCaseResistorNoise', 'runCaseLumpedCooling', 'runCaseBrownianSphere']);

const ENGINE_CASE_IDS = new Set(['case-skin-depth', 'case-kepler-rv']);

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

function validateKeplerInputs(id: string, inputs: Readonly<Record<string, number>>): Record<string, number> {
  requirePositive(id, inputs, ['M_star_kg', 'm_p_kg', 'P_s', 'sin_i', 'R_star_m', 'T_obs_s']);
  const e = inputs.eccentricity;
  if (!Number.isFinite(e) || e < 0 || e >= 1) throw new Error(`${id}: eccentricity must be in [0, 1) (got ${e})`);
  if (inputs.sin_i! > 1) throw new Error(`${id}: sin_i must be in (0, 1] (got ${inputs.sin_i})`);
  return { julian_year_s: convertValue('1 yr', 's').value };
}

/** Run one catalog record whose outputs are wired as expressions or methods. @internal */
export function runAppliedCaseEngine(record: AppliedCaseRecord, inputs: Readonly<Record<string, number>>): CaseResult {
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
