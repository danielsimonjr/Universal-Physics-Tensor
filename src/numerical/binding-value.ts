/**
 * A binding value: a bare number, a number with a unit, or an expression of
 * registered constants and unit literals (`pi/2`, `0.6*c`, `2*1km`).
 *
 * The built-in formula parser evaluates the expression. MathTS is not used:
 * a bare `e` stays unbound (charge is `e_charge`), and a published install
 * has no MathTS. A bare number, or an expression whose result is
 * dimensionless and contains no unit literal, is already in the caller's
 * unit. Anything else is an SI quantity: the caller converts it into the
 * declared unit when the dimensions agree.
 *
 * A unit literal is recognized only where it is glued to a number (`1km`,
 * `1h`, `1G`). A bare name is a constant (`h`, `G`, `c`), never that unit.
 *
 * @module numerical/binding-value
 * @internal
 */

import { M_SUN_SI } from '../core/constants.js';
import { FORMULA_NAMED } from '../composition/formula-names.js';
import { naturalConstantOverrides, type UnitMode } from '../composition/natural-units.js';
import { CONSTANTS as SYMBOLIC } from '../composition/symbolic-constants.js';
import { divide, equals, format, multiply, power } from '../dimensional/algebra.js';
import { DIMENSIONLESS, MASS, type Dimension } from '../dimensional/types.js';
import {
  convertValue,
  parseUnit,
  unitConventionNotes,
  UnitError,
  type TemperatureReading,
} from '../dimensional/units.js';
import {
  callBuiltinFunction,
  FormulaError,
  parseFormulaToAst,
  type FormulaAstNode,
} from './formula.js';

/** A value read from a binding, in SI when `dimensioned` is set. @internal */
export interface BindingValue {
  readonly value: number;
  /** A unit literal or a dimensioned result. A bare number is not. */
  readonly dimensioned: boolean;
  readonly dimension: Dimension;
  readonly notes: readonly string[];
}

interface Qty {
  readonly value: number;
  readonly dim: Dimension;
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const NUMBER_UNIT = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)$/;
const GLUED_NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
const CELSIUS_OFFSET_K = 273.15;

function finite(raw: string, value: number): number {
  if (!Number.isFinite(value)) throw new UnitError(`'${raw}' is not a finite number`);
  return value;
}

function scopeFor(mode: UnitMode): Map<string, Qty> {
  const m = new Map<string, Qty>();
  const put = (name: string, value: number, dim: Dimension): void => {
    m.set(name, { value, dim });
  };
  put('pi', Math.PI, DIMENSIONLESS);
  put('tau', 2 * Math.PI, DIMENSIONLESS);
  for (const [name, c] of Object.entries(SYMBOLIC)) put(name, c.value, c.dim);
  for (const n of FORMULA_NAMED) put(n.name, n.value, n.dim);
  const eps = m.get('epsilon_0');
  if (eps !== undefined) put('eps0', eps.value, eps.dim);
  const mu = m.get('mu_0');
  if (mu !== undefined) put('mu0', mu.value, mu.dim);
  const kb = m.get('k_B');
  if (kb !== undefined) put('kB', kb.value, kb.dim);
  put('M_sun', M_SUN_SI, MASS);
  if (mode !== 'si') {
    for (const [name, value] of Object.entries(naturalConstantOverrides(mode))) put(name, value, DIMENSIONLESS);
  }
  return m;
}

