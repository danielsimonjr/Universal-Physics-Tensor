/**
 * Index the Lean proofs in this repository's `lean/`, or check that the
 * committed index is the tree's.
 *
 * The proofs moved here from PhysJS (11.0.0). Nothing is vendored and
 * nothing is pinned to another repository: the index is read from the
 * working tree. Two files under `formal/lean/` are written:
 *
 * - `lean-files.json`: every `.lean` file under `lean/`, sorted;
 * - `theorem-files.json`: the Lean file each manifest theorem is declared in.
 *
 * `formal/lean/manifest.json` is this repository's own record of what each
 * statement covers. It is edited by hand, with the Lean file it describes.
 * Its `toolchain`, `mathlib` and `physlib` fields must be the ones the lake
 * project builds with (`lean-toolchain`, and the `inputRev` / `rev` of those
 * packages in `lake-manifest.json`); `--check` fails when they are not.
 * Each statement's `kind` is the kind line of the module docstring of the
 * file that declares its theorem (`` `be-80`. Bridge. ``, and for a nested
 * statement `` `be-13.vacuum`. Reduction. ``); `--check` fails on a missing,
 * repeated or different line. PhysJS's CI made that comparison before the
 * move; nothing in this repository did until this check.
 *
 * A namespace is not a file: `PhysJS.Einstein.friedmann_corollary` is in
 * `lean/VacuumFriedmann.lean`, and `PhysJS.SpringLc` is a namespace inside
 * `lean/OscillatorDictionary.lean`. So the file is read from the sources,
 * not from the theorem's name: every listed file is read, its `namespace`,
 * `section` and `end` lines are tracked, and each `theorem` or `lemma` is
 * recorded under its full name. A manifest theorem declared in no file, or
 * in two, is an error. `bun run physjs:table` then copies the result into the
 * generated table. CI's docs-fresh job runs `--check`; the `lean` job builds
 * every file with `lake build`.
 *
 *   bun scripts/lean-index.ts           # write both index files
 *   bun scripts/lean-index.ts --check   # exit 1 when one is stale, the manifest's toolchain is not the build's, or a kind is not its file's
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface Statement {
  readonly theorem: string;
}

/** `formal/lean/manifest.json`, the fields this script reads. */
interface Manifest {
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
  readonly entries: readonly (Statement & Readonly<Record<string, unknown>>)[];
}

/** Every theorem a manifest entry names: the top-level one and each nested statement's. */
export function manifestTheorems(manifest: Manifest): string[] {
  const out: string[] = [];
  for (const entry of manifest.entries) {
    out.push(entry.theorem);
    for (const value of Object.values(entry)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as Statement).theorem === 'string') {
        out.push((value as Statement).theorem);
      }
    }
  }
  return out;
}

/**
 * A theorem or lemma declaration at the start of a line: any number of
 * attributes, an optional `open … in` on the same line, the modifiers, then
 * the keyword and the name. An `open … in` on the line BEFORE is handled by
 * `declaredTheorems`, which drops that line and reads the next.
 */
