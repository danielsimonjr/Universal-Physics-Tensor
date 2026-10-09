/**
 * A bridge number is a catalog id, not a filename and not a code branch.
 *
 * The filename scan covers the whole tree. The identifier scan covers code.
 * A string whose entire content is `be-<digits>` is a branch key in `src/`;
 * tests still name a catalog record with that literal, and this file records
 * that limit. `data/`, `formal/`, the generated PhysJS table, the reviewed-row
 * table it is pinned by, and the catalog loader are the places a key is
 * allowed to be written out.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage']);
/** A dot-directory holds other checkouts (`.claude/worktrees/`) or tool state, never this tree's source. */
const skipEntry = (entry: string): boolean => SKIP_DIRS.has(entry) || entry.startsWith('.');
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const EXEMPT = new Set([
  'src/atlas/physjs-entries.generated.ts',
  // The per-key reviewed-row pins: a data table keyed by manifest key, read
  // by `physjsFidelity`, never branched on.
  'src/atlas/physjs-reviewed.ts',
  'src/bridges/catalog-load.ts',
]);

const FILE_NAME = [
  /be\d+/,
  /be-?\d+/,
  /-r\d+/,
  /dogfood/i,
  /(?:^|[/_-])round(?:[._-]|$)/i,
];

const IDENTIFIER = /\b(BE\d+|confrontBE\d+|evaluateBE\d+)\b/g;
/** A single- or double-quoted string, or a template literal with no `${`; replaced before the identifier scan. */
const STRING_LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`$]|\$(?!\{))*`/g;

export function filenameOffender(name: string): boolean {
  return FILE_NAME.some((pattern) => pattern.test(name));
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (skipEntry(entry)) continue;
    const abs = join(dir, entry);
    const rel = relative(root, abs);
    if (statSync(abs).isDirectory()) {
      if (filenameOffender(entry)) out.push(rel);
      walk(abs, out);
    } else if (filenameOffender(entry)) {
      out.push(rel);
    }
  }
}

function isExempt(rel: string): boolean {
  return rel.startsWith('data/') || rel.startsWith('formal/') || EXEMPT.has(rel);
}

function codeFiles(): string[] {
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (skipEntry(entry)) continue;
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) visit(abs);
      else {
        const rel = relative(root, abs);
        const dot = entry.lastIndexOf('.');
        const ext = dot >= 0 ? entry.slice(dot) : '';
        if (CODE_EXT.has(ext) && !isExempt(rel)) found.push(rel);
      }
    }
  };
  visit(root);
  return found;
}

/** String literals whose entire content is `be-<digits>`. Comments are not literals. */
export function wholeBeLiterals(source: string): string[] {
  const found: string[] = [];
  let i = 0;
  while (i < source.length) {
    if (source.startsWith('//', i)) {
      const nl = source.indexOf('\n', i);
      i = nl < 0 ? source.length : nl + 1;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    const quote = source[i];
    if (quote === "'" || quote === '"' || quote === '`') {
      let j = i + 1;
      let body = '';
      let interpolated = false;
      while (j < source.length) {
        if (source[j] === '\\') {
          body += source.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (quote === '`' && source.startsWith('${', j)) interpolated = true;
        if (source[j] === quote) {
          j += 1;
          break;
        }
        if (!interpolated) body += source[j];
        j += 1;
      }
      if (!interpolated && /^be-\d+$/.test(body)) found.push(body);
      i = j;
      continue;
    }
    i += 1;
  }
  return found;
}

describe('source guard', () => {
  it('flags a bridge number, a round tag, and dogfood in a filename, and not a substring', () => {
    expect(filenameOffender('be-11.ts')).toBe(true);
    expect(filenameOffender('be11.ts')).toBe(true);
    expect(filenameOffender('notes-r8.md')).toBe(true);
    expect(filenameOffender('Dogfood.md')).toBe(true);
    expect(filenameOffender('round-2.md')).toBe(true);
    expect(filenameOffender('background.md')).toBe(false);
    expect(filenameOffender('roundtrip.ts')).toBe(false);
    expect(filenameOffender('BE-11.md')).toBe(false);
  });

  it('the tree has no such filename', () => {
    const hits: string[] = [];
    walk(root, hits);
    expect(hits).toEqual([]);
  });

  it('flags a BE-keyed identifier, including one built so this file does not contain it', () => {
    const sample = `const ${['confrontBE', '7'].join('')} = 1;\n`;
    expect(sample.match(IDENTIFIER)).toEqual([['confrontBE', '7'].join('')]);
    expect('BE-70'.match(IDENTIFIER)).toBeNull();
    expect(['be', '42Edge'].join('').match(IDENTIFIER)).toBeNull();
  });

  it('no code file outside the loader carries a BE-keyed identifier', () => {
    const hits: string[] = [];
    for (const rel of codeFiles()) {
      // An identifier, not a string literal: a test that lists a removed export by name as a
      // string ("confrontBE52" in an ABSENT list) does not carry the identifier.
      const text = readFileSync(join(root, rel), 'utf8').replace(STRING_LITERAL, "''");
      const found = text.match(IDENTIFIER);
      if (found) hits.push(`${rel}: ${found.join(', ')}`);
    }
    expect(hits).toEqual([]);
  });

  it('parseBridgeId is declared only in the catalog loader', () => {
    const needle = ['function parse', 'BridgeId'].join('');
    const decls: string[] = [];
    for (const rel of codeFiles()) {
      const text = readFileSync(join(root, rel), 'utf8');
      if (text.includes(needle)) decls.push(rel);
    }
    const loader = readFileSync(join(root, 'src/bridges/catalog-load.ts'), 'utf8');
    expect(loader.includes(needle)).toBe(true);
    expect(decls).toEqual([]);
  });

  it('flags a whole-string be-<digits> literal and not a template or a longer string', () => {
    const exact = ['be-', '63'].join('');
    expect(wholeBeLiterals(`const id = '${exact}';`)).toEqual([exact]);
    expect(wholeBeLiterals('const id = `be-${id}`;')).toEqual([]);
    expect(wholeBeLiterals(`const help = 'try ${exact} now';`)).toEqual([]);
    expect(wholeBeLiterals(`// '${exact}'`)).toEqual([]);
  });

  it('src has no whole-string be-<digits> literal outside the exempt files', () => {
    const hits: string[] = [];
    const visit = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        if (skipEntry(entry)) continue;
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) visit(abs);
        else if (entry.endsWith('.ts')) {
          const rel = relative(root, abs);
          if (isExempt(rel)) continue;
          const found = wholeBeLiterals(readFileSync(abs, 'utf8'));
          if (found.length > 0) hits.push(`${rel}: ${found.join(', ')}`);
        }
      }
    };
    visit(join(root, 'src'));
    expect(hits).toEqual([]);
  });
});
