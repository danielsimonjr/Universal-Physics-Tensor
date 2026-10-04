/**
 * The evaluate range is the registered ids, with a gap left as a gap.
 *
 * A run of three or more consecutive ids is `start..end`. Two consecutive
 * ids stay `a/b`. A missing id in the middle is not absorbed into the range.
 */

import { describe, expect, it } from 'vitest';
import { closedFormRangeLabel, formatClosedFormRange } from '../../src/cli/closed-form-range.js';

describe('formatClosedFormRange', () => {
  it('keeps a gap, and collapses a run of three or more', () => {
    expect(formatClosedFormRange([68, 55, 51, 52, 55])).toBe('BE-51/52/55/68');
    expect(formatClosedFormRange([51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68])).toBe(
      'BE-51/52/55..68',
    );
  });

  it('reads the live evaluator registry', () => {
    expect(closedFormRangeLabel()).toBe('BE-51/52/55..76');
  });
});
