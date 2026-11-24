/**
 * Reproducible paired rectangular-barrier probe using the bare WKB catalog edge.
 * Pass a JSON filename or pipe JSON on stdin. Each case supplies nominal SI
 * values and may supply joint samples of that same operating point.
 */
import { readFileSync } from 'node:fs';
import { DomainViolationError } from '../dist/bridges/evaluation-errors.js';
import { evaluateRelation } from '../dist/composition/evaluate-relation.js';
import { HBAR_SI } from '../dist/core/constants.js';

const [filename, ...extra] = process.argv.slice(2);
if (extra.length > 0) throw new Error('Usage: node tools/bohr-width-review.mjs [input.json]');
const document = JSON.parse(readFileSync(filename ?? 0, 'utf8'));
if (!Array.isArray(document?.cases)) throw new Error('Input must contain a cases array.');

const bohr = evaluateRelation('CE-bohr-radius', {});
if (bohr.kind !== 'value' || !(bohr.value > 0 && Number.isFinite(bohr.value))) {
  throw new Error('Canonical CE-bohr-radius did not return a finite positive width.');
}
const bohrWidthM = bohr.value;
const keys = ['massKg', 'barrierHeightJ', 'actualWidthM', 'attemptFrequencyHz'];

function positiveNumber(value, label, nullable) {
  if (nullable && value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive SI number${nullable ? ' or null' : ''}.`);
  }
  return value;
}

function point(input, label, nullable, transmission) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object of SI inputs.`);
  }
  return Object.fromEntries(keys.map((key) => {
    if (transmission && key === 'attemptFrequencyHz') {
      if (input[key] != null) throw new Error(`${label} cannot supply attemptFrequencyHz in transmission mode.`);
      return [key, null];
    }
    return [key, positiveNumber(input[key], `${label}.${key}`, nullable)];
  }));
}

function evaluateWidth(scenario, widthM, exponentPerM, transmission) {
  const { massKg, barrierHeightJ, attemptFrequencyHz } = scenario;
  const exponent = widthM === null || exponentPerM === null ? null : exponentPerM * widthM;
  const finiteExponent = Number.isFinite(exponent) ? exponent : null;
  const available = { widthM, exponent: finiteExponent };
  const missing = Object.entries({
    widthM, massKg, barrierHeightJ, ...(transmission ? {} : { attemptFrequencyHz }),
  })
    .filter(([, value]) => value === null)
    .map(([name]) => name);
  if (missing.length > 0) return { ...available, status: 'unresolved', missing };

  try {
    const result = evaluateRelation('be-26-wkb', {
      'barrier-width': widthM,
      'tunneling-mass': massKg,
      'barrier-height': barrierHeightJ,
      // A unit prefactor extracts the dimensionless bare transmission factor.
      'attempt-frequency': transmission ? 1 : attemptFrequencyHz,
    });
    if (result.kind !== 'value' || !Number.isFinite(result.value) || finiteExponent === null) {
      return { ...available, status: 'unresolved', reason: 'No finite WKB prediction and exponent at this point.' };
    }
    return {
      ...available,
      status: 'admitted',
      ...(transmission
        ? { transmission: result.value, logTransmission: -finiteExponent }
        : { rateHz: result.value, logRate: Math.log(attemptFrequencyHz) - finiteExponent }),
    };
  } catch (error) {
    if (!(error instanceof DomainViolationError)) throw error;
    return { ...available, status: 'refused', conditions: error.violations.map(({ condition }) => condition) };
  }
}

function pairedReview(scenario, transmission) {
  const { massKg, barrierHeightJ, actualWidthM } = scenario;
  const exponentPerM = massKg === null || barrierHeightJ === null
    ? null
    : 2 / HBAR_SI * Math.sqrt(2 * massKg * barrierHeightJ);
  const actual = evaluateWidth(scenario, actualWidthM, exponentPerM, transmission);
  const bohr = evaluateWidth(scenario, bohrWidthM, exponentPerM, transmission);
  let comparison;
  if (actual.status === 'admitted' && bohr.status === 'admitted') {
    // The shared attempt frequency cancels. Subtract the widths before multiplying
    // to avoid falling through underflow or dividing two rounded rates.
    const logRatio = exponentPerM * (actualWidthM - bohrWidthM);
    const ratio = Math.exp(logRatio);
    const finiteRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : null;
    comparison = {
      status: 'compared',
      ...(transmission
        ? { logTransmissionRatio: logRatio, transmissionRatio: finiteRatio }
        : { logRateRatio: logRatio, rateRatio: finiteRatio }),
    };
  } else if (actual.status === 'unresolved' || bohr.status === 'unresolved') {
    comparison = { status: 'unresolved' };
  } else {
    comparison = { status: 'refused' };
  }
  return { inputs: scenario, actual, bohr, comparison };
}

function sampleReview(samples, label, transmission) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error(`${label} must be a nonempty array.`);
  const results = samples.map((sample, i) =>
    pairedReview(point(sample, `${label}[${i}]`, false, transmission), transmission));
  const logField = transmission ? 'logTransmissionRatio' : 'logRateRatio';
  const compared = results.flatMap(({ comparison }) => comparison.status === 'compared' ? [comparison[logField]] : []);
  let range = null;
  if (compared.length > 0) {
    range = compared.reduce(([low, high], x) => [Math.min(low, x), Math.max(high, x)], [compared[0], compared[0]]);
  }
  return {
    sampleCount: results.length,
    comparedCount: compared.length,
    comparedFraction: compared.length / results.length,
    fractionMeaning: 'Fraction of supplied joint samples only.',
    [`${logField}Range`]: range,
    samples: results,
  };
}

const ids = new Set();
const cases = document.cases.map((row, index) => {
  const label = `cases[${index}]`;
  const mode = row?.mode === undefined ? 'rate' : row.mode;
  if (mode !== 'rate' && mode !== 'transmission') {
    throw new Error(`${label}.mode must be rate or transmission.`);
  }
  const transmission = mode === 'transmission';
  const scenario = point(row, label, true, transmission);
  const { id } = row;
  if (typeof id !== 'string' || id.trim() === '' || ids.has(id)) {
    throw new Error(`${label}.id must be a unique, nonempty string.`);
  }
  ids.add(id);
  const independentRateHz = positiveNumber(row.independentRateHz, `${label}.independentRateHz`, true);
  if (transmission && independentRateHz !== null) {
    throw new Error(`${label} cannot supply independentRateHz in transmission mode.`);
  }
  return {
    id,
    mode,
    reportedSaddleHeightJ: positiveNumber(row.reportedSaddleHeightJ, `${label}.reportedSaddleHeightJ`, true),
    nominal: pairedReview(scenario, transmission),
    independentRate: independentRateHz === null
      ? { status: 'unresolved' }
      : { status: 'provided', rateHz: independentRateHz },
    ...(row.samples === undefined ? {} : { uncertainty: sampleReview(row.samples, `${label}.samples`, transmission) }),
  };
});

console.log(JSON.stringify({
  relation: 'be-26-wkb',
  bohrWidthM,
  logConvention: 'Natural logarithm of rates in s^-1 or dimensionless transmissions. Ratio is prediction at Bohr width divided by prediction at actual width.',
  cases,
}, null, 2));
