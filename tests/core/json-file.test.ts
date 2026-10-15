/**
 * `readJsonFile` names the file in a JSON syntax error, so a bad file is
 * found by its path and not by a bare "Unexpected token"; `isPlainObject` is
 * the one object guard of the schema reader, exported for the readers that
 * carried their own.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readJsonFile } from '../../src/core/data-file.js';
import { isPlainObject } from '../../src/core/json-schema.js';

const dir = mkdtempSync(join(tmpdir(), 'upt-json-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('readJsonFile', () => {
  it('returns the parsed value of a JSON file', () => {
    const file = join(dir, 'ok.json');
    writeFileSync(file, '{"a": [1, 2], "b": null}');
    expect(readJsonFile(file)).toEqual({ a: [1, 2], b: null });
  });

  it('prefixes the path into a SyntaxError and keeps the class', () => {
    const file = join(dir, 'bad.json');
    writeFileSync(file, '{"a": ');
    expect(() => readJsonFile(file)).toThrow(SyntaxError);
    expect(() => readJsonFile(file)).toThrow(new RegExp(`^${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
  });

  it('a missing file is the file-system error, not a SyntaxError', () => {
    const file = join(dir, 'absent.json');
    expect(() => readJsonFile(file)).toThrow(/ENOENT/);
    expect(() => readJsonFile(file)).not.toThrow(SyntaxError);
  });
});

describe('isPlainObject', () => {
  it('is true for an object that is not an array and not null', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('is false for arrays, null and primitives', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});
