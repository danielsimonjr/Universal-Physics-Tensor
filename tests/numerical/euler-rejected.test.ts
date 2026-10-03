/**
 * Euler's number is only `exp(x)`. The name `euler` is not a constant.
 * A bare `e` stays the elementary charge. `E` stays energy.
 */
import { describe, expect, it } from 'vitest';
import { E_SI } from '../../src/core/constants.js';
import { FormulaError } from '../../src/numerical/formula-contract.js';
import { mathtsFormulaParser as defaultFormulaParser } from '../../src/numerical/formula-mathts.js';
import { ENERGY, DIMENSIONLESS } from '../../src/dimensional/types.js';
import { equals } from '../../src/dimensional/algebra.js';
import { parsePhysics } from '../../src/numerical/formula-registry.js';
import { readBinding } from '../../src/numerical/binding-value.js';

describe('euler is not Euler\'s number', () => {
  it('the builtin parser rejects euler and names exp(x)', () => {
    expect(() => defaultFormulaParser.parse('euler')).toThrow(FormulaError);
    expect(() => defaultFormulaParser.parse('euler')).toThrow(/exp\(x\)/);
    expect(() => defaultFormulaParser.parse('2*euler')).toThrow(/exp\(x\)/);
    expect(defaultFormulaParser.parse('exp(1)').evaluate({})).toBeCloseTo(Math.E, 12);
    expect(defaultFormulaParser.parse('exp(2)').evaluate({})).toBeCloseTo(Math.exp(2), 12);
    expect(defaultFormulaParser.parse('e').evaluate({})).toBeCloseTo(E_SI, 15);
  });

  it('parsePhysics rejects euler, keeps e as charge and E as energy, and exp(1) is dimensionless', async () => {
    await expect(parsePhysics('euler', {})).rejects.toThrow(/exp\(x\)/);
    const charge = await parsePhysics('e', {});
    expect(equals(charge.dimension, { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: 0, J: 0 })).toBe(true);
    const energy = await parsePhysics('E', {});
    expect(equals(energy.dimension, ENERGY)).toBe(true);
    const euler = await parsePhysics('exp(1)', {});
    expect(equals(euler.dimension, DIMENSIONLESS)).toBe(true);
  });

  it('a binding value named euler suggests exp(x) instead of Math.E', () => {
    expect(() => readBinding('euler')).toThrow(/exp\(x\)/);
    expect(readBinding('exp(1)').value).toBeCloseTo(Math.E, 12);
  });
});
