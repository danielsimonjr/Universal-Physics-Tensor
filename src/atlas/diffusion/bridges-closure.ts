/**
 * Atlas Phase 4 — the five diffusion-family bridges added to close Sprint 4's
 * "≥ 20 bridges" exit criterion.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4 (Sprint 4 closure).
 *
 * | Bridge | Relation | Witnesses |
 * |---|---|---|
 * | Langevin → Fick | `coarse-graining` | WD4 (convergence), WD4b (ballistic regime) |
 * | Langevin + Stokes drag → Fick | `derivation`, **hyperedge** | WD5 (canonical + water), WD5s (CAS) |
 * | telegraph → Fick | `approximation` (singular, τ → 0) | WD6 (convergence), WD6b (oscillatory modes) |
 * | telegraph → 1-D wave | `approximation` (τDq² → ∞, t ≪ τ) | WD7 (convergence) |
 * | heat → Laplace | `restriction` (steady state) | WD8 (convergence in time) |
 *
 * Every regime inequality keys a `PiGroup.formula` derived from the dimension
 * matrix. Every `delta` is the EXACT error at its domain edge; every error
 * function used for it is monotone on the domain, so the edge value is the
 * supremum.
 *
 * @module atlas/diffusion/bridges-closure
 */

import { ENERGY, LENGTH, MASS, TIME, VELOCITY } from '../../dimensional/types.js';
import { makeApproximation } from '../oscillators/bridges-limits.js';
import { DAMPING } from '../oscillators/dimensions.js';
import { deriveRegimeGroups } from '../regime.js';
import { physjsFormalRef } from '../physjs-ref.js';
import type { AtlasBridge } from '../types.js';
import { WAVENUMBER } from '../waves/models.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from './dimensions.js';
import { DIFFUSION_FAMILY_NAME, VISCOSITY } from './models.js';
import { telegraphSlowRateRatio, telegraphWaveFrequencyRatio } from './numerics.js';

const TEST = 'tests/atlas/closure.test.ts';
const WITNESS_RESULTS_TEST = 'tests/atlas/witness-results.test.ts';

/** τ_p/t ceiling of the Langevin → Fick regime: WD4's fine resolution, t = 100 τ_p. @internal */
export const LANGEVIN_MAX_TAU_RATIO = 0.01;

/** ε = τDq² ceiling of the telegraph → Fick domain. @internal */
export const TELEGRAPH_FICK_MAX_EPS = 0.05;

/** ε = τDq² floor of the telegraph → wave domain. @internal */
export const TELEGRAPH_WAVE_MIN_EPS = 25;

/** Fourier-number floor of the steady-state restriction. @internal */
export const STEADY_MIN_FOURIER = 1;

const regime = (
  parameters: readonly { name: string; dim: import('../../dimensional/types.js').Dimension }[],
  inequalities: AtlasBridge['regime']['inequalities'],
): AtlasBridge['regime'] => regimeWithInputs(parameters, [], inequalities);

/** A regime whose coordinates also include dimensionless model inputs (such as Re). */
const regimeWithInputs = (
  parameters: readonly { name: string; dim: import('../../dimensional/types.js').Dimension }[],
  dimensionlessInputs: readonly string[],
  inequalities: AtlasBridge['regime']['inequalities'],
): AtlasBridge['regime'] => ({
  family: DIFFUSION_FAMILY_NAME,
  inequalities,
  groupDefinitions: deriveRegimeGroups(DIFFUSION_FAMILY_NAME, parameters, dimensionlessInputs),
});

/** Reynolds-number ceiling of the Stokes–Einstein derivation: a chosen threshold for Re ≪ 1. @internal */
const STOKES_MAX_RE = 0.1;

/** Ceiling of τ_p/t = m/(γt) for the overdamped limit: a chosen threshold for ≪ 1. @internal */
const STOKES_MAX_TAU_RATIO = 0.01;

