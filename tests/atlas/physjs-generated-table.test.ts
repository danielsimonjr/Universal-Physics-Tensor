/**
 * The PhysJS table `physjsFormalRef` reads is generated from
 * `formal/physjs/manifest.json`.
 *
 * A fresh run matches the committed file. A theorem edited in that file,
 * and a key deleted from it, fail the formal gate. The manifest is not edited
 * in either case. A manifest entry with no bridge still fails.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { physjsManifestProblems, type PhysjsManifestFile } from '../../src/atlas/physjs-ref.js';
import { PHYSJS_ENTRIES } from '../../src/atlas/physjs-entries.generated.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generatedPath = resolve(root, 'src/atlas/physjs-entries.generated.ts');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf8')) as PhysjsManifestFile;
const carriers = [
  ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
  ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
];

describe('generated PhysJS table', () => {
  it('matches a fresh run of the generator', () => {
    const fresh = execFileSync('bun', ['scripts/generate-physjs-table.ts', '--stdout'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(readFileSync(generatedPath, 'utf8')).toBe(fresh);
  });

  it('fails the gate when a theorem in the generated table is edited and the manifest is not', () => {
    const edited = PHYSJS_ENTRIES.map((entry, index) =>
      index === 0 ? { ...entry, theorem: 'PhysJS.HandEdited.theorem' } : entry,
    );
    const problems = physjsManifestProblems({ manifest, bridges: carriers, compiledEntries: edited }).join('\n');
    expect(problems).toMatch(/compiled entry for 'ab-kg-schrodinger' disagrees with the vendored manifest/);
    expect(physjsManifestProblems({ manifest, bridges: carriers })).toEqual([]);
  });

  it('fails the gate when a key is deleted from the generated table', () => {
    const dropped = PHYSJS_ENTRIES.filter((entry) => entry.key !== 'be-64');
    const problems = physjsManifestProblems({ manifest, bridges: carriers, compiledEntries: dropped }).join('\n');
    expect(problems).toMatch(/manifest key 'be-64' is not in the compiled entry table/);
  });

  it('still fails when a manifest entry resolves to no bridge', () => {
    const orphan = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, key: 'ab-no-such-bridge', bridgeId: 'ab-no-such-bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: orphan, bridges: carriers }).join('\n')).toMatch(
      /'ab-no-such-bridge' does not resolve to a bridge/,
    );
  });
});
