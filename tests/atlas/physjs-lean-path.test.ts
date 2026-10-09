/**
 * Every PhysJS URL this library emits names a Lean file that exists at the
 * pinned commit as `lean/<File>.lean`.
 *
 * PhysJS #63 flattened the sources. `formal/physjs/lean-files.json` is the
 * tree listing at that commit. The path `lean/<File>.lean` is written here,
 * not taken from the permalink builder, so a builder that returns
 * `lean/PhysJS/<File>.lean` fails this file.
 *
 * The first run failed: `physjsFormalRef('ab-pendulum-linear').url` was
 * `https://github.com/danielsimonjr/PhysJS/blob/<commit>/PhysJS/Pendulum.lean`.
 * After #61 it was `lean/PhysJS/Pendulum.lean`. That prefix is the record
 * from before this flatten.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { PHYSJS_COMMIT, physjsFormalRef, physjsLeanFile, physjsNestedStatements, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { declaredTheorems, manifestTheorems, vendoredFiles } from '../../scripts/vendor-physjs.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const leanFiles = new Set(
  JSON.parse(readFileSync(resolve(root, 'formal/physjs/lean-files.json'), 'utf-8')) as readonly string[],
);

/** Hardcoded. A builder regression to `lean/PhysJS/` must not satisfy this. */
const URL_RE = new RegExp(
  `^https://github.com/danielsimonjr/PhysJS/blob/${PHYSJS_COMMIT}/lean/([^/]+\\.lean)$`,
);

const STORED = [
  'data/bridge-catalog.json',
  'data/atlas/atlas.json',
  'data/atlas/oscillators.json',
  'data/atlas/diffusion.json',
  'data/atlas/waves.json',
] as const;

function emittedUrls(): string[] {
  return [
    ...ATLAS_FAMILIES.flatMap((family) => family.bridges).flatMap((bridge) =>
      bridge.formalRef === undefined ? [] : [bridge.formalRef.url],
    ),
    ...BRIDGE_EQUATIONS.flatMap((entry) => {
      const formalRef = catalogFormalRef(entry.id);
      return formalRef === undefined ? [] : [formalRef.url];
    }),
  ];
}

