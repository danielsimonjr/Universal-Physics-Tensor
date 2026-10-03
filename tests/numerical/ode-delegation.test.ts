/**
 * The fixed-step RK4 geodesic integrators call MathTS. The symplectic GL4
 * integrator and the uncertainty function stay.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

describe('ODE delegation', () => {
  it('the fixed-step RK4 integrators call solveODESystem', () => {
    expect(source('../../src/numerical/geodesic-integrator.ts')).toMatch(/solveODESystem/);
    expect(source('../../src/numerical/null-ray-integrator.ts')).toMatch(/solveODESystem/);
  });

  it('gl4-integrator.ts is still present and does not call solveODE', () => {
    const src = source('../../src/numerical/gl4-integrator.ts');
    expect(src).toMatch(/integrateGeodesicGL4/);
    expect(src).not.toMatch(/solveODE/);
  });

  it('composition/uncertainty.ts does not call solveODE', () => {
    expect(source('../../src/composition/uncertainty.ts')).not.toMatch(/solveODE/);
  });
});
