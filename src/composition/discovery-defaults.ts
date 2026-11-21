/**
 * Pure leaf constants of the discovery pipeline. `src/cli/library-defaults.ts`
 * reads them to state a flag's default in `upt discover --help`, so this
 * module must stay importable without the discovery engine (which pulls the
 * MathTS function library).
 *
 * @module composition/discovery-defaults
 */

/**
 * The default order-of-magnitude span `discoverMagnitudeCandidates` scans
 * around each representative value. A span of 3 means each value is probed
 * at ×10⁻³ … ×10³ of its stated magnitude, which is what a law that carries a
 * hidden scale factor (a convention group, a per-unit-system constant) can
 * still be identified under. Widening it multiplies the candidate lattice and
 * the identification is falsified as a `magnitude-clash`. Default 3 — generous
 * enough to bridge a convention scale, small enough that the lattice stays
 * enumerable.
 */
export const DEFAULT_MAX_ORDERS_OF_MAGNITUDE = 3;
