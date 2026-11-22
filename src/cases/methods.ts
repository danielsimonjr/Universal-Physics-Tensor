/**
 * Numeric methods and case runners for applied cases (Part B catalog).
 *
 * @module cases/methods
 */
import { findRoot } from '@danielsimonjr/mathts-functions';
import { H_SI, K_B_SI, SIGMA_SB_SI } from '../core/constants.js';
import { convertValue } from '../dimensional/units.js';
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { integrateRK4 } from '../numerical/null-ray-integrator.js';
import { adaptiveQuadrature } from './quadrature.js';
import { appliedCaseCatalog, appliedCaseRecord, assembleAppliedCase, catalogSemanticProblems } from './catalog.js';
import { runAppliedCaseEngine, registerCaseMethods, registeredCaseMethod } from './engine.js';
import { check, requirePositive, signedRelativeDifference, type AppliedCase, type CaseResult, type LumpedRadiating } from './types.js';

/** Lumped body with radiative cooling parameters (re-export). */
export type { LumpedRadiating } from './types.js';

// --- skin-depth.ts ---

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
// --- kepler-rv.ts ---

/** The Julian year, the year BE-52 takes (s): the unit table's `julian_year` row (`yr`). @internal */
export const JULIAN_YEAR_S = convertValue('1 yr', 's').value;
// --- damped-resonator.ts ---
const DAMPED_RESONATOR_ID = 'case-damped-resonator';

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

// --- resistor-noise.ts ---

/** Nyquist's thermal spectral density at f, shaped by the input RC; `x/expm1(x)` → 1 as x → 0. */
function parentDensity(f: number, T: number, rEff: number, c: number): number {
  const x = (H_SI * f) / (K_B_SI * T);
  const planck = x === 0 ? 1 : x / Math.expm1(x);
  const w = 2 * Math.PI * f * rEff * c;
  return (4 * K_B_SI * T * rEff * planck) / (1 + w * w);
}

/** Catalog engine: V_rms of the parent Planck/RC spectrum over the band (adaptive quadrature). @internal */
export function resistorParentVrmsV(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const rEff = outputs.R_eff_ohm;
  if (rEff === undefined || rEff === null || !Number.isFinite(rEff)) {
    throw new Error('resistorParentVrmsV: need a finite R_eff_ohm');
  }
  const T = inputs.T_K!;
  const c = inputs.C_in_F!;
  const fLo = inputs.f_lo_Hz!;
  const fHi = inputs.f_hi_Hz!;
  return Math.sqrt(adaptiveQuadrature((f) => parentDensity(f, T, rEff, c), fLo, fHi));
}

// --- lumped-cooling.ts ---
const LUMPED_COOLING_ID = 'case-lumped-cooling';

/** The Stefan–Boltzmann constant (W m⁻² K⁻⁴) is `core/constants`'s; re-exported so the record's module-export table keeps its row. @internal */
export { SIGMA_SB_SI } from '../core/constants.js';

function lumpedCatalogBiotBound(): number {
  const bound = appliedCaseRecord(LUMPED_COOLING_ID).checks.find((c) => c.id === 'lumped')?.bound;
  if (typeof bound !== 'number') throw new Error(`${LUMPED_COOLING_ID}: lumped check is missing a bound`);
  return bound;
}

/** Bi = h L_c/k ceiling, L_c = V/A: the catalog `lumped` check bound (Incropera §5.2). @internal */
export const MAX_BIOT = lumpedCatalogBiotBound();


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

let sphereSeriesMemoBi = Number.NaN;
let sphereSeriesMemoFo = Number.NaN;
let sphereSeriesMemo: { mean: number; centre: number; surface: number } | undefined;
let sphereSeriesMisses = 0;

/**
 * How many times {@link sphereSeries} computed the series (memo misses since
 * module load). The three sphere outputs of one lumped-cooling run share one
 * series through the per-(Bi, Fo) memo, so one run moves this by exactly 1.
 * @internal
 */
