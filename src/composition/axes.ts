/**
 * The extensible tensor-axis registry — the single source for UPT's classification
 * axes (the regime/attribute layer the discovery funnel and quantities use).
 *
 * Each axis is BOTH a typed union (compile-time safety) AND an {@link AxisSpec}
 * registry entry (runtime — drives the discovery falsifier and the discrimination
 * audit). Adding an axis is one union + one registry line + tagging quantities;
 * enabling its falsifier gate is a one-line `gated: true` flip — but only after the
 * discrimination audit (`axis-audit.ts`) shows it actually fires. Rank grows on
 * measured physics, not vision — an axis that only ever abstains stays ungated.
 *
 * NOTE: the SI `Dimension` axis is deliberately NOT here — it is the complete 7-base
 * system in `dimensional/` (conflating it would break Buckingham-π). The tensor-config
 * types in `core/types.ts` (`PhysicalScale`/`Force`/… consumed by `UniversalTensor`)
 * are a separate concern; this registry is the discovery/attribute layer.
 *
 * Leaf module — no intra-`composition` imports (keeps the type-only cycle count at 0).
 *
 * @module composition/axes
 */

/** Length/energy scale regime. @internal */
export type ScaleAxis = 'quantum' | 'mesoscopic' | 'classical' | 'cosmological';
/** Fundamental interaction. @internal */
export type ForceAxis =
  | 'gravitational'
  | 'electromagnetic'
  | 'weak'
  | 'strong'
  | 'emergent';
/** Information measure. @internal */
export type InformationAxis = 'von-neumann' | 'shannon' | 'kolmogorov' | 'discord';
/** Symmetry class. @internal */
export type SymmetryAxis = 'poincare' | 'gauge' | 'conformal' | 'susy' | 'emergent';
/** Topological classification (invariant type). @internal */
export type TopologyAxis = 'trivial' | 'chern' | 'winding' | 'z2' | 'berry';
/** Quantum statistics (the 7th axis — orthogonal to the other six). @internal */
export type StatisticsAxis = 'bosonic' | 'fermionic' | 'anyonic' | 'parastatistic';

/** The scale values, the one list the registry row and every typed consumer read. @internal */
export const SCALE_AXIS_VALUES: readonly ScaleAxis[] = ['quantum', 'mesoscopic', 'classical', 'cosmological'];
/** The force values. @internal */
export const FORCE_AXIS_VALUES: readonly ForceAxis[] = ['gravitational', 'electromagnetic', 'weak', 'strong', 'emergent'];
/** The information-measure values. @internal */
export const INFORMATION_AXIS_VALUES: readonly InformationAxis[] = ['von-neumann', 'shannon', 'kolmogorov', 'discord'];
/** The symmetry values. @internal */
export const SYMMETRY_AXIS_VALUES: readonly SymmetryAxis[] = ['poincare', 'gauge', 'conformal', 'susy', 'emergent'];
/** The topology values. @internal */
export const TOPOLOGY_AXIS_VALUES: readonly TopologyAxis[] = ['trivial', 'chern', 'winding', 'z2', 'berry'];
/** The statistics values. @internal */
export const STATISTICS_AXIS_VALUES: readonly StatisticsAxis[] = ['bosonic', 'fermionic', 'anyonic', 'parastatistic'];

/** A classification-axis specification. @internal */
export interface AxisSpec {
  /** The axis key, matching the `RegimeAttributes` field name. */
  readonly name: string;
  /** The axis's allowed values at runtime (must equal the typed union's members). */
  readonly values: readonly string[];
  /**
   * Whether the discovery axis-falsifier gates on this axis. Flipped to `true`
   * ONLY when `auditAxisDiscrimination` shows the axis actually clashes on real
   * candidates — never on vision alone.
   */
  readonly gated: boolean;
  readonly description: string;
}

/**
 * The classification-axis registry. `gated` reflects measured discrimination:
 * scale/force fire on the current catalog; the rest abstain (too little attribute
 * coverage yet) and stay ungated until the branch expansion + audit earn them a gate.
 *
 * @internal
 */
export const AXES: readonly AxisSpec[] = [
  {
    name: 'scale',
    values: SCALE_AXIS_VALUES,
    gated: true,
    description: 'Length/energy-scale regime (quantum → cosmological).',
  },
  {
    name: 'force',
    values: FORCE_AXIS_VALUES,
    gated: true,
    description: 'Fundamental (or emergent effective) interaction.',
  },
  {
    name: 'information',
    values: INFORMATION_AXIS_VALUES,
    gated: false,
    description: 'Information measure — authored, not gated (see discovery precision calibration).',
  },
  {
    name: 'symmetry',
    values: SYMMETRY_AXIS_VALUES,
    gated: false,
    description: 'Symmetry class — first-class attribute; ungated until coverage + audit earn it.',
  },
  {
    name: 'topology',
    values: TOPOLOGY_AXIS_VALUES,
    gated: false,
    description: 'Topological invariant type — populates the rank-6 Topology axis; ungated until audit.',
  },
  {
    name: 'statistics',
    values: STATISTICS_AXIS_VALUES,
    gated: false,
    description: 'Quantum statistics (the 7th axis). NOTE: spin-statistics ties it to symmetry — the audit must confirm it discriminates independently before gating.',
  },
];

/** The axis names the discovery falsifier gates on (derived from the registry). @internal */
export const GATE_AXES: readonly string[] = AXES.filter((a) => a.gated).map((a) => a.name);
