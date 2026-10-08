/**
 * One unit reader with exact scale arithmetic.
 *
 * `parseUnit`, `convertValue` and the binding reader (`readBinding`,
 * `readNamedBinding`, the `upt eval` and `upt evaluate` paths) read a unit
 * through `unitReadings`, whose scales are exact rationals times one
 * irrational factor. A product of decimal scales is rounded once, so there is
 * no float noise to snap. MathTS is the independent second method for the
 * table: every row it states agrees with it, and the rows it rounds or reads
 * differently are named.
 */
import { unit } from '@danielsimonjr/mathts-functions';
import { toSiDimensionVector } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import {
  decimalScale,
  divideScales,
  multiplyScales,
  powerScale,
  ratioScale,
  scaleToNumber,
} from '../../src/dimensional/exact-scale.js';
import {
  affineReadingNote,
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  UnitRefusedError,
  unitRows,
  unitTables,
  UnknownUnitError,
} from '../../src/dimensional/units.js';
import { BindingNumberError, readBinding, readNamedBinding } from '../../src/numerical/binding-value.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import type { EvaluatorParameter } from '../../src/bridges/evaluators.js';

describe('exact scale arithmetic', () => {
  it('reads a decimal literal digit for digit and rounds a rational once', () => {
    expect(scaleToNumber(decimalScale('0.072')!)).toBe(0.072);
    expect(scaleToNumber(multiplyScales(decimalScale('72')!, decimalScale('1e-3')!))).toBe(0.072);
    expect(scaleToNumber(ratioScale(1, 3))).toBe(1 / 3);
    expect(scaleToNumber(divideScales(decimalScale('1e-3')!, powerScale(decimalScale('1e-2')!, 3)))).toBe(1000);
    // The float route this replaces: 72 * 1e-3 and 1e-3 / (1e-2)^3 both carry noise.
    expect(72 * 1e-3).not.toBe(0.072);
    expect(1e-3 / (1e-2) ** 3).not.toBe(1000);
  });

  it('rounds a non-terminating quotient to the nearest double', () => {
    for (const [n, d] of [[2, 3], [5, 9], [101325, 760], [1, 60], [22, 7], [1, 648000]] as const) {
      expect(scaleToNumber(ratioScale(n, d))).toBe(n / d);
    }
  });
});

/** `num / den` (positive, normal range) rounded half to even, by integer arithmetic in base 2. */
function binaryRound(num: bigint, den: bigint): number {
  let shift = 0;
  while ((num << BigInt(Math.max(shift, 0))) / (den << BigInt(Math.max(-shift, 0))) < 2n ** 52n) shift++;
  while ((num << BigInt(Math.max(shift, 0))) / (den << BigInt(Math.max(-shift, 0))) >= 2n ** 53n) shift--;
  const n = num << BigInt(Math.max(shift, 0));
  const d = den << BigInt(Math.max(-shift, 0));
  let q = n / d;
  const twice = 2n * (n % d);
  if (twice > d || (twice === d && q % 2n === 1n)) q += 1n;
  return Number(q) * 2 ** -shift;
}

/** The inverse of `a` modulo `m`. */
function inverseMod(a: bigint, m: bigint): bigint {
  let [r0, r1, s0, s1] = [a % m, m, 1n, 0n];
  while (r1 !== 0n) {
    const k = r0 / r1;
    [r0, r1, s0, s1] = [r1, r0 - k * r1, s1, s0 - k * s1];
  }
  return ((s0 % m) + m) % m;
}

