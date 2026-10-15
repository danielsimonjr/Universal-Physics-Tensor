/**
 * Fail-loud guard: every peer the suite gates on must be present when the run
 * demands it (Round-2 audit, HIGH; 9.0.0 audit T8 / A15).
 *
 * Gated tests use `it.skipIf(...)`, so an absent peer makes them SKIP, which
 * vitest reports. Setting `UPT_REQUIRE_PEERS=1` (CI does) turns that skip into
 * an explicit failure here, for the autograd peer, the simplifier and the
 * `@viz-js/viz` renderer alike. Locally (env unset) the presence test is
 * informational.
 *
 * The second block is the structural half: a gated control that `return`s
 * inside its `it()` is reported as PASSED when the peer is absent, which is a
 * check that cannot fail. No test under `tests/atlas` may take that form.
 *
 * @module tests/peers-required
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { peerPresent, requirePeers, simplifierPresent, vizPresent } from './helpers/peers.js';
import { tempDir } from './helpers/tmp.js';

const PEERS: readonly (readonly [string, boolean, string])[] = [
  ['MathTS autograd', peerPresent, 'the AST-AD test arc would silently skip'],
  ['MathTS simplifier', simplifierPresent, 'every CAS witness and its negative control would skip'],
  ['@viz-js/viz', vizPresent, 'the SVG rendering tests would skip'],
];

describe('peer presence gate', () => {
  it.each(PEERS)('%s is present when UPT_REQUIRE_PEERS is set', (name, present, consequence) => {
    if (requirePeers && !present) {
      throw new Error(
        `UPT_REQUIRE_PEERS is set but the ${name} peer is absent — ${consequence}. ` +
          'Run `bun install`, or unset UPT_REQUIRE_PEERS for a peerless run.',
      );
    }
    // When not required, this is informational only.
    expect(typeof present).toBe('boolean');
  });
});

/** A gated test that returns instead of skipping: `if (…peer…) return;` inside an `it()`. */
const RETURN_INSTEAD_OF_SKIP: readonly RegExp[] = [
  /if \(![\w.()]*peerPresent[^\n]*\)\s*\{?\s*(?:\/\/[^\n]*\n\s*)*return;/,
  /if \(!\(await isSimplifierAvailable\(\)\)[^\n]*\)\s*\{?\s*(?:\/\/[^\n]*\n\s*)*return;/,
  /UPT_REQUIRE_PEERS !== '1'\)\s*\{?\s*(?:\/\/[^\n]*\n\s*)*return;/,
];

function returnsInsteadOfSkipping(source: string): boolean {
  return RETURN_INSTEAD_OF_SKIP.some((pattern) => pattern.test(source));
}

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? testFiles(join(dir, entry.name)) : entry.name.endsWith('.test.ts') ? [join(dir, entry.name)] : [],
  );
}

/** The test files under `dir` that return instead of skipping, `exclude`d paths left out. */
function offenders(dir: string, exclude: ReadonlySet<string>): string[] {
  return testFiles(dir).filter((file) => !exclude.has(file) && returnsInsteadOfSkipping(readFileSync(file, 'utf8')));
}

describe('a peer-gated control skips; it never returns as a pass', () => {
  const self = fileURLToPath(import.meta.url);
  const here = dirname(self);

  it('POSITIVE CONTROL: the scan finds the three return-instead-of-skip forms', () => {
    expect(returnsInsteadOfSkipping("it('x', async () => {\n  if (!peerPresent && !peerRequired) return;\n})")).toBe(true);
    expect(returnsInsteadOfSkipping("if (!peerPresent && !peerRequired) {\n  // reason\n  return;\n}")).toBe(true);
    expect(returnsInsteadOfSkipping("if (!(await isSimplifierAvailable()) && process.env.UPT_REQUIRE_PEERS !== '1') {\n  // a\n  // b\n  return;\n}")).toBe(true);
    expect(returnsInsteadOfSkipping("if (!(await isSimplifierAvailable())) return;")).toBe(true);
    expect(returnsInsteadOfSkipping("it.skipIf(!peerPresent && !peerRequired)('x', () => {})")).toBe(false);
  });

  it('POSITIVE CONTROL: the directory scan finds a planted offender and passes a clean file', () => {
    const dir = tempDir('upt-peers-scan-');
    writeFileSync(join(dir, 'planted.test.ts'), "it('x', async () => {\n  if (!(await isSimplifierAvailable())) return;\n});\n");
    writeFileSync(join(dir, 'clean.test.ts'), "it.skipIf(!simplifierPresent)('x', () => {});\n");
    expect(offenders(dir, new Set())).toEqual([join(dir, 'planted.test.ts')]);
  });

  it('no test under tests/ returns instead of skipping', () => {
    // Widened from tests/atlas on 2026-10-15, when tests/composition/mathts-quiet.test.ts held the
    // form. This file carries the three forms as string literals for its control, so it alone is
    // left out by path.
    expect(offenders(here, new Set([self])).map((file) => file.slice(here.length + 1))).toEqual([]);
  });
});
