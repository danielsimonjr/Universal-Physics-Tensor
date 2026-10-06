/**
 * Null initial-condition (null-IC) reconstruction helper (v0.6.0 Phase 1, Task 1.5).
 *
 * Extracted from `covariant-eikonal.ts` (lines 314–326) so that PC-1.5
 * bench harnesses measure the **actual production reconstruction** rather than
 * a toy approximation.
 *
 * The null condition for the geodesic Hamiltonian H = ½ g^{μν} p_μ p_ν = 0 in
 * the equatorial plane (p_θ = 0) with given p_t and p_φ is
 *
 *   g^tt p_t² + g^rr p_r² + g^φφ p_φ² = 0
 *   ⟹ p_r² = (−g^tt p_t² − g^φφ p_φ²) / g^rr
 *
 * The **negative** root is returned (inward photon: dr/dτ = g^rr p_r < 0).
 *
 * @module numerical/null-ic
 */

/**
 * Solve `g^μν p_μ p_ν = 0` for `p_r` at the initial point of a null
 * geodesic, given the covariant momenta `p_t` and `p_φ` (equatorial plane,
 * `p_θ = 0`).
 *
 * This is the arithmetic the covariant-eikonal method (used by catalog
 * relation be-37) performs; extracted here so PC-1.5 bench harnesses
 * measure the exact same computation.
 *
 * @param gInverse - Contravariant metric g^{μν} at the starting point, as a
 *   flat row-major `Float64Array(16)` indexed `gInverse[μ*4 + ν]` (v0.9.0 O-1).
 *   Only the diagonal entries g^tt (index 0), g^rr (index 5), and g^φφ
 *   (index 15) are used (static equatorial metric, `p_θ = 0`).
 * @param p_t - Covariant time momentum (affine normalization; `< 0`).
 * @param p_phi - Covariant angular momentum (impact-parameter encoding;
 *   `= b * c` in the covariant-eikonal method's convention, used by
 *   catalog relation be-37).
 * @returns `p_r < 0` (inward motion).
 * @throws RangeError if the null condition has no real solution at the
 *   given point (impact parameter too large for the geometry).
 *
 * @public
 */
export function reconstructNullPr(
  gInverse: Float64Array,
  p_t: number,
  p_phi: number,
): number {
  // v0.9.0 O-1: flat row-major layout, gInverse[mu*4 + nu] = g^{μν}.
  // g^tt p_t² + g^rr p_r² + g^φφ p_φ² = 0
  // ⟹ p_r² = (−g^tt p_t² − g^φφ p_φ²) / g^rr
  const numerator = -gInverse[0 * 4 + 0] * p_t * p_t - gInverse[3 * 4 + 3] * p_phi * p_phi;
  if (numerator < 0) {
    throw new RangeError(
      `reconstructNullPr: null condition has no real p_r (impact parameter too large; numerator=${numerator})`,
    );
  }
  const p_r_magnitude = Math.sqrt(numerator / gInverse[1 * 4 + 1]);
  // Inward motion: dr/dτ = g^rr p_r < 0 ⟹ p_r < 0.
  return -p_r_magnitude;
}
