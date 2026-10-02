/**
 * The three regime vocabularies are named, and they are not one type.
 * A fourth export fails. The test does not claim the three aliases are equal.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  PiGroupRegime,
  QuantityAttributeRegime,
  TensorCellRegime,
} from '../../src/relations/regime-vocabularies.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const glossaryPath = resolve(root, 'src/relations/regime-vocabularies.ts');

const NAMES = ['PiGroupRegime', 'QuantityAttributeRegime', 'TensorCellRegime'] as const;

/** Exported type names. A value export is a name too. */
export function exportedNames(source: string): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(/^export (?:type |interface |function |const |class |async function )?(\w+)/gm)) {
    names.push(m[1]!);
  }
  return names.sort();
}

type _Pin = [TensorCellRegime, PiGroupRegime, QuantityAttributeRegime];

describe('three regime vocabularies', () => {
  const source = readFileSync(glossaryPath, 'utf8');

  it('exports the three names and no fourth', () => {
    expect(exportedNames(source)).toEqual([...NAMES]);
  });

  it('PAIRED CONTROL — a fourth export is not the three names', () => {
    const extra = `${source}\nexport type FourthRegime = never;\n`;
    expect(exportedNames(extra)).not.toEqual([...NAMES]);
    expect(exportedNames(extra)).toContain('FourthRegime');
  });

  it('names each vocabulary at its existing function and does not import composition or atlas', () => {
    expect(source).toContain('defineRegime');
    expect(source).toContain('src/core/regime-registry.ts');
    expect(source).toContain('regimeHolds');
    expect(source).toContain('src/relations/regime.ts');
    expect(source).toContain('regimesDiffer');
    expect(source).toContain('src/composition/quantity.ts');
    expect(source).toContain('GATE_AXES');
    expect(source).toContain('src/composition/axes.ts');
    expect(source).not.toMatch(/from\s+['"][^'"]*\/composition\//);
    expect(source).not.toMatch(/from\s+['"][^'"]*\/atlas\//);
    expect(source).toContain("from '../core/regime-registry.js'");
    expect(source).toContain('export type TensorCellRegime = RegimeValueBase');
    expect(source).toContain('export type PiGroupRegime = Regime');
    expect(source).toContain('export type QuantityAttributeRegime = never');
  });

  it('is not on the root barrel, and the join gate does not import it', () => {
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    const join = readFileSync(resolve(root, 'src/composition/chain-regime.ts'), 'utf8');
    expect(index).not.toContain('regime-vocabularies');
    expect(join).not.toContain('regime-vocabularies');
    for (const name of NAMES) expect(index).not.toContain(name);
  });
});
