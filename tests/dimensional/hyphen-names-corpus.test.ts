/**
 * `rewriteCatalogHyphens` scans each hyphenated word left to right and takes
 * the longest declared name or constant spelling at each segment, so a
 * declared name inside a longer constant spelling (`planck-constant` inside
 * `reduced-planck-constant`) no longer wins. This test runs every catalog
 * relation expression, every relation condition and every canonical condition
 * through the retired rewrite (`tests/fixtures/oracles/hyphen-names-oracle.ts`)
 * and the live one, parses both, and names exactly the texts whose tree moved.
 */
import { describe, expect, it } from 'vitest';
import { parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import { rewriteCatalogHyphens } from '../../src/dimensional/hyphen-names.js';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { formulaNames } from '../../src/bridges/expr-parse.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { parseFormulaPNode } from '../../src/numerical/formula-dimension.js';
import { oracleRewriteCatalogHyphens } from '../fixtures/oracles/hyphen-names-oracle.js';

interface Text {
  readonly label: string;
  readonly text: string;
  readonly names: ReadonlySet<string>;
  readonly kind: 'expression' | 'condition';
}

function corpus(): Text[] {
  const names = formulaNames();
  const out: Text[] = [];
  for (const rel of catalogRelations()) {
    out.push({ label: `${rel.id} expression`, text: rel.expression, names, kind: 'expression' });
    out.push({ label: `${rel.id} condition`, text: rel.holds, names, kind: 'condition' });
  }
  for (const eq of CANONICAL_EQUATIONS) {
    if (eq.holds === undefined) continue;
    const own = new Set([...names, eq.dimensional.target.name, ...eq.dimensional.governing.map((g) => g.name)]);
    out.push({ label: `${eq.id} condition`, text: eq.holds, names: own, kind: 'condition' });
  }
  return out;
}

const tree = (t: Text, rewritten: string): string =>
  t.kind === 'expression'
    ? JSON.stringify(parseFormulaPNode(rewritten))
    : (parseMathTs(rewritten) as { toString(): string }).toString();

describe('rewriteCatalogHyphens over the whole catalog and canonical corpus', () => {
  const texts = corpus();

  it('covers every relation (expression and condition) and every canonical condition', () => {
    expect(texts.length).toBeGreaterThan(2 * catalogRelations().length);
    expect(texts.filter((t) => t.text.includes('-')).length).toBeGreaterThan(0);
  });

  it('parses every text to the same tree as the retired rewrite, except the ones listed', () => {
    const moved: string[] = [];
    for (const t of texts) {
      if (tree(t, rewriteCatalogHyphens(t.text, t.names)) !== tree(t, oracleRewriteCatalogHyphens(t.text, t.names))) {
        moved.push(t.label);
      }
    }
    expect(moved).toEqual([]);
  });

  it('CONTROL: the oracle and the live rewrite differ on the defect itself, so the comparison can fail', () => {
    const names = formulaNames();
    expect(names.has('planck-constant')).toBe(true);
    expect(oracleRewriteCatalogHyphens('reduced-planck-constant*omega', names)).toBe('reduced-planck_constant*omega');
    expect(rewriteCatalogHyphens('reduced-planck-constant*omega', names)).toBe('hbar*omega');
  });
});

describe('rewriteCatalogHyphens: leftmost longest, declared before constant', () => {
  const names = new Set(['planck-constant', 'speed-of-light', 'planck-length', 'mass']);

  it('a constant spelling that contains a declared name is the constant', () => {
    expect(rewriteCatalogHyphens('reduced-planck-constant/2', names)).toBe('hbar/2');
  });

  it('a declared name equal to a constant spelling stays the declared name', () => {
    expect(rewriteCatalogHyphens('mass*speed-of-light^2', names)).toBe('mass*speed_of_light^2');
  });

  it('a hyphen between undeclared words stays subtraction, and a declared name after it is still read', () => {
    expect(rewriteCatalogHyphens('x-planck-length', names)).toBe('x-planck_length');
    expect(rewriteCatalogHyphens('a-b', names)).toBe('a-b');
    expect(rewriteCatalogHyphens('1e-3*planck-constant', names)).toBe('1e-3*planck_constant');
  });
});
