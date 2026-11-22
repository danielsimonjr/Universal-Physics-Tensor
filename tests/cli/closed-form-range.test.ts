/**
 * The evaluate range is the registered ids, with a gap left as a gap.
 *
 * A run of three or more consecutive ids is `start..end`. Two consecutive
 * ids stay `a/b`. A missing id in the middle is not absorbed into the range.
 */

import { describe, expect, it } from 'vitest';
import { catalogEvaluators } from '../../src/bridges/catalog-load.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { closedFormRangeLabel, formatClosedFormRange } from '../../src/cli/closed-form-range.js';
import { CENSUS } from '../helpers/census.js';

describe('formatClosedFormRange', () => {
  it('keeps a gap, and collapses a run of three or more', () => {
    expect(formatClosedFormRange([68, 55, 51, 52, 55])).toBe('BE-51/52/55/68');
    expect(formatClosedFormRange([51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68])).toBe(
      'BE-51/52/55..68',
    );
  });

  it('reads the live evaluator registry', () => {
    expect(closedFormRangeLabel()).toBe(CENSUS.evaluators.rangeLabel);
    // BE-16/42/51/52/55..146 is the record from before be-147..170.
    // BE-16/42/51/52/55..133 is the record from before be-134..146.
    // BE-16/42/51/52/55..125 is the record from before be-126..133.
    // BE-51/52/55..102 is the record from before be-103..125.
    // BE-51/52/55..87 is the record from before be-88..102.
  });

  it('catalog-load evaluator ids equal BRIDGE_EVALUATORS keys', () => {
    const catalogIds = catalogEvaluators().map((e) => e.catalogId).sort();
    const registryIds = [...BRIDGE_EVALUATORS.keys()].sort();
    expect(catalogIds).toEqual(registryIds);
    expect(catalogIds).toHaveLength(CENSUS.evaluators.count);
  });

  it('CONTROL: dropping one catalog id is detected as drift from BRIDGE_EVALUATORS', () => {
    const catalogIds = catalogEvaluators().map((e) => e.catalogId).sort();
    const registryIds = [...BRIDGE_EVALUATORS.keys()].sort();
    expect(catalogIds.slice(1), 'a missing id must not equal the registry keys').not.toEqual(registryIds);
  });
});
