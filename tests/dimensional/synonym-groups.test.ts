/**
 * Every synonym group is one quantity. Two spellings with different numbers
 * are a refusal. The same number is one binding. The Boltzmann scale and
 * specific heat are groups, so a loop that omitted them would not be this test.
 */
import { describe, expect, it } from 'vitest';
import {
  SYNONYM_GROUPS,
  assertSynonymAgreement,
  expandSynonymValues,
  SynonymDisagreementError,
} from '../../src/dimensional/formula-names.js';
import { readNamedBinding } from '../../src/numerical/binding-value.js';
import { K_B_SI } from '../../src/core/constants.js';

describe('synonym groups', () => {
  it('includes the Boltzmann scale and specific heat', () => {
    expect(SYNONYM_GROUPS.some((group) => group.includes('boltzmann-constant') && group.includes('k_B') && group.includes('kB'))).toBe(true);
    expect(SYNONYM_GROUPS.some((group) => group.includes('specific-heat') && group.includes('specific-heat-capacity'))).toBe(true);
  });

  it('refuses every group when two spellings disagree, and copies them when they agree', () => {
    expect(SYNONYM_GROUPS.length).toBeGreaterThan(0);
    for (const group of SYNONYM_GROUPS) {
      expect(group.length).toBeGreaterThan(1);
      const [first, second] = group;
      const clash: Record<string, number> = { [first!]: 1, [second!]: 2 };
      expect(() => assertSynonymAgreement(clash)).toThrow(SynonymDisagreementError);
      expect(() => assertSynonymAgreement(clash)).toThrow(new RegExp(first!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      const agreed = expandSynonymValues({ [first!]: 4, [second!]: 4 });
      for (const member of group) expect(agreed[member]).toBe(4);
    }
  });

  it('a temperature in energy uses one Boltzmann scale or refuses', () => {
    expect(() =>
      readNamedBinding('temperature', '10eV', {
        siblings: [
          { name: 'temperature', raw: '10eV' },
          { name: 'k_B', raw: '1' },
          { name: 'boltzmann-constant', raw: '2' },
        ],
      }),
    ).toThrow(SynonymDisagreementError);
    const agreed = readNamedBinding('temperature', '10eV', {
      siblings: [
        { name: 'temperature', raw: '10eV' },
        { name: 'k_B', raw: String(K_B_SI) },
        { name: 'boltzmann-constant', raw: String(K_B_SI) },
      ],
    });
    expect(agreed.value).toBeGreaterThan(1e5);
  });
});
