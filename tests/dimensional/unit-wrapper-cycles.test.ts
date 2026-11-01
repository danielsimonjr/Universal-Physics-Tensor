/**
 * Part A step A11b: cycle-counting units stay a count; convertValue does not apply 2π.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unit } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import type { EvaluatorParameter } from '../../src/bridges/evaluators.js';
import { convertValue } from '../../src/dimensional/units.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unitsSource = readFileSync(resolve(root, 'src/dimensional/units.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('wrapper cycles count (A11b)', () => {
  it('convertValue uses exact scales, not MathTS Unit.to', () => {
    expect(unitsSource).toMatch(/divideScales\(siMagnitude/);
    expect(unitsSource).not.toMatch(/\bUnit\.parse\b.*\.to\(/);
  });

  it('MathTS Hz.to(rad/s) applies 2π', () => {
    const mt = Number((unit(1, 'Hz') as { to(target: string): { toNumeric(): unknown } }).to('rad/s').toNumeric());
    expect(mt).toBeCloseTo(2 * Math.PI, 12);
  });

  it('convertValue("1 Hz", "rad/s") stays 1 with cycles: 1', () => {
    const out = convertValue('1 Hz', 'rad/s');
    expect(out.value).toBe(1);
    expect(out.cycles).toBe(1);
    expect(out.value).not.toBeCloseTo(2 * Math.PI, 6);
  });

  it('the angular evaluator path still multiplies cycle counts by 2π', () => {
    const OMEGA: EvaluatorParameter[] = [
      { key: 'omega_rad_s', quantity: 'angular frequency', symbol: 'ω', unit: 'rad/s', meaning: 'angular frequency', angular: true },
    ];
    const resolved = resolveEvaluatorInputs(OMEGA, ['omega_rad_s=1Hz']);
    expect(resolved.inputs.omega_rad_s).toBeCloseTo(2 * Math.PI, 12);
    expect(resolved.resolved[0]!.note).toMatch(/cycles: × 2π/);
  });
});
