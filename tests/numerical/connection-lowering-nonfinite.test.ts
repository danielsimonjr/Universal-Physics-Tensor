/**
 * Non-finite propagation through the connection-lowering kernels.
 *
 * PR #117 added early-bailout guards — `if (gInvAlphaRho !== 0)` in
 * computeChristoffelTensor and `if (gVal !== 0)` in contractChristoffelWithOperand.
 * Algebraically skipping a `0 * x` term is a no-op for finite `x`, but NOT when `x`
 * is NaN or ±Infinity: `0 * NaN === NaN` used to propagate and now never enters the
 * sum.
 *
 * How reachable that is differs per guard, and the answer is NOT the obvious one:
 *
 *  - computeChristoffelTensor: NARROW. A diagonal metric does NOT trigger it,
 *    because in Γ^α_μν = ½ g^{αρ}(∂_μ g_ρν + ∂_ν g_ρμ − ∂_ρ g_μν) the third term
 *    uses ρ as the DERIVATIVE index, so a NaN in derivs[k] is still weighted by
 *    g^{kk}. It takes a DEGENERATE inverse metric (a zero on the diagonal) — the
 *    numerical shape of a coordinate singularity, where this project does GL4
 *    stepping.
 *  - contractChristoffelWithOperand: COMMON. Any operand NaN sitting where a
 *    connection component is exactly 0 is dropped, and most Γ components vanish
 *    for symmetric metrics.
 *
 * The suppression is defensible: if Γ is exactly 0 the term's true contribution is
 * zero, and `0 * NaN = NaN` is an IEEE-754 artifact rather than the answer. What is
 * lost is a diagnostic alarm, not correctness.
 *
 * These tests pin the ACTUAL behaviour against ground truth (not self-consistency)
 * so the choice is explicit and any future change to it is deliberate.
 */
import { describe, it, expect } from 'vitest';
import { computeChristoffelTensor, contractChristoffelWithOperand } from '../../src/numerical/connection-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const engine = new MathTSEngine();
const N = 4;

/** Identity-like diagonal inverse metric: off-diagonal entries are exactly 0. */
function diagonalInverse(diag: number[]): number[] {
  const g = new Array<number>(N * N).fill(0);
  for (let i = 0; i < N; i++) g[i * N + i] = diag[i];
  return g;
}

describe('non-finite propagation (PR #117 early-bailout guards)', () => {
  it('computeChristoffelTensor: a NaN metric derivative reaches the output when its inverse-metric factor is NON-zero', () => {
    // Control: the guard does NOT fire (g^{αρ} != 0 on the diagonal), so a NaN in
    // the derivative must still propagate. If this ever fails, the bailout is
    // swallowing far more than zero-weighted terms.
    const gInv = diagonalInverse([1, 1, 1, 1]);
    const derivs = Array.from({ length: N }, () => new Array<number>(N * N).fill(0));
    derivs[0][0] = Number.NaN; // ∂_0 g_{00} = NaN

    const out = computeChristoffelTensor(gInv, (mu) => derivs[mu], N, engine);
    const flat = (engine.toNested(out) as number[][][]).flat(2);
    expect(flat.some(Number.isNaN)).toBe(true);
  });

  it('DOCUMENTS the suppression: a NaN derivative is DROPPED when its inverse-metric factor is exactly 0 (DEGENERATE metric)', () => {
    // Getting a zero-weighted NaN requires care. In
    //   Γ^α_μν = ½ g^{αρ} (∂_μ g_ρν + ∂_ν g_ρμ − ∂_ρ g_μν)
    // the THIRD term uses ρ as the DERIVATIVE index, so for a diagonal inverse
    // (ρ = α) a NaN in derivs[k] is still weighted by g^{kk}. With every diagonal
    // entry non-zero, nothing is zero-weighted and NaN correctly propagates —
    // which is what the control above shows.
    //
    // The suppression therefore needs a DEGENERATE inverse metric: a zero on the
    // diagonal. That is not contrived — it is exactly what a coordinate
    // singularity looks like numerically (a direction the inverse metric kills),
    // and it is where this project does GL4 stepping.
    const gInv = diagonalInverse([1, 1, 1, 0]); // g^{33} = 0 → direction 3 degenerate
    const derivs = Array.from({ length: N }, () => new Array<number>(N * N).fill(0));
    // ∂_3 g_{33}=NaN reaches Γ only through ρ=3 (term3 with ρ=α=3, and terms 1/2
    // with ρ=3), every one of which carries the factor g^{α3} — zero for all α.
    derivs[3][3 * N + 3] = Number.NaN;

    const out = computeChristoffelTensor(gInv, (mu) => derivs[mu], N, engine);
    const flat = (engine.toNested(out) as number[][][]).flat(2);

    // Post-#117 ground truth: the zero-weighted NaN never enters the sum, so the
    // whole tensor comes back finite. Pre-#117 this produced NaN.
    // THIS IS THE BEHAVIOUR CHANGE, pinned deliberately: a degenerate direction
    // now yields clean finite numbers instead of a NaN that announced the problem.
    expect(flat.every(Number.isFinite)).toBe(true);
  });

  it('contractChristoffelWithOperand: a NaN operand entry is DROPPED where its Christoffel factor is exactly 0', () => {
    // This function had NO direct unit test before this file.
    const GammaFlat = new Array<number>(N * N * N).fill(0);
    GammaFlat[0] = 1; // exactly one non-zero connection component

    const ofFlat = new Array<number>(N).fill(0);
    ofFlat[N - 1] = Number.NaN; // NaN sits where Gamma is 0 -> guard skips it

    const out = contractChristoffelWithOperand(GammaFlat, ofFlat, [N], 0, 'lower', N, engine);
    const flat = (engine.toNested(out) as number[][]).flat(2);

    // Post-#117: suppressed, so the result is entirely finite.
    expect(flat.every(Number.isFinite)).toBe(true);
  });

  it('contractChristoffelWithOperand: a NaN operand entry DOES propagate where its Christoffel factor is non-zero', () => {
    // The guard must not suppress genuinely weighted NaNs — that would be a much
    // larger defect than the zero-weighted case.
    const GammaFlat = new Array<number>(N * N * N).fill(0);
    GammaFlat[0] = 1;

    const ofFlat = new Array<number>(N).fill(0);
    ofFlat[0] = Number.NaN; // NaN where Gamma != 0

    const out = contractChristoffelWithOperand(GammaFlat, ofFlat, [N], 0, 'lower', N, engine);
    const flat = (engine.toNested(out) as number[][]).flat(2);
    expect(flat.some(Number.isNaN)).toBe(true);
  });
});
