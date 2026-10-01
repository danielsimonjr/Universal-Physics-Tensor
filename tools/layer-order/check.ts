/**
 * Layer-order gate.
 *
 * Scans `src/` for static imports (including `import type` and `export … from`)
 * and for dynamic `import()` whose specifier is a string literal. An upward
 * edge is a lower tier importing a higher one. A cycle is a violation even
 * inside a tier. The committed allowlist must match the tree exactly. Once
 * `tools/layer-order/allowlist.json` exists on `origin/master`, this file may
 * only shrink relative to that commit.
 *
 * This pass does not write `docs/architecture/`. A dynamic `import()` whose
 * argument is not a string literal is invisible here. The scanner is a lexer,
 * not the TypeScript parser: TypeScript 7 ships no compiler API. `tests/` is
 * outside the rule. Package specifiers are not edges.
 *
 * @module tools/layer-order
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Ranks. `relations` is reserved for the directory stage 2 adds. */
const TIER: Readonly<Record<string, number>> = {
  core: 0,
  dimensional: 1,
  numerical: 1,
  relations: 2,
  canonical: 3,
  bridges: 3,
  cases: 3,
  diff: 3,
  composition: 4,
  atlas: 5,
  cli: 6,
};

const SCC_NODE_CAP = 30;
const CYCLE_CAP = 64;

export interface Allowlist {
  edges: string[];
  cycles: string[][];
}

export interface Found {
  edges: string[];
  cycles: string[][];
  unknown: string[];
}

export interface JudgeResult {
  ok: boolean;
  errors: string[];
}

export type Tier = number | 'barrel' | 'unknown';

export function tierOf(file: string): Tier {
  const norm = file.split(sep).join('/');
  if (norm === 'src/index.ts') return 'barrel';
  if (norm === 'src/cli-api.ts') return TIER.cli;
  const parts = norm.split('/');
  if (parts[0] !== 'src' || parts.length < 2) return 'unknown';
  const rank = TIER[parts[1]];
  return rank === undefined ? 'unknown' : rank;
}

export function isUpward(from: string, to: string): boolean {
  const a = tierOf(from);
  const b = tierOf(to);
  if (a === 'barrel' || b === 'barrel') return false;
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return a < b;
}

/**
 * Specifiers of import and re-export declarations, including type-only and
 * `import('…')`. TypeScript 7 ships no compiler API, so this is a lexer: it
 * skips comments, strings, and template text, and it reads code inside `${}`.
 * A dynamic `import()` counts only when its argument is a quoted string.
 */
