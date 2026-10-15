/**
 * Numbers pinned BEFORE the 2026-10-15 probe batch (proposals 8, 9, 10, 12 and the defect
 * fixes), so the batch can show what it moved and by how much.
 *
 * The χ² values of the study fixtures were read from `runProbeStudy` on the tree at
 * `0c3c67b` (the deep-dive branch before this batch). The effective σ now goes through
 * MathTS `propagateUncertainty` (a different finite-difference step) and the replication
 * affine fit and the RMSE copies through core `pairwiseDot` / `pairwiseSum` / `norm2`, so
 * each value may move in its last digits and no further; a verdict may not move at all.
 * Each pin states the tolerance it allows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadStudyFile,
  parseStudy,
  replicationIndependence,
  runProbeStudy,
  type ProbeStudyResult,
  type StudyObservation,
} from '../../../src/composition/probe/study.js';
import { rmse } from '../../../src/composition/probe/residual.js';
import { checkDeclaredLimit } from '../../../src/composition/probe/limits.js';
import { fitPrefactor } from '../../../src/composition/probe/fit.js';
import { datasetFromRows } from '../../../src/composition/probe/dataset.js';
import { monomialToExpr } from '../../../src/composition/probe/generator.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/probe-study');
const run = (name: string): Promise<ProbeStudyResult> =>
  runProbeStudy(parseStudy(JSON.parse(readFileSync(join(dir, `${name}.synthetic.json`), 'utf8')), 'test'));

/** |a/b − 1|, or |a − b| when the pin is 0. */
const rel = (a: number, b: number): number => (b === 0 ? Math.abs(a - b) : Math.abs(a / b - 1));

type Pin = { readonly verdict: string; readonly selected: string | null; readonly values: Readonly<Record<string, number>> };

/** Every χ² and fitted number of a fixture, keyed so a moved value is named. */
function flatten(r: ProbeStudyResult): Record<string, number> {
  const out: Record<string, number> = {};
  const put = (k: string, v: number | null | undefined) => {
    if (typeof v === 'number') out[k] = v;
  };
  put('null.ex', r.nullModel.exploratory?.chi2);
  for (const c of r.candidates) {
    put(`${c.id}.prefactor`, c.prefactor);
    put(`${c.id}.ex`, c.exploratory?.chi2);
    put(`${c.id}.ho`, c.holdout?.chi2);
    put(`${c.id}.rep`, c.replication?.chi2);
    c.correction?.terms.forEach((t, j) => put(`${c.id}.c${j + 1}`, t.coefficient));
  }
  for (const b of r.baselines) {
    put(`${b.id}.prefactor`, b.prefactor);
    put(`${b.id}.ex`, b.exploratory?.chi2);
    put(`${b.id}.ho`, b.holdout?.chi2);
    put(`${b.id}.rep`, b.replication?.chi2);
  }
  return out;
}

