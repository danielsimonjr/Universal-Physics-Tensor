/**
 * The CLI prints; the library knows. A command reads library code through
 * `ctx.api`, classifies an error by its class, parses a bridge id with the one
 * parser, and holds no physics or numerics of its own.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  correlationIsPositiveSemidefinite,
  propagateEvaluatorUncertainty,
} from '../../src/numerical/evaluator-uncertainty.js';
import { constantAgreement, ConstantDisagreementError } from '../../src/dimensional/symbolic-constants.js';
import { BindingNumberError, TemperatureBindingError, readNamedBinding } from '../../src/numerical/binding-value.js';
import { UnitError } from '../../src/dimensional/units.js';
import { catalogIdNumber, parseBridgeId } from '../../src/bridges/catalog-load.js';

const SRC = join(import.meta.dirname, '../../src');
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const code = (rel: string): string => strip(readFileSync(join(SRC, rel), 'utf8'));

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) out.push(...tsFiles(path));
    else if (name.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

describe('commands reach the library only through ctx.api', () => {
  it('no command module imports a library value from outside src/cli', () => {
    const hits: string[] = [];
    for (const file of tsFiles(join(SRC, 'cli/commands'))) {
      const text = readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        if (/^import (?!type\b).* from '\.\.\/\.\.\//.test(line)) hits.push(`${relative(SRC, file)}: ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('one bridge-id parser', () => {
  it('no regex re-parses a bridge id outside catalog-load.ts', () => {
    const hits: string[] = [];
    for (const file of tsFiles(SRC)) {
      const rel = relative(SRC, file);
      if (rel === 'bridges/catalog-load.ts') continue;
      if (/\(\?:be-\)\?\(\\d\+\)|\^be-\(\\d\+\)|startsWith\('BE-'\)/.test(code(rel))) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
  it('catalogIdNumber is the non-throwing form of parseBridgeId', () => {
    for (const raw of ['be-16', 'BE-16', '16', ' be-16 ']) {
      expect(catalogIdNumber(raw)).toBe(16);
      expect(parseBridgeId(raw)).toBe(16);
    }
    for (const raw of ['ab-spring-lc', 'CE-landauer', 'be-', 'x16', '']) {
      expect(catalogIdNumber(raw)).toBeUndefined();
      expect(() => parseBridgeId(raw)).toThrow(TypeError);
    }
  });
});

describe('errors are classified by class, not by message text', () => {
  it('no CLI module tests an error message with a regex', () => {
    const hits: string[] = [];
    for (const file of tsFiles(join(SRC, 'cli'))) {
      const rel = relative(SRC, file);
      if (/\.test\(e\.message\)|\.test\(error\.message\)|e\.message\.includes\(/.test(code(rel))) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
  it('a wrong dimension on a temperature, and a non-number, are their own classes under UnitError', () => {
    // a length on a temperature name
    expect(() => readNamedBinding('T', '1m', {})).toThrow(TemperatureBindingError);
    // an energy that became a temperature on a dimensionless slot
    expect(() => readNamedBinding('T', '10eV', { declaredUnit: '' })).toThrow(TemperatureBindingError);
    expect(() => readNamedBinding('x', 'abc', {})).toThrow(BindingNumberError);
    expect(() => readNamedBinding('x', '', {})).toThrow(BindingNumberError);
    expect(() => readNamedBinding('x', '1e999', {})).toThrow(BindingNumberError);
    // a plain dimension mismatch is neither
    let plain: unknown;
    try {
      readNamedBinding('x', '1m', { declaredUnit: 's' });
    } catch (e) {
      plain = e;
    }
    expect(plain).toBeInstanceOf(UnitError);
    expect(plain).not.toBeInstanceOf(TemperatureBindingError);
    expect(plain).not.toBeInstanceOf(BindingNumberError);
    expect(new TemperatureBindingError('t')).toBeInstanceOf(UnitError);
    expect(new BindingNumberError('n')).toBeInstanceOf(UnitError);
  });
});

describe('physics and numerics live in the library', () => {
  it('the GUM propagation is a numerical module the CLI calls', () => {
    const f = (x: Record<string, number>): Record<string, unknown> => ({ value: x.a! * x.b! });
    const r = propagateEvaluatorUncertainty(f, { a: 2, b: 3 }, { a: 0.1 }, new Map());
    expect(r.value!.u).toBeCloseTo(0.3, 9);
    const text = code('cli/commands/evaluate.ts');
    expect(text).not.toMatch(/function propagateEvaluatorUncertainty|function isPositiveSemidefinite|Math\.sqrt\(Math\.max\(sum/);
    expect(text).toContain('api.propagateEvaluatorUncertainty');
    expect(text).toContain('api.correlationIsPositiveSemidefinite');
  });
  it('a correlation matrix is judged by its eigenvalues: singular admitted, indefinite refused', () => {
    expect(correlationIsPositiveSemidefinite(['a', 'b'], new Map([['a,b', 1]]))).toBe(true);
    expect(correlationIsPositiveSemidefinite(['a', 'b'], new Map([['b,a', -1]]))).toBe(true);
    expect(correlationIsPositiveSemidefinite(['a', 'b', 'c'], new Map([['a,b', 0.9], ['a,c', 0.9], ['b,c', -0.9]]))).toBe(false);
    expect(correlationIsPositiveSemidefinite([], new Map())).toBe(true);
  });
  it('a stated constant is checked against the registry by the library', () => {
    expect(constantAgreement('b', 2.9e-3)).toBe('b');
    expect(constantAgreement('wien-constant', 2.897771955e-3)).toBe('b');
    expect(constantAgreement('not-a-constant', 1)).toBeNull();
    expect(() => constantAgreement('b', 3.5e-3)).toThrow(ConstantDisagreementError);
    expect(code('cli/commands/explain.ts')).not.toMatch(/CONSTANT_AGREEMENT|constantRecord\(/);
  });
  it('the primary output is the value; no key-suffix heuristic picks it', () => {
    expect(code('composition/evaluate-relation.ts')).not.toMatch(/suffixDimensions|_per_|parseUnit/);
  });
});
