/**
 * Every atlas approximation bridge keeps its declared bound.
 *
 * Per-bridge checks exist (`bound-machine-form.test.ts` for the pendulum and the damped spring,
 * `waves.test.ts` for the wave bridges). No test looped over the whole registry, so a new
 * approximation bridge could freeze a `delta` that under-bounds its own error function and
 * nothing failed. `admitApproximation` checks that a horizon and a `deltaAt` exist. It cannot
 * check that `delta` is a true supremum.
 *
 * What this file checks, for every bridge the real registry holds with relation `approximation`:
 *
 *  1. `bound.norm` is not empty and not whitespace (the compiler requires the field, not text).
 *  2. `deltaAt` exists (a bridge without it would have to be listed, with a reason, in
 *     `DELTA_AT_EXEMPT`; the list is empty because admission already requires it).
 *  3. `deltaAt(p) <= delta` at every sampled point of the declared regime, the edge approached
 *     from inside included.
 *  4. Where `deltaAtBasis` is `'closed-form'`, `delta` EQUALS `deltaAt` at the regime edge to 1e-12
 *     relative: a loose scalar is not a supremum.
 *
 * The domain of each bridge is stated by a sampler in `DOMAINS`, because a regime is a set of
 * dimensionless-group inequalities and a bound can need parameters the regime does not name.
 * Every sample is also checked against the bridge's own `regime` (so a sampler cannot drift
 * outside the declared domain), and a bridge with no sampler fails the census test.
 */
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { regimeHolds } from '../../src/atlas/regime.js';
import type { AtlasBridge } from '../../src/atlas/types.js';

type Params = Readonly<Record<string, number>>;

/**
 * `at(s)` maps `s` in (0, 1] to a parameter point of the declared domain. `s = 1` is the edge
 * that carries the supremum. An open edge is approached from inside at `s = EDGE_S`.
 */
interface Domain {
  readonly at: (s: number) => Params;
}

/** Closest approach to an open edge. */
const EDGE_S = 1 - 1e-9;

/** Sampled `s` values: a log ladder toward 0, a linear ladder, and the approach to the edge. */
const S_GRID: readonly number[] = [
  1e-6, 1e-4, 1e-3, 1e-2, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999999, EDGE_S,
];

/** Bridges whose `bound` carries no `deltaAt`, with the reason. Empty: admission requires it. */
const DELTA_AT_EXEMPT: Readonly<Record<string, string>> = {};

const DOMAINS: Readonly<Record<string, Domain>> = {
  // θ0 ≤ 0.5 rad.
  'ab-pendulum-linear': { at: (s) => ({ theta0: 0.5 * s, T0: 1 }) },
  // m k / b² < 1/4 and |v0| ≤ 5, at the b = k = x0 = 1 normalisation `deltaAt` admits.
  'ab-damped-massless': { at: (s) => ({ m: 0.25 * s, b: 1, k: 1, x0: 1, v0: 5 * s }) },
  // ε = τ D q² ≤ 0.05.
  'ab-telegraph-diffusion': { at: (s) => ({ tau: 0.05 * s, D: 1, q: 1 }) },
  // ε = τ D q² ≥ 25; the supremum is at the lower edge, so s → 0 means ε → ∞.
  'ab-telegraph-wave': { at: (s) => ({ tau: 25 / s, D: 1, q: 1, c: 1 }) },
  // ω₀/(c k) ≤ 0.1.
  'ab-klein-gordon-wave': { at: (s) => ({ omega0: 0.1 * s, c: 1, k: 1 }) },
  // c k/ω₀ ≤ 0.1.
  'ab-kg-schrodinger': { at: (s) => ({ c: 1, k: 0.1 * s, omega0: 1, hbar: 1, m: 1 }) },
  // β = EI k²/F ≤ 0.01.
  'ab-stiff-string': { at: (s) => ({ F: 1, EI: 0.01 * s, k: 1, mu: 1 }) },
};

/** Every bridge of the real registry whose relation is `approximation`. */
const APPROXIMATIONS: readonly AtlasBridge[] = ATLAS_FAMILIES.flatMap((family) =>
  family.bridges.filter((b) => b.relation === 'approximation'),
);

/** Value of a regime group at a parameter point: the product of each variable to its exponent. */
function groupValue(bridge: AtlasBridge, group: string, p: Params): number {
  const def = bridge.regime?.groupDefinitions[group];
  if (def === undefined) return Number.NaN;
  let v = 1;
  for (const [name, e] of Object.entries(def.exponents)) {
    if (e === 0) continue;
    const x = p[name];
    if (x === undefined) return Number.NaN;
    v *= x ** e;
  }
  return v;
}

/** Whether the bridge's own regime accepts the parameter point. */
function inRegime(bridge: AtlasBridge, p: Params): boolean {
  const regime = bridge.regime;
  if (regime === undefined) return false;
  const values: Record<string, number> = {};
  for (const ineq of regime.inequalities) values[ineq.group] = groupValue(bridge, ineq.group, p);
  return regimeHolds(regime, values).ok === true;
}

/**
 * The checking function. Returns every violation of the four properties for one bridge on one
 * domain. An empty array means the bound holds.
 */
