/**
 * Bridge 5 of the oscillator pilot: the COARSE-GRAINING bridge from the
 * discrete mass–spring chain to the 1-D wave equation.
 *
 * This is the only Phase 0 bridge whose relation is `coarse-graining`: the
 * reduction map `u_n(t) ↦ u(x = na, t)` is not invertible, and the
 * short-wavelength half of the lattice Brillouin zone (`q > π/a`) has no image
 * in the continuum model. The information loss is therefore recorded in
 * `doesNotPreserve` and witnessed numerically by `W9`.
 *
 * @module atlas/oscillators/bridges-coarse
 */

import type { AtlasBridge, RelationContract } from '../types.js';
import { relationContractOf } from './bridges-exact.js';

const FAMILY = 'oscillators';

/**
 * The lattice dispersion relation of `m u_n″ = κ(u_{n+1} − 2u_n + u_{n−1})`:
 * `ω(q) = 2 √(κ/m) |sin(qa/2)|`.
 *
 * @internal
 */
export function latticeDispersion(q: number, a: number, kappa: number, m: number): number {
  return 2 * Math.sqrt(kappa / m) * Math.abs(Math.sin((q * a) / 2));
}

/**
 * The continuum dispersion relation of `u_tt = c² u_xx` with `c² = κ a² / m`:
 * `ω = c q`.
 *
 * @internal
 */
export function continuumDispersion(q: number, a: number, kappa: number, m: number): number {
  return Math.sqrt((kappa * a * a) / m) * Math.abs(q);
}

/** The long-wavelength wave speed `c = a √(κ/m)`. @internal */
export function chainWaveSpeed(a: number, kappa: number, m: number): number {
  return a * Math.sqrt(kappa / m);
}

/**
 * The band edge of the lattice, at `qa = π`: `ω_max = 2 √(κ/m)`.
 * The continuum relation `ω = c q` is unbounded and has no counterpart —
 * that absence IS the information the coarse-graining discards.
 *
 * @internal
 */
export function latticeBandEdge(kappa: number, m: number): number {
  return 2 * Math.sqrt(kappa / m);
}

/**
 * Leading-order relative dispersion error `1 − ω_lattice/ω_continuum`,
 * approximated as `(qa)²/24`.
 *
 * Convention note (fixed for the whole sprint): with `x = qa/2`,
 * `1 − sin x / x = x²/6 − x⁴/120 + …`, so the true relative error is
 * `(qa)²/24 − (qa)⁴/1920`. The quartic term makes `(qa)²/24` an
 * OVERESTIMATE; the signed deviation `(true − approx)/approx` is therefore
 * NEGATIVE and equals `−(qa)²/80` to leading order. The W9 assertion is on
 * the MAGNITUDE, so the sign convention does not change the test — it is
 * stated here so the next reader does not rederive it.
 *
 * @internal
 */
export function dispersionErrorApproximation(qa: number): number {
  return (qa * qa) / 24;
}

/**
 * The W9 tolerance: the magnitude of the relative deviation of the true
 * dispersion error from `(qa)²/24`, taken over `(qa)²/24`, is at most
 * `(qa)²/80` for `qa < 1`.
 *
 * Derivation: with `x = qa/2`, `1 − sin x / x = x²/6 − x⁴/120 + x⁶/5040 − …`,
 * so the deviation is `−(qa)²/80 + (qa)⁴/13440 − …`. The series alternates and
 * each term is at most `1/80` of the one before it for `qa < 1`, so the
 * magnitude never exceeds the leading term. A flat 0.5% fails for `qa > 0.634`.
 *
 * @internal
 */
export function dispersionDeviationBound(qa: number): number {
  return (qa * qa) / 80;
}

// On |qa| < 1 the alternating series avoids cancellation near q = 0.
function dispersionRelativeError(qa: number): number {
  const xSquared = (qa / 2) ** 2;
  let term = xSquared / 6;
  let error = term;
  for (let order = 2; order <= 8; order++) {
    term *= -xSquared / ((2 * order) * (2 * order + 1));
    error += term;
  }
  return error;
}

