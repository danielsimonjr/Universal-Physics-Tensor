/**
 * Pure source-text parsers shared by the public-surface invariant tests.
 *
 * Every function takes SOURCE TEXT, never a path, so the tests can prove each
 * one on synthetic input — including the inputs it must REJECT — before trusting
 * it on the real tree. A parser that has only ever been run on the real tree
 * cannot tell "the tree is clean" from "the parser sees nothing".
 *
 * @module tests/api/_public-surface-parse
 */

const EXPORT_DECL_RE =
  /^\s*export\s+(?:(?:abstract|async|declare)\s+)*(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

/**
 * Names declared with a `@public` tag: an `@public` line followed, within the
 * next 8 lines and before another `/**`, by `export <kind> NAME`. The same rule
 * `public-tag-vs-index-invariant.test.ts` has always used.
 */
export function publicDeclNames(content: string): Set<string> {
  const lines = content.split('\n');
  const out = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]!.includes('@public')) continue;
    for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
      const m = EXPORT_DECL_RE.exec(lines[j]!);
      if (m) {
        out.add(m[1]!);
        break;
      }
      if (lines[j]!.trim().startsWith('/**') && j !== i + 1) break;
    }
  }
  return out;
}

/** `export * as NS from 'spec'` lines. `export * from` (no `as`) is NOT one. */
export function namespaceReExports(content: string): Array<{ ns: string; specifier: string }> {
  const re = /export\s+\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/g;
  const out: Array<{ ns: string; specifier: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push({ ns: m[1]!, specifier: m[2]! });
  return out;
}

/** `export * from 'spec'` lines, WITHOUT `as` (whole-module wildcards). */
export function wildcardReExports(content: string): string[] {
  const re = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push(m[1]!);
  return out;
}

/**
 * Named re-exports: `export [type] { a, type b, c as d } from 'spec'`. Returns
 * the ORIGINAL name (the one declared in `spec`) and the specifier.
 */
export function namedReExports(content: string): Array<{ name: string; specifier: string }> {
  const re = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
  const out: Array<{ name: string; specifier: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const body = m[1]!.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const raw of body.split(',')) {
      const item = raw.trim().replace(/^type\s+/, '').trim();
      if (item === '') continue;
      const name = item.split(/\s+as\s+/)[0]!.trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) out.push({ name, specifier: m[2]! });
    }
  }
  return out;
}

/** One problem found in a namespace facade. */
export interface FacadeProblem {
  readonly name: string;
  readonly problem: 'not-tagged-public' | 'unresolvable-module' | 'wildcard-in-facade';
}

/**
 * `@public` names visible from `specifier`. A local `export const` counts.
 * `export { name } from` counts only when the name is `@public` where that
 * hop declares it. A `@public` comment on the re-export itself does not.
 *
 * `readModule(specifier, from)` reads `specifier` relative to `from`. `from`
 * is omitted for a specifier relative to the facade.
 */
function publicNamesFrom(
  specifier: string,
  readModule: (specifier: string, from?: string) => string | undefined,
  from: string | undefined,
  memo: Map<string, Set<string> | undefined>,
): Set<string> | undefined {
  const key = `${from ?? ''}>${specifier}`;
  if (memo.has(key)) return memo.get(key);
  // A cycle sees this empty set. The completed set replaces it before return.
  memo.set(key, new Set());
  const text = readModule(specifier, from);
  if (text === undefined) {
    memo.set(key, undefined);
    return undefined;
  }
  const names = publicDeclNames(text);
  memo.set(key, names);
  for (const hop of namedReExports(text)) {
    if (names.has(hop.name)) continue;
    const deeper = publicNamesFrom(hop.specifier, readModule, specifier, memo);
    if (deeper?.has(hop.name)) names.add(hop.name);
  }
  return names;
}

/**
 * Check a namespace FACADE: every symbol it re-exports must be declared
 * `@public` in the module it is re-exported from, and the facade may not use
 * `export *` (a wildcard's contents cannot be checked name by name).
 *
 * @param facade - the facade's source text.
 * @param readModule - source text of a specifier relative to the facade, or
 *   relative to `from` when that module re-exports further. Undefined when
 *   it cannot be resolved.
 */
export function checkFacade(
  facade: string,
  readModule: (specifier: string, from?: string) => string | undefined,
): FacadeProblem[] {
  const problems: FacadeProblem[] = [];
  for (const spec of wildcardReExports(facade)) {
    problems.push({ name: spec, problem: 'wildcard-in-facade' });
  }
  const cache = new Map<string, Set<string> | undefined>();
  for (const { name, specifier } of namedReExports(facade)) {
    if (!cache.has(specifier)) {
      cache.set(specifier, publicNamesFrom(specifier, readModule, undefined, new Map()));
    }
    const tagged = cache.get(specifier);
    if (tagged === undefined) problems.push({ name, problem: 'unresolvable-module' });
    else if (!tagged.has(name)) problems.push({ name, problem: 'not-tagged-public' });
  }
  return problems;
}
