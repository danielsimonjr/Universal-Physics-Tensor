/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit below). This module is the copy the library ships: `src/` cannot
 * import a file outside its root. `tests/atlas/physjs-manifest.test.ts` fails when
 * the file and this copy disagree on the commit, a theorem, a key, or the
 * coverage phrase.
 *
 * The commit is PhysJS `main` `03e8bb77c952f720bdd2730af2afc6a7f2d36243`.
 * PhysJS #63 stores each Lean file at `lean/<File>.lean`. The sentence that
 * the pin is `92f87257a1e3086a48cdc19fe4361cc1c5909d49` is the record from
 * before PhysJS #65. The sentence that the pin is
 * `ee753df77bd5b29b7207443181606b6004bfcf6a` is the record from
 * before PhysJS #64. The sentence that the pin is
 * `4ea35872513f8d4d12a01bfac225156bdddb87a9` and that the path is
 * `lean/PhysJS/<File>.lean` is the record from before that flatten. The
 * sentence that the pin is `3af15b49be09442350510e7c7f56f4aab92ea3bc` and
 * that the path is `PhysJS/<File>.lean` is the record from before PhysJS #61.
 * Theorem names of the earlier entries are unchanged. PhysJS #62 adds be-74,
 * be-75, and be-76. PhysJS #64 adds be-77 through be-87. PhysJS #65 adds
 * be-88 through be-102.
 * Milestone 1's six top-level theorems are unchanged. Milestone 2 adds four
 * atlas entries. Milestone 2b adds fifteen catalog entries. Bucket A adds
 * twenty-one counted catalog entries, keyed `be-<n>`. BE-20 is the nested
 * `corollary` on `be-13` and has no key. A counted covers line begins with
 * `reduction`, `limit`, or `derivation-step`. A labeled covers line begins
 * with `property` or `cross-check`. A nested object (`planeWave`, `oneLoop`,
 * `inversion`, `vacuum`, `corollary`, `friedmann`, `lengthMonomial`,
 * `torsionMonomial`, `coefficientNotFixed`, `unitCoefficient`, `scalingShape`,
 * `everyPower`, `perpendicularQuartic`, `tolmanRatio`) is recorded and is not
 * a `formalRef`.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef, FormalRefKind } from './types.js';

