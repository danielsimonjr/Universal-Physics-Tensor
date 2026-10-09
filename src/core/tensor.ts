/**
 * Universal Physics Tensor
 *
 * Core implementation of the rank-N tensor living in product space:
 * Π ∈ H_scale ⊗ H_force ⊗ H_symmetry ⊗ H_info ⊗ H_dim ⊗ H_topo
 *
 * Decomposition: Π = L + B + E
 * Where:
 * - L: Known laws (diagonal elements)
 * - B: Bridge equations (off-diagonal elements)
 * - E: Emergent phenomena (higher-order correlations)
 */

import type {
  TensorConfig,
  TensorIndices,
  PhysicalLaw,
  BridgeEquation,
  EmergentPhenomenon,
  PhysicalScale,
  Force,
} from './types.js';
import type {
  Cell,
  CellConfidence,
  LawCell,
  BridgeCell,
  EmergenceCell,
} from './cell.js';
import { lawToCell, bridgeToCell, emergenceToCell } from './cell.js';
import type { FluxRule, FluxReport, FluxDiagnostic } from './flux-rules.js';
import { runRules, V07_CELL_RULES, FluxViolationError } from './flux-rules.js';

/**
 * The entry an `addCell` call is about to replace, held so a flux-rule
 * failure can put it back (fail-atomic on a replacement, not only on a
 * fresh id).
 */
type PreviousEntry =
  | { readonly kind: 'law'; readonly law: PhysicalLaw }
  | { readonly kind: 'bridge'; readonly bridge: BridgeEquation }
  | { readonly kind: 'emergence'; readonly phenomenon: EmergentPhenomenon };

/**
 * Map the string-vocabulary {@link CellConfidence} to a representative
 * numeric value in [0,1] for the legacy `addLaw` / `addBridge` /
 * `addEmergence` path (each validates `confidence >= 0 && <= 1`).
 *
 * Internal-only — consumers see the string vocabulary on `Cell`. The
 * numeric value is a storage detail, not a public-API contract. Per
 * Adam+Eve Eve-R3, this is the REVERSE direction of the (rejected)
 * `confidenceToStatus` adapter: that one was rejected because it
 * could overwrite curated catalog `status` fields with derived labels.
 * This one is safe because the caller has already declared their
 * string intent; the function just picks a representative number for
 * the legacy path's range check.
 *
 * @internal
 */
function statusToConfidenceNumber(c: CellConfidence): number {
  switch (c) {
    case 'established': return 0.95;
    case 'speculative': return 0.6;
    case 'highly-speculative': return 0.3;
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      throw new Error(`Unknown CellConfidence: ${c as string}`);
    }
  }
}

/**
 * Adapter: `LawCell` → `PhysicalLaw` (legacy shape). Internal-only.
 * @internal
 */
function cellToLaw(cell: LawCell): PhysicalLaw {
  return {
    id: cell.id,
    name: cell.name,
    equation: cell.equation,
    scales: [...cell.scales],
    forces: [...cell.forces],
    symmetries: [...cell.symmetries],
    confidence: statusToConfidenceNumber(cell.confidence),
    ...(cell.informationMeasures ? { informationMeasures: [...cell.informationMeasures] } : {}),
    ...(cell.dimensions ? { dimensions: [...cell.dimensions] } : {}),
    ...(cell.topologies ? { topologies: [...cell.topologies] } : {}),
    ...(cell.references ? { references: [...cell.references] } : {}),
  };
}

/**
 * Adapter: `BridgeCell` → `BridgeEquation` (legacy shape). Internal-only.
 * @internal
 */
function cellToBridge(cell: BridgeCell): BridgeEquation {
  return {
    id: cell.id,
    name: cell.name,
    source: cell.source,
    target: cell.target,
    equation: cell.equation,
    confidence: statusToConfidenceNumber(cell.confidence),
    validated: cell.validated,
    description: cell.description,
  };
}

