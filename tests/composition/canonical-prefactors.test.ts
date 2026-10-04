/**
 * The canonical prefactor table (Mothership ruling 2026-09-25 on the L2/L7 limit).
 *
 * `src/canonical` records CE-pendulum-period only dimensionally and CE-kinetic-energy only up to a
 * constant, so a formula wrong by 2π or ½ could not be caught. `src/canonical` is a pinned
 * Criterion 3 input tree, so the prefactors live in a table OUTSIDE it,
 * `src/composition/canonical-prefactors.ts`, each with a verbatim source quote and a locator
 * pinned to a revision.
 */
import { describe, it, expect } from 'vitest';
import {
  CANONICAL_GROUP_PREFACTORS,
  CANONICAL_PREFACTORS,
  canonicalGroupPrefactor,
  canonicalPrefactor,
} from '../../src/composition/canonical-prefactors.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { compareWithCanonical } from '../../src/composition/canonical-compare.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';

/** Every hand value here is typed from the textbook form, independent of the table. */
const EXPECTED: Record<string, number> = {
  'CE-pendulum-period': 2 * Math.PI,
  'CE-kinetic-energy': 0.5,
  'CE-rotational-kinetic-energy': 0.5,
  'CE-capacitor-energy': 0.5,
  'CE-schwarzschild-radius': 2,
  'CE-kepler-third': 2 * Math.PI,
  'CE-lc-resonance': 1,
  'CE-stokes-drag': 6 * Math.PI,
  'CE-stokes-einstein': 1 / (6 * Math.PI),
  'CE-simple-harmonic-frequency': 1,
  'CE-spring-potential-energy': 0.5,
  'CE-oscillator-energy': 0.5,
  'CE-string-wave-speed': 1,
  'CE-planck-length': 1,
  'CE-planck-mass': 1,
  'CE-planck-time': 1,
  'CE-magnetic-field-wire': 1 / (2 * Math.PI),
  'CE-larmor-power': 1 / (6 * Math.PI),
  'CE-field-energy-density': 0.5,
  'CE-compton-wavelength': 1,
  'CE-dynamic-pressure': 0.5,
  'CE-laplace-pressure': 2,
  'CE-inductor-energy': 0.5,
  'CE-equipartition': 1.5,
  'CE-kinetic-pressure': 1 / 3,
  'CE-half-life': Math.log(2),
  'CE-thomson-cross-section': (8 * Math.PI) / 3,
};

/** A dimensionless number used as a FACTOR (not as an exponent) anywhere in the AST. */
function hasNumericConstant(n: ExprNode): boolean {
  const isNumber = (x: ExprNode) =>
    x.kind === 'symbol' && Object.values(x.dim).every((e) => e === 0) && /^[\d.]|pi/.test(x.name);
  if (n.kind === 'symbol') return isNumber(n);
  const args = (n as { op?: string; args?: ExprNode[] }).args ?? [];
  if ((n as { op?: string }).op === '^') return hasNumericConstant(args[0]!); // skip the exponent
  return args.some(hasNumericConstant);
}

describe('the canonical prefactor table', () => {
  it('holds exactly the sourced entries, with the textbook prefactors', () => {
    expect(Object.fromEntries(CANONICAL_PREFACTORS.map((p) => [p.id, p.prefactor]))).toEqual(EXPECTED);
  });

  it('every entry names a real canonical equation that does NOT already record its prefactor', () => {
    for (const p of CANONICAL_PREFACTORS) {
      const e = CANONICAL_EQUATIONS.find((x) => x.id === p.id);
      expect(e, p.id).toBeDefined();
      expect(e!.epistemicStatus, p.id).not.toBe('fully-quantitative');
      // The prefactor multiplies the entry's AST or monomial, so neither may carry a constant.
      if (e!.scalarAst) expect(hasNumericConstant(e!.scalarAst), p.id).toBe(false);
      else expect(e!.dimensional.monomial, p.id).not.toBeNull();
    }
  });

  it('every entry carries a verbatim quote and a revision-pinned locator', () => {
    for (const p of CANONICAL_PREFACTORS) {
      expect(p.quote.length, p.id).toBeGreaterThan(5);
      expect(p.locator, p.id).toMatch(/revision \d+, wikitext line \d+/);
    }
  });
});