const PINS: Readonly<Record<string, Pin>> = {
  'pendulum-small-angle': {
    verdict: 'survives-holdout',
    selected: 'h-1-d21bf2bf7a',
    values: {
      'null.ex': 886214.4649562498,
      'h-1-d21bf2bf7a.prefactor': 6.285406676544511,
      'h-1-d21bf2bf7a.ex': 6.9358267026495986,
      'h-1-d21bf2bf7a.ho': 7.910111930519886,
      'h-1-d21bf2bf7a.rep': 5.387631108616509,
      'baseline:finite-amplitude series (to θ⁶).prefactor': 1,
      'baseline:finite-amplitude series (to θ⁶).ex': 7.761215886702905,
      'baseline:finite-amplitude series (to θ⁶).ho': 7.1278048440428305,
      'baseline:finite-amplitude series (to θ⁶).rep': 3.653894215778195,
    },
  },
  'pendulum-regime-change': {
    verdict: 'refuted-on-holdout',
    selected: 'h-1-d21bf2bf7a',
    values: {
      'null.ex': 886214.4649562498,
      'h-1-d21bf2bf7a.prefactor': 6.285406676544511,
      'h-1-d21bf2bf7a.ex': 6.9358267026495986,
      'h-1-d21bf2bf7a.ho': 38232.95436801801,
      'h-1-d21bf2bf7a.rep': 5.387631108616509,
      'baseline:finite-amplitude series (to θ⁶).ex': 7.761215886702905,
      'baseline:finite-amplitude series (to θ⁶).ho': 6.984148235010812,
      'baseline:finite-amplitude series (to θ⁶).rep': 3.653894215778195,
    },
  },
  'pendulum-large-amplitude': {
    verdict: 'survives-holdout',
    selected: 'h-1-d21bf2bf7a×(1+amplitude^2)',
    values: {
      'null.ex': 1192188.3384714287,
      'h-1-d21bf2bf7a.prefactor': 6.531801905914081,
      'h-1-d21bf2bf7a.ex': 21283.568208196975,
      'h-1-d21bf2bf7a×(1+amplitude^2).prefactor': 6.277642603557588,
      'h-1-d21bf2bf7a×(1+amplitude^2).ex': 10.476732619959554,
      'h-1-d21bf2bf7a×(1+amplitude^2).ho': 10.379818198829728,
      'h-1-d21bf2bf7a×(1+amplitude^2).c1': 0.06818929172353515,
      'baseline:small-angle law 2π√(L/g).ex': 49006.80347137394,
      'baseline:small-angle law 2π√(L/g).ho': 18652.627811979837,
    },
  },
  'pendulum-input-sigma': {
    verdict: 'survives-holdout',
    selected: 'h-1-d21bf2bf7a',
    values: {
      'null.ex': 884352.2346916667,
      'h-1-d21bf2bf7a.prefactor': 6.286709361517653,
      'h-1-d21bf2bf7a.ex': 6.9823898495150845,
      'h-1-d21bf2bf7a.ho': 2.6570368569924074,
      'baseline:small-angle law 2π√(L/g).ex': 7.441081953156105,
      'baseline:small-angle law 2π√(L/g).ho': 2.6071804236985496,
    },
  },
  'pendulum-physical': {
    verdict: 'survives-holdout',
    selected: 'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2)',
    values: {
      'null.ex': 201450.260991,
      'h-1-d21bf2bf7a.prefactor': 6.509021815384033,
      'h-1-d21bf2bf7a.ex': 1196.4247166285638,
      'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2).prefactor': 6.2749724403902505,
      'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2).ex': 11.65275296246202,
      'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2).ho': 8.115597772112164,
      'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2).c1': 0.06742573443078875,
      'h-1-d21bf2bf7a×(1+amplitude^2+bob_ratio^2).c2': 0.2139169520546023,
      'baseline:small-angle law 2π√(L/g).ex': 5521.987495466134,
      'baseline:small-angle law 2π√(L/g).ho': 1760.2314966970018,
    },
  },
  'noise-amplitude': {
    verdict: 'no-credible-candidate',
    selected: null,
    values: {
      'null.ex': 39.101869154999974,
      'h-1-d21bf2bf7a.prefactor': 6.22318873680078,
      'h-1-d21bf2bf7a.ex': 39.101869154999974,
    },
  },
  'pure-noise': {
    verdict: 'no-credible-candidate',
    selected: null,
    values: {
      'null.ex': 8673.223430105967,
      'h-1-d21bf2bf7a.prefactor': 7.26382894220993,
      'h-1-d21bf2bf7a.ex': 10788.54869993792,
      'baseline:small-angle law 2π√(L/g).ex': 11376.721139647725,
      'baseline:small-angle law 2π√(L/g).ho': 5614.121260673783,
    },
  },
};

/** A χ² or a fitted coefficient may move in its last digits only: 1e-9 relative. */
const CHI2_TOL = 1e-9;

