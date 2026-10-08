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
 * with `property` or `cross-check`. A field of a manifest entry outside the
 * base fields is a nested statement: a second theorem on the same entry,
 * named by the field, with no key. It is recorded and compared, and it is not
 * a `formalRef`. The generator reads it by its shape, so a new nested name
 * needs no edit here. The sentence that the nested names are a fixed list in
 * this module and in the generator is the record from before that change.
 * PhysJS #66 adds be-103 through be-125. The sentence that the pin is
 * `03e8bb77c952f720bdd2730af2afc6a7f2d36243` and that the table stops at
 * be-102 is the record from before that pin. PhysJS #67 adds be-126 through
 * be-133. The sentence that the pin is
 * `d519c2c6504e7fbbd2cf6932f9e52981ce595a0f` and that the table stops at
 * be-125 is the record from before that pin. PhysJS #68 adds be-134 through
 * be-146. The sentence that the pin is
 * `8515c621d1c6e6d31c2eea4467181eb85d58234b` and that the table stops at
 * be-133 is the record from before that pin.
 *
 * @module atlas/physjs-ref
 */

import type { FormalRef, FormalRefKind } from './types.js';
import { catalogEntry, parseBridgeId } from '../bridges/catalog-load.js';
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

/** One statement the manifest records: an entry's own, or a nested one. */
interface PhysjsStatement {
  readonly theorem: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

/** The fields of a manifest entry. Any other field is a nested statement. */
const BASE_FIELDS = new Set<string>(['key', 'bridgeId', 'theorem', 'covers', 'coverage', 'leanProof', 'axioms', 'imports']);

/** The fields of a statement, sorted. A nested field with exactly these is a statement. */
const STATEMENT_FIELDS = ['axioms', 'coverage', 'covers', 'leanProof', 'theorem'] as const;

/** Counted catalog kinds. Not a property and not a cross-check. */
const COUNTED_KIND = /^(reduction|limit|derivation-step): /;

/**
 * Labeled catalog kinds. A reader tells them from a counted statement by
 * this word. They occupy a catalog `formalRef` and are not the counted kind.
 */
const LABELED_KIND = /^(property|cross-check): /;

/** A compiled statement: the manifest's fields and the Lean file that declares its theorem. */
interface PhysjsCompiledStatement extends PhysjsStatement {
  /** `<File>.lean` under `lean/` at the pin, from `formal/physjs/theorem-files.json`. */
  readonly file: string;
}

/** A nested statement, named by its manifest field. No key. Not a `formalRef`. */
interface PhysjsNestedStatement extends PhysjsCompiledStatement {
  readonly name: string;
}

/** One compiled entry: its own statement, and every nested statement by name. */
interface PhysjsEntry extends PhysjsCompiledStatement {
  readonly key: string;
  readonly bridgeId: string;
  readonly imports?: string;
  readonly nested: readonly PhysjsNestedStatement[];
}

/**
 * One manifest entry as PhysJS writes it: the base fields, and each nested
 * statement under a field of its own (`planeWave`, `corollary`).
 * @internal
 */
export interface PhysjsManifestEntry extends PhysjsStatement {
  readonly key: string;
  readonly bridgeId: string;
  readonly imports?: string;
  readonly [field: string]: unknown;
}

/**
 * The nested statements of a manifest entry, in field order: every field
 * outside the base fields whose value has exactly the statement fields. A
 * field that is neither is returned in `problems`.
 * @internal
 */
export function physjsNestedStatements(entry: PhysjsManifestEntry): {
  readonly nested: readonly (PhysjsStatement & { readonly name: string })[];
  readonly problems: readonly string[];
} {
  const nested: (PhysjsStatement & { readonly name: string })[] = [];
  const problems: string[] = [];
  for (const [field, value] of Object.entries(entry)) {
    if (BASE_FIELDS.has(field)) continue;
    const keys = typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value).sort() : [];
    if (keys.join() === STATEMENT_FIELDS.join()) nested.push({ name: field, ...(value as PhysjsStatement) });
    else problems.push(`manifest entry '${entry.key}' has unexpected field '${field}'`);
  }
  return { nested, problems };
}

/** The vendored manifest, as this module compares it. @internal */
export interface PhysjsManifestFile {
  readonly schema: string;
  readonly commit: string;
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
  readonly entries: readonly PhysjsManifestEntry[];
}

