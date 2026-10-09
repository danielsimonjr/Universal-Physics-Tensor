/**
 * `LabeledTensor` — engine-level tensor wrapped with
 * `UniversalIndex`-tagged metadata. The catalog-facing surface
 * for physics-axis-aware contractions.
 *
 * Phase 2 + Phase 3 of v0.7 Proposal 1 (Intelligent Index Layer).
 *
 * Composition (Decision #5): `LabeledTensor` owns an `EngineTensor`,
 * a `TensorEngine`, and a labels record. The engine handle is the
 * boundary — `LabeledTensor` doesn't reach into the underlying
 * Float64Array / MathTS handle. Contract matching is strictly
 * `UniversalIndexId` equality (Decision #3). Two indices that share a
 * `name` and not an `id` are refused: `contract` throws
 * `IndexNameMismatchError` and the message names both ids. It does not
 * contract them and it does not return their outer product. Indices
 * whose names differ stay free axes.
 *
 * Design: `docs/planning/v0.7-Proposal-1-Design.md` Decisions
 * #1, #3, #5, #6, #7, #9.
 *
 * Cross-Phase Invariants preserved:
 *   - #1 adapter-on-top: this module does NOT import
 *     `src/dimensional/tensor.ts` or `src/numerical/lowering.ts`.
 *   - #4 `TensorSymbolNode` + `computeContraction` UNCHANGED.
 *   - #5 `TensorEngine` interface UNCHANGED (consumes, doesn't
 *     extend).
 *
 * @module core/labeled-tensor
 */

import type { EngineTensor, TensorEngine, EinsumSpec } from '../numerical/tensor-engine.js';
import { UPTError } from '../dimensional/errors.js';
import type { AxisName, UniversalIndex, UniversalIndexId } from './universal-index.js';

// ---------------------------------------------------------------------------
// Error classes (Phase 3 surface, declared here for co-location with
// the guards that throw them)
// ---------------------------------------------------------------------------

/**
 * Thrown by the `LabeledTensor` constructor when the labels record
 * doesn't agree with the underlying tensor's rank
 * (`Object.keys(labels).length !== tensor.shape.length`).
 *
 * @public
 */
export class LabeledTensorConstructionError extends UPTError {
  public readonly labelCount: number;
  public readonly tensorRank: number;
  constructor(labelCount: number, tensorRank: number) {
    super(
      `LabeledTensor: labels record has ${labelCount} entries but ` +
      `tensor rank is ${tensorRank}. Every tensor axis must carry exactly ` +
      `one UniversalIndex label.`,
    );
    this.name = 'LabeledTensorConstructionError';
    this.labelCount = labelCount;
    this.tensorRank = tensorRank;
    Object.setPrototypeOf(this, LabeledTensorConstructionError.prototype);
  }
}

/**
 * Thrown by `contract` when two `UniversalIndex` values share an
 * `id` but disagree on `axis`. Per Decision #7, this is a physics
 * error caught at the wrapper level. Impossible if both operands
 * use the `Axes` registry; defensive against off-registry
 * `makeIndex` consumers.
 *
 * @public
 */
export class AxisMismatchError extends UPTError {
  public readonly indexId: UniversalIndexId;
  public readonly leftAxis: AxisName;
  public readonly rightAxis: AxisName;
  constructor(
    indexId: UniversalIndexId,
    leftAxis: AxisName,
    rightAxis: AxisName,
  ) {
    super(
      `LabeledTensor.contract: indices with the same id '${indexId}' ` +
      `disagree on axis ('${leftAxis}' vs '${rightAxis}'). Cross-axis ` +
      `contraction is a physics error.`,
    );
    this.name = 'AxisMismatchError';
    this.indexId = indexId;
    this.leftAxis = leftAxis;
    this.rightAxis = rightAxis;
    Object.setPrototypeOf(this, AxisMismatchError.prototype);
  }
}

/**
 * Thrown by `contract` when the same `UniversalIndexId` appears in
 * more than one non-contracted (free) position across the two
 * operands. Same physical axis showing up free on both sides is
 * physically meaningful (joint distribution) but the einsum
 * machinery has no canonical way to disambiguate.
 *
 * @public
 */
