/**
 * BE-53 confrontation request.
 *
 * The bridge evaluator returns the one-loop coefficient. A confrontation
 * exists only when the caller supplies both a measured-coupling table and a
 * running procedure whose record states a loop order and flavor thresholds.
 * The one-loop formula is not that procedure. A refusal names the missing
 * inputs and carries no residual. It does not change the bridge's catalog
 * status, and it is not a pass and not a fail.
 *
 * @module bridges/be53-yang-mills-confrontation
 */
import type { ConfrontationOutcome } from './observations/types.js';
import { residualInSigma } from './observations/types.js';
import { evaluateYangMillsBeta } from './equations/be-53-yang-mills-beta.js';

/** One row of a caller-supplied measured-coupling table. @public */
export interface MeasuredCouplingRow {
  /** Scale at which the coupling was measured. */
  readonly scale: number;
  /** Central value at `scale`. */
  readonly value: number;
  /** Uncertainty on `value`. Must be finite and greater than 0. */
  readonly uncertainty: number;
  /** Citation for this row, as the caller states it. */
  readonly citation: string;
}

/** What a running procedure must state before it can be compared. @public */
export interface RunningProcedureRecord {
  /** Loop order of the running, as the caller states it. */
  readonly loopOrder: string;
  /** Flavor thresholds of the running, as the caller states them. */
  readonly flavorThresholds: string;
}

/**
 * A caller-supplied running procedure. `at` returns the procedure's coupling
 * at a scale. It is not `evaluateYangMillsBeta`.
 *
 * @public
 */
export interface RunningProcedure {
  readonly record: RunningProcedureRecord;
  at(scale: number): number;
}

/** What a caller may pass. Absent fields are missing inputs, not defaults. @public */
export interface YangMillsConfrontationRequest {
  readonly table?: readonly MeasuredCouplingRow[] | null;
  /**
   * A running procedure, or the one-loop formula itself. The formula is
   * refused: it does not state a loop order or flavor thresholds.
   */
  readonly procedure?:
    | {
        readonly record?: Partial<RunningProcedureRecord> | null;
        readonly at?: ((scale: number) => number) | typeof evaluateYangMillsBeta;
      }
    | typeof evaluateYangMillsBeta
    | null;
}

/** Refusal: the named inputs are missing, and no residual was computed. @public */
export interface YangMillsConfrontationRefusal {
  readonly status: 'refused';
  readonly missing: readonly string[];
}

/** A comparison that uses an outcome kind the confrontation registry already has. @public */
export interface YangMillsConfrontationHit {
  readonly status: 'confronted';
  readonly outcome: Extract<ConfrontationOutcome, { kind: 'value' }>;
}

/** A Yang-Mills confrontation either refuses with a reason, or reports a value outcome. @public */
export type YangMillsConfrontationResult = YangMillsConfrontationRefusal | YangMillsConfrontationHit;

function blank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The inputs a request does not have. A bare function, including
 * `evaluateYangMillsBeta`, has no loop order and no flavor thresholds.
 */
function missingInputs(request: YangMillsConfrontationRequest): string[] {
  const missing: string[] = [];
  if (request.table == null || request.table.length === 0) missing.push('table');

  const procedure = request.procedure;
  if (procedure == null) {
    missing.push('running procedure');
    return missing;
  }
  if (typeof procedure === 'function' || (procedure.at as unknown) === evaluateYangMillsBeta) {
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
 * Confront BE-53 only with a caller-supplied table and running procedure.
 * Otherwise refuse. The refusal does not read or write the catalog.
 *
 * A table of several rows is one `value` outcome: the row with the largest
 * absolute residual in units of its uncertainty (the earliest row on a tie).
 * Every row is still evaluated, so a procedure that ignores a later scale
 * is visible to the caller who checks `at`.
 *
 * @public
 */
export function requestYangMillsConfrontation(
  request: YangMillsConfrontationRequest = {},
): YangMillsConfrontationResult {
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
