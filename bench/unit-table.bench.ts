/**
 * Unit-table benchmark: one loop of `parseUnit` over every bare symbol the
 * unit table stores — the `units` alias keys plus the affine spellings
 * (`data/units.json`). Refused spellings are caught; the table itself decides
 * what refuses, so the loop cost is the reader's, not the throw cost.
 *
 * Baselines, not thresholds: no assertion gates the printed hz lines.
 * The symbol array is hoisted outside the bench callback.
 */
import { bench, describe } from 'vitest';
import { parseUnit } from '../src/dimensional/units.js';
import { UNIT_DATA } from '../src/dimensional/unit-data.js';

const SYMBOLS: readonly string[] = [
  ...UNIT_DATA.units.keys(),
  ...UNIT_DATA.affine.flatMap((row) => row.symbols),
];

describe('unit table', () => {
  bench('parseUnit over every symbol in the table', () => {
    for (const symbol of SYMBOLS) {
      try {
        parseUnit(symbol);
      } catch {
        // The table stores refusals; the bench measures the reader, not the throw.
      }
    }
  });
});
