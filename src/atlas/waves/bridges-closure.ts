/**
 * Atlas Phase 4 — the three wave-family bridges added to close Sprint 4's
 * "≥ 20 bridges" exit criterion.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §4 (Sprint 4 closure).
 *
 * | Bridge | Relation | Witnesses |
 * |---|---|---|
 * | Klein–Gordon → free Schrödinger | `approximation` (ck/ω₀ → 0) | WS5 (convergence), WS5b |
 * | Klein–Gordon → spring | `restriction` (uniform mode) | WS6 (convergence) |
 * | stiff string → string | `approximation` (EIk²/F → 0) | WS7 (convergence), WS7b |
 *
 * Two of these END in other families (`model-schrodinger-free` in diffusion,
 * `model-spring` in oscillators): the atlas is one graph, and
 * `tests/atlas/families.test.ts` resolves endpoints across all of it.
 *
 * @module atlas/waves/bridges-closure
 */

import type { Dimension } from '../../dimensional/types.js';
import { ACTION, FORCE, FREQUENCY, MASS, VELOCITY } from '../../dimensional/types.js';
import { makeApproximation } from '../oscillators/bridges-limits.js';
import { SPRING_CONSTANT } from '../oscillators/dimensions.js';
import { deriveRegimeGroups } from '../regime.js';
import { physjsFormalRef } from '../physjs-ref.js';
import type { AtlasBridge } from '../types.js';
import { FLEXURAL_RIGIDITY, LINEAR_DENSITY, WAVENUMBER, WAVES_FAMILY_NAME } from './models.js';
import { kgNonrelativisticError, stiffStringPhaseError } from './numerics.js';

const TEST = 'tests/atlas/closure.test.ts';

/** Domain edge of the non-relativistic limit: ck/ω₀ ≤ 0.1. @internal */
export const KG_NR_MAX_X = 0.1;

/** Domain edge of the flexible-string limit: β = EIk²/F ≤ 0.01. @internal */
export const STIFF_MAX_BETA = 0.01;

const regime = (
  parameters: readonly { name: string; dim: Dimension }[],
  inequalities: AtlasBridge['regime']['inequalities'],
): AtlasBridge['regime'] => ({
  family: WAVES_FAMILY_NAME,
  inequalities,
  groupDefinitions: deriveRegimeGroups(WAVES_FAMILY_NAME, parameters, []),
});

/**
 * Bridge: Klein–Gordon → free Schrödinger, the non-relativistic limit.
 *
 * Factor out the rest-frequency phase e^{−iω₀t}; the remaining envelope obeys
 * the free Schrödinger equation with ħ/m ↦ c²/ω₀ (that is, mc² = ħω₀).
 *
 * @internal
 */