const PHYSJS_ENTRIES: readonly PhysjsEntry[] = GENERATED_PHYSJS_ENTRIES;

const entryByKey = new Map(PHYSJS_ENTRIES.map((entry) => [entry.key, entry]));

/** Theorem → its Lean file, for every statement of the compiled table, nested ones included. */
const FILE_BY_THEOREM: ReadonlyMap<string, string> = new Map(
  PHYSJS_ENTRIES.flatMap((entry) => [entry, ...entry.nested].map((statement) => [statement.theorem, statement.file] as const)),
);

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
 * Lean file name that contains `theorem` at the pinned commit.
 *
 * Read from the compiled table, which copies `formal/physjs/theorem-files.json`:
 * the file is where the theorem is declared, not its namespace
 * (`PhysJS.Einstein.friedmann_corollary` is in `VacuumFriedmann.lean`;
 * `PhysJS.SpringLc` is a namespace inside `OscillatorDictionary.lean`).
 * Throws for a theorem the manifest does not name.
 *
 * @internal
 */
export function physjsLeanFile(theorem: string): string {
  const file = FILE_BY_THEOREM.get(theorem);
  if (file === undefined) throw new Error(`PhysJS theorem '${theorem}' is not a statement of the vendored manifest`);
  return file;
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
 * Atlas keys are bridges. A catalog key takes the reviewed kind its entry
 * records as `formalKind` (`bridge` when the theorem states the catalogued
 * equation, `property` when it states a property of it); otherwise its kind
 * is the covers prefix.
 */
function formalRefKind(key: string, covers: string): FormalRefKind | undefined {
  if (key.startsWith('ab-')) return 'bridge';
  if (key.startsWith('be-')) {
    const override = catalogEntry(parseBridgeId(key))?.formalKind;
    if (override !== undefined) return override;
  }
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

function sameStatement(compiled: PhysjsStatement, manifest: PhysjsStatement): boolean {
  return (
    compiled.theorem === manifest.theorem &&
    compiled.covers === manifest.covers &&
    compiled.coverage === manifest.coverage &&
    compiled.leanProof === manifest.leanProof &&
    sameAxioms(compiled.axioms, manifest.axioms)
  );
}

/** The compiled nested statements are the manifest's: the same names, in order, each the same statement. */
function sameNested(
  compiled: readonly PhysjsNestedStatement[],
  manifest: readonly (PhysjsStatement & { readonly name: string })[],
): boolean {
  return (
    compiled.length === manifest.length &&
    compiled.every((statement, i) => statement.name === manifest[i]!.name && sameStatement(statement, manifest[i]!))
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
    const { nested, problems: fieldProblems } = physjsNestedStatements(entry);
    problems.push(...fieldProblems);
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
    for (const statement of nested) {
      if (statement.coverage !== PHYSJS_COVERAGE) {
        problems.push(
          `${statement.name} coverage phrase for '${entry.key}' is '${statement.coverage}', expected '${PHYSJS_COVERAGE}'`,
        );
      }
      if (statement.leanProof !== 'complete') {
        problems.push(`${statement.name} leanProof for '${entry.key}' is '${statement.leanProof}', expected 'complete'`);
      }
      problems.push(...catalogCoversProblems(entry.key, statement.covers, `${statement.name} covers`));
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
    for (const statement of nested) {
      if (ref.statement === statement.theorem) {
        problems.push(
          `bridge '${entry.key}' formalRef names the nested ${statement.name} theorem '${statement.theorem}'; the top-level theorem stays the reference`,
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
    const file = FILE_BY_THEOREM.get(entry.theorem);
    if (file === undefined) {
      problems.push(`manifest theorem '${entry.theorem}' has no Lean file in formal/physjs/theorem-files.json`);
    } else if (ref.url !== physjsFileUrl(file)) {
      problems.push(`bridge '${entry.key}' url is '${ref.url}', expected '${physjsFileUrl(file)}'`);
    }
    const compiled = compiledByKey.get(entry.key);
    if (compiled === undefined) {
      problems.push(`manifest key '${entry.key}' is not in the compiled entry table`);
    } else if (
      compiled.theorem !== entry.theorem ||
      compiled.covers !== entry.covers ||
      compiled.coverage !== entry.coverage ||
      !sameNested(compiled.nested, nested)
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
