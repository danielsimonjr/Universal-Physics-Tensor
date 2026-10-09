/**
 * Atlas Phase 2 §S2.5 — the GR spine's regimes.
 *
 * Four claims are under test, and they are different claims:
 *
 *  1. **The numbers did not move.** The three `residualInSigma` values that
 *     `upt confront --json` prints for be-37/51/52 are pinned here to all
 *     printed digits. This pins the NUMBERS out of the JSON, not the bytes of
 *     the text report — `tests/cli/golden/confront.txt` pins the text, and the
 *     two must be able to fail independently. Adding a regime is a change of
 *     DESCRIPTION; if either moves, it was a change of physics.
 *  2. **Each bound is the geometry it claims to be.** Recomputed here from the
 *     defining quantities, so a bound cannot drift into something else while
 *     still reading as sourced. (An earlier revision of this file asserted the
 *     bound equalled `CASSINI.observed_gamma_sigma` — a measurement precision
 *     standing in for a field strength. It passed. That is why this test now
 *     checks the ARITHMETIC and not merely that some number was used.)
 *  3. **Each regime holds at its own confrontation's inputs** — and be-37 and
 *     be-51 report `'unknown'`, not `true`, once `v/c` is supplied, because
 *     neither claims anything about it.
 *  4. **Row and edge agree.**
 *
 * Plus the per-inequality boundary tests the design note (§0) requires: just
 * inside, exactly on, just outside. These carry most of the information here.
 * The bound IS the confrontation's operating point by construction, so claim 3
 * holds partly by construction; only the boundary tests can catch an `op`
 * confusion (`<` vs `<=`), which at these bounds is the difference between the
 * confrontation point being inside its own claim and outside it.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { bridgeCatalog, catalogConfrontations, catalogEdgeKey, catalogEntry } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/index.js';
import { regimeHolds } from '../../src/atlas/regime.js';
import type { Regime } from '../../src/atlas/types.js';
import { C_SI, G_SI, M_SUN_SI } from '../../src/core/constants.js';

/** Dimensionless groups at the points the gravitational confrontations used, keyed by catalog id. */
const SPINE_CONFRONTATION_POINTS = bridgeCatalog().spine;

function regime(id: number): Regime {
  const found = catalogEntry(id)?.regime;
  if (found === undefined) throw new Error(`catalog ${id} has no regime`);
  return found;
}

const regime37 = regime(37);
const regime51 = regime(51);
const regime52 = regime(52);
const edge37 = catalogEdge(catalogEdgeKey(37));
const edge51 = catalogEdge(catalogEdgeKey(51));
const edge52 = catalogEdge(catalogEdgeKey(52));

const mercuryInputs = catalogConfrontations().find((row) => row.catalogId === 52)?.prediction?.inputs;
if (mercuryInputs === undefined) throw new Error('catalog 52 has no prediction inputs');
/** Orbital period is the NASA fact-sheet year used to build the v/c bound. It is not an input of the advance formula. */
const MERCURY = {
  central_mass_kg: mercuryInputs.mass,
  semi_major_axis_m: mercuryInputs['semi-major-axis'],
  eccentricity: mercuryInputs.eccentricity,
  period_yr: 0.2408467,
};

/** `PiGroup.formula` keys the regimes are stated in. */
const WEAK_FIELD = 'r_s · r^-1';
const SLOW_MOTION = 'v · c^-1';

const schwarzschildRadius = (M_kg: number): number => (2 * G_SI * M_kg) / (C_SI * C_SI);

/** Matches `SOLAR_RADIUS_M` in `be51-lensing-confrontation.ts` (private there). */
const SOLAR_RADIUS_M = 6.957e8;

