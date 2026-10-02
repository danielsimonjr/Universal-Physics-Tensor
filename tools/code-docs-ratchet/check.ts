/**
 * Pull-request code-docs ratchet.
 *
 * The local pre-push hook runs the private `code_docs.py` against
 * `.githooks/code-docs-baseline.txt`. A merge made in the GitHub UI never
 * runs that hook. This command is the `--paths` stand-in CI can run: a
 * changed file under `src/` may not introduce an export whose immediately
 * preceding JSDoc has no summary line, and it may not drop a summary that
 * was there. Debt already present on the base ref does not fail.
 *
 * It is not `code_docs.py`. It does not read the baseline, and it does not
 * count object-literal methods. `repo_map.py` is a different gate and is
 * not invoked here.
 *
 * @module tools/code-docs-ratchet
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Parser from 'tree-sitter';
import grammars from 'tree-sitter-typescript';

export interface SymbolDoc {
  readonly documented: boolean;
  readonly paramMismatches: readonly string[];
}

export interface FileDocs {
  readonly unparsed: boolean;
  readonly symbols: ReadonlyMap<string, SymbolDoc>;
}

export interface Debt {
  readonly file: string;
  readonly name: string;
  readonly kind: 'missing-summary' | 'param-mismatch' | 'unparsed';
  readonly detail: string;
}

type SyntaxNode = Parser.SyntaxNode;

const DECLARATION = new Set([
  'function_declaration',
  'function_signature',
  'generator_function_declaration',
  'class_declaration',
  'abstract_class_declaration',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
  'lexical_declaration',
  'variable_declaration',
]);

function languageFor(fileName: string): Parser.Language {
  const language = fileName.endsWith('.tsx') ? grammars.tsx : grammars.typescript;
  return language as unknown as Parser.Language;
}

function parserFor(fileName: string): Parser {
  const parser = new Parser();
  parser.setLanguage(languageFor(fileName));
  return parser;
}

/** Text of a block comment that sits before the first `@tag`. */
export function jsdocSummary(comment: string): string | null {
  const match = comment.match(/^\/\*\*([\s\S]*)\*\/\s*$/);
  if (match === null) return null;
  const body = match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .join('\n')
    .trim();
  const cut = body.search(/(^|\s)@[a-zA-Z]/);
  const summary = (cut === -1 ? body : body.slice(0, cut)).trim();
  if (summary === '' || summary.startsWith('@')) return null;
  return summary;
}

function paramTags(comment: string): string[] {
  const names: string[] = [];
  const re = /@param\s+(?:\{[^}]*\}\s+)?\[?([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(comment)) !== null) names.push(match[1]);
  return names;
}

function previousComment(node: SyntaxNode): string | null {
  const prev = node.previousSibling;
  if (prev === null || prev.type !== 'comment') return null;
  return prev.text;
}

function patternNames(node: SyntaxNode): string[] {
  if (node.type === 'identifier' || node.type === 'shorthand_property_identifier_pattern') {
    return [node.text];
  }
  if (node.type === 'rest_pattern' || node.type === 'array_pattern' || node.type === 'object_pattern') {
    return node.namedChildren.flatMap(patternNames);
  }
  if (node.type === 'pair_pattern' || node.type === 'assignment_pattern') {
    const bound = node.namedChildren[node.namedChildren.length - 1];
    return bound === undefined ? [] : patternNames(bound);
  }
  return [];
}

function declarationNames(decl: SyntaxNode): string[] {
  if (decl.type === 'lexical_declaration' || decl.type === 'variable_declaration') {
    const names: string[] = [];
    for (const child of decl.namedChildren) {
      if (child.type !== 'variable_declarator') continue;
      const name = child.childForFieldName('name') ?? child.namedChildren[0];
      if (name !== undefined) names.push(...patternNames(name));
    }
    return names;
  }
  const field = decl.childForFieldName('name');
  if (field !== null && (field.type === 'identifier' || field.type === 'type_identifier')) return [field.text];
  const id = decl.namedChildren.find((child) => child.type === 'identifier' || child.type === 'type_identifier');
  return id === undefined ? [] : [id.text];
}

