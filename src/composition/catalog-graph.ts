/**
 * The composition graph is the relation projection of the bridge catalog.
 *
 * @module composition/catalog-graph
 */

import { catalogRelations } from '../bridges/catalog-load.js';
import { parseCatalogExpression } from '../bridges/expr-parse.js';
import { evaluateCatalogRelation, relationHolds } from '../bridges/relation-eval.js';
import type { BridgeEdge } from './edge.js';
import { withBoundAliases } from './edge.js';
import { quantityByName } from './quantities.js';

function buildEdge(relation: ReturnType<typeof catalogRelations>[number]): BridgeEdge {
  const edge: BridgeEdge = {
    id: relation.id,
    beId: relation.catalogId,
    kind: relation.kind,
    label: relation.label,
    sources: relation.sources.map((name) => quantityByName(name)),
    ...(Object.keys(relation.aliases).length > 0 ? { aliases: relation.aliases } : {}),
    target: quantityByName(relation.target),
    confidence: relation.confidence,
    domain: {
      description: relation.domain,
      predicate: (inputs) => relationHolds(relation, inputs),
    },
    evaluate: (inputs) => evaluateCatalogRelation(relation, inputs),
    symbolic: parseCatalogExpression(relation.expression),
    citation: relation.citation,
    ...(relation.coefficientUnset === true ? { coefficientUnset: true } : {}),
    ...(relation.formulaFactors !== undefined ? { formulaFactors: relation.formulaFactors } : {}),
    ...(relation.relation !== undefined ? { relation: relation.relation } : {}),
    ...(relation.regime !== undefined ? { regime: relation.regime } : {}),
    ...(relation.conventions !== undefined ? { conventions: relation.conventions } : {}),
    ...(relation.counterexamples !== undefined ? { counterexamples: relation.counterexamples } : {}),
  };
  return withBoundAliases(edge);
}

/** Every catalog relation as a graph edge, in catalog order. @public */
export const CATALOG_GRAPH: readonly BridgeEdge[] = catalogRelations().map(buildEdge);

const BY_ID = new Map(CATALOG_GRAPH.map((edge) => [edge.id, edge]));

/** The catalog edge with this graph id. */
export function catalogEdge(id: string): BridgeEdge {
  const edge = BY_ID.get(id);
  if (edge === undefined) throw new Error(`catalogEdge: no edge '${id}'`);
  return edge;
}

/** The two composition demonstrations the CLI prints. */
export function demonstrationEdges(): {
  readonly hawking: BridgeEdge;
  readonly landauer: BridgeEdge;
  readonly schwarzschild: BridgeEdge;
  readonly hawkingViaRadius: BridgeEdge;
} {
  const hawking = catalogRelations().find(
    (row) => row.target === 'hawking-temperature' && row.sources.length === 1 && row.sources[0] === 'mass',
  );
  const landauer = catalogRelations().find((row) => row.target === 'landauer-erasure-energy');
  const via = catalogRelations().find((row) => row.target === 'hawking-temperature' && row.sources.includes('schwarzschild-radius'));
  const law = catalogRelations().find((row) => row.kind === 'law' && row.target === 'schwarzschild-radius');
  if (hawking === undefined || landauer === undefined || via === undefined || law === undefined) {
    throw new Error('demonstrationEdges: a demonstration relation is missing');
  }
  return {
    hawking: catalogEdge(hawking.id),
    landauer: catalogEdge(landauer.id),
    schwarzschild: catalogEdge(law.id),
    hawkingViaRadius: catalogEdge(via.id),
  };
}
