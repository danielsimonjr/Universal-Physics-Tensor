/**
 * `RegimeType` extension system — v0.8 Proposal 5.
 *
 * Per P5 Decision #1, this module ships the extension MECHANISM
 * (`defineRegime`, `lookupRegime`, `listRegimesByAxis`,
 * `provenanceFor`) PLUS the eight v0.6-shipped closed-union values
 * pre-registered (per Phase 2 — see `src/core/regimes-builtins.ts`).
 * Closed taxonomy of new physics-regime built-ins is deferred to
 * v0.9 per Decision #1 framing.
 *
 * Per P5 Adam-H1 reconciliation, Phase 4's per-cell regime field
 * ships as a sibling registry (`regimesForCell`) keyed by cell id
 * rather than as a new field on `BridgeCell` (avoids the
 * `cellToBridge` adapter round-trip that would strip unknown
 * fields).
 *
 * Per P5 Eve-M2 reconciliation, `FluxRuleKind` is extended with
 * `'regime-consistency'` discriminator in this commit (Phase 4
 * rule fires from `addCell`).
 *
 * @module core/regime-registry
 */

import type { AxisName } from './universal-index.js';

/**
 * Provenance for a registered regime. Tracks WHO registered the
 * regime (the catalog source or downstream package name) and WHEN.
 * Per P5 Decision #4.
 *
 * @public
 */
export interface RegimeProvenance {
  /** The package or module that registered this regime. */
  readonly registeredBy: string;
  /** ISO-8601 timestamp string. Filled in by `defineRegime`. */
  readonly registeredAt: string;
  /** Optional citation (URL, DOI, or free-text). */
  readonly citation?: string;
}

/**
 * The base shape every registered regime carries. Implementation
 * detail: callers always interact via the per-axis convenience
 * APIs (`defineScale`, `defineForce`, ... — Phase 3) which
 * narrow `axis` to a literal at the type level.
 *
 * Per P5 Decision #2 (locked field set): `axis`, `tag`,
 * `displayName`, `tags?`, `limits?`, `provenance`.
 *
 * @public
 */
export interface RegimeValueBase {
  readonly axis: AxisName;
  readonly tag: string;
  readonly displayName: string;
  readonly tags?: ReadonlyArray<string>;
  readonly limits?: {
    readonly min?: number;
    readonly max?: number;
  };
  readonly provenance: RegimeProvenance;
}

/**
 * Spec passed to `defineRegime` to register a new regime value
 * under a given axis. The `provenance.registeredAt` field is
 * filled by `defineRegime` (so callers don't have to thread the
 * timestamp themselves).
 *
 * @public
 */
export interface RegimeSpec<Axis extends AxisName = AxisName> {
  readonly axis: Axis;
  readonly tag: string;
  readonly displayName: string;
  readonly tags?: ReadonlyArray<string>;
  readonly limits?: { readonly min?: number; readonly max?: number };
  readonly provenance: Omit<RegimeProvenance, 'registeredAt'> & {
    readonly registeredAt?: string;
  };
}

/**
 * Thrown when `defineRegime` receives a spec that contradicts an
 * already-registered (axis, tag) pair. Carries both specs for
 * diagnosis. Per P5 Decision #4 + Eve-L1 reconciliation
 * (idempotent re-registration with the SAME spec is allowed;
 * collisions throw).
 *
 * @public
 */
export class RegimeCollisionError extends Error {
  public readonly axis: AxisName;
  public readonly tag: string;
  constructor(axis: AxisName, tag: string, existing: RegimeValueBase, incoming: RegimeSpec) {
    super(
      `RegimeRegistry.defineRegime: cannot re-register (${axis}, '${tag}') ` +
      `with a different displayName ('${existing.displayName}' vs ` +
      `'${incoming.displayName}'). Identical re-registrations are ` +
      `idempotent; only conflicting specs throw.`,
    );
    this.name = 'RegimeCollisionError';
    this.axis = axis;
    this.tag = tag;
  }
}

// ---------------------------------------------------------------------------
// Private singleton storage
// ---------------------------------------------------------------------------

const registry = new Map<AxisName, Map<string, RegimeValueBase>>();

