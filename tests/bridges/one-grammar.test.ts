/**
 * One expression grammar, parsed by MathTS. The old hand-written parser and
 * interpreter are kept under tests/fixtures/oracles as the independent second
 * method: every catalog expression must parse to the same ExprNode, and every
 * condition must decide the same way at the reference inputs and at perturbed
 * inputs. Comparisons are exact: MathTS's own tolerance-based operators say
 * `1e-18 > 0` is false, which no SI condition can accept.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { catalogEntries, catalogRelations } from '../../src/bridges/catalog-load.js';
import { evaluateFormula, formulaNames, formulaScope, parseCatalogExpression } from '../../src/bridges/expr-parse.js';
import { holds, HoldsError } from '../../src/bridges/holds.js';
import { relationHolds } from '../../src/bridges/relation-eval.js';
import { BRIDGE_EVALUATORS, unusedInputKeys } from '../../src/bridges/evaluators.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import * as holdsOracle from '../fixtures/oracles/holds-oracle.js';
import * as parseOracle from '../fixtures/oracles/expr-parse-oracle.js';

const SRC = join(import.meta.dirname, '../../src');
const code = (rel: string): string =>
  readFileSync(join(SRC, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** The MathTS spelling of a condition, written back in the old grammar the oracle reads. */
function oldSyntax(condition: string): string {
  return condition
    .replace(/\bisFinite\(/g, 'finite(')
    .replace(/\bisInteger\(/g, 'integer(')
    .replace(/\bnot\s+/g, '!')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/!=/g, '!==')
    .replace(/(?<![<>!=])==(?!=)/g, '===');
}

const OLD_GRAMMAR = /&&|\|\||!==|===|\bfinite\(|\binteger\(|!(?!=)/;

describe('every condition is written in the MathTS grammar', () => {
  it('catalog holds', () => {
    const offenders = catalogRelations().filter((r) => OLD_GRAMMAR.test(r.holds)).map((r) => r.id);
    expect(offenders).toEqual([]);
  });
  it('catalog domain text reads "and", not a code operator, on every relation', () => {
    const relations = catalogRelations();
    expect(relations.every((r) => typeof r.domain === 'string')).toBe(true);
    const offenders = relations.filter((r) => OLD_GRAMMAR.test(r.domain)).map((r) => `${r.id}: ${r.domain}`);
    expect(offenders).toEqual([]);
    expect(OLD_GRAMMAR.test('boost-duty >= 0 && boost-duty < 1')).toBe(true);
  });
  it('canonical holds', () => {
    const offenders = CANONICAL_EQUATIONS.filter((e) => e.holds !== undefined && OLD_GRAMMAR.test(e.holds)).map((e) => e.id);
    expect(offenders).toEqual([]);
  });
  it('the oracle still reads the old grammar (the control)', () => {
    expect(holdsOracle.holds('x > 0 && finite(x)', { x: 1 }, {}, ['x'])).toBe(true);
    expect(() => holdsOracle.holds('x > 0 and isFinite(x)', { x: 1 }, {}, ['x'])).toThrow();
  });
});

describe('holds() decides exactly as the old interpreter did', () => {
  const names = [...formulaNames()];
  const scope = formulaScope();
  const points = (inputs: Readonly<Record<string, number>>): Record<string, number>[] => {
    const out: Record<string, number>[] = [{ ...inputs }];
    for (const key of Object.keys(inputs)) {
      out.push({ ...inputs, [key]: -inputs[key]! });
      out.push({ ...inputs, [key]: 0 });
      out.push({ ...inputs, [key]: Number.NaN });
    }
    return out;
  };
  it.each(catalogRelations().map((r) => [r.id, r] as const))('%s', (_id, r) => {
    const old = oldSyntax(r.holds);
    for (const point of points(r.reference!.inputs)) {
      let expected: boolean;
      try {
        expected = holdsOracle.holds(old, point, scope, names);
      } catch {
        expected = false;
      }
      let actual: boolean;
      try {
        actual = holds(r.holds, point, scope, names, r.sources);
      } catch {
        actual = false;
      }
      expect(actual, `${r.id} at ${JSON.stringify(point)}`).toBe(expected);
    }
  });
  it('compares exactly: an SI magnitude of 1e-18 is above zero (MathTS alone says otherwise)', () => {
    expect(holds('x > 0', { x: 1e-18 }, {}, ['x'])).toBe(true);
    expect(holds('x != 0', { x: 1.6e-19 }, {}, ['x'])).toBe(true);
    // the reason this layer exists, recorded as a control
    expect(parseMathTs('1e-18 > 0').evaluate({})).toBe(false);
  });
  it('an unbound name is a HoldsError, which relationHolds reads as false (as before)', () => {
    expect(() => holds('y > 0', { x: 1 }, {}, ['x'])).toThrow(HoldsError);
    expect(() => holdsOracle.holds('y > 0', { x: 1 }, {}, ['x'])).toThrow();
    const relation = catalogRelations().find((r) => r.id === 'be-88')!;
    expect(relationHolds(relation, {})).toBe(false);
  });
});

describe('parseCatalogExpression builds the same ExprNode the old parser did', () => {
  const expressions = [
    ...catalogRelations().map((r) => [r.id, r.expression] as const),
    ...catalogEntries().filter((e) => e.scalarExpression !== undefined).map((e) => [`entry ${e.id}`, e.scalarExpression!] as const),
  ];
  it.each(expressions)('%s', (_id, expression) => {
    expect(parseCatalogExpression(expression)).toEqual(parseOracle.parseCatalogExpression(expression));
  });
  it('the dimensional tree and the number agree on -x^2 (they did not)', () => {
    const node = parseCatalogExpression('-x^2');
    // −(x²): the outer node is the sign, applied to the power
    expect(node.kind === 'op' && node.op === '*' && node.args[1]?.kind === 'op' && node.args[1].op === '^').toBe(true);
    expect(evaluateFormula('-x^2', { x: 3 })).toBe(-9);
    const oracle = parseOracle.parseCatalogExpression('-x^2');
    expect(oracle.kind === 'op' && oracle.op === '^').toBe(true);
  });
});

describe('one parser: the hand-written tokenizers under bridges/ are gone', () => {
  it('neither holds.ts nor expr-parse.ts tokenizes by hand or rewrites hyphens on its own', () => {
    for (const rel of ['bridges/holds.ts', 'bridges/expr-parse.ts']) {
      const text = code(rel);
      expect(text, rel).not.toMatch(/function tokenize/);
      expect(text, rel).not.toMatch(/rewriteHoldsNames/);
    }
    expect(readdirSync(join(SRC, 'bridges'))).not.toContain('holds-oracle.ts');
  });
  it('unusedInputKeys reads the parsed symbols, not a blanked string', () => {
    expect(code('bridges/evaluators.ts')).not.toMatch(/split\(source\)\.join/);
    const rows = [...BRIDGE_EVALUATORS].filter(([, spec]) => unusedInputKeys(spec).length > 0).map(([id]) => id);
    expect(rows).toEqual([170]);
  });
});
