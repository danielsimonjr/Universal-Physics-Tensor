/**
 * Bridge-index integration scaffold.
 *
 * The 40 bridges in `src/bridges/index.ts` carry `formula_latex` strings
 * but only a handful (BE-11, BE-14 today) have a machine-evaluable AST.
 * The encoding is Tier 5 work, one bridge at a time.
 *
 * `inferDimensionForBridge(id, expr)` runs `validate()` on the AST. If
 * the supplied `id` is registered in `EXPECTED_DIMENSION_BY_BRIDGE`, the
 * inferred dim is also cross-checked against the expected one — a
 * mismatch returns `null` (a real "bridge expected ENTROPY but got
 * AREA" error). If the id is not registered, the inferred dim is
 * returned unchanged (current MVP behaviour for entries with no
 * dimensional_signature yet).
 *
 * @module dimensional/bridge-check
 */

import {
  Dimension,
  DIMENSIONLESS,
  ENERGY,
  ENTROPY,
  FREQUENCY,
  TIME,
  MASS,
  POWER,
  LENGTH,
  AREA,
  FORCE,
  TEMPERATURE,
  VELOCITY,
} from './types.js';
import { ExprNode, validate } from './validator.js';
import { equals, multiply, power } from './algebra.js';

/** [T^-2] — bracketed-product literal for BE-19's H² Friedmann RHS. */
const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

/** [L^-3 T^-1] — bracketed-product literal for BE-47's BBN-dark dY/dt RHS. */
const INV_VOLUME_PER_TIME: Dimension = multiply(
  power(LENGTH, -3),
  { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 },
);

/** [L^3 M T^-3 I^-2] — bracketed-product literal for BE-23's resistivity (Ω·m). */
const RESISTIVITY: Dimension = {
  L: 3, M: 1, T: -3, I: -2, Theta: 0, N: 0, J: 0,
};

/** [energy^4] = [L^8 M^4 T^-8] — bracketed-product literal for BE-40's composite Higgs V(h). */
const ENERGY_4: Dimension = power(ENERGY, 4);

/** [L^-2] — bracketed-product literal for BE-31's Benincasa-Dowker discrete Ricci scalar. */
const INV_LENGTH_2: Dimension = power(LENGTH, -2);

/** [T Θ] — bracketed-product literal for BE-21's KSS viscosity-to-entropy ratio. */
const TIME_TIMES_TEMPERATURE: Dimension = {
  L: 0, M: 0, T: 1, I: 0, Theta: 1, N: 0, J: 0,
};

/** [L^-3 M] — bracketed-product literal for BE-20's cosmological-constant mass density. */
const MASS_DENSITY: Dimension = {
  L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0,
};

/**
 * [L^-2 M^2 T^-2] — bracketed-product literal for BE-17's squared-
 * invariant scalar reduction S²_spin = (c⁴/(8πG))² · T_λμν T^λμν
 * (Wave Z-C 2026-05-07). Spin-density-squared = (angular-momentum-
 * density)² is a custom dim not in NAMED_DIMENSIONS.
 */
const SPIN_DENSITY_SQUARED: Dimension = {
  L: -2, M: 2, T: -2, I: 0, Theta: 0, N: 0, J: 0,
};

/**
 * [L^2 T^-1] — bracketed-product literal for BE-44's soft-hair squared-
 * norm Q_soft² = ∫(∂_u C)² du. News [velocity] = [L T^-1], squared
 * [L^2 T^-2], integral times measure [T] gives [L^2 T^-1]. Wave Z-C
 * 2026-05-07.
 */
const SOFT_HAIR_L2_SQUARED: Dimension = {
  L: 2, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0,
};

/**
 * Per-bridge expected SI dimension lookup. Seeded with every entry that
 * has an AST encoding registered in `src/bridges/equations/`. Add a new
 * row whenever a new Tier-5 AST encoding lands; the
 * `dimensional-signature-catalog` round-trip test plus the
 * `Wave-G expected-dimension entries` size guard in
 * `tests/dimensional/bridge-check.test.ts` enforce that this map stays
 * in sync with the encoded modules.
 *
 * Entries with bracketed-product signatures (e.g. BE-19 `[T^-2]`,
 * BE-47 `[L^-3 T^-1]`) require a constructed `Dimension` literal — see
 * `T_INV2` and `INV_VOLUME_PER_TIME` above for the pattern.
 *
 * Not imported by any internal UPT module; exposed for downstream
 * consumers who want to enumerate bridge dimensional expectations.
 *
 * @internal — may change without a semver bump as more bridges gain
 * machine-evaluable ASTs.
 */
