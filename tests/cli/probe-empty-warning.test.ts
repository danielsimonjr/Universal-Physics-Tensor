/**
 * The zero-searchable warning stays covered after the live scan gained
 * expression gaps. The function is what `upt probe scan` prints in that state.
 */
import { describe, expect, it } from 'vitest';
import { emptySearchableWarning } from '../../src/cli/commands/probe.js';

describe('emptySearchableWarning', () => {
  it('names the zero and points at discover and a problem file', () => {
    const text = emptySearchableWarning(232).join('\n');
    expect(text).toMatch(/0 of 232 gaps are searchable by Product B/);
    expect(text).toMatch(/upt discover/);
    expect(text).toMatch(/--all/);
    expect(text).toMatch(/upt probe run --problem=FILE/);
  });
});
