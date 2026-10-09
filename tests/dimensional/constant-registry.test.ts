/**
 * One registry row per constant. Every other table is a projection of it, and
 * MathTS is the second, independent statement of the same values and units.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSiDimensionVector } from '@danielsimonjr/mathts-core';
import * as mathts from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { C_SI } from '../../src/core/constants.js';
import { PhysicalConstants } from '../../src/core/types.js';
import { CONSTANT_SPELLINGS } from '../../src/dimensional/dimension-spec.js';
import { FORMULA_NAMED } from '../../src/dimensional/formula-names.js';
import { foldName, quantityRecord, synonymGroupsFromRegistry } from '../../src/dimensional/quantity-registry.js';
import {
  CONSTANT_PROVENANCE,
  CONSTANT_REGISTRY,
  CONSTANTS,
  constantRecord,
} from '../../src/dimensional/symbolic-constants.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { equals } from '../../src/dimensional/algebra.js';

interface MathTsUnit {
  toSI(): { value: unknown };
  readonly dimensions: readonly number[];
}

const unitOf = (name: string): MathTsUnit => (mathts as unknown as Record<string, MathTsUnit>)[name]!;
const siValue = (u: MathTsUnit): number => Number(u.toSI().value);
const siDimension = (u: MathTsUnit): Dimension => {
  const v = toSiDimensionVector(u.dimensions, { ignoreExtra: true });
  return { L: v[0]!, M: v[1]!, T: v[2]!, I: v[3]!, Theta: v[4]!, N: v[5]!, J: v[6]! };
};

/**
 * The largest relative move between CODATA 2018 and CODATA 2022 among the
 * measured constants above is the Thomson cross section, about 4e-9. A
 * registry value outside this bound is not the 2018 value it claims to be.
 */
const VINTAGE_DRIFT = 1e-8;

