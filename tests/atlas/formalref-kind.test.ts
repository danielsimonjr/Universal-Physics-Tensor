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
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROPERTIES = [11, 29] as const;
const CROSS_CHECKS = [19, 24, 42] as const;
const COUNTED = [64, 53, 58, 38, 13, 34, 65, 51, 61, 14, 17, 22, 15, 32, 35, 30] as const;
/** Theorem states the catalogued equation. Covers still begins with derivation-step. */
const CATALOG_EQUATION = [12, 16, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63, 66, 67, 68, 69, 70, 71, 72, 73] as const;

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  const formalRef = catalogFormalRef(id);
  if (entry === undefined || formalRef === undefined) throw new Error(`be-${id} has no formalRef`);
  return { ...entry, formalRef };
}

describe('formalRef kind — formally-proved is a bridge only', () => {
  it('the catalog references exist (otherwise the next assertions pass vacuously)', () => {
    expect([...PROPERTIES, ...CROSS_CHECKS, ...COUNTED, ...CATALOG_EQUATION, 28].every((id) => row(id).formalRef !== undefined)).toBe(true);
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
      expect(row(id).formalRef?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
      expect(tags.has('formally-proved'), `be-${id}`).toBe(true);
    }
  });

  it('BE-28 derives the property label and not formally-proved', () => {
    const tags = deriveEvidence(row(28), NO_PASSING_WITNESSES);
    expect(row(28).formalRef?.kind).toBe('property');
    expect(tags.has('formally-proved')).toBe(false);
    expect(tags.has('formally-proved-property')).toBe(true);
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
    expect(refs.length).toBe(54);
    for (const ref of refs) {
      expect(ref.url).toBe(physjsFileUrl(physjsLeanFile(ref.statement)));
      expect(ref.url).toContain(`/blob/${PHYSJS_COMMIT}/lean/PhysJS/`);
    }
    const spring = refs.find((ref) => ref.statement === 'PhysJS.SpringLc.time_rescale_equationOfMotion');
    expect(spring?.url).toContain('/lean/PhysJS/OscillatorDictionary.lean');
    expect(spring?.url?.includes('/lean/PhysJS/SpringLc.lean')).toBe(false);
    const damped = refs.find((ref) => ref.statement === 'PhysJS.DampedRlc.time_rescale_equationOfMotion');
    expect(damped?.url).toContain('/lean/PhysJS/OscillatorDictionary.lean');
  });

  it('a kind that does not match the covers line is a manifest problem', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
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
