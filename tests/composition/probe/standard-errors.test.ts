/**
 * Standard errors on fitted coefficients (proposal 9): the probe's prefactor fit, the study's
 * basis coefficients and the corpus prefactor comparison each carry an uncertainty, and the study
 * reports a coefficient's z against a reference the file declares.
 *
 * The prefactor's standard error is MathTS `ols` on the scaled single column; the study's
 * covariance is (ΦᵀWΦ)⁻¹ of the existing weighted solve (equilibrated, then MathTS `inv`). Neither
 * changes a fitted value or a verdict: the pre-batch pins in batch-pins.test.ts hold.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fitPrefactor } from '../../../src/composition/probe/fit.js';
import { datasetFromRows } from '../../../src/composition/probe/dataset.js';
import { monomialToExpr } from '../../../src/composition/probe/generator.js';
import { compareToCorpus, corpusPrefactorNotes } from '../../../src/composition/probe/corpus.js';
import {
  effectiveSigma,
  formatProbeStudy,
  parseStudy,
  runProbeStudy,
  StudyRefusal,
  type ProbeStudyResult,
} from '../../../src/composition/probe/study.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { dim } from '../../../src/dimensional/ast-builders.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/probe-study');
type Raw = { observations: Record<string, unknown>[]; [k: string]: unknown };
const load = (name: string): Raw => JSON.parse(readFileSync(join(dir, `${name}.synthetic.json`), 'utf8')) as Raw;
const run = (raw: unknown): Promise<ProbeStudyResult> => runProbeStudy(parseStudy(raw, 'test'));
const selectedOf = (r: ProbeStudyResult) => r.candidates.find((c) => c.id === r.selected)!;
const rel = (a: number, b: number) => Math.abs(a / b - 1);

describe('the prefactor fit carries a standard error (MathTS ols on the scaled column)', () => {
  const y = { name: 'y', dim: DIMENSIONLESS };
  const x = { name: 'x', dim: DIMENSIONLESS };
  const expr = monomialToExpr({ x: 1 }, [y, x]);

  it('matches the analytic σ/√Σx² of a one-column no-intercept fit to 1e-12, with the prefactor unchanged', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2.1, 3.9, 6.2, 7.9, 10.3];
    const f = fitPrefactor(expr, datasetFromRows(xs.map((v, i) => ({ x: v, y: ys[i]! })), 'y', 'exploratory-fit', 'e'), undefined);
    const sxx = xs.reduce((s, v) => s + v * v, 0);
    const c = xs.reduce((s, v, i) => s + v * ys[i]!, 0) / sxx;
    const rss = ys.reduce((s, v, i) => s + (v - c * xs[i]!) ** 2, 0);
    const sigma = Math.sqrt(rss / (xs.length - 1));
    expect(f.prefactor).toBe(c);
    expect(rel(f.prefactorStderr!, sigma / Math.sqrt(sxx))).toBeLessThan(1e-12);
  });

  it('is scale-free: a column of 1e-9 (which ols alone calls singular) gives the same relative error as one of order one', () => {
    const xs = [1e-9, 2e-9, 3e-9, 4e-9];
    const ys = [2.1, 3.9, 6.2, 7.9];
    const f = fitPrefactor(expr, datasetFromRows(xs.map((v, i) => ({ x: v, y: ys[i]! })), 'y', 'exploratory-fit', 'e'), undefined);
    const g = fitPrefactor(expr, datasetFromRows(xs.map((v, i) => ({ x: v * 1e9, y: ys[i]! })), 'y', 'exploratory-fit', 'e'), undefined);
    expect(rel(f.prefactorStderr! / f.prefactor, g.prefactorStderr! / g.prefactor)).toBeLessThan(1e-9);
  });

  it('is null with one row (no residual degree of freedom) or when the form is zero everywhere', () => {
    const one = fitPrefactor(expr, datasetFromRows([{ x: 1, y: 2 }], 'y', 'exploratory-fit', 'e'), undefined);
    expect(one.prefactorStderr).toBeNull();
    const zero = fitPrefactor(expr, datasetFromRows([{ x: 0, y: 2 }, { x: 0, y: 3 }], 'y', 'exploratory-fit', 'e'), undefined);
    expect(zero.prefactor).toBe(1);
    expect(zero.prefactorStderr).toBeNull();
  });
});

describe('the corpus comparison states agreement in σ beside the relative tolerance, deciding nothing by it', () => {
  it('appends the z when a standard error is given; the pass/fail clause is the one the tolerance gives', () => {
    const period = { name: 'period', dim: dim(0, 0, 1) };
    const length = { name: 'length', dim: dim(1) };
    const gravity = { name: 'gravity', dim: dim(1, 0, -2) };
    const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
    const corp = compareToCorpus(expr, '0');
    expect(corp.algebraicMatches.some((m) => m.id === 'CE-pendulum-period')).toBe(true);
    const plain = corpusPrefactorNotes(corp, expr, 6.29, 0.15);
    const withSigma = corpusPrefactorNotes(corp, expr, 6.29, 0.15, 0.01);
    const pend = (notes: string[]) => notes.find((n) => n.includes('CE-pendulum-period'))!;
    expect(pend(plain)).toMatch(/agrees with CE-pendulum-period's prefactor 6\.283/);
    expect(pend(withSigma)).toMatch(/agrees with CE-pendulum-period's prefactor 6\.283/);
    expect(pend(withSigma)).toMatch(/\+0\.7σ \(σ_ĉ = 0\.01\)/);
    expect(pend(plain)).not.toMatch(/σ_ĉ/);
    // A contradiction at 70σ is still decided by the tolerance, and the z is stated beside it.
    const far = corpusPrefactorNotes(corp, expr, 7.0, 0.05, 0.01);
    expect(pend(far)).toMatch(/contradicts CE-pendulum-period's prefactor/);
    expect(pend(far)).toMatch(/\+71\.7σ/);
  });
});

describe('the study: coefficient covariance from the weighted normal equations', () => {
  it('a one-term fit: σ_ĉ = 1/√(Σ f²/σ²) over the exploratory rows, to 1e-12', async () => {
    const raw = load('pendulum-small-angle');
    const r = await run(raw);
    const c = selectedOf(r);
    const ex = parseStudy(raw).observations.filter((o) => o.role === 'exploratory');
    const f = (o: { inputs: Record<string, number> }) => Math.sqrt(o.inputs.length! / o.inputs.gravity!);
    const expected = 1 / Math.sqrt(ex.reduce((s, o) => s + f(o) ** 2 / o.sigma ** 2, 0));
    expect(rel(c.prefactorStderr!, expected)).toBeLessThan(1e-12);
    // The fitted baseline's prefactor carries one too; a fixed baseline carries none.
    expect(r.baselines[0]!.fittedParameters).toBe(0);
    expect(r.baselines[0]!.prefactorStderr).toBeNull();
  });

  it('with input σ the covariance uses the fixed-point effective weights', async () => {
    const raw = load('pendulum-input-sigma');
    const r = await run(raw);
    const c = selectedOf(r);
    const ex = parseStudy(raw).observations.filter((o) => o.role === 'exploratory');
    const f = (x: Record<string, number>) => Math.sqrt(x.length! / x.gravity!);
    const expected = 1 / Math.sqrt(ex.reduce((s, o) => s + f(o.inputs) ** 2 / effectiveSigma(o, (x) => c.prefactor! * f(x)) ** 2, 0));
    // The covariance is that of the last solve, whose weights come from the iterate before it
    // (settled to 1e-13 in the coefficient), so the σ_eff weights here differ from them at ~1e-10.
    expect(rel(c.prefactorStderr!, expected)).toBeLessThan(1e-8);
    // Paired check: the σ_y-only weights give a measurably different standard error.
    const outputOnly = 1 / Math.sqrt(ex.reduce((s, o) => s + f(o.inputs) ** 2 / o.sigma ** 2, 0));
    expect(rel(c.prefactorStderr!, outputOnly)).toBeGreaterThan(1e-3);
  });

  it('a correction term carries its standard error (delta method on a₁/a₀) and the z against a declared reference', async () => {
    const raw = load('pendulum-large-amplitude');
    const reference = { '2': 1 / 16, '4': 11 / 3072 };
    const r = await run({ ...raw, correction: { ...(raw.correction as object), reference } });
    const c = selectedOf(r);
    const t = c.correction!.terms[0]!;
    expect(t.power).toBe(2);
    expect(t.stderr).toBeGreaterThan(0);
    expect(t.stderr).toBeLessThan(0.01);
    expect(t.reference).toBe(1 / 16);
    expect(t.z).toBeCloseTo((t.coefficient - 1 / 16) / t.stderr!, 12);
    // The fitted values and the verdict are what they were without the reference (the shipped
    // fixture declares it, so it is removed here).
    const { reference: _shipped, ...bare } = raw.correction as Record<string, unknown>;
    expect(_shipped).toEqual(reference);
    const plain = selectedOf(await run({ ...raw, correction: bare }));
    expect(plain.correction!.terms[0]!.coefficient).toBe(t.coefficient);
    expect(plain.correction!.terms[0]!.z).toBeUndefined();
    expect(r.verdict).toBe('survives-holdout');
    // The record this batch reports: the large-amplitude control's θ² coefficient against the series 1/16.
    // eslint-disable-next-line no-console -- the number the report quotes
    console.log(`pendulum-large-amplitude: c₁ = ${t.coefficient} ± ${t.stderr} (z = ${t.z} against 1/16 = ${1 / 16})`);
    const physical = load('pendulum-physical');
    const families = (physical.correction as Record<string, unknown>[]).map((fam) =>
      fam.input === 'amplitude' ? { ...fam, reference: { '2': 1 / 16 } } : fam,
    );
    const p = selectedOf(await run({ ...physical, correction: families }));
    const amp = p.correction!.terms.find((term) => term.input === 'amplitude' && term.power === 2)!;
    expect(amp.reference).toBe(1 / 16);
    // eslint-disable-next-line no-console -- the number the report quotes
    console.log(`pendulum-physical: c(amplitude²) = ${amp.coefficient} ± ${amp.stderr} (z = ${amp.z} against 1/16)`);
    const text = formatProbeStudy(r);
    expect(text).toMatch(/c₁ = 0\.06\d+ ± 0\.00\d+ \(z = [+-]\d+\.\d against the declared 0\.0625\) \(fit on exploratory rows\)/);
    expect(text).toMatch(/ĉ = 6\.2\d+ ± 0\.0\d+ \(SI\)/);
  });

  it('refuses a reference that names no declared power or is not a number', () => {
    const raw = load('pendulum-large-amplitude');
    const bad = (reference: unknown) => {
      try {
        parseStudy({ ...raw, correction: { ...(raw.correction as object), reference } });
      } catch (e) {
        expect(e).toBeInstanceOf(StudyRefusal);
        return (e as Error).message;
      }
      throw new Error('expected a refusal');
    };
    expect(bad({ '3': 0.1 })).toMatch(/correction\.reference.*'3' is not a declared power/);
    expect(bad({ '2': 'x' })).toMatch(/correction\.reference.*'2' must be a finite number/);
    expect(bad([0.0625])).toMatch(/correction\.reference.*must be \{"<power>": number\}/);
  });
});
