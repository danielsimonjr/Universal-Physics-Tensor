/**
 * A reviewed catalog formalRef is not a proved bridge.
 *
 * `deriveEvidence` used to light `formally-proved` from fidelity alone. A
 * property, a cross-check, and a counted catalog statement then read as a
 * proved bridge whenever a caller passed the reference in. This test passes
 * the reference on purpose. The catalog path passes only kind `bridge`.
 *
 * The first assertion was run before the kind check existed. It failed on
 * be-11: the set contained `formally-proved`.
 */

import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { PHYSJS_COMMIT, physjsFileUrl, physjsFormalRef, physjsLeanFile, physjsManifestProblems, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogEntries } from '../../src/bridges/catalog-load.js';
import { FORMAL_REF_KINDS } from '../../src/relations/types.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST = JSON.parse(readFileSync(resolve(ROOT, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
const KIND_OF = new Map(MANIFEST.entries.map((entry) => [entry.key, entry.kind]));
/** A covers line that opens with a kind word, which the v2 manifest does not write. */
const KIND_PREFIX = new RegExp(`^(${FORMAL_REF_KINDS.join('|')}): `);

/**
 * Catalog ids whose manifest entry has one of `kinds`. The kind is the
 * manifest's own field; the per-kind id lists this file kept, and the
 * catalog overrides they mirrored, are the record from before that field.
 */
function idsOfKind(...kinds: readonly string[]): number[] {
  return catalogEntries()
    .filter((entry) => entry.formalKey !== undefined && kinds.includes(KIND_OF.get(entry.formalKey) ?? ''))
    .map((entry) => entry.id);
}

const PROPERTIES = idsOfKind('property');
const CROSS_CHECKS = idsOfKind('cross-check');
const COUNTED = idsOfKind('reduction', 'limit', 'derivation-step');
/** Theorem states the catalogued equation. */
const CATALOG_EQUATION = idsOfKind('bridge');

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  const formalRef = catalogFormalRef(id);
  if (entry === undefined || formalRef === undefined) throw new Error(`be-${id} has no formalRef`);
  return { ...entry, formalRef };
}

