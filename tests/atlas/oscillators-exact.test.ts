/**
 * Witnesses W1, W1a, W1b, W2 and W2b — the two exact-equivalence bridges.
 *
 * W1 is symbolic and runs on EXACT RATIONAL arithmetic over the exponent
 * bookkeeping (a tiny local monomial algebra below). No floating point takes
 * part in it, so "exactly 1" means exactly 1 rather than 1 ± eps.
 *
 * The numeric witnesses integrate the DIMENSIONED systems and then apply the
 * bridge's own map, rather than integrating the nondimensional form directly.
 * Integrating `u'' + u = 0` would assert that `cos τ` solves `u'' + u = 0` —
 * true, and no evidence about the bridge. Going through the dimensioned
 * system is what puts the transformation under test.
 */
import { describe, it, expect } from 'vitest';
import { rk4 } from './_ode.js';
import {
  BRIDGE_SPRING_LC,
  BRIDGE_DAMPED_RLC,
} from '../../src/atlas/oscillators/bridges-exact.js';

const TEST_PATH = 'tests/atlas/oscillators-exact.test.ts';

// ---------------------------------------------------------------------------
// Exact rational monomial algebra (W1 only). A monomial is a rational scalar
// times a product of symbols raised to rational powers. All arithmetic is on
// integers; nothing here touches a float.
// ---------------------------------------------------------------------------

interface Frac {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x === 0 ? 1 : x;
}

function frac(n: number, d = 1): Frac {
  if (d === 0) throw new RangeError('frac: zero denominator');
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
}

const addF = (a: Frac, b: Frac): Frac => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const mulF = (a: Frac, b: Frac): Frac => frac(a.n * b.n, a.d * b.d);
const isZeroF = (a: Frac): boolean => a.n === 0;
const isOneF = (a: Frac): boolean => a.n === 1 && a.d === 1;

interface Monomial {
  /** Rational scalar coefficient. */
  readonly c: Frac;
  /** Symbol name → rational exponent. */
  readonly e: Readonly<Record<string, Frac>>;
}

const sym = (name: string): Monomial => ({ c: frac(1), e: { [name]: frac(1) } });
const ONE: Monomial = { c: frac(1), e: {} };

function mul(...ms: readonly Monomial[]): Monomial {
  let c = frac(1);
  const e: Record<string, Frac> = {};
  for (const m of ms) {
    c = mulF(c, m.c);
    for (const [k, v] of Object.entries(m.e)) e[k] = addF(e[k] ?? frac(0), v);
  }
  return { c, e };
}

function inv(m: Monomial): Monomial {
  const e: Record<string, Frac> = {};
  for (const [k, v] of Object.entries(m.e)) e[k] = mulF(v, frac(-1));
  return { c: frac(m.c.d, m.c.n), e };
}

const div = (a: Monomial, b: Monomial): Monomial => mul(a, inv(b));

/** Rational power. Restricted to unit-coefficient monomials, which is all W1 needs. */
function powRat(m: Monomial, p: Frac): Monomial {
  if (!isOneF(m.c)) throw new RangeError('powRat: non-unit coefficient');
  const e: Record<string, Frac> = {};
  for (const [k, v] of Object.entries(m.e)) e[k] = mulF(v, p);
  return { c: frac(1), e };
}

/** True iff the monomial is the exact rational 1 — coefficient 1, every exponent 0. */
function isExactlyOne(m: Monomial): boolean {
  return isOneF(m.c) && Object.values(m.e).every(isZeroF);
}

// ---------------------------------------------------------------------------
// Numeric helpers.
// ---------------------------------------------------------------------------

/**
 * Integrate `A y'' + B y' + C y = 0` from `y(0) = y0`, `y'(0) = v0` to the
 * physical time that the bridge's map sends `tau` to, and return the
 * nondimensional `u = y/scale` there.
 */
function uAtTau(
  A: number,
  B: number,
  C: number,
  y0: number,
  v0: number,
  scale: number,
  omega0: number,
  tau: number,
): number {
  const f = (_t: number, y: readonly number[]): number[] => [
    y[1],
    (-B * y[1] - C * y[0]) / A,
  ];
  const t1 = tau / omega0;
  const steps = Math.max(1000, Math.ceil(tau * 2000));
  const { y } = rk4(f, [y0, v0], 0, t1, steps);
  return y[0] / scale;
}

const TAUS = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];

// ---------------------------------------------------------------------------

