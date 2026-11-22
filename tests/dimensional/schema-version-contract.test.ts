// The shipped data files carry a schemaVersion. A change that a validator on the old schema
// refuses (a new required field, or a new property under additionalProperties: false) moves it.
// 16.0.0 added `products` (required) to units.json, and `dimension` (required) and `domains` to
// the bridge-catalog rows, so both versions moved: units 1 -> 2, bridge catalog 3 -> 4.
// 17.0.0 dropped `expr` from the applied-cases check required list and added `method` and `needs`
// under additionalProperties: false, so applied-cases 1 -> 2.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { schemaProblems, type JsonSchema } from '../../src/core/json-schema.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));

function gitShowJson(path: string): unknown {
  return JSON.parse(
    execFileSync('git', ['show', `v16.0.0:${path}`], { encoding: 'utf8', cwd: root }),
  );
}

describe('schemaVersion of the shipped data files', () => {
  it('units.json and its schema are at version 2', () => {
    expect(read('data/units.json').schemaVersion).toBe(2);
    expect(read('data/units.schema.json').properties.schemaVersion.const).toBe(2);
  });
  it('bridge-catalog.json and its schema are at version 4', () => {
    expect(read('data/bridge-catalog.json').schemaVersion).toBe(4);
    expect(read('data/bridge-catalog.schema.json').properties.schemaVersion.const).toBe(4);
  });
  it('applied-cases.json and its schema are at version 2', () => {
    expect(read('data/applied-cases.json').schemaVersion).toBe(2);
    expect(read('data/applied-cases.schema.json').properties.schemaVersion.const).toBe(2);
  });
  it('moves applied-cases because a validator on the v16.0.0 schema refuses the file', () => {
    const data = read('data/applied-cases.json') as { schemaVersion: number };
    const oldSchema = gitShowJson('data/applied-cases.schema.json') as JsonSchema;
    const oldConst = (oldSchema as { properties: { schemaVersion: { const: number } } }).properties
      .schemaVersion.const;
    expect(oldConst).toBe(1);
    // Hold schemaVersion at the old const so refusal is the check shape, not the version field.
    const asOldVersion = { ...data, schemaVersion: oldConst };
    const problems = schemaProblems(oldSchema, asOldVersion);
    expect(problems.length, problems.join('\n')).toBeGreaterThan(0);
    expect(schemaProblems(read('data/applied-cases.schema.json') as JsonSchema, data)).toEqual([]);
    expect(data.schemaVersion).not.toBe(oldConst);
  });
});
