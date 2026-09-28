/**
 * Applied case: the skin depth of a planar conductor driven at one frequency —
 * how far an AC field (and its current) penetrates, and the surface
 * resistance that sets the conductor's AC loss.
 *
 * In one dimension the Maxwell equations with a local Ohm law in a conductor
 * are the telegraph equation of `model-telegraph`, with relaxation time ε/σ
 * and diffusivity 1/(μσ). Dropping the displacement current is
 * `ab-telegraph-diffusion`, which leaves magnetic diffusion and the classical
 * δ = √(2ρ/(ωμ)) (Jackson, Classical Electrodynamics, 3rd ed., §5.18 and
 * §8.1). This case evaluates δ, checks the three premises the classical
 * result needs — a good conductor, a local conductivity (the mean free path
 * well inside δ; otherwise the anomalous skin effect, Pippard 1947), a DC
 * conductivity (ωτ ≪ 1, Drude) — and the half-space boundary condition, and
 * compares δ with the penetration depth of the full plane-wave solution.
 *
 * @module cases/skin-depth
 */
import { C_SI } from '../core/constants.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-skin-depth';

/** Vacuum permeability μ0, CODATA 2018 (N/A²). @internal */
export const MU_0_SI = 1.25663706212e-6;

/** Vacuum permittivity ε0 = 1/(μ0 c²) (F/m). @internal */
export const EPS_0_SI = 1 / (MU_0_SI * C_SI * C_SI);

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