export const BRIDGE_KG_SCHRODINGER: AtlasBridge = {
  id: 'ab-kg-schrodinger',
  relation: 'approximation',
  premises: ['model-klein-gordon'],
  conclusion: 'model-schrodinger-free',
  transformation:
    'u = Re(ψ e^{−iω₀t}) with ψ slowly varying; ħ/m ↦ c²/ω₀: ω − ω₀ = ω₀(√(1 + x²) − 1) → ω₀x²/2, x = ck/ω₀',
  preserves: ['the kinetic frequency ħk²/(2m) to O(x²)', 'linearity'],
  doesNotPreserve: [
    'the rest-frequency phase e^{−iω₀t}',
    'the negative-frequency branch',
    'relativistic dispersion at x ≳ 1',
  ],
  sideConditions: ['non-relativistic modes: x = ck/ω₀ ≤ 0.1', 'the bound is a FREQUENCY error, not uniform in time'],
  bound: makeApproximation({
    K: 1,
    delta: kgNonrelativisticError(KG_NR_MAX_X),
    deltaAt: (p) => {
      const { c, k, omega0 } = p;
      if (c === undefined || k === undefined || omega0 === undefined) return Number.NaN;
      return kgNonrelativisticError((c * k) / omega0);
    },
    deltaAtBasis: 'closed-form',
    norm: 'relative error of the kinetic frequency ω − ω₀, normalized by the value of the reduced model',
    domain: 'x = ck/ω₀ ≤ 0.1',
    horizon:
      't ≪ π/(δ ω₀ x²): the kinetic-phase drift reaches π/2; machine form t < π/(δ ω₀ x²)',
    horizonHolds: (t, p) => {
      const { c, k, omega0 } = p;
      if (c === undefined || k === undefined || omega0 === undefined) return false;
      const x = (c * k) / omega0;
      const delta = kgNonrelativisticError(x);
      if (!Number.isFinite(delta)) return false;
      if (delta === 0) return true;
      return t < Math.PI / (delta * omega0 * x * x);
    },
    parameterRange: 'x = ck/ω₀ ≤ 0.1',
    limitCharacter: 'regular',
    // A frequency error. The record says it is not uniform in time.
    uniformity: ['kinetic frequency of one mode, for x = ck/ω₀ ≤ 0.1'],
  }),
  regime: regime(
    [
      { name: 'c', dim: VELOCITY },
      { name: 'omega0', dim: FREQUENCY },
      { name: 'k', dim: WAVENUMBER },
      { name: 'hbar', dim: ACTION },
      { name: 'm', dim: MASS },
    ],
    [{ group: 'c · omega0^-1 · k', op: '<=', bound: KG_NR_MAX_X, alias: 'ck/ω₀ ≤ 0.1' }],
  ),
  counterexamples: [
    {
      description:
        'At x = ck/ω₀ = 1 the non-relativistic kinetic frequency ω₀/2 is 20.7% above the exact ' +
        'ω₀(√2 − 1), which is 17.2% of its own value (the normalization of delta): the limit is a ' +
        'long-wavelength statement.',
      witness: 'WS5b',
    },
  ],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WS5',
      kind: 'numeric',
      test: TEST,
      tolerance: 'kinetic-frequency error below 1e-3 at x = 0.05; falls ≈4× per halving of x',
    },
    {
      id: 'WS5b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'relative error 3 − 2√2 = 0.1716 at x = 1, normalized by the reduced value',
    },
  ],
  citations: [
    'Greiner, Relativistic Quantum Mechanics: Wave Equations - Ch. 1, the Klein-Gordon equation and its non-relativistic limit',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-kg-schrodinger'),
};

/** Bridge: Klein–Gordon → spring, restricted to the spatially uniform mode. @internal */
export const BRIDGE_KG_OSCILLATOR: AtlasBridge = {
  id: 'ab-kg-oscillator',
  relation: 'restriction',
  premises: ['model-klein-gordon'],
  conclusion: 'model-spring',
  transformation: 'u(x, t) = u(t): u_tt = −ω₀² u; u ↦ x, ω₀² ↦ k/m',
  preserves: ['the k = 0 mode exactly', 'the frequency ω₀'],
  doesNotPreserve: ['every mode with k ≠ 0', 'spatial structure'],
  sideConditions: ['spatially uniform initial data', 'periodic or infinite domain (no boundary forcing)'],
  regime: regime(
    [
      { name: 'omega0', dim: FREQUENCY },
      { name: 'm', dim: MASS },
      { name: 'k', dim: SPRING_CONSTANT },
    ],
    [],
  ),
  counterexamples: [],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WS6',
      kind: 'numeric',
      test: TEST,
      tolerance: 'uniform leapfrog field within 3e-4 of cos(ω₀t) at 100 steps (ω₀ = 2, t = 3); ≈4× per halving',
    },
  ],
  citations: [
    'Whitham, Linear and Nonlinear Waves - §11.1, dispersive waves and the Klein-Gordon equation',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-kg-oscillator'),
};

