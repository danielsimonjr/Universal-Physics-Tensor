/**
 * Atlas Phase 4, S4.4 — the three bridges of the diffusion family.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4.
 *
 * | Bridge | Relation | Witnesses |
 * |---|---|---|
 * | random walk → Fick | `coarse-graining` | WD1 (convergence), WD1b (light cone) |
 * | heat ↔ Fick | `exact-equivalence` | WD2 (convergence), WD2s (CAS) |
 * | free Schrödinger → Fick | `analytic-continuation` | W5, WD3 (convergence), WD3b (norm) |
 *
 * Regime groups are DERIVED through `deriveRegimeGroups` and keyed by
 * `PiGroup.formula`; every inequality names one of those keys. The Fourier
 * number `D·t/ℓ²` appears as `kappa · rho^-1 · cp^-1 · ell^-2 · t` on the heat
 * side. **The Péclet number is not applicable to any model here**: it needs an
 * advection velocity, and none of the four models has one. It is stated as a
 * side condition (`no advection`) rather than invented as a group.
 *
 * Tolerances were set AFTER measuring each witness at several resolutions and
 * are stated in the witness records; `tests/atlas/diffusion.test.ts` asserts
 * the measured numbers.
 *
 * @module atlas/diffusion/bridges
 */

import { LENGTH, MASS, ACTION, TIME } from '../../dimensional/types.js';
import { deriveRegimeGroups } from '../regime.js';
import type { AtlasBridge } from '../types.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from './dimensions.js';
import { DIFFUSION_FAMILY_NAME } from './models.js';

const TEST = 'tests/atlas/diffusion.test.ts';
const WITNESS_RESULTS_TEST = 'tests/atlas/witness-results.test.ts';

/** The Δt/t ceiling of the walk → diffusion regime: WD1's coarse resolution, 100 steps. @internal */
export const WALK_MAX_STEP_FRACTION = 0.01;

/** Bridge: lattice random walk → Fick diffusion, by coarse-graining. @internal */
export const BRIDGE_WALK_DIFFUSION: AtlasBridge = {
  id: 'ab-walk-diffusion',
  relation: 'coarse-graining',
  premises: ['model-random-walk'],
  conclusion: 'model-fick',
  transformation: 'P(n, k)/(2Δx) ↦ c(x = nΔx, t = kΔt), with the closure D = Δx²/(2Δt)',
  preserves: [
    'mean-square displacement ⟨x²⟩ = 2Dt, exactly at every step',
    'total probability',
    'the Gaussian long-time profile',
  ],
  doesNotPreserve: [
    'the lattice spacing Δx and the step Δt as independent scales — only Δx²/Δt survives',
    'parity: after an even number of steps only even sites are occupied',
    'the finite propagation speed Δx/Δt: diffusion is positive everywhere at once',
  ],
  sideConditions: [
    'the closure D = Δx²/(2Δt) is held fixed as Δx, Δt → 0',
    'many steps: Δt/t ≪ 1',
    'symmetric, unbiased steps',
  ],
  regime: {
    family: DIFFUSION_FAMILY_NAME,
    inequalities: [
      {
        group: 'dt · t^-1',
        op: '<=',
        bound: WALK_MAX_STEP_FRACTION,
        alias: 'Δt/t ≪ 1 (machine form ≤ 0.01, the coarse resolution WD1 measures)',
      },
    ],
    groupDefinitions: deriveRegimeGroups(
      DIFFUSION_FAMILY_NAME,
      [
        { name: 'dx', dim: LENGTH },
        { name: 'dt', dim: TIME },
        { name: 'D', dim: DIFFUSIVITY },
        { name: 't', dim: TIME },
      ],
      [],
    ),
  },
  counterexamples: [
    {
      description:
        'After 100 steps the walker cannot be more than 100 sites from the origin, so its ' +
        'density at site 101 is exactly 0, while the diffusion kernel there is positive: the ' +
        'coarse-grained model has no light cone.',
      witness: 'WD1b',
    },
  ],
  witnesses: [
    {
      id: 'WD1',
      kind: 'numeric',
      test: TEST,
      tolerance:
        'density at the origin within 1e-4 of (4πDt)^-1/2 at 1000 steps; error shrinks with refinement',
    },
    {
      id: 'WD1b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'walk density exactly 0 beyond the light cone while the kernel is > 0',
    },
  ],
  citations: [
    'Einstein, Ann. Phys. 17 (1905) 549 - Brownian motion; the mean-square displacement grows as 2Dt',
    'Feller, An Introduction to Probability Theory and Its Applications, Vol. I - the symmetric random walk and the de Moivre-Laplace limit',
  ],
  reviewStatus: 'proposed',
};