function exportNames(statement: SyntaxNode): string[] {
  const names: string[] = [];
  for (const child of statement.namedChildren) {
    if (child.type === 'export_clause') {
      for (const spec of child.namedChildren) {
        if (spec.type !== 'export_specifier') continue;
        const ids = spec.namedChildren.filter((node) => node.type === 'identifier' || node.type === 'type_identifier');
        const exported = ids[ids.length - 1];
        if (exported !== undefined) names.push(exported.text);
      }
      continue;
    }
    if (DECLARATION.has(child.type)) names.push(...declarationNames(child));
  }
  if (names.length === 0 && /^\s*export\s+default\b/.test(statement.text)) names.push('default');
  return names;
}

function paramNames(statement: SyntaxNode): string[] {
  const formal = statement.descendantsOfType('formal_parameters')[0];
  if (formal === undefined) return [];
  const names: string[] = [];
  for (const param of formal.namedChildren) {
    for (const child of param.namedChildren) {
      if (child.type === 'identifier') {
        names.push(child.text);
        break;
      }
      if (child.type === 'rest_pattern') {
        const id = child.namedChildren.find((node) => node.type === 'identifier');
        if (id !== undefined) names.push(id.text);
        break;
      }
    }
  }
  return names;
}

function kindOf(statement: SyntaxNode): string {
  const decl = statement.namedChildren.find((child) => DECLARATION.has(child.type));
  if (decl === undefined) {
    if (statement.namedChildren.some((child) => child.type === 'export_clause')) return 'export_clause';
    if (/^\s*export\s+default\b/.test(statement.text)) return 'default';
    return statement.type;
  }
  if (
    decl.type === 'function_signature' ||
    decl.type === 'function_declaration' ||
    decl.type === 'generator_function_declaration'
  ) {
    return 'function';
  }
  return decl.type;
}

function sameGroup(previous: SyntaxNode, statement: SyntaxNode): boolean {
  const prevNames = exportNames(previous);
  const names = exportNames(statement);
  if (prevNames.length !== 1 || names.length !== 1) return false;
  return prevNames[0] === names[0] && kindOf(previous) === kindOf(statement);
}

interface MutableSymbol {
  documented: boolean;
  paramMismatches: string[];
}

/** Exported symbols and whether the attached JSDoc has a summary line. */
export function fileDocs(source: string, fileName = 'fixture.ts'): FileDocs {
  const tree = parserFor(fileName).parse(source);
  if (tree.rootNode.hasError) return { unparsed: true, symbols: new Map() };
  const statements = tree.rootNode.namedChildren.filter((node) => node.type === 'export_statement');
  const symbols = new Map<string, MutableSymbol>();
  let index = 0;
  while (index < statements.length) {
    const start = statements[index];
    const names = exportNames(start);
    const kind = kindOf(start);
    let end = index + 1;
    while (
      end < statements.length &&
      sameGroup(statements[end - 1], statements[end]) &&
      previousComment(statements[end]) === null
    ) {
      end += 1;
    }
    if (names.length > 0) {
      const comment = previousComment(start);
      const documented = comment !== null && jsdocSummary(comment) !== null;
      const mismatches =
        comment === null ? [] : paramTags(comment).filter((tag) => !paramNames(start).includes(tag));
      for (const name of names) {
        const key = `${kind}:${name}`;
        const existing = symbols.get(key);
        if (existing === undefined) {
          symbols.set(key, { documented, paramMismatches: [...mismatches] });
        } else if (documented) {
          existing.documented = true;
        }
      }
    }
    index = end;
  }
  return { unparsed: false, symbols };
}

/**
 * Debt in `after` that `before` did not already have.
 * `before === null` is a file the base ref does not contain.
 */
