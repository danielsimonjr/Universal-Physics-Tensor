/**
 * Regime gate for a chain that meets on a quantity name.
 *
 * The domain is the §VI.6.1 component of the catalog category of `beId`,
 * derived by `tensorIndexComponent`. Scale and force are the gated axes
 * on the two junction ports. A recorded `Regime` on both edges is
 * compared with `regimeOverlap`. Silence on a facet is not a mismatch.
 * The rule is `docs/planning/Regime-Aware-Join-Gate-Design.md`.
 *
 * This module does not write the catalog and does not call `deriveEvidence`.
 *
 * @module composition/chain-regime
 */

import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import {
  tensorIndexComponent,
  type TensorIndexComponent,
} from '../bridges/tensor-index.js';
import { regimeOverlap } from '../relations/regime.js';
import { GATE_AXES } from './axes.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import type { BridgeEdge } from './edge.js';
import type { Quantity } from './quantity.js';

/** The class a regime-incompatible join is recorded as. @internal */
export const REGIME_MISMATCH_KIND = 'rejected: regime mismatch' as const;

/** A join the regime gate refused. Not a stub and not a catalog write. @internal */
export interface ChainRegimeMismatch {
  readonly kind: typeof REGIME_MISMATCH_KIND;
  readonly edgeIds: readonly [string, string];
  readonly quantity: string;
  readonly reasons: readonly string[];
}

function edgeDomain(edge: BridgeEdge): TensorIndexComponent | undefined {
  if (edge.beId === null) return undefined;
  const entry = BRIDGE_EQUATIONS.find((row) => row.id === edge.beId);
  if (entry === undefined) return undefined;
  const component = tensorIndexComponent(entry.category);
  if (component === 'unassigned') return undefined;
  return component;
}

function junctionPorts(
  first: BridgeEdge,
  second: BridgeEdge,
): { quantity: string; producer: Quantity; consumer: Quantity } {
  const named = second.sources.find((src) => src.name === first.target.name);
  if (named !== undefined) {
    return { quantity: first.target.name, producer: first.target, consumer: named };
  }
  for (const ident of QUANTITY_IDENTIFICATIONS) {
    if (ident.from !== first.target.name) continue;
    const src = second.sources.find((candidate) => candidate.name === ident.to);
    if (src !== undefined) {
      return { quantity: first.target.name, producer: first.target, consumer: src };
    }
  }
  throw new Error(`chain regime gate: ${first.id} -> ${second.id} has no junction`);
}

/**
 * The regime mismatch of a pair, or `undefined` when every facet abstains
 * or agrees.
 *
 * Reasons, in order: a domain clash, then each clashing `GATE_AXES` axis,
 * then `regime: disjoint`. The producer value is written first.
 *
 * @internal
 */
export function joinRegimeMismatch(
  first: BridgeEdge,
  second: BridgeEdge,
): ChainRegimeMismatch | undefined {
  const { quantity, producer, consumer } = junctionPorts(first, second);
  const reasons: string[] = [];
  const producerDomain = edgeDomain(first);
  const consumerDomain = edgeDomain(second);
  if (
    producerDomain !== undefined &&
    consumerDomain !== undefined &&
    producerDomain !== consumerDomain
  ) {
    reasons.push(`domain: ${producerDomain} ≠ ${consumerDomain}`);
  }
  const producerAttrs = producer.attributes as Record<string, string | undefined>;
  const consumerAttrs = consumer.attributes as Record<string, string | undefined>;
  for (const axis of GATE_AXES) {
    const left = producerAttrs[axis];
    const right = consumerAttrs[axis];
    if (left !== undefined && right !== undefined && left !== right) {
      reasons.push(`${axis}: ${left} ≠ ${right}`);
    }
  }
  if (
    first.regime !== undefined &&
    second.regime !== undefined &&
    regimeOverlap(first.regime, second.regime) === 'disjoint'
  ) {
    reasons.push('regime: disjoint');
  }
  if (reasons.length === 0) return undefined;
  return {
    kind: REGIME_MISMATCH_KIND,
    edgeIds: [first.id, second.id],
    quantity,
    reasons,
  };
}
