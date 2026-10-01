/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit below). This module is the copy the library ships: `src/` cannot
 * import a file outside its root. `tests/atlas/physjs-manifest.test.ts` fails when
 * the file and this copy disagree on the commit, a theorem, a key, or the
 * coverage phrase.
 *
 * The commit is PhysJS `main` `57a9ecbc851952d539882400a7176926d2990d34`.
 * Milestone 1's six top-level theorems are unchanged. Milestone 2 adds four
 * atlas entries. Milestone 2b adds fifteen catalog entries, keyed `be-<n>`:
 * nine counted rows and six labeled rows. A counted covers line begins with
 * `reduction`, `limit`, or `derivation-step`. A labeled covers line begins
 * with `property` or `cross-check`. A nested object (`planeWave`, `oneLoop`,
 * `inversion`, `vacuum`) is recorded and is not a `formalRef`.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef } from './types.js';

/** PhysJS commit the vendored manifest records. @internal */
export const PHYSJS_COMMIT = '57a9ecbc851952d539882400a7176926d2990d34';

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
const NESTED_FIELDS = ['planeWave', 'oneLoop', 'inversion', 'vacuum'] as const;

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
 * The twenty-five entries, in manifest order. A bridge obtains its reference by key
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
    theorem: 'PhysJS.Landauer.equal_levels',
    covers:
      'property: equal two-state levels have thermodynamic entropy k_B log 2. At T ≠ 0, levels E and E+δ are not that value. At T = 0 the closed form does not separate the levels. Not E ≥ T ΔS, and not the Bérut confrontation',
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
];

const entryByKey = new Map(PHYSJS_ENTRIES.map((entry) => [entry.key, entry]));

/** `formalRef.version` for the pinned manifest. */
function physjsVersion(): string {
  return `physjs@${PHYSJS_COMMIT} ${PHYSJS_TOOLCHAIN} mathlib:${PHYSJS_MATHLIB} physlib@${PHYSJS_PHYS_LIB}`;
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
  return {
    system: 'lean4-physjs',
    statement: entry.theorem,
    version: physjsVersion(),
    axioms: entry.axioms,
    fidelity: 'sanity-lemmas',
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
