/**
 * Atlas Phase 4, S4.5 — the models of the wave family.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4.
 *
 * The 1-D wave equation itself is NOT redefined here. It is `model-wave-1d` in
 * the oscillator family, where Phase 0 put it as the conclusion of the chain →
 * wave coarse-graining. The wave family's bridges point at that same record,
 * because a second definition of one model would be a second source of truth.
 * `tests/atlas/families.test.ts` pins that model ids are unique across the
 * whole atlas and that every bridge endpoint resolves in SOME registered family.
 *
 * @module atlas/waves/models
 */

import { dim } from '../../dimensional/ast-builders.js';
import type { DimensionalVariable } from '../../dimensional/buckingham.js';
import type { Dimension } from '../../dimensional/types.js';
import { FORCE, FREQUENCY, VELOCITY } from '../../dimensional/types.js';
import { DENSITY } from '../diffusion/dimensions.js';
import type { AtlasModel } from '../model.js';
import { deriveRegimeGroups } from '../regime.js';

/** The family name every wave record carries. @internal */
export const WAVES_FAMILY_NAME = 'waves';

/** kg/m, `L^-1 M` — `src/canonical/entries/dimensional-classics.ts` (`LIN_DENSITY`). @internal */
export const LINEAR_DENSITY: Dimension = dim(-1, 1);

/** Pa, `L^-1 M T^-2` — `src/canonical/entries/fluids-waves.ts` (`PRESSURE`). @internal */
export const PRESSURE: Dimension = dim(-1, 1, -2);

/** Flexural rigidity E·I, N·m², `L^3 M T^-2`. @internal */
export const FLEXURAL_RIGIDITY: Dimension = dim(3, 1, -2);

/** rad/m, `L^-1`. @internal */
export const WAVENUMBER: Dimension = dim(-1);

interface ModelSpec {
  readonly id: string;
  readonly stateSpace: string;
  readonly dynamics: string;
  readonly observables: readonly string[];
  readonly parameters: readonly DimensionalVariable[];
  readonly dimensionlessInputs?: readonly string[];
  readonly canonicalRefs: readonly string[];
}

function model(spec: ModelSpec): AtlasModel {
  const dimensionless = spec.dimensionlessInputs ?? [];
  return {
    id: spec.id,
    family: WAVES_FAMILY_NAME,
    stateSpace: spec.stateSpace,
    dynamics: spec.dynamics,
    observables: spec.observables,
    parameters: spec.parameters,
    dimensionlessInputs: dimensionless,
    canonicalRefs: spec.canonicalRefs,
    regime: {
      family: WAVES_FAMILY_NAME,
      inequalities: [],
      groupDefinitions: deriveRegimeGroups(WAVES_FAMILY_NAME, spec.parameters, dimensionless),
    },
  };
}

/** The wave-family models, in design-note order. @internal */
export const WAVE_MODELS: readonly AtlasModel[] = [
  model({
    id: 'model-string',
    stateSpace: 'y(x, t), transverse displacement of a string on [0, ℓ]',
    dynamics: 'μ y_tt = F y_xx (small slopes, |y_x| ≪ 1)',
    observables: ['y', 'y_t', 'normal-mode frequencies'],
    parameters: [
      { name: 'F', dim: FORCE },
      { name: 'mu', dim: LINEAR_DENSITY },
    ],
    canonicalRefs: ['CE-string-wave-speed'],
  }),
  model({
    id: 'model-dalembert',
    stateSpace: 'u(x, t) = f(x − ct) + g(x + ct), f and g twice differentiable',
    dynamics: 'two profiles translating rigidly at ±c',
    observables: ['u', 'the two travelling profiles'],
    parameters: [{ name: 'c', dim: VELOCITY }],
    canonicalRefs: ['CE-wave-speed'],
  }),
  model({
    id: 'model-euler-linear',
    stateSpace: '(ρ′, v)(x, t), small perturbations of a fluid at rest',
    dynamics: '∂ρ′/∂t = −ρ₀ ∂v/∂x,  ρ₀ ∂v/∂t = −∂p′/∂x',
    observables: ['ρ′', 'v', 'p′'],
    parameters: [
      { name: 'rho0', dim: DENSITY },
      { name: 'p0', dim: PRESSURE },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-adiabatic-eos',
    stateSpace: 'p(ρ), a barotropic closure',
    dynamics: 'p = p₀ (ρ/ρ₀)^γ',
    observables: ['p', 'dp/dρ'],
    parameters: [
      { name: 'rho0', dim: DENSITY },
      { name: 'p0', dim: PRESSURE },
    ],
    dimensionlessInputs: ['gamma'],
    canonicalRefs: [],
  }),
  model({
    id: 'model-sound',
    stateSpace: 'p′(x, t), the acoustic pressure',
    dynamics: 'p′_tt = c_s² p′_xx with c_s² = γ p₀/ρ₀',
    observables: ['p′', 'sound speed c_s'],
    parameters: [
      { name: 'rho0', dim: DENSITY },
      { name: 'p0', dim: PRESSURE },
    ],
    dimensionlessInputs: ['gamma'],
    canonicalRefs: ['CE-sound-speed'],
  }),
  model({
    id: 'model-klein-gordon',
    stateSpace: 'u(x, t), a field on ℝ × ℝ',
    dynamics: 'u_tt = c² u_xx − ω₀² u (dispersive: ω² = c²k² + ω₀²)',
    observables: ['u', 'dispersion ω(k)', 'phase velocity'],
    parameters: [
      { name: 'c', dim: VELOCITY },
      { name: 'omega0', dim: FREQUENCY },
    ],
    canonicalRefs: [],
  }),
  model({
    id: 'model-stiff-string',
    stateSpace: 'y(x, t), transverse displacement of a string with bending stiffness',
    dynamics: 'μ y_tt = F y_xx − EI y_xxxx (dispersive: ω² = (F/μ)k² + (EI/μ)k⁴)',
    observables: ['y', 'partial frequencies (inharmonicity)'],
    parameters: [
      { name: 'F', dim: FORCE },
      { name: 'mu', dim: LINEAR_DENSITY },
      { name: 'EI', dim: FLEXURAL_RIGIDITY },
    ],
    canonicalRefs: [],
  }),
];
