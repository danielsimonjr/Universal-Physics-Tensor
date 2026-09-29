/**
 * Normalized structural form (B-T1) — the "up to dimensionless factors" hash
 * the F4 circularity guard relies on. Two expressions that differ only by
 * dimensionless multiplicative constants, product nesting, or commutative
 * ordering must hash equal; an exponent change must NOT.
 *
 * @module tests/canonical/normal-form
 */
import { describe, it, expect } from 'vitest';
import { normalForm, structurallyEqual } from '../../src/canonical/normal-form.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { ENTROPY, TEMPERATURE, DIMENSIONLESS, VELOCITY, LENGTH, MASS, TIME } from '../../src/dimensional/types.js';

const sym = (name: string, dim = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const op = (o: '*' | '/' | '^' | '+', args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });

describe('normalForm — structural hash up to dimensionless factors', () => {
  it('matches Landauer despite nesting + a differently-named dimensionless log', () => {
    // bridge-16 shape: (k_B·T)·ln_2_constant
    const bridge = op('*', [
      op('*', [sym('k_B', ENTROPY), sym('T', TEMPERATURE)]),
      sym('ln_2_constant', DIMENSIONLESS),
    ]);
    // canonical shape: k_B·T·ln2  (flat, different dimensionless name)
    const canonical = op('*', [
      sym('k_B', ENTROPY),
      sym('T', TEMPERATURE),
      sym('ln2', DIMENSIONLESS),
    ]);
    expect(structurallyEqual(bridge, canonical)).toBe(true);
  });

  it('keeps a functional stub distinct from a constant — ln⟨e^−βW⟩ ≠ ln2', () => {
    // Jarzynski's k_B·T·ln⟨e^−βW⟩ must NOT collapse onto Landauer's k_B·T·ln2:
    // ln⟨e^−βW⟩ is a named NON-constant dimensionless stub (a functional), not a
    // droppable constant. (The pre-fix bug dropped every dimensionless symbol.)
    const jarzynski = op('*', [
      sym('k_B', ENTROPY),
      sym('T', TEMPERATURE),
      sym('ln_avg_exp_minus_betaW', DIMENSIONLESS),
    ]);
    const landauer = op('*', [
      sym('k_B', ENTROPY),
      sym('T', TEMPERATURE),
      sym('ln2', DIMENSIONLESS),
    ]);
    expect(structurallyEqual(jarzynski, landauer)).toBe(false);
    // …but two expressions sharing the SAME stub still match.
    const jarzynski2 = op('*', [
      sym('ln_avg_exp_minus_betaW', DIMENSIONLESS),
      op('*', [sym('T', TEMPERATURE), sym('k_B', ENTROPY)]),
    ]);
    expect(structurallyEqual(jarzynski, jarzynski2)).toBe(true);
  });

  it('treats the historical short spellings as the governing names', () => {
    expect(normalForm(sym('T', TEMPERATURE))).toBe(normalForm(sym('temperature', TEMPERATURE)));
    expect(normalForm(sym('M', MASS))).toBe(normalForm(sym('mass', MASS)));
    expect(normalForm(sym('m_1', MASS))).toBe(normalForm(sym('mass', MASS)));
    expect(normalForm(sym('m_2', MASS))).toBe(normalForm(sym('secondary-mass', MASS)));
    // A time coordinate named T is not temperature.
    expect(normalForm(sym('T', TIME))).not.toBe(normalForm(sym('temperature', TEMPERATURE)));
  });

  it('is commutative for products', () => {
    const a = op('*', [sym('k_B', ENTROPY), sym('T', TEMPERATURE)]);
    const b = op('*', [sym('T', TEMPERATURE), sym('k_B', ENTROPY)]);
    expect(normalForm(a)).toBe(normalForm(b));
  });

  it('keeps exponents — σ·T⁴ ≠ σ·T', () => {
    const sigma = sym('sigma', { L: 0, M: 1, T: -3, I: 0, Theta: -4, N: 0, J: 0 });
    const t4 = op('*', [sigma, op('^', [sym('T', TEMPERATURE), sym('4', DIMENSIONLESS)])]);
    const t1 = op('*', [sigma, sym('T', TEMPERATURE)]);
    expect(structurallyEqual(t4, t1)).toBe(false);
  });

  it('a bare dimensionless symbol carries no structural content', () => {
    expect(normalForm(sym('ln2', DIMENSIONLESS))).toBe(normalForm(sym('4', DIMENSIONLESS)));
  });

  it('does NOT collapse distinct dimensionless op-exponents (no false match)', () => {
    // x^(a·2) vs x^(b·2): different dimensionless exponents must stay distinct
    // (the pre-fix bug dropped both to UNIT, making every x^(dimless) equal).
    const xa = op('^', [sym('x', LENGTH), op('*', [sym('a', DIMENSIONLESS), sym('2', DIMENSIONLESS)])]);
    const xb = op('^', [sym('x', LENGTH), op('*', [sym('b', DIMENSIONLESS), sym('2', DIMENSIONLESS)])]);
    expect(structurallyEqual(xa, xb)).toBe(false);
  });

  it('exponents are still robust to commutative reordering', () => {
    const x1 = op('^', [sym('x', LENGTH), op('*', [sym('a', DIMENSIONLESS), sym('2', DIMENSIONLESS)])]);
    const x2 = op('^', [sym('x', LENGTH), op('*', [sym('2', DIMENSIONLESS), sym('a', DIMENSIONLESS)])]);
    expect(structurallyEqual(x1, x2)).toBe(true);
  });

  it('distinguishes genuinely different relations', () => {
    const a = op('/', [sym('h', { L: 2, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 }), sym('p', { L: 1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 })]);
    const b = op('*', [sym('h', { L: 2, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 }), sym('nu', { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 })]);
    expect(structurallyEqual(a, b)).toBe(false);
  });
});

