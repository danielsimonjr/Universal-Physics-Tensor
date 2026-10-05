/**
 * One mass-density dimension. Each former copy compares `equals` to the
 * export in `src/dimensional/types.ts`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BE19_LQC_FRIEDMANN_STRUCTURAL } from '../../src/bridges/equations/be-19-quantum-bounce.js';
import {
  BE20_VACUUM_ENERGY_LHS,
  MASS_DENSITY as fromBe20,
} from '../../src/bridges/equations/be-20-vacuum-energy.js';
import { BE54_BRANE_FRIEDMANN_STRUCTURAL } from '../../src/bridges/equations/be-54-randall-sundrum-brane.js';
import { be19Edge } from '../../src/composition/edges/catalog-tranche.js';
import { MASS_DENSITY as fromDims } from '../../src/composition/quantities/_dims.js';
import { equals } from '../../src/dimensional/algebra.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../../src/dimensional/bridge-check.js';
import { validateFriedmannEquation } from '../../src/dimensional/friedmann-equation.js';
import { MASS_DENSITY } from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { metricParams } from '../../src/numerical/spacetime-metrics.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

describe('one MASS_DENSITY', () => {
  it('is the same binding at the two former exports', () => {
    expect(fromBe20).toBe(MASS_DENSITY);
    expect(fromDims).toBe(MASS_DENSITY);
  });

  it('is the left-hand side of the vacuum-energy encoding', () => {
    expect(BE20_VACUUM_ENERGY_LHS.kind).toBe('symbol');
    if (BE20_VACUUM_ENERGY_LHS.kind !== 'symbol') return;
    expect(equals(BE20_VACUUM_ENERGY_LHS.dim, MASS_DENSITY)).toBe(true);
  });

  it('is the mass-density source of the catalog bounce edge', () => {
    expect(equals(be19Edge.sources[0]!.dim, MASS_DENSITY)).toBe(true);
  });

  it('is bridge 20 in the expected-dimension map', () => {
    expect(equals(EXPECTED_DIMENSION_BY_BRIDGE.get(20)!, MASS_DENSITY)).toBe(true);
  });

  it('is the density the Friedmann validator accepts', () => {
    const density = {
      kind: 'scalar-field' as const,
      name: 'rho',
      dim: MASS_DENSITY,
      symmetry: 'scalar' as const,
    };
    const node = {
      kind: 'friedmann-equation' as const,
      hubble: {
        kind: 'scalar-field' as const,
        name: 'H_squared',
        dim: T_INV2,
        symmetry: 'scalar' as const,
      },
      density,
      correction: null,
      variant: 'classical' as const,
      coupling: 'friedmann' as const,
    };
    expect(validateFriedmannEquation(node).variant).toBe('classical');
    expect(() =>
      validateFriedmannEquation({
        ...node,
        density: { ...density, dim: { ...MASS_DENSITY, L: -2 } },
      }),
    ).toThrow(/dimension/);
  });

  it('is the density of the loop-quantum and brane encodings', () => {
    expect(equals(BE19_LQC_FRIEDMANN_STRUCTURAL.density.dim, MASS_DENSITY)).toBe(true);
    expect(equals(BE54_BRANE_FRIEDMANN_STRUCTURAL.density.dim, MASS_DENSITY)).toBe(true);
  });

  it('is the FLRW density parameter', () => {
    expect(metricParams(['rho=1kg/m^3'], { rho: 0 }).values.rho).toBe(1);
    expect(() => metricParams(['rho=1J/m^3'], { rho: 0 })).toThrow();
  });

  it('keeps admitApproximation defined in the atlas regime module', () => {
    const source = readFileSync(resolve(root, 'src/atlas/regime.ts'), 'utf8');
    expect(source).toMatch(/export function admitApproximation/);
  });
});
