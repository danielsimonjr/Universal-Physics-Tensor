/**
 * A canonical equality's dimensionless factor is the scalar AST's factor
 * times the sourced table. The table owns the factor when the AST is
 * intentionally constant-free. An entry that states 4π, 2, or 8π/3 in both
 * places is counted twice, and an entry that states it in neither place
 * drops it.
 *
 * The latex reader is a monomial coefficient. An inequality, a
 * proportionality, a sum, and a transcendental are not that coefficient.
 * `ln 2` is a constant and is read.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { CANONICAL_CONSTANTS, CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { canonicalPrefactor } from '../../src/composition/canonical-prefactors.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { C_SI, E_SI, G_SI, HBAR_SI, M_E_SI } from '../../src/core/constants.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { CONSTANTS, piMultipleValue } from '../../src/dimensional/symbolic-constants.js';

const REQUIRED = [
  'CE-point-charge-field',
  'CE-classical-electron-radius',
  'CE-bohr-magneton',
  'CE-coulomb',
  'CE-rydberg-energy',
  'CE-bohr-radius',
  'CE-friedmann',
  'CE-einstein-field-eq',
  'CE-kinetic-energy',
  'CE-half-life',
  'CE-landauer',
  'CE-magnetic-field-wire',
] as const;

function leaf(name: string): number | undefined {
  const constant = CONSTANTS[name];
  if (constant !== undefined && Object.values(constant.dim).every((entry) => entry === 0)) return constant.value;
  const pi = piMultipleValue(name);
  if (pi !== undefined) return pi;
  const n = Number(name);
  return Number.isFinite(n) ? n : undefined;
}

/** Dimensionless coefficient of a product, quotient, or integer power. A sum is not one. */
function astCoefficient(node: ExprNode): number | undefined {
  if (node.kind === 'symbol') {
    const value = leaf(node.name);
    return value !== undefined ? value : 1;
  }
  if (node.kind === 'abs') return astCoefficient(node.arg);
  if (node.kind !== 'op') return undefined;
  if (node.op === '*') {
    let acc = 1;
    for (const arg of node.args) {
      const part = astCoefficient(arg);
      if (part === undefined) return undefined;
      acc *= part;
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const numerator = astCoefficient(node.args[0]!);
    const denominator = astCoefficient(node.args[1]!);
    if (numerator === undefined || denominator === undefined || denominator === 0) return undefined;
    return numerator / denominator;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const exp = node.args[1];
    if (base === undefined || exp === undefined || exp.kind !== 'symbol') return undefined;
    const e = Number(exp.name);
    if (!Number.isFinite(e)) return undefined;
    if (base.kind === 'symbol') {
      const value = leaf(base.name);
      return value !== undefined ? Math.pow(value, e) : 1;
    }
    const inner = astCoefficient(base);
    return inner === undefined ? undefined : Math.pow(inner, e);
  }
  return undefined;
}

type Tok =
  | { kind: 'num'; value: number }
  | { kind: 'pi' }
  | { kind: 'ln2' }
  | { kind: 'sym' }
  | { kind: 'sqrt' }
  | { kind: 'frac' }
  | { kind: 'op'; op: '(' | ')' | '{' | '}' | '/' | '^' | '+' | '-' | '|' | 'langle' | 'rangle' };

function tokenize(input: string): Tok[] | undefined {
  const out: Tok[] = [];
  let i = 0;
  const skipSpace = () => {
    while (i < input.length && /[\s]/.test(input[i]!)) i += 1;
  };
  while (i < input.length) {
    skipSpace();
    if (i >= input.length) break;
    const ch = input[i]!;
    if (ch === '\\') {
      const command = /^\\([A-Za-z]+)/.exec(input.slice(i));
      if (command === null) return undefined;
      const name = command[1]!;
      i += command[0].length;
      if (name === 'frac' || name === 'tfrac' || name === 'dfrac') out.push({ kind: 'frac' });
      else if (name === 'sqrt') out.push({ kind: 'sqrt' });
      else if (name === 'pi') out.push({ kind: 'pi' });
      else if (name === 'ln') out.push({ kind: 'ln2' });
      else if (name === 'langle') out.push({ kind: 'op', op: 'langle' });
      else if (name === 'rangle') out.push({ kind: 'op', op: 'rangle' });
      else if (name === 'cdot' || name === 'times') continue;
      else if (['quad', 'qquad'].includes(name)) continue;
      else if (
        ['propto', 'exp', 'cos', 'sin', 'tan', 'text', 'left', 'right', 'operatorname', 'mathrm'].includes(name)
      ) {
        return undefined;
      } else {
        while (input[i] === '_') {
          i += 1;
          if (input[i] === '{') {
            let depth = 0;
            do {
              if (input[i] === '{') depth += 1;
              if (input[i] === '}') depth -= 1;
              i += 1;
            } while (i < input.length && depth > 0);
          } else if (input[i] === '\\') {
            const sub = /^\\([A-Za-z]+)/.exec(input.slice(i));
            if (sub === null) return undefined;
            i += sub[0].length;
          } else {
            while (i < input.length && /[A-Za-z0-9]/.test(input[i]!)) i += 1;
          }
        }
        out.push({ kind: 'sym' });
      }
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const num = /^[0-9]*\.?[0-9]+/.exec(input.slice(i));
      if (num === null) return undefined;
      out.push({ kind: 'num', value: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      i += 1;
      while (i < input.length && /[A-Za-z0-9]/.test(input[i]!)) i += 1;
      while (input[i] === '_') {
        i += 1;
        if (input[i] === '{') {
          let depth = 0;
          do {
            if (input[i] === '{') depth += 1;
            if (input[i] === '}') depth -= 1;
            i += 1;
          } while (i < input.length && depth > 0);
        } else if (input[i] === '\\') {
          const sub = /^\\([A-Za-z]+)/.exec(input.slice(i));
          if (sub === null) return undefined;
          i += sub[0].length;
        } else {
          while (i < input.length && /[A-Za-z0-9]/.test(input[i]!)) i += 1;
        }
      }
      out.push({ kind: 'sym' });
      continue;
    }
    if ('(){}/^+-|'.includes(ch)) {
      out.push({ kind: 'op', op: ch as '(' | ')' | '{' | '}' | '/' | '^' | '+' | '-' | '|' });
      i += 1;
      continue;
    }
    return undefined;
  }
  return out;
}

class Reader {
  private index = 0;
  constructor(private readonly tokens: readonly Tok[]) {}
  private peek(): Tok | undefined {
    return this.tokens[this.index];
  }
  private take(): Tok | undefined {
    return this.tokens[this.index++];
  }
  coefficient(): number | undefined {
    const value = this.expr();
    if (value === undefined || this.peek() !== undefined) return undefined;
    return value;
  }
  private expr(): number | undefined {
    if (this.peek()?.kind === 'op' && (this.peek() as { op: string }).op === '+') this.take();
    let sign = 1;
    if (this.peek()?.kind === 'op' && (this.peek() as { op: string }).op === '-') {
      this.take();
      sign = -1;
    }
    let value = this.term();
    if (value === undefined) return undefined;
    value *= sign;
    const next = this.peek();
    if (next?.kind === 'op' && (next.op === '+' || next.op === '-')) return undefined;
    return value;
  }
  private term(): number | undefined {
    let value = this.power();
    if (value === undefined) return undefined;
    for (;;) {
      const next = this.peek();
      if (next?.kind === 'op' && next.op === '/') {
        this.take();
        const denom = this.power();
        if (denom === undefined || denom === 0) return undefined;
        value /= denom;
        continue;
      }
      if (next !== undefined && this.startsFactor(next)) {
        const more = this.power();
        if (more === undefined) return undefined;
        value *= more;
        continue;
      }
      return value;
    }
  }
  private startsFactor(token: Tok): boolean {
    if (token.kind === 'num' || token.kind === 'pi' || token.kind === 'ln2' || token.kind === 'sym') return true;
    if (token.kind === 'sqrt' || token.kind === 'frac') return true;
    return token.kind === 'op' && (token.op === '(' || token.op === '|' || token.op === '-');
  }
  private power(): number | undefined {
    const base = this.factor();
    if (base === undefined) return undefined;
    if (!(this.peek()?.kind === 'op' && (this.peek() as { op: string }).op === '^')) return base;
    this.take();
    const exp = this.exponent();
    if (exp === undefined) return undefined;
    return Math.pow(base, exp);
  }
  private exponent(): number | undefined {
    if (this.peek()?.kind === 'op' && (this.peek() as { op: string }).op === '{') {
      this.take();
      const value = this.expr();
      if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '}') return undefined;
      this.take();
      return value;
    }
    const token = this.take();
    if (token?.kind === 'num') return token.value;
    return undefined;
  }
  private factor(): number | undefined {
    const token = this.peek();
    if (token === undefined) return undefined;
    if (token.kind === 'op' && token.op === '-') {
      this.take();
      const inner = this.factor();
      return inner === undefined ? undefined : -inner;
    }
    if (token.kind === 'num') {
      this.take();
      return token.value;
    }
    if (token.kind === 'pi') {
      this.take();
      return Math.PI;
    }
    if (token.kind === 'ln2') {
      this.take();
      if (this.peek()?.kind === 'op' && (this.peek() as { op: string }).op === '(') {
        this.take();
        const inner = this.expr();
        if (inner === undefined || Math.abs(inner - 2) > 1e-12) return undefined;
        if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== ')') return undefined;
        this.take();
        return Math.LN2;
      }
      if (this.peek()?.kind === 'num' && Math.abs((this.peek() as { value: number }).value - 2) < 1e-12) {
        this.take();
        return Math.LN2;
      }
      return undefined;
    }
    if (token.kind === 'sym') {
      this.take();
      return 1;
    }
    if (token.kind === 'sqrt') {
      this.take();
      if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '{') return undefined;
      this.take();
      const inner = this.expr();
      if (inner === undefined) return undefined;
      if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '}') return undefined;
      this.take();
      return Math.sqrt(inner);
    }
    if (token.kind === 'frac') {
      this.take();
      const arm = (): number | undefined => {
        if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '{') return undefined;
        this.take();
        const value = this.expr();
        if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '}') return undefined;
        this.take();
        return value;
      };
      const numerator = arm();
      const denominator = arm();
      if (numerator === undefined || denominator === undefined || denominator === 0) return undefined;
      return numerator / denominator;
    }
    if (token.kind === 'op' && token.op === '(') {
      this.take();
      const inner = this.expr();
      if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== ')') return undefined;
      this.take();
      return inner;
    }
    if (token.kind === 'op' && token.op === '|') {
      this.take();
      const inner = this.expr();
      if (inner === undefined) return undefined;
      if (this.peek()?.kind !== 'op' || (this.peek() as { op: string }).op !== '|') return undefined;
      this.take();
      return Math.abs(inner);
    }
    if (token.kind === 'op' && token.op === 'langle') {
      this.take();
      while (this.peek() !== undefined && !(this.peek()!.kind === 'op' && (this.peek() as { op: string }).op === 'rangle')) {
        const skipped = this.take();
        if (skipped?.kind === 'op' && (skipped.op === '+' || skipped.op === '-')) return undefined;
      }
      if (this.peek()?.kind !== 'op') return undefined;
      this.take();
      return 1;
    }
    return undefined;
  }
}

