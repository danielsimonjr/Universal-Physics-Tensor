/**
 * Flux-rule scaffolding for v0.7 Proposal 2 — Sparse Semantic Catalog.
 *
 * Defines:
 *   - `FluxRuleKind` discriminated tag (@internal)
 *   - `FluxRule`, `FluxRuleResult` registry shapes (@internal)
 *   - `FluxDiagnostic`, `FluxReport` consumer shapes (@public)
 *   - `FluxViolationError` (@public) thrown on ERROR-tier rule failures
 *   - Rule 2 (L/B/E coordinate matching) and Rule 3 (Causality) — pure
 *     functions over `Cell` / `BridgeCell`
 *   - `runRules(cell, rules)` dispatcher with `_exhaustive: never`
 *
 * Rule 1 (Dimensional Consistency) ships in Phase 3 alongside the
 * catalog adapter — it operates on `BridgeEquationEntry`, not `Cell`,
 * per Decision #3 (resolves Adam-V3).
 *
 * Design: docs/planning/v0.7-Proposal-2-Design.md (redraft commit
 * 01632b5). Decisions #5, #6, #8 are load-bearing here.
 *
 * @module core/flux-rules
 */

import type {
  Cell,
  BridgeCell,
  LawCell,
  EmergenceCell,
} from './cell.js';
import type { PhysicalScale } from './types.js';

// ---------------------------------------------------------------------------
// Public types (consumer-facing)
// ---------------------------------------------------------------------------

/**
 * A single rule-evaluation outcome surfaced to consumers via
 * `fluxDiagnostics()` or `FluxViolationError`. Severity follows the
 * info/warning/error tiering pinned in the design.
 *
 * @public
 */
export interface FluxDiagnostic {
  readonly severity: 'info' | 'warning' | 'error';
  readonly ruleName: FluxRuleKind;
  readonly cellId: string;
  readonly message: string;
}

/**
 * Aggregated report returned by `runRules()` / consumer-facing
 * `fluxDiagnostics()`. Per-tier counts are pre-computed for cheap
 * consumer-side branching.
 *
 * @public
 */
export interface FluxReport {
  readonly diagnostics: ReadonlyArray<FluxDiagnostic>;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

/**
 * Thrown from `UniversalTensor.addCell` (Phase 2) when a Rule 2
 * (L/B/E coordinate-matching) violation fires. Rule 2 is ERROR-tier:
 * a `BridgeCell` with `source === target`, a `LawCell` with empty
 * `scales × forces`, or an `EmergenceCell` with `indices.length < 2`
 * fail-atomic.
 *
 * Rule 3 (Causality) is ERROR-tier as of v0.10.0 (user decision
 * 2026-06-11, promoted from the v0.7 WARNING tier after verifying the
 * live 23-cell submittable catalog has zero reverse arrows): a
 * `BridgeCell` whose source scale is COARSER than its target
 * (reverse of the canonical emergence direction) now fail-atomics.
 * Suppression for a deliberate reverse bridge goes through the
 * `causalityWhitelist` (entries earn their place via design review).
 *
 * @public
 */
export class FluxViolationError extends Error {
  public readonly ruleName: FluxRuleKind;
  public readonly cellId: string;