/** Bridge: Langevin → Fick, the Einstein coarse-graining D = k_BT/γ. @internal */
export const BRIDGE_LANGEVIN_DIFFUSION: AtlasBridge = {
  id: 'ab-langevin-diffusion',
  relation: 'coarse-graining',
  premises: ['model-langevin'],
  conclusion: 'model-fick',
  transformation: 'average over times t ≫ τ_p = m/γ: ⟨x²⟩ → 2Dt with D = k_B T/γ (Einstein)',
  preserves: ['the long-time mean-square displacement', 'the equilibrium velocity variance k_B T/m'],
  doesNotPreserve: [
    'the velocity as a state variable',
    'the ballistic regime t ≲ τ_p, where ⟨x²⟩ ≈ (k_B T/m) t²',
    'the momentum relaxation time τ_p as an independent scale',
  ],
  sideConditions: ['overdamped observation times: τ_p/t ≪ 1', 'white thermal noise, fluctuation–dissipation 2γk_BT'],
  regime: regime(
    [
      { name: 'm', dim: MASS },
      { name: 'gamma', dim: DAMPING },
      { name: 'kT', dim: ENERGY },
      { name: 'D', dim: DIFFUSIVITY },
      { name: 't', dim: TIME },
    ],
    [
      {
        group: 'm · gamma^-1 · t^-1',
        op: '<=',
        bound: LANGEVIN_MAX_TAU_RATIO,
        alias: 'τ_p/t ≪ 1 (machine form ≤ 0.01)',
      },
    ],
  ),
  counterexamples: [
    {
      description:
        'At t = 0.1 τ_p the Langevin mean-square displacement is 0.048 of 2Dt: the particle is ' +
        'still ballistic, ⟨x²⟩ ≈ (k_BT/m)t², and the diffusion model does not describe it.',
      witness: 'WD4b',
    },
  ],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WD4',
      kind: 'numeric',
      test: TEST,
      tolerance: '⟨x²⟩/(2Dt) within 0.02 of 1 at t = 100 τ_p, from the Langevin moment equations by RK4',
    },
    {
      id: 'WD4b',
      kind: 'numeric',
      test: TEST,
      tolerance: '⟨x²⟩/(2Dt) = 0.0484 at t = 0.1 τ_p',
    },
  ],
  citations: [
    'Uhlenbeck & Ornstein, Phys. Rev. 36 (1930) 823 - On the theory of the Brownian motion',
    'Einstein, Ann. Phys. 17 (1905) 549 - the relation D = k_B T/γ',
  ],
  reviewStatus: 'proposed',
};

/**
 * Bridge: Langevin + Stokes drag → Fick with the Stokes–Einstein coefficient.
 *
 * A HYPEREDGE: the Langevin model supplies D = k_BT/γ with γ free; Stokes drag
 * supplies γ = 6πηa for a sphere. Neither alone gives D in terms of the fluid.
 *
 * @internal
 */
export const BRIDGE_STOKES_EINSTEIN: AtlasBridge = {
  id: 'ab-stokes-einstein',
  relation: 'derivation',
  premises: ['model-langevin', 'model-stokes-drag'],
  conclusion: 'model-fick',
  transformation: 'substitute γ = 6πηa into D = k_B T/γ: D = k_B T/(6πηa)',
  preserves: ['the long-time diffusion coefficient of a sphere'],
  doesNotPreserve: ['the particle mass (it drops out)', 'the shape beyond the radius a'],
  sideConditions: [
    'creeping flow around the sphere, Re ≪ 1 (machine form Re ≤ 0.1: a chosen threshold for "≪ 1")',
    'no-slip boundary',
    'overdamped times t ≫ m/γ (machine form m/(γt) ≤ 0.01: a chosen threshold for "≪ 1", as in ab-langevin-diffusion)',
  ],
  // The prose conditions were not machine-checked, so `upt regime` reported this
  // bridge VACUOUS and "valid" at Re = 1000 (persona finding L8). Re is a
  // dimensionless input of the flow; m/(γt) is listed first so its π-group key is
  // the one ab-langevin-diffusion uses, and one --at value checks both bridges.
  regime: regimeWithInputs(
    [
      { name: 'm', dim: MASS },
      { name: 'gamma', dim: DAMPING },
      { name: 't', dim: TIME },
      { name: 'kT', dim: ENERGY },
      { name: 'eta', dim: VISCOSITY },
      { name: 'a', dim: LENGTH },
      { name: 'D', dim: DIFFUSIVITY },
    ],
    ['Re'],
    [
      { group: 'Re', op: '<=', bound: STOKES_MAX_RE, alias: 'Re ≪ 1 (machine form Re ≤ 0.1)' },
      {
        group: 'm · gamma^-1 · t^-1',
        op: '<=',
        bound: STOKES_MAX_TAU_RATIO,
        alias: 'τ_p/t ≪ 1 (machine form m/(γt) ≤ 0.01)',
      },
    ],
  ),
  counterexamples: [],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WD5',
      kind: 'numeric',
      test: TEST,
      tolerance:
        'agrees with CE-stokes-einstein to 1e-12 relative; a sphere of radius a = 0.5 µm (1 µm diameter) in water ' +
        'at T = 293.15 K, η = 1.0016e-3 Pa·s gives D = 4.29e-13 m²/s',
    },
    {
      id: 'WD5s',
      kind: 'symbolic',
      test: WITNESS_RESULTS_TEST,
      tolerance: 'CAS: k_BT/γ under γ ↦ 6πηa minus k_BT/(6πηa) simplifies to literal 0',
    },
  ],
  citations: [
    'Einstein, Ann. Phys. 17 (1905) 549 - Brownian motion of a sphere, D = k_B T/(6πηa)',
    'Stokes, Trans. Camb. Phil. Soc. 9 (1851) 8 - the drag on a sphere in creeping flow',
  ],
  reviewStatus: 'proposed',
};

