/**
 * `upt probe study` engine (audit §14 I19): calibrated observations with
 * units and σ, exploratory / holdout / replication roles, baselines, and a
 * χ² criterion.
 *
 * The pendulum fixtures are SYNTHETIC positive controls whose generating law
 * was chosen knowing the answer: recovering √(L/g) from them shows the
 * workflow can recover a law, not that it would find an unknown one. The
 * regime-change fixture is the paired check that the same candidate CAN fail,
 * and the pure-noise fixture that the search can come back empty.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStudy,
  runProbeStudy,
  chiSquareSurvival,
  StudyRefusal,
  type ProbeStudyResult,
} from '../../../src/composition/probe/study.js';
import { buildFixtures, exactPeriod } from '../../fixtures/probe-study/generate.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/probe-study');
type Raw = { observations: Record<string, unknown>[]; [k: string]: unknown };
const load = (name: string): Raw => JSON.parse(readFileSync(join(dir, `${name}.synthetic.json`), 'utf8')) as Raw;
const run = (raw: unknown): Promise<ProbeStudyResult> => runProbeStudy(parseStudy(raw, 'test'));
const selectedOf = (r: ProbeStudyResult) => r.candidates.find((c) => c.id === r.selected)!;
const scaleObserved = (row: Record<string, unknown>, k: number) => ({
  ...row,
  observed: `${parseFloat(String(row.observed)) * k} s`,
});

describe('chiSquareSurvival', () => {
  it('matches tabulated χ² critical values', () => {
    expect(chiSquareSurvival(3.841458820694124, 1)).toBeCloseTo(0.05, 10);
    expect(chiSquareSurvival(6.634896601021214, 1)).toBeCloseTo(0.01, 10);
    expect(chiSquareSurvival(18.307038053275146, 10)).toBeCloseTo(0.05, 10);
    expect(chiSquareSurvival(29.588298445074412, 10)).toBeCloseTo(0.001, 10);
    expect(chiSquareSurvival(2, 2)).toBeCloseTo(Math.exp(-1), 12);
  });

  it('agrees with a direct numerical integral of the χ² density (independent method)', () => {
    const lnG = (k: number) => {
      let s = 0;
      for (let i = 1; i < k; i++) s += Math.log(i);
      return s;
    };
    // Even ν: the density has a closed form with an integer Γ; integrate it from x to far out by Simpson.
    for (const [x, nu] of [[1, 4], [8, 6], [30, 12], [3, 2]] as const) {
      const pdf = (t: number) => Math.exp((nu / 2 - 1) * Math.log(t) - t / 2 - (nu / 2) * Math.log(2) - lnG(nu / 2));
      const b = x + 400;
      const n = 200000;
      const h = (b - x) / n;
      let s = pdf(x) + pdf(b);
      for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * pdf(x + i * h);
      expect(chiSquareSurvival(x, nu)).toBeCloseTo((s * h) / 3, 9);
    }
  });
});

describe('probe study — result classes', () => {
  it('recovers √(L/g) from the synthetic small-angle control and it survives the small-angle holdout', async () => {
    const r = await run(load('pendulum-small-angle'));
    expect(r.provenance.synthetic).toBe(true);
    expect(r.verdict).toBe('survives-holdout');
    const c = selectedOf(r);
    expect(c.label).toMatch(/gravity\^-0\.5/);
    expect(c.label).toMatch(/length\^0\.5/);
    expect(Math.abs(c.prefactor! - 2 * Math.PI) / (2 * Math.PI)).toBeLessThan(2e-3);
    expect(c.holdout!.pass).toBe(true);
  });

  it('the same candidate is refuted on a withheld large-amplitude regime; replication is reported separately', async () => {
    const r = await run(load('pendulum-regime-change'));
    expect(r.verdict).toBe('refuted-on-holdout');
    expect(selectedOf(r).holdout!.pass).toBe(false);
    expect(r.replication).toBe('survives-replication');
    const series = r.baselines[0]!;
    expect(series.exploratory!.pass).toBe(true);
    expect(series.holdout!.pass).toBe(true);
  });

  it('pure noise yields no credible candidate, and no candidate is scored on the withheld rows', async () => {
    const r = await run(load('pure-noise'));
    expect(r.verdict).toBe('no-credible-candidate');
    expect(r.selected).toBeNull();
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) {
      expect(c.credible).toBe(false);
      expect(c.holdout).toBeNull();
    }
    expect(r.design.abstained).toBe(true);
  });

  it('a fit is not credible when a constant fits too (inflated σ on the noise)', async () => {
    const raw = load('pure-noise');
    const r = await run({ ...raw, target: { ...(raw.target as object), sigma: '10 s' } });
    expect(r.nullModel.exploratory!.pass).toBe(true);
    expect(r.candidates[0]!.exploratory!.pass).toBe(true);
    expect(r.verdict).toBe('no-credible-candidate');
    expect(r.candidates[0]!.credibility).toMatch(/so does a constant/);
  });

  it('with no holdout rows the verdict is untested-on-holdout, not survives', async () => {
    const raw = load('pendulum-small-angle');
    const r = await run({ ...raw, observations: raw.observations.filter((o) => o.role !== 'holdout') });
    expect(r.verdict).toBe('untested-on-holdout');
  });

  it('every report carries the fit-is-not-a-mechanism caveat and the synthetic label', async () => {
    const r = await run(load('pure-noise'));
    expect(r.caveats.join('\n')).toMatch(/A fit is not a mechanism/);
    expect(r.caveats.join('\n')).toMatch(/SYNTHETIC DATA/);
  });
});

describe('probe study — discriminating measurement', () => {
  it('points at large amplitude, and says the exploratory rows cannot separate the models', async () => {
    const r = await run(load('pendulum-regime-change'));
    expect(r.design.abstained).toBe(false);
    expect(r.design.point!.amplitude).toBeCloseTo(1.2, 12);
    expect(r.design.discrimination!).toBeGreaterThan(10);
    expect(r.design.maxExploratoryDiscrimination!).toBeLessThan(1);
  });

  it('is computed from exploratory fits only: identical whatever the holdout says', async () => {
    const small = await run(load('pendulum-small-angle'));
    const large = await run(load('pendulum-regime-change'));
    expect(large.design).toEqual(small.design);
  });
});

describe('probe study — leakage guard', () => {
  it('perturbing holdout and replication rows cannot change the fit', async () => {
    const raw = load('pendulum-regime-change');
    const base = await run(raw);
    const perturbed = await run({
      ...raw,
      observations: raw.observations.map((o) => (o.role === 'exploratory' ? o : scaleObserved(o, 3))),
    });
    const fitOf = (r: ProbeStudyResult) =>
      r.candidates.map((c) => ({ id: c.id, prefactor: c.prefactor, exploratory: c.exploratory, credible: c.credible }));
    expect(fitOf(perturbed)).toEqual(fitOf(base));
    expect(perturbed.selected).toBe(base.selected);
    expect(perturbed.nullModel).toEqual(base.nullModel);
    expect(perturbed.baselines.map((x) => x.exploratory)).toEqual(base.baselines.map((x) => x.exploratory));
    expect(perturbed.replication).toBe('refuted-on-replication');
  });

  it('paired check: perturbing one exploratory row does change the fit', async () => {
    const raw = load('pendulum-regime-change');
    const base = await run(raw);
    const moved = await run({
      ...raw,
      observations: raw.observations.map((o) => (o.id === 'e3' ? scaleObserved(o, 1.001) : o)),
    });
    expect(selectedOf(moved).prefactor).not.toBe(selectedOf(base).prefactor);
  });

  it('refuses a withheld row that repeats an exploratory row', () => {
    const raw = load('pendulum-small-angle');
    const e1 = raw.observations.find((o) => o.id === 'e1')!;
    const leak = { ...e1, id: 'h-leak', role: 'holdout' };
    expect(() => parseStudy({ ...raw, observations: [...raw.observations, leak] })).toThrow(
      /holdout row repeats the inputs of exploratory row e1/,
    );
  });

  it('refuses replication rows from the same acquisition as the exploratory rows', () => {
    const raw = load('pendulum-small-angle');
    const obs = raw.observations.map((o) => {
      if (o.role !== 'replication') return o;
      const { source: _s, ...rest } = o;
      return rest;
    });
    expect(() => parseStudy({ ...raw, observations: obs })).toThrow(/independent acquisition/);
  });
});

describe('probe study — refusals', () => {
  const raw = load('pendulum-small-angle');
  const withRow = (patch: Record<string, unknown>) => ({
    ...raw,
    observations: raw.observations.map((o) => (o.id === 'e2' ? { ...o, ...patch } : o)),
  });

  it('a value whose unit has the wrong dimension refuses the file, naming the row', () => {
    expect(() => parseStudy(withRow({ observed: '2 m' }))).toThrow(StudyRefusal);
    expect(() => parseStudy(withRow({ observed: '2 m' }))).toThrow(/observation e2 observed/);
    expect(() =>
      parseStudy(withRow({ values: { length: '1 kg', gravity: 9.81, amplitude: 0.05 } })),
    ).toThrow(/observation e2 values\.length.*'kg' is \[mass\]/);
  });

  it('refuses an undeclared key, an undeclared input, a missing σ and an undeclared provenance', () => {
    expect(() => parseStudy(withRow({ period: 2 }))).toThrow(/undeclared key 'period'/);
    expect(() => parseStudy(withRow({ values: { length: 1, gravity: 9.81, amplitude: 0.05, mass: 1 } }))).toThrow(
      /values\.mass.*not a declared governing input/,
    );
    expect(() => parseStudy({ ...raw, target: { name: 'period', unit: 's' } })).toThrow(/no uncertainty/);
    const { synthetic: _s, ...prov } = raw.provenance as Record<string, unknown>;
    expect(() => parseStudy({ ...raw, provenance: prov })).toThrow(/never inferred/);
  });

  it('refuses a baseline without the target dimension', () => {
    expect(() =>
      parseStudy({ ...raw, baselines: [{ name: 'wrong', formula: 'length/gravity' }] }),
    ).toThrow(/baselines\[0\].*target 'period'/);
  });
});

describe('probe study — units', () => {
  it('rows given in cm and deg give the same result as the same rows in plain SI numbers', async () => {
    const raw = load('pendulum-regime-change');
    const si = raw.observations.map((o) => {
      const v = o.values as Record<string, unknown>;
      const num = (x: unknown, per: Record<string, number>) => {
        const [n, u] = String(x).split(' ');
        return Number(n) * (u ? per[u]! : 1);
      };
      return {
        ...o,
        values: {
          length: num(v.length, { m: 1, cm: 0.01 }),
          gravity: v.gravity,
          amplitude: num(v.amplitude, { rad: 1, deg: Math.PI / 180 }),
        },
        observed: parseFloat(String(o.observed)),
      };
    });
    expect(raw.observations.some((o) => /cm/.test(JSON.stringify(o.values)))).toBe(true);
    expect(raw.observations.some((o) => /deg/.test(JSON.stringify(o.values)))).toBe(true);
    const a = await run(raw);
    const b = await run({ ...raw, observations: si });
    expect(selectedOf(b).prefactor!).toBeCloseTo(selectedOf(a).prefactor!, 10);
    expect(selectedOf(b).holdout!.chi2).toBeCloseTo(selectedOf(a).holdout!.chi2, 4);
    expect(b.verdict).toBe(a.verdict);
  });
});

describe('probe study — synthetic fixtures', () => {
  it('the committed files are exactly the generator output', () => {
    for (const [name, text] of Object.entries(buildFixtures())) {
      expect(readFileSync(join(dir, name), 'utf8')).toBe(text);
    }
  });

  it('every fixture declares itself synthetic in its provenance and its description', () => {
    for (const name of Object.keys(buildFixtures())) {
      const raw = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      expect(raw.provenance.synthetic).toBe(true);
      expect(raw.description).toMatch(/^SYNTHETIC/);
      expect(raw.provenance.acquisition).toMatch(/SYNTHETIC/);
    }
  });

  it("the generator's AGM period agrees with a direct quadrature of the pendulum integral", () => {
    // T = 4√(L/g) ∫₀^{π/2} dφ / √(1 − k² sin²φ), k = sin(θ₀/2); Simpson on the smooth integrand.
    for (const theta of [0.05, 0.6, 1.2]) {
      const k = Math.sin(theta / 2);
      const n = 2000;
      const h = Math.PI / 2 / n;
      const f = (p: number) => 1 / Math.sqrt(1 - k * k * Math.sin(p) ** 2);
      let s = f(0) + f(Math.PI / 2);
      for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(i * h);
      const quad = 4 * Math.sqrt(1.5 / 9.81) * ((s * h) / 3);
      expect(exactPeriod(1.5, 9.81, theta)).toBeCloseTo(quad, 12);
    }
  });
});
