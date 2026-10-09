/**
 * Atlas Phase 4, S4.5 — the four bridges of the wave family.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4.
 *
 * | Bridge | Relation | Premises | Witnesses |
 * |---|---|---|---|
 * | string → 1-D wave | `restriction` | 1 | WS1 (convergence) |
 * | 1-D wave → d'Alembert | `derivation` | 1 | WS2 (convergence) |
 * | Euler + adiabatic EOS → sound | `derivation` | **2 (hyperedge)** | WS3 (convergence), WS3b (Newton) |
 * | Klein–Gordon → 1-D wave | `approximation` | 1 | WS4 (convergence), WS4b (long waves) |
 *
 * The chain → wave coarse-graining the plan also lists already exists in the
 * oscillator family (`ab-chain-wave`) and is not duplicated.
 *
 * @module atlas/waves/bridges
 */

import { FORCE, FREQUENCY, VELOCITY } from '../../dimensional/types.js';
import { DENSITY } from '../diffusion/dimensions.js';
import { makeApproximation } from '../oscillators/bridges-limits.js';
import { deriveRegimeGroups } from '../regime.js';
import { physjsFormalRef } from '../physjs-ref.js';
import type { AtlasBridge } from '../types.js';
import { LINEAR_DENSITY, PRESSURE, WAVENUMBER, WAVES_FAMILY_NAME } from './models.js';
import { kleinGordonPhaseError } from './numerics.js';

const TEST = 'tests/atlas/waves.test.ts';

/** The perturbation ceiling of the sound derivation: `p₁/p₀ ≤ 1/100`. @internal */
export const SOUND_MAX_PERTURBATION = 0.01;

/** The dispersion-free domain edge: `ω₀/(c k) ≤ 0.1`. @internal */
export const KG_MAX_DISPERSION_RATIO = 0.1;

/** Bridge: string → 1-D wave equation, a restriction with c² = F/μ. @internal */
export const BRIDGE_STRING_WAVE: AtlasBridge = {
  id: 'ab-string-wave',
  relation: 'restriction',
  premises: ['model-string'],
  conclusion: 'model-wave-1d',
  transformation: 'y ↦ u, with c² = F/μ',
  preserves: ['the solution operator for small slopes', 'normal-mode frequencies nπc/ℓ'],
  doesNotPreserve: [
    'the separate values of F and μ — only F/μ survives',
    'the transverse geometry: the wave equation does not know u is a displacement',
  ],
  sideConditions: ['small slopes |y_x| ≪ 1', 'uniform tension and density', 'perfectly flexible'],
  regime: {
    family: WAVES_FAMILY_NAME,
    inequalities: [],
    groupDefinitions: deriveRegimeGroups(
      WAVES_FAMILY_NAME,
      [
        { name: 'F', dim: FORCE },
        { name: 'mu', dim: LINEAR_DENSITY },
        { name: 'c', dim: VELOCITY },
      ],
      [],
    ),
  },
  counterexamples: [],
  witnesses: [
    {
      id: 'WS1',
      kind: 'numeric',
      test: TEST,
      tolerance:
        'leapfrog string solution at the midpoint within 2e-4 of sin(πx)cos(πct), c = √(F/μ), at 80 cells',
    },
  ],
  citations: [
    'Morse & Ingard, Theoretical Acoustics - the flexible string and its wave equation with c² = T/ρ',
  ],
  reviewStatus: 'proposed',
};

