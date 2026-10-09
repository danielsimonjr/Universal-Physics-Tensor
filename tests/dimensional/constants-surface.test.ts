import { describe, it, expect } from 'vitest';
import * as constants from '../../src/dimensional/constants.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';
import { LENGTH } from '../../src/dimensional/types.js';

/**
 * `dimensional/constants.ts` projects a few constants' SI dimensions from the
 * registry for the tests that read them by name. A projection nothing reads is
 * a second copy: `epsilon_0`, `t_P`, `m_P`, `E_P` went at v0.4.5, and `G` and
 * `e` after the 9.0.0 audit (§2 N23). The registry row is the owner:
 * `constantRecord('G').dim`.
 */
describe('dimensional/constants surface', () => {
  it.each(['epsilon_0', 't_P', 'm_P', 'E_P', 'G', 'e'])('%s is not projected (nothing read it)', (name) => {
    expect(name in constants).toBe(false);
  });

  it('the four read projections are the registry rows', () => {
    expect(constants.hbar).toEqual(constantRecord('hbar')!.dim);
    expect(constants.c).toEqual(constantRecord('c')!.dim);
    expect(constants.k_B).toEqual(constantRecord('k_B')!.dim);
    // The registry has no Planck-length row; the module states it as a length.
    expect(constants.l_P).toEqual(LENGTH);
  });
});
