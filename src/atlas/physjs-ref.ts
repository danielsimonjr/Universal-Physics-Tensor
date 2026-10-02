/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit below). This module is the copy the library ships: `src/` cannot
 * import a file outside its root. `tests/atlas/physjs-manifest.test.ts` fails when
 * the file and this copy disagree on the commit, a theorem, a key, or the
 * coverage phrase.
 *
 * The commit is PhysJS `main` `2e09357f9674bc60b60b378155a1623c27dc7b04`.
 * Milestone 1's six top-level theorems are unchanged. Milestone 2 adds four
 * atlas entries. Milestone 2b adds fifteen catalog entries. Bucket A adds
 * twenty-one counted catalog entries, keyed `be-<n>`. BE-20 is the nested
 * `corollary` on `be-13` and has no key. A counted covers line begins with
 * `reduction`, `limit`, or `derivation-step`. A labeled covers line begins
 * with `property` or `cross-check`. A nested object (`planeWave`, `oneLoop`,
 * `inversion`, `vacuum`, `corollary`, `friedmann`, `lengthMonomial`,
 * `torsionMonomial`, `coefficientNotFixed`, `unitCoefficient`, `scalingShape`,
 * `everyPower`) is recorded and is not a `formalRef`.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef, FormalRefKind } from './types.js';

/** PhysJS commit the vendored manifest records. @internal */
export const PHYSJS_COMMIT = '2e09357f9674bc60b60b378155a1623c27dc7b04';

/** Lean toolchain the vendored manifest records. */
const PHYSJS_TOOLCHAIN = 'leanprover/lean4:v4.34.1';

/** Mathlib pin the vendored manifest records. */
const PHYSJS_MATHLIB = 'v4.34.1';

/** Physlib pin the vendored manifest records. */
const PHYSJS_PHYS_LIB = 'af484f78ee0701290595f8bf892b157b10d64940';

/**
 * Every reviewed PhysJS reference covers its statement only. A lemma about
 * `bound.delta` does not certify the regime, the horizon, or the side conditions.
 */
const PHYSJS_COVERAGE = 'covers its statement only';

/** Axioms `#print axioms` reported for every entry at the pinned commit. */
const PHYSJS_AXIOMS = ['propext', 'Classical.choice', 'Quot.sound'] as const;