function captureJson(): { lines: string[]; io: Record<string, unknown> } {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('S2.5 — the GR spine gains regimes and changes no number', () => {
  it('pins residualInSigma for be-37/51/52 from `upt confront --json`', async () => {
    const cap = captureJson();
    const code = await runCli(['confront', '--json'], cap.io as never);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join('')) as {
      result: { bridgeId: number; residualInSigma?: number }[];
    };
    const residuals = Object.fromEntries(
      parsed.result
        .filter((r) => [37, 51, 52].includes(r.bridgeId))
        .map((r) => [r.bridgeId, r.residualInSigma]),
    );
    // Captured 2026-09-21 from the built CLI, and identical to the values the
    // pre-S2.5 tree produced. Exact equality, not toBeCloseTo: a tolerance here
    // would be a place for a real regression to hide.
    // Re-pinned 2026-09-25, deliberately: be-51 and be-52 now take GM☉ from the
    // IAU 2015 nominal 1.3271244e20 m³ s⁻² instead of G × 1.989e30 / G × 1.98892e30
    // (Mothership ruling on persona finding L6). Was 51: 0.6666666666680373 and
    // 52: 0.2631364780638042. be-52 recomputed independently: 0.28764030602011.
    expect(residuals).toEqual({
      37: 0.9130434782629895,
      51: 0.6666666666669404,
      // 9.0.1: be-52's predicted is the evaluator's own number (one ulp from the stored one); the residual follows it.
      52: 0.287640306020099,
    });
  });

  it('the row regime and the graph edge regime AGREE, for all three', () => {
    const row = (id: number): Regime | undefined =>
      BRIDGE_EQUATIONS.find((e) => e.id === id)?.regime;
    // Identity, not deep equality: the edge carries the row's object, so there
    // is no second copy that could drift.
    expect(row(37)).toBe(edge37.regime);
    expect(row(51)).toBe(edge51.regime);
    expect(row(52)).toBe(edge52.regime);
    expect(row(37)).toBe(regime37);
    expect(row(51)).toBe(regime51);
    expect(row(52)).toBe(regime52);
  });

  it('all three are stated in the same two groups, traceable to the dimension matrix', () => {
    for (const regime of [regime37, regime51, regime52]) {
      expect(regime.family).toBe('gr-weak-field');
      expect(Object.keys(regime.groupDefinitions).sort()).toEqual(
        [WEAK_FIELD, SLOW_MOTION].sort(),
      );
      // r_s/r is r_s^1 r^-1; v/c is v^1 c^-1. If buckinghamPi ever spelled the
      // key the same way while deriving a different exponent vector, every
      // other assertion here would still pass.
      expect(regime.groupDefinitions[WEAK_FIELD]?.exponents).toMatchObject({ r_s: 1, r: -1 });
      expect(regime.groupDefinitions[SLOW_MOTION]?.exponents).toMatchObject({ v: 1, c: -1 });
    }
  });

  describe('every bound is a GEOMETRY, recomputed here from its defining quantities', () => {
    it('be-37 and be-51: r_s/r at the solar limb, 2GM_sun/(c^2 R_sun)', () => {
      const limb = schwarzschildRadius(M_SUN_SI) / SOLAR_RADIUS_M;
      expect(limb).toBeCloseTo(4.2463e-6, 10);
      expect(regime37.inequalities).toHaveLength(1);
      expect(regime37.inequalities[0]?.group).toBe(WEAK_FIELD);
      expect(regime37.inequalities[0]?.bound).toBe(limb);
      expect(regime51.inequalities).toHaveLength(1);
      expect(regime51.inequalities[0]?.bound).toBe(limb);
    });

    it('be-52: r_s/r and v/c at Mercury perihelion, from (M, a, e, T)', () => {
      const r_p = MERCURY.semi_major_axis_m * (1 - MERCURY.eccentricity);
      const rsOverR = schwarzschildRadius(MERCURY.central_mass_kg) / r_p;
      const v_p =
        ((2 * Math.PI * MERCURY.semi_major_axis_m) /
          (MERCURY.period_yr * 365.25 * 86400)) *
        Math.sqrt((1 + MERCURY.eccentricity) / (1 - MERCURY.eccentricity));
      // 6.4216e-8 before 2026-09-25 (G × 1.98892e30); now 2 GM☉/(c² r_p) with the
      // IAU nominal GM☉, recomputed independently as 6.419934159745687e-8.
      expect(rsOverR).toBeCloseTo(6.4199e-8, 12);
      expect(v_p / C_SI).toBeCloseTo(1.9672e-4, 8);
      expect(regime52.inequalities).toHaveLength(2);
      expect(regime52.inequalities[0]?.bound).toBe(rsOverR);
      expect(regime52.inequalities[1]?.bound).toBe(v_p / C_SI);
    });

    it('NO bound is a measurement precision — none of them is a sigma', () => {
      // The defect this file was rewritten to prevent. sigma_gamma = 2.3e-5,
      // its VLBI counterpart 1.2e-4, and Clemence sigma/observed = 1.0438e-2
      // must appear nowhere as a bound, nor as any square root of one.
      const forbidden = [2.3e-5, 1.2e-4, 0.45 / 43.11];
      const bounds = [regime37, regime51, regime52].flatMap((r) =>
        r.inequalities.map((i) => i.bound),
      );
      for (const b of bounds) {
        for (const f of forbidden) {
          expect(b).not.toBe(f);
          expect(b).not.toBe(Math.sqrt(f));
        }
      }
    });

    it('no alias cites a paper — a bound must not READ as sourced to one', () => {
      // A citation in a display string is how an invented number acquires the
      // appearance of provenance. Bounds here are arithmetic; they cite
      // geometry, not literature.
      const aliases = [regime37, regime51, regime52].flatMap((r) =>
        r.inequalities.map((i) => i.alias ?? ''),
      );
      for (const alias of aliases) {
        expect(alias).not.toMatch(/Bertotti|Lambert|Clemence|\b(19|20)\d{2}\b/);
      }
    });
  });

  describe('regimeHolds at each confrontation\'s own inputs', () => {
    it('be-37 — weak field holds at the solar limb', () => {
      const check = regimeHolds(regime37, SPINE_CONFRONTATION_POINTS[37] ?? {});
      expect(check.ok).toBe(true); // tri-state: `true`, never truthiness
      expect(check.violated).toEqual([]);
      expect(check.unchecked).toEqual([]);
    });

    it('be-51 — weak field holds at its own solar-limb baseline', () => {
      const check = regimeHolds(regime51, SPINE_CONFRONTATION_POINTS[51] ?? {});
      expect(check.ok).toBe(true);
      expect(check.unchecked).toEqual([]);
    });

    it('be-52 — both inequalities hold at Mercury perihelion', () => {
      const check = regimeHolds(regime52, SPINE_CONFRONTATION_POINTS[52] ?? {});
      expect(check.ok).toBe(true);
      expect(check.violated).toEqual([]);
      expect(check.unchecked).toEqual([]);
    });

    it('be-37 says NOTHING about v/c — supplying one changes no verdict', () => {
      // The positive control for the absent bound. A regime that had quietly
      // acquired a slow-motion inequality would either pass or fail here
      // instead of being indifferent, and a relativistic v/c is the value that
      // would expose it.
      const withVelocity = { ...(SPINE_CONFRONTATION_POINTS[37] ?? {}), [SLOW_MOTION]: 0.99 };
      const check = regimeHolds(regime37, withVelocity);
      expect(check.ok).toBe(true);
      expect(check.violated).toEqual([]);
      expect(regime37.inequalities.map((i) => i.group)).not.toContain(SLOW_MOTION);
      expect(regime51.inequalities.map((i) => i.group)).not.toContain(SLOW_MOTION);
    });

    it('be-52 with only the field supplied is `unknown`, NOT a pass', () => {
      const check = regimeHolds(regime52, {
        [WEAK_FIELD]: SPINE_CONFRONTATION_POINTS[52]?.[WEAK_FIELD] as number,
      });
      expect(check.ok).toBe('unknown');
      expect(check.violated).toEqual([]);
      expect(check.unchecked).toHaveLength(1);
    });
  });

  describe('the inequalities themselves — inside, on, outside', () => {
    const bound = regime37.inequalities[0]?.bound as number;

    it('just inside → true', () => {
      expect(regimeHolds(regime37, { [WEAK_FIELD]: bound * (1 - 1e-12) }).ok).toBe(true);
    });

    it('exactly ON the bound → true, because the op is `<=`', () => {
      // Load-bearing: the bound IS the confrontation's own operating point, so
      // a strict `<` here would put every one of these confrontations outside
      // its own claimed regime.
      expect(regimeHolds(regime37, { [WEAK_FIELD]: bound }).ok).toBe(true);
    });

    it('just outside → false, and names the group', () => {
      const check = regimeHolds(regime37, { [WEAK_FIELD]: bound * (1 + 1e-12) });
      expect(check.ok).toBe(false);
      expect(check.violated.map((i) => i.group)).toEqual([WEAK_FIELD]);
    });

    it('a stronger field than Mercury samples violates be-52', () => {
      const check = regimeHolds(regime52, {
        ...(SPINE_CONFRONTATION_POINTS[52] ?? {}),
        [WEAK_FIELD]: (SPINE_CONFRONTATION_POINTS[52]?.[WEAK_FIELD] as number) * 1.000001,
      });
      expect(check.ok).toBe(false);
      expect(check.violated.map((i) => i.group)).toEqual([WEAK_FIELD]);
    });

    it('a supplied-nothing point is `unknown`, NOT a pass', () => {
      const check = regimeHolds(regime52, {});
      expect(check.ok).toBe('unknown');
      expect(check.violated).toEqual([]);
      expect(check.unchecked).toHaveLength(2);
    });
  });
});