const DECLARATION =
  /^\s*(?:@\[[^\]]*\]\s*)*(?:open\s+[^\n]*?\s+in\s+)?(?:(?:private|protected|noncomputable)\s+)*(?:theorem|lemma)\s+([^\s(:{[]+)/;

/** A line that is only `open … in`: the declaration it scopes is on the next line. */
const OPEN_IN_LINE = /^\s*open\s+[^\n]*?\s+in\s*$/;

/** Full names of the theorems and lemmas `source` declares, from its namespace and section lines. */
export function declaredTheorems(source: string): string[] {
  const scopes: { readonly kind: 'namespace' | 'section'; readonly name: string }[] = [];
  const out: string[] = [];
  let inComment = 0;
  for (const raw of source.split('\n')) {
    let line = raw;
    // Block comments may hold `theorem` in prose; they are skipped, nested.
    let text = '';
    for (let i = 0; i < line.length; i++) {
      if (line.startsWith('/-', i)) {
        inComment++;
        i++;
      } else if (inComment > 0 && line.startsWith('-/', i)) {
        inComment--;
        i++;
      } else if (inComment === 0) {
        if (line.startsWith('--', i)) break;
        text += line[i];
      }
    }
    line = text;
    const ns = /^\s*namespace\s+(\S+)/.exec(line);
    if (ns !== null) {
      scopes.push({ kind: 'namespace', name: ns[1]! });
      continue;
    }
    const section = /^\s*(?:noncomputable\s+)?section(?:\s+(\S+))?\s*$/.exec(line);
    if (section !== null) {
      scopes.push({ kind: 'section', name: section[1] ?? '' });
      continue;
    }
    const end = /^\s*end(?:\s+(\S+))?\s*$/.exec(line);
    if (end !== null) {
      const name = end[1] ?? '';
      const at = scopes.map((s) => s.name).lastIndexOf(name);
      if (at < 0) throw new Error(`'end ${name}' closes no open namespace or section`);
      scopes.length = at;
      continue;
    }
    if (OPEN_IN_LINE.test(line)) continue;
    const decl = DECLARATION.exec(line);
    if (decl === null) continue;
    const name = decl[1]!;
    if (name.startsWith('_root_.')) {
      out.push(name.slice('_root_.'.length));
      continue;
    }
    const prefix = scopes.filter((s) => s.kind === 'namespace').map((s) => s.name);
    out.push([...prefix, name].join('.'));
  }
  return out;
}

/** `{ files }` for `manifest`, reading each listed file through `read`. */
export function theoremFiles(
  manifest: Manifest,
  leanFiles: readonly string[],
  read: (path: string) => string,
): { readonly files: Readonly<Record<string, string>> } {
  const where = new Map<string, string[]>();
  for (const path of leanFiles) {
    for (const theorem of declaredTheorems(read(path))) where.set(theorem, [...(where.get(theorem) ?? []), path]);
  }
  const files: Record<string, string> = {};
  const problems: string[] = [];
  for (const theorem of [...new Set(manifestTheorems(manifest))].sort()) {
    const paths = where.get(theorem) ?? [];
    if (paths.length !== 1) problems.push(`${theorem}: declared in ${paths.length === 0 ? 'no file' : paths.join(', ')}`);
    else files[theorem] = paths[0]!;
  }
  if (problems.length > 0) throw new Error(`manifest theorems without one declaring file:\n${problems.join('\n')}`);
  return { files };
}

/** The kind-line word of each formal-reference kind. */
const KIND_WORDS: Readonly<Record<string, string>> = {
  bridge: 'Bridge',
  'derivation-step': 'Derivation step',
  'cross-check': 'Cross-check',
  property: 'Property',
  limit: 'Limit',
  reduction: 'Reduction',
};

/** A kind line: `` `<label>`. <Word>. `` at the start of a docstring line. */
const KIND_LINE = /^`((?:be|ab)-[a-z0-9-]+(?:\.[A-Za-z_]+)?)`\. ([A-Z][a-z-]+(?: [a-z]+)?)\./;

/**
 * Each manifest statement whose `kind` is not the kind line labelled with its
 * key (`<key>` for an entry, `<key>.<field>` for a nested statement) in the
 * file `files` gives for its theorem. Empty when every kind is its file's.
 */
export function kindLineProblems(
  manifest: Manifest,
  files: Readonly<Record<string, string>>,
  read: (path: string) => string,
): string[] {
  const problems: string[] = [];
  const words = new Map<string, Map<string, string[]>>();
  const linesOf = (path: string): Map<string, string[]> => {
    let byLabel = words.get(path);
    if (byLabel === undefined) {
      byLabel = new Map();
      for (const line of read(path).split(/\r?\n/)) {
        const m = KIND_LINE.exec(line);
        if (m !== null) byLabel.set(m[1]!, [...(byLabel.get(m[1]!) ?? []), m[2]!]);
      }
      words.set(path, byLabel);
    }
    return byLabel;
  };
  const check = (label: string, theorem: string, kind: unknown): void => {
    const path = files[theorem];
    if (path === undefined) return;
    const found = linesOf(path).get(label) ?? [];
    const want = typeof kind === 'string' ? KIND_WORDS[kind] : undefined;
    if (want === undefined) problems.push(`${label}: kind '${String(kind)}' has no kind-line word`);
    else if (found.length !== 1) problems.push(`${label}: ${path} has ${found.length} kind lines for it, expected one ('${want}.')`);
    else if (found[0] !== want) problems.push(`${label}: manifest kind '${String(kind)}', ${path} says '${found[0]}.'`);
  };
  for (const entry of manifest.entries) {
    const key = entry['key'] as string;
    check(key, entry.theorem, entry['kind']);
    for (const [field, value] of Object.entries(entry)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as Statement).theorem === 'string') {
        check(`${key}.${field}`, (value as Statement).theorem, (value as Readonly<Record<string, unknown>>)['kind']);
      }
    }
  }
  return problems;
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** The lake project's own pins: the toolchain, and the Mathlib and Physlib revisions it builds with. */
export interface LakePins {
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
}

/** Read `lean-toolchain` and `lake-manifest.json` text into {@link LakePins}. */
export function lakePins(leanToolchain: string, lakeManifest: string): LakePins {
  const packages = (JSON.parse(lakeManifest) as { packages: readonly { name: string; rev: string; inputRev?: string }[] }).packages;
  const find = (name: string) => {
    const pkg = packages.find((p) => p.name === name);
    if (pkg === undefined) throw new Error(`lake-manifest.json has no package '${name}'`);
    return pkg;
  };
  return {
    toolchain: leanToolchain.trim(),
    mathlib: find('mathlib').inputRev ?? find('mathlib').rev,
    physlib: find('Physlib').rev,
  };
}

/** Each manifest pin that is not the lake project's. Empty when they agree. */
export function pinProblems(manifest: LakePins, lake: LakePins): string[] {
  return (['toolchain', 'mathlib', 'physlib'] as const)
    .filter((field) => manifest[field] !== lake[field])
    .map((field) => `formal/lean/manifest.json ${field} is '${manifest[field]}', the lake project builds with '${lake[field]}'`);
}

/** The two index files, path under the repository → text, for `manifest` over `leanFiles` read through `read`. */
export function indexFiles(
  manifest: Manifest,
  leanFiles: readonly string[],
  read: (path: string) => string,
): Readonly<Record<string, string>> {
  const sorted = [...leanFiles].sort();
  return {
    'formal/lean/lean-files.json': json(sorted),
    'formal/lean/theorem-files.json': json(theoremFiles(manifest, sorted, read)),
  };
}

/** `lean/<File>.lean` for every Lean file in this tree's `lean/`. */
export function treeLeanFiles(repo: string = root): string[] {
  return readdirSync(resolve(repo, 'lean'))
    .filter((name) => name.endsWith('.lean'))
    .map((name) => `lean/${name}`)
    .sort();
}

function main(argv: readonly string[]): number {
  const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
  const manifest = JSON.parse(read('formal/lean/manifest.json')) as Manifest;
  const files = indexFiles(manifest, treeLeanFiles(), read);
  if (argv.includes('--check')) {
    const theoremMap = (JSON.parse(files['formal/lean/theorem-files.json']!) as { files: Record<string, string> }).files;
    const problems = [
      ...pinProblems(manifest, lakePins(read('lean-toolchain'), read('lake-manifest.json'))),
      ...kindLineProblems(manifest, theoremMap, read),
    ];
    const stale = Object.entries(files)
      .filter(([path, text]) => read(path) !== text)
      .map(([path]) => `${path} is not the index of lean/. Run bun scripts/lean-index.ts.`);
    for (const line of [...problems, ...stale]) process.stderr.write(`${line}\n`);
    return problems.length + stale.length > 0 ? 1 : 0;
  }
  for (const [path, text] of Object.entries(files)) writeFileSync(resolve(root, path), text);
  return 0;
}

const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) process.exitCode = main(process.argv.slice(2));
