/**
 * Unified per-bridge descriptor — one lookup that JOINS the catalog's three
 * id-keyed registries so a consumer reads a single object instead of
 * cross-referencing three hand-maintained sources:
 *
 *   1. `BRIDGE_EQUATIONS`   — catalog metadata (status, refs, signature, …)
 *   2. `BRIDGE_RHS_BY_ID`   — faithful right-hand-side AST (where encoded)
 *   3. `CATALOG_GRAPH`      — composition-graph edge(s) keyed by `beId`
 *
 * This is a DERIVED facade, not a fourth source of truth: every field still
 * lives in its home registry. The point is anti-drift — the failure mode behind
 * the stale `DATA_CONFRONTED = {23,36}` set and the `6.075e-12` value was the
 * registries silently disagreeing. They are now (a) reachable through one
 * accessor and (b) cross-checked by one guard
 * (`tests/bridges/descriptor-consistency.test.ts`), so a future id that exists
 * in one registry but not another fails loudly instead of drifting.
 *
 * The join lives here, beside `catalog-graph.ts`, because `composition/` owns
 * the graph and already imports `bridges/`. `bridges/` does not import it back.
 *
 * @module composition/descriptor
 */
import { BRIDGE_EQUATIONS, type BridgeEquationEntry } from '../bridges/index.js';
import { BRIDGE_RHS_BY_ID, parseBridgeId } from '../bridges/rhs-registry.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import type { BridgeEdge } from './edge.js';
import type { ExprNode } from '../dimensional/validator.js';

/** One bridge, joined across the catalog's three id-keyed registries. */
interface BridgeDescriptor {
  /** Catalog id (the range is the catalog's; NOTES.md records it). */
  readonly id: number;
  /** Catalog metadata (from `BRIDGE_EQUATIONS`). */
  readonly entry: BridgeEquationEntry;
  /** Faithful RHS AST (from `BRIDGE_RHS_BY_ID`), or `undefined` if not encoded. */
  readonly rhs: ExprNode | undefined;
  /**
   * Composition-graph edges carrying this `beId` (from `CATALOG_GRAPH`).
   * Usually one; a few bridges have several (e.g. BE-42 + BE-42-via-rs).
   * Empty when the bridge has no graph edge.
   */
  readonly edges: readonly BridgeEdge[];
}

const DESCRIPTORS: ReadonlyMap<number, BridgeDescriptor> = (() => {
  const edgesById = new Map<number, BridgeEdge[]>();
  for (const e of CATALOG_GRAPH) {
    if (e.beId === null) continue;
    const list = edgesById.get(e.beId);
    if (list) list.push(e);
    else edgesById.set(e.beId, [e]);
  }
  const m = new Map<number, BridgeDescriptor>();
  for (const entry of BRIDGE_EQUATIONS) {
    m.set(entry.id, {
      id: entry.id,
      entry,
      rhs: BRIDGE_RHS_BY_ID.get(entry.id),
      edges: edgesById.get(entry.id) ?? [],
    });
  }
  return m;
})();

/**
 * Every bridge descriptor, keyed by catalog id. The single joined view of the
 * three registries.
 *
 * @internal
 */
export const BRIDGE_DESCRIPTORS: ReadonlyMap<number, BridgeDescriptor> = DESCRIPTORS;

/**
 * Look up one bridge by id (a number, `'42'`, or `'BE-42'` — case-insensitive).
 * Returns the joined descriptor (metadata + RHS + edges). Throws if the id is
 * unparseable or not catalogued.
 *
 * @internal
 */
export function getBridge(bridgeId: number | string): BridgeDescriptor {
  const id = parseBridgeId(bridgeId);
  const d = DESCRIPTORS.get(id);
  if (d === undefined) {
    throw new RangeError(
      `getBridge: no catalogued bridge with id ${id} (BE-${id}).`,
    );
  }
  return d;
}
