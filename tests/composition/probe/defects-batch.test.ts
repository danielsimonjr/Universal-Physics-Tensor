/**
 * Defects in the probe readers and checks, each proved RED before its fix (2026-10-15 batch, item 5
 * and item 6): a value that is not a number was coerced with `Number(v)` (an empty cell, `null`,
 * `false` and `"  "` became 0, `true` became 1, `"0x10"` became 16), a problem file's secondary
 * fields were not validated, a declared-limit check dropped rows that threw and judged the rest, a
 * spread `Math.max(...rows)` overflowed the call stack on a large dataset, and the RMSE copies
 * summed squares naively (overflow at 1e200).
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  asDatasetSafe,
  datasetFromRows,
  DatasetError,
  loadDatasetFromCsv,
  loadSplitCsv,
} from '../../../src/composition/probe/dataset.js';
import { parseDesignBounds } from '../../../src/composition/probe/experiment-design.js';
import {
  ProblemFileError,
  parseExprJson,
  searchProblemFromFile,
  type ProblemFile,
} from '../../../src/composition/probe/problem.js';
import { checkDeclaredLimit } from '../../../src/composition/probe/limits.js';
import { runFalsification } from '../../../src/composition/probe/falsify.js';
import { fitPrefactor } from '../../../src/composition/probe/fit.js';
import { rmse, ResidualError } from '../../../src/composition/probe/residual.js';
import { monomialToExpr } from '../../../src/composition/probe/generator.js';
import { sym } from '../../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { tempDir } from '../../helpers/tmp.js';

const dimless = (name: string) => ({ name, dim: DIMENSIONLESS });

function refusal<E extends Error>(cls: new (m: string) => E, f: () => unknown): string {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(cls);
    return (e as Error).message;
  }
  throw new Error('expected a refusal');
}

describe('5a: a dataset cell is a number or a strict decimal string, never a coercion', () => {
  const ds = (rows: unknown[]) => asDatasetSafe({ rows, observable: 'y', role: 'exploratory-fit' }, 'd');

  it('accepts numbers and strict decimal strings', () => {
    const d = ds([{ x: 3, y: '1e3' }, { x: '-0.5', y: '.5' }, { x: '+7', y: '2.' }]);
    expect(d.rows).toEqual([{ x: 3, y: 1000 }, { x: -0.5, y: 0.5 }, { x: 7, y: 2 }]);
  });

  it('refuses the coercions, naming the column and the row index, with the dataset\'s error class', () => {
    expect(refusal(DatasetError, () => ds([{ x: '', y: 1 }]))).toMatch(/row 0 column x: an empty cell is not a number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: null }]))).toMatch(/row 0 column y: null is not a number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: 2 }, { x: true, y: 2 }]))).toMatch(/row 1 column x: true is not a number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: [5] }]))).toMatch(/row 0 column y: a list is not a number/);
    expect(refusal(DatasetError, () => ds([{ x: '0x10', y: 1 }]))).toMatch(/row 0 column x: '0x10' is not a finite decimal number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: '  ' }]))).toMatch(/row 0 column y: an empty cell is not a number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: 'Infinity' }]))).toMatch(/row 0 column y: 'Infinity' is not a finite decimal number/);
    expect(refusal(DatasetError, () => ds([{ x: 1, y: NaN }]))).toMatch(/row 0 column y: NaN is not a finite number/);
    expect(refusal(DatasetError, () => ds([{ x: false, y: 1 }]))).toMatch(/column x: false is not a number/);
  });

  it('CSV: an empty cell and a short row are refused by row and column; a missing observation is never 0', () => {
    const dir = tempDir('upt-defects-csv-');
    const csv = join(dir, 'd.csv');
    writeFileSync(csv, 'x,y\n1,2\n3,\n');
    expect(refusal(DatasetError, () => loadDatasetFromCsv(csv, 'y', 'exploratory-fit'))).toMatch(/row 3 column y: an empty cell/);
    writeFileSync(csv, 'x,y\n1,2\n3\n');
    expect(refusal(DatasetError, () => loadDatasetFromCsv(csv, 'y', 'exploratory-fit'))).toMatch(/row 3 has 1 cell\(s\); the header has 2 \(column y is missing\)/);
    writeFileSync(csv, 'x,y\n1,0x10\n');
    expect(refusal(DatasetError, () => loadDatasetFromCsv(csv, 'y', 'exploratory-fit'))).toMatch(/row 2 column y: '0x10' is not a finite decimal number/);
    const sc = join(dir, 's.csv');
    writeFileSync(sc, 'x,y,split\n1,2,exploratory\n3,,holdout\n');
    expect(refusal(DatasetError, () => loadSplitCsv(sc, 'y'))).toMatch(/row 3 column y: an empty cell/);
    writeFileSync(sc, 'x,y,split\n1,2,exploratory\n3,holdout\n');
    expect(refusal(DatasetError, () => loadSplitCsv(sc, 'y'))).toMatch(/row 3 has 2 cell\(s\); the header has 3/);
    // Control: a well-formed file still loads, with the split honoured.
    writeFileSync(sc, 'x,y,split\n1,2,exploratory\n3,4e0,holdout\n');
    expect(loadSplitCsv(sc, 'y').holdout.rows).toEqual([{ x: 3, y: 4 }]);
  });
});

describe('5b: design bounds require numbers and a positive integer step count', () => {
  it('refuses the coercions that once read {min: null, max: "", steps: 2.5} as {0, 0, 2.5}', () => {
    expect(() => parseDesignBounds({ variables: { x: { min: null, max: '', steps: 2.5 } } }, 't')).toThrow(/variables\.x needs finite min\/max numbers \(found null and text\)/);
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1, steps: 2.5 } } }, 't')).toThrow(/variables\.x\.steps must be a positive integer \(found 2\.5\)/);
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1, steps: '4' } } }, 't')).toThrow(/steps must be a positive integer \(found text\)/);
    expect(() => parseDesignBounds({ variables: { x: { min: '0', max: 1 } } }, 't')).toThrow(/needs finite min\/max numbers \(found text and a number\)/);
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1 } }, sigma: '1' }, 't')).toThrow(/sigma must be a positive number \(found text\)/);
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1 } }, forbidden: [{ x: { min: true, max: 1 } }] }, 't')).toThrow(/forbidden\[0\]\.x needs finite min\/max numbers \(found true or false and a number\)/);
    // Control: numbers are read as before.
    expect(parseDesignBounds({ variables: { x: { min: 0, max: 1, steps: 3 } }, sigma: 2 }, 't').variables.x).toEqual({ min: 0, max: 1, steps: 3 });
  });
});

describe('5c: every problem-file field is validated with ProblemFileError', () => {
  const GOOD: ProblemFile = {
    target: { name: 'period', dim: 'time' },
    governing: [{ name: 'length', dim: 'length' }, { name: 'g', dim: 'acceleration' }],
  };
  const withField = (field: string, value: unknown) => ({ ...GOOD, [field]: value }) as unknown as ProblemFile;
  const refuse = (raw: ProblemFile) => refusal(ProblemFileError, () => searchProblemFromFile(raw, 'inline'));

  it('limits, claimedRegimes, baseline, assumptions, discrepancy, observationalBoundIds, observationsPath', () => {
    expect(refuse(withField('limits', 5))).toMatch(/"limits" must be a list of \{"id": text, "regime": \{name: text\}\} \(found a number\)/);
    expect(refuse(withField('limits', [{ id: 'l' }]))).toMatch(/limits\[0\]\.regime must be \{name: text\}/);
    expect(refuse(withField('limits', [{ id: 'l', regime: { scale: 3 } }]))).toMatch(/limits\[0\]\.regime\.scale must be text \(found a number\)/);
    expect(refuse(withField('claimedRegimes', 5))).toMatch(/"claimedRegimes" must be \{name: text\} \(found a number\)/);
    expect(refuse(withField('claimedRegimes', { scale: null }))).toMatch(/claimedRegimes\.scale must be text \(found null\)/);
    expect(refuse(withField('baseline', { kind: 'op' }))).toMatch(/"baseline" op node needs "op" and an "args" list/);
    expect(refuse(withField('assumptions', 'x'))).toMatch(/"assumptions" must be a list of text \(found text\)/);
    expect(refuse(withField('assumptions', ['a', 2]))).toMatch(/assumptions\[1\] must be text \(found a number\)/);
    expect(refuse(withField('discrepancy', { kind: 'nope', observableIds: [] }))).toMatch(/discrepancy\.kind 'nope' is not a discrepancy kind/);
    expect(refuse(withField('discrepancy', { kind: 'additive' }))).toMatch(/discrepancy\.observableIds must be a list of text/);
    expect(refuse(withField('observationalBoundIds', 'x'))).toMatch(/"observationalBoundIds" must be a list of text \(found text\)/);
    expect(refuse(withField('observationsPath', 5))).toMatch(/"observationsPath" must be text \(found a number\)/);
  });

  it('control: the well-formed optional fields are accepted and carried', () => {
    const p = searchProblemFromFile(
      {
        ...GOOD,
        limits: [{ id: 'l', regime: { scale: 'classical' }, description: 'd' }],
        claimedRegimes: { scale: 'classical' },
        assumptions: ['a'],
        discrepancy: { kind: 'additive', observableIds: ['period'] },
        observationalBoundIds: ['ob-1'],
        baseline: { kind: 'op', op: '*', args: [sym('2', DIMENSIONLESS), sym('length', { ...DIMENSIONLESS, L: 1 })] },
      },
      'inline',
    );
    expect(p.limits).toHaveLength(1);
    expect(p.claimedRegimes).toEqual({ scale: 'classical' });
    expect(p.assumptions).toEqual(['a']);
    expect(p.discrepancy?.kind).toBe('additive');
    expect(p.observationalBoundIds).toEqual(['ob-1']);
    expect(p.baseline?.kind).toBe('op');
  });

  it('parseExprJson validates the node shape recursively', () => {
    const dir = tempDir('upt-defects-expr-');
    const file = (name: string, v: unknown) => {
      const path = join(dir, name);
      writeFileSync(path, JSON.stringify(v));
      return path;
    };
    const bad = (name: string, v: unknown) => refusal(ProblemFileError, () => parseExprJson(file(name, v)));
    expect(bad('t.json', { kind: 'transcendental', fn: 'exp', arg: { kind: 'symbol' } })).toMatch(/#arg symbol node missing name/);
    expect(bad('fn.json', { kind: 'transcendental', fn: 'nope', arg: sym('x', DIMENSIONLESS) })).toMatch(/transcendental node has fn 'nope'/);
    expect(bad('abs.json', { kind: 'abs' })).toMatch(/abs node needs an "arg" node/);
    expect(bad('int.json', { kind: 'integral', over: sym('x', DIMENSIONLESS) })).toMatch(/integral node needs an "integrand" node/);
    expect(bad('deriv.json', { kind: 'derivative', of: sym('x', DIMENSIONLESS), wrt: 5 })).toMatch(/#wrt is not an ExprNode JSON object \(found a number\)/);
    expect(bad('op.json', { kind: 'op', op: '%', args: [sym('x', DIMENSIONLESS)] })).toMatch(/op node has op '%'/);
    expect(bad('args.json', { kind: 'op', op: '*', args: 'x' })).toMatch(/op node needs "op" and an "args" list/);
    expect(bad('lit.json', { kind: 'symbol', name: '1e400', dim: DIMENSIONLESS })).toMatch(/literal '1e400' is not a finite number/);
    expect(bad('dim.json', { kind: 'symbol', name: 'x', dim: { L: 1 } })).toMatch(/symbol node dim needs the exponents L, M, T, I, Theta, N, J/);
    expect(bad('dimnan.json', { kind: 'symbol', name: 'x', dim: { ...DIMENSIONLESS, L: 'a' } })).toMatch(/symbol node dim\.L must be a finite number/);
    expect(bad('tensor.json', { kind: 'tensor-symbol', name: 'g' })).toMatch(/kind 'tensor-symbol', which is not a scalar expression node/);
    // Control: a nested scalar tree is read whole.
    const good = file('good.json', {
      kind: 'op',
      op: '/',
      args: [{ kind: 'abs', arg: { kind: 'transcendental', fn: 'ln', arg: sym('x', DIMENSIONLESS) } }, sym('2', DIMENSIONLESS)],
    });
    expect(parseExprJson(good).kind).toBe('op');
  });
});

describe('5d: a declared-limit check counts the rows it could not evaluate', () => {
  const y = dimless('y');
  const x = dimless('x');
  // 1/x throws (or is non-finite) at x = 0.
  const inv = { kind: 'op' as const, op: '/' as const, args: [sym('1', DIMENSIONLESS), sym('x', DIMENSIONLESS)] };

  it('a candidate that is evaluable on 1 of 10 rows is undecided, not judged on that row; undecided is never fatal', () => {
    const rows = [{ x: 2, y: 0.5 }, ...Array.from({ length: 9 }, () => ({ x: 0, y: 1 }))];
    const ds = datasetFromRows(rows, 'y', 'falsification-only', 'z');
    const r = checkDeclaredLimit(inv, ds, 1, { id: 'lim', regime: { scale: 'classical' } }, true);
    expect(r.outcome).toBe('undecided');
    expect(r.evaluated).toBe(1);
    expect(r.skipped).toBe(9);
    expect(r.passed).toBe(false);
    expect(r.fatal).toBe(false);
    expect(r.detail).toMatch(/undecided: 9 of 10 rows could not be evaluated/);
    const fal = runFalsification({ expr: inv, dataset: ds, prefactor: 1, claimedRegimes: { scale: 'classical' }, limits: [{ id: 'lim', regime: { scale: 'classical' } }] });
    expect(fal.records.find((b) => b.battery === 'limits')!.outcome).toBe('inconclusive');
  });

  it('a candidate evaluable on most rows is judged on them, and the loose pass rule is stated', () => {
    const rows = [...Array.from({ length: 8 }, (_, i) => ({ x: i + 1, y: 1 / (i + 1) })), { x: 0, y: 1 }];
    const r = checkDeclaredLimit(inv, datasetFromRows(rows, 'y', 'falsification-only', 'z'), 1, { id: 'lim', regime: {} }, true);
    expect(r.outcome).toBe('held');
    expect(r.evaluated).toBe(8);
    expect(r.skipped).toBe(1);
    expect(r.passed).toBe(true);
  });

  it('no evaluable row at all is undecided', () => {
    const r = checkDeclaredLimit(inv, datasetFromRows([{ x: 0, y: 1 }], 'y', 'falsification-only', 'z'), 1, { id: 'lim', regime: {} }, true);
    expect(r.outcome).toBe('undecided');
    expect(r.fatal).toBe(false);
  });

  it('a 200 000-row dataset is checked without a RangeError from a spread Math.max', () => {
    const expr = monomialToExpr({ x: 1 }, [y, x]);
    const rows = Array.from({ length: 200_000 }, (_, i) => ({ x: i + 1, y: i + 1 }));
    const r = checkDeclaredLimit(expr, datasetFromRows(rows, 'y', 'falsification-only', 'z'), 1, { id: 'lim', regime: {} }, true);
    expect(r.outcome).toBe('held');
    const ex = datasetFromRows(rows.slice(0, 3), 'y', 'exploratory-fit', 'e');
    const ho = datasetFromRows(rows.slice(3), 'y', 'validation-holdout', 'h');
    expect(fitPrefactor(expr, ex, ho).holdoutSupported).toBe(true);
  });
});

describe('6: the RMSE copies rest on core norm2 and keep each caller\'s policy', () => {
  it('residual.rmse does not overflow at 1e200 and still refuses empty or unequal samples', () => {
    const naive = Math.sqrt((1e200 * 1e200 + 0) / 2);
    expect(naive).toBe(Number.POSITIVE_INFINITY);
    expect(rmse([1e200, 0], [0, 0], { kind: 'additive', observableIds: ['y'] })).toBeCloseTo(1e200 / Math.SQRT2, -185);
    expect(() => rmse([], [], { kind: 'additive', observableIds: [] })).toThrow(ResidualError);
    expect(() => rmse([1], [1, 2], { kind: 'additive', observableIds: [] })).toThrow(ResidualError);
  });

  it('the limit check\'s RMSE does not overflow at 1e200 and keeps the skip and empty policies', () => {
    const expr = monomialToExpr({ x: 1 }, [dimless('y'), dimless('x')]);
    const ds = datasetFromRows([{ x: 0.9e200, y: 1e200 }, { x: 0.9e200, y: 1e200 }], 'y', 'falsification-only', 'z');
    const r = checkDeclaredLimit(expr, ds, 1, { id: 'lim', regime: {} }, true);
    expect(r.outcome).toBe('held');
    const m = /rmse=([-+0-9.e]+)/.exec(r.detail);
    expect(Math.abs(Number(m![1]) / 1e199 - 1)).toBeLessThanOrEqual(1e-15);
  });
});
