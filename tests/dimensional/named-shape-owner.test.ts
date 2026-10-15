/**
 * A dimension that `src/dimensional/types.ts` names is read from that name,
 * not stated again by exponents. These atlas and canonical entry modules each
 * built their shapes by hand (`dim(-3, 1)`, `dim(2, 1, -3, -2)`); this scan
 * lists every literal in them whose shape a named constant already carries.
 * The scan covers these files only, not all of `src/`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dimensionLiterals } from '../../tools/duplicate-owner-scans.js';
import * as types from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';

const root = join(import.meta.dirname, '../..');

const FILES = [
  'src/atlas/diffusion/dimensions.ts',
  'src/atlas/diffusion/models.ts',
  'src/atlas/oscillators/dimensions.ts',
  'src/atlas/waves/models.ts',
  'src/canonical/entries/atomic.ts',
  'src/canonical/entries/nonmonomial.ts',
  'src/canonical/entries/thermo-nuclear-cosmo.ts',
  'src/canonical/entries/condensed-matter.ts',
  'src/canonical/entries/fluids-waves.ts',
  'src/canonical/entries/mechanics.ts',
  'src/canonical/entries/electromagnetism.ts',
  'src/canonical/entries/relativity.ts',
];

const BASES = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const key = (d: Readonly<Record<(typeof BASES)[number], number>>): string => BASES.map((b) => d[b]).join(',');

/** Shape key → the names `types.ts` gives it (DIMENSIONLESS excluded: `dim()` of nothing is not a copy of a name). */
function namedShapes(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [name, value] of Object.entries(types)) {
    if (name === 'DIMENSIONLESS' || typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    if (!BASES.every((b) => typeof (value as Record<string, unknown>)[b] === 'number')) continue;
    const k = key(value as Dimension);
    out.set(k, [...(out.get(k) ?? []), name]);
  }
  return out;
}

function hits(source: string, named: Map<string, string[]>): string[] {
  return dimensionLiterals(source)
    .map((d) => named.get(key(d)))
    .filter((names): names is string[] => names !== undefined)
    .map((names) => names.join('|'));
}

describe('named dimension shapes have one owner', () => {
  const named = namedShapes();

  it('CONTROL: the scan sees a hand-built copy of a named shape, and not a shape types.ts does not name', () => {
    expect(hits('const DENSITY = dim(-3, 1, 0, 0, 0);', named)).toEqual(['MASS_DENSITY']);
    expect(hits('const P: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };', named)).toEqual(['PRESSURE']);
    expect(hits('const SIGMA_SB = dim(0, 1, -3, 0, -4);', named)).toEqual([]);
    expect(hits('const P = PRESSURE;', named)).toEqual([]);
  });

  it('no listed atlas or canonical entry module states a named shape by exponents', () => {
    const found: string[] = [];
    for (const file of FILES) {
      for (const name of hits(readFileSync(join(root, file), 'utf8'), named)) found.push(`${file}: ${name}`);
    }
    expect(found).toEqual([]);
  });
});
