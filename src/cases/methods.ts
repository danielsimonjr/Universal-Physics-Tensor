/**
 * Numeric methods and case runners for applied cases (Part B catalog).
 *
 * @module cases/methods
 */
import { findRoot } from '@danielsimonjr/mathts-functions';
import { C_SI, EPS0_SI, G_SI, H_SI, K_B_SI, MU0_SI, SIGMA_SB_SI } from '../core/constants.js';
import { convertValue } from '../dimensional/units.js';
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { integrateRK4 } from '../numerical/null-ray-integrator.js';
import { adaptiveQuadrature } from './quadrature.js';
import { appliedCaseCatalog, appliedCaseRecord, assembleAppliedCase, catalogSemanticProblems } from './catalog.js';
import { runAppliedCaseEngine, usesCatalogEngine } from './engine.js';
import { check, requirePositive, signedRelativeDifference, type AppliedCase, type CaseResult, type LumpedRadiating } from './types.js';

export type { LumpedRadiating } from './types.js';

// --- skin-depth.ts ---
const SKIN_DEPTH_ID = 'case-skin-depth';

/** ωε/σ ceiling: the displacement current then moves the penetration depth by ≈ ωε/(2σ) ≤ 0.5%. @internal */
export const MAX_DISPLACEMENT_RATIO = 0.01;

/** l/δ ceiling for a local (classical) conductivity. @internal */
export const MAX_MFP_RATIO = 0.1;

/** ωτ ceiling: the Drude σ(ω) = σ0/(1 − iωτ) is then within 0.5% of σ0 in modulus. @internal */
export const MAX_OMEGA_TAU = 0.1;

/** d/δ floor: the field reaching the back face is then ≤ e^{−5} ≈ 0.7% of the surface field. @internal */
export const MIN_THICKNESS_RATIO = 5;

/**
 * δ_Maxwell/δ for the plane wave k² = ω²με + iωμσ, as a function of r = ωε/σ:
 * 1/Im k = δ √(√(1 + r²) + r), written without the cancellation of |z| − Re z.
 * @internal
 */
export function maxwellDepthFactor(r: number): number {
  return Math.sqrt(Math.hypot(1, r) + r);
}

/** Parent penetration depth δ_M from classical δ and r = ωε/σ. @internal */
export function skinDeltaMaxwellM(
  _inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const delta = outputs.delta_m;
  const r = outputs.displacement_ratio;
  if (delta === null || r === null || !Number.isFinite(delta) || !Number.isFinite(r)) {
    throw new Error('skinDeltaMaxwellM: need finite delta_m and displacement_ratio');
  }
  return delta * maxwellDepthFactor(r);
}
/** @internal */
export function runCaseSkinDepth(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(SKIN_DEPTH_ID, i, ['rho_ohm_m', 'f_Hz', 'mu_r', 'eps_r', 'l_mfp_m', 'v_carrier_m_per_s', 'thickness_m']);
    const { rho_ohm_m: rho, f_Hz: f, mu_r: muR, eps_r: epsR, l_mfp_m: l, v_carrier_m_per_s: v, thickness_m: d } = i as Record<string, number>;
    const omega = 2 * Math.PI * f;
    const mu = muR * MU0_SI;
    const delta = Math.sqrt((2 * rho) / (omega * mu));
    const r = omega * epsR * EPS0_SI * rho;
    const deltaMaxwell = delta * maxwellDepthFactor(r);
    const omegaTau = (omega * l) / v;
    return {
      outputs: {
        omega_per_s: omega,
        delta_m: delta,
        R_s_ohm: rho / delta,
        delta_maxwell_m: deltaMaxwell,
        maxwell_deviation: delta / deltaMaxwell - 1,
        displacement_ratio: r,
        mfp_ratio: l / delta,
        omega_tau: omegaTau,
        thickness_ratio: d / delta,
        back_field_ratio: Math.exp(-d / delta),
      },
      checks: [
        check('good-conductor', 'good conductor: conduction current ≫ displacement current', 'ωε/σ', r, '<=', MAX_DISPLACEMENT_RATIO,
          'chosen threshold for ≪ 1: the parent penetration depth then differs from δ by ≈ ωε/(2σ) ≤ 0.5%'),
        check('local', 'local conductivity: the carriers\' mean free path well inside the skin depth, l ≪ δ', 'l/δ', l / delta, '<=', MAX_MFP_RATIO,
          'chosen threshold for ≪ 1; beyond it the current at a point depends on the field over a path l and the anomalous skin effect sets in (Pippard 1947; Reuter & Sondheimer 1948)'),
        check('dc-conductivity', 'DC conductivity: the drive is slow beside the carrier relaxation, ωτ ≪ 1', 'ω l/v', omegaTau, '<=', MAX_OMEGA_TAU,
          'chosen threshold for ≪ 1: the Drude σ(ω) = σ0/(1 − iωτ) is then within 0.5% of σ0 in modulus'),
        check('thick', 'the conductor is a half-space for the field: d ≫ δ', 'd/δ', d / delta, '>=', MIN_THICKNESS_RATIO,
          'chosen threshold: the half-space field at the back face is then ≤ e^{−5} ≈ 0.7% of the surface field'),
      ],
      unchecked: [
        'ρ, μ_r and ε_r are the values at the conductor\'s temperature and at f; τ = l/v assumes one carrier species with one speed',
        'the conductor is planar on the scale of δ (a wire of radius a needs a ≫ δ, not checked here)',
      ],
    };
  
}

// --- kepler-rv.ts ---
const KEPLER_RV_ID = 'case-kepler-rv';

/** The Julian year, the year BE-52 takes (s): the unit table's `julian_year` row (`yr`). @internal */
export const JULIAN_YEAR_S = convertValue('1 yr', 's').value;

/** m_p/M_* ceiling: the test-mass K then exceeds the two-body K by (1 + q)^{2/3} − 1 ≤ 0.67%. @internal */
export const MAX_MASS_RATIO = 0.01;

/** Ceiling on the stellar radius over the periastron separation, for point masses. @internal */
export const MAX_RADIUS_RATIO = 0.1;

/** G(M_* + m_p)/(c² a) ceiling for Newtonian gravity. @internal */
export const MAX_WEAK_FIELD = 1e-4;

