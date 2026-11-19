import { describe, expect, it } from 'vitest';
import { AmbiguousUnitError, parseUnit } from '../../src/dimensional/units.js';

function ambiguity(read: () => unknown): AmbiguousUnitError {
  try {
    read();
  } catch (error) {
    if (error instanceof AmbiguousUnitError) return error;
    throw error;
  }
  throw new Error('expected AmbiguousUnitError');
}

describe('AmbiguousUnitError lists the readings in codepoint order', () => {
  it('kg/ms and W/mK print the sorted readings, whatever order the grammar found them in', () => {
    expect(ambiguity(() => parseUnit('kg/ms')).message).toBe("'kg/ms' is ambiguous: kg/(m·s) or kg/ms");
    expect(ambiguity(() => parseUnit('W/mK')).readings).toEqual(['W/(m·K)', 'W/mK']);
  });

  it('the constructor sorts, so a producer that lists the readings in another order prints the same message', () => {
    const forward = new AmbiguousUnitError('umK', ['u·m·K', 'u·mK', 'um·K']);
    const reverse = new AmbiguousUnitError('umK', ['um·K', 'u·mK', 'u·m·K']);
    expect(forward.message).toBe(reverse.message);
    expect(forward.readings).toEqual(reverse.readings);
  });
});
