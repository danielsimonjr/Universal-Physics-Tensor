// The shipped data files carry a schemaVersion. A change that a validator on the old schema
// refuses (a new required field, or a new property under additionalProperties: false) moves it.
// 16.0.0 added `products` (required) to units.json, and `dimension` (required) and `domains` to
// the bridge-catalog rows, so both versions moved: units 1 -> 2, bridge catalog 3 -> 4.
// 17.0.0 dropped `expr` from the applied-cases check required list and added `method` and `needs`
// under additionalProperties: false, so applied-cases 1 -> 2.
//
// The v16.0.0 schema is vendored at tests/fixtures/applied-cases.schema.v16.0.0.json (the bytes of
// `v16.0.0:data/applied-cases.schema.json`). The test once ran `git show v16.0.0:...`; CI and
// publish.yml check out depth-1 with no tags, so that command fails there. No git fetch fallback:
// tests/internal/no-network-in-tests.test.ts forbids it. The SHA-256 pin below binds the fixture.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { schemaProblems, type JsonSchema } from '../../src/core/json-schema.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const V16_SCHEMA_PATH = resolve(root, 'tests/fixtures/applied-cases.schema.v16.0.0.json');
/** SHA-256 of `v16.0.0:data/applied-cases.schema.json` (7122 bytes). */
const V16_SCHEMA_SHA256 = '0a063b2032806503a9bb99543aea00660e05b2b0b136ee340feb6292540621e8';

function v16Schema(): JsonSchema {
  return JSON.parse(readFileSync(V16_SCHEMA_PATH, 'utf8')) as JsonSchema;
}

type CheckRow = {
  expr?: unknown;
  method?: unknown;
  needs?: unknown;
  [key: string]: unknown;
};

/** Current catalog rewritten to the v16.0.0 check shape: required `expr`, no `method`/`needs`. */
function v1Shaped(data: { schemaVersion: number; cases: Array<{ checks: CheckRow[] } & Record<string, unknown>> }): unknown {
  return {
    ...data,
    schemaVersion: 1,
    cases: data.cases.map((row) => ({
      ...row,
      checks: row.checks.map((check) => {
        const { method: _method, needs: _needs, ...rest } = check;
        return { ...rest, expr: typeof rest.expr === 'string' && rest.expr.length > 0 ? rest.expr : '1' };
      }),
    })),
  };
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
  it('pins the frozen v16.0.0 applied-cases schema by SHA-256', () => {
    const bytes = readFileSync(V16_SCHEMA_PATH);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(V16_SCHEMA_SHA256);
    expect((JSON.parse(bytes.toString('utf8')) as { properties: { schemaVersion: { const: number } } }).properties.schemaVersion.const).toBe(1);
  });
  it('moves applied-cases because a validator on the v16.0.0 schema refuses the file', () => {
    const data = read('data/applied-cases.json') as { schemaVersion: number };
    const oldSchema = v16Schema();
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
  it('control: the v2 schema rejects schemaVersion 1, and the frozen v1 schema accepts a v1-shaped record', () => {
    const data = read('data/applied-cases.json') as {
      schemaVersion: number;
      cases: Array<{ checks: CheckRow[] } & Record<string, unknown>>;
    };
    const currentSchema = read('data/applied-cases.schema.json') as JsonSchema;
    expect(schemaProblems(currentSchema, { ...data, schemaVersion: 1 })).toEqual([
      '$.schemaVersion: expected 2',
    ]);
    expect(schemaProblems(v16Schema(), v1Shaped(data))).toEqual([]);
  });
});
