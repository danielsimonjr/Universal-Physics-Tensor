/**
 * The public-surface TSDoc gap check: empty on the committed tree, and it
 * fails when a public export's summary line is stripped.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicTsdocGaps, setSourceReaderForTest } from '../../scripts/public-tsdoc-gaps.js';

describe('public-tsdoc-gaps', () => {
  it('the public surface has no export without a JSDoc summary line', () => {
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL: stripping a public constant\'s summary puts that constant back on the gap list', () => {
    const path = 'dimensional/types.ts';
    const committed = readFileSync(new URL('../../src/dimensional/types.ts', import.meta.url), 'utf8');
    const stripped = committed.replace(
      '/** Force, newton (kilogram metre per second squared). */\n',
      '',
    );
    expect(stripped).not.toBe(committed);
    const restore = setSourceReaderForTest((rel) => (rel === path ? stripped : readFileSync(new URL(`../../src/${rel}`, import.meta.url), 'utf8')));
    try {
      expect(publicTsdocGaps()).toContainEqual({ name: 'FORCE', via: 'root', file: path });
    } finally {
      restore();
    }
    expect(publicTsdocGaps()).toEqual([]);
  });
});
