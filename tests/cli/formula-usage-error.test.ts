/**
 * A formula usage error names the parser once, at construction. No message is
 * inspected for an earlier tag.
 */
import { describe, expect, it } from 'vitest';
import { FormulaUsageError } from '../../src/cli/euler-guard.js';
import { UsageError } from '../../src/cli/errors.js';

describe('FormulaUsageError', () => {
  it('is a usage error (exit 2) whose message ends with one parser tag', () => {
    const e = new FormulaUsageError('parse error: Unexpected end of expression', 'mathts');
    expect(e).toBeInstanceOf(UsageError);
    expect(e.message).toBe('parse error: Unexpected end of expression (formula parser: mathts)');
    expect(e.detail).toBe('parse error: Unexpected end of expression');
    expect(e.parser).toBe('mathts');
  });
});
