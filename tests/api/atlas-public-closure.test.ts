/**
 * The public `atlas` namespace is CLOSED under type references.
 *
 * Found while implementing the Tier 1 promotion: `AtlasFamily` contains
 * `bridges: AtlasBridge[]`, and `AtlasBridge` is not public — a private type
 * reachable through a public one, a leak whatever the tags say. Demoting
 * `AtlasFamily` fixed that instance; this test fixes the CLASS, so the next
 * promotion cannot re-introduce it unnoticed.
 *
 * Method: a source-text scan. This repo is on TypeScript 7 (the native
 * compiler), which ships no JavaScript compiler API, so the checker cannot be
 * asked. The scan therefore carries its own controls: it must FIND the
 * AtlasFamily → AtlasBridge leak, and it must NOT count a type named only in a
 * comment.
 *
 * The facade file is the ONLY list of the public set; this test derives the set
 * and its size from it.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { namedReExports } from './_public-surface-parse.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../src');
const FACADE = resolve(SRC, 'atlas/public.ts');
const facadeReExports = namedReExports(readFileSync(FACADE, 'utf-8'));
const facadeNames = facadeReExports.map((r) => r.name);

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/**
 * The declaration text of `name` in `source`, comments removed: from its
 * `export <kind> name` line to the end of its signature/body — the body of an
 * interface or type, the signature (not the body) of a function, the type
 * annotation (not the initializer) of a const.
 */
