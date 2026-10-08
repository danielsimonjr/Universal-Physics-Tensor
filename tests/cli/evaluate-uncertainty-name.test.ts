/**
 * The evaluator uncertainty engine is a numerical module, not a CLI helper,
 * and it is not the graph-layer `propagateUncertainty`. Correlations and the
 * curvature ratio stay on the engine. The CLI module defines no numerics.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as engine from '../../src/numerical/evaluator-uncertainty.js';
import * as evaluateCommand from '../../src/cli/commands/evaluate.js';
import { propagateUncertainty } from '../../src/composition/uncertainty.js';
import { catalogEdgeKey } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/index.js';

const edge42 = catalogEdge(catalogEdgeKey(42));

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('evaluator uncertainty engine', () => {
  it('lives in numerical/, is not named propagateUncertainty, and the CLI module defines none of it', () => {
    expect('propagateUncertainty' in engine).toBe(false);
    expect(typeof engine.propagateEvaluatorUncertainty).toBe('function');
    expect(engine.propagateEvaluatorUncertainty).not.toBe(propagateUncertainty);
    expect('propagateEvaluatorUncertainty' in evaluateCommand).toBe(false);
    const engineSource = readFileSync(resolve(root, 'src/numerical/evaluator-uncertainty.ts'), 'utf8');
    expect(engineSource).not.toContain('composition/uncertainty');
    expect(engineSource).not.toMatch(/export function propagateUncertainty\b/);
    const publicSurface = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(publicSurface).toContain('propagateUncertainty');
  });

  it('keeps pairwise correlations and the curvature ratio', () => {
    const linear = engine.propagateEvaluatorUncertainty(
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

    const curved = engine.propagateEvaluatorUncertainty(
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
    const result = propagateUncertainty(edge42, { mass: 1.989e30 }, { mass: 1e24 });
    expect(result.sigma).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('contributions');
  });
});