describe('W1 — ab-spring-lc nondimensionalizes exactly (symbolic)', () => {
  const m = sym('m');
  const k = sym('k');
  const x0 = sym('x0');
  const L = sym('L');
  const C = sym('C');
  const q0 = sym('q0');

  it('spring: ω0 = (k/m)^(1/2) squares back to k/m exactly', () => {
    const omega0Sq = div(k, m);
    const omega0 = powRat(omega0Sq, frac(1, 2));
    expect(omega0.e['k']).toEqual(frac(1, 2));
    expect(omega0.e['m']).toEqual(frac(-1, 2));
    expect(isExactlyOne(div(mul(omega0, omega0), omega0Sq))).toBe(true);
  });

  it('spring: m x″ + k x over k·x0 has coefficient exactly 1 on u″ and on u', () => {
    // x = x0 u, t = τ/ω0  ⇒  x″ = x0 ω0² u″.
    const omega0Sq = div(k, m);
    const uDoubleDot = mul(m, x0, omega0Sq); // coefficient of u″
    const uTerm = mul(k, x0); // coefficient of u
    const divisor = mul(k, x0);

    expect(isExactlyOne(div(uDoubleDot, divisor))).toBe(true);
    expect(isExactlyOne(div(uTerm, divisor))).toBe(true);
    // Every exponent cancels individually — m, k and x0 each reach 0.
    const reduced = div(uDoubleDot, divisor);
    expect(reduced.c).toEqual(ONE.c);
    expect(Object.values(reduced.e).map((f) => f.n)).toEqual([0, 0, 0]);
  });

  it('LC: L q″ + q/C over q0/C has coefficient exactly 1 on u″ and on u', () => {
    const omega0Sq = inv(mul(L, C)); // ω0² = 1/(LC)
    const omega0 = powRat(omega0Sq, frac(1, 2));
    expect(isExactlyOne(div(mul(omega0, omega0), omega0Sq))).toBe(true);

    const uDoubleDot = mul(L, q0, omega0Sq);
    const uTerm = div(q0, C);
    const divisor = div(q0, C);

    expect(isExactlyOne(div(uDoubleDot, divisor))).toBe(true);
    expect(isExactlyOne(div(uTerm, divisor))).toBe(true);
  });

  it('a WRONG ω0 does not give 1 — the check can fail', () => {
    const omega0SqWrong = div(m, k);
    expect(isExactlyOne(div(mul(m, x0, omega0SqWrong), mul(k, x0)))).toBe(false);
  });
});

describe('W1a — spring and LC trajectories coincide under the map (numeric)', () => {
  const [mM, kK] = [2, 8];
  const [lL, cC] = [0.5, 0.25];
  const x0 = 0.37;
  const q0 = -1.9;

  const omegaSpring = Math.sqrt(kK / mM);
  const omegaLc = Math.sqrt(1 / (lL * cC));

  it('both equal cos τ, and each other, within 1e-8 at four τ', () => {
    expect(omegaSpring).toBe(2);
    expect(omegaLc).toBe(Math.sqrt(8));

    for (const tau of TAUS) {
      const uSpring = uAtTau(mM, 0, kK, x0, 0, x0, omegaSpring, tau);
      const uLc = uAtTau(lL, 0, 1 / cC, q0, 0, q0, omegaLc, tau);
      expect(Math.abs(uSpring - uLc)).toBeLessThan(1e-8);
      expect(Math.abs(uSpring - Math.cos(tau))).toBeLessThan(1e-8);
      expect(Math.abs(uLc - Math.cos(tau))).toBeLessThan(1e-8);
    }
  });
});

describe('W1b — the inverse map carries a solution of u″ + u = 0 to one of m x″ + k x = 0 (numeric)', () => {
  // The previous W1b checked x0·u/x0 = u, which no bridge claim can falsify. This one integrates the
  // DIMENSIONED spring on its own, from the inverse-mapped initial conditions, and compares.
  const [mM, kK] = [2, 8];
  const omega0 = Math.sqrt(kK / mM);
  const x0 = 0.37;
  const uPrime0 = 0.6;
  // u(τ) = cos τ + u′(0) sin τ solves u″ + u = 0 with u(0) = 1.
  const u = (tau: number): number => Math.cos(tau) + uPrime0 * Math.sin(tau);

  /** Worst |x_direct(t) − x0·u(w0 t)| over the sample τ, mapping with the frequency `w0`. */
  function mappedMinusDirect(w0: number): number {
    const xDot0 = x0 * w0 * uPrime0;
    let worst = 0;
    for (const tau of TAUS) {
      const t = tau / w0;
      const { y } = rk4((_t, yy) => [yy[1], (-kK * yy[0]) / mM], [x0 * u(0), xDot0], 0, t, Math.max(1000, Math.ceil(t * 4000)));
      worst = Math.max(worst, Math.abs(y[0] - x0 * u(w0 * t)));
    }
    return worst;
  }

  it('x = x0·u(ω0 t) with ω0 = √(k/m) solves the dimensioned spring within 1e-8', () => {
    expect(omega0).toBe(2);
    expect(mappedMinusDirect(omega0)).toBeLessThan(1e-8);
  });

  it('NEGATIVE CONTROL: the same map with a 1% wrong ω0 misses by more than 1e-3', () => {
    expect(mappedMinusDirect(1.01 * omega0)).toBeGreaterThan(1e-3);
  });
});

