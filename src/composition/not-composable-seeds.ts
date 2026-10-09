/**
 * Proved atlas seeds that are not composition-graph edges.
 *
 * A kind-`bridge` atlas fact is a route between models. It becomes a
 * chain premise only when a `BridgeEdge` can state it as quantities in
 * and one quantity out. Each entry below is an equation-to-equation
 * analogy: the proved statement is a transformation of a differential
 * equation, or a bound on that transformation, and it has no scalar
 * target. Forcing a side identification (a frequency, a wave speed)
 * into an edge would state a different law from the theorem.
 *
 * Catalog seeds are not listed here. They have a quantity formula and
 * an edge.
 *
 * @module composition/not-composable-seeds
 */

/** One proved seed the composition graph does not carry, and why. @internal */
export interface NotComposableSeed {
  /** Manifest key, the same string `bridgeSeedKeys` returns. */
  readonly id: string;
  /** Why this seed has no quantity-in / quantity-out edge. */
  readonly reason: string;
}

/**
 * The ten atlas seeds. The list is the exemption the edge-validity
 * test checks against `bridgeSeedKeys`. A new atlas seed fails that
 * test until it has an edge or a row here.
 *
 * @internal
 */
export const NOT_COMPOSABLE_SEEDS: readonly NotComposableSeed[] = [
  {
    id: 'ab-kg-schrodinger',
    reason:
      'Klein–Gordon to the free Schrödinger equation is a field redefinition ' +
      '(factor out e^{−iω₀t}) plus a bound on the kinetic-frequency error. ' +
      'PhysJS.KgSchrodinger.covers_bound_delta states that bound at the ' +
      'dispersion relation. It does not map input quantities to one output quantity.',
  },
  {
    id: 'ab-klein-gordon-wave',
    reason:
      'Dropping the Klein–Gordon mass term recovers the 1-D wave equation. ' +
      'PhysJS.KleinGordonWave.covers_bound_delta is the phase-velocity error ' +
      'of that limit. The dispersion relation is the premise of the bound, ' +
      'not a scalar edge.',
  },
  {
    id: 'ab-stiff-string',
    reason:
      'Dropping the bending term EI y_xxxx takes the stiff-string equation ' +
      'to the flexible string. PhysJS.StiffString.covers_bound_delta is the ' +
      'phase-velocity error. ω²(k) is a dispersion relation of a PDE, not a ' +
      'single target quantity.',
  },
  {
    id: 'ab-telegraph-diffusion',
    reason:
      'The singular limit τ → 0 drops the second time derivative and takes ' +
      'the telegraph equation to Fick’s law. PhysJS.TelegraphDiffusion.covers_bound_delta ' +
      'bounds the slow-mode decay rate. Both sides are field equations.',
  },
  {
    id: 'ab-telegraph-wave',
    reason:
      'Dropping the first time derivative takes the telegraph equation to ' +
      'the wave equation. PhysJS.TelegraphWave.covers_bound_delta bounds the ' +
      'oscillation-frequency error. c² = D/τ is how that approximation is ' +
      'stated; the theorem does not certify a speed formula as its statement.',
  },
  {
    id: 'ab-pendulum-linear',
    reason:
      'PhysJS.Pendulum.linearizedEquationOfMotion_iff is the small-angle ' +
      'replacement sin θ → θ between two ordinary differential equations. ' +
      'ω₀² = g/ℓ is a parameter identification inside that analogy, not the ' +
      'proved statement, so it is not an edge.',
  },
  {
    id: 'ab-kg-oscillator',
    reason:
      'PhysJS.KgOscillator.uniform_solves_equationOfMotion restricts the ' +
      'Klein–Gordon field to a spatially uniform mode, which then matches ' +
      'the spring equation. A field restriction is not a scalar formula.',
  },
  {
    id: 'ab-spring-lc',
    reason:
      'PhysJS.SpringLc.time_rescale_equationOfMotion is the lossless ' +
      'dictionary m ↔ L, k ↔ 1/C, x ↔ q and a rescaling of time. The two ' +
      'oscillator equations become the same dimensionless equation. There ' +
      'is no single target quantity.',
  },
  {
    id: 'ab-damped-rlc',
    reason:
      'PhysJS.DampedRlc is the same dictionary plus the damping-ratio side ' +
      'condition. The proved statement is an equivalence of two equations ' +
      'of motion, not a map from inputs to one output.',
  },
  {
    id: 'ab-wave-dalembert',
    reason:
      'Characteristics turn u_tt = c² u_xx into u_ξη = 0. d’Alembert’s ' +
      'formula is u = f(x−ct) + g(x+ct) for arbitrary waveforms f and g. ' +
      'A scalar edge has one numeric target; it cannot carry those functions.',
  },
];
