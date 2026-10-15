/**
 * The Phase 0 REJECTION record: a claimed bridge the atlas records as refuted,
 * together with the witness that refutes it.
 *
 * `ax-cubic-spring-lc` claims the cubic (Duffing-type) spring
 * `m x″ + k x + β x³ = 0` is exactly equivalent to the LC circuit
 * `L q″ + q/C = 0`. It is not. The cubic spring's variable set
 * {m, k, β, x0} carries exactly ONE dimensionless group, `β x0² / k`, which
 * measures the nonlinearity and has no counterpart on the LC side: the LC
 * variable set is dimensionally independent and admits no group at all. A
 * surviving group with no image cannot be matched by any change of variables,
 * so no exact equivalence exists.
 *
 * @module atlas/oscillators/rejections
 */

import type { AtlasRejection } from '../types.js';

/** The rejected bridges of the oscillator pilot. @internal */
export const ATLAS_REJECTIONS: readonly AtlasRejection[] = [
  {
    id: 'ax-cubic-spring-lc',
    claimed: 'exact-equivalence',
    premises: ['model-cubic-spring'],
    conclusion: 'model-lc',
    reason:
      'The cubic spring retains one dimensionless group, β x0² / k, that measures ' +
      'its nonlinearity, and the LC variable set has none (W3). A surviving group ' +
      'is necessary evidence, not sufficient. The decisive fact is isochrony: the ' +
      'LC period is the same at every amplitude, the cubic spring period is not ' +
      '(W3b), and a change of variables that rescales time by a constant multiplies ' +
      'every period by the same factor. So no such change of variables makes the two ' +
      'models exactly equivalent.',
    survivingGroup: 'β x0² / k',
    witnesses: [
      {
        id: 'W3',
        kind: 'symbolic',
        test: 'tests/atlas/oscillators-coarse.test.ts',
        tolerance: 'exact integer π-group exponents; LC verdict dimensionally-independent',
      },
      {
        id: 'W3b',
        kind: 'numeric',
        test: 'tests/atlas/oscillators-coarse.test.ts',
        tolerance: 'linear period 2π within 1e-6 at A = 0.5, 1, 2; cubic-spring periods spread by more than 10% at β x0²/k = 0.1',
      },
    ],
  },
];
