/**
 * BE-70 Einstein relation. Dropping the carrier charge is a different diffusivity.
 * @module tests/bridges/be-70-einstein-relation
 */
import { describe, expect, it } from 'vitest';
import { evaluateEinsteinRelation } from '../../src/bridges/be70-einstein-relation.js';
import { K_B_SI } from '../../src/core/constants.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { be70Edge } from '../../src/composition/edges/applied-physicist.js';
import { runCli } from '../../src/cli/main.js';

const Q = 1.602176634e-19;

describe('BE-70 Einstein relation', () => {
  it('is μ k_B T / q, and q = 1 is not that number', () => {
    const row = evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: Q });
    expect(row.D_m2_per_s).toBe((1e-8 * K_B_SI * 300) / Q);
    expect(evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: 1 }).D_m2_per_s).not.toBe(row.D_m2_per_s);
  });

  it('rejects a zero charge', () => {
    expect(() => evaluateEinsteinRelation({ mu_m2_per_Vs: 1, T_K: 300, q_C: 0 })).toThrow(/q_C/);
  });

  it('rejects opposite signs of μ and q, and keeps a matching pair', () => {
    expect(() => evaluateEinsteinRelation({ mu_m2_per_Vs: 0.14, T_K: 300, q_C: -Q })).toThrow(/same sign/);
    expect(() => evaluateEinsteinRelation({ mu_m2_per_Vs: -0.14, T_K: 300, q_C: Q })).toThrow(/same sign/);
    const both = evaluateEinsteinRelation({ mu_m2_per_Vs: -0.14, T_K: 300, q_C: -Q });
    expect(both.D_m2_per_s).toBe((0.14 * K_B_SI * 300) / Q);
    expect(evaluateEinsteinRelation({ mu_m2_per_Vs: 0, T_K: 300, q_C: Q }).D_m2_per_s).toBe(0);
    const point = {
      'electrical-mobility': 0.14,
      'einstein-temperature': 300,
      'carrier-charge': -Q,
    };
    expect(be70Edge.domain.predicate(point)).toBe(false);
    expect(
      be70Edge.domain.predicate({
        'electrical-mobility': -0.14,
        'einstein-temperature': 300,
        'carrier-charge': -Q,
      }),
    ).toBe(true);
  });

  it('upt evaluate be-70 exits 1 when the signs disagree and prints the positive diffusivity when they agree', async () => {
    const lines: string[] = [];
    const io = {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    };
    const bad = await runCli(
      ['evaluate', 'be-70', 'mu_m2_per_Vs=0.14', 'T_K=300', 'q_C=-1.602176634e-19'],
      io,
    );
    expect(bad).toBe(1);
    expect(lines.join('')).toMatch(/same sign/);
    lines.length = 0;
    const good = await runCli(
      ['evaluate', 'be-70', 'mu_m2_per_Vs=-0.14', 'T_K=300', 'q_C=-1.602176634e-19'],
      io,
    );
    expect(good).toBe(0);
    expect(lines.join('')).toContain('D_m2_per_s = 0.0036192799701009757');
    expect(lines.join('')).not.toContain('D_m2_per_s = -');
  });

  it('the formalRef is diffusion_eq', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 70)!;
    expect(entry.bridges).toEqual(['kinetic', 'electromagnetic']);
    expect(catalogFormalRef(70)?.statement).toBe('PhysJS.EinsteinRelation.diffusion_eq');
    expect(catalogFormalRef(70)?.kind).toBe('bridge');
  });
});
