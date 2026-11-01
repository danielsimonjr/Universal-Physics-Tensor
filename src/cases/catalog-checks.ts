/**
 * Check records (expr + bound) for the applied-case catalog. Declarative prose lives
 * in `data/applied-cases.json`; thresholds stay here beside the expr the engine reads.
 *
 * @module cases/catalog-checks
 */
import type { AppliedCaseCheckRecord } from './catalog.js';

/** Check records keyed by applied-case id. */
export const CHECKS_BY_CASE_ID: Readonly<Record<string, readonly AppliedCaseCheckRecord[]>> = {
  'case-skin-depth': [
    {
      id: 'good-conductor',
      premise: 'good conductor: conduction current ≫ displacement current',
      quantity: 'ωε/σ',
      expr: '2*pi*f_Hz*eps_r*epsilon_0*rho_ohm_m',
      op: '<=',
      bound: 0.01,
      threshold:
        'chosen threshold for ≪ 1: the parent penetration depth then differs from δ by ≈ ωε/(2σ) ≤ 0.5%',
    },
    {
      id: 'local',
      premise: "local conductivity: the carriers' mean free path well inside the skin depth, l ≪ δ",
      quantity: 'l/δ',
      expr: 'l_mfp_m/delta_m',
      op: '<=',
      bound: 0.1,
      threshold:
        'chosen threshold for ≪ 1; beyond it the current at a point depends on the field over a path l and the anomalous skin effect sets in (Pippard 1947; Reuter & Sondheimer 1948)',
    },
    {
      id: 'dc-conductivity',
      premise: 'DC conductivity: the drive is slow beside the carrier relaxation, ωτ ≪ 1',
      quantity: 'ω l/v',
      expr: '2*pi*f_Hz*l_mfp_m/v_carrier_m_per_s',
      op: '<=',
      bound: 0.1,
      threshold: 'chosen threshold for ≪ 1: the Drude σ(ω) = σ0/(1 − iωτ) is then within 0.5% of σ0 in modulus',
    },
    {
      id: 'thick',
      premise: 'the conductor is a half-space for the field: d ≫ δ',
      quantity: 'd/δ',
      expr: 'thickness_m/delta_m',
      op: '>=',
      bound: 5,
      threshold: 'chosen threshold: the half-space field at the back face is then ≤ e^{−5} ≈ 0.7% of the surface field',
    },
  ],
  'case-kepler-rv': [
    {
      id: 'test-mass',
      premise: 'the companion is light beside the star, m_p ≪ M_*',
      quantity: 'm_p/M_*',
      expr: 'm_p_kg/M_star_kg',
      op: '<=',
      bound: 0.01,
      threshold: 'chosen threshold: the test-mass K then exceeds the two-body K by (1 + q)^{2/3} − 1 ≤ 0.67%',
    },
    {
      id: 'point-mass',
      premise: 'point masses: the star is small beside the closest approach, R_* ≪ r_p',
      quantity: 'R_*/(a(1 − e))',
      expr: 'R_star_m/r_peri_m',
      op: '<=',
      bound: 0.1,
      threshold:
        'chosen threshold: tidal and rotational quadrupole terms scale as (R_*/r)² times a Love number or J2 (each < 1), kept ≤ 1%',
    },
    {
      id: 'weak-field',
      premise: 'Newtonian gravity: G(M_* + m_p)/(c²a) ≪ 1',
      quantity: 'G(M_* + m_p)/(c² a)',
      expr: 'weak_field',
      op: '<=',
      bound: 1e-4,
      threshold: 'chosen threshold: the 1PN corrections to the P–a relation and to the orbital velocity are of this relative order',
    },
    {
      id: 'apsidal',
      premise: 'a fixed ellipse over the record: the GR apsidal advance does not reshape the RV curve',
      quantity: 'e Δω T_obs/P',
      expr: 'apsidal_misfit',
      op: '<=',
      bound: 0.01,
      threshold:
        'chosen threshold: beyond the mean longitude (absorbed by the fitted phase), v_r depends on ω only at O(e), so the misfit is of order e Δω K; its coefficient (order one) is not encoded',
    },
  ],
  'case-damped-resonator': [
    {
      id: 'underdamped',
      premise: 'underdamped: the solution rings (Q > 1/2)',
      quantity: 'Q',
      expr: 'Q',
      op: '>',
      bound: 0.5,
      threshold: 'exact: at Q ≤ 1/2 the solution is a sum of real exponentials, with no ring-down, f_d or envelope',
    },
    {
      id: 'single-lorentzian',
      premise: 'high Q: the line near f0 is one Lorentzian',
      quantity: 'Q',
      expr: 'Q',
      op: '>=',
      bound: 10,
      threshold: 'chosen threshold for Q ≫ 1: the windowed spectrum drops the negative-frequency pole',
    },
    {
      id: 'resolved',
      premise: 'the record resolves the line: 1/t_obs ≪ f0/Q',
      quantity: '(1/t_obs)/(f0/Q)',
      expr: 'resolution_Hz/linewidth_Hz',
      op: '<=',
      bound: 0.1,
      threshold: 'chosen threshold for ≪ 1; see windowed_excess for the broadening it allows',
    },
    {
      id: 'in-record',
      premise: 'the read-out time lies inside the record',
      quantity: 't/t_obs',
      expr: 't_s/t_obs_s',
      op: '<=',
      bound: 1,
      threshold: 'exact: an envelope read after the record ends was not measured',
    },
    {
      id: 'above-thermal',
      premise: 'the ring-down stands above the thermal motion at t',
      quantity: '√(k_BT/k)/A(t)',
      expr: 'x_th_rms_m/envelope_m',
      op: '<=',
      bound: 0.1,
      threshold: 'chosen threshold: the RMS envelope √(A² + 2k_BT/k) then exceeds A by ≤ 1%',
    },
  ],
  'case-resistor-noise': [
    {
      id: 'classical',
      premise: 'flat, classical spectrum: hf ≪ k_BT across the band',
      quantity: 'h f_hi/(k_B T)',
      expr: 'h*f_hi_Hz/(k_B*T_K)',
      op: '<=',
      bound: 0.01,
      threshold: 'chosen threshold for ≪ 1: the Planck factor at f_hi is then within x/2 ≤ 0.5% of 1',
    },
    {
      id: 'flat-band',
      premise: 'the input RC pole lies above the band',
      quantity: '2π f_hi R_eff C_in',
      expr: '2*pi*f_hi_Hz*R_eff_ohm*C_in_F',
      op: '<=',
      bound: 0.1,
      threshold: 'chosen threshold for ≪ 1: the RC low-pass then passes ≥ 99% of the density at f_hi',
    },
    {
      id: 'amplifier',
      premise: "the resistor's noise is resolved above the amplifier's in t_avg",
      quantity: '1/(φ √(B t_avg))',
      expr: '1/(resistor_fraction*sqrt(B_Hz*t_avg_s))',
      op: '<=',
      bound: 0.01,
      threshold:
        "chosen threshold: after subtracting the amplifier's power (known exactly, e.g. from a long shorted-input run) the resistor's power scatters by ≤ 1%",
    },
  ],
  'case-lumped-cooling': [
    {
      id: 'lumped',
      premise: 'one temperature for the sphere: internal conduction fast beside surface loss, Bi ≪ 1',
      quantity: 'h (a/3)/k',
      expr: 'Bi',
      op: '<=',
      bound: 0.1,
      threshold:
        'the conventional criterion Bi ≤ 0.1 with L_c = V/A (Incropera §5.2); parent_deviation shows the error it leaves at t',
    },
    {
      id: 'linear-loss',
      premise: 'the loss is linear in T − T∞: radiation small beside convection',
      quantity: 'εσ_SB(T_max + T∞)(T_max² + T∞²)/h',
      expr: 'h_rad_max_W_per_m2_K/h_W_per_m2_K',
      op: '<=',
      bound: 0.1,
      threshold:
        'chosen threshold: the neglected radiative conductance is ≤ 10% of h at the hottest point of the run (Incropera eq. 1.9 linearization)',
    },
  ],
  'case-brownian-sphere': [
    {
      id: 'creeping-flow',
      premise: 'creeping flow around the sphere, Re ≪ 1',
      quantity: 'ρ_f a max(√(k_BT/m), |v_s|)/η',
      expr: 'Re',
      op: '<=',
      bound: 0.1,
      threshold: 'the threshold ab-stokes-einstein states: a chosen machine form of Re ≪ 1',
    },
    {
      id: 'overdamped',
      premise: 'overdamped times t ≫ τ_p',
      quantity: '(m + m_f/2)/(γ t)',
      expr: 'tau_p_s/t_s',
      op: '<=',
      bound: 0.01,
      threshold: "ab-stokes-einstein's m/(γt) ≤ 0.01, with the added mass m_f/2 included (stricter)",
    },
    {
      id: 'memory',
      premise: 'past the hydrodynamic memory, t ≫ τ_f = ρ_f a²/η',
      quantity: '|MSD_H/MSD_OU − 1|',
      expr: 'abs(memory_correction)',
      op: '<=',
      bound: 0.01,
      threshold:
        'chosen threshold: the Basset memory changes the MSD by ≤ 1% at t (computed, not estimated; ≈ 2√(τ_f/(πt)) at t ≫ τ_f)',
    },
    {
      id: 'faxen-range',
      premise: 'the Faxén series in a/h holds for D_∥',
      quantity: '(a/h)⁵/16 ÷ (D_∥/D)',
      expr: 'pow(a_m/h_m,5)/16/(D_parallel_m2_per_s/D_m2_per_s)',
      op: '<=',
      bound: 0.01,
      threshold:
        'chosen threshold: the last retained term is ≤ 1% of the series — a size estimate of the truncation, not a bound; D_⊥ (Brenner) is exact at any h > a',
    },
    {
      id: 'wall',
      premise: 'the wall correction to the tracked MSD is negligible',
      quantity: '|MSD/MSD_w − 1|',
      expr: 'abs(wall_deviation)',
      op: '<=',
      bound: 0.01,
      threshold:
        'chosen threshold: the unbounded-fluid D is then within 1% for the tracked axes; otherwise read MSD_wall_m2',
    },
    {
      id: 'wall-static',
      premise: 'the height barely changes over t',
      quantity: '(√(2 D_⊥ t) + |v_s| t/λ)/(h − a)',
      expr: '(sqrt(2*D_perp_m2_per_s*t_s)+abs(v_sed_m_per_s)*t_s/(D_m2_per_s/D_perp_m2_per_s))/(h_m-a_m)',
      op: '<=',
      bound: 0.1,
      threshold:
        'chosen threshold: diffusion plus wall-slowed sedimentation normal to the wall move the sphere by ≤ 10% of the gap, so D_∥, D_⊥ taken at h hold over t',
    },
    {
      id: 'drift',
      premise: 'sedimentation drift negligible along gravity over t',
      quantity: '(v_s t)²/(2 D t)',
      expr: 'pow(v_sed_m_per_s*t_s,2)/(2*D_m2_per_s*t_s)',
      op: '<=',
      bound: 0.01,
      threshold: 'chosen threshold: the vertical MSD then carries ≤ 1% from the deterministic drift',
    },
  ],
};