/**
 * Bridge: telegraph → Fick, the SINGULAR limit τ → 0.
 *
 * Singular because the highest time derivative is lost: the telegraph equation
 * needs two initial conditions and diffusion takes one, so a fast mode
 * `e^{−t/τ}` forms an initial layer. The bound therefore holds only AFTER that
 * layer, and the machine horizon has a LOWER edge as well as an upper one.
 *
 * @internal
 */
export const BRIDGE_TELEGRAPH_DIFFUSION: AtlasBridge = {
  id: 'ab-telegraph-diffusion',
  relation: 'approximation',
  premises: ['model-telegraph'],
  conclusion: 'model-fick',
  transformation: 'drop τ u_tt: the slow mode decays at Dq²(1 + ε + 2ε² + …) → Dq², ε = τDq²',
  preserves: ['the slow decay rate of each Fourier mode to O(ε)', 'the total amount ∫u dx'],
  doesNotPreserve: [
    'the finite signal speed √(D/τ)',
    'the second initial condition u_t(x, 0)',
    'oscillatory modes, which exist for ε > 1/4',
  ],
  sideConditions: ['ε = τDq² ≤ 0.05', 'after the initial layer: t ≫ τ'],
  bound: makeApproximation({
    K: 1,
    delta: telegraphSlowRateRatio(TELEGRAPH_FICK_MAX_EPS, 1, 1) - 1,
    deltaAt: (p) =>
      telegraphSlowRateRatio(p['tau'] ?? Number.NaN, p['D'] ?? Number.NaN, p['q'] ?? Number.NaN) - 1,
    deltaAtBasis: 'closed-form',
    norm: 'relative error of the slow-mode decay rate of a Fourier mode, normalized by the value of the reduced model',
    domain: 'ε = τDq² ≤ 0.05',
    horizon:
      'τ ≪ t ≪ 1/(δ D q²): after the initial layer and before the decay-rate error accumulates; ' +
      'machine form 5τ < t < 0.1/(δ D q²)',
    horizonHolds: (t, p) => {
      const { tau, D, q } = p;
      if (tau === undefined || D === undefined || q === undefined) return false;
      const delta = telegraphSlowRateRatio(tau, D, q) - 1;
      if (!Number.isFinite(delta)) return false;
      if (t <= 5 * tau) return false;
      return delta === 0 || t < 0.1 / (delta * D * q * q);
    },
    parameterRange: 'ε = τDq² ≤ 0.05',
    limitCharacter: 'singular',
    // A slow-mode decay-rate error. The horizon says that error accumulates,
    // so time is not listed.
    uniformity: ['slow-mode decay rate of one Fourier mode, for ε = τDq² ≤ 0.05'],
  }),
  regime: regime(
    [
      { name: 'tau', dim: TIME },
      { name: 'D', dim: DIFFUSIVITY },
      { name: 'q', dim: WAVENUMBER },
    ],
    [{ group: 'tau · D · q^2', op: '<=', bound: TELEGRAPH_FICK_MAX_EPS, alias: 'ε = τDq² ≤ 0.05' }],
  ),
  counterexamples: [
    {
      description:
        'At ε = τDq² = 1 the telegraph mode is OSCILLATORY (complex rate, NaN on the slow branch): ' +
        'no diffusion mode oscillates.',
      witness: 'WD6b',
    },
  ],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WD6',
      kind: 'numeric',
      test: TEST,
      tolerance: 'slow rate / Dq² within 0.03 of 1 at τ = 0.025 (D = q = 1); error halves with τ',
    },
    {
      id: 'WD6b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'no real slow rate at ε = 1',
    },
  ],
  citations: [
    'Cattaneo, Atti Sem. Mat. Fis. Univ. Modena 3 (1948) 83 - heat conduction with a relaxation time',
    'Goldstein, Q. J. Mech. Appl. Math. 4 (1951) 129 - On diffusion by discontinuous movements, and on the telegraph equation',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-telegraph-diffusion'),
};

/**
 * Bridge: telegraph → 1-D wave, for strongly underdamped modes over short times.
 *
 * @internal
 */
