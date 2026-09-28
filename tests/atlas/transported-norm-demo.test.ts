/**
 * Worked demonstration for audit item I2 / finding F05: does an approximation
 * bound survive an exact map, and in which norms?
 *
 * The measurements the decision rests on. The rule, and the declaration it
 * needs, are `docs/planning/ADR-transported-norm-composition.md`; this file was
 * written before the rule was wired, and §3 now pins that the route composes
 * THROUGH the declaration and only through it. The declaration's own witness
 * (W1τ) and its control are in `tests/atlas/spring-lc-norm-transport.test.ts`.
 *
 * The route is pendulum → spring (`ab-pendulum-linear`, approximation, bound
 * in the RELATIVE PERIOD norm) → LC (`ab-spring-lc`, exact). The spring→LC map
 * as the bridge records it is `q(t) = (q0/x0)·x(ω_LC t / ω_s)`: an amplitude
 * scale and a UNIFORM time scale. Every quantity below is integrated, never
 * computed from the map algebraically:
 *
 * - the pendulum `θ'' = −(g/ℓ) sin θ` in mechanical time;
 * - the spring `x'' = −(k/m) x` and the circuit `q'' = −q/(LC)`;
 * - the pendulum's IMAGE under the map, integrated as its own ODE in circuit
 *   time, `Q'' = −ω_LC² (q0/θ0) sin(θ0 Q/q0)` — the pendulum written in the
 *   circuit's coordinates, not the pendulum's period multiplied by a factor.
 *
 * Findings the proposal rests on:
 *
 * 1. The relative period error of the image against the LC circuit EQUALS the
 *    pendulum→spring relative period error, and both equal the closed-form
 *    `pendulumPeriodErrorAt` (an independent method). The map is an isometry
 *    of that norm (Lipschitz constant 1), so the bound transports unchanged.
 * 2. The SAME map is not an isometry of the absolute period error (factor
 *    `ω_s/ω_LC`) or of the absolute trajectory error (factor `q0/x0`, and the
 *    unit changes from metres to coulombs). Transporting either bound
 *    naively — as `IDENTITY_BOUND` does — is wrong; transporting it with the
 *    declared factor is right. That is why the rule needs the exact map to
 *    declare how it acts on each norm, and why "exact" alone is not enough.
 * 3. A wrong dictionary (`k ↔ C` instead of `k ↔ 1/C`) breaks the equality in
 *    finding 1, so that check can fail.
 *
 * @module tests/atlas/transported-norm-demo
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { composeRelation, NO_COMPOSITE_CLAIM } from '../../src/atlas/composition-table.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { BRIDGE_SPRING_LC } from '../../src/atlas/oscillators/bridges-exact.js';
import {
  AB_PENDULUM_LINEAR,
  pendulumPeriodErrorAt,
} from '../../src/atlas/oscillators/bridges-limits.js';
import { boundPath, findPath } from '../../src/atlas/path-bound.js';
import type { AtlasBridge } from '../../src/atlas/types.js';
import { rk4 } from './_ode.js';
import type { Derivative } from './_ode.js';

// ── Fixture ─────────────────────────────────────────────────────────────────
// ω_s = √(k/m) = √(g/ℓ) = 2; ω_LC = 1/√(LC) = 2√2 — the dimensioned
// frequencies DIFFER, as in the bridge's own witness fixture, so the time map
// is not the identity and a norm that is not time-scale invariant shows it.
const G = 9.81;
const ELL = G / 4;
const M = 1;
const K_SPRING = 4;
const L_IND = 1;
const C_CAP = 0.125;
const Q0 = 1e-3;

const OMEGA_S = Math.sqrt(K_SPRING / M);
const OMEGA_LC = 1 / Math.sqrt(L_IND * C_CAP);

const STEPS_PER_PERIOD = 20_000;

// ── Integrated systems ──────────────────────────────────────────────────────

const pendulum: Derivative = (_t, [th, w]) => [w!, -(G / ELL) * Math.sin(th!)];
const harmonic =
  (omega2: number): Derivative =>
  (_t, [x, v]) => [v!, -omega2 * x!];
/** The pendulum pushed through `q(t) = (q0/x0)·x(ω_LC t/ω_s)`, as its own ODE. */
const pendulumImage =
  (theta0: number, omegaLC: number): Derivative =>
  (_t, [q, i]) => [i!, -(omegaLC ** 2) * (Q0 / theta0) * Math.sin((theta0 * q!) / Q0)];

/**
 * First time `y[0]` falls through zero, by cubic Hermite interpolation of the
 * bracketing step (values and derivatives at both ends), refined by Newton.
 * Released from rest at a positive amplitude, that time is a quarter period.
 */
