/**
 * Evaluate applied-case outputs and checks from catalog `expr`, `relation`, and
 * `method` fields.
 *
 * @module cases/engine
 */
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { evaluateFormula } from '../bridges/expr-parse.js';
import type { AppliedCaseCheckRecord, AppliedCaseOutputRecord, AppliedCaseRecord } from './catalog.js';
import { CASE_METHODS } from './methods.js';
import { check, requirePositive, type CaseResult } from './types.js';

export type CaseOutputMethod = (
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
) => number | null;

/** True when the record drives outputs through the catalog engine rather than a legacy runner. @internal */
export function usesCatalogEngine(record: AppliedCaseRecord): boolean {
  return record.outputs.some((o) => o.expr !== undefined || o.relation !== undefined || o.method !== undefined);
}

function mergeBindings(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): Record<string, number> {
  const merged: Record<string, number> = { ...inputs };
  for (const [key, value] of Object.entries(outputs)) {
    if (value !== null && Number.isFinite(value)) merged[key] = value;
  }
  return merged;
}

function evalOutputExpr(
  expr: string,
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  return evaluateFormula(expr, mergeBindings(inputs, outputs));
}

function evalRelationOutput(
  relationId: string,
  inputMap: Readonly<Record<string, string>>,
  scope: Record<string, number>,
): number {
  const rel = catalogRelations().find((row) => row.id === relationId);
  if (rel === undefined) throw new Error(`applied case: relation '${relationId}' is not in the catalog`);
  const inputs: Record<string, number> = {};
  for (const [target, expr] of Object.entries(inputMap)) {
    inputs[target] = evaluateFormula(expr, scope);
  }
  return evaluateCatalogRelation(rel, inputs);
}

function evalOutput(
  row: AppliedCaseOutputRecord,
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number | null {
  const bindings = mergeBindings(inputs, outputs);
  if (row.expr !== undefined) return evalOutputExpr(row.expr, inputs, outputs);
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
) {
  const value = evalOutputExpr(row.expr, inputs, outputs);
  return check(row.id, row.premise, row.quantity, value, row.op, row.bound, row.threshold);
}

const SKIN_UNCHECKED = [
  'ρ, μ_r and ε_r are the values at the conductor\'s temperature and at f; τ = l/v assumes one carrier species with one speed',
  'the conductor is planar on the scale of δ (a wire of radius a needs a ≫ δ, not checked here)',
] as const;

/** Run one catalog record whose outputs are wired as expressions or methods. @internal */
export function runAppliedCaseEngine(record: AppliedCaseRecord, inputs: Readonly<Record<string, number>>): CaseResult {
  if (record.id === 'case-skin-depth') {
    requirePositive('case-skin-depth', inputs, [
      'rho_ohm_m',
      'f_Hz',
      'mu_r',
      'eps_r',
      'l_mfp_m',
      'v_carrier_m_per_s',
      'thickness_m',
    ]);
  }
  const outputs: Record<string, number | null> = {};
  for (const row of record.outputs) {
    outputs[row.key] = evalOutput(row, inputs, outputs);
  }
  const scope = mergeBindings(inputs, outputs);
  const checks = record.checks.map((row) => evalCheck(row, inputs, outputs));
  const unchecked = record.id === 'case-skin-depth' ? [...SKIN_UNCHECKED] : [];
  return { outputs, checks, unchecked };
}