export function scanFileImports(source: string): string[] {
  const specs: string[] = [];
  const n = source.length;
  let i = 0;
  const isId = (c: string | undefined): boolean => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  const keywordAt = (pos: number, word: string): boolean =>
    source.startsWith(word, pos) &&
    !isId(source[pos + word.length]) &&
    (pos === 0 || !isId(source[pos - 1]));

  const skipSpaceAndComments = (): void => {
    for (;;) {
      while (i < n && (source[i] === ' ' || source[i] === '\t' || source[i] === '\n' || source[i] === '\r' || source[i] === '\f')) {
        i += 1;
      }
      if (i + 1 < n && source[i] === '/' && source[i + 1] === '/') {
        i += 2;
        while (i < n && source[i] !== '\n') i += 1;
        continue;
      }
      if (i + 1 < n && source[i] === '/' && source[i + 1] === '*') {
        i += 2;
        while (i + 1 < n && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i = Math.min(n, i + 2);
        continue;
      }
      return;
    }
  };

  const readQuoted = (): string | null => {
    const quote = source[i];
    if (quote !== "'" && quote !== '"') return null;
    i += 1;
    let out = '';
    while (i < n) {
      const c = source[i]!;
      if (c === '\\') {
        out += source[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) {
        i += 1;
        return out;
      }
      if (c === '\n') return null;
      out += c;
      i += 1;
    }
    return null;
  };

  const takeSpecifier = (): void => {
    skipSpaceAndComments();
    const spec = readQuoted();
    if (spec !== null) specs.push(spec);
  };

  const skipTemplate = (): void => {
    i += 1;
    while (i < n) {
      const c = source[i]!;
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`') {
        i += 1;
        return;
      }
      if (c === '$' && source[i + 1] === '{') {
        i += 2;
        scanCode(() => source[i] === '}');
        if (source[i] === '}') i += 1;
        continue;
      }
      i += 1;
    }
  };

  const skipTrivia = (): boolean => {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < n && source[i] !== '\n') i += 1;
      return true;
    }
    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i + 1 < n && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i = Math.min(n, i + 2);
      return true;
    }
    if (c === "'" || c === '"') {
      readQuoted();
      return true;
    }
    if (c === '`') {
      skipTemplate();
      return true;
    }
    return false;
  };

  const lookForFrom = (): void => {
    let depth = 0;
    while (i < n) {
      if (skipTrivia()) continue;
      const c = source[i]!;
      if (c === '{') {
        depth += 1;
        i += 1;
        continue;
      }
      if (c === '}') {
        if (depth === 0) return;
        depth -= 1;
        i += 1;
        continue;
      }
      if (depth === 0 && c === ';') return;
      if (depth === 0 && keywordAt(i, 'from')) {
        i += 4;
        takeSpecifier();
        return;
      }
      i += 1;
    }
  };

  const parseImport = (): void => {
    i += 'import'.length;
    skipSpaceAndComments();
    if (source[i] === '.') return;
    if (source[i] === '(') {
      i += 1;
      takeSpecifier();
      return;
    }
    if (source[i] === "'" || source[i] === '"') {
      takeSpecifier();
      return;
    }
    lookForFrom();
  };

  const parseExport = (): void => {
    i += 'export'.length;
    skipSpaceAndComments();
    if (keywordAt(i, 'type')) {
      i += 'type'.length;
      skipSpaceAndComments();
      if (source[i] !== '{' && source[i] !== '*') return;
    }
    if (source[i] === '{' || source[i] === '*') lookForFrom();
  };

  function scanCode(stop: () => boolean): void {
    while (i < n && !stop()) {
      if (skipTrivia()) continue;
      if (keywordAt(i, 'import')) {
        parseImport();
        continue;
      }
      if (keywordAt(i, 'export')) {
        parseExport();
        continue;
      }
      i += 1;
    }
  }

  scanCode(() => false);
  return specs;
}

/**
 * Resolve a specifier against `fromFile` (repo-relative). Package specifiers
 * and declaration-only targets return null. A relative specifier that matches
 * no file throws.
 */
export function resolveSpecifier(fromFile: string, spec: string, root: string): string | null {
  if (!spec.startsWith('.')) return null;
  const fromAbs = join(root, fromFile);
  const base = dirname(fromAbs);
  const raw = spec.replace(/[.][cm]?js$/, '');
  const stem = join(base, raw);
  const candidates = [
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.mts`,
    join(stem, 'index.ts'),
    join(stem, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return toRepo(root, candidate);
  }
  const declarations = [`${stem}.d.ts`, join(stem, 'index.d.ts')];
  if (declarations.some((candidate) => existsSync(candidate) && statSync(candidate).isFile())) {
    return null;
  }
  throw new Error(`unresolved import: ${fromFile} -> ${spec}`);
}

function toRepo(root: string, abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

function walkSources(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkSources(abs, out);
    } else if (ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.d.ts')) {
      out.push(abs);
    }
  }
}

export interface Scan {
  found: Found;
  /** Every resolved internal edge, not only the upward ones. */
  moduleEdges: Array<[string, string]>;
}

export function scanRepository(root: string): Scan {
  const src = join(root, 'src');
  const absFiles: string[] = [];
  walkSources(src, absFiles);
  const files = absFiles.map((abs) => toRepo(root, abs)).sort();
  const unknown = files.filter((file) => tierOf(file) === 'unknown').sort();
  const edgeSet = new Set<string>();
  const moduleEdges: Array<[string, string]> = [];
  for (const file of files) {
    const source = readFileSync(join(root, file), 'utf8');
    const specs = scanFileImports(source);
    const seen = new Set<string>();
    for (const spec of specs) {
      if (seen.has(spec)) continue;
      seen.add(spec);
      const target = resolveSpecifier(file, spec, root);
      if (target === null) continue;
      const key = `${file} -> ${target}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      moduleEdges.push([file, target]);
    }
  }
  const edges = moduleEdges
    .filter(([from, to]) => isUpward(from, to))
    .map(([from, to]) => `${from} -> ${to}`)
    .sort();
  const cycles = cyclesOf(moduleEdges.filter(([from, to]) => tierOf(from) !== 'barrel' && tierOf(to) !== 'barrel'));
  return { found: { edges, cycles, unknown }, moduleEdges };
}

export function cyclesOf(pairs: Array<[string, string]>): string[][] {
  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();
  for (const [from, to] of pairs) {
    nodes.add(from);
    nodes.add(to);
    const list = adj.get(from);
    if (list === undefined) adj.set(from, [to]);
    else if (!list.includes(to)) list.push(to);
  }
  for (const list of adj.values()) list.sort();
  const cycles: string[][] = [];
  for (const scc of tarjan([...nodes], adj)) {
    const set = new Set(scc);
    const loop = scc.some((node) => (adj.get(node) ?? []).includes(node));
    if (scc.length < 2 && !loop) continue;
    if (scc.length > SCC_NODE_CAP) {
      throw new Error(`scc exceeds the cycle cap: ${scc.length} nodes`);
    }
    enumerateSimpleCycles(scc, set, adj, cycles);
  }
  cycles.sort((a, b) => cycleKey(a).localeCompare(cycleKey(b)));
  return cycles;
}

function enumerateSimpleCycles(
  scc: string[],
  set: Set<string>,
  adj: Map<string, string[]>,
  into: string[][],
): void {
  for (const start of [...scc].sort()) {
    const path = [start];
    const seen = new Set<string>([start]);
    const walk = (current: string): void => {
      for (const next of adj.get(current) ?? []) {
        if (!set.has(next)) continue;
        if (next === start) {
          into.push(canonicalizeCycle(path));
          if (into.length > CYCLE_CAP) throw new Error(`cycle enumeration exceeded ${CYCLE_CAP}`);
          continue;
        }
        if (next < start || seen.has(next)) continue;
        seen.add(next);
        path.push(next);
        walk(next);
        path.pop();
        seen.delete(next);
      }
    };
    walk(start);
  }
}

export function canonicalizeCycle(cycle: string[]): string[] {
  if (cycle.length === 0) return cycle;
  let min = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i]! < cycle[min]!) min = i;
  }
  return [...cycle.slice(min), ...cycle.slice(0, min)];
}

