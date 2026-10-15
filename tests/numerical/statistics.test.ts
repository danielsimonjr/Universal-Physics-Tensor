/**
 * `numerical/statistics`: `meanOf`, `ratioSpread` and `logChoose`, the scalar statistics read
 * from MathTS (`mean`, `std`, `lgamma`). Their importers (link prediction, retrodiction, the probe
 * structure tests, the fixed-point recovery, the lattice walk) reached them only through their own
 * tests; this file tests them directly against closed forms and exact integer logarithms.
 */
import { describe, expect, it } from 'vitest';
import { logChoose, meanOf, ratioSpread } from '../../src/numerical/statistics.js';

describe('meanOf', () => {
  it('is the arithmetic mean: [1, 2, 3, 4] → 5/2, a single value is itself, signs cancel', () => {
    expect(meanOf([1, 2, 3, 4])).toBe(2.5);
    expect(meanOf([7])).toBe(7);
    expect(meanOf([-3, 3])).toBe(0);
    expect(meanOf([1e300, 1e300])).toBe(1e300);
  });

  it('refuses an empty array with a RangeError, and does not mutate its input', () => {
    expect(() => meanOf([])).toThrow(RangeError);
    const xs = Object.freeze([3, 1, 2]);
    expect(meanOf(xs)).toBe(2);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe('ratioSpread', () => {
  it('[1, 2, 3, 4]: mean 5/2 and cv = √(5/4)/(5/2) = 1/√5 (population σ, divide by n)', () => {
    const r = ratioSpread([1, 2, 3, 4]);
    expect(r.mean).toBe(2.5);
    expect(Math.abs(r.cv - 1 / Math.sqrt(5))).toBeLessThan(1e-15);
    // Control: the sample σ (divide by n − 1) gives √(5/3)/(5/2) = 0.516, which this rules out.
    expect(Math.abs(r.cv - Math.sqrt(5 / 3) / 2.5)).toBeGreaterThan(0.05);
  });

  it('constant ratios have cv 0; the divisor is |mean|, so a negative mean gives a positive cv', () => {
    expect(ratioSpread([3, 3, 3])).toEqual({ mean: 3, cv: 0 });
    const neg = ratioSpread([-2, -4]);
    expect(neg.mean).toBe(-3);
    expect(neg.cv).toBeCloseTo(1 / 3, 15);
  });

  it('a zero mean of non-zero ratios is cv = Infinity; all zeros and a non-finite ratio are NaN', () => {
    expect(ratioSpread([-1, 1])).toEqual({ mean: 0, cv: Infinity });
    expect(ratioSpread([0, 0]).cv).toBeNaN();
    expect(ratioSpread([1, Number.NaN]).cv).toBeNaN();
    expect(ratioSpread([1, Number.POSITIVE_INFINITY]).cv).toBeNaN();
    expect(() => ratioSpread([])).toThrow(RangeError);
  });
});

describe('logChoose', () => {
  // ln C(n, k) from the exact integer: Python `Decimal(math.comb(n, k)).ln()` at 60 digits.
  const EXACT: readonly (readonly [number, number, number])[] = [
    [5, 2, 2.30258509299404568401799145468436420760110148862877297603333],
    [100, 50, 66.7838416520174260090056056678965911836001696823621765384875],
    [1000, 500, 689.467261567851180075508855112722429814321564607817442004458],
    [10000, 5000, 6926.64081906082031703858830072413135650524737034866716799383],
    [100000, 50000, 69308.7357994094011001224707362276651226274093087733386498827],
    [100000, 1, 11.5129254649702284200899572734218210380055074431438648801666],
  ];
  /** The tolerance: lgamma's largest error over EXACT is 4.4e-11 (n = 10⁵); a sum of logs is 1.5e-9 there. */
  const TOL = 1e-10;
  /** The retired route, Σ ln(n−k+i) − ln i, kept only as the control below. */
  const sumOfLogs = (n: number, k: number): number => {
    let s = 0;
    for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
    return s;
  };

  it('matches the exact integer logarithm to 1e-10 up to n = 10⁵', () => {
    for (const [n, k, exact] of EXACT) expect(Math.abs(logChoose(n, k) - exact), `n=${n} k=${k}`).toBeLessThan(TOL);
  });

  it('control: the sum of logs fails the same tolerance at n = 10⁵, so the tolerance discriminates', () => {
    const [n, k, exact] = EXACT[4]!;
    expect(Math.abs(sumOfLogs(n, k) - exact)).toBeGreaterThan(10 * TOL);
  });

  it('C(n, 0) = C(n, n) = 1 and the symmetry C(n, k) = C(n, n − k)', () => {
    expect(Math.abs(logChoose(10, 0))).toBeLessThan(1e-14);
    expect(Math.abs(logChoose(10, 10))).toBeLessThan(1e-14);
    expect(Math.abs(logChoose(10, 3) - Math.log(120))).toBeLessThan(1e-14);
    expect(logChoose(1000, 300)).toBeCloseTo(logChoose(1000, 700), 10);
  });
});
