/**
 * The nine oscillator models of design note §3.
 *
 * Each model's `regime` carries the π-groups `deriveRegimeGroups` produces
 * from its own parameters and dimensionless inputs. `inequalities` is EMPTY
 * on every model: Phase 0 states its inequalities on the BRIDGES (which carry
 * the regime of validity), and the design note fixes no per-model inequality.
 * An invented one would be a fabricated constraint, so none is written.
 *
 * The Phase 3 fields `boundaryData`, `initialData` and `symmetryGroup`
 * (`../model.ts`) are ABSENT on all nine for the same reason `inequalities`
 * is empty: no source records them for these ODE models, and an absent field
 * says "not recorded" where a present empty one would claim "there are none".
 *
 * `canonicalRefs` are restricted to ids that exist in `CANONICAL_EQUATIONS`;
 * `tests/atlas/models.test.ts` resolves every one of them, and a new one needs
 * a numeric check in `tests/atlas/canonical-links.test.ts`.
 *
 * @module atlas/oscillators/models
 */

import {
  ACCELERATION,
  LENGTH,
  MASS,
  VELOCITY,
} from '../../dimensional/types.js';
import { deriveRegimeGroups } from '../regime.js';
import type { AtlasModel } from '../model.js';
import type { DimensionalVariable } from '../../dimensional/buckingham.js';
import {
  CAPACITANCE,
  CUBIC_STIFFNESS,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from './dimensions.js';

const FAMILY = 'oscillators';

function model(
  spec: Omit<AtlasModel, 'family' | 'regime'> & {
    readonly parameters: readonly DimensionalVariable[];
  },
): AtlasModel {
  return {
    ...spec,
    family: FAMILY,
    regime: {
      family: FAMILY,
      inequalities: [],
      groupDefinitions: deriveRegimeGroups(FAMILY, spec.parameters, spec.dimensionlessInputs),
    },
  };
}

/** The nine Phase 0 oscillator models, in design-note §3 order. @internal */
export const ATLAS_MODELS: readonly AtlasModel[] = [
  model({
    id: 'model-spring',
    stateSpace: '(x, x′) ∈ ℝ²',
    dynamics: 'm x″ + k x = 0',
    observables: ['x', 'x′', 'energy'],
    parameters: [
      { name: 'm', dim: MASS },
      { name: 'k', dim: SPRING_CONSTANT },
    ],
    dimensionlessInputs: [],
    canonicalRefs: [
      'CE-simple-harmonic-frequency',
      'CE-spring-potential-energy',
      'CE-oscillator-energy',
    ],
  }),
  model({
    id: 'model-lc',
    stateSpace: '(q, q′) ∈ ℝ²',
    dynamics: 'L q″ + q/C = 0',
    observables: ['q', 'q′', 'energy'],
    parameters: [
      { name: 'L', dim: INDUCTANCE },
      { name: 'C', dim: CAPACITANCE },
    ],
    dimensionlessInputs: [],
    canonicalRefs: ['CE-lc-resonance'],
  }),
  model({
    id: 'model-damped-spring',
    stateSpace: '(x, x′) ∈ ℝ²',
    dynamics: 'm x″ + b x′ + k x = 0',
    observables: ['x', 'x′'],
    parameters: [
      { name: 'm', dim: MASS },
      { name: 'b', dim: DAMPING },
      { name: 'k', dim: SPRING_CONSTANT },
    ],
    dimensionlessInputs: [],
    canonicalRefs: [],
  }),
  model({
    id: 'model-rlc',
    stateSpace: '(q, q′) ∈ ℝ²',
    dynamics: 'L q″ + R q′ + q/C = 0',
    observables: ['q', 'q′'],
    parameters: [
      { name: 'L', dim: INDUCTANCE },
      { name: 'R', dim: RESISTANCE },
      { name: 'C', dim: CAPACITANCE },
    ],
    dimensionlessInputs: [],
    canonicalRefs: [],
  }),
  model({
    id: 'model-pendulum',
    stateSpace: '(θ, θ′) ∈ S¹ × ℝ',
    dynamics: 'θ″ + (g/ℓ) sin θ = 0',
    observables: ['theta', 'theta′', 'period'],
    parameters: [
      { name: 'g', dim: ACCELERATION },
      { name: 'ell', dim: LENGTH },
    ],
    dimensionlessInputs: ['theta0'],
    canonicalRefs: ['CE-pendulum-period'],
  }),
  model({
    id: 'model-chain',
    stateSpace: '(u_n, u_n′) ∈ ℝ^N × ℝ^N',
    dynamics: 'm u_n″ = κ(u_{n+1} − 2u_n + u_{n−1})',
    observables: ['u_n', 'u_n′', 'dispersion'],
    parameters: [
      { name: 'm', dim: MASS },
      { name: 'kappa', dim: SPRING_CONSTANT },
      { name: 'a', dim: LENGTH },
    ],
    dimensionlessInputs: ['qa'],
    canonicalRefs: [],
  }),
  model({
    id: 'model-wave-1d',
    stateSpace: 'u(x, t), a field on ℝ × ℝ',
    dynamics: 'u_tt = c² u_xx',
    observables: ['u', 'u_t', 'dispersion'],
    parameters: [{ name: 'c', dim: VELOCITY }],
    dimensionlessInputs: [],
    canonicalRefs: ['CE-wave-speed'],
  }),
  model({
    id: 'model-cubic-spring',
    stateSpace: '(x, x′) ∈ ℝ²',
    dynamics: 'm x″ + k x + β x³ = 0',
    observables: ['x', 'x′', 'amplitude-dependent period'],
    parameters: [
      { name: 'm', dim: MASS },
      { name: 'k', dim: SPRING_CONSTANT },
      { name: 'beta', dim: CUBIC_STIFFNESS },
      { name: 'x0', dim: LENGTH },
    ],
    dimensionlessInputs: [],
    canonicalRefs: [],
  }),
  model({
    id: 'model-first-order',
    stateSpace: 'x ∈ ℝ',
    dynamics: 'b x′ + k x = 0',
    observables: ['x'],
    parameters: [
      { name: 'b', dim: DAMPING },
      { name: 'k', dim: SPRING_CONSTANT },
    ],
    dimensionlessInputs: [],
    canonicalRefs: [],
  }),
];

const BY_ID: ReadonlyMap<string, AtlasModel> = new Map(ATLAS_MODELS.map((m) => [m.id, m]));

/** Look up a model by id, throwing on an unknown one. @internal */
export function getAtlasModel(id: string): AtlasModel {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`unknown atlas model id: ${id}`);
  return found;
}
