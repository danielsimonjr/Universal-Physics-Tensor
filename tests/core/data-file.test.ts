/**
 * Every data file the library loads is checked against the schema beside it
 * when it loads (`core/data-file`), with the keyword subset `core/json-schema`
 * reads. A broken copy fails with the path of each problem.
 */
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkedDataFile, dataSchema, dataText, parseDataFile, schemaFileOf } from '../../src/core/data-file.js';
import { schemaProblems, type JsonSchema } from '../../src/core/json-schema.js';
import { quantitySpellingIndex, type QuantityRecord } from '../../src/dimensional/quantity-registry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataFiles = readdirSync(resolve(root, 'data')).filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'));

type Catalog = {
  relations: Record<string, unknown>[];
  evaluators: { parameters: Record<string, unknown>[] }[];
  confrontations: Record<string, unknown>[];
};
const edited = <T>(file: string, change: (copy: T) => void): string => {
  const copy = JSON.parse(dataText(file)) as T;
  change(copy);
  return JSON.stringify(copy);
};

describe('every data file has a schema and matches it', () => {
  it('each top-level data/*.json has a schema beside it', () => {
    expect(dataFiles.length).toBeGreaterThanOrEqual(3);
    for (const file of dataFiles) expect(readdirSync(resolve(root, 'data')), file).toContain(schemaFileOf(file));
  });

  it('each one loads through the checked reader', () => {
    for (const file of dataFiles) expect(() => checkedDataFile(file), file).not.toThrow();
  });
});

describe('a broken bridge catalog does not load', () => {
  const schema = dataSchema('bridge-catalog.json');
  const read = (text: string) => parseDataFile('bridge-catalog.json', text, schema);

  it('a relation without a target, and an unknown relation field', () => {
    expect(() => read(edited<Catalog>('bridge-catalog.json', (c) => delete c.relations[0]!.target))).toThrow(/\$\.relations\[0\]: missing 'target'/);
    expect(() => read(edited<Catalog>('bridge-catalog.json', (c) => (c.relations[0]!.targt = 'x')))).toThrow(/\$\.relations\[0\]\.targt: unexpected property/);
  });

  it('an evaluator parameter with a misspelled flag or a bad sign', () => {
    expect(() => read(edited<Catalog>('bridge-catalog.json', (c) => (c.evaluators[0]!.parameters[0]!.optinal = true)))).toThrow(/unexpected property/);
    expect(() => read(edited<Catalog>('bridge-catalog.json', (c) => (c.evaluators[0]!.parameters[0]!.sign = 'negative')))).toThrow(/is not one of/);
  });

  it('a confrontation keyed bridgeId instead of catalogId', () => {
    const text = edited<Catalog>('bridge-catalog.json', (c) => {
      c.confrontations[0]!.bridgeId = c.confrontations[0]!.catalogId;
      delete c.confrontations[0]!.catalogId;
    });
    expect(() => read(text)).toThrow(/\$\.confrontations\[0\]: missing 'catalogId'/);
  });
});

describe('a broken quantity file does not load', () => {
  const schema = dataSchema('quantities.json');
  type Quantities = { quantities: Record<string, unknown>[] };

  it('a dimension missing a base, or a non-boolean graphNode', () => {
    const read = (text: string) => parseDataFile('quantities.json', text, schema);
    expect(() => read(edited<Quantities>('quantities.json', (q) => delete (q.quantities[0]!.dimension as Record<string, number>).J))).toThrow(
      /\$\.quantities\[0\]\.dimension: missing 'J'/,
    );
    expect(() => read(edited<Quantities>('quantities.json', (q) => (q.quantities[0]!.graphNode = 'yes')))).toThrow(/graphNode: expected boolean/);
  });

  it('two rows one folded spelling names', () => {
    const row = (id: string, aliases?: string[]): QuantityRecord =>
      ({ id, symbol: id, dimension: { L: 0, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 }, attributes: {}, graphNode: false, ...(aliases ? { aliases } : {}) }) as QuantityRecord;
    expect(() => quantitySpellingIndex([row('temperature-change'), row('temperature_change')])).toThrow(/spells both 'temperature-change' and 'temperature_change'/);
    expect(() => quantitySpellingIndex([row('a', ['dT']), row('dT')])).toThrow(/spells both 'a' and 'dT'/);
    expect(quantitySpellingIndex([row('temperature-change', ['temperature_change'])]).size).toBe(1);
  });
});

describe('core/json-schema: type lists, minimum, maxItems', () => {
  it('reads a list of types, a minimum and a maximum item count', () => {
    const s: JsonSchema = { type: 'object', properties: { a: { type: ['string', 'null'] }, n: { type: 'integer', minimum: 11 }, b: { type: 'array', maxItems: 2 } } };
    expect(schemaProblems(s, { a: null, n: 11, b: [1, 2] })).toEqual([]);
    expect(schemaProblems(s, { a: 1, n: 10, b: [1, 2, 3] })).toEqual(['$.a: expected string or null', '$.n: 10 is less than 11', '$.b: more than 2 items']);
  });

  it('a type that is not a name or a list of names is an error in the schema', () => {
    expect(() => schemaProblems({ type: [1] }, 1)).toThrow(/not a type name/);
    expect(() => schemaProblems({ type: [] }, 1)).toThrow(/not a type name/);
  });
});
