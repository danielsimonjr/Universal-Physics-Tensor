/**
 * Persona retest on 0.47.1 after the fix batch (`docs/research/cli-physicist-persona-0.47.1-post-fix.md`),
 * findings W4, W5, L5, L6 and W6, with persona I5–I7 and Q3.
 *
 * W4 / persona I5: the monomial `canonicalAt` read every name from the comparison point and fell back
 * to 1, so the governing constants G and c counted as 1 on the canonical side while the user side
 * took their SI values. Textbook Kepler III read "factor 122404" and 2GM/c² "factor 7.4e-28".
 * Q3 asks which entries this reached. The hand formulas below are typed from the textbook forms,
 * independent of the canonical monomials.
 */
import { describe, it, expect } from 'vitest';
import { compareWithCanonical, compareUserEquation } from '../../src/composition/canonical-compare.js';
import { analyzeUserEquation, parseUserEquation, UserEquationError } from '../../src/composition/user-equation.js';
import { canonicalPrefactor } from '../../src/composition/canonical-prefactors.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { CONSTANTS } from '../../src/composition/symbolic-constants.js';
import { equals } from '../../src/dimensional/algebra.js';
import { LENGTH, MASS, TEMPERATURE, TIME, DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';

const PRESSURE: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
const VOLUME: Dimension = { L: 3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

const G = 6.6743e-11;
const C = 299792458;
const HBAR = 1.054571817e-34;
const K_B = 1.380649e-23;

const find = (cs: ReturnType<typeof compareWithCanonical>, id: string) => cs.find((c) => c.id === id);

describe('W4: the monomial comparison binds the governing constants to their SI values', () => {
  it('T = 2π√(a³/(GM)) agrees with CE-kepler-third; T = π√(a³/(GM)) differs by the factor 0.5', () => {
    const right = compareWithCanonical('period', ['semi-major-axis', 'mass'], (v) =>
      2 * Math.PI * Math.sqrt(v['semi-major-axis']! ** 3 / (G * v['mass']!)));
    const wrong = compareWithCanonical('period', ['semi-major-axis', 'mass'], (v) =>
      Math.PI * Math.sqrt(v['semi-major-axis']! ** 3 / (G * v['mass']!)));
    expect(find(right, 'CE-kepler-third')).toMatchObject({ kind: 'agrees' });
    expect(find(wrong, 'CE-kepler-third')?.kind).toBe('factor');
    expect(find(wrong, 'CE-kepler-third')?.ratio).toBeCloseTo(0.5, 12);
  });

  it('r = 2GM/c² agrees with CE-schwarzschild-radius; r = GM/c² differs by the factor 0.5', () => {
    const right = compareWithCanonical('radius', ['mass'], (v) => (2 * G * v['mass']!) / C ** 2);
    const wrong = compareWithCanonical('radius', ['mass'], (v) => (G * v['mass']!) / C ** 2);
    expect(find(right, 'CE-schwarzschild-radius')).toMatchObject({ kind: 'agrees' });
    expect(find(wrong, 'CE-schwarzschild-radius')?.ratio).toBeCloseTo(0.5, 12);
  });

  it('the persona forms through the user-equation path agree too', async () => {
    const dims = new Map<string, Dimension>([['period', TIME], ['semi-major-axis', LENGTH], ['mass', MASS], ['radius', LENGTH]]);
    const kepler = await compareUserEquation('period = 2*pi*sqrt(semi_major_axis^3/(G*mass))', dims);
    const schw = await compareUserEquation('radius = 2*G*mass/c^2', dims);
    expect(find(kepler, 'CE-kepler-third')?.kind).toBe('agrees');
    expect(find(schw, 'CE-schwarzschild-radius')?.kind).toBe('agrees');
  });

  it('a name the monomial holds that is neither a variable nor a constant is not read as 1', () => {
    const entry = CANONICAL_EQUATIONS.find((e) => e.id === 'CE-schwarzschild-radius')!;
    const broken = { ...entry, dimensional: { ...entry.dimensional, monomial: { ...entry.dimensional.monomial!, 'no-such-name': 1 } } };
    const r = compareWithCanonical('radius', ['mass'], (v) => (2 * G * v['mass']!) / C ** 2, [broken]);
    expect(r).toEqual([expect.objectContaining({ id: 'CE-schwarzschild-radius', kind: 'not-compared' })]);
  });
});

describe('Q3: which monomial entries the constant binding reaches', () => {
  const monomialWithConstant = CANONICAL_EQUATIONS.filter(
    (e) =>
      e.scalarAst === undefined &&
      e.dimensional.monomial !== null &&
      e.dimensional.governing.some((g) => CONSTANTS[g.name] !== undefined && equals(CONSTANTS[g.name]!.dim, g.dim)),
  );

  it('eight entries hold a governing constant in a monomial-only record', () => {
    expect(monomialWithConstant.map((e) => e.id).sort()).toEqual([
      'CE-compton-wavelength', 'CE-einstein-field-eq', 'CE-kepler-third', 'CE-planck-length',
      'CE-planck-mass', 'CE-planck-time', 'CE-schwarzschild-radius', 'CE-thermal-de-broglie',
    ]);
  });

  it('each one, fed its own monomial at SI constants, never reads as a factor or a different form', () => {
    for (const e of monomialWithConstant) {
      const d = e.dimensional;
      const variables = d.governing.filter((g) => !(CONSTANTS[g.name] !== undefined && equals(CONSTANTS[g.name]!.dim, g.dim)));
      const factor = canonicalPrefactor(e.id) ?? 1;
      const evaluate = (v: Readonly<Record<string, number>>) =>
        factor * Object.entries(d.monomial!).reduce((acc, [n, p]) => acc * (v[n] ?? CONSTANTS[n]!.value) ** p, 1);
      const r = find(compareWithCanonical(d.target.name, variables.map((g) => g.name), evaluate, [e]), e.id);
      expect(r?.kind, e.id).toBe(canonicalPrefactor(e.id) === undefined ? 'prefactor-unchecked' : 'agrees');
      const doubled = find(compareWithCanonical(d.target.name, variables.map((g) => g.name), (v) => 2 * evaluate(v), [e]), e.id);
      if (canonicalPrefactor(e.id) !== undefined) expect(doubled?.ratio, e.id).toBeCloseTo(2, 12);
      else expect(doubled?.kind, e.id).toBe('prefactor-unchecked');
    }
  });

  it("CE-einstein-field-eq records its 8π only in its field equation, so its monomial checks no prefactor", () => {
    const r = compareWithCanonical('efe-curvature', ['stress-energy-density'], (v) => (8 * Math.PI * G * v['stress-energy-density']!) / C ** 4);
    expect(find(r, 'CE-einstein-field-eq')).toMatchObject({ kind: 'prefactor-unchecked' });
    expect(find(r, 'CE-einstein-field-eq')?.detail).toMatch(/field equation/);
  });
});

describe('W5 / persona I6: an all-constant right-hand side is compared when its target is a catalog quantity', () => {
  const dims = new Map<string, Dimension>([['planck-length', LENGTH], ['planck-mass', MASS], ['planck-time', TIME]]);

  it('parseUserEquation accepts zero sources for a catalog target, and still refuses them otherwise', async () => {
    expect((await parseUserEquation('planck_length = sqrt(hbar*G/c^3)', dims.keys())).sources).toEqual([]);
    await expect(parseUserEquation('planck_length = sqrt(hbar*G/c^3)')).rejects.toThrow(UserEquationError);
    await expect(parseUserEquation('not_a_quantity = sqrt(hbar*G/c^3)', dims.keys())).rejects.toThrow(/no source quantities/);
  });

  it('the three Planck units agree with their entries, at the SI constants, and say that no variable was varied', async () => {
    for (const [eq, id] of [
      ['planck_length = sqrt(hbar*G/c^3)', 'CE-planck-length'],
      ['planck_mass = sqrt(hbar*c/G)', 'CE-planck-mass'],
      ['planck_time = sqrt(hbar*G/c^5)', 'CE-planck-time'],
    ] as const) {
      const r = find(await compareUserEquation(eq, dims), id);
      expect(r, eq).toMatchObject({ kind: 'agrees', constantsOnly: true });
    }
  });

  it('control: a factor 2 under the root reads as the factor √2', async () => {
    const r = find(await compareUserEquation('planck_length = sqrt(2*hbar*G/c^3)', dims), 'CE-planck-length');
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(Math.SQRT2, 12);
  });

  it('second method: the SI values agree with CODATA 2022 (NIST) to its seven printed digits', () => {
    expect(Math.sqrt((HBAR * G) / C ** 3) / 1.616255e-35).toBeCloseTo(1, 6);
    expect(Math.sqrt((HBAR * C) / G) / 2.176434e-8).toBeCloseTo(1, 6);
    expect(Math.sqrt((HBAR * G) / C ** 5) / 5.391247e-44).toBeCloseTo(1, 6);
  });

  it('analyzeUserEquation gives the all-constant equation its dimension and a junction with no sources', async () => {
    const a = await analyzeUserEquation('planck_length = sqrt(hbar*G/c^3)', dims);
    expect(a.consistent).toBe(true);
    expect(a.junction.sources).toEqual([]);
    expect(a.junction.target).toBe('planck-length');
  });
});

describe('L6: a dimensionless count the entry holds only in its AST is a comparison variable', () => {
  const dims = new Map<string, Dimension>([['pressure', PRESSURE], ['temperature', TEMPERATURE], ['V', VOLUME]]);

  it('P = N k_B T / V agrees with CE-ideal-gas; P = 2 N k_B T / V differs by the factor 2', async () => {
    const right = find(await compareUserEquation('pressure = N*k_B*temperature/V', dims), 'CE-ideal-gas');
    const wrong = find(await compareUserEquation('pressure = 2*N*k_B*temperature/V', dims), 'CE-ideal-gas');
    expect(right?.kind).toBe('agrees');
    expect(wrong?.kind).toBe('factor');
    expect(wrong?.ratio).toBeCloseTo(2, 12);
  });

  it('control: P = N² k_B T / V differs in form, so N really varies across the points', async () => {
    const r = find(await compareUserEquation('pressure = N^2*k_B*temperature/V', dims), 'CE-ideal-gas');
    expect(r?.kind).toBe('form');
  });

  it('without N the result is what it was before: CE-ideal-gas is listed as not compared', async () => {
    const r = find(await compareUserEquation('pressure = k_B*temperature/V', dims), 'CE-ideal-gas');
    expect(r).toMatchObject({
      kind: 'not-compared',
      detail: 'its formula depends on N, which your formula does not name',
    });
  });

  it('a count is joined by name only: a dimensionless catalog quantity under another name does not pair with N', async () => {
    const withCount = new Map<string, Dimension>([...dims, ['particle-count', DIMENSIONLESS]]);
    expect(find(await compareUserEquation('pressure = particle_count*k_B*temperature/V', withCount), 'CE-ideal-gas')).toBeUndefined();
    expect(K_B).toBe(CONSTANTS['k_B']!.value);
  });
});

describe('L5 / persona I7: an unknown name whose inferred dimension a registered constant carries suggests it', () => {
  it("'sigma' in radiative_flux = sigma*temperature^4 suggests the constant sigma_sb", async () => {
    const dims = new Map<string, Dimension>([
      ['radiative-flux', { L: 0, M: 1, T: -3, I: 0, Theta: 0, N: 0, J: 0 }],
      ['temperature', TEMPERATURE],
    ]);
    const a = await analyzeUserEquation('radiative_flux = sigma*temperature^4', dims);
    expect(a.hints).toEqual([expect.objectContaining({ name: 'sigma', constants: ['sigma_sb'] })]);
  });

  it('control: an unknown name whose dimension no constant carries suggests no constant', async () => {
    const dims = new Map<string, Dimension>([['pressure', PRESSURE], ['temperature', TEMPERATURE]]);
    const a = await analyzeUserEquation('pressure = zeta*temperature', dims);
    // zeta is also the name of a MathTS function. The old assertion
    // `hints[0]?.constants ?? []` was [] either way, including when zeta was
    // swallowed and the equation never parsed. Require the symbol to survive.
    expect(a.parseError).toBeNull();
    expect(a.junction.sources).toContain('zeta');
    expect(a.hints[0]?.constants ?? []).toEqual([]);
  });

  it('sound speed with the adiabatic index gamma is dimensionally a velocity, not an undeclared symbol', async () => {
    const VELOCITY: Dimension = { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
    const DENSITY: Dimension = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
    const dims = new Map<string, Dimension>([
      ['speed', VELOCITY],
      ['pressure', PRESSURE],
      ['density', DENSITY],
    ]);
    const a = await analyzeUserEquation('speed = sqrt(gamma*pressure/density)', dims);
    expect(a.parseError).toBeNull();
    expect(a.junction.sources).toContain('gamma');
    expect(a.consistent).toBe(true);
  });
});

describe('W6 / persona I7: a short name bound to a catalog quantity is disclosed with its dimension', () => {
  it("'a' in the Unruh formula is reported as bound to the catalog's a, a length, not an acceleration", async () => {
    const dims = new Map<string, Dimension>([['a', LENGTH], ['temperature', TEMPERATURE]]);
    const a = await analyzeUserEquation('unruh_temperature = hbar*a/(2*pi*k_B*c)', dims);
    expect(a.shortBindings).toEqual([{ name: 'a', quantity: 'a', dim: LENGTH, bound: false }]);
    expect(a.junction.sources).toContain('a');
    const bound = await analyzeUserEquation('unruh_temperature = hbar*a/(2*pi*k_B*c)', dims, { bindShortNames: true });
    expect(bound.shortBindings).toEqual([{ name: 'a', quantity: 'a', dim: LENGTH }]);
    expect(bound.junction.sources).toContain('a');
  });

  it('control: a long name bound to the catalog is not listed', async () => {
    const dims = new Map<string, Dimension>([['acceleration', { L: 1, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 }]]);
    const a = await analyzeUserEquation('unruh_temperature = hbar*acceleration/(2*pi*k_B*c)', dims);
    expect(a.shortBindings).toEqual([]);
  });
});
