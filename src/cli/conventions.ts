/**
 * Convention lines the CLI prints beside a comparison.
 *
 * @module cli/conventions
 * @internal
 */

const COMPTON_PAIR = new Set(['CE-compton-wavelength', 'CE-compton-wavelength-full']);

/**
 * A factor or form difference is a failed check, except the Compton pair:
 * both entries answer to `compton-wavelength` and differ by 2π, so a formula
 * that agrees with one of them has matched that convention. The other
 * difference is still printed. A formula that matches neither still fails.
 * @internal
 */
export function canonicalCheckFailed(
  comparisons: readonly { readonly id: string; readonly kind: string }[],
): boolean {
  const hard = comparisons.filter((c) => c.kind === 'factor' || c.kind === 'form');
  if (hard.length === 0) return false;
  const agreed = comparisons.some((c) => COMPTON_PAIR.has(c.id) && c.kind === 'agrees');
  return !(agreed && hard.every((c) => COMPTON_PAIR.has(c.id)));
}

/** One line per convention a listed comparison is ambiguous about. @internal */
export function conventionLines(ids: readonly string[]): string[] {
  const has = new Set(ids);
  const lines: string[] = [];
  if (has.has('CE-compton-wavelength') || has.has('CE-compton-wavelength-full')) {
    lines.push(
      'convention: CE-compton-wavelength is the reduced wavelength λ̄ = ħ/(m c), prefactor checked. ' +
        'CE-compton-wavelength-full is λ = h/(m c). The Compton-shift entry uses h/(m c) (1−cos θ). h does not alias ħ.',
    );
  }
  if (has.has('CE-rydberg-energy')) {
    lines.push(
      'convention: the Rydberg latex is E_R = m_e e^4 / (32 π² ε0² ħ²), which is m e^4 / (8 ε0² h²). The prefactor is in the scalar AST.',
    );
  }
  if (has.has('CE-gravitational-potential-energy')) {
    lines.push(
      'convention: gravitational potential energy is U = −G m1 m2/r. The minus is in the scalar AST; a positive formula differs by the factor −1.',
    );
  }
  if (has.has('CE-hooke-law')) {
    lines.push(
      "convention: Hooke's law is F = −kx. The minus is in the scalar AST; a positive formula differs by the factor −1.",
    );
  }
  if (has.has('CE-einstein-field-eq')) {
    lines.push(
      'convention: the Einstein-equation metric node is mostly-plus (−,+,+,+), the same signature as upt metric. ' +
        'The 8π is in the scalar AST, so a comparison checks it.',
    );
  }
  return lines;
}

/** Printed beside be-65. The number is the coded formula; the 5 is convention-dependent. */
export const JEANS_FORMULA_NOTE =
  'formula: M_J = (5 k_B T / (G μ m_u))^{3/2} · (3/(4π ρ))^{1/2}. ' +
  'The leading 5 is convention-dependent; the number above is this formula, not a checked universal prefactor.';
