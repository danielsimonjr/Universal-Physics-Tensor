/**
 * `upt probe study` refuses a malformed study, CSV or replication file, and
 * says where and why. Each case changes ONE thing in a study that parses, so
 * a refusal is caused by that change: the base study is checked to parse
 * first, and every case must name its own field and reason. A validation
 * that stopped firing, or fired with the wrong message, fails its row.
 *
 * The χ² and F survival functions are checked against closed forms that do
 * not use the incomplete gamma or beta functions the code implements, and the
 * design suggestion's two abstentions are checked on noise-free rows of a
 * known law whose prefactor the candidate must recover.
 */
import { describe, it, expect } from 'vitest';
import {
  attachReplication,
  chiSquareSurvival,
  formatProbeStudy,
  fSurvival,
  parseStudy,
  runProbeStudy,
  studyCsvToRaw,
  StudyRefusal,
} from '../../../src/composition/probe/study.js';

type Raw = Record<string, any>;

const base = (): Raw => ({
  provenance: { synthetic: true, source: 'hand-written test rows' },
  target: { name: 'period', unit: 's', sigma: '2 ms' },
  governing: [
    { name: 'length', unit: 'm' },
    { name: 'gravity', unit: 'm/s^2' },
    { name: 'amplitude', unit: 'rad' },
  ],
  observations: [
    { id: 'e1', role: 'exploratory', values: { length: 0.5, gravity: 9.81, amplitude: 0.1 }, observed: 1.42 },
    { id: 'e2', role: 'exploratory', values: { length: 1.0, gravity: 9.81, amplitude: 0.1 }, observed: 2.01 },
    { id: 'e3', role: 'exploratory', values: { length: 1.5, gravity: 9.81, amplitude: 0.1 }, observed: 2.46 },
    { id: 'h1', role: 'holdout', values: { length: 2.0, gravity: 9.81, amplitude: 0.1 }, observed: 2.84 },
  ],
});

const refusal = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(StudyRefusal);
    return (e as Error).message;
  }
  throw new Error('expected a refusal, but the input was accepted');
};

const edit = (patch: (r: Raw) => void): Raw => {
  const r = base();
  patch(r);
  return r;
};
const row = (r: Raw, id: string) => r.observations.find((o: Raw) => o.id === id);

describe('probe study — the base study used below parses', () => {
  it('so each refusal below comes from its one change', () => {
    const s = parseStudy(base(), 'base');
    expect(s.observations.map((o) => o.role)).toEqual(['exploratory', 'exploratory', 'exploratory', 'holdout']);
    expect(s.observations[0]!.sigma).toBeCloseTo(0.002, 15);
  });
});

