/**
 * Applied case: a Brownian sphere tracked in a fluid — the diffusion
 * coefficient and mean-square displacement from the particle's radius and the
 * fluid's viscosity and temperature, with the regime checks that make the
 * Stokes–Einstein scalar applicable.
 *
 * The atlas bridge `ab-stokes-einstein` derives D = k_BT/(6πηa) from the
 * Langevin model and Stokes drag, with Re ≤ 0.1 and m/(γt) ≤ 0.01. This case
 * evaluates it for a named geometry (radius, or diameter through an exact
 * alternate) and fluid, computes Re from the particle's own velocity scales,
 * includes the displaced-fluid added mass in the momentum relaxation time, and
 * evaluates the hydrodynamic memory (the Basset force) that the bridge does not
 * check: the full MSD with fluid inertia, and the correction it makes at t.
 * Given a distance to a plane wall, it applies the wall's drag corrections to D.
 *
 * `CE-stokes-einstein` is encoded only up to its 6π (scalar-up-to-constant);
 * the 6π here comes from Stokes drag, not from that entry.
 *
 * @module cases/brownian-sphere
 */
import { K_B_SI } from '../core/constants.js';
import { adaptiveSimpson } from './quadrature.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-brownian-sphere';

/** Standard gravity (CGPM 1901), for the sedimentation speed. @internal */
export const G_STANDARD = 9.80665;

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
 * integrated here over ln v by adaptive Simpson, split at v = 1, 1/β and around
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
  for (let k = 1; k < edges.length; k++) if (edges[k]! > edges[k - 1]!) sum += adaptiveSimpson(f, edges[k - 1]!, edges[k]!, 1e-12);
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