export function declarationText(source: string, name: string): string | undefined {
  const code = stripComments(source);
  const m = new RegExp(
    `export\\s+(?:(?:abstract|async|declare)\\s+)*(interface|type|class|function|const|enum)\\s+${name}\\b`,
  ).exec(code);
  if (m === null) return undefined;
  const kind = m[1];
  let depth = 0;
  for (let i = m.index; i < code.length; i++) {
    const ch = code[i]!;
    if ('([<'.includes(ch)) depth++;
    else if (')]>'.includes(ch) && code[i - 1] !== '=') depth--;
    else if (ch === '{') {
      if ((kind === 'function' || kind === 'class') && depth === 0) return code.slice(m.index, i);
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && (kind === 'interface' || kind === 'enum')) return code.slice(m.index, i + 1);
    } else if (ch === '=' && depth === 0 && kind === 'const' && code[i + 1] !== '>') {
      return code.slice(m.index, i);
    } else if (ch === ';' && depth === 0) return code.slice(m.index, i + 1);
  }
  return code.slice(m.index);
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (e.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

/** Every type-like name DECLARED under src/atlas/ (interfaces, type aliases, classes, enums). */
const ATLAS_TYPE_NAMES = new Set(
  walk(resolve(SRC, 'atlas')).flatMap((f) =>
    [...stripComments(readFileSync(f, 'utf-8')).matchAll(/export\s+(?:interface|type|class|enum)\s+([A-Za-z_$][\w$]*)/g)].map(
      (m) => m[1]!,
    ),
  ),
);

/**
 * Declaration text the closure scan should read. A public alias
 * `export type Name = import('./m.js').Name` is the same type as the
 * vocabulary declaration; the scan follows it, or a moved interface would
 * pass while its fields were never read.
 */
export function followedDeclaration(
  source: string,
  name: string,
  read: (spec: string) => string | undefined,
  depth = 0,
): string | undefined {
  if (depth > 4) return undefined;
  const text = declarationText(source, name);
  if (text !== undefined) {
    const alias = /export\s+type\s+[A-Za-z0-9_$]+\s*=\s*import\(\s*(['"])([^'"]+)\1\s*\)\.([A-Za-z0-9_$]+)/.exec(
      stripComments(text),
    );
    if (alias === null) return text;
    const next = read(alias[2]!);
    if (next === undefined) return text;
    return followedDeclaration(next, alias[3]!, read, depth + 1) ?? text;
  }
  const hop = namedReExports(source).find((item) => item.name === name);
  if (hop === undefined) return undefined;
  const next = read(hop.specifier);
  if (next === undefined) return undefined;
  return followedDeclaration(next, name, read, depth + 1);
}

/** Atlas type names referenced (as whole words) in `text`, other than `self`. */
const atlasRefs = (text: string, self: string): string[] =>
  [...ATLAS_TYPE_NAMES].filter((t) => t !== self && new RegExp(`\\b${t}\\b`).test(text));

describe('atlas public namespace — derived from the facade file', () => {
  it('the facade lists 24 distinct names (the count is DERIVED here, stated nowhere else)', () => {
    expect(new Set(facadeNames).size).toBe(facadeNames.length);
    expect(facadeNames.length).toBe(24);
  });

  it('the root exposes the namespace, and its runtime keys are exactly the facade VALUES', async () => {
    const root = (await import('../../src/index.js')) as unknown as { atlas: object };
    const keys = Object.keys(root.atlas).sort();
    for (const k of keys) expect(facadeNames).toContain(k);
    expect(keys).toEqual(
      [
        'COMPOSITION_TABLE',
        'IDENTITY_BOUND',
        'MissingHorizonError',
        'MissingLipschitzError',
        'NO_COMPOSITE_CLAIM',
        'composeBoundPath',
        'composeBounds',
        'composeRelation',
        'regimeHolds',
      ].sort(),
    );
  });
});

describe('the scan — proven before it is trusted', () => {
  it('POSITIVE CONTROL: it finds AtlasFamily → AtlasBridge, the leak that motivated this test', () => {
    const src = readFileSync(resolve(SRC, 'atlas/oscillators/index.ts'), 'utf-8');
    const text = declarationText(src, 'AtlasFamily');
    expect(text).toBeDefined();
    expect(atlasRefs(text!, 'AtlasFamily')).toContain('AtlasBridge');
  });

  it('NEGATIVE CONTROL: a type named only in a COMMENT is not a reference', () => {
    const src = [
      'export interface Probe {',
      '  /** mentions AtlasBridge in prose only */',
      '  readonly x: number; // and AtlasBridge again',
      '}',
    ].join('\n');
    expect(atlasRefs(declarationText(src, 'Probe')!, 'Probe')).toEqual([]);
  });

  it('FOLLOWS export-from to the declaration the facade names', () => {
    const origin = 'export function regimeHolds(regime: Regime): boolean { return true; }';
    const shim = "export { regimeHolds } from './regime.js';";
    const read = (spec: string): string | undefined => (spec === './regime.js' ? origin : undefined);
    const text = followedDeclaration(shim, 'regimeHolds', read);
    expect(text).toBeDefined();
    expect(atlasRefs(text!, 'regimeHolds')).toContain('Regime');
    expect(followedDeclaration("export { gone } from './nope.js';", 'gone', () => undefined)).toBeUndefined();
  });

  it('FOLLOWS a type alias into the module it names, so a leak behind the alias fails', () => {
    const leaky = 'export interface Secret { readonly x: AtlasBridge; }';
    const alias = 'export type Public = import("./secret.js").Secret;';
    const read = (spec: string): string | undefined => (spec === './secret.js' ? leaky : undefined);
    const text = followedDeclaration(alias, 'Public', read);
    expect(text).toBeDefined();
    expect(atlasRefs(text!, 'Public')).toContain('AtlasBridge');
  });

  it('a function contributes its SIGNATURE, not its body', () => {
    const src = 'export function f(a: Regime): BoundPair {\n  const x: AtlasBridge = null!;\n  return x;\n}';
    const refs = atlasRefs(declarationText(src, 'f')!, 'f');
    expect(refs).toContain('Regime');
    expect(refs).toContain('BoundPair');
    expect(refs).not.toContain('AtlasBridge');
  });
});

describe('closure under type references', () => {
  it('every atlas type a public symbol references is itself in the facade', () => {
    const facade = new Set(facadeNames);
    const leaks: string[] = [];
    for (const { name, specifier } of facadeReExports) {
      const file = resolve(dirname(FACADE), specifier.replace(/\.js$/, '.ts'));
      const text = followedDeclaration(readFileSync(file, 'utf-8'), name, (spec) => {
        const target = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
        return existsSync(target) ? readFileSync(target, 'utf-8') : undefined;
      });
      if (text === undefined) {
        leaks.push(`${name}: declaration not found in ${specifier}`);
        continue;
      }
      for (const ref of atlasRefs(text, name)) if (!facade.has(ref)) leaks.push(`${name} → ${ref}`);
    }
    expect(leaks).toEqual([]);
  });
});