describe('probe study — a malformed study is refused, naming the field', () => {
  const cases: [string, unknown, RegExp][] = [
    ['not an object', 'rows', /\(t\): is not a JSON object/],
    ['an undeclared top-level key', edit((r) => (r.extra = 1)), /undeclared top-level key 'extra'/],
    ['no provenance', edit((r) => delete r.provenance), /\(provenance\): is required/],
    ['no provenance source', edit((r) => delete r.provenance.source), /\(provenance\.source\): must name where/],
    ['a target without a name', edit((r) => (r.target = { unit: 's' })), /\(target\): needs \{"name", "unit"\}/],
    ['an unknown target unit', edit((r) => (r.target.unit = 'furlongz')), /\(target\): /],
    ['an affine target unit', edit((r) => (r.target = { name: 'period', unit: 'degC' })), /declare an absolute unit \(K\), not 'degC'/],
    ['no governing inputs', edit((r) => (r.governing = [])), /\(governing\): must be a non-empty array/],
    ['an input named like the target', edit((r) => (r.governing[0].name = 'period')), /names must be distinct/],
    ['a non-positive input σ', edit((r) => (r.governing[0].sigma = -1)), /\(governing\[0\]\.sigma\): must be positive/],
    ['an unknown gap kind', edit((r) => (r.gap = { kind: 'hunch' })), /\(gap\.kind\): unknown gap kind 'hunch'/],
    ['a criterion without alpha', edit((r) => (r.criterion = { level: 3 })), /\(criterion\): needs \{"alpha": number\}/],
    ['an alpha outside (0, 1)', edit((r) => (r.criterion = { alpha: 1.5 })), /\(criterion\.alpha\): must be in \(0, 1\)/],
    ['no observations', edit((r) => (r.observations = [])), /\(observations\): must be a non-empty array/],
    ['a row that is not an object', edit((r) => (r.observations = ['e1'])), /\(observation row-1\): is not an object/],
    ['an undeclared row key', edit((r) => (row(r, 'e1').weight = 2)), /\(observation e1\): undeclared key 'weight'/],
    ['a row without values', edit((r) => delete row(r, 'e1').values), /\(observation e1\): needs "values"/],
    ['a value for an undeclared input', edit((r) => (row(r, 'e1').values.mass = 1)), /\(observation e1 values\.mass\): is not a declared governing input/],
    ['a missing input', edit((r) => delete row(r, 'e1').values.amplitude), /\(observation e1\): is missing input 'amplitude'/],
    ['a missing observed value', edit((r) => delete row(r, 'e1').observed), /\(observation e1\): is missing "observed" \(period\)/],
    ['no σ on the row or the target', edit((r) => delete r.target.sigma), /\(observation e1\): has no uncertainty/],
    ['a boolean value', edit((r) => (row(r, 'e1').values.length = true)), /\(observation e1 values\.length\): is not a number or a "value unit" string/],
    ['a value of the wrong dimension', edit((r) => (row(r, 'e1').observed = '2 kg')), /\(observation e1 observed\): /],
    ['an input σ that is not an object', edit((r) => (row(r, 'e1').inputSigma = 5)), /"inputSigma" must be \{input: σ\}/],
    ['an input σ for an undeclared input', edit((r) => (row(r, 'e1').inputSigma = { mass: 1 })), /\(observation e1 inputSigma\.mass\): is not a declared governing input/],
    ['a non-positive input σ on a row', edit((r) => (row(r, 'e1').inputSigma = { length: '0 m' })), /\(observation e1 inputSigma\.length\): must be positive/],
    ['an empty row source', edit((r) => (row(r, 'e1').source = ' ')), /\(observation e1 source\): must be a non-empty string/],
    ['a holdout row with the inputs of a fit row', edit((r) => (row(r, 'h1').values = { ...row(r, 'e1').values })), /holdout row repeats the inputs of exploratory row e1/],
    ['a replication row from the fit source', edit((r) => r.observations.push({ id: 'r1', role: 'replication', values: { length: 3, gravity: 9.81, amplitude: 0.1 }, observed: 3.48 })), /replication row has source 'hand-written test rows', which also supplied exploratory rows/],
    ['baselines that are not an array', edit((r) => (r.baselines = { name: 'x' })), /\(baselines\): must be an array/],
    ['a baseline without a formula', edit((r) => (r.baselines = [{ name: 'x' }])), /\(baselines\[0\]\): needs \{"name", "formula"\}/],
    ['a baseline that does not parse', edit((r) => (r.baselines = [{ name: 'x', formula: 'length +' }])), /\(baselines\[0\]\): /],
    ['a baseline reading an undeclared input', edit((r) => (r.baselines = [{ name: 'x', formula: 'mass*length' }])), /reads undeclared input\(s\) mass/],
    ['a baseline of the wrong dimension', edit((r) => (r.baselines = [{ name: 'x', formula: 'length' }])), /formula is .* but the target 'period' is/],
    ['a baseline that is not homogeneous', edit((r) => (r.baselines = [{ name: 'x', formula: 'length + gravity' }])), /\(baselines\[0\]\): /],
    ['a non-boolean fitPrefactor', edit((r) => (r.baselines = [{ name: 'x', formula: 'sqrt(length/gravity)', fitPrefactor: 'yes' }])), /\(baselines\[0\]\.fitPrefactor\): must be true or false/],
    ['a design without variables', edit((r) => (r.design = { length: {} })), /\(design\): needs \{"variables"/],
    ['a design over an undeclared input', edit((r) => (r.design = { variables: { mass: { min: 1, max: 2 } } })), /\(design\.variables\.mass\): is not a declared governing input/],
    ['a design range that is not an object', edit((r) => (r.design = { variables: { length: 3 } })), /\(design\.variables\.length\): needs \{"min", "max"\}/],
    ['a design with min > max', edit((r) => (r.design = { variables: { length: { min: 2, max: 1 } } })), /\(design\.variables\.length\): has min > max/],
    ['a design with zero steps', edit((r) => (r.design = { variables: { length: { min: 1, max: 2, steps: 0 } } })), /\(design\.variables\.length\.steps\): must be a positive integer/],
    ['a correction without powers', edit((r) => (r.correction = { input: 'amplitude' })), /\(correction\): needs \{"input"/],
    ['a correction with an undeclared key', edit((r) => (r.correction = { input: 'amplitude', powers: [2], order: 1 })), /\(correction\): undeclared key 'order'/],
    ['a correction in an undeclared input', edit((r) => (r.correction = { input: 'phase', powers: [2] })), /\(correction\.input\): 'phase' is not a declared governing input/],
    ['a correction in a dimensioned input', edit((r) => (r.correction = { input: 'length', powers: [2] })), /'length' is .*; a correction family needs a dimensionless input/],
    ['a correction with no powers', edit((r) => (r.correction = { input: 'amplitude', powers: [] })), /\(correction\.powers\): must list 1 to 6 powers/],
    ['a correction with a negative power', edit((r) => (r.correction = { input: 'amplitude', powers: [2, -1] })), /\(correction\.powers\): must be positive finite numbers/],
    ['a correction with a repeated power', edit((r) => (r.correction = { input: 'amplitude', powers: [2, 2] })), /\(correction\.powers\): must be distinct/],
  ];
  it.each(cases)('%s', (_what, raw, message) => {
    expect(refusal(() => parseStudy(raw, 't'))).toMatch(message);
  });
});

describe('probe study — a malformed CSV study is refused, naming the line or column', () => {
  const head = ['# provenance.synthetic: true', '# provenance.source: hand', '# target: period', '# target.sigma: 2 ms'];
  const header = 'id,role,length[m],gravity[m/s^2],amplitude[rad],period[s]';
  const rows = ['e1,exploratory,0.5,9.81,0.1,1.42', 'e2,exploratory,1,9.81,0.1,2.01'];
  const csv = (h = head, hd: string | null = header, r = rows) => [...h, ...(hd === null ? [] : [hd]), ...r].join('\n');
  it('the base CSV parses', () => {
    expect(parseStudy(studyCsvToRaw(csv(), 'b.csv'), 'b.csv').observations).toHaveLength(2);
  });
  const cases: [string, string, RegExp][] = [
    ['a declaration without a key', csv([...head, '# : 1']), /line 5\): a declaration is '# key: value'/],
    ['no header row', csv(head, null, []), /\(f\.csv\): has no header row/],
    ['an empty target declaration', csv(['# provenance.synthetic: true', '# target: ']), /'# target:' names the target column/],
    ['a governing declaration other than σ', csv([...head, '# governing.length.unit: cm']), /the only governing declaration is '# governing\.<input>\.sigma: σ'/],
    ['a governing σ declared twice', csv([...head, '# governing.length.sigma: 1 mm', '# governing.length.sigma: 2 mm']), /'governing\.length\.sigma' is declared twice/],
    ['observations as a declaration', csv([...head, '# observations: []']), /observations are the rows below the header/],
    ['a key under a value', csv([...head, '# criterion: 1', '# criterion.alpha: 0.01']), /'criterion' is already set to a value/],
    ['an unknown header column', csv(head, header.replace('length[m]', 'weight')), /header column 'weight'\): is not id, role, source, sigma, note/],
    ['a duplicate header column', csv(head, `${header},length[cm]`), /header column 'length\[cm\]'\): is a duplicate column/],
    ['a target naming no quantity column', csv(head.map((l) => l.replace('# target: period', '# target: frequency'))), /'# target: frequency' names no 'name\[unit\]' column/],
    ['an input σ column for no input', csv(head, `${header},sigma(mass)`, rows.map((l) => `${l},1`)), /'sigma\(mass\)'\): 'mass' is not a governing input column/],
    ['a declared σ for no input', csv([...head, '# governing.mass.sigma: 1 g']), /governing\.mass\.sigma\): 'mass' is not a governing input column/],
    ['a target key other than σ', csv([...head, '# target.unit: ms']), /target\.unit\): the target's name and unit come from its column/],
    ['text after a closing quote', csv(head, header, ['"e1"x,exploratory,0.5,9.81,0.1,1.42']), /line 6\): has text after a closing quote/],
  ];
  it.each(cases)('%s', (_what, text, message) => {
    expect(refusal(() => studyCsvToRaw(text, 'f.csv'))).toMatch(message);
  });
});

