/**
 * PhysJS #55 proves the three applied-physicist equations.
 *
 * The vendored manifest is the check. A hand-set theorem, axiom list, or
 * covers line that disagrees with that file fails here. Passing the
 * reference to `deriveEvidence` lights `formally-proved`. The catalog
 * path passes a kind-`bridge` reference, so `deriveEdgeEvidence` does too.
 * Edge confidence stays `established`: the grade is the catalog status,
 * and a proof does not promote it.
 *
 * Before the pin, this file failed because `catalogFormalRef(66)` was
 * undefined and the manifest commit was still
 * `2e09357f9674bc60b60b378155a1623c27dc7b04`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { bridgeSeedKeys, physjsFormalRef, physjsManifestProblems, PHYSJS_COMMIT, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';
import { be66Edge, be67Edge, be68Edge } from '../../src/composition/edges/applied-physicist.js';

const SHA = '3af15b49be09442350510e7c7f56f4aab92ea3bc';
const VERSION = `physjs@${SHA} leanprover/lean4:v4.34.1 mathlib:v4.34.1 physlib@af484f78ee0701290595f8bf892b157b10d64940`;
const AXIOMS = ['propext', 'Classical.choice', 'Quot.sound'] as const;

const ROWS = [
  { id: 66, theorem: 'PhysJS.RadiationPressure.pressure_eq', file: 'RadiationPressure.lean', edge: be66Edge },
  { id: 67, theorem: 'PhysJS.AlfvenSpeed.speed_eq', file: 'AlfvenSpeed.lean', edge: be67Edge },
  { id: 68, theorem: 'PhysJS.TolmanEhrenfest.hydrostatic_constant', file: 'TolmanEhrenfest.lean', edge: be68Edge },
] as const;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;

describe('PhysJS proofs for be-66, be-67, and be-68', () => {
  it('the vendored manifest is PhysJS #55 and names the three theorems', () => {
    expect(PHYSJS_COMMIT).toBe(SHA);
    expect(manifest.commit).toBe(SHA);
    expect(manifest.toolchain).toBe('leanprover/lean4:v4.34.1');
    expect(manifest.mathlib).toBe('v4.34.1');
    expect(manifest.physlib).toBe('af484f78ee0701290595f8bf892b157b10d64940');
    for (const row of ROWS) {
      const entry = manifest.entries.find((candidate) => candidate.key === `be-${row.id}`);
      expect(entry?.theorem, `be-${row.id}`).toBe(row.theorem);
      expect(entry?.bridgeId).toBe(`be-${row.id}`);
      expect(entry?.leanProof).toBe('complete');
      expect(entry?.axioms).toEqual([...AXIOMS]);
      expect(entry?.covers.startsWith('derivation-step: '), `be-${row.id}`).toBe(true);
      expect(entry?.coverage).toBe('covers its statement only');
    }
  });

  it('each formalRef is the manifest line, kind bridge, and both paths light formally-proved', () => {
    for (const row of ROWS) {
      const entry = manifest.entries.find((candidate) => candidate.key === `be-${row.id}`);
      const ref = catalogFormalRef(row.id);
      expect(ref, `be-${row.id}`).toBeDefined();
      expect(ref).toEqual(physjsFormalRef(`be-${row.id}`));
      expect(ref?.system).toBe('lean4-physjs');
      expect(ref?.statement).toBe(row.theorem);
      expect(ref?.version).toBe(VERSION);
      expect(ref?.axioms).toEqual([...AXIOMS]);
      expect(ref?.fidelity).toBe('sanity-lemmas');
      expect(ref?.kind).toBe('bridge');
      expect(ref?.url).toBe(`https://github.com/danielsimonjr/PhysJS/blob/${SHA}/PhysJS/${row.file}`);
      expect(ref?.covers).toBe(`${entry?.covers} — covers its statement only`);
      expect(deriveEvidence({ formalRef: ref }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(deriveEdgeEvidence(row.id).has('formally-proved')).toBe(true);
      expect(deriveEdgeEvidence(row.id).has('proposed')).toBe(false);
      expect(row.edge.confidence).toBe('established');
      expect(row.edge.kind).toBe('law');
      expect(bridgeSeedKeys()).toContain(`be-${row.id}`);
    }
  });

  it('CONTROL: dropping a reference is a manifest problem', () => {
    const carriers = manifest.entries.map((entry) => ({
      id: entry.key,
      formalRef: entry.key === 'be-66' ? undefined : physjsFormalRef(entry.key),
    }));
    expect(physjsManifestProblems({ manifest, bridges: carriers }).join('\n')).toMatch(
      /bridge 'be-66' has no lean4-physjs formalRef/,
    );
  });
});