describe('W2 — ab-damped-rlc holds when the side condition is satisfied', () => {
  const [mM, kK, bB] = [1, 4, 1];
  const [lL, cC] = [2, 0.125];
  const x0 = 0.37;
  const q0 = -1.9;

  const zetaMech = bB / (2 * Math.sqrt(mM * kK));
  const sqrtCoverL = Math.sqrt(cC / lL);
  // The side condition ζ_RLC = ζ_mech, solved for R. R is DERIVED, never input.
  const R = (2 * zetaMech) / sqrtCoverL;

  it('derives R = 2 from the side condition', () => {
    expect(zetaMech).toBe(0.25);
    expect(sqrtCoverL).toBe(0.25);
    expect(R).toBe(2);
    expect((R / 2) * sqrtCoverL).toBe(zetaMech);
  });

  it('both nondimensionalize to u″ + 0.5 u′ + u = 0', () => {
    expect(Math.sqrt(kK / mM)).toBe(2);
    expect(Math.sqrt(1 / (lL * cC))).toBe(2);
    expect(2 * zetaMech).toBe(0.5);
    expect(R / lL / Math.sqrt(1 / (lL * cC))).toBe(0.5);
  });

  it('trajectories agree within 1e-8 at four τ', () => {
    const omega0 = 2;
    for (const tau of TAUS) {
      const uMech = uAtTau(mM, bB, kK, x0, 0, x0, omega0, tau);
      const uRlc = uAtTau(lL, R, 1 / cC, q0, 0, q0, omega0, tau);
      expect(Math.abs(uMech - uRlc)).toBeLessThan(1e-8);
    }
  });
});

describe('W2b — R = 4 breaks bridge 1 (counterexample)', () => {
  const [lL, cC] = [2, 0.125];
  const q0 = -1.9;
  const R = 4;

  it('gives ζ_RLC = 0.5 ≠ 0.25 and separates by more than 1e-2 at τ = π', () => {
    const zetaRlc = (R / 2) * Math.sqrt(cC / lL);
    expect(zetaRlc).toBe(0.5);
    expect(zetaRlc).not.toBe(0.25);

    const omega0 = 2;
    const tau = Math.PI;
    const uMech = uAtTau(1, 1, 4, 0.37, 0, 0.37, omega0, tau); // ζ = 0.25
    const uRlc = uAtTau(lL, R, 1 / cC, q0, 0, q0, omega0, tau);
    expect(Math.abs(uMech - uRlc)).toBeGreaterThan(1e-2);
  });
});

describe('bridge records', () => {
  it('ab-spring-lc carries only witness-backed evidence, all from this file', () => {
    expect(BRIDGE_SPRING_LC.id).toBe('ab-spring-lc');
    expect(BRIDGE_SPRING_LC.relation).toBe('exact-equivalence');
    expect(BRIDGE_SPRING_LC.premises).toEqual(['model-spring']);
    expect(BRIDGE_SPRING_LC.conclusion).toBe('model-lc');
    expect(BRIDGE_SPRING_LC.inverse).toBe('x = x0 u, t = τ/ω0');
    // No tag is STORED: every tag is derived from data/atlas/witness-results.json
    // (W1s for `symbolically-checked`); tests/atlas/witness-results.test.ts and
    // tests/atlas/atlas-json.test.ts pin the derivation.
    expect(Object.hasOwn(BRIDGE_SPRING_LC, 'evidence')).toBe(false);
    expect(BRIDGE_SPRING_LC.witnesses.map((w) => w.id)).toEqual(['W1', 'W1a', 'W1b', 'W2b', 'W1s']);
    for (const w of BRIDGE_SPRING_LC.witnesses) {
      expect(w.test).toBe(w.id === 'W1s' ? 'tests/atlas/witness-results.test.ts' : TEST_PATH);
    }
    expect(BRIDGE_SPRING_LC.counterexamples).toHaveLength(1);
    expect(BRIDGE_SPRING_LC.counterexamples[0].witness).toBe('W2b');
  });

  it('ab-damped-rlc states the side condition and carries W2', () => {
    expect(BRIDGE_DAMPED_RLC.id).toBe('ab-damped-rlc');
    expect(BRIDGE_DAMPED_RLC.relation).toBe('exact-equivalence');
    expect(BRIDGE_DAMPED_RLC.premises).toEqual(['model-damped-spring']);
    expect(BRIDGE_DAMPED_RLC.conclusion).toBe('model-rlc');
    expect(BRIDGE_DAMPED_RLC.sideConditions[0]).toContain('b/√(mk) = R√(C/L)');
    expect(Object.hasOwn(BRIDGE_DAMPED_RLC, 'evidence')).toBe(false);
    expect(BRIDGE_DAMPED_RLC.witnesses.map((w) => w.id)).toEqual(['W2', 'W2s']);
    for (const w of BRIDGE_DAMPED_RLC.witnesses) {
      expect(w.test).toBe(w.id === 'W2s' ? 'tests/atlas/witness-results.test.ts' : TEST_PATH);
    }
    // The counterexample belongs to bridge 1, not here.
    expect(BRIDGE_DAMPED_RLC.counterexamples).toEqual([]);
  });

  it('both regimes derive their groups and state no inequality', () => {
    for (const bridge of [BRIDGE_SPRING_LC, BRIDGE_DAMPED_RLC]) {
      expect(bridge.regime.family).toBe('oscillators');
      expect(bridge.regime.inequalities).toEqual([]);
      expect(typeof bridge.regime.groupDefinitions).toBe('object');
    }
  });
});
