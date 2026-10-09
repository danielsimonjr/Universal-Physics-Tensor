/**
 * The catalog loader. This module is the only place that parses a bridge id
 * out of text. Everywhere else reads the loaded records.
 *
 * @module bridges/catalog-load
 */

import { checkedDataFile } from '../core/data-file.js';
import type {
  CatalogConfrontation,
  CatalogConfrontationRecord,
  CatalogEntry,
  CatalogEvaluator,
  CatalogEvaluatorParameter,
  CatalogFile,
  CatalogFileRecord,
  CatalogRejection,
  CatalogRelation,
} from './catalog-types.js';
import type { ConfrontationOutcome } from './observations/types.js';

/**
 * `data/bridge-catalog.json`, checked against `data/bridge-catalog.schema.json`
 * (every record's `type`, the relation, evaluator, parameter and confrontation
 * shapes). What a schema cannot state is checked by {@link loadCatalog}.
 */
function loadFile(): CatalogFileRecord {
  return checkedDataFile('bridge-catalog.json') as CatalogFileRecord;
}

/** Records in ascending id order; a duplicate or a disordered id is refused. */
function checkOrder(file: CatalogFileRecord): void {
  for (let i = 1; i < file.entries.length; i += 1) {
    const previous = file.entries[i - 1]!.id;
    const current = file.entries[i]!.id;
    if (current <= previous) {
      throw new Error(`data/bridge-catalog.json: entry ${current} follows entry ${previous}; records are in ascending id order`);
    }
  }
  const seen = new Set<number>();
  for (const row of file.confrontations) {
    if (seen.has(row.catalogId)) throw new Error(`data/bridge-catalog.json: catalog id ${row.catalogId} has two confrontations`);
    seen.add(row.catalogId);
  }
  const rejected = new Set<number>();
  const ids = new Set(file.entries.map((entry) => entry.id));
  for (const row of file.rejections) {
    if (!ids.has(row.catalogId)) throw new Error(`data/bridge-catalog.json: rejection ${row.catalogId} names no catalog row`);
    if (rejected.has(row.catalogId)) throw new Error(`data/bridge-catalog.json: catalog id ${row.catalogId} is rejected twice`);
    rejected.add(row.catalogId);
  }
}

const number = (o: Readonly<Record<string, unknown>>, key: string, where: string): number => {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${where}: outcome.${key} must be a finite number`);
  return v;
};
const boolean = (o: Readonly<Record<string, unknown>>, key: string, where: string): boolean => {
  const v = o[key];
  if (typeof v !== 'boolean') throw new Error(`${where}: outcome.${key} must be a boolean`);
  return v;
};

/**
 * The outcome of one confrontation, checked arm by arm on its `kind`. The
 * schema states the shared fields (`kind`, `units`, `provenance`, the data
 * handling); the fields each arm must carry are checked here, so the loaded
 * record is a {@link ConfrontationOutcome} by inspection, not by assertion.
 */
function readOutcome(row: CatalogConfrontationRecord): ConfrontationOutcome {
  const where = `data/bridge-catalog.json: confrontation ${row.catalogId}`;
  const o = row.outcome;
  if (o['kind'] !== row.kind) throw new Error(`${where}: outcome.kind ${String(o['kind'])} is not the record kind ${row.kind}`);
  switch (row.kind) {
    case 'value':
      number(o, 'predicted', where);
      number(o, 'observed', where);
      number(o, 'sigma', where);
      number(o, 'residualInSigma', where);
      boolean(o, 'withinObserved', where);
      break;
    case 'upper-bound':
      number(o, 'predicted', where);
      number(o, 'bound', where);
      boolean(o, 'satisfied', where);
      break;
    case 'consistency':
      number(o, 'predicted', where);
      number(o, 'approaches', where);
      number(o, 'fractionalGap', where);
      if (o['fractionalGapIs'] !== 'agreement-bound' && o['fractionalGapIs'] !== 'observed-difference') {
        throw new Error(`${where}: outcome.fractionalGapIs must name what fractionalGap holds`);
      }
      break;
    case 'table':
      if (!Array.isArray(o['rows'])) throw new Error(`${where}: outcome.rows must be an array`);
      break;
  }
  return o as unknown as ConfrontationOutcome;
}

function narrowConfrontations(file: CatalogFileRecord): readonly CatalogConfrontation[] {
  return file.confrontations.map((row) => ({ ...row, outcome: readOutcome(row) }));
}

/**
 * A relation's confidence is its catalog row's `status`. The row is the one
 * owner, so the file may not store a confidence beside a catalog id; a
 * relation with no row stores its own. A row that is `invalid` has no
 * relation to evaluate.
 */
function deriveConfidence(file: CatalogFileRecord): CatalogFile {
  const entries = new Map(file.entries.map((entry) => [entry.id, entry]));
  const confrontations = narrowConfrontations(file);
  const relations = file.relations.map((relation): CatalogRelation => {
    if (relation.catalogId === null) {
      if (relation.confidence === undefined) {
        throw new Error(`data/bridge-catalog.json: relation ${relation.id} has no catalog row and no confidence`);
      }
      return { ...relation, confidence: relation.confidence };
    }
    if (relation.confidence !== undefined) {
      throw new Error(`data/bridge-catalog.json: relation ${relation.id} stores a confidence; the row's status is the owner`);
    }
    const entry = entries.get(relation.catalogId);
    if (entry === undefined) {
      throw new Error(`data/bridge-catalog.json: relation ${relation.id} names an unknown catalog id ${relation.catalogId}`);
    }
    if (entry.status === 'invalid') {
      throw new Error(`data/bridge-catalog.json: relation ${relation.id} has a closed form but its row is invalid`);
    }
    return { ...relation, confidence: entry.status };
  });
  return { ...file, relations, confrontations };
}

