/**
 * S3.0 — the `Model` record (`src/atlas/model.ts`) and
 * `CanonicalEquation.model?`.
 *
 * Two properties carry the sprint's decision, so both are tested by breaking
 * them deliberately rather than by asserting the happy path alone:
 *
 *  1. The three Phase 3 fields are ABSENT on the nine Phase 0 models — not
 *     present-and-empty. An empty array would claim "this model has no
 *     boundary conditions"; absence claims only "not recorded".
 *  2. `serializeModel` enumerates fields explicitly, so a model that DOES
 *     record them serializes them, and one that does not emits no key at all.
 *     A positive control (a model carrying all three) proves the serializer
 *     is not simply blind to the fields.
 */
import { describe, it, expect } from 'vitest';
import { ATLAS_MODELS, getAtlasModel } from '../../src/atlas/oscillators/models.js';
import { toAtlasJson } from '../../src/atlas/serialize.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import type { AtlasModel } from '../../src/atlas/model.js';
import type { AtlasFamily } from '../../src/atlas/oscillators/index.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The committed witness results; `toAtlasJson` derives each bridge's evidence against them. */
const witnessResults = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../data/atlas/witness-results.json'), 'utf-8'),
) as WitnessResultsArtifact;

const PHASE_3_FIELDS = ['boundaryData', 'initialData', 'symmetryGroup'] as const;

describe('Model record — the three Phase 3 fields', () => {
  it('types the nine Phase 0 models, which keep all nine original fields', () => {
    for (const m of ATLAS_MODELS) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.stateSpace).toBe('string');
      expect(typeof m.dynamics).toBe('string');
      expect(m.family).toBe('oscillators');
      expect(m.observables.length).toBeGreaterThan(0);
      expect(m.regime.family).toBe('oscillators');
    }
    expect(ATLAS_MODELS).toHaveLength(9);
  });

  it('records NONE of the three on the nine models, by absence not by emptiness', () => {
    for (const m of ATLAS_MODELS) {
      for (const field of PHASE_3_FIELDS) {
        // `in` distinguishes "key missing" from "key present, value empty" —
        // `=== undefined` would pass for both, which is the whole point.
        expect(Object.prototype.hasOwnProperty.call(m, field)).toBe(false);
      }
    }
  });

  it('never carries an EMPTY boundaryData/initialData anywhere in the atlas', () => {
    for (const m of ATLAS_MODELS) {
      expect(m.boundaryData?.length ?? 1).toBeGreaterThan(0);
      expect(m.initialData?.length ?? 1).toBeGreaterThan(0);
    }
  });

  it('accepts a model that DOES record all three (positive control)', () => {
    const recorded: AtlasModel = {
      ...getAtlasModel('model-wave-1d'),
      boundaryData: ['u(0, t) = u(L, t) = 0'],
      initialData: ['u(x, 0) = f(x)', 'u_t(x, 0) = 0'],
      symmetryGroup: 'time translation',
    };
    expect(recorded.boundaryData).toEqual(['u(0, t) = u(L, t) = 0']);
    expect(recorded.initialData).toHaveLength(2);
    expect(recorded.symmetryGroup).toBe('time translation');
  });
});

describe('serializeModel — optional fields are appended, never spread', () => {
  const emitted = toAtlasJson(OSCILLATOR_FAMILY, '0.0.0-test', witnessResults) as unknown as {
    models: Array<Record<string, unknown>>;
  };

  it('emits no key for the three fields on the nine unrecorded models', () => {
    for (const m of emitted.models) {
      for (const field of PHASE_3_FIELDS) {
        expect(Object.prototype.hasOwnProperty.call(m, field)).toBe(false);
      }
      // The Phase 0 key set is unchanged, which is what keeps
      // `data/atlas/oscillators.json` byte-identical.
      expect(Object.keys(m)).toEqual([
        'id',
        'family',
        'stateSpace',
        'dynamics',
        'observables',
        'parameters',
        'dimensionlessInputs',
        'canonicalRefs',
        'regime',
      ]);
    }
  });

  it('emits all three when a model records them (positive control)', () => {
    const family: AtlasFamily = {
      ...OSCILLATOR_FAMILY,
      models: [
        {
          ...getAtlasModel('model-spring'),
          boundaryData: ['x bounded on ℝ'],
          initialData: ['x(0) = x₀', "x′(0) = 0"],
          symmetryGroup: 'time translation',
        },
      ],
    };
    const [model] = (
      toAtlasJson(family, '0.0.0-test', witnessResults) as unknown as {
        models: Array<Record<string, unknown>>;
      }
    ).models;
    expect(model?.boundaryData).toEqual(['x bounded on ℝ']);
    expect(model?.initialData).toEqual(['x(0) = x₀', "x′(0) = 0"]);
    expect(model?.symmetryGroup).toBe('time translation');
  });
});

describe('CanonicalEquation.model?', () => {
  it('is unrecorded on every existing entry — the field is additive', () => {
    const withModel = CANONICAL_EQUATIONS.filter((e) => e.model !== undefined);
    expect(withModel).toEqual([]);
  });

  it('references a model by its AtlasModel id when it is set', () => {
    const entry = { ...CANONICAL_EQUATIONS[0]!, model: 'model-spring' };
    expect(getAtlasModel(entry.model).id).toBe('model-spring');
  });
});
