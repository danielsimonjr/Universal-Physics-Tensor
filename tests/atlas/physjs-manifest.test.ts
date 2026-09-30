/**
 * The vendored PhysJS manifest is the pin for every `lean4-physjs` formalRef.
 *
 * A wrong commit, theorem, key, or coverage phrase fails here. So does a
 * manifest entry that does not resolve to a bridge, and a `lean4-physjs`
 * reference the manifest does not name. The mutations are the control: a
 * checker that ignored those fields would stay green.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import {
  PHYSJS_COMMIT,
  physjsFormalRef,
  physjsManifestProblems,
  type PhysjsManifestFile,
} from '../../src/atlas/physjs-ref.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
const bridges = ATLAS_FAMILIES.flatMap((family) => family.bridges);

/** The manifest at PhysJS `main` `0e0594f`, in file order. A swapped theorem or key fails this list. */
const EXPECTED: readonly (readonly [string, string, string])[] = [
  ['ab-kg-schrodinger', 'PhysJS.KgSchrodinger.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-klein-gordon-wave', 'PhysJS.KleinGordonWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-stiff-string', 'PhysJS.StiffString.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-diffusion', 'PhysJS.TelegraphDiffusion.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-wave', 'PhysJS.TelegraphWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-pendulum-linear', 'PhysJS.Pendulum.linearizedEquationOfMotion_iff', 'the transformation, not bound.delta'],
];

const COVERAGE = 'covers its statement only';

describe('vendored PhysJS manifest', () => {
  it('records commit 0e0594f, and every coverage phrase says the reference covers its statement only', () => {
    expect(manifest.commit).toBe('0e0594f');
    expect(manifest.commit).toBe(PHYSJS_COMMIT);
    expect(manifest.toolchain).toBe('leanprover/lean4:v4.34.1');
    expect(manifest.entries).toHaveLength(EXPECTED.length);
    expect(manifest.entries.every((entry) => entry.coverage === COVERAGE)).toBe(true);
  });

  it('names the six theorems and keys, in manifest order', () => {
    expect(manifest.entries.map((entry) => [entry.key, entry.theorem, entry.covers])).toEqual(EXPECTED.map((row) => [...row]));
  });

  it('every manifest entry resolves to a bridge whose formalRef is that entry', () => {
    expect(physjsManifestProblems({ manifest, bridges })).toEqual([]);
    for (const entry of manifest.entries) {
      const bridge = bridges.find((candidate) => candidate.id === entry.key);
      expect(bridge, entry.key).toBeDefined();
      expect(entry.bridgeId).toBe(entry.key);
      expect(bridge!.formalRef?.system).toBe('lean4-physjs');
      expect(bridge!.formalRef?.statement).toBe(entry.theorem);
      expect(bridge!.formalRef?.covers).toContain(entry.covers);
      expect(bridge!.formalRef?.covers).toContain(COVERAGE);
      expect(bridge!.formalRef?.version).toContain(`physjs@${manifest.commit}`);
      expect(bridge!.formalRef?.fidelity).not.toBe('unreviewed');
    }
  });

  it('the pendulum theorem imports the Physlib statement and does not claim bound.delta', () => {
    const pendulum = manifest.entries.find((entry) => entry.key === 'ab-pendulum-linear');
    expect(pendulum?.imports).toBe('ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff');
    expect(pendulum?.covers).toBe('the transformation, not bound.delta');
  });

  it('six reviewed formalRefs derive formally-proved, and none of them stores the tag', () => {
    const reviewed = bridges.filter((bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed');
    expect(reviewed.map((bridge) => bridge.id)).toEqual([
      'ab-pendulum-linear',
      'ab-telegraph-diffusion',
      'ab-telegraph-wave',
      'ab-klein-gordon-wave',
      'ab-kg-schrodinger',
      'ab-stiff-string',
    ]);
    for (const bridge of reviewed) {
      expect(deriveEvidence(bridge, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(bridge.evidence.has('formally-proved')).toBe(false);
    }
  });

  it('fails on a wrong commit, theorem, key, or coverage phrase', () => {
    const wrongCommit = { ...manifest, commit: '0000000' };
    expect(physjsManifestProblems({ manifest: wrongCommit, bridges }).join('\n')).toMatch(/commit is '0000000'/);

    const wrongTheorem = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, theorem: 'PhysJS.Wrong.theorem' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongTheorem, bridges }).join('\n')).toMatch(/PhysJS\.Wrong\.theorem/);

    const wrongKey = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, key: 'ab-no-such-bridge', bridgeId: 'ab-no-such-bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongKey, bridges }).join('\n')).toMatch(
      /'ab-no-such-bridge' does not resolve to a bridge/,
    );

    const wrongCoverage = {
      ...manifest,
      entries: manifest.entries.map((entry) => ({ ...entry, coverage: 'covers the whole bridge' })),
    };
    expect(physjsManifestProblems({ manifest: wrongCoverage, bridges }).join('\n')).toMatch(/coverage phrase/);
  });

  it('does not skip a lean4-physjs reference the manifest does not name', () => {
    const extra = [...bridges, { id: 'ab-not-in-manifest', formalRef: physjsFormalRef('ab-pendulum-linear') }];
    expect(physjsManifestProblems({ manifest, bridges: extra }).join('\n')).toMatch(
      /lean4-physjs formalRef on 'ab-not-in-manifest' has no manifest entry/,
    );
  });
});