function firstDownCrossing(f: Derivative, y0: readonly number[], tEnd: number, steps: number): number {
  const { samples } = rk4(f, y0, 0, tEnd, steps);
  for (let n = 1; n < samples.length; n++) {
    const a = samples[n - 1]!;
    const b = samples[n]!;
    if (a.y[0]! > 0 && b.y[0]! <= 0) {
      const h = b.t - a.t;
      const [p0, m0, p1, m1] = [a.y[0]!, a.y[1]! * h, b.y[0]!, b.y[1]! * h];
      const p = (s: number): number =>
        (2 * s ** 3 - 3 * s ** 2 + 1) * p0 +
        (s ** 3 - 2 * s ** 2 + s) * m0 +
        (-2 * s ** 3 + 3 * s ** 2) * p1 +
        (s ** 3 - s ** 2) * m1;
      const dp = (s: number): number =>
        (6 * s ** 2 - 6 * s) * p0 +
        (3 * s ** 2 - 4 * s + 1) * m0 +
        (-6 * s ** 2 + 6 * s) * p1 +
        (3 * s ** 2 - 2 * s) * m1;
      let s = p0 / (p0 - p1);
      for (let k = 0; k < 8; k++) s -= p(s) / dp(s);
      return a.t + s * h;
    }
  }
  throw new RangeError('no downward zero crossing before tEnd');
}

/** Period of a system released from rest at `amp0 > 0`, from its first quarter. */
function period(f: Derivative, amp0: number, tGuess: number): number {
  return 4 * firstDownCrossing(f, [amp0, 0], 0.4 * tGuess, Math.round(0.4 * STEPS_PER_PERIOD));
}

/** `sup_t |a(t) − b(t)|` over `[0, T]`, both integrated on the same step grid. */
function supTrajectoryError(fa: Derivative, fb: Derivative, amp0: number, T: number): number {
  const a = rk4(fa, [amp0, 0], 0, T, STEPS_PER_PERIOD).samples;
  const b = rk4(fb, [amp0, 0], 0, T, STEPS_PER_PERIOD).samples;
  let sup = 0;
  for (let n = 0; n < a.length; n++) sup = Math.max(sup, Math.abs(a[n]!.y[0]! - b[n]!.y[0]!));
  return sup;
}

/** The measured route pendulum → spring → LC at amplitude `theta0`, for circuit (L, C). */
function measureRoute(theta0: number, L: number, C: number) {
  const omegaLC = 1 / Math.sqrt(L * C);
  const Ts0 = (2 * Math.PI) / OMEGA_S;
  const Tlc0 = (2 * Math.PI) / omegaLC;
  const Tp = period(pendulum, theta0, Ts0);
  const Ts = period(harmonic(K_SPRING / M), ELL * theta0, Ts0);
  const Timg = period(pendulumImage(theta0, omegaLC), Q0, Tlc0);
  const Tlc = period(harmonic(1 / (L * C)), Q0, Tlc0);
  return { omegaLC, Tp, Ts, Timg, Tlc };
}

// ── 1. The isometric norm ───────────────────────────────────────────────────