describe('the constant registry is the one owner of spellings, units and provenance', () => {
  it('every row has a unique name and unique spellings', () => {
    const names = CONSTANT_REGISTRY.flatMap((row) => [row.name, ...row.spellings]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('CONSTANTS, FORMULA_NAMED, CONSTANT_SPELLINGS and CONSTANT_PROVENANCE are projections', () => {
    for (const row of CONSTANT_REGISTRY) {
      const projected = row.canonical ? CONSTANTS[row.name] : FORMULA_NAMED.find((n) => n.name === row.name);
      expect(projected, row.name).toBeDefined();
      expect(projected!.value).toBe(row.value);
      expect(equals(projected!.dim, row.dim), row.name).toBe(true);
      expect(CONSTANT_PROVENANCE[row.name]?.unit).toBe(row.unit);
      const spelled = CONSTANT_SPELLINGS.find((s) => s.names[0] === row.name);
      expect(spelled?.names, row.name).toEqual([row.name, ...row.spellings]);
      expect(constantRecord(row.name)).toBe(row);
      for (const spelling of row.spellings) expect(constantRecord(spelling), spelling).toBe(row);
    }
    expect(Object.keys(CONSTANTS).sort()).toEqual(
      CONSTANT_REGISTRY.filter((row) => row.canonical).map((row) => row.name).sort(),
    );
  });

  it('the quantity registry agrees on the dimension of every constant it also names', () => {
    for (const row of CONSTANT_REGISTRY) {
      for (const spelling of [row.name, ...row.spellings]) {
        const record = quantityRecord(spelling);
        if (record === undefined) continue;
        expect(equals(record.dimension, row.dim), `${spelling} → ${record.id}`).toBe(true);
      }
    }
    // The control: the row this test was written against.
    expect(quantityRecord('k_B')?.id).toBe('boltzmann-constant');
  });

  it('no constant spelling is also written in data/quantities.json: the registry owns it and the quantity derives it', () => {
    const file = JSON.parse(
      readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../data/quantities.json'), 'utf8'),
    ) as { quantities: { id: string; aliases?: string[] }[] };
    const owner = new Map(CONSTANT_REGISTRY.flatMap((row) => [row.name, ...row.spellings].map((s) => [foldName(s), row] as const)));
    // An alias that is a constant spelling is a second definition. A quantity id that is one
    // is the quantity's identity (a graph node), allowed only when the constant names it.
    const twice = file.quantities.flatMap((q) => [
      ...(q.aliases ?? []).filter((s) => owner.has(foldName(s))).map((s) => `${q.id} alias ${s}`),
      ...(owner.has(foldName(q.id)) && owner.get(foldName(q.id))!.quantity !== q.id ? [`${q.id} id`] : []),
    ]);
    expect(twice).toEqual([]);
    const linked = CONSTANT_REGISTRY.filter((row) => row.quantity !== undefined);
    expect(linked.map((row) => [row.name, row.quantity])).toEqual([
      ['h', 'planck-constant'],
      ['R_inf', 'rydberg-constant'],
      ['k_B', 'boltzmann-constant'],
      ['lane_emden_omega_3', 'lane-emden-omega-3'],
    ]);
    for (const row of linked) {
      for (const spelling of [row.name, ...row.spellings]) expect(quantityRecord(spelling)?.id, spelling).toBe(row.quantity);
    }
    expect(synonymGroupsFromRegistry()).toContainEqual(['boltzmann-constant', 'k_B', 'kB', 'boltzmann']);
    expect(synonymGroupsFromRegistry()).toContainEqual(['planck-constant', 'h']);
    // A spelling that only restates the id adds no group.
    expect(synonymGroupsFromRegistry().some((group) => group[0] === 'lane-emden-omega-3')).toBe(false);
  });

  it('PhysicalConstants is a projection of the owner', () => {
    expect(PhysicalConstants.c).toBe(C_SI);
    expect(PhysicalConstants.kB).toBe(constantRecord('k_B')!.value);
    expect(PhysicalConstants.G).toBe(constantRecord('G')!.value);
  });
});

/** The rows whose provenance names a MathTS export. The registry, not this file, says which. */
const WITH_MATHTS = CONSTANT_REGISTRY.filter((row) => row.mathts !== undefined);

describe('MathTS states the same constants (the independent second method)', () => {
  it('the registry names a MathTS counterpart for every CODATA and exact-SI row, and for no convention', () => {
    expect(WITH_MATHTS.length).toBeGreaterThanOrEqual(16);
    for (const row of CONSTANT_REGISTRY) {
      const physical = /CODATA|exact SI|N_A_SI|H_SI\/\(2π\)|1\/\(EPS0_SI/.test(row.source);
      expect(row.mathts !== undefined || !physical || row.name === 'epsilon_0', `${row.name}: ${row.source}`).toBe(true);
      if (row.exact) expect(row.mathts, row.name).toBeDefined();
    }
  });

  it.each(WITH_MATHTS.map((row) => [row.name, row.mathts!, row] as const))('%s agrees with MathTS %s in dimension and value', (name, counterpart, row) => {
    const unit = unitOf(counterpart);
    expect(unit, `MathTS has no export ${counterpart}`).toBeDefined();
    expect(equals(siDimension(unit), row.dim), `dimension of ${name}`).toBe(true);
    const theirs = siValue(unit);
    const relative = Math.abs(row.value - theirs) / Math.abs(theirs);
    if (row.exact) expect(relative).toBeLessThan(1e-15);
    else expect(relative, `${name}: ${row.value} vs ${theirs}`).toBeLessThan(VINTAGE_DRIFT);
  });

  it('epsilon_0 is 1/(mu_0 c^2) against MathTS too', () => {
    const mu0 = siValue(unitOf('magneticConstant'));
    const theirs = 1 / (mu0 * C_SI * C_SI);
    const ours = constantRecord('epsilon_0')!.value;
    expect(Math.abs(ours - theirs) / theirs).toBeLessThan(VINTAGE_DRIFT);
  });

  it('the drift bound is not vacuous: a 2022 value is a different number', () => {
    // electron mass moved by about 1.4e-9 between the two vintages
    const ours = constantRecord('m_e')!.value;
    const theirs = siValue(unitOf('electronMass'));
    expect(ours).not.toBe(theirs);
    expect(Math.abs(ours - theirs) / theirs).toBeGreaterThan(1e-10);
  });
});