export const BRIDGE_TELEGRAPH_WAVE: AtlasBridge = {
  id: 'ab-telegraph-wave',
  relation: 'approximation',
  premises: ['model-telegraph'],
  conclusion: 'model-wave-1d',
  transformation: 'drop u_t: τ u_tt = D u_xx, a wave with c² = D/τ',
  preserves: ['the signal speed √(D/τ)', 'the oscillation frequency to O(1/ε)'],
  doesNotPreserve: ['damping: telegraph modes decay as e^{−t/(2τ)}', 'relaxation to diffusion at long times'],
  sideConditions: ['ε = τDq² ≥ 25', 'short times t ≪ τ (the bound is not uniform in time)'],
  bound: makeApproximation({
    K: 1,
    delta: 1 - telegraphWaveFrequencyRatio(TELEGRAPH_WAVE_MIN_EPS, 1, 1),
    deltaAt: (p) =>
      1 - telegraphWaveFrequencyRatio(p['tau'] ?? Number.NaN, p['D'] ?? Number.NaN, p['q'] ?? Number.NaN),
    deltaAtBasis: 'closed-form',
    norm: 'relative error of the oscillation frequency of a Fourier mode, normalized by the value of the reduced model',
    domain: 'ε = τDq² ≥ 25',
    horizon:
      't ≪ τ: before damping e^{−t/(2τ)} removes 10% of the amplitude; machine form t < 2τ ln(10/9)',
    horizonHolds: (t, p) => {
      const { tau } = p;
      if (tau === undefined || !(tau > 0)) return false;
      return t >= 0 && t < 2 * tau * Math.log(10 / 9);
    },
    parameterRange: 'ε = τDq² ≥ 25',
    limitCharacter: 'regular',
    // An oscillation-frequency error. The record says it is not uniform in time.
    uniformity: ['oscillation frequency of one Fourier mode, for ε = τDq² ≥ 25'],
  }),
  regime: regime(
    [
      { name: 'tau', dim: TIME },
      { name: 'D', dim: DIFFUSIVITY },
      { name: 'q', dim: WAVENUMBER },
      { name: 'c', dim: VELOCITY },
    ],
    [{ group: 'tau · D · q^2', op: '>=', bound: TELEGRAPH_WAVE_MIN_EPS, alias: 'ε = τDq² ≥ 25' }],
  ),
  counterexamples: [],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WD7',
      kind: 'numeric',
      test: TEST,
      tolerance: 'frequency ratio within 3e-3 of 1 at ε = 50; error halves as ε doubles',
    },
  ],
  citations: ['Goldstein, Q. J. Mech. Appl. Math. 4 (1951) 129 - On diffusion by discontinuous movements, and on the telegraph equation'],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-telegraph-wave'),
};

/** Bridge: heat → Laplace, the steady-state restriction. @internal */
export const BRIDGE_HEAT_LAPLACE: AtlasBridge = {
  id: 'ab-heat-laplace',
  relation: 'restriction',
  premises: ['model-heat'],
  conclusion: 'model-laplace-1d',
  transformation: '∂T/∂t = 0: κ T_xx = 0, T linear between the end temperatures',
  preserves: ['the end temperatures', 'the steady heat flux κ(T_b − T_a)/ℓ'],
  doesNotPreserve: ['the transient', 'ρ and c_p, which drop out of the steady state'],
  sideConditions: ['fixed end temperatures', 'Fourier number αt/ℓ² ≥ 1 (transients decayed)'],
  regime: regime(
    [
      { name: 'kappa', dim: THERMAL_CONDUCTIVITY },
      { name: 'rho', dim: DENSITY },
      { name: 'cp', dim: SPECIFIC_HEAT },
      { name: 'ell', dim: LENGTH },
      { name: 't', dim: TIME },
    ],
    [
      {
        group: 'kappa · rho^-1 · cp^-1 · ell^-2 · t',
        op: '>=',
        bound: STEADY_MIN_FOURIER,
        alias: 'Fo = αt/ℓ² ≥ 1',
      },
    ],
  ),
  counterexamples: [],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WD8',
      kind: 'numeric',
      test: TEST,
      tolerance: 'max deviation from the linear profile below 0.025 at αt/ℓ² = 0.4; shrinks with time',
    },
  ],
  citations: ['Carslaw & Jaeger, Conduction of Heat in Solids - steady linear flow in a slab'],
  reviewStatus: 'proposed',
};

/** The diffusion-family closure bridges. @internal */
export const DIFFUSION_CLOSURE_BRIDGES: readonly AtlasBridge[] = [
  BRIDGE_LANGEVIN_DIFFUSION,
  BRIDGE_STOKES_EINSTEIN,
  BRIDGE_TELEGRAPH_DIFFUSION,
  BRIDGE_TELEGRAPH_WAVE,
  BRIDGE_HEAT_LAPLACE,
];
