/**
 * Validator tests — known-good and known-bad equations.
 *
 * Reference checks (Goldstein "Classical Mechanics" 3rd ed., Sakurai "Modern QM"
 * 2nd ed., Wald "General Relativity" 1984) for unit-canonical formulations:
 *   - Newton II: F = m a — Goldstein §1.1
 *   - Einstein rest energy: E = m c^2 — derived in any SR text, e.g. Rindler 2006
 *   - Schrödinger time evolution: i ℏ ∂ψ/∂t = H ψ — Sakurai §2.1
 *   - Bekenstein-Hawking entropy: S = k_B A / (4 ℓ_P^2) — Bekenstein 1973 PRD 7,
 *     Hawking 1975 CMP 43; canonical form S = k_B A c^3 / (4 ℏ G).
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  validateEquation,
  ExprNode,
} from '../../src/dimensional/validator.js';
import {
  DIMENSIONLESS,
  LENGTH,
  TIME,
  MASS,
  ENERGY,
  FORCE,
  VELOCITY,
  ACCELERATION,
  TEMPERATURE,
  ENTROPY,
  AREA,
  Dimension,
} from '../../src/dimensional/types.js';
import { hbar, c, k_B, l_P } from '../../src/dimensional/constants.js';
import { sym } from '../../src/dimensional/ast-builders.js';

describe('validator: known-good equations', () => {
  it("Newton's second law F = m a", () => {
    const lhs = sym('F', FORCE);
    const rhs: ExprNode = {
      kind: 'op', op: '*',
      args: [sym('m', MASS), sym('a', ACCELERATION)],
    };
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('E = m c^2', () => {
    const lhs = sym('E', ENERGY);
    const rhs: ExprNode = {
      kind: 'op', op: '*',
      args: [
        sym('m', MASS),
        { kind: 'op', op: '^', args: [sym('c', c), { kind: 'symbol', name: '2', dim: DIMENSIONLESS }] },
      ],
    };
    // For ^, the exponent symbol carries the literal numeric value via name; validator parses it.
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(true);
  });

  it('Schrödinger: i ℏ ∂ψ/∂t  has same dim as  H ψ (both = energy × ψ)', () => {
    // Treat ψ as dimensional with arbitrary tag PSI; only relative consistency is required.
    const PSI: Dimension = { L: -1.5, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 }; // L^{-3/2} convention; chosen but cancels
    const psi = sym('psi', PSI);
    const t = sym('t', TIME);
    // i is dimensionless
    const i_node = sym('i', DIMENSIONLESS);
    const dPsi_dt: ExprNode = { kind: 'derivative', of: psi, wrt: t };
    const lhs: ExprNode = {
      kind: 'op', op: '*',
      args: [i_node, sym('hbar', hbar), dPsi_dt],
    };
    // RHS: H * psi, with H having dim ENERGY
    const rhs: ExprNode = {
      kind: 'op', op: '*',
      args: [sym('H', ENERGY), psi],
    };
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(true);
  });

  it('Bekenstein-Hawking entropy S = k_B A / (4 ℓ_P^2)', () => {
    const lhs = sym('S', ENTROPY);
    const four = sym('4', DIMENSIONLESS);
    const lP_node = sym('lP', l_P);
    const rhs: ExprNode = {
      kind: 'op', op: '/',
      args: [
        { kind: 'op', op: '*', args: [sym('k_B', k_B), sym('A', AREA)] },
        { kind: 'op', op: '*', args: [four, { kind: 'op', op: '^', args: [lP_node, { kind: 'symbol', name: '2', dim: DIMENSIONLESS }] }] },
      ],
    };
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(true);
  });
});

describe('validator: integral and derivative dimension propagation', () => {
  it('∫ v dt has dimension LENGTH (when v=VELOCITY, dt=TIME)', () => {
    const expr: ExprNode = {
      kind: 'integral',
      integrand: sym('v', VELOCITY),
      over: sym('t', TIME),
    };
    const r = validate(expr);
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(LENGTH);
  });

  it('d(position)/d(time) has dimension VELOCITY', () => {
    const expr: ExprNode = {
      kind: 'derivative',
      of: sym('x', LENGTH),
      wrt: sym('t', TIME),
    };
    const r = validate(expr);
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(VELOCITY);
  });
});

describe('validator: known-bad equations', () => {
  it('rejects ENERGY + LENGTH (cannot add unlike dimensions)', () => {
    const expr: ExprNode = {
      kind: 'op', op: '+',
      args: [sym('E', ENERGY), sym('x', LENGTH)],
    };
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].note).toMatch(/add|mismatch/i);
  });

  it('rejects equation where LHS and RHS dims differ', () => {
    const lhs = sym('S', ENTROPY);
    const rhs = sym('E', ENERGY);
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('treats `^` with zero arguments as a violation, not a crash', () => {
    const expr: ExprNode = { kind: 'op', op: '^', args: [] };
    expect(() => validate(expr)).not.toThrow();
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].note).toMatch(/\^ requires exactly 2 args/);
  });

  it('treats `^` with one argument as a violation, not a crash', () => {
    const expr: ExprNode = {
      kind: 'op', op: '^',
      args: [sym('x', LENGTH)],
    };
    expect(() => validate(expr)).not.toThrow();
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('treats `integral` with missing `over` as a violation, not a crash', () => {
    const bad = {
      kind: 'integral',
      integrand: sym('v', VELOCITY),
      // over deliberately missing
    } as unknown as ExprNode;
    expect(() => validate(bad)).not.toThrow();
    const r = validate(bad);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('treats `integral` with missing `integrand` as a violation, not a crash', () => {
    const bad = {
      kind: 'integral',
      over: sym('t', TIME),
    } as unknown as ExprNode;
    expect(() => validate(bad)).not.toThrow();
    const r = validate(bad);
    expect(r.ok).toBe(false);
  });

  it('treats `derivative` with missing `wrt` as a violation, not a crash', () => {
    const bad = {
      kind: 'derivative',
      of: sym('x', LENGTH),
    } as unknown as ExprNode;
    expect(() => validate(bad)).not.toThrow();
    const r = validate(bad);
    expect(r.ok).toBe(false);
  });

  it('treats `derivative` with missing `of` as a violation, not a crash', () => {
    const bad = {
      kind: 'derivative',
      wrt: sym('t', TIME),
    } as unknown as ExprNode;
    expect(() => validate(bad)).not.toThrow();
    const r = validate(bad);
    expect(r.ok).toBe(false);
  });

  it('`^` non-symbol exponent violation reports expected!==actual when exponent has a real dim', () => {
    // Exponent is not a symbol — it's an op node. We can still infer its dim
    // and surface the mismatch in `actual`, so the violation is informative.
    const expr: ExprNode = {
      kind: 'op', op: '^',
      args: [
        sym('x', LENGTH),
        // exponent is itself an op node (which has a length-derived dim)
        { kind: 'op', op: '*', args: [sym('y', LENGTH)] },
      ],
    };
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    const v = r.violations.find((x) => /\^ exponent must be/.test(x.note));
    expect(v).toBeDefined();
    // The violation should not have expected === actual (which would make
    // a downstream consumer that compares the two filter the violation
    // out as a no-op).
    expect(v!.expected).toEqual(DIMENSIONLESS);
    // actual carries the inferred exponent-expression dim, which is LENGTH here.
    expect(v!.actual).toEqual(LENGTH);
  });

  it('reports a violation (not silent ok) for an unknown ExprNode.kind', () => {
    // Forge a malformed AST whose `kind` is none of the four supported arms.
    const bad = { kind: 'wat', name: 'oops', dim: LENGTH } as unknown as ExprNode;
    expect(() => validate(bad)).not.toThrow();
    const r = validate(bad);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].note).toMatch(/unknown.*kind/i);
  });

  it('validateEquation surfaces internal LHS violations with `lhs` path prefix', () => {
    // LHS internally bad: E + x is a dimension mismatch. RHS is clean.
    // The function must still return ok=false with the violation
    // location prefixed by 'lhs'.
    const lhs: ExprNode = {
      kind: 'op', op: '+',
      args: [sym('E', ENERGY), sym('x', LENGTH)],
    };
    const rhs = sym('E', ENERGY);
    const r = validateEquation(lhs, rhs);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].location).toMatch(/^lhs/);
  });

  it('rejects mixed-unit sum inside a larger expression', () => {
    // (E + x) * m  — inner sum is illegal
    const expr: ExprNode = {
      kind: 'op', op: '*',
      args: [
        {
          kind: 'op', op: '+',
          args: [sym('E', ENERGY), sym('x', LENGTH)],
        },
        sym('m', MASS),
      ],
    };
    const r = validate(expr);
    expect(r.ok).toBe(false);
    // Path should mention args[0] (the inner sum)
    expect(r.violations[0].location).toContain('args[0]');
  });
});

describe('validator: a literal ZERO in a sum is compatible with every dimension', () => {
  // Numbers are dimensionless symbols in this grammar, so `x = 0` can only be
  // written as `x - 0`. Zero is the additive identity: it carries no dimension
  // of its own. Treating it as dimensionless rejected every "... = 0" equation.
  const zero = sym('0', DIMENSIONLESS);
  const accel: ExprNode = { kind: 'op', op: '/', args: [sym('x', LENGTH), { kind: 'op', op: '^', args: [sym('t', TIME), sym('2', DIMENSIONLESS)] }] };

  it('x − 0 has the dimension of x', () => {
    const r = validate({ kind: 'op', op: '-', args: [accel, zero] });
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(ACCELERATION);
  });

  it('0 − x (unary minus) has the dimension of x', () => {
    const r = validate({ kind: 'op', op: '-', args: [zero, sym('E', ENERGY)] });
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(ENERGY);
  });

  it('0 + 0 is dimensionless', () => {
    const r = validate({ kind: 'op', op: '+', args: [zero, zero] });
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(DIMENSIONLESS);
  });

  it('CONTROL: a NON-zero number still cannot be added to a dimensioned quantity', () => {
    const r = validate({ kind: 'op', op: '-', args: [sym('E', ENERGY), sym('1', DIMENSIONLESS)] });
    expect(r.ok).toBe(false);
  });

  it('CONTROL: a zero still cannot hide a mismatch between the OTHER terms', () => {
    const r = validate({ kind: 'op', op: '+', args: [sym('E', ENERGY), zero, sym('x', LENGTH)] });
    expect(r.ok).toBe(false);
  });

  it('CONTROL: a zero that CARRIES a dimension is an ordinary term', () => {
    const r = validate({ kind: 'op', op: '+', args: [sym('E', ENERGY), sym('0', LENGTH)] });
    expect(r.ok).toBe(false);
  });
});
