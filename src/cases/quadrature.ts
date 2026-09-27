/**
 * Adaptive Simpson quadrature for the parent-model comparisons of the applied
 * cases. The integrands there are smooth and monotone over bands that can span
 * many decades, which a fixed grid resolves badly at the low end.
 *
 * @module cases/quadrature
 */

/**
 * ∫ₐᵇ f by adaptive Simpson with Richardson correction.
 * @throws Error if the recursion hits `maxDepth` without meeting `relTol`.
 * @internal
 */
export function adaptiveSimpson(f: (x: number) => number, a: number, b: number, relTol = 1e-10, maxDepth = 60): number {
  const fa = f(a);
  const fb = f(b);
  const m = (a + b) / 2;
  const fm = f(m);
  const whole = ((b - a) / 6) * (fa + 4 * fm + fb);
  // The tolerance is relative to the whole integral, estimated from a coarse pass.
  let scale = Math.abs(whole);
  for (let i = 1; i < 64; i++) scale = Math.max(scale, Math.abs(f(a + ((b - a) * i) / 64)) * (b - a));
  const eps = relTol * (scale > 0 ? scale : 1);
  const step = (lo: number, hi: number, flo: number, fmid: number, fhi: number, s: number, tol: number, depth: number): number => {
    const mid = (lo + hi) / 2;
    const lm = (lo + mid) / 2;
    const rm = (mid + hi) / 2;
    const flm = f(lm);
    const frm = f(rm);
    const left = ((mid - lo) / 6) * (flo + 4 * flm + fmid);
    const right = ((hi - mid) / 6) * (fmid + 4 * frm + fhi);
    const diff = left + right - s;
    if (Math.abs(diff) <= 15 * tol) return left + right + diff / 15;
    if (depth >= maxDepth) throw new Error(`adaptiveSimpson: no convergence on [${lo}, ${hi}] at depth ${depth}`);
    return step(lo, mid, flo, flm, fmid, left, tol / 2, depth + 1) + step(mid, hi, fmid, frm, fhi, right, tol / 2, depth + 1);
  };
  return step(a, b, fa, fm, fb, whole, eps, 0);
}
