/**
 * A validity domain read from one condition text, the record's `holds`.
 *
 * The condition is the single source: the predicate is the conjunction of its
 * conjuncts, the description is those conjuncts written out, and a refusal
 * lists only the conjuncts that failed, each rendered with the key the caller
 * gave the input under. No record carries a second, prose statement of the
 * same domain, so the message cannot contradict the check.
 *
 * @module bridges/validity
 */

import type { DomainViolation } from './evaluation-errors.js';
import { conditionReads, holdsConditions, holdsScope, HoldsError, type HoldsCondition } from './holds.js';

/** A domain built from a condition text. Structurally a `ValidityDomain`. @internal */
export interface ConditionDomain {
  /** The conjuncts, in the relation's names, joined by `and`. */
  readonly description: string;
  readonly predicate: (inputs: Record<string, number>) => boolean;
  /**
   * The conjuncts `inputs` violate. `keyOf` names the caller's key for a name
   * the relation reads (a parameter key for an evaluator source); a name it
   * does not map is its own key.
   */
  readonly violations: (inputs: Record<string, number>, keyOf?: (name: string) => string) => readonly DomainViolation[];
}

/** A conjunct fails when it is false or cannot be evaluated (an unbound name, a non-number). */
function fails(condition: HoldsCondition, scope: Readonly<Record<string, number>>): boolean {
  try {
    return !condition.test(scope);
  } catch (error) {
    if (error instanceof HoldsError) return true;
    throw error;
  }
}

/** `text` with each whole-word name it reads replaced by the caller's key. */
function rendered(condition: HoldsCondition, keyOf: (name: string) => string): string {
  const keys = new Map(condition.names.map((name) => [name, keyOf(name)]));
  return condition.text.replace(/[A-Za-z_][A-Za-z0-9_-]*/g, (word) => keys.get(word) ?? word);
}

/**
 * The domain `text` states over `names` (the hyphenated quantity names it may
 * read), with `constants()` bound. `'true'` is the domain with no condition.
 * An input named for a constant that `declared` does not list, and that the
 * condition reads, is a `ConstantInputError` (a caller error, not a false condition).
 * @internal
 */
export function conditionDomain(
  text: string,
  names: () => Iterable<string>,
  constants: () => Readonly<Record<string, number>>,
  declared: readonly string[] = [],
): ConditionDomain {
  let parts: readonly HoldsCondition[] | undefined;
  const conditions = (): readonly HoldsCondition[] => (parts ??= holdsConditions(text, [...names()]));
  const own = (name: string): string => name;
  return {
    get description() {
      return conditions().map((condition) => condition.text).join(' and ');
    },
    predicate: (inputs) => {
      const scope = holdsScope(inputs, constants(), conditionReads(conditions()), declared);
      return conditions().every((condition) => !fails(condition, scope));
    },
    violations: (inputs, keyOf = own) => {
      const scope = holdsScope(inputs, constants(), conditionReads(conditions()), declared);
      const constantNames = constants();
      return conditions()
        .filter((condition) => fails(condition, scope))
        .map((condition) => {
          const read = condition.names
            .filter((name) => !Object.hasOwn(constantNames, name.replace(/-/g, '_')) || Object.hasOwn(inputs, name))
            .map((name) => ({ key: keyOf(name), quantity: name, value: inputs[name] ?? Number.NaN }));
          return {
            condition: rendered(condition, keyOf),
            key: read[0]?.key ?? '',
            value: read[0]?.value ?? Number.NaN,
            inputs: read,
          };
        });
    },
  };
}