export function cycleKey(cycle: string[]): string {
  const canon = canonicalizeCycle(cycle);
  return [...canon, canon[0]].join(' -> ');
}

function tarjan(nodes: string[], adj: Map<string, string[]>): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccs: string[][] = [];
  const strong = (v: string): void => {
    indices.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, indices.get(w)!));
      }
    }
    if (low.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w = '';
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  };
  for (const node of nodes) {
    if (!indices.has(node)) strong(node);
  }
  return sccs;
}

export function judge(found: Found, allowlist: Allowlist, base: Allowlist | null): JudgeResult {
  const errors: string[] = [];
  for (const file of [...found.unknown].sort()) errors.push(`unknown tier: ${file}`);

  const foundEdges = new Set(found.edges);
  const allowEdges = new Set(allowlist.edges);
  for (const edge of [...foundEdges].sort()) {
    if (!allowEdges.has(edge)) errors.push(`upward edge not allowlisted: ${edge}`);
  }
  for (const edge of [...allowEdges].sort()) {
    if (!foundEdges.has(edge)) errors.push(`allowlist edge is not in the tree: ${edge}`);
  }

  const foundCycles = cycleSet(found.cycles);
  const allowCycles = cycleSet(allowlist.cycles);
  for (const cycle of [...foundCycles].sort()) {
    if (!allowCycles.has(cycle)) errors.push(`cycle not allowlisted: ${cycle}`);
  }
  for (const cycle of [...allowCycles].sort()) {
    if (!foundCycles.has(cycle)) errors.push(`allowlist cycle is not in the tree: ${cycle}`);
  }

  if (base !== null) {
    const baseEdges = new Set(base.edges);
    const baseCycles = cycleSet(base.cycles);
    for (const edge of [...allowEdges].sort()) {
      if (!baseEdges.has(edge)) errors.push(`allowlist grew past the base: ${edge}`);
    }
    for (const cycle of [...allowCycles].sort()) {
      if (!baseCycles.has(cycle)) errors.push(`allowlist grew past the base: ${cycle}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function cycleSet(cycles: string[][]): Set<string> {
  return new Set(cycles.map((cycle) => cycleKey(cycle)));
}

export function parseAllowlist(text: string): Allowlist {
  const raw: unknown = JSON.parse(text);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('layer-order allowlist must be an object');
  }
  const rec = raw as { edges?: unknown; cycles?: unknown };
  if (!Array.isArray(rec.edges) || !rec.edges.every((edge) => typeof edge === 'string')) {
    throw new Error('layer-order allowlist edges must be strings');
  }
  if (
    !Array.isArray(rec.cycles) ||
    !rec.cycles.every(
      (cycle) => Array.isArray(cycle) && cycle.length > 0 && cycle.every((node) => typeof node === 'string'),
    )
  ) {
    throw new Error('layer-order allowlist cycles must be non-empty string arrays');
  }
  return { edges: rec.edges, cycles: rec.cycles as string[][] };
}

export function readAllowlist(file: string): Allowlist {
  return parseAllowlist(readFileSync(file, 'utf8'));
}

/** True when `git show` failed because the allowlist path is not on that commit. */
export function allowlistAbsentOnBase(stderr: string): boolean {
  return /does not exist in 'origin\/master'|exists on disk, but not in 'origin\/master'/.test(stderr);
}

export function readBaseAllowlist(root: string): Allowlist | null {
  const ref = git(root, ['rev-parse', '--verify', '--quiet', 'origin/master']);
  if (ref.code !== 0 || ref.stdout.trim() === '') {
    throw new Error('origin/master is not available; fetch it before the layer-order check');
  }
  const show = git(root, ['show', 'origin/master:tools/layer-order/allowlist.json']);
  if (show.code !== 0) {
    if (allowlistAbsentOnBase(show.stderr)) return null;
    throw new Error(`layer-order: cannot read the base allowlist: ${show.stderr.trim()}`);
  }
  return parseAllowlist(show.stdout);
}

function git(root: string, args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: err.status ?? 1,
      stdout: String(err.stdout ?? ''),
      stderr: String(err.stderr ?? ''),
    };
  }
}

export function gate(root: string): JudgeResult & { edgeCount: number; cycleCount: number } {
  const { found } = scanRepository(root);
  const allow = readAllowlist(join(root, 'tools/layer-order/allowlist.json'));
  const base = readBaseAllowlist(root);
  const judged = judge(found, allow, base);
  return { ...judged, edgeCount: found.edges.length, cycleCount: found.cycles.length };
}

function runCli(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  let result: ReturnType<typeof gate>;
  try {
    result = gate(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log(`layer-order: ok (${result.edgeCount} upward edges, ${result.cycleCount} cycles)`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) runCli();
