/**
 * Composition-derived recovery.
 *
 * Single-bridge linkage asks whether one bridge RHS is a canonical equation.
 * This asks the same question of a chain of two edges that both carry a
 * symbolic form. The comparison is `normalForm`: the same relation up to a
 * dimensionless factor. Dimensionful cancellation is not applied, so an
 * unsimplified chain is not rewritten into a simpler formula.
 *
 * A chain is never `restates-canonical`. That label is the F4 guard on one
 * bridge the registry already names. A chain is a derivation, and a
 * structural match is `recovers`.
 *
 * @module composition/composition-recovery
 * @internal
 */

import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import { normalForm } from '../canonical/normal-form.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import { composeSymbolic, SymbolicCompositionError } from './compose-symbolic.js';
import type { BridgeEdge } from './edge.js';

/** One ordered pair of edges that composed. @internal */
export interface CompositionRecoveryPair {
  readonly firstId: string;
  readonly secondId: string;
}

/**
 * A chain whose normal form equals a canonical scalar AST.
 * `classification` is always `recovers`.
 * @internal
 */
export interface CompositionRecoveryHit extends CompositionRecoveryPair {
  readonly canonicalId: string;
  readonly classification: 'recovers';
}

/** The chains that were searched, and the ones that matched. @internal */
export interface CompositionRecoveryScan {
  readonly pairs: readonly CompositionRecoveryPair[];
  readonly hits: readonly CompositionRecoveryHit[];
}

function pairKey(pair: CompositionRecoveryPair): string {
  return `${pair.firstId}\0${pair.secondId}`;
}

/**
 * Search two-edge symbolic chains against the canonical registry.
 *
 * The default edge list is the catalog graph. A caller may pass a shorter
 * list; the canonical side stays the registry. Pairs that cannot compose
 * are not examined. Order is by edge id, then canonical id.
 *
 * @internal
 */
export function scanCompositionRecovery(
  edges: readonly BridgeEdge[] = CATALOG_GRAPH,
): CompositionRecoveryScan {
  const symbolic = edges.filter((edge) => edge.symbolic !== undefined);
  const canons = CANONICAL_EQUATIONS.filter((ce) => ce.scalarAst !== undefined).map((ce) => ({
    id: ce.id,
    normal: normalForm(ce.scalarAst!),
  }));

  const pairs: CompositionRecoveryPair[] = [];
  const hits: CompositionRecoveryHit[] = [];

  for (const first of symbolic) {
    for (const second of symbolic) {
      if (first.id === second.id) continue;
      let expr;
      try {
        expr = composeSymbolic(first, second).expr;
      } catch (error) {
        if (error instanceof SymbolicCompositionError) continue;
        throw error;
      }
      pairs.push({ firstId: first.id, secondId: second.id });
      const form = normalForm(expr);
      for (const canon of canons) {
        if (form !== canon.normal) continue;
        hits.push({
          firstId: first.id,
          secondId: second.id,
          canonicalId: canon.id,
          classification: 'recovers',
        });
      }
    }
  }

  pairs.sort((a, b) => (pairKey(a) < pairKey(b) ? -1 : pairKey(a) > pairKey(b) ? 1 : 0));
  hits.sort((a, b) => {
    const byPair = pairKey(a) < pairKey(b) ? -1 : pairKey(a) > pairKey(b) ? 1 : 0;
    if (byPair !== 0) return byPair;
    return a.canonicalId < b.canonicalId ? -1 : a.canonicalId > b.canonicalId ? 1 : 0;
  });
  return { pairs, hits };
}