export class IdentityConflictError extends UPTError {
  public readonly indexId: UniversalIndexId;
  /**
   * `where` says which shape was met: the id twice on ONE operand (a
   * self-contraction, which `contract` does not perform), or the id as a
   * free axis on BOTH operands beside a contraction (three occurrences).
   */
  constructor(indexId: UniversalIndexId, where: 'one-operand' | 'both-operands' = 'both-operands') {
    super(
      where === 'one-operand'
        ? `LabeledTensor.contract: UniversalIndexId '${indexId}' appears twice on one operand. ` +
          `A self-contraction is not a contract(); rename one axis or trace it first.`
        : `LabeledTensor.contract: UniversalIndexId '${indexId}' appears as a ` +
          `free axis on both operands. Same physical axis on both sides is ` +
          `ambiguous — rename or contract one side first.`,
    );
    this.name = 'IdentityConflictError';
    this.indexId = indexId;
    Object.setPrototypeOf(this, IdentityConflictError.prototype);
  }
}

/**
 * Thrown by `contract` when both operands carry the same index `name`
 * and those occurrences do not all share one `UniversalIndexId`.
 *
 * Decision #3 matches by id. A second `makeIndex` call with the same
 * name is a different index. Returning the outer product hid that: the
 * caller who meant one index got a higher-rank tensor and no ids.
 * The error names every id. Distinct names stay an outer product.
 *
 * @public
 */
export class IndexNameMismatchError extends UPTError {
  public readonly indexName: string;
  public readonly ids: readonly UniversalIndexId[];
  constructor(
    indexName: string,
    occurrences: readonly { id: UniversalIndexId; axis: AxisName }[],
  ) {
    const ids = [...new Set(occurrences.map((o) => o.id))];
    const described = occurrences
      .map((o) => `'${o.id}' (axis '${o.axis}')`)
      .join(' and ');
    super(
      `LabeledTensor.contract: index name '${indexName}' is carried by ` +
      `unequal ids ${described}. Contraction matches UniversalIndexId, ` +
      `not the name. Reuse one UniversalIndex object, or take it from ` +
      `the Axes registry. A second makeIndex call with the same name is ` +
      `a different index and is not an outer product.`,
    );
    this.name = 'IndexNameMismatchError';
    this.indexName = indexName;
    this.ids = ids;
    Object.setPrototypeOf(this, IndexNameMismatchError.prototype);
  }
}

/**
 * Thrown by `reshape` when the requested shape would change the
 * tensor rank. v0.7.0 allows only axis-by-axis size change;
 * rank-changing reshape is deferred to v0.8.0+ (`mergeAxes` /
 * `splitAxis` helpers).
 *
 * @public
 */
export class RankPreservationError extends UPTError {
  public readonly fromRank: number;
  public readonly toRank: number;
  constructor(fromRank: number, toRank: number) {
    super(
      `LabeledTensor.reshape: cannot change rank from ${fromRank} to ` +
      `${toRank}. v0.7.0 supports only same-rank reshape; use a future ` +
      `mergeAxes / splitAxis helper for rank changes.`,
    );
    this.name = 'RankPreservationError';
    this.fromRank = fromRank;
    this.toRank = toRank;
    Object.setPrototypeOf(this, RankPreservationError.prototype);
  }
}

/**
 * Thrown by the `LabeledTensor` constructor when an explicit `axisOrder` is
 * not a valid permutation of the label keys (wrong length, a key that is not a
 * label, or a duplicate). Distinct from `LabeledTensorConstructionError` (which
 * means label-count ≠ tensor-rank) so a consumer never reads a rank-mismatch
 * field on an order error.
 *
 * @public
 */
export class AxisOrderError extends UPTError {
  public readonly axisOrder: readonly string[];
  public readonly labelKeys: readonly string[];
  constructor(axisOrder: readonly string[], labelKeys: readonly string[]) {
    super(
      `LabeledTensor: axisOrder [${axisOrder.join(', ')}] is not a permutation ` +
      `of the label keys [${labelKeys.join(', ')}] (it must list every label ` +
      `key exactly once, in engine-axis order).`,
    );
    this.name = 'AxisOrderError';
    this.axisOrder = axisOrder;
    this.labelKeys = labelKeys;
    Object.setPrototypeOf(this, AxisOrderError.prototype);
  }
}

/**
 * Thrown by `mergeAxes` when the request is malformed: fewer than two keys, an
 * unknown key, keys that are not a contiguous run of engine-axis positions, or a
 * merged key/id that collides with a surviving axis.
 *
 * @public
 */
export class AxisMergeError extends UPTError {
  constructor(message: string) {
    super(`LabeledTensor.mergeAxes: ${message}`);
    this.name = 'AxisMergeError';
    Object.setPrototypeOf(this, AxisMergeError.prototype);
  }
}