describe('batch pins — study fixtures', () => {
  for (const [name, pin] of Object.entries(PINS)) {
    it(`${name}: the verdict is unchanged and every χ² moves by less than ${CHI2_TOL} relative`, async () => {
      const r = await run(name);
      expect(r.verdict).toBe(pin.verdict);
      expect(r.selected).toBe(pin.selected);
      const got = flatten(r);
      let worst = 0;
      let worstKey = '';
      for (const [k, v] of Object.entries(pin.values)) {
        expect(got[k], k).toBeTypeOf('number');
        const d = rel(got[k]!, v);
        if (d > worst) {
          worst = d;
          worstKey = k;
        }
        expect(d, `${name} ${k}: ${got[k]} vs pinned ${v}`).toBeLessThanOrEqual(CHI2_TOL);
      }
      // eslint-disable-next-line no-console -- the move is the record this batch reports
      console.log(`batch-pins ${name}: largest relative move ${worst.toExponential(2)} at ${worstKey || '(none)'}`);
    });
  }

  it('the separate replication file: the selected candidate\'s replication χ²', async () => {
    const r = await runProbeStudy(
      loadStudyFile(join(dir, 'pendulum-large-amplitude.synthetic.json'), join(dir, 'pendulum-large-amplitude.replication.synthetic.csv')),
    );
    const rep = r.candidates.find((c) => c.id === r.selected)!.replication!.chi2;
    expect(rel(rep, 5.751136837264191)).toBeLessThanOrEqual(CHI2_TOL);
    expect(r.replicationIndependence.pairs).toBe(0);
  });
});

describe('batch pins — replication closeness (affine fit via pairwise sums)', () => {
  it('identity and affine χ², slope and offset move by less than 1e-12 relative', () => {
    const rows: StudyObservation[] = [];
    for (let i = 0; i < 6; i++) {
      const x = 1 + 0.5 * i;
      const y = 2.0 * Math.sqrt(x);
      rows.push({ id: `s${i}`, role: 'exploratory', source: 'lab a', inputs: { x }, observed: y, sigma: 0.01, inputSigma: {} });
      rows.push({ id: `r${i}`, role: 'replication', source: 'lab b', inputs: { x }, observed: 1.01 * y + 0.004 * Math.sin(3 * i), sigma: 0.012, inputSigma: {} });
    }
    const r = replicationIndependence(rows, 0.2);
    expect(rel(r.identity!.chi2, 22.665158283596796)).toBeLessThanOrEqual(1e-12);
    expect(r.identity!.flagged).toBe(false);
    expect(rel(r.affine!.chi2, 0.059332696201112416)).toBeLessThanOrEqual(1e-12);
    expect(rel(r.affine!.slope, 1.0105576983136426)).toBeLessThanOrEqual(1e-12);
    expect(rel(r.affine!.offset, -0.001381827809506131)).toBeLessThanOrEqual(1e-12);
    expect(r.affine!.flagged).toBe(true);
  });
});

describe('batch pins — the RMSE copies and the prefactor fit', () => {
  const obs = [1.5, 2.25, 3.1, 4.9, 7.2, 1e-7, 3e8];
  const pred = [1.4, 2.3, 3.0, 5.1, 7.0, 1.2e-7, 2.9e8];
  const y = { name: 'y', dim: DIMENSIONLESS };
  const x = { name: 'x', dim: DIMENSIONLESS };
  const expr = monomialToExpr({ x: 1 }, [y, x]);

  it('residual.rmse and the limit check\'s RMSE: the naive Σr² value, to 1e-15 relative (core norm2 may move the last bit)', () => {
    const naive = 3779644.7300922745;
    expect(rel(rmse(obs, pred, { kind: 'additive', observableIds: ['y'] }), naive)).toBeLessThanOrEqual(1e-15);
    const ds = datasetFromRows(obs.map((o, i) => ({ x: pred[i]!, y: o })), 'y', 'falsification-only', 'z');
    const detail = checkDeclaredLimit(expr, ds, 1, { id: 'l', regime: {} }, false).detail;
    const m = /rmse=([-+0-9.e]+)/.exec(detail);
    expect(m).not.toBeNull();
    expect(rel(Number(m![1]), naive)).toBeLessThanOrEqual(1e-15);
  });

  it('the exploratory prefactor is unchanged to the bit', () => {
    const ex = datasetFromRows([{ x: 1, y: 2.1 }, { x: 2, y: 3.9 }, { x: 3, y: 6.2 }], 'y', 'exploratory-fit', 'e');
    const f = fitPrefactor(expr, ex, undefined);
    expect(f.prefactor).toBe(2.0357142857142856);
    expect(f.exploratoryRmse).toBeCloseTo(0.11852265204432053, 15);
  });
});