describe('formalRef kind — formally-proved is a bridge only', () => {
  it('the catalog references exist (otherwise the next assertions pass vacuously)', () => {
    // The counts are the proof-status record at this pin (3 property, 3
    // cross-check, 16 counted, 119 bridge); the ids come from the manifest.
    expect(PROPERTIES.length).toBe(3);
    expect(CROSS_CHECKS.length).toBe(3);
    expect(COUNTED.length).toBe(16);
    expect(CATALOG_EQUATION.length).toBe(119);
    expect([...PROPERTIES, ...CROSS_CHECKS, ...COUNTED, ...CATALOG_EQUATION].every((id) => row(id).formalRef !== undefined)).toBe(true);
  });

  it('a property derives its own label and not formally-proved', () => {
    for (const id of PROPERTIES) {
      const tags = deriveEvidence(row(id), NO_PASSING_WITNESSES);
      expect(row(id).formalRef?.kind, `be-${id}`).toBe('property');
      expect(tags.has('formally-proved'), `be-${id}`).toBe(false);
      expect(tags.has('formally-proved-property'), `be-${id}`).toBe(true);
      expect(tags.has('formally-proved-cross-check'), `be-${id}`).toBe(false);
    }
  });

  it('a cross-check derives its own label and not formally-proved', () => {
    for (const id of CROSS_CHECKS) {
      const tags = deriveEvidence(row(id), NO_PASSING_WITNESSES);
      expect(row(id).formalRef?.kind, `be-${id}`).toBe('cross-check');
      expect(tags.has('formally-proved'), `be-${id}`).toBe(false);
      expect(tags.has('formally-proved-cross-check'), `be-${id}`).toBe(true);
      expect(tags.has('formally-proved-property'), `be-${id}`).toBe(false);
    }
  });

  it('a catalog theorem that states the catalogued equation is kind bridge', () => {
    for (const id of CATALOG_EQUATION) {
      const tags = deriveEvidence(row(id), NO_PASSING_WITNESSES);
      expect(row(id).formalRef?.kind, `be-${id}`).toBe('bridge');
      expect(row(id).formalRef?.covers, `be-${id}`).not.toMatch(KIND_PREFIX);
      expect(tags.has('formally-proved'), `be-${id}`).toBe(true);
    }
  });

  it('a counted catalog reference derives neither label', () => {
    for (const id of COUNTED) {
      const tags = deriveEvidence(row(id), NO_PASSING_WITNESSES);
      const kind = row(id).formalRef?.kind;
      expect(['reduction', 'limit', 'derivation-step']).toContain(kind);
      expect(tags.has('formally-proved'), `be-${id}`).toBe(false);
      expect(tags.has('formally-proved-property'), `be-${id}`).toBe(false);
      expect(tags.has('formally-proved-cross-check'), `be-${id}`).toBe(false);
    }
  });

  it('CONTROL: the same property lights formally-proved when its kind is bridge', () => {
    const property = row(29).formalRef!;
    expect(deriveEvidence({ formalRef: property }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
    const asBridge = { ...property, kind: 'bridge' as const };
    expect(deriveEvidence({ formalRef: asBridge }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
  });

  it('CONTROL: a reviewed atlas bridge still derives formally-proved', () => {
    const pendulum = ATLAS_FAMILIES.flatMap((family) => family.bridges).find((bridge) => bridge.id === 'ab-pendulum-linear');
    expect(pendulum?.formalRef?.kind).toBe('bridge');
    expect(pendulum?.formalRef?.fidelity).toBe('sanity-lemmas');
    const tags = deriveEvidence(pendulum!, NO_PASSING_WITNESSES);
    expect(tags.has('formally-proved')).toBe(true);
    expect(tags.has('formally-proved-property')).toBe(false);
    expect(tags.has('formally-proved-cross-check')).toBe(false);
  });

  it('an unreviewed property earns no label', () => {
    const tags = deriveEvidence(
      { formalRef: { fidelity: 'unreviewed', kind: 'property' } },
      NO_PASSING_WITNESSES,
    );
    expect([...tags]).toEqual(['proposed']);
  });

  it('every PhysJS reference links to its Lean file at the pinned commit', () => {
    const refs = [
      ...ATLAS_FAMILIES.flatMap((family) => family.bridges).flatMap((bridge) =>
        bridge.formalRef === undefined ? [] : [bridge.formalRef],
      ),
      ...BRIDGE_EQUATIONS.flatMap((entry) => {
        const formalRef = catalogFormalRef(entry.id);
        return formalRef === undefined ? [] : [formalRef];
      }),
    ];
    // 127 is the record from before be-147..170 each added a catalog formalRef.
    // 57 is the record from before be-77..87 each added a catalog formalRef.
    expect(refs.length).toBe(151);
    // 114 is the record from before be-134..146.
    // 106 is the record from before be-126..133.
    // 83 is the record from before be-103..125. 68 is the record from before be-88..102.
    for (const ref of refs) {
      expect(ref.url).toBe(physjsFileUrl(physjsLeanFile(ref.statement)));
      expect(ref.url).toContain(`/blob/${PHYSJS_COMMIT}/lean/`);
      expect(ref.url).not.toContain('/lean/PhysJS/');
    }
    const spring = refs.find((ref) => ref.statement === 'PhysJS.SpringLc.time_rescale_equationOfMotion');
    expect(spring?.url).toContain('/lean/OscillatorDictionary.lean');
    expect(spring?.url?.includes('/SpringLc.lean')).toBe(false);
    const damped = refs.find((ref) => ref.statement === 'PhysJS.DampedRlc.time_rescale_equationOfMotion');
    expect(damped?.url).toContain('/lean/OscillatorDictionary.lean');
  });

  it('a reference kind that does not match the manifest kind is a manifest problem', () => {
    const manifest = MANIFEST;
    const bridges = [
      ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
      ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
    ];
    expect(physjsManifestProblems({ manifest, bridges })).toEqual([]);
    const lied = bridges.map((bridge) =>
      bridge.id === 'be-16' && bridge.formalRef !== undefined
        ? { ...bridge, formalRef: { ...bridge.formalRef, kind: 'property' as const } }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: lied }).join('\n')).toMatch(/kind is 'property', expected 'bridge'/);
    expect(physjsFormalRef('be-16').kind).toBe('bridge');
  });
});
