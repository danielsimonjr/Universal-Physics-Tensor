/**
 * Empirical-spine coverage audit (Direction 4).
 *
 * "Strengthen the empirical spine" must NOT fabricate physics data, so the
 * responsible, composable deliverable is tooling that makes the spine's gaps
 * machine-visible: for each catalogued bridge, what grounding does it
 * actually have — a real-data confrontation, a computable graph edge, a
 * dimensional-signature encoding, or nothing but a status label? The report
 * tells the physicist-reviewer (CONTRIBUTING.md) exactly where the grounding
 * is thinnest, and lets the discovery loop prefer well-grounded bridges.
 *
 * This INVENTS nothing — every field is read from the catalog
 * (`BRIDGE_EQUATIONS`), the composition graph (`CATALOG_GRAPH`), and the
 * confrontation projection `DATA_CONFRONTED_IDS`.
 *
 * The `CATALOG_GRAPH` scan lives here, beside `catalog-graph.ts`.
 * `DATA_CONFRONTED_IDS` stays in `bridges/confrontation-coverage.ts`.
 *
 * INTERNAL — surfaced via `upt coverage`.
 *
 * @module composition/audit-coverage
 */

import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import { DATA_CONFRONTED_IDS } from '../bridges/confrontation-coverage.js';
import { CATALOG_GRAPH } from './catalog-graph.js';

/**
 * The grounding tier of one bridge, strongest first:
 *   - `data-confronted` — has a committed real-data confrontation.
 *   - `graph-computable` — has a composition-graph edge AND a dimensional
 *      signature (numerically computable + dimensionally encoded).
 *   - `encoded-only` — has a dimensional signature but no graph edge.
 *   - `thin` — no dimensional signature (catalogued by label/prose only).
 */
export type GroundingTier =
  | 'data-confronted'
  | 'graph-computable'
  | 'encoded-only'
  | 'thin';

/** One bridge's empirical-grounding profile. */
interface BridgeCoverage {
  readonly id: number;
  readonly status: string;
  readonly tier: GroundingTier;
  /** A committed real-data confrontation exists. */
  readonly hasDataConfrontation: boolean;
  /** A composition-graph edge (computable evaluator) exists for this id. */
  readonly hasGraphEdge: boolean;
  /** A dimensional signature is registered for this id. */
  readonly dimensionalSignaturePresent: boolean;
  /** Number of literature references in the catalog entry. */
  readonly citationCount: number;
  /** Number of recorded known issues. */
  readonly knownIssueCount: number;
}

/** The catalog-wide coverage report. */
interface CoverageReport {
  readonly bridges: readonly BridgeCoverage[];
  readonly total: number;
  /** Count by grounding tier. */
  readonly byTier: Readonly<Record<GroundingTier, number>>;
  /** Bridges with NO real-data confrontation (the empirical gap). */
  readonly withoutDataConfrontation: number;
  /** Bridges with NO literature reference at all. */
  readonly withoutCitation: number;
  /** Ids of the thinnest bridges (no dimensional signature), sorted. */
  readonly thinBridges: readonly number[];
}

/**
 * Audit the catalog's empirical grounding. Reads `BRIDGE_EQUATIONS`, the
 * composition graph, and the data-confrontation registry; fabricates
 * nothing. See module docs.
 *
 * @internal
 */
export function auditCoverage(): CoverageReport {
  const graphEdgeIds = new Set<number>();
  for (const e of CATALOG_GRAPH) {
    if (e.beId !== null) graphEdgeIds.add(e.beId);
  }

  const bridges: BridgeCoverage[] = BRIDGE_EQUATIONS.map((entry) => {
    const hasDataConfrontation = DATA_CONFRONTED_IDS.has(entry.id);
    const hasGraphEdge = graphEdgeIds.has(entry.id);
    const dimensionalSignaturePresent = entry.dimensional_signature !== null;

    let tier: GroundingTier;
    if (hasDataConfrontation) tier = 'data-confronted';
    else if (hasGraphEdge && dimensionalSignaturePresent) tier = 'graph-computable';
    else if (dimensionalSignaturePresent) tier = 'encoded-only';
    else tier = 'thin';

    return {
      id: entry.id,
      status: entry.status,
      tier,
      hasDataConfrontation,
      hasGraphEdge,
      dimensionalSignaturePresent,
      citationCount: entry.references.length,
      knownIssueCount: entry.known_issues.length,
    };
  });

  const byTier: Record<GroundingTier, number> = {
    'data-confronted': 0,
    'graph-computable': 0,
    'encoded-only': 0,
    thin: 0,
  };
  for (const b of bridges) byTier[b.tier]++;

  return {
    bridges: bridges.sort((a, b) => a.id - b.id),
    total: bridges.length,
    byTier,
    withoutDataConfrontation: bridges.filter((b) => !b.hasDataConfrontation).length,
    withoutCitation: bridges.filter((b) => b.citationCount === 0).length,
    thinBridges: bridges.filter((b) => b.tier === 'thin').map((b) => b.id).sort((a, b) => a - b),
  };
}