function boundViolations(bridge: AtlasBridge, domain: Domain): string[] {
  const out: string[] = [];
  const bound = bridge.bound;
  if (bound === undefined) return [`${bridge.id}: no bound`];
  if (bound.norm.trim() === '') out.push(`${bridge.id}: norm is empty`);
  const deltaAt = bound.deltaAt;
  if (deltaAt === undefined) {
    if (DELTA_AT_EXEMPT[bridge.id] === undefined) out.push(`${bridge.id}: no deltaAt and not exempt`);
    return out;
  }
  for (const s of S_GRID) {
    const p = domain.at(s);
    if (!inRegime(bridge, p)) out.push(`${bridge.id}: sample s=${s} is outside the declared regime`);
    const v = deltaAt(p);
    if (!Number.isFinite(v) || v > bound.delta * (1 + 1e-12)) {
      out.push(`${bridge.id}: deltaAt(s=${s}) = ${v} exceeds delta = ${bound.delta}`);
    }
  }
  if (bound.deltaAtBasis === 'closed-form') {
    const edge = deltaAt(domain.at(1));
    if (!(Math.abs(edge - bound.delta) <= 1e-12 * Math.abs(bound.delta))) {
      out.push(`${bridge.id}: closed-form delta ${bound.delta} is not the edge value ${edge}`);
    }
  }
  return out;
}

/** A copy of the bridge with its bound changed. */
function withBound(bridge: AtlasBridge, change: Record<string, unknown>): AtlasBridge {
  return { ...bridge, bound: { ...bridge.bound!, ...change } };
}

describe('approximation bridge census', () => {
  it('enumerates the approximation bridges of the real registry', () => {
    const ids = APPROXIMATIONS.map((b) => b.id).sort();
    // eslint-disable-next-line no-console
    console.log(`approximation bridges (${ids.length}): ${ids.join(', ')}`);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every approximation bridge has a domain sampler, and no sampler is orphaned', () => {
    const ids = APPROXIMATIONS.map((b) => b.id).sort();
    expect(Object.keys(DOMAINS).sort()).toEqual(ids);
  });

  it('every approximation bridge has deltaAt, or an exemption that names a reason', () => {
    for (const b of APPROXIMATIONS) {
      if (b.bound?.deltaAt === undefined) {
        expect(DELTA_AT_EXEMPT[b.id], `${b.id} has no deltaAt and no exemption`).toBeTruthy();
      }
    }
    // An exemption for a bridge that does have deltaAt, or no longer exists, is stale.
    for (const id of Object.keys(DELTA_AT_EXEMPT)) {
      const b = APPROXIMATIONS.find((x) => x.id === id);
      expect(b?.bound?.deltaAt, `stale exemption ${id}`).toBeUndefined();
    }
  });
});

describe('every approximation bridge keeps its declared bound', () => {
  for (const bridge of APPROXIMATIONS) {
    it(`${bridge.id}: norm text, deltaAt <= delta over the regime, closed-form delta is the edge`, () => {
      expect(boundViolations(bridge, DOMAINS[bridge.id]!)).toEqual([]);
    });
  }
});

describe('NEGATIVE CONTROLS: the checking function rejects a planted defect', () => {
  const pendulum = APPROXIMATIONS.find((b) => b.id === 'ab-pendulum-linear')!;
  const domain = DOMAINS['ab-pendulum-linear']!;

  it('accepts the real pendulum bridge (the controls are copies of a passing bridge)', () => {
    expect(boundViolations(pendulum, domain)).toEqual([]);
  });

  it('rejects a delta frozen at an interior point (under-bounds at the edge)', () => {
    const frozen = pendulum.bound!.deltaAt!(domain.at(0.4));
    expect(frozen).toBeLessThan(pendulum.bound!.delta);
    const v = boundViolations(withBound(pendulum, { delta: frozen }), domain);
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((m) => m.includes('exceeds delta'))).toBe(true);
  });

  it('rejects a closed-form delta that is looser than the edge value', () => {
    const v = boundViolations(withBound(pendulum, { delta: pendulum.bound!.delta * 2 }), domain);
    expect(v.some((m) => m.includes('is not the edge value'))).toBe(true);
  });

  it('rejects an empty norm and a whitespace norm', () => {
    for (const norm of ['', '   \t']) {
      const v = boundViolations(withBound(pendulum, { norm }), domain);
      expect(v).toEqual([`ab-pendulum-linear: norm is empty`]);
    }
  });

  it('rejects an approximation whose deltaAt is dropped and which is not exempt', () => {
    const v = boundViolations(withBound(pendulum, { deltaAt: undefined }), domain);
    expect(v.some((m) => m.includes('no deltaAt and not exempt'))).toBe(true);
  });

  it('rejects a sampler that leaves the declared regime', () => {
    const outside: Domain = { at: (s) => ({ theta0: 5 * s, T0: 1 }) };
    const v = boundViolations(pendulum, outside);
    expect(v.some((m) => m.includes('outside the declared regime'))).toBe(true);
  });

  it('rejects a numerically-supported bridge whose delta under-bounds, with no equality needed', () => {
    const damped = APPROXIMATIONS.find((b) => b.id === 'ab-damped-massless')!;
    expect(damped.bound!.deltaAtBasis).toBe('numerically-supported');
    const v = boundViolations(withBound(damped, { delta: 0.012 }), DOMAINS['ab-damped-massless']!);
    expect(v.some((m) => m.includes('exceeds delta'))).toBe(true);
  });
});
