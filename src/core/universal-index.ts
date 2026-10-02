/**
 * Universal index — persistent-identity carrier for physics axes.
 *
 * Phase 1 of v0.7 Proposal 1 (Intelligent Index Layer).
 *
 * `UniversalIndex<Axis>` distinguishes wrapper-level physics-axis
 * identity from einsum's positional axes. Two `UniversalIndex`
 * objects with the same `axis` and `name` but distinct `id`s are
 * NOT the same physics axis — only `UniversalIndexId` equality
 * implies physical-axis identity (per Decision #3).
 *
 * The `Axes` registry (`src/core/axes-registry.ts`) guarantees
 * same-object identity at the consumer surface: `Axes.scale.quantum`
 * is a stable reference created exactly once per module load.
 *
 * Design: `docs/planning/v0.7-Proposal-1-Design.md` Decisions #2,
 * #4, #10. Empirical census at
 * `docs/architecture/archive/v0.7-p1-baseline.md`.
 *
 * Per Eve verification (proposals doc has ZERO `prime` / `arrow`
 * mentions), v0.7.0 ships only the §2.2 sketch fields:
 *   id, axis, name, tags?, limits?, notes?
 * `prime`/`arrow` are explicit v0.8.0+ candidates.
 *
 * @module core/universal-index
 */

/**
 * The four physics-axis namespaces v0.7.0 ships in the `Axes`
 * registry. Plus two integer axes (`dimension`, `topology`) that
 * are not enumerable (see Phase 0 axis census).
 *
 * @public
 */
export type AxisName =
  | 'scale'
  | 'force'
  | 'symmetry'
  | 'information'
  | 'dimension'
  | 'topology';

/**
 * Branded UUID type for `UniversalIndex.id`. Carries a nominal-type
 * brand so that consumers can't accidentally pass a plain string
 * where an index id is expected. Created via `makeIndex()`.
 *
 * @public
 */
export type UniversalIndexId = string & {
  readonly __brand: 'UniversalIndexId';
};

/**
 * A single physics-axis identity. `id` is the matching predicate for
 * `LabeledTensor.contract` (Decision #3): two `UniversalIndex`
 * values contract iff their `id`s are equal as branded UUIDs.
 *
 * `axis` discriminates the namespace; `name` is the human-readable
 * label (matching the `AxisName` union member, e.g. `'quantum'` for
 * the `'scale'` namespace). `tags`, `limits`, `notes` are optional
 * metadata from the §2.2 sketch — they do NOT affect contraction
 * matching.
 *
 * @public
 */
export interface UniversalIndex<Axis extends AxisName = AxisName> {
  readonly id: UniversalIndexId;
  readonly axis: Axis;
  readonly name: string;
  readonly tags?: ReadonlyArray<string>;
  readonly limits?: {
    readonly min?: number;
    readonly max?: number;
  };
  readonly notes?: string;
}

/**
 * Options accepted by `makeIndex` beyond the required `axis` +
 * `name` arguments. All optional per the §2.2 sketch.
 *
 * @public
 */
export interface MakeIndexOptions {
  readonly tags?: ReadonlyArray<string>;
  readonly limits?: { readonly min?: number; readonly max?: number };
  readonly notes?: string;
}

/**
 * Generate `id` via `crypto.randomUUID()`. Node ≥18 exposes
 * `globalThis.crypto.randomUUID` natively; verified at HEAD against
 * @types/node@24.9.2 + tsconfig lib: ["ES2022"] (per Eve-L2 finding).
 * The defensive preflight (Risk 7 mitigation) is the immediate
 * `typeof` guard below — if a future Node downgrade or non-standard
 * runtime drops it, the error fires at first `makeIndex` call
 * with a clear message.
 *
 * @internal
 */
function generateId(): UniversalIndexId {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error(
      `UniversalIndex.makeIndex: globalThis.crypto.randomUUID is not ` +
      `available. UPT requires Node ≥18 (or a runtime exposing the ` +
      `Web Crypto API).`,
    );
  }
  // The brand cast is the one allowed `as` per Cross-Phase Invariant 3.
  return globalThis.crypto.randomUUID() as UniversalIndexId;
}

/**
 * Factory: construct a fresh `UniversalIndex<Axis>` with a freshly
 * generated UUID. Each call returns a NEW identity — two consecutive
 * `makeIndex('scale', 'quantum')` calls produce two distinct
 * `UniversalIndex` values. `LabeledTensor.contract` throws
 * `IndexNameMismatchError` and names both ids (Decision #3). It does
 * not treat that pair as an outer product.
 *
 * For stable consumer-facing identities, use the `Axes` registry
 * (`src/core/axes-registry.ts`) — `Axes.scale.quantum` is the same
 * reference across all import sites.
 *
 * @public
 */
export function makeIndex<Axis extends AxisName>(
  axis: Axis,
  name: string,
  opts?: MakeIndexOptions,
): UniversalIndex<Axis> {
  return {
    id: generateId(),
    axis,
    name,
    ...(opts?.tags ? { tags: opts.tags } : {}),
    ...(opts?.limits ? { limits: opts.limits } : {}),
    ...(opts?.notes ? { notes: opts.notes } : {}),
  };
}
