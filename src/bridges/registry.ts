/**
 * One registration for a catalog bridge.
 *
 * The catalog array, the right-hand side map, the evaluator map, and the
 * edge list are projections of this registry. A second `BRIDGE_EQUATIONS`
 * literal is a scan hit. An `ab-*` id is an atlas model and is rejected.
 *
 * @module bridges/registry
 */
import type { ExprNode } from '../dimensional/validator.js';

/** The fields a registration may carry. Each projection reads one of them. */
export interface BridgeRegistration {
  /** Numeric catalog id, when the other parts do not already carry it. */
  readonly id?: number | string;
  /** Catalog row. `id` is the catalog id. */
  readonly entry?: { readonly id: number };
  /** Encoded right-hand side. Absent when the bridge has no AST. */
  readonly rhs?: ExprNode;
  /** Id-keyed evaluator. */
  readonly evaluator?: { readonly bridgeId: number };
  /**
   * Composition edge. `beId: null` stays on the edge list. The edge `id`
   * is what a second registration of the same edge matches.
   */
  readonly edge?: { readonly id: string; readonly beId: number | null };
}

/** The four projections, in registration order. */
export interface BridgeRegistry {
  register(parts: BridgeRegistration): void;
  equations(): { readonly id: number }[];
  rhs(): ReadonlyMap<number, ExprNode>;
  evaluators(): ReadonlyMap<number, { readonly bridgeId: number }>;
  edges(): { readonly id: string; readonly beId: number | null }[];
}

/**
 * An empty registry. Tests use this. Production uses {@link registerBridge}.
 */
export function createBridgeRegistry(): BridgeRegistry {
  const entries = new Map<number, { readonly id: number }>();
  const rhs = new Map<number, ExprNode>();
  const evaluators = new Map<number, { readonly bridgeId: number }>();
  const edges: { readonly id: string; readonly beId: number | null }[] = [];
  const edgeIds = new Set<string>();

  function numericId(parts: BridgeRegistration): number | undefined {
    if (typeof parts.id === 'string') {
      if (parts.id.startsWith('ab-')) {
        throw new Error(`registerBridge rejects atlas id '${parts.id}'`);
      }
      throw new Error(`registerBridge rejects id '${parts.id}'`);
    }
    if (typeof parts.id === 'number') return parts.id;
    if (parts.entry !== undefined) return parts.entry.id;
    if (parts.evaluator !== undefined) return parts.evaluator.bridgeId;
    if (parts.edge !== undefined && parts.edge.beId !== null) return parts.edge.beId;
    return undefined;
  }

  return {
    register(parts) {
      const id = numericId(parts);
      if (parts.entry !== undefined) {
        if (id === undefined) throw new Error('registerBridge entry has no id');
        const prev = entries.get(id);
        if (prev === undefined) entries.set(id, parts.entry);
        else if (prev !== parts.entry && JSON.stringify(prev) !== JSON.stringify(parts.entry)) {
          throw new Error(`registerBridge: bridge ${id} already has a different catalog entry`);
        }
      }
      if (parts.rhs !== undefined) {
        if (id === undefined) throw new Error('registerBridge rhs has no id');
        const prev = rhs.get(id);
        if (prev === undefined) rhs.set(id, parts.rhs);
        else if (prev !== parts.rhs && JSON.stringify(prev) !== JSON.stringify(parts.rhs)) {
          throw new Error(`registerBridge: bridge ${id} already has a different right-hand side`);
        }
      }
      if (parts.evaluator !== undefined) {
        const bridgeId = parts.evaluator.bridgeId;
        const prev = evaluators.get(bridgeId);
        if (prev === undefined) evaluators.set(bridgeId, parts.evaluator);
        else if (prev !== parts.evaluator) {
          throw new Error(`registerBridge: bridge ${bridgeId} already has an evaluator`);
        }
      }
      if (parts.edge !== undefined && !edgeIds.has(parts.edge.id)) {
        edgeIds.add(parts.edge.id);
        edges.push(parts.edge);
      }
    },
    equations() {
      return [...entries.values()];
    },
    rhs() {
      return new Map(rhs);
    },
    evaluators() {
      return new Map(evaluators);
    },
    edges() {
      return [...edges];
    },
  };
}

/** The production registry. Snapshots are taken by the modules that export them. */
export const bridgeRegistry = createBridgeRegistry();

/**
 * Register one bridge, or one part of one, on the production registry.
 * An id that starts with `ab-` throws.
 */
export function registerBridge(parts: BridgeRegistration): void {
  bridgeRegistry.register(parts);
}
