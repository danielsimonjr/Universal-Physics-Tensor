/** Project one curator-defined premise graph and score a frozen forward route. */
import { hashCanonical } from '../../dist/composition/canonical-json.js';
import { propagate } from '../../dist/composition/identifiability.js';
import { forwardEvaluate } from '../../dist/composition/retrodiction.js';
import { validityDomain } from '../../dist/composition/edge.js';
import { scoreStudyPredictions } from '../../dist/composition/probe/study.js';
import { equals } from '../../dist/dimensional/algebra.js';
import { parseUnit } from '../../dist/dimensional/units.js';
import { builtinFormulaDimensionChecker } from '../../dist/numerical/formula-dimension.js';
import { parseFormula } from '../../dist/numerical/formula-mathts.js';

export function graphFold(raw, fields, opaque) {
  fields(raw, ['heldOut', 'quantities', 'edges', 'graphSha256'], 'graph fold');
  const heldOut = opaque(raw.heldOut, 'held-out family');
  if (typeof raw.graphSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.graphSha256)) {
    throw new Error('graph fold needs its frozen projection SHA-256');
  }
  if (!Array.isArray(raw.edges)) throw new Error('graph edges must be an array');
  if (raw.quantities === null || typeof raw.quantities !== 'object' || Array.isArray(raw.quantities)) {
    throw new Error('graph quantities must map opaque names to units');
  }
  const ids = new Set();
  const retained = [];
  for (const edge of raw.edges) {
    fields(edge, ['id', 'family', 'sources', 'target', 'formula', 'domain'], 'graph edge');
    opaque(edge.id, 'graph edge ID');
    opaque(edge.family, 'graph edge family');
    if (ids.has(edge.id)) throw new Error(`duplicate graph edge ${edge.id}`);
    ids.add(edge.id);
    if (edge.family !== heldOut) retained.push(edge);
  }
  return { heldOut, quantities: raw.quantities, retained, expectedHash: raw.graphSha256 };
}

function compile(raw, quantities, checker) {
  const { id, formula, domain } = raw;
  const target = quantities.get(raw.target);
  const sources = raw.sources.map((name) => quantities.get(name));
  if (!target || sources.includes(undefined)) throw new Error(`undeclared graph quantity on ${id}`);
  const dims = Object.fromEntries(sources.map(({ name, dim }) => [name, dim]));
  const parsed = parseFormula(formula);
  if (parsed.variables.some((name) => !Object.hasOwn(dims, name))) {
    throw new Error(`undeclared formula input on ${id}`);
  }
  const check = checker.check(formula, dims);
  if (!check.ok || !check.dim || !equals(check.dim, target.dim)) {
    throw new Error(`invalid formula dimension on ${id}`);
  }
  return {
    id, beId: null, kind: 'law', label: id, sources, target, confidence: 'established',
    domain: validityDomain(domain, raw.sources, raw.sources),
    evaluate: (inputs) => parsed.evaluate(inputs), citation: id,
  };
}

export function graphPrediction(study, { heldOut, quantities: declared, retained, expectedHash }) {
  const bound = [...study.governing, study.target];
  const activeNames = new Set(bound.map(({ name }) => name));
  for (const { sources, target } of retained) {
    for (const source of sources) activeNames.add(source);
    activeNames.add(target);
  }
  const quantities = new Map();
  const projection = {};
  for (const name of activeNames) {
    if (!/^[a-z][0-9]+$/.test(name) || !Object.hasOwn(declared, name)) {
      throw new Error(`undeclared or non-opaque graph quantity ${name}`);
    }
    const unit = declared[name];
    const { dim, affine } = parseUnit(unit);
    if (affine !== undefined) throw new Error(`affine graph unit for ${name}`);
    quantities.set(name, { name, symbol: name, dim, attributes: {} });
    projection[name] = unit;
  }
  for (const { name, dim } of bound) {
    if (!equals(quantities.get(name).dim, dim)) {
      throw new Error(`graph dimension does not match study quantity ${name}`);
    }
  }

  const graphSha256 = hashCanonical({ quantities: projection, edges: retained });
  if (graphSha256 !== expectedHash) throw new Error('projected graph SHA-256 differs from the frozen fold');
  const checker = builtinFormulaDimensionChecker();
  const edges = retained.map((edge) => compile(edge, quantities, checker));
  const producers = new Map();
  propagate(edges, study.governing.map(({ name }) => name), [], (edge, known) => {
    if (!edge.sources.every(({ name }) => known.has(name))) return false;
    producers.set(edge.target.name, edge);
    return true;
  });
  const needed = new Set();
  function trace(name) {
    const edge = producers.get(name);
    if (!edge || needed.has(edge)) return;
    needed.add(edge);
    for (const source of edge.sources) trace(source.name);
  }
  trace(study.target.name);
  const route = edges.filter((edge) => needed.has(edge));
  const evidence = { heldOut, graphSha256, route: route.map(({ id }) => id), exploratory: null, challenge: null };
  if (!route.length) return { outcome: 'abstained', evidence };

  const predict = (inputs) => forwardEvaluate(route, inputs, []).get(study.target.name);
  const exploratory = study.observations.filter(({ role }) => role === 'exploratory');
  evidence.exploratory = scoreStudyPredictions(exploratory, predict, study.alpha);
  if (!evidence.exploratory?.pass) return { outcome: 'abstained', evidence };

  const challenge = study.observations.filter(({ role }) => role === 'holdout');
  evidence.challenge = scoreStudyPredictions(challenge, predict, study.alpha);
  return { outcome: evidence.challenge?.pass ? 'survived' : 'refuted', evidence };
}
