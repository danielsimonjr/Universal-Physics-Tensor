/**
 * One run per funnel: `upt discover` and `upt ground` rank every candidate pair of a graph from
 * scratch (about 20 s for the catalog on the CI runner, three graphs for a pair that is in none),
 * and sixteen CLI test files asked for that funnel again, each in its own vitest fork. The output
 * is a pure function of the build (`dist/**`), the data files (`data/**`) and the peers, so it is
 * memoised on disk under that fingerprint: the first fork pays, the rest read.
 *
 * Only `discover` and `ground` go through here; any other argv is refused, because a command
 * that reads the clock, the environment or a file would be served a stale answer.
 *
 * `tests/cli/discover-cache.test.ts` pins the cache's rules on an injected runner.
 *
 * @module tests/helpers/discover-cache
 */
import './dist.js';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../../dist/cli/main.js';
import { peerPresent } from './peers.js';

/** A captured CLI run. `stdout` holds `out` lines and `write` chunks in emission order. */
export interface CliRun {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FUNNEL_COMMANDS: ReadonlySet<string> = new Set(['discover', 'ground']);

/** SHA-256 over every file (path and bytes) under `dir` whose name matches `pattern`, sorted. */
function hashTree(hash: ReturnType<typeof createHash>, dir: string, pattern: RegExp): void {
  if (!existsSync(dir)) return;
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const p = join(current, entry);
      if (statSync(p).isDirectory()) stack.push(p);
      else if (pattern.test(entry)) files.push(p);
    }
  }
  for (const file of files.sort()) {
    hash.update(file.slice(root.length));
    hash.update(readFileSync(file));
  }
}

/** The installed version of each MathTS peer, by package name, from its `package.json`. */
export function peerVersions(): Readonly<Record<string, string>> {
  const scope = resolve(root, 'node_modules/@danielsimonjr');
  const out: Record<string, string> = {};
  if (!existsSync(scope)) return out;
  for (const name of readdirSync(scope).sort()) {
    const file = join(scope, name, 'package.json');
    if (!existsSync(file)) continue;
    out[name] = (JSON.parse(readFileSync(file, 'utf8')) as { version: string }).version;
  }
  return out;
}

/**
 * The fingerprint of everything a funnel run depends on: the build, the data files, and the
 * peers by version. A peer bump with an unchanged `dist/` is a different fingerprint, so a
 * cached answer from the old peer is never served.
 */
export function funnelFingerprint(peers: Readonly<Record<string, string>> = peerVersions()): string {
  const hash = createHash('sha256');
  hashTree(hash, resolve(root, 'dist'), /\.js$/);
  hashTree(hash, resolve(root, 'data'), /\.json$/);
  hash.update(`peers:${peerPresent}`);
  hash.update(`versions:${JSON.stringify(peers)}`);
  return hash.digest('hex');
}

/** The stored run at `file`, or `undefined` when there is none or it is not a complete record. */
function readStored(file: string, key: string): CliRun | undefined {
  if (!existsSync(file)) return undefined;
  let stored: CliRun & { readonly argv: string };
  try {
    stored = JSON.parse(readFileSync(file, 'utf8')) as CliRun & { readonly argv: string };
  } catch {
    // Another fork's write is not visible yet, or the file is from a crashed run: a miss.
    return undefined;
  }
  return stored.argv === key ? { code: stored.code, stdout: stored.stdout, stderr: stored.stderr } : undefined;
}

/** Write the record atomically: a reader sees the old file, nothing, or the whole new file. */
function writeStored(file: string, record: unknown): void {
  const tmp = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(record));
  renameSync(tmp, file);
}

/** Run `argv` through `runCli` and capture both streams. */
export async function runCliCaptured(argv: readonly string[]): Promise<CliRun> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli([...argv], {
    out: (s?: string) => out.push((s ?? '') + '\n'),
    err: (s?: string) => err.push((s ?? '') + '\n'),
    write: (s: string) => out.push(s),
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

/** Is `argv` a command whose output the cache may serve? */
export function isFunnelCommand(argv: readonly string[]): boolean {
  const command = argv.find((a) => !a.startsWith('--'));
  return command !== undefined && FUNNEL_COMMANDS.has(command);
}

/**
 * A memoising runner. `fingerprint` names the inputs; `dir` is the on-disk store shared between
 * forks; `run` is the real runner. An argv outside the funnel commands throws.
 */
export function createFunnelCache(options: {
  readonly run: (argv: readonly string[]) => Promise<CliRun>;
  readonly fingerprint: string;
  readonly dir: string;
}): (argv: readonly string[]) => Promise<CliRun> {
  const memory = new Map<string, Promise<CliRun>>();
  const store = join(options.dir, options.fingerprint.slice(0, 32));
  return (argv) => {
    if (!isFunnelCommand(argv)) {
      throw new Error(`discover-cache: '${argv.join(' ')}' is not a discover or ground run; call runCli directly`);
    }
    const key = JSON.stringify(argv);
    const hit = memory.get(key);
    if (hit !== undefined) return hit;
    const file = join(store, `${createHash('sha256').update(key).digest('hex').slice(0, 32)}.json`);
    const pending = (async (): Promise<CliRun> => {
      const stored = readStored(file, key);
      if (stored !== undefined) return stored;
      const result = await options.run(argv);
      mkdirSync(store, { recursive: true });
      writeStored(file, { argv: key, ...result });
      return result;
    })();
    memory.set(key, pending);
    return pending;
  };
}

/** The shared runner for `discover` and `ground` in tests. */
export const runFunnel: (argv: readonly string[]) => Promise<CliRun> = createFunnelCache({
  run: runCliCaptured,
  fingerprint: funnelFingerprint(),
  dir: join(tmpdir(), 'upt-funnel-cache'),
});
