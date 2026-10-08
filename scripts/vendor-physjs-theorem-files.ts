/**
 * Write `formal/physjs/theorem-files.json`: the Lean file each theorem the
 * vendored PhysJS manifest names is declared in, at the manifest's commit.
 *
 * A namespace is not a file: `PhysJS.Einstein.friedmann_corollary` is in
 * `lean/VacuumFriedmann.lean`, and `PhysJS.SpringLc` is a namespace inside
 * `lean/OscillatorDictionary.lean`. So the file is read from the sources,
 * not from the theorem's name. Every file in `formal/physjs/lean-files.json`
 * is read at the pinned commit from a PhysJS checkout, its `namespace`,
 * `section` and `end` lines are tracked, and each `theorem` or `lemma` is
 * recorded under its full name. A manifest theorem declared in no file, or in
 * two, is an error. `bun run physjs:table` then copies the result into the
 * generated table.
 *
 *   bun scripts/vendor-physjs-theorem-files.ts --physjs ../PhysJS           # write the file
 *   bun scripts/vendor-physjs-theorem-files.ts --physjs ../PhysJS --check   # exit 1 when it is stale
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'formal/physjs/manifest.json');
const leanFilesPath = resolve(root, 'formal/physjs/lean-files.json');
const outPath = resolve(root, 'formal/physjs/theorem-files.json');

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

const DECLARATION = /^\s*(?:@\[[^\]]*\]\s*)?(?:(?:private|protected|noncomputable)\s+)*(?:theorem|lemma)\s+([^\s(:{[]+)/;

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

function main(argv: readonly string[]): number {
  const at = argv.indexOf('--physjs');
  const physjs = at >= 0 ? argv[at + 1] : undefined;
  if (physjs === undefined) {
    process.stderr.write('usage: bun scripts/vendor-physjs-theorem-files.ts --physjs <PhysJS checkout> [--check]\n');
    return 2;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const leanFiles = JSON.parse(readFileSync(leanFilesPath, 'utf8')) as readonly string[];
  const read = (path: string): string =>
    execFileSync('git', ['-C', physjs, 'show', `${manifest.commit}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const rendered = `${JSON.stringify(theoremFiles(manifest, leanFiles, read), null, 2)}\n`;
  if (argv.includes('--check')) {
    if (readFileSync(outPath, 'utf8') !== rendered) {
      process.stderr.write('formal/physjs/theorem-files.json is stale. Run bun scripts/vendor-physjs-theorem-files.ts --physjs <checkout>.\n');
      return 1;
    }
    return 0;
  }
  writeFileSync(outPath, rendered);
  return 0;
}

const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) process.exitCode = main(process.argv.slice(2));
