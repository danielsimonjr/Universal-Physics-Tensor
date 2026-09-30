/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit below). This module is the copy the library ships: `src/` cannot
 * import a file outside its root. `tests/atlas/physjs-manifest.test.ts` fails when
 * the file and this copy disagree on the commit, a theorem, a key, or the
 * coverage phrase.
 *
 * The commit is PhysJS `main` after pull requests 1 and 2 were squash-merged:
 * the Dependabot checkout bump `0e0594f`, whose parent is the proofs squash
 * `ed86b4a38536c502e4e7796dadeb8063f94d1ec1`. The theorem names are unchanged.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef } from './types.js';

/** PhysJS commit the vendored manifest records. @internal */
export const PHYSJS_COMMIT = '0e0594f';

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

/** One manifest entry, reduced to the fields a `formalRef` is built from. */
interface PhysjsEntry {
  readonly key: string;
  readonly bridgeId: string;
  readonly theorem: string;
  /** What the theorem certifies. The pendulum entry is not `bound.delta`. */
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
  readonly imports?: string;
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

/**
 * The six entries, in manifest order. A bridge obtains its reference by key
 * through {@link physjsFormalRef}; it does not name a theorem of its own.
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
  },
  {
    key: 'ab-klein-gordon-wave',
    bridgeId: 'ab-klein-gordon-wave',
    theorem: 'PhysJS.KleinGordonWave.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-stiff-string',
    bridgeId: 'ab-stiff-string',
    theorem: 'PhysJS.StiffString.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-telegraph-diffusion',
    bridgeId: 'ab-telegraph-diffusion',
    theorem: 'PhysJS.TelegraphDiffusion.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
  },
  {
    key: 'ab-telegraph-wave',
    bridgeId: 'ab-telegraph-wave',
    theorem: 'PhysJS.TelegraphWave.covers_bound_delta',
    covers: RANK1_COVERS,
    coverage: PHYSJS_COVERAGE,
    leanProof: 'complete',
    axioms: PHYSJS_AXIOMS,
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

/**
 * Problems in the vendored manifest against the bridges that claim to be keyed
 * by it. Empty means every entry resolves to a `lean4-physjs` reference whose
 * theorem, axioms, commit and coverage phrase are the entry's own.
 *
 * A wrong commit, theorem, key or coverage phrase is a problem. A manifest
 * entry with no bridge is a problem. A `lean4-physjs` reference with no entry
 * is a problem: the gate does not skip that system.
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
    } else if (compiled.theorem !== entry.theorem || compiled.covers !== entry.covers || compiled.coverage !== entry.coverage) {
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
