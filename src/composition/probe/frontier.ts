/**
 * Frontier scanners — wrap Product A surfaces; residual gaps are Product B.
 *
 * @module composition/probe/frontier
 */

import { proposeLinkCandidates, proposeOrphanConnectors } from '../bridge-analysis.js';
import { predictMissingBridges } from '../bridge-prediction.js';
import { QUANTITY_IDENTIFICATIONS } from '../compose.js';
import { candidateId, candidateIdIfSlug } from '../adjudication.js';
import type { BridgeEdge } from '../edge.js';
import type { FrontierGap, ProbeDataset, SearchProblem } from './types.js';

const ALIAS_PAIRS = new Set(
  QUANTITY_IDENTIFICATIONS.map((id) => candidateId(id.from, id.to)),
);

/**
 * Stable pair token. Slug pairs keep the ledger id. Other symbols are
 * length-prefixed under `raw:` so a `~` inside a name cannot alias two
 * pairs, and the token cannot collide with a kebab `candidateId`.
 */
function gapPairToken(a: string, b: string): string {
  const slug = candidateIdIfSlug(a, b);
  if (slug !== undefined) return slug;
  const [x, y] = a <= b ? [a, b] : [b, a];
  return `raw:${x.length}:${x}~${y.length}:${y}`;
}

function linkGapId(a: string, b: string): string {
  return `fg-link-${gapPairToken(a, b)}`;
}

/**
 * Project Product A link candidates to `relation-link` gaps.
 * Registered quantity identifications are not gaps.
 *
 * @internal
 */
export function wrapRelationLinkGaps(edges: readonly BridgeEdge[]): FrontierGap[] {
  const out: FrontierGap[] = [];
  for (const c of proposeLinkCandidates(edges)) {
    const slug = candidateIdIfSlug(c.a, c.b);
    if (slug !== undefined && ALIAS_PAIRS.has(slug)) continue;
    out.push({
      id: linkGapId(c.a, c.b),
      kind: 'relation-link',
      participants: [
        { kind: 'quantity-identification', id: c.a },
        { kind: 'quantity-identification', id: c.b },
      ],
      observations: [],
      regimes: [],
      assumptions: [],
      constraints: [`dim:${c.dim}`],
      evidence: {
        summary: `${c.a} ≟ ${c.b} share ${c.dim}`,
        sourceIds: ['upt candidates'],
      },
      identifiability: {
        kind: 'graph-structural',
        parametric: {
          status: 'unknown',
          reasons: ['identification gaps are Product A — use upt discover'],
        },
      },
      searchability: {
        searchable: false,
        reasons: ['relation-link gaps are reviewed by upt discover, not probe search'],
      },
      status: 'identified',
    });
  }
  return out.sort((x, y) => x.id.localeCompare(y.id));
}

/** Isolated-bridge connectors as relation-link gaps. @internal */
export function wrapConnectorGaps(edges: readonly BridgeEdge[]): FrontierGap[] {
  const report = proposeOrphanConnectors(edges);
  return report.connectors.map((c) => ({
    id: `fg-conn-${gapPairToken(c.orphanQuantity, c.coreQuantity)}`,
    kind: 'relation-link' as const,
    participants: [
      { kind: 'quantity-identification' as const, id: c.orphanQuantity },
      { kind: 'quantity-identification' as const, id: c.coreQuantity },
    ],
    observations: [],
    regimes: [c.orphanEdge, c.coreEdge],
    assumptions: [],
    constraints: [`dim:${c.dim}`],
    evidence: {
      summary: `orphan ${c.orphanEdge} ≟ core via ${c.orphanQuantity}~${c.coreQuantity}`,
      sourceIds: ['upt connectors'],
    },
    identifiability: {
      kind: 'graph-structural' as const,
      parametric: { status: 'unknown' as const, reasons: ['Product A connector'] },
    },
    searchability: {
      searchable: false,
      reasons: ['connectors are Product A review surfaces'],
    },
    status: 'identified' as const,
  }));
}

/** Empty (scale×force) cells as regime-transition gaps. @internal */
export function wrapRegimeGaps(edges: readonly BridgeEdge[]): FrontierGap[] {
  const report = predictMissingBridges(edges);
  return report.predictions.map((p, i) => ({
    id: `fg-regime-${i}-${hashSlug(p.regimeA)}-${hashSlug(p.regimeB)}`,
    kind: 'regime-transition' as const,
    participants: [],
    observations: [],
    regimes: [p.regimeA, p.regimeB],
    assumptions: [],
    constraints: [`sharedNeighbors:${p.sharedNeighbors}`],
    evidence: {
      summary: `empty regime pair ${p.regimeA} ↔ ${p.regimeB} via ${p.via.join(',')}`,
      sourceIds: ['upt predict'],
    },
    identifiability: {
      kind: 'graph-structural' as const,
      parametric: { status: 'unknown' as const, reasons: ['structural triadic closure only'] },
    },
    searchability: {
      searchable: false,
      reasons: ['regime predictions are structural hypotheses, not expression searches'],
    },
    status: 'identified' as const,
  }));
}

function hashSlug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/** Combined read-only frontier (Product A wrappers). @internal */
export function scanFrontier(edges: readonly BridgeEdge[]): FrontierGap[] {
  return [...wrapRelationLinkGaps(edges), ...wrapConnectorGaps(edges), ...wrapRegimeGaps(edges)];
}

/** Look up a wrapped gap by id. @internal */
export function findFrontierGap(
  edges: readonly BridgeEdge[],
  id: string,
): FrontierGap | undefined {
  return scanFrontier(edges).find((g) => g.id === id);
}

/**
 * Build a Product B search problem for an unexplained-observation /
 * prediction-residual gap. Relation-link and regime-transition gaps are
 * refused; the error names `upt discover`.
 *
 * @internal
 */
export function problemFromResidualGap(
  gap: FrontierGap,
  target: SearchProblem['target'],
  governing: SearchProblem['governing'],
  exploratory?: ProbeDataset,
  holdout?: ProbeDataset,
): SearchProblem {
  if (gap.kind === 'relation-link' || gap.kind === 'regime-transition') {
    throw new RangeError(
      `problemFromResidualGap: ${gap.kind} is not a Product B search target; use upt discover`,
    );
  }
  const nObs = exploratory?.rows.length ?? 0;
  const nPar = 1;
  const identifiable = nObs >= nPar && nObs > 0;
  const enriched: FrontierGap = {
    ...gap,
    identifiability: {
      kind: 'parametric',
      parametric: {
        status: identifiable ? 'identifiable' : nObs === 0 ? 'unknown' : 'non-identifiable',
        rank: identifiable ? nPar : 0,
        nParameters: nPar,
        nIndependentObservations: nObs,
        reasons: identifiable
          ? [`${nObs} observations vs ${nPar} free prefactor`]
          : ['insufficient observations for a unique prefactor'],
      },
    },
    searchability: {
      searchable: identifiable || nObs === 0,
      reasons: identifiable
        ? ['parametric rank sufficient for a monomial prefactor']
        : nObs === 0
          ? ['no data — structural generation only; status will be insufficient-evidence']
          : ['non-identifiable — do not search'],
    },
    status: identifiable || nObs === 0 ? 'searchable' : 'underdetermined',
  };
  return {
    gap: enriched,
    target,
    governing,
    exploratory,
    holdout,
    discrepancy: gap.discrepancy,
    assumptions: gap.assumptions,
  };
}
