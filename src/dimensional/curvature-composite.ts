/**
 * Curvature composite-AST factory (v0.6.0 Phase 3, Task 3.9).
 *
 * PD-6 trigger fires: Weyl is the 5th curvature primitive (after
 * Riemann/Ricci/Einstein/Bianchi from v0.5.0). The 4-kind parallel
 * duplication is now extracted into a shared factory.
 *
 * Net LOC change: −180 (per design Decision #5).
 *
 * P-1 fix: `CurvatureCompositeNode<K, S>` is an intersection type, not an
 * interface with an unused S. Without the intersection, the per-kind
 * slot type-safety would silently drop (the S parameter would be
 * decorative and TypeScript would not compose it into the result).
 *
 * @module dimensional/curvature-composite
 */

import type { Dimension } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CurvatureKind discriminant union
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discriminant union of all curvature-composite AST node kinds in UPT v0.6.0.
 *
 * Six curvature primitives:
 *   - `riemann-tensor`     — R^ρ_{σμν}   (rank-4, 1-up 3-down, [L⁻²])
 *   - `ricci-tensor`       — R_{μν}       (rank-2 lower-lower,  [L⁻²])
 *   - `einstein-tensor`    — G_{μν}       (rank-2 lower-lower,  [L⁻²])
 *   - `bianchi-residual`   — B_{λμνρσ}   (rank-5 lower,        [L⁻³])
 *   - `weyl-tensor`        — C^ρ_{σμν}   (rank-4, 1-up 3-down, [L⁻²])
 *   - `kretschmann-scalar` — K            (scalar,              [L⁻⁴])
 *
 * @public
 */
export type CurvatureKind =
  | 'riemann-tensor'
  | 'ricci-tensor'
  | 'einstein-tensor'
  | 'bianchi-residual'
  | 'weyl-tensor'
  | 'kretschmann-scalar';

// ─────────────────────────────────────────────────────────────────────────────
// CurvatureKindSpec — per-kind shape + dim descriptor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-kind specification record used by the registry.
 *
 * `freeIndicesShape` is a human-readable summary of the free-index structure:
 *   - `'rank-4-1upper-3lower'` — 1 upper + 3 lower (Riemann, Weyl)
 *   - `'rank-2-lower-lower'`   — 2 lower (Ricci, Einstein)
 *   - `'rank-3-lower'`         — the Bianchi residual B_{λμνρσ}, which has FIVE lower
 *                                  indices. The "3" is not the rank: it counts the three
 *                                  cyclic terms over (λ, μ, ν) in
 *                                  B_{λμνρσ} = ∇_λ R_{μνρσ} + ∇_μ R_{νλρσ} + ∇_ν R_{λμρσ}.
 *                                  The name stays because the registry is public.
 *   - `'scalar'`               — 0 free indices (Kretschmann)
 *
 * `componentDim` is the SI dimension of each component in the F8/I3 convention
 * (metric is dimensionless, coordinates carry [L]).
 *
 * @internal
 */
interface CurvatureKindSpec {
  readonly freeIndicesShape: 'rank-4-1upper-3lower' | 'rank-2-lower-lower' | 'rank-3-lower' | 'scalar';
  readonly componentDim: Dimension;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURVATURE_KIND_REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry mapping each `CurvatureKind` to its shape + dimensional spec.
 *
 * Used by:
 *   - Tests: to assert all 6 kinds are registered and that Riemann + Weyl
 *     share the rank-4 shape (refactor-only invariant).
 *   - Future lowering consolidation: `CURVATURE_KIND_REGISTRY[node.kind]`
 *     can supply common validation data without per-kind duplication.
 *
 * @public
 */
export const CURVATURE_KIND_REGISTRY: Record<CurvatureKind, CurvatureKindSpec> = {
  'riemann-tensor': {
    freeIndicesShape: 'rank-4-1upper-3lower',
    componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
  'ricci-tensor': {
    freeIndicesShape: 'rank-2-lower-lower',
    componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
  'einstein-tensor': {
    freeIndicesShape: 'rank-2-lower-lower',
    componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
  'bianchi-residual': {
    // Five lower indices; '3' counts the cyclic terms, not the rank (see CurvatureKindSpec).
    freeIndicesShape: 'rank-3-lower',
    componentDim: { L: -3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
  'weyl-tensor': {
    freeIndicesShape: 'rank-4-1upper-3lower',
    componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
  'kretschmann-scalar': {
    freeIndicesShape: 'scalar',
    componentDim: { L: -4, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CurvatureCompositeNode<K, S> — shared factory type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic factory type for all curvature-composite AST nodes.
 *
 * **P-1 fix (v0.6.0 plan-vet):** Must be an intersection type, not an
 * interface with an unused type parameter. The intersection `{ kind: K } & S`
 * ensures TypeScript actually composes the kind-specific slot type `S` into
 * the resulting type, giving real discriminant + kind-specific type safety.
 *
 * Usage (type alias):
 * ```typescript
 * type RicciTensorNode = CurvatureCompositeNode<'ricci-tensor', {
 *   readonly riemann: RiemannTensorNode;
 * }>;
 * ```
 *
 * The intersection produces:
 * ```typescript
 * { readonly kind: 'ricci-tensor' } & { readonly riemann: RiemannTensorNode }
 * // ≡ { readonly kind: 'ricci-tensor'; readonly riemann: RiemannTensorNode }
 * ```
 *
 * @public
 */
export type CurvatureCompositeNode<K extends CurvatureKind, S extends object> = {
  readonly kind: K;
} & S;
