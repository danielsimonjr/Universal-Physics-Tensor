/**
 * `parseDeclaredExpression` binds a query formula's free symbols to the caller's
 * declared dimensions. A symbol with no declared or registered dimension is refused.
 * `parseCatalogExpression` is unchanged: catalog trees keep their keys.
 */
import { describe, expect, it } from 'vitest';
import { leakageKey } from '../../src/atlas/benchmark/leakage.js';
import { parseCatalogExpression, parseDeclaredExpression } from '../../src/bridges/expr-parse.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { canonicalResidual } from '../../src/canonical/residual.js';
import { parseDimensionSpec } from '../../src/dimensional/dimension-spec.js';
import type { Dimension } from '../../src/dimensional/types.js';

const dims = (spec: Record<string, string>): Map<string, Dimension> =>
  new Map(Object.entries(spec).map(([name, text]) => [name, parseDimensionSpec(text)]));

function corpusKey(id: string): string {
  const equation = CANONICAL_EQUATIONS.find((e) => e.id === id);
  const residual = equation === undefined ? undefined : canonicalResidual(equation);
  if (residual === undefined) throw new Error(`${id} has no residual`);
  return leakageKey(residual);
}

describe('parseDeclaredExpression', () => {
  it('U1: a declared query has the key of its canonical record', () => {
    const tree = parseDeclaredExpression('E - m*c^2', dims({ E: 'energy', m: 'mass', c: 'c' }));
    expect(leakageKey(tree)).toBe(corpusKey('CE-mass-energy'));
  });

  it('U2: a declaration wins over a registered constant of the same name', () => {
    const tree = parseDeclaredExpression('F - m*a', dims({ F: 'force', m: 'mass', a: 'acceleration' }));
    expect(leakageKey(tree)).toBe(corpusKey('CE-newton-second-law'));
  });

  it('U3: an undeclared symbol is refused and named', () => {
    expect(() => parseDeclaredExpression('E - zqx*c^2', dims({ E: 'energy', c: 'c' }))).toThrow(/zqx/);
  });

  it('U3b: a registered constant must be declared; the message names it and the fix', () => {
    const declared = dims({ m: 'mass', a: 'acceleration' });
    expect(() => parseDeclaredExpression('F - m*a', declared)).toThrow(/'F' is a registered constant.*F:<dimension>/s);
    expect(() => parseDeclaredExpression('E - m*c^2', dims({ E: 'energy', m: 'mass' }))).toThrow(/\bc\b.*c:<dimension>/s);
  });

  it('a numeric literal, pi and a folded constant need no declaration', () => {
    expect(() => parseDeclaredExpression('T - 2*pi*sqrt(L/g)', dims({ T: 'time', L: 'length', g: 'acceleration' }))).not.toThrow();
  });

  it('a hyphenated declared name is refused', () => {
    expect(() => parseDeclaredExpression('a-b', new Map([['a-b', parseDimensionSpec('mass')]]))).toThrow(/hyphen/);
  });

  it('U4: the catalog parser still reads a free symbol as dimensionless', () => {
    const tree = parseCatalogExpression('E - m*c^2');
    const flat = JSON.stringify(tree);
    expect(flat).toContain('"name":"m"');
    expect(leakageKey(tree)).toContain('stub:m');
  });
});
