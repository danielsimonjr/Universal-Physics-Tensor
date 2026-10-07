/**
 * One registry row per constant. Every other table is a projection of it, and
 * MathTS is the second, independent statement of the same values and units.
 */
import { toSiDimensionVector } from '@danielsimonjr/mathts-core';
import * as mathts from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { C_SI } from '../../src/core/constants.js';
import { PhysicalConstants } from '../../src/core/types.js';
import { CONSTANT_SPELLINGS } from '../../src/dimensional/dimension-spec.js';
import { FORMULA_NAMED } from '../../src/dimensional/formula-names.js';
import { quantityRecord } from '../../src/dimensional/quantity-registry.js';
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

/** Registry name → MathTS export. The registry records CODATA 2018; MathTS ships CODATA 2022. */
const MATHTS_COUNTERPART: Readonly<Record<string, string>> = {
  hbar: 'reducedPlanckConstant',
  h: 'planckConstant',
  c: 'speedOfLight',
  G: 'gravitationConstant',
  k_B: 'boltzmann',
  e: 'elementaryCharge',
  sigma_sb: 'stefanBoltzmann',
  b: 'wienDisplacement',
  m_u: 'atomicMass',
  m_e: 'electronMass',
  m_p: 'protonMass',
  N_A: 'avogadro',
  F: 'faraday',
  R: 'gasConstant',
  mu_0: 'magneticConstant',
  sigma_T: 'thomsonCrossSection',
};

/** Exact in the 2019 SI, or a product of exact constants: the two libraries agree to the last bit. */
const EXACT = new Set(['hbar', 'h', 'c', 'k_B', 'e', 'N_A', 'F', 'R']);

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

  it('PhysicalConstants is a projection of the owner', () => {
    expect(PhysicalConstants.c).toBe(C_SI);
    expect(PhysicalConstants.kB).toBe(constantRecord('k_B')!.value);
    expect(PhysicalConstants.G).toBe(constantRecord('G')!.value);
  });
});

describe('MathTS states the same constants (the independent second method)', () => {
  it.each(Object.entries(MATHTS_COUNTERPART))('%s agrees with MathTS %s in dimension and value', (name, counterpart) => {
    const row = constantRecord(name)!;
    const unit = unitOf(counterpart);
    expect(equals(siDimension(unit), row.dim), `dimension of ${name}`).toBe(true);
    const theirs = siValue(unit);
    const relative = Math.abs(row.value - theirs) / Math.abs(theirs);
    if (EXACT.has(name)) expect(relative).toBeLessThan(1e-15);
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
