/**
 * A confrontation that exists only when the caller supplies a measured table
 * and a running procedure. A refusal names the missing inputs and carries no
 * residual. It does not change a catalog status.
 *
 * @module bridges/caller-table
 */

import { residualInSigma, type ConfrontationOutcome } from './observations/types.js';

/** One row of a caller-supplied measured table. @public */
export interface MeasuredCouplingRow {
  readonly scale: number;
  readonly value: number;
  readonly uncertainty: number;
  readonly citation: string;
}

/** What a running procedure must state before it can be compared. @public */
export interface RunningProcedureRecord {
  readonly loopOrder: string;
  readonly flavorThresholds: string;
}

/** A caller-supplied running procedure. @public */
export interface RunningProcedure {
  readonly record: RunningProcedureRecord;
  at(scale: number): number;
}

/** What a caller may pass. Absent fields are missing inputs, not defaults. @public */
export interface CallerTableRequest {
  readonly table?: readonly MeasuredCouplingRow[] | null;
  readonly procedure?:
    | {
        readonly record?: Partial<RunningProcedureRecord> | null;
        readonly at?: (scale: number) => number;
      }
    | ((scale: number) => number)
    | null;
}

/** Refusal: the named inputs are missing, and no residual was computed. @public */
export interface CallerTableRefusal {
  readonly status: 'refused';
  readonly missing: readonly string[];
}

/** A comparison that uses a value outcome. @public */
export interface CallerTableHit {
  readonly status: 'confronted';
  readonly outcome: Extract<ConfrontationOutcome, { kind: 'value' }>;
}

/** A caller-table confrontation either refuses or reports a value outcome. @public */
export type CallerTableResult = CallerTableRefusal | CallerTableHit;

function blank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function missingInputs(request: CallerTableRequest): string[] {
  const missing: string[] = [];
  if (request.table == null || request.table.length === 0) missing.push('table');
  const procedure = request.procedure;
  if (procedure == null) {
    missing.push('running procedure');
    return missing;
  }
  if (typeof procedure === 'function') {
    missing.push('loop order', 'flavor thresholds');
    return missing;
  }
  const record = procedure.record;
  if (blank(record?.loopOrder)) missing.push('loop order');
  if (blank(record?.flavorThresholds)) missing.push('flavor thresholds');
  if (typeof procedure.at !== 'function') missing.push('running procedure');
  return missing;
}

function rowProblems(table: readonly MeasuredCouplingRow[]): string[] {
  const missing: string[] = [];
  for (const row of table) {
    if (!finite(row.scale) && !missing.includes('scale')) missing.push('scale');
    if (!finite(row.value) && !missing.includes('value')) missing.push('value');
    if (!(finite(row.uncertainty) && row.uncertainty > 0) && !missing.includes('uncertainty')) {
      missing.push('uncertainty');
    }
    if ((typeof row.citation !== 'string' || row.citation.trim() === '') && !missing.includes('citation')) {
      missing.push('citation');
    }
  }
  return missing;
}

/**
 * Confront a caller-supplied table. Otherwise refuse. The refusal does not
 * read or write the catalog. Several rows collapse to the row with the
 * largest absolute residual in units of its uncertainty.
 *
 * @public
 */
export function requestCallerTableConfrontation(request: CallerTableRequest = {}): CallerTableResult {
  const missing = missingInputs(request);
  if (missing.length > 0) return { status: 'refused', missing };
  const table = request.table ?? [];
  const rowMissing = rowProblems(table);
  if (rowMissing.length > 0) return { status: 'refused', missing: rowMissing };

  const procedure = request.procedure as RunningProcedure;
  let reported: { predicted: number; observed: number; sigma: number; citation: string; residual: number } | undefined;
  for (const row of table) {
    const predicted = procedure.at(row.scale);
    if (!finite(predicted)) return { status: 'refused', missing: ['procedure output'] };
    const residual = residualInSigma(predicted, row.value, row.uncertainty);
    if (reported === undefined || residual > reported.residual) {
      reported = {
        predicted,
        observed: row.value,
        sigma: row.uncertainty,
        citation: row.citation,
        residual,
      };
    }
  }
  if (reported === undefined) return { status: 'refused', missing: ['table'] };

  return {
    status: 'confronted',
    outcome: {
      kind: 'value',
      predicted: reported.predicted,
      observed: reported.observed,
      sigma: reported.sigma,
      residualInSigma: reported.residual,
      withinObserved: reported.residual <= 1,
      units: 'caller-supplied',
      provenance: {
        citation: reported.citation,
        year: 0,
        retrieved: 'not supplied',
        note: 'The caller table states a citation and does not state a publication year or a retrieval date. The year 0 is not a year of record.',
      },
      preprocessing: { state: 'not-recorded' },
      independence: { state: 'not-recorded' },
    },
  };
}
