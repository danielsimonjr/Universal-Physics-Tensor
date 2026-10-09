/**
 * Vendor the PhysJS files UPT pins, from a PhysJS checkout at the pinned commit,
 * or check that the committed copies are exactly that.
 *
 * Three files under `formal/physjs/`, all read from PhysJS at one commit:
 *
 * - `manifest.json`: PhysJS `manifest/bridges.json`, with the commit appended
 *   as `commit` (the pin; `toolchain`, `mathlib` and `physlib` come with it);
 * - `lean-files.json`: every `.lean` file under `lean/` at the commit, sorted;
 * - `theorem-files.json`: the Lean file each manifest theorem is declared in.
 *
 * A namespace is not a file: `PhysJS.Einstein.friedmann_corollary` is in
 * `lean/VacuumFriedmann.lean`, and `PhysJS.SpringLc` is a namespace inside
 * `lean/OscillatorDictionary.lean`. So the file is read from the sources,
 * not from the theorem's name: every listed file is read at the commit, its
 * `namespace`, `section` and `end` lines are tracked, and each `theorem` or
 * `lemma` is recorded under its full name. A manifest theorem declared in no
 * file, or in two, is an error. `bun run physjs:table` then copies the result
 * into the generated table. CI's docs-fresh job runs `--check` against a
 * shallow fetch of PhysJS at the pinned commit.
 *
 *   bun scripts/vendor-physjs.ts --physjs ../PhysJS --commit <sha>   # pin <sha>: write all three
 *   bun scripts/vendor-physjs.ts --physjs ../PhysJS                  # rewrite them at the current pin
 *   bun scripts/vendor-physjs.ts --physjs ../PhysJS --check          # exit 1 when one is not PhysJS's at the pin
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'formal/physjs/manifest.json');

interface Statement {
  readonly theorem: string;
}

interface Manifest {
  readonly commit: string;
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

/** `{ commit, files }` for `manifest`, reading each listed file through `read`. */
export function theoremFiles(
  manifest: Manifest,
  leanFiles: readonly string[],
  read: (path: string) => string,
): { readonly commit: string; readonly files: Readonly<Record<string, string>> } {
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
  return { commit: manifest.commit, files };
}

/** A PhysJS checkout read at one commit. */
export interface PhysjsAtCommit {
  /** The text of `path` at the commit. */
  show(path: string): string;
  /** Every file path at the commit. */
  paths(): readonly string[];
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** The three vendored files, path under the repository → text, rendered from PhysJS at `commit`. */
export function vendoredFiles(commit: string, physjs: PhysjsAtCommit): Readonly<Record<string, string>> {
  const manifest = { ...(JSON.parse(physjs.show('manifest/bridges.json')) as Omit<Manifest, 'commit'>), commit } as Manifest;
  const leanFiles = physjs
    .paths()
    .filter((path) => path.startsWith('lean/') && path.endsWith('.lean'))
    .sort();
  return {
    'formal/physjs/manifest.json': json(manifest),
    'formal/physjs/lean-files.json': json(leanFiles),
    'formal/physjs/theorem-files.json': json(theoremFiles(manifest, leanFiles, (path) => physjs.show(path))),
  };
}

function main(argv: readonly string[]): number {
  const option = (name: string): string | undefined => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const checkout = option('--physjs');
  if (checkout === undefined) {
    process.stderr.write('usage: bun scripts/vendor-physjs.ts --physjs <PhysJS checkout> [--commit <sha>] [--check]\n');
    return 2;
  }
  const commit = option('--commit') ?? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest).commit;
  const git = (args: readonly string[]): string =>
    execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const files = vendoredFiles(commit, {
    show: (path) => git(['show', `${commit}:${path}`]),
    paths: () => git(['ls-tree', '-r', '--name-only', commit]).split('\n').filter((path) => path !== ''),
  });
  if (argv.includes('--check')) {
    const stale = Object.entries(files)
      .filter(([path, text]) => readFileSync(resolve(root, path), 'utf8') !== text)
      .map(([path]) => path);
    if (stale.length > 0) {
      process.stderr.write(`not PhysJS's at ${commit}: ${stale.join(', ')}. Run bun scripts/vendor-physjs.ts --physjs <checkout>.\n`);
      return 1;
    }
    return 0;
  }
  for (const [path, text] of Object.entries(files)) writeFileSync(resolve(root, path), text);
  return 0;
}

const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) process.exitCode = main(process.argv.slice(2));
