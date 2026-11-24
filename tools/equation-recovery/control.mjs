/** Exercise the harness using the existing, answer-known pendulum controls. */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
  function run(packet) {
    writeFileSync(packetPath, JSON.stringify(packet));
    return spawnSync(process.execPath, [runner, packetPath, keyPath], { encoding: 'utf8' });
  }

  const actual = run(cases);
  assert.equal(actual.status, 0, actual.stderr);
  const report = JSON.parse(actual.stdout);
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
  console.log(JSON.stringify({ ...report, scope: 'answer-known development controls' }, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
