/**
 * Kind `bridge` is the only seed. The list is `bridgeSeedKeys`, derived by
 * `formalRefKind`. A second list would drift.
 *
 * Before the kind check, a stub that returned every key kept `CE-fixture`
 * when its kind was `derivation-step`. The control below failed on that stub.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { bridgeSeedKeys, physjsFormalRef } from '../../src/atlas/physjs-ref.js';

const DERIVATION_STEP = ['be-14', 'be-65', 'be-51', 'be-61', 'be-17', 'be-22', 'be-15', 'be-32', 'be-35', 'be-30', 'be-64', 'be-53', 'be-34'] as const;
const REDUCTION = ['be-13'] as const;
const LIMIT = ['be-38', 'be-58'] as const;
const PROPERTY = ['be-11', 'be-28', 'be-29'] as const;
const CROSS_CHECK = ['be-19', 'be-24', 'be-42'] as const;
const CATALOG_EQUATION = ['be-12', 'be-16', 'be-21', 'be-27', 'be-33', 'be-37', 'be-40', 'be-43', 'be-50', 'be-54', 'be-55', 'be-59', 'be-60', 'be-63', 'be-66', 'be-67', 'be-68', 'be-69', 'be-70', 'be-71', 'be-72', 'be-73', 'be-74', 'be-75', 'be-76', 'be-77', 'be-78', 'be-79', 'be-80', 'be-81', 'be-82', 'be-83', 'be-84', 'be-85', 'be-86', 'be-87', 'be-88', 'be-89', 'be-90', 'be-91', 'be-92', 'be-93', 'be-94', 'be-95', 'be-96', 'be-97', 'be-98', 'be-99', 'be-100', 'be-101', 'be-102'] as const;
const ATLAS = [
  'ab-kg-schrodinger',
  'ab-klein-gordon-wave',
  'ab-stiff-string',
  'ab-telegraph-diffusion',
  'ab-telegraph-wave',
  'ab-pendulum-linear',
  'ab-kg-oscillator',
  'ab-spring-lc',
  'ab-damped-rlc',
  'ab-wave-dalembert',
] as const;

const WEAKER = [...DERIVATION_STEP, ...REDUCTION, ...LIMIT, ...PROPERTY, ...CROSS_CHECK] as const;

describe('bridge seeds are kind bridge only', () => {
  const seeds = bridgeSeedKeys();

  it('a covers word of derivation-step, reduction, limit, property, or cross-check is absent', () => {
    for (const key of WEAKER) {
      expect(seeds, key).not.toContain(key);
      expect(physjsFormalRef(key).kind, key).not.toBe('bridge');
    }
    expect(physjsFormalRef('be-14').kind).toBe('derivation-step');
    expect(physjsFormalRef('be-13').kind).toBe('reduction');
    expect(physjsFormalRef('be-38').kind).toBe('limit');
    expect(physjsFormalRef('be-28').kind).toBe('property');
    expect(physjsFormalRef('be-42').kind).toBe('cross-check');
  });

  it('an ab- key is present', () => {
    for (const key of ATLAS) {
      expect(seeds, key).toContain(key);
      expect(physjsFormalRef(key).kind, key).toBe('bridge');
    }
  });

  it('a catalog key whose theorem states the catalogued equation is present', () => {
    for (const key of CATALOG_EQUATION) {
      expect(seeds, key).toContain(key);
      expect(physjsFormalRef(key).kind, key).toBe('bridge');
      expect(physjsFormalRef(key).covers.startsWith('derivation-step:'), key).toBe(true);
    }
  });

  it('the live list is those keys in manifest order, and no canonical id is a seed yet', () => {
    expect(seeds).toEqual([
      ...ATLAS,
      'be-16',
      'be-12',
      'be-59',
      'be-55',
      'be-60',
      'be-21',
      'be-43',
      'be-37',
      'be-54',
      'be-27',
      'be-33',
      'be-50',
      'be-40',
      'be-63',
      'be-66',
      'be-67',
      'be-68',
      'be-69',
      'be-70',
      'be-71',
      'be-72',
      'be-73',
      'be-74',
      'be-75',
      'be-76',
      'be-77',
      'be-78',
      'be-79',
      'be-80',
      'be-81',
      'be-82',
      'be-83',
      'be-84',
      'be-85',
      'be-86',
      'be-87',
      'be-88',
      'be-89',
      'be-90',
      'be-91',
      'be-92',
      'be-93',
      'be-94',
      'be-95',
      'be-96',
      'be-97',
      'be-98',
      'be-99',
      'be-100',
      'be-101',
      'be-102',
    ]);
  });

  it('the return value is not written onto a bridge and is not passed to deriveEvidence', () => {
    const pendulum = ATLAS_FAMILIES.flatMap((family) => family.bridges).find((bridge) => bridge.id === 'ab-pendulum-linear');
    if (pendulum === undefined) throw new Error('ab-pendulum-linear missing');
    const before = [...deriveEvidence(pendulum, NO_PASSING_WITNESSES)].sort();
    const again = bridgeSeedKeys();
    const after = [...deriveEvidence(pendulum, NO_PASSING_WITNESSES)].sort();
    expect(after).toEqual(before);
    expect(again).toContain('ab-pendulum-linear');
    expect(Object.keys(pendulum)).not.toContain('seed');
    expect(Object.keys(pendulum)).not.toContain('bridgeSeedKeys');
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/atlas/physjs-ref.ts'), 'utf8');
    const body = source.slice(source.indexOf('export function bridgeSeedKeys'));
    expect(body).not.toContain('deriveEvidence');
    const publicSurface = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/atlas/public.ts'), 'utf8');
    expect(publicSurface).not.toContain('bridgeSeedKeys');
  });

  it('CONTROL: the same fixture key drops out when its kind is derivation-step', () => {
    const key = 'CE-fixture';
    const covers = 'derivation-step: textbook encoding is not a seed';
    const asBridge = bridgeSeedKeys([{ key, covers, kind: 'bridge' }]);
    const flipped = bridgeSeedKeys([{ key, covers, kind: 'derivation-step' }]);
    expect(asBridge).toEqual([key]);
    expect(flipped).toEqual([]);
  });

  it('a canonical id with no kind-bridge reference is absent, and the same id is present when the kind is bridge', () => {
    const key = 'CE-einstein-field-eq';
    const covers = 'derivation-step: the encoded equation, not a reviewed bridge';
    expect(bridgeSeedKeys([{ key, covers }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, covers, kind: 'bridge' }])).toEqual([key]);
    expect(bridgeSeedKeys([{ key, covers, kind: 'reduction' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, covers, kind: 'limit' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, covers, kind: 'property' }])).toEqual([]);
    expect(bridgeSeedKeys([{ key, covers, kind: 'cross-check' }])).toEqual([]);
  });
});
