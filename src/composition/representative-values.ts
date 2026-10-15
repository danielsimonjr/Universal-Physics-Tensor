/**
 * Order-of-magnitude representative values for the discovery falsifier.
 *
 * The discovery loop (`discovery.ts`) vets a hypothesised identification a≡b,
 * but its numeric check (`retrodict`) runs from a single anchor and cannot
 * evaluate the quantities a dimensional coincidence "unlocks" — so it never
 * contradicts them, and they surface as `promising` (e.g.
 * `landauer-erasure-energy ≟ planck-mass-energy`, ~30 orders apart). The graph
 * structurally CANNOT supply the magnitudes that would falsify these.
 *
 * This table injects that missing ground truth: a sourced, order-of-magnitude
 * value for quantities that have a WELL-DEFINED physical scale. Two classes are
 * deliberately ABSENT:
 *   - generic quantities (`mass`, `energy`, `length`, …) — no single scale (the
 *     discovery gate now reads these from the graph at the anchor instead, see
 *     `discovery.ts`); and
 *   - speculative-physics quantities with no agreed scale (`dark-fermion-mass`,
 *     `scalar-field-value`, `inflation-hubble-energy`, `boundary-length`, the
 *     time-dependent `coarsening-length`) — a value would be fabrication, so the
 *     gate correctly abstains on them.
 * When a value is absent the gate abstains; it never false-rejects on unknowns.
 *
 * Values are order-of-magnitude estimates (good to ~1 order), each carrying its
 * provenance. Nothing here is fabricated; coarse by design. When the canonical-
 * equation registry lands it can supply these centrally and this table folds in.
 *
 * INTERNAL — surfaced via `upt discover`.
 *
 * @module composition/representative-values
 */

/** A sourced order-of-magnitude value for one quantity. @internal */
export interface RepresentativeValue {
  /** Order-of-magnitude value in the quantity's SI unit (good to ~1 order). */
  readonly value: number;
  /** Provenance — how the estimate is obtained (a citation or a one-liner). */
  readonly source: string;
  /**
   * The value's stated uncertainty, as a standard deviation in decades of `log10|value|`.
   * Absent means {@link DEFAULT_SIGMA_DECADES}, the table's "good to about one order"; a row
   * states another only with a source for it. The graded magnitude gate
   * (`discovery.ts`, `magnitudeP`) reads it; the verdict threshold does not.
   */
  readonly sigmaDecades?: number;
}

/**
 * The σ in decades a representative value carries when its row states none: one decade, the
 * precision this table has always claimed ("good to ~1 order"). Not a per-row measurement.
 *
 * @internal
 */
export const DEFAULT_SIGMA_DECADES = 1;

/** The σ in decades of a representative value: its own `sigmaDecades`, else the default. @internal */
export function sigmaDecadesOf(rv: RepresentativeValue): number {
  return rv.sigmaDecades ?? DEFAULT_SIGMA_DECADES;
}

/**
 * Scale-specific quantities only. Keyed by the canonical quantity name used in
 * the composition graph. Generic quantities are intentionally omitted.
 *
 * @internal
 */
export const REPRESENTATIVE_VALUES: Readonly<
  Record<string, RepresentativeValue>
> = {
  // ── frequencies / rates [s^-1] ──────────────────────────────────────────
  'hubble-rate': { value: 2.2e-18, source: 'H0 ≈ 67 km/s/Mpc (Planck 2018)' },
  'grw-localization-rate': {
    value: 1e-16,
    source: 'GRW collapse rate λ ≈ 10^-16 s^-1 (Ghirardi–Rimini–Weber 1986)',
  },
  'attempt-frequency': {
    value: 1e13,
    source: 'Debye/phonon attempt frequency ~10^13 Hz',
  },

  // ── energies [J] ────────────────────────────────────────────────────────
  'landauer-erasure-energy': { value: 2.9e-21, source: 'kT·ln2 at T = 300 K' },
  'planck-mass-energy': { value: 1.96e9, source: 'm_P·c² (m_P = √(ℏc/G))' },
  'vacuum-expectation-value': {
    value: 3.94e-8,
    source: 'Higgs VEV v ≈ 246 GeV',
  },
  'barrier-height': {
    value: 3.2e-20,
    source: 'BE-26 Löwdin DNA proton-transfer barrier V−E ~0.2 eV',
  },

  // ── masses [kg] ─────────────────────────────────────────────────────────
  'planck-mass': { value: 2.176e-8, source: 'm_P = √(ℏc/G)' },
  'tunneling-mass': {
    value: 1.673e-27,
    source: 'BE-26 tunneling particle is the proton, m_p = 1.673e-27 kg',
  },

  // ── lengths [m] ─────────────────────────────────────────────────────────
  'foerster-radius': {
    value: 5e-9,
    source: 'typical FRET Förster radius ~5 nm',
  },
  'donor-acceptor-distance': {
    value: 5e-9,
    source: 'BE-24 FRET donor–acceptor separation ~5 nm (same regime as R_0)',
  },
  'barrier-width': {
    value: 1e-10,
    source: 'BE-26 DNA H-bond proton-tunneling distance ~1 Å (Löwdin 1963)',
  },
  'planck-length': { value: 1.616e-35, source: 'ℓ_P = √(ℏG/c³)' },
  // Canonical-graph atomic length scales — sourced so the gate compares real
  // magnitudes instead of falling back to the {mass: M_sun} anchor, which makes
  // a 1/mass quantity like the Compton wavelength absurdly small (~10⁻⁷³ m) and
  // produces a spurious clash against the (fixed) Bohr radius.
  'compton-wavelength': {
    value: 2.426e-12,
    source: 'electron Compton wavelength λ_C = h/(m_e c) = 2.43e-12 m (CODATA)',
  },
  'bohr-radius': { value: 5.292e-11, source: 'Bohr radius a_0 = 5.29e-11 m (CODATA)' },

  // ── times [s] ───────────────────────────────────────────────────────────
  'planck-time': { value: 5.39e-44, source: 't_P = √(ℏG/c⁵)' },
};

/**
 * The sourced order-of-magnitude value for `name`, or `undefined` when the
 * quantity has no well-defined representative scale (the gate then abstains).
 *
 * @internal
 */
export function representativeValue(
  name: string,
): RepresentativeValue | undefined {
  return REPRESENTATIVE_VALUES[name];
}
