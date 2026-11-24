#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseStudy, runProbeStudy } from '../../dist/composition/probe/study.js';
import { graphFold, graphPrediction } from './graph.mjs';
import { piStructure } from '../../dist/composition/probe/power-law.js';

function fields(value, keys, where) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some((key) => !keys.includes(key)) ||
      keys.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`${where} must have exactly these fields: ${keys.join(', ')}`);
  }
}

function opaque(value, where) {
  if (typeof value !== 'string' || !/^[a-z][0-9]+$/.test(value)) {
    throw new Error(`${where} must be an opaque identifier such as q1`);
  }
  return value;
}

function project(quantity) {
  fields(quantity, ['name', 'unit'], 'quantity');
  return { name: opaque(quantity.name, 'quantity name'), unit: quantity.unit };
}

function observations(rows, role, variables) {
  const split = role === 'holdout' ? 'challenge' : role;
  if (!Array.isArray(rows) || rows.length < 3) throw new Error(`${split} needs at least three rows`);
  const firstRow = new Map();
  return rows.map((row, index) => {
    fields(row, ['inputs', 'observed', 'sigma'], `${split} row`);
    fields(row.inputs, variables, `${split} row inputs`);
    if (![...Object.values(row.inputs), row.observed, row.sigma].every(Number.isFinite) || row.sigma <= 0) {
      throw new Error(`${split} row requires finite values and positive sigma`);
    }
    const signature = JSON.stringify([...variables.map((name) => row.inputs[name]), row.observed, row.sigma]);
    const previous = firstRow.get(signature);
    if (previous !== undefined) throw new Error(`${split} row ${index + 1} duplicates ${split} row ${previous}`);
    firstRow.set(signature, index + 1);
    return { values: row.inputs, observed: row.observed, sigma: row.sigma, id: `${role}-${index + 1}`, source: role, role };
  });
}

function outcome(model) {
  if (!model?.exploratory?.pass) return 'abstained';
  if (model.holdoutError !== undefined) return 'refuted';
  if (!model.holdout) throw new Error('eligible model has no challenge score');
  return model.holdout.pass ? 'survived' : 'refuted';
}

async function runCase(raw, fold) {
  fields(raw, ['id', 'target', 'governing', 'exploratory', 'challenge', 'synthetic'], 'case');
  const id = opaque(raw.id, 'case ID');
  if (typeof raw.synthetic !== 'boolean') throw new Error('synthetic must be boolean');
  const target = project(raw.target);
  const governing = raw.governing.map(project);
  const variables = governing.map(({ name }) => name);
  const study = parseStudy({
    gap: { id: `fg-${id}`, kind: 'unexplained-observation', summary: id },
    provenance: { synthetic: raw.synthetic, source: id },
    target,
    governing,
    observations: [
      ...observations(raw.exploratory, 'exploratory', variables),
      ...observations(raw.challenge, 'holdout', variables),
    ],
  }, id);
  const graph = fold && graphPrediction(study, fold);
  const { base } = piStructure(study.target, study.governing);
  const monomial = base && (Object.entries(base)
    .filter(([, power]) => power !== 0)
    .map(([name, power]) => `${name}^(${power})`).join('*') || '1');
  const result = await runProbeStudy({
    ...study,
    baselines: monomial ? [{ name: 'dimensional', formula: monomial, fitPrefactor: true }] : [],
  });
  const selected = result.candidates.find(({ id }) => id === result.selected);
  const dimensional = result.baselines[0];
  return {
    id,
    engine: outcome(selected),
    dimensional: result.nullModel.exploratory?.pass === false ? outcome(dimensional) : 'abstained',
    selected: selected?.label ?? null,
    prefactor: selected?.prefactor ?? null,
    ...(selected?.coefficients && { coefficients: selected.coefficients }),
    ...(selected?.holdoutError && { holdoutError: selected.holdoutError }),
    ...(dimensional?.holdoutError && { dimensionalHoldoutError: dimensional.holdoutError }),
    challenge: { engine: selected?.holdout ?? null, dimensional: dimensional?.holdout ?? null },
    stopReason: result.search.stopReason,
    ...(graph && {
      graph: result.nullModel.exploratory?.pass === false ? graph.outcome : 'abstained',
      graphEvidence: graph.evidence,
    }),
  };
}

const [packetPath, keyPath, graphPath] = process.argv.slice(2);
if (!packetPath || !keyPath) throw new Error('Usage: node tools/equation-recovery/run.mjs PACKET.json KEY.json [GRAPH.json]');
const packet = readFileSync(packetPath);
const cases = JSON.parse(packet);
if (!Array.isArray(cases) || cases.length === 0) throw new Error('expected a nonempty packet');
const graphBytes = graphPath && readFileSync(graphPath);
const graphInput = graphBytes && JSON.parse(graphBytes);
if (graphPath) fields(graphInput, ['folds'], 'graph input');
const methods = graphPath ? ['engine', 'dimensional', 'graph'] : ['engine', 'dimensional'];
const results = [];
const ids = new Set();
for (const item of cases) {
  if (ids.has(item.id)) throw new Error(`duplicate case ${item.id}`);
  ids.add(item.id);
  const fold = graphPath && graphFold(graphInput.folds[item.id], fields, opaque);
  results.push(await runCase(item, fold));
}

if (graphPath) fields(graphInput.folds, [...ids], 'graph folds');

const keyBytes = readFileSync(keyPath);
const key = JSON.parse(keyBytes);
fields(key, [...ids], 'scoring key');
for (const result of results) {
  const answer = key[result.id];
  fields(answer, ['family', 'positive'], 'answer');
  if (typeof answer.positive !== 'boolean') throw new Error('positive must be boolean');
  result.family = opaque(answer.family, 'family');
  result.positive = answer.positive;
  if (graphPath && result.graphEvidence.heldOut !== result.family) {
    throw new Error(`graph fold for ${result.id} held out the wrong family`);
  }
  for (const method of methods) {
    if (result[method] === 'survived') result[method] = answer.positive ? 'recovered' : 'false-positive';
  }
}
const metrics = {};
for (const method of methods) {
  const counts = {};
  for (const status of ['recovered', 'false-positive', 'refuted', 'abstained']) {
    const groups = new Map();
    const eligible = status === 'recovered' ? results.filter((r) => r.positive)
      : status === 'false-positive' ? results.filter((r) => !r.positive) : results;
    for (const result of eligible) {
      const tally = groups.get(result.family) ?? { total: 0, matches: 0 };
      tally.total++;
      if (result[method] === status) tally.matches++;
      groups.set(result.family, tally);
    }
    const tallies = [...groups.values()];
    counts[status] = {
      count: eligible.filter((r) => r[method] === status).length,
      cases: eligible.length,
      families: tallies.length,
      familyWeightedRate: tallies.length
        ? tallies.reduce((sum, tally) => sum + tally.matches / tally.total, 0) / tallies.length
        : null,
    };
  }
  metrics[method] = counts;
}
console.log(JSON.stringify({
  packetSha256: createHash('sha256').update(packet).digest('hex'),
  keySha256: createHash('sha256').update(keyBytes).digest('hex'),
  ...(graphBytes && { graphInputSha256: createHash('sha256').update(graphBytes).digest('hex') }),
  metrics,
  results,
}, null, 2));
