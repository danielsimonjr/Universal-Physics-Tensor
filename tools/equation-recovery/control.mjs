/** Exercise the harness using the existing, answer-known pendulum controls. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hashCanonical } from '../../dist/composition/canonical-json.js';
import { convertValue } from '../../dist/dimensional/units.js';

const cases = [];
const key = {};
for (const [index, name] of ['pendulum-small-angle', 'pendulum-regime-change', 'pure-noise'].entries()) {
  const file = new URL(`../../tests/fixtures/probe-study/${name}.synthetic.json`, import.meta.url);
  const fixture = JSON.parse(readFileSync(file, 'utf8'));
  const id = `c${index + 1}`;
  const governing = fixture.governing.map(({ unit }, i) => ({ name: `q${i + 1}`, unit }));
  const rows = (role) => fixture.observations.filter((row) => row.role === role).map((row) => ({
    inputs: Object.fromEntries(fixture.governing.map((input, i) => [
      governing[i].name, convertValue(String(row.values[input.name]), input.unit).value,
    ])),
    observed: convertValue(String(row.observed), fixture.target.unit).value,
    sigma: convertValue(String(row.sigma ?? fixture.target.sigma), fixture.target.unit, 'difference').value,
  }));
  cases.push({
    id,
    target: { name: 'y1', unit: fixture.target.unit },
    governing,
    exploratory: rows('exploratory'),
    challenge: rows('holdout'),
    synthetic: true,
  });
  key[id] = { family: 'f1', positive: index === 0 };
}

const dir = mkdtempSync(join(tmpdir(), 'upt-equation-recovery-'));
try {
  const packetPath = join(dir, 'packet.json');
  const keyPath = join(dir, 'key.json');
  writeFileSync(keyPath, JSON.stringify(key));
  const runner = fileURLToPath(new URL('./run.mjs', import.meta.url));
  const graphPath = join(dir, 'graph.json');
  function run(packet, graph) {
    writeFileSync(packetPath, JSON.stringify(packet));
    if (graph) writeFileSync(graphPath, JSON.stringify(graph));
    return spawnSync(process.execPath, [runner, packetPath, keyPath, ...(graph ? [graphPath] : [])], { encoding: 'utf8' });
  }

  const actual = run(cases);
  assert.equal(actual.status, 0, actual.stderr);
  const report = JSON.parse(actual.stdout);
  assert.equal(Object.hasOwn(report, 'graphInputSha256'), false);
  const [positive, negative, noise] = report.results;
  for (const method of ['engine', 'dimensional']) {
    assert.equal(positive[method], 'recovered');
    assert.equal(negative[method], 'refuted');
    assert.equal(noise[method], 'abstained');
  }
  assert.equal(positive.selected, negative.selected);
  assert.equal(positive.prefactor, negative.prefactor);
  const contaminated = run([{ ...cases[0], formula: 'answer' }, ...cases.slice(1)]);
  assert.equal(contaminated.status, 1);
  assert.match(contaminated.stderr, /case must have exactly these fields/);

  const linearRow = (x, observed = 2 * x) => ({ inputs: { q1: x }, observed, sigma: 0.125 });
  const linear = {
    id: cases[0].id,
    target: { name: 'y1', unit: 'm' },
    governing: [{ name: 'q1', unit: 'm' }],
    exploratory: [1, 2, 3, 4].map((x) => linearRow(x)),
    challenge: [linearRow(5, 11), linearRow(6), linearRow(7)],
    synthetic: true,
  };
  const linearResult = run([linear, ...cases.slice(1)]);
  assert.equal(linearResult.status, 0, linearResult.stderr);
  const [linearScore] = JSON.parse(linearResult.stdout).results;
  for (const method of ['engine', 'dimensional']) {
    assert.equal(linearScore[method], 'refuted');
    assert.equal(linearScore.challenge[method].chi2, 64);
    assert.equal(linearScore.challenge[method].dof, 3);
  }
  for (const [split, repeated] of [
    ['exploratory', [linear.exploratory[0]]],
    ['challenge', Array(40).fill(linear.challenge[1])],
  ]) {
    const copied = run([{ ...linear, [split]: [...linear[split], ...repeated] }, ...cases.slice(1)]);
    assert.equal(copied.status, 1);
    assert.match(copied.stderr, new RegExp(`${split} row \\d+ duplicates ${split} row \\d+`));
  }
  const repeated = run([{ ...linear, challenge: [...linear.challenge, linearRow(6, 12.0625)] }, ...cases.slice(1)]);
  assert.equal(repeated.status, 0, repeated.stderr);
  const [repeatedScore] = JSON.parse(repeated.stdout).results;
  assert.equal(repeatedScore.challenge.engine.n, 4);
  assert.equal(repeatedScore.challenge.engine.chi2, 64.25);

  // Exercise graph composition with the publicly known control, including
  // two held-out encodings that could otherwise bypass the intended route.
  const fold = {
    heldOut: 'f1',
    quantities: { q1: 'm', q2: 'm/s^2', q3: 'rad', q4: 's^2', y1: 's' },
    edges: [
      { id: 'e1', family: 'f2', sources: ['q1', 'q2'], target: 'q4', formula: 'q1/q2', domain: 'q2 > 0' },
      { id: 'e2', family: 'f3', sources: ['q4'], target: 'y1', formula: '2*pi*sqrt(q4)', domain: 'q4 >= 0' },
    ],
  };
  const spec = { folds: Object.fromEntries(cases.map(({ id, governing }) => {
    const quantities = { ...fold.quantities };
    if (!governing.some(({ name }) => name === 'q3')) delete quantities.q3;
    return [id, { ...fold, graphSha256: hashCanonical({ quantities, edges: fold.edges }) }];
  })) };
  const graphResult = run(cases, spec);
  assert.equal(graphResult.status, 0, graphResult.stderr);
  const graphReport = JSON.parse(graphResult.stdout);
  const graphDigest = () => createHash('sha256').update(readFileSync(graphPath)).digest('hex');
  assert.equal(graphReport.graphInputSha256, graphDigest());
  assert.deepEqual(graphReport.results.map(({ graph }) => graph), ['recovered', 'refuted', 'abstained']);
  assert.deepEqual(graphReport.results[0].graphEvidence.route, ['e1', 'e2']);

  const hidden = ['e3', 'e4'].map((id) => ({
    id, family: 'f1', sources: ['q1', 'q2'], target: 'y1',
    formula: 'this must never compile', domain: 'nor this',
  }));
  const mutant = { folds: Object.fromEntries(cases.map(({ id }) => [
    id, { ...spec.folds[id], edges: [...hidden, ...fold.edges] },
  ])) };
  const mutated = run(cases, mutant);
  assert.equal(mutated.status, 0, mutated.stderr);
  const { graphInputSha256: mutatedInputHash, ...mutatedReport } = JSON.parse(mutated.stdout);
  const { graphInputSha256: originalInputHash, ...originalReport } = graphReport;
  assert.equal(mutatedInputHash, graphDigest());
  assert.notEqual(mutatedInputHash, originalInputHash);
  assert.deepEqual(mutatedReport, originalReport);
  mutant.folds.c1.heldOut = 'f2';
  const leaking = run(cases, mutant);
  assert.equal(leaking.status, 1);
  assert.match(leaking.stderr, /projected graph SHA-256 differs/);
  assert.deepEqual(graphReport.results[0].graphEvidence.route, graphReport.results[1].graphEvidence.route);
  assert.deepEqual(graphReport.results[0].graphEvidence.exploratory, graphReport.results[1].graphEvidence.exploratory);
  assert.equal(graphReport.metrics.graph.recovered.count, 1);
  console.log(JSON.stringify({ ...graphReport, scope: 'answer-known development controls' }, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
