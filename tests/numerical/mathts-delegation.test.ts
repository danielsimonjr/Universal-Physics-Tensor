/**
 * The 2026-10-15 MathTS-usage review: each numeric routine UPT used to keep
 * locally is the MathTS call now, including the two that waited for
 * @danielsimonjr/mathts-functions 0.68.3 (the direct upper incomplete gamma,
 * and findRoot's residual-only stop). The source scans fail while a local
 * copy is still the implementation; the value checks are the second method,
 * computed from a closed form rather than from the routine itself.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import { pendulumNome, theta0OfPeriodError } from '../../src/atlas/oscillators/pendulum-motion.js';
import { randomWalkCentralDensity, diffusionKernel } from '../../src/atlas/diffusion/numerics.js';
import { Z95, mcnemar } from '../../src/atlas/benchmark/stats.js';
import { cosine } from '../../src/atlas/benchmark/hybrid-retrieval.js';
import { chiSquareCdf, chiSquareSurvival, fSurvival } from '../../src/composition/probe/study.js';
import { estimateScaleExponent } from '../../src/composition/probe/structure.js';
import { sphereEigenvalues } from '../../src/cases/lumped-cooling.js';
import { windowedLinewidthHz } from '../../src/cases/damped-resonator.js';
import { adaptiveQuadrature } from '../../src/cases/quadrature.js';
import { GAUSS_LEGENDRE_16 } from '../../src/numerical/quadrature.js';

function source(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

describe('MathTS carries the special functions', () => {
  it('the pendulum period error and nome are ellipticK, not a local AGM', () => {
    const limits = source('../../src/atlas/oscillators/bridges-limits.ts');
    expect(limits).toMatch(/ellipticK/);
    expect(limits).not.toMatch(/function agm/);
    expect(source('../../src/atlas/oscillators/pendulum-motion.ts')).not.toMatch(/\bagm\(/);
    // Second method: the Landen series (2/π)K(k) = 1 + k²/4 + 9k⁴/64 + 25k⁶/256 + 1225k⁸/16384 + …
    const k2 = Math.sin(0.1) ** 2;
    const series = k2 / 4 + (9 * k2 ** 2) / 64 + (25 * k2 ** 3) / 256 + (1225 * k2 ** 4) / 16384 + (3969 * k2 ** 5) / 65536;
    expect(pendulumPeriodErrorAt({ theta0: 0.2 })).toBeCloseTo(series, 9);
    // The nome at small amplitude is k²/16 to leading order (q = k²/16 + 8(k²/16)² + …).
    const k2s = Math.sin(0.005) ** 2;
    expect(pendulumNome(0.01)).toBeCloseTo(k2s / 16 + 8 * (k2s / 16) ** 2, 14);
    expect(theta0OfPeriodError(pendulumPeriodErrorAt({ theta0: 0.3 }))).toBeCloseTo(0.3, 12);
  });

  it('the probe study reads betainc, gammainc and gammaincp, and the upper tail still resolves', () => {
    const study = source('../../src/composition/probe/study.ts');
    expect(study).toMatch(/\bbetainc\b/);
    expect(study).toMatch(/\bgammainc\b/);
    expect(study).toMatch(/import \{[^}]*gammaincp/);
    expect(study).not.toMatch(/function lnGamma|function betaCf|function gammaSeries|LANCZOS|modified Lentz\)/);
    // Before @danielsimonjr/mathts-functions 0.68.3, `gammaincp` was 1 − P and rounded the far
    // tail to 0 (gammaincp(5, 80) = 0); the survival function is that call now, and this is the
    // tail it must resolve (the dependency range is pinned in tests/tools/package-deps.test.ts).
    expect(chiSquareSurvival(160, 10)).toBeGreaterThan(0);
    expect(chiSquareSurvival(160, 10)).toBeCloseTo(Math.exp(-80) * (1 + 80 + 80 ** 2 / 2 + 80 ** 3 / 6 + 80 ** 4 / 24), 40);
    // Closed forms: χ²₂ is exponential and the F(1, 1) tail is the Cauchy t².
    expect(chiSquareCdf(3, 2)).toBeCloseTo(1 - Math.exp(-1.5), 14);
    expect(chiSquareCdf(1e-8, 2)).toBeCloseTo(-Math.expm1(-5e-9), 22);
    expect(fSurvival(2, 1, 1)).toBeCloseTo(1 - (2 / Math.PI) * Math.atan(Math.SQRT2), 13);
  });

  it('the random walk, the McNemar tail and the Wilson z read lgamma and normalQuantile', () => {
    expect(source('../../src/atlas/diffusion/numerics.ts')).toMatch(/\blgamma\b/);
    expect(source('../../src/atlas/diffusion/numerics.ts')).not.toMatch(/function logBinomial\b/);
    const stats = source('../../src/atlas/benchmark/stats.ts');
    expect(stats).toMatch(/\blgamma\b/);
    expect(stats).toMatch(/normalQuantile/);
    expect(stats).toMatch(/function logChoose[^}]*logGamma\(n \+ 1\)/);
    expect(stats).not.toMatch(/Z95 = 1\.9/);
    expect(Z95).toBeCloseTo(1.959963984540054, 14);
    expect(mcnemar({ a: 0, b: 10, c: 2, d: 0 }).exactP).toBeCloseTo(158 / 4096, 12);
    // The lattice density tends to the Gaussian kernel: the n = 10⁴ value is within 1e-4 of it.
    const D = 0.5;
    const t = 1;
    expect(randomWalkCentralDensity(10_000, D, t) / diffusionKernel(0, t, D)).toBeCloseTo(1, 4);
  });
});

describe('MathTS carries the quadrature, the interpolation and the statistics', () => {
  it('the Gauss–Legendre weights come from legendreP, cosine from pairwiseDot, the scale exponent from linearRegression', () => {
    expect(source('../../src/numerical/quadrature.ts')).toMatch(/legendreP/);
        expect(GAUSS_LEGENDRE_16.reduce((s, n) => s + n.weight, 0)).toBeCloseTo(2, 15);
    const retrieval = source('../../src/atlas/benchmark/hybrid-retrieval.ts');
    expect(retrieval).toMatch(/pairwiseDot/);
    expect(cosine(new Float32Array([1, 2, 3]), new Float32Array([1, 2, 3]))).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(source('../../src/composition/probe/structure.ts')).toMatch(/linearRegression/);
    expect(estimateScaleExponent({ x: [1, 2, 4, 8], y: [3, 12, 48, 192] }).exponent).toBeCloseTo(2, 12);
    expect(source('../../src/numerical/perihelion-finder.ts')).toMatch(/hermiteInterp/);
    expect(source('../../src/numerical/perihelion-finder.ts')).not.toMatch(/function median\b/);
    expect(source('../../src/numerical/perihelion-finder.ts')).toMatch(/hermiteInterp\(\[0, 1\]/);
    expect(source('../../src/atlas/diffusion/numerics.ts')).toMatch(/\btrapz\b/);
  });

  it('the applied cases integrate with quad and bracket with findRoot', () => {
    const quadrature = source('../../src/cases/quadrature.ts');
    expect(quadrature).toMatch(/\bquad\b/);
    expect(quadrature).not.toMatch(/function adaptiveSimpson/);
    expect(adaptiveQuadrature((x) => Math.exp(-x * x), -8, 8)).toBeCloseTo(Math.sqrt(Math.PI), 12);
    expect(source('../../src/cases/lumped-cooling.ts')).toMatch(/findRoot/);
    expect(source('../../src/cases/damped-resonator.ts')).toMatch(/findRoot/);
    expect(source('../../src/atlas/oscillators/pendulum-motion.ts')).toMatch(/findRoot/);
    // 1 − ζ cot ζ = Bi at Bi = 1 has the roots ζ = (n + ½)π exactly.
    sphereEigenvalues(1, 4).forEach((z, n) => expect(z).toBeCloseTo((n + 0.5) * Math.PI, 13));
    // A long window resolves the natural linewidth α/π.
    expect(windowedLinewidthHz(Math.PI, 1e3)).toBeCloseTo(1, 12);
  });

  it('the perihelion residual root is findRoot with xtol: 0, the residual stop alone', () => {
    // Before 0.68.3, `findRoot` stopped on `|b − a| < tol` as well as `|f| < tol`, in the units of
    // its independent variable; the perihelion contract is a residual tolerance in the units of
    // dr/dτ, which that width stop would have silently coarsened. `xtol: 0` is the residual stop.
    const finder = source('../../src/numerical/perihelion-finder.ts');
    expect(finder).not.toMatch(/function bisectCubic/);
    expect(finder).toMatch(/findRoot\(P, 0, 1, \{ tol, xtol: 0/);
    const quadrature = source('../../src/cases/quadrature.ts');
    expect(quadrature).toMatch(/atol: 0/);
  });
});

describe('MathTS carries the rational arithmetic and the stable sums', () => {
  it('Buckingham exponents are core Fractions and the exact scale reads MathTS gcd', () => {
    const buckingham = source('../../src/dimensional/buckingham.ts');
    expect(buckingham).not.toMatch(/function gcd|interface Frac\b/);
    expect(source('../../src/dimensional/exact-scale.ts')).not.toMatch(/function gcd/);
    expect(source('../../src/dimensional/exact-scale.ts')).toMatch(/\bgcd\b/);
  });

  it('the prefactor fit, the ratio spread and the changepoint read the stable primitives', () => {
    expect(source('../../src/composition/probe/fit.ts')).toMatch(/pairwiseDot|norm2/);
    expect(source('../../src/numerical/statistics.ts')).toMatch(/\bstd\b/);
    // The ratio spread has one owner since proposal 6: canonical/fixed-points.ts reads it, and
    // the audit (bridge-analysis) and `upt derive` reach it through that module's constantRatio /
    // recoverMonomialPrefactor (derive through the barrel).
    expect(source('../../src/canonical/fixed-points.ts')).toMatch(/\bratioSpread\(/);
    expect(source('../../src/composition/bridge-analysis.ts')).toMatch(/from '\.\.\/canonical\/fixed-points\.js'/);
    expect(source('../../src/cli/commands/derive.ts')).toMatch(/api\.(ratioSpread|recoverMonomialPrefactor)\b/);
    expect(source('../../src/composition/probe/structure.ts')).toMatch(/\bmean\b/);
    expect(source('../../src/cases/lumped-cooling.ts')).toMatch(/solveODESystem/);
  });
});