/** Bridge 5: chain → wave equation by coarse-graining. @internal */
export const BRIDGE_CHAIN_WAVE: AtlasBridge = {
  id: 'ab-chain-wave',
  relation: 'coarse-graining',
  premises: ['model-chain'],
  conclusion: 'model-wave-1d',
  transformation: 'u_n(t) ↦ u(x = n a, t), with c² = κ a² / m',
  preserves: [
    'long-wavelength dispersion ω ≈ c q',
    'wave speed c = a √(κ/m)',
    'linearity',
  ],
  doesNotPreserve: [
    'modes with q > π/a',
    'the band edge ω_max = 2 √(κ/m) at qa = π',
    'the discrete lattice spacing a as an independent scale',
  ],
  sideConditions: ['long-wavelength, qa ≪ 1'],
  regime: {
    family: FAMILY,
    // qa is the conventional name for the dimensionless product of the
    // wavenumber and lattice spacing. A caller may supply either form.
    groupDefinitions: { qa: { formula: 'qa', exponents: { q: 1, a: 1 } } },
    inequalities: [
      { group: 'qa', op: '<', bound: 1, alias: '|qa| ≪ 1' },
      { group: 'qa', op: '>', bound: -1, alias: '|qa| ≪ 1' },
    ],
  },
  bound: {
    K: 1,
    delta: dispersionRelativeError(1),
    deltaAt: ({ qa, q, a }) => dispersionRelativeError(qa ?? q * a),
    deltaAtBasis: 'closed-form',
    norm: 'relative frequency error normalized by the continuum frequency, extended continuously at q = 0',
    domain: '0 ≤ |qa| < 1; the alternating sine series gives 1 − sinc(qa/2) ≤ (qa)²/24',
    horizon: 'all t ≥ 0 for the dispersion relation',
    horizonHolds: (t) => Number.isFinite(t) && t >= 0,
    limitCharacter: 'regular',
    uniformity: ['all time for the modal frequencies', 'positive mass, spring constant and spacing'],
  },
  counterexamples: [
    {
      description:
        'A mode at the band edge qa = π has ω = 2√(κ/m) on the lattice, while the ' +
        'continuum relation ω = c q is unbounded: the coarse-grained model has no ' +
        'band edge at all.',
      witness: 'W9',
    },
  ],
  witnesses: [
    {
      id: 'W9',
      kind: 'numeric',
      test: 'tests/atlas/oscillators-coarse.test.ts',
      tolerance: 'relative dispersion error matches (qa)²/24 within (qa)²/80 of itself, for qa < 1',
    },
    {
      id: 'W9b',
      kind: 'numeric',
      test: 'tests/atlas/oscillators-coarse.test.ts',
      tolerance:
        'ring of 64 masses integrated: ω matches the lattice dispersion within 1e-9 and the coarse error ' +
        '(qa)²/24 within 1%; superposition within 1e-10 (linearity); a 10% wrong κ and a cubic on-site force each fail',
    },
  ],
  // The monatomic-chain dispersion omega(q) = 2 sqrt(kappa/m) |sin(qa/2)| and its
  // long-wavelength continuum limit are standard solid-state results. Work and topic are
  // cited rather than a precise section number, which would be fabrication in a more
  // confident costume. This array was EMPTY, which is honest but leaves a textbook result
  // looking unsourced.
  citations: [
    'Kittel, Introduction to Solid State Physics - Phonons I: the monatomic linear chain, its dispersion relation and the qa << 1 continuum limit',
    'Ashcroft & Mermin, Solid State Physics - the one-dimensional monatomic Bravais lattice and the first Brillouin zone band edge at qa = pi',
  ],
  reviewStatus: 'proposed',
};

/**
 * Bridge 5 re-registered through `RelationContract`.
 *
 * `coarse-graining` leaves `bound` OPTIONAL, and this record carries none: the
 * `qa²/24` dispersion residual is a per-mode series term, not a Lipschitz
 * constant with a uniform offset in a stated norm. The union permits the
 * absence rather than forcing an invented `K` and `delta`.
 *
 * No `deltaAt` either, for the same reason and by the same rule: `deltaAt` is
 * the machine form OF a `delta`, so a record with no `delta` has nothing for
 * it to be the machine form of. `admitApproximation` requires `deltaAt` only
 * of an `approximation`, so this record passes admission unchanged.
 *
 * @internal
 */
export const CONTRACT_CHAIN_WAVE: RelationContract = relationContractOf(BRIDGE_CHAIN_WAVE);
