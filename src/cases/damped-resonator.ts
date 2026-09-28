/**
 * Applied case: the free ring-down of a damped resonator, read out over a
 * finite record — the envelope and displacement at a chosen time, the
 * linewidth, and what a record of length t_obs can resolve of it.
 *
 * The atlas holds the damped spring (`model-damped-spring`), its exact RLC
 * equivalent (`ab-damped-rlc`) and its overdamped reduction
 * (`ab-damped-massless`). This case evaluates the underdamped solution for a
 * given f0 and Q, refuses it when the resonator is not underdamped, and checks
 * the record length against the linewidth it is meant to resolve. The
 * rectangular-window spectrum of the truncated ring-down is computed in
 * closed form, near resonance, for comparison. Given the temperature and the
 * mode's stiffness, it checks the envelope against the thermal motion.
 *
 * @module cases/damped-resonator
 */
import { K_B_SI } from '../core/constants.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-damped-resonator';

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
    if (k > 1e6) throw new Error(`${ID}: no half-power point found (α = ${alpha}, T = ${T})`);
    lo = hi;
    hi += h;
  }
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (power(mid) > half) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2 / Math.PI;
}

export const DAMPED_RESONATOR_CASE: AppliedCase = {
  id: ID,
  title: 'Damped resonator ring-down (damping, finite observation time)',
  parameters: [
    { key: 'f0_Hz', quantity: 'natural frequency', symbol: 'f0', unit: 'Hz', meaning: 'undamped natural frequency ω0/2π = √(k/m)/2π, > 0' },
    { key: 'Q', quantity: 'quality factor', symbol: 'Q', unit: '', meaning: 'Q = ω0 m/b (for an RLC: √(L/C)/R), > 0' },
    { key: 'x0_m', quantity: 'initial displacement', symbol: 'x0', unit: 'm', meaning: 'displacement at release, from rest' },
    { key: 't_s', quantity: 'read-out time', symbol: 't', unit: 's', meaning: 'time after release at which x and the envelope are read, ≥ 0' },
    { key: 't_obs_s', quantity: 'record length', symbol: 't_obs', unit: 's', meaning: 'length of the recorded ring-down, starting at release, > 0' },
    { key: 'T_K', quantity: 'temperature', symbol: 'T', unit: 'K', meaning: 'temperature of the damping bath, > 0 K; give with k_N_per_m for the thermal floor', temperature: 'absolute', optional: true },
    {
      key: 'k_N_per_m',
      quantity: 'mode stiffness',
      symbol: 'k',
      unit: 'N/m',
      meaning: 'effective stiffness of the mode at the read-out point, > 0 (for an RLC read as charge: 1/C in 1/F, not N/m); give with T_K',
      optional: true,
    },
  ],
  governing: {
    parent: [
      'ρA ∂²w/∂t² + c ∂w/∂t + EI ∂⁴w/∂z⁴ = 0 with the structure\'s boundary conditions   (e.g. a cantilever: a field w(z, t) with many modes)',
      'one mode, w = φ(z) x(t), read at one point:  m x″ + b x′ + k x = 0   (model-damped-spring; for a circuit L q″ + R q′ + q/C = 0, ab-damped-rlc)',
    ],
    scalar: [
      'x(t) = x0 e^{−αt} [cos ω_d t + (α/ω_d) sin ω_d t],  α = ω0/(2Q),  ω_d = ω0 √(1 − 1/(4Q²))   (Q > 1/2)',
      'envelope x0 e^{−αt}/√(1 − 1/(4Q²));  linewidth Δf = f0/Q;  resolution of a record 1/t_obs',
    ],
    distinction:
      'The parent is a field w(z, t) with infinitely many modes and a mode shape; the scalar keeps one mode\'s amplitude ' +
      'x(t) at the read-out point, with all loss lumped into a viscous (velocity-proportional) Q. Dropped: the other modes ' +
      'and their coupling, the mode shape, and any frequency or amplitude dependence of the damping (structural damping ' +
      'gives a different Q(f)).',
  },
  observable: 'envelope_m',
  outputs: [
    { key: 'alpha_per_s', symbol: 'α', unit: 's^-1', meaning: 'amplitude decay rate ω0/(2Q) = b/(2m)' },
    { key: 'tau_s', symbol: 'τ', unit: 's', meaning: 'amplitude ring-down time 1/α = Q/(πf0)' },
    { key: 'linewidth_Hz', symbol: 'Δf', unit: 'Hz', meaning: 'f0/Q: FWHM of the velocity (absorbed-power) response, exact at any Q; the displacement response approaches it for Q ≫ 1' },
    { key: 'f_d_Hz', symbol: 'f_d', unit: 'Hz', meaning: 'damped oscillation frequency f0 √(1 − 1/(4Q²))' },
    { key: 'x_m', symbol: 'x(t)', unit: 'm', meaning: 'displacement at t, released from rest at x0' },
    { key: 'envelope_m', symbol: 'A(t)', unit: 'm', meaning: 'ring-down envelope at t: the amplitude a peak-detecting read-out sees' },
    { key: 'resolution_Hz', symbol: '1/t_obs', unit: 'Hz', meaning: 'frequency resolution of the record' },
    { key: 'linewidth_windowed_Hz', symbol: 'Δf_T', unit: 'Hz', meaning: 'FWHM of the power spectrum of the truncated ring-down (rectangular window, near resonance)' },
    { key: 'windowed_excess', symbol: 'Δf_T/Δf − 1', unit: '', meaning: 'how much the finite record broadens the measured line' },
    { key: 'x_th_rms_m', symbol: '√⟨x²⟩_th', unit: 'm', meaning: 'thermal RMS displacement √(k_BT/k) of the mode (equipartition); null without T_K and k_N_per_m' },
    {
      key: 'envelope_rms_m',
      symbol: '√⟨A²⟩',
      unit: 'm',
      meaning: 'RMS envelope with the thermal motion added: √(A² + 2k_BT/k), the Rice second moment; null without T_K and k_N_per_m',
    },
  ],
  conditions: [
    'released from rest: x(0) = x0, x′(0) = 0; free ring-down, no drive after release',
    'linear restoring force: the amplitude is small enough that f0 does not depend on it (ax-cubic-spring-lc records why a hardening spring is not this model)',
    'the record starts at release and lasts t_obs; its spectrum is that of a rectangular window',
  ],
  comparison: {
    reference: 'the linewidth an infinitely long record would show, f0/Q',
    valueKey: 'linewidth_windowed_Hz',
    referenceKey: 'linewidth_Hz',
    deviationKey: 'windowed_excess',
    method: 'closed-form transform of the truncated ring-down, half-power point by bisection',
  },
  notIncluded: [
    'the detector noise floor; and the thermal drive of the resonator unless T_K and k_N_per_m are given (its equilibrium amplitude √(k_BT/k) is the fluctuation–dissipation partner of its damping; compare case-resistor-noise)',
    'frequency drift of f0 over the record',
    'window shapes other than rectangular, and the negative-frequency image of the line (the Q ≫ 1 approximation)',
    'the other modes of the structure',
  ],
  measurement: [
    'ring-down: fit ln A(t) against t; the slope −α gives Q = πf0/α; compare the measured envelope at t with envelope_m',
    'spectrum: the FWHM of the recorded line is linewidth_windowed_Hz, which approaches linewidth_Hz only when the record resolves it',
    'for an RLC circuit read the capacitor voltage: f0 = 1/(2π√(LC)), Q = √(L/C)/R (ab-damped-rlc)',
  ],
  links: [
    { id: 'model-damped-spring', role: 'm x″ + b x′ + k x = 0, the single-mode equation evaluated here' },
    { id: 'ab-damped-rlc', role: 'the same equation for an RLC circuit, an exact equivalence' },
    { id: 'ab-damped-massless', role: 'the overdamped reduction, for the regime where this case refuses (Q ≤ 1/2)' },
    { id: 'ax-cubic-spring-lc', role: 'the refuted claim that a nonlinear (cubic) spring maps onto the linear circuit' },
  ],
  examples: {
    valid: {
      args: ['f0_Hz=1kHz', 'Q=1000', 'x0_m=1um', 't_s=0.1', 't_obs_s=20', 'T_K=300', 'k_N_per_m=1'],
      note: 'a 1 kHz, Q = 1000 resonator (1 Hz line), 1 N/m at 300 K, read 0.1 s after release, recorded for 20 s',
      fails: [],
    },
    failures: [
      {
        args: ['f0_Hz=1kHz', 'Q=1000', 'x0_m=1um', 't_s=0.1', 't_obs_s=1'],
        note: 'the same resonator recorded for 1 s: the 1 Hz resolution cannot resolve the 1 Hz line',
        fails: ['resolved'],
      },
      {
        args: ['f0_Hz=1kHz', 'Q=0.3', 'x0_m=1um', 't_s=0.1', 't_obs_s=20'],
        note: 'Q = 0.3 is overdamped: there is no ring-down, and the underdamped formulas are refused',
        fails: ['underdamped', 'single-lorentzian'],
      },
      {
        args: ['f0_Hz=1kHz', 'Q=1000', 'x0_m=100pm', 't_s=1', 't_obs_s=20', 'T_K=300', 'k_N_per_m=1'],
        note: 'released from 100 pm and read after 1 s (≈ 3 ring-down times): the envelope, ≈ 4 pm, sits below the 64 pm thermal motion',
        fails: ['above-thermal'],
      },
    ],
  },
  /** Evaluate the underdamped ring-down outputs and checks for the supplied resonator inputs. */
  run(i) {
    requirePositive(ID, i, ['f0_Hz', 'Q', 't_obs_s']);
    const { f0_Hz: f0, Q, x0_m: x0, t_s: t, t_obs_s: tObs } = i as Record<string, number>;
    if (!Number.isFinite(x0)) throw new Error(`${ID}: x0_m must be finite (got ${x0})`);
    if (!Number.isFinite(t) || t < 0) throw new Error(`${ID}: t_s must be a finite number ≥ 0 (got ${t})`);
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
    if ((i.T_K === undefined) !== (i.k_N_per_m === undefined)) throw new Error(`${ID}: give T_K and k_N_per_m together, or neither`);
    let xTh: number | null = null;
    if (i.T_K !== undefined) {
      requirePositive(ID, i, ['T_K', 'k_N_per_m']);
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
  },
};
