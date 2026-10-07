/**
 * The catalog loader. This module is the only place that parses a bridge id
 * out of text. Everywhere else reads the loaded records.
 *
 * @module bridges/catalog-load
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CatalogConfrontation,
  CatalogEntry,
  CatalogEvaluator,
  CatalogEvaluatorParameter,
  CatalogFile,
  CatalogRelation,
} from './catalog-types.js';

function loadFile(): CatalogFile {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../../data/bridge-catalog.json');
  const file = JSON.parse(readFileSync(path, 'utf8')) as CatalogFile;
  for (const entry of file.entries) {
    if (entry.type !== 'standard' && entry.type !== 'cross-domain') {
      throw new Error(`catalog record ${entry.id} has no type`);
    }
  }
  return file;
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
    const stated = relation.holds.trim() === 'true' ? '' : `${relation.holds} && `;
    return {
      ...relation,
      holds: `${stated}${clauses.join(' && ')}`,
      domain: relation.domain === '' ? clauses.join(', ') : `${relation.domain}; ${clauses.join(', ')}`,
    };
  });
  return { ...file, relations };
}

const CATALOG = deriveDomains(loadFile());

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

/** Confrontations, in file order. */
export function catalogConfrontations(): readonly CatalogConfrontation[] {
  return CATALOG.confrontations;
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
  const match = /^(?:be-)?(\d+)$/i.exec(bridgeId.trim());
  if (match === null) {
    throw new TypeError(`parseBridgeId: '${bridgeId}' is not a catalog id`);
  }
  return Number(match[1]);
}

/** Graph id for a catalog number: the stable key, not a switch. */
export function catalogEdgeKey(id: number): string {
  return `be-${id}`;
}