/** Bridge: heat conduction ↔ Fick diffusion, an exact equivalence. @internal */
export const BRIDGE_HEAT_DIFFUSION: AtlasBridge = {
  id: 'ab-heat-diffusion',
  relation: 'exact-equivalence',
  premises: ['model-heat'],
  conclusion: 'model-fick',
  transformation: 'T ↦ c, κ/(ρ c_p) ↦ D',
  inverse: 'c ↦ T, D ↦ κ/(ρ c_p) (any κ, ρ, c_p with that ratio)',
  preserves: [
    'the solution operator: equal initial data give equal solutions at every t',
    'Fourier-mode decay rates D q²',
    'the Fourier number D t/ℓ²',
  ],
  doesNotPreserve: [
    'physical interpretation: temperature versus concentration',
    'units',
    'the separate values of κ, ρ and c_p — only their ratio survives',
  ],
  sideConditions: [
    'homogeneous isotropic medium: κ, ρ, c_p constant',
    'no sources and no advection (the Péclet number is not applicable to either model)',
  ],
  regime: {
    family: DIFFUSION_FAMILY_NAME,
    inequalities: [],
    groupDefinitions: deriveRegimeGroups(
      DIFFUSION_FAMILY_NAME,
      [
        { name: 'kappa', dim: THERMAL_CONDUCTIVITY },
        { name: 'rho', dim: DENSITY },
        { name: 'cp', dim: SPECIFIC_HEAT },
        { name: 'D', dim: DIFFUSIVITY },
        { name: 'ell', dim: LENGTH },
        { name: 't', dim: TIME },
      ],
      [],
    ),
  },
  counterexamples: [],
  witnesses: [
    {
      id: 'WD2',
      kind: 'numeric',
      test: TEST,
      tolerance:
        'FTCS heat solution at x = 0 within 5e-4 of the Fick solution with D = κ/(ρ c_p) at 160 cells',
    },
    {
      id: 'WD2s',
      kind: 'symbolic',
      test: WITNESS_RESULTS_TEST,
      tolerance: 'CAS: κq²/(ρ c_p) under κ ↦ D ρ c_p minus D q² simplifies to literal 0',
    },
  ],
  citations: [
    'Carslaw & Jaeger, Conduction of Heat in Solids - the heat equation and the thermal diffusivity κ/(ρ c_p)',
    'Crank, The Mathematics of Diffusion - Fick’s second law and its identity with the heat-conduction equation',
  ],
  reviewStatus: 'proposed',
};

/** Bridge: free Schrödinger → Fick diffusion, by Wick rotation. @internal */
export const BRIDGE_SCHRODINGER_DIFFUSION: AtlasBridge = {
  id: 'ab-schrodinger-diffusion',
  relation: 'analytic-continuation',
  premises: ['model-schrodinger-free'],
  conclusion: 'model-fick',
  transformation: 't = −iτ: ψ(x, −iτ) ↦ c(x, τ), with D = ħ/(2m)',
  preserves: [
    'linearity',
    'the Gaussian kernel structure, with a spread growing linearly in time',
  ],
  doesNotPreserve: [
    'unitarity: ∫|ψ|² dx is conserved, ∫φ² dx decays',
    'oscillation and phase: the oscillating propagator becomes a decaying Gaussian',
    'time-reversal symmetry: diffusion is irreversible',
  ],
  sideConditions: [
    'V = 0 (free particle)',
    'the continuation is formal: real Schrödinger time maps to imaginary diffusion time',
  ],
  regime: {
    family: DIFFUSION_FAMILY_NAME,
    inequalities: [],
    groupDefinitions: deriveRegimeGroups(
      DIFFUSION_FAMILY_NAME,
      [
        { name: 'hbar', dim: ACTION },
        { name: 'm', dim: MASS },
        { name: 'D', dim: DIFFUSIVITY },
      ],
      [],
    ),
  },
  counterexamples: [
    {
      description:
        'The squared norm of the Wick-rotated kernel falls from 1.755 at τ = 0 to 0.580 at ' +
        'τ = 4 (ħ = 1, m = 0.5, s = 0.7), where the Schrödinger norm would be conserved.',
      witness: 'WD3b',
    },
  ],
  witnesses: [
    {
      id: 'W5',
      kind: 'numeric',
      test: 'tests/atlas/quantum-support.test.ts',
      tolerance:
        'coefficients ħ/2m, −1, 1/ħ; free-kernel sup-norm residual ratio of ∂τφ = (ħ/2m)∂²φ below 1e-4',
    },
    {
      id: 'WD3',
      kind: 'numeric',
      test: TEST,
      tolerance: 'finite-difference residual of ∂τφ = (ħ/2m)∂²φ below 1e-3 at h = 0.025',
    },
    {
      id: 'WD3b',
      kind: 'numeric',
      test: TEST,
      tolerance: '∫φ² dx matches s²√(2π/σ(τ)) within 1e-9 and decreases in τ',
    },
  ],
  citations: [
    'Feynman & Hibbs, Quantum Mechanics and Path Integrals - the free-particle kernel and its imaginary-time form',
    'Nelson, J. Math. Phys. 5 (1964) 332 - Feynman integrals and the Schrödinger equation (the analytic continuation to the heat kernel)',
  ],
  reviewStatus: 'proposed',
};

/** The diffusion family's bridges, in design-note order. @internal */
export const DIFFUSION_BRIDGES: readonly AtlasBridge[] = [
  BRIDGE_WALK_DIFFUSION,
  BRIDGE_HEAT_DIFFUSION,
  BRIDGE_SCHRODINGER_DIFFUSION,
];
