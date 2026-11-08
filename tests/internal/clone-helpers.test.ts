/**
 * Each shared helper that replaced a code duplicate exists, and every former
 * copy calls it. A copy that comes back fails here before it drifts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hermiteCrossingFraction } from '../../src/numerical/hermite-crossing.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { allAtlasBridges, enumerateAtlasRoutes, findAtlasPath } from '../../src/atlas/path-bound.js';
import { lower, metric, raise } from '../../src/dimensional/metric.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (rel: string): string => readFileSync(join(root, rel), 'utf8');

describe('hermiteCrossingFraction', () => {
  it('finds the root of the linear interpolant p0 = 1, p1 = -1 with matching slopes at s = 0.5', () => {
    expect(hermiteCrossingFraction(1, -2, -1, -2)).toBeCloseTo(0.5, 14);
  });

  it('is the one copy: both oscillator witnesses call it and keep no local interpolant', () => {
    for (const file of ['src/atlas/oscillators/limit-witnesses.ts', 'src/atlas/oscillators/norm-transport-witness.ts']) {
      const text = src(file);
      expect(text, file).toContain('hermiteCrossingFraction(');
      expect(text, file).not.toMatch(/const dp = \(s: number\)/);
    }
  });
});

describe('raiseOrLower (metric.ts)', () => {
  const g_inv = metric('g_inv', [{ label: 'α', variance: 'upper' }, { label: 'β', variance: 'upper' }], DIMENSIONLESS, '+,-,-,-');
  const g = metric('g', [{ label: 'α', variance: 'lower' }, { label: 'β', variance: 'lower' }], DIMENSIONLESS, '+,-,-,-');
  const A_lower = tsym('A', [{ label: 'μ', variance: 'lower' }], DIMENSIONLESS);
  const A_upper = tsym('A', [{ label: 'μ', variance: 'upper' }], DIMENSIONLESS);

  it('keeps each of the six raise() and lower() messages', () => {
    expect(() => raise(A_lower, g, 'μ')).toThrow("raise() requires both indices of the inverse metric to have variance 'upper'");
    expect(() => lower(A_upper, g_inv, 'μ')).toThrow("lower() requires both indices of the metric to have variance 'lower'");
    expect(() => raise(A_lower, g_inv, 'ν')).toThrow("raise(): label 'ν' is not a free index of the operand. Operand free indices: μ.");
    expect(() => lower(A_upper, g, 'ν')).toThrow("lower(): label 'ν' is not a free index of the operand. Operand free indices: μ.");
    expect(() => raise(A_upper, g_inv, 'μ')).toThrow(
      "raise(): label 'μ' is already 'upper' in the operand. Use lower() to lower it, or pick a different label.",
    );
    expect(() => lower(A_lower, g, 'μ')).toThrow(
      "lower(): label 'μ' is already 'lower' in the operand. Use raise() to raise it, or pick a different label.",
    );
  });

  it('builds the renamed metric with the variance of the call', () => {
    expect(raise(A_lower, g_inv, 'μ').args[0]).toEqual({
      kind: 'metric-tensor',
      name: 'g_inv',
      indices: [{ label: 'μ', variance: 'upper' }, { label: 'β_1', variance: 'upper' }],
      signature: '+,-,-,-',
      dim: DIMENSIONLESS,
    });
    expect(lower(A_upper, g, 'μ').args[0]).toEqual({
      kind: 'metric-tensor',
      name: 'g',
      indices: [{ label: 'μ', variance: 'lower' }, { label: 'β_1', variance: 'lower' }],
      signature: '+,-,-,-',
      dim: DIMENSIONLESS,
    });
  });

  it('is the one body: raise() and lower() delegate to it', () => {
    const text = src('src/dimensional/metric.ts');
    expect(text).toContain("return raiseOrLower(operand, gInverse, label, 'upper');");
    expect(text).toContain("return raiseOrLower(operand, g, label, 'lower');");
  });
});

describe('requireAtlasEndpoints and allAtlasBridges (path-bound.ts)', () => {
  it('keeps each caller name in the endpoint message', () => {
    expect(() => findAtlasPath('model-nope', 'model-lc')).toThrow("findAtlasPath: 'model-nope' is not a model of any atlas family");
    expect(() => enumerateAtlasRoutes('model-pendulum', 'model-nope', 1)).toThrow(
      "enumerateAtlasRoutes: 'model-nope' is not a model of any atlas family",
    );
  });

  it('lists every bridge in family order, and the callers use the one list', () => {
    expect(allAtlasBridges()).toEqual(ATLAS_FAMILIES.flatMap((f) => f.bridges));
    expect(src('src/atlas/path-bound.ts').match(/ATLAS_FAMILIES\.flatMap\(\(f\) => f\.bridges\)/g)).toHaveLength(1);
    expect(src('src/cli/commands/_atlas-map.ts')).not.toContain('ATLAS_FAMILIES.flatMap((f) => f.bridges)');
  });
});