/** The longest unit expression at the start of `rest`, or null. */
function longestUnit(rest: string): string | null {
  if (rest.length === 0 || !/[A-Za-zµμ°ÅΩ]/.test(rest[0]!)) return null;
  let best: string | null = null;
  const limit = Math.min(rest.length, 64);
  for (let n = 1; n <= limit; n++) {
    const prefix = rest.slice(0, n);
    if (/[/*^·+\-(\s]$/.test(prefix)) continue;
    try {
      parseUnit(prefix);
      best = prefix;
    } catch {
      // A longer prefix may still be a unit (`m` then `m/s`, `M` then `Msun`).
    }
  }
  return best;
}

interface Splice {
  readonly expr: string;
  readonly slots: Map<string, Qty>;
  readonly notes: string[];
}

/** Replace a number glued to a unit (`2*1km`, `1m/s`) with a symbol of that SI quantity. */
function spliceUnits(src: string): Splice {
  const slots = new Map<string, Qty>();
  const notes: string[] = [];
  let out = '';
  let last = 0;
  const re = new RegExp(GLUED_NUMBER.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const end = m.index + m[0].length;
    out += src.slice(last, end);
    let i = end;
    while (src[i] === ' ' || src[i] === '\t') i++;
    const unit = longestUnit(src.slice(i));
    if (unit === null) {
      last = end;
      continue;
    }
    const parsed = parseUnit(unit);
    if (parsed.affine !== undefined) {
      throw new UnitError('degC is affine and cannot be part of an expression; give the temperature alone, or use K');
    }
    const name = `__u${slots.size}`;
    slots.set(name, { value: parsed.scale, dim: parsed.dim });
    for (const note of unitConventionNotes(unit)) {
      if (!notes.includes(note)) notes.push(note);
    }
    out += `*${name}`;
    last = i + unit.length;
    re.lastIndex = last;
  }
  out += src.slice(last);
  return { expr: out, slots, notes };
}

function evalAst(node: FormulaAstNode, scope: ReadonlyMap<string, Qty>, slots: ReadonlyMap<string, Qty>): Qty {
  switch (node.kind) {
    case 'num':
      return { value: node.value, dim: DIMENSIONLESS };
    case 'sym': {
      const slot = slots.get(node.name);
      if (slot !== undefined) return slot;
      const known = scope.get(node.name);
      if (known !== undefined) return known;
      if (node.name === 'e') {
        throw new UnitError("unknown name 'e'. Elementary charge is e_charge. This reader does not treat e as Euler's number.");
      }
      throw new UnitError(`unknown name '${node.name}'`);
    }
    case 'unary': {
      const a = evalAst(node.arg, scope, slots);
      return { value: node.op === '-' ? -a.value : a.value, dim: a.dim };
    }
    case 'bin': {
      const l = evalAst(node.left, scope, slots);
      const r = evalAst(node.right, scope, slots);
      switch (node.op) {
        case '+':
        case '-':
          if (!equals(l.dim, r.dim)) {
            throw new UnitError(`cannot ${node.op === '+' ? 'add' : 'subtract'} ${format(l.dim)} and ${format(r.dim)}`);
          }
          return { value: node.op === '+' ? l.value + r.value : l.value - r.value, dim: l.dim };
        case '*':
          return { value: l.value * r.value, dim: multiply(l.dim, r.dim) };
        case '/':
          return { value: l.value / r.value, dim: divide(l.dim, r.dim) };
        case '^':
          if (!equals(r.dim, DIMENSIONLESS)) throw new UnitError('an exponent must be dimensionless');
          return { value: Math.pow(l.value, r.value), dim: power(l.dim, r.value) };
      }
    }
    // eslint-disable-next-line no-fallthrough
    case 'call':
      return evalCall(node.fn, node.args.map((a) => evalAst(a, scope, slots)));
  }
}

function evalCall(fn: string, args: readonly Qty[]): Qty {
  if (fn === 'sqrt' || fn === 'cbrt') {
    if (args.length !== 1) throw new UnitError(`${fn} expected 1 argument`);
    const n = fn === 'sqrt' ? 0.5 : 1 / 3;
    const value = fn === 'sqrt' ? Math.sqrt(args[0]!.value) : Math.cbrt(args[0]!.value);
    return { value, dim: power(args[0]!.dim, n) };
  }
  if (fn === 'abs') {
    if (args.length !== 1) throw new UnitError('abs expected 1 argument');
    return { value: Math.abs(args[0]!.value), dim: args[0]!.dim };
  }
  if (fn === 'pow') {
    if (args.length !== 2) throw new UnitError('pow expects 2 arguments');
    if (!equals(args[1]!.dim, DIMENSIONLESS)) throw new UnitError('an exponent must be dimensionless');
    return { value: Math.pow(args[0]!.value, args[1]!.value), dim: power(args[0]!.dim, args[1]!.value) };
  }
  if (fn === 'atan2') {
    if (args.length !== 2) throw new UnitError('atan2 expects 2 arguments');
    if (!equals(args[0]!.dim, args[1]!.dim)) throw new UnitError('atan2 arguments must have the same dimension');
    return { value: Math.atan2(args[0]!.value, args[1]!.value), dim: DIMENSIONLESS };
  }
  for (const a of args) {
    if (!equals(a.dim, DIMENSIONLESS)) throw new UnitError(`${fn} expects a dimensionless argument`);
  }
  try {
    return { value: callBuiltinFunction(fn, args.map((a) => a.value)), dim: DIMENSIONLESS };
  } catch (e) {
    if (e instanceof FormulaError) throw new UnitError(e.message);
    throw e;
  }
}

function plainUnit(raw: string, reading: TemperatureReading): BindingValue | null {
  const m = NUMBER_UNIT.exec(raw);
  // A leading `*` is multiplication (`2*h`, `0.6*c`). `parseUnit` would drop
  // it and read the name as a unit (`h` the hour). A leading `/` is a unit
  // (`1/s`) when the remainder parses, and an expression otherwise.
  if (m === null || m[2] === undefined || m[2] === '' || m[2].startsWith('*') || m[2].startsWith('·')) return null;
  let unit;
  try {
    unit = parseUnit(m[2]);
  } catch {
    return null;
  }
  const v = finite(raw, Number(m[1]));
  const offset = unit.affine === 'celsius' && reading === 'absolute' ? CELSIUS_OFFSET_K : 0;
  return {
    value: v * unit.scale + offset,
    dimensioned: true,
    dimension: unit.dim,
    notes: unitConventionNotes(m[2]),
  };
}

/**
 * Read one binding. `mode` selects the constant values (`--natural`,
 * `--geometrized`). `reading` is how a lone `degC` is taken.
 * @internal
 */
export function readBinding(
  raw: string,
  opts?: { readonly mode?: UnitMode; readonly reading?: TemperatureReading },
): BindingValue {
  const trimmed = raw.trim();
  const mode = opts?.mode ?? 'si';
  const reading = opts?.reading ?? 'absolute';
  if (trimmed === '') throw new UnitError(`'${raw}' is not a finite number`);
  if (NUMBER.test(trimmed)) {
    return { value: finite(trimmed, Number(trimmed)), dimensioned: false, dimension: DIMENSIONLESS, notes: [] };
  }
  const plain = plainUnit(trimmed, reading);
  if (plain !== null) return plain;

  const spliced = spliceUnits(trimmed);
  let ast: FormulaAstNode;
  try {
    ast = parseFormulaToAst(spliced.expr);
  } catch (e) {
    if (e instanceof FormulaError) throw new UnitError(e.message);
    throw e;
  }
  const qty = evalAst(ast, scopeFor(mode), spliced.slots);
  return {
    value: finite(trimmed, qty.value),
    dimensioned: spliced.slots.size > 0 || !equals(qty.dim, DIMENSIONLESS),
    dimension: qty.dim,
    notes: spliced.notes,
  };
}

/**
 * The same reading as {@link convertValue} when `raw` is a number with an
 * optional unit, and an expression otherwise. The result is in `target`.
 * @internal
 */
export function bindingInUnit(
  raw: string,
  target: string,
  reading: TemperatureReading = 'absolute',
): { value: number; given: string } {
  if (NUMBER.test(raw.trim()) || plainUnit(raw.trim(), reading) !== null) {
    return convertValue(raw, target, reading);
  }
  const b = readBinding(raw, { reading });
  if (!b.dimensioned) return { value: b.value, given: '' };
  const to = parseUnit(target);
  if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
  if (!equals(b.dimension, to.dim)) {
    throw new UnitError(
      `'${raw.trim()}' is ${format(b.dimension)}, but this input is ${format(to.dim)} (${target || 'dimensionless'})`,
    );
  }
  return { value: b.value / to.scale, given: raw.trim() };
}

/**
 * A parameter whose unit is the SI base of `expected`. A bare number is
 * already in that unit. A dimensioned quantity must match.
 * @internal
 */
export function readParameter(raw: string, expected: Dimension): { value: number; notes: readonly string[] } {
  const b = readBinding(raw);
  if (!b.dimensioned) return { value: b.value, notes: b.notes };
  if (!equals(b.dimension, expected)) {
    throw new UnitError(`'${raw}' is ${format(b.dimension)}, but this parameter is ${format(expected)}`);
  }
  return { value: b.value, notes: b.notes };
}