export function sphereSeriesComputations(): number {
  return sphereSeriesMisses;
}

/**
 * θ/θ0 = (T − T∞)/(T0 − T∞) from the series solution of the sphere with a
 * convective surface, at Fourier number Fo = αt/a², for the volume mean, the
 * centre and the surface. Terms are summed until e^{−ζ²Fo} < 1e-18. A
 * last-value memo on (biRadius, fo) serves repeated calls within one run the
 * same object, so the three sphere outputs compute the series once.
 * @throws Error when Fo is so small that the series would need over 1e5 terms.
 * @internal
 */
export function sphereSeries(biRadius: number, fo: number): { mean: number; centre: number; surface: number } {
  if (biRadius === sphereSeriesMemoBi && fo === sphereSeriesMemoFo && sphereSeriesMemo !== undefined) {
    return sphereSeriesMemo;
  }
  sphereSeriesMisses += 1;
  if (fo === 0) {
    sphereSeriesMemo = { mean: 1, centre: 1, surface: 1 };
  } else {
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
    sphereSeriesMemo = { mean, centre, surface };
  }
  sphereSeriesMemoBi = biRadius;
  sphereSeriesMemoFo = fo;
  return sphereSeriesMemo;
}
/**
 * Q = ρcV(T0 − T(t)) = ρcV(T0 − T∞)(1 − e^{−t/τ}), computed with
 * `-Math.expm1(-t / tau)` so small t/τ keeps its accuracy (`expm1` is not in
 * the catalog expression grammar, so this stays a named method).
 * @internal
 */
export function lumpedCoolingQJ(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const tau = outputs.tau_s;
  if (typeof tau !== 'number') throw new Error('lumpedCoolingQJ: need tau_s');
  const a = inputs.a_m!;
  const rho = inputs.rho_kg_per_m3!;
  const c = inputs.c_J_per_kg_K!;
  const dT0 = inputs.T0_K! - inputs.T_inf_K!;
  const volume = (4 / 3) * Math.PI * a ** 3;
  return rho * c * volume * dT0 * -Math.expm1(-inputs.t_s! / tau);
}

function requireFiniteOutput(
  outputs: Readonly<Record<string, number | null>>,
  key: string,
  method: string,
): number {
  const value = outputs[key];
  if (value === null || value === undefined || !Number.isFinite(value)) {
    throw new Error(`${method}: need finite ${key}`);
  }
  return value;
}

function lumpedSphereSeriesFromOutputs(
  outputs: Readonly<Record<string, number | null>>,
  method: string,
): { mean: number; centre: number; surface: number } {
  return sphereSeries(requireFiniteOutput(outputs, 'Bi_radius', method), requireFiniteOutput(outputs, 'Fo', method));
}

/** Volume-mean excess-temperature ratio of the series solution (convection only). @internal */
export function lumpedSphereMeanK(
  _inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  return lumpedSphereSeriesFromOutputs(outputs, 'lumpedSphereMeanK').mean;
}

/** Centre temperature T(0, t) from the series solution. @internal */
export function lumpedSphereCentreK(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const series = lumpedSphereSeriesFromOutputs(outputs, 'lumpedSphereCentreK');
  return inputs.T_inf_K! + (inputs.T0_K! - inputs.T_inf_K!) * series.centre;
}

/** Surface temperature T(a, t) from the series solution. @internal */
export function lumpedSphereSurfaceK(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const series = lumpedSphereSeriesFromOutputs(outputs, 'lumpedSphereSurfaceK');
  return inputs.T_inf_K! + (inputs.T0_K! - inputs.T_inf_K!) * series.surface;
}

/**
 * θ/θ̄ − 1, the signed relative difference of the lumped ratio against the
 * parent's volume mean. A named method rather than a catalog `expr` because
 * at t/τ ≳ 745 both θ and the series mean underflow to 0 and the quotient is
 * 0/0: the deleted JS runner handed the caller `NaN` there, and the expr
 * path's non-finite guard would throw instead (see NOTES.md).
 * @internal
 */
