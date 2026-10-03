/**
 * Every file under `src/` must parse with the TypeScript tree-sitter grammar.
 *
 * `tsc` accepts syntax this grammar reports as ERROR nodes. An unparsed file is
 * dropped by the code-docs pass, so its exports never enter that count. The
 * paired snippets below are the constructs that grammar rejects: the file scan
 * is only a gate if those snippets still come back as errors.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'tree-sitter';
import grammars from 'tree-sitter-typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(root, 'src');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function setGrammar(parser: Parser, file: string): void {
  const language = file.endsWith('.tsx') ? grammars.tsx : grammars.typescript;
  // The grammar package's `Language` type is not the binding's `Language`.
  parser.setLanguage(language as unknown as Parameters<Parser['setLanguage']>[0]);
}

function parserFor(file: string): Parser {
  const parser = new Parser();
  setGrammar(parser, file);
  return parser;
}

function unparsed(file: string): string | null {
  const tree = parserFor(file).parse(readFileSync(file, 'utf8'));
  if (!tree.rootNode.hasError) return null;
  const rel = relative(root, file).replace(/\\/g, '/');
  return rel;
}

describe('src parses with tree-sitter', () => {
  const files = sourceFiles(SRC);

  it('the scan covers the source tree', () => {
    expect(files.some((f) => f.endsWith(join('src', 'cli', 'commands', 'path.ts')))).toBe(true);
    expect(files.some((f) => f.endsWith(join('src', 'numerical', 'formula-contract.ts')))).toBe(true);
    expect(files.length).toBeGreaterThan(100);
  });

  it('rejects the constructs that hid path.ts and the deleted tensor ambient', () => {
    const parser = new Parser();
    parser.setLanguage(grammars.typescript as unknown as Parameters<Parser['setLanguage']>[0]);
    const readonlyImport = parser.parse("type Bridges = readonly import('./x.js').AtlasBridge[];");
    const staticIndex = parser.parse('export class Tensor { static [key: string]: any; }');
    const aliased = parser.parse(
      "type AtlasBridge = import('./x.js').AtlasBridge;\ntype Bridges = readonly AtlasBridge[];",
    );
    const valueAndType = parser.parse(
      'export interface Tensor { [key: string]: any; }\n' +
        'export const Tensor: { new (...args: any[]): Tensor; [key: string]: any; };',
    );
    expect(readonlyImport.rootNode.hasError).toBe(true);
    expect(staticIndex.rootNode.hasError).toBe(true);
    expect(aliased.rootNode.hasError).toBe(false);
    expect(valueAndType.rootNode.hasError).toBe(false);
  });

  it('reports no file under src/ as UNPARSED', () => {
    const bad = files.map(unparsed).filter((f): f is string => f !== null);
    expect(bad).toEqual([]);
  });
});
