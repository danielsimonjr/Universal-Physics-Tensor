/**
 * A binding value: a bare number, a number with a unit, or an expression of
 * registered constants and unit literals (`pi/2`, `0.6*c`, `2*1km`).
 *
 * The MathTS parser produces the node this module evaluates, so a unit
 * literal keeps its dimension. A bare `e` is the elementary charge.
 * Euler's number is `exp(x)`. A bare number, or an expression whose result is
 * dimensionless and contains no unit literal, is already in the caller's
 * unit. Anything else is an SI quantity: the caller converts it into the
 * declared unit when the dimensions agree.
 *
 * A unit literal is recognized only where it is glued to a number (`1km`,
 * `1h`, `1G`). A bare name is a constant (`h`, `G`, `c`), never that unit.
 * A temperature name (`T`, `temperature`, `temp`, `T_K`) speaks kelvin. An
 * energy on that name is `k_B T`. Any other dimension on that name is an error.
 *
 * @module numerical/binding-value
 * @internal
 */

import { K_B_SI, M_SUN_SI } from '../core/constants.js';
import { FORMULA_NAMED, isTemperatureName } from '../dimensional/formula-names.js';
import { quantityConventionUnit } from '../dimensional/unit-convention.js';
import { naturalConstantOverrides, type UnitMode } from '../dimensional/natural-units.js';
import { CONSTANTS as SYMBOLIC } from '../dimensional/symbolic-constants.js';
import { divide, equals, format, multiply, power } from '../dimensional/algebra.js';
import { DIMENSIONLESS, ENERGY, MASS, TEMPERATURE, type Dimension } from '../dimensional/types.js';
import {
  convertValue,
  mathTsAgreedQuantity,
  parseUnit,
  unitConventionNotes,
  unitTables,
  UnitError,
  type TemperatureReading,
} from '../dimensional/units.js';
import { callBuiltinFunction, EULER_NUMBER_ERROR, FormulaError } from './formula-contract.js';
import { parseFormulaPNode, type FormulaPNode } from './formula-dimension.js';

/**
 * A temperature binding speaks kelvin. An energy is `k_B T` (the joules
 * divided by `kB`). Any other dimension is refused. A bare number, a
 * temperature, and a name that is not a temperature are unchanged.
 * The spelling list is {@link isTemperatureName}, the temperature group
 * of the one synonym table. `t` is not in that group.
 * @internal
 */
function alignTemperatureBinding(
  name: string,
  raw: string,
  read: BindingValue,
  kB: number = K_B_SI,
  declaredTemperature = false,
): BindingValue {
  const slot = isTemperatureName(name) || declaredTemperature;
  if (!slot || !read.dimensioned || equals(read.dimension, TEMPERATURE)) {
    return read;
  }
  if (equals(read.dimension, ENERGY)) {
    if (!(kB > 0) || !Number.isFinite(kB)) {
      throw new UnitError(`cannot read '${raw.trim()}' as a temperature: k_B is not a positive finite number`);
    }
    const kelvin = read.value / kB;
    return {
      value: kelvin,
      dimensioned: true,
      dimension: TEMPERATURE,
      notes: [
        ...read.notes,
        `${name}=${raw.trim()} is read as k_B T, so ${name} is ${kelvin.toExponential(6)} K`,
      ],
    };
  }
  throw new UnitError(
    `'${raw.trim()}' is ${format(read.dimension)}, but ${name} is a temperature. An energy on a temperature is k_B T.`,
  );
}

/**
 * Joules per kelvin for a temperature binding. A bare number or a J/K value
 * on `boltzmann-constant` wins, then `k_B`, then `kB`. Any other dimension
 * falls through. With none of those, the scale is the CODATA value.
 */
function boltzmannBindingScale(
  pending: readonly { name: string; read: BindingValue }[],
): number {
  const named = pending.find((p) => p.name === 'boltzmann-constant');
  if (named !== undefined && (!named.read.dimensioned || equals(named.read.dimension, SYMBOLIC.k_B.dim))) {
    return named.read.value;
  }
  const hit = pending.find((p) => p.name === 'k_B') ?? pending.find((p) => p.name === 'kB');
  if (hit === undefined) return K_B_SI;
  if (!hit.read.dimensioned || equals(hit.read.dimension, SYMBOLIC.k_B.dim)) return hit.read.value;
  return K_B_SI;
}

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
const CELSIUS_OFFSET_K = unitTables().celsiusOffsetK;

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

