/**
 * Compare a user formula with the canonical equation it restates (persona finding L2,
 * 2026-09-25).
 *
 * `upt map --equation "period = pi*sqrt(length/gravity)"` and `upt derive … --formula
 * "mass*velocity^2"` both answered "✓ consistent / MATCHES", although each is wrong by a
 * constant. Dimensional analysis cannot see a prefactor, and the output did not say so. The
 * comparison evaluates both sides at FIXED, documented points, so the output is identical on
 * every run, and it tells a constant factor from a difference in form.
 *
 * The registry records some laws only up to a constant (CE-kinetic-energy's AST is m·v²) or only
 * dimensionally (CE-pendulum-period is a monomial). For those the prefactor CANNOT be checked,
 * and the comparison must say exactly that rather than report agreement.
 */

import { describe, expect, it } from 'vitest';
import { compareUserEquation, compareWithCanonical } from '../../src/composition/canonical-compare.js';
import { C_SI, G_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';

const hawking = (v: Record<string, number>) => (HBAR_SI * C_SI ** 3) / (8 * Math.PI * G_SI * v['mass']! * K_B_SI);
const find = (rs: ReturnType<typeof compareWithCanonical>, id: string) => rs.find((r) => r.id === id);

describe('compareWithCanonical — a fully quantitative entry', () => {
  it('the exact Hawking temperature agrees with CE-hawking-temperature, prefactor included', () => {
    const r = find(compareWithCanonical('hawking-temperature', ['mass'], hawking), 'CE-hawking-temperature');
    expect(r?.kind).toBe('agrees');
    expect(r?.ratio).toBeCloseTo(1, 12);
  });

  it('twice the Hawking temperature differs by the constant factor 2', () => {
    const r = find(
      compareWithCanonical('hawking-temperature', ['mass'], (v) => 2 * hawking(v)),
      'CE-hawking-temperature',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 12);
  });

  it('a 1/M² law differs in FORM: the ratio is not constant across the fixed points', () => {
    const r = find(
      compareWithCanonical('hawking-temperature', ['mass'], (v) => hawking(v) / v['mass']!),
      'CE-hawking-temperature',
    );
    expect(r?.kind).toBe('form');
    expect(r?.ratio).toBeUndefined();
  });

  it('underscored names resolve like hyphenated ones', () => {
    const r = find(compareWithCanonical('hawking_temperature', ['mass'], hawking), 'CE-hawking-temperature');
    expect(r?.kind).toBe('agrees');
  });
});

describe('compareWithCanonical — entries that record no prefactor', () => {
  // CE-pendulum-period, CE-kinetic-energy, CE-simple-harmonic-frequency and CE-oscillator-energy now
  // take their prefactors from the sourced table (tests/composition/canonical-prefactors.test.ts).
  // These cases use entries it does not cover.
  it('ω = 2·v_s·n^(1/3): same form as CE-debye-frequency, prefactor NOT checked (dimensional only)', () => {
    const r = find(
      compareWithCanonical('debye-frequency', ['sound-speed', 'number-density'], (v) => 2 * v['sound-speed']! * v['number-density']! ** (1 / 3)),
      'CE-debye-frequency',
    );
    expect(r?.kind).toBe('prefactor-unchecked');
    expect(r?.detail).toMatch(/dimensional form only/);
  });

  it('T ∝ ℓ/g differs in FORM from the CE-pendulum-period monomial', () => {
    const r = find(
      compareWithCanonical('period', ['length', 'gravity'], (v) => v['length']! / v['gravity']!),
      'CE-pendulum-period',
    );
    expect(r?.kind).toBe('form');
  });

});

describe('compareWithCanonical — CE-inductor-energy carries 1/2', () => {
  it('U = L·I² is twice the sourced energy', () => {
    const r = find(
      compareWithCanonical('energy', ['inductance', 'current'], (v) => v['inductance']! * v['current']! ** 2),
      'CE-inductor-energy',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 6);
  });

  it('U = ½ L·I² agrees, prefactor included', () => {
    const r = find(
      compareWithCanonical('energy', ['inductance', 'current'], (v) => 0.5 * v['inductance']! * v['current']! ** 2),
      'CE-inductor-energy',
    );
    expect(r?.kind).toBe('agrees');
  });
});

describe('compareWithCanonical — scope and determinism', () => {
  it('no entry shares the target and the variables → no comparison at all', () => {
    expect(compareWithCanonical('period', ['length'], (v) => v['length']!)).toEqual([]);
  });

  it('two runs are identical (fixed points, no randomness)', () => {
    const a = compareWithCanonical('hawking-temperature', ['mass'], (v) => 3 * hawking(v));
    const b = compareWithCanonical('hawking-temperature', ['mass'], (v) => 3 * hawking(v));
    expect(a).toEqual(b);
  });
});

describe('compareUserEquation: an equation that does not parse is a not-compared row, not an empty list (9.0.0 audit §4 C7)', () => {
  it('kinetic-energy = mass + speed (a dimensional parse failure) reports why nothing was compared', async () => {
    // An empty list reads as "no canonical equation has this target and these variables".
    // That is a different fact from "the equation could not be read", and the two must not merge.
    const rows = await compareUserEquation('kinetic-energy = mass + speed', new Map([
      ['kinetic-energy', { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }],
      ['mass', { L: 0, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 }],
      ['speed', { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 }],
    ]));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('not-compared');
    expect(rows[0]!.id).toBe('kinetic-energy');
    expect(rows[0]!.detail).toMatch(/mass|speed|dimension/i);
  });

  it('control: the true law parses and agrees', async () => {
    const rows = await compareUserEquation('kinetic-energy = 0.5 * mass * speed^2', new Map([
      ['kinetic-energy', { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }],
      ['mass', { L: 0, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 }],
      ['speed', { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 }],
    ]));
    expect(rows.find((r) => r.id === 'CE-kinetic-energy')?.kind).toBe('agrees');
  });
});
