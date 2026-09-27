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
 * adds the hydrodynamic-memory time ρ_f a²/η that the bridge does not check.
 *
 * `CE-stokes-einstein` is encoded only up to its 6π (scalar-up-to-constant);
 * the 6π here comes from Stokes drag, not from that entry.
 *
 * @module cases/brownian-sphere
 */
import { K_B_SI } from '../core/constants.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-brownian-sphere';

/** Standard gravity (CGPM 1901), for the sedimentation speed. @internal */
export const G_STANDARD = 9.80665;

/** The thresholds `ab-stokes-einstein` states: Re ≤ 0.1 and τ_p/t ≤ 0.01. @internal */
export const MAX_RE = 0.1;
export const MAX_TAU_P_RATIO = 0.01;

/** τ_f/t ceiling: keeps √(τ_f/t), the order of the memory correction, ≤ 0.01. @internal */
export const MAX_TAU_F_RATIO = 1e-4;

/** (v_s t)²/(2Dt) ceiling along gravity when the vertical axis is tracked. @internal */
export const MAX_DRIFT_RATIO = 0.01;

/** t − τ(1 − e^{−t/τ}) in units of τ, i.e. x − (1 − e^{−x}), without its cancellation at small x. @internal */
export function ballisticDeficit(x: number): number {
  return x < 1e-3 ? x * x * (1 / 2 - x / 6 + (x * x) / 24 - (x * x * x) / 120) : x + Math.expm1(-x);
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
  ],
  governing: {
    parent: [
      'm dv/dt = −γ v + ξ(t),  ⟨ξ_i(t) ξ_j(t′)⟩ = 2γ k_BT δ_ij δ(t − t′)   (Langevin, a 3-vector equation; model-langevin)',
      'η ∇²u = ∇p,  ∇·u = 0,  u = v on the sphere (no slip), u → 0 far away   (Stokes creeping flow, a field; model-stokes-drag) ⇒ γ = 6πηa',
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
    'no-slip boundary on the sphere; the fluid is at rest far from it (no imposed flow, no walls within many radii)',
    'fluid in thermal equilibrium at T; one isolated particle (dilute: no hydrodynamic interaction with others)',
  ],
  notIncluded: [
    'wall corrections: near a plane wall at distance h the parallel D falls by about 9a/(16h) (Faxén); not applied',
    'localization error and camera motion blur of the tracking, which offset and bias the measured MSD',
    'the O(√(τ_f/t)) hydrodynamic-memory correction itself (only its size is checked)',
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
      args: ['T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2'],
      note: 'a 1 µm-radius silica sphere in water at 20 °C, tracked in the image plane over 1 s',
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
    ],
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
    const checks = [
      check('creeping-flow', 'creeping flow around the sphere, Re ≪ 1', 'ρ_f a max(√(k_BT/m), |v_s|)/η', re, '<=', MAX_RE,
        "the threshold ab-stokes-einstein states: a chosen machine form of Re ≪ 1"),
      check('overdamped', 'overdamped times t ≫ τ_p', '(m + m_f/2)/(γ t)', tauP / t, '<=', MAX_TAU_P_RATIO,
        "ab-stokes-einstein's m/(γt) ≤ 0.01, with the added mass m_f/2 included (stricter)"),
      check('memory', 'past the hydrodynamic memory, t ≫ τ_f = ρ_f a²/η', 'τ_f/t', tauF / t, '<=', MAX_TAU_F_RATIO,
        'chosen threshold: the leading memory correction to the MSD is of order √(τ_f/t) (Hinch 1975), kept ≤ 0.01; its coefficient is not encoded'),
    ];
    const unchecked = ['the particle is a rigid sphere and a is its hydrodynamic radius (a coating or a shell changes it)'];
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
      },
      checks,
      unchecked,
    };
  },
};
