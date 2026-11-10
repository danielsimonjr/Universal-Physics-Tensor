/**
 * A MathTS reading whose factor source UPT cannot read is dropped whole.
 *
 * No real token reaches this path today: an affine spelling such as `℃` (empty source)
 * is refused before the splitter runs. The mock feeds the two unreadable shapes directly.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@danielsimonjr/mathts-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@danielsimonjr/mathts-core')>();
  const fake = (token: string) => {
    if (token === 'mK') {
      return [
        [{ name: 'm', power: 1, source: 'm' }, { name: 'K', power: 1, source: 'K' }],
        [{ name: 'm', power: 1, source: 'm' }, { name: 'deg', power: 1, source: '' }, { name: 'K', power: 1, source: 'K' }],
        [{ name: 'm', power: 1, source: 'm' }, { name: 'zz', power: 1, source: 'zz' }],
      ];
    }
    return actual.Unit.readingsWithSource(token);
  };
  return { ...actual, Unit: new Proxy(actual.Unit, { get: (t, p) => (p === 'readingsWithSource' ? fake : Reflect.get(t, p)) }) };
});

const { formatReading, segmentations } = await import('../../src/dimensional/units.js');

describe('M6 splitter: an unreadable source drops the reading', () => {
  it('keeps m·K and drops the readings with an empty or unknown source', () => {
    expect(segmentations('mK').map(formatReading)).toEqual(['m·K']);
  });
});
