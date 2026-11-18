/**
 * Regime groups of the waves and diffusion bridges carry no derived identity.
 *
 * A derived quantity that a regime lists beside the parameters it is derived
 * from (c = √(F/μ), D = k_BT/γ, ...) yields a Buckingham group, or a product of
 * groups, that is one constant at every physical point. Such a group is a
 * definition, not a regime condition. Each case samples the free parameters,
 * computes every derived quantity from them, and requires the regime groups to
 * be independent: the centred log-values of the groups have full rank.
 */
import { describe, expect, it } from 'vitest';

import { ENERGY, FORCE, LENGTH, MASS, TIME, VELOCITY } from '../../src/dimensional/types.js';
import { DAMPING } from '../../src/atlas/oscillators/dimensions.js';
import { BRIDGE_HEAT_DIFFUSION, BRIDGE_SCHRODINGER_DIFFUSION } from '../../src/atlas/diffusion/bridges.js';
import {
  BRIDGE_LANGEVIN_DIFFUSION,
  BRIDGE_STOKES_EINSTEIN,
  BRIDGE_TELEGRAPH_WAVE,
} from '../../src/atlas/diffusion/bridges-closure.js';
import { VISCOSITY } from '../../src/atlas/diffusion/models.js';
import { makeRegime } from '../../src/atlas/regime.js';
import type { AtlasBridge, Regime } from '../../src/atlas/types.js';
import { BRIDGE_STRING_WAVE } from '../../src/atlas/waves/bridges.js';
import { BRIDGE_KG_OSCILLATOR, BRIDGE_KG_SCHRODINGER } from '../../src/atlas/waves/bridges-closure.js';
import { LINEAR_DENSITY } from '../../src/atlas/waves/models.js';

/** Seeded generator (mulberry32), so a failure reproduces. */
const seeded = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Point = Record<string, number>;

/** `n` points from `make`, each free value drawn in [0.1, 10.1). */
const sample = (seed: number, make: (u: () => number) => Point, n = 40): Point[] => {
  const rand = seeded(seed);
  const u = (): number => 0.1 + 10 * rand();
  return Array.from({ length: n }, () => make(u));
};

/** The value of one group at one point. */
const groupValue = (exponents: Readonly<Record<string, number>>, p: Point): number =>
  Object.entries(exponents).reduce((acc, [v, e]) => (e === 0 ? acc : acc * p[v] ** e), 1);

/** The groups that take one constant over the samples, with that constant. */
const constantGroups = (regime: Regime, samples: Point[]): { name: string; value: number }[] => {
  const out: { name: string; value: number }[] = [];
  for (const [name, group] of Object.entries(regime.groupDefinitions)) {
    const logs = samples.map((p) => Math.log(groupValue(group.exponents, p)));
    const mean = logs.reduce((x, y) => x + y, 0) / logs.length;
    const variance = logs.reduce((x, y) => x + (y - mean) ** 2, 0) / logs.length;
    if (variance < 1e-18) out.push({ name, value: Math.exp(mean) });
  }
  return out;
};

/**
 * The number of independent constant products of the groups: the group count
 * minus the rank of the centred log-value matrix (samples × groups).
 */
const constantProducts = (regime: Regime, samples: Point[]): number => {
  const groups = Object.values(regime.groupDefinitions);
  const columns = groups.map((g) => {
    const logs = samples.map((p) => Math.log(groupValue(g.exponents, p)));
    const mean = logs.reduce((x, y) => x + y, 0) / logs.length;
    return logs.map((x) => x - mean);
  });
  // Gram–Schmidt rank with a relative tolerance.
  const basis: number[][] = [];
  for (const col of columns) {
    const v = [...col];
    const scale = Math.sqrt(col.reduce((x, y) => x + y * y, 0));
    for (const b of basis) {
      const dot = v.reduce((x, y, i) => x + y * b[i], 0);
      for (let i = 0; i < v.length; i++) v[i] -= dot * b[i];
    }
    const norm = Math.sqrt(v.reduce((x, y) => x + y * y, 0));
    if (norm > 1e-9 * Math.max(scale, 1)) basis.push(v.map((x) => x / norm));
  }
  return groups.length - basis.length;
};

