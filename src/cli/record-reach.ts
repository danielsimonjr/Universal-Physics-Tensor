/**
 * Static attribution for an experiment record: which constants a command's code can reach
 * (design: `docs/planning/Experiment-Record-Replay-Design-Note.md`).
 *
 * The reach is derived from the import graph of the modules as they are on disk when the entry is
 * recorded, not declared by hand and not observed while the command runs. It is an UPPER BOUND:
 *
 * - from `cli/commands/<command>` every relative static and literal dynamic import is followed;
 * - a `cli/` module reaches the `cli-api` barrel through `ctx.api`, not through an import, so every
 *   barrel export whose name occurs as a word in a reached `cli/` module adds its source module;
 * - a named export of a module-exports table is reached when a reached module imports it by name
 *   or by namespace, re-exports it, or the table's own module mentions it outside its declaration;
 * - an object table is reached whole (`*`) when its module is reached.
 *
 * Comments and strings are not stripped, so a name mentioned only in a comment counts as reached:
 * that errs toward "reachable", never toward "not reachable".
 *
 * The same import graph gives the modules the command loads. Each one's source is hashed, so a
 * change to a literal a module keeps private, which no constant table holds, is still named.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { MODULE_EXT, SOURCE_ROOT, tableName, type TableKind } from './record-tables.js';

export const REACH_METHOD = 'static-import-reach';

export interface Attribution {
  method: typeof REACH_METHOD;
  command: string;
  /** Table name -> the keys the command's code can reach, or `['*']` for the whole table. */
  tables: Record<string, string[]>;
  /**
   * Module name (as a table is named) -> SHA-256 of its source, for every module the command
   * loads. Absent from entries written before module sources were hashed.
   */
  modules?: Record<string, string>;
}

/** A reached module reads `names` of `file`, `*` for all of them. */
interface Read {
  file: string;
  names: string[] | '*';
}

/** `file` re-exports: `pairs` as `[exported, original]` (`original` `*` for a namespace), or everything. */
interface Reexport {
  file: string;
  pairs: [string, string][] | '*';
}

const source = new Map<string, string>();
const read = (file: string): string => {
  let s = source.get(file);
  if (s === undefined) {
    s = readFileSync(file, 'utf8');
    source.set(file, s);
  }
  return s;
};

function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  let file = resolve(dirname(from), spec);
  if (MODULE_EXT !== '.js') file = file.replace(/\.js$/, MODULE_EXT);
  return existsSync(file) ? file : null;
}

/** `[exported-or-local, original]` for each value binding of an import or export clause. */
function clausePairs(clause: string): [string, string][] | '*' {
  const ns = /\*\s*as\s+([\w$]+)/.exec(clause);
  if (ns) return [[ns[1], '*']];
  if (/^\s*\*\s*$/.test(clause)) return '*';
  const pairs: [string, string][] = [];
  const braces = /\{([^}]*)\}/.exec(clause);
  if (braces) {
    for (const part of braces[1].split(',')) {
      const m = /^\s*(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?/.exec(part);
      if (m && !m[1]) pairs.push([m[3] ?? m[2], m[2]]);
    }
  }
  const def = /^\s*([\w$]+)\s*(,|$)/.exec(clause);
  if (def && def[1] !== 'type') pairs.push([def[1], 'default']);
  return pairs;
}

const STATIC_FROM = /\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const parsed = new Map<string, { reads: Read[]; reexports: Reexport[] }>();

function edges(file: string): { reads: Read[]; reexports: Reexport[] } {
  const hit = parsed.get(file);
  if (hit) return hit;
  const text = read(file);
  const reads: Read[] = [];
  const reexports: Reexport[] = [];
  for (const m of text.matchAll(STATIC_FROM)) {
    if (m[2]) continue;
    const target = resolveSpec(file, m[4]);
    if (!target) continue;
    const pairs = clausePairs(m[3]);
    if (m[1] === 'export') reexports.push({ file: target, pairs });
    else reads.push({ file: target, names: pairs === '*' || pairs.some(([, o]) => o === '*') ? '*' : pairs.map(([, o]) => o) });
  }
  for (const m of text.matchAll(SIDE_EFFECT)) {
    const target = resolveSpec(file, m[1]);
    if (target) reads.push({ file: target, names: [] });
  }
  for (const m of text.matchAll(DYNAMIC)) {
    const target = resolveSpec(file, m[1]);
    if (target) reads.push({ file: target, names: '*' });
  }
  const out = { reads, reexports };
  parsed.set(file, out);
  return out;
}

const words = (text: string): Set<string> => new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);

