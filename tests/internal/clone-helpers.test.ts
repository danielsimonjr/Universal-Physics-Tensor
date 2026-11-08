/**
 * Each shared helper that replaced a code duplicate exists, and every former
 * copy calls it. A copy that comes back fails here before it drifts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hermiteCrossingFraction } from '../../src/numerical/hermite-crossing.js';
import { requireMetricClosures } from '../../src/numerical/lowering-utils.js';
import type { NumericalInputs } from '../../src/numerical/types.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { allAtlasBridges, enumerateAtlasRoutes, findAtlasPath } from '../../src/atlas/path-bound.js';
import { compareChainOrder } from '../../src/composition/chain-candidate.js';
import { SUPERSCRIPT, sideTokens, splitPrefix } from '../../src/dimensional/unit-data.js';
import { lower, metric, raise } from '../../src/dimensional/metric.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (rel: string): string => readFileSync(join(root, rel), 'utf8');

describe('hermiteCrossingFraction', () => {
  it('finds the root of the linear interpolant p0 = 1, p1 = -1 with matching slopes at s = 0.5', () => {
    expect(hermiteCrossingFraction(1, -2, -1, -2)).toBeCloseTo(0.5, 14);
  });

  it('converges to the cubic root when the secant start is far from it (0 or 1 Newton steps do not)', () => {
    // Root measured with mpmath at 50 digits: 0.84524359124347405207240223211170631858824432335753.
    // The secant start p0 / (p0 - p1) = 0.909 is 6.4e-2 away; one Newton step leaves 1.1e-2.
    const root = 0.845243591243474052072402232111706;
    expect(Math.abs(hermiteCrossingFraction(1, -0.2, -0.1, -0.3) - root)).toBeLessThan(1e-13);
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

describe('compareChainOrder (chain-candidate.ts)', () => {
  it('orders by class first, then by edge ids', () => {
    expect(compareChainOrder('confirmation', ['z', 'z'], 'restatement', ['a'])).toBe(-1);
    expect(compareChainOrder('unfixed-shape', ['a'], 'unique-monomial', ['a'])).toBe(1);
    expect(compareChainOrder('restatement', ['a'], 'restatement', ['a', 'b'])).toBe(-1);
    expect(compareChainOrder('restatement', ['b'], 'restatement', ['a'])).toBe(1);
    expect(compareChainOrder('restatement', ['a'], 'restatement', ['a'])).toBe(0);
  });

  it('is the one comparator: both sorts call it', () => {
    expect(src('src/composition/chain-candidate.ts')).toContain('compareChainOrder(a.kind, a.edgeIds, b.kind, b.edgeIds)');
    expect(src('src/composition/chain-result.ts')).toContain('compareChainOrder(chainOrderKey(a), a.edgeIds, chainOrderKey(b), b.edgeIds)');
  });
});

describe('requireMetricClosures (numerical/lowering-utils.ts)', () => {
  const inputs = { tensors: new Map(), fields: new Map([['h', () => [[1]]]]) } as unknown as NumericalInputs;
  const tail = 'Got fields=[h].';

  it('keeps the message of each of the four lowerings', () => {
    expect(() => requireMetricClosures('weyl-tensor', inputs, 'g', 'g_inv')).toThrow(
      `lowering: weyl-tensor requires coordinate-dependent metric closures in inputs.fields for "g" and "g_inv". ${tail}`,
    );
    expect(() => requireMetricClosures('kretschmann-scalar', inputs, 'g', 'g_inv')).toThrow(
      `lowering: kretschmann-scalar requires coordinate-dependent metric closures in inputs.fields for "g" and "g_inv". ${tail}`,
    );
    expect(() => requireMetricClosures('bianchi-residual', inputs, 'g', 'gInv')).toThrow(
      `lowering: bianchi-residual numerical evaluation requires coordinate-dependent metric closures in inputs.fields for "g" and "gInv". ${tail}`,
    );
    expect(() => requireMetricClosures('riemann-tensor', inputs, 'g', 'gInv')).toThrow(
      'lowering: riemann-tensor numerical evaluation requires coordinate-dependent metric closures in inputs.fields for "g" and "gInv" ' +
        `(constant-metric Riemann is identically zero — the test wouldn't fire here). ${tail}`,
    );
  });

  it('returns both closures when both are present', () => {
    const g = (): number[][] => [[1]];
    const gi = (): number[][] => [[2]];
    const both = { tensors: new Map(), fields: new Map([['g', g], ['g_inv', gi]]) } as unknown as NumericalInputs;
    expect(requireMetricClosures('weyl-tensor', both, 'g', 'g_inv')).toEqual({ gFn: g, gInverseFn: gi });
  });

  it('is the one check: the four lowerings call it', () => {
    const helpers = src('src/numerical/curvature-lowering-helpers.ts');
    for (const kind of ['bianchi-residual', 'weyl-tensor', 'kretschmann-scalar']) {
      expect(helpers).toContain(`requireMetricClosures('${kind}', inputs,`);
    }
    expect(src('src/numerical/lowering.ts')).toContain("requireMetricClosures('riemann-tensor', inputs, gName, gInvName)");
    expect(helpers).not.toContain('metric closures in');
  });
});

describe('splitPrefix, SUPERSCRIPT and sideTokens (dimensional/unit-data.ts)', () => {
  it('reads the first prefix of the table that leaves a prefixable unit', () => {
    expect(splitPrefix('km')).toMatchObject({ prefix: 'k', base: 'm' });
    expect(splitPrefix('k')).toBeNull();
    expect(splitPrefix('xyz')).toBeNull();
  });

  it('splits one side of a unit text into factor tokens', () => {
    expect(sideTokens('kg*m·s  A.V')).toEqual(['kg', 'm', 's', 'A', 'V']);
    expect(SUPERSCRIPT['⁻²']).toBe(-2);
  });

  it('is the one prefix scan: the four readers call it and keep their own exact-symbol answer', () => {
    const delegation = src('src/dimensional/mathts-unit-delegation.ts');
    const wrapper = src('src/dimensional/mathts-unit-wrapper.ts');
    const units = src('src/dimensional/units.ts');
    expect(delegation).toContain('if (UNITS.has(sym)) return { base: sym };\n  const split = splitPrefix(sym);');
    expect(units).toContain('if (UNITS.has(symbol)) return null;\n  return splitPrefix(symbol)?.base ?? null;');
    expect(units).toContain('const split = splitPrefix(sym);');
    expect(wrapper).toContain('tryOneFactorBase(token)');
    for (const [file, text] of [['delegation', delegation], ['wrapper', wrapper], ['units', units]] as const) {
      expect(text, file).not.toMatch(/startsWith\(p(refix)?\) \|\|/);
      expect(text, file).not.toContain("const SUPERSCRIPT");
      expect(text, file).not.toContain('function sideTokens');
    }
  });
});