export const BROWNIAN_SPHERE_CASE: AppliedCase = {
  id: ID,
  title: 'Brownian sphere in a fluid (particle geometry, fluid conditions)',
  parameters: [
    { key: 'T_K', quantity: 'temperature', symbol: 'T', unit: 'K', meaning: 'absolute temperature of the fluid, > 0 K', temperature: 'absolute' },
    { key: 'eta_Pa_s', quantity: 'dynamic viscosity', symbol: 'η', unit: 'Pa*s', meaning: 'viscosity of the fluid at T (water at 20 °C ≈ 1.0e-3 Pa·s), > 0' },
    {
      key: 'a_m',
      quantity: 'particle radius',
      symbol: 'a',
      unit: 'm',
      meaning: 'hydrodynamic radius of the sphere, > 0',
      geometry: 'radius',
      alternates: [{ key: 'diameter_m', meaning: 'the diameter 2a of the sphere', toKey: 0.5 }],
    },
    { key: 'rho_p_kg_per_m3', quantity: 'particle density', symbol: 'ρ_p', unit: 'kg/m^3', meaning: 'mass density of the sphere (silica ≈ 2000), > 0' },
    { key: 'rho_f_kg_per_m3', quantity: 'fluid density', symbol: 'ρ_f', unit: 'kg/m^3', meaning: 'mass density of the fluid (water ≈ 998), > 0' },
    { key: 't_s', quantity: 'lag time', symbol: 't', unit: 's', meaning: 'the time over which the displacement is measured, > 0' },
    { key: 'd', quantity: 'tracked dimensions', symbol: 'd', unit: '', meaning: 'number of Cartesian axes tracked: 1, 2 (a microscope image plane, horizontal) or 3' },
    {
      key: 'h_m',
      quantity: 'distance to a wall',
      symbol: 'h',
      unit: 'm',
      meaning: "distance from the sphere's centre to one plane horizontal wall (a coverslip), > a; leave out when no wall is within many radii",
      geometry: 'separation',
      optional: true,
    },
  ],
  governing: {
    parent: [
      'm dv/dt = −γ v + ξ(t),  ⟨ξ_i(t) ξ_j(t′)⟩ = 2γ k_BT δ_ij δ(t − t′)   (Langevin, a 3-vector equation; model-langevin)',
      'η ∇²u = ∇p,  ∇·u = 0,  u = v on the sphere (no slip), u → 0 far away   (Stokes creeping flow, a field; model-stokes-drag) ⇒ γ = 6πηa',
      'm dv/dt = −γ v − (m_f/2) dv/dt − 6a²√(πηρ_f) ∫_{−∞}^t v′(s)/√(t − s) ds + ξ(t), ξ coloured by the same kernel   ' +
        '(unsteady Stokes flow: added mass and the Basset memory force; Hinch 1975)',
    ],
    scalar: [
      'D = k_BT/(6πηa)   (Stokes–Einstein; ab-stokes-einstein)',
      '⟨|Δr|²⟩ = 2 d D t  over the d tracked axes',
    ],
    distinction:
      'The parents are a vector stochastic equation for the velocity and a field equation for the flow around the sphere; ' +
      'the scalar keeps one isotropic number D and a mean-square displacement linear in t. Dropped: the velocity as a ' +
      'state (the ballistic regime t ≲ τ_p), the flow field (and with it the hydrodynamic memory for t ≲ τ_f), the shape ' +
      'beyond the radius, and every anisotropy.',
  },
  observable: 'MSD_m2',
  outputs: [
    { key: 'gamma_kg_per_s', symbol: 'γ', unit: 'kg/s', meaning: 'Stokes drag coefficient 6πηa' },
    { key: 'D_m2_per_s', symbol: 'D', unit: 'm^2/s', meaning: 'diffusion coefficient k_BT/(6πηa)' },
    { key: 'MSD_m2', symbol: '⟨|Δr|²⟩', unit: 'm^2', meaning: 'mean-square displacement 2dDt over the tracked axes' },
    { key: 'rms_displacement_m', symbol: '√⟨|Δr|²⟩', unit: 'm', meaning: 'root-mean-square displacement over the tracked axes' },
    { key: 'm_kg', symbol: 'm', unit: 'kg', meaning: 'particle mass (4/3)πa³ρ_p' },
    { key: 'tau_p_s', symbol: 'τ_p', unit: 's', meaning: 'momentum relaxation time (m + m_f/2)/γ, with the displaced-fluid added mass m_f/2' },
    { key: 'tau_f_s', symbol: 'τ_f', unit: 's', meaning: 'vorticity diffusion time ρ_f a²/η over one radius (hydrodynamic memory)' },
    { key: 'v_sed_m_per_s', symbol: 'v_s', unit: 'm/s', meaning: 'Stokes sedimentation speed (2/9)(ρ_p − ρ_f) g a²/η; negative means the sphere rises' },
    { key: 'Re', symbol: 'Re', unit: '', meaning: 'ρ_f a max(√(k_BT/m), |v_s|)/η — radius-based; a diameter-based Re is twice this' },
    { key: 'MSD_langevin_m2', symbol: '⟨|Δr|²⟩_L', unit: 'm^2', meaning: 'the Langevin parent: 2dD[t − τ(1 − e^{−t/τ})], τ = m/γ (bare mass)' },
    { key: 'langevin_deviation', symbol: 'MSD/MSD_L − 1', unit: '', meaning: 'relative excess of the diffusive MSD over the Langevin one' },
    {
      key: 'MSD_hydro_m2',
      symbol: '⟨|Δr|²⟩_H',
      unit: 'm^2',
      meaning: 'the Langevin–Basset parent: added mass and hydrodynamic memory, unbounded incompressible fluid (branch-cut integral of its Laplace-domain VACF)',
    },
    { key: 'hydro_correction_m2', symbol: '⟨|Δr|²⟩_H − ⟨|Δr|²⟩', unit: 'm^2', meaning: 'what inertia and memory change in the MSD at t; ≈ −4dD√(τ_f t/π) at t ≫ τ_f' },
    { key: 'hydro_deviation', symbol: 'MSD/MSD_H − 1', unit: '', meaning: 'relative excess of the diffusive MSD over the Langevin–Basset one' },
    {
      key: 'memory_correction',
      symbol: 'MSD_H/MSD_OU − 1',
      unit: '',
      meaning: "the memory force's own share: MSD_H against the Ornstein–Uhlenbeck MSD with the same τ_p (added mass, no memory)",
    },
    { key: 'D_parallel_m2_per_s', symbol: 'D_∥', unit: 'm^2/s', meaning: 'D beside the wall, parallel to it: D·(Faxén series in a/h); null without h_m' },
    { key: 'D_perp_m2_per_s', symbol: 'D_⊥', unit: 'm^2/s', meaning: 'D normal to the wall: D/λ, λ from Brenner\'s exact series; null without h_m' },
    { key: 'MSD_wall_m2', symbol: '⟨|Δr|²⟩_w', unit: 'm^2', meaning: '2t(d_∥ D_∥ + d_⊥ D_⊥): the tracked horizontal axes parallel to the wall, a third one normal to it; null without h_m' },
    { key: 'wall_deviation', symbol: 'MSD/MSD_w − 1', unit: '', meaning: 'relative excess of the unbounded-fluid MSD over the wall-corrected one; null without h_m' },
  ],
  comparison: {
    reference: 'the parent Langevin model (bare mass, white noise; it has neither added mass nor hydrodynamic memory)',
    valueKey: 'MSD_m2',
    referenceKey: 'MSD_langevin_m2',
    deviationKey: 'langevin_deviation',
    method: 'closed form of the Ornstein–Uhlenbeck MSD, velocities starting in equilibrium',
  },
  conditions: [
    'a rigid sphere released at r = 0; its displacement density starts as δ(r) and spreads as a Gaussian of variance 2Dt per axis',
    'no-slip boundary on the sphere; the fluid is at rest far from it (no imposed flow; no wall within many radii, or with h_m one plane no-slip wall)',
    'fluid in thermal equilibrium at T; one isolated particle (dilute: no hydrodynamic interaction with others)',
  ],
  notIncluded: [
    'walls other than one plane: a second wall, a channel or a curved surface; and, with h_m, the spread of heights the sphere samples (D_∥, D_⊥ are taken at h)',
    'localization error and camera motion blur of the tracking, which offset and bias the measured MSD',
    'fluid compressibility: the incompressible memory kernel gives ⟨v²⟩ = k_BT/(m + m_f/2) at t = 0; sound restores k_BT/m over a/c_s (Zwanzig & Bixon 1970)',
    'the memory force near a wall: MSD_hydro is the unbounded-fluid result, and a wall within √(νt) changes the memory tail',
    'the rotational diffusion of the sphere, and any non-spherical shape',
  ],
  measurement: [
    'single-particle tracking: fit ⟨|Δr|²⟩(t) over the d tracked axes, slope 2dD; compare D and MSD_m2 at the chosen lag ' +
      '(with N independent displacements the relative scatter of the MSD is ≈ √(2/(dN)))',
    'subtract the static localization offset 2dσ_loc² (measured on an immobilized particle) before comparing',
    'dynamic light scattering: the field autocorrelation decays at Γ = D q², an independent route to the same D',
  ],
  links: [
    { id: 'ab-stokes-einstein', role: 'the derivation D = k_BT/(6πηa) with its regime Re ≤ 0.1, m/(γt) ≤ 0.01 (`upt atlas ab-stokes-einstein`)' },
    { id: 'ab-langevin-diffusion', role: 'the overdamped coarse-graining D = k_BT/γ and its ballistic counterexample' },
    { id: 'model-stokes-drag', role: 'the creeping-flow drag γ = 6πηa' },
    { id: 'CE-stokes-einstein', role: 'encoded only up to its dimensionless 6π (scalar-up-to-constant); the 6π here is from Stokes drag' },
  ],
  examples: {
    valid: {
      args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2', 'h_m=100um'],
      note: 'a 1 µm-radius silica sphere in water at 20 °C, 100 µm above the coverslip, tracked in the image plane over 1 s',
      fails: [],
    },
    failures: [
      {
        args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1us', 'd=2'],
        note: 'the same sphere over 1 µs: still ballistic (t ≈ 2τ_p) and inside the hydrodynamic memory time',
        fails: ['overdamped', 'memory'],
      },
      {
        args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=50um', 'rho_p_kg_per_m3=7800', 'rho_f_kg_per_m3=998', 't_s=100', 'd=3'],
        note: 'a 50 µm-radius steel sphere tracked in 3-D: it sinks at ≈ 3.7 cm/s, Re ≈ 1.9, and the drift swamps diffusion',
        fails: ['creeping-flow', 'drift'],
      },
      {
        args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=1050', 'rho_f_kg_per_m3=998', 't_s=50ms', 'd=2', 'h_m=3um'],
        note: 'a 1 µm-radius polystyrene sphere 3 µm (centre) above the coverslip: the wall slows D_∥ by ≈ 19%',
        fails: ['wall'],
      },
      {
        args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=1050', 'rho_f_kg_per_m3=998', 't_s=50ms', 'd=2', 'h_m=1.2um'],
        note: 'the same sphere with a 0.2 µm gap: past the range of the Faxén series, and its height changes by more than the gap allows over t',
        fails: ['faxen-range', 'wall', 'wall-static'],
      },
    ],
  },
  /** Evaluate the Stokes-Einstein MSD and regime checks for the supplied Brownian-sphere inputs. */
  regimeAt(inputs, outputs) {
    const re = outputs.Re;
    const m = outputs.m_kg;
    const gamma = outputs.gamma_kg_per_s;
    const t = inputs.t_s;
    if (re == null || m == null || gamma == null || t == null) return '';
    return `upt regime diffusion --at Re=${re} m=${m} gamma=${gamma} t=${t}`;
  },
  run(i) {
    requirePositive(ID, i, ['T_K', 'eta_Pa_s', 'a_m', 'rho_p_kg_per_m3', 'rho_f_kg_per_m3', 't_s']);
    const { T_K: T, eta_Pa_s: eta, a_m: a, rho_p_kg_per_m3: rhoP, rho_f_kg_per_m3: rhoF, t_s: t, d } = i as Record<string, number>;
    if (d !== 1 && d !== 2 && d !== 3) throw new Error(`${ID}: d must be 1, 2 or 3 (got ${d})`);
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
      if (!Number.isFinite(h) || !(h > a)) throw new Error(`${ID}: h_m must be a finite distance > a_m, centre to wall (got ${h})`);
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
  },
};