// PI-instrument bridge expansion (2026-07-05) — dimensions for BE-55/56/58.
const HALL_CONDUCTANCE: Dimension = { L: -2, M: -1, T: 3, I: 2, Theta: 0, N: 0, J: 0 }; // σ_xy (siemens)
const PRESSURE: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }; // F/A (pascal)
const VOLTAGE_NOISE_PSD: Dimension = { L: 4, M: 2, T: -5, I: -2, Theta: 0, N: 0, J: 0 }; // S_V (V²/Hz)
const LORENZ_NUMBER: Dimension = { L: 4, M: 2, T: -6, I: -2, Theta: -2, N: 0, J: 0 }; // L₀ (W·Ω·K⁻²) — BE-61
export const EXPECTED_DIMENSION_BY_BRIDGE: ReadonlyMap<number, Dimension> = new Map<number, Dimension>([
  [11, FREQUENCY],
  [12, LENGTH], // BE-12 thermal de Broglie wavelength λ_T = √(2π ℏ²/(m k_B T)) — Wave T 2026-05-06.
  [13, INV_LENGTH_2], // BE-13 trace of Einstein equations R = 4Λ - (8πG/c⁴)T — Wave Y 2026-05-07.
  [18, ENERGY], // BE-18 Higgs-like dark-fermion mass m_dark = g·v — Wave Y 2026-05-07.
  [14, ENTROPY],
  [15, AREA], // BE-15 Model A Kawasaki-Gunton coarsening L(t)² = Γ·t — Wave Z-D 2026-05-11. Late-stage coarsening length-scale; full Langevin equation requires δ-correlator + functional-derivative + functional-integral grammar extensions (out of scope).
  [16, ENERGY], // BE-16 Landauer's principle E_min = k_B · T · ln(2) — Wave Z-E 2026-05-11. Reformulated from 'invalid' (broken C(ρ) ansatz, Wave P-D-style replacement per OpenAI o3 consultation). Canonical information-↔-thermodynamics bridge per Landauer 1961, experimentally tested by Bérut 2012 and Jun 2014.
  [17, SPIN_DENSITY_SQUARED], // BE-17 Einstein-Cartan squared-invariant reduction S²_spin = (c⁴/(8πG))² · T_λμν T^λμν — Wave Z-C 2026-05-07.
  [19, T_INV2],
  [20, MASS_DENSITY], // BE-20 observed cosmological-constant mass density ρ_Λ = c²Λ/(8πG) — Wave Y 2026-05-07.
  [21, TIME_TIMES_TEMPERATURE], // BE-21 KSS viscosity-to-entropy bound η/s = ℏ/(4π k_B) — Wave Y 2026-05-07.
  [22, DIMENSIONLESS],
  [23, RESISTIVITY], // BE-23 SYK Planckian resistivity ρ(T) = ρ_0 + (m* k_B T)/(n_e e² ℏ)·α_SYK — Wave V 2026-05-07.
  [24, DIMENSIONLESS], // BE-24 Förster FRET efficiency η = R_0⁶/(R_0⁶ + R⁶) — Wave V 2026-05-07.
  [25, DIMENSIONLESS], // BE-25 IIT inner intrinsic information ii(s,s̃) = p(s̃|s)·log₂[p(s̃|s)/p(s̃)] — Wave Z-B 2026-05-07. Re-added under the IIT reformulation (Wave P-D R-D2); legacy Penrose-Hameroff `be-25-orch-or.ts` AST remains archived (Wave Q B2). ii has units of bits (pseudo-unit; not in SI 7-base) and types DIMENSIONLESS. Outer MIP min over partitions is deferred grammar-extension.
  [26, FREQUENCY],
  [27, TEMPERATURE], // BE-27 Cugliandolo-Kurchan effective temperature T_eff = T(1+Σ_active/(k_BT)) — Wave Y 2026-05-07.
  [28, { L: 2, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 }], // BE-28 Onsager linear-response entropy production σ = Σ J·X — Wave Z-G 2026-05-11. **User-confirmed relabeling** from MEPP variational principle (which would require variational-δ + Lagrange + discrete-sum grammar extensions). Honest-claude: does NOT capture MEPP's variational maximization claim; see module docstring.
  [29, ENERGY], // BE-29 Jarzynski free-energy equality ΔF = -k_B T ln⟨exp(-βW)⟩ — Wave Y 2026-05-07.
  [30, DIMENSIONLESS], // BE-30 FLM first law δS_EE = δ⟨H_R⟩ — Wave Y 2026-05-07.
  [31, INV_LENGTH_2], // BE-31 Benincasa-Dowker discrete Ricci scalar R(p) = (4/√6) ℓ_P^-2 [1 + N_0 - 9N_1 + 16N_2 - 8N_3] — Wave W 2026-05-07.
  [32, DIMENSIONLESS], // BE-32 QRF Born-rule overlap probability P = |⟨ψ_A|U(g)|ψ_B⟩|² = c² + s² — Wave Z 2026-05-07.
  [33, LENGTH], // BE-33 Hertz-Millis ξ(T) = ξ_0 · (T/T_0)^(-ν/z) — Wave V 2026-05-07.
  [34, DIMENSIONLESS],
  [35, DIMENSIONLESS], // BE-35 CFT bootstrap crossing residual R_cross = C²·[g_block(u,v) - g_block(v,u)] — Wave Z 2026-05-07.
  [36, DIMENSIONLESS], // BE-36 GW170817 graviton-speed bound |c_GW-c|/c ≤ 10⁻¹⁵ — Wave Y 2026-05-07.
  [37, TIME], // BE-37 Shapiro gravitational time-delay Δt = (2GM/c³)·ln(R_far/R_near) — Wave Z-F 2026-05-11. Reformulated from 'invalid' (operationally-meaningless vacuum c(t,x)≠const per Ellis-Uzan 2005) to the canonical operationally-meaningful gravitational time-delay (Shapiro 1964, Cassini 2003).
  [38, FORCE], // BE-38 Milgrom MOND F = F_N · ν(z) — Wave U 2026-05-06.
  [39, DIMENSIONLESS], // BE-39 asymptotic-safety β_g (canonical EH-truncation; β_λ has same dim) — Wave X 2026-05-07.
  [40, ENERGY_4], // BE-40 Composite Higgs V(h) = -α f⁴ sin² + β f⁴ [sin⁴ - sin²cos²] — Wave V 2026-05-07.
  [41, MASS],
  [42, TEMPERATURE], // BE-42 Hawking temperature T_H = ℏc³/(8π G M k_B) — Wave Y 2026-05-07.
  [43, ENTROPY], // BE-43 ER=EPR S = k_B · A_wormhole / (4 ℓ_P²) — Wave V 2026-05-07.
  [44, SOFT_HAIR_L2_SQUARED], // BE-44 Soft-hair L²-norm Q_soft² = ∫(∂_u C)² du — Wave Z-C 2026-05-07. Squared-norm scalar reduction of BMS supertranslation charge; integral primitive over u-direction at null infinity (celestial 2-sphere absorbed).
  [45, DIMENSIONLESS], // BE-45 TCC e-fold bound N_e_max = log(M_P/H_inf) - γ log(r/0.01) — Wave W 2026-05-07.
  [46, DIMENSIONLESS], // BE-46 Weinberg-Vilenkin anthropic probability P(Λ) = A·exp(-α/Λ) — Wave Z 2026-05-07.
  [47, INV_VOLUME_PER_TIME],
  [48, FREQUENCY], // BE-48 GRW mass-amplified localization rate λ_GRW(m) = λ_0 (m/m_0) — Wave Y 2026-05-07.
  [49, DIMENSIONLESS], // BE-49 Quantum Darwinism I(S:F_k) = I(S:E) - α k^(-β) — Wave W 2026-05-07.
  [50, DIMENSIONLESS], // BE-50 Wheeler-Feynman time-symmetry residual r_TS = (A_ret-A_adv)/(A_ret+A_adv) — Wave Z 2026-05-07.
  // v0.7 BE-X re-encoding sprint additions (parallel-agent dispatch, 2026-05-24).
  // E1 of BRIDGE-PHYSICS-AUDIT-v2.md (Eve red-team): these two entries
  // were silently absent from EXPECTED_DIMENSION_BY_BRIDGE when BE-53/54
  // shipped; the v0.7 catalog-extension protocol step from
  // orphan-dimensional-signature.test.ts:37-43 was skipped during ship.
  // Registering here closes the silent test-coverage gap.
  [53, DIMENSIONLESS], // BE-53 Yang-Mills one-loop β(g) = -b₀g³/(16π²); β of a dimensionless coupling is itself dimensionless — same as BE-39.
  [54, T_INV2], // BE-54 Randall-Sundrum brane Friedmann H² = (8πG/3)ρ(1+ρ/(2σ)) + Λ/3; H² has dim [T^-2] — same as BE-19 modified Friedmann.
  [55, HALL_CONDUCTANCE], // BE-55 integer quantum Hall σ_xy = C·e²/h — PI-instrument expansion 2026-07-05.
  [56, PRESSURE], // BE-56 Casimir F/A = −π²ℏc/(240 d⁴) — PI-instrument expansion 2026-07-05.
  [57, TEMPERATURE], // BE-57 Unruh T = ℏa/(2π c k_B) — PI-instrument expansion 2026-07-05.
  [58, VOLTAGE_NOISE_PSD], // BE-58 Johnson-Nyquist S_V = 4 k_B T R — PI-instrument expansion 2026-07-05.
  [59, FREQUENCY], // BE-59 AC Josephson f = 2eV/h — condensed-matter cluster 2026-07-05.
  [60, HALL_CONDUCTANCE], // BE-60 fractional QH σ_xy = ν·e²/h — condensed-matter cluster 2026-07-05.
  [61, LORENZ_NUMBER], // BE-61 Wiedemann-Franz L₀ = (π²/3)(k_B/e)² — condensed-matter cluster 2026-07-05.
  [62, ENERGY], // BE-62 BCS gap Δ(0) = 1.764 k_B T_c — condensed-matter cluster 2026-07-05.
  [63, MASS], // BE-63 Chandrasekhar mass M_Ch ≈ 1.44 M_⊙ — astrophysics cluster 2026-07-05.
  [64, POWER], // BE-64 Eddington luminosity L_Edd = 4πGMm_p c/σ_T — astrophysics cluster 2026-07-05.
  [65, MASS], // BE-65 Jeans mass M_J — astrophysics cluster 2026-07-05.
  [66, PRESSURE], // BE-66 radiation pressure P_n = (I/c)(1+R) cos²θ.
  [67, VELOCITY], // BE-67 Alfvén speed v_A = B / √(μ0 ρ).
  [68, TEMPERATURE], // BE-68 Tolman–Ehrenfest invariant T √(−g_00).
]);

/**
 * Infer the SI dimensional signature of a bridge equation expression.
 *
 * @param bridgeId  The id from `BRIDGE_EQUATIONS` (11..68). If present
 *                  in `EXPECTED_DIMENSION_BY_BRIDGE` the inferred dim
 *                  is cross-checked against the expected; mismatch =>
 *                  null. If absent, the inferred dim is returned as-is.
 * @param expr      Hand-encoded ExprNode AST for the equation's RHS
 *                  (or LHS).
 * @returns The inferred SI dimension, or `null` if the expression is
 *          dimensionally inconsistent or fails the per-bridge expected
 *          dimension check.
 */
export function inferDimensionForBridge(
  bridgeId: number,
  expr: ExprNode,
): Dimension | null {
  const r = validate(expr);
  if (!r.ok || r.inferredDimension === null) return null;
  const expected = EXPECTED_DIMENSION_BY_BRIDGE.get(bridgeId);
  if (expected !== undefined && !equals(r.inferredDimension, expected)) {
    return null;
  }
  return r.inferredDimension;
}
