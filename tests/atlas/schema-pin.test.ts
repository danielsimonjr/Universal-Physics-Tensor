/**
 * Atlas Phase 0 S0.6 — structural pin of `data/schemas/atlas-record.v0.json`.
 *
 * The schema is DOCUMENTATION: this tree carries no JSON-Schema validator and
 * adds no dependency to get one. So the schema's own field set is what is
 * pinned here — the `required` arrays and the `if/then` that makes a horizon
 * mandatory on an approximation. If someone loosens the schema, this fails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(resolve(here, '../../data/schemas/atlas-record.v0.json'), 'utf-8'),
) as Record<string, any>;

const def = (name: string): Record<string, any> => schema['definitions'][name];

describe('atlas-record.v0.json — top level', () => {
  it('is draft-07 and forbids unknown top-level keys', () => {
    expect(schema['$schema']).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema['type']).toBe('object');
    expect(schema['additionalProperties']).toBe(false);
  });

  it('requires exactly the six record fields', () => {
    expect(schema['required']).toEqual([
      'schemaVersion',
      'packageVersion',
      'family',
      'models',
      'bridges',
      'rejections',
    ]);
  });

  it('pins schemaVersion to the string "0"', () => {
    expect(schema['properties']['schemaVersion']['const']).toBe('0');
  });
});

describe('atlas-record.v0.json — definitions', () => {
  it('lists the eight Phase 0 relation kinds, in order', () => {
    expect(def('relationType')['enum']).toEqual([
      'derivation',
      'exact-equivalence',
      'restriction',
      'approximation',
      'coarse-graining',
      'analytic-continuation',
      'structural-analogy',
      'deformation-quantization',
    ]);
  });

  it('limitCharacter is regular | singular | unknown', () => {
    expect(def('limitCharacter')['enum']).toEqual(['regular', 'singular', 'unknown']);
  });

  it('approximationBound requires K, delta, norm, domain, horizon, limitCharacter and uniformity', () => {
    expect(def('approximationBound')['required']).toEqual([
      'K',
      'delta',
      'norm',
      'domain',
      'horizon',
      'limitCharacter',
      'uniformity',
    ]);
    expect(def('approximationBound')['properties']['horizon']['minLength']).toBe(1);
    expect(def('approximationBound')['properties']['uniformity']['type']).toEqual(['array', 'null']);
    expect(def('approximationBound')['additionalProperties']).toBe(false);
  });

  it('witness requires id, kind and test (the emitted shape); counterexample requires description', () => {
    expect(def('witness')['required']).toEqual(['id', 'kind', 'test']);
    expect(def('witness')['properties']['kind']['enum']).toEqual(['symbolic', 'numeric', 'formal']);
    expect(def('counterexample')['required']).toEqual(['description']);
  });

  it('atlasModel requires id and dynamics, with the model- id pattern', () => {
    expect(def('atlasModel')['required']).toEqual(['id', 'dynamics']);
    expect(def('atlasModel')['properties']['id']['pattern']).toBe('^model-');
  });

  it('atlasBridge requires id, relation, premises and conclusion', () => {
    expect(def('atlasBridge')['required']).toEqual([
      'id',
      'relation',
      'premises',
      'conclusion',
    ]);
    expect(def('atlasBridge')['properties']['id']['pattern']).toBe('^ab-');
    expect(def('atlasBridge')['properties']['premises']['minItems']).toBe(1);
  });

  it('atlasRejection requires id, claimedRelation, premises and counterexample', () => {
    expect(def('atlasRejection')['required']).toEqual([
      'id',
      'claimedRelation',
      'premises',
      'counterexample',
    ]);
    expect(def('atlasRejection')['properties']['id']['pattern']).toBe('^ax-');
  });
});

describe('atlas-record.v0.json — the if/then that makes a horizon mandatory', () => {
  it('conditions on relation === "approximation"', () => {
    const bridge = def('atlasBridge');
    expect(bridge['if']).toEqual({
      properties: { relation: { const: 'approximation' } },
      required: ['relation'],
    });
  });

  it('then requires bound, and requires horizon INSIDE the bound', () => {
    const bridge = def('atlasBridge');
    expect(bridge['then']).toEqual({
      required: ['bound'],
      properties: { bound: { required: ['horizon'] } },
    });
  });

  it('CONTROL: the pin reads the real file, not a default (a missing key is undefined)', () => {
    expect(def('atlasBridge')['thenNot']).toBeUndefined();
    expect(Object.keys(schema['definitions']).length).toBeGreaterThan(5);
  });
});
