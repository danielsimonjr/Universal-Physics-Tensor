/**
 * Say which exponent differs (proposal 4). When a user formula does not
 * match the canonical monomial, the comparison only said "differs in form".
 * Now it samples a full-rank log design (a base point plus perturbations of
 * each variable), fits log|yours/canonical| by MathTS `ols`, rationalises the
 * exponents, and reports `yours/canonical ∝ mass^-1` with R²; below 1 the
 * difference is not a monomial in those variables.
 */
import { describe, expect, it } from 'vitest';
import {
  compareWithCanonical,
  describeExponentDifference,
  diagnoseExponentDifference,
} from '../../src/composition/canonical-compare.js';

const find = (rs: ReturnType<typeof compareWithCanonical>, id: string) => rs.find((r) => r.id === id);

describe('exponentDifference on a form mismatch', () => {
  it('v²/2 against m·v²/2 reports mass: −1 with R² = 1', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => (v['speed']! * v['speed']!) / 2),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('form');
    expect(r?.exponentDifference).toBeDefined();
    const d = r!.exponentDifference!;
    expect(d.exponents).toEqual({ mass: -1, speed: 0 });
    expect(d.exact).toEqual({ mass: '-1', speed: '0' });
    expect(d.r2).toBeCloseTo(1, 9);
    expect(d.monomial).toBe(true);
    expect(describeExponentDifference(d)).toBe('yours/canonical ∝ mass^-1 (R² = 1): the difference is a monomial in these variables');
  });

  it('a half-power difference is rationalised: m·v^(5/2)/2 against m·v²/2 reports speed: 1/2', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => (v['mass']! * Math.pow(v['speed']!, 2.5)) / 2),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('form');
    expect(r?.exponentDifference?.exact).toEqual({ mass: '0', speed: '1/2' });
    expect(describeExponentDifference(r!.exponentDifference!)).toContain('speed^{1/2}');
  });

  it('a non-monomial difference reports R² < 1 and says so', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => ((v['mass']! * v['speed']! * v['speed']!) / 2) * (1 + v['mass']!)),
      'CE-kinetic-energy',
    );
    expect(r?.kind).toBe('form');
    const d = r!.exponentDifference!;
    expect(d.r2).toBeLessThan(1);
    expect(d.monomial).toBe(false);
    expect(describeExponentDifference(d)).toContain('not a monomial');
  });

  it('a constant ratio (agrees / factor) carries no exponent difference', () => {
    const r = find(
      compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => v['mass']! * v['speed']! * v['speed']!),
      'CE-kinetic-energy',
    );
    expect(r?.kind).not.toBe('form');
    expect(r?.exponentDifference).toBeUndefined();
  });
});

describe('diagnoseExponentDifference — the fit itself', () => {
  it('reads the exponents of a pure monomial ratio exactly, with R² = 1', () => {
    const d = diagnoseExponentDifference(['a', 'b'], (p) => Math.pow(p['a']!, 2) / Math.sqrt(p['b']!));
    expect(d?.exponents).toEqual({ a: 2, b: -0.5 });
    expect(d?.exact).toEqual({ a: '2', b: '-1/2' });
    expect(d?.r2).toBeCloseTo(1, 9);
  });

  it('a ratio that is zero or negative somewhere is no diagnosis', () => {
    expect(diagnoseExponentDifference(['a'], () => -1)).toBeUndefined();
    expect(diagnoseExponentDifference([], () => 2)).toBeUndefined();
  });
});
