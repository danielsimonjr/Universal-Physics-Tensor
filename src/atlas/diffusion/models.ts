/**
 * Atlas Phase 4, S4.4 — the four models of the diffusion family.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4.
 *
 * `canonicalRefs` lists an entry only where the canonical registry genuinely
 * holds one. It has `CE-thermal-diffusivity` (α = κ/(ρ c_p)) and nothing for
 * Fick's law, the heat equation as a PDE, the lattice random walk, or the free
 * Schrödinger equation — so those models carry `[]` rather than a nearby entry
 * that states something else.
 *
 * @module atlas/diffusion/models
 */

import type { DimensionalVariable } from '../../dimensional/buckingham.js';
import { ACTION, ENERGY, LENGTH, MASS, TIME } from '../../dimensional/types.js';
import { dim } from '../../dimensional/ast-builders.js';
import type { Dimension } from '../../dimensional/types.js';
import { DAMPING } from '../oscillators/dimensions.js';
import type { AtlasModel } from '../model.js';
import { makeRegime } from '../regime.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from './dimensions.js';

/** The family name every diffusion record carries. @internal */
export const DIFFUSION_FAMILY_NAME = 'diffusion';

interface ModelSpec {
  readonly id: string;
  readonly stateSpace: string;
  readonly dynamics: string;
  readonly observables: readonly string[];
  readonly parameters: readonly DimensionalVariable[];
  readonly canonicalRefs: readonly string[];
  readonly symmetryGroup?: string;
}

function model(spec: ModelSpec): AtlasModel {
  return {
    id: spec.id,
    family: DIFFUSION_FAMILY_NAME,
    stateSpace: spec.stateSpace,
    dynamics: spec.dynamics,
    observables: spec.observables,
    parameters: spec.parameters,
    dimensionlessInputs: [],
    canonicalRefs: spec.canonicalRefs,
    regime: makeRegime(DIFFUSION_FAMILY_NAME, spec.parameters, [], []),
    ...(spec.symmetryGroup === undefined ? {} : { symmetryGroup: spec.symmetryGroup }),
  };
}

/** Pa·s, `L^-1 M T^-1` — `src/canonical/entries/fluids-waves.ts:45` (`VISCOSITY`). @internal */
export const VISCOSITY: Dimension = dim(-1, 1, -1);

/** The diffusion models, in design-note order; the last four were added to close Sprint 4. @internal */
export const DIFFUSION_MODELS: readonly AtlasModel[] = [
  model({
    id: 'model-random-walk',
    stateSpace: 'P(n, k): probability at lattice site n ∈ ℤ after k ∈ ℕ steps',
    dynamics: 'P(n, k+1) = ½ P(n−1, k) + ½ P(n+1, k), sites Δx apart, steps Δt apart',
    observables: ['P(n, k)', 'mean-square displacement ⟨x²⟩'],
    parameters: [
      { name: 'dx', dim: LENGTH },
      { name: 'dt', dim: TIME },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-fick',
    stateSpace: 'c(x, t), x ∈ ℝ',
    dynamics: '∂c/∂t = D ∂²c/∂x² (Fick’s second law)',
    observables: ['c(x, t)', 'total amount ∫c dx', 'variance of c'],
    parameters: [
      { name: 'D', dim: DIFFUSIVITY },
      { name: 'ell', dim: LENGTH },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-heat',
    stateSpace: 'T(x, t), x ∈ ℝ',
    dynamics: 'ρ c_p ∂T/∂t = κ ∂²T/∂x²',
    observables: ['T(x, t)', 'heat content ∫ρ c_p T dx'],
    parameters: [
      { name: 'kappa', dim: THERMAL_CONDUCTIVITY },
      { name: 'rho', dim: DENSITY },
      { name: 'cp', dim: SPECIFIC_HEAT },
      { name: 'ell', dim: LENGTH },
    ],
    canonicalRefs: ['CE-thermal-diffusivity'],
  }),
  model({
    id: 'model-schrodinger-free',
    stateSpace: 'ψ(x, t) ∈ ℂ, x ∈ ℝ',
    dynamics: 'i ħ ∂ψ/∂t = −(ħ²/2m) ∂²ψ/∂x²',
    observables: ['|ψ|²', 'position spread σx'],
    parameters: [
      { name: 'hbar', dim: ACTION },
      { name: 'm', dim: MASS },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-langevin',
    stateSpace: '(x, v)(t), a Brownian particle',
    dynamics: 'm v̇ = −γ v + ξ(t), ⟨ξ(t)ξ(t′)⟩ = 2γ k_B T δ(t − t′), ẋ = v',
    observables: ['⟨x²⟩(t)', '⟨v²⟩ = k_B T/m'],
    parameters: [
      { name: 'm', dim: MASS },
      { name: 'gamma', dim: DAMPING },
      { name: 'kT', dim: ENERGY },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-stokes-drag',
    stateSpace: 'a sphere of radius a moving at speed v through a viscous fluid',
    dynamics: 'F = −6π η a v (creeping flow, Re ≪ 1)',
    observables: ['drag force F', 'friction coefficient γ = 6πηa'],
    parameters: [
      { name: 'eta', dim: VISCOSITY },
      { name: 'a', dim: LENGTH },
    ],
    canonicalRefs: ['CE-stokes-drag'],
  }),
  model({
    id: 'model-telegraph',
    stateSpace: 'u(x, t), x ∈ ℝ',
    dynamics: 'τ u_tt + u_t = D u_xx (Cattaneo: diffusion with a relaxation time)',
    observables: ['u(x, t)', 'mode decay rates', 'signal speed √(D/τ)'],
    parameters: [
      { name: 'tau', dim: TIME },
      { name: 'D', dim: DIFFUSIVITY },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-laplace-1d',
    stateSpace: 'T(x) on [0, ℓ] with fixed end values',
    dynamics: 'T_xx = 0, so T is linear between T(0) and T(ℓ)',
    observables: ['T(x)', 'steady heat flux'],
    parameters: [{ name: 'ell', dim: LENGTH }],
    canonicalRefs: [],
  }),
];

/** Look up a diffusion model by id, throwing on an unknown one. @internal */
export function getDiffusionModel(id: string): AtlasModel {
  const found = DIFFUSION_MODELS.find((m) => m.id === id);
  if (found === undefined) throw new Error(`unknown diffusion model id: ${id}`);
  return found;
}