export function lumpedParentDeviation(
  _inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const theta = outputs.theta;
  const mean = outputs.theta_parent_mean;
  if (theta === null || mean === null || theta === undefined || mean === undefined) {
    throw new Error('lumpedParentDeviation: theta and theta_parent_mean must be present');
  }
  return theta / mean - 1;
}

/**
 * The lumped temperature with the T⁴ loss kept (`lumpedRadiatingTemperature`,
 * RK4), or `null` where the linear-loss premise does not reach. Master's
 * runner gated `Bi_radiating <= MAX_BIOT`; `NaN <= bound` is false, so NaN
 * (and non-finite) yields `null`, not a number.
 * @internal
 */
export function lumpedRadiatingTempK(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number | null {
  const biRadiating = outputs.Bi_radiating;
  if (typeof biRadiating !== 'number' || !Number.isFinite(biRadiating) || biRadiating > MAX_BIOT) return null;
  return lumpedRadiatingTemperature({
    a: inputs.a_m!,
    rho: inputs.rho_kg_per_m3!,
    c: inputs.c_J_per_kg_K!,
    h: inputs.h_W_per_m2_K!,
    eps: inputs.emissivity!,
    T0: inputs.T0_K!,
    Tinf: inputs.T_inf_K!,
    t: inputs.t_s!,
  });
}

// --- brownian-sphere.ts ---
/** Standard gravity (CGPM 1901), for the sedimentation speed: the unit table's `standard_gravity` row, read as newtons per kilogram-force. @internal */
export const G_STANDARD = convertValue('1 kgf/kg', 'm/s^2').value;

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
/** Regime tag string for the brownian-sphere case at the current inputs and outputs. */
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

/**
 * The Langevin parent MSD 2dD[t − τ(1 − e^{−t/τ})] with the bare mass τ = m/γ,
 * from the wired D_m2_per_s, m_kg and gamma_kg_per_s (`expm1` inside
 * {@link ballisticDeficit} is not in the catalog grammar).
 * @internal
 */
export function brownianLangevinMsdM2(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const tauBare = outputs.m_kg! / outputs.gamma_kg_per_s!;
  return 2 * inputs.d! * outputs.D_m2_per_s! * tauBare * ballisticDeficit(inputs.t_s! / tauBare);
}

/**
 * The Langevin–Basset parent MSD 2dD·t·MSD/(2Dt)(τ_p/t, τ_f/t), the branch-cut
 * VACF integral (adaptive quadrature, not expressible in the catalog grammar),
 * from the wired MSD_m2, tau_p_s and tau_f_s.
 * @internal
 */
export function brownianHydroMsdM2(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  return outputs.MSD_m2! * hydrodynamicMsdRatio(outputs.tau_p_s! / inputs.t_s!, outputs.tau_f_s! / inputs.t_s!);
}

/**
 * MSD_H/MSD_OU − 1 against the wired MSD_hydro_m2, D_m2_per_s and tau_p_s. A
 * named method, not an expr: when both parents underflow to 0 (ρ_p ≳ 1e300
 * makes τ_p·(t/τ_p)² vanish) master's runner returned `0/0 − 1 = NaN`
 * silently, and the expr path refuses NaN.
 * @internal
 */
export function brownianMemoryCorrection(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const tauP = outputs.tau_p_s!;
  const msdAddedMass = 2 * inputs.d! * outputs.D_m2_per_s! * tauP * ballisticDeficit(inputs.t_s! / tauP);
  return outputs.MSD_hydro_m2! / msdAddedMass - 1;
}

/**
 * |MSD_H/MSD_OU − 1|, the memory check's value, read from the wired
 * memory_correction. A check `method` rather than an expr because master's
 * check value is `NaN` where memory_correction is (a NaN the expr path
 * refuses), and the check must still be reported, not thrown away.
 * @internal
 */
export function brownianMemoryAbs(
  _inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const memory = outputs.memory_correction;
  return typeof memory === 'number' ? Math.abs(memory) : Number.NaN;
}

/**
 * D_⊥ = D/λ beside the wall, λ from Brenner's exact series (a loop with
 * `expm1`; not in the catalog grammar), from the wired D_m2_per_s.
 * @internal
 */
export function brownianWallPerpD(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  return outputs.D_m2_per_s! / brennerPerpendicular(inputs.h_m! / inputs.a_m!);
}

/**
 * MSD_wall = 2t(d_∥ D_∥ + d_⊥ D_⊥) over the tracked axes, from the wired
 * D_parallel_m2_per_s and D_perp_m2_per_s (`min` is not in the catalog
 * grammar; d = 3 tracks the one axis normal to the wall).
 * @internal
 */
export function brownianWallMsdM2(
  inputs: Readonly<Record<string, number>>,
  outputs: Readonly<Record<string, number | null>>,
): number {
  const d = inputs.d!;
  const dPar = outputs.D_parallel_m2_per_s!;
  const dPerp = outputs.D_perp_m2_per_s!;
  return 2 * inputs.t_s! * (Math.min(d, 2) * dPar + (d === 3 ? dPerp : 0));
}

function buildAppliedCase(id: string): AppliedCase {
  const record = appliedCaseRecord(id);
  const regimeAt =
    record.regimeAt === undefined
      ? undefined
      : (registeredCaseMethod(record.regimeAt) as AppliedCase['regimeAt']);
  return assembleAppliedCase(record, { run: (inputs) => runAppliedCaseEngine(record, inputs), regimeAt });
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
  'resistorParentVrmsV',
  'lumpedCoolingQJ',
  'lumpedParentDeviation',
  'lumpedSphereMeanK',
  'lumpedSphereCentreK',
  'lumpedSphereSurfaceK',
  'lumpedRadiatingTempK',
  'brownianLangevinMsdM2',
  'brownianHydroMsdM2',
  'brownianMemoryCorrection',
  'brownianMemoryAbs',
  'brownianWallPerpD',
  'brownianWallMsdM2',
]);

