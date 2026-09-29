/**
 * Parentheses and named dimensions in `upt derive` specs.
 */
import { describe, expect, it } from 'vitest';
import { parseDimensionSpec } from '../../src/dimensional/dimension-spec.js';

describe('dimension specs with grouping and lab names', () => {
  it('respects parentheses in a quotient', () => {
    const grouped = parseDimensionSpec('power/(area*temperature^4)');
    const explicit = parseDimensionSpec('M.T^-3.Theta^-4');
    expect(grouped).toEqual(explicit);
  });

  it('accepts pressure, density, volume, viscosity, resistance and magnetic field', () => {
    expect(parseDimensionSpec('pressure')).toEqual(parseDimensionSpec('force/area'));
    expect(parseDimensionSpec('density')).toEqual(parseDimensionSpec('mass/volume'));
    expect(parseDimensionSpec('volume')).toEqual(parseDimensionSpec('L^3'));
    expect(parseDimensionSpec('mass/length^3')).toEqual(parseDimensionSpec('density'));
    expect(parseDimensionSpec('M/L^3')).toEqual(parseDimensionSpec('density'));
    expect(parseDimensionSpec('viscosity')).toEqual(parseDimensionSpec('M.L^-1.T^-1'));
    expect(parseDimensionSpec('resistance')).toEqual(parseDimensionSpec('M.L^2.T^-3.I^-2'));
    expect(parseDimensionSpec('magnetic_field')).toEqual(parseDimensionSpec('M.T^-2.I^-1'));
  });

  it('still reads a fractional base exponent', () => {
    expect(parseDimensionSpec('T^1/2').T).toBeCloseTo(0.5);
  });
});
