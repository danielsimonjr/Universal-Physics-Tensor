/**
 * `makeRegime`: the one builder behind every atlas regime literal
 * `{ family, inequalities, groupDefinitions: deriveRegimeGroups(…) }`. The
 * migration must not move the published atlas artifacts, so the three family
 * files are compared with a fresh serialisation here; the control shows the
 * comparison can fail.
 *
 * The comparison is exact on every field except `delta`, which is compared at
 * 1e-11 relative: four `delta` values in `diffusion.json` and `waves.json`
 * moved in their last digits (4e-15 to 6e-12 relative) when the closed-form
 * bounds were reworked for precision in their own limit, before this test
 * existed, and the artifacts were not regenerated then. `oscillators.json` is
 * held byte for byte. Regime groups and inequalities, the fields this builder
 * owns, are exact everywhere.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { toAtlasJson } from '../../src/atlas/serialize.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { ACCELERATION, LENGTH } from '../../src/dimensional/types.js';
import { deriveRegimeGroups, makeRegime } from '../../src/relations/regime.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string): string => readFileSync(resolve(here, '../../', rel), 'utf-8');
const pkg = JSON.parse(read('package.json')) as { version: string };
const witnessResults = JSON.parse(read('data/atlas/witness-results.json')) as WitnessResultsArtifact;

const PENDULUM_PARAMS = [
  { name: 'g', dim: ACCELERATION },
  { name: 'ell', dim: LENGTH },
];
const PENDULUM_INEQ = [{ group: 'theta0', op: '<=' as const, bound: 0.5, alias: 'θ0 ≤ 0.5 rad' }];

describe('makeRegime', () => {
  it('builds exactly the literal it replaces', () => {
    expect(makeRegime('oscillators', PENDULUM_PARAMS, ['theta0'], PENDULUM_INEQ)).toEqual({
      family: 'oscillators',
      inequalities: PENDULUM_INEQ,
      groupDefinitions: deriveRegimeGroups('oscillators', PENDULUM_PARAMS, ['theta0']),
    });
  });

  it('an empty inequality list is a regime with nothing to check, as the model regimes are', () => {
    const r = makeRegime('oscillators', PENDULUM_PARAMS, [], []);
    expect(r.inequalities).toEqual([]);
    expect(Object.keys(r.groupDefinitions)).toEqual([]);
  });

  it('control: the dimensionless inputs reach the groups, so a dropped input changes the regime', () => {
    const withInput = makeRegime('oscillators', PENDULUM_PARAMS, ['theta0'], PENDULUM_INEQ);
    const without = makeRegime('oscillators', PENDULUM_PARAMS, [], PENDULUM_INEQ);
    expect(Object.keys(withInput.groupDefinitions)).toEqual(['theta0']);
    expect(withInput).not.toEqual(without);
  });
});

/** Every path at which two JSON trees differ, with `delta` numbers allowed 1e-11 relative. */
function differences(a: unknown, b: unknown, path = '$'): string[] {
  if (typeof a === 'number' && typeof b === 'number') {
    const key = path.slice(path.lastIndexOf('.') + 1);
    if (key === 'delta' && Math.abs(a - b) <= 1e-11 * Math.max(Math.abs(a), Math.abs(b))) return [];
    return Object.is(a, b) ? [] : [`${path}: ${a} vs ${b}`];
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${path}: length ${a.length} vs ${b.length}`];
    return a.flatMap((x, i) => differences(x, b[i], `${path}[${i}]`));
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.join(',') !== kb.join(',')) return [`${path}: keys ${ka.join(',')} vs ${kb.join(',')}`];
    return ka.flatMap((k) => differences((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`));
  }
  return Object.is(a, b) ? [] : [`${path}: ${String(a)} vs ${String(b)}`];
}

describe('the published atlas artifacts against a fresh serialisation', () => {
  for (const family of ATLAS_FAMILIES) {
    it(`data/atlas/${family.family}.json: exact except delta at 1e-11 relative`, () => {
      const fresh = toAtlasJson(family, pkg.version, witnessResults);
      const committed = JSON.parse(read(`data/atlas/${family.family}.json`)) as unknown;
      expect(differences(JSON.parse(JSON.stringify(fresh)), committed)).toEqual([]);
    });
  }

  it('data/atlas/oscillators.json is byte-identical', () => {
    const family = ATLAS_FAMILIES.find((f) => f.family === 'oscillators');
    if (family === undefined) throw new Error('no oscillators family');
    const fresh = JSON.stringify(toAtlasJson(family, pkg.version, witnessResults), null, 2) + '\n';
    expect(fresh).toBe(read('data/atlas/oscillators.json'));
  });

  it('control: the comparison sees a changed regime group', () => {
    const a = { regime: { groupDefinitions: { theta0: { exponents: { theta0: 1 } } } }, delta: 0.1 };
    const b = { regime: { groupDefinitions: { theta0: { exponents: { theta0: 2 } } } }, delta: 0.1 * (1 + 1e-13) };
    expect(differences(a, b)).toEqual(['$.regime.groupDefinitions.theta0.exponents.theta0: 1 vs 2']);
  });
});
