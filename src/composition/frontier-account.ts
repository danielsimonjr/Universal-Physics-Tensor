/**
 * Two lists the catalog already knows how to tell apart: records that were
 * examined and did not become an accepted connection, and connections the
 * catalog does not contain. Neither list is a verdict and neither list
 * changes a score.
 *
 * @module composition/frontier-account
 * @internal
 */
import { proposeLinkCandidates } from './bridge-analysis.js';
import { catalogEntries } from '../bridges/catalog-load.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import type { BridgeEdge } from './edge.js';
import { scanFrontier } from './probe/frontier.js';
import { expressionSearchGaps } from './probe/expression-gaps.js';
import type { FrontierGap } from './probe/types.js';
import { REJECTED_BRIDGE_ADJUDICATIONS } from '../bridges/rejected.js';
import { listConfrontations } from '../bridges/confrontations.js';

/**
 * The link proposer's existing label, quoted from `upt candidates`.
 * Not a new verdict.
 *
 * @internal
 */
export const CANDIDATE_NOT_A_BRIDGE_REASON =
  'a coincidence-heavy REVIEW SURFACE, NOT discovered bridges';

/**
 * Bridge ids whose catalog row is marked `contested` in `data/bridge-catalog.json`.
 * A contested row stays out of the null-result list until an adjudication
 * exists. A membership rejection is that adjudication. Derived from the data,
 * never typed here (the owner's decision of 2026-10-09).
 *
 * @internal
 */
export const CONTESTED_BRIDGE_IDS: readonly string[] = catalogEntries()
  .filter((entry) => entry.contested === true)
  .map((entry) => `be-${entry.id}`);

/** Why an entry cannot be confronted yet: no comparison exists, or its data is absent. @internal */
export type ConfrontationMarkStatus = 'unconfrontable' | 'data-pending';

/** One entry's confrontation status, with the reason that entry already carries. @internal */
export interface ConfrontationMark {
  readonly id: string;
  readonly status: ConfrontationMarkStatus;
  readonly reason: string;
}

/** One record that was examined and did not become an accepted connection, and where that finding came from. @internal */
export interface NullResultRow {
  readonly id: string;
  readonly reason: string;
  readonly source: 'membership-rejection' | 'candidate' | 'confrontation';
}

/** One connection the catalog does not contain, named by the two quantities it would join. @internal */
export interface FrontierAccountRow {
  readonly id: string;
  readonly left: string;
  readonly right: string;
  readonly reason: string;
  /** A registered observation id, or the words `observation absent`. */
  readonly observation: string;
}

/** The two lists together: the null results, and the frontier the catalog does not cover. @internal */
export interface FrontierAccount {
  readonly nullResults: readonly NullResultRow[];
  readonly frontier: readonly FrontierAccountRow[];
}

/** Inputs the account reads rather than derives: rejections, contested ids, confrontation marks, and whether catalog-wide expression gaps count. @internal */
export interface FrontierAccountOptions {
  readonly rejections?: readonly { id: string; reason: string }[];
  readonly contestedIds?: readonly string[];
  readonly marks?: readonly ConfrontationMark[];
  /**
   * Expression gaps are catalog-wide applied-case templates, not missing
   * edges of a fixture graph. The live catalog includes them because
   * `upt probe scan` emits them. A fixture with no missing edges does not.
   */
  readonly includeExpressionGaps?: boolean;
}

const OBSERVATION_ABSENT = 'observation absent';

function byId<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id) || a.id.localeCompare(b.id));
}

/** Read marks only where an entry already carries the status. Invent none. @internal */
export function marksFromEntries(
  entries: readonly { bridgeId: number; title: string; status?: string; reason?: string }[],
): ConfrontationMark[] {
  const out: ConfrontationMark[] = [];
  for (const entry of entries) {
    if (entry.status !== 'unconfrontable' && entry.status !== 'data-pending') continue;
    const reason = entry.reason?.trim() ? entry.reason : entry.title;
    out.push({ id: `be-${entry.bridgeId}`, status: entry.status, reason });
  }
  return out;
}

function sidesOf(gap: FrontierGap): { left: string; right: string } {
  const participants = gap.participants.map((p) => p.id).filter((id) => id !== '');
  if (participants.length >= 2) return { left: participants[0]!, right: participants[1]! };
  if (gap.regimes.length >= 2) return { left: gap.regimes[0]!, right: gap.regimes[1]! };
  return { left: gap.id, right: gap.evidence.summary };
}

function frontierRow(gap: FrontierGap): FrontierAccountRow {
  const sides = sidesOf(gap);
  return {
    id: gap.id,
    left: sides.left,
    right: sides.right,
    reason: gap.kind,
    observation: gap.observations.length > 0 ? gap.observations.join(', ') : OBSERVATION_ABSENT,
  };
}

/**
 * Null results and frontier rows for one graph. Rejections, contested ids,
 * and confrontation marks are inputs: the function does not invent them.
 *
 * @internal
 */
export function accountFromGraph(
  edges: readonly BridgeEdge[],
  options: FrontierAccountOptions = {},
): FrontierAccount {
  const contested = new Set(options.contestedIds ?? []);
  const rejectionIds = new Set((options.rejections ?? []).map((row) => row.id));
  const nullResults: NullResultRow[] = [];

  for (const rejection of options.rejections ?? []) {
    nullResults.push({ id: rejection.id, reason: rejection.reason, source: 'membership-rejection' });
  }
  for (const candidate of proposeLinkCandidates(edges)) {
    nullResults.push({
      id: `candidate:${candidate.a}:${candidate.b}`,
      reason: CANDIDATE_NOT_A_BRIDGE_REASON,
      source: 'candidate',
    });
  }
  for (const mark of options.marks ?? []) {
    if (contested.has(mark.id) && !rejectionIds.has(mark.id)) continue;
    nullResults.push({ id: mark.id, reason: mark.reason, source: 'confrontation' });
  }

  const gaps = [
    ...scanFrontier(edges),
    ...(options.includeExpressionGaps ? expressionSearchGaps() : []),
  ];
  return {
    nullResults: byId(nullResults),
    frontier: byId(gaps.map(frontierRow)),
  };
}

/** The catalog's two lists. Expression gaps are included because probe scan emits them. @internal */
export function catalogFrontierAccount(): FrontierAccount {
  return accountFromGraph(CATALOG_GRAPH, {
    rejections: REJECTED_BRIDGE_ADJUDICATIONS.map((row) => ({
      id: `be-${row.beId}`,
      reason: row.reason,
    })),
    contestedIds: CONTESTED_BRIDGE_IDS,
    marks: marksFromEntries(listConfrontations()),
    includeExpressionGaps: true,
  });
}

/** Both headings and both counts. An empty list is the word `(empty)`, not silence. @internal */
export function formatFrontierAccount(account: FrontierAccount): string {
  const lines: string[] = [];
  lines.push(`Null results (${account.nullResults.length})`);
  if (account.nullResults.length === 0) lines.push('  (empty)');
  for (const row of account.nullResults) {
    lines.push(`  ${row.id}  ${row.reason}`);
  }
  lines.push(`Frontier (${account.frontier.length})`);
  if (account.frontier.length === 0) lines.push('  (empty)');
  for (const row of account.frontier) {
    lines.push(`  ${row.left} — ${row.right}  ${row.reason}  ${row.observation}`);
  }
  return lines.join('\n');
}
