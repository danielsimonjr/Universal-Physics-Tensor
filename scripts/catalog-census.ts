/**
 * The catalog census: every count that moves when a bridge is ingested, derived from the
 * registries and written to `tests/fixtures/catalog-census.json`.
 *
 * A test that pins one of these counts imports the census (`tests/helpers/census.ts`) and
 * compares the live value it derives to the census field. A catalog change therefore edits one
 * reviewed file, and a stale census fails here and in CI instead of in thirty test files.
 *
 * `bun scripts/catalog-census.ts --write` rewrites the file.
 * `bun scripts/catalog-census.ts --check` exits 1 when the committed file differs from a fresh
 * derivation. The `docs-fresh` job runs `--check`.
 *
 * What is NOT here, on purpose: the PhysJS reviewed-row table, the criterion 3 corpus hashes and
 * record counts, the frozen vector file, and the composition-table cell counts. Those are
 * intended freezes, and each is bound by its own hash or amendment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRIDGE_EQUATIONS } from '../src/bridges/index.js';
import { catalogEntries, catalogRelations } from '../src/bridges/catalog-load.js';
import { adjudicateCatalog } from '../src/bridges/membership.js';
import { BRIDGE_EVALUATORS } from '../src/bridges/evaluators.js';
import { CONFRONTATION_RIGOR, CONFRONTATIONS } from '../src/bridges/confrontations.js';
import { DATA_CONFRONTED_IDS } from '../src/bridges/confrontation-coverage.js';
import { scanCatalog } from '../src/bridges/catalog-adapter.js';
import { REJECTED_BRIDGE_ADJUDICATIONS } from '../src/bridges/rejected.js';
import { closedFormRangeLabel } from '../src/cli/closed-form-range.js';
import { withCatalogEvidence } from '../src/cli/map-evidence.js';
import { allQuantityRecords } from '../src/dimensional/quantity-registry.js';
import { CATALOG_GRAPH } from '../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../src/composition/canonical-graph.js';
import { filterEdges } from '../src/composition/graph-viz.js';
import {
  attemptDerivation,
  dimensionalFreedom,
  linkageMap,
  proposeLinkCandidates,
} from '../src/composition/bridge-analysis.js';
import { rankDiscoveries } from '../src/composition/discovery.js';
import { annotateConsequences } from '../src/composition/consequence.js';
import { PROPOSED_BRIDGES } from '../src/composition/proposed-bridges.js';
import {
  CANONICAL_EQUATIONS,
  bridgesWithoutCanonicalPartner,
} from '../src/canonical/registry.js';
import { catalogFormalRef } from '../src/atlas/catalog-formal-ref.js';
import { ATLAS_FAMILIES } from '../src/atlas/families.js';
import { summarizeEvidence } from '../src/atlas/coverage.js';
import {
  catalogEvidenceInput,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../src/atlas/derive-evidence.js';
import { adjudicateBridgeEntry } from '../src/bridges/membership.js';
import type { FormalRefKind } from '../src/relations/types.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Where the census is committed. */
export const CENSUS_PATH = 'tests/fixtures/catalog-census.json';

