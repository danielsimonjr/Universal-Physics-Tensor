/**
 * `formalRefCarriers()` is the one list of reference carriers: every atlas
 * bridge, every catalog row, and every canonical equation whose id is a
 * manifest key. The manifest check reads it. Tests 1, 3, 4 and 5 fail when the
 * canonical part of the list is dropped or widened. The other two tests check
 * that physjsManifestProblems reports an unresolved key.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { formalRefCarriers } from '../../src/atlas/formal-ref-carriers.js';
import { physjsManifestProblems, physjsTheorem, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { DIMENSIONAL_CLASSICS } from '../../src/canonical/entries/dimensional-classics.js';
import { CANONICAL_EQUATIONS, canonicalById } from '../../src/canonical/registry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/lean/manifest.json'), 'utf8')) as PhysjsManifestFile;

describe('formalRefCarriers', () => {
  it('leaves the real manifest with no problem', () => {
    expect(physjsManifestProblems({ manifest, bridges: formalRefCarriers() })).toEqual([]);
  });

  it('physjsManifestProblems reports a manifest key that names no bridge and no canonical record', () => {
    const extra = {
      ...manifest,
      entries: [...manifest.entries, { ...manifest.entries[0]!, key: 'CE-no-such-record', bridgeId: 'CE-no-such-record' }],
    };
    expect(physjsManifestProblems({ manifest: extra, bridges: formalRefCarriers() }).join('\n')).toContain(
      "manifest key 'CE-no-such-record' does not resolve to a bridge",
    );
  });

  it('holds no carrier for a canonical equation with no manifest entry', () => {
    expect(canonicalById('CE-newton-second-law')).toBeDefined();
    expect(formalRefCarriers().some((c) => c.id === 'CE-newton-second-law')).toBe(false);
  });

  it('gives the pendulum record a reviewed derivation-step reference', () => {
    const carrier = formalRefCarriers().find((c) => c.id === 'CE-pendulum-period');
    expect(carrier?.formalRef?.system).toBe('lean4-physjs');
    expect(carrier?.formalRef?.kind).toBe('derivation-step');
    expect(carrier?.formalRef?.fidelity).toBe('reviewed-manifest');
  });

  it('gives every dimensional classic a reviewed derivation-step carrier', () => {
    // The set comes from the classics file, not from the manifest, so a forgotten manifest row fails here.
    // Seven other canonical records are 'dimensional' too (condensed matter, fluids); they are not classics.
    const classics = DIMENSIONAL_CLASSICS.filter((e) => e.epistemicStatus === 'dimensional');
    expect(classics).toHaveLength(9);
    const carriers = formalRefCarriers();
    for (const classic of classics) {
      const carrier = carriers.find((c) => c.id === classic.id);
      expect(carrier?.formalRef?.kind, classic.id).toBe('derivation-step');
      expect(carrier?.formalRef?.fidelity, classic.id).toBe('reviewed-manifest');
    }
    expect(carriers.filter((c) => canonicalById(c.id) !== undefined)).toHaveLength(classics.length);
  });

  it('counts atlas bridges, catalog rows and canonical manifest keys, each once', () => {
    const atlas = ATLAS_FAMILIES.flatMap((family) => family.bridges).length;
    const canonical = CANONICAL_EQUATIONS.filter((e) => physjsTheorem(e.id) !== undefined).length;
    expect(canonical).toBeGreaterThan(0);
    expect(formalRefCarriers()).toHaveLength(atlas + BRIDGE_EQUATIONS.length + canonical);
    const ids = formalRefCarriers().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('physjsManifestProblems reports the canonical key when no canonical carrier is passed', () => {
    const withoutCanonical = formalRefCarriers().filter((c) => canonicalById(c.id) === undefined);
    expect(physjsManifestProblems({ manifest, bridges: withoutCanonical }).join('\n')).toContain(
      "manifest key 'CE-pendulum-period' does not resolve to a bridge",
    );
  });
});
