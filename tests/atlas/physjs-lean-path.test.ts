/**
 * Every PhysJS URL this library emits names a Lean file that exists at the
 * pinned commit under `lean/PhysJS/`.
 *
 * PhysJS #61 moved the sources. `formal/physjs/lean-files.json` is the tree
 * listing at that commit. The prefix `lean/PhysJS` is written here, not taken
 * from the permalink builder, so a builder that returns `/PhysJS/<File>.lean`
 * fails this file.
 *
 * The first run failed: `physjsFormalRef('ab-pendulum-linear').url` was
 * `https://github.com/danielsimonjr/PhysJS/blob/<commit>/PhysJS/Pendulum.lean`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { PHYSJS_COMMIT, physjsFormalRef } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const leanFiles = new Set(
  JSON.parse(readFileSync(resolve(root, 'formal/physjs/lean-files.json'), 'utf-8')) as readonly string[],
);

/** Hardcoded. A builder regression to `/PhysJS/` must not satisfy this. */
const URL_RE = new RegExp(
  `^https://github.com/danielsimonjr/PhysJS/blob/${PHYSJS_COMMIT}/lean/PhysJS/([^/]+\\.lean)$`,
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
  expect(leanFiles.has(`lean/PhysJS/${match?.[1]}`), url).toBe(true);
}

describe('PhysJS permalinks name the lean/ tree at the pin', () => {
  it('the fixture lists lean/PhysJS and not the old root', () => {
    expect(leanFiles.has('lean/PhysJS/Pendulum.lean')).toBe(true);
    expect(leanFiles.has('PhysJS/Pendulum.lean')).toBe(false);
    expect(leanFiles.has('lean/PhysJS/OscillatorDictionary.lean')).toBe(true);
    expect([...leanFiles].every((path) => path.startsWith('lean/PhysJS/') && path.endsWith('.lean'))).toBe(true);
    expect(leanFiles.size).toBeGreaterThan(0);
  });

  it('every formalRef URL is a file in that tree', () => {
    const urls = emittedUrls();
    expect(urls.length).toBe(54);
    for (const url of urls) expectLeanFile(url);
    const spring = physjsFormalRef('ab-spring-lc').url;
    expect(URL_RE.exec(spring)?.[1]).toBe('OscillatorDictionary.lean');
    expect(spring.includes('/lean/PhysJS/SpringLc.lean')).toBe(false);
  });

  it('every stored PhysJS URL is that same file', () => {
    const urls = storedUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expectLeanFile(url);
  });
});
