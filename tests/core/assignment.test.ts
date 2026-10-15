/**
 * `core/assignment`: one split of a `name=value` token. Four readers split
 * on the first `=` and refused an empty name with their own error class;
 * the split is one function now and each caller keeps its class.
 */
import { describe, expect, it } from 'vitest';
import { splitAssignment } from '../../src/core/assignment.js';

describe('splitAssignment', () => {
  it('splits on the first `=` and keeps the rest of the token as the raw value', () => {
    expect(splitAssignment('a=1')).toEqual({ name: 'a', raw: '1' });
    expect(splitAssignment('mass=1e3kg')).toEqual({ name: 'mass', raw: '1e3kg' });
    expect(splitAssignment('a=b=c')).toEqual({ name: 'a', raw: 'b=c' });
  });

  it('an empty value is the caller’s to judge', () => {
    expect(splitAssignment('mass=')).toEqual({ name: 'mass', raw: '' });
  });

  it('is null for a token with no `=` or an empty name', () => {
    expect(splitAssignment('abc')).toBeNull();
    expect(splitAssignment('=1')).toBeNull();
    expect(splitAssignment('')).toBeNull();
  });
});