describe('normalForm — properties (idempotence / invariance / sensitivity)', () => {
  // A spread of structurally-distinct relations to exercise the properties over.
  const kT = op('*', [sym('k_B', ENTROPY), sym('T', TEMPERATURE)]);
  const ratio = op('/', [sym('E', { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }), sym('L', LENGTH)]);
  const powd = op('^', [sym('v', VELOCITY), sym('2', DIMENSIONLESS)]);
  const bases: ExprNode[] = [kT, ratio, powd, sym('x', LENGTH)];

  it('reflexive + idempotent: normalForm is deterministic and self-equal', () => {
    for (const b of bases) {
      expect(normalForm(b)).toBe(normalForm(b)); // deterministic
      expect(structurallyEqual(b, b)).toBe(true); // reflexive
    }
  });

  it('constant-insensitive: injecting any droppable dimensionless constant is invariant', () => {
    for (const b of bases) {
      for (const c of ['2', '4', 'ln2', 'pi', '4pi', 'ln_2_constant']) {
        const scaled = op('*', [b, sym(c, DIMENSIONLESS)]);
        expect(normalForm(scaled)).toBe(normalForm(b));
      }
    }
  });

  it('stub-sensitive: injecting a non-constant dimensionless stub changes the hash', () => {
    for (const b of bases) {
      const stubbed = op('*', [b, sym('alpha_param', DIMENSIONLESS)]);
      expect(normalForm(stubbed)).not.toBe(normalForm(b));
    }
  });

  it('nesting/ordering-invariant: re-nested + reversed products hash identically', () => {
    const flat = op('*', [sym('a', LENGTH), sym('b', TEMPERATURE), sym('c', VELOCITY)]);
    const nestedReversed = op('*', [
      op('*', [sym('c', VELOCITY), sym('b', TEMPERATURE)]),
      sym('a', LENGTH),
    ]);
    expect(normalForm(flat)).toBe(normalForm(nestedReversed));
  });
});