/** Each bridge with physical samples: free parameters drawn, derived ones computed. */
const CASES: { bridge: AtlasBridge; samples: Point[] }[] = [
  {
    bridge: BRIDGE_STRING_WAVE,
    samples: sample(1, (u) => {
      const F = u(), mu = u();
      return { F, mu, c: Math.sqrt(F / mu) };
    }),
  },
  {
    bridge: BRIDGE_TELEGRAPH_WAVE,
    samples: sample(2, (u) => {
      const tau = u(), D = u(), q = u();
      return { tau, D, q, c: Math.sqrt(D / tau) };
    }),
  },
  {
    bridge: BRIDGE_KG_OSCILLATOR,
    samples: sample(3, (u) => {
      const omega0 = u(), m = u();
      return { omega0, m, k: m * omega0 ** 2 };
    }),
  },
  {
    bridge: BRIDGE_HEAT_DIFFUSION,
    samples: sample(4, (u) => {
      const kappa = u(), rho = u(), cp = u(), ell = u(), t = u();
      return { kappa, rho, cp, ell, t, D: kappa / (rho * cp) };
    }),
  },
  {
    bridge: BRIDGE_SCHRODINGER_DIFFUSION,
    samples: sample(5, (u) => {
      const hbar = u(), m = u();
      return { hbar, m, D: hbar / (2 * m) };
    }),
  },
  {
    bridge: BRIDGE_LANGEVIN_DIFFUSION,
    samples: sample(6, (u) => {
      const m = u(), gamma = u(), kT = u(), t = u();
      return { m, gamma, kT, t, D: kT / gamma };
    }),
  },
  {
    bridge: BRIDGE_STOKES_EINSTEIN,
    samples: sample(7, (u) => {
      const m = u(), t = u(), kT = u(), eta = u(), a = u(), Re = u();
      const gamma = 6 * Math.PI * eta * a;
      return { m, t, kT, eta, a, Re, gamma, D: kT / gamma };
    }),
  },
  {
    bridge: BRIDGE_KG_SCHRODINGER,
    samples: sample(8, (u) => {
      // ħ/m = c²/ω₀ is the identification the bridge makes.
      const c = u(), omega0 = u(), k = u(), hbar = u();
      return { c, omega0, k, hbar, m: (hbar * omega0) / c ** 2 };
    }),
  },
];

describe('waves and diffusion regimes: no derived identity among the groups', () => {
  for (const { bridge, samples } of CASES) {
    it(`${bridge.id}: no group and no product of groups is constant`, () => {
      expect(constantGroups(bridge.regime, samples)).toEqual([]);
      expect(constantProducts(bridge.regime, samples)).toBe(0);
    });
  }

  // The pre-fix ab-string-wave regime, with c listed beside F and μ.
  const stringWithC = makeRegime(
    'waves',
    [
      { name: 'F', dim: FORCE },
      { name: 'mu', dim: LINEAR_DENSITY },
      { name: 'c', dim: VELOCITY },
    ],
    [],
    [],
  );

  it('control: the detector reads constancy, not the value 1 (c = 2√(F/μ) gives F/(μc²) = 1/4)', () => {
    const atOne = sample(11, (u) => {
      const F = u(), mu = u();
      return { F, mu, c: Math.sqrt(F / mu) };
    });
    const atTwo = sample(11, (u) => {
      const F = u(), mu = u();
      return { F, mu, c: 2 * Math.sqrt(F / mu) };
    });
    const one = constantGroups(stringWithC, atOne);
    const two = constantGroups(stringWithC, atTwo);
    expect(one).toHaveLength(1);
    expect(two).toHaveLength(1);
    expect(one[0].name).toBe(two[0].name);
    expect(one[0].value).toBeCloseTo(1, 9);
    expect(two[0].value).toBeCloseTo(0.25, 9);
    expect(constantProducts(stringWithC, atTwo)).toBe(1);
  });

  it('control: a constant PRODUCT of free groups is found (pre-fix Stokes–Einstein, γ = 6πηa)', () => {
    // Each of m·kT·η²/γ⁴ and m·kT/(γ²a²) varies with m·kT; their ratio is (6π)^-2.
    const stokes = CASES.find((c) => c.bridge.id === 'ab-stokes-einstein')!.samples;
    const withEtaAndD = makeRegime(
      'diffusion',
      [
        { name: 'm', dim: MASS },
        { name: 'gamma', dim: DAMPING },
        { name: 't', dim: TIME },
        { name: 'kT', dim: ENERGY },
        { name: 'eta', dim: VISCOSITY },
        { name: 'a', dim: LENGTH },
      ],
      [],
      [],
    );
    expect(constantGroups(withEtaAndD, stokes)).toEqual([]);
    expect(constantProducts(withEtaAndD, stokes)).toBe(1);
  });

  it('negative control: free c beside F and μ is not reported', () => {
    const free = sample(12, (u) => ({ F: u(), mu: u(), c: u() }));
    expect(constantGroups(stringWithC, free)).toEqual([]);
    expect(constantProducts(stringWithC, free)).toBe(0);
  });
});