function storedUrls(): string[] {
  const urls: string[] = [];
  for (const rel of STORED) {
    const text = readFileSync(resolve(root, rel), 'utf-8');
    for (const match of text.matchAll(/https:\/\/github\.com\/danielsimonjr\/PhysJS\/blob\/[^\s"]+/g)) {
      const url = match[0];
      if (url !== undefined) urls.push(url);
    }
  }
  return urls;
}

function expectLeanFile(url: string): void {
  const match = URL_RE.exec(url);
  expect(match, url).not.toBeNull();
  expect(leanFiles.has(`lean/${match?.[1]}`), url).toBe(true);
}

describe('PhysJS permalinks name the lean/ tree at the pin', () => {
  it('the fixture lists lean/<File>.lean and not a PhysJS directory', () => {
    expect(leanFiles.has('lean/Pendulum.lean')).toBe(true);
    expect(leanFiles.has('lean/PhysJS/Pendulum.lean')).toBe(false);
    expect(leanFiles.has('PhysJS/Pendulum.lean')).toBe(false);
    expect(leanFiles.has('lean.lean')).toBe(false);
    expect(leanFiles.has('lean/OscillatorDictionary.lean')).toBe(true);
    expect(leanFiles.has('lean/MagneticPressure.lean')).toBe(true);
    expect(leanFiles.has('lean/LondonPenetration.lean')).toBe(true);
    expect(leanFiles.has('lean/PlasmaBeta.lean')).toBe(true);
    expect([...leanFiles].every((path) => /^lean\/[^/]+\.lean$/.test(path))).toBe(true);
    // Every file a manifest theorem is declared in is in the listing. The
    // listing's size is PhysJS's, not a number kept here; the hand-kept
    // count that grew with each pin is the record from before this check.
    const files = JSON.parse(readFileSync(resolve(root, 'formal/physjs/theorem-files.json'), 'utf-8')) as {
      readonly files: Readonly<Record<string, string>>;
    };
    for (const path of Object.values(files.files)) expect(leanFiles.has(path), path).toBe(true);
  });

  it('every formalRef URL is a file in that tree', () => {
    const urls = emittedUrls();
    // 127 is the record from before be-147..170 each added a catalog formalRef.
    // 57 is the record from before be-77..87 each added a catalog formalRef.
    expect(urls.length).toBe(151);
    // 114 is the record from before be-134..146.
    // 106 is the record from before be-126..133.
    // 83 is the record from before be-103..125. 68 is the record from before be-88..102.
    for (const url of urls) expectLeanFile(url);
    const spring = physjsFormalRef('ab-spring-lc').url;
    expect(URL_RE.exec(spring)?.[1]).toBe('OscillatorDictionary.lean');
    expect(spring.includes('/lean/PhysJS/')).toBe(false);
    expect(spring.includes('/SpringLc.lean')).toBe(false);
  });

  it('every stored PhysJS URL is that same file', () => {
    const urls = storedUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expectLeanFile(url);
  });
});

describe('the Lean file of a theorem is where it is declared, read from data', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
  const vendored = JSON.parse(readFileSync(resolve(root, 'formal/physjs/theorem-files.json'), 'utf-8')) as {
    commit: string;
    files: Record<string, string>;
  };

  it('theorem-files.json is for the manifest commit and names a listed file for every manifest statement', () => {
    expect(vendored.commit).toBe(manifest.commit);
    const theorems = [...new Set(manifestTheorems(manifest))].sort();
    expect(Object.keys(vendored.files).sort()).toEqual(theorems);
    for (const theorem of theorems) {
      expect(leanFiles.has(vendored.files[theorem]!), theorem).toBe(true);
      expect(`lean/${physjsLeanFile(theorem)}`, theorem).toBe(vendored.files[theorem]);
    }
  });

  it('a nested statement links to its own file, not to its namespace', () => {
    // The first run of this check failed: physjsLeanFile read the namespace, so this was Einstein.lean.
    expect(physjsLeanFile('PhysJS.Einstein.friedmann_corollary')).toBe('VacuumFriedmann.lean');
    expect(physjsLeanFile('PhysJS.Einstein.trace_eq')).toBe('Einstein.lean');
    expect(physjsLeanFile('PhysJS.SpringLc.time_rescale_equationOfMotion')).toBe('OscillatorDictionary.lean');
    const be13 = manifest.entries.find((entry) => entry.key === 'be-13')!;
    expect(physjsNestedStatements(be13).nested.map((n) => [n.name, physjsLeanFile(n.theorem)])).toEqual([
      ['vacuum', 'Einstein.lean'],
      ['corollary', 'VacuumFriedmann.lean'],
    ]);
    expect(() => physjsLeanFile('PhysJS.NoSuch.theorem')).toThrow(/not a statement of the vendored manifest/);
  });

  it('the vendor script reads namespaces, sections and comments the way Lean scopes them', () => {
    const source = [
      'namespace PhysJS.Einstein',
      '/- theorem not_this : True -/',
      '-- theorem nor_this : True',
      'section Inner',
      'theorem friedmann_corollary (x : ℝ) : x = x := rfl',
      'end Inner',
      '@[simp] lemma helper : True := trivial',
      'end PhysJS.Einstein',
      'namespace PhysJS.SpringLc',
      'protected theorem time_rescale_equationOfMotion : True := trivial',
      'open Real Nat in theorem opened : True := trivial',
      '@[simp] @[nolint docBlame] lemma twoAttrs : True := trivial',
      'open Real in',
      'theorem openedOnPreviousLine : True := trivial',
      'end PhysJS.SpringLc',
    ].join('\n');
    expect(declaredTheorems(source)).toEqual([
      'PhysJS.Einstein.friedmann_corollary',
      'PhysJS.Einstein.helper',
      'PhysJS.SpringLc.time_rescale_equationOfMotion',
      'PhysJS.SpringLc.opened',
      'PhysJS.SpringLc.twoAttrs',
      'PhysJS.SpringLc.openedOnPreviousLine',
    ]);
  });

  it('the vendor script renders all three pinned files from PhysJS at one commit', () => {
    const tree: Record<string, string> = {
      'manifest/bridges.json': JSON.stringify({ schema: 'physjs-bridge-manifest/v2', entries: [{ key: 'k', theorem: 'PhysJS.A.t' }] }),
      'lean/B.lean': 'namespace PhysJS.B\ntheorem u : True := trivial\nend PhysJS.B',
      'lean/A.lean': 'namespace PhysJS.A\ntheorem t : True := trivial\nend PhysJS.A',
      'README.md': 'not Lean',
    };
    const files = vendoredFiles('abc123', { show: (path) => tree[path]!, paths: () => Object.keys(tree) });
    expect(JSON.parse(files['formal/physjs/manifest.json']!)).toEqual({ schema: 'physjs-bridge-manifest/v2', entries: [{ key: 'k', theorem: 'PhysJS.A.t' }], commit: 'abc123' });
    expect(JSON.parse(files['formal/physjs/lean-files.json']!)).toEqual(['lean/A.lean', 'lean/B.lean']);
    expect(JSON.parse(files['formal/physjs/theorem-files.json']!)).toEqual({ commit: 'abc123', files: { 'PhysJS.A.t': 'lean/A.lean' } });
  });

  it('the committed manifest and lean-files.json have the shape the vendor script writes', () => {
    // CI's docs-fresh job checks them byte for byte against a fetch of PhysJS at the pin.
    const manifestText = readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestText) as { commit: string };
    expect(Object.keys(manifest).at(-1)).toBe('commit');
    expect(manifestText).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
    expect([...leanFiles]).toEqual([...leanFiles].sort());
  });
});
