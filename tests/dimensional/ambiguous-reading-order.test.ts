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
  it('umK and mAs print the sorted readings, whatever order the splitter found them in', () => {
    expect(ambiguity(() => parseUnit('umK')).message).toBe("'umK' is ambiguous: um·K or u·mK or u·m·K");
    expect(ambiguity(() => parseUnit('mAs')).message).toBe("'mAs' is ambiguous: mA·s or m·A·s");
    expect(ambiguity(() => parseUnit('W/umK')).readings).toEqual(['W/(um·K)', 'W/(u·mK)', 'W/(u·m·K)']);
  });

  it('the constructor sorts, so a producer that lists the readings in another order prints the same message', () => {
    const forward = new AmbiguousUnitError('umK', ['u·m·K', 'u·mK', 'um·K']);
    const reverse = new AmbiguousUnitError('umK', ['um·K', 'u·mK', 'u·m·K']);
    expect(forward.message).toBe(reverse.message);
    expect(forward.readings).toEqual(reverse.readings);
  });
});
