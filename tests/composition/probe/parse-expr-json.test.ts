/**
 * parseExprJson structural validation coverage.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseExprJson } from '../../../src/composition/probe/problem.js';
import { sym } from '../../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { tempDir } from '../../helpers/tmp.js';

describe('parseExprJson', () => {
  const dir = tempDir('upt-parse-expr-');

  it('validates symbol nodes', () => {
    const path = join(dir, 'good.json');
    writeFileSync(path, JSON.stringify(sym('x', DIMENSIONLESS)));
    expect(parseExprJson(path).kind).toBe('symbol');
  });

  it('validates op nodes recursively', () => {
    const path = join(dir, 'op.json');
    writeFileSync(
      path,
      JSON.stringify({
        kind: 'op',
        op: '*',
        args: [sym('a', DIMENSIONLESS), sym('b', DIMENSIONLESS)],
      }),
    );
    expect(parseExprJson(path).kind).toBe('op');
  });

  it('rejects symbol without name', () => {
    const path = join(dir, 'bad-sym.json');
    writeFileSync(path, JSON.stringify({ kind: 'symbol', dim: DIMENSIONLESS }));
    expect(() => parseExprJson(path)).toThrow(/symbol node missing name/);
  });

  it('rejects op without args', () => {
    const path = join(dir, 'bad-op.json');
    writeFileSync(path, JSON.stringify({ kind: 'op', op: '+' }));
    expect(() => parseExprJson(path)).toThrow(/op node missing op\/args/);
  });

  it('accepts wrapped expression objects', () => {
    const path = join(dir, 'wrap.json');
    writeFileSync(path, JSON.stringify({ expression: sym('z', DIMENSIONLESS) }));
    expect(parseExprJson(path).kind).toBe('symbol');
  });

  it('rejects empty kind', () => {
    const path = join(dir, 'empty-kind.json');
    writeFileSync(path, JSON.stringify({ kind: '' }));
    expect(() => parseExprJson(path)).toThrow(/invalid kind/);
  });
});
