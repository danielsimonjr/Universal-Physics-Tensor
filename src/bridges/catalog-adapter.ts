/**
 * Catalog adapter: ingests `BRIDGE_EQUATIONS` into the v0.7-p2 sparse
 * semantic catalog as `BridgeCell` values.
 *
 * A cell needs a `PhysicalScale` on at least one end, and the catalog's
 * `bridges` tuple names a scale on only part of the rows (the rest name a
 * field such as `chemistry` or `plasma`). The adapter submits the rows it
 * can place and lists every other row in `unsubmitted`, with the reason in
 * `skipped`; it never guesses a scale. Phase 3 of v0.7 Proposal 2.
 *
 * Two entry points:
 *
 *   `catalogToCells(entries)` — pure mapping `BridgeEquationEntry[]
 *     → BridgeCell[]`. Filters out entries that would fail the
 *     legacy `addBridge` validation (e.g. `bridges: ['unknown',
 *     'unknown']` collapses to identical empty `source`/`target`).
 *
 *   `scanCatalog(entries)` — best-effort variant: builds candidates,
 *     runs Rule 1 (dimensional consistency), returns a
 *     `CatalogIngestionReport` without throwing. Caller decides
 *     what to do with the diagnostics.
 *
 *   `ingestCatalog(tensor, entries)` — strict variant: two-pass
 *     collect-then-commit (Decision #11). If Rule 1 reports any
 *     errors, throws `CatalogIngestionError(report)` and the
 *     tensor is untouched. Otherwise calls `tensor.addCell` for
 *     each candidate.
 *
 * Rule 1 (Dimensional Consistency) operates on
 * `BridgeEquationEntry`, NOT on `Cell` (Decision #3, resolves
 * Adam-V3). It reads `entry.dimensional_signature` directly.
 *
 * @module bridges/catalog-adapter
 */

import type {
  BridgeEquationEntry,
  BridgeEquationStatus,
} from './index.js';
import type { BridgeCell, CellConfidence } from '../core/cell.js';
import type { UniversalTensor } from '../core/tensor.js';
import type {
  FluxDiagnostic,
  FluxReport,
} from '../core/flux-rules.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../dimensional/bridge-check.js';
import { catalogEntries } from './catalog-load.js';
import { format } from '../dimensional/algebra.js';
import type { PhysicalScale, TensorIndices } from '../core/types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Per-entry summary of the catalog ingestion attempt.
 *
 * @public
 */
export interface CatalogEntryStatus {
  readonly bridgeId: number;
  readonly name: string;
  /** True iff the entry would be (or was) submitted to `addCell`. */
  readonly submitted: boolean;
  /**
   * Diagnostics from Rule 1 (dimensional consistency) for this entry.
   * `undefined` means the entry passed Rule 1 cleanly.
   */
  readonly diagnostic?: FluxDiagnostic;
}

/**
 * Aggregate report returned by `scanCatalog` / `ingestCatalog`. The
 * diagnostics surface Rule 1 results; `unsubmitted` lists entries
 * that the adapter filtered out before submission (typically
 * `'unknown' → 'unknown'` bridges that would fail the legacy
 * `addBridge` source !== target check).
 *
 * @public
 */
export interface CatalogIngestionReport {
  readonly entries: ReadonlyArray<CatalogEntryStatus>;
  readonly errors: ReadonlyArray<FluxDiagnostic>;
  readonly warnings: ReadonlyArray<FluxDiagnostic>;
  readonly info: ReadonlyArray<FluxDiagnostic>;
  /** Bridge IDs the adapter filtered out before submission. */
  readonly unsubmitted: ReadonlyArray<number>;
  /** Why each unsubmitted id was not placed: the tuple labels that name no `PhysicalScale`. */
  readonly skipped: ReadonlyArray<{ readonly bridgeId: number; readonly reason: string }>;
  /** Cells that PASSED Rule 1 and would be submitted (or were). */
  readonly submitted: ReadonlyArray<BridgeCell>;
}

/**
 * Thrown by `ingestCatalog` when Rule 1 reports any errors. The
 * caller can inspect `report` for per-entry diagnostics.
 *
 * @public
 */
export class CatalogIngestionError extends Error {
  public readonly report: CatalogIngestionReport;

  constructor(report: CatalogIngestionReport) {
    super(
      `CatalogIngestionError: ${report.errors.length} dimensional-consistency ` +
      `error(s) in ${report.entries.length} catalog entries. ` +
      `First error: ${report.errors[0]?.message ?? '(none)'}`,
    );
    this.name = 'CatalogIngestionError';
    this.report = report;
  }
}

