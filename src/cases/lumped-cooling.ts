/**
 * Applied case: a solid sphere cooling (or warming) in a fluid — its
 * temperature after a time t by Newton's law of cooling, with the Biot-number
 * check that makes one uniform temperature a fair stand-in for the field
 * inside it.
 *
 * The parent is the heat equation in the sphere (`model-heat` in radial
 * form, diffusivity `CE-thermal-diffusivity`) with a convective boundary. The
 * lumped-capacitance simplification T(t) = T∞ + (T0 − T∞) e^{−t/τ},
 * τ = ρcV/(hA), holds for Bi = h L_c/k ≤ 0.1 with L_c = V/A (Incropera,
 * DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer, 6th ed.,
 * §5.1–5.2). The parent's exact series (Carslaw & Jaeger, Conduction of Heat
 * in Solids, 2nd ed., §9.4; Incropera §5.6.2) is summed here for the volume
 * mean, the centre and the surface. A second check keeps radiation, which is
 * not linear in T − T∞, small beside convection.
 *
 * @module cases/lumped-cooling
 */
import { C_SI, H_SI, K_B_SI } from '../core/constants.js';
import { check, requirePositive, type AppliedCase } from './types.js';

const ID = 'case-lumped-cooling';

/** Stefan–Boltzmann constant 2π⁵k_B⁴/(15h³c²), from the exact SI constants (W m⁻² K⁻⁴). @internal */
export const SIGMA_SB_SI = (2 * Math.PI ** 5 * K_B_SI ** 4) / (15 * H_SI ** 3 * C_SI ** 2);

/** Bi = h L_c/k ceiling, L_c = V/A (Incropera §5.2, eq. 5.10). @internal */
export const MAX_BIOT = 0.1;

/** h_rad,max/h ceiling for a loss linear in T − T∞. @internal */
export const MAX_RADIATION_RATIO = 0.1;

/**
 * The first n roots of 1 − ζ cot ζ = Bi (Bi = h a/k, radius-based): the n-th
 * lies in ((n−1)π, nπ), where the left side runs from −∞ (0 for n = 1) to +∞.
 * @internal
 */