describe('correct rounding for any denominator', () => {
  it('a quotient 1/(q·2^54) above a tie rounds up, with a 31-digit denominator that is not 2^a·5^b', () => {
    // p/q = (2m+1)/2^54 + 1/(q·2^54): the tie between m/2^53 and (m+1)/2^53, nudged up by
    // less than 1e-46 relative. Forty significant digits cannot see the nudge; digits(q)+20 can.
    const T = 2n ** 54n;
    let checked = 0;
    for (let k = 1n; checked < 3; k += 2n) {
      const q = 10n ** 30n + k;
      if (q % 5n === 0n) continue;
      const p = inverseMod(T % q, q);
      const odd = (p * T - 1n) / q;
      if ((p * T - 1n) % q !== 0n || odd % 2n !== 1n || odd < 2n ** 53n || odd >= T) continue;
      const m = (odd - 1n) / 2n;
      expect(scaleToNumber(ratioScale(p, q))).toBe(Number(m + 1n) / 2 ** 53);
      expect(scaleToNumber(ratioScale(-p, q))).toBe(-Number(m + 1n) / 2 ** 53);
      checked++;
    }
  });

  it('an exact tie (a 2^54 denominator) rounds half to even, every digit read', () => {
    const even = 2n ** 52n + 2n; // m even: the tie (2m+1)/2^54 rounds down to m/2^53
    const odd = 2n ** 52n + 3n; // m odd: it rounds up to (m+1)/2^53
    expect(scaleToNumber(ratioScale(2n * even + 1n, 2n ** 54n))).toBe(Number(even) / 2 ** 53);
    expect(scaleToNumber(ratioScale(2n * odd + 1n, 2n ** 54n))).toBe(Number(odd + 1n) / 2 ** 53);
  });

  it('agrees with base-2 integer rounding on large prime and composite denominators', () => {
    const dens = [2n ** 89n - 1n, 2n ** 127n - 1n, 3n ** 70n, 7n * 10n ** 40n + 1n, 10n ** 60n + 7n];
    let seed = 12345n;
    const next = (): bigint => (seed = (seed * 6364136223846793005n + 1442695040888963407n) % 2n ** 64n);
    for (const den of dens) {
      for (let i = 0; i < 40; i++) {
        const num = (next() * next() * next()) % (den * 1000n) + 1n;
        expect(scaleToNumber(ratioScale(num, den))).toBe(binaryRound(num, den));
      }
    }
  });
});

describe('one reader: parseUnit, convertValue and the binding reader agree exactly', () => {
  it.each([
    ['1g/cm^3', 'kg/m^3', 1000],
    ['72mN/m', 'N/m', 0.072],
    ['1ug', 'kg', 1e-9],
    ['3 mm^2', 'm^2', 3e-6],
    ['1 L', 'm^3', 0.001],
    ['250 mL', 'm^3', 0.00025],
    ['1 kcal', 'J', 4184],
    ['32 degF', 'K', 273.15],
    ['25 degC', 'K', 298.15],
  ])('%s is %s %s', (raw, target, si) => {
    expect(convertValue(raw, target).value).toBe(si);
    expect(readBinding(raw).value).toBe(si);
    expect(readNamedBinding('q', raw, { declaredUnit: target }).value).toBe(si);
  });

  it('upt eval names read the same value as a declared unit', () => {
    expect(readNamedBinding('rho', '1g/cm^3').value).toBe(1000);
    expect(readNamedBinding('gamma', '72mN/m').value).toBe(0.072);
  });

  it('a unit in an expression is the same exact scale', () => {
    expect(readBinding('2*1g/cm^3').value).toBe(2000);
    expect(readBinding('2*1kHz').value).toBe(2000);
  });
});

describe('typed refusals, not message text', () => {
  it('a refused, an ambiguous and an unknown unit are three classes', () => {
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(() => parseUnit('degC/s')).toThrow(UnitRefusedError);
    expect(() => parseUnit('mol/mL')).toThrow(AmbiguousUnitError);
    expect(() => parseUnit('furlong')).toThrow(UnknownUnitError);
  });

  it('the binding reader rethrows a refusal and reads an unknown word as not-a-number', () => {
    expect(() => readBinding('3 dB')).toThrow(UnitRefusedError);
    expect(() => readBinding('2*1degC')).toThrow(UnitRefusedError);
    expect(() => readBinding('1 mol/mL')).toThrow(AmbiguousUnitError);
    expect(() => readBinding('nope')).toThrow(BindingNumberError);
    expect(() => readBinding('1.2.3')).toThrow(BindingNumberError);
    expect(() => readBinding('2*euler')).toThrow(/exp\(x\)/);
  });
});