// ---------------------------------------------------------------------------
// Internal: confidence + scale mapping
// ---------------------------------------------------------------------------

/**
 * Map the catalog's `BridgeEquationStatus` string vocabulary onto
 * the `CellConfidence` vocabulary used by `BridgeCell`. The two
 * vocabularies are nearly aligned — only the `'invalid'` arm differs
 * (catalog allows it; CellConfidence excludes it per the design).
 *
 * @internal
 */
function statusToCellConfidence(status: BridgeEquationStatus): CellConfidence {
  switch (status) {
    case 'established': return 'established';
    case 'speculative': return 'speculative';
    case 'highly-speculative': return 'highly-speculative';
    case 'invalid':
      // An invalid row is not a claim; the catalog carries none (the status
      // distribution test pins 0). A cell built from one is the weakest grade.
      return 'highly-speculative';
  }
}

/**
 * Translate a free-form catalog `bridges` axis label (e.g.
 * `'classical'`, `'quantum'`, `'unknown'`) to a `PhysicalScale`
 * value or `undefined`. The four-element `PhysicalScale` union is
 * exhaustive; anything else (including the `'unknown'` sentinel)
 * maps to `undefined` — making `source`/`target` an empty
 * `TensorIndices` whose serialized key is `''`.
 *
 * @internal
 */