/** The shape of the committed census. Every field is a count or a label derived from a registry. */
export interface CatalogCensus {
  readonly catalog: {
    readonly entries: number;
    readonly distinctIds: number;
    readonly idMin: number;
    readonly idMax: number;
    readonly categories: number;
    readonly crossDomain: number;
    readonly standard: number;
  };
  readonly membership: {
    readonly bridges: number;
    readonly notABridges: number;
    readonly unadjudicated: number;
  };
  readonly relations: {
    readonly total: number;
    readonly kindBridge: number;
    readonly kindLaw: number;
    readonly bridgeOnStandardRow: number;
    readonly lawOnCrossDomainRow: number;
    readonly kindDisagreesWithRegimeAttributes: number;
  };
  readonly graph: { readonly edges: number };
  readonly evaluators: { readonly count: number; readonly rangeLabel: string };
  readonly confrontations: {
    readonly records: number;
    readonly dataConfronted: number;
    readonly withoutDataConfrontation: number;
    readonly rigorStringent: number;
    readonly rigorModerate: number;
    readonly rigorLoose: number;
  };
  readonly scaleCells: { readonly submitted: number; readonly unsubmitted: number };
  readonly linkage: {
    readonly components: number;
    readonly isolated: number;
    readonly compositions: number;
    readonly anchoredClusterSize: number;
    readonly anchoredClusterEstablished: number;
  };
  readonly linkCandidates: {
    readonly total: number;
    readonly touchingCore: number;
    readonly touchingCoreSameKind: number;
  };
  readonly discovery: {
    readonly catalog: {
      readonly total: number;
      readonly promising: number;
      readonly inert: number;
      readonly magnitudeClash: number;
      readonly contradictory: number;
      readonly axisClash: number;
      readonly shadowedByMagnitudeClash: number;
    };
    readonly canonical: { readonly axisClash: number; readonly promisingNovelConsequence: number };
    readonly proposedBridges: number;
  };
  readonly evidence: { readonly formallyProved: number; readonly rejectedRows: number };
  readonly formalRefs: {
    readonly emitted: number;
    readonly catalogBridgeKind: number;
    readonly catalogCounted: number;
    readonly catalogCrossCheck: number;
    readonly catalogProperty: number;
  };
  readonly derivationAudit: {
    readonly derived: number;
    readonly coefficientUnset: number;
    readonly decoy: number;
    readonly notAMonomial: number;
    readonly open: number;
    readonly closable: number;
    readonly freedomOne: number;
    readonly maxFiniteFreedom: number;
    readonly unspannable: number;
  };
  readonly canonical: {
    readonly bridgesWithoutPartner: number;
    readonly audit: {
      readonly derived: number;
      readonly coefficientUnset: number;
      readonly decoy: number;
      readonly open: number;
    };
  };
  readonly mapBothFormallyProved: {
    readonly total: number;
    readonly kept: number;
    readonly droppedNotMatching: number;
    readonly droppedMissingMetadata: number;
  };
}

function ofKind(kinds: readonly FormalRefKind[]): number {
  return BRIDGE_EQUATIONS.filter((entry) => {
    const ref = catalogFormalRef(entry.id);
    return ref !== undefined && kinds.includes(ref.kind);
  }).length;
}

function auditCounts(graph: typeof CATALOG_GRAPH): CatalogCensus['derivationAudit'] {
  const status = { derived: 0, coefficientUnset: 0, decoy: 0, notAMonomial: 0, open: 0 };
  const histogram = new Map<number, number>();
  for (const edge of graph) {
    const d = attemptDerivation(edge);
    if (d.status === 'derived') status.derived += 1;
    else if (d.status === 'coefficient-unset') status.coefficientUnset += 1;
    else if (d.status === 'decoy') status.decoy += 1;
    else if (d.status === 'not-a-monomial') status.notAMonomial += 1;
    else status.open += 1;
    const freedom = dimensionalFreedom(edge);
    histogram.set(freedom, (histogram.get(freedom) ?? 0) + 1);
  }
  const finite = [...histogram.keys()].filter((n) => Number.isFinite(n));
  return {
    ...status,
    closable: histogram.get(0) ?? 0,
    freedomOne: histogram.get(1) ?? 0,
    maxFiniteFreedom: Math.max(...finite),
    unspannable: histogram.get(Infinity) ?? 0,
  };
}

function count<T>(items: readonly T[], keep: (item: T) => boolean): number {
  return items.filter(keep).length;
}

