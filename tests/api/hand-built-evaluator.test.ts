/**
 * `EvaluatorSpec` is public, so a caller can build one. Everything that
 * takes, from the contract to the extra outputs, comes from the package root:
 * this file imports nothing else, and `tsc -p tsconfig.tests.json` fails if a
 * type it names is not a root export.
 */
import { describe, it, expect } from 'vitest';
import {
  inputContract,
  MissingInputError,
  type CatalogEvaluatorOutput,
  type EvaluationWant,
  type EvaluatorSpec,
  type InputSlot,
} from '../../src/index.js';

const slot = (key: string, spellings: string[], readBy: InputSlot['readBy'] = 'value'): InputSlot => ({
  key,
  spellings: [key, ...spellings],
  alternates: [],
  optional: false,
  readBy,
  listed: true,
});

describe('a hand-built EvaluatorSpec from root imports only', () => {
  const contract = inputContract('my-kinetic-energy', [slot('m_kg', ['mass']), slot('v_m_per_s', ['speed'])]);
  const outputs: readonly CatalogEvaluatorOutput[] = [
    { name: 'p_kg_m_per_s', unit: 'kg*m/s', meaning: 'momentum m v', expression: 'm_kg * v_m_per_s' },
  ];
  const spec: EvaluatorSpec = {
    bridgeId: 0,
    name: 'kinetic energy',
    inputKeys: ['m_kg', 'v_m_per_s'],
    parameters: [
      { key: 'm_kg', quantity: 'mass', symbol: 'm', unit: 'kg', meaning: 'mass' },
      { key: 'v_m_per_s', quantity: 'speed', symbol: 'v', unit: 'm/s', meaning: 'speed' },
    ],
    outputs,
    contract,
    run(inputs: Readonly<Record<string, number>>, want: EvaluationWant = 'all'): Record<string, number> {
      const keys = contract.slots.map((s) => s.key);
      const missing = keys.filter((k) => inputs[k] === undefined);
      if (missing.length > 0) throw new MissingInputError(contract.id, missing, keys);
      const m = inputs.m_kg!;
      const v = inputs.v_m_per_s!;
      const value = 0.5 * m * v * v;
      return want === 'value' ? { value } : { value, p_kg_m_per_s: m * v };
    },
  };

  it('evaluates, and returns its extra output unless only the value is wanted', () => {
    expect(spec.run({ m_kg: 2, v_m_per_s: 3 })).toEqual({ value: 9, p_kg_m_per_s: 6 });
    expect(spec.run({ m_kg: 2, v_m_per_s: 3 }, 'value')).toEqual({ value: 9 });
    expect(() => spec.run({ m_kg: 2 })).toThrow(MissingInputError);
  });

  it('inputContract refuses one spelling that binds two slots', () => {
    expect(() => inputContract('bad', [slot('a', ['x']), slot('b', ['x'])])).toThrow(/spells 'x' for both 'a' and 'b'/);
  });
});