/** e·Δω accumulated over the record (rad) ceiling for a fixed ellipse. @internal */
export const MAX_APSIDAL_MISFIT = 0.01;
/** @internal */
export function runCaseKeplerRv(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(KEPLER_RV_ID, i, ['M_star_kg', 'm_p_kg', 'P_s', 'sin_i', 'R_star_m', 'T_obs_s']);
    const { M_star_kg: M, m_p_kg: m, P_s: P, eccentricity: e, sin_i: sinI, R_star_m: R, T_obs_s: tObs } = i as Record<string, number>;
    if (!Number.isFinite(e) || e < 0 || e >= 1) throw new Error(`${KEPLER_RV_ID}: eccentricity must be in [0, 1) (got ${e})`);
    if (sinI > 1) throw new Error(`${KEPLER_RV_ID}: sin_i must be in (0, 1] (got ${sinI})`);
    const total = M + m;
    const a = Math.cbrt((G_SI * total * P * P) / (4 * Math.PI * Math.PI));
    const root = Math.sqrt(1 - e * e);
    const n13 = Math.cbrt((2 * Math.PI * G_SI) / P);
    const K = (n13 * m * sinI) / Math.cbrt(M * M) / root;
    const K2b = (n13 * m * sinI) / Math.cbrt(total * total) / root;
    const rPeri = a * (1 - e);
    const weak = (G_SI * total) / (C_SI * C_SI * a);
    const advance = catalogRelations().find((row) => row.target === 'perihelion-advance');
    if (advance === undefined) throw new Error(`${KEPLER_RV_ID}: the perihelion relation is not in the catalog`);
    const dphi = evaluateCatalogRelation(advance, { mass: total, 'semi-major-axis': a, eccentricity: e });
    const misfit = (e * dphi * tObs) / P;
    return {
      outputs: {
        q: m / M,
        a_m: a,
        a_star_m: (a * m) / total,
        K_m_per_s: K,
        K_two_body_m_per_s: K2b,
        two_body_deviation: K / K2b - 1,
        r_peri_m: rPeri,
        weak_field: weak,
        dphi_rad_per_orbit: dphi,
        omega_dot_deg_per_yr: ((dphi / P) * JULIAN_YEAR_S * 180) / Math.PI,
        apsidal_misfit: misfit,
      },
      checks: [
        check('test-mass', 'the companion is light beside the star, m_p ≪ M_*', 'm_p/M_*', m / M, '<=', MAX_MASS_RATIO,
          'chosen threshold: the test-mass K then exceeds the two-body K by (1 + q)^{2/3} − 1 ≤ 0.67%'),
        check('point-mass', 'point masses: the star is small beside the closest approach, R_* ≪ r_p', 'R_*/(a(1 − e))', R / rPeri, '<=', MAX_RADIUS_RATIO,
          'chosen threshold: tidal and rotational quadrupole terms scale as (R_*/r)² times a Love number or J2 (each < 1), kept ≤ 1%'),
        check('weak-field', 'Newtonian gravity: G(M_* + m_p)/(c²a) ≪ 1', 'G(M_* + m_p)/(c² a)', weak, '<=', MAX_WEAK_FIELD,
          'chosen threshold: the 1PN corrections to the P–a relation and to the orbital velocity are of this relative order'),
        check('apsidal', 'a fixed ellipse over the record: the GR apsidal advance does not reshape the RV curve', 'e Δω T_obs/P', misfit, '<=', MAX_APSIDAL_MISFIT,
          'chosen threshold: beyond the mean longitude (absorbed by the fitted phase), v_r depends on ω only at O(e), so the misfit is of order e Δω K; its coefficient (order one) is not encoded'),
      ],
      unchecked: [
        'no third body: an outer companion adds its own reflex signal and perturbs P and ω',
        'the companion\'s radius is also small beside r_p (only the star\'s is checked)',
      ],
    };
  
}

// --- damped-resonator.ts ---
const DAMPED_RESONATOR_ID = 'case-damped-resonator';

/** Q floor for the single-Lorentzian (near-resonance) form of the spectrum. @internal */
export const MIN_Q_LORENTZIAN = 10;

/** (1/t_obs)/linewidth ceiling: the record resolves the line. @internal */
export const MAX_RESOLUTION_RATIO = 0.1;

/**
 * √(k_BT/k)/A ceiling. Thermal motion of one mode is x = X cos ω_d t + Y sin ω_d t
 * with ⟨X²⟩ = ⟨Y²⟩ = k_BT/k (equipartition), so the envelope of the ring-down
 * plus it is Rician with ⟨A_obs²⟩ = A² + 2k_BT/k (Rice 1944); at the ceiling
 * √(1 + 2·0.01) − 1 ≈ 0.0100.
 * @internal
 */
export const MAX_THERMAL_RATIO = 0.1;

/**
 * FWHM in Hz of |∫₀ᵀ e^{−(α + iΔω)t} dt|², the near-resonance power spectrum of
 * a ring-down x0 e^{−αt} cos(ω_d t) recorded for T. The negative-frequency
 * pole is dropped, which is the Q ≫ 1 approximation. The peak is at Δω = 0:
 * the integrand is positive, so |X(Δω)| ≤ X(0).
 * @internal
 */
export function windowedLinewidthHz(alpha: number, T: number): number {
  const oneMinusE = -Math.expm1(-alpha * T);
  const E = 1 - oneMinusE;
  // (1 − E)² + 4E sin²(ΔωT/2) is 1 − 2E cos(ΔωT) + E² without its cancellation near Δω = 0.
  const power = (dw: number) => (oneMinusE ** 2 + 4 * E * Math.sin((dw * T) / 2) ** 2) / (alpha * alpha + dw * dw);
  const half = power(0) / 2;
  const h = (alpha + 1 / T) / 200;
  let lo = 0;
  let hi = h;
  for (let k = 1; power(hi) > half; k++) {
    if (k > 1e6) throw new Error(`${DAMPED_RESONATOR_ID}: no half-power point found (α = ${alpha}, T = ${T})`);
    lo = hi;
    hi += h;
  }
  // The crossing inside the first step past half power, by MathTS `findRoot` (Brent) on the
  // order-one residual power/half − 1, to the bracket's floating-point resolution.
  const crossing = findRoot((dw) => power(dw) / half - 1, lo, hi, { tol: 4 * Number.EPSILON * hi, maxIter: 200 });
  return crossing / Math.PI;
}

