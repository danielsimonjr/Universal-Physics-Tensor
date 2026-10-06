/**
 * Canonical CODATA 2018 + SI-defined physical constants for UPT (v0.5.1).
 *
 * Single source of truth for fundamental physical constants used across the
 * numerical, dimensional, and bridge layers. Replaces the truncated local
 * literals (`c_SI = 2.998e8`, etc.) that drifted across `src/numerical/`,
 * `src/bridges/`, and `tests/fixtures/` — see audit `PC-1` in
 * `docs/architecture/archive/v0.5.1-audit.md`.
 *
 * Values use:
 *   • Exact-SI definitions (`C_SI`, `H_SI`, `K_B_SI`, `E_SI`) where the
 *     2019 SI redefinition fixed their values exactly.
 *   • `HBAR_SI` is the exact quotient `H_SI / (2π)`, not the truncated CODATA display.
 *   • CODATA 2018 best estimates for measured constants (`G_SI`, `ALPHA`, Planck units).
 *   • Planck 2018 best estimate for `H0_SI`.
 *
 * The `PhysicalConstants` namespace in `src/core/types.ts` is retained for
 * backwards-compat; new code should prefer these flat exports.
 *
 * @module core/constants
 * @public
 */

/** Speed of light in vacuum (m/s). Exact SI definition since 1983. */
export const C_SI = 299792458;

/** Newtonian gravitational constant (m³ kg⁻¹ s⁻²). CODATA 2018. */
export const G_SI = 6.67430e-11;

/** Planck constant (J·s). Exact SI definition since 2019. */
export const H_SI = 6.62607015e-34;

/**
 * Reduced Planck constant h/(2π) (J·s). Exact, from the 2019 SI definition of
 * h. The CODATA display `1.054571817e-34` is that quotient truncated; it is
 * smaller by a relative `6.127e-10`. Planck units below stay the published
 * CODATA 2018 values, which were computed from the truncated display.
 */
export const HBAR_SI = H_SI / (2 * Math.PI);

/** Boltzmann constant (J/K). Exact SI definition since 2019. */
export const K_B_SI = 1.380649e-23;

/** Elementary charge (C). Exact SI definition since 2019. */
export const E_SI = 1.602176634e-19;

/** Fine-structure constant α (dimensionless). CODATA 2018. */
export const ALPHA = 7.2973525693e-3;

/** Planck mass √(ℏc/G) (kg). CODATA 2018. */
export const M_P_SI = 2.176434e-8;

/** Planck length √(ℏG/c³) (m). CODATA 2018. */
export const L_P_SI = 1.616255e-35;

/** Planck time √(ℏG/c⁵) (s). CODATA 2018. */
export const T_P_SI = 5.391247e-44;

/**
 * Hubble parameter H₀ (s⁻¹).
 *
 * Planck 2018 TT,TE,EE+lowE+lensing best estimate: 67.4 km/s/Mpc, converted
 * to SI using 1 Mpc = 3.0857×10²² m.
 */
export const H0_SI = 67.4e3 / 3.0857e22;

/**
 * Solar mass (kg). IAU 2015 nominal value rounded to the
 * repo-conventional literal (used by the BE-42 docstring, the
 * bridge-gradient tests, and the v0.8.0 calibration edges).
 * @public
 */
export const M_SUN_SI = 1.989e30;

/** Solar mass in kilograms. The same value as {@link M_SUN_SI}. */
export const M_SUN_KG = M_SUN_SI;

/** von Klitzing constant R_K = h/e² (ohm). */
export const VON_KLITZING_SI = H_SI / (E_SI * E_SI);

/** Josephson constant K_J = 2e/h (Hz/V). */
export const JOSEPHSON_CONSTANT_SI = (2 * E_SI) / H_SI;

/** Lorenz number L = (π²/3) (k_B/e)² (W Ω K⁻²). */
export const LORENZ_NUMBER_SI = (Math.PI ** 2 / 3) * (K_B_SI / E_SI) ** 2;

/** Euler-Mascheroni constant γ. */
const EULER_GAMMA = 0.5772156649015329;

/** Weak-coupling BCS gap ratio 2Δ(0)/(k_B T_c) = 2π e^{−γ}. */
export const BCS_GAP_RATIO = (2 * Math.PI) / Math.exp(EULER_GAMMA);

/** Lane-Emden n=3 dimensionless radius used by the white-dwarf mass. */
export const LANE_EMDEN_OMEGA3 = 2.01824;

/** Thomson cross section (m²). */
export const THOMSON_CROSS_SECTION_SI = 6.6524587321e-29;

/**
 * Nominal solar gravitational parameter (GM)☉ (m³ s⁻²), IAU 2015 Resolution B3.
 *
 * The product GM☉ is known to about 10 significant digits, while G alone is
 * known to about 5, so a confrontation that needs GM☉ takes this value rather
 * than `G_SI × M_SUN_SI`: that product is 3.0e-4 too high, five times the VLBI
 * 1σ on the solar-limb deflection. A mass that some evaluator requires in kg
 * is `GM_SUN_SI / G_SI`, which reproduces G·M = GM☉ exactly.
 * @public
 */
export const GM_SUN_SI = 1.3271244e20;

/** Where {@link GM_SUN_SI} comes from. @internal */
export const GM_SUN_SOURCE = 'IAU 2015 Resolution B3, nominal solar mass parameter (GM)☉ = 1.3271244e20 m³ s⁻²';

/**
 * Electron mass (kg), CODATA 2018. Added for the v0.11 namespacing
 * gate's criterion-3 pin (λ_T of an electron at the Hawking
 * temperature — see the Adam vet A-5).
 * @public
 */
export const M_E_SI = 9.1093837015e-31;

/**
 * Proton mass (kg). CODATA 2018. Shared by the Eddington evaluator and
 * `upt eval` (`m_p`, `m_proton`). Not the Planck mass `M_P_SI`.
 * @internal
 */
export const M_PROTON_SI = 1.67262192369e-27;

/**
 * Avogadro constant (mol⁻¹). Exact in the 2019 SI.
 * @internal
 */
export const N_A_SI = 6.02214076e23;

/**
 * Faraday constant (C·mol⁻¹), `N_A * e`.
 * @internal
 */
export const FARADAY_SI = N_A_SI * E_SI;

/**
 * Wien displacement-law constant b = λ_max·T (m·K). CODATA 2018.
 *
 * @public
 */
export const B_WIEN_SI = 2.897771955e-3;

/**
 * Unified atomic mass unit (kg). CODATA 2018 atomic mass constant.
 * One value for the Chandrasekhar evaluator and the symbolic constant `m_u`.
 * Kept off the package barrel: callers use `m_u` in the symbolic registry.
 * @internal
 */
export const M_U_SI = 1.66053906660e-27;
