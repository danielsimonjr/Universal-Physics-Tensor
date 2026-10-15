/**
 * Observation adapters for Product B.
 *
 * In-memory / JSON / CSV. Does not live in `src/bridges/observations/` —
 * that tree is Product A's confrontation ledger and must stay cycle-free
 * from probe.
 *
 * A cell is a finite number or a non-empty string in the strict decimal
 * grammar (`1`, `-0.5`, `.5`, `2.`, `1e-3`). Nothing is coerced: an empty
 * cell, `null`, `true`, `false`, a list and `"0x10"` are refused by column
 * and row, with {@link DatasetError}. `Number(v)` once read all of those as
 * 0, 1 or 16, which also defeated the missing-observation guard of the
 * declared-limit check (a missing observation scored as 0).
 *
 * @internal
 */

import { readFileSync } from 'node:fs';
import type { DatasetRole, ObservationRow, ProbeDataset } from './types.js';
import { SCHEMA_VERSION } from './types.js';

/** A dataset file or object that is not a dataset: the message names the row and the column. @internal */
export class DatasetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasetError';
  }
}

/** The strict decimal grammar a string cell must match: sign, digits with an optional fraction, an optional exponent. */
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** What a JSON value is, in the words a file author would use. */
function kindOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return `'${v}'`;
  return typeof v === 'object' ? 'an object' : typeof v;
}

/**
 * A cell as a number: a finite number, or a non-empty string in the strict
 * decimal grammar. Anything else is refused at `where` (the dataset, row and
 * column). @internal
 */
export function readDatasetNumber(v: unknown, where: string): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new DatasetError(`${where}: ${v} is not a finite number`);
    return v;
  }
  if (typeof v === 'string') {
    if (v.trim() === '') throw new DatasetError(`${where}: an empty cell is not a number`);
    const n = DECIMAL.test(v.trim()) ? Number(v.trim()) : NaN;
    if (!Number.isFinite(n)) throw new DatasetError(`${where}: ${kindOf(v)} is not a finite decimal number`);
    return n;
  }
  throw new DatasetError(`${where}: ${kindOf(v)} is not a number`);
}

/** Build an in-memory dataset. @internal */
export function datasetFromRows(
  rows: readonly ObservationRow[],
  observable: string,
  role: DatasetRole,
  id = 'inline',
  sigma?: number,
): ProbeDataset {
  return { id, role, rows, observable, ...(sigma !== undefined ? { sigma } : {}), schemaVersion: SCHEMA_VERSION };
}

/** Coerce unknown JSON into a ProbeDataset. @internal */
export function asDatasetSafe(raw: unknown, fallbackId: string, fallbackRole?: DatasetRole): ProbeDataset {
  if (!raw || typeof raw !== 'object') {
    throw new DatasetError(`dataset JSON is not an object (${fallbackId})`);
  }
  const obj = raw as {
    id?: unknown;
    role?: unknown;
    rows?: unknown;
    observable?: unknown;
    sigma?: unknown;
    schemaVersion?: unknown;
  };
  if (!Array.isArray(obj.rows)) {
    throw new DatasetError(`dataset at ${fallbackId} is missing rows[]`);
  }
  if (typeof obj.observable !== 'string' || obj.observable.length === 0) {
    throw new DatasetError(`dataset at ${fallbackId} is missing observable`);
  }
  const role = (typeof obj.role === 'string' ? obj.role : fallbackRole) as DatasetRole | undefined;
  if (
    role !== 'exploratory-fit' &&
    role !== 'validation-holdout' &&
    role !== 'external-replication' &&
    role !== 'falsification-only'
  ) {
    throw new DatasetError(`dataset at ${fallbackId} has invalid role '${String(obj.role)}'`);
  }
  const rows: ObservationRow[] = obj.rows.map((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new DatasetError(`dataset ${fallbackId} row ${i} is not an object`);
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = readDatasetNumber(v, `dataset ${fallbackId} row ${i} column ${k}`);
    }
    return out;
  });
  return {
    id: typeof obj.id === 'string' ? obj.id : fallbackId,
    role,
    rows,
    observable: obj.observable,
    ...(typeof obj.sigma === 'number' && Number.isFinite(obj.sigma) ? { sigma: obj.sigma } : {}),
    schemaVersion: typeof obj.schemaVersion === 'string' ? obj.schemaVersion : SCHEMA_VERSION,
  };
}