/** Bridge: stiff string → flexible string, as bending stiffness → 0. @internal */
export const BRIDGE_STIFF_STRING: AtlasBridge = {
  id: 'ab-stiff-string',
  relation: 'approximation',
  premises: ['model-stiff-string'],
  conclusion: 'model-string',
  transformation: 'drop EI y_xxxx: ω² = (F/μ)k² + (EI/μ)k⁴ → (F/μ)k²',
  preserves: ['the wave speed √(F/μ) for long wavelengths', 'harmonic partials to O(β)'],
  doesNotPreserve: ['inharmonicity: high partials of a stiff string are sharp', 'the fourth-order boundary conditions'],
  sideConditions: ['β = EIk²/F ≤ 0.01', 'the bound is a PHASE-VELOCITY error, not uniform in time'],
  bound: makeApproximation({
    K: 1,
    delta: stiffStringPhaseError(1, STIFF_MAX_BETA, 1),
    deltaAt: (p) =>
      stiffStringPhaseError(p['F'] ?? Number.NaN, p['EI'] ?? Number.NaN, p['k'] ?? Number.NaN),
    deltaAtBasis: 'closed-form',
    norm: 'relative phase-velocity error of a Fourier mode, normalized by the value of the reduced model',
    domain: 'β = EIk²/F ≤ 0.01',
    horizon:
      't ≪ π/(2 c k δ): the phase drift reaches π/2; machine form t < π/(2 √(F/μ) k δ)',
    horizonHolds: (t, p) => {
      const { F, EI, k, mu } = p;
      if (F === undefined || EI === undefined || k === undefined || mu === undefined) return false;
      const delta = stiffStringPhaseError(F, EI, k);
      if (!Number.isFinite(delta)) return false;
      if (delta === 0) return true;
      return t < Math.PI / (2 * Math.sqrt(F / mu) * k * delta);
    },
    parameterRange: 'β = EIk²/F ≤ 0.01',
    limitCharacter: 'regular',
    // A phase-velocity error. The record says it is not uniform in time.
    uniformity: ['phase velocity of one Fourier mode, for β = EIk²/F ≤ 0.01'],
  }),
  regime: regime(
    [
      { name: 'F', dim: FORCE },
      { name: 'mu', dim: LINEAR_DENSITY },
      { name: 'EI', dim: FLEXURAL_RIGIDITY },
      { name: 'k', dim: WAVENUMBER },
    ],
    // The derived group is F/(EIk²) = 1/β, so β ≤ 0.01 is F/(EIk²) ≥ 100.
    [{ group: 'F · EI^-1 · k^-2', op: '>=', bound: 1 / STIFF_MAX_BETA, alias: 'β = EIk²/F ≤ 0.01' }],
  ),
  counterexamples: [
    {
      description:
        'The partials of a stiff string are sharp: at β = 1 the phase velocity is √2 times the ' +
        'flexible-string value, the inharmonicity piano tuners stretch octaves to accommodate.',
      witness: 'WS7b',
    },
  ],
  evidence: new Set(['proposed', 'numerically-supported']),
  witnesses: [
    {
      id: 'WS7',
      kind: 'numeric',
      test: TEST,
      tolerance: 'phase velocity within 0.15 of √(F/μ) = 100 at k = 5 (EI/F = 1e-4); ≈4× per halving of k',
    },
    {
      id: 'WS7b',
      kind: 'numeric',
      test: TEST,
      tolerance: 'relative phase error √2 − 1 at β = 1',
    },
  ],
  citations: [
    'Fletcher, J. Acoust. Soc. Am. 36 (1964) 203 - Normal vibration frequencies of a stiff piano string',
  ],
  reviewStatus: 'proposed',
  formalRef: physjsFormalRef('ab-stiff-string'),
};

/** The wave-family closure bridges. @internal */
export const WAVE_CLOSURE_BRIDGES: readonly AtlasBridge[] = [
  BRIDGE_KG_SCHRODINGER,
  BRIDGE_KG_OSCILLATOR,
  BRIDGE_STIFF_STRING,
];
