// The shipped data files carry a schemaVersion. A change that a validator on the old schema
// refuses (a new required field, or a new property under additionalProperties: false) moves it.
// 16.0.0 added `products` (required) to units.json, and `dimension` (required) and `domains` to
// the bridge-catalog rows, so both versions moved: units 1 -> 2, bridge catalog 3 -> 4.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));

describe('schemaVersion of the shipped data files', () => {
  it('units.json and its schema are at version 2', () => {
    expect(read('data/units.json').schemaVersion).toBe(2);
    expect(read('data/units.schema.json').properties.schemaVersion.const).toBe(2);
  });
  it('bridge-catalog.json and its schema are at version 4', () => {
    expect(read('data/bridge-catalog.json').schemaVersion).toBe(4);
    expect(read('data/bridge-catalog.schema.json').properties.schemaVersion.const).toBe(4);
  });
});
