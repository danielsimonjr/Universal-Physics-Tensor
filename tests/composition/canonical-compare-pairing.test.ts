/**
 * A variable-name synonym must not silently switch the prefactor check off (0.47.0 persona
 * finding N1).
 *
 * CE-kinetic-energy names its variable `speed`; CE-lorentz-factor names the same dimension
 * `velocity`. `kinetic_energy = mass*velocity^2` was reported "prefactor NOT checked" (exit 0) while
 * the same formula with `speed` was caught (factor 2, exit 3). The CLI has no quantity synonym table,
 * and the target is matched by name on purpose, so the variables pair by name first and then by a
 * dimension that exactly one remaining canonical variable carries. A source whose dimension is not
 * known (an unresolved name) never pairs, and a pairing that is not unique is reported, not guessed.
 */
import { describe, it, expect } from 'vitest';
import { compareWithCanonical } from '../../src/composition/canonical-compare.js';
import { MASS, VELOCITY, TEMPERATURE } from '../../src/dimensional/types.js';

const ke = (u: string) => (v: Readonly<Record<string, number>>) => v['mass']! * v[u]! ** 2;
const find = (rs: ReturnType<typeof compareWithCanonical>, id: string) => rs.find((r) => r.id === id);

describe('N1: sources pair with canonical variables by a unique dimension', () => {
  it('`velocity` of dimension L/T pairs with CE-kinetic-energy\'s `speed`, and the factor 2 is caught', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', [{ name: 'mass', dim: MASS }, { name: 'velocity', dim: VELOCITY }], ke('velocity')),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 12);
    expect(r?.paired).toEqual([['velocity', 'speed']]);
  });

  it('`speed` still matches by name, with nothing paired by dimension', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', [{ name: 'mass', dim: MASS }, { name: 'speed', dim: VELOCITY }], ke('speed')),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.paired).toBeUndefined();
  });

  it('the true law with `velocity` agrees', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', [{ name: 'mass', dim: MASS }, { name: 'velocity', dim: VELOCITY }], (v) =>
        0.5 * ke('velocity')(v),
      ),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('agrees');
  });

  it('a name with no known dimension stays unresolved: nothing is compared', () => {
    expect(compareWithCanonical('kinetic-energy', ['mass', 'vel'], ke('vel'))).toEqual([]);
  });

  it('the TARGET is not paired by dimension: `energy` does not reach CE-kinetic-energy', () => {
    const rs = compareWithCanonical('energy', [{ name: 'mass', dim: MASS }, { name: 'velocity', dim: VELOCITY }], ke('velocity'));
    expect(find(rs, 'CE-kinetic-energy')).toBeUndefined();
  });

  it('two same-dimension variables with other names are NOT guessed: CE-carnot-efficiency is not compared', () => {
    const rs = compareWithCanonical(
      'carnot-efficiency',
      [{ name: 'cold', dim: TEMPERATURE }, { name: 'hot', dim: TEMPERATURE }],
      (v) => 1 - v['cold']! / v['hot']!,
    );
    const r = find(rs, 'CE-carnot-efficiency');
    expect(r?.kind).toBe('not-compared');
    expect(r?.detail).toMatch(/more than one way/);
  });

  it('the Carnot law with the registry\'s own names still agrees', () => {
    const r = find(
      compareWithCanonical(
        'carnot-efficiency',
        [{ name: 'cold-reservoir-temperature', dim: TEMPERATURE }, { name: 'hot-reservoir-temperature', dim: TEMPERATURE }],
        (v) => 1 - v['cold-reservoir-temperature']! / v['hot-reservoir-temperature']!,
      ),
      'CE-carnot-efficiency',
    );
    expect(r?.kind).toBe('agrees');
  });
});

/**
 * 0.47.1 persona finding W1: CE-mass-energy's governing `c` is a registered constant, so it is
 * stripped from the free variables. Writing the catalog quantity `speed-of-light` (same dimension)
 * then made the source set look like {mass, speed-of-light} against variables {mass}, and the
 * prefactor check was silently skipped (exit 0) while `2*mass*c^2` was caught (exit 3).
 */
describe('W1: a constant alias (speed-of-light ↔ c) must not disable the prefactor check', () => {
  it('factor 2 with speed-of-light is caught like factor 2 with the constant token c', () => {
    const r = find(
      compareWithCanonical(
        'rest-energy',
        [{ name: 'mass', dim: MASS }, { name: 'speed-of-light', dim: VELOCITY }],
        (v) => 2 * v['mass']! * v['speed-of-light']! ** 2,
      ),
      'CE-mass-energy',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 12);
    expect(r?.paired).toEqual([['speed-of-light', 'c']]);
  });

  it('the true law with speed-of-light agrees', () => {
    const r = find(
      compareWithCanonical(
        'rest-energy',
        [{ name: 'mass', dim: MASS }, { name: 'speed-of-light', dim: VELOCITY }],
        (v) => v['mass']! * v['speed-of-light']! ** 2,
      ),
      'CE-mass-energy',
    );
    expect(r?.kind).toBe('agrees');
  });

  it('mass alone (c implicit) still agrees — the constant stays optional', () => {
    const r = find(
      compareWithCanonical('rest-energy', [{ name: 'mass', dim: MASS }], (v) => {
        // evaluateUser only sees non-constant sources; c comes from CONSTANTS inside evalExpr
        // on the canonical side. For the user side of this unit test, use c's SI value.
        const c = 299792458;
        return v['mass']! * c ** 2;
      }),
      'CE-mass-energy',
    );
    // Without speed-of-light in sources, compareWithCanonical binds only mass; the user callback
    // must not require speed-of-light. Use CONSTANTS via a fixed c so the ratio is 1.
    expect(r?.kind).toBe('agrees');
  });
});
