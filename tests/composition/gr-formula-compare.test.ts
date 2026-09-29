/**
 * GR textbook formulas a student types into `upt map --equation`.
 *
 * CE-perihelion-precession writes 6π as the symbol `6pi`, which the structural
 * normal form already treats as a constant, but the comparison treated it as a
 * free symbol, so the formula was never aligned. CE-newton-gravitation names
 * both masses in the AST and the governing set (`mass`, `secondary-mass`).
 * A toy whose AST still says `m_1` and `m_2` with unequal powers is not paired
 * by guessing which mass is which. CE-schwarzschild-radius stores its target as
 * `radius` (the L0 record is frozen); the catalog quantity is `schwarzschild-radius`.
 */
import { describe, it, expect } from 'vitest';
import { compareWithCanonical } from '../../src/composition/canonical-compare.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { l1, op, pow } from '../../src/canonical/entries/_l1-build.js';
import { DIMENSIONLESS, FORCE, LENGTH, MASS, VELOCITY } from '../../src/dimensional/types.js';

const GRAV = { L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

const find = (rs: ReturnType<typeof compareWithCanonical>, id: string) => rs.find((r) => r.id === id);

describe('GR formula comparison', () => {
  it('resolves a spelled-out multiple of π (`6pi`) to 6π', () => {
    expect(evalExpr(sym('6pi', DIMENSIONLESS))).toBe(6 * Math.PI);
  });

  it('the Einstein perihelion formula, with the registry symbol for 1-e², agrees', () => {
    // compareWithCanonical normalizes `_` to `-`, so the callback key is one-minus-e-sq.
    const r = find(
      compareWithCanonical(
        'perihelion-precession',
        [
          { name: 'mass', dim: MASS },
          { name: 'G', dim: GRAV },
          { name: 'c', dim: VELOCITY },
          { name: 'a', dim: LENGTH },
          { name: 'one_minus_e_sq', dim: DIMENSIONLESS },
        ],
        (v) => (6 * Math.PI * v.G! * v.mass!) / (v.c! ** 2 * v.a! * v['one-minus-e-sq']!),
      ),
      'CE-perihelion-precession',
    );
    expect(r?.kind).toBe('agrees');
  });

  it('half the perihelion prefactor is the factor 0.5', () => {
    const r = find(
      compareWithCanonical(
        'perihelion-precession',
        [
          { name: 'mass', dim: MASS },
          { name: 'G', dim: GRAV },
          { name: 'c', dim: VELOCITY },
          { name: 'a', dim: LENGTH },
          { name: 'one_minus_e_sq', dim: DIMENSIONLESS },
        ],
        (v) => (3 * Math.PI * v.G! * v.mass!) / (v.c! ** 2 * v.a! * v['one-minus-e-sq']!),
      ),
      'CE-perihelion-precession',
    );
    expect(r?.kind).toBe('factor');
    expect(r?.ratio).toBeCloseTo(0.5, 12);
  });

  it('omitting 1-e² names the registry symbol instead of a generic alignment failure', () => {
    const r = find(
      compareWithCanonical(
        'perihelion-precession',
        [
          { name: 'mass', dim: MASS },
          { name: 'G', dim: GRAV },
          { name: 'c', dim: VELOCITY },
          { name: 'a', dim: LENGTH },
        ],
        (v) => (6 * Math.PI * v.G! * v.mass!) / (v.c! ** 2 * v.a!),
      ),
      'CE-perihelion-precession',
    );
    expect(r?.kind).toBe('not-compared');
    expect(r?.detail).toMatch(/one_minus_e_sq/);
    expect(r?.detail).toMatch(/1-e²/);
  });

  it("Newton's law with the governing names agrees, and twice the force is the factor 2", () => {
    const law = (factor: number) =>
      find(
        compareWithCanonical(
          'gravitational-force',
          [
            { name: 'G', dim: GRAV },
            { name: 'mass', dim: MASS },
            { name: 'secondary-mass', dim: MASS },
            { name: 'r', dim: LENGTH },
          ],
          (v) => (factor * v.G! * v.mass! * v['secondary-mass']!) / v.r! ** 2,
        ),
        'CE-newton-gravitation',
      );
    expect(law(1)?.kind).toBe('agrees');
    expect(law(2)?.kind).toBe('factor');
    expect(law(2)?.ratio).toBeCloseTo(2, 12);
  });

  it('an asymmetric two-mass formula is not paired by guessing which mass is which', () => {
    const toy = l1({ name: 'toy-force', dim: FORCE }, [
      { name: 'mass', dim: MASS },
      { name: 'secondary-mass', dim: MASS },
    ], {
      id: 'CE-toy-asymmetric',
      name: 'toy asymmetric masses',
      domain: 'gravitation',
      formula_latex: 'F = m_1^2 m_2',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('*', [pow(sym('m_1', MASS), '2'), sym('m_2', MASS)]),
      regime: {},
      assumptions: [],
      references: [],
      partnerBridges: [],
    });
    const r = find(
      compareWithCanonical(
        'toy-force',
        [
          { name: 'mass', dim: MASS },
          { name: 'secondary-mass', dim: MASS },
        ],
        (v) => v.mass! ** 2 * v['secondary-mass']!,
        [toy],
      ),
      'CE-toy-asymmetric',
    );
    expect(r?.kind).toBe('not-compared');
    expect(r?.detail).toMatch(/same-dimension/);
  });

  it('schwarzschild-radius reaches CE-schwarzschild-radius, whose frozen target name is radius', () => {
    const at = (factor: number) =>
      find(
        compareWithCanonical(
          'schwarzschild-radius',
          [
            { name: 'mass', dim: MASS },
            { name: 'G', dim: GRAV },
            { name: 'c', dim: VELOCITY },
          ],
          (v) => (factor * v.G! * v.mass!) / v.c! ** 2,
        ),
        'CE-schwarzschild-radius',
      );
    expect(at(2)?.kind).toBe('agrees');
    expect(at(1)?.kind).toBe('factor');
    expect(at(1)?.ratio).toBeCloseTo(0.5, 12);
  });
});
