/**
 * Composition graph — quantity nodes (v0.8.0 T2, per
 * docs/planning/v0.8.0-Design.md §3).
 *
 * A `Quantity` is a node in the composition graph: a named physical
 * quantity with an exact SI dimension (the ℤ⁷ exponent vector) and a
 * SPARSE set of regime attributes. Attributes are deliberately
 * `Partial` — the classification axes are unevenly load-bearing, so a
 * quantity records only what is known and sourced.
 *
 * The axis TYPES + the classification registry live in `axes.ts` (the
 * single source; `RegimeAttributes` references them). Symmetry, topology,
 * and quantum statistics are now first-class attribute axes (2026-07-05
 * extensible-axis expansion) — but they remain UNGATED in the discovery
 * falsifier until the discrimination audit (`axis-audit.ts`) shows they
 * actually fire on real candidates. The SI `Dimension` axis is separate
 * (the 7-base system in `dimensional/`), not an attribute here.
 *
 * @module composition/quantity
 */

import type { Dimension } from '../dimensional/types.js';
import type {
  ScaleAxis,
  ForceAxis,
  InformationAxis,
  SymmetryAxis,
  TopologyAxis,
  StatisticsAxis,
} from './axes.js';
import { AXES } from './axes.js';

/**
 * Sparse regime attributes — the classification axes demoted from
 * container dimensions to node attributes. Values + the gated flags live
 * in the `axes.ts` registry.
 *
 * @public
 */
export interface RegimeAttributes {
  readonly scale?: ScaleAxis;
  readonly force?: ForceAxis;
  readonly information?: InformationAxis;
  /** Symmetry class — first-class 2026-07-05; ungated until the audit earns it. */
  readonly symmetry?: SymmetryAxis;
  /** Topological invariant type — populates the Topology axis; ungated until the audit. */
  readonly topology?: TopologyAxis;
  /** Quantum statistics (the 7th axis); ungated until the audit confirms independent discrimination. */
  readonly statistics?: StatisticsAxis;
}

/**
 * A node in the composition graph: a physical quantity.
 *
 * `name` is the canonical graph identity (junction matching is by
 * name or by explicit `QuantityIdentification`); `symbol` is display
 * only. `dim` is the exact SI dimension used by the dimension-functor
 * check at composition junctions.
 *
 * @public
 */
export interface Quantity {
  /** Canonical graph identity, e.g. 'temperature', 'schwarzschild-radius'. */
  readonly name: string;
  /** Display symbol, e.g. 'T_H', 'r_s'. */
  readonly symbol: string;
  /** Exact SI dimension (ℤ⁷ exponent vector). */
  readonly dim: Dimension;
  /** Sparse regime attributes — only what is known. */
  readonly attributes: RegimeAttributes;
}

/** An attribute set read by axis name. The keys are the registry's axis names. */
type AttributeRecord = Readonly<Record<string, string | undefined>>;

/**
 * The attribute set `record` states, checked against the axis registry.
 *
 * Every key must be a registry axis and every value one of that axis's
 * values; anything else throws, so a misspelt axis or value in a data row
 * cannot enter the gate as a silently unstated axis. An `undefined` value is
 * an axis the record leaves open. The check is what makes the narrowing to
 * `RegimeAttributes` true; nothing is assumed.
 *
 * @internal
 */
export function regimeAttributesOf(record: AttributeRecord, where = 'attributes'): RegimeAttributes {
  const checked: Record<string, string> = {};
  for (const [axis, value] of Object.entries(record)) {
    if (value === undefined) continue;
    const spec = AXES.find((a) => a.name === axis);
    if (spec === undefined) throw new Error(`${where}: '${axis}' is not a registry axis`);
    if (!spec.values.includes(value)) {
      throw new Error(`${where}: '${value}' is not a value of the ${axis} axis (${spec.values.join(', ')})`);
    }
    checked[axis] = value;
  }
  return checked as RegimeAttributes;
}

/**
 * Graph-native membership criterion primitive (v0.8.0 G-2): two
 * attribute sets "differ" iff at least one registry axis is stated on
 * BOTH sides with different values. Axes stated on only one side are
 * inconclusive and do not count as a difference. The axes are the
 * registry's (`AXES`), so an axis added there is read here.
 *
 * A bridge is an edge whose endpoint quantities differ; a law is an
 * edge whose endpoints share all mutually-stated attributes.
 *
 * @public
 */
export function regimesDiffer(
  a: RegimeAttributes,
  b: RegimeAttributes,
): boolean {
  const left = a as AttributeRecord;
  const right = b as AttributeRecord;
  for (const { name } of AXES) {
    const av = left[name];
    const bv = right[name];
    if (av !== undefined && bv !== undefined && av !== bv) return true;
  }
  return false;
}