/** Bridge: 1-D wave equation → d'Alembert's general solution. @internal */
export const BRIDGE_WAVE_DALEMBERT: AtlasBridge = {
  id: 'ab-wave-dalembert',
  relation: 'derivation',
  premises: ['model-wave-1d'],
  conclusion: 'model-dalembert',
  transformation: 'characteristics ξ = x − ct, η = x + ct turn u_tt = c²u_xx into u_ξη = 0',
  preserves: ['every C² solution on the whole line', 'the speed c'],
  doesNotPreserve: [
    'boundary conditions: on a bounded domain f and g are fixed only up to reflections',
  ],
  sideConditions: ['infinite line, or boundaries handled by the method of images', 'u ∈ C²'],
  regime: {
    family: WAVES_FAMILY_NAME,
    inequalities: [],
    groupDefinitions: deriveRegimeGroups(WAVES_FAMILY_NAME, [{ name: 'c', dim: VELOCITY }], []),
  },
  counterexamples: [],
  witnesses: [
    {
      id: 'WS2',
      kind: 'numeric',
      test: TEST,
      tolerance: 'finite-difference residual |u_tt − c²u_xx| below 2e-3 at h = 0.0125',
    },
  ],
  citations: [
    "d'Alembert, Recherches sur la courbe que forme une corde tendue mise en vibration (1747)",
    'Strauss, Partial Differential Equations: An Introduction - §2.1, the wave equation on the line',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-wave-dalembert'),
};

/**
 * Bridge: linearized Euler + adiabatic EOS → the acoustic wave equation.
 *
 * A HYPEREDGE: neither premise alone yields sound. The Euler pair has no
 * closure from ρ′ to p′, and the equation of state has no dynamics.
 *
 * @internal
 */
export const BRIDGE_SOUND_SPEED: AtlasBridge = {
  id: 'ab-sound-speed',
  relation: 'derivation',
  premises: ['model-euler-linear', 'model-adiabatic-eos'],
  conclusion: 'model-sound',
  transformation:
    'close the Euler pair with p′ = (dp/dρ)|ρ₀ ρ′ = (γp₀/ρ₀) ρ′, then eliminate v: p′_tt = (γp₀/ρ₀) p′_xx',
  preserves: ['linearity', 'the sound speed c_s² = γp₀/ρ₀'],
  doesNotPreserve: [
    'nonlinear steepening and shocks at finite amplitude',
    'viscous and thermal attenuation',
  ],
  sideConditions: [
    'small perturbations: |p′| ≪ p₀',
    'adiabatic compression (no heat exchange within a wavelength)',
    'fluid at rest, no ambient flow',
  ],
  regime: {
    family: WAVES_FAMILY_NAME,
    inequalities: [
      {
        group: 'p0 · p1^-1',
        op: '>=',
        bound: 1 / SOUND_MAX_PERTURBATION,
        alias: '|p′| ≪ p₀ (machine form p₀/p₁ ≥ 100)',
      },
    ],
    groupDefinitions: deriveRegimeGroups(
      WAVES_FAMILY_NAME,
      [
        { name: 'rho0', dim: DENSITY },
        { name: 'p0', dim: PRESSURE },
        { name: 'p1', dim: PRESSURE },
        { name: 'c', dim: VELOCITY },
      ],
      ['gamma'],
    ),
  },
  counterexamples: [
    {
      description:
        'The adiabatic premise is necessary. Closing the same Euler pair ISOTHERMALLY (Newton) ' +
        'gives √(p₀/ρ₀) = 290.1 m/s for air at 20 °C, 15% below the measured ≈343 m/s; the ' +
        'adiabatic closure gives 343.2 m/s.',
      witness: 'WS3b',
    },
  ],
  witnesses: [
    {
      id: 'WS3',
      kind: 'numeric',
      test: TEST,
      tolerance:
        'staggered Euler + adiabatic-closure solution within 2e-4 of the sound model’s sin(2πx)cos(2πc_s t) at 128 cells',
    },
    {
      id: 'WS3b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'air, 101325 Pa, 1.204 kg/m³, γ = 1.4: adiabatic 343.25 m/s, isothermal 290.10 m/s',
    },
  ],
  citations: [
    'Laplace, Ann. Chim. Phys. 3 (1816) 238 - the adiabatic correction to Newton’s speed of sound',
    'Landau & Lifshitz, Fluid Mechanics §64 - sound waves from the linearized equations of motion',
  ],
  reviewStatus: 'proposed',
};

/**
 * Bridge: Klein–Gordon → 1-D wave, the dispersion-free limit ω₀/(ck) → 0.
 *
 * `delta` is the EXACT relative phase-velocity error at the domain edge, not a
 * series term: {@link kleinGordonPhaseError} is increasing in ω₀/(ck), so its
 * edge value is the supremum. The pendulum record learned the hard way that a
 * truncated series can sit BELOW the error it claims to bound.
 *
 * @internal
 */
export const BRIDGE_KLEIN_GORDON_WAVE: AtlasBridge = {
  id: 'ab-klein-gordon-wave',
  relation: 'approximation',
  premises: ['model-klein-gordon'],
  conclusion: 'model-wave-1d',
  transformation: 'drop the mass term ω₀²u; ω(k) = √(c²k² + ω₀²) → ck',
  preserves: ['the wave speed c for short wavelengths', 'linearity'],
  doesNotPreserve: [
    'dispersion: wave packets spread under Klein–Gordon and not under the wave equation',
    'the gap: Klein–Gordon has no mode below ω₀',
  ],
  sideConditions: ['short wavelengths: ω₀/(ck) ≤ 0.1', 'the bound is a PHASE-VELOCITY error, not uniform in time'],
  bound: makeApproximation({
    K: 1,
    delta: kleinGordonPhaseError(KG_MAX_DISPERSION_RATIO, 1, 1),
    deltaAt: (params) => {
      const { omega0, c, k } = params;
      return kleinGordonPhaseError(omega0 ?? Number.NaN, c ?? Number.NaN, k ?? Number.NaN);
    },
    deltaAtBasis: 'closed-form',
    norm: 'relative phase-velocity error of a Fourier mode, normalized by the value of the reduced model',
    domain: 'ω₀/(c k) ≤ 0.1',
    horizon:
      't ≪ π/(2 c k δ): the phase drift reaches π/2; machine form t < π/(2 c k δ(ω₀, c, k))',
    horizonHolds: (t, params) => {
      const { omega0, c, k } = params;
      if (omega0 === undefined || c === undefined || k === undefined) return false;
      const delta = kleinGordonPhaseError(omega0, c, k);
      if (!Number.isFinite(delta) || delta <= 0) return delta === 0;
      return t < Math.PI / (2 * c * k * delta);
    },
    parameterRange: 'ω₀/(c k) ≤ 0.1',
    limitCharacter: 'regular',
    // A phase-velocity error. The record says it is not uniform in time.
    uniformity: ['phase velocity of one Fourier mode, for ω₀/(ck) ≤ 0.1'],
  }),
  regime: {
    family: WAVES_FAMILY_NAME,
    inequalities: [
      {
        group: 'c · omega0^-1 · k',
        op: '>=',
        bound: 1 / KG_MAX_DISPERSION_RATIO,
        alias: 'ω₀/(c k) ≤ 0.1',
      },
    ],
    groupDefinitions: deriveRegimeGroups(
      WAVES_FAMILY_NAME,
      [
        { name: 'c', dim: VELOCITY },
        { name: 'omega0', dim: FREQUENCY },
        { name: 'k', dim: WAVENUMBER },
      ],
      [],
    ),
  },
  counterexamples: [
    {
      description:
        'At ω₀/(c k) = 1 the phase velocity is √2 c: a 41% error. The dispersion-free limit is a ' +
        'short-wavelength statement and fails for the long waves the domain excludes.',
      witness: 'WS4b',
    },
  ],
  witnesses: [
    {
      id: 'WS4',
      kind: 'numeric',
      test: TEST,
      tolerance: 'phase velocity within 2e-3 of c at k = 20 (ω₀ = c = 1); error falls ≈4× per doubling of k',
    },
    {
      id: 'WS4b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'relative phase error √2 − 1 at ω₀/(ck) = 1',
    },
  ],
  citations: [
    'Whitham, Linear and Nonlinear Waves - §11.1, dispersive waves and the Klein-Gordon equation',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-klein-gordon-wave'),
};

/** The wave family's bridges, in design-note order. @internal */
export const WAVE_BRIDGES: readonly AtlasBridge[] = [
  BRIDGE_STRING_WAVE,
  BRIDGE_WAVE_DALEMBERT,
  BRIDGE_SOUND_SPEED,
  BRIDGE_KLEIN_GORDON_WAVE,
];
