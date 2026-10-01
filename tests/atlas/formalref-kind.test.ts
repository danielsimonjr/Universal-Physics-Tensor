/**
 * A reviewed catalog formalRef is not a proved bridge.
 *
 * `deriveEvidence` used to light `formally-proved` from fidelity alone. A
 * property, a cross-check, and a counted catalog statement then read as a
 * proved bridge whenever a caller passed the reference in. The catalog path
 * omits the field; this test passes it on purpose.
 *
 * The first assertion was run before the kind check existed. It failed on
 * be-11: the set contained `formally-proved`.
 */

import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { PHYSJS_COMMIT, physjsFormalRef, physjsManifestProblems, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROPERTIES = [11, 16, 29] as const;
const CROSS_CHECKS = [19, 24, 42] as const;
const COUNTED = [64, 53, 58, 38, 13, 34, 65, 51, 61, 12, 59, 55, 60, 21, 14, 43, 37, 54, 17, 27, 22, 15, 33, 50, 32, 28, 40, 35, 63, 30] as const;

/** Namespaces that are not their own Lean file at the pinned commit. */
const FILE_BY_NAMESPACE: Readonly<Record<string, string>> = {
  SpringLc: 'OscillatorDictionary.lean',
  DampedRlc: 'OscillatorDictionary.lean',
};

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  if (entry?.formalRef === undefined) throw new Error(`be-${id} has no formalRef`);
  return entry;
}

function fileFor(statement: string): string {
  const namespace = statement.split('.')[1];
  if (namespace === undefined) throw new Error(statement);
  return FILE_BY_NAMESPACE[namespace] ?? `${namespace}.lean`;
}

describe('formalRef kind — formally-proved is a bridge only', () => {
  it('the catalog references exist (otherwise the next assertions pass vacuously)', () => {
    expect([...PROPERTIES, ...CROSS_CHECKS, ...COUNTED].every((id) => row(id).formalRef !== undefined)).toBe(true);
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
    const property = row(16).formalRef!;
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
      ...BRIDGE_EQUATIONS.flatMap((entry) => (entry.formalRef === undefined ? [] : [entry.formalRef])),
    ];
    expect(refs.length).toBe(46);
    for (const ref of refs) {
      const file = fileFor(ref.statement);
      expect(ref.url).toBe(
        `https://github.com/danielsimonjr/PhysJS/blob/${PHYSJS_COMMIT}/PhysJS/${file}`,
      );
    }
    const spring = refs.find((ref) => ref.statement === 'PhysJS.SpringLc.time_rescale_equationOfMotion');
    expect(spring?.url).toContain('/PhysJS/OscillatorDictionary.lean');
    expect(spring?.url).not.toContain('/PhysJS/SpringLc.lean');
    const damped = refs.find((ref) => ref.statement === 'PhysJS.DampedRlc.time_rescale_equationOfMotion');
    expect(damped?.url).toContain('/PhysJS/OscillatorDictionary.lean');
  });

  it('a kind that does not match the covers line is a manifest problem', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
    const bridges = [
      ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
      ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: entry.formalRef })),
    ];
    expect(physjsManifestProblems({ manifest, bridges })).toEqual([]);
    const lied = bridges.map((bridge) =>
      bridge.id === 'be-16' && bridge.formalRef !== undefined
        ? { ...bridge, formalRef: { ...bridge.formalRef, kind: 'bridge' as const } }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: lied }).join('\n')).toMatch(/kind is 'bridge', expected 'property'/);
    expect(physjsFormalRef('be-16').kind).toBe('property');
  });
});