/** What a `cli/` module reaches through `ctx.api`: each `cli-api` export whose name occurs in it. */
function apiReads(file: string): Read[] {
  const barrel = join(SOURCE_ROOT, `cli-api${MODULE_EXT}`);
  const w = words(read(file));
  const out: Read[] = [];
  for (const re of edges(barrel).reexports) {
    if (re.pairs === '*') out.push({ file: re.file, names: '*' });
    else for (const [exported, original] of re.pairs) if (w.has(exported)) out.push({ file: re.file, names: original === '*' ? '*' : [original] });
  }
  return out;
}

/** Comments that open a line: outside a multi-line template literal a line cannot begin code with
 * `/*` or `//`, so no code is removed. A comment after code stays, which errs toward "reachable". */
const withoutLeadingComments = (text: string): string =>
  text.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/^[ \t]*\/\/.*$/gm, '');

const mentions = (text: string, name: string): number =>
  text.match(new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'))?.length ?? 0;

const cache = new Map<string, Attribution | null>();
const loadedCache = new Map<string, { loaded: Set<string>; directReads: Read[] } | null>();

/** Every module `command` loads, and what each reads, or null when the command has no module. */
function loadedModules(command: string): { loaded: Set<string>; directReads: Read[] } | null {
  if (loadedCache.has(command)) return loadedCache.get(command)!;
  const seed = join(SOURCE_ROOT, 'cli', 'commands', `${command}${MODULE_EXT}`);
  if (!existsSync(seed)) {
    loadedCache.set(command, null);
    return null;
  }
  const cliDir = join(SOURCE_ROOT, 'cli') + sep;

  // Modules loaded: every import and re-export is followed, since loading runs top-level code.
  const loaded = new Set<string>();
  const directReads: Read[] = [];
  const queue = [seed];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (loaded.has(file)) continue;
    loaded.add(file);
    const { reads, reexports } = edges(file);
    const all = file.startsWith(cliDir) ? [...reads, ...apiReads(file)] : reads;
    directReads.push(...all);
    for (const t of [...all.map((r) => r.file), ...reexports.map((r) => r.file)]) if (!loaded.has(t)) queue.push(t);
  }
  const out = { loaded, directReads };
  loadedCache.set(command, out);
  return out;
}

/**
 * SHA-256 of the source of every module `command` loads, keyed by module name, read from disk now
 * (not from the parse cache), or null when the command has no module of its own.
 */
export function moduleSources(command: string): Record<string, string> | null {
  const mods = loadedModules(command);
  if (!mods) return null;
  const out: Record<string, string> = {};
  for (const file of [...mods.loaded].sort()) {
    let hash: string;
    try {
      hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    } catch {
      hash = 'unreadable';
    }
    out[tableName(file)] = hash;
  }
  return out;
}

/** The reach of `command`'s code into `tables`, or null when the command has no module of its own. */
export function staticReach(
  command: string,
  tables: Record<string, { values: Record<string, unknown> }>,
  kinds: Record<string, TableKind>,
): Attribution | null {
  if (cache.has(command)) return cache.get(command)!;
  const mods = loadedModules(command);
  if (!mods) {
    cache.set(command, null);
    return null;
  }
  const { loaded, directReads } = mods;

  // Names read: an import reads its names; a re-export passes on only the names read from it.
  const namesOf = new Map<string, Set<string> | '*'>();
  const mark = (file: string, names: string[] | '*'): void => {
    const prev = namesOf.get(file) ?? new Set<string>();
    if (prev === '*') return;
    const fresh = names === '*' ? ['*'] : names.filter((n) => !prev.has(n));
    if (fresh.length === 0) {
      namesOf.set(file, prev);
      return;
    }
    namesOf.set(file, names === '*' ? '*' : new Set([...prev, ...fresh]));
    for (const re of edges(file).reexports) {
      if (re.pairs === '*') mark(re.file, names === '*' ? '*' : fresh);
      else {
        for (const [exported, original] of re.pairs) {
          if (names === '*' || fresh.includes(exported)) mark(re.file, original === '*' ? '*' : [original]);
        }
      }
    }
  };
  for (const r of directReads) mark(r.file, r.names);

  const out: Record<string, string[]> = {};
  for (const [name, table] of Object.entries(tables)) {
    const file = join(SOURCE_ROOT, `${name}${MODULE_EXT}`);
    const names = namesOf.get(file);
    if (!loaded.has(file) || tableName(file) !== name || names === undefined || (names !== '*' && names.size === 0)) continue;
    if (kinds[name] !== 'module-exports') {
      out[name] = ['*'];
      continue;
    }
    const own = withoutLeadingComments(read(file));
    const keys = Object.keys(table.values).filter((k) => names === '*' || names.has(k) || mentions(own, k) > 1);
    if (keys.length > 0) out[name] = keys.length === Object.keys(table.values).length ? ['*'] : keys.sort();
  }
  const attribution: Attribution = { method: REACH_METHOD, command, tables: out };
  cache.set(command, attribution);
  return attribution;
}