export const SKIN_DEPTH_CASE: AppliedCase = {
  id: ID,
  title: 'Skin depth of a planar conductor (good-conductor, local and DC-conductivity regimes)',
  parameters: [
    { key: 'rho_ohm_m', quantity: 'resistivity', symbol: 'ρ', unit: 'ohm*m', meaning: 'DC resistivity 1/σ at the conductor\'s temperature (copper at 20 °C ≈ 1.68e-8), > 0' },
    { key: 'f_Hz', quantity: 'frequency', symbol: 'f', unit: 'Hz', meaning: 'drive frequency ω/2π, > 0' },
    { key: 'mu_r', quantity: 'relative permeability', symbol: 'μ_r', unit: '', meaning: 'μ/μ0 of the conductor, taken constant and linear (1 for copper), > 0' },
    { key: 'eps_r', quantity: 'relative permittivity', symbol: 'ε_r', unit: '', meaning: 'ε/ε0 of the bound charges, beside the conduction current (1 for a metal, ≈ 11.7 for silicon), > 0' },
    { key: 'l_mfp_m', quantity: 'carrier mean free path', symbol: 'l', unit: 'm', meaning: 'the conduction carriers\' mean free path at the conductor\'s temperature (copper at 293 K ≈ 39 nm), > 0' },
    { key: 'v_carrier_m_per_s', quantity: 'carrier speed', symbol: 'v', unit: 'm/s', meaning: 'speed setting τ = l/v: the Fermi velocity in a metal (copper 1.57e6), the thermal velocity in a non-degenerate semiconductor, > 0' },
    { key: 'thickness_m', quantity: 'conductor thickness', symbol: 'd', unit: 'm', meaning: 'thickness of the planar conductor, driven from one face, > 0' },
  ],
  governing: {
    parent: [
      '∇×E = −∂B/∂t,  ∇×H = σE + ∂D/∂t,  B = μH,  D = εE   (Maxwell with a local Ohm law J = σE)',
      'one dimension, H = H_y(x, t):  (ε/σ) ∂²H/∂t² + ∂H/∂t = (1/(μσ)) ∂²H/∂x²   (the telegraph equation of model-telegraph)',
      'driven at ω on a half-space: H ∝ e^{i(kx − ωt)},  k² = ω²με + iωμσ,  penetration depth 1/Im k',
    ],
    scalar: [
      '∂H/∂t = (1/(μσ)) ∂²H/∂x²   (displacement current dropped: magnetic diffusion; ab-telegraph-diffusion)',
      'H(x, t) = H0 e^{−x/δ} cos(ωt − x/δ),  δ = √(2ρ/(ωμ)),  μ = μ_r μ0',
      'surface resistance R_s = ρ/δ   (per square: the DC resistance of a sheet of thickness δ)',
    ],
    distinction:
      'The parent is a vector field obeying a wave equation with loss, whose conductivity is a local, frequency-independent ' +
      'constant; the scalar keeps one decay length for one field component in a half-space. Dropped: the displacement ' +
      'current (the wave part, O(ωε/σ)), any non-local or frequency-dependent conductivity, the back face of a finite ' +
      'conductor, and the conductor\'s curvature and edges.',
  },
  observable: 'delta_m',
  outputs: [
    { key: 'omega_per_s', symbol: 'ω', unit: 's^-1', meaning: 'angular frequency 2πf' },
    { key: 'delta_m', symbol: 'δ', unit: 'm', meaning: 'classical skin depth √(2ρ/(ωμ)): the field and current fall by 1/e per δ' },
    { key: 'R_s_ohm', symbol: 'R_s', unit: 'ohm', meaning: 'surface resistance ρ/δ, per square (the real part of the surface impedance)' },
    { key: 'delta_maxwell_m', symbol: 'δ_M', unit: 'm', meaning: '1/Im k with the displacement current kept: the parent plane-wave penetration depth' },
    { key: 'maxwell_deviation', symbol: 'δ/δ_M − 1', unit: '', meaning: 'relative excess of the classical δ over the parent penetration depth' },
    { key: 'displacement_ratio', symbol: 'ωε/σ', unit: '', meaning: 'displacement current over conduction current' },
    { key: 'mfp_ratio', symbol: 'l/δ', unit: '', meaning: 'mean free path over skin depth' },
    { key: 'omega_tau', symbol: 'ωτ', unit: '', meaning: 'ω l/v: the drive period against the carrier relaxation time' },
    { key: 'thickness_ratio', symbol: 'd/δ', unit: '', meaning: 'conductor thickness in skin depths' },
    { key: 'back_field_ratio', symbol: 'e^{−d/δ}', unit: '', meaning: 'field amplitude at the back face over the surface amplitude (half-space profile)' },
  ],
  conditions: [
    'a planar, homogeneous, isotropic conductor filling 0 ≤ x ≤ d, driven at x = 0 by a tangential field H_y(0, t) = H0 cos ωt',
    'periodic steady state: the start-up transient has decayed (it does so over a few periods near the surface)',
    'half-space profile: the field vanishes deep in the conductor (checked through d/δ); the medium outside x = 0 enters only through H0',
  ],
  comparison: {
    reference: 'the parent plane wave in a local ohmic medium, displacement current kept: 1/Im k, k² = ω²με + iωμσ',
    valueKey: 'delta_m',
    referenceKey: 'delta_maxwell_m',
    deviationKey: 'maxwell_deviation',
    method: 'closed form 1/Im k = δ √(√(1 + r²) + r), r = ωε/σ',
  },
  notIncluded: [
    'the temperature dependence of ρ (a conductor heated by its own AC loss has a larger δ)',
    'surface roughness, which raises the AC loss once the rms roughness approaches δ (Hammerstad–Bekkadal)',
    'curvature: for a round wire of radius a the Bessel-function solution replaces the planar profile, with corrections of order δ/a',
    'ferromagnetic hysteresis and saturation: μ_r is taken constant and linear',
    'the anomalous-regime surface impedance itself (Reuter–Sondheimer), which this case refuses rather than evaluates',
  ],
  measurement: [
    'surface resistance: the unloaded Q of a cavity walled with the conductor is Q = G/R_s, G the cavity\'s geometry factor; ' +
      'compare the R_s inferred from Q with R_s_ohm',
    'AC resistance: per square of the driven face it is R_s = ρ/δ against ρ/d at DC, so R_ac/R_dc = d/δ for d ≫ δ',
    'eddy-current probing: the phase lag x/δ of the field at depth x, or the transmission e^{−d/δ} through a foil when d/δ is not large (a thin foil is where this case refuses)',
  ],
  links: [
    { id: 'model-telegraph', role: 'τ u_tt + u_t = D u_xx: the 1-D Maxwell equations in an ohmic conductor, with τ = ε/σ and D = 1/(μσ)' },
    { id: 'ab-telegraph-diffusion', role: 'dropping τ u_tt (here the displacement current) to reach diffusion; its small parameter τDq² is of order ωε/σ at q ~ 1/δ' },
    { id: 'model-fick', role: 'the diffusion equation u_t = D u_xx that the magnetic field obeys once the displacement current is dropped' },
    { id: 'CE-drude-resistivity', role: 'ρ = m/(nq²τ): the DC resistivity whose τ the DC-conductivity check compares with the drive period' },
  ],
  examples: {
    valid: {
      args: ['rho_ohm_m=1.68e-8', 'f_Hz=1MHz', 'mu_r=1', 'eps_r=1', 'l_mfp_m=39nm', 'v_carrier_m_per_s=1.57e6', 'thickness_m=1mm'],
      note: 'a 1 mm copper plate at room temperature driven at 1 MHz: δ ≈ 65 µm',
      fails: [],
    },
    failures: [
      {
        args: ['rho_ohm_m=1.68e-11', 'f_Hz=100MHz', 'mu_r=1', 'eps_r=1', 'l_mfp_m=39um', 'v_carrier_m_per_s=1.57e6', 'thickness_m=1mm'],
        note: 'high-purity copper at 4 K (residual-resistance ratio ≈ 1000) at 100 MHz: l ≈ 39 µm is ~190 δ — the anomalous skin effect',
        fails: ['local'],
      },
      {
        args: ['rho_ohm_m=1.68e-8', 'f_Hz=100kHz', 'mu_r=1', 'eps_r=1', 'l_mfp_m=39nm', 'v_carrier_m_per_s=1.57e6', 'thickness_m=35um'],
        note: 'a 35 µm copper foil at 100 kHz: δ ≈ 206 µm, so the foil is a sixth of a skin depth and the half-space profile does not apply',
        fails: ['thick'],
      },
      {
        args: ['rho_ohm_m=0.1', 'f_Hz=10GHz', 'mu_r=1', 'eps_r=11.7', 'l_mfp_m=28nm', 'v_carrier_m_per_s=2.3e5', 'thickness_m=10mm'],
        note: 'lightly doped silicon (10 Ω·cm) at 10 GHz: ωε/σ ≈ 0.65, a lossy dielectric rather than a good conductor',
        fails: ['good-conductor'],
      },
    ],
  },
  /** Evaluate the classical skin depth and conductor-regime checks for the supplied inputs. */
  run(i) {
    requirePositive(ID, i, ['rho_ohm_m', 'f_Hz', 'mu_r', 'eps_r', 'l_mfp_m', 'v_carrier_m_per_s', 'thickness_m']);
    const { rho_ohm_m: rho, f_Hz: f, mu_r: muR, eps_r: epsR, l_mfp_m: l, v_carrier_m_per_s: v, thickness_m: d } = i as Record<string, number>;
    const omega = 2 * Math.PI * f;
    const mu = muR * MU_0_SI;
    const delta = Math.sqrt((2 * rho) / (omega * mu));
    const r = omega * epsR * EPS_0_SI * rho;
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
  },
};