describe('a cycle-counting unit is a flag on its row', () => {
  const OMEGA: EvaluatorParameter[] = [
    { key: 'omega_rad_s', quantity: 'angular frequency', symbol: 'ω', unit: 'rad/s', meaning: 'angular frequency', angular: true },
  ];
  const omega = (raw: string): number => resolveEvaluatorInputs(OMEGA, [`omega_rad_s=${raw}`]).inputs.omega_rad_s!;

  it('Hz and rpm take 2π on an angular input; 1/s and rad/s do not', () => {
    expect(omega('1Hz')).toBe(2 * Math.PI);
    expect(omega('1kHz')).toBe(2000 * Math.PI);
    expect(omega('60rpm')).toBe(2 * Math.PI);
    expect(omega('1/s')).toBe(1);
    expect(omega('1rad/s')).toBe(1);
    expect(omega('7')).toBe(7);
  });

  it('the flag follows the unit through an expression', () => {
    expect(omega('2*1kHz')).toBe(4000 * Math.PI);
    expect(() => omega('1Hz + 1/(1s)')).toThrow(/cycle rate to a plain rate/);
  });

  it('the rows carry the flag: Hz and rpm, and no other', () => {
    const flagged = [...unitRows()].filter(([, row]) => (row as { cycles?: true }).cycles === true).map(([symbol]) => symbol);
    expect(flagged.sort()).toEqual(['Hz', 'rpm']);
  });
});

describe('MathTS states the same unit scales (the independent second method)', () => {
  const spelling = (symbol: string): string =>
    symbol.replaceAll('µ', 'u').replaceAll('μ', 'u').replaceAll('Ω', 'ohm').replaceAll('Å', 'angstrom');
  const compared: string[] = [];
  const disagree: string[] = [];
  for (const [symbol, row] of unitRows()) {
    let si: number;
    let dim: readonly number[];
    try {
      const u = unit(1, spelling(symbol)) as { toSI(): { value: unknown }; dimensions: number[] };
      si = Number(u.toSI().value);
      dim = toSiDimensionVector(u.dimensions, { ignoreExtra: true });
    } catch {
      continue;
    }
    compared.push(symbol);
    const local = scaleToNumber(row.scale);
    const sameDim = [row.dim.L, row.dim.M, row.dim.T, row.dim.I, row.dim.Theta, row.dim.N, row.dim.J].every((v, i) => v === dim[i]);
    if (!sameDim || Math.abs(si - local) > 1e-12 * Math.abs(local)) disagree.push(symbol);
  }

  it('compares most of the table', () => {
    expect(compared.length).toBeGreaterThanOrEqual(50);
  });

  it('disagrees only where the table is the definition and MathTS rounds or differs by convention', () => {
    // bit: ln 2 nat here, 1 in MathTS. torr: 101325/760 Pa exactly; mmHg: 133.322387415 Pa (NIST SP 811);
    // MathTS states both as 133.322 Pa. hp = 550 ft·lbf/s = 745.69987158227022 W and
    // psi = lbf/in² = 6894.757293168361 Pa exactly; MathTS stores 745.6998715386 and
    // 6894.75729276459, rounded at about 6e-11.
    expect(disagree.sort()).toEqual(['bit', 'hp', 'mmHg', 'psi', 'torr']);
  });
});

describe('the record fingerprint and the affine notes read the unit rows', () => {
  it("unitTables carries each row's cycles flag, so the fingerprint changes with it", () => {
    const { units } = unitTables();
    expect(units.get('Hz')?.[3]).toBe(true);
    expect(units.get('rpm')?.[3]).toBe(true);
    expect(units.get('s')?.[3]).toBe(false);
    expect(units.get('rad')?.[3]).toBe(false);
  });

  it("an affine reading's note is derived from its row's scale and ice point", () => {
    expect(affineReadingNote('celsius', 'absolute')).toBe('absolute: + 273.15');
    expect(affineReadingNote('celsius', 'difference')).toBe('a difference: no offset');
    expect(affineReadingNote('fahrenheit', 'absolute')).toBe('absolute: (degF − 32) × 5/9 + 273.15');
    expect(affineReadingNote('fahrenheit', 'difference')).toBe('a difference: × 5/9, no offset');
    // The same rows convert: the ice point in degF is 273.15 K.
    expect(convertValue('32 degF', 'K').value).toBe(273.15);
  });
});
