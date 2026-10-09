/**
 * The constant tables an experiment record fingerprints, each under its own name so replay can
 * say WHICH table changed (design: `docs/planning/Experiment-Record-Replay-Design-Note.md`).
 *
 * A table is named by the source module that holds it, relative to the source root and without
 * extension (`core/constants`, `dimensional/units`, `bridges/be58-johnson-nyquist-confrontation`).
 * Two kinds:
 *
 * - **module exports** — every numeric export of `core/constants` and of each module under
 *   `bridges/` and `cases/`, found by listing those directories, so a module added later is
 *   fingerprinted without being listed here;
 * - **object tables** — the unit and prefix tables of `dimensional/units` (with the SHA-256 of
 *   `data/units.json`, the file they are read from), and the constant
 *   registries `dimensional/symbolic-constants` and `composition/canonical-graph`, flattened to
 *   `key.field` entries.
 *
 * A literal a module keeps private (not exported, not in one of the object tables) is in no table.
 */

import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CANONICAL_CONSTANTS } from '../composition/canonical-graph.js';
import { CONSTANTS as SYMBOLIC_CONSTANTS } from '../dimensional/symbolic-constants.js';
import type { Dimension } from '../dimensional/types.js';
import { unitTables } from '../dimensional/units.js';

/** A serialisable primitive value that can be fingerprinted in a constant table. */
export type TableValue = number | string | boolean;

/** A named table of constants and the SHA-256 fingerprint of its serialised values. */
export interface ConstantTable {
  values: Record<string, TableValue>;
  sha256: string;
}

/** The source shape used to build a constant table. */
export type TableKind = 'module-exports' | 'object';

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Source root (`dist/` when built, `src/` under a TypeScript loader) and its module extension. */
export const SOURCE_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MODULE_EXT = extname(fileURLToPath(import.meta.url));

/** Serialised with sorted keys so the fingerprint does not depend on declaration order. */
export const tableFingerprint = (values: Record<string, TableValue>): string =>
  sha256(JSON.stringify(Object.fromEntries(Object.keys(values).sort().map((k) => [k, values[k]]))));

/** Exponents in a fixed base order, independent of how `format()` names a dimension. */
const dimensionText = (d: Dimension): string =>
  (['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const)
    .filter((b) => d[b] !== 0)
    .map((b) => `${b}^${d[b]}`)
    .join(' ') || '1';

const MODULE_EXPORT_ROOTS = ['core/constants', 'bridges', 'cases'];

function moduleFiles(rel: string): string[] {
  const path = join(SOURCE_ROOT, rel);
  let isDir = false;
  try {
    isDir = statSync(path).isDirectory();
  } catch {
    return [path + MODULE_EXT];
  }
  if (!isDir) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((f) => {
      const p = join(path, f);
      if (statSync(p).isDirectory()) return moduleFiles(join(rel, f));
      return f.endsWith(MODULE_EXT) && !f.endsWith(`.d${MODULE_EXT}`) && f !== `index${MODULE_EXT}` ? [p] : [];
    });
}

export const tableName = (file: string): string =>
  relative(SOURCE_ROOT, file).slice(0, -MODULE_EXT.length).split(sep).join('/');

function objectTables(): Record<string, Record<string, TableValue>> {
  const units: Record<string, TableValue> = {};
  const { units: unitMap, prefixes, celsiusOffsetK, sourceSha256 } = unitTables();
  for (const [sym, [scale, dim, prefixable, cycles]] of unitMap) {
    units[`${sym}.scale`] = scale;
    units[`${sym}.dimension`] = dimensionText(dim);
    units[`${sym}.prefixable`] = prefixable;
    // A cycle-counting row multiplies an angular input by 2π, so it changes a result like a scale does.
    units[`${sym}.cycles`] = cycles; // the cycle-count flag (Hz, rpm); the reader keeps the count and prints a note, it does not multiply by 2π
  }
  for (const [p, f] of prefixes) units[`prefix.${p}`] = f;
  units['degC.offsetK'] = celsiusOffsetK;
  // The whole file, so a refused spelling, a prefix letter, an affine row or a note is covered too.
  units['data/units.json.sha256'] = sourceSha256;
  const registry = (table: Readonly<Record<string, { value: number; dim: Dimension }>>): Record<string, TableValue> => {
    const out: Record<string, TableValue> = {};
    for (const [k, c] of Object.entries(table)) {
      out[`${k}.value`] = c.value;
      out[`${k}.dimension`] = dimensionText(c.dim);
    }
    return out;
  };
  return {
    'dimensional/units': units,
    'dimensional/symbolic-constants': registry(SYMBOLIC_CONSTANTS),
    'composition/canonical-graph': registry(CANONICAL_CONSTANTS),
  };
}

let cached: Promise<{ tables: Record<string, ConstantTable>; kinds: Record<string, TableKind> }> | undefined;

/** Every table, keyed by name, sorted. Read once per process: tables are module-level constants. */
export function constantTables(): Promise<{ tables: Record<string, ConstantTable>; kinds: Record<string, TableKind> }> {
  cached ??= (async () => {
    const found: [string, Record<string, TableValue>, TableKind][] = [];
    for (const file of MODULE_EXPORT_ROOTS.flatMap(moduleFiles)) {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      const values: Record<string, TableValue> = {};
      for (const [k, v] of Object.entries(mod)) if (typeof v === 'number') values[k] = v;
      if (Object.keys(values).length > 0) found.push([tableName(file), values, 'module-exports']);
    }
    for (const [name, values] of Object.entries(objectTables())) found.push([name, values, 'object']);
    found.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const tables: Record<string, ConstantTable> = {};
    const kinds: Record<string, TableKind> = {};
    for (const [name, values, kind] of found) {
      tables[name] = { values, sha256: tableFingerprint(values) };
      kinds[name] = kind;
    }
    return { tables, kinds };
  })();
  return cached;
}