/**
 * The validity clause a parameter's sign states, in the relation's own source
 * name. An absolute temperature is nonnegative unless the parameter says `any`.
 */
function signClause(parameter: CatalogEvaluatorParameter, source: string): string | undefined {
  const sign = parameter.sign ?? (parameter.temperature === 'absolute' ? 'nonnegative' : undefined);
  if (sign === 'positive') return `${source} > 0`;
  if (sign === 'nonnegative') return `${source} >= 0`;
  return undefined;
}

/**
 * Add the sign clauses the evaluator parameters state to the relation they
 * evaluate. The validity domain is derived from the flags, so a new bridge
 * that flags its inputs cannot leave the domain behind. A clause the record
 * already states is not repeated.
 */
function deriveDomains(file: CatalogFile): CatalogFile {
  const relations = file.relations.map((relation) => {
    if (relation.catalogId === null) return relation;
    const evaluator = file.evaluators.find((row) => row.catalogId === relation.catalogId);
    if (evaluator === undefined) return relation;
    const clauses: string[] = [];
    for (const parameter of evaluator.parameters) {
      const source =
        relation.sources.find((name) => name === parameter.key || (relation.aliases[name] ?? []).includes(parameter.key)) ??
        (relation.sources.includes(parameter.quantity) ? parameter.quantity : undefined);
      if (source === undefined) continue;
      const clause = signClause(parameter, source);
      if (clause !== undefined && !relation.holds.includes(clause)) clauses.push(clause);
    }
    if (clauses.length === 0) return relation;
    const stated = relation.holds.trim() === 'true' ? '' : `${relation.holds} and `;
    return {
      ...relation,
      holds: `${stated}${clauses.join(' and ')}`,
      domain: relation.domain === '' ? clauses.join(', ') : `${relation.domain}; ${clauses.join(', ')}`,
    };
  });
  return { ...file, relations };
}

/**
 * The loaded catalog from a file record: the records are in id order, each
 * outcome is checked on its kind, each relation takes its row's status as its
 * confidence, then the sign clauses its evaluator parameters state. The
 * production catalog is this function on `data/bridge-catalog.json`.
 * @internal
 */
export function loadCatalog(file: CatalogFileRecord): CatalogFile {
  checkOrder(file);
  return deriveDomains(deriveConfidence(file));
}

const CATALOG = loadCatalog(loadFile());

/** The loaded catalog. */
export function bridgeCatalog(): CatalogFile {
  return CATALOG;
}

/** Catalog rows, in file order. */
export function catalogEntries(): readonly CatalogEntry[] {
  return CATALOG.entries;
}

/** Closed forms, in file order. */
export function catalogRelations(): readonly CatalogRelation[] {
  return CATALOG.relations;
}

/** Evaluator input contracts, in file order. */
export function catalogEvaluators(): readonly CatalogEvaluator[] {
  return CATALOG.evaluators;
}

/** Confrontations, in file order; one per catalog id. */
export function catalogConfrontations(): readonly CatalogConfrontation[] {
  return CATALOG.confrontations;
}

/** The negative catalog, in file order. */
export function catalogRejections(): readonly CatalogRejection[] {
  return CATALOG.rejections;
}

const ENTRY_BY_ID = new Map(CATALOG.entries.map((entry) => [entry.id, entry]));
const RELATIONS_BY_CATALOG = new Map<number, CatalogRelation[]>();
for (const relation of CATALOG.relations) {
  if (relation.catalogId === null) continue;
  const list = RELATIONS_BY_CATALOG.get(relation.catalogId);
  if (list === undefined) RELATIONS_BY_CATALOG.set(relation.catalogId, [relation]);
  else list.push(relation);
}

/** The row for a catalog id, or undefined. */
export function catalogEntry(id: number): CatalogEntry | undefined {
  return ENTRY_BY_ID.get(id);
}

/** Relations whose catalog id is `id`, in file order. */
export function relationsForCatalog(id: number): readonly CatalogRelation[] {
  return RELATIONS_BY_CATALOG.get(id) ?? [];
}

/**
 * The relation a numeric catalog id evaluates. The graph id `be-<id>` wins
 * when several relations share the id. Otherwise the first relation does.
 */
export function primaryRelation(id: number): CatalogRelation | undefined {
  const rows = relationsForCatalog(id);
  return rows.find((row) => row.id === `be-${id}`) ?? rows[0];
}

/**
 * The catalog number a piece of text names (`42`, `be-42`, `BE-42`), or
 * undefined when it names none (an atlas id, a canonical id, a quantity).
 * The one place a bridge id is read from text; {@link parseBridgeId} throws
 * where this returns undefined.
 */
export function catalogIdNumber(raw: string): number | undefined {
  const match = /^(?:be-)?(\d+)$/i.exec(raw.trim());
  return match === null ? undefined : Number(match[1]);
}

/**
 * Parse a catalog id from a number or from text the caller typed.
 * Accepts `42`, `be-42`, and `BE-42`. This is the only such parser.
 */
export function parseBridgeId(bridgeId: number | string): number {
  if (typeof bridgeId === 'number') {
    if (!Number.isInteger(bridgeId)) {
      throw new RangeError(`parseBridgeId: ${bridgeId} is not an integer catalog id`);
    }
    return bridgeId;
  }
  const id = catalogIdNumber(bridgeId);
  if (id === undefined) {
    throw new TypeError(`parseBridgeId: '${bridgeId}' is not a catalog id`);
  }
  return id;
}

/** Graph id for a catalog number: the stable key, not a switch. */
export function catalogEdgeKey(id: number): string {
  return `be-${id}`;
}
