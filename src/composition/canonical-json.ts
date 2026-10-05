/**
 * One canonical-JSON serializer with two named profiles.
 *
 * `probe` keeps the Date-to-ISO rule and the undefined-hole-to-null rule.
 * `record` keeps the bytes the CLI experiment record hashed before this module
 * existed: a `Date` becomes `{}`, and an array hole stays a hole.
 *
 * `captureEnvironment` is the same split. The probe profile stores the Node
 * version, the platform, and the architecture. The record profile stores the
 * UPT version, the parser, the peers, and the constant-table hashes. The
 * record sources are arguments because this module does not import `cli`.
 *
 * @module composition/canonical-json
 */

import { createHash } from 'node:crypto';
import type { EnvironmentFingerprint } from './probe/types.js';

/** Which caller’s bytes `canonicalJson` writes. */
export type JsonProfile = 'record' | 'probe';

/** Values the record profile reads. The caller supplies them. */
export interface RecordEnvironmentSources {
  readonly uptVersion: string;
  readonly node: string;
  readonly formulaParser: () => Promise<string>;
  readonly simplifier: () => Promise<boolean>;
  readonly peers: () => Record<string, string | null>;
  readonly constantTables: () => Promise<
    Record<string, { values: Record<string, number | string | boolean>; sha256: string }>
  >;
}

/** The record profile’s environment object. */
export interface RecordEnvironmentSnapshot {
  uptVersion: string;
  node: string;
  formulaParser: string;
  simplifier: boolean;
  peers: Record<string, string | null>;
  constantTables: Record<string, { values: Record<string, number | string | boolean>; sha256: string }>;
}

function canonicalJsonRecord(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJsonRecord).join(',')}]`;
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJsonRecord(o[k])}`)
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

function canonicalJsonProbe(value: unknown): string {
  const json = JSON.stringify(probeCanonicalize(value));
  return json === undefined ? 'null' : json;
}

/**
 * Deterministic JSON for one profile. The default profile is `probe`.
 *
 * @internal
 */
export function canonicalJson(value: unknown, profile: JsonProfile = 'probe'): string {
  return profile === 'record' ? canonicalJsonRecord(value) : canonicalJsonProbe(value);
}

/**
 * SHA-256 digest of `text` as lowercase hex.
 *
 * @internal
 */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * SHA-256 of the probe profile of `value`.
 *
 * @internal
 */
export function hashCanonical(value: unknown): string {
  return sha256Hex(canonicalJson(value, 'probe'));
}

async function recordEnvironment(sources: RecordEnvironmentSources): Promise<RecordEnvironmentSnapshot> {
  return {
    uptVersion: sources.uptVersion,
    node: sources.node,
    formulaParser: await sources.formulaParser(),
    simplifier: await sources.simplifier(),
    peers: sources.peers(),
    constantTables: await sources.constantTables(),
  };
}

/**
 * Host fingerprint for a probe run, or the toolchain fingerprint for a record.
 * The zero-argument call is the probe profile.
 *
 * @internal
 */
export function captureEnvironment(): EnvironmentFingerprint;
export function captureEnvironment(
  profile: 'record',
  sources: RecordEnvironmentSources,
): Promise<RecordEnvironmentSnapshot>;
export function captureEnvironment(
  profile?: 'record',
  sources?: RecordEnvironmentSources,
): EnvironmentFingerprint | Promise<RecordEnvironmentSnapshot> {
  if (profile === 'record') {
    if (sources === undefined) {
      throw new TypeError('captureEnvironment record profile requires sources');
    }
    return recordEnvironment(sources);
  }
  return {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
}
