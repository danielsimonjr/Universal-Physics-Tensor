/**
 * Shared `--source=catalog|canonical|both` graph resolution — replaces
 * `bin/upt.mjs`'s `resolveGraph` (lines 53-67). Every analysis command
 * (`discover` / `candidates` / `map` / ...) that accepts `--source` calls
 * this once to get the graph + a human-readable label for its banner.
 */

import type { BridgeEdge } from '../composition/edge.js';
import type { ParsedArgs } from './args.js';
import type { CommandCtx } from './command.js';
import { CliError } from './errors.js';

export type SourceName = 'catalog' | 'canonical' | 'both';

export function resolveGraph(
  api: CommandCtx['api'],
  flags: ParsedArgs['flags']
): { graph: BridgeEdge[]; label: string; source: SourceName } {
  const values = flags.get('source');
  const src = values && values.length > 0 ? values[values.length - 1] : 'catalog';

  switch (src) {
    case 'catalog':
      return {
        graph: [...api.CATALOG_GRAPH],
        label: `catalog (${api.BRIDGE_EQUATIONS.length}-bridge)`,
        source: 'catalog',
      };
    case 'canonical':
      return {
        graph: [...api.CANONICAL_GRAPH],
        label: 'canonical (standard-physics L-layer, bridges excluded)',
        source: 'canonical',
      };
    case 'both':
      return {
        graph: [...api.CATALOG_GRAPH, ...api.CANONICAL_GRAPH],
        label: 'catalog + canonical',
        source: 'both',
      };
    default:
      throw new CliError(`upt: unknown --source='${src}' (expected: catalog | canonical | both)`);
  }
}

/**
 * What a result is anchored to (audit I3), printed beside the source in text and carried as the
 * envelope's `anchor` in `--json`. Two different anchors exist and are never merged:
 * `groundTruth` is the discovery funnel's known values (`--anchor=k=v`, default one solar mass);
 * `core` is the set of established-confidence edges that "anchored" means in a linkage view.
 */
export interface AnchorScope {
  readonly groundTruth?: { readonly values: Readonly<Record<string, number>>; readonly isDefault: boolean };
  readonly core?: { readonly establishedEdges: number; readonly edges: number };
}

/** The discovery ground truth a result is relative to: the `--anchor` values when given, else the default. */
export function groundTruthAnchor(
  api: CommandCtx['api'],
  opts: { readonly groundTruth?: Readonly<Record<string, number>> },
): NonNullable<AnchorScope['groundTruth']> {
  return opts.groundTruth === undefined
    ? { values: { ...api.ANCHOR_DEFAULT }, isDefault: true }
    : { values: { ...opts.groundTruth }, isDefault: false };
}

/** The established core of `graph`: its established-confidence edge count beside its edge count. */
export function coreAnchor(graph: readonly BridgeEdge[]): NonNullable<AnchorScope['core']> {
  return { establishedEdges: graph.filter((e) => e.confidence === 'established').length, edges: graph.length };
}

/** The text line naming the ground-truth anchor and whether it is the default. */
export function groundTruthLine(a: NonNullable<AnchorScope['groundTruth']>): string {
  const values = Object.entries(a.values).map(([k, v]) => `${k}=${v}`).join(', ');
  return `anchor: ${values}${a.isDefault ? ' (the default; --anchor=k=v replaces it)' : ' (from --anchor)'}`;
}

/** The text line stating what "anchored" means for a graph's established core. */
export function coreLine(a: NonNullable<AnchorScope['core']>): string {
  return `anchored core: the clusters holding at least one of the ${a.establishedEdges} established-confidence edge(s) of the ${a.edges} in this graph`;
}