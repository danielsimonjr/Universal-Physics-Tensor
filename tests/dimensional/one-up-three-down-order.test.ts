/**
 * The order of the checks in validateRiemannTensor and validateWeylTensor.
 * Each node below is bad on two axes. The test names the error that comes first.
 * The shared one-up-three-down checks must not change that order.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateRiemannTensor } from '../../src/dimensional/connection-validators.js';
import { validateWeylTensor } from '../../src/dimensional/weyl-validators.js';
import type { RiemannTensorNode, WeylTensorNode } from '../../src/dimensional/ast-types.js';
import { metric } from '../../src/dimensional/metric.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { DIMENSIONLESS, LENGTH } from '../../src/dimensional/types.js';
import {
  IndexLabelCollisionError,
  MetricSignatureError,
  PartialDerivativeIndexVarianceError,
} from '../../src/dimensional/errors.js';

const lowerG = metric('g', [{ label: 'a', variance: 'lower' }, { label: 'b', variance: 'lower' }], DIMENSIONLESS, '+,-,-,-');
const upperG = metric('gInv', [{ label: 'a', variance: 'upper' }, { label: 'b', variance: 'upper' }], DIMENSIONLESS, '+,-,-,-');
const xCoord = tsym('x', [{ label: 'α', variance: 'upper' }], LENGTH, 'coordinate');

const riemann = (over: Partial<RiemannTensorNode>): RiemannTensorNode =>
  ({
    kind: 'riemann-tensor',
    upperIndex: { label: 'ρ', variance: 'upper' },
    lowerIndices: [
      { label: 'σ', variance: 'lower' },
      { label: 'μ', variance: 'lower' },
      { label: 'ν', variance: 'lower' },
    ],
    gLower: lowerG,
    gInverse: upperG,
    xCoord,
    ...over,
  }) as RiemannTensorNode;

const weyl = (over: Partial<WeylTensorNode>): WeylTensorNode =>
  ({
    kind: 'weyl-tensor',
    metric: lowerG,
    upperIndex: { label: 'ρ', variance: 'upper' },
    lowerIndices: [
      { label: 'σ', variance: 'lower' },
      { label: 'μ', variance: 'lower' },
      { label: 'ν', variance: 'lower' },
    ],
    componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
    ...over,
  }) as WeylTensorNode;

const collide = [
  { label: 'ρ', variance: 'lower' },
  { label: 'μ', variance: 'lower' },
  { label: 'ν', variance: 'lower' },
] as unknown as RiemannTensorNode['lowerIndices'];
const badVariance = [
  { label: 'σ', variance: 'upper' },
  { label: 'ρ', variance: 'lower' },
  { label: 'ν', variance: 'lower' },
] as unknown as RiemannTensorNode['lowerIndices'];

describe('validateRiemannTensor: the first error of a node bad on two axes', () => {
  it('index variance comes before the metric signature', () => {
    expect(() => validateRiemannTensor(riemann({ lowerIndices: badVariance, gLower: upperG }))).toThrow(
      PartialDerivativeIndexVarianceError,
    );
  });
  it('the gLower signature comes before the gInverse signature', () => {
    expect(() => validateRiemannTensor(riemann({ gLower: upperG, gInverse: lowerG }))).toThrow(/gLower to be both-lower/);
  });
  it('the metric signature comes before a label collision', () => {
    expect(() => validateRiemannTensor(riemann({ lowerIndices: collide, gInverse: lowerG }))).toThrow(MetricSignatureError);
  });
  it('index variance comes before a label collision', () => {
    expect(() => validateRiemannTensor(riemann({ lowerIndices: badVariance }))).toThrow(
      "riemann-tensor: lowerIndices[0] 'σ' must be 'lower', got 'upper'",
    );
    expect(() => validateRiemannTensor(riemann({ lowerIndices: collide }))).toThrow(IndexLabelCollisionError);
  });
});

describe('validateWeylTensor: the first error of a node bad on two axes', () => {
  it('index variance comes before a label collision', () => {
    expect(() => validateWeylTensor(weyl({ lowerIndices: badVariance as WeylTensorNode['lowerIndices'] }))).toThrow(
      "weyl-tensor: lowerIndices[0] 'σ' must be 'lower', got 'upper'",
    );
    expect(() => validateWeylTensor(weyl({ lowerIndices: collide as WeylTensorNode['lowerIndices'] }))).toThrow(
      IndexLabelCollisionError,
    );
  });
});

describe('the one-up-three-down checks are shared', () => {
  it('both validators call the two shared pieces', () => {
    for (const file of ['connection-validators.ts', 'weyl-validators.ts']) {
      const text = readFileSync(new URL(`../../src/dimensional/${file}`, import.meta.url), 'utf8');
      expect(text, file).toMatch(/requireOneUpThreeDownVariance\('(riemann|weyl)-tensor', node\)/);
      expect(text, file).toMatch(/oneUpThreeDownFreeIndices\('(riemann|weyl)-tensor', node\)/);
    }
  });
});
