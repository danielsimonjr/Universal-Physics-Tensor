#!/usr/bin/env node
/**
 * Merge per-case modules into src/cases/methods.ts (Part B B8).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = join(root, 'src/cases');

const CASES = [
  { file: 'skin-depth.ts', constName: 'SKIN_DEPTH_CASE', runName: 'runCaseSkinDepth' },
  { file: 'kepler-rv.ts', constName: 'KEPLER_RV_CASE', runName: 'runCaseKeplerRv' },
  { file: 'damped-resonator.ts', constName: 'DAMPED_RESONATOR_CASE', runName: 'runCaseDampedResonator' },
  { file: 'resistor-noise.ts', constName: 'RESISTOR_NOISE_CASE', runName: 'runCaseResistorNoise' },
  { file: 'lumped-cooling.ts', constName: 'LUMPED_COOLING_CASE', runName: 'runCaseLumpedCooling' },
  {
    file: 'brownian-sphere.ts',
    constName: 'BROWNIAN_SPHERE_CASE',
    runName: 'runCaseBrownianSphere',
    regimeName: 'brownianSphereRegimeAt',
  },
];

function stripImportsAndModule(text) {
  return text.replace(/^\/\*\*[\s\S]*?@module[\s\S]*?\*\/\n/m, '').replace(/^import[\s\S]*?\n\n/m, '');
}

function extractCaseParts(text, constName) {
  const start = text.indexOf(`export const ${constName}: AppliedCase = {`);
  if (start < 0) throw new Error(`no ${constName}`);
  const runStart = text.indexOf('run(i)', start);
  if (runStart < 0) throw new Error(`no run in ${constName}`);
  const runBodyStart = text.indexOf('{', runStart) + 1;
  let depth = 1;
  let i = runBodyStart;
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
  }
  const runBody = text.slice(runBodyStart, i - 1);
  let regimeFn = '';
  const regimeIdx = text.indexOf('regimeAt(', start);
  if (regimeIdx >= 0 && regimeIdx < runStart) {
    const fnStart = text.lastIndexOf('\n  ', regimeIdx);
    regimeFn = text.slice(fnStart, runStart).trim();
  }
  const before = text.slice(0, start).trimEnd();
  return { before: stripImportsAndModule(before), runBody, regimeFn };
}

const header = `/**
 * Numeric methods and case runners for applied cases (Part B catalog).
 *
 * @module cases/methods
 */
import { findRoot } from '@danielsimonjr/mathts-functions';
import { C_SI, EPS0_SI, G_SI, H_SI, K_B_SI, MU0_SI, SIGMA_SB_SI } from '../core/constants.js';
import { convertValue } from '../dimensional/units.js';
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { integrateRK4 } from '../numerical/null-ray-integrator.js';
import { adaptiveQuadrature } from './quadrature.js';
import { appliedCaseCatalog, appliedCaseRecord, assembleAppliedCase } from './catalog.js';
import { check, requirePositive, signedRelativeDifference, type AppliedCase, type CaseResult } from './types.js';

export type { LumpedRadiating } from './types.js';

`;

const parts = [];

for (const spec of CASES) {
  const text = readFileSync(join(casesDir, spec.file), 'utf8');
  const { before, runBody, regimeFn } = extractCaseParts(text, spec.constName);
  parts.push(`// --- ${spec.file} ---\n${before}`);
  if (regimeFn && spec.regimeName) {
    parts.push(regimeFn.replace(/^  regimeAt/m, `export function ${spec.regimeName}`));
  }
  parts.push(`/** @internal */\nexport function ${spec.runName}(i: Readonly<Record<string, number>>): CaseResult {${runBody}\n}\n`);
}

const footer = `
const RUN_BY_ID: Readonly<Record<string, (i: Readonly<Record<string, number>>) => CaseResult>> = {
  'case-skin-depth': runCaseSkinDepth,
  'case-kepler-rv': runCaseKeplerRv,
  'case-damped-resonator': runCaseDampedResonator,
  'case-resistor-noise': runCaseResistorNoise,
  'case-lumped-cooling': runCaseLumpedCooling,
  'case-brownian-sphere': runCaseBrownianSphere,
};

function buildAppliedCase(id: string): AppliedCase {
  const record = appliedCaseRecord(id);
  const run = RUN_BY_ID[id]!;
  const regimeAt = id === 'case-brownian-sphere' ? brownianSphereRegimeAt : undefined;
  return assembleAppliedCase(record, { run, regimeAt });
}

/** Case id → case assembled from the catalog and a runner. @internal */
export const APPLIED_CASE_RUNNERS: ReadonlyMap<string, AppliedCase> = new Map(
  appliedCaseCatalog().cases.map((row) => [row.id, buildAppliedCase(row.id)]),
);

/** Names exported numeric methods for catalog validation. @internal */
export const CASE_METHOD_NAMES: ReadonlySet<string> = new Set([
  'maxwellDepthFactor',
  'windowedLinewidthHz',
  'lumpedRadiatingTemperature',
  'sphereEigenvalues',
  'sphereSeries',
  'ballisticDeficit',
  'hydrodynamicMsdRatio',
  'faxenParallel',
  'brennerPerpendicular',
  'brownianSphereRegimeAt',
  'runCaseResistorNoise',
  'runCaseSkinDepth',
  'runCaseKeplerRv',
  'runCaseDampedResonator',
  'runCaseLumpedCooling',
  'runCaseBrownianSphere',
]);

/** Method registry for the catalog engine. @internal */
export const CASE_METHODS: Record<string, (...args: never[]) => unknown> = {
  maxwellDepthFactor,
  windowedLinewidthHz,
  lumpedRadiatingTemperature,
  sphereEigenvalues,
  sphereSeries,
  ballisticDeficit,
  hydrodynamicMsdRatio,
  faxenParallel,
  brennerPerpendicular,
  brownianSphereRegimeAt,
  runCaseResistorNoise,
  runCaseSkinDepth,
  runCaseKeplerRv,
  runCaseDampedResonator,
  runCaseLumpedCooling,
  runCaseBrownianSphere,
};
`;

writeFileSync(join(casesDir, 'methods.ts'), header + parts.join('\n') + footer);
console.log('wrote methods.ts');