/** Derive the census from the registries. Takes tens of seconds: it ranks the discovery funnel. */
export function deriveCensus(): CatalogCensus {
  const entries = catalogEntries();
  const relations = catalogRelations();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ids = BRIDGE_EQUATIONS.map((entry) => entry.id);

  const adjudication = adjudicateCatalog(BRIDGE_EQUATIONS);
  const scan = scanCatalog(BRIDGE_EQUATIONS);

  const rows = relations.filter((r) => r.catalogId !== null);
  const quantity = new Map(allQuantityRecords().map((q) => [q.id, q]));
  const differsByAttributes = (r: (typeof relations)[number]): boolean => {
    const target = quantity.get(r.target)!;
    return r.sources.some((s) => {
      const source = quantity.get(s)!;
      return Object.keys({ ...target.attributes, ...source.attributes }).some(
        (k) => target.attributes[k] !== source.attributes[k],
      );
    });
  };

  const rigor = [...CONFRONTATION_RIGOR.values()];

  const linkage = linkageMap(CATALOG_GRAPH);
  const anchored = linkage.clusters[0]!;
  const candidates = proposeLinkCandidates(CATALOG_GRAPH);
  const touchingCore = candidates.filter((c) => c.touchesCore);

  const ranked = rankDiscoveries(CATALOG_GRAPH);
  const verdict = (v: string): number => count(ranked, (c) => c.verdict === v);
  const rankedCanonical = rankDiscoveries(CANONICAL_GRAPH);
  const canonicalPromising = annotateConsequences(rankedCanonical).filter((c) => c.verdict === 'promising');

  const rejectedIds = new Set(REJECTED_BRIDGE_ADJUDICATIONS.map((a) => a.beId));
  const evidence = summarizeEvidence(
    BRIDGE_EQUATIONS.map((entry) =>
      deriveEvidenceForVerdict(adjudicateBridgeEntry(entry), catalogEvidenceInput(entry), NO_PASSING_WITNESSES),
    ),
  );

  const atlasRefs = ATLAS_FAMILIES.flatMap((family) => family.bridges).filter(
    (bridge) => bridge.formalRef !== undefined,
  ).length;
  const catalogRefs = count(BRIDGE_EQUATIONS, (entry) => catalogFormalRef(entry.id) !== undefined);

  const derivationAudit = auditCounts(CATALOG_GRAPH);
  const canonicalAudit = auditCounts(CANONICAL_GRAPH);

  const both = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];
  const viz = filterEdges(both, withCatalogEvidence({ evidence: 'formally-proved' }));

  const dataConfronted = DATA_CONFRONTED_IDS.size;

  return {
    catalog: {
      entries: BRIDGE_EQUATIONS.length,
      distinctIds: new Set(ids).size,
      idMin: Math.min(...ids),
      idMax: Math.max(...ids),
      categories: new Set(BRIDGE_EQUATIONS.map((e) => e.category)).size,
      crossDomain: count(entries, (e) => e.type === 'cross-domain'),
      standard: count(entries, (e) => e.type === 'standard'),
    },
    membership: {
      bridges: adjudication.bridges.length,
      notABridges: adjudication.notABridges.length,
      unadjudicated: adjudication.unadjudicated.length,
    },
    relations: {
      total: relations.length,
      kindBridge: count(relations, (r) => r.kind === 'bridge'),
      kindLaw: count(relations, (r) => r.kind === 'law'),
      bridgeOnStandardRow: count(rows, (r) => r.kind === 'bridge' && byId.get(r.catalogId!)!.type === 'standard'),
      lawOnCrossDomainRow: count(rows, (r) => r.kind === 'law' && byId.get(r.catalogId!)!.type === 'cross-domain'),
      kindDisagreesWithRegimeAttributes: count(relations, (r) => (differsByAttributes(r) ? 'bridge' : 'law') !== r.kind),
    },
    graph: { edges: CATALOG_GRAPH.length },
    evaluators: { count: BRIDGE_EVALUATORS.size, rangeLabel: closedFormRangeLabel() },
    confrontations: {
      records: CONFRONTATIONS.size,
      dataConfronted,
      withoutDataConfrontation: BRIDGE_EQUATIONS.length - dataConfronted,
      rigorStringent: count(rigor, (t) => t === 'stringent'),
      rigorModerate: count(rigor, (t) => t === 'moderate'),
      rigorLoose: count(rigor, (t) => t === 'loose'),
    },
    scaleCells: { submitted: scan.submitted.length, unsubmitted: scan.unsubmitted.length },
    linkage: {
      components: linkage.componentCount,
      isolated: linkage.isolated.length,
      compositions: linkage.compositions,
      anchoredClusterSize: anchored.size,
      anchoredClusterEstablished: anchored.statusMix.established ?? 0,
    },
    linkCandidates: {
      total: candidates.length,
      touchingCore: touchingCore.length,
      touchingCoreSameKind: count(touchingCore, (c) => c.sameKind),
    },
    discovery: {
      catalog: {
        total: ranked.length,
        promising: verdict('promising'),
        inert: verdict('inert'),
        magnitudeClash: verdict('magnitude-clash'),
        contradictory: verdict('contradictory'),
        axisClash: verdict('axis-clash'),
        shadowedByMagnitudeClash: count(ranked, (c) => c.verdict === 'magnitude-clash' && c.axisClashes.length > 0),
      },
      canonical: {
        axisClash: count(rankedCanonical, (c) => c.verdict === 'axis-clash'),
        promisingNovelConsequence: count(canonicalPromising, (c) => c.consequence?.signal === 'novel-consequence'),
      },
      proposedBridges: PROPOSED_BRIDGES.length,
    },
    evidence: {
      formallyProved: evidence.byTag['formally-proved'],
      rejectedRows: count(BRIDGE_EQUATIONS, (e) => rejectedIds.has(e.id)),
    },
    formalRefs: {
      emitted: atlasRefs + catalogRefs,
      catalogBridgeKind: ofKind(['bridge']),
      catalogCounted: ofKind(['reduction', 'limit', 'derivation-step']),
      catalogCrossCheck: ofKind(['cross-check']),
      catalogProperty: ofKind(['property']),
    },
    derivationAudit,
    canonical: {
      // The prefactor, holds, unset-factor-note and comparison-target counts are canonical
      // entry facts that no bridge ingest moves; they stay typed in
      // tests/canonical/one-record.test.ts, where a change is a reviewed edit (Tom's review).
      bridgesWithoutPartner: bridgesWithoutCanonicalPartner().length,
      audit: {
        derived: canonicalAudit.derived,
        coefficientUnset: canonicalAudit.coefficientUnset,
        decoy: canonicalAudit.decoy,
        open: canonicalAudit.open,
      },
    },
    mapBothFormallyProved: {
      total: viz.stats.total,
      kept: viz.stats.kept,
      droppedNotMatching: viz.stats.droppedNotMatching,
      droppedMissingMetadata: viz.stats.droppedMissingMetadata,
    },
  };
}

