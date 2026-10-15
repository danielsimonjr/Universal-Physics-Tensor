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
});