describe('probe study — a replication file is refused unless it is an independent acquisition', () => {
  const study = () => parseStudy(base(), 'study.json');
  const rep = (patch: (r: Raw) => void = () => {}): Raw => {
    const r: Raw = {
      provenance: { synthetic: true, source: 'second rig' },
      target: { name: 'period', unit: 'ms', sigma: '2 ms' },
      governing: [
        { name: 'length', unit: 'cm' },
        { name: 'gravity', unit: 'm/s^2' },
        { name: 'amplitude', unit: 'deg' },
      ],
      observations: [{ id: 'r1', role: 'replication', values: { length: 300, gravity: 9.81, amplitude: 5 }, observed: 3480 }],
    };
    patch(r);
    return r;
  };
  it('a well-formed replication file attaches, with its own provenance', () => {
    const s = attachReplication(study(), rep(), 'rep.json');
    expect(s.observations.filter((o) => o.role === 'replication')).toHaveLength(1);
    expect(s.replication).toEqual({ source: 'rep.json', provenance: { synthetic: true, source: 'second rig' } });
  });
  const cases: [string, () => ReturnType<typeof study>, unknown, RegExp][] = [
    ['not an object', study, [1], /\(rep\.json\): is not a JSON object/],
    ['a study-only key', study, rep((r) => (r.baselines = [])), /'baselines' belongs in the study file/],
    ['a study that already has replication rows', () => parseStudy(edit((r) => r.observations.push({ id: 'r0', role: 'replication', source: 'lab B', values: { length: 3, gravity: 9.81, amplitude: 0.1 }, observed: 3.48 })), 's'), rep(), /already has replication rows/],
    ['a non-replication row', study, rep((r) => (r.observations[0].role = 'exploratory')), /holds replication rows only \(got 'exploratory'\)/],
    ['another target', study, rep((r) => (r.target = { name: 'frequency', unit: 'Hz', sigma: '1 Hz' })), /\(rep\.json target\): must be 'period'/],
    ['other inputs', study, rep((r) => r.governing.pop() && r.observations.forEach((o: Raw) => delete o.values.amplitude)), /\(rep\.json governing\): must declare the study's inputs/],
    ['the study\'s own source', study, rep((r) => (r.provenance.source = 'hand-written test rows')), /provenance\.source\): is 'hand-written test rows', the study's own source/],
    ['the study\'s own acquisition', () => parseStudy(edit((r) => (r.provenance.acquisition = 'rig A')), 's'), rep((r) => (r.provenance.acquisition = 'rig A')), /provenance\.acquisition\): is the study's own acquisition/],
    ['an id the study uses', study, rep((r) => (r.observations[0].id = 'e1')), /\(rep\.json observation e1\): id is also used in the study/],
  ];
  it.each(cases)('%s', (_what, s, raw, message) => {
    expect(refusal(() => attachReplication(s(), raw, 'rep.json'))).toMatch(message);
  });
});

describe('probe study — what the design suggestion abstains from', () => {
  // Noise-free rows of T = 2π√(L/g): the search's candidate must recover the prefactor 2π.
  const rows: Raw[] = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1].map((L, i) => ({
    id: `e${i}`, role: 'exploratory', values: { length: L, gravity: 9.81 }, observed: 2 * Math.PI * Math.sqrt(L / 9.81),
  }));
  rows.push({ id: 'h1', role: 'holdout', values: { length: 2.5, gravity: 9.81 }, observed: 2 * Math.PI * Math.sqrt(2.5 / 9.81) });
  const study = (extra: Raw = {}): Raw => ({
    provenance: { synthetic: true, source: 'noise-free rows' },
    target: { name: 'period', unit: 's', sigma: '2 ms' },
    governing: [{ name: 'length', unit: 'm' }, { name: 'gravity', unit: 'm/s^2' }],
    observations: rows,
    ...extra,
  });

  it('with no baseline it names the missing competitor, and the candidate is the recovered law', async () => {
    const r = await runProbeStudy(parseStudy(study(), 't'));
    expect(r.verdict).toBe('survives-holdout');
    expect(r.candidates.find((c) => c.id === r.selected)!.prefactor).toBeCloseTo(2 * Math.PI, 9);
    expect(r.design).toEqual({ abstained: true, reason: 'no baseline declared; nothing to discriminate the candidate against' });
  });
  it('with baselines that all fail on the exploratory rows it says none is a live competitor', async () => {
    const r = await runProbeStudy(parseStudy(study({
      baselines: [
        { name: 'no 2π', formula: 'sqrt(length/gravity)' },
        { name: 'zero', formula: '0*sqrt(length/gravity)', fitPrefactor: true },
      ],
    }), 't'));
    expect(r.baselines.map((b) => [b.label, b.exploratory?.pass ?? null, b.error ?? null])).toEqual([
      ['no 2π', false, null],
      ['zero', null, 'model is zero on every exploratory row; no scale can be fit'],
    ]);
    expect(r.design).toEqual({ abstained: true, reason: 'no declared baseline passes on the exploratory rows; none is a live competitor' });
    expect(formatProbeStudy(r)).toMatch(/not evaluable: model is zero on every exploratory row/);
  });
});