/**
 * Adapter: `EmergenceCell` → `EmergentPhenomenon` (legacy shape).
 * Maps `cell.equation` to `EmergentPhenomenon.description` (the legacy
 * interface uses `description` for the mathematical content); a
 * separate `cell.description` (prose context) is appended if present.
 * @internal
 */
function cellToEmergence(cell: EmergenceCell): EmergentPhenomenon {
  const description = cell.description
    ? `${cell.equation}\n\n${cell.description}`
    : cell.equation;
  return {
    id: cell.id,
    name: cell.name,
    order: cell.order,
    indices: [...cell.indices],
    description,
    confidence: statusToConfidenceNumber(cell.confidence),
  };
}

/**
 * The rank-6 universal physics tensor Π = L + B + E: a sparse store of
 * physical-law / bridge / emergence cells indexed by regime coordinates.
 *
 * @public
 */
export class UniversalTensor {
  private readonly config: Required<TensorConfig>;
  private readonly knownLaws: Map<string, PhysicalLaw>;
  private readonly bridgeEquations: Map<string, BridgeEquation>;
  private readonly emergentPhenomena: Map<string, EmergentPhenomenon>;

  /**
   * Sparse tensor storage: only store non-zero elements.
   * Key: serialized tensor indices
   * Value: set of equation IDs occupying that cell (multiple laws/bridges
   * may coexist in a single tensor cell without overwriting each other).
   */
  private readonly tensorData: Map<string, Set<string>>;

  /**
   * v0.7-p2 Phase 2 Task 2.3: Rule set used by `addCell` (ERROR-tier
   * violations throw) and by `fluxDiagnostics()` (re-runs across all
   * populated cells). Default = `V07_CELL_RULES` (Rule 2 + Rule 3
   * from `flux-rules.ts`). Rule 1 (dimensional consistency) fires
   * from the catalog adapter (Phase 3), not from `addCell`.
   *
   * Per Decision #9, this field is `@internal`. No public mutator
   * is exposed in v0.7 (rule customization is a v0.8+ concern).
   */
  private readonly fluxRules: ReadonlyArray<FluxRule>;

  constructor(config: TensorConfig) {
    // Runtime validation (strict TS catches these at compile time, but JS
    // consumers bypass the type system — we validate defensively here).
    if (![3, 4, 5, 6].includes(config.rank)) {
      throw new RangeError(`TensorConfig.rank must be 3, 4, 5, or 6; got ${config.rank}`);
    }
    if (!Array.isArray(config.scales) || config.scales.length === 0) {
      throw new TypeError('TensorConfig.scales must be a non-empty array');
    }
    if (!Array.isArray(config.forces) || config.forces.length === 0) {
      throw new TypeError('TensorConfig.forces must be a non-empty array');
    }

    // Apply defaults
    this.config = {
      rank: config.rank,
      scales: config.scales,
      forces: config.forces,
      symmetries: config.symmetries && config.symmetries.length > 0
        ? config.symmetries
        : ['poincare', 'gauge'],
      informationMeasures: config.informationMeasures && config.informationMeasures.length > 0
        ? config.informationMeasures
        : ['vonNeumann', 'shannon'],
      sparse: config.sparse ?? true,
    };

    this.knownLaws = new Map();
    this.bridgeEquations = new Map();
    this.emergentPhenomena = new Map();
    this.tensorData = new Map();
    this.fluxRules = V07_CELL_RULES;
  }

