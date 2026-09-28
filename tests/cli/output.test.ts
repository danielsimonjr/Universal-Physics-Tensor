import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { sanitize, emitJson } from '../../dist/cli/output.js';
import type { JsonEnvelope } from '../../dist/cli/output.js';
import { packageVersion } from '../../dist/cli/version.js';
import { definitionsFor } from '../../dist/cli/statuses.js';

describe('sanitize', () => {
  it('converts Infinity to the string "Infinity"', () => {
    expect(sanitize({ a: Infinity })).toEqual({ a: 'Infinity' });
  });

  it('converts -Infinity to the string "-Infinity"', () => {
    expect(sanitize({ a: -Infinity })).toEqual({ a: '-Infinity' });
  });

  it('converts NaN to the string "NaN"', () => {
    expect(sanitize({ a: NaN })).toEqual({ a: 'NaN' });
  });

  it('converts non-finite numbers nested inside arrays', () => {
    expect(sanitize([1, Infinity, -Infinity, NaN, 2])).toEqual([
      1,
      'Infinity',
      '-Infinity',
      'NaN',
      2,
    ]);
  });

  it('converts non-finite numbers nested inside objects', () => {
    expect(sanitize({ outer: { anchoring: Infinity, ok: 3 } })).toEqual({
      outer: { anchoring: 'Infinity', ok: 3 },
    });
  });

  it('passes through finite numbers, strings, booleans, and null unchanged', () => {
    expect(sanitize({ a: 1.5, b: 'x', c: true, d: false, e: null })).toEqual({
      a: 1.5,
      b: 'x',
      c: true,
      d: false,
      e: null,
    });
  });

  it('drops function-valued properties from objects', () => {
    const input = { a: 1, fn: () => 1 };
    expect(sanitize(input)).toEqual({ a: 1 });
  });

  it('replaces function values in array slots with null', () => {
    const input = [1, () => 1, 2];
    expect(sanitize(input)).toEqual([1, null, 2]);
  });

  it('converts a Map to a plain object, sanitized recursively', () => {
    const m = new Map<string, unknown>([
      ['x', 1],
      ['y', Infinity],
    ]);
    expect(sanitize(m)).toEqual({ x: 1, y: 'Infinity' });
  });

  it('omits undefined-valued object properties', () => {
    expect(sanitize({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('recurses through nested arrays and objects together', () => {
    const input = {
      list: [{ v: Infinity }, { v: 1 }],
      map: new Map<string, unknown>([['k', NaN]]),
    };
    expect(sanitize(input)).toEqual({
      list: [{ v: 'Infinity' }, { v: 1 }],
      map: { k: 'NaN' },
    });
  });
});

describe('emitJson', () => {
  it('writes JSON.stringify(sanitize(env), null, 2) + "\\n" in a single write call', () => {
    const env: JsonEnvelope = {
      command: 'discover',
      source: 'catalog',
      result: { anchoring: Infinity },
    };
    const calls: string[] = [];
    emitJson(env, (s) => calls.push(s));

    expect(calls.length).toBe(1);
    // Audit I13: the status definitions of the command are added before the result.
    const expected =
      JSON.stringify(sanitize({ command: 'discover', source: 'catalog', definitions: definitionsFor('discover'), result: env.result }), null, 2) + '\n';
    expect(calls[0]).toBe(expected);
  });

  it('adds no definitions for a command that emits no status', () => {
    const calls: string[] = [];
    emitJson({ command: 'eval', result: { value: 1 } }, (s) => calls.push(s));
    expect(definitionsFor('eval')).toEqual({});
    expect(calls[0]).toBe(JSON.stringify({ command: 'eval', result: { value: 1 } }, null, 2) + '\n');
  });

  it('produces output that is JSON.parse-able and ends with a trailing newline', () => {
    const env: JsonEnvelope = {
      command: 'map',
      result: [1, 2, 3],
    };
    let output = '';
    emitJson(env, (s) => {
      output = s;
    });

    expect(output.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual({ command: 'map', definitions: definitionsFor('map'), result: [1, 2, 3] });
  });

  it('defaults to writing to process.stdout.write when no write function is given', () => {
    const original = process.stdout.write.bind(process.stdout);
    const calls: string[] = [];
    process.stdout.write = ((chunk: string) => {
      calls.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      emitJson({ command: 'test', result: 1 });
    } finally {
      process.stdout.write = original;
    }

    expect(calls.length).toBe(1);
    expect(calls[0]).toBe(JSON.stringify({ command: 'test', result: 1 }, null, 2) + '\n');
  });
});

describe('packageVersion', () => {
  it('matches the version field read independently from package.json', () => {
    const pkgPath = new URL('../../package.json', import.meta.url);
    const independentlyRead = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    expect(packageVersion()).toBe(independentlyRead.version);
  });
});
