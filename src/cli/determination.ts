/**
 * One exit for a result the user asked to have determined.
 *
 * Derive and map used to decide separately, and both treated "not
 * established" as success. A canonical agreement is a check that passed.
 * A check that ran and failed, a non-unique monomial, and a catalog
 * target whose dimension was computed through an unresolved name are
 * exit 3. A target that was not a bound catalog name, with no comparison,
 * stays exit 0.
 *
 * @module cli/determination
 * @internal
 */

import { EXIT_CHECK_FAILED } from './errors.js';

interface DeterminationInput {
  /** The user named a bound catalog target, or asked derive for a monomial. */
  readonly asked: boolean;
  /** A canonical comparison agreed, including when some other name has no catalog dimension. */
  readonly agrees: boolean;
  /** A check ran on resolved names and failed, or a canonical comparison is a mismatch. */
  readonly checkFailed: boolean;
  /** The governing set does not determine one monomial. */
  readonly notUnique: boolean;
  /** Names filled in rather than resolved. Empty when the command did not look any up. */
  readonly unresolved: readonly string[];
}

export interface Determination {
  readonly exit: 0 | typeof EXIT_CHECK_FAILED;
  readonly report: 'established' | 'nothing-checked' | 'check-failed' | 'not-established';
  /** Why a determination was not established. Empty otherwise. */
  readonly gap: string;
}

/** The exit derive and map share. @internal */
export function classifyDetermination(input: DeterminationInput): Determination {
  if (input.agrees) return { exit: 0, report: 'established', gap: '' };
  if (input.checkFailed) return { exit: EXIT_CHECK_FAILED, report: 'check-failed', gap: '' };
  const unresolved = [...new Set(input.unresolved)];
  if (input.asked && (input.notUnique || unresolved.length > 0)) {
    const gap = input.notUnique
      ? 'the monomial is not unique'
      : `unresolved ${unresolved.map((n) => `'${n}'`).join(', ')}`;
    return { exit: EXIT_CHECK_FAILED, report: 'not-established', gap };
  }
  if (input.asked) return { exit: 0, report: 'established', gap: '' };
  return { exit: 0, report: 'nothing-checked', gap: '' };
}