/**
 * Thrown by `splitAxis` when the request is malformed: an unknown key, fewer
 * than two parts, a non-positive/non-integer part size, a size product that
 * does not match the original axis size, or a part key/id that collides.
 *
 * @public
 */
export class AxisSplitError extends UPTError {
  constructor(message: string) {
    super(`LabeledTensor.splitAxis: ${message}`);
    this.name = 'AxisSplitError';
    Object.setPrototypeOf(this, AxisSplitError.prototype);
  }
}

// ---------------------------------------------------------------------------
// canonicalLabelOrder — Risk 2 mitigation
// ---------------------------------------------------------------------------

/**
 * Stable lexicographic ordering of label keys. JavaScript's
 * `Object.entries` preserves string-key insertion order, but we
 * route all label-key→axis-position mapping through this helper
 * so the contract algorithm doesn't accidentally depend on
 * constructor-call ordering.
 *
 * @internal
 */
export function canonicalLabelOrder<L extends Record<string, UniversalIndex<AxisName>>>(
  labels: L,
): string[] {
  return Object.keys(labels).sort();
}

/**
 * True iff `order` lists exactly the members of `keys`, each once (same length,
 * no duplicates, no foreign entries). Used to validate an explicit `axisOrder`.
 *
 * @internal
 */
function isPermutationOf(order: readonly string[], keys: readonly string[]): boolean {
  if (order.length !== keys.length) return false;
  const seen = new Set<string>();
  const keySet = new Set(keys);
  for (const k of order) {
    if (!keySet.has(k) || seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

// ---------------------------------------------------------------------------
// LabeledTensor (wrapper class)
// ---------------------------------------------------------------------------

/**
 * Engine-agnostic wrapper carrying physics-axis-tagged metadata over
 * an opaque `EngineTensor`. Two `LabeledTensor`s contract over
 * shared `UniversalIndexId` values; non-shared ids become the
 * result's free axes.
 *
 * Construction enforces `Object.keys(labels).length === tensor.shape.length`.
 *
 * @public
 */
export class LabeledTensor<
  L extends Record<string, UniversalIndex<AxisName>> = Record<string, UniversalIndex<AxisName>>,
> {
  public readonly tensor: EngineTensor;
  public readonly engine: TensorEngine;
  public readonly labels: L;
  /**
   * The label keys in ENGINE-AXIS order: `axisOrder[i]` is the key of engine
   * axis `i`. This is the AUTHORITATIVE label↔axis mapping — consumers must use
   * it (or {@link axisOf}) rather than re-deriving position by sorting keys,
   * because `transpose` / `contract` can leave the engine axes in a non-sorted
   * order. Defaults to `canonicalLabelOrder(labels)` (sorted) when not supplied.
   */
  public readonly axisOrder: readonly string[];

  constructor(
    tensor: EngineTensor,
    engine: TensorEngine,
    labels: L,
    axisOrder?: readonly string[],
  ) {
    const labelKeys = Object.keys(labels);
    if (labelKeys.length !== tensor.shape.length) {
      throw new LabeledTensorConstructionError(labelKeys.length, tensor.shape.length);
    }
    const order = axisOrder ?? canonicalLabelOrder(labels);
    // Validate `order` is a permutation of the label keys: same length, every
    // entry is a label key, no duplicates.
    if (order.length !== labelKeys.length || !isPermutationOf(order, labelKeys)) {
      throw new AxisOrderError(order, labelKeys);
    }
    this.tensor = tensor;
    this.engine = engine;
    this.labels = labels;
    this.axisOrder = order;
  }

  /**
   * Engine-axis position of a label key (the inverse of {@link axisOrder}).
   * Throws if the key is not a label.
   *
   * @public
   */
  public axisOf(key: string): number {
    const axis = this.axisOrder.indexOf(key);
    if (axis === -1) {
      throw new UPTError(`LabeledTensor.axisOf: '${key}' is not a label key.`);
    }
    return axis;
  }

  /**
   * Identity-aware contraction (Decision #3): match labels by
   * `UniversalIndexId` equality only. Returns a new `LabeledTensor`
   * whose free labels are the union of both operands' free labels
   * minus the contracted ids, evaluated in `this`-first,
   * `other`-second canonical order.
   *
   * Throws:
   *   - `IndexNameMismatchError` if both operands use one `name` and
   *     the ids differ. The message names both ids.
   *   - `AxisMismatchError` if a shared id disagrees on axis.
   *   - `IdentityConflictError` if a non-shared id appears free on
   *     both operands.
   *
   * @public
   */
  public contract<R extends Record<string, UniversalIndex<AxisName>>>(
    other: LabeledTensor<R>,
  ): LabeledTensor {
    if (this.engine !== other.engine) {
      throw new UPTError(
        `LabeledTensor.contract: engine mismatch (${this.engine.name} vs ` +
        `${other.engine.name}). Both operands must share an engine.`,
      );
    }

    // Map labels → ENGINE axis positions via each operand's authoritative
    // axisOrder (NOT sorted key order — an operand may carry a non-sorted order
    // from a prior transpose/contract).
    const leftOrder = this.axisOrder;
    const rightOrder = other.axisOrder;

    // Same name on both operands is one index only when the ids match.
    // A fresh makeIndex with that name is a different id; the outer
    // product of that pair is the footgun Decision #3 exists to stop.
    const byName = new Map<string, Array<{ id: UniversalIndexId; axis: AxisName; side: 0 | 1 }>>();
    const noteName = (
      side: 0 | 1,
      order: readonly string[],
      labels: Record<string, UniversalIndex<AxisName>>,
    ): void => {
      for (const key of order) {
        const idx = labels[key];
        const list = byName.get(idx.name) ?? [];
        list.push({ id: idx.id, axis: idx.axis, side });
        byName.set(idx.name, list);
      }
    };
    noteName(0, leftOrder, this.labels);
    noteName(1, rightOrder, other.labels);
    for (const [indexName, occurrences] of byName) {
      const onLeft = occurrences.some((o) => o.side === 0);
      const onRight = occurrences.some((o) => o.side === 1);
      if (!onLeft || !onRight) continue;
      const ids = new Set(occurrences.map((o) => o.id));
      if (ids.size > 1) throw new IndexNameMismatchError(indexName, occurrences);
    }

    // Build id → (operand, axis-position) sites.
    const sites = new Map<UniversalIndexId, Array<{ operand: 0 | 1; axis: number; key: string; axisName: AxisName }>>();
    leftOrder.forEach((key, axis) => {
      const idx = this.labels[key];
      const list = sites.get(idx.id) ?? [];
      list.push({ operand: 0, axis, key, axisName: idx.axis });
      sites.set(idx.id, list);
    });
    rightOrder.forEach((key, axis) => {
      const idx = other.labels[key];
      const list = sites.get(idx.id) ?? [];
      list.push({ operand: 1, axis, key, axisName: idx.axis });
      sites.set(idx.id, list);
    });

    // Classify each id: contracted (in both operands) vs free (in one).
    const contractions: EinsumSpec['contractions'][number][] = [];
    const free: EinsumSpec['free'][number][] = [];
    const resultLabels: Record<string, UniversalIndex<AxisName>> = {};
    // The result's engine-axis order: the result key of each free axis, pushed
    // in the SAME order the free axes enter `spec.free` (which is the order the
    // engine emits result axes). Kept exactly parallel to `free` so it is always
    // a valid permutation of `Object.keys(resultLabels)`.
    const resultAxisOrder: string[] = [];

    for (const [id, occurrences] of sites) {
      if (occurrences.length === 1) {
        // Free axis on exactly one operand. Carry through.
        const o = occurrences[0];
        free.push({ operand: o.operand, axis: o.axis });
        // Preserve the original label key; on collision (both operands use the
        // same string key for *different* ids) suffix until a FREE key is found
        // (`x` → `x_0`/`x_1` → `x_0_0`…), so result keys stay UNIQUE and
        // resultAxisOrder remains a valid permutation (Eve Y1: guarding only the
        // unsuffixed key could overwrite an existing suffixed key).
        let key = o.key;
        if (resultLabels[key] !== undefined) {
          let n = 0;
          do {
            key = `${o.key}_${o.operand}${n === 0 ? '' : `_${n}`}`;
            n++;
          } while (resultLabels[key] !== undefined);
        }
        resultLabels[key] = o.operand === 0
          ? this.labels[o.key]
          : other.labels[o.key];
        resultAxisOrder.push(key);
      } else if (occurrences.length === 2) {
        const [a, b] = occurrences;
        if (a.operand === b.operand) {
          // The same id twice in one operand is a self-contraction, which
          // contract() does not perform.
          throw new IdentityConflictError(id, 'one-operand');
        }
        if (a.axisName !== b.axisName) {
          throw new AxisMismatchError(id, a.axisName, b.axisName);
        }
        contractions.push({ pair: [[a.operand, a.axis], [b.operand, b.axis]] });
      } else {
        // 3+ occurrences across the two operands: triple+ contraction,
        // not supported by the binary einsum primitive. Reject.
        throw new IdentityConflictError(id);
      }
    }

    const spec: EinsumSpec = { contractions, free };
    const resultTensor = this.engine.einsum(spec, this.tensor, other.tensor);
    return new LabeledTensor(resultTensor, this.engine, resultLabels, resultAxisOrder);
  }

  /**
   * Reorder axes per the given permutation of label keys. The new
   * label record reflects the new axis order; the engine handles
   * the storage-level permutation via `engine.transpose`.
   *
   * @public
   */
  public transpose(newKeyOrder: ReadonlyArray<keyof L & string>): LabeledTensor<L> {
    // Permutation is computed against the CURRENT engine-axis order
    // (`this.axisOrder`), NOT the sorted key order — `this.axisOrder` may
    // already be non-sorted (e.g. a contract result, or a prior transpose).
    if (newKeyOrder.length !== this.axisOrder.length) {
      throw new UPTError(
        `LabeledTensor.transpose: new key order has ${newKeyOrder.length} ` +
        `entries but tensor has ${this.axisOrder.length} axes.`,
      );
    }
    const currentIndex = new Map(this.axisOrder.map((k, i) => [k, i]));
    const perm: number[] = [];
    for (const key of newKeyOrder) {
      const pos = currentIndex.get(key);
      if (pos === undefined) {
        throw new UPTError(
          `LabeledTensor.transpose: key '${String(key)}' not found in labels.`,
        );
      }
      perm.push(pos);
    }
    const transposedTensor = this.engine.transpose(this.tensor, perm);
    // The result's engine axis i is the old axis perm[i] = newKeyOrder[i], so
    // the new axisOrder IS newKeyOrder.
    return new LabeledTensor(transposedTensor, this.engine, this.labels, [...newKeyOrder]);
  }

  /**
   * Per-axis size change. Rank must be preserved (Decision #5);
   * rank-changing reshape throws `RankPreservationError`. v0.8.0+
   * may add `mergeAxes` / `splitAxis` for rank-changing operations.
   *
   * Labels survive unchanged (axis identity is preserved across a
   * size-only reshape).
   *
   * @public
   */
  public reshape(shape: ReadonlyArray<number>): LabeledTensor<L> {
    if (shape.length !== this.tensor.shape.length) {
      throw new RankPreservationError(this.tensor.shape.length, shape.length);
    }
    const reshapedTensor = this.engine.reshape(this.tensor, shape);
    // Rank-preserving size change never reorders axes — carry axisOrder through.
    return new LabeledTensor(reshapedTensor, this.engine, this.labels, this.axisOrder);
  }

  /**
   * Fuse a CONTIGUOUS run of engine axes (named by `keys`) into ONE axis
   * carrying the caller-supplied `merged` label. Rank R → R − (keys.length − 1).
   *
   * The keys must occupy a gapless consecutive run of engine-axis positions
   * (`engine.reshape` fuses STORAGE-adjacent axes only) — `transpose` them
   * adjacent first otherwise. The fused axis spans the merged axes in ENGINE
   * order; the order `keys` are listed does not matter (the merged axis is
   * opaque). The caller owns the merged axis's identity — no composite-id is
   * synthesized.
   *
   * @public
   */
  public mergeAxes(
    keys: readonly string[],
    merged: { key: string; index: UniversalIndex<AxisName> },
  ): LabeledTensor {
    if (keys.length < 2) {
      throw new AxisMergeError(`need at least 2 keys to merge, got ${keys.length}.`);
    }
    if (new Set(keys).size !== keys.length) {
      throw new AxisMergeError(`keys ${JSON.stringify(keys)} contain a duplicate.`);
    }
    const positions: number[] = [];
    for (const k of keys) {
      const p = this.axisOrder.indexOf(k);
      if (p === -1) throw new AxisMergeError(`'${k}' is not a label key.`);
      positions.push(p);
    }
    // Distinct keys have distinct positions (the duplicate check above), so a
    // contiguous run is exactly `hi − lo === n − 1`.
    const sorted = [...positions].sort((a, b) => a - b);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    if (hi - lo !== sorted.length - 1) {
      throw new AxisMergeError(
        `keys ${JSON.stringify(keys)} are not a contiguous run of engine axes ` +
        `(positions ${JSON.stringify(positions)}); transpose them adjacent first.`,
      );
    }
    // Surviving keys = axes outside the merged run. (A merged key may safely
    // REUSE one of the consumed keys' names — those are not surviving.)
    const survivingKeys = this.axisOrder.filter((_, i) => i < lo || i > hi);
    if (survivingKeys.includes(merged.key)) {
      throw new AxisMergeError(`merged key '${merged.key}' collides with a surviving label key.`);
    }
    for (const k of survivingKeys) {
      if (this.labels[k].id === merged.index.id) {
        throw new AxisMergeError(
          `merged id '${merged.index.id}' collides with surviving axis '${k}'.`,
        );
      }
    }

    const shape = this.tensor.shape;
    let mergedSize = 1;
    for (let i = lo; i <= hi; i++) mergedSize *= shape[i];
    const newShape = [...shape.slice(0, lo), mergedSize, ...shape.slice(hi + 1)];

    const newLabels: Record<string, UniversalIndex<AxisName>> = {};
    for (const k of survivingKeys) newLabels[k] = this.labels[k];
    newLabels[merged.key] = merged.index;

    const newAxisOrder = [
      ...this.axisOrder.slice(0, lo),
      merged.key,
      ...this.axisOrder.slice(hi + 1),
    ];

    const reshaped = this.engine.reshape(this.tensor, newShape);
    return new LabeledTensor(reshaped, this.engine, newLabels, newAxisOrder);
  }

  /**
   * Split ONE engine axis (named `key`) into several, each carrying a
   * caller-supplied sub-label whose sizes multiply to the original axis size.
   * Rank R → R + (parts.length − 1). The parts occupy the split axis's position
   * in `parts` order. Inverse of {@link mergeAxes}.
   *
   * @public
   */
  public splitAxis(
    key: string,
    parts: readonly { key: string; index: UniversalIndex<AxisName>; size: number }[],
  ): LabeledTensor {
    const p = this.axisOrder.indexOf(key);
    if (p === -1) throw new AxisSplitError(`'${key}' is not a label key.`);
    if (parts.length < 2) {
      throw new AxisSplitError(`need at least 2 parts to split into, got ${parts.length}.`);
    }
    let product = 1;
    for (const part of parts) {
      if (!Number.isInteger(part.size) || part.size <= 0) {
        throw new AxisSplitError(`part '${part.key}' size must be a positive integer, got ${part.size}.`);
      }
      product *= part.size;
    }
    const axisSize = this.tensor.shape[p];
    if (product !== axisSize) {
      throw new AxisSplitError(
        `part sizes multiply to ${product} but axis '${key}' has size ${axisSize}.`,
      );
    }
    const survivingKeys = this.axisOrder.filter((k) => k !== key);
    const seen = new Set<string>();
    const seenIds = new Set<UniversalIndexId>();
    for (const part of parts) {
      if (survivingKeys.includes(part.key)) {
        throw new AxisSplitError(`part key '${part.key}' collides with a surviving label key.`);
      }
      if (seen.has(part.key)) throw new AxisSplitError(`duplicate part key '${part.key}'.`);
      seen.add(part.key);
      // Both parts SURVIVE, so two parts sharing one id would build a tensor
      // that `contract` later rejects as IdentityConflictError — fail here at
      // the malformed call instead (Eve Y1). (mergeAxes has no analogue: its
      // merged id replaces consumed axes, so reusing a consumed id is legal.)
      if (seenIds.has(part.index.id)) {
        throw new AxisSplitError(`two parts share id '${part.index.id}'.`);
      }
      seenIds.add(part.index.id);
      for (const k of survivingKeys) {
        if (this.labels[k].id === part.index.id) {
          throw new AxisSplitError(
            `part id '${part.index.id}' collides with surviving axis '${k}'.`,
          );
        }
      }
    }

    const shape = this.tensor.shape;
    const newShape = [...shape.slice(0, p), ...parts.map((pt) => pt.size), ...shape.slice(p + 1)];

    const newLabels: Record<string, UniversalIndex<AxisName>> = {};
    for (const k of survivingKeys) newLabels[k] = this.labels[k];
    for (const part of parts) newLabels[part.key] = part.index;

    const newAxisOrder = [
      ...this.axisOrder.slice(0, p),
      ...parts.map((pt) => pt.key),
      ...this.axisOrder.slice(p + 1),
    ];

    const reshaped = this.engine.reshape(this.tensor, newShape);
    return new LabeledTensor(reshaped, this.engine, newLabels, newAxisOrder);
  }
}
