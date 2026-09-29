/**
 * Convention lines the CLI prints beside a comparison. They do not change the
 * frozen canonical record.
 *
 * @module cli/conventions
 * @internal
 */

/** One line per convention a listed comparison is ambiguous about. @internal */
export function conventionLines(ids: readonly string[]): string[] {
  const has = new Set(ids);
  const lines: string[] = [];
  if (has.has('CE-compton-wavelength')) {
    lines.push(
      'convention: CE-compton-wavelength is the reduced wavelength λ̄ = ħ/(m c). ' +
        'The Compton-shift entry uses h/(m c) (1−cos θ). h versus ħ is not a checked prefactor while src/canonical is frozen.',
    );
  }
  if (has.has('CE-rydberg-energy')) {
    lines.push(
      'convention: the Rydberg latex E_R = m_e e^4 / (8 ε0² ħ²) is short by 4π² relative to ' +
        'm e^4 / (8 ε0² h²) = m e^4 / (32 π² ε0² ħ²). The status is scalar-up-to-constant, so the prefactor is not claimed.',
    );
  }
  if (has.has('CE-gravitational-potential-energy')) {
    lines.push(
      'convention: the gravitational-potential latex carries a minus and the scalar AST is the positive monomial. ' +
        'The sign is the unrecorded part; a prefactor of −1 would contradict scalar-up-to-constant.',
    );
  }
  if (has.has('CE-hooke-law')) {
    lines.push(
      "convention: Hooke's latex is F = −kx and the scalar AST is the positive product. The sign is not a checked prefactor.",
    );
  }
  if (has.has('CE-einstein-field-eq')) {
    lines.push(
      'convention: the Einstein-equation tensor AST is mostly-minus (+,-,-,-). ' +
        'The 8π lives only in the field equation, so the scalar monomial does not check it.',
    );
  }
  return lines;
}

/** Printed beside be-65. The number is the coded formula; the 5 is convention-dependent. */
export const JEANS_FORMULA_NOTE =
  'formula: M_J = (5 k_B T / (G μ m_u))^{3/2} · (3/(4π ρ))^{1/2}. ' +
  'The leading 5 is convention-dependent; the number above is this formula, not a checked universal prefactor.';