/** A second statement on the same entry. No key. Not a `formalRef`. */
interface PhysjsNestedStatement {
  readonly theorem: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

/** Nested objects the manifest schema records. A new name is a problem. */
const NESTED_FIELDS = [
  'planeWave',
  'oneLoop',
  'inversion',
  'vacuum',
  'corollary',
  'friedmann',
  'lengthMonomial',
  'torsionMonomial',
  'coefficientNotFixed',
  'unitCoefficient',
  'scalingShape',
  'everyPower',
] as const;

type NestedField = (typeof NESTED_FIELDS)[number];

const ENTRY_FIELDS = new Set<string>([
  'key',
  'bridgeId',
  'theorem',
  'covers',
  'coverage',
  'leanProof',
  'axioms',
  'imports',
  ...NESTED_FIELDS,
]);

/** Counted catalog kinds. Not a property and not a cross-check. */
const COUNTED_KIND = /^(reduction|limit|derivation-step): /;

/**
 * Labeled catalog kinds. A reader tells them from a counted statement by
 * this word. They occupy a catalog `formalRef` and are not the counted kind.
 */
const LABELED_KIND = /^(property|cross-check): /;

/** One manifest entry, reduced to the fields a `formalRef` is built from. */
interface PhysjsEntry {
  readonly key: string;
  readonly bridgeId: string;
  readonly theorem: string;
  /** What the top-level theorem certifies. The pendulum entry is not `bound.delta`. */
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
  readonly imports?: string;
  /** Present on the five rank-1 entries. Absent elsewhere. Not a `formalRef`. */
  readonly planeWave?: PhysjsNestedStatement;
  /** BE-53. The running solution. Not the reference. */
  readonly oneLoop?: PhysjsNestedStatement;
  /** BE-38. The μ inversion. Not the reference. */
  readonly inversion?: PhysjsNestedStatement;
  /** BE-13. The BE-20 vacuum density. Not a reference, and not a `be-20` key. */
  readonly vacuum?: PhysjsNestedStatement;
  /** BE-13. The Friedmann corollary of that density. Not a reference, and not a `be-20` key. */
  readonly corollary?: PhysjsNestedStatement;
  /** BE-54. The flat Friedmann identification. Not the reference. */
  readonly friedmann?: PhysjsNestedStatement;
  /**
   * BE-15. L = C (Γ t)^{1/z} under dimensional homogeneity with [Γ] = L^z T⁻¹.
   * C is not fixed, and z = 2 is not derived. Not the reference.
   */
  readonly lengthMonomial?: PhysjsNestedStatement;
  /** BE-17. T = C κ S from dimensions. C is not fixed. Not the reference. */
  readonly torsionMonomial?: PhysjsNestedStatement;
  /** BE-17. A factor other than 1 is not the catalog coefficient. Not the reference. */
  readonly coefficientNotFixed?: PhysjsNestedStatement;
  /** BE-17. Inversion under the hypothesis C = 1. Not the reference. */
  readonly unitCoefficient?: PhysjsNestedStatement;
  /** BE-33. ξ = ξ₀ φ(T/T₀). φ is not fixed. Not the reference. */
  readonly scalingShape?: PhysjsNestedStatement;
  /** BE-33. Every real power of the temperature ratio is homogeneous. The exponent is not chosen. Not the reference. */
  readonly everyPower?: PhysjsNestedStatement;
}

/** The vendored manifest, as this module compares it. @internal */
export interface PhysjsManifestFile {
  readonly schema: string;
  readonly commit: string;
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
  readonly entries: readonly PhysjsEntry[];
}

const RANK1_COVERS = 'bound.delta exactly, at the dispersion relation';

const PLANE_WAVE_COVERS = 'a plane wave solves the PDE iff ω(k) obeys the dispersion relation';

/**
 * Rank 1a, nested on a rank-1 entry. A plane wave solves the PDE if and only
 * if its frequency obeys the dispersion relation. It is not the entry's
 * `formalRef`: that decision is the owner's.
 */
function planeWave(namespace: string): PhysjsNestedStatement {
  return {
    theorem: `PhysJS.${namespace}.planeWave_iff_dispersion`,
    covers: PLANE_WAVE_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  };
}

/**
 * The forty-six entries, in manifest order. A bridge obtains its reference by key
 * through {@link physjsFormalRef}; it does not name a theorem of its own.
 * A nested object is recorded and is not that reference.
 */
const PHYSJS_ENTRIES: readonly PhysjsEntry[] = [
  {
    key: 'ab-kg-schrodinger',
    bridgeId: 'ab-kg-schrodinger',
    theorem: 'PhysJS.KgSchrodinger.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    planeWave: planeWave('KgSchrodinger'),
  },
  {
    key: 'ab-klein-gordon-wave',
    bridgeId: 'ab-klein-gordon-wave',
    theorem: 'PhysJS.KleinGordonWave.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    planeWave: planeWave('KleinGordonWave'),
  },
  {
    key: 'ab-stiff-string',
    bridgeId: 'ab-stiff-string',
    theorem: 'PhysJS.StiffString.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    planeWave: planeWave('StiffString'),
  },
  {
    key: 'ab-telegraph-diffusion',
    bridgeId: 'ab-telegraph-diffusion',
    theorem: 'PhysJS.TelegraphDiffusion.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    planeWave: planeWave('TelegraphDiffusion'),
  },
  {
    key: 'ab-telegraph-wave',
    bridgeId: 'ab-telegraph-wave',
    theorem: 'PhysJS.TelegraphWave.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    planeWave: planeWave('TelegraphWave'),
  },
  {
    key: 'ab-pendulum-linear',
    bridgeId: 'ab-pendulum-linear',
    theorem: 'PhysJS.Pendulum.linearizedEquationOfMotion_iff',
    covers: 'the transformation, not bound.delta',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    imports: 'ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-kg-oscillator',
    bridgeId: 'ab-kg-oscillator',
    theorem: 'PhysJS.KgOscillator.uniform_solves_equationOfMotion',
    covers: "the restriction, in Physlib's own terms",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-spring-lc',
    bridgeId: 'ab-spring-lc',
    theorem: 'PhysJS.SpringLc.time_rescale_equationOfMotion',
    covers: 'the oscillator dictionary',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-damped-rlc',
    bridgeId: 'ab-damped-rlc',
    theorem: 'PhysJS.DampedRlc.time_rescale_equationOfMotion',
    covers: 'the oscillator dictionary',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-wave-dalembert',
    bridgeId: 'ab-wave-dalembert',
    theorem: 'PhysJS.WaveDalembert.solution_eq_profiles',
    covers: "the missing direction of d'Alembert's formula",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-64',
    bridgeId: 'be-64',
    theorem: 'PhysJS.Eddington.balance_iff',
    covers: 'derivation-step: the r² cancellation in the Eddington force balance, not a hard cap',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-53',
    bridgeId: 'be-53',
    theorem: 'PhysJS.YangMills.b0_pos_iff_nf_le',
    covers: 'derivation-step: b₀ > 0 iff N_f ≤ 16 for SU(3), not a running procedure past one loop',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    oneLoop: {
      theorem: 'PhysJS.YangMills.alphaRun_hasDerivAt',
      covers:
        'derivation-step: α(t) = α₀ / (1 + b₀ α₀ t / (2π)) solves the one-loop running equation where the denominator is positive',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-58',
    bridgeId: 'be-58',
    theorem: 'PhysJS.JohnsonNyquist.tendsto_classical',
    covers:
      'limit: the classical Johnson–Nyquist spectrum is the ω → 0⁺ limit of the quantum parent, not the fluctuation–dissipation theorem',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-38',
    bridgeId: 'be-38',
    theorem: 'PhysJS.Mond.tendsto_nu_limits',
    covers:
      'limit: ν → 1 as z → ∞, ν √z → 1 as z → 0⁺, and F_N ν(z) / √(m F_N a₀) → 1 as F_N → 0⁺; not ν → √(2/z), and not the SPARC confrontation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    inversion: {
      theorem: 'PhysJS.Mond.mu_inversion',
      covers:
        'derivation-step: for z > 0, y = z ν(z) satisfies y² / √(1 + y²) = z, which inverts μ(x) = x / √(1 + x²)',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-13',
    bridgeId: 'be-13',
    theorem: 'PhysJS.Einstein.trace_eq',
    covers:
      'reduction: contracting G_μν + Λ g_μν = κ T_μν in four dimensions gives R = 4Λ − κ T, not Jacobson\'s thermodynamic derivation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    vacuum: {
      theorem: 'PhysJS.Einstein.vacuum_density',
      covers:
        'reduction: with κ = 8πG/c⁴, T_μν = −ρ c² g_μν and Λ g = −κ T rearrange to ρ = c² Λ / (8π G). The opposite sign does not. This is the BE-20 density; BE-20 has no reference of its own',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
    corollary: {
      theorem: 'PhysJS.Einstein.friedmann_corollary',
      covers:
        'derivation-step: the vacuum density gives (8πG/3) ρ = Λ c² / 3, the cosmological term of FirstOrderFriedmann. A fluid of this density added to matter, with the explicit Λ set to zero, is that equation at k = 0. The Einstein-static density Λ c²/(4π G) is twice that term. Dropping c² fails when c² ≠ 1. The density is not reproved. BE-20 has no reference of its own',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-34',
    bridgeId: 'be-34',
    theorem: 'PhysJS.KibbleZurek.exponent',
    covers:
      'derivation-step: the freeze-out power ε̂ = (τ₀/τ_Q)^(1/(1+zν)) and the defect density without the Boltzmann factor; omitting the 1 in the exponent fails. Not the reheating factor, and not a repair of the missing 1/a^d prefactor',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-42',
    bridgeId: 'be-42',
    theorem: 'PhysJS.HawkingUnruh.dictionary',
    covers:
      'cross-check: T_H(2GM/c²) = T_H(M) and T_U(c⁴/(4GM)) = T_H(M), naming BE-57 and be-42-via-rs. T_U(c⁴/(2GM)) is not T_H(M). Not the Hawking effect',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-24',
    bridgeId: 'be-24',
    theorem: 'PhysJS.Fret.dictionary',
    covers:
      'cross-check: η = R₀⁶/(R₀⁶+R⁶) = 1/(1+(R/R₀)⁶) = k_FRET/(k_FRET+1/τ_D), and η decreases on (0, ∞). At R = 2 R₀ the exponent 4 is not the exponent 6. Not the dipole–dipole law',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-19',
    bridgeId: 'be-19',
    theorem: 'PhysJS.QuantumBounce.dictionary',
    covers:
      'cross-check: H²_LQC equals H²_RS at σ = −ρ_c/2, both tend to (8πG/3)ρ + Λ/3 at infinity, and H²_LQC = 0 at ρ = ρ_c and Λ = 0, naming BE-54. σ = +ρ_c/2 is not that polynomial. σ < 0 is not a physical Randall–Sundrum brane',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-16',
    bridgeId: 'be-16',
    theorem: 'PhysJS.Landauer.erasure_eq',
    covers:
      'derivation-step: for T > 0, the equal-level two-state ensemble has ⟨E⟩ − F = k_B T log 2. equal_levels remains the entropy k_B log 2. At T > 0, levels E and E+δ do not have that deficit. At T = 0 the Helmholtz closed form does not separate the levels. Not E ≥ T ΔS for an arbitrary protocol, and not the Bérut confrontation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-29',
    bridgeId: 'be-29',
    theorem: 'PhysJS.Jarzynski.jensen_work',
    covers:
      'property: for a finite probability and β > 0, ∑ p_i W_i ≥ −(1/β) log(∑ p_i exp(−β W_i)). The reversed inequality fails on two unequal work values. Not Jarzynski\'s theorem, and not the Gaussian identity',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-11',
    bridgeId: 'be-11',
    theorem: 'PhysJS.Lindblad.preserve',
    covers:
      'property: one channel of the displayed GKSL generator has trace zero, and it is Hermitian when H and ρ are. L need not be Hermitian. Dropping the anticommutator makes the trace nonzero. Not Born–Markov coarse-graining',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-65',
    bridgeId: 'be-65',
    theorem: 'PhysJS.Jeans.mass_eq',
    covers:
      'derivation-step: the encoded Jeans mass (5 k T / (G μ m_u))^(3/2) (3 / (4 π ρ))^(1/2) follows from the virial convention with factor 5 and M = 4 π R³ ρ / 3. Replacing 5 by 3 fails. Not the virial theorem',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-51',
    bridgeId: 'be-51',
    theorem: 'PhysJS.Deflection.line_integral',
    covers:
      'derivation-step: (1+γ)/c² ∫_ℝ G M b / (b² + z²)^{3/2} dz = 2(1+γ) G M / (b c²), and at γ = 1 this is the encoded angle 4 G M / (b c²). γ = 0 is half. Not a geodesic',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-61',
    bridgeId: 'be-61',
    theorem: 'PhysJS.Sommerfeld.integral_eq',
    covers:
      'derivation-step: ∫_ℝ x² e^x / (1+e^x)² dx = π²/3, the factor in the encoded Lorenz number. The integrand is even, so the half-line is half of π²/3. Claiming the half-line equals π²/3 fails. Not the transport law',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },

  {
    key: 'be-12',
    bridgeId: 'be-12',
    theorem: 'PhysJS.ThermalDeBroglie.wavelength_eq',
    covers:
      'derivation-step: √(2π ℏ²/(m k_B T)) = h/√(2π m k_B T) for h = 2πℏ and ℏ > 0. The non-negative square root needs ℏ > 0. The Wave Q form ℏ/√(m k_B T), with ℏ in the numerator and no √(2π), fails, as does ℏ/√(2 m k_B T). Not Caldeira–Leggett dephasing',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-59',
    bridgeId: 'be-59',
    theorem: 'PhysJS.Josephson.frequency_eq',
    covers:
      'derivation-step: f = (2e/h) V, K_J = 2e/h, and f = K_J V. Clearing h recovers 2e. The factor 2 is the Cooper-pair charge, taken as a premise. Replacing 2e by e fails. Not the tunneling Hamiltonian',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-55',
    bridgeId: 'be-55',
    theorem: 'PhysJS.QuantumHall.reciprocal',
    covers:
      'derivation-step: for a nonzero integer C and e ≠ 0, σ_xy = C e²/h, R_H = h/(C e²), and R_K = h/e², so σ_xy R_H = 1 and R_H = R_K/C. The shifted index C+1 is a different conductance. Replacing e² by e fails the product when e ≠ 1. Not TKNN',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-60',
    bridgeId: 'be-60',
    theorem: 'PhysJS.Laughlin.filling_fraction',
    covers:
      'derivation-step: for integers p ≠ 0 and q ≠ 0, with ν = p/q, σ_xy = ν e²/h and R_xy = R_K/ν = (q/p) h/e². The charge and Planck\'s constant are not assumed nonzero. Oddness of q is the Laughlin selection rule and is not this identity. Not the Laughlin wavefunction, and not the anyon charge e/3',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-21',
    bridgeId: 'be-21',
    theorem: 'PhysJS.Kss.saturating',
    covers:
      'derivation-step: η/s = ℏ/(4π k_B) is the equality 4π k_B (η/s) = ℏ for k_B ≠ 0. The Hawking factor 8π in place of 4π is 2ℏ, not ℏ, once ℏ ≠ 0. Not the inequality η/s ≥ ℏ/(4π k_B)',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-14',
    bridgeId: 'be-14',
    theorem: 'PhysJS.PlanckArea.area_law',
    covers:
      'derivation-step: k_B c³ A/(4 G ℏ) = k_B A/(4 ℓ_P²) for ℓ_P² = ℏ G/c³. The area is an input. ℓ_P² = ℏ G/c² fails when c ≠ 1. The factor 2 in place of 4 fails. The same lemma is be-43. Not the minimal-surface theorem',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-43',
    bridgeId: 'be-43',
    theorem: 'PhysJS.PlanckArea.area_law',
    covers:
      'derivation-step: the be-14 lemma on a wormhole area. k_B A/(4 ℓ_P²) equals k_B c³ A/(4 G ℏ) for ℓ_P² = ℏ G/c³. ℓ_P² = ℏ G/c² fails when c ≠ 1, and the factor 2 fails. Not ER=EPR',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-37',
    bridgeId: 'be-37',
    theorem: 'PhysJS.Shapiro.radial_integral',
    covers:
      'derivation-step: for 0 < R_near < R_far and c ≠ 0, ∫_{R_near}^{R_far} (2 G M / c³) (dr / r) = (2 G M / c³) ln(R_far / R_near). The factor 1 in place of 2 is half, once G ≠ 0 and M ≠ 0. log₁₀ of the radius ratio is not ln. Not the impact-parameter formula, and not the Cassini measurement',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-54',
    bridgeId: 'be-54',
    theorem: 'PhysJS.RandallSundrum.brane_friedmann',
    covers:
      'derivation-step: for σ ≠ 0, H²_RS = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3, which equals the Friedmann term plus (8πG/3) ρ²/(2σ). Not a derivation from the five-dimensional Einstein equation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    friedmann: {
      theorem: 'PhysJS.RandallSundrum.flat_friedmann',
      covers:
        'derivation-step: H²_FRW with the module Λ equal to Physlib\'s Λ c² is FirstOrderFriedmann at k = 0. Identifying the two Λ symbols and dropping c² fails when c² ≠ 1 and Λ ≠ 0',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-17',
    bridgeId: 'be-17',
    theorem: 'PhysJS.EinsteinCartan.inversion',
    covers:
      'derivation-step: if κ = 8πG/c⁴ ≠ 0 and every component satisfies T = κ S, then S·S = T·T / κ² = (c⁴/(8πG))² T·T. κ² in the numerator is the inversion backwards, and it fails when T·T ≠ 0 and κ⁴ ≠ 1. Not the Einstein–Cartan field equation, and not a Newtonian limit',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    torsionMonomial: {
      theorem: 'PhysJS.EinsteinCartan.torsion_monomial',
      covers:
        'derivation-step: [κ] and [S] are independent base dimensions and [T] = [κ][S]. If a positive component is dimensionally homogeneous in those dimensions, every positive pair is a unit change of (1, 1) and T = C κ S with C = f(1, 1). C is not fixed. Not the Einstein–Cartan field equation',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
    coefficientNotFixed: {
      theorem: 'PhysJS.EinsteinCartan.coefficient_not_fixed',
      covers:
        'derivation-step: if C ≠ 1 and κ S ≠ 0, then C κ S ≠ κ S. A factor other than 1 is not the catalog coefficient',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
    unitCoefficient: {
      theorem: 'PhysJS.EinsteinCartan.inversion_of_unit_coefficient',
      covers:
        'derivation-step: if C = 1 and every component satisfies T = C κ S, then inversion gives S·S = T·T / κ². C = 1 is a hypothesis. The Einstein trace stays a hypothesis of PhysJS.Einstein.trace_eq',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-27',
    bridgeId: 'be-27',
    theorem: 'PhysJS.EffectiveTemperature.sum_eq',
    covers:
      'derivation-step: for T ≠ 0 and k_B ≠ 0, T (1 + Σ_active/(k_B T)) = T + Σ_active/k_B, and this equals T iff Σ_active = 0. The product T · Σ_active/(k_B T), with the 1 omitted, is not that sum. Not the frequency-dependent Cugliandolo–Kurchan T_eff(ω)',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-22',
    bridgeId: 'be-22',
    theorem: 'PhysJS.ToricCode.toric',
    covers:
      'derivation-step: four anyons of quantum dimension 1 have D = √4 = 2 and γ = ln 2 in nats. The encoded decomposition is S = α L − γ, with the O(L⁻¹) term dropped. log₂ 2 = 1 is the bit convention, not ln 2. D = √2 is one anyon pair, not the toric code. Not the Kitaev–Preskill theorem, and not a quantum-gravity boundary',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-15',
    bridgeId: 'be-15',
    theorem: 'PhysJS.Coarsening.exponent_iff',
    covers:
      'derivation-step: for Γ = L₀²/t₀ > 0, t > 0, t ≠ t₀, and z > 0, L(t) = L₀ (t/t₀)^{1/z} obeys L(t)² = Γ t iff z = 2. At t = t₀ the ratio holds for every z. Model B\'s z = 3 gives L³ ∝ t and fails L² = Γ t. Not the Model A Langevin equation. The Langevin kinetic coefficient is a different Γ',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    lengthMonomial: {
      theorem: 'PhysJS.Coarsening.length_monomial_at',
      covers:
        'derivation-step: if L is a dimensionally homogeneous function of Γ and t alone and [Γ] = L^z T⁻¹ for a positive rational z, then L = C (Γ t)^{1/z} with C = f(1, 1). C is not fixed. Every positive rational z is allowed, so z = 2 is not derived. Not the Model A Langevin equation',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-33',
    bridgeId: 'be-33',
    theorem: 'PhysJS.QuantumCritical.thermal_scaling',
    covers:
      'derivation-step: ξ(T) = ξ₀ (T/T₀)^{−1/z}, and at z = 1 this is ξ(T) = ξ₀ (T/T₀)^{−1} = ξ₀ T₀/T for T > 0 and T₀ > 0. Not Hertz–Millis theory, and not a universality class',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    scalingShape: {
      theorem: 'PhysJS.QuantumCritical.scaling_shape',
      covers:
        'derivation-step: if ξ is a dimensionally homogeneous function of a length ξ₀ and two temperatures, then ξ = ξ₀ φ(T/T₀) with φ(u) = f(1, u, 1). φ is not fixed. Not Hertz–Millis theory',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
    everyPower: {
      theorem: 'PhysJS.QuantumCritical.every_power_homogeneous',
      covers:
        'derivation-step: for every real p and positive scale factors, (λ_s ξ₀) ((λ_e T)/(λ_e T₀))^p = λ_s (ξ₀ (T/T₀)^p). The exponent p is not chosen. Not Hertz–Millis theory',
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: 'be-50',
    bridgeId: 'be-50',
    theorem: 'PhysJS.TimeSymmetric.wheeler_feynman',
    covers:
      'derivation-step: A_μ(x) = (A_μ^ret(x) + A_μ^adv(x))/2, and twice that component is the sum. The id is contested. This lemma does not decide the contest. Not the absorber boundary condition as a theory of radiation reaction',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-32',
    bridgeId: 'be-32',
    theorem: 'PhysJS.BornOverlap.modulus_sq',
    covers:
      'derivation-step: |c + s i|² = c² + s², which is normSq of one complex matrix element. A sum of squares above 1 is not a probability in [0, 1], the module\'s rejection of c² + s² > 1. c² − s² is not that square when s ≠ 0. Not the Giacomini–Castro-Ruiz–Brukner transformation, and not a Haar integral. The catalog records this id as not-a-bridge; this lemma does not decide that',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-28',
    bridgeId: 'be-28',
    theorem: 'PhysJS.EntropyProduction.nonneg',
    covers:
      'derivation-step: σ = Σ_i J_i X_i is the definition of σ. If every product is ≥ 0 then σ ≥ 0. One flipped sign, with the other products zero and the flipped product strictly positive, is not σ, and that flipped sum is negative. Not the variational maximum-entropy-production principle. The catalog records this id as not-a-bridge; this lemma does not decide that',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-40',
    bridgeId: 'be-40',
    theorem: 'PhysJS.CompositeHiggs.scale_free',
    covers:
      'derivation-step: for f ≠ 0 and θ = h/f, V(h)/f⁴ = −α sin²θ + β [sin⁴θ − sin²θ cos²θ]. Both terms carry f⁴, so the ratio depends on h only through θ. The pre-correction first term −α f² sin²θ, divided by f⁴, is −α sin²θ / f². It depends on f, and it agrees with −α sin²θ only when f² = 1. Not SILH matching onto a confining theory. The catalog records this id as not-a-bridge; this lemma does not decide that',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-35',
    bridgeId: 'be-35',
    theorem: 'PhysJS.Crossing.antisymmetry',
    covers:
      'derivation-step: for a real function g, g(u,v) − g(v,u) = −(g(v,u) − g(u,v)). The swap is the negation of a difference. The residual is 0 for every g when u = v, including u = v = 1/4, so that point is not a control. A block that is not symmetric does not vanish at u = 1/2, v = 1/4. Not the infinite sum over (Δ, ℓ), and not positivity or unitarity. The catalog records this id as not-a-bridge; this lemma does not decide that',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-63',
    bridgeId: 'be-63',
    theorem: 'PhysJS.Chandrasekhar.prefactor',
    covers:
      'derivation-step: with n = ρ/(μ_e m_u), p_F = ℏ (3π² n)^{1/3}, and P = (1/4) n p_F c, one has P = K_ρ ρ^{4/3} where K_ρ = K_n/(μ_e m_u)^{4/3} and K_n = (ℏ c/4)(3π²)^{1/3}. For the n = 3 Lane–Emden scale the central density cancels, and M = (ω₃⁰ √(3π)/2) (ℏ c/G)^{3/2} (μ_e m_u)^{−2}. ω₃⁰ stays symbolic; the decimal 2.01824 is not in the theorem. With ℏ = c = μ_e = m_u = 1 both routes give the same K. √π/2 in place of √(3π)/2 fails when ω₃⁰ ≠ 0, and dropping ω₃⁰ fails when ω₃⁰ ≠ 1. Not stellar rotation or magnetic support',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-30',
    bridgeId: 'be-30',
    theorem: 'PhysJS.Entanglement.first_variation',
    covers:
      'derivation-step: for a smooth curve of full-rank density matrices that stay diagonal in a fixed basis and have trace 1, d/dt S(ρ(t)) = −⟪ρ̇(t), log ρ(t)⟫, the trace inner product. The modular Hamiltonian K = −log ρ is frozen at the base point, and that derivative equals d/dt ⟨K⟩. A finite jump from diag(1/2, 1/2) to diag(3/4, 1/4) leaves ⟨K⟩ unchanged and changes S. Not the holographic first law that identifies K with an area variation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
];

const entryByKey = new Map(PHYSJS_ENTRIES.map((entry) => [entry.key, entry]));

/**
 * Theorem name on the compiled manifest copy for `key`.
 *
 * This reads the compiled table. It does not build a formal reference
 * and it does not derive an evidence tag.
 *
 * @internal
 */
export function physjsTheorem(key: string): string | undefined {
  return entryByKey.get(key)?.theorem;
}

/** `formalRef.version` for the pinned manifest. */
function physjsVersion(): string {
  return `physjs@${PHYSJS_COMMIT} ${PHYSJS_TOOLCHAIN} mathlib:${PHYSJS_MATHLIB} physlib@${PHYSJS_PHYS_LIB}`;
}

/**
 * Namespaces whose theorems live in another Lean file at this pin.
 * `SpringLc` and `DampedRlc` are namespaces inside `OscillatorDictionary.lean`,
 * not their own files. Rechecked at this pin.
 */
const PHYSJS_FILE_BY_NAMESPACE: Readonly<Record<string, string>> = {
  SpringLc: 'OscillatorDictionary.lean',
  DampedRlc: 'OscillatorDictionary.lean',
};

/** Permalink to the Lean file that contains `theorem` at the pinned commit. */
function physjsStatementUrl(theorem: string): string {
  const parts = theorem.split('.');
  if (parts.length < 3 || parts[0] !== 'PhysJS' || parts[1] === undefined) {
    throw new Error(`PhysJS theorem '${theorem}' is not PhysJS.<module>.<name>`);
  }
  const file = PHYSJS_FILE_BY_NAMESPACE[parts[1]] ?? `${parts[1]}.lean`;
  return `https://github.com/danielsimonjr/PhysJS/blob/${PHYSJS_COMMIT}/PhysJS/${file}`;
}

/**
 * Catalog keys whose theorem states the catalogued equation.
 * The PhysJS covers line still begins with `derivation-step`.
 * The kind is bridge because that equation is the theorem.
 */
const CATALOG_EQUATION_KEYS: ReadonlySet<string> = new Set([
  'be-12',
  'be-16',
  'be-21',
  'be-27',
  'be-33',
  'be-37',
  'be-40',
  'be-43',
  'be-50',
  'be-54',
  'be-55',
  'be-59',
  'be-60',
  'be-63',
]);

/**
 * Atlas keys are bridges. A catalog key whose theorem states the catalogued
 * equation is a bridge. BE-28 is a property of the defining sum. Every other
 * catalog key's kind is the covers prefix.
 */
function formalRefKind(key: string, covers: string): FormalRefKind | undefined {
  if (key.startsWith('ab-')) return 'bridge';
  if (CATALOG_EQUATION_KEYS.has(key)) return 'bridge';
  if (key === 'be-28') return 'property';
  const word = covers.split(':')[0];
  if (
    word === 'property' ||
    word === 'cross-check' ||
    word === 'reduction' ||
    word === 'limit' ||
    word === 'derivation-step'
  ) {
    return word;
  }
  return undefined;
}

/**
 * Manifest keys whose derived kind is `bridge`.
 *
 * An `ab-` key is a bridge. A catalog key is a bridge when `formalRefKind`
 * says the theorem states the catalogued equation. A canonical id uses that
 * same function: it is a seed when this table, or a caller-supplied overlay
 * entry, has derived kind `bridge`. A textbook covers word is not a seed.
 * One function, so a second list cannot drift.
 *
 * `kind`, when supplied, is that derived kind for an overlay reference the
 * compiled table does not carry. The live call omits it. The return value
 * is not stored on a bridge.
 *
 * @internal
 */
export function bridgeSeedKeys(
  entries: readonly {
    readonly key: string;
    readonly covers: string;
    readonly kind?: FormalRefKind;
  }[] = PHYSJS_ENTRIES,
): readonly string[] {
  const keys: string[] = [];
  for (const entry of entries) {
    const kind = entry.kind ?? formalRefKind(entry.key, entry.covers);
    if (kind === 'bridge') keys.push(entry.key);
  }
  return keys;
}

/**
 * The reviewed reference for a manifest key. Throws when the key is not an
 * entry, so a typo cannot ship a bridge with no reference.
 *
 * @internal
 */
export function physjsFormalRef(key: string): FormalRef {
  const entry = entryByKey.get(key);
  if (entry === undefined) throw new Error(`PhysJS manifest has no entry for '${key}'`);
  const kind = formalRefKind(entry.key, entry.covers);
  if (kind === undefined) throw new Error(`PhysJS entry '${entry.key}' covers line has no catalog kind`);
  return {
    system: 'lean4-physjs',
    statement: entry.theorem,
    version: physjsVersion(),
    axioms: entry.axioms,
    fidelity: 'sanity-lemmas',
    kind,
    url: physjsStatementUrl(entry.theorem),
    covers: `${entry.covers} — ${entry.coverage}`,
  };
}

function sameAxioms(recorded: readonly string[], manifest: readonly string[]): boolean {
  return recorded.length === manifest.length && recorded.every((axiom, i) => axiom === manifest[i]);
}

function sameNested(compiled: PhysjsNestedStatement | undefined, manifest: PhysjsNestedStatement | undefined): boolean {
  if (compiled === undefined && manifest === undefined) return true;
  if (compiled === undefined || manifest === undefined) return false;
  return (
    compiled.theorem === manifest.theorem &&
    compiled.covers === manifest.covers &&
    compiled.coverage === manifest.coverage &&
    compiled.leanProof === manifest.leanProof &&
    sameAxioms(compiled.axioms, manifest.axioms)
  );
}

/**
 * A `be-` covers line begins with a counted kind or a labeled kind.
 * Atlas covers lines stay as milestone 1 and 2 wrote them.
 */
function catalogCoversProblems(key: string, covers: string, where: string): string[] {
  if (!key.startsWith('be-')) return [];
  if (COUNTED_KIND.test(covers) || LABELED_KIND.test(covers)) return [];
  return [
    `${where} '${key}' covers line does not begin with a catalog kind (reduction, limit, derivation-step, property, or cross-check)`,
  ];
}

/**
 * Problems in the vendored manifest against the bridges that claim to be keyed
 * by it. Empty means every entry resolves to a `lean4-physjs` reference whose
 * theorem, axioms, commit and coverage phrase are the entry's own.
 *
 * A wrong commit, theorem, key or coverage phrase is a problem. A manifest
 * entry with no bridge is a problem. A `lean4-physjs` reference with no entry
 * is a problem: the gate does not skip that system. A nested object is kept
 * and compared; naming it as the `formalRef` is a problem. The top-level
 * theorem stays the reference. A catalog entry whose covers line is a
 * `property` or a `cross-check` is a labeled reference: it resolves to a
 * `formalRef`, and it is not a counted kind.
 *
 * @internal
 */
export function physjsManifestProblems(input: {
  readonly manifest: PhysjsManifestFile;
  readonly bridges: readonly { readonly id: string; readonly formalRef?: FormalRef }[];
}): string[] {
  const problems: string[] = [];
  const manifest = input.manifest;
  if (manifest.schema !== 'physjs-bridge-manifest/v1') {
    problems.push(`manifest schema is '${manifest.schema}', expected 'physjs-bridge-manifest/v1'`);
  }
  if (manifest.commit !== PHYSJS_COMMIT) {
    problems.push(`manifest commit is '${manifest.commit}', expected '${PHYSJS_COMMIT}'`);
  }
  if (manifest.toolchain !== PHYSJS_TOOLCHAIN) {
    problems.push(`manifest toolchain is '${manifest.toolchain}', expected '${PHYSJS_TOOLCHAIN}'`);
  }
  if (manifest.mathlib !== PHYSJS_MATHLIB) {
    problems.push(`manifest mathlib is '${manifest.mathlib}', expected '${PHYSJS_MATHLIB}'`);
  }
  if (manifest.physlib !== PHYSJS_PHYS_LIB) {
    problems.push(`manifest physlib is '${manifest.physlib}', expected '${PHYSJS_PHYS_LIB}'`);
  }

  const byId = new Map(input.bridges.map((bridge) => [bridge.id, bridge]));
  const seen = new Set<string>();
  for (const entry of manifest.entries) {
    if (seen.has(entry.key)) problems.push(`manifest key '${entry.key}' is duplicated`);
    seen.add(entry.key);
    for (const field of Object.keys(entry)) {
      if (!ENTRY_FIELDS.has(field)) {
        problems.push(`manifest entry '${entry.key}' has unexpected field '${field}'`);
      }
    }
    if (entry.key !== entry.bridgeId) {
      problems.push(`manifest key '${entry.key}' does not equal bridgeId '${entry.bridgeId}'`);
    }
    if (entry.coverage !== PHYSJS_COVERAGE) {
      problems.push(
        `coverage phrase for '${entry.key}' is '${entry.coverage}', expected '${PHYSJS_COVERAGE}'`,
      );
    }
    if (entry.leanProof !== 'complete') {
      problems.push(`leanProof for '${entry.key}' is '${entry.leanProof}', expected 'complete'`);
    }
    const coversProblems = catalogCoversProblems(entry.key, entry.covers, 'manifest key');
    problems.push(...coversProblems);
    for (const field of NESTED_FIELDS) {
      const nested = entry[field];
      if (nested === undefined) continue;
      if (nested.coverage !== PHYSJS_COVERAGE) {
        problems.push(
          `${field} coverage phrase for '${entry.key}' is '${nested.coverage}', expected '${PHYSJS_COVERAGE}'`,
        );
      }
      if (nested.leanProof !== 'complete') {
        problems.push(`${field} leanProof for '${entry.key}' is '${nested.leanProof}', expected 'complete'`);
      }
      problems.push(...catalogCoversProblems(entry.key, nested.covers, `${field} covers`));
    }
    const bridge = byId.get(entry.key);
    if (bridge === undefined) {
      problems.push(`manifest key '${entry.key}' does not resolve to a bridge`);
      continue;
    }
    const ref = bridge.formalRef;
    if (ref === undefined || ref.system !== 'lean4-physjs') {
      problems.push(
        `bridge '${entry.key}' has no lean4-physjs formalRef (system '${ref?.system ?? 'none'}')`,
      );
      continue;
    }
    if (entry.planeWave !== undefined && ref.statement === entry.planeWave.theorem) {
      problems.push(
        `bridge '${entry.key}' formalRef names the nested planeWave theorem '${entry.planeWave.theorem}'; the top-level theorem stays the reference`,
      );
    }
    for (const field of NESTED_FIELDS) {
      if (field === 'planeWave') continue;
      const nested = entry[field];
      if (nested !== undefined && ref.statement === nested.theorem) {
        problems.push(
          `bridge '${entry.key}' formalRef names the nested ${field} theorem '${nested.theorem}'; the top-level theorem stays the reference`,
        );
      }
    }
    if (ref.statement !== entry.theorem) {
      problems.push(`bridge '${entry.key}' theorem is '${ref.statement}', manifest theorem is '${entry.theorem}'`);
    }
    if (!sameAxioms(ref.axioms, entry.axioms)) {
      problems.push(
        `bridge '${entry.key}' axioms [${ref.axioms.join(', ')}] differ from the manifest [${entry.axioms.join(', ')}]`,
      );
    }
    problems.push(...catalogCoversProblems(entry.key, ref.covers, 'formalRef covers'));
    if (!ref.covers.includes(PHYSJS_COVERAGE)) {
      problems.push(`bridge '${entry.key}' covers line does not say '${PHYSJS_COVERAGE}'`);
    }
    if (!ref.covers.includes(entry.covers)) {
      problems.push(`bridge '${entry.key}' covers line does not record '${entry.covers}'`);
    }
    if (ref.version !== physjsVersion() || !ref.version.includes(`physjs@${manifest.commit}`)) {
      problems.push(`bridge '${entry.key}' version '${ref.version}' does not record commit '${manifest.commit}'`);
    }
    if (ref.fidelity === 'unreviewed') {
      problems.push(`bridge '${entry.key}' formalRef is unreviewed`);
    }
    const kind = formalRefKind(entry.key, entry.covers);
    if (kind !== undefined && ref.kind !== kind) {
      problems.push(`bridge '${entry.key}' kind is '${ref.kind}', expected '${kind}'`);
    }
    const url = physjsStatementUrl(entry.theorem);
    if (ref.url !== url) {
      problems.push(`bridge '${entry.key}' url is '${ref.url}', expected '${url}'`);
    }
    const compiled = entryByKey.get(entry.key);
    if (compiled === undefined) {
      problems.push(`manifest key '${entry.key}' is not in the compiled entry table`);
    } else if (
      compiled.theorem !== entry.theorem ||
      compiled.covers !== entry.covers ||
      compiled.coverage !== entry.coverage ||
      NESTED_FIELDS.some((field) => !sameNested(compiled[field], entry[field]))
    ) {
      problems.push(`compiled entry for '${entry.key}' disagrees with the vendored manifest`);
    }
  }

  for (const bridge of input.bridges) {
    if (bridge.formalRef?.system !== 'lean4-physjs') continue;
    if (!seen.has(bridge.id)) {
      problems.push(`lean4-physjs formalRef on '${bridge.id}' has no manifest entry`);
    }
  }
  return problems;
}