  constructor(ruleName: FluxRuleKind, cellId: string, message: string) {
    super(`FluxRule '${ruleName}' violated for cell '${cellId}': ${message}`);
    this.name = 'FluxViolationError';
    this.ruleName = ruleName;
    this.cellId = cellId;
  }
}

// ---------------------------------------------------------------------------
// Internal types (registry implementation detail)
// ---------------------------------------------------------------------------

/**
 * Discriminated tag for the in-tree flux rules. Adding a new rule
 * kind forces a compile-time update to every `switch` over this
 * union via the `_exhaustive: never` discipline.
 *
 * - v0.7 (P2): `'dimensional-consistency' | 'lbe-coordinate' | 'causality'`
 * - v0.8 (P5): adds `'regime-consistency'` — fires from `addCell`
 *   when a cell's attached regimes contradict the cell's coordinate
 *   axes (e.g., a `LawCell` with `scales: ['classical']` attached
 *   to a `quantum` regime via `attachRegimesToCell`).
 *
 * @internal — coupled to the registry's dispatch shape; not part of
 * the v0.7 public-API contract.
 */
export type FluxRuleKind =
  | 'dimensional-consistency'
  | 'lbe-coordinate'
  | 'causality'
  | 'regime-consistency';

/**
 * Result returned by a single rule's `check()` body. `ok: true` means
 * the rule passed; `ok: false` means the rule violated. A diagnostic
 * may be attached on either path (`'info'` diagnostics ride with
 * `ok: true`; `'warning'` and `'error'` diagnostics ride with
 * `ok: false`).
 *
 * @internal
 */
export interface FluxRuleResult {
  readonly ok: boolean;
  readonly diagnostic?: FluxDiagnostic;
}

/**
 * A registered rule. The `check()` body is a pure function over
 * `Cell` (or a sub-variant if the rule only fires on one `kind`).
 *
 * @internal
 */
export interface FluxRule {
  readonly kind: FluxRuleKind;
  readonly check: (cell: Cell) => FluxRuleResult;
}

// ---------------------------------------------------------------------------
// SCALE_ARROW — the partial-order on `PhysicalScale` used by Rule 3
// ---------------------------------------------------------------------------

/**
 * Ordered list of scales from finest to coarsest. The index encodes
 * the partial-order: lower index = finer (quantum), higher index =
 * coarser (cosmological). Used by Rule 3 (Causality) to classify
 * bridge direction as forward / lateral / reverse.
 */
const SCALE_ORDER: ReadonlyArray<PhysicalScale> = [
  'quantum',
  'mesoscopic',
  'classical',
  'cosmological',
];

function scaleIndex(s: PhysicalScale): number {
  return SCALE_ORDER.indexOf(s);
}

/**
 * Classify a bridge direction by source/target scale. `'reverse'` =
 * coarser→finer (e.g., classical→quantum), `'forward'` =
 * finer→coarser (the canonical emergent direction), `'lateral'` =
 * same scale. Per Decision #5, `'reverse'` triggers a warning
 * diagnostic.
 */
function classifyArrow(
  src: PhysicalScale,
  dst: PhysicalScale,
): 'forward' | 'lateral' | 'reverse' {
  const i = scaleIndex(src);
  const j = scaleIndex(dst);
  if (i === j) return 'lateral';
  return i < j ? 'forward' : 'reverse';
}

/**
 * Private per-cell-ID suppression list for Rule 3 (Causality). Empty
 * in v0.7; entries earn their place via design review (Decision #5
 * — the original "timeReversalAnnotation: true" on BridgeCell was
 * rejected as public-type contamination per Eve-R12).
 */
const causalityWhitelist: ReadonlySet<string> = new Set();

// ---------------------------------------------------------------------------
// Rule 2 — L/B/E coordinate matching (ERROR tier)
// ---------------------------------------------------------------------------

/**
 * Pure dispatcher for Rule 2 over the `Cell` discriminated union.
 * The three arms enforce the cell-shape invariants:
 *
 *   - `LawCell` is diagonal: `scales × forces` cross-product must be
 *     non-empty.
 *   - `BridgeCell` is off-diagonal: `source !== target` by at least
 *     one axis (already enforced by the legacy `addBridge` —
 *     Rule 2 piggybacks for registry exhaustiveness).
 *   - `EmergenceCell` spans multi-coordinate: `indices.length >= 2`.
 *
 * @internal
 */
export function checkLBECoordinate(cell: Cell): FluxRuleResult {
  switch (cell.kind) {
    case 'law':
      return checkLawCoordinate(cell);
    case 'bridge':
      return checkBridgeCoordinate(cell);
    case 'emergence':
      return checkEmergenceCoordinate(cell);
    default: {
      const _exhaustive: never = cell;
      void _exhaustive;
      throw new Error(`checkLBECoordinate: unknown cell kind`);
    }
  }
}

function checkLawCoordinate(cell: LawCell): FluxRuleResult {
  if (cell.scales.length === 0 || cell.forces.length === 0) {
    return {
      ok: false,
      diagnostic: {
        severity: 'error',
        ruleName: 'lbe-coordinate',
        cellId: cell.id,
        message:
          `LawCell '${cell.id}' has empty scales × forces cross-product ` +
          `(scales=[${cell.scales.join(',')}], forces=[${cell.forces.join(',')}]). ` +
          `A law must occupy at least one (scale, force) coordinate.`,
      },
    };
  }
  return { ok: true };
}

function checkBridgeCoordinate(cell: BridgeCell): FluxRuleResult {
  // A BridgeCell must differ between source and target on at least one
  // populated axis. The legacy `addBridge` at tensor.ts:217-226 already
  // enforces this; we re-implement here for registry exhaustiveness.
  const s = cell.source;
  const t = cell.target;
  const same =
    s.scale === t.scale &&
    s.force === t.force &&
    s.symmetry === t.symmetry &&
    s.information === t.information &&
    s.dimension === t.dimension &&
    s.topology === t.topology;
  if (same) {
    return {
      ok: false,
      diagnostic: {
        severity: 'error',
        ruleName: 'lbe-coordinate',
        cellId: cell.id,
        message:
          `BridgeCell '${cell.id}' has identical source and target ` +
          `coordinates. A bridge must connect two distinct regime axes.`,
      },
    };
  }
  return { ok: true };
}

function checkEmergenceCoordinate(cell: EmergenceCell): FluxRuleResult {
  if (cell.indices.length < 2) {
    return {
      ok: false,
      diagnostic: {
        severity: 'error',
        ruleName: 'lbe-coordinate',
        cellId: cell.id,
        message:
          `EmergenceCell '${cell.id}' has only ${cell.indices.length} ` +
          `index group(s); emergence requires at least 2 (higher-order ` +
          `correlations span multiple coordinates).`,
      },
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rule 3 — Causality (ERROR tier)
// ---------------------------------------------------------------------------

/**
 * Pure dispatcher for Rule 3 over the `Cell` discriminated union.
 * Rule 3 only fires on `'bridge'`; the other arms always pass.
 *
 * Body for the bridge arm per Decision #5:
 *   1. Read `src = cell.source.scale`, `dst = cell.target.scale`.
 *   2. If either is `undefined`, emit `'info'` ("scale-unspecified
 *      skip"); the rule still passes (`ok: true`).
 *   3. If `arrow = classifyArrow(src, dst) === 'reverse'`, FAIL with
 *      an `'error'` diagnostic (ERROR tier as of v0.10.0 — promoted
 *      from the v0.7 WARNING tier, user decision 2026-06-11).
 *   4. Suppression via the private `causalityWhitelist` (empty in
 *      v0.7).
 *
 * @internal
 */
export function checkCausality(cell: Cell): FluxRuleResult {
  if (cell.kind !== 'bridge') return { ok: true };
  if (causalityWhitelist.has(cell.id)) return { ok: true };

  const src = cell.source.scale;
  const dst = cell.target.scale;
  if (src === undefined || dst === undefined) {
    return {
      ok: true,
      diagnostic: {
        severity: 'info',
        ruleName: 'causality',
        cellId: cell.id,
        message: `scale axis unspecified; causality check skipped`,
      },
    };
  }

  const arrow = classifyArrow(src, dst);
  if (arrow === 'reverse') {
    return {
      // ERROR tier as of v0.10.0 (promoted from the v0.7 WARNING tier
      // per user decision 2026-06-11; live catalog verified clean —
      // 23/23 submittable cells pass, zero reverse arrows). Deliberate
      // reverse bridges go through causalityWhitelist.
      ok: false,
      diagnostic: {
        severity: 'error',
        ruleName: 'causality',
        cellId: cell.id,
        message:
          `BridgeCell '${cell.id}' goes ${src}→${dst} (coarser→finer); ` +
          `the canonical emergence direction is finer→coarser. ` +
          `Add the cell id to the causality whitelist (design review) ` +
          `if the reverse direction is deliberate.`,
      },
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Registry dispatcher
// ---------------------------------------------------------------------------

/**
 * Run a set of rules against a single `cell` and aggregate the
 * diagnostics into a `FluxReport`. Pure function — no I/O, no
 * shared-state mutation.
 *
 * The switch over `FluxRuleKind` is exhaustive via the
 * `_exhaustive: never` default arm (Decision #8). Adding a new rule
 * kind forces a compile-time update here AND at every consumer
 * site that branches on `FluxRuleKind`.
 *
 * @internal
 */
export function runRules(
  cell: Cell,
  rules: ReadonlyArray<FluxRule>,
): FluxReport {
  const diagnostics: FluxDiagnostic[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const rule of rules) {
    // Exhaustive dispatch on rule.kind. Even though `check` is the
    // same shape across kinds, branching here gives us the
    // compile-time guarantee that every kind is handled — a new
    // FluxRuleKind variant forces a compile error.
    let result: FluxRuleResult;
    switch (rule.kind) {
      case 'dimensional-consistency':
        result = rule.check(cell);
        break;
      case 'lbe-coordinate':
        result = rule.check(cell);
        break;
      case 'causality':
        result = rule.check(cell);
        break;
      case 'regime-consistency':
        result = rule.check(cell);
        break;
      default: {
        const _exhaustive: never = rule.kind;
        void _exhaustive;
        throw new Error(`runRules: unknown rule kind`);
      }
    }

    if (result.diagnostic) {
      diagnostics.push(result.diagnostic);
      switch (result.diagnostic.severity) {
        case 'error': errorCount++; break;
        case 'warning': warningCount++; break;
        case 'info': infoCount++; break;
      }
    }
  }

  return {
    diagnostics,
    errorCount,
    warningCount,
    infoCount,
  };
}

/**
 * The two v0.7 in-tree rules registered for Phase 2 `addCell`
 * dispatch. Rule 1 (Dimensional Consistency) is NOT here — it
 * operates on `BridgeEquationEntry`, not `Cell`, and ships in
 * Phase 3 alongside the catalog adapter.
 *
 * @internal
 */
export const V07_CELL_RULES: ReadonlyArray<FluxRule> = [
  { kind: 'lbe-coordinate', check: checkLBECoordinate },
  { kind: 'causality', check: checkCausality },
  { kind: 'regime-consistency', check: checkRegimeConsistency },
];

// ---------------------------------------------------------------------------
// Rule 4 — Regime Consistency (v0.8 P5 Phase 4, WARNING tier)
// ---------------------------------------------------------------------------

// Lazy import dance — regime-registry is in the same dir, so a static
// import would force regime-registry to load any time flux-rules
// loads. Phase 4 keeps that decoupled via a registered-callable
// pattern: P5's regime module registers its rule via
// `installRegimeConsistencyRule` below at module-load.

type RegimeRuleBody = (cell: Cell) => FluxRuleResult;

let registeredRegimeRule: RegimeRuleBody | null = null;

/**
 * Install P5's regime-consistency rule body. Called by
 * `src/core/regime-rule-install.ts` at its module load. If P5's
 * module is never imported, the regime check stays a no-op
 * (returns `ok: true` silently).
 *
 * @internal
 */
export function installRegimeConsistencyRule(body: RegimeRuleBody): void {
  registeredRegimeRule = body;
}

/**
 * Pure dispatcher for Rule 4 over `Cell`. Delegates to the body
 * installed by P5 if present; otherwise a permissive no-op.
 *
 * @internal
 */
function checkRegimeConsistency(cell: Cell): FluxRuleResult {
  if (registeredRegimeRule) return registeredRegimeRule(cell);
  return { ok: true };
}