describe('probe study — χ² and F survival against closed forms', () => {
  it('P(χ²₂ ≥ x) = e^(−x/2) on both sides of the series/continued-fraction switch', () => {
    for (const x of [0.1, 1, 3.9, 4.1, 10, 40]) {
      expect(chiSquareSurvival(x, 2)).toBeCloseTo(Math.exp(-x / 2), 12);
    }
  });
  it('P(χ²₄ ≥ x) = e^(−x/2)(1 + x/2)', () => {
    for (const x of [0.5, 2, 6, 20]) {
      expect(chiSquareSurvival(x, 4)).toBeCloseTo(Math.exp(-x / 2) * (1 + x / 2), 12);
    }
  });
  it('P(F₂,ν ≥ f) = (1 + 2f/ν)^(−ν/2), and P(F_d,2 ≥ f) = 1 − (df/(df + 2))^(d/2)', () => {
    for (const [f, nu] of [[0.3, 5], [1, 7], [4, 3], [12, 20]] as const) {
      expect(fSurvival(f, 2, nu)).toBeCloseTo((1 + (2 * f) / nu) ** (-nu / 2), 10);
    }
    for (const [f, d] of [[0.5, 1], [2, 3], [9, 4]] as const) {
      expect(fSurvival(f, d, 2)).toBeCloseTo(1 - ((d * f) / (d * f + 2)) ** (d / 2), 10);
    }
  });
  it('the edges: no evidence is survival 1, an infinite F is survival 0, and a non-positive ν is refused', () => {
    expect(chiSquareSurvival(0, 3)).toBe(1);
    expect(fSurvival(0, 1, 3)).toBe(1);
    expect(fSurvival(Infinity, 1, 3)).toBe(0);
    expect(() => chiSquareSurvival(1, 0)).toThrow(RangeError);
    expect(() => fSurvival(1, 0, 3)).toThrow(RangeError);
    expect(() => fSurvival(1, 1, -1)).toThrow(RangeError);
  });
});
