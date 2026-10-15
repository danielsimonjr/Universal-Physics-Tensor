/**
 * The edge branches of the 2026-10-15 probe batch that the behaviour tests do not reach: the
 * rational scan, the power-law abstentions and wording, the limit check's skipped rows, the
 * structure probes' non-finite inputs, the t-tail refusals, the remaining scalar node kinds of the
 * expression reader, and the dataset reader's other refusals. The probe coverage gate (95% of
 * statements) counts them.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  powerLawDetermination,
  powerLawWording,
  rationalCandidates,
  rationalizeExponent,
  piStructure,
  logDesignRank,
  logDesign,
} from '../../../src/composition/probe/power-law.js';
import { checkDeclaredLimit } from '../../../src/composition/probe/limits.js';
import { detectMeanChangepoint, probeConservation } from '../../../src/composition/probe/structure.js';
import { studentTwoSidedP } from '../../../src/composition/probe/t-tail.js';
import { parseExprJson, makeResidualGap, ProblemFileError } from '../../../src/composition/probe/problem.js';
import { asDatasetSafe, datasetFromRows, DatasetError, loadSplitCsv } from '../../../src/composition/probe/dataset.js';
import { problemFromResidualGap } from '../../../src/composition/probe/frontier.js';
import { monomialToExpr } from '../../../src/composition/probe/generator.js';
import { dim, sym } from '../../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { tempDir } from '../../helpers/tmp.js';

describe('the rational scan', () => {
  it('finds the one fraction in a narrow interval, reduced and by smallest denominator; none or several is null', () => {
    expect(rationalizeExponent(0.5000000000000001, 1e-9)).toEqual({ numerator: 1, denominator: 2 });
    expect(rationalizeExponent(-0.3333, 0.001)).toEqual({ numerator: -1, denominator: 3 });
    expect(rationalizeExponent(0.37, 0.005)).toBeNull();
    expect(rationalizeExponent(0.5, 0.2)).toBeNull();
    expect(rationalizeExponent(NaN, 0.1)).toBeNull();
    expect(rationalizeExponent(0.5, -1)).toBeNull();
    expect(rationalCandidates(0.5, 0.2).map((r) => `${r.numerator}/${r.denominator}`)).toEqual(['1/2', '1/3', '2/3', '2/5', '3/5']);
    expect(rationalCandidates(2, 1e-9)).toEqual([{ numerator: 2, denominator: 1 }]);
  });
});

describe('power-law abstentions and wording', () => {
  const speed = { name: 'y', dim: dim(1, 0, -1) };
  const governing = [
    { name: 'a', dim: dim(1) },
    { name: 'b', dim: dim(1) },
    { name: 'c', dim: dim(0, 0, 1) },
    { name: 'd', dim: dim(0, 0, 1) },
  ];
  const problem = (rows: Record<string, number>[], target = speed, gov = governing) =>
    problemFromResidualGap(makeResidualGap('fg-cov', 'c'), target, gov, rows.length > 0 ? datasetFromRows(rows, target.name, 'exploratory-fit', 'e') : undefined);
  const law = (r: Record<string, number>) => 3.7 * r.a! ** 1.5 * r.b! ** -0.5 * r.c! ** -2 * r.d!;
  const grid = (): Record<string, number>[] => {
    const out: Record<string, number>[] = [];
    for (let i = 0; i < 24; i++) {
      const r = { a: 0.5 + 0.13 * i, b: 0.2 + 0.07 * ((i * 7) % 11), c: 0.1 + 0.05 * ((i * 5) % 13), d: 0.3 + 0.09 * ((i * 3) % 17) };
      out.push({ ...r, y: law(r) * (1 + 0.01 * Math.sin(i)) });
    }
    return out;
  };

  it('is not applicable when the target is outside the span, or when no π-group is left, and abstains with no rows', () => {
    const time = { name: 'y', dim: dim(0, 0, 1) };
    const lengths = [{ name: 'a', dim: dim(1) }, { name: 'b', dim: dim(1) }];
    const outside = powerLawDetermination(problem([], time, lengths));
    expect(outside.kind).toBe('not-applicable');
    if (outside.kind === 'not-applicable') expect(outside.reason).toMatch(/not in the span/);
    expect(piStructure(time, lengths).base).toBeNull();
    expect(piStructure(time, []).groups).toEqual([]);
    const none = powerLawDetermination(problem([], time, [{ name: 'a', dim: dim(1) }]));
    expect(none.kind).toBe('not-applicable');
    const empty = powerLawDetermination(problem([]));
    expect(empty.kind).toBe('abstained');
    if (empty.kind === 'abstained') expect(empty.reason).toMatch(/no exploratory rows/);
    expect(powerLawWording(outside)).toBeNull();
    expect(powerLawWording(empty)).toMatch(/^no power law from the exploratory rows: no exploratory rows/);
  });

  it('too few usable rows, a collinear design, and a non-positive row that is skipped and counted in the wording', () => {
    const few = powerLawDetermination(problem(grid().slice(0, 3)));
    expect(few.kind).toBe('abstained');
    if (few.kind === 'abstained') expect(few.reason).toMatch(/only 3 usable row\(s\).*needs at least 4/);
    const collinear = grid().map((r) => ({ ...r, d: r.c! / (r.a! / r.b!) ** 2 }));
    const col = powerLawDetermination(problem(collinear));
    expect(col.kind).toBe('abstained');
    if (col.kind === 'abstained') expect(col.reason).toMatch(/collinear|holds \d+ fractions|not within 2σ/);
    const withBad = [...grid(), { a: 1, b: 1, c: 1, d: 1, y: -2 }, { a: 1, b: 2, c: 1, d: 1 }];
    const pl = powerLawDetermination(problem(withBad));
    expect(pl.kind).toBe('fit');
    if (pl.kind === 'fit') {
      expect(pl.skippedRows).toBe(2);
      expect(pl.nRows).toBe(24);
      expect(powerLawWording(pl)).toMatch(/\(2 skipped: non-positive\)/);
      expect(powerLawWording(pl)).toMatch(/\(a · b\^-1\)\^\(1\/2\) \[a = /);
      expect(powerLawWording(pl)).toMatch(/\(c · d\^-1\)\^\(-1\)/);
    }
  });

  it('the log-design rank of no rows is 0, and a row lacking a π-group variable is skipped', () => {
    const { groups } = piStructure(speed, governing);
    expect(logDesignRank(logDesign(groups, []))).toBe(0);
    const d = logDesign(groups, [{ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3, d: 4 }]);
    expect(d.used).toBe(1);
    expect(d.skipped).toBe(1);
  });
});

describe('limit check: skipped rows of every kind', () => {
  const expr = monomialToExpr({ x: 1 }, [{ name: 'y', dim: DIMENSIONLESS }, { name: 'x', dim: DIMENSIONLESS }]);
  it('a non-finite observation and a row without the observable are skipped and counted', () => {
    // Three skipped against two evaluated: more skipped than evaluated is the undecided threshold.
    const rows: Record<string, number>[] = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: NaN }, { x: 4 }, { x: 5, y: Number.POSITIVE_INFINITY }];
    const r = checkDeclaredLimit(expr, datasetFromRows(rows, 'y', 'falsification-only', 'z'), 1, { id: 'l', regime: {} }, false);
    expect(r.evaluated).toBe(2);
    expect(r.skipped).toBe(3);
    expect(r.outcome).toBe('undecided');
    // Two against two is judged (held here): the threshold is strict.
    const even = checkDeclaredLimit(expr, datasetFromRows(rows.slice(0, 4), 'y', 'falsification-only', 'z'), 1, { id: 'l', regime: {} }, false);
    expect(even.outcome).toBe('held');
  });
});

describe('structure probes: non-finite inputs', () => {
  it('a series with a NaN abstains; a drift fit that is not finite abstains', () => {
    const r = detectMeanChangepoint({ x: [0, 1, 2, 3, 4, 5, 6], y: [1, 2, NaN, 4, 5, 6, 7] });
    expect(r.abstained).toBe(true);
    expect(r.reason).toMatch(/non-finite/);
    const c = probeConservation([1, NaN, 3, 4], [0, 1, 2, 3]);
    expect(c.abstained).toBe(true);
    expect(c.reason).toMatch(/not finite/);
  });
});

describe('the t tail refuses what it cannot answer', () => {
  it('throws on a non-positive ν and on a NaN t', () => {
    expect(() => studentTwoSidedP(1, 0)).toThrow(/degrees of freedom must be positive/);
    expect(() => studentTwoSidedP(NaN, 3)).toThrow(/t is NaN/);
  });
});

describe('the expression reader: the other scalar kinds', () => {
  const dir = tempDir('upt-batch-cov-');
  const file = (name: string, v: unknown) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(v));
    return path;
  };
  const x = sym('x', DIMENSIONLESS);

  it('reads an integral with bounds, a derivative, a dirac delta and a variational derivative; refuses a missing bound child', () => {
    expect(parseExprJson(file('int.json', { kind: 'integral', over: x, integrand: x, lower: x, upper: x })).kind).toBe('integral');
    expect(parseExprJson(file('deriv.json', { kind: 'derivative', of: x, wrt: x })).kind).toBe('derivative');
    expect(parseExprJson(file('delta.json', { kind: 'dirac-delta', arg: x })).kind).toBe('dirac-delta');
    expect(parseExprJson(file('var.json', { kind: 'variational-derivative', functional: x, field: x, over: x })).kind).toBe('variational-derivative');
    expect(() => parseExprJson(file('var-bad.json', { kind: 'variational-derivative', functional: x, field: x }))).toThrow(ProblemFileError);
    expect(() => parseExprJson(file('int-bad.json', { kind: 'integral', over: x, integrand: x, lower: 5 }))).toThrow(/#lower is not an ExprNode/);
  });
});

describe('the dataset reader: the other refusals', () => {
  it('names an object cell, and a CSV split that is neither exploratory nor holdout', () => {
    expect(() => asDatasetSafe({ rows: [{ x: {} }], observable: 'x', role: 'exploratory-fit' }, 'd')).toThrow(/column x: an object is not a number/);
    const dir = tempDir('upt-batch-cov-csv-');
    const sc = join(dir, 's.csv');
    writeFileSync(sc, 'x,y,split\n1,2,test\n');
    expect(() => loadSplitCsv(sc, 'y')).toThrow(DatasetError);
    expect(() => loadSplitCsv(sc, 'y')).toThrow(/invalid split 'test'/);
  });
});
