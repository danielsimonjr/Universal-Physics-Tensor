/**
 * The package ROOT surface is closed under type references.
 *
 * `tests/api/atlas-public-closure.test.ts` proves the invariant for the
 * `atlas` facade only; the 9.0.0 audit (§2 N8) found `EinsumSpec`, a root
 * `@public` type, referencing `EinsumFreeAxis`, which was deliberately not
 * exported. A private type reachable through a public one is a leak whatever
 * the tags say, and the root barrel had no guard.
 *
 * Method: a source-text scan (TypeScript 7 ships no compiler API). For every
 * name `src/index.ts` exports from a module, the declaration is found (following
 * `export { x } from` and `export * from` hops) and every capitalised
 * identifier it references must be a root export, a TypeScript or runtime
 * built-in, or one of the declaration's own type parameters. The scan carries
 * controls: it must find a synthetic leak, must not count a type parameter or
 * a word in a string, and must find the real EinsumSpec → EinsumFreeAxis
 * declaration pair.
 *
 * @module tests/api/root-public-closure
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { namedReExports, wildcardReExports } from './_public-surface-parse.js';
import { declarationText } from './atlas-public-closure.test.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../src');
const INDEX = resolve(SRC, 'index.ts');

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Names TypeScript or the runtime declares; a reference to one is not a leak. */
const BUILTIN = new Set([
  'Array', 'ReadonlyArray', 'Readonly', 'Partial', 'Required', 'Record', 'Pick', 'Omit', 'Exclude', 'Extract',
  'NonNullable', 'Parameters', 'ReturnType', 'Awaited', 'Promise', 'Map', 'ReadonlyMap', 'Set', 'ReadonlySet',
  'WeakMap', 'Iterable', 'IterableIterator', 'Iterator', 'Generator', 'ArrayLike', 'Float64Array', 'Float32Array',
  'Uint8Array', 'Int32Array', 'Error', 'TypeError', 'RangeError', 'Date', 'RegExp', 'Function', 'Symbol',
  'String', 'Number', 'Boolean', 'Object', 'URL', 'Infinity', 'NaN', 'PromiseLike', 'ThisType', 'Lowercase',
  'Uppercase', 'Capitalize', 'Uncapitalize', 'Buffer', 'Response', 'Request', 'Headers', 'AbortSignal',
]);

/** Every name `src/index.ts` re-exports, with its specifier, plus names it declares itself. */
function rootExports(indexSrc: string): { names: Set<string>; hops: Array<{ name: string; specifier: string }> } {
  const hops = namedReExports(indexSrc);
  const names = new Set(hops.map((h) => h.name));
  for (const m of stripComments(indexSrc).matchAll(/export\s+(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]!);
  }
  return { names, hops };
}

function readModule(fromFile: string, specifier: string): { file: string; text: string } | undefined {
  const file = resolve(dirname(fromFile), specifier.replace(/\.js$/, '.ts'));
  if (!existsSync(file)) return undefined;
  return { file, text: readFileSync(file, 'utf-8') };
}

/**
 * The declaration of `name` reachable from `file`: declared there, or behind a
 * named or wildcard re-export hop. Cycles and depth are bounded.
 */