export function newDebt(before: string | null, after: string, file = 'fixture.ts'): Debt[] {
  const next = fileDocs(after, file);
  const prior = before === null ? null : fileDocs(before, file);
  if (next.unparsed) {
    if (prior !== null && prior.unparsed) return [];
    return [{ file, name: file, kind: 'unparsed', detail: 'tree-sitter reported an ERROR node' }];
  }
  const debt: Debt[] = [];
  for (const [key, symbol] of next.symbols) {
    const name = key.slice(key.indexOf(':') + 1);
    const previous = prior === null ? undefined : prior.symbols.get(key);
    if (!symbol.documented && (previous === undefined || previous.documented)) {
      debt.push({
        file,
        name,
        kind: 'missing-summary',
        detail: 'the immediately preceding JSDoc has no summary line',
      });
    }
    for (const mismatch of symbol.paramMismatches) {
      if (previous !== undefined && previous.paramMismatches.includes(mismatch)) continue;
      debt.push({
        file,
        name,
        kind: 'param-mismatch',
        detail: `@param ${mismatch} is not a parameter of this export`,
      });
    }
  }
  return debt;
}

interface ChangedFile {
  readonly path: string;
  readonly beforePath: string | null;
}

function parseNameStatus(text: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const records = text.split('\0').filter((part) => part !== '');
  let index = 0;
  while (index < records.length) {
    const status = records[index];
    index += 1;
    if (status === undefined) break;
    if (status.startsWith('R') || status.startsWith('C')) {
      const beforePath = records[index] ?? null;
      const path = records[index + 1];
      index += 2;
      if (path !== undefined && isSource(path)) files.push({ path, beforePath });
      continue;
    }
    const path = records[index];
    index += 1;
    if (path === undefined || !isSource(path) || status.startsWith('D')) continue;
    files.push({ path, beforePath: status.startsWith('A') ? null : path });
  }
  return files;
}

function isSource(path: string): boolean {
  return path.startsWith('src/') && (path.endsWith('.ts') || path.endsWith('.tsx'));
}

function gitShow(base: string, path: string): string | null {
  try {
    return execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
  } catch {
    return null;
  }
}

/** New documentation debt on `src/` between `base` and the working tree. */
export function debtAgainstBase(base: string, root = process.cwd(), only: readonly string[] = []): Debt[] {
  const diff = execFileSync(
    'git',
    ['diff', '--name-status', '-z', '--diff-filter=ACMRD', `${base}...HEAD`, '--', 'src'],
    { cwd: root, encoding: 'utf8' },
  );
  const files = parseNameStatus(diff).filter((file) => only.length === 0 || only.includes(file.path));
  const debt: Debt[] = [];
  for (const file of files) {
    const after = readFileSync(resolve(root, file.path), 'utf8');
    const before = file.beforePath === null ? null : gitShow(base, file.beforePath);
    debt.push(...newDebt(before, after, file.path));
  }
  return debt;
}

function scriptPath(): string {
  return new URL(import.meta.url).pathname;
}

function main(): void {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const base = args[baseIndex + 1];
  if (baseIndex === -1 || base === undefined) {
    console.error('usage: bun tools/code-docs-ratchet/check.ts --base <ref> [--paths <file>...]');
    process.exit(2);
  }
  const pathsIndex = args.indexOf('--paths');
  const only = pathsIndex === -1 ? [] : args.slice(pathsIndex + 1).filter((arg) => !arg.startsWith('--'));
  const debt = debtAgainstBase(base, process.cwd(), only);
  if (debt.length === 0) {
    console.log(`PASS -- no new undocumented exports under src/ against ${base}`);
    return;
  }
  console.error(`FAIL -- ${debt.length} new code-docs findings against ${base}`);
  for (const item of debt) console.error(`${item.kind} ${item.file} ${item.name}: ${item.detail}`);
  process.exit(1);
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === resolve(scriptPath())) main();
