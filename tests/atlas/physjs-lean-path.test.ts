/**
 * Every Lean URL this library emits names a file of this repository's
 * `lean/` at the release tag, as `lean/<File>.lean`.
 *
 * `formal/lean/lean-files.json` is the listing of that tree, and
 * `scripts/lean-index.ts --check` (docs-fresh) holds it to the working tree.
 * The path `lean/<File>.lean` is written here, not taken from the permalink
 * builder, so a builder that returns `lean/PhysJS/<File>.lean`, or a PhysJS
 * URL, fails this file.
 *
 * The first run (PhysJS era) failed: `physjsFormalRef('ab-pendulum-linear').url`
 * was `https://github.com/danielsimonjr/PhysJS/blob/<commit>/PhysJS/Pendulum.lean`.
 * After PhysJS #61 it was `lean/PhysJS/Pendulum.lean`. In 11.0.0 the proofs
 * moved here and every URL names this repository at `v<version>`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { LEAN_SOURCE_TAG, physjsFormalRef, physjsLeanFile, physjsNestedStatements, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { declaredTheorems, indexFiles, lakePins, manifestTheorems, pinProblems, treeLeanFiles } from '../../scripts/lean-index.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { CENSUS } from '../helpers/census.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const leanFiles = new Set(
  JSON.parse(readFileSync(resolve(root, 'formal/lean/lean-files.json'), 'utf-8')) as readonly string[],
);

/** Hardcoded. A builder regression to `lean/PhysJS/` must not satisfy this. */
const URL_RE = new RegExp(
  `^https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/${LEAN_SOURCE_TAG}/lean/([^/]+\\.lean)$`,
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
    // A PhysJS permalink left in stored data is matched too, and fails `expectLeanFile`.
    for (const match of text.matchAll(/https:\/\/github\.com\/danielsimonjr\/(?:PhysJS|Universal-Physics-Tensor)\/blob\/[^\s"]+/g)) {
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

describe('Lean permalinks name this repository\'s lean/ tree at the release tag', () => {
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
    // listing's size is the tree's, not a number kept here; the hand-kept
    // count that grew with each pin is the record from before this check.
    expect([...leanFiles]).toEqual(treeLeanFiles());
    const files = JSON.parse(readFileSync(resolve(root, 'formal/lean/theorem-files.json'), 'utf-8')) as {
      readonly files: Readonly<Record<string, string>>;
    };
    for (const path of Object.values(files.files)) expect(leanFiles.has(path), path).toBe(true);
  });

  it('every formalRef URL is a file in that tree', () => {
    const urls = emittedUrls();
    // 127 is the record from before be-147..170 each added a catalog formalRef.
    // 57 is the record from before be-77..87 each added a catalog formalRef.
    expect(urls.length).toBe(CENSUS.formalRefs.emitted);
    // 114 is the record from before be-134..146.
    // 106 is the record from before be-126..133.
    // 83 is the record from before be-103..125. 68 is the record from before be-88..102.
    for (const url of urls) expectLeanFile(url);
    const spring = physjsFormalRef('ab-spring-lc').url;
    expect(URL_RE.exec(spring)?.[1]).toBe('OscillatorDictionary.lean');
    expect(spring.includes('/lean/PhysJS/')).toBe(false);
    expect(spring.includes('/SpringLc.lean')).toBe(false);
  });

  it('every stored Lean URL is that same file', () => {
    const urls = storedUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expectLeanFile(url);
  });
});

describe('the Lean file of a theorem is where it is declared, read from data', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'formal/lean/manifest.json'), 'utf-8')) as PhysjsManifestFile;
  const vendored = JSON.parse(readFileSync(resolve(root, 'formal/lean/theorem-files.json'), 'utf-8')) as {
    files: Record<string, string>;
  };

  it('theorem-files.json names a listed file for every manifest statement, and records no commit', () => {
    expect(Object.keys(vendored)).toEqual(['files']);
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
    expect(() => physjsLeanFile('PhysJS.NoSuch.theorem')).toThrow(/not a statement of the Lean manifest/);
  });

  it('the index script reads namespaces, sections and comments the way Lean scopes them', () => {
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

  it('the index script renders both index files from the tree, and nothing else', () => {
    const tree: Record<string, string> = {
      'lean/B.lean': 'namespace PhysJS.B\ntheorem u : True := trivial\nend PhysJS.B',
      'lean/A.lean': 'namespace PhysJS.A\ntheorem t : True := trivial\nend PhysJS.A',
    };
    const pins = { toolchain: 't', mathlib: 'm', physlib: 'p' };
    const files = indexFiles({ ...pins, entries: [{ theorem: 'PhysJS.A.t' }] }, Object.keys(tree), (path) => tree[path]!);
    expect(Object.keys(files).sort()).toEqual(['formal/lean/lean-files.json', 'formal/lean/theorem-files.json']);
    expect(JSON.parse(files['formal/lean/lean-files.json']!)).toEqual(['lean/A.lean', 'lean/B.lean']);
    expect(JSON.parse(files['formal/lean/theorem-files.json']!)).toEqual({ files: { 'PhysJS.A.t': 'lean/A.lean' } });
    expect(() => indexFiles({ ...pins, entries: [{ theorem: 'PhysJS.C.none' }] }, Object.keys(tree), (path) => tree[path]!)).toThrow(
      /PhysJS\.C\.none: declared in no file/,
    );
  });

  it('the manifest records the toolchain, Mathlib and Physlib the lake project builds with', () => {
    const read = (path: string): string => readFileSync(resolve(root, path), 'utf-8');
    const lake = lakePins(read('lean-toolchain'), read('lake-manifest.json'));
    expect(pinProblems(manifest, lake)).toEqual([]);
    expect(pinProblems({ ...manifest, mathlib: 'v0.0.0' }, lake)).toEqual([
      `formal/lean/manifest.json mathlib is 'v0.0.0', the lake project builds with '${lake.mathlib}'`,
    ]);
  });

  it('the committed manifest and lean-files.json are in the shape the scripts write', () => {
    const manifestText = readFileSync(resolve(root, 'formal/lean/manifest.json'), 'utf-8');
    expect(manifestText).toBe(`${JSON.stringify(JSON.parse(manifestText), null, 2)}\n`);
    expect('commit' in (JSON.parse(manifestText) as object)).toBe(false);
    expect([...leanFiles]).toEqual([...leanFiles].sort());
  });
});
