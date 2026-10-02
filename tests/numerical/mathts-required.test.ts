/**
 * MathTS is the only formula parser and the only tensor engine.
 *
 * Written against the tree that still had Path B and `Float64ReferenceEngine`.
 * Importing those modules must fail once they are gone. `1-e^2` with no
 * binding stays near 1 because bare `e` is the elementary charge, and
 * `exp(1)` is Euler's number.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getFormulaParser } from '../../src/numerical/formula-registry.js';

describe('MathTS is required', () => {
  it('1-e^2 with no binding is near 1, and exp(1) is Euler', async () => {
    const parser = await getFormulaParser();
    expect(parser.parse('1-e^2').evaluate({})).toBeCloseTo(1, 5);
    expect(parser.parse('exp(1)').evaluate({})).toBeCloseTo(Math.E, 12);
  });

  it('a deep import of Path B and Float64ReferenceEngine fails', async () => {
    const load = new Function('spec', 'return import(spec)') as (spec: string) => Promise<unknown>;
    const missing = (name: string) => new URL(`../../src/numerical/${name}`, import.meta.url).href;
    await expect(load(missing('formula.js'))).rejects.toThrow();
    await expect(load(missing('float64-engine.js'))).rejects.toThrow();
  });

  it('the engine registry does not construct Float64ReferenceEngine', () => {
    const src = readFileSync(new URL('../../src/numerical/engine-registry.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/Float64ReferenceEngine/);
  });
});
