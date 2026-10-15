/**
 * `core/format`: the one number formatter of printed quantities (15
 * significant digits, an integer printed as an integer), the exact shortest
 * round-trip form, and the percent form.
 */
import { describe, expect, it } from 'vitest';
import { formatExact, formatPercent, formatQuantity } from '../../src/core/format.js';
import { formatQuantity as fromExplain, formatExact as exactFromExplain } from '../../src/composition/explain.js';

describe('formatQuantity', () => {
  it('prints 15 significant digits and drops trailing zeros', () => {
    expect(formatQuantity(1 / 3)).toBe('0.333333333333333');
    expect(formatQuantity(5799.987689472028)).toBe('5799.98768947203');
    expect(formatQuantity(1)).toBe('1');
    expect(formatQuantity(-175882001077.2163)).toBe('-175882001077.216');
    expect(formatQuantity(2.35460972213968e-19)).toBe('2.35460972213968e-19');
  });

  it('takes the digit count a statistic asks for', () => {
    expect(formatQuantity(Math.PI, 3)).toBe('3.14');
    expect(formatQuantity(123456, 3)).toBe('123000');
  });

  it('is the function composition/explain re-exports, so its importers are unchanged', () => {
    expect(fromExplain).toBe(formatQuantity);
    expect(exactFromExplain).toBe(formatExact);
  });
});

describe('formatExact and formatPercent', () => {
  it('formatExact is the shortest decimal that round-trips', () => {
    expect(formatExact(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(formatExact(1e21)).toBe('1e+21');
  });

  it('formatPercent scales by 100 and fixes the digits', () => {
    expect(formatPercent(0.1234, 1)).toBe('12.3%');
    expect(formatPercent(0.5, 0)).toBe('50%');
    expect(formatPercent(1 / 3)).toBe('33.3%');
  });

  it('formatPercent with significant digits prints a statistic as upt confront always did (-43.7%, ±150%, 1e-7%)', () => {
    expect(formatPercent(-0.437, { significant: 3 })).toBe('-43.7%');
    expect(formatPercent(1.5, { significant: 3 })).toBe('150%');
    expect(formatPercent(1e-9, { significant: 3 })).toBe('1e-7%');
    expect(formatPercent(0.257, { significant: 3, signed: true })).toBe('+25.7%');
    expect(formatPercent(-0.0727, { significant: 3, signed: true })).toBe('-7.27%');
    expect(formatPercent(0, { significant: 3, signed: true })).toBe('0%');
  });

  it('formatPercent with significant digits is the retired confront spelling on every value tried', () => {
    // The two private helpers `upt confront` used, verbatim (`fmt` was formatQuantity).
    const percent = (x: number): string => `${formatQuantity(x * 100, 3)}%`;
    const signedPercent = (x: number): string => `${x > 0 ? '+' : ''}${percent(x)}`;
    const values = [0, -0, 1, -1, 0.1, 1.5, -0.437, 0.257, -0.00787, 8.6e-11, 1e-9, 0.00001, 123.456, -0.0727, 1 / 3, 2 / 3];
    for (let i = 0; i < 200; i++) values.push(Math.sin(i * 12.9898) * 10 ** ((i % 9) - 6));
    for (const x of values) {
      expect(formatPercent(x, { significant: 3 })).toBe(percent(x));
      expect(formatPercent(x, { significant: 3, signed: true })).toBe(signedPercent(x));
    }
  });
});
