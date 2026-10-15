/**
 * The hand-written documentation names only symbols the package exports.
 *
 * `docs/architecture/API.md` presents a symbol as importable in an `import { … } from
 * 'universal-physics-tensor'` fence, a row of its symbol tables, a `###` heading (`` ### `name(args)` ``),
 * or a subpath fence (`'universal-physics-tensor/numerical/mathts-engine'`); every other document
 * under `docs/` and every `src/<layer>/README.md` presents one in an import fence. Each must be a
 * runtime export of the built entry (`dist/index.js`, or the subpath's file from `package.json`
 * `exports`) or a type its `.d.ts` names.
 *
 * Found by Tom's second-round sweep (the fences and tables): `evaluateGravitationalLensing`,
 * `evaluatePerihelionPrecession` and their four types, removed in 6.0.0. Found by the 2026-10-15
 * survey, outside what the test then read: a heading documenting
 * `evaluateBE37CovariantEikonalNumerical` (the export is `evaluateCovariantEikonalNumerical`),
 * a coverage note naming `bridgeGradient`, "BE-53/54 evaluators" and the `BridgeEquations`
 * facade (removed 2026-10-09 and in 6.0.0), and the intelligent-index tutorial importing
 * `Float64ReferenceEngine`, a class that no longer exists. Each extractor has a positive control
 * with a planted stale name.
 *
 * Dated records are not read: `docs/persona-sessions/` (model sessions against published
 * versions), `docs/architecture/archive/` and `docs/planning/` (per-release design records)
 * quote the surface of their day, and a record is not rewritten (AGENTS.md, law 8).
 *
 * @module tests/api/api-reference-symbols
 */
import '../helpers/dist.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as root from '../../dist/index.js';

const ROOT = join(import.meta.dirname, '../..');
const doc = readFileSync(join(ROOT, 'docs/architecture/API.md'), 'utf8');
const dts = readFileSync(join(ROOT, 'dist/index.d.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  exports: Record<string, string | Record<string, string>>;
};

/** Dated records, left out by directory (see the module comment). */
const DATED_RECORDS = ['docs/persona-sessions', 'docs/architecture/archive', 'docs/planning'];

/** Type names a `.d.ts` exports: `export type { A, B }` clauses, `export type X`/`export interface X`, and inline `type` members. */
function typeExportsOf(text: string): Set<string> {
  const names = new Set<string>();
  for (const m of text.matchAll(/export type \{([^}]*)\}/g)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  for (const m of text.matchAll(/export (?:type|interface|declare type|declare class|declare function|declare const) (\w+)/g)) names.add(m[1]!);
  for (const m of text.matchAll(/export \{([^}]*)\}/g)) {
    for (const t of m[1]!.matchAll(/\btype (\w+)/g)) names.add(t[1]!);
  }
  return names;
}

interface Named {
  name: string;
  line: number;
  /** `''` for the package root; `/numerical/mathts-engine` for a subpath. */
  subpath: string;
}

/** The names of every `import { … } from 'universal-physics-tensor[/subpath]'` fence in `text`. */
function importedNames(text: string): Named[] {
  const out: Named[] = [];
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'universal-physics-tensor(\/[^']+)?'/g;
  for (const m of text.matchAll(re)) {
    const line = text.slice(0, m.index).split('\n').length;
    for (const part of m[1]!.split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
      if (name) out.push({ name, line, subpath: m[2] ?? '' });
    }
  }
  return out;
}

/** The symbol of every `| \`X\` | \`kind\` |` row of API.md's symbol tables. */
function tableRows(text: string): Named[] {
  const out: Named[] = [];
  text.split('\n').forEach((line, i) => {
    const m = /^\| `([A-Za-z_][\w]*)` \| `[\w/-]+` \|/.exec(line);
    if (m) out.push({ name: m[1]!, line: i + 1, subpath: '' });
  });
  return out;
}