/** PhysJS commit the vendored manifest records. @internal */
export const PHYSJS_COMMIT = '03e8bb77c952f720bdd2730af2afc6a7f2d36243';

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
  'perpendicularQuartic',
  'tolmanRatio',
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
  /** BE-69. The perpendicular root of the MHD quartic. Not the reference. */
  readonly perpendicularQuartic?: PhysjsNestedStatement;
  /** BE-72. Equal Tolman products imply equal ratios. Not the reference, and not BE-68. */
  readonly tolmanRatio?: PhysjsNestedStatement;
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
 * The fifty-four entries, in manifest order. A bridge obtains its reference by key
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
  {
    key: 'be-66',
    bridgeId: 'be-66',
    theorem: 'PhysJS.RadiationPressure.pressure_eq',
    covers:
      'derivation-step: foreshortening I cos θ, normal momentum per energy (cos θ)/c, and an opaque split that deposits the absorbed fraction once and the specular fraction twice give P_n = (I/c)(1+R) cos²θ. R = 0, θ = 0 is I/c and R = 1, θ = 0 is 2I/c. A single cosine is not that pressure when cos θ is neither 0 nor 1. Homogeneity in I and c gives P = C I/c with C = f(1,1) unfixed. Not the Maxwell stress tensor, and not the Eddington luminosity',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-67',
    bridgeId: 'be-67',
    theorem: 'PhysJS.AlfvenSpeed.speed_eq',
    covers:
      'derivation-step: one transverse monochromatic polarization along a uniform field, with ∂b/∂t = B ∂v/∂z and ρ ∂v/∂t = (B/μ0) ∂b/∂z, has phase speed |ω/k| = B/√(μ0 ρ) for B > 0, μ0 > 0, ρ > 0, and k ≠ 0. ρ is the density in that momentum premise, read as the total mass density. Proton-only n m_p is a different density when electrons contribute, and a density r ρ with r ≠ 1 is a different speed. Inserting tesla and the SI density into B/√(4πρ) is not the SI speed. 4π×10^{-7} is the permeability stand-in, not a measured μ0. A factor C ≠ 1 is not the catalog speed. Not a kinetic dispersion relation',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'be-68',
    bridgeId: 'be-68',
    theorem: 'PhysJS.TolmanEhrenfest.hydrostatic_constant',
    covers:
      'derivation-step: on a static interval with g_00 < 0, hydrostatic balance dp = -(ρ+p) d ln √(-g_00) and the equilibrium Gibbs relation dp = (ρ+p) d ln T, with ρ+p ≠ 0, give T √(-g_00) equal at the endpoints. The 1930 writing T √g_44 agrees when g_44 = -g_00. Real.sqrt g_00 = 0 when g_00 < 0, so the product without the minus is 0. d ln T = 0 is not g dr/c². Not a horizon temperature and not PhysJS.HawkingUnruh.dictionary. T ‖ξ‖ = const is out of scope. The hydrostatic equation is not derived from ∇_μ T^{μν} = 0, and the Gibbs relation is not derived from an equation of state',
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-69",
    bridgeId: "be-69",
    theorem: "PhysJS.FastMagnetosonic.speed_eq",
    covers:
      "derivation-step: a monochromatic compressional polarization perpendicular to a uniform field, with ∂b/∂t = −B ∂v/∂x, ∂δρ/∂t = −ρ ∂v/∂x, δp = c_s² δρ, and ρ ∂v/∂t = −∂δp/∂x − (B/μ0) ∂b/∂x, has phase speed |ω/k| = √(c_s² + B²/(μ0 ρ)) for μ0 > 0, ρ > 0, and k ≠ 0. The velocity wave is not identically zero. c_s² = γ p / ρ is a reading of the closure, not an energy equation. The textbook quartic at k_∥ = 0 has roots ω² = 0 and ω² = (c_s² + v_A²) k²; ω = 0 does not solve compressional induction. √(c_s² + v_A²) is not c_s, not v_A, and not c_s + v_A when the other speed is nonzero. c_s = 0 recovers B/√(μ0 ρ), the Alfvén value of a different polarization. A factor C ≠ 1 is not the catalog speed. Not a kinetic dispersion relation, and not the oblique fast mode. The linearized equations are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    perpendicularQuartic: {
      theorem: "PhysJS.FastMagnetosonic.perpendicular_of_dispersion",
      covers: "derivation-step: if ω⁴ − ω² k² (c_s² + v_A²) + c_s² v_A² k² k_∥² = 0 and k_∥ = 0, then ω² = 0 or ω² = (c_s² + v_A²) k². The quartic is a hypothesis. The compressional polarization selects the second root",
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: "be-70",
    bridgeId: "be-70",
    theorem: "PhysJS.EinsteinRelation.diffusion_eq",
    covers:
      "derivation-step: for the Boltzmann profile n = n_ref exp(−q V/(k_B T)) with n_ref > 0, k_B T ≠ 0, and q ≠ 0, a nonzero field E = −dV/dx at which the drift flux μ n E cancels the diffusion flux D dn/dx gives D = μ k_B T / q. The force-mobility writing D = μ_force k_B T needs μ_force = μ/q. Dropping q fails when q ≠ 1. The Fermi-liquid form μ E_F / q fails when E_F ≠ k_B T. Stokes–Einstein fails unless μ/q = 1/(6 π η a). A factor C ≠ 1 is not this diffusivity. Not a master equation, and not a Fermi liquid",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-71",
    bridgeId: "be-71",
    theorem: "PhysJS.Clapeyron.slope_eq",
    covers:
      "derivation-step: where the specific Gibbs energies agree along coexistence and each phase obeys dg = −s dT + v dP, dP/dT = (s2−s1)/(v2−v1). With L = T (s2−s1), T ≠ 0, and Δv ≠ 0, dP/dT = L/(T Δv). Dropping T fails when T ≠ 1. Replacing Δv by one phase volume fails when the other volume is nonzero. A factor C ≠ 1 is not this slope. Not the ideal-gas integrated vapor-pressure law. The Gibbs differential is a hypothesis, not a Legendre transform",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-72",
    bridgeId: "be-72",
    theorem: "PhysJS.GravitationalRedshift.frequency_ratio",
    covers:
      "derivation-step: two static observers of one coordinate period, with ν √(−g_00) = 1/Δt and g_00 < 0, have ν1/ν2 = √(−g2)/√(−g1) = √(g2/g1). If the Tolman products T √(−g_00) also agree, then T1/T2 = ν1/ν2. Equal temperatures on g_00 = −1 and g_00 = −4 are not a Tolman equilibrium, while the frequency ratio is 2. For g_00 = −(1+2Φ/c²) at c = 1, Φ = 0 and Φ = 4, the exact ratio is neither (Φ2−Φ1)/c² nor 1+(Φ2−Φ1)/c². z = 0 is not Φ/c². Not PhysJS.TolmanEhrenfest.hydrostatic_constant, not a horizon temperature, and not PhysJS.HawkingUnruh.dictionary",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
    tolmanRatio: {
      theorem: "PhysJS.GravitationalRedshift.tolman_same_ratio",
      covers: "derivation-step: if T √(−g_00) agrees at two static observers and the frequency ratio equals √(−g2)/√(−g1), then T1/T2 = ν1/ν2. Neither factor is derived from the other",
      coverage: PHYSJS_COVERAGE,
      leanProof: 'complete',
      axioms: PHYSJS_AXIOMS,
    },
  },
  {
    key: "be-73",
    bridgeId: "be-73",
    theorem: "PhysJS.KelvinRelation.peltier_eq",
    covers:
      "derivation-step: for J_e = L11 E/T + L12 (−∇T)/T² and J_q = L21 E/T + L22 (−∇T)/T², the open-circuit Seebeck coefficient S = E/∇T and the isothermal Peltier coefficient Π = J_q/J_e satisfy Π = S T when L12 = L21. That equality is ThermoelectricOnsager.onsager, a structure field naming microscopic reversibility, not an axiom. Without it the two coefficients disagree. Not the first Thomson relation μ = T dS/dT, and not a measured thermopower. The linear fluxes are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },

  {
    key: "be-74",
    bridgeId: "be-74",
    theorem: "PhysJS.MagneticPressure.pressure_eq",
    covers:
      "derivation-step: a linear inductor with dU/dI = L I and U(0) = 0 stores U = (L/2) I². A long solenoid with B = μ0 n I and flux linkage Λ = (n ℓ) B A has L = μ0 n² V. At fixed current the battery supplies I ΔΛ. The stored energy rises by half of that, and the difference is the mechanical work p ΔV, so p = B²/(2 μ0). Homogeneity in B and μ0 gives p = C B²/μ0 with C unfixed. C = 1 is the battery work per volume, not this pressure. Not a kinetic pressure, and not a Lagrangian derivation of the Maxwell stress tensor. Ampere's law, the flux linkage, and the quasistatic work balance are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-75",
    bridgeId: "be-75",
    theorem: "PhysJS.LondonPenetration.depth_eq",
    covers:
      "derivation-step: on B(x) = B0 exp(−x/λ) with λ > 0, Ampere's law j = −(1/μ0) dB/dx and the London equation dj/dx = −(n e²/m) B give λ = √(m/(μ0 n e²)). e is the elementary charge. The dimension matrix of {m, μ0, n, e} admits both that monomial and μ0 e²/m, so units do not choose. Those lengths disagree when n (μ0 e²/m)³ ≠ 1. The growing exponential is not the screened field. Replacing e by 2e at the same n and m fails, and dropping the square on e fails when e ≠ 1. A factor C ≠ 1 is not this depth. Not the classical skin depth. The London equation and Ampere's law are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-76",
    bridgeId: "be-76",
    theorem: "PhysJS.PlasmaBeta.beta_eq",
    covers:
      "derivation-step: β = p_gas / p_B where p_B is PhysJS.MagneticPressure.pressure_eq, so β = p_gas / (B²/(2 μ0)) = 2 μ0 p_gas / B². The ideal-gas closure p_gas = n k_B T gives β = 2 μ0 n k_B T / B². B ≠ 0. Using B²/μ0 in place of the magnetic pressure is a different ratio. The constant 1 is dimensionless and is not this beta when the ratio is not 1. A factor C ≠ 1 is not this beta. Dropping p = n k_B T fails. Not a unique monomial, and not a plasma-β inequality",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },

  {
    key: "be-77",
    bridgeId: "be-77",
    theorem: "PhysJS.HagenPoiseuille.flow_eq",
    covers:
      "derivation-step: steady axisymmetric Newtonian flow with d/dr (r du/dr) = (G/\u03bc) r, centerline slope 0, and no-slip u(R) = 0 integrates to u = (G/(4\u03bc))(r\u00b2\u2212R\u00b2). With G = \u2212\u0394P/L the flux Q = \u222b u 2\u03c0 r dr is \u03c0 R\u2074 \u0394P/(8 \u03bc L). Darcy's definition then gives f_D Re = 64. The same wall shear with the Fanning normalization is 16. A factor other than 8 is not this flux. Not a square duct. The axial balance, no-slip, and the Darcy definitions are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-78",
    bridgeId: "be-78",
    theorem: "PhysJS.EulerBuckling.critical_load",
    covers:
      "derivation-step: the Euler\u2013Bernoulli balance y'' = \u2212\u03c9\u00b2 y with \u03c9\u00b2 = P/(E I) and pinned ends y(0) = y(L) = 0 has the eigenfunction sin(\u03c0 x/L) at P = \u03c0\u00b2 E I/L\u00b2, and every nontrivial solution has \u03c9 L = n \u03c0 for a nonzero integer n, so the load is at least that value. The clamped-free column is \u03c0\u00b2 E I/(4 L\u00b2). That factor is not the pinned load. Not read off from units. The beam equation is a hypothesis",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-79",
    bridgeId: "be-79",
    theorem: "PhysJS.PullIn.pull_in_eq",
    covers:
      "derivation-step: C = \u03b50 A/g has dC/dg = \u2212\u03b50 A/g\u00b2. Equilibrium of a linear spring against the coenergy force is k(g0\u2212g) = \u03b50 A V\u00b2/(2 g\u00b2), so V\u00b2 is proportional to (g0\u2212g) g\u00b2. The derivative 2 g0 g \u2212 3 g\u00b2 vanishes only at g = 0 and g = 2 g0/3, and the second derivative at the fold is \u22122 g0. Substituting the gap gives V_pi\u00b2 = 8 k g0\u00b3/(27 \u03b50 A) = 8 k g0\u00b2/(27 C0) with C0 = \u03b50 A/g0. g = g0/2 is not the fold. Not a fringing field. The parallel-plate law and the quasi-static balance are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-80",
    bridgeId: "be-80",
    theorem: "PhysJS.MottGurney.current_eq",
    covers:
      "derivation-step: drift J = q n \u03bc E and Poisson dE/dx = q n/\u03b5 give E dE/dx = J/(\u03b5 \u03bc). With E(0) = 0 the integral is E\u00b2/2 = J x/(\u03b5 \u03bc). The nonnegative root integrated from 0 to d is V = sqrt(2 J/(\u03b5 \u03bc)) (2/3) d^{3/2}, so J = (9/8) \u03b5 \u03bc V\u00b2/d\u00b3. A factor other than 9/8 is not this current. Not Child\u2013Langmuir. Drift, Poisson, and the injecting contact are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-81",
    bridgeId: "be-81",
    theorem: "PhysJS.ChildLangmuir.current_eq",
    covers:
      "derivation-step: collisionless energy (1/2) m v\u00b2 = e \u03c6, J = \u03c1 v, and Poisson \u03c6'' = \u03c1/\u03b50 give J = \u03b50 \u03c6'' v. A power \u03c6 \u221d x^\u03b1 makes \u03c6'' v independent of x only for \u03b1 = 4/3. The profile \u03c6 = V (x/d)^{4/3} has \u03c6(0) = 0, \u03c6(d) = V, and cathode field 0, and for x > 0 its current is (4 \u03b50/9) sqrt(2 e/m) V^{3/2}/d\u00b2. e is the elementary charge. The Mott\u2013Gurney exponent 3/2 does not cancel. Poisson is not claimed at x = 0. Not a drift-only solid",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-82",
    bridgeId: "be-82",
    theorem: "PhysJS.ShockleyDiode.shockley_eq",
    covers:
      "derivation-step: quasi-equilibrium multiplies the equilibrium flux by exp(e V/(\u03b7 k_B T)). Ideality 1 sets \u03b7 = 1. Detailed balance sets the reverse flux equal to the forward flux at V = 0, and low injection keeps that reverse flux under bias. The net current is I = I_s (exp(e V/(k_B T)) \u2212 1). Zero bias carries zero current. Ideality 2 is not this current when e V \u2260 0. e is the elementary charge. Not a diffusion-length ODE",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-83",
    bridgeId: "be-83",
    theorem: "PhysJS.Thomson.thomson_eq",
    covers:
      "derivation-step: the Kelvin relation \u03a0(t) = S(t) t, which is PhysJS.KelvinRelation.peltier_eq read along temperature, and the Thomson split \u03bc = d\u03a0/dT \u2212 S, give \u03bc = T dS/dT by the product rule. d\u03a0/dT is not \u03bc when S T \u2260 0. Not a second copy of \u03a0 = S T. The functional Kelvin relation and the Thomson split are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-84",
    bridgeId: "be-84",
    theorem: "PhysJS.FourPoint.sheet_eq",
    covers:
      "derivation-step: on an infinite sheet the radial field of a point current is (I R_s)/(2 \u03c0 r), and the potential drop is the integral of 1/r. Probes at 0, s, 2s, and 3s, with current in at 0 and out at 3s, each contribute (I R_s/(2 \u03c0)) ln 2 on the inner pair. Superposition gives R_s = (\u03c0/ln 2)(V/I). A sink at 4s gives 2\u03c0/ln 3 instead. Not PhysJS.Crossing.antisymmetry. The Laplace field and linear superposition are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-85",
    bridgeId: "be-85",
    theorem: "PhysJS.ShotNoise.shot_eq",
    covers:
      "derivation-step: in a window of length T the count N has mean (I/e) T, and the Poisson premise is Var(N) = mean(N). Charge e scales the variance by e\u00b2 and the windowed current divides by T, so Var(I) = e I/T. The one-sided bandwidth of that window is \u0394f = 1/(2 T), and S_I = Var(I)/\u0394f is 2 e I. The two-sided bandwidth \u0394f = 1/T gives e I. e is the elementary charge. Not a Fourier theorem and not Johnson\u2013Nyquist. The Poisson variance and the one-sided convention are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-86",
    bridgeId: "be-86",
    theorem: "PhysJS.ReynoldsAnalogy.reynolds_eq",
    covers:
      "derivation-step: wall fluxes \u03c4 = \u03bc du/dy and q = k dT/dy, with C_f = \u03c4/(\u03c1 U\u00b2/2), h = q/\u0394T, St = h/(\u03c1 U c_p), and Pr = \u03bc c_p/k, satisfy St Pr = C_f/2 when the normalized wall gradients agree. That common slope is the equal-diffusivity hypothesis. At Pr = 1, St = C_f/2. Pr \u2260 1 with nonzero skin friction is not this equality. Not a Nusselt correlation",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-87",
    bridgeId: "be-87",
    theorem: "PhysJS.CapacitorNoise.noise_eq",
    covers:
      "derivation-step: dU/dV = C V and U(0) = 0 integrate to U = (C/2) V\u00b2. The normalized Boltzmann weight of that energy is the Gaussian of mean 0 and variance k_B T/C, because the partition function is the Gaussian integral. The mean square on that law is k_B T/C, and (C/2) of it is (1/2) k_B T. (3/2) k_B T/C is not this variance. Dropping the energy half replaces it by k_B T/(2 C). Not three kinetic degrees of freedom",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-88",
    bridgeId: "be-88",
    theorem: "PhysJS.FermiSea.fermi_sea",
    covers:
      "derivation-step: two spin states times the sphere (4π/3) k_F³/(2π)³ give n, so k_F³ = 3 π² n and the nonnegative root is k_F = (3 π² n)^{1/3}. The isotropic parabola E = ℏ² k²/(2 m*) is E_F at k_F. Its first derivative is v_F = ℏ k_F/m*, and ℏ⁻² times the second derivative is 1/m*. One spin is k_F³ = 6 π² n. Not a lattice band. The band, the two-spin count, and T = 0 are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-89",
    bridgeId: "be-89",
    theorem: "PhysJS.DebyeCutoff.debye_cutoff",
    covers:
      "derivation-step: three acoustic branches filling 3n states, 3·(4π/3) k_D³/(2π)³ = 3n, give k_D³ = 6 π² n. A linear branch ω_D = v_s k_D is ω_D = v_s (6 π² n)^{1/3}. Equating the three-branch sum to n gives k_D³ = 2 π² n. The branch count and the common speed are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-90",
    bridgeId: "be-90",
    theorem: "PhysJS.DebyeHeat.debye_heat",
    covers:
      "derivation-step: the mode integral ∫₀^{ω_D} 9 N ω²/ω_D³ dω = 3 N. The Debye energy with the integral extended to infinity is the hypothesis U = 9 N k_B T (T/θ_D)³ I, and I = π⁴/15 is a hypothesis, not an evaluation of ∫ x³/(exp(x)−1) dx. Nine times π⁴/15 is 3 π⁴/5, and U = A T⁴ differentiates to C_V = (12 π⁴/5) N k_B (T/θ_D)³. The energy prefactor 3 π⁴/5 is not the heat capacity. The phonon integral, the extension to infinity, and π⁴/15 are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-91",
    bridgeId: "be-91",
    theorem: "PhysJS.EinsteinSolid.einstein_heat",
    covers:
      "derivation-step: three Planck oscillators per atom, each of energy k_B θ_E/(exp(θ_E/T)−1), differentiate to C_V = 3 N k_B (θ_E/T)² exp(θ_E/T)/(exp(θ_E/T)−1)². The zero-point k_B θ_E/2 is constant. The kernel x² e^x/(e^x−1)² tends to 1 as x → 0⁺, so the high-temperature limit is 3 N k_B. One oscillator tends to N k_B. Three oscillators and the Einstein spectrum are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-92",
    bridgeId: "be-92",
    theorem: "PhysJS.SommerfeldHeat.electronic_heat",
    covers:
      "derivation-step: the Sommerfeld energy correction δU = (π²/6) (k_B T)² g(E_F) is a hypothesis, and its temperature derivative is c_V = (π²/3) k_B² T g(E_F). PhysJS.FermiSea.dos_factor is g(E_F) = (3/2) n/E_F for a √E density, so c_V = (π²/2) n k_B² T/E_F. A flat density g = n/E_F leaves π²/3. Not the Wiedemann–Franz law and not a second proof of be-61",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-93",
    bridgeId: "be-93",
    theorem: "PhysJS.CurieWeiss.curie_weiss",
    covers:
      "derivation-step: linear response χ k_B T = μ₀ n (g μ_B)² ⟨S_z²⟩ with the high-temperature moment ⟨S_z²⟩ = S(S+1)/3 gives the Curie constant C = μ₀ n g² μ_B² S(S+1)/(3 k_B). Equal weights on m = ±1/2 give 1/4 = S(S+1)/3 at S = 1/2. Mean field B_eff = B + λ M with θ = C λ/μ₀ gives χ = C/(T−θ). θ = 0 is C/T. A classical moment uses μ²/3. The second moment and the mean-field shift are hypotheses. Not an su(2) derivation",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-94",
    bridgeId: "be-94",
    theorem: "PhysJS.PauliParamagnetism.pauli",
    covers:
      "derivation-step: the Zeeman imbalance M = μ_B² g(E_F) B is a hypothesis, and χ_P = μ₀ M/B is μ₀ μ_B² g(E_F). PhysJS.FermiSea.dos_factor supplies g(E_F) = (3/2) n/E_F, so χ_P = μ₀ μ_B² (3 n)/(2 E_F). A flat density leaves the factor 1. Not Landau diamagnetism",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-95",
    bridgeId: "be-95",
    theorem: "PhysJS.GinzburgLandau.type_boundary",
    covers:
      "derivation-step: in the normalization with gradient coefficient 1/κ², quartic (1/2)(1−f²)², and field B², the density at κ² = 1/2 is (√2 f' − a f)² + (B + (1−f²)/√2)² minus √2 times the derivative of a(1−f²). Vanishing squares and equal endpoints make that wall integral zero. A trial profile with that critical integral has energy (1/κ² − 2) times the gradient integral: negative when κ > 1/√2, zero at κ = 1/√2, and positive when κ < 1/√2. The positive side is this trial, not every minimizer. The GL density and the profile are hypotheses",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-96",
    bridgeId: "be-96",
    theorem: "PhysJS.UpperCritical.critical_field",
    covers:
      "derivation-step: the linearized GL instability sets the Landau-level ground energy ℏ q B/(2 m*) of charge q = 2e equal to |α| = ℏ²/(2 m* ξ²). That level is a hypothesis, not the spectrum of the covariant Laplacian. The field is B = ℏ/(2 e ξ²). With Φ₀ = h/(2e) and h = 2 π ℏ this is B_c2 = Φ₀/(2 π ξ²). Charge e instead of 2e is a different field",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-97",
    bridgeId: "be-97",
    theorem: "PhysJS.AmbegaokarBaratoff.ambegaokar_baratoff",
    covers:
      "derivation-step: the chain rule along E = Δ cosh t pulls the coherence-factor integrand back to sech t for t > 0. ∫₀^T sech = arctan(sinh T), and the limit T → ∞ is π/2. The tunnel Hamiltonian at zero temperature and identical gaps is the hypothesis that e I_c R_n is Δ times that improper integral, so I_c R_n = π Δ/(2 e). A coefficient other than π/2 fails. Not the finite-temperature tanh factor",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-98",
    bridgeId: "be-98",
    theorem: "PhysJS.BcsJump.heat_jump",
    covers:
      "derivation-step: the weak-coupling excess free energy F = N(0) (T−T_c)/T_c · Δ² + 7 ζ N(0)/(16 π² T_c²) · Δ⁴ is a hypothesis, with k_B = 1. Its minimum is −α₀² (T−T_c)²/(4 β), and −T ∂²F/∂T² at T_c is ΔC = T_c α₀²/(2 β) = 8 π² N(0) T_c/(7 ζ). The normal heat capacity C_n = (2 π²/3) N(0) T_c is the both-spin Sommerfeld value, a hypothesis. The ratio is 12/(7 ζ). ζ is the quartic coefficient, not a series evaluation. One spin in C_n misses the ratio. Not 2π exp(−γ)",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-99",
    bridgeId: "be-99",
    theorem: "PhysJS.MassAction.mass_action",
    covers:
      "derivation-step: the Boltzmann tails n = N_c exp(−(E_c−μ)/(k_B T)) and p = N_v exp(−(μ−E_v)/(k_B T)), with E_g = E_c − E_v, multiply to N_c N_v exp(−E_g/(k_B T)). That product is the square of n_i = √(N_c N_v) exp(−E_g/(2 k_B T)). Dropping the 2 in the exponent is a different density. The tails are hypotheses. Not a Fermi–Dirac integral",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-100",
    bridgeId: "be-100",
    theorem: "PhysJS.LyddaneSachsTeller.lst",
    covers:
      "derivation-step: the undamped oscillator ε(ω) = ε(∞) + S/(ω_TO² − ω²) has a zero at ω_LO, which fixes S, and ε(0) is the same function at zero frequency. The ratio is ω_LO²/ω_TO² = ε(0)/ε(∞). The unsquared frequency ratio fails when ω_LO ≠ ω_TO. No damping is a hypothesis",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-101",
    bridgeId: "be-101",
    theorem: "PhysJS.BktJump.bkt_jump",
    covers:
      "derivation-step: the phase gradient of a θ = φ vortex integrates to π J ln(R/a) between the core and radius R. The entropy hypothesis is the area of core positions, S = k_B ln((R/a)²) = 2 k_B ln(R/a). The free energy E − T S vanishes at a radius past the core only when k_B T = π J/2. Circumference entropy unbinds at π J. J is the stiffness in the vortex energy. Not the renormalization-group flow",
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: "be-102",
    bridgeId: "be-102",
    theorem: "PhysJS.LandauerConductance.conductance_eq",
    covers:
      "derivation-step: a one-dimensional mode of speed v in a length L has density of states L/(h v) per spin, and the flux times v/L cancels to 1/h. Current is spin · e · (Σ T_n) · (1/h) · Δμ with spin = 2 and Δμ = e V, so G = (2 e²/h) Σ T_n. One spin is e²/h. The transmissions and the bias window are hypotheses. Not the Hall conductance and not Landauer erasure",
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
 * `SpringLc` and `DampedRlc` are namespaces inside `lean/OscillatorDictionary.lean`,
 * not their own files. Rechecked at this pin.
 */
const PHYSJS_FILE_BY_NAMESPACE: Readonly<Record<string, string>> = {
  SpringLc: 'OscillatorDictionary.lean',
  DampedRlc: 'OscillatorDictionary.lean',
};

/**
 * Lean file name that contains `theorem` at the pinned commit.
 *
 * `SpringLc` and `DampedRlc` are namespaces inside `OscillatorDictionary.lean`.
 *
 * @internal
 */
export function physjsLeanFile(theorem: string): string {
  const parts = theorem.split('.');
  if (parts.length < 3 || parts[0] !== 'PhysJS' || parts[1] === undefined) {
    throw new Error(`PhysJS theorem '${theorem}' is not PhysJS.<module>.<name>`);
  }
  return PHYSJS_FILE_BY_NAMESPACE[parts[1]] ?? `${parts[1]}.lean`;
}

/**
 * Permalink to one Lean file at the pinned commit.
 *
 * PhysJS #63 stores sources at `lean/<File>.lean`. This is the only builder
 * of those URLs.
 *
 * @internal
 */
export function physjsFileUrl(file: string): string {
  return `https://github.com/danielsimonjr/PhysJS/blob/${PHYSJS_COMMIT}/lean/${file}`;
}

/** Permalink to the Lean file that contains `theorem` at the pinned commit. */
function physjsStatementUrl(theorem: string): string {
  return physjsFileUrl(physjsLeanFile(theorem));
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
  'be-66',
  'be-67',
  'be-68',
  'be-69',
  'be-70',
  'be-71',
  'be-72',
  'be-73',
  'be-74',
  'be-75',
  'be-76',
  'be-77',
  'be-78',
  'be-79',
  'be-80',
  'be-81',
  'be-82',
  'be-83',
  'be-84',
  'be-85',
  'be-86',
  'be-87',
  'be-88',
  'be-89',
  'be-90',
  'be-91',
  'be-92',
  'be-93',
  'be-94',
  'be-95',
  'be-96',
  'be-97',
  'be-98',
  'be-99',
  'be-100',
  'be-101',
  'be-102',
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