  /**
   * Add a known physical law to the tensor.
   * Returns true if newly added, false if it replaced an existing law with the same id.
   * If replacing, stale cell entries from the previous law are removed first.
   */
  public addLaw(law: PhysicalLaw): boolean {
    this.validateId(law.id, 'PhysicalLaw');
    if (!(law.confidence >= 0 && law.confidence <= 1)) {
      throw new RangeError(`PhysicalLaw.confidence must be in [0,1]; got ${law.confidence}`);
    }
    this.validateAxisMembership(law.scales, 'scales', this.config.scales);
    this.validateAxisMembership(law.forces, 'forces', this.config.forces);
    this.validateAxisMembership(law.symmetries, 'symmetries', this.config.symmetries);
    this.validateAxisMembership(
      law.informationMeasures,
      'informationMeasures',
      this.config.informationMeasures
    );
    this.validateFiniteIntegerArray(law.dimensions, 'dimensions');
    this.validateFiniteIntegerArray(law.topologies, 'topologies');
    const previous = this.knownLaws.get(law.id);
    if (previous) {
      // Remove stale cell entries from the prior version before writing new ones.
      for (const scale of previous.scales) {
        for (const force of previous.forces) {
          this.removeFromCell(this.serializeIndices({ scale, force }), law.id);
        }
      }
    }
    this.knownLaws.set(law.id, law);

    // Store in diagonal elements for all scale/force combinations.
    // Multiple laws may occupy the same cell; we accumulate rather than overwrite.
    for (const scale of law.scales) {
      for (const force of law.forces) {
        const key = this.serializeIndices({ scale, force });
        this.addToCell(key, law.id);
      }
    }
    return previous === undefined;
  }

  /**
   * Add a bridge equation connecting regimes.
   * Returns true if newly added, false if it replaced an existing bridge with the same id.
   * If replacing, stale cell entries from the previous bridge are removed first.
   */
  public addBridge(bridge: BridgeEquation): boolean {
    this.validateId(bridge.id, 'BridgeEquation');
    if (!(bridge.confidence >= 0 && bridge.confidence <= 1)) {
      throw new RangeError(`BridgeEquation.confidence must be in [0,1]; got ${bridge.confidence}`);
    }
    // Bridges are off-diagonal by definition — reject source == target
    // (including the degenerate case where both are empty {}).
    const sourceKey = this.serializeIndices(bridge.source);
    const targetKey = this.serializeIndices(bridge.target);
    if (sourceKey === targetKey) {
      throw new RangeError(
        `BridgeEquation source must differ from target in at least one index; id=${bridge.id}` +
          (sourceKey === '' ? ' (both were empty {})' : '')
      );
    }
    const previous = this.bridgeEquations.get(bridge.id);
    if (previous) {
      this.removeFromCell(this.bridgeCellKey(previous.source, previous.target), bridge.id);
    }
    this.bridgeEquations.set(bridge.id, bridge);

    // Store in off-diagonal elements. Multiple bridges between the same
    // source/target regime pair are accumulated in the same cell.
    this.addToCell(this.bridgeCellKey(bridge.source, bridge.target), bridge.id);
    return previous === undefined;
  }