function labelToScale(label: string): PhysicalScale | undefined {
  switch (label) {
    case 'quantum':
    case 'mesoscopic':
    case 'classical':
    case 'cosmological':
      return label;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Mapping: BridgeEquationEntry → BridgeCell
// ---------------------------------------------------------------------------

/**
 * Pure mapper from `BridgeEquationEntry` (legacy catalog shape) to
 * `BridgeCell` (v0.7 typed Cell variant). Filters out entries whose
 * `bridges: [from, to]` collapses to an identical source/target
 * (typically `['unknown', 'unknown']`) — those would fail the
 * legacy `addBridge` validation. The filtering decision is surfaced
 * via the `unsubmitted` array in `CatalogIngestionReport`.
 *
 * @public
 */
export function catalogToCells(
  entries: ReadonlyArray<BridgeEquationEntry>,
): ReadonlyArray<BridgeCell> {
  const out: BridgeCell[] = [];
  for (const entry of entries) {
    const cell = entryToBridgeCell(entry);
    if (cell !== null) out.push(cell);
  }
  return out;
}

/**
 * Internal: build a `BridgeCell` from a single entry, returning
 * `null` if the entry is filterable (identical source/target after
 * label translation).
 *
 * @internal
 */
function entryToBridgeCell(entry: BridgeEquationEntry): BridgeCell | null {
  const [fromLabel, toLabel] = entry.bridges;
  const fromScale = labelToScale(fromLabel);
  const toScale = labelToScale(toLabel);
  const source: TensorIndices = fromScale ? { scale: fromScale } : {};
  const target: TensorIndices = toScale ? { scale: toScale } : {};

  // Filter out entries whose source and target are both empty (the
  // 'unknown' -> 'unknown' case at HEAD). Legacy `addBridge` rejects
  // them with a TypeError; the adapter surfaces them via
  // `unsubmitted`.
  if (
    source.scale === undefined &&
    target.scale === undefined
  ) {
    return null;
  }

  // Equation: use formula_latex if non-empty, else a placeholder.
  const equation = entry.formula_latex && entry.formula_latex.length > 0
    ? entry.formula_latex
    : `(no LaTeX provided for BE-${entry.id})`;

  return {
    kind: 'bridge',
    id: `BE-${entry.id}`,
    name: entry.name,
    equation,
    confidence: statusToCellConfidence(entry.status),
    source,
    target,
    validated: entry.status === 'established',
    description: entry.notes.length > 0 ? entry.notes.slice(0, 200) : entry.name,
  };
}

// ---------------------------------------------------------------------------
// Rule 1 — Dimensional Consistency (ERROR tier per Decision #3)
// ---------------------------------------------------------------------------

/**
 * Fires per-entry. Returns one of:
 *   - undefined (no diagnostic): entry passes Rule 1.
 *   - 'error' diagnostic: dimensional_signature is structurally null,
 *     or non-null but does not match the expected dimension from
 *     `EXPECTED_DIMENSION_BY_BRIDGE`.
 *   - 'info' diagnostic: no expected entry for this bridge ID; the
 *     message states how many catalog rows the table covers, counted
 *     when it is printed. We can't enforce, but we record the gap.
 *
 * @internal
 */
function checkDimensionalConsistency(
  entry: BridgeEquationEntry,
): FluxDiagnostic | undefined {
  const cellId = `BE-${entry.id}`;
  // Structural null check (Eve-R1 lesson — at HEAD this fires zero
  // times; future catalog edits that introduce a null will surface
  // immediately).
  if (entry.dimensional_signature === null) {
    return {
      severity: 'error',
      ruleName: 'dimensional-consistency',
      cellId,
      message:
        `BE-${entry.id} ('${entry.name}') has dimensional_signature: ` +
        `null. Every active catalog entry must declare a structural ` +
        `dimensional signature.`,
    };
  }
  // Field-vs-expected comparison.
  const expected = EXPECTED_DIMENSION_BY_BRIDGE.get(entry.id);
  if (expected === undefined) {
    return {
      severity: 'info',
      ruleName: 'dimensional-consistency',
      cellId,
      message:
        `BE-${entry.id} ('${entry.name}') has no entry in ` +
        `EXPECTED_DIMENSION_BY_BRIDGE (${EXPECTED_DIMENSION_BY_BRIDGE.size} of ${catalogEntries().length} catalog rows covered); ` +
        `dimensional-consistency check skipped for this entry.`,
    };
  }
  const expectedFormatted = format(expected);
  if (entry.dimensional_signature !== expectedFormatted) {
    return {
      severity: 'error',
      ruleName: 'dimensional-consistency',
      cellId,
      message:
        `BE-${entry.id} ('${entry.name}') has dimensional_signature ` +
        `'${entry.dimensional_signature}' but EXPECTED_DIMENSION_BY_BRIDGE ` +
        `says '${expectedFormatted}'. Catalog and expectation disagree.`,
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Best-effort catalog scan: builds candidates, runs Rule 1 per
 * entry, returns a `CatalogIngestionReport`. Does NOT mutate any
 * tensor and does NOT throw.
 *
 * @public
 */
export function scanCatalog(
  entries: ReadonlyArray<BridgeEquationEntry>,
): CatalogIngestionReport {
  const statuses: CatalogEntryStatus[] = [];
  const errors: FluxDiagnostic[] = [];
  const warnings: FluxDiagnostic[] = [];
  const info: FluxDiagnostic[] = [];
  const unsubmitted: number[] = [];
  const skipped: { bridgeId: number; reason: string }[] = [];
  const submitted: BridgeCell[] = [];

  for (const entry of entries) {
    const diagnostic = checkDimensionalConsistency(entry);
    const cell = entryToBridgeCell(entry);
    const submittable = cell !== null;
    if (!submittable) {
      unsubmitted.push(entry.id);
      skipped.push({
        bridgeId: entry.id,
        reason: `bridges tuple [${entry.bridges.join(', ')}] names no PhysicalScale (quantum, mesoscopic, classical, cosmological) on either end`,
      });
    } else submitted.push(cell);

    if (diagnostic) {
      switch (diagnostic.severity) {
        case 'error': errors.push(diagnostic); break;
        case 'warning': warnings.push(diagnostic); break;
        case 'info': info.push(diagnostic); break;
      }
    }

    statuses.push({
      bridgeId: entry.id,
      name: entry.name,
      submitted: submittable,
      ...(diagnostic ? { diagnostic } : {}),
    });
  }

  return {
    entries: statuses,
    errors,
    warnings,
    info,
    unsubmitted,
    skipped,
    submitted,
  };
}

/**
 * Strict catalog ingestion: two-pass collect-then-commit per
 * Decision #11. If Rule 1 reports any errors, throws
 * `CatalogIngestionError(report)` and the tensor is untouched.
 * Otherwise calls `tensor.addCell` for each filterable candidate.
 *
 * @public
 */
export function ingestCatalog(
  tensor: UniversalTensor,
  entries: ReadonlyArray<BridgeEquationEntry>,
): CatalogIngestionReport {
  const report = scanCatalog(entries);
  if (report.errors.length > 0) {
    throw new CatalogIngestionError(report);
  }
  for (const cell of report.submitted) {
    tensor.addCell(cell);
  }
  return report;
}

/**
 * Bridge-level FluxReport summary, derived from a
 * `CatalogIngestionReport`. Used by consumers that want the
 * flux-rule report shape rather than the catalog-specific report.
 *
 * @public
 */
export function ingestionReportToFluxReport(
  report: CatalogIngestionReport,
): FluxReport {
  const diagnostics = [
    ...report.errors,
    ...report.warnings,
    ...report.info,
  ];
  return {
    diagnostics,
    errorCount: report.errors.length,
    warningCount: report.warnings.length,
    infoCount: report.info.length,
  };
}