/** Catalog engine: FWHM of the truncated ring-down spectrum (null when overdamped). @internal */
export function windowedLinewidthCatalogHz(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number | null {
  if (inputs.Q! <= 0.5) return null;
  const alpha = outputs.alpha_per_s;
  if (alpha === null || !Number.isFinite(alpha)) return null;
  return windowedLinewidthHz(alpha, inputs.t_obs_s!);
}

/** @internal */
export function runCaseDampedResonator(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(DAMPED_RESONATOR_ID, i, ['f0_Hz', 'Q', 't_obs_s']);
    const { f0_Hz: f0, Q, x0_m: x0, t_s: t, t_obs_s: tObs } = i as Record<string, number>;
    if (!Number.isFinite(x0)) throw new Error(`${DAMPED_RESONATOR_ID}: x0_m must be finite (got ${x0})`);
    if (!Number.isFinite(t) || t < 0) throw new Error(`${DAMPED_RESONATOR_ID}: t_s must be a finite number ≥ 0 (got ${t})`);
    const w0 = 2 * Math.PI * f0;
    const alpha = w0 / (2 * Q);
    const linewidth = f0 / Q;
    const underdamped = Q > 0.5;
    const root = underdamped ? Math.sqrt(1 - 1 / (4 * Q * Q)) : NaN;
    const wd = w0 * root;
    const decay = Math.exp(-alpha * t);
    const windowed = underdamped ? windowedLinewidthHz(alpha, tObs) : null;
    const envelope = underdamped ? (Math.abs(x0) * decay) / root : null;
    const checks = [
      check('underdamped', 'underdamped: the solution rings (Q > 1/2)', 'Q', Q, '>', 0.5,
        'exact: at Q ≤ 1/2 the solution is a sum of real exponentials, with no ring-down, f_d or envelope'),
      check('single-lorentzian', 'high Q: the line near f0 is one Lorentzian', 'Q', Q, '>=', MIN_Q_LORENTZIAN,
        'chosen threshold for Q ≫ 1: the windowed spectrum drops the negative-frequency pole'),
      check('resolved', 'the record resolves the line: 1/t_obs ≪ f0/Q', '(1/t_obs)/(f0/Q)', 1 / tObs / linewidth, '<=', MAX_RESOLUTION_RATIO,
        'chosen threshold for ≪ 1; see windowed_excess for the broadening it allows'),
      check('in-record', 'the read-out time lies inside the record', 't/t_obs', t / tObs, '<=', 1,
        'exact: an envelope read after the record ends was not measured'),
    ];
    const unchecked = underdamped
      ? ['the damping is viscous (velocity-proportional) and the same over the whole ring-down']
      : ['for Q ≤ 1/2 the displacement is x0 (r₂e^{r₁t} − r₁e^{r₂t})/(r₂ − r₁) with real r₁, r₂; this case does not evaluate it'];
    if ((i.T_K === undefined) !== (i.k_N_per_m === undefined)) throw new Error(`${DAMPED_RESONATOR_ID}: give T_K and k_N_per_m together, or neither`);
    let xTh: number | null = null;
    if (i.T_K !== undefined) {
      requirePositive(DAMPED_RESONATOR_ID, i, ['T_K', 'k_N_per_m']);
      xTh = Math.sqrt((K_B_SI * i.T_K) / i.k_N_per_m!);
      if (envelope !== null) {
        checks.push(
          check('above-thermal', 'the ring-down stands above the thermal motion at t', '√(k_BT/k)/A(t)', xTh / envelope, '<=', MAX_THERMAL_RATIO,
            'chosen threshold: the RMS envelope √(A² + 2k_BT/k) then exceeds A by ≤ 1%'),
        );
      }
      unchecked.push('the thermal motion is in equilibrium with the damping bath at T and uncorrelated with the release; the read-out adds no noise of its own');
    }
    return {
      outputs: {
        alpha_per_s: alpha,
        tau_s: 1 / alpha,
        linewidth_Hz: linewidth,
        f_d_Hz: underdamped ? f0 * root : null,
        x_m: underdamped ? x0 * decay * (Math.cos(wd * t) + (alpha / wd) * Math.sin(wd * t)) : null,
        envelope_m: envelope,
        resolution_Hz: 1 / tObs,
        linewidth_windowed_Hz: windowed,
        windowed_excess: windowed === null ? null : windowed / linewidth - 1,
        x_th_rms_m: xTh,
        envelope_rms_m: xTh === null || envelope === null ? null : Math.sqrt(envelope * envelope + 2 * xTh * xTh),
      },
      checks,
      unchecked,
    };
  
}

// --- resistor-noise.ts ---
const RESISTOR_NOISE_ID = 'case-resistor-noise';

/** h f_hi/(k_B T) ceiling: the Planck factor x/(eˣ−1) is then within x/2 ≤ 0.5% of 1. @internal */
export const CLASSICAL_MAX_X = 0.01;

/** 2π f_hi R_eff C_in ceiling: the input RC pole then passes 1/(1+w²) ≥ 99% at f_hi. @internal */
export const FLAT_BAND_MAX_WRC = 0.1;

/**
 * Ceiling on σ(S_R)/S_R = 1/(φ√(B t_avg)): the resistor's noise power, left after
 * subtracting an exactly known amplifier power, scatters by ≤ 1%. The total
 * power scatters by 1/√(B t_avg) (Dicke 1946); φ is the resistor's share of it.
 * @internal
 */
export const AMPLIFIER_MAX_REL_SIGMA = 0.01;

/** Nyquist's thermal spectral density at f, shaped by the input RC; `x/expm1(x)` → 1 as x → 0. */
function parentDensity(f: number, T: number, rEff: number, c: number): number {
  const x = (H_SI * f) / (K_B_SI * T);
  const planck = x === 0 ? 1 : x / Math.expm1(x);
  const w = 2 * Math.PI * f * rEff * c;
  return (4 * K_B_SI * T * rEff * planck) / (1 + w * w);
}
/** @internal */
export function runCaseResistorNoise(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(RESISTOR_NOISE_ID, i, ['T_K', 'R_ohm', 'R_in_ohm', 'f_hi_Hz', 't_avg_s']);
    const { T_K: T, R_ohm: R, R_in_ohm: Rin, C_in_F: C, f_lo_Hz: fLo, f_hi_Hz: fHi, t_avg_s: tAvg } = i as Record<string, number>;
    if (!Number.isFinite(C) || C < 0) throw new Error(`${RESISTOR_NOISE_ID}: C_in_F must be a finite number ≥ 0 (got ${C})`);
    if (!Number.isFinite(fLo) || fLo < 0 || fLo >= fHi) throw new Error(`${RESISTOR_NOISE_ID}: need 0 ≤ f_lo_Hz < f_hi_Hz (got ${fLo}, ${fHi})`);
    const B = fHi - fLo;
    const rEff = (R * Rin) / (R + Rin);
    const noise = catalogRelations().find((row) => row.target === 'voltage-noise-density');
    if (noise === undefined) throw new Error(`${RESISTOR_NOISE_ID}: the resistor-noise relation is not in the catalog`);
    const spectral = (temperature: number, ohms: number): number =>
      evaluateCatalogRelation(noise, { 'johnson-temperature': temperature, resistance: ohms });
    const S = spectral(T, rEff);
    const S0 = spectral(T, R);
    const vRms = Math.sqrt(S * B);
    const vParent = Math.sqrt(adaptiveQuadrature((f) => parentDensity(f, T, rEff, C), fLo, fHi));
    const x = (H_SI * fHi) / (K_B_SI * T);
    const wrc = 2 * Math.PI * fHi * rEff * C;
    const checks = [
      check('classical', 'flat, classical spectrum: hf ≪ k_BT across the band', 'h f_hi/(k_B T)', x, '<=', CLASSICAL_MAX_X,
        'chosen threshold for ≪ 1: the Planck factor at f_hi is then within x/2 ≤ 0.5% of 1'),
      check('flat-band', 'the input RC pole lies above the band', '2π f_hi R_eff C_in', wrc, '<=', FLAT_BAND_MAX_WRC,
        'chosen threshold for ≪ 1: the RC low-pass then passes ≥ 99% of the density at f_hi'),
    ];
    const unchecked = [
      'R_in is a physical resistance at T; an actively synthesized or cold input adds less noise than its resistance would, ' +
        'down to the resistor alone divided by the input: V_rms,0 · R_in/(R + R_in)',
      'no DC current through R, so no 1/f excess noise',
    ];
    const withAmplifier = i.e_n2_V2_per_Hz !== undefined || i.i_n2_A2_per_Hz !== undefined;
    let amp: { total: number; fraction: number; tN: number } | null = null;
    if (withAmplifier) {
      const en2 = i.e_n2_V2_per_Hz ?? 0;
      const in2 = i.i_n2_A2_per_Hz ?? 0;
      for (const [k, v] of [['e_n2_V2_per_Hz', en2], ['i_n2_A2_per_Hz', in2]] as const) {
        if (!Number.isFinite(v) || v < 0) throw new Error(`${RESISTOR_NOISE_ID}: ${k} must be a finite number ≥ 0 (got ${v})`);
      }
      const excess = en2 + in2 * rEff * rEff;
      const fraction = S / (S + excess);
      amp = { total: Math.sqrt((S + excess) * B), fraction, tN: excess / (4 * K_B_SI * rEff) };
      checks.push(
        check('amplifier', "the resistor's noise is resolved above the amplifier's in t_avg", '1/(φ √(B t_avg))', 1 / (fraction * Math.sqrt(B * tAvg)), '<=',
          AMPLIFIER_MAX_REL_SIGMA,
          "chosen threshold: after subtracting the amplifier's power (known exactly, e.g. from a long shorted-input run) the resistor's power scatters by ≤ 1%"),
      );
      unchecked.push(
        `e_n and i_n are white over the band and uncorrelated${i.e_n2_V2_per_Hz === undefined ? '; e_n was not given and is taken as 0' : ''}` +
          `${i.i_n2_A2_per_Hz === undefined ? '; i_n was not given and is taken as 0' : ''}`,
      );
    }
    return {
      outputs: {
        B_Hz: B,
        R_eff_ohm: rEff,
        S_V_V2_per_Hz: S,
        V_rms_unloaded_V: Math.sqrt(S0 * B),
        V_rms_V: vRms,
        loading_ratio: Math.sqrt(S / S0),
        V_rms_parent_V: vParent,
        parent_deviation: vRms / vParent - 1,
        V_rms_rel_sigma: 1 / (2 * Math.sqrt(B * tAvg)),
        V_rms_total_V: amp?.total ?? null,
        resistor_fraction: amp?.fraction ?? null,
        T_n_K: amp?.tN ?? null,
      },
      checks,
      unchecked,
    };
  
}

// --- lumped-cooling.ts ---
const LUMPED_COOLING_ID = 'case-lumped-cooling';

/** The Stefan–Boltzmann constant (W m⁻² K⁻⁴) is `core/constants`'s; re-exported so the record's module-export table keeps its row. @internal */
export { SIGMA_SB_SI } from '../core/constants.js';

/** Bi = h L_c/k ceiling, L_c = V/A (Incropera §5.2, eq. 5.10). @internal */
export const MAX_BIOT = 0.1;

/** h_rad,max/h ceiling for a loss linear in T − T∞. @internal */
export const MAX_RADIATION_RATIO = 0.1;


/**
 * T(t) of ρcV dT/dt = −A[h(T − T∞) + εσ_SB(T⁴ − T∞⁴)] for a sphere (V/A =
 * a/3), by classical RK4 (`integrateRK4`, MathTS `solveODESystem` with `dt`,
 * one call per step) with each step 1/100 of the local relaxation time
 * ρca/(3(h + 4εσ_SB T³)). Stops early once |T − T∞| is below 1e-15 |T0 − T∞|.
 * @internal
 */
export function lumpedRadiatingTemperature(p: LumpedRadiating): number {
  const k = 3 / (p.rho * p.c * p.a);
  const f = (_t: number, y: readonly number[]): number[] => {
    const T = y[0]!;
    return [-k * (p.h * (T - p.Tinf) + p.eps * SIGMA_SB_SI * (T ** 4 - p.Tinf ** 4))];
  };
  const floor = 1e-15 * Math.abs(p.T0 - p.Tinf);
  let T = p.T0;
  let s = 0;
  while (s < p.t && Math.abs(T - p.Tinf) > floor) {
    const rate = k * (p.h + 4 * p.eps * SIGMA_SB_SI * Math.max(T, p.Tinf) ** 3);
    const dt = Math.min(p.t - s, 0.01 / rate);
    T = integrateRK4(f, [T], s, s + dt, 1)[0] ?? Number.NaN;
    s += dt;
  }
  return T;
}

/**
 * The first n roots of 1 − ζ cot ζ = Bi (Bi = h a/k, radius-based): the n-th
 * lies in ((n−1)π, nπ), where the left side runs from −∞ (0 for n = 1) to +∞.
 * Each is MathTS `findRoot` (Brent) on that interval, pulled in from the
 * poles by a few ulps of kπ, since the solver evaluates both ends: at 0 the
 * function is 0/0, and at an exact multiple of π `Math.tan` has no sign to
 * trust. The tolerance is the bracket's own floating-point resolution.
 * @internal
 */
export function sphereEigenvalues(biRadius: number, n: number): number[] {
  const f = (z: number) => 1 - z / Math.tan(z) - biRadius;
  const roots: number[] = [];
  for (let k = 1; k <= n; k++) {
    const hi = k * Math.PI;
    const inset = 8 * Number.EPSILON * hi;
    const lo = k === 1 ? Number.MIN_VALUE : (k - 1) * Math.PI + inset;
    roots.push(findRoot(f, lo, hi - inset, { tol: 4 * Number.EPSILON * hi, maxIter: 200 }));
  }
  return roots;
}

/**
 * θ/θ0 = (T − T∞)/(T0 − T∞) from the series solution of the sphere with a
 * convective surface, at Fourier number Fo = αt/a², for the volume mean, the
 * centre and the surface. Terms are summed until e^{−ζ²Fo} < 1e-18.
 * @throws Error when Fo is so small that the series would need over 1e5 terms.
 * @internal
 */
export function sphereSeries(biRadius: number, fo: number): { mean: number; centre: number; surface: number } {
  if (fo === 0) return { mean: 1, centre: 1, surface: 1 };
  const terms = Math.ceil(Math.sqrt(42 / fo) / Math.PI) + 2;
  if (terms > 1e5) throw new Error(`${LUMPED_COOLING_ID}: Fo = ${fo} is too small for the series (needs ${terms} terms)`);
  let mean = 0;
  let centre = 0;
  let surface = 0;
  for (const z of sphereEigenvalues(biRadius, terms)) {
    const s = Math.sin(z);
    const c = Math.cos(z);
    const cn = (4 * (s - z * c)) / (2 * z - Math.sin(2 * z));
    const decay = Math.exp(-z * z * fo);
    centre += cn * decay;
    surface += (cn * decay * s) / z;
    mean += (cn * decay * 3 * (s - z * c)) / z ** 3;
  }
  return { mean, centre, surface };
}
/** @internal */
export function runCaseLumpedCooling(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(LUMPED_COOLING_ID, i, ['a_m', 'rho_kg_per_m3', 'c_J_per_kg_K', 'k_W_per_m_K', 'h_W_per_m2_K', 'T0_K', 'T_inf_K']);
    const {
      a_m: a, rho_kg_per_m3: rho, c_J_per_kg_K: c, k_W_per_m_K: k, h_W_per_m2_K: h,
      emissivity: eps, T0_K: T0, T_inf_K: Tinf, t_s: t,
    } = i as Record<string, number>;
    if (!Number.isFinite(eps) || eps < 0 || eps > 1) throw new Error(`${LUMPED_COOLING_ID}: emissivity must be in [0, 1] (got ${eps})`);
    if (!Number.isFinite(t) || t < 0) throw new Error(`${LUMPED_COOLING_ID}: t_s must be a finite number ≥ 0 (got ${t})`);
    const tau = (rho * c * a) / (3 * h);
    const bi = (h * (a / 3)) / k;
    const biRadius = (h * a) / k;
    const alpha = k / (rho * c);
    const fo = (alpha * t) / (a * a);
    const theta = Math.exp(-t / tau);
    const series = sphereSeries(biRadius, fo);
    const dT0 = T0 - Tinf;
    const Tmax = Math.max(T0, Tinf);
    const hRad = eps * SIGMA_SB_SI * (Tmax + Tinf) * (Tmax * Tmax + Tinf * Tinf);
    const volume = (4 / 3) * Math.PI * a ** 3;
    const biRadiating = ((h + hRad) * (a / 3)) / k;
    const tRadiating = biRadiating <= MAX_BIOT ? lumpedRadiatingTemperature({ a, rho, c, h, eps, T0, Tinf, t }) : null;
    return {
      outputs: {
        tau_s: tau,
        Bi: bi,
        Bi_radius: biRadius,
        alpha_m2_per_s: alpha,
        Fo: fo,
        theta,
        T_K: Tinf + dT0 * theta,
        Q_J: rho * c * volume * dT0 * -Math.expm1(-t / tau),
        theta_parent_mean: series.mean,
        parent_deviation: theta / series.mean - 1,
        T_centre_K: Tinf + dT0 * series.centre,
        T_surface_K: Tinf + dT0 * series.surface,
        h_rad_max_W_per_m2_K: hRad,
        Bi_radiating: biRadiating,
        T_radiating_K: tRadiating,
      },
      checks: [
        check('lumped', 'one temperature for the sphere: internal conduction fast beside surface loss, Bi ≪ 1', 'h (a/3)/k', bi, '<=', MAX_BIOT,
          'the conventional criterion Bi ≤ 0.1 with L_c = V/A (Incropera §5.2); parent_deviation shows the error it leaves at t'),
        check('linear-loss', 'the loss is linear in T − T∞: radiation small beside convection', 'εσ_SB(T_max + T∞)(T_max² + T∞²)/h', hRad / h, '<=', MAX_RADIATION_RATIO,
          'chosen threshold: the neglected radiative conductance is ≤ 10% of h at the hottest point of the run (Incropera eq. 1.9 linearization)'),
      ],
      unchecked: [
        'h is uniform over the sphere and constant in time; for natural convection it falls as the sphere approaches T∞',
        'ρ, c and k are constant over [min(T0, T∞), max(T0, T∞)]',
      ],
    };
  
}

// --- brownian-sphere.ts ---
const BROWNIAN_SPHERE_ID = 'case-brownian-sphere';

/** Standard gravity (CGPM 1901), for the sedimentation speed: the unit table's `standard_gravity` row, read as newtons per kilogram-force. @internal */
export const G_STANDARD = convertValue('1 kgf/kg', 'm/s^2').value;

/** The thresholds `ab-stokes-einstein` states: Re ≤ 0.1 and τ_p/t ≤ 0.01. @internal */
export const MAX_RE = 0.1;
export const MAX_TAU_P_RATIO = 0.01;

/** Ceiling on the memory term's own share of the MSD, |MSD_H/MSD_OU − 1|. @internal */
export const MAX_MEMORY_CORRECTION = 0.01;

/** (v_s t)²/(2Dt) ceiling along gravity when the vertical axis is tracked. @internal */
export const MAX_DRIFT_RATIO = 0.01;

/** Ceiling on |MSD/MSD_wall − 1|: the wall's correction to the tracked MSD is negligible. @internal */
export const MAX_WALL_CORRECTION = 0.01;

/** Ceiling on the last retained Faxén term (a/h)⁵/16 over the series' value. @internal */
export const MAX_FAXEN_LAST_TERM = 0.01;

/** Ceiling on √(2 D_⊥ t)/(h − a): the height, and so D_∥ and D_⊥, barely change over t. @internal */
export const MAX_WALL_EXCURSION = 0.1;

/** t − τ(1 − e^{−t/τ}) in units of τ, i.e. x − (1 − e^{−x}), without its cancellation at small x. @internal */
export function ballisticDeficit(x: number): number {
  return x < 1e-3 ? x * x * (1 / 2 - x / 6 + (x * x) / 24 - (x * x * x) / 120) : x + Math.expm1(-x);
}

/**
 * MSD/(2Dt) per axis for a sphere with fluid inertia: added mass and the Basset
 * memory force, in an unbounded incompressible fluid, velocities in equilibrium.
 *
 * The velocity autocorrelation has the Laplace transform
 * Ĉ(s) = k_BT/(M s + γ(1 + √(s τ_f))), M = m + m_f/2, from the frequency-dependent
 * Stokes drag γ(1 + √(sτ_f)) + s m_f/2 (Stokes 1851; the Basset 1888 term is its
 * √s part; Hinch 1975, J. Fluid Mech. 72, 499; Clercx & Schram 1992, Phys. Rev.
 * A 46, 1942). Its poles in √s both have negative real part, so Ĉ has none on the
 * principal sheet and C(t) is the branch-cut integral
 * C(t) = (k_BT/πγ) ∫₀^∞ e^{−ut} √(τ_f u)/((1 − τ_p u)² + τ_f u) du, τ_p = M/γ.
 * Then ⟨Δx²⟩ = 2∫₀ᵗ (t − s) C(s) ds, and with v = ut,
 * MSD/(2Dt) = (1/π) ∫₀^∞ √(βv) (v − 1 + e^{−v}) / (v² ((1 − αv)² + βv)) dv, α = τ_p/t, β = τ_f/t,
 * integrated here over ln v by MathTS `quad` (adaptive Gauss–Kronrod), split at v = 1, 1/β and around
 * the near-resonance at v = 1/α (width √(β/α) in ln v; β/α ≤ 9 for any densities).
 *
 * Limits: → 1 − 2√(τ_f/(πt)) + (τ_f − τ_p)/t for t ≫ τ_p, τ_f (expanding Ĉ in √s),
 * whose second derivative is the VACF tail k_BT/(12 ρ_f (πνt)^{3/2}); → t/(2τ_p)
 * for t ≪ τ_p, i.e. ⟨Δx²⟩ → (k_BT/M) t². Requires β > 0: without memory the
 * poles reach the principal sheet and this integral no longer holds them.
 * @internal
 */
export function hydrodynamicMsdRatio(alpha: number, beta: number): number {
  const f = (y: number) => {
    const v = Math.exp(y);
    const lag = 1 - alpha * v;
    return (Math.sqrt(beta * v) * (ballisticDeficit(v) / v)) / (lag * lag + beta * v);
  };
  const peak = -Math.log(alpha);
  const w = Math.min(1, Math.sqrt(beta / alpha));
  const points = [0, -Math.log(beta), peak, ...[1, 2, 4].flatMap((k) => [peak - k * w, peak + k * w])].sort((x, y) => x - y);
  // The integrand falls as v^{3/2} below and v^{−3/2} above the breakpoints: e^{−75} at ±50 in ln v.
  const edges = [points[0]! - 50, ...points, points[points.length - 1]! + 50];
  let sum = 0;
  for (let k = 1; k < edges.length; k++) if (edges[k]! > edges[k - 1]!) sum += adaptiveQuadrature(f, edges[k - 1]!, edges[k]!, 1e-12);
  return sum / Math.PI;
}

/**
 * D_∥/D₀ for a sphere translating parallel to a plane wall, centre at h:
 * 1 − (9/16)ξ + (1/8)ξ³ − (45/256)ξ⁴ − (1/16)ξ⁵, ξ = a/h (Faxén 1923, method of
 * reflections, as quoted in Happel & Brenner 1965, Low Reynolds Number
 * Hydrodynamics, ch. 7). A series in a/h, truncated:
 * its error is not bounded here, and near contact it misses the logarithmic
 * lubrication divergence of the drag.
 * @internal
 */
export function faxenParallel(aOverH: number): number {
  const x = aOverH;
  return 1 - (9 / 16) * x + (1 / 8) * x ** 3 - (45 / 256) * x ** 4 - (1 / 16) * x ** 5;
}

/**
 * λ = F/(6πηaU) for a sphere approaching a plane wall head-on, centre at h > a,
 * exact in Stokes flow (Brenner 1961, Chem. Eng. Sci. 16, 242, bispherical coordinates):
 * λ = (4/3) sinh α Σₙ n(n+1)/((2n−1)(2n+3)) · [(2 sinh(2n+1)α + (2n+1) sinh 2α) /
 * (4 sinh²(n+½)α − (2n+1)² sinh²α) − 1], cosh α = h/a. D_⊥ = D₀/λ.
 *
 * The bracket is rewritten over 4 sinh²(n+½)α so that no sinh overflows; its
 * terms fall as e^{−(2n+1)α}, so near contact (α → 0) the sum needs ~40/α terms,
 * and the low-n denominators lose ~α⁻² of relative precision to cancellation.
 * Limits: λ → 1 + (9/8)(a/h) far away (Lorentz 1907); λ → a/δ + (1/5) ln(a/δ) +
 * 0.971 as the gap δ = h − a → 0 (Cox & Brenner 1967, Chem. Eng. Sci. 22, 1753).
 * @throws Error if h/a ≤ 1.
 * @internal
 */
export function brennerPerpendicular(hOverA: number): number {
  if (!(hOverA > 1)) throw new Error(`brennerPerpendicular: need h/a > 1 (got ${hOverA})`);
  const al = Math.acosh(hOverA);
  const s = Math.sinh(al);
  const s2a = Math.sinh(2 * al);
  let sum = 0;
  for (let n = 1; ; n++) {
    const x = (n + 0.5) * al;
    const k = 2 * n + 1;
    const inv4Sinh2 = Math.exp(-2 * x) / Math.expm1(-2 * x) ** 2;
    const cothMinus1 = 2 / Math.expm1(2 * x);
    const bracket = (cothMinus1 + k * s2a * inv4Sinh2 + k * k * s * s * inv4Sinh2) / (1 - k * k * s * s * inv4Sinh2);
    const term = ((n * (n + 1)) / ((2 * n - 1) * (2 * n + 3))) * bracket;
    sum += term;
    if (term < 1e-17 * sum) break;
    if (n > 1e7) throw new Error(`brennerPerpendicular: no convergence at h/a = ${hOverA}`);
  }
  return (4 / 3) * s * sum;
}
export function brownianSphereRegimeAt(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): string {
  const re = outputs.Re;
  const m = outputs.m_kg;
  const gamma = outputs.gamma_kg_per_s;
  const t = inputs.t_s;
  if (re == null || m == null || gamma == null || t == null) return '';
  return `upt regime diffusion --at Re=${re} m=${m} gamma=${gamma} t=${t}`;
}

/** @internal */
export function runCaseBrownianSphere(i: Readonly<Record<string, number>>): CaseResult {
    requirePositive(BROWNIAN_SPHERE_ID, i, ['T_K', 'eta_Pa_s', 'a_m', 'rho_p_kg_per_m3', 'rho_f_kg_per_m3', 't_s']);
    const { T_K: T, eta_Pa_s: eta, a_m: a, rho_p_kg_per_m3: rhoP, rho_f_kg_per_m3: rhoF, t_s: t, d } = i as Record<string, number>;
    if (d !== 1 && d !== 2 && d !== 3) throw new Error(`${BROWNIAN_SPHERE_ID}: d must be 1, 2 or 3 (got ${d})`);
    const kT = K_B_SI * T;
    const gamma = 6 * Math.PI * eta * a;
    const D = kT / gamma;
    const msd = 2 * d * D * t;
    const volume = (4 / 3) * Math.PI * a ** 3;
    const m = volume * rhoP;
    const tauP = (m + 0.5 * volume * rhoF) / gamma;
    const tauF = (rhoF * a * a) / eta;
    const vSed = ((2 / 9) * (rhoP - rhoF) * G_STANDARD * a * a) / eta;
    const re = (rhoF * a * Math.max(Math.sqrt(kT / m), Math.abs(vSed))) / eta;
    const tauBare = m / gamma;
    const msdLangevin = 2 * d * D * tauBare * ballisticDeficit(t / tauBare);
    const msdHydro = msd * hydrodynamicMsdRatio(tauP / t, tauF / t);
    const msdAddedMass = 2 * d * D * tauP * ballisticDeficit(t / tauP);
    const memory = msdHydro / msdAddedMass - 1;
    const checks = [
      check('creeping-flow', 'creeping flow around the sphere, Re ≪ 1', 'ρ_f a max(√(k_BT/m), |v_s|)/η', re, '<=', MAX_RE,
        "the threshold ab-stokes-einstein states: a chosen machine form of Re ≪ 1"),
      check('overdamped', 'overdamped times t ≫ τ_p', '(m + m_f/2)/(γ t)', tauP / t, '<=', MAX_TAU_P_RATIO,
        "ab-stokes-einstein's m/(γt) ≤ 0.01, with the added mass m_f/2 included (stricter)"),
      check('memory', 'past the hydrodynamic memory, t ≫ τ_f = ρ_f a²/η', '|MSD_H/MSD_OU − 1|', Math.abs(memory), '<=', MAX_MEMORY_CORRECTION,
        'chosen threshold: the Basset memory changes the MSD by ≤ 1% at t (computed, not estimated; ≈ 2√(τ_f/(πt)) at t ≫ τ_f)'),
    ];
    const unchecked = ['the particle is a rigid sphere and a is its hydrodynamic radius (a coating or a shell changes it)'];
    let wall: { dPar: number; dPerp: number; msdWall: number } | null = null;
    if (i.h_m !== undefined) {
      const h = i.h_m;
      if (!Number.isFinite(h) || !(h > a)) throw new Error(`${BROWNIAN_SPHERE_ID}: h_m must be a finite distance > a_m, centre to wall (got ${h})`);
      const faxen = faxenParallel(a / h);
      const lambda = brennerPerpendicular(h / a);
      const dPar = D * faxen;
      const dPerp = D / lambda;
      const msdWall = 2 * t * (Math.min(d, 2) * dPar + (d === 3 ? dPerp : 0));
      wall = { dPar, dPerp, msdWall };
      const excursion = Math.sqrt(2 * dPerp * t) + (Math.abs(vSed) * t) / lambda;
      checks.push(
        check('faxen-range', 'the Faxén series in a/h holds for D_∥', '(a/h)⁵/16 ÷ (D_∥/D)', (a / h) ** 5 / 16 / faxen, '<=', MAX_FAXEN_LAST_TERM,
          'chosen threshold: the last retained term is ≤ 1% of the series — a size estimate of the truncation, not a bound; D_⊥ (Brenner) is exact at any h > a'),
        check('wall', 'the wall correction to the tracked MSD is negligible', '|MSD/MSD_w − 1|', Math.abs(msd / msdWall - 1), '<=', MAX_WALL_CORRECTION,
          'chosen threshold: the unbounded-fluid D is then within 1% for the tracked axes; otherwise read MSD_wall_m2'),
        check('wall-static', 'the height barely changes over t', '(√(2 D_⊥ t) + |v_s| t/λ)/(h − a)', excursion / (h - a), '<=', MAX_WALL_EXCURSION,
          'chosen threshold: diffusion plus wall-slowed sedimentation normal to the wall move the sphere by ≤ 10% of the gap, so D_∥, D_⊥ taken at h hold over t'),
      );
      unchecked.push(
        'the wall is plane, rigid, no-slip and horizontal, and the gap h − a is many molecular sizes and roughness heights (no surface forces, no lubrication-scale slip)',
      );
    }
    if (d === 3) {
      checks.push(
        check('drift', 'sedimentation drift negligible along gravity over t', '(v_s t)²/(2 D t)', (vSed * t) ** 2 / (2 * D * t), '<=',
          MAX_DRIFT_RATIO, 'chosen threshold: the vertical MSD then carries ≤ 1% from the deterministic drift'),
      );
    } else {
      unchecked.push(
        `the ${d === 1 ? 'tracked axis is' : 'tracked axes are'} horizontal, so sedimentation (${Number(Math.abs(vSed * t).toPrecision(3))} m over t) moves the sphere out of the plane but not along ${d === 1 ? 'it' : 'them'}`,
      );
    }
    return {
      outputs: {
        gamma_kg_per_s: gamma,
        D_m2_per_s: D,
        MSD_m2: msd,
        rms_displacement_m: Math.sqrt(msd),
        m_kg: m,
        tau_p_s: tauP,
        tau_f_s: tauF,
        v_sed_m_per_s: vSed,
        Re: re,
        MSD_langevin_m2: msdLangevin,
        langevin_deviation: msd / msdLangevin - 1,
        MSD_hydro_m2: msdHydro,
        hydro_correction_m2: msdHydro - msd,
        hydro_deviation: msd / msdHydro - 1,
        memory_correction: memory,
        D_parallel_m2_per_s: wall?.dPar ?? null,
        D_perp_m2_per_s: wall?.dPerp ?? null,
        MSD_wall_m2: wall?.msdWall ?? null,
        wall_deviation: wall === null ? null : msd / wall.msdWall - 1,
      },
      checks,
      unchecked,
    };
  
}

const RUN_BY_ID: Readonly<Record<string, (i: Readonly<Record<string, number>>) => CaseResult>> = {
  'case-skin-depth': runCaseSkinDepth,
  'case-kepler-rv': runCaseKeplerRv,
  'case-damped-resonator': runCaseDampedResonator,
  'case-resistor-noise': runCaseResistorNoise,
  'case-lumped-cooling': runCaseLumpedCooling,
  'case-brownian-sphere': runCaseBrownianSphere,
};

function buildAppliedCase(id: string): AppliedCase {
  const record = appliedCaseRecord(id);
  const legacy = RUN_BY_ID[id]!;
  const run = usesCatalogEngine(record)
    ? (inputs: Readonly<Record<string, number>>) => runAppliedCaseEngine(record, inputs)
    : legacy;
  const regimeAt = id === 'case-brownian-sphere' ? brownianSphereRegimeAt : undefined;
  return assembleAppliedCase(record, { run, regimeAt });
}

/** Case id → case assembled from the catalog and a runner. @internal */
export const APPLIED_CASE_RUNNERS: ReadonlyMap<string, AppliedCase> = new Map(
  appliedCaseCatalog().cases.map((row) => [row.id, buildAppliedCase(row.id)]),
);

/** Names exported numeric methods for catalog validation. @internal */
export const CASE_METHOD_NAMES: ReadonlySet<string> = new Set([
  'maxwellDepthFactor',
  'skinDeltaMaxwellM',
  'windowedLinewidthCatalogHz',
  'windowedLinewidthHz',
  'lumpedRadiatingTemperature',
  'sphereEigenvalues',
  'sphereSeries',
  'ballisticDeficit',
  'hydrodynamicMsdRatio',
  'faxenParallel',
  'brennerPerpendicular',
  'brownianSphereRegimeAt',
  'runCaseResistorNoise',
  'runCaseSkinDepth',
  'runCaseKeplerRv',
  'runCaseDampedResonator',
  'runCaseLumpedCooling',
  'runCaseBrownianSphere',
]);

export const CASE_METHODS: Record<string, (...args: never[]) => unknown> = {
  maxwellDepthFactor,
  skinDeltaMaxwellM,
  windowedLinewidthCatalogHz,
  windowedLinewidthHz,
  lumpedRadiatingTemperature,
  sphereEigenvalues,
  sphereSeries,
  ballisticDeficit,
  hydrodynamicMsdRatio,
  faxenParallel,
  brennerPerpendicular,
  brownianSphereRegimeAt,
  runCaseResistorNoise,
  runCaseSkinDepth,
  runCaseKeplerRv,
  runCaseDampedResonator,
  runCaseLumpedCooling,
  runCaseBrownianSphere,
};

export const SKIN_DEPTH_CASE = APPLIED_CASE_RUNNERS.get('case-skin-depth')!;
export const KEPLER_RV_CASE = APPLIED_CASE_RUNNERS.get('case-kepler-rv')!;
export const DAMPED_RESONATOR_CASE = APPLIED_CASE_RUNNERS.get('case-damped-resonator')!;
export const RESISTOR_NOISE_CASE = APPLIED_CASE_RUNNERS.get('case-resistor-noise')!;
export const LUMPED_COOLING_CASE = APPLIED_CASE_RUNNERS.get('case-lumped-cooling')!;
export const BROWNIAN_SPHERE_CASE = APPLIED_CASE_RUNNERS.get('case-brownian-sphere')!;

for (const msg of catalogSemanticProblems(appliedCaseCatalog(), CASE_METHOD_NAMES)) {
  throw new Error(msg);
}
