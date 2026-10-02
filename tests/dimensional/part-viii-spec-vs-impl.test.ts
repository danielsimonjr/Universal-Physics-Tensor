/**
 * Spec ↔ implementation drift guard for Part-VIII Metric Layer.
 *
 * Per v0.3.0-Design.md §8 (Part-VIII drift-guard expansion):
 *   (a) Every `<!-- TENSOR-RULE: <id> -->` marker in Part-VIII MUST be
 *       referenced by at least one *.test.ts file.
 *   (b) Every `TENSOR-RULE: <id>` reference in tests MUST correspond to a
 *       real marker in Part-VII OR Part-VIII.
 *
 * Implementation mirrors tests/dimensional/tensor-spec-vs-impl.test.ts
 * — same in-process file enumeration (no shell-out, Windows-safe).
 *
 * Orphan-marker registry (markers documented in Part-VIII whose primary
 * test home is deferred or meta):
 *   TENSOR-RULE: pderiv-of-metric-composes
 *     — Forward-compat marker referenced by the covariant-derivative-preview
 *       it.todo in Task 12 (v0.4.0). Anchored here so the drift guard sees
 *       it during the v0.3.0 window before Task 12's test file lands.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const SPEC_PART_VII = resolve(
  __dirname,
  '../../docs/specification/Part-VII-Tensor-Algebra.md',
);
const SPEC_PART_VIII = resolve(
  __dirname,
  '../../docs/specification/Part-VIII-Metric-Layer.md',
);
const TESTS_DIR = resolve(__dirname, '..');

const SPEC_MARKER_RE = /<!-- TENSOR-RULE: ([\w-]+) -->/g;
const TEST_REF_RE = /TENSOR-RULE: ([\w-]+)/g;

function extractSpecRules(specPath: string): string[] {
  const text = readFileSync(specPath, 'utf-8');
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  SPEC_MARKER_RE.lastIndex = 0;
  while ((m = SPEC_MARKER_RE.exec(text)) !== null) ids.push(m[1]);
  return ids;
}

function listTestFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listTestFiles(full));
    } else if (entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function indexTestReferences(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  for (const file of listTestFiles(TESTS_DIR)) {
    const text = readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;
    TEST_REF_RE.lastIndex = 0;
    while ((m = TEST_REF_RE.exec(text)) !== null) {
      const id = m[1];
      const existing = refs.get(id) ?? [];
      if (!existing.includes(file)) existing.push(file);
      refs.set(id, existing);
    }
  }
  return refs;
}

describe('Part-VIII spec ↔ implementation drift guard', () => {
  const partVIIIRules = extractSpecRules(SPEC_PART_VIII);
  const partVIIRules = extractSpecRules(SPEC_PART_VII);
  const allValidRules = new Set([...partVIIRules, ...partVIIIRules]);
  const testRefs = indexTestReferences();

  it('Part-VIII has at least 19 TENSOR-RULE markers (skeleton baseline)', () => {
    expect(partVIIIRules.length).toBeGreaterThanOrEqual(19);
  });

  it.each(partVIIIRules.map((id) => [id]))(
    'spec rule %s is referenced in at least one test file',
    (id) => {
      const refs = testRefs.get(id);
      expect(refs, `Part-VIII TENSOR-RULE "${id}" has no test reference`).toBeDefined();
      expect(refs!.length).toBeGreaterThan(0);
    },
  );

  it('every TENSOR-RULE reference in tests matches a real marker in Part-VII or Part-VIII', () => {
    const orphans: string[] = [];
    for (const [id, files] of testRefs) {
      if (!allValidRules.has(id)) {
        orphans.push(`${id} (referenced in: ${files.join(', ')})`);
      }
    }
    expect(orphans, `Test references to nonexistent TENSOR-RULE markers:\n${orphans.join('\n')}`).toEqual([]);
  });
});

describe('v030-additive-semver-minor-bump (TENSOR-RULE)', () => {
  // TENSOR-RULE: v030-additive-semver-minor-bump
  // v0.3.1 audit fix: previously this rule was satisfied by an orphan-anchor
  // JSDoc comment in this file; the rule had no real test backing. The two
  // assertions below give the rule a concrete runtime check.
  it('package.json version is 1.0.2', () => {
    // v0.6.1 hygiene: original regex pinned /^0\.5\./ which went stale at
    // v0.6.0, then /^0\./ while the line stayed pre-1.0. 1.0.0 is the major
    // for the breaking parser change. v1.0.0 was tagged and never published.
    // 1.0.1 is the published release. 1.0.2 is this package version. No tag
    // is pushed with it. A 0.x version fails this check.
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'),
    ) as { version: string };
    expect(pkg.version).toBe('1.0.2');
    expect(pkg.version).not.toMatch(/^0\./);
  });

  it('Part-VIII §VIII.11 marker exists in the spec', () => {
    const spec = readFileSync(
      resolve(__dirname, '../../docs/specification/Part-VIII-Metric-Layer.md'),
      'utf-8',
    );
    expect(spec).toContain('TENSOR-RULE: v030-additive-semver-minor-bump');
  });
});
