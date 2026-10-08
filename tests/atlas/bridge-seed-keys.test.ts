/**
 * Kind `bridge` is the only seed. The list is `bridgeSeedKeys`, read from each
 * manifest entry's own `kind`. A second list would drift, so this test keeps
 * none: it derives every expectation from the vendored manifest and the catalog.
 *
 * Before the kind check, a stub that returned every key kept `CE-fixture`
 * when its kind was `derivation-step`. The control below failed on that stub.
 * The literal per-key lists this file kept, and the `formalKind` override they
 * mirrored, are the record from before the manifest carried `kind`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { bridgeSeedKeys, physjsAheadOfCatalog, physjsFormalRef, physjsKeysAheadOfCatalog } from '../../src/atlas/physjs-ref.js';
import { catalogEntries, catalogEntry, parseBridgeId } from '../../src/bridges/catalog-load.js';
import { FORMAL_REF_KINDS } from '../../src/relations/types.js';

/** A covers line that opens with a kind word, which the v2 manifest does not write. */
const KIND_PREFIX = new RegExp(`^(${FORMAL_REF_KINDS.join('|')}): `);

const MANIFEST = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../formal/physjs/manifest.json'), 'utf8'),
) as { readonly entries: readonly { readonly key: string; readonly kind: string; readonly covers: string }[] };

const ATLAS_KEYS = ATLAS_FAMILIES.flatMap((family) => family.bridges)
  .filter((bridge) => bridge.formalRef?.system === 'lean4-physjs')
  .map((bridge) => bridge.id);

describe('bridge seeds are kind bridge only', () => {
  const seeds = bridgeSeedKeys();

  it('an entry of any other kind is absent, and its reference carries the manifest kind', () => {
    const weaker = MANIFEST.entries.filter((entry) => entry.kind !== 'bridge');
    expect(weaker.length).toBeGreaterThan(0);
    for (const entry of weaker) {
      expect(seeds, entry.key).not.toContain(entry.key);
      expect(physjsFormalRef(entry.key).kind, entry.key).toBe(entry.kind);
    }
    expect(physjsFormalRef('be-14').kind).toBe('derivation-step');
    expect(physjsFormalRef('be-13').kind).toBe('reduction');
    expect(physjsFormalRef('be-38').kind).toBe('limit');
    expect(physjsFormalRef('be-28').kind).toBe('property');
    expect(physjsFormalRef('be-42').kind).toBe('cross-check');
  });

  it('every atlas key is a seed', () => {
    expect(ATLAS_KEYS.length).toBeGreaterThan(0);
    for (const key of ATLAS_KEYS) {
      expect(seeds, key).toContain(key);
      expect(physjsFormalRef(key).kind, key).toBe('bridge');
    }
  });

  it('a catalog key whose theorem states the catalogued equation is a seed, and its covers line does not open with a kind word', () => {
    expect(physjsFormalRef('be-16').kind).toBe('bridge');
    expect(physjsFormalRef('be-43').kind).toBe('bridge');
    for (const entry of MANIFEST.entries) {
      expect(entry.covers, entry.key).not.toMatch(KIND_PREFIX);
      if (entry.kind !== 'bridge' || physjsAheadOfCatalog(entry.key)) continue;
      expect(seeds, entry.key).toContain(entry.key);
      expect(physjsFormalRef(entry.key).kind, entry.key).toBe('bridge');
    }
  });

  it('a key ahead of the catalog is not a seed and has no catalog entry', () => {
    const ahead = physjsKeysAheadOfCatalog();
    for (const key of ahead) {
      expect(seeds, key).not.toContain(key);
      expect(catalogEntry(parseBridgeId(key)), key).toBeUndefined();
    }
    for (const key of ATLAS_KEYS) expect(physjsAheadOfCatalog(key), key).toBe(false);
    expect(physjsAheadOfCatalog('be-16')).toBe(false);
  });

  it('the keys ahead of the catalog are one unbroken run right after its highest id', () => {
    const highest = Math.max(...catalogEntries().map((entry) => entry.id));
    const ahead = physjsKeysAheadOfCatalog().map((key) => parseBridgeId(key));
    expect(ahead).toEqual(Array.from({ length: ahead.length }, (_, i) => highest + 1 + i));
    // At this pin that run is PhysJS's be-171 to be-249, which the catalog has
    // not taken in yet; cataloguing them empties it.
    expect(physjsKeysAheadOfCatalog()).toEqual(Array.from({ length: 79 }, (_, i) => `be-${171 + i}`));
  });

  it('the live list is the kind-bridge entries that resolve, in manifest order', () => {
    expect(seeds).toEqual(
      MANIFEST.entries.filter((entry) => entry.kind === 'bridge' && !physjsAheadOfCatalog(entry.key)).map((entry) => entry.key),
    );
  });

  it('the return value is not written onto a bridge and is not passed to deriveEvidence', () => {
    const pendulum = ATLAS_FAMILIES.flatMap((family) => family.bridges).find((bridge) => bridge.id === 'ab-pendulum-linear');
    if (pendulum === undefined) throw new Error('ab-pendulum-linear missing');
    const before = [...deriveEvidence(pendulum, NO_PASSING_WITNESSES)].sort();
    const again = bridgeSeedKeys();
    const after = [...deriveEvidence(pendulum, NO_PASSING_WITNESSES)].sort();
    expect(after).toEqual(before);
    expect(again).toContain('ab-pendulum-linear');
    expect(Object.keys(pendulum)).not.toContain('seed');
    expect(Object.keys(pendulum)).not.toContain('bridgeSeedKeys');
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/atlas/physjs-ref.ts'), 'utf8');
    const body = source.slice(source.indexOf('export function bridgeSeedKeys'));
    expect(body).not.toContain('deriveEvidence');
    const publicSurface = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/atlas/public.ts'), 'utf8');
    expect(publicSurface).not.toContain('bridgeSeedKeys');
  });

  it('CONTROL: the same fixture key drops out when its kind is derivation-step', () => {
    const key = 'CE-fixture';
    const asBridge = bridgeSeedKeys([{ key, kind: 'bridge' }]);
    const flipped = bridgeSeedKeys([{ key, kind: 'derivation-step' }]);
    expect(asBridge).toEqual([key]);
    expect(flipped).toEqual([]);
  });

  it('a canonical id of another kind is absent, and the same id is present when the kind is bridge', () => {
    const key = 'CE-einstein-field-eq';
    expect(bridgeSeedKeys([{ key, kind: 'derivation-step' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, kind: 'bridge' }])).toEqual([key]);
    expect(bridgeSeedKeys([{ key, kind: 'reduction' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, kind: 'limit' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, kind: 'property' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, kind: 'cross-check' }])).toEqual([]);
  });
});
