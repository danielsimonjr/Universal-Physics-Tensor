/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit below). This module is the copy the library ships: `src/` cannot
 * import a file outside its root. `tests/atlas/physjs-manifest.test.ts` fails when
 * the file and this copy disagree on the commit, a theorem, a key, or the
 * coverage phrase.
 *
 * The commit is PhysJS `main` `d1c1b18fb54d5fe3aa14f8307b5349b0d672d70c`.
 * Milestone 1's six top-level theorems are unchanged. Milestone 2 adds four
 * entries. The five rank-1 entries also carry a nested `planeWave` object.
 * That object is not a `formalRef`.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef } from './types.js';

/** PhysJS commit the vendored manifest records. @internal */
export const PHYSJS_COMMIT = 'd1c1b18fb54d5fe3aa14f8307b5349b0d672d70c';

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

/**
 * Rank 1a, nested on a rank-1 entry. A plane wave solves the PDE if and only
 * if its frequency obeys the dispersion relation. It is not the entry's
 * `formalRef`: that decision is the owner's.
 */
interface PhysjsPlaneWave {
  readonly theorem: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

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
  readonly planeWave?: PhysjsPlaneWave;
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

/** The nested rank-1a object. The top-level theorem stays `covers_bound_delta`. */
function planeWave(namespace: string): PhysjsPlaneWave {
  return {
    theorem: `PhysJS.${namespace}.planeWave_iff_dispersion`,
    covers: PLANE_WAVE_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  };
}

/**
 * The ten entries, in manifest order. A bridge obtains its reference by key
 * through {@link physjsFormalRef}; it does not name a theorem of its own.
 * `planeWave` is recorded and is not that reference.
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

function samePlaneWave(compiled: PhysjsPlaneWave | undefined, manifest: PhysjsPlaneWave | undefined): boolean {
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
 * Problems in the vendored manifest against the bridges that claim to be keyed
 * by it. Empty means every entry resolves to a `lean4-physjs` reference whose
 * theorem, axioms, commit and coverage phrase are the entry's own.
 *
 * A wrong commit, theorem, key or coverage phrase is a problem. A manifest
 * entry with no bridge is a problem. A `lean4-physjs` reference with no entry
 * is a problem: the gate does not skip that system. A nested `planeWave`
 * object is kept and compared; naming it as the `formalRef` is a problem.
 * The top-level theorem stays the reference.
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
    if (entry.planeWave !== undefined) {
      if (entry.planeWave.coverage !== PHYSJS_COVERAGE) {
        problems.push(
          `planeWave coverage phrase for '${entry.key}' is '${entry.planeWave.coverage}', expected '${PHYSJS_COVERAGE}'`,
        );
      }
      if (entry.planeWave.leanProof !== 'complete') {
        problems.push(`planeWave leanProof for '${entry.key}' is '${entry.planeWave.leanProof}', expected 'complete'`);
      }
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
    if (ref.statement !== entry.theorem) {
      problems.push(`bridge '${entry.key}' theorem is '${ref.statement}', manifest theorem is '${entry.theorem}'`);
    }
    if (!sameAxioms(ref.axioms, entry.axioms)) {
      problems.push(
        `bridge '${entry.key}' axioms [${ref.axioms.join(', ')}] differ from the manifest [${entry.axioms.join(', ')}]`,
      );
    }
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
      !samePlaneWave(compiled.planeWave, entry.planeWave)
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
