/**
 * `kind` is the declared role of an affine temperature quantity: an absolute
 * point or an interval, which decides how a lone `degC` is read. Only a
 * quantity whose dimension is Θ¹ is one. Before 9.0.1 the registry carried
 * `kind: absolute` on per-kelvin quantities (`seebeck-coefficient` V/K, the
 * heat capacities J/K, `fin-conductivity` W/(m·K)) and `kind: interval` on
 * `pipe-pressure-drop` and `specific-volume-change`, where the field decides
 * nothing and misleads a reader that keys on it.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readQuantityFile, type QuantityFile } from '../../src/dimensional/quantity-registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(readFileSync(resolve(here, '..', '..', 'data', 'quantities.json'), 'utf8')) as QuantityFile;

const THETA = { L: 0, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 };

describe('a temperature kind belongs to an affine temperature quantity', () => {
  it('every quantity with a kind has dimension Θ¹', () => {
    const off = file.quantities
      .filter((q) => q.kind !== undefined && JSON.stringify(q.dimension) !== JSON.stringify(THETA))
      .map((q) => `${q.id} (${q.kind})`);
    expect(off).toEqual([]);
  });

  it('the registry refuses a kind on a quantity that is not a temperature', () => {
    const broken: QuantityFile = {
      quantities: file.quantities.map((q) => (q.id === 'seebeck-coefficient' ? { ...q, kind: 'absolute' as const } : q)),
    };
    expect(() => readQuantityFile(broken)).toThrow(/seebeck-coefficient: kind absolute on a quantity that is not an affine temperature/);
    expect(() => readQuantityFile(file)).not.toThrow();
  });

  it('a temperature keeps its kind (control)', () => {
    expect(file.quantities.find((q) => q.id === 'temperature')?.kind).toBe('absolute');
    expect(file.quantities.find((q) => q.id === 'temperature-change')?.kind).toBe('interval');
  });
});
