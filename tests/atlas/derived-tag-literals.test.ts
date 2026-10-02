/**
 * Atlas Phase 4, S4.3 — the two DERIVED tags cannot be hand-set.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §3.
 *
 * The literals `'formally-proved'` and `'symbolically-checked'` may appear
 * in exactly three files: `src/relations/types.ts` (where the union and the
 * tag list are declared), `src/atlas/types.ts` (`NormTransport.basis` names
 * `symbolically-checked`), and `src/atlas/derive-evidence.ts` (where each tag
 * is derived).
 *
 * **An allow-list of FILES, not a heuristic over initializers.** A check that
 * inspected how a tag is assigned (`evidence: new Set([...])`, a helper call,
 * a spread) is defeated by assigning it a way the heuristic did not foresee.
 * A file that cannot spell the tag cannot set it, whatever the syntax.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');
const scanRoots = [resolve(srcDir, 'atlas'), resolve(srcDir, 'relations')];

const DERIVED_TAGS = [
  'formally-proved',
  'formally-proved-property',
  'formally-proved-cross-check',
  'symbolically-checked',
] as const;
const ALLOWED = new Set([
  'atlas/derive-evidence.ts',
  'atlas/types.ts',
  'relations/types.ts',
]);

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * Remove comments, so a doc comment that NAMES a tag in a markdown code span
 * does not count. A comment cannot set a tag; code can. Block comments first,
 * then line comments that start a line or follow whitespace (so a `//` inside
 * a URL string is left alone).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/** Whether CODE (comments removed) spells a derived tag as a string literal of any quote style. */
function spellsDerivedTag(source: string): boolean {
  const code = stripComments(source);
  return DERIVED_TAGS.some((tag) => ["'", '"', '`'].some((q) => code.includes(`${q}${tag}${q}`)));
}

/** Files under `src/atlas/` and `src/relations/` whose code contains a derived tag as a literal. */
function filesSpellingDerivedTags(): string[] {
  const hits: string[] = [];
  for (const root of scanRoots) {
    for (const file of tsFiles(root)) {
      if (spellsDerivedTag(readFileSync(file, 'utf-8'))) {
        hits.push(relative(srcDir, file).replaceAll('\\', '/'));
      }
    }
  }
  return hits.sort();
}

describe('derived evidence tags — file allow-list', () => {
  it('the scan walks the atlas tree and the relations vocabulary (a scan over no files would pass vacuously)', () => {
    expect(scanRoots.flatMap((root) => tsFiles(root)).length).toBeGreaterThan(20);
  });

  it('MATCHER CONTROLS: every quote style in code is caught; a comment is not', () => {
    expect(spellsDerivedTag("evidence: new Set(['symbolically-checked'])")).toBe(true);
    expect(spellsDerivedTag('tags.add("formally-proved")')).toBe(true);
    // A template literal sets a tag as well as a quoted string does.
    expect(spellsDerivedTag('const t = `formally-proved`;')).toBe(true);
    expect(spellsDerivedTag('/** derived as `symbolically-checked` */\nconst x = 1;')).toBe(false);
    expect(spellsDerivedTag('// see `formally-proved`\nconst x = 1;')).toBe(false);
    // Code AFTER a comment in the same file is still scanned.
    expect(spellsDerivedTag("/* note */ const t = 'formally-proved';")).toBe(true);
  });

  it('POSITIVE CONTROL: the scanner finds the literals where they are allowed', () => {
    // If this fails the matcher is broken, and the real assertion below would
    // pass for the wrong reason.
    expect(filesSpellingDerivedTags()).toEqual(
      expect.arrayContaining(['atlas/derive-evidence.ts', 'atlas/types.ts', 'relations/types.ts']),
    );
  });

  it('the derived-tag literals appear only in the vocabulary, NormTransport.basis, and derive-evidence.ts', () => {
    const offenders = filesSpellingDerivedTags().filter((f) => !ALLOWED.has(f));
    expect(offenders).toEqual([]);
  });
});
