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
 * The commit is `PHYSJS_COMMIT`, copied from the manifest. Which PhysJS pull
 * request added which keys, and what the pin was before, is history and lives
 * in `NOTES.md` and `CHANGELOG.md`, not here.
 *
 * Each statement's `kind`, nested ones included, is the manifest's own field
 * (schema `physjs-bridge-manifest/v2`), which PhysJS reads from the kind line
 * of the Lean file that declares the theorem; this module keeps no override
 * and does not parse the covers line for it. A field of a manifest entry
 * outside the base fields is a nested statement: a second theorem on the same
 * entry, named by the field, with no key. It is recorded and compared, and it
 * is not a `formalRef`. The generator reads it by its shape, so a new nested
 * name needs no edit here.
 *
 * A reference's `fidelity` is DERIVED here, never typed on a record:
 * `physjsFidelity` reads the reviewed-row table (`physjs-reviewed.ts`) and the
 * sanity-lemma key list, and a key ahead of the catalog, or whose row is not
 * in that table, is `'unreviewed'`.
 *
 * @module atlas/physjs-ref
 */

import { createHash } from 'node:crypto';
import type { FormalFidelity, FormalRef, FormalRefKind } from './types.js';
import { FORMAL_REF_KINDS } from '../relations/types.js';
import { catalogEntries, catalogIdNumber } from '../bridges/catalog-load.js';
import { PHYSJS_REVIEWED_ROWS, PHYSJS_SANITY_LEMMA_KEYS } from './physjs-reviewed.js';
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

/**
 * The axioms a complete Lean 4 proof over Mathlib may rest on. `#print axioms`
 * of a proof with a `sorry` adds `sorryAx`, and Lean still exits 0 (TOOLS.md),
 * so every statement's list is held to this set; PhysJS reports the list and
 * this repository does not re-measure it.
 */
const PHYSJS_ALLOWED_AXIOMS: ReadonlySet<string> = new Set(['propext', 'Classical.choice', 'Quot.sound']);

