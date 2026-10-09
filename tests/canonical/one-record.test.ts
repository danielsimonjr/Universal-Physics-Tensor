/**
 * A canonical equation is one record. What the library knows about an entry
 * (its validity condition, its sourced prefactor, a group prefactor, the
 * disclosure of an unset factor, a convention note, the comparison targets it
 * answers to) is a field of that entry, not a row in a side table keyed by its
 * id in another layer. The projections below exist for callers; the entry owns
 * the fact.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalById, CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import {
  CANONICAL_GROUP_PREFACTORS,
  canonicalGroupPrefactor,
  canonicalPrefactor,
} from '../../src/composition/canonical-prefactors.js';
import { NAME_TABLE } from '../../src/composition/aliases.js';

const ROOT = join(import.meta.dirname, '../../src');

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...tsFiles(path));
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Files that may name a canonical id in code: the entries themselves, and
 * cross-references FROM another record TO an equation (an atlas model's
 * `canonicalEquation` link, an applied case's comparison target). A new
 * directory on this list is a decision, not a default.
 */
const MAY_NAME_CANONICAL_IDS = (rel: string): boolean =>
  rel.startsWith('canonical/entries/') || rel.startsWith('cases/') || /^atlas\/[a-z-]+\/models\.ts$/.test(rel);

describe('a canonical equation is one record', () => {
  it('no id-keyed canonical fact lives outside src/canonical/entries', () => {
    const hits: string[] = [];
    for (const file of tsFiles(ROOT)) {
      const rel = relative(ROOT, file);
      if (MAY_NAME_CANONICAL_IDS(rel)) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      const literals = code.match(/'CE-[a-z][a-z0-9-]*'/g) ?? [];
      if (literals.length > 0) hits.push(`${rel}: ${[...new Set(literals)].join(', ')}`);
    }
    expect(hits).toEqual([]);
  });

  it('the prefactor tables are projections of the entries', () => {
    const withPrefactor = CANONICAL_EQUATIONS.filter((e) => e.prefactor !== undefined);
    expect(withPrefactor.length).toBe(28);
    for (const e of withPrefactor) expect(canonicalPrefactor(e.id)).toBe(e.prefactor!.value);
    for (const e of CANONICAL_EQUATIONS.filter((x) => x.prefactor === undefined)) expect(canonicalPrefactor(e.id), e.id).toBeUndefined();
    const grouped = CANONICAL_EQUATIONS.filter((e) => e.groupPrefactor !== undefined);
    expect(grouped.map((e) => e.id)).toEqual(['CE-sound-speed']);
    expect(CANONICAL_GROUP_PREFACTORS.map((g) => g.id)).toEqual(['CE-sound-speed']);
    expect(canonicalGroupPrefactor('CE-sound-speed', 1.4)).toBeCloseTo(Math.sqrt(1.4), 15);
  });

  it('the validity conditions are entry fields', () => {
    expect(CANONICAL_EQUATIONS.filter((e) => e.holds !== undefined).length).toBe(40);
    expect(canonicalById('CE-wien')?.holds).toBe('temperature > 0');
  });

  it('the comparison targets are entry fields that the name table projects', () => {
    expect(canonicalById('CE-sound-speed')?.targetAliases).toEqual(['speed']);
    expect(NAME_TABLE.canonicalTargets['CE-sound-speed']).toEqual(['speed']);
    expect(Object.keys(NAME_TABLE.canonicalTargets).length).toBe(4);
  });

  it('convention notes and the unset-factor disclosure are entry fields', () => {
    expect(canonicalById('CE-compton-wavelength')?.conventionGroup).toBe('compton-wavelength');
    expect(canonicalById('CE-compton-wavelength-full')?.conventionGroup).toBe('compton-wavelength');
    expect(canonicalById('CE-hooke-law')?.conventionNote).toMatch(/F = −kx/);
    expect(canonicalById('CE-fermi-energy')?.unsetFactorNote).toMatch(/\(1\/2\)\(3π²\)/);
    expect(CANONICAL_EQUATIONS.filter((e) => e.unsetFactorNote !== undefined).length).toBe(3);
  });

  it('a prefactor is recorded once: never on an entry whose AST already carries it', () => {
    for (const e of CANONICAL_EQUATIONS) {
      if (e.prefactor !== undefined) expect(e.epistemicStatus, e.id).not.toBe('fully-quantitative');
    }
  });
});