/** Load a single ProbeDataset JSON object. @internal */
export function loadDatasetFromJson(path: string, fallbackRole?: DatasetRole): ProbeDataset {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  return asDatasetSafe(raw, path, fallbackRole);
}

export interface SplitFileDatasets {
  readonly exploratory?: ProbeDataset;
  readonly holdout?: ProbeDataset;
}

/** Load `{ exploratory, holdout }` JSON. @internal */
export function loadSplitDatasetsFromJson(path: string): SplitFileDatasets {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    exploratory?: unknown;
    holdout?: unknown;
    observations?: unknown;
  };
  if (raw.exploratory || raw.holdout) {
    return {
      exploratory: raw.exploratory
        ? asDatasetSafe(raw.exploratory, `${path}#exploratory`, 'exploratory-fit')
        : undefined,
      holdout: raw.holdout
        ? asDatasetSafe(raw.holdout, `${path}#holdout`, 'validation-holdout')
        : undefined,
    };
  }
  if (raw.observations) {
    return {
      exploratory: asDatasetSafe(
        { ...(raw.observations as object), role: 'exploratory-fit' },
        `${path}#observations`,
        'exploratory-fit',
      ),
    };
  }
  throw new DatasetError(`JSON at ${path} needs exploratory/holdout or observations`);
}

/** The header and the data lines of a CSV file; the file needs both. */
function csvLines(path: string): { headers: string[]; lines: string[] } {
  const text = readFileSync(path, 'utf8').trim();
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new DatasetError(`CSV dataset at ${path} needs a header and at least one row`);
  }
  const headers = lines[0]!.split(',').map((h) => h.trim());
  return { headers, lines };
}

/**
 * One CSV data line as a row of numbers. A line with fewer cells than the
 * header is refused by the first column it lacks; `skip` names the header
 * column (if any) that is not a number column. `line` is the 1-based line
 * number of the file, so a message points at the file.
 */
function csvRow(cells: readonly string[], headers: readonly string[], line: number, path: string, skip: number): Record<string, number> {
  if (cells.length < headers.length) {
    throw new DatasetError(
      `CSV ${path} row ${line} has ${cells.length} cell(s); the header has ${headers.length} (column ${headers[cells.length]} is missing)`,
    );
  }
  const row: Record<string, number> = {};
  for (let c = 0; c < headers.length; c++) {
    if (c === skip) continue;
    row[headers[c]!] = readDatasetNumber(cells[c], `CSV ${path} row ${line} column ${headers[c]}`);
  }
  return row;
}

/**
 * Minimal CSV: first row headers, remaining rows numeric values.
 * Optional `split` column (`exploratory`/`holdout`/`blind`).
 * `blind` rows are withheld with holdout data, never fit.
 *
 * @internal
 */
export function loadDatasetFromCsv(
  path: string,
  observable: string,
  role: DatasetRole,
  id = path,
): ProbeDataset {
  const { headers, lines } = csvLines(path);
  const splitIdx = headers.indexOf('split');
  const rows: ObservationRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',').map((c) => c.trim());
    rows.push(csvRow(cells, headers, i + 1, path, splitIdx));
  }
  if (!(observable in (rows[0] ?? {}))) {
    throw new DatasetError(`CSV ${path} is missing observable column '${observable}'`);
  }
  return datasetFromRows(rows, observable, role, id);
}

/** Partition a mixed-split CSV (uses a `split` column). @internal */
export function loadSplitCsv(
  path: string,
  observable: string,
): { exploratory: ProbeDataset; holdout: ProbeDataset } {
  const { headers, lines } = csvLines(path);
  const splitIdx = headers.indexOf('split');
  if (splitIdx < 0) {
    throw new DatasetError(`CSV ${path} has no split column`);
  }
  const exploratoryRows: ObservationRow[] = [];
  const holdoutRows: ObservationRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',').map((c) => c.trim());
    const row = csvRow(cells, headers, i + 1, path, splitIdx);
    const split = cells[splitIdx];
    if (split === 'holdout' || split === 'blind') holdoutRows.push(row);
    else if (split === 'exploratory') exploratoryRows.push(row);
    else throw new DatasetError(`CSV ${path} row ${i + 1} has invalid split '${split}'`);
  }
  return {
    exploratory: datasetFromRows(exploratoryRows, observable, 'exploratory-fit', `${path}#exploratory`),
    holdout: datasetFromRows(holdoutRows, observable, 'validation-holdout', `${path}#holdout`),
  };
}
