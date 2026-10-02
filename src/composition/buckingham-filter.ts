/**
 * Buckingham filter for one target and the variables that govern it.
 *
 * Calls {@link dimensionallyDetermines} and {@link buckinghamPi}. It does
 * not reimplement the null space and it does not call the probe generator.
 * The determination fields are that engine's result: form only, no constant.
 *
 * A target outside the governing span is absent. A survivor names the
 * `PhysJS.Dimensional` theorem for its shape. The covers line begins with
 * `derivation-step:` and names the hypothesis that theorem leaves open.
 *
 * @module composition/buckingham-filter
 */

import { equals } from '../dimensional/algebra.js';
import type { DimensionalDeterminationResult, DimensionalVariable } from '../dimensional/buckingham.js';
import { buckinghamPi, dimensionallyDetermines } from '../dimensional/buckingham.js';
import { DIMENSIONLESS } from '../dimensional/types.js';

/**
 * A units-only dimensional survivor. `kind` stays `derivation-step`.
 * There is no constant field: the engine does not supply one.
 *
 * @internal
 */
export interface BuckinghamFilterRecord extends DimensionalDeterminationResult {
  readonly theorem:
    | 'PhysJS.Dimensional.monomial_form'
    | 'PhysJS.Dimensional.ratio_shape'
    | 'PhysJS.Dimensional.product_shape'
    | 'PhysJS.Dimensional.ratio_power_invariant'
    | null;
  readonly kind: 'derivation-step';
  /** Begins with `derivation-step:` and names the unfixed hypothesis. */
  readonly covers: string;
}

function formatExponents(
  monomial: Readonly<Record<string, number>>,
  order: readonly string[],
): string {
  return order.map((name) => `${name}^${monomial[name] ?? 0}`).join(' · ');
}

/** Two nonzero exponents of equal magnitude and opposite sign: a ratio. */
function isPureRatio(exponents: Readonly<Record<string, number>>): boolean {
  const nonzero = Object.entries(exponents).filter(([, exp]) => exp !== 0);
  if (nonzero.length !== 2) return false;
  return nonzero[0]![1] === -nonzero[1]![1];
}

function record(
  determination: DimensionalDeterminationResult,
  theorem: BuckinghamFilterRecord['theorem'],
  covers: string,
): BuckinghamFilterRecord {
  return { ...determination, theorem, kind: 'derivation-step', covers };
}

/**
 * The dimensional shape of `target` given `governing`, or absent when the
 * target's dimension is not in their span.
 *
 * @internal
 */
export function buckinghamFilter(
  target: DimensionalVariable,
  governing: readonly DimensionalVariable[],
): BuckinghamFilterRecord | undefined {
  const determination = dimensionallyDetermines(target, governing);
  const full = buckinghamPi(governing.length > 0 ? [target, ...governing] : [target]);
  const governingResult = governing.length > 0 ? buckinghamPi(governing) : undefined;
  const govCount = governingResult?.piGroupCount ?? 0;
  if (full.piGroupCount === govCount) return undefined;

  if (determination.determined && determination.monomial !== undefined) {
    const nonzero = Object.entries(determination.monomial).filter(([, exp]) => exp !== 0);
    const product = nonzero.length === 2 && nonzero.every(([, exp]) => exp === 1);
    const theorem = product
      ? 'PhysJS.Dimensional.product_shape'
      : 'PhysJS.Dimensional.monomial_form';
    const exponents = formatExponents(determination.monomial, determination.governing);
    const covers = product
      ? `derivation-step: ${theorem}. Exponent vector ${exponents}. f(1,1) is unfixed.`
      : `derivation-step: ${theorem}. Exponent vector ${exponents}. f(1,…,1) is unfixed. The exponent vector is a hypothesis. A unit change that can reach every positive tuple is a hypothesis.`;
    return record(determination, theorem, covers);
  }

  if (govCount === 1 && full.piGroupCount === 2 && governingResult !== undefined) {
    const group = governingResult.piGroups[0]?.exponents ?? {};
    if (isPureRatio(group) && equals(target.dim, DIMENSIONLESS)) {
      return record(
        determination,
        'PhysJS.Dimensional.ratio_power_invariant',
        'derivation-step: PhysJS.Dimensional.ratio_power_invariant. The real power p is unfixed.',
      );
    }
    return record(
      determination,
      'PhysJS.Dimensional.ratio_shape',
      'derivation-step: PhysJS.Dimensional.ratio_shape. The function of the ratio is unfixed.',
    );
  }

  return record(
    determination,
    null,
    'derivation-step: a free π-group leaves no unique monomial.',
  );
}
