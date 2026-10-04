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
import { PHYSJS_COMMIT, physjsFormalRef } from '../../src/atlas/physjs-ref.js';
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
    // 60 is the record from before PhysJS #64 added the eleven Lean files.
    expect(leanFiles.size).toBe(71);
  });

  it('every formalRef URL is a file in that tree', () => {
    const urls = emittedUrls();
    // 57 is the record from before be-77..87 each added a catalog formalRef.
    expect(urls.length).toBe(68);
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