/** The committed text of a census: two-space JSON, one trailing newline. */
export function serializeCensus(census: CatalogCensus): string {
  return `${JSON.stringify(census, null, 2)}\n`;
}

/** The lines on which the committed census and a fresh derivation differ; empty when they agree. */
export function censusDiff(committed: string, fresh: string): string[] {
  if (committed === fresh) return [];
  const a = committed.split('\n');
  const b = fresh.split('\n');
  const lines: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      lines.push(`  line ${i + 1}: committed ${a[i]?.trim() ?? '(none)'} | derived ${b[i]?.trim() ?? '(none)'}`);
    }
  }
  return lines;
}

function main(): number {
  const check = process.argv.includes('--check');
  const write = process.argv.includes('--write');
  if (check === write) {
    console.error('usage: bun scripts/catalog-census.ts --write | --check');
    return 2;
  }
  const fresh = serializeCensus(deriveCensus());
  const path = join(root, CENSUS_PATH);
  if (write) {
    writeFileSync(path, fresh);
    console.log(`wrote ${CENSUS_PATH}`);
    return 0;
  }
  let committed = '';
  try {
    committed = readFileSync(path, 'utf8');
  } catch {
    console.error(`${CENSUS_PATH} is missing; run: bun scripts/catalog-census.ts --write`);
    return 1;
  }
  const problems = censusDiff(committed, fresh);
  if (problems.length === 0) {
    console.log(`${CENSUS_PATH} matches a fresh derivation.`);
    return 0;
  }
  console.error(
    `${CENSUS_PATH} is stale:\n${problems.join('\n')}\nrun: bun scripts/catalog-census.ts --write, and review the diff`,
  );
  return 1;
}

if (import.meta.main) process.exitCode = main();
