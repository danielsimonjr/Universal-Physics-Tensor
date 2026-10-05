/**
 * Phase 6 lowers a tree only when the installed MathTS packages export the
 * scalar builder. These names are absent from `@danielsimonjr/mathts-expression`
 * 0.9.0 and `@danielsimonjr/mathts-functions` 0.67.0. The assertion fails when
 * a later install exports them, and that failure is the signal to lower.
 * It does not parse a formula string.
 */
import * as expression from '@danielsimonjr/mathts-expression';
import * as functions from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';

describe('MathTS scalar builder gate', () => {
  it('is absent from the installed packages, so a closed form stays a JavaScript body', () => {
    expect('createScalarBuilder' in expression).toBe(false);
    expect('SCALAR_FUNCTIONS' in expression).toBe(false);
    expect('scalar' in functions).toBe(false);
    expect('evaluateScalar' in functions).toBe(false);
  });
});
