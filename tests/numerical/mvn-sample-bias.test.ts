/**
 * Is MathTS `mvnSample` biased? `tests/numerical/gum-monte-carlo.test.ts`
 * recorded every Monte-Carlo ratio under its expectation (be-74: 1.0426
 * against the exact √1.125 = 1.0607). Measured here, 2026-10-15, on
 * `@danielsimonjr/mathts-functions` 0.68.4 (Box–Muller on `seedrandom`, then
 * the Cholesky factor):
 *
 * - The sample covariance of 200000 seeded draws of a 2×2 Σ (σ = 2 and 0.5,
 *   ρ = 0.5) matches Σ entry by entry within the Gaussian standard error
 *   √((Σᵢᵢ Σⱼⱼ + Σᵢⱼ²)/(n − 1)); over ten seeds the mean standardized error
 *   was −0.07, −0.06 and −0.02 (S₁₁, S₂₂, S₁₂), the kurtosis 3.0045
 *   (Gaussian 3, one-seed standard error 0.011). A 1-D N(0, 9) is the same.
 *   `mvnSample` is NOT biased in variance, covariance or tails.
 * - The be-74 ratio std(B²)/(2Bσ) at σ = 0.5 B and 20000 draws, over 200
 *   seeds, averaged 1.0601 (spread 0.66%) against 1.0607. The prediction is
 *   exact for a Gaussian B (Var B² = 4B²σ² + 2σ⁴), so the gum test's low
 *   reading is SAMPLING, not nonlinearity: its one seed sits 2.5 spreads low.
 *   And its readings are not independent: every check there draws with the
 *   same seed, whose first 20000 standard normals have a sample std of
 *   0.9917 (−1.7 standard errors) and first 5000 0.9875 (−1.25), so all of
 *   them come out low together.
 */
import { describe, expect, it } from 'vitest';
import { mvnSample } from '@danielsimonjr/mathts-functions';

const N = 200_000;
const S1 = 2;
const S2 = 0.5;
const RHO = 0.5;
const SIGMA = [
  [S1 * S1, RHO * S1 * S2],
  [RHO * S1 * S2, S2 * S2],
];
/** The seed `gum-monte-carlo.test.ts` draws with. */
const GUM_SEED = 20261015;

function sampleCovariance(rows: readonly (readonly number[])[]): number[][] {
  const k = rows[0]!.length;
  const mean = new Array<number>(k).fill(0);
  for (const r of rows) for (let i = 0; i < k; i++) mean[i]! += r[i]! / rows.length;
  const c = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (const r of rows) {
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) c[i]![j]! += ((r[i]! - mean[i]!) * (r[j]! - mean[j]!)) / (rows.length - 1);
  }
  return c;
}

/** (S − Σ) in Gaussian standard errors, per entry [S11, S22, S12]. */
function standardizedErrors(c: number[][]): number[] {
  const se = (i: number, j: number): number => Math.sqrt((SIGMA[i]![i]! * SIGMA[j]![j]! + SIGMA[i]![j]! ** 2) / (N - 1));
  return [(c[0]![0]! - SIGMA[0]![0]!) / se(0, 0), (c[1]![1]! - SIGMA[1]![1]!) / se(1, 1), (c[0]![1]! - SIGMA[0]![1]!) / se(0, 1)];
}

function draw(seed: number): number[][] {
  return mvnSample([1, -3], SIGMA, N, { seed }) as number[][];
}

const std = (v: readonly number[]): number => {
  const m = v.reduce((a, x) => a + x, 0) / v.length;
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
};

describe('MathTS mvnSample is unbiased (measured, not assumed)', () => {
  const seeds = [GUM_SEED, 1, 2, 3, 4];
  const errors = seeds.map((seed) => standardizedErrors(sampleCovariance(draw(seed))));

  it('every sample-covariance entry of a 2×2 Σ (σ 2 and 0.5, ρ 0.5) is within 4 standard errors, on each of 5 seeds', () => {
    for (const e of errors) for (const z of e) expect(Math.abs(z)).toBeLessThan(4);
  });

  it('averaged over the 5 seeds, no entry leans: |mean error| < 3/√5 standard errors', () => {
    for (let entry = 0; entry < 3; entry++) {
      const mean = errors.reduce((a, e) => a + e[entry]!, 0) / errors.length;
      expect(Math.abs(mean)).toBeLessThan(3 / Math.sqrt(errors.length));
    }
  });

  it('a 1-D N(0, 9) has variance 9 within 4 standard errors and Gaussian kurtosis', () => {
    const z = (mvnSample(0, 9, N, { seed: GUM_SEED }) as unknown[]).map((r) => (Array.isArray(r) ? (r[0] as number) : (r as number)));
    const v = std(z) ** 2;
    expect(Math.abs(v - 9) / (9 * Math.sqrt(2 / (N - 1)))).toBeLessThan(4);
    const m4 = z.reduce((a, x) => a + x ** 4, 0) / z.length;
    expect(Math.abs(m4 / v ** 2 - 3)).toBeLessThan(5 * Math.sqrt(24 / N));
  });

  it('CONTROL: a draw whose spread is 1% short (variance 2% short) is flagged on S11 by more than 4 standard errors', () => {
    const rows = draw(GUM_SEED).map((r) => [1 + 0.99 * (r[0]! - 1), -3 + 0.99 * (r[1]! + 3)]);
    expect(standardizedErrors(sampleCovariance(rows))[0]!).toBeLessThan(-4);
  });
});

describe('the low be-74 reading of the gum test is sampling', () => {
  const B = 0.5;
  const sigma = 0.5 * B;
  const draws = 20_000;
  const predicted = Math.sqrt(1 + (sigma * sigma) / (2 * B * B));
  const ratio = (seed: number): number =>
    std((mvnSample([B], [[sigma * sigma]], draws, { seed }) as number[][]).map((r) => r[0]! ** 2)) / (2 * B * sigma);

  it('over 60 seeds the mean ratio std(B²)/(2Bσ) is the exact √1.125 within 3 standard errors of that mean', () => {
    const ratios = Array.from({ length: 60 }, (_, i) => ratio(i + 1));
    const mean = ratios.reduce((a, x) => a + x, 0) / ratios.length;
    expect(Math.abs(mean - predicted)).toBeLessThan((3 * std(ratios)) / Math.sqrt(ratios.length));
  });

  it("the gum test's seed gives 1.0426, low in that distribution; its first 20000 standard normals have sample std 0.9917", () => {
    expect(ratio(GUM_SEED)).toBeCloseTo(1.0426, 4);
    const z = (mvnSample([0], [[1]], draws, { seed: GUM_SEED }) as number[][]).map((r) => r[0]!);
    expect(std(z)).toBeCloseTo(0.9917, 4);
  });
});