describe('transported norm — relative period error is carried unchanged by ab-spring-lc', () => {
  it('the bridges under test are the ones the route uses, in the stated norm', () => {
    expect(AB_PENDULUM_LINEAR.relation).toBe('approximation');
    expect(AB_PENDULUM_LINEAR.bound!.norm).toBe(
      'relative period error, normalized by the value of the reduced model',
    );
    expect(AB_PENDULUM_LINEAR.bound!.K).toBe(1);
    expect(BRIDGE_SPRING_LC.relation).toBe('exact-equivalence');
    expect(BRIDGE_SPRING_LC.bound).toBeUndefined();
    expect(OMEGA_LC / OMEGA_S).toBeCloseTo(Math.SQRT2, 14);
  });

  for (const theta0 of [0.2, 0.5]) {
    it(`θ0 = ${theta0}: pendulum-vs-LC relative period error equals pendulum-vs-spring`, () => {
      const { Tp, Ts, Timg, Tlc } = measureRoute(theta0, L_IND, C_CAP);
      const direct = Tp / Ts - 1;
      const transported = Timg / Tlc - 1;

      // Independent method: the closed-form elliptic error the bridge records.
      expect(Math.abs(direct - pendulumPeriodErrorAt({ theta0 }))).toBeLessThan(1e-10);
      expect(Math.abs(transported - direct)).toBeLessThan(1e-10);
      // Transported bound (K_map = 1, so (1·K_A, 1·δ_A)) holds for the composite.
      expect(transported).toBeLessThanOrEqual(AB_PENDULUM_LINEAR.bound!.delta + 1e-10);
      // Not vacuous: the error is the O(θ0²/16) quantity, not zero.
      expect(transported).toBeGreaterThan(theta0 ** 2 / 16);
    });
  }

  it('literal dictionary (L = m, C = 1/k, same time variable): LC period IS the spring period', () => {
    const theta0 = 0.5;
    const { Ts, Timg, Tlc, Tp } = measureRoute(theta0, M, 1 / K_SPRING);
    expect(Math.abs(Tlc / Ts - 1)).toBeLessThan(1e-12);
    expect(Math.abs(Timg / Tp - 1)).toBeLessThan(1e-12);
    expect(Math.abs(Timg / Tlc - 1 - pendulumPeriodErrorAt({ theta0 }))).toBeLessThan(1e-10);
  });

  it('control: a WRONG dictionary (k ↔ C, not 1/C) breaks the equality the check asserts', () => {
    const theta0 = 0.5;
    // The wrong map claims the circuit L = m, C = k corresponds to the spring
    // with the same time variable, so the image keeps the spring's ω_s.
    const Tp = period(pendulum, theta0, (2 * Math.PI) / OMEGA_S);
    const wrongLC = 1 / Math.sqrt(M * K_SPRING);
    const Twrong = period(harmonic(wrongLC ** 2), Q0, (2 * Math.PI) / wrongLC);
    const transported = Tp / Twrong - 1;
    expect(Math.abs(transported - pendulumPeriodErrorAt({ theta0 }))).toBeGreaterThan(0.5);
  });
});

// ── 2. Norms the same map does NOT preserve ─────────────────────────────────

describe('transported norm — naive transport is wrong where the map is not an isometry', () => {
  const theta0 = 0.5;
  const x0 = ELL * theta0;

  it('absolute period error scales by ω_s/ω_LC: IDENTITY transport fails, the declared factor holds', () => {
    const { Tp, Ts, Timg, Tlc } = measureRoute(theta0, L_IND, C_CAP);
    const mech = Math.abs(Tp - Ts);
    const circ = Math.abs(Timg - Tlc);
    const declaredK = OMEGA_S / OMEGA_LC;

    expect(Math.abs(circ / mech - 1)).toBeGreaterThan(0.25);
    expect(Math.abs(circ / (declaredK * mech) - 1)).toBeLessThan(1e-8);
  });

  it('absolute trajectory error scales by q0/x0 (metres → coulombs): IDENTITY transport fails', () => {
    const Ts0 = (2 * Math.PI) / OMEGA_S;
    const Tlc0 = (2 * Math.PI) / OMEGA_LC;
    const pendX: Derivative = (t, [x, v]) => {
      const [dth, dw] = pendulum(t, [x! / ELL, v! / ELL]);
      return [dth! * ELL, dw! * ELL];
    };
    const mech = supTrajectoryError(pendX, harmonic(OMEGA_S ** 2), x0, Ts0);
    const circ = supTrajectoryError(pendulumImage(theta0, OMEGA_LC), harmonic(OMEGA_LC ** 2), Q0, Tlc0);
    const declaredK = Q0 / x0;

    expect(mech).toBeGreaterThan(1e-2);
    expect(Math.abs(circ / mech - 1)).toBeGreaterThan(0.9);
    expect(Math.abs(circ / (declaredK * mech) - 1)).toBeLessThan(1e-8);

    // The amplitude-normalised trajectory norm IS preserved: it is the norm,
    // not the map, that decides whether transport is free.
    expect(Math.abs(circ / Q0 - mech / x0)).toBeLessThan(1e-10);
  });

  it('phase error is preserved only when the horizon is transported with the time map', () => {
    // Phase drift after one reduced period, measured as angle 2π(T_red/T − 1)
    // is time-scale invariant; a horizon stated in seconds is not, and must
    // be carried through t ↦ t·ω_s/ω_LC.
    const { Tp, Ts, Timg, Tlc } = measureRoute(theta0, L_IND, C_CAP);
    const phaseMech = 2 * Math.PI * (Ts / Tp - 1);
    const phaseCirc = 2 * Math.PI * (Tlc / Timg - 1);
    expect(Math.abs(phaseCirc - phaseMech)).toBeLessThan(1e-9);

    const horizonMech = (4 * Ts) / theta0 ** 2;
    const horizonCirc = (4 * Tlc) / theta0 ** 2;
    expect(Math.abs(horizonCirc / horizonMech - 1)).toBeGreaterThan(0.25);
    expect(Math.abs(horizonCirc / (horizonMech * (OMEGA_S / OMEGA_LC)) - 1)).toBeLessThan(1e-9);
  });
});