describe('the group prefactor table: a factor that is a power of a dimensionless group', () => {
  it('holds CE-sound-speed as √γ, and canonicalPrefactor does not return it as a constant', () => {
    expect(CANONICAL_GROUP_PREFACTORS.map((p) => [p.id, p.group, p.coefficient, p.exponent])).toEqual([['CE-sound-speed', 'gamma', 1, 0.5]]);
    expect(canonicalPrefactor('CE-sound-speed')).toBeUndefined();
    // Air, γ = 1.4: √1.4 typed by hand.
    expect(canonicalGroupPrefactor('CE-sound-speed', 1.4)).toBeCloseTo(1.1832159566199232, 15);
    expect(canonicalGroupPrefactor('CE-pendulum-period', 1.4)).toBeUndefined();
  });

  it('every group entry names a canonical equation whose formula shows the group and whose record does not carry it', () => {
    for (const p of CANONICAL_GROUP_PREFACTORS) {
      const e = CANONICAL_EQUATIONS.find((x) => x.id === p.id)!;
      expect(e, p.id).toBeDefined();
      expect(e.epistemicStatus, p.id).not.toBe('fully-quantitative');
      expect(e.formula_latex, p.id).toContain('\\' + p.group);
      expect([e.dimensional.target, ...e.dimensional.governing].map((v) => v.name), p.id).not.toContain(p.group);
      expect(e.dimensional.monomial, p.id).not.toBeNull();
      expect(p.locator, p.id).toMatch(/revision \d+, wikitext line \d+/);
      expect(CANONICAL_PREFACTORS.some((q) => q.id === p.id), p.id).toBe(false);
    }
  });
});

describe('the prefactors added on 2026-09-27 are caught by compareWithCanonical', () => {
  it('ω = 2√(k/m) differs from CE-simple-harmonic-frequency by the factor 2; ω = √(k/m) agrees', () => {
    const wrong = compareWithCanonical('angular-velocity', ['spring-constant', 'mass'], (v) => 2 * Math.sqrt(v['spring-constant']! / v['mass']!))
      .find((c) => c.id === 'CE-simple-harmonic-frequency');
    const right = compareWithCanonical('angular-velocity', ['spring-constant', 'mass'], (v) => Math.sqrt(v['spring-constant']! / v['mass']!))
      .find((c) => c.id === 'CE-simple-harmonic-frequency');
    expect(wrong?.kind).toBe('factor');
    expect(wrong?.ratio).toBeCloseTo(2, 12);
    expect(right?.kind).toBe('agrees');
  });

  it('E = k·A² differs from CE-oscillator-energy by the factor 2; E = ½k·A² agrees', () => {
    const wrong = compareWithCanonical('oscillator-energy', ['spring-constant', 'amplitude'], (v) => v['spring-constant']! * v['amplitude']! ** 2)
      .find((c) => c.id === 'CE-oscillator-energy');
    const right = compareWithCanonical('oscillator-energy', ['spring-constant', 'amplitude'], (v) => 0.5 * v['spring-constant']! * v['amplitude']! ** 2)
      .find((c) => c.id === 'CE-oscillator-energy');
    expect(wrong?.kind).toBe('factor');
    expect(wrong?.ratio).toBeCloseTo(2, 12);
    expect(right?.kind).toBe('agrees');
  });

  it('U = k·x² differs from CE-spring-potential-energy by the factor 2', () => {
    const r = compareWithCanonical('spring-potential-energy', ['spring-constant', 'displacement'], (v) => v['spring-constant']! * v['displacement']! ** 2)
      .find((c) => c.id === 'CE-spring-potential-energy');
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 12);
  });

  it('v = √(F/μ) agrees with CE-string-wave-speed; v = √(2F/μ) differs by √2', () => {
    const right = compareWithCanonical('speed', ['tension', 'linear-density'], (v) => Math.sqrt(v['tension']! / v['linear-density']!))
      .find((c) => c.id === 'CE-string-wave-speed');
    const wrong = compareWithCanonical('speed', ['tension', 'linear-density'], (v) => Math.sqrt((2 * v['tension']!) / v['linear-density']!))
      .find((c) => c.id === 'CE-string-wave-speed');
    expect(right?.kind).toBe('agrees');
    expect(wrong?.kind).toBe('factor');
    expect(wrong?.ratio).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe('L2 with the table: the persona cases are caught', () => {
  it('T = π√(ℓ/g) differs from CE-pendulum-period by the factor 0.5', () => {
    const r = compareWithCanonical('period', ['length', 'gravity'], (v) => Math.PI * Math.sqrt(v['length']! / v['gravity']!))
      .find((c) => c.id === 'CE-pendulum-period');
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(0.5, 12);
  });

  it('K = m·v² differs from CE-kinetic-energy by the factor 2', () => {
    const r = compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => v['mass']! * v['speed']! ** 2)
      .find((c) => c.id === 'CE-kinetic-energy');
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(2, 12);
  });

  it('controls: the true laws AGREE', () => {
    const pend = compareWithCanonical('period', ['length', 'gravity'], (v) => 2 * Math.PI * Math.sqrt(v['length']! / v['gravity']!))
      .find((c) => c.id === 'CE-pendulum-period');
    const ke = compareWithCanonical('kinetic-energy', ['mass', 'speed'], (v) => 0.5 * v['mass']! * v['speed']! ** 2)
      .find((c) => c.id === 'CE-kinetic-energy');
    expect(pend?.kind).toBe('agrees');
    expect(ke?.kind).toBe('agrees');
  });
});