/** A unit the parser recognized and refused, rather than a prefix that is not a unit. */
function unitRefusal(e: unknown): UnitError | null {
  if (!(e instanceof UnitError)) return null;
  return /Fahrenheit|affine|more than one/.test(e.message) ? e : null;
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
      // `deg` is a unit, but `degF` is Fahrenheit. Do not keep a prefix whose
      // next character continues the same token.
      const next = rest[n];
      if (next !== undefined && /[A-Za-z0-9µμ°ÅΩ]/.test(next)) continue;
      best = prefix;
    } catch (e) {
      const refused = unitRefusal(e);
      if (refused !== null) throw refused;
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
    const agreed = mathTsAgreedQuantity(1, unit, parsed);
    const name = `__u${slots.size}`;
    slots.set(name, { value: agreed?.value ?? parsed.scale, dim: agreed?.dim ?? parsed.dim });
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

function evalAst(node: FormulaPNode, scope: ReadonlyMap<string, Qty>, slots: ReadonlyMap<string, Qty>): Qty {
  switch (node.kind) {
    case 'num':
      return { value: node.value, dim: DIMENSIONLESS };
    case 'sym': {
      if (node.name === 'euler') throw new FormulaError(EULER_NUMBER_ERROR);
      const slot = slots.get(node.name);
      if (slot !== undefined) return slot;
      const known = scope.get(node.name);
      if (known !== undefined) return known;
      throw new UnitError(`unknown name '${node.name}'`);
    }
    case 'neg': {
      const a = evalAst(node.arg, scope, slots);
      return { value: -a.value, dim: a.dim };
    }
    case 'op':
      return evalOp(node.op, node.args.map((a) => evalAst(a, scope, slots)));
    case 'pow': {
      const base = evalAst(node.base, scope, slots);
      const exp = evalAst(node.exp, scope, slots);
      if (!equals(exp.dim, DIMENSIONLESS)) throw new UnitError('an exponent must be dimensionless');
      return { value: Math.pow(base.value, exp.value), dim: power(base.dim, exp.value) };
    }
    case 'call':
      if (node.fn === 'euler') throw new FormulaError(EULER_NUMBER_ERROR);
      return evalCall(node.fn, node.args.map((a) => evalAst(a, scope, slots)));
  }
}

function evalOp(op: '+' | '-' | '*' | '/', args: readonly Qty[]): Qty {
  if (args.length === 0) throw new UnitError(`cannot ${op}`);
  if (op === '+' || op === '-') {
    const first = args[0]!;
    if (args.length === 1) {
      return op === '-' ? { value: -first.value, dim: first.dim } : first;
    }
    let value = first.value;
    for (const next of args.slice(1)) {
      if (!equals(first.dim, next.dim)) {
        throw new UnitError(`cannot ${op === '+' ? 'add' : 'subtract'} ${format(first.dim)} and ${format(next.dim)}`);
      }
      value = op === '+' ? value + next.value : value - next.value;
    }
    return { value, dim: first.dim };
  }
  if (op === '*') {
    let value = 1;
    let dim = DIMENSIONLESS;
    for (const a of args) {
      value *= a.value;
      dim = multiply(dim, a.dim);
    }
    return { value, dim };
  }
  let value = args[0]!.value;
  let dim = args[0]!.dim;
  for (const next of args.slice(1)) {
    value /= next.value;
    dim = divide(dim, next.dim);
  }
  return { value, dim };
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
  } catch (e) {
    const refused = unitRefusal(e);
    if (refused !== null) throw refused;
    return null;
  }
  const v = finite(raw, Number(m[1]));
  const offset = unit.affine === 'celsius' && reading === 'absolute' ? CELSIUS_OFFSET_K : 0;
  const agreed = offset === 0 ? mathTsAgreedQuantity(v, m[2], unit) : undefined;
  return {
    value: agreed?.value ?? v * unit.scale + offset,
    dimensioned: true,
    dimension: agreed?.dim ?? unit.dim,
    notes: unitConventionNotes(m[2]),
  };
}

