/**
 * A quantity literal in a binding expression is one factor (#729): `6m/2s`
 * is (6 m)/(2 s), never ((6 m)/2)·s. A unit glued to a number scales the
 * power that ends at that number, so `10^3m` stays 1000 m.
 */
import { describe, expect, it } from 'vitest';
import { readBinding } from '../../src/numerical/binding-value.js';

const same = (a: string, b: string): void => {
  const x = readBinding(a);
  const y = readBinding(b);
  expect(x.value).toBeCloseTo(y.value, 12);
  expect(x.dimension).toEqual(y.dimension);
};

describe('a quantity literal after an operator is one factor (#729)', () => {
  it.each([
    ['6m/2s', '6m/(2s)'],
    ['1m/1s', '1m/(1s)'],
    ['1km/1h', '1km/(1h)'],
    ['6 m/2 s', '6m/(2s)'],
    ['2m^2/4s', '2m^2/(4s)'],
    ['1/2s', '1/(2s)'],
    ['-6m/-2s', '-6m/(-(2s))'],
  ])('%s reads as %s', (a, b) => same(a, b));

  it('1L/1mL is the dimensionless 1000', () => {
    const r = readBinding('1L/1mL');
    expect(r.value).toBeCloseTo(1000, 9);
    expect(r.dimension).toEqual(readBinding('2').dimension);
  });

  it('controls: forms that were already right keep their value', () => {
    same('3m/s', '3m/(1s)');
    expect(readBinding('6m/(2s)').value).toBe(3);
    expect(readBinding('2*1km').value).toBe(2000);
    expect(readBinding('10^3m').value).toBe(1000);
    expect(readBinding('2^2m').value).toBe(4);
    same('10^3m', '1000m');
    same('6m/2s^2', '3m/(1s^2)');
  });
});
