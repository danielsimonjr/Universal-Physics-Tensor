/**
 * Specification sections follow the catalog filing.
 *
 * A cross-domain record has exactly one Bridge Equation section. That
 * section carries the record's formula and the PhysJS theorem named by
 * `formalKey` (or states that no formalRef exists when the record has no
 * key). A standard record keeps a section only when that heading was
 * already in the specification at the baseline commit. A new standard
 * heading fails.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

/** Specification before this filing. Headings in that tree are the ones a standard record may keep. */
const BASELINE = '8b47da58beed2d9442cabab6816cbe3f17d3521d';

const ABSENT_FORMAL = /no PhysJS formalRef|There is no PhysJS|has no PhysJS formalRef|no formalRef|key is withheld/i;

interface CatalogEntry {
  id: number;
  type: 'standard' | 'cross-domain';
  formula_latex: string | null;
  formalKey?: string;
}

interface ManifestEntry {
  key: string;
  theorem: string;
}

function readSpec(name: 'Part-I.md' | 'Part-II.md'): string {
  return readFileSync(resolve(repoRoot, 'docs', 'specification', name), 'utf8');
}

function baselineSpec(): string {
  const parts = ['Part-I.md', 'Part-II.md'].map((name) =>
    execSync(`git show ${BASELINE}:docs/specification/${name}`, {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );
  return parts.join('\n');
}

export function bridgeHeadings(spec: string): Set<number> {
  const ids = new Set<number>();
  for (const match of spec.matchAll(/\*\*Bridge Equation (\d+):/g)) {
    ids.add(Number(match[1]));
  }
  return ids;
}

export function bridgeSections(spec: string): Map<number, string> {
  const matches = [...spec.matchAll(/\*\*Bridge Equation (\d+):/g)];
  const sections = new Map<number, string>();
  for (let i = 0; i < matches.length; i++) {
    const id = Number(matches[i][1]);
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? spec.length) : spec.length;
    const section = spec.slice(start, end);
    const previous = sections.get(id);
    sections.set(id, previous === undefined ? section : `${previous}\n${section}`);
  }
  return sections;
}

function collapsed(value: string): string {
  return value.replace(/\s+/g, '');
}

export function formulaInSection(formula: string, section: string): boolean {
  return collapsed(formula).length > 0 && collapsed(section).includes(collapsed(formula));
}

/** A standard heading is allowed when it is absent, or when the baseline specification already had it. */
export function standardHeadingAllowed(
  id: number,
  current: ReadonlySet<number>,
  baseline: ReadonlySet<number>,
): boolean {
  return !current.has(id) || baseline.has(id);
}

describe('specification sections follow the catalog filing', () => {
  const catalog = JSON.parse(
    readFileSync(resolve(repoRoot, 'data', 'bridge-catalog.json'), 'utf8'),
  ) as { entries: CatalogEntry[] };
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf8'),
  ) as { entries: ManifestEntry[] };
  const theoremByKey = new Map(manifest.entries.map((entry) => [entry.key, entry.theorem]));
  const spec = `${readSpec('Part-I.md')}\n${readSpec('Part-II.md')}`;
  const sections = bridgeSections(spec);
  const currentHeadings = bridgeHeadings(spec);
  const previousHeadings = bridgeHeadings(baselineSpec());

  it('every cross-domain record has one section whose formula and formalRef match the record', () => {
    const crossDomain = catalog.entries.filter((entry) => entry.type === 'cross-domain');
    expect(crossDomain.length).toBeGreaterThan(0);
    for (const entry of crossDomain) {
      const hits = [...spec.matchAll(new RegExp(`\\*\\*Bridge Equation ${entry.id}:`, 'g'))];
      expect(hits, `catalog id ${entry.id} section count`).toHaveLength(1);
      const section = sections.get(entry.id);
      expect(section, `catalog id ${entry.id}`).toBeDefined();
      expect(
        formulaInSection(entry.formula_latex ?? '', section ?? ''),
        `catalog id ${entry.id} formula`,
      ).toBe(true);
      if (entry.formalKey === undefined) {
        expect(section ?? '', `catalog id ${entry.id} has no formalRef`).toMatch(ABSENT_FORMAL);
      } else {
        const theorem = theoremByKey.get(entry.formalKey);
        expect(theorem, `formalKey ${entry.formalKey}`).toBeDefined();
        expect(section ?? '', `catalog id ${entry.id} formalRef`).toContain(theorem);
      }
    }
  });

  it('a standard record does not gain a specification heading', () => {
    for (const entry of catalog.entries) {
      if (entry.type !== 'standard') continue;
      expect(
        standardHeadingAllowed(entry.id, currentHeadings, previousHeadings),
        `catalog id ${entry.id} is standard and its heading is not in the baseline specification`,
      ).toBe(true);
    }
  });

  it('rejects a standard heading the baseline specification does not contain', () => {
    const baseline = new Set([11]);
    expect(standardHeadingAllowed(12, new Set([12]), baseline)).toBe(false);
    expect(standardHeadingAllowed(11, new Set([11]), baseline)).toBe(true);
    expect(standardHeadingAllowed(147, new Set(), baseline)).toBe(true);
  });

  it('rejects a formula the section does not contain', () => {
    expect(formulaInSection('E = mc^2', 'alt="E = mc"')).toBe(false);
    expect(formulaInSection('E = mc^2', 'alt="E = mc^2"')).toBe(true);
  });
});