/** Every backticked identifier, with or without a parameter list, in a `###` heading: `` ### `multiply(a, b)` / `divide(a, b)` — functions ``. */
function headingNames(text: string): Named[] {
  const out: Named[] = [];
  text.split('\n').forEach((line, i) => {
    if (!line.startsWith('### ')) return;
    for (const m of line.matchAll(/`([A-Za-z_$][\w$]*)(?:\([^`]*\))?`/g)) out.push({ name: m[1]!, line: i + 1, subpath: '' });
  });
  return out;
}

/** The documents read: every Markdown file under `docs/` outside the dated records, and every `src/<layer>/README.md`. */
function documents(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.md')) out.push(p);
    }
  };
  walk(join(ROOT, 'docs'));
  for (const layer of readdirSync(join(ROOT, 'src'))) {
    const readme = join(ROOT, 'src', layer, 'README.md');
    if (existsSync(readme)) out.push(readme);
  }
  return out
    .map((p) => relative(ROOT, p).replace(/\\/g, '/'))
    .filter((p) => !DATED_RECORDS.some((dir) => p.startsWith(`${dir}/`)))
    .sort();
}

/** The runtime and type names of a `package.json` `exports` subpath, from the built files it maps to. */
async function subpathNames(subpath: string): Promise<Set<string>> {
  const entry = pkg.exports[`.${subpath}`];
  if (entry === undefined) return new Set();
  const js = typeof entry === 'string' ? entry : (entry.import ?? entry.default);
  const d = typeof entry === 'string' ? entry.replace(/\.js$/, '.d.ts') : (entry.types ?? js!.replace(/\.js$/, '.d.ts'));
  const names = typeExportsOf(readFileSync(join(ROOT, d), 'utf8'));
  const mod = (await import(pathToFileURL(join(ROOT, js!)).href)) as Record<string, unknown>;
  for (const name of Object.keys(mod)) names.add(name);
  return names;
}

const types = typeExportsOf(dts);
const atRoot = (name: string): boolean => name in root || types.has(name);

/**
 * Member names the built `.d.ts` tree declares inside a class or interface body
 * (`readonly axisOrder: …`, `axisOf(…)`, `get x()`), so a note may name a member of a surface
 * class (`LabeledTensor`'s `mergeAxes`) beside the exports.
 */
function declaredMembers(): Set<string> {
  const names = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.d.ts')) {
        const text = readFileSync(p, 'utf8');
        for (const m of text.matchAll(/^\s+(?:(?:readonly|static|get|set|private|protected|public|abstract)\s+)*([A-Za-z_$][\w$]*)\??\s*[(:<]/gm)) {
          names.add(m[1]!);
        }
      }
    }
  };
  walk(join(ROOT, 'dist'));
  return names;
}

describe('the extractors', () => {
  it('CONTROL: each extractor reports a planted stale name, and the real documents are seen', () => {
    expect(importedNames("import { nope } from 'universal-physics-tensor';")).toEqual([{ name: 'nope', line: 1, subpath: '' }]);
    expect(importedNames("import type {\n  Gone,\n} from 'universal-physics-tensor/numerical/mathts-engine';")).toEqual([
      { name: 'Gone', line: 1, subpath: '/numerical/mathts-engine' },
    ]);
    expect(tableRows('| `zzzGone` | `function` |').map((x) => x.name)).toEqual(['zzzGone']);
    expect(headingNames('### `evaluateBE37CovariantEikonalNumerical(inputs)` — function').map((x) => x.name)).toEqual([
      'evaluateBE37CovariantEikonalNumerical',
    ]);
    expect(headingNames('### `multiply(a, b)` / `divide(a, b)` — functions').map((x) => x.name)).toEqual(['multiply', 'divide']);
    expect(headingNames('### Named dimension constants')).toEqual([]);
    expect(headingNames('## `notAHeadingOfInterest`')).toEqual([]);
    expect(importedNames(doc).length).toBeGreaterThan(20);
    expect(tableRows(doc).length).toBeGreaterThan(20);
    expect(headingNames(doc).length).toBeGreaterThan(20);
    expect(atRoot('BRIDGE_EQUATIONS')).toBe(true);
    expect(atRoot('Dimension')).toBe(true);
    expect(atRoot('GeodesicIntegratorInputs')).toBe(true);
    expect(atRoot('noSuchSymbolXyz')).toBe(false);
    const docs = documents();
    expect(docs).toContain('docs/architecture/API.md');
    expect(docs).toContain('docs/architecture/intelligent-index-tutorial.md');
    expect(docs).toContain('src/dimensional/README.md');
    expect(docs.some((p) => p.startsWith('docs/persona-sessions/'))).toBe(false);
    for (const dir of DATED_RECORDS) expect(existsSync(join(ROOT, dir)), dir).toBe(true);
  });
});

describe('docs/architecture/API.md names only symbols the package exports', () => {
  it('every imported name in a root import fence is a root export', () => {
    const missing = importedNames(doc)
      .filter((x) => x.subpath === '' && !atRoot(x.name))
      .map((x) => `${x.name} (line ${x.line})`);
    expect(missing).toEqual([]);
  });

  it('every row of the symbol tables is a root export', () => {
    const missing = tableRows(doc).filter((x) => !atRoot(x.name)).map((x) => `${x.name} (line ${x.line})`);
    expect(missing).toEqual([]);
  });

  it('every symbol a ### heading names is a root or subpath export', async () => {
    const onSubpaths = new Set<string>();
    for (const key of Object.keys(pkg.exports)) {
      if (key === '.') continue;
      for (const name of await subpathNames(key.slice(1))) onSubpaths.add(name);
    }
    const missing = headingNames(doc)
      .filter((x) => !atRoot(x.name) && !onSubpaths.has(x.name))
      .map((x) => `${x.name} (line ${x.line})`);
    expect(missing).toEqual([]);
  });

  it('every subpath import fence names an export of that subpath', async () => {
    const missing: string[] = [];
    for (const x of importedNames(doc).filter((x) => x.subpath !== '')) {
      const names = await subpathNames(x.subpath);
      if (names.size === 0) missing.push(`${x.subpath} (line ${x.line}): not a package.json exports subpath`);
      else if (!names.has(x.name)) missing.push(`${x.name} from ${x.subpath} (line ${x.line})`);
    }
    expect(missing).toEqual([]);
  });

  it('the coverage note names no symbol the surface has lost', () => {
    // The note lists layers "on the surface but documented elsewhere"; a backticked name it
    // carries is an export, or a member a surface class declares (`LabeledTensor`'s `axisOf`).
    const members = declaredMembers();
    expect(members.has('axisOf')).toBe(true); // control: a member is seen
    expect(members.has('bridgeGradient')).toBe(false); // control: a removed export is not a member
    const note = doc.split('\n').find((line) => line.startsWith('> **Coverage note**')) ?? '';
    const named = [...note.matchAll(/`([A-Za-z_$][\w$]*)`/g)].map((m) => m[1]!);
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((name) => !atRoot(name) && !members.has(name))).toEqual([]);
  });
});

describe('every other document names only symbols the package exports', () => {
  it('each import fence of docs/**/*.md (dated records excluded) and src/*/README.md', async () => {
    const missing: string[] = [];
    let fences = 0;
    for (const file of documents()) {
      if (file === 'docs/architecture/API.md') continue;
      const text = readFileSync(join(ROOT, file), 'utf8');
      for (const x of importedNames(text)) {
        fences++;
        const ok = x.subpath === '' ? atRoot(x.name) : (await subpathNames(x.subpath)).has(x.name);
        if (!ok) missing.push(`${file}:${x.line} ${x.name}${x.subpath === '' ? '' : ` from ${x.subpath}`}`);
      }
    }
    expect(fences).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });
});