/** One statement the manifest records: an entry's own, or a nested one. */
interface PhysjsStatement {
  readonly theorem: string;
  /** How the theorem relates to the equation the key names, as the manifest writes it. */
  readonly kind: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

/** The fields of a manifest entry. Any other field is a nested statement. */
const BASE_FIELDS = new Set<string>(['key', 'bridgeId', 'theorem', 'kind', 'covers', 'coverage', 'leanProof', 'axioms', 'imports']);

/** The fields of a statement, sorted. A nested field with exactly these is a statement. */
const STATEMENT_FIELDS = ['axioms', 'coverage', 'covers', 'kind', 'leanProof', 'theorem'] as const;

/** A compiled statement: the manifest's fields and the Lean file that declares its theorem. */
interface PhysjsCompiledStatement extends PhysjsStatement {
  /** `<File>.lean` under `lean/` at the pin, from `formal/physjs/theorem-files.json`. */
  readonly file: string;
}

/** A nested statement, named by its manifest field. No key. Not a `formalRef`. */
interface PhysjsNestedStatement extends PhysjsCompiledStatement {
  readonly name: string;
  readonly kind: FormalRefKind;
}

/** One compiled entry: its own statement, and every nested statement by name. */
interface PhysjsEntry extends PhysjsCompiledStatement {
  readonly key: string;
  readonly bridgeId: string;
  /** The manifest's kind: how the theorem relates to the equation the key names. */
  readonly kind: FormalRefKind;
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
  readonly kind: string;
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

/** The highest id in the bridge catalog. */
const CATALOG_MAX_ID = Math.max(...catalogEntries().map((entry) => entry.id));

/**
 * True when `key` is ahead of the catalog: PhysJS proved the statement for a
 * catalog id the catalog has not reached yet. That is an id above the
 * catalog's highest, with every id between them also a key of `keys` (the
 * manifest's), so the ahead keys are one unbroken run that starts right after
 * the catalog. Such an entry is vendored and compared, and it is not a seed
 * and not a problem until the catalog entry exists. A missing id inside the
 * catalog's range is not ahead, nor is an id past a gap in the run (a typo
 * such as an extra digit), nor an atlas key.
 *
 * @internal
 */
export function physjsAheadOfCatalog(
  key: string,
  keys: readonly string[] = PHYSJS_ENTRIES.map((entry) => entry.key),
): boolean {
  const id = catalogIdNumber(key);
  if (id === undefined || id <= CATALOG_MAX_ID) return false;
  const ids = new Set(keys.map(catalogIdNumber));
  for (let n = CATALOG_MAX_ID + 1; n < id; n++) if (!ids.has(n)) return false;
  return true;
}

/**
 * Manifest keys of kind `bridge`, the theorem stating the equation its key
 * names, that resolve to a bridge: every such atlas key, and every such
 * catalog key whose catalog entry exists. The kind is the manifest's own
 * field. A caller-supplied overlay entry is read the same way. The return
 * value is not stored on a bridge.
 *
 * @internal
 */
export function bridgeSeedKeys(
  entries: readonly { readonly key: string; readonly kind: FormalRefKind }[] = PHYSJS_ENTRIES,
): readonly string[] {
  return entries.filter((entry) => entry.kind === 'bridge' && !physjsAheadOfCatalog(entry.key)).map((entry) => entry.key);
}

/** Every manifest key ahead of the catalog, in manifest order. @internal */
export function physjsKeysAheadOfCatalog(): readonly string[] {
  return PHYSJS_ENTRIES.filter((entry) => physjsAheadOfCatalog(entry.key)).map((entry) => entry.key);
}

/** The fields of one manifest row that a review reads, nested statements included. @internal */
export interface PhysjsReviewedRow {
  readonly key: string;
  readonly theorem: string;
  readonly kind: string;
  readonly covers: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
  readonly nested: readonly {
    readonly name: string;
    readonly theorem: string;
    readonly kind: string;
    readonly covers: string;
    readonly leanProof: string;
    readonly axioms: readonly string[];
  }[];
}

/**
 * The row of a manifest entry as PhysJS writes it, in the shape
 * {@link physjsRowHash} reads. @internal
 */
export function physjsManifestRow(entry: PhysjsManifestEntry): PhysjsReviewedRow {
  return {
    key: entry.key,
    theorem: entry.theorem,
    kind: entry.kind,
    covers: entry.covers,
    leanProof: entry.leanProof,
    axioms: entry.axioms,
    nested: physjsNestedStatements(entry).nested.map((statement) => ({
      name: statement.name,
      theorem: statement.theorem,
      kind: statement.kind,
      covers: statement.covers,
      leanProof: statement.leanProof,
      axioms: statement.axioms,
    })),
  };
}

/**
 * SHA-256 of one row: `[key, theorem, kind, covers, leanProof, axioms,
 * nested[]]`, each nested statement as `[name, theorem, kind, covers,
 * leanProof, axioms]`. A swapped theorem or key, a changed kind, a reworded
 * covers line, a proof status, an axiom, or a nested statement changes it.
 * This is what `physjs-reviewed.ts` pins per key.
 *
 * @internal
 */
export function physjsRowHash(row: PhysjsReviewedRow): string {
  const columns = [
    row.key,
    row.theorem,
    row.kind,
    row.covers,
    row.leanProof,
    [...row.axioms],
    row.nested.map((n) => [n.name, n.theorem, n.kind, n.covers, n.leanProof, [...n.axioms]]),
  ];
  return createHash('sha256').update(JSON.stringify(columns)).digest('hex');
}

/**
 * The fidelity a manifest key earns, derived from what checks it:
 *
 * - `'unreviewed'` when the key is ahead of the catalog
 *   ({@link physjsAheadOfCatalog}): no bridge exists to read the row against;
 * - `'unreviewed'` when the compiled row's hash is not the one
 *   `PHYSJS_REVIEWED_ROWS` records for the key, or the key has no entry there;
 * - `'sanity-lemmas'` when the row is reviewed AND the key is in
 *   `PHYSJS_SANITY_LEMMA_KEYS`, whose statements
 *   `tests/atlas/formal-sanity.test.ts` instantiates on known cases;
 * - `'reviewed-manifest'` when the row is reviewed and no sanity lemma exists.
 *
 * A key the manifest does not name throws, like {@link physjsFormalRef}.
 *
 * @internal
 */
export function physjsFidelity(
  key: string,
  /** Defaults to the generated table. A test passes a mutated copy. */
  compiledEntries: readonly PhysjsEntry[] = PHYSJS_ENTRIES,
): FormalFidelity {
  const entry = compiledEntries.find((candidate) => candidate.key === key);
  if (entry === undefined) throw new Error(`PhysJS manifest has no entry for '${key}'`);
  if (physjsAheadOfCatalog(key)) return 'unreviewed';
  if (PHYSJS_REVIEWED_ROWS[key] !== physjsRowHash(entry)) return 'unreviewed';
  return PHYSJS_SANITY_LEMMA_KEYS.includes(key) ? 'sanity-lemmas' : 'reviewed-manifest';
}

/**
 * The reference for a manifest key, with its derived fidelity. Throws when
 * the key is not an entry, so a typo cannot ship a bridge with no reference.
 * A key ahead of the catalog, or whose row is not reviewed, is returned
 * `'unreviewed'` and derives no proof tag.
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
    fidelity: physjsFidelity(key),
    kind: entry.kind,
    url: physjsStatementUrl(entry.theorem),
    covers: `${entry.covers} — ${entry.coverage}`,
  };
}

/** The axioms of a statement that are outside {@link PHYSJS_ALLOWED_AXIOMS}. */
function disallowedAxioms(axioms: readonly string[]): readonly string[] {
  return axioms.filter((axiom) => !PHYSJS_ALLOWED_AXIOMS.has(axiom));
}

function sameAxioms(recorded: readonly string[], manifest: readonly string[]): boolean {
  return recorded.length === manifest.length && recorded.every((axiom, i) => axiom === manifest[i]);
}

function sameStatement(compiled: PhysjsStatement, manifest: PhysjsStatement): boolean {
  return (
    compiled.theorem === manifest.theorem &&
    compiled.kind === manifest.kind &&
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

/** The kind of a manifest entry is one of the formal-reference kinds. */
function isFormalRefKind(kind: unknown): kind is FormalRefKind {
  return typeof kind === 'string' && (FORMAL_REF_KINDS as readonly string[]).includes(kind);
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
 * theorem stays the reference. The reference's kind is the entry's
 * `kind`; a kind outside the formal-reference kinds is a problem. An axiom
 * outside {@link PHYSJS_ALLOWED_AXIOMS} on any statement is a problem. A `be-`
 * key in the unbroken run above the catalog's highest id is ahead of the
 * catalog and is not a problem (`physjsAheadOfCatalog`); any other key with
 * no bridge is. Every structural check (fields, kinds, coverage, proof
 * status, axioms, Lean file, compiled copy) runs for every entry, ahead keys
 * included; only the checks against a bridge's reference are skipped for a
 * key that has no bridge yet.
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
  if (manifest.schema !== 'physjs-bridge-manifest/v2') {
    problems.push(`manifest schema is '${manifest.schema}', expected 'physjs-bridge-manifest/v2'`);
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

  const compiledEntries = input.compiledEntries ?? PHYSJS_ENTRIES;
  const compiledByKey = new Map(compiledEntries.map((entry) => [entry.key, entry]));
  /** Theorem → Lean file over the compiled table under test, nested statements included. */
  const fileByTheorem = new Map(
    compiledEntries.flatMap((entry) => [entry, ...entry.nested].map((statement) => [statement.theorem, statement.file] as const)),
  );
  const byId = new Map(input.bridges.map((bridge) => [bridge.id, bridge]));
  const seen = new Set<string>();
  const manifestKeys = manifest.entries.map((entry) => entry.key);
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
    if (!isFormalRefKind(entry.kind)) {
      problems.push(`manifest key '${entry.key}' kind '${String(entry.kind)}' is not one of ${FORMAL_REF_KINDS.join(', ')}`);
    }
    if (disallowedAxioms(entry.axioms).length > 0) {
      problems.push(
        `manifest key '${entry.key}' axioms [${entry.axioms.join(', ')}] are not a subset of [${[...PHYSJS_ALLOWED_AXIOMS].join(', ')}]`,
      );
    }
    for (const statement of nested) {
      if (!isFormalRefKind(statement.kind)) {
        problems.push(
          `${statement.name} kind for '${entry.key}' is '${String(statement.kind)}', not one of ${FORMAL_REF_KINDS.join(', ')}`,
        );
      }
      if (statement.coverage !== PHYSJS_COVERAGE) {
        problems.push(
          `${statement.name} coverage phrase for '${entry.key}' is '${statement.coverage}', expected '${PHYSJS_COVERAGE}'`,
        );
      }
      if (statement.leanProof !== 'complete') {
        problems.push(`${statement.name} leanProof for '${entry.key}' is '${statement.leanProof}', expected 'complete'`);
      }
      if (disallowedAxioms(statement.axioms).length > 0) {
        problems.push(
          `${statement.name} axioms for '${entry.key}' [${statement.axioms.join(', ')}] are not a subset of [${[...PHYSJS_ALLOWED_AXIOMS].join(', ')}]`,
        );
      }
      if (!fileByTheorem.has(statement.theorem)) {
        problems.push(`manifest theorem '${statement.theorem}' (${entry.key}.${statement.name}) has no Lean file in formal/physjs/theorem-files.json`);
      }
    }
    const file = fileByTheorem.get(entry.theorem);
    if (file === undefined) {
      problems.push(`manifest theorem '${entry.theorem}' has no Lean file in formal/physjs/theorem-files.json`);
    }
    const compiled = compiledByKey.get(entry.key);
    if (compiled === undefined) {
      problems.push(`manifest key '${entry.key}' is not in the compiled entry table`);
    } else if (
      compiled.theorem !== entry.theorem ||
      compiled.kind !== entry.kind ||
      compiled.covers !== entry.covers ||
      compiled.coverage !== entry.coverage ||
      compiled.leanProof !== entry.leanProof ||
      !sameAxioms(compiled.axioms, entry.axioms) ||
      !sameNested(compiled.nested, nested)
    ) {
      problems.push(`compiled entry for '${entry.key}' disagrees with the vendored manifest`);
    }
    const bridge = byId.get(entry.key);
    if (bridge === undefined) {
      if (!physjsAheadOfCatalog(entry.key, manifestKeys)) problems.push(`manifest key '${entry.key}' does not resolve to a bridge`);
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
    if (ref.kind !== entry.kind) {
      problems.push(`bridge '${entry.key}' kind is '${ref.kind}', expected '${entry.kind}'`);
    }
    if (file !== undefined && ref.url !== physjsFileUrl(file)) {
      problems.push(`bridge '${entry.key}' url is '${ref.url}', expected '${physjsFileUrl(file)}'`);
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