  /**
   * Reject empty or whitespace-only IDs — almost always caller error.
   */
  private validateId(id: string, kind: string): void {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError(`${kind}.id must be a non-empty string`);
    }
  }

  /**
   * Reject axis values that are not declared in the tensor's config.
   * Prevents silent drift between TensorConfig (declared axes) and actual stored content.
   */
  private validateAxisMembership<T extends string>(
    values: readonly T[] | undefined,
    axisName: string,
    declared: readonly T[]
  ): void {
    if (!values) return;
    for (const v of values) {
      if (!declared.includes(v)) {
        throw new RangeError(
          `${axisName} value '${v}' is not declared in TensorConfig.${axisName}=[${declared.join(', ')}]`
        );
      }
    }
  }

  /**
   * Reject non-finite or non-integer numeric axis values (dimensions, topologies).
   * Integer values (including 0, negative integers) are allowed;
   * NaN, Infinity, and non-integers are rejected.
   */
  private validateFiniteIntegerArray(
    values: readonly number[] | undefined,
    axisName: string
  ): void {
    if (!values) return;
    for (const v of values) {
      if (!Number.isFinite(v) || !Number.isInteger(v)) {
        throw new RangeError(
          `${axisName} values must be finite integers; got ${v}`
        );
      }
    }
  }

  /**
   * Compose the cell key for a bridge equation's source→target indices.
   */
  private bridgeCellKey(source: TensorIndices, target: TensorIndices): string {
    return this.serializeIndices(source) + ' -> ' + this.serializeIndices(target);
  }

  /**
   * Accumulate an equation ID into the tensor cell at the given key.
   * Creates a new Set if the cell is empty.
   */
  private addToCell(key: string, equationId: string): void {
    let cell = this.tensorData.get(key);
    if (!cell) {
      cell = new Set();
      this.tensorData.set(key, cell);
    }
    cell.add(equationId);
  }

  /**
   * Remove an equation ID from a tensor cell. Prunes empty cells.
   */
  private removeFromCell(key: string, equationId: string): void {
    const cell = this.tensorData.get(key);
    if (!cell) return;
    cell.delete(equationId);
    if (cell.size === 0) this.tensorData.delete(key);
  }

  /**
   * Add an emergent phenomenon.
   * Returns true if newly added, false if it replaced an existing phenomenon.
   */
  public addEmergence(phenomenon: EmergentPhenomenon): boolean {
    this.validateId(phenomenon.id, 'EmergentPhenomenon');
    if (!Number.isInteger(phenomenon.order) || phenomenon.order < 3) {
      throw new RangeError(
        `EmergentPhenomenon.order must be an integer >= 3 (higher-order correlations); got ${phenomenon.order}`
      );
    }
    if (!(phenomenon.confidence >= 0 && phenomenon.confidence <= 1)) {
      throw new RangeError(
        `EmergentPhenomenon.confidence must be in [0,1]; got ${phenomenon.confidence}`
      );
    }
    const previous = this.emergentPhenomena.get(phenomenon.id);
    if (previous) {
      for (const indices of previous.indices) {
        const key = this.serializeIndices(indices);
        if (key) this.removeFromCell(key, phenomenon.id);
      }
    }
    this.emergentPhenomena.set(phenomenon.id, phenomenon);

    // Populate tensorData at each declared index-tuple, matching the L and B
    // components' storage pattern so the Π = L + B + E decomposition is
    // uniformly represented in the sparse tensor.
    for (const indices of phenomenon.indices) {
      const key = this.serializeIndices(indices);
      if (key) this.addToCell(key, phenomenon.id);
    }
    return previous === undefined;
  }

  /**
   * Add a typed `Cell` (LawCell, BridgeCell, or EmergenceCell) to the
   * tensor. Dispatches by the cell's `kind` discriminator to the
   * existing `addLaw` / `addBridge` / `addEmergence` paths via internal
   * adapters that translate the string-vocabulary `confidence` to the
   * legacy numeric range.
   *
   * Returns the same boolean the dispatched method returns: `true` if
   * newly added, `false` if it replaced an existing entry with the same
   * id.
   *
   * v0.7 Proposal 3 Phase 2 Task 2.1. Internal callers that want
   * type-safe ingestion through the discriminated union use `addCell`;
   * callers that want the old typed methods continue to use `addLaw` /
   * `addBridge` / `addEmergence` directly.
   *
   * @public
   */
  public addCell(cell: Cell): boolean {
    // v0.7-p2 Phase 2 Task 2.3: dispatch to legacy add method FIRST
    // (catches structural-validation throws on bad inputs), then run
    // flux rules. ERROR-tier diagnostics throw FluxViolationError and
    // roll back the legacy add (fail-atomic per Decision #4). The add may
    // REPLACE an entry with the same id, so the entry that was there is
    // snapshotted first and put back on rollback; deleting the id would
    // erase a good record because its replacement was bad.
    const previous = this.snapshotEntry(cell);
    let newlyAdded: boolean;
    switch (cell.kind) {
      case 'law':
        newlyAdded = this.addLaw(cellToLaw(cell));
        break;
      case 'bridge':
        newlyAdded = this.addBridge(cellToBridge(cell));
        break;
      case 'emergence':
        newlyAdded = this.addEmergence(cellToEmergence(cell));
        break;
      default: {
        const _exhaustive: never = cell;
        void _exhaustive;
        throw new Error(
          `UniversalTensor.addCell: unknown cell kind: ${(cell as Cell).kind}`,
        );
      }
    }

    // Run rules. WARNING/INFO diagnostics are accumulated for the
    // next fluxDiagnostics() call (recomputed on demand per Eve-R8
    // — no mutable pendingDiagnostics field). ERROR-tier throws.
    const report = runRules(cell, this.fluxRules);
    if (report.errorCount > 0) {
      const errDiag = report.diagnostics.find((d) => d.severity === 'error');
      if (errDiag) {
        // Roll back the legacy add before throwing (fail-atomic).
        this.rollbackCell(cell, previous);
        throw new FluxViolationError(errDiag.ruleName, errDiag.cellId, errDiag.message);
      }
    }
    return newlyAdded;
  }

  /** The stored entry `cell.id` currently names in its own kind's map, if any. */
  private snapshotEntry(cell: Cell): PreviousEntry | undefined {
    switch (cell.kind) {
      case 'law': {
        const law = this.knownLaws.get(cell.id);
        return law === undefined ? undefined : { kind: 'law', law };
      }
      case 'bridge': {
        const bridge = this.bridgeEquations.get(cell.id);
        return bridge === undefined ? undefined : { kind: 'bridge', bridge };
      }
      case 'emergence': {
        const phenomenon = this.emergentPhenomena.get(cell.id);
        return phenomenon === undefined ? undefined : { kind: 'emergence', phenomenon };
      }
      default: {
        const _exhaustive: never = cell;
        void _exhaustive;
        return undefined;
      }
    }
  }

  /**
   * Internal helper: roll back the legacy `addLaw`/`addBridge`/
   * `addEmergence` storage for a cell that just failed a rule check.
   * Removes the freshly stored entry and, when the add replaced an
   * existing entry, stores that entry again through the same add path
   * (it passed structural validation when it was first stored). Used by
   * `addCell` to maintain fail-atomic semantics on ERROR-tier rule
   * violations.
   *
   * @internal
   */
  private rollbackCell(cell: Cell, previous: PreviousEntry | undefined): void {
    switch (cell.kind) {
      case 'law': {
        const law = this.knownLaws.get(cell.id);
        if (!law) return;
        this.knownLaws.delete(cell.id);
        for (const scale of law.scales) {
          for (const force of law.forces) {
            this.removeFromCell(this.serializeIndices({ scale, force }), cell.id);
          }
        }
        if (previous?.kind === 'law') this.addLaw(previous.law);
        return;
      }
      case 'bridge': {
        const bridge = this.bridgeEquations.get(cell.id);
        if (!bridge) return;
        this.bridgeEquations.delete(cell.id);
        this.removeFromCell(this.bridgeCellKey(bridge.source, bridge.target), cell.id);
        if (previous?.kind === 'bridge') this.addBridge(previous.bridge);
        return;
      }
      case 'emergence': {
        const ph = this.emergentPhenomena.get(cell.id);
        if (!ph) return;
        this.emergentPhenomena.delete(cell.id);
        for (const indices of ph.indices) {
          const key = this.serializeIndices(indices);
          if (key) this.removeFromCell(key, cell.id);
        }
        if (previous?.kind === 'emergence') this.addEmergence(previous.phenomenon);
        return;
      }
      default: {
        const _exhaustive: never = cell;
        void _exhaustive;
      }
    }
  }

  // -------------------------------------------------------------------------
  // v0.7-p2 Phase 2 Tasks 2.1, 2.2, 2.3 — populated-cells query + flux
  // -------------------------------------------------------------------------

  /**
   * Number of distinct (key, value) pairs in the underlying sparse
   * storage. Counts UNIQUE coordinates that hold at least one entry.
   *
   * Note: a single multi-scale `LawCell` (e.g.
   * `scales: ['quantum', 'classical']`, `forces: ['gravitational']`)
   * fans out to 2 coordinates, so `populatedCount()` returns 2.
   * Use `populatedCells()` for the deduped count of distinct `Cell`
   * objects.
   *
   * @public
   */
  public populatedCount(): number {
    return this.tensorData.size;
  }

  /**
   * All cells currently in the tensor, deduplicated by `id`. Each
   * underlying entry (law, bridge, emergence) is converted back to
   * its `Cell` representation via the inverse adapters in `cell.ts`.
   *
   * Per Eve-R15 semantics: `populatedCells().length` is the count of
   * distinct `Cell` objects (one per `id`). `populatedCount()` counts
   * unique TENSOR COORDINATES (one per fan-out per Decision #6),
   * which may be larger.
   *
   * @public
   */
  public populatedCells(): ReadonlyArray<Cell> {
    const cells: Cell[] = [];
    for (const law of this.knownLaws.values()) cells.push(lawToCell(law));
    for (const bridge of this.bridgeEquations.values()) cells.push(bridgeToCell(bridge));
    for (const ph of this.emergentPhenomena.values()) cells.push(emergenceToCell(ph));
    return cells;
  }

  /**
   * For each populated coordinate, enumerate the single-axis-flip
   * neighbors that are NOT currently populated. Each "neighbor" is
   * a `TensorIndices` value that differs from a populated coordinate
   * in exactly one axis, where the differing axis value is drawn
   * from the config-declared set for that axis (Decision #10).
   *
   * Integer axes (`dimension`, `topology`) are NOT enumerable from
   * `TensorConfig` (no declared range exists) and are treated as
   * wildcards — single-axis flips along those axes are NOT
   * generated.
   *
   * Returns a deduplicated `ReadonlyArray<TensorIndices>` (no two
   * elements serialize to the same key under `serializeIndices`).
   *
   * @public
   */
  public unpopulatedNeighborhoods(): ReadonlyArray<TensorIndices> {
    const populated = new Set(this.tensorData.keys());
    const unique = new Map<string, TensorIndices>();

    for (const populatedKey of this.tensorData.keys()) {
      const parsed = this.deserializeKey(populatedKey);
      if (!parsed) continue;
      for (const neighbor of this.enumerateAxisFlips(parsed)) {
        const key = this.serializeIndices(neighbor);
        if (key === '' || populated.has(key) || unique.has(key)) continue;
        unique.set(key, neighbor);
      }
    }
    return [...unique.values()];
  }

  /**
   * Run the registered flux rules across every populated cell and
   * return an aggregated `FluxReport`. Re-runs on every call
   * (no cached `pendingDiagnostics` field — Eve-R8 resolution).
   *
   * @public
   */
  public fluxDiagnostics(): FluxReport {
    const diagnostics: FluxDiagnostic[] = [];
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const cell of this.populatedCells()) {
      const report = runRules(cell, this.fluxRules);
      diagnostics.push(...report.diagnostics);
      errorCount += report.errorCount;
      warningCount += report.warningCount;
      infoCount += report.infoCount;
    }
    return { diagnostics, errorCount, warningCount, infoCount };
  }

  // -------------------------------------------------------------------------
  // Phase 2 internal helpers
  // -------------------------------------------------------------------------

  /**
   * Parse a key produced by `serializeIndices` back into a
   * `TensorIndices` value. Returns null if the key includes a bridge
   * separator (' -> '), since bridge keys are off-diagonal and don't
   * correspond to a single `TensorIndices` coordinate.
   *
   * @internal
   */
  private deserializeKey(key: string): TensorIndices | null {
    if (key.includes(' -> ')) return null; // bridge key — not a single coordinate
    if (key === '') return {};
    const out: { [k: string]: unknown } = {};
    for (const part of key.split('|')) {
      const colon = part.indexOf(':');
      if (colon === -1) continue;
      const axis = part.slice(0, colon);
      const value = part.slice(colon + 1);
      switch (axis) {
        case 'scale': out.scale = value; break;
        case 'force': out.force = value; break;
        case 'sym': out.symmetry = value; break;
        case 'info': out.information = value; break;
        case 'dim': out.dimension = Number(value); break;
        case 'topo': out.topology = Number(value); break;
      }
    }
    return out as TensorIndices;
  }

  /**
   * Enumerate single-axis-flip neighbors of `coord`. For each
   * enumerable axis (scale, force, symmetry, information), generate
   * a neighbor with that axis replaced by every OTHER config-declared
   * value. The integer axes (dimension, topology) are wildcards
   * and not enumerated.
   *
   * @internal
   */
  private *enumerateAxisFlips(coord: TensorIndices): Generator<TensorIndices> {
    const axes: Array<{
      key: keyof TensorIndices;
      values: readonly string[];
    }> = [
      { key: 'scale', values: this.config.scales },
      { key: 'force', values: this.config.forces },
      { key: 'symmetry', values: this.config.symmetries },
      { key: 'information', values: this.config.informationMeasures },
    ];

    for (const { key, values } of axes) {
      if (coord[key] === undefined) continue;
      for (const alt of values) {
        if (alt === coord[key]) continue;
        yield { ...coord, [key]: alt };
      }
    }
  }

  /**
   * Return the IDs of laws and emergent phenomena stored at the diagonal cell
   * addressed by the given indices.
   * For bridge-equation cells (off-diagonal, source→target), use getBridgeCellContents instead.
   */
  public getCellContents(indices: TensorIndices): string[] {
    const key = this.serializeIndices(indices);
    const cell = this.tensorData.get(key);
    return cell ? [...cell] : [];
  }

  /**
   * Return the IDs of bridge equations stored at the off-diagonal cell
   * addressed by the given source/target indices.
   */
  public getBridgeCellContents(source: TensorIndices, target: TensorIndices): string[] {
    const key = this.bridgeCellKey(source, target);
    const cell = this.tensorData.get(key);
    return cell ? [...cell] : [];
  }

  /**
   * Query tensor for laws applicable to specific regime
   */
  public queryLaws(indices: TensorIndices): PhysicalLaw[] {
    const results: PhysicalLaw[] = [];

    for (const law of this.knownLaws.values()) {
      if (this.lawMatchesQuery(law, indices)) {
        results.push(law);
      }
    }

    return results;
  }

  /**
   * Find bridge equations connecting two regimes
   */
  public findBridges(source: TensorIndices, target: TensorIndices): BridgeEquation[] {
    const results: BridgeEquation[] = [];

    for (const bridge of this.bridgeEquations.values()) {
      if (
        this.indicesMatch(bridge.source, source) &&
        this.indicesMatch(bridge.target, target)
      ) {
        results.push(bridge);
      }
    }

    return results;
  }

  /**
   * Get all known laws
   */
  public getLaws(): PhysicalLaw[] {
    return [...this.knownLaws.values()];
  }

  /**
   * Get all bridge equations
   */
  public getBridges(): BridgeEquation[] {
    return [...this.bridgeEquations.values()];
  }

  /**
   * Get all emergent phenomena
   */
  public getEmergence(): EmergentPhenomenon[] {
    return [...this.emergentPhenomena.values()];
  }

  /**
   * Get tensor statistics
   */
  public getStats() {
    // occupiedCells = number of distinct (diagonal or off-diagonal) tensor cells
    // that hold at least one equation ID. Each cell may hold multiple IDs (Set).
    let totalEntries = 0;
    for (const cell of this.tensorData.values()) totalEntries += cell.size;
    return {
      rank: this.config.rank,
      knownLaws: this.knownLaws.size,
      bridgeEquations: this.bridgeEquations.size,
      emergentPhenomena: this.emergentPhenomena.size,
      occupiedCells: this.tensorData.size,
      totalEntries,
      sparse: this.config.sparse,
    };
  }

  /**
   * Serialize tensor indices to string key.
   * Uses !== undefined checks so that dimension/topology values of 0
   * (e.g., trivial winding number, genus-0 surface) are preserved.
   */
  private serializeIndices(indices: TensorIndices): string {
    const parts: string[] = [];

    if (indices.scale !== undefined) parts.push(`scale:${indices.scale}`);
    if (indices.force !== undefined) parts.push(`force:${indices.force}`);
    if (indices.symmetry !== undefined) parts.push(`sym:${indices.symmetry}`);
    if (indices.information !== undefined) parts.push(`info:${indices.information}`);
    if (indices.dimension !== undefined) parts.push(`dim:${indices.dimension}`);
    if (indices.topology !== undefined) parts.push(`topo:${indices.topology}`);

    return parts.join('|');
  }

  /**
   * Check if a law matches query indices.
   * If the query specifies an index dimension that the law does not declare
   * (e.g., the law has no informationMeasures but the query asks for one),
   * the law is excluded — querying on an undeclared index cannot match.
   */
  private lawMatchesQuery(law: PhysicalLaw, query: TensorIndices): boolean {
    if (query.scale && !law.scales.includes(query.scale)) {
      return false;
    }

    if (query.force && !law.forces.includes(query.force)) {
      return false;
    }

    if (query.symmetry && !law.symmetries.includes(query.symmetry)) {
      return false;
    }

    if (query.information) {
      if (!law.informationMeasures || !law.informationMeasures.includes(query.information)) {
        return false;
      }
    }

    if (query.dimension !== undefined) {
      if (!law.dimensions || !law.dimensions.includes(query.dimension)) {
        return false;
      }
    }

    if (query.topology !== undefined) {
      if (!law.topologies || !law.topologies.includes(query.topology)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two tensor indices match
   */
  private indicesMatch(a: TensorIndices, b: TensorIndices): boolean {
    if (b.scale && a.scale !== b.scale) {
      return false;
    }

    if (b.force && a.force !== b.force) {
      return false;
    }

    if (b.symmetry && a.symmetry !== b.symmetry) {
      return false;
    }

    if (b.information && a.information !== b.information) {
      return false;
    }

    if (b.dimension !== undefined && a.dimension !== b.dimension) {
      return false;
    }

    if (b.topology !== undefined && a.topology !== b.topology) {
      return false;
    }

    return true;
  }
}

/**
 * Factory: build a populated `UniversalTensor` from three typed cell
 * arrays plus a `TensorConfig`.
 *
 * Makes the "'+' in Π = L + B + E is disjoint union, not algebraic"
 * invariant concrete: the only way to construct a populated
 * `UniversalTensor` from typed cells is to pass three typed arrays.
 * There is no `add(c1: Cell, c2: Cell): Cell` because cells never
 * compose at the cell level — composition happens at the tensor
 * level (Proposals 2 and 6 territory).
 *
 * **Provenance note**: the proposals doc §4.2 line 299 sketches
 * `compose(L, B, E): UniversalTensor` without a `config` argument.
 * This signature closes a proposals-doc gap — `UniversalTensor`'s
 * constructor requires `rank` / `scales` / `forces`, none of which
 * can be inferred from the three cell arrays alone. `compose` is
 * this sprint's invention, not a proposals-doc commitment.
 *
 * Co-located with `UniversalTensor` (moved from `cell.ts`, 2026-06-19) to
 * break the `tensor.ts ↔ cell.ts` RUNTIME import cycle: `cell.ts` now depends
 * on `tensor.ts` for types only, while this factory — the one cell-side symbol
 * that instantiated `UniversalTensor` at runtime — lives beside the class.
 *
 * @public
 */
export function compose(
  laws: ReadonlyArray<LawCell>,
  bridges: ReadonlyArray<BridgeCell>,
  emergences: ReadonlyArray<EmergenceCell>,
  config: TensorConfig,
): UniversalTensor {
  const tensor = new UniversalTensor(config);
  for (const law of laws) tensor.addCell(law);
  for (const bridge of bridges) tensor.addCell(bridge);
  for (const emergence of emergences) tensor.addCell(emergence);
  return tensor;
}