/** Named numeric methods invoked from catalog output `method` fields. */
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
  resistorParentVrmsV,
  lumpedCoolingQJ,
  lumpedParentDeviation,
  lumpedSphereMeanK,
  lumpedSphereCentreK,
  lumpedSphereSurfaceK,
  lumpedRadiatingTempK,
  brownianLangevinMsdM2,
  brownianHydroMsdM2,
  brownianMemoryCorrection,
  brownianMemoryAbs,
  brownianWallPerpD,
  brownianWallMsdM2,
};

registerCaseMethods(CASE_METHODS);

/** Assembled skin-depth applied case (catalog + runner). */
export const SKIN_DEPTH_CASE = APPLIED_CASE_RUNNERS.get('case-skin-depth')!;
/** Assembled Kepler RV applied case (catalog + runner). */
export const KEPLER_RV_CASE = APPLIED_CASE_RUNNERS.get('case-kepler-rv')!;
/** Assembled damped-resonator applied case (catalog + runner). */
export const DAMPED_RESONATOR_CASE = APPLIED_CASE_RUNNERS.get('case-damped-resonator')!;
/** Assembled resistor-noise applied case (catalog + runner). */
export const RESISTOR_NOISE_CASE = APPLIED_CASE_RUNNERS.get('case-resistor-noise')!;
/** Assembled lumped-cooling applied case (catalog + runner). */
export const LUMPED_COOLING_CASE = APPLIED_CASE_RUNNERS.get('case-lumped-cooling')!;
/** Assembled brownian-sphere applied case (catalog + runner). */
export const BROWNIAN_SPHERE_CASE = APPLIED_CASE_RUNNERS.get('case-brownian-sphere')!;

for (const msg of catalogSemanticProblems(appliedCaseCatalog(), CASE_METHOD_NAMES)) {
  throw new Error(msg);
}
