/**
 * `src/core/constants.ts` is the one owner of every physical-constant value.
 * A CODATA literal anywhere else under `src/` is a second copy that can drift
 * (H0 was 2.184e-18 in one file and 67.4e3/3.0857e22 in another).
 *
 * The scan strips comments and matches the decimal spellings the owner uses,
 * so a value quoted in prose is not a hit and a value typed into code is.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as OWNER from '../../src/core/constants.js';

const ROOT = join(import.meta.dirname, '../../src');
const OWNER_FILE = join(ROOT, 'core/constants.ts');

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...tsFiles(path));
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** The literal spellings a second copy would use. `1` and `2π` are not constants. */
const LITERALS = [
  '299792458',
  '6.62607015e-34',
  '1.380649e-23',
  '1.602176634e-19',
  '6.6743e-11',
  '6.67430e-11',
  '8.8541878128e-12',
  '5.670374419e-8',
  '9.1093837015e-31',
  '1.67262192369e-27',
  '6.02214076e23',
  '2.897771955e-3',
  '1.66053906660e-27',
  '7.2973525693e-3',
  '2.184e-18',
  '1.616255e-35',
  '2.176434e-8',
  '5.391247e-44',
  '6.6524587321e-29',
  '1.3271244e20',
];

describe('core/constants.ts is the one owner of physical-constant values', () => {
  it('the owner states each value the scan looks for (the scan is not vacuous)', () => {
    const owner = stripComments(readFileSync(OWNER_FILE, 'utf8'));
    const stated = LITERALS.filter((literal) => owner.includes(literal));
    expect(stated.length).toBeGreaterThanOrEqual(16);
  });

  it('no CODATA literal appears in code outside the owner', () => {
    const hits: string[] = [];
    for (const file of tsFiles(ROOT)) {
      if (file === OWNER_FILE) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const literal of LITERALS) {
        if (code.includes(literal)) hits.push(`${relative(ROOT, file)}: ${literal}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('H0 has one value', () => {
    expect(OWNER.H0_SI).toBe(67.4e3 / 3.0857e22);
  });

  it('the vacuum constants are related by c exactly', () => {
    expect(OWNER.MU0_SI * OWNER.EPS0_SI * OWNER.C_SI * OWNER.C_SI).toBeCloseTo(1, 15);
  });
});