export function findDeclaration(
  file: string,
  text: string,
  name: string,
  depth = 0,
  seen = new Set<string>(),
): { file: string; text: string } | undefined {
  if (depth > 6 || seen.has(file)) return undefined;
  seen.add(file);
  const own = declarationText(text, name);
  if (own !== undefined) {
    const alias = /export\s+type\s+[A-Za-z0-9_$]+\s*=\s*import\(\s*(['"])([^'"]+)\1\s*\)\.([A-Za-z0-9_$]+)/.exec(stripComments(own));
    if (alias !== null) {
      const next = readModule(file, alias[2]!);
      if (next !== undefined) return findDeclaration(next.file, next.text, alias[3]!, depth + 1, seen) ?? { file, text: own };
    }
    return { file, text: own };
  }
  const hop = namedReExports(text).find((h) => h.name === name);
  if (hop !== undefined) {
    const next = readModule(file, hop.specifier);
    return next === undefined ? undefined : findDeclaration(next.file, next.text, name, depth + 1, seen);
  }
  for (const spec of wildcardReExports(text)) {
    const next = readModule(file, spec);
    if (next === undefined) continue;
    const found = findDeclaration(next.file, next.text, name, depth + 1, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * The declaration's own type parameters: `Name<Input, T extends X>` → Input, T,
 * and a mapped type's key (`{ [K in Scale]: … }` → K).
 */
export function typeParametersOf(declaration: string, name: string): Set<string> {
  const out = new Set<string>();
  const m = new RegExp(`\\b${name}\\s*<([^>=]*)`).exec(declaration);
  if (m !== null) {
    for (const part of m[1]!.split(',')) {
      const id = /^\s*([A-Za-z_$][\w$]*)/.exec(part);
      if (id !== null) out.add(id[1]!);
    }
  }
  for (const key of declaration.matchAll(/\[\s*([A-Za-z_$][\w$]*)\s+in\b/g)) out.add(key[1]!);
  return out;
}

/**
 * Capitalised identifiers a declaration references as types, other than the
 * declared name, its own type parameters, built-ins, words in strings, the
 * names of its own properties and parameters (`readonly L: number`,
 * `M_kg: number`, `ricci(R: RiemannTensorNode)`) and a parameter's default
 * value (`tol = DEFAULT_TOLERANCE`, a value, not a type).
 */
export function referencedTypeNames(declaration: string, name: string): string[] {
  const code = declaration
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '')
    .replace(/\b[A-Za-z_$][\w$]*(?=\s*\??:)/g, '')
    .replace(/(?<![=!<>])=(?!>)\s*[A-Za-z_$][\w$]*/g, '=');
  const own = typeParametersOf(declaration, name);
  const found = code.match(/\b[A-Z][A-Za-z0-9_$]*\b/g) ?? [];
  return [...new Set(found)].filter((n) => n !== name && !own.has(n) && !BUILTIN.has(n));
}

/** Every name a module exports: its own declarations, named re-exports, and wildcard hops. */
function exportedNamesOf(file: string, depth = 0, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  if (depth > 6 || seen.has(file) || !existsSync(file)) return out;
  seen.add(file);
  const text = readFileSync(file, 'utf-8');
  for (const m of stripComments(text).matchAll(/export\s+(?:(?:abstract|async|declare)\s+)*(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    out.add(m[1]!);
  }
  for (const hop of namedReExports(text)) out.add(hop.name);
  for (const spec of wildcardReExports(text)) {
    for (const n of exportedNamesOf(resolve(dirname(file), spec.replace(/\.js$/, '.ts')), depth + 1, seen)) out.add(n);
  }
  return out;
}

/**
 * Names a consumer can import from a package.json subpath (`./atlas`,
 * `./probe`, `./numerical/mathts-engine`): reachable, so not a leak when a
 * root export references them.
 */
function subpathExportedNames(): Set<string> {
  const pkg = JSON.parse(readFileSync(resolve(SRC, '..', 'package.json'), 'utf-8')) as { exports?: Record<string, unknown> };
  const out = new Set<string>();
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    if (key === '.') continue;
    const candidates = typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>);
    for (const c of candidates) {
      const m = typeof c === 'string' ? /^\.\/dist\/(.+)\.js$/.exec(c) : null;
      if (m !== null) for (const n of exportedNamesOf(resolve(SRC, `${m[1]!}.ts`))) out.add(n);
    }
  }
  return out;
}

describe('the root closure scan — proven before it is trusted', () => {
  it('POSITIVE CONTROL: finds a synthetic leak', () => {
    const src = 'export interface Spec { readonly free: ReadonlyArray<SecretAxis>; }';
    expect(referencedTypeNames(declarationText(src, 'Spec')!, 'Spec')).toEqual(['SecretAxis']);
  });

  it('NEGATIVE CONTROL: a type parameter, a word in a string, a property name and a default are not references', () => {
    const src = "export interface Spec<Input> { readonly keys: ReadonlyArray<keyof Input & string>; readonly tag: 'Secret'; readonly L: number; readonly M_kg?: number; }";
    expect(referencedTypeNames(declarationText(src, 'Spec')!, 'Spec')).toEqual([]);
    const fn = 'export function ricci(R: RiemannTensorNode, tol = DEFAULT_TOL): Out;';
    expect(referencedTypeNames(declarationText(fn, 'ricci')!, 'ricci')).toEqual(['RiemannTensorNode', 'Out']);
    const mapped = "export type Axes = { readonly [K in Scale]: Index<'scale'> };";
    expect(referencedTypeNames(declarationText(mapped, 'Axes')!, 'Axes')).toEqual(['Scale', 'Index']);
  });

  it('subpath entry modules contribute their exported names (the atlas facade is one)', () => {
    const names = subpathExportedNames();
    expect(names.has('ApproximationBound')).toBe(true);
    expect(names.has('MathTSEngine')).toBe(true);
  });

  it('FOLLOWS a wildcard re-export to the declaration', () => {
    // Synthetic modules on disk are not needed: the real barrel is the control.
    const decl = findDeclaration(INDEX, readFileSync(INDEX, 'utf-8'), 'EinsumSpec');
    expect(decl).toBeDefined();
    expect(decl!.file.endsWith('numerical/tensor-engine.ts')).toBe(true);
    expect(decl!.text).toContain('free');
  });
});

describe('the package root is closed under type references', () => {
  it('every type a root export references is itself a root export', () => {
    const indexSrc = readFileSync(INDEX, 'utf-8');
    const { names, hops } = rootExports(indexSrc);
    for (const n of subpathExportedNames()) names.add(n);
    const leaks: string[] = [];
    const unresolved: string[] = [];
    for (const { name, specifier } of hops) {
      const mod = readModule(INDEX, specifier);
      if (mod === undefined) {
        unresolved.push(`${name}: ${specifier} not found`);
        continue;
      }
      const decl = findDeclaration(mod.file, mod.text, name);
      if (decl === undefined) {
        unresolved.push(`${name}: declaration not found via ${specifier}`);
        continue;
      }
      for (const ref of referencedTypeNames(decl.text, name)) {
        if (!names.has(ref)) leaks.push(`${name} → ${ref} (${decl.file.slice(SRC.length + 1)})`);
      }
    }
    expect(unresolved).toEqual([]);
    expect(leaks).toEqual([]);
  });
});