// ── 3. The boundary: wired through the declaration, and only through it ────

describe('transported norm — the route composes through the declaration (ADR)', () => {
  it('composeRelation(approximation, exact-equivalence) is approximation; the reverse order stays silent', () => {
    expect(composeRelation('approximation', 'exact-equivalence')).toBe('approximation');
    expect(composeRelation('exact-equivalence', 'approximation')).toBe(NO_COMPOSITE_CLAIM);
  });

  it('boundPath on pendulum → LC is the measured finding 1: (1·K_A, 1·δ_A) in the relative period norm', () => {
    const route = findPath('oscillators', 'model-pendulum', 'model-lc');
    expect(route?.map((b) => b.id)).toEqual(['ab-pendulum-linear', 'ab-spring-lc']);
    const result = boundPath(route!);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error(result.detail);
    expect(result.norm).toBe(AB_PENDULUM_LINEAR.bound!.norm);
    expect(result.bound).toEqual({ K: AB_PENDULUM_LINEAR.bound!.K, delta: AB_PENDULUM_LINEAR.bound!.delta });
    // The measured route error at the regime edge sits under the composed bound.
    const { Timg, Tlc } = measureRoute(0.5, L_IND, C_CAP);
    expect(Timg / Tlc - 1).toBeLessThanOrEqual(result.bound.delta + 1e-10);
  });

  it('without the declaration the same route is refused: exact alone is not enough (finding 2)', () => {
    const bare: AtlasBridge = { ...BRIDGE_SPRING_LC, normTransports: undefined };
    const result = boundPath([AB_PENDULUM_LINEAR, bare]);
    expect(result.kind).toBe('no-claim');
    expect(result.kind === 'no-claim' && result.reason).toBe('norm-not-stated');
  });
});

// ── 4. Which exact maps the rule would need declarations on, from the data ──

interface Adjacency {
  readonly order: 'approximation-then-exact' | 'exact-then-approximation';
  readonly approximation: string;
  readonly exact: string;
  readonly norm: string;
}

type BridgeLike = Pick<AtlasBridge, 'id' | 'relation' | 'premises' | 'conclusion'> & {
  readonly bound?: { readonly norm: string };
};

/** Every chain an approximation and an exact equivalence can form, either order. */
function adjacencies(bridges: readonly BridgeLike[]): Adjacency[] {
  const out: Adjacency[] = [];
  const exacts = bridges.filter((b) => b.relation === 'exact-equivalence');
  for (const a of bridges.filter((b) => b.relation === 'approximation' && b.premises.length === 1)) {
    for (const e of exacts) {
      const ends = [e.premises[0], e.conclusion];
      const base = { approximation: a.id, exact: e.id, norm: a.bound!.norm };
      if (ends.includes(a.conclusion)) out.push({ order: 'approximation-then-exact', ...base });
      if (ends.includes(a.premises[0]!)) out.push({ order: 'exact-then-approximation', ...base });
    }
  }
  return out.sort((x, y) => `${x.exact}${x.approximation}`.localeCompare(`${y.exact}${y.approximation}`));
}

describe('transported norm — bridges whose exact maps would need a declaration', () => {
  const fromSource = adjacencies(ATLAS_FAMILIES.flatMap((f) => f.bridges));
  const here = dirname(fileURLToPath(import.meta.url));
  const json = JSON.parse(readFileSync(resolve(here, '../../data/atlas/atlas.json'), 'utf-8')) as {
    families: { bridges: BridgeLike[] }[];
  };
  const fromJson = adjacencies(json.families.flatMap((f) => f.bridges));

  it('the source registry and the emitted atlas.json agree on every adjacency', () => {
    expect(fromSource.length).toBeGreaterThan(0);
    expect(fromJson).toEqual(fromSource);
  });

  it('includes the F05 route and the two other exact maps next to an approximation', () => {
    expect(fromSource).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          order: 'approximation-then-exact',
          approximation: 'ab-pendulum-linear',
          exact: 'ab-spring-lc',
        }),
        expect.objectContaining({
          order: 'approximation-then-exact',
          approximation: 'ab-telegraph-diffusion',
          exact: 'ab-heat-diffusion',
        }),
        expect.objectContaining({
          order: 'exact-then-approximation',
          approximation: 'ab-damped-massless',
          exact: 'ab-damped-rlc',
        }),
      ]),
    );
  });
});
