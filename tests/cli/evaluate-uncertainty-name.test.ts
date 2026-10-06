/**
 * The CLI uncertainty helper is not the graph-layer `propagateUncertainty`.
 * Correlations and the curvature ratio stay on the CLI helper. The helper
 * does not call the graph-layer function.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as evaluateCommand from '../../src/cli/commands/evaluate.js';
import { propagateUncertainty } from '../../src/composition/uncertainty.js';
import { catalogEdgeKey } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/index.js';

const be42Edge = catalogEdge(catalogEdgeKey(42));

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('CLI evaluator uncertainty', () => {
  it('is not named propagateUncertainty and does not call the graph-layer function', () => {
    expect('propagateUncertainty' in evaluateCommand).toBe(false);
    expect(typeof evaluateCommand.propagateEvaluatorUncertainty).toBe('function');
    expect(evaluateCommand.propagateEvaluatorUncertainty).not.toBe(propagateUncertainty);
    const source = readFileSync(resolve(root, 'src/cli/commands/evaluate.ts'), 'utf8');
    expect(source).not.toContain('composition/uncertainty');
    expect(source).not.toMatch(/export function propagateUncertainty\b/);
    const publicSurface = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(publicSurface).toContain('propagateUncertainty');
  });

  it('keeps pairwise correlations and the curvature ratio', () => {
    const linear = evaluateCommand.propagateEvaluatorUncertainty(
      (inputs) => ({ y: (inputs.x ?? 0) + (inputs.z ?? 0) }),
      { x: 2, z: 3 },
      { x: 1, z: 1 },
      new Map([['x,z', 0.5]]),
    );
    expect(linear.y?.value).toBe(5);
    expect(linear.y?.u).toBeCloseTo(Math.sqrt(3), 8);
    expect(linear.y?.contributions.x?.curvatureRatio).toBeCloseTo(0, 8);
    expect(linear.y?.contributions.z?.curvatureRatio).toBeCloseTo(0, 8);
    expect(linear.y?.unreliable).toEqual([]);

    const curved = evaluateCommand.propagateEvaluatorUncertainty(
      (inputs) => ({ y: (inputs.x ?? 0) ** 2 }),
      { x: 2 },
      { x: 1 },
      new Map(),
    );
    expect(curved.y?.contributions.x?.sensitivity).toBeCloseTo(4, 6);
    expect(curved.y?.contributions.x?.curvatureRatio).toBeCloseTo(0.25, 6);
    expect(curved.y?.unreliable).toEqual(['x']);
  });

  it('the graph-layer function is still the public one', () => {
    const result = propagateUncertainty(be42Edge, { mass: 1.989e30 }, { mass: 1e24 });
    expect(result.sigma).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('contributions');
  });
});
