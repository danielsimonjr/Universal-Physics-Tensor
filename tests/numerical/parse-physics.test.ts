/**
 * `parsePhysics` — parse physics text to a dimensional `ExprNode` + its
 * dimension, with the scalar grammar gap closed (faithful `transcendental` /
 * `abs` nodes). The built-in (Path B) checker's `parse` is tested synchronously
 * for deterministic coverage of both the node shapes and homogeneity errors;
 * `parsePhysics` (registry — MathTS when installed, else built-in) is tested for
 * the same grammar over whichever front-end is active.
 *
 * @module tests/numerical/parse-physics
 */
import { describe, it, expect } from 'vitest';
import {
  builtinFormulaDimensionChecker,
  FormulaDimensionError,
} from '../../src/numerical/formula-dimension.js';
import { parsePhysics } from '../../src/numerical/formula-registry.js';
import { CHARGE, ENERGY as ENERGY_NAMED, LENGTH, TIME, DIMENSIONLESS } from '../../src/dimensional/types.js';
import { equals, format, multiply } from '../../src/dimensional/algebra.js';
import { E_SI } from '../../src/core/constants.js';
import { mathtsFormulaParser as defaultFormulaParser } from '../../src/numerical/formula-mathts.js';

const ENERGY = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
const b = builtinFormulaDimensionChecker();

describe('MathTS checker .parse — ExprNode + dimension', () => {
  it('returns the op node and its dimension for a product', () => {
    const { expr, dimension } = b.parse('a*b', { a: LENGTH, b: TIME });
    expect(expr.kind).toBe('op');
    expect(equals(dimension, { L: 1, M: 0, T: 1, I: 0, Theta: 0, N: 0, J: 0 })).toBe(true);
  });

  it('throws FormulaDimensionError on a non-homogeneous sum', () => {
    expect(() => b.parse('a + b', { a: LENGTH, b: TIME })).toThrow(FormulaDimensionError);
  });

  it('folds literal-arithmetic exponents (incl. 1/3, -2)', () => {
    expect(equals(b.parse('a^(3-1)', { a: LENGTH }).dimension, { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 })).toBe(true);
    expect(b.parse('a^(1/3)', { a: LENGTH }).dimension.L).toBeCloseTo(1 / 3, 12);
  });

  it('rejects a function/named-constant in an exponent (deliberate narrowing)', () => {
    // Constant exponents are restricted to literal arithmetic (+ - * / ^, unary
    // minus). A function or named constant in exponent position — never used by
    // real physics, which has literal-rational exponents — is rejected.
    expect(() => b.parse('a^sqrt(4)', { a: LENGTH })).toThrow(FormulaDimensionError);
  });
});

describe('grammar gap — faithful transcendental / abs nodes (Path B)', () => {
  it('emits a transcendental node for exp() of a dimensionless arg', () => {
    const { expr } = b.parse('exp(x)', { x: DIMENSIONLESS });
    expect(expr.kind).toBe('transcendental');
    expect((expr as { fn: string }).fn).toBe('exp');
  });

  it('maps log() to the ln transcendental', () => {
    const { expr } = b.parse('log(x)', { x: DIMENSIONLESS });
    expect(expr.kind).toBe('transcendental');
    expect((expr as { fn: string }).fn).toBe('ln');
  });

  it('rejects a transcendental of a dimensional argument', () => {
    expect(() => b.parse('exp(x)', { x: ENERGY })).toThrow(FormulaDimensionError);
  });

  it('emits a dimension-preserving abs node', () => {
    const { expr, dimension } = b.parse('abs(x)', { x: LENGTH });
    expect(expr.kind).toBe('abs');
    expect(equals(dimension, LENGTH)).toBe(true);
  });
});

describe('SI names — elementary charge, energy, Euler', () => {
  const chargeSquared = multiply(CHARGE, CHARGE);

  it("parsePhysics('e^2') is the elementary charge squared", async () => {
    const parsed = await parsePhysics('e^2', {});
    expect(equals(parsed.dimension, chargeSquared)).toBe(true);
    expect(format(parsed.dimension)).not.toBe('[1]');
    expect(equals(b.parse('e^2', {}).dimension, chargeSquared)).toBe(true);
  });

  it('exp(1) is Euler\'s number, euler is refused, and a declared dimension still wins', async () => {
    const exp1 = await parsePhysics('exp(1)', {});
    expect(equals(exp1.dimension, DIMENSIONLESS)).toBe(true);
    expect(format(exp1.dimension)).toBe('[1]');
    expect(defaultFormulaParser.parse('exp(1)').evaluate({})).toBeCloseTo(Math.E, 12);
    await expect(parsePhysics('euler', {})).rejects.toThrow(/exp\(x\)/);
    expect(defaultFormulaParser.parse('e').evaluate({})).toBeCloseTo(E_SI, 15);
    expect(defaultFormulaParser.parse('e^2').evaluate({})).toBeCloseTo(E_SI * E_SI, 30);
    const named = await parsePhysics('E', {});
    expect(equals(named.dimension, ENERGY_NAMED)).toBe(true);
    expect(format(named.dimension)).toBe('[energy]');
    expect(equals(b.parse('e', { e: DIMENSIONLESS }).dimension, DIMENSIONLESS)).toBe(true);
  });
});

describe('parsePhysics — MathTS front-end', () => {
  it('parses to expr + dimension', async () => {
    const { expr, dimension } = await parsePhysics('a*b', { a: LENGTH, b: TIME });
    expect(expr).toBeDefined();
    expect(equals(dimension, { L: 1, M: 0, T: 1, I: 0, Theta: 0, N: 0, J: 0 })).toBe(true);
  });

  it('emits a transcendental node and rejects a dimensional arg', async () => {
    const { expr } = await parsePhysics('exp(x)', { x: DIMENSIONLESS });
    expect(expr.kind).toBe('transcendental');
    await expect(parsePhysics('exp(x)', { x: ENERGY })).rejects.toThrow(FormulaDimensionError);
  });
});