export function sphereEigenvalues(biRadius: number, n: number): number[] {
  const f = (z: number) => 1 - z / Math.tan(z) - biRadius;
  const roots: number[] = [];
  for (let k = 1; k <= n; k++) {
    let lo = (k - 1) * Math.PI;
    let hi = k * Math.PI;
    for (let it = 0; it < 200 && hi - lo > 4 * Number.EPSILON * hi; it++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    roots.push((lo + hi) / 2);
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
  if (terms > 1e5) throw new Error(`${ID}: Fo = ${fo} is too small for the series (needs ${terms} terms)`);
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

export const LUMPED_COOLING_CASE: AppliedCase = {
  id: ID,
  title: 'Lumped-capacitance cooling of a sphere (Biot number, radiation linearity)',
  parameters: [
    {
      key: 'a_m',
      quantity: 'sphere radius',
      symbol: 'a',
      unit: 'm',
      meaning: 'radius of the solid sphere, > 0',
      geometry: 'radius',
      alternates: [{ key: 'diameter_m', meaning: 'the diameter 2a of the sphere', toKey: 0.5 }],
    },
    { key: 'rho_kg_per_m3', quantity: 'density', symbol: 'ρ', unit: 'kg/m^3', meaning: 'mass density of the solid (copper ≈ 8933), > 0' },
    { key: 'c_J_per_kg_K', quantity: 'specific heat', symbol: 'c', unit: 'J/(kg*K)', meaning: 'specific heat capacity of the solid (copper ≈ 385), > 0' },
    { key: 'k_W_per_m_K', quantity: 'thermal conductivity', symbol: 'k', unit: 'W/(m*K)', meaning: 'thermal conductivity of the solid (copper ≈ 401), > 0' },
    { key: 'h_W_per_m2_K', quantity: 'heat-transfer coefficient', symbol: 'h', unit: 'W/(m^2*K)', meaning: 'convective coefficient at the surface, uniform and constant (still air ≈ 5–25, stirred water ≈ 500–10000), > 0' },
    { key: 'emissivity', quantity: 'surface emissivity', symbol: 'ε', unit: '', meaning: 'total hemispherical emissivity of the surface, 0 ≤ ε ≤ 1 (polished copper ≈ 0.03–0.05)' },
    { key: 'T0_K', quantity: 'initial temperature', symbol: 'T0', unit: 'K', meaning: 'uniform temperature of the sphere at t = 0, > 0 K', temperature: 'absolute' },
    { key: 'T_inf_K', quantity: 'fluid temperature', symbol: 'T∞', unit: 'K', meaning: 'temperature of the fluid far from the sphere, and of the radiating surroundings, > 0 K', temperature: 'absolute' },
    { key: 't_s', quantity: 'elapsed time', symbol: 't', unit: 's', meaning: 'time since immersion, ≥ 0' },
  ],
  governing: {
    parent: [
      'ρc ∂T/∂t = k (1/r²) ∂/∂r (r² ∂T/∂r),  0 ≤ r < a   (the heat equation of model-heat, radially symmetric)',
      '−k ∂T/∂r = h (T − T∞) + εσ_SB (T⁴ − T∞⁴) at r = a;  T(r, 0) = T0',
      'without the radiation term: θ/θ0 = Σ C_n e^{−ζ_n² Fo} sin(ζ_n r/a)/(ζ_n r/a),  1 − ζ_n cot ζ_n = h a/k,  C_n = 4(sin ζ_n − ζ_n cos ζ_n)/(2ζ_n − sin 2ζ_n),  Fo = αt/a²',
    ],
    scalar: [
      'ρcV dT/dt = −hA (T − T∞)   (lumped capacitance: one temperature for the whole sphere)',
      'T(t) = T∞ + (T0 − T∞) e^{−t/τ},  τ = ρcV/(hA) = ρca/(3h)   (Newton\'s law of cooling)',
      'Bi = h L_c/k,  L_c = V/A = a/3',
    ],
    distinction:
      'The parent is a temperature field T(r, t) with a boundary condition that is nonlinear once radiation is kept; the ' +
      'scalar replaces the field by one number and the surface loss by a linear conductance hA. Dropped: the internal ' +
      'gradient (of relative size ~Bi), every eigenmode but the slowest (and that one\'s rate shifted by O(Bi)), and the ' +
      'T⁴ dependence of radiation.',
  },
  observable: 'T_K',
  outputs: [
    { key: 'tau_s', symbol: 'τ', unit: 's', meaning: 'lumped time constant ρcV/(hA) = ρca/(3h)' },
    { key: 'Bi', symbol: 'Bi', unit: '', meaning: 'Biot number h L_c/k with L_c = V/A = a/3 (the lumped criterion\'s form)' },
    { key: 'Bi_radius', symbol: 'Bi_a', unit: '', meaning: 'h a/k: the radius-based Biot number of the series solution (3 Bi)' },
    { key: 'alpha_m2_per_s', symbol: 'α', unit: 'm^2/s', meaning: 'thermal diffusivity k/(ρc)' },
    { key: 'Fo', symbol: 'Fo', unit: '', meaning: 'Fourier number αt/a²' },
    { key: 'theta', symbol: 'θ/θ0', unit: '', meaning: 'lumped excess-temperature ratio e^{−t/τ}' },
    { key: 'T_K', symbol: 'T(t)', unit: 'K', meaning: 'the lumped temperature at t: what a thermometer in or on the sphere reads' },
    { key: 'Q_J', symbol: 'Q', unit: 'J', meaning: 'heat released to the fluid by t, ρcV(T0 − T(t)) (negative when the sphere warms)' },
    { key: 'theta_parent_mean', symbol: 'θ̄/θ0', unit: '', meaning: 'volume-mean excess-temperature ratio of the series solution (convection only)' },
    { key: 'parent_deviation', symbol: 'θ/θ̄ − 1', unit: '', meaning: 'relative excess of the lumped ratio over the parent\'s volume mean' },
    { key: 'T_centre_K', symbol: 'T(0, t)', unit: 'K', meaning: 'temperature at the centre from the series solution' },
    { key: 'T_surface_K', symbol: 'T(a, t)', unit: 'K', meaning: 'temperature at the surface from the series solution' },
    { key: 'h_rad_max_W_per_m2_K', symbol: 'h_rad', unit: 'W/(m^2*K)', meaning: 'εσ_SB(T_s + T∞)(T_s² + T∞²) at the hotter of T0 and T∞: the largest linearized radiative coefficient over the run' },
  ],
  conditions: [
    'initial condition: the sphere is at the uniform temperature T0 when it is immersed at t = 0',
    'boundary: a uniform, constant coefficient h over the whole surface into fluid at T∞; the surroundings it radiates to are also at T∞',
    'constant ρ, c and k over the temperature range; no internal heat source; the sphere is solid and homogeneous',
  ],
  comparison: {
    reference: 'the parent: the series solution of the sphere\'s heat equation with the convective boundary, volume mean',
    valueKey: 'theta',
    referenceKey: 'theta_parent_mean',
    deviationKey: 'parent_deviation',
    method: 'eigenfunction series, roots of 1 − ζ cot ζ = Bi_a by bisection, summed until e^{−ζ²Fo} < 1e-18',
  },
  notIncluded: [
    'radiation in the model: the check bounds it, the evaluated T(t) and the series both omit it',
    'the temperature dependence of h (natural convection has h ∝ ΔT^{1/4}) and of ρ, c, k',
    'the thermometer\'s own heat capacity and contact resistance, and conduction along its leads',
    'phase change at the surface (boiling in a quench), which makes h neither uniform nor constant',
  ],
  measurement: [
    'record T(t) with a thermocouple embedded at the centre; plot ln((T − T∞)/(T0 − T∞)) against t — a straight line of slope ' +
      '−1/τ tests the lumped premise directly, and T_centre_K is the parent\'s prediction for that sensor',
    'compare the measured τ with tau_s; the difference between T_centre_K and T_surface_K is the internal gradient the lumped model drops',
    'to use this as a calorimetric measurement of h, invert τ = ρca/(3h), valid only where both checks hold',
  ],
  links: [
    { id: 'model-heat', role: 'ρc_p ∂T/∂t = κ ∂²T/∂x², the heat equation; here in its radial form for a sphere' },
    { id: 'CE-thermal-diffusivity', role: 'α = k/(ρc_p), the diffusivity in the Fourier number' },
    { id: 'CE-heat-capacity', role: 'Q = mcΔT, the heat released as the sphere cools' },
    { id: 'CE-stefan-boltzmann', role: 'j = σT⁴, the radiative loss the linear-loss check bounds' },
  ],
  examples: {
    valid: {
      args: ['a_m=5mm', 'rho_kg_per_m3=8933', 'c_J_per_kg_K=385', 'k_W_per_m_K=401', 'h_W_per_m2_K=20', 'emissivity=0.05', 'T0_K=100degC', 'T_inf_K=20degC', 't_s=300'],
      note: 'a 1 cm polished copper ball cooling from 100 °C in still air at 20 °C, read after 5 minutes',
      fails: [],
    },
    failures: [
      {
        args: ['a_m=5cm', 'rho_kg_per_m3=7854', 'c_J_per_kg_K=434', 'k_W_per_m_K=60.5', 'h_W_per_m2_K=1000', 'emissivity=0', 'T0_K=90degC', 'T_inf_K=20degC', 't_s=600'],
        note: 'a 10 cm steel ball from 90 °C into stirred water: Bi ≈ 0.28, the centre lags the surface and one temperature does not describe it',
        fails: ['lumped'],
      },
      {
        args: ['a_m=5mm', 'rho_kg_per_m3=7854', 'c_J_per_kg_K=434', 'k_W_per_m_K=60.5', 'h_W_per_m2_K=10', 'emissivity=0.8', 'T0_K=1000', 'T_inf_K=300', 't_s=60'],
        note: 'a 1 cm oxidized steel ball at 1000 K in still air: radiation (h_rad ≈ 64 W/m²K) outweighs convection and the loss is not linear',
        fails: ['linear-loss'],
      },
    ],
  },
  run(i) {
    requirePositive(ID, i, ['a_m', 'rho_kg_per_m3', 'c_J_per_kg_K', 'k_W_per_m_K', 'h_W_per_m2_K', 'T0_K', 'T_inf_K']);
    const {
      a_m: a, rho_kg_per_m3: rho, c_J_per_kg_K: c, k_W_per_m_K: k, h_W_per_m2_K: h,
      emissivity: eps, T0_K: T0, T_inf_K: Tinf, t_s: t,
    } = i as Record<string, number>;
    if (!Number.isFinite(eps) || eps < 0 || eps > 1) throw new Error(`${ID}: emissivity must be in [0, 1] (got ${eps})`);
    if (!Number.isFinite(t) || t < 0) throw new Error(`${ID}: t_s must be a finite number ≥ 0 (got ${t})`);
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
  },
};
