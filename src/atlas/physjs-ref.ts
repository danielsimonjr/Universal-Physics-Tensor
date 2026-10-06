/**
 * Reviewed `formalRef`s keyed by the vendored PhysJS bridge manifest.
 *
 * The manifest file is `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json`
 * at the commit that file records). `src/` cannot import a file outside its root,
 * so `physjs-entries.generated.ts` is the table this module reads.
 * `bun run physjs:table` writes that file from the manifest and writes nothing else.
 * `tests/atlas/physjs-manifest.test.ts` fails when the file and that table disagree
 * on the commit, a theorem, a key, or the coverage phrase.
 *
 * The commit is `PHYSJS_COMMIT`, copied from the manifest. The sentence that
 * the pin is PhysJS `main` `03e8bb77c952f720bdd2730af2afc6a7f2d36243` is the
 * record from before the table was generated.
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
 * a `formalRef`. The sentence that those fourteen names are the whole nested
 * set is the record from before BE-103 through BE-125. That ingestion adds
 * `warmSound`, `cutoffL`, `whistlerLimit`, `equalTemperature`, `bohmGross`,
 * `referenceResistivity`, `lundquist`, and `bohmFlux`. PhysJS #66 adds
 * be-103 through be-125. The sentence that the pin is
 * `03e8bb77c952f720bdd2730af2afc6a7f2d36243` and that the table stops at
 * be-102 is the record from before that pin. PhysJS #67 adds be-126 through
 * be-133. The sentence that the pin is
 * `d519c2c6504e7fbbd2cf6932f9e52981ce595a0f` and that the table stops at
 * be-125 is the record from before that pin. PhysJS #68 adds be-134 through
 * be-146. The sentence that the pin is
 * `8515c621d1c6e6d31c2eea4467181eb85d58234b` and that the table stops at
 * be-133 is the record from before that pin. That ingestion adds
 * `heisenberg_fraction`.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef, FormalRefKind } from './types.js';
import {
  PHYSJS_COMMIT,
  PHYSJS_MATHLIB,
  PHYSJS_PHYS_LIB,
  PHYSJS_TOOLCHAIN,
  PHYSJS_ENTRIES as GENERATED_PHYSJS_ENTRIES,
} from './physjs-entries.generated.js';

/**
 * PhysJS commit the vendored manifest records.
 *
 * @internal
 */
export { PHYSJS_COMMIT } from './physjs-entries.generated.js';

/**
 * Every reviewed PhysJS reference covers its statement only. A lemma about
 * `bound.delta` does not certify the regime, the horizon, or the side conditions.
 */
const PHYSJS_COVERAGE = 'covers its statement only';

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
  'warmSound',
  'cutoffL',
  'whistlerLimit',
  'equalTemperature',
  'bohmGross',
  'referenceResistivity',
  'lundquist',
  'bohmFlux',
  'heisenberg_fraction',
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
  /** BE-103. Warm sound with γ_i = 3. Not the cold threshold. */
  readonly warmSound?: PhysjsNestedStatement;
  /** BE-106. The L cutoff. The Stix index is a hypothesis. Not the reference. */
  readonly cutoffL?: PhysjsNestedStatement;
  /** BE-106. The whistler limit. A hypothesis. Not the reference. */
  readonly whistlerLimit?: PhysjsNestedStatement;
  /** BE-109. Equal-temperature current. The factor 8 is not this value. */
  readonly equalTemperature?: PhysjsNestedStatement;
  /** BE-113. Bohm–Gross. It does not replace ω by ω_p in the damping prefactor. */
  readonly bohmGross?: PhysjsNestedStatement;
  /** BE-116. The reference resistivity. Not the kinetic catalog value. */
  readonly referenceResistivity?: PhysjsNestedStatement;
  /** BE-117. Lundquist over magnetic Reynolds. Not the slab time. */
  readonly lundquist?: PhysjsNestedStatement;
  /** BE-122. Bohm ion flux. Not the floating potential. */
  readonly bohmFlux?: PhysjsNestedStatement;
  /** BE-134. D = 2 J S a² and M(0) = μ_B S/a³. Not the Bloch deficit. */
  readonly heisenberg_fraction?: PhysjsNestedStatement;
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

const PHYSJS_ENTRIES: readonly PhysjsEntry[] = GENERATED_PHYSJS_ENTRIES;

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
  'be-103',
  'be-104',
  'be-105',
  'be-106',
  'be-107',
  'be-108',
  'be-109',
  'be-110',
  'be-111',
  'be-112',
  'be-113',
  'be-114',
  'be-115',
  'be-116',
  'be-117',
  'be-118',
  'be-119',
  'be-120',
  'be-121',
  'be-122',
  'be-123',
  'be-124',
  'be-125',
  'be-126',
  'be-127',
  'be-128',
  'be-129',
  'be-130',
  'be-131',
  'be-132',
  'be-133',
  'be-134',
  'be-135',
  'be-136',
  'be-137',
  'be-138',
  'be-139',
  'be-140',
  'be-141',
  'be-142',
  'be-143',
  'be-144',
  'be-145',
  'be-146',
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
  /** Defaults to the generated table. A test passes a mutated copy. */
  readonly compiledEntries?: readonly PhysjsEntry[];
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

  const compiledByKey = new Map((input.compiledEntries ?? PHYSJS_ENTRIES).map((entry) => [entry.key, entry]));
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
    const compiled = compiledByKey.get(entry.key);
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
