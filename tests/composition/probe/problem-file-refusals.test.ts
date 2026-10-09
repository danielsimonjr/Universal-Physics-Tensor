/**
 * A JSON file that is not a search-problem file is refused by the field that is wrong,
 * never by what a JavaScript engine said on reading it (`ProblemFileError`).
 *
 * These are the source-level checks of `searchProblemFromFile` and `parseExprJson`; the CLI
 * tests exercise the same refusals through `dist/`, which the probe coverage gate does not
 * instrument.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ProblemFileError,
  parseExprJson,
  searchProblemFromFile,
  type ProblemFile,
} from '../../../src/composition/probe/problem.js';
import { tempDir } from '../../helpers/tmp.js';

const GOOD: ProblemFile = {
  gap: { id: 'fg-refusals', kind: 'unexplained-observation', summary: 'a well-formed file' },
  target: { name: 'period', dim: 'time' },
  governing: [
    { name: 'length', dim: 'length' },
    { name: 'g', dim: 'acceleration' },
  ],
};

/** The file with one field replaced; `unknown` because the point is a value of another kind. */
function withField(field: string, value: unknown): ProblemFile {
  return { ...GOOD, [field]: value } as unknown as ProblemFile;
}

function refusal(raw: unknown): string {
  try {
    searchProblemFromFile(raw as ProblemFile, 'inline');
  } catch (e) {
    expect(e).toBeInstanceOf(ProblemFileError);
    return (e as Error).message;
  }
  throw new Error('searchProblemFromFile accepted a file it must refuse');
}

describe('searchProblemFromFile refuses by field', () => {
  it('control: the well-formed file is accepted', () => {
    const problem = searchProblemFromFile(GOOD, 'inline');
    expect(problem.target.name).toBe('period');
    expect(problem.gap.id).toBe('fg-refusals');
  });

  it('a top level that is not an object, naming what it is', () => {
    expect(refusal(null)).toMatch(/top level must be a JSON object .*\(found null\)/);
    expect(refusal([1, 2])).toMatch(/\(found a list\)/);
    expect(refusal('text')).toMatch(/\(found text\)/);
    expect(refusal(42)).toMatch(/\(found a number\)/);
    expect(refusal(true)).toMatch(/\(found true or false\)/);
  });

  it('a missing "target" or "governing"', () => {
    expect(refusal(withField('target', undefined))).toMatch(/it has no "target"/);
    expect(refusal(withField('governing', undefined))).toMatch(/it has no "governing" list/);
  });

  it('a "governing" that is not a list', () => {
    expect(refusal(withField('governing', { name: 'x', dim: 'length' }))).toMatch(
      /"governing" must be a list .*\(found an object\)/,
    );
  });

  it('a "gap" that is not an object, and a gap field that is not text', () => {
    expect(refusal(withField('gap', 'fg-x'))).toMatch(/"gap" must be an object \(found text\)/);
    expect(refusal(withField('gap', { id: 7 }))).toMatch(/gap\.id must be text \(found a number\)/);
    expect(refusal(withField('gap', { kind: ['a'] }))).toMatch(/gap\.kind must be text \(found a list\)/);
  });

  it('an unknown gap kind, a Product A gap kind, and an id without the fg- prefix', () => {
    expect(refusal(withField('gap', { kind: 'not-a-kind' }))).toMatch(/unknown gap kind 'not-a-kind' in gap\.kind/);
    expect(refusal(withField('gap', { kind: 'relation-link' }))).toMatch(
      /gap\.kind 'relation-link' is a Product A gap: use `upt discover`/,
    );
    expect(refusal(withField('gap', { id: 'g-1' }))).toMatch(/gap\.id 'g-1' must start with "fg-"/);
  });

  it('a variable that is not {"name", "dim"}, located by where it sits', () => {
    expect(refusal(withField('target', 'period'))).toMatch(/"target" must be \{"name": text, "dim": text\} \(found text\)/);
    expect(refusal(withField('target', { dim: 'time' }))).toMatch(/"target" needs a "name" \(text\)$/);
    expect(refusal(withField('target', { name: 3, dim: 'time' }))).toMatch(/"target" needs a "name" \(text\), found a number/);
    expect(refusal(withField('governing', [{ name: 'length' }]))).toMatch(/governing\[0\] needs a "dim" \(text\)$/);
    expect(refusal(withField('governing', [GOOD.governing[0], { name: 'g', dim: null }]))).toMatch(
      /governing\[1\] needs a "dim" \(text\), found null/,
    );
  });

  it('never quotes an engine message', () => {
    for (const raw of [null, withField('target', undefined), withField('governing', 'x'), withField('target', { dim: 'time' })]) {
      expect(refusal(raw)).not.toMatch(/Cannot read properties|undefined \(reading|is not iterable/);
    }
  });
});

describe('parseExprJson refuses a file that is not an expression', () => {
  const dir = tempDir('upt-problem-refusals-');

  it('a file whose top level has no "kind" and no "expression"', () => {
    const path = join(dir, 'no-kind.json');
    writeFileSync(path, JSON.stringify({ name: 'x' }));
    expect(() => parseExprJson(path)).toThrow(/is not an ExprNode JSON object/);
  });

  it('an op node whose argument is not a node', () => {
    const path = join(dir, 'bad-arg.json');
    writeFileSync(path, JSON.stringify({ kind: 'op', op: '*', args: [{ name: 'x' }] }));
    expect(() => parseExprJson(path)).toThrow(/#args\[0\] is not an ExprNode JSON object/);
  });

  it('a symbol node without a dim', () => {
    const path = join(dir, 'no-dim.json');
    writeFileSync(path, JSON.stringify({ kind: 'symbol', name: 'x' }));
    expect(() => parseExprJson(path)).toThrow(/symbol node missing dim/);
  });

  it('a node whose kind is not text', () => {
    const path = join(dir, 'bad-kind.json');
    writeFileSync(path, JSON.stringify({ kind: 7 }));
    expect(() => parseExprJson(path)).toThrow(/has invalid kind/);
  });

  it('control: a wrapped expression is read', () => {
    const path = join(dir, 'wrapped.json');
    writeFileSync(path, JSON.stringify({ expression: { kind: 'symbol', name: 'x', dim: { L: 1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } } }));
    expect(parseExprJson(path).kind).toBe('symbol');
  });
});
