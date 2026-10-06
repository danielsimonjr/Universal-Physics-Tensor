/**
 * The specification writes up the cross-domain catalog records, and only those.
 *
 * The set of Bridge Equation headings equals the set of records whose `type`
 * is `cross-domain`. Each of those sections carries the record's formula and
 * the PhysJS theorem named by `formalKey` (or states that no formalRef exists
 * when the record has no key). A standard record has no heading.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

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

/** Headings and cross-domain ids are the same set. */
export function headingsMatchFiling(
  headings: ReadonlySet<number>,
  crossDomainIds: readonly number[],
): boolean {
  if (headings.size !== crossDomainIds.length) return false;
  return crossDomainIds.every((id) => headings.has(id));
}

describe('specification sections equal the cross-domain records', () => {
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
  const crossDomain = catalog.entries.filter((entry) => entry.type === 'cross-domain');
  const standard = catalog.entries.filter((entry) => entry.type === 'standard');

  it('the set of headings equals the set of cross-domain records', () => {
    expect(crossDomain.length).toBeGreaterThan(0);
    expect(standard.length).toBeGreaterThan(0);
    expect(
      headingsMatchFiling(
        currentHeadings,
        crossDomain.map((entry) => entry.id),
      ),
    ).toBe(true);
    for (const entry of standard) {
      expect(currentHeadings.has(entry.id), `catalog id ${entry.id} is standard`).toBe(false);
    }
  });

  it('every cross-domain section carries the record formula and formalRef', () => {
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

  it('rejects a heading set that adds a standard id or drops a cross-domain id', () => {
    const crossIds = crossDomain.map((entry) => entry.id);
    const withStandard = new Set([...crossIds, standard[0]!.id]);
    expect(headingsMatchFiling(withStandard, crossIds)).toBe(false);
    const dropped = new Set(crossIds.slice(1));
    expect(headingsMatchFiling(dropped, crossIds)).toBe(false);
    expect(headingsMatchFiling(new Set(crossIds), crossIds)).toBe(true);
  });

  it('rejects a formula the section does not contain', () => {
    expect(formulaInSection('E = mc^2', 'alt="E = mc"')).toBe(false);
    expect(formulaInSection('E = mc^2', 'alt="E = mc^2"')).toBe(true);
  });
});