/** One other assignment in the same list, used to choose the Boltzmann scale. */
export interface NamedBindingSibling {
  readonly name: string;
  readonly raw: string;
}

/**
 * Read a binding for a named quantity. A temperature name (`T`,
 * `temperature`, `temp`, `T_K`), or a slot whose declared unit is a
 * temperature, reads an energy as `k_B T`. Any other dimension on that
 * slot is an error. A name in the convention table, or a declared unit,
 * is returned in that unit: a bare number is already in it. Any other
 * name is {@link readBinding} (SI when the value carries a unit).
 * @internal
 */
export function readNamedBinding(
  name: string,
  raw: string,
  opts?: {
    readonly mode?: UnitMode;
    readonly reading?: TemperatureReading;
    readonly siblings?: readonly NamedBindingSibling[];
    /** The slot's unit. An empty string is dimensionless. Omitted means the convention table, or SI. */
    readonly declaredUnit?: string;
  },
): BindingValue {
  const mode = opts?.mode ?? 'si';
  const reading = opts?.reading ?? 'absolute';
  const read = readBinding(raw, { mode, reading });
  const pending: { name: string; read: BindingValue }[] = [{ name, read }];
  for (const sibling of opts?.siblings ?? []) {
    if (sibling.name === name) continue;
    try {
      pending.push({ name: sibling.name, read: readBinding(sibling.raw, { mode, reading }) });
    } catch {
      // A sibling that does not parse is that sibling's own error.
    }
  }
  const declared = opts?.declaredUnit;
  const declaredDim = declared !== undefined && declared !== '' ? parseUnit(declared).dim : undefined;
  const aligned = alignTemperatureBinding(
    name,
    raw,
    read,
    boltzmannBindingScale(pending),
    declaredDim !== undefined && equals(declaredDim, TEMPERATURE),
  );
  const target = declared !== undefined ? declared : quantityConventionUnit(name);
  if (target === undefined) return aligned;
  const energyBecameTemperature =
    aligned.dimensioned && equals(aligned.dimension, TEMPERATURE) && !equals(read.dimension, TEMPERATURE);
  if (energyBecameTemperature) {
    if (target === '') {
      throw new UnitError(`'${raw.trim()}' is a temperature, but this input is dimensionless`);
    }
    const to = parseUnit(target);
    if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
    if (!equals(aligned.dimension, to.dim)) {
      throw new UnitError(
        `'${raw.trim()}' is ${format(aligned.dimension)}, but this input is ${format(to.dim)} (${target})`,
      );
    }
    return {
      value: aligned.value / to.scale,
      dimensioned: true,
      dimension: to.dim,
      notes: aligned.notes,
    };
  }
  const converted = bindingInUnit(raw, target, reading, mode);
  return {
    value: converted.value,
    dimensioned: converted.given !== '',
    dimension: target === '' ? DIMENSIONLESS : parseUnit(target).dim,
    notes: unitConventionNotes(converted.given),
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
  let ast: FormulaPNode;
  try {
    ast = parseFormulaPNode(spliced.expr);
  } catch (e) {
    if (e instanceof FormulaError) {
      // `euler` names the refused constant. Keep that sentence; a bare unknown
      // word is not an expression, and a token with an operator (`2*`) is.
      if (e.message.includes('exp(x)')) throw new UnitError(e.message);
      if (!/[+\-*/^()]/.test(trimmed)) throw new UnitError(`'${trimmed}' is not a number with an optional unit`);
      throw new UnitError(e.message);
    }
    throw e;
  }
  let qty: Qty;
  try {
    qty = evalAst(ast, scopeFor(mode), spliced.slots);
  } catch (e) {
    if (
      e instanceof UnitError &&
      /unknown name '/.test(e.message) &&
      spliced.slots.size === 0 &&
      !/[+\-*/^()]/.test(trimmed)
    ) {
      throw new UnitError(`'${trimmed}' is not a number with an optional unit`);
    }
    throw e;
  }
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
  mode: UnitMode = 'si',
): { value: number; given: string } {
  if (NUMBER.test(raw.trim()) || plainUnit(raw.trim(), reading) !== null) {
    return convertValue(raw, target, reading);
  }
  const b = readBinding(raw, { reading, mode });
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
