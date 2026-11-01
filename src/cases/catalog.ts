/**
 * The applied-case catalog: `data/applied-cases.json`, validated at load.
 *
 * @module cases/catalog
 */
import { checkedDataFile, dataSchema, parseDataFile } from '../core/data-file.js';
import { catalogRelations } from '../bridges/catalog-load.js';
import type { JsonSchema } from '../core/json-schema.js';
import type { EvaluatorParameter } from '../bridges/evaluators.js';
import type { AppliedCase, CaseComparison, CaseExample } from './types.js';

/** One catalog check, evaluated through the formula grammar. @internal */
export interface AppliedCaseCheckRecord {
  readonly id: string;
  readonly premise: string;
  readonly quantity: string;
  readonly expr: string;
  readonly op: '<=' | '>=' | '>';
  readonly bound: number;
  readonly threshold: string;
}

/** One catalog output before runtime wiring. @internal */
export interface AppliedCaseOutputRecord {
  readonly key: string;
  readonly symbol: string;
  readonly unit: string;
  readonly meaning: string;
  readonly expr?: string;
  readonly method?: string;
  readonly relation?: { readonly relation: string; readonly inputs: Readonly<Record<string, string>> };
}

/** One applied-case record in the catalog file. @internal */
export interface AppliedCaseRecord {
  readonly id: string;
  readonly title: string;
  readonly parameters: readonly EvaluatorParameter[];
  readonly governing: AppliedCase['governing'];
  readonly observable: string;
  readonly outputs: readonly AppliedCaseOutputRecord[];
  readonly checks: readonly AppliedCaseCheckRecord[];
  readonly conditions: readonly string[];
  readonly comparison?: CaseComparison;
  readonly notIncluded: readonly string[];
  readonly measurement: readonly string[];
  readonly links: readonly { readonly id: string; readonly role: string }[];
  readonly examples: { readonly valid: CaseExample; readonly failures: readonly CaseExample[] };
  readonly regimeAt?: string;
}

/** The on-disk catalog shape. @internal */
export interface AppliedCaseFile {
  readonly schemaVersion: 1;
  readonly cases: readonly AppliedCaseRecord[];
}

const OPS = new Set<AppliedCaseCheckRecord['op']>(['<=', '>=', '>']);

/**
 * Per-case module names B8 deleted. The published package has no `src/`, so
 * this list is the loader's record; {@link isForbiddenCaseModule} and the
 * directory test fail if one of these, or a new `case-*.ts`, comes back.
 */
export const FORBIDDEN_PER_CASE_MODULES = [
  'skin-depth.ts',
  'kepler-rv.ts',
  'damped-resonator.ts',
  'resistor-noise.ts',
  'lumped-cooling.ts',
  'brownian-sphere.ts',
] as const;

/** True for a deleted per-case file or a new `case-*.ts` under `src/cases/`. */
export function isForbiddenCaseModule(name: string): boolean {
  return (FORBIDDEN_PER_CASE_MODULES as readonly string[]).includes(name)
    || /^case-.+\.ts$/.test(name);
}

/**
 * Parse and validate catalog text. Schema problems and semantic problems throw
 * with every message listed.
 * @internal
 */
export function readAppliedCaseFile(text: string, schema: JsonSchema = dataSchema('applied-cases.json')): AppliedCaseFile {
  const parsed = parseDataFile('applied-cases.json', text, schema) as AppliedCaseFile;
  catalogSemanticProblems(parsed).forEach((msg) => {
    throw new Error(msg);
  });
  return parsed;
}

/** Semantic rules a schema cannot state. @internal */
export function catalogSemanticProblems(file: AppliedCaseFile, methodNames?: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const row of file.cases) {
    if (row.id.length === 0) problems.push('applied-cases: a case is missing id');
    if (seen.has(row.id)) problems.push(`applied-cases: duplicate id '${row.id}'`);
    seen.add(row.id);
    for (const check of row.checks) {
      if (!OPS.has(check.op)) problems.push(`${row.id}: check '${check.id}' has unknown op '${check.op}'`);
      if (check.expr.trim().length === 0) problems.push(`${row.id}: check '${check.id}' has no expr`);
    }
    if (methodNames !== undefined) {
      for (const output of row.outputs) {
        const kinds = [output.expr !== undefined, output.relation !== undefined, output.method !== undefined].filter(Boolean).length;
        if (kinds !== 1) {
          problems.push(`${row.id}: output '${output.key}' must have exactly one of expr, relation, method`);
        } else if (output.method !== undefined && !methodNames.has(output.method)) {
          problems.push(`${row.id}: output '${output.key}' names unknown method '${output.method}'`);
        } else if (output.relation !== undefined) {
          const rel = catalogRelations().find((r) => r.id === output.relation!.relation);
          if (rel === undefined) {
            problems.push(`${row.id}: output '${output.key}' names unknown relation '${output.relation.relation}'`);
          }
        }
      }
    }
  }
  return problems;
}

/** `data/applied-cases.json`, checked once per process. @internal */
export function appliedCaseCatalog(): AppliedCaseFile {
  return checkedDataFile('applied-cases.json') as AppliedCaseFile;
}

/** One record by id; throws when the id is absent. @internal */
export function appliedCaseRecord(id: string): AppliedCaseRecord {
  const row = appliedCaseCatalog().cases.find((c) => c.id === id);
  if (row === undefined) throw new Error(`applied-cases.json: no case '${id}'`);
  return row;
}

/** Declarative fields of an {@link AppliedCase} as a catalog record (no `run`). @internal */
export function projectAppliedCaseRecord(
  c: AppliedCase,
  checks: readonly AppliedCaseCheckRecord[],
): AppliedCaseRecord {
  const { run: _run, regimeAt: _regime, ...rest } = c;
  return {
    ...rest,
    outputs: rest.outputs.map((o) => ({ key: o.key, symbol: o.symbol, unit: o.unit, meaning: o.meaning })),
    checks: [...checks],
  };
}

/** Attach a runtime implementation to a catalog record. @internal */
export function assembleAppliedCase(
  record: AppliedCaseRecord,
  impl: Pick<AppliedCase, 'run'> & { regimeAt?: AppliedCase['regimeAt'] },
): AppliedCase {
  return {
    id: record.id,
    title: record.title,
    parameters: record.parameters,
    governing: record.governing,
    observable: record.observable,
    outputs: record.outputs.map((o) => ({ key: o.key, symbol: o.symbol, unit: o.unit, meaning: o.meaning })),
    conditions: record.conditions,
    comparison: record.comparison,
    notIncluded: record.notIncluded,
    measurement: record.measurement,
    links: record.links,
    examples: record.examples,
    regimeAt: impl.regimeAt,
    run: impl.run,
  };
}

/** Every catalog id in file order. @internal */
export function appliedCaseIds(): readonly string[] {
  return appliedCaseCatalog().cases.map((c) => c.id);
}
