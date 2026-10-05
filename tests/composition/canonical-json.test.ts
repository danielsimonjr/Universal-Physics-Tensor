/**
 * The record and probe JSON profiles hash the same bytes as the functions
 * they replaced. The oracles below are those functions, copied before the move.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalJson, captureEnvironment } from '../../src/composition/canonical-json.js';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** The record serializer from `src/cli/record.ts` before the profiles moved. */
function recordCanonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(recordCanonicalJson).join(',')}]`;
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${recordCanonicalJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) as string;
}

function probeCanonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : probeCanonicalize(item)));
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const item = obj[key];
    if (item === undefined) continue;
    sorted[key] = probeCanonicalize(item);
  }
  return sorted;
}

/** The probe serializer from `src/composition/probe/serialize.ts` before the profiles moved. */
function probeCanonicalJson(value: unknown): string {
  const json = JSON.stringify(probeCanonicalize(value));
  return json === undefined ? 'null' : json;
}

const when = new Date('2026-07-05T00:00:00.000Z');
const fixture = {
  z: 1,
  a: { m: 2, b: 3 },
  when,
  holes: [1, undefined, 2],
  skip: undefined,
};

describe('canonical JSON profiles', () => {
  it('hashes a nested record fixture to the old record digest', () => {
    const text = recordCanonicalJson(fixture);
    expect(text).toBe('{"a":{"b":3,"m":2},"holes":[1,,2],"when":{},"z":1}');
    expect(sha256(canonicalJson(fixture, 'record'))).toBe(sha256(text));
  });

  it('hashes a probe fixture with a Date and an array hole to the old probe digest', () => {
    const text = probeCanonicalJson(fixture);
    expect(text).toBe(
      '{"a":{"b":3,"m":2},"holes":[1,null,2],"when":"2026-07-05T00:00:00.000Z","z":1}',
    );
    expect(sha256(canonicalJson(fixture, 'probe'))).toBe(sha256(text));
    expect(sha256(canonicalJson(fixture))).toBe(sha256(text));
  });

  it('keeps the two profiles apart', () => {
    expect(canonicalJson(fixture, 'record')).not.toBe(canonicalJson(fixture, 'probe'));
  });

  it('stores the probe host fields and the record toolchain fields', async () => {
    expect(captureEnvironment()).toEqual({
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    });
    const tables = { 'core/constants': { values: { c: 1 }, sha256: 'abc' } };
    const recorded = await captureEnvironment('record', {
      uptVersion: '6.0.0',
      node: process.version,
      formulaParser: async () => 'mathts',
      simplifier: async () => true,
      peers: () => ({ mathts: '0.9.0' }),
      constantTables: async () => tables,
    });
    expect(recorded).toEqual({
      uptVersion: '6.0.0',
      node: process.version,
      formulaParser: 'mathts',
      simplifier: true,
      peers: { mathts: '0.9.0' },
      constantTables: tables,
    });
  });
});