function ensureAxisMap(axis: AxisName): Map<string, RegimeValueBase> {
  let m = registry.get(axis);
  if (!m) {
    m = new Map();
    registry.set(axis, m);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Public API (Phase 1)
// ---------------------------------------------------------------------------

/**
 * Register a regime under its `(axis, tag)` coordinate. Idempotent
 * for identical re-registrations; throws `RegimeCollisionError`
 * for the same `(axis, tag)` with different content.
 *
 * Returns the canonicalized `RegimeValueBase` (with
 * `provenance.registeredAt` filled in if omitted).
 *
 * @public
 */
export function defineRegime<Axis extends AxisName>(
  spec: RegimeSpec<Axis>,
): RegimeValueBase {
  const axisMap = ensureAxisMap(spec.axis);
  const existing = axisMap.get(spec.tag);
  const canonical: RegimeValueBase = {
    axis: spec.axis,
    tag: spec.tag,
    displayName: spec.displayName,
    ...(spec.tags ? { tags: spec.tags } : {}),
    ...(spec.limits ? { limits: spec.limits } : {}),
    provenance: {
      registeredBy: spec.provenance.registeredBy,
      registeredAt: spec.provenance.registeredAt ?? new Date().toISOString(),
      ...(spec.provenance.citation ? { citation: spec.provenance.citation } : {}),
    },
  };
  if (existing) {
    // Idempotency check: identical (modulo timestamp).
    if (
      existing.displayName !== canonical.displayName ||
      existing.provenance.registeredBy !== canonical.provenance.registeredBy
    ) {
      throw new RegimeCollisionError(spec.axis, spec.tag, existing, spec);
    }
    return existing;
  }
  axisMap.set(spec.tag, canonical);
  return canonical;
}

/**
 * Look up a registered regime by `(axis, tag)`. Returns `undefined`
 * if not registered.
 *
 * @public
 */
export function lookupRegime(axis: AxisName, tag: string): RegimeValueBase | undefined {
  return registry.get(axis)?.get(tag);
}

/**
 * Enumerate all regimes registered under a given axis. Returns
 * a snapshot array (safe to iterate without holding a registry
 * reference).
 *
 * @public
 */
export function listRegimesByAxis(axis: AxisName): ReadonlyArray<RegimeValueBase> {
  const m = registry.get(axis);
  return m ? [...m.values()] : [];
}

/**
 * Get the provenance of a specific `(axis, tag)` regime. Helper
 * for audit-tooling that needs to know who registered what.
 *
 * @public
 */
export function provenanceFor(axis: AxisName, tag: string): RegimeProvenance | undefined {
  return lookupRegime(axis, tag)?.provenance;
}

// ---------------------------------------------------------------------------
// Phase 4 — per-cell regime attachment (sibling registry per Adam-M1)
// ---------------------------------------------------------------------------

const cellRegimes = new Map<string, ReadonlyArray<RegimeValueBase>>();

/**
 * Attach regime values to a cell by its `id`. Per P5 Adam-M1
 * resolution, regimes ride on a sibling registry rather than as a
 * `BridgeCell.regimes?` field — this preserves the P3 surface
 * contract (no new `BridgeCell` fields) and avoids the
 * `cellToBridge` adapter round-trip.
 *
 * Idempotent (same id + same regime set is a no-op).
 *
 * @public
 */
export function attachRegimesToCell(
  cellId: string,
  regimes: ReadonlyArray<RegimeValueBase>,
): void {
  cellRegimes.set(cellId, regimes);
}

/**
 * Get the regimes attached to a cell by its `id`. Returns
 * `undefined` if no regimes are attached.
 *
 * @public
 */
export function getCellRegimes(cellId: string): ReadonlyArray<RegimeValueBase> | undefined {
  return cellRegimes.get(cellId);
}

/**
 * Clear all registered regimes AND all cell attachments. Test-only
 * helper — DO NOT call from production code.
 *
 * @internal
 */
export function _resetRegistryForTesting(): void {
  registry.clear();
  cellRegimes.clear();
}

// ---------------------------------------------------------------------------
// Phase 3 — per-axis convenience APIs (typed narrowing)
// ---------------------------------------------------------------------------

/**
 * The shape of the per-axis `define*` helpers: a {@link RegimeSpec} with the
 * axis already fixed, returning the registered value.
 * @public
 */
export type AxisConvenience<Axis extends AxisName> = (
  spec: Omit<RegimeSpec<Axis>, 'axis'>,
) => RegimeValueBase;

/** Register a regime on the `'scale'` axis. @public */
export const defineScale: AxisConvenience<'scale'> = (s) =>
  defineRegime({ ...s, axis: 'scale' });

/** Register a regime on the `'force'` axis. @public */
export const defineForce: AxisConvenience<'force'> = (s) =>
  defineRegime({ ...s, axis: 'force' });

/** Register a regime on the `'symmetry'` axis. @public */
export const defineSymmetry: AxisConvenience<'symmetry'> = (s) =>
  defineRegime({ ...s, axis: 'symmetry' });

/** Register a regime on the `'information'` axis. @public */
export const defineInformation: AxisConvenience<'information'> = (s) =>
  defineRegime({ ...s, axis: 'information' });

/** Register a regime on the `'dimension'` axis. @public */
export const defineDimension: AxisConvenience<'dimension'> = (s) =>
  defineRegime({ ...s, axis: 'dimension' });

/** Register a regime on the `'topology'` axis. @public */
export const defineTopology: AxisConvenience<'topology'> = (s) =>
  defineRegime({ ...s, axis: 'topology' });