function latexCoefficient(formula: string): number | undefined {
  if (/\\propto|\\geq|\\ge|\\leq|\\le|\\exp|\\cos|\\sin|\\text|\\left/.test(formula)) return undefined;
  const eq = formula.indexOf('=');
  if (eq < 0) return undefined;
  const tokens = tokenize(formula.slice(eq + 1));
  if (tokens === undefined) return undefined;
  return new Reader(tokens).coefficient();
}

function relative(actual: number, expected: number): number {
  const scale = Math.max(Math.abs(actual), Math.abs(expected));
  return scale === 0 ? Math.abs(actual - expected) : Math.abs(actual - expected) / scale;
}

function symbolNames(node: ExprNode, out: Set<string>): void {
  if (node.kind === 'symbol') out.add(node.name);
  else if (node.kind === 'op') for (const arg of node.args) symbolNames(arg, out);
  else if (node.kind === 'abs' || node.kind === 'transcendental') symbolNames(node.arg, out);
}

describe('scalar AST prefactors match the stated formula', () => {
  it('matches every monomial equality, including the Coulomb field, the classical radius, and the Bohr magneton', () => {
    const checked = new Set<string>();
    const failures: string[] = [];
    for (const eq of CANONICAL_EQUATIONS) {
      if (eq.scalarAst === undefined) continue;
      const latex = latexCoefficient(eq.formula_latex);
      const ast = astCoefficient(eq.scalarAst);
      if (latex === undefined || ast === undefined) continue;
      const table = canonicalPrefactor(eq.id) ?? 1;
      const got = ast * table;
      checked.add(eq.id);
      if (relative(got, latex) > 1e-9) {
        failures.push(`${eq.id}: latex ${latex}, ast ${ast}, table ${table}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
    expect(checked.size).toBeGreaterThan(20);
    for (const id of REQUIRED) expect(checked.has(id), id).toBe(true);
  });

  it('evaluates the Coulomb field, the classical radius, and the Bohr magneton with the stated factor', () => {
    const field = evaluateRelation('CE-point-charge-field', { charge: -E_SI, r: 1 });
    const eps0 = CONSTANTS.epsilon_0.value;
    const expectedField = -E_SI / (4 * Math.PI * eps0);
    expect(field.kind).toBe('value');
    if (field.kind === 'value') expect(relative(field.value, expectedField)).toBeLessThan(1e-9);

    const radius = evaluateRelation('CE-classical-electron-radius', {});
    const expectedRadius = (E_SI * E_SI) / (4 * Math.PI * eps0 * M_E_SI * C_SI * C_SI);
    expect(radius.kind).toBe('value');
    if (radius.kind === 'value') expect(relative(radius.value, expectedRadius)).toBeLessThan(1e-9);

    const magneton = evaluateRelation('CE-bohr-magneton', {});
    const expectedMagneton = (E_SI * HBAR_SI) / (2 * M_E_SI);
    expect(magneton.kind).toBe('value');
    if (magneton.kind === 'value') expect(relative(magneton.value, expectedMagneton)).toBeLessThan(1e-9);
  });

  it('applies a fully-quantitative AST coefficient on the Buckingham path', () => {
    const missed: string[] = [];
    for (const eq of CANONICAL_EQUATIONS) {
      if (eq.epistemicStatus !== 'fully-quantitative' || eq.scalarAst === undefined) continue;
      if (astCoefficient(eq.scalarAst) === undefined) continue;
      const names = new Set<string>();
      symbolNames(eq.scalarAst, names);
      const bindings: Record<string, number> = {};
      for (const name of names) {
        if (leaf(name) !== undefined) continue;
        const baked = CANONICAL_CONSTANTS[name];
        bindings[name] = baked === undefined ? 1 : baked.value;
      }
      let fromAst: number;
      try {
        fromAst = evalExpr(eq.scalarAst, bindings);
      } catch {
        missed.push(`${eq.id} ast`);
        continue;
      }
      const edge = CANONICAL_GRAPH.find((candidate) => candidate.id === eq.id);
      if (edge === undefined) continue;
      let fromRelation: number;
      try {
        const result = evaluateRelation(eq.id, bindings);
        if (result.kind !== 'value') {
          missed.push(`${eq.id} unset`);
          continue;
        }
        fromRelation = result.value;
      } catch {
        missed.push(`${eq.id} relation`);
        continue;
      }
      if (relative(fromRelation, fromAst) > 1e-9) missed.push(`${eq.id}: relation ${fromRelation} ast ${fromAst}`);
    }
    expect(missed.filter((line) => REQUIRED.some((id) => line.startsWith(id)))).toEqual([]);
    expect(missed.filter((line) => line.includes('relation'))).toEqual([]);
    const field = evaluateRelation('CE-friedmann', { rho: 1 });
    if (field.kind === 'value') {
      expect(relative(field.value, ((8 * Math.PI) / 3) * G_SI)).toBeLessThan(1e-9);
    } else {
      throw new Error('friedmann unset');
    }
  });
});
