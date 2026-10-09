/**
 * A binding value: a bare number, a number with a unit, or an expression of
 * registered constants and unit literals (`pi/2`, `0.6*c`, `2*1km`).
 *
 * The MathTS parser produces the node this module reads. The number is the
 * MathTS formula parser's, evaluated over the registered constants and the
 * spliced unit literals; this module walks the same parse tree for the
 * dimension and the cycle count only, so a unit literal keeps its dimension
 * and there is one arithmetic. The scalar functions are the one table in
 * `formula-contract.ts`, read for arity and dimension rule here and for the
 * numeric body there. A bare `e` is the elementary charge. Euler's number is
 * `exp(x)`. A bare number, or an expression whose result is dimensionless
 * and contains no unit literal, is already in the caller's unit. Anything
 * else is an SI quantity: the caller converts it into the declared unit when
 * the dimensions agree.
 *
 * A unit literal is recognized only where it is glued to a number (`1km`,
 * `1h`, `1G`). A bare name is a constant (`h`, `G`, `c`), never that unit.
 * A temperature name (`T`, `temperature`, `temp`, `T_K`) speaks kelvin. An
 * energy on that name is `k_B T`. Any other dimension on that name is an error.
 *
 * @module numerical/binding-value
 * @internal
 */

import { K_B_SI } from '../core/constants.js';
import {
  assertSynonymAgreement,
  isTemperatureName,
  synonymGroup,
  temperatureQuantityRole,
} from '../dimensional/formula-names.js';
import { quantityConventionUnit } from '../dimensional/unit-convention.js';
import { naturalConstantOverrides, type UnitMode } from '../dimensional/natural-units.js';
import { CONSTANT_REGISTRY, constantRecord } from '../dimensional/symbolic-constants.js';
import { divide, equals, format, multiply, power } from '../dimensional/algebra.js';
import { DIMENSIONLESS, ENERGY, TEMPERATURE, type Dimension } from '../dimensional/types.js';
import {
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  readQuantityLiteral,
  readUnit,
  unitConventionNotes,
  UnitError,
  UnitRefusedError,
  UnknownUnitError,
  type AffineTemperature,
  type TemperatureReading,
} from '../dimensional/units.js';
import { arityMessage, EulerNumberError, FormulaError, SCALAR_FUNCTIONS, unknownFunctionMessage } from './formula-contract.js';
import { constantExponent, parseFormulaPNode, UnsupportedSyntaxError, type FormulaPNode } from './formula-dimension.js';
import { mathtsFormulaParser } from './formula-mathts.js';

/** A value on a temperature slot has a dimension that is neither a temperature nor an energy, or a temperature was read onto a dimensionless slot. @internal */
export class TemperatureBindingError extends UnitError {
  constructor(message: string) {
    super(message);
    this.name = 'TemperatureBindingError';
  }
}

/** The text is not a number, with or without a unit, or the number is not finite. @internal */
export class BindingNumberError extends UnitError {
  constructor(message: string) {
    super(message);
    this.name = 'BindingNumberError';
  }
}

/** An expression names something that is neither a registered constant nor a unit literal. @internal */
class UnknownNameError extends UnitError {
  constructor(readonly symbol: string) {
    super(`unknown name '${symbol}'`);
    this.name = 'UnknownNameError';
  }
}

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
      throw new TemperatureBindingError(`cannot read '${raw.trim()}' as a temperature: k_B is not a positive finite number`);
    }
    const kelvin = read.value / kB;
    const temperatureNote = `${name}=${raw.trim()} is read as k_B T, so ${name} is ${kelvin.toExponential(6)} K`;
    return {
      value: kelvin,
      dimensioned: true,
      dimension: TEMPERATURE,
      notes: [...read.notes, temperatureNote],
      cycles: 0,
      temperatureNote,
    };
  }
  // An energy returned above, so this dimension is neither a temperature nor an energy.
  throw new TemperatureBindingError(
    `'${raw.trim()}' is ${format(read.dimension)}, but ${name} is a temperature. Give kelvin, degC, or an energy (read as k_B T).`,
  );
}

function sameSpelling(a: string, b: string): boolean {
  return a === b || a.replace(/_/g, '-') === b.replace(/_/g, '-');
}

/**
 * Joules per kelvin for a temperature binding. Spellings are the Boltzmann
 * group of {@link SYNONYM_GROUPS}, in that order. Two J/K or bare values that
 * disagree throw. A wrong dimension is ignored. With none of those, the scale
 * is the CODATA value.
 */
function boltzmannBindingScale(
  pending: readonly { name: string; read: BindingValue }[],
): number {
  const group = synonymGroup('boltzmann-constant') ?? [];
  const dim = constantRecord('k_B')!.dim;
  const hits = pending.filter((entry) => {
    if (!group.some((member) => sameSpelling(member, entry.name))) return false;
    return !entry.read.dimensioned || equals(entry.read.dimension, dim);
  });
  if (hits.length >= 2) {
    const values: Record<string, number> = {};
    for (const hit of hits) values[hit.name] = hit.read.value;
    assertSynonymAgreement(values);
  }
  for (const member of group) {
    const hit = hits.find((entry) => sameSpelling(entry.name, member));
    if (hit !== undefined) return hit.read.value;
  }
  return K_B_SI;
}

/** A value read from a binding, in SI when `dimensioned` is set. @internal */
export interface BindingValue {
  readonly value: number;
  /** A unit literal or a dimensioned result. A bare number is not. */
  readonly dimensioned: boolean;
  readonly dimension: Dimension;
  readonly notes: readonly string[];
  /**
   * Net power of cycle-counting units (Hz, rpm) in the value: 1 for `10kHz`
   * and `2*1kHz`, 0 for `1/s`. NaN when a sum mixes cycles with plain rates.
   * An angular-frequency input takes 2π per cycle.
   */
  readonly cycles: number;
  /** Set when the value is a lone affine temperature (`25degC`). */
  readonly affine?: AffineTemperature;
  /** Set when an energy on a temperature slot was read as k_B T: the sentence that says so. */
  readonly temperatureNote?: string;
}

interface Qty {
  readonly value: number;
  readonly dim: Dimension;
  readonly cycles: number;
}

/** The dimension and cycle count of a sub-expression; its number is MathTS's. */
interface DimCycles {
  readonly dim: Dimension;
  readonly cycles: number;
}

/** A number glued to a unit; `spliceUnits` builds its own global copy. */
const GLUED_NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
function finite(raw: string, value: number): number {
  if (!Number.isFinite(value)) throw new BindingNumberError(`'${raw}' is not a finite number`);
  return value;
}

function scopeFor(mode: UnitMode): Map<string, Qty> {
  const m = new Map<string, Qty>();
  m.set('pi', { value: Math.PI, dim: DIMENSIONLESS, cycles: 0 });
  m.set('tau', { value: 2 * Math.PI, dim: DIMENSIONLESS, cycles: 0 });
  for (const record of CONSTANT_REGISTRY) {
    for (const spelling of [record.name, ...record.spellings]) m.set(spelling, { value: record.value, dim: record.dim, cycles: 0 });
  }
  if (mode !== 'si') {
    for (const [name, value] of Object.entries(naturalConstantOverrides(mode))) m.set(name, { value, dim: DIMENSIONLESS, cycles: 0 });
  }
  return m;
}

/** The text has an operator, so it is an expression rather than a lone word. */
const hasOperator = (text: string): boolean => /[+\-*/^()]/.test(text);

/** The longest unit expression at the start of `rest`, or null. */
function longestUnit(rest: string): string | null {
  if (rest.length === 0 || !/[A-Za-zµμ°ÅΩ]/.test(rest[0]!)) return null;
  let best: string | null = null;
  const limit = Math.min(rest.length, 64);
  for (let n = 1; n <= limit; n++) {
    const prefix = rest.slice(0, n);
    if (/[/*^·+\-(\s]$/.test(prefix)) continue;
    try {
      readUnit(prefix);
      // `deg` is a unit, but `degF` is Fahrenheit. Do not keep a prefix whose
      // next character continues the same token.
      const next = rest[n];
      if (next !== undefined && /[A-Za-z0-9_µμ°ÅΩ]/.test(next)) continue;
      best = prefix;
    } catch (e) {
      // An unknown unit at this length: a longer prefix may still be one
      // (`m` then `m/s`, `M` then `Msun`). A refused or ambiguous unit, and
      // anything that is not a unit error, propagates.
      if (!(e instanceof UnknownUnitError)) throw e;
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
    const parsed = readUnit(unit);
    if (parsed.affine !== undefined) {
      throw new UnitRefusedError('an affine temperature cannot be part of an expression; give it alone, or use K');
    }
    const name = `__u${slots.size}`;
    slots.set(name, { value: parsed.scale, dim: parsed.dim, cycles: parsed.cycles });
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

/**
 * An exponent is a dimensionless numeric constant (`2`, `-1`, `1/2`); its
 * value raises the base's dimension. The number of the whole expression is
 * MathTS's, so this is the one place a value is folded here, and it is the
 * same folding the formula dimension checker uses.
 */
function exponentValue(node: FormulaPNode, scope: ReadonlyMap<string, Qty>, slots: ReadonlyMap<string, Qty>): number {
  const exp = dimensionWalk(node, scope, slots);
  const value = constantExponent(node);
  if (!equals(exp.dim, DIMENSIONLESS) || value === undefined) {
    throw new UnitError('an exponent must be a dimensionless number');
  }
  return value;
}

/**
 * The dimension and cycle count of a parse tree, by the dimensional rules of
 * each node and the one function table. No number is computed here except an
 * exponent's; unknown names, unlike sums and dimensioned transcendental
 * arguments are refused.
 */
function dimensionWalk(node: FormulaPNode, scope: ReadonlyMap<string, Qty>, slots: ReadonlyMap<string, Qty>): DimCycles {
  switch (node.kind) {
    case 'num':
      return { dim: DIMENSIONLESS, cycles: 0 };
    case 'sym': {
      if (node.name === 'euler') throw new EulerNumberError();
      const known = slots.get(node.name) ?? scope.get(node.name);
      if (known === undefined) throw new UnknownNameError(node.name);
      return { dim: known.dim, cycles: known.cycles };
    }
    case 'neg':
      return dimensionWalk(node.arg, scope, slots);
    case 'op':
      return dimensionOfOp(node.op, node.args.map((a) => dimensionWalk(a, scope, slots)));
    case 'pow': {
      const base = dimensionWalk(node.base, scope, slots);
      const n = exponentValue(node.exp, scope, slots);
      return { dim: power(base.dim, n), cycles: base.cycles * n };
    }
    case 'call':
      return dimensionOfCall(node.fn, node.args, scope, slots);
  }
}

function dimensionOfOp(op: '+' | '-' | '*' | '/', args: readonly DimCycles[]): DimCycles {
  const first = args[0];
  if (first === undefined) throw new UnitError(`cannot ${op}`);
  if (op === '+' || op === '-') {
    let cycles = first.cycles;
    for (const next of args.slice(1)) {
      if (!equals(first.dim, next.dim)) {
        throw new UnitError(`cannot ${op === '+' ? 'add' : 'subtract'} ${format(first.dim)} and ${format(next.dim)}`);
      }
      // A sum of a cycle rate and a plain rate has no single cycle count.
      if (next.cycles !== cycles) cycles = Number.NaN;
    }
    return { dim: first.dim, cycles };
  }
  let dim = op === '*' ? DIMENSIONLESS : first.dim;
  let cycles = op === '*' ? 0 : first.cycles;
  for (const a of op === '*' ? args : args.slice(1)) {
    dim = op === '*' ? multiply(dim, a.dim) : divide(dim, a.dim);
    cycles = op === '*' ? cycles + a.cycles : cycles - a.cycles;
  }
  return { dim, cycles };
}

/** A call, by the one table's arity and dimension rule. */
function dimensionOfCall(
  fn: string,
  args: readonly FormulaPNode[],
  scope: ReadonlyMap<string, Qty>,
  slots: ReadonlyMap<string, Qty>,
): DimCycles {
  if (fn === 'euler') throw new EulerNumberError();
  const spec = SCALAR_FUNCTIONS[fn];
  if (spec === undefined) throw new UnitError(unknownFunctionMessage(fn));
  if (args.length !== spec.arity) throw new UnitError(arityMessage(fn, spec.arity));
  const rule = spec.dimension;
  const first = dimensionWalk(args[0]!, scope, slots);
  switch (rule.kind) {
    case 'root':
      return { dim: power(first.dim, rule.power), cycles: first.cycles * rule.power };
    case 'same':
      return first;
    case 'transcendental':
      if (!equals(first.dim, DIMENSIONLESS)) throw new UnitError(`${fn} expects a dimensionless argument`);
      return { dim: DIMENSIONLESS, cycles: 0 };
    case 'power': {
      const n = exponentValue(args[1]!, scope, slots);
      return { dim: power(first.dim, n), cycles: first.cycles * n };
    }
    case 'ratio': {
      const second = dimensionWalk(args[1]!, scope, slots);
      if (!equals(first.dim, second.dim)) throw new UnitError(`${fn} arguments must have the same dimension`);
      return { dim: DIMENSIONLESS, cycles: 0 };
    }
  }
}

/**
 * The number of a spliced expression: the MathTS formula parser over the
 * registered constants and the unit slots. The dimension walk has already
 * refused unknown names, so a failure here is a non-finite result.
 */
function numberOf(raw: string, expr: string, scope: ReadonlyMap<string, Qty>, slots: ReadonlyMap<string, Qty>): number {
  const values: Record<string, number> = {};
  for (const [name, qty] of scope) values[name] = qty.value;
  for (const [name, qty] of slots) values[name] = qty.value;
  try {
    return mathtsFormulaParser.parse(expr).evaluate(values);
  } catch (e) {
    if (e instanceof FormulaError) throw new BindingNumberError(`'${raw}' is not a finite number`);
    throw e;
  }
}

/** The literal path: a number with an optional unit, read exactly by the one unit reader. */
function literalBinding(raw: string, reading: TemperatureReading): BindingValue | null {
  const literal = readQuantityLiteral(raw, reading);
  if (literal === null) return null;
  return {
    value: finite(raw, literal.value),
    dimensioned: literal.unit !== '',
    dimension: literal.dim,
    notes: unitConventionNotes(literal.unit),
    cycles: literal.cycles,
    ...(literal.affine === undefined ? {} : { affine: literal.affine }),
  };
}

/**
 * A number-plus-unit whose dimension matches `target`, including an ambiguous
 * token that has one reading of that dimension. A unique dimension mismatch
 * returns undefined so an energy on a temperature can still become `k_B T`.
 * An ambiguous expression that matches nothing throws.
 */
function declaredUnitReading(
  raw: string,
  target: string,
  reading: TemperatureReading,
): BindingValue | undefined {
  try {
    const converted = convertValue(raw, target, reading);
    if (converted.given === '') return undefined;
    return {
      value: converted.value,
      dimensioned: true,
      dimension: parseUnit(target).dim,
      notes: unitConventionNotes(converted.given),
      cycles: converted.cycles ?? 0,
      ...(converted.affine === undefined ? {} : { affine: converted.affine }),
    };
  } catch (error) {
    if (error instanceof AmbiguousUnitError) throw error;
    // A unit the reader could not match to the target is the "not this
    // reading" outcome; anything that is not a unit error propagates.
    if (!(error instanceof UnitError)) throw error;
    return undefined;
  }
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
  const reading = opts?.reading ?? temperatureQuantityRole(name);
  const declared = opts?.declaredUnit;
  const targetPreview = declared !== undefined ? declared : quantityConventionUnit(name);
  if (targetPreview !== undefined && targetPreview !== '') {
    const resolved = declaredUnitReading(raw, targetPreview, reading);
    if (resolved !== undefined) return resolved;
  }
  const read = readBinding(raw, { mode, reading });
  const pending: { name: string; read: BindingValue }[] = [{ name, read }];
  for (const sibling of opts?.siblings ?? []) {
    if (sibling.name === name) continue;
    try {
      pending.push({ name: sibling.name, read: readBinding(sibling.raw, { mode, reading }) });
    } catch (error) {
      // A sibling that does not read as a value is that sibling's own error,
      // reported where it is read. A programming error propagates.
      if (!(error instanceof UnitError)) throw error;
    }
  }
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
      throw new TemperatureBindingError(`'${raw.trim()}' is a temperature, but this input is dimensionless`);
    }
    const to = parseUnit(target);
    if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
    if (!equals(aligned.dimension, to.dim)) {
      throw new UnitError(
        `'${raw.trim()}' is ${format(aligned.dimension)}, but this input is ${format(to.dim)} (${target})`,
      );
    }
    return { ...aligned, value: aligned.value / to.scale, dimensioned: true, dimension: to.dim };
  }
  const converted = bindingInUnit(raw, target, reading, mode);
  return {
    value: converted.value,
    dimensioned: converted.given !== '',
    dimension: target === '' ? DIMENSIONLESS : parseUnit(target).dim,
    notes: unitConventionNotes(converted.given),
    cycles: converted.cycles ?? 0,
    ...(converted.affine === undefined ? {} : { affine: converted.affine }),
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
  if (trimmed === '') throw new BindingNumberError(`'${raw}' is not a finite number`);
  const literal = literalBinding(trimmed, reading);
  if (literal !== null) return literal;

  const spliced = spliceUnits(trimmed);
  const notANumber = (): BindingNumberError => new BindingNumberError(`'${trimmed}' is not a number with an optional unit`);
  let ast: FormulaPNode;
  try {
    ast = parseFormulaPNode(spliced.expr);
  } catch (e) {
    // Syntax the normalized form has no shape for (`1.2.3`, `a.b`) is not a value.
    if (e instanceof UnsupportedSyntaxError) throw notANumber();
    // `euler` names the refused constant; keep that sentence.
    if (e instanceof EulerNumberError) throw new UnitError(e.message);
    if (e instanceof FormulaError) {
      // A bare unknown word is not an expression; a token with an operator (`2*`) is.
      if (!hasOperator(trimmed)) throw notANumber();
      throw new UnitError(e.message);
    }
    throw e;
  }
  const scope = scopeFor(mode);
  let shape: DimCycles;
  try {
    shape = dimensionWalk(ast, scope, spliced.slots);
  } catch (e) {
    if (e instanceof UnknownNameError && spliced.slots.size === 0 && !hasOperator(trimmed)) throw notANumber();
    throw e;
  }
  return {
    value: finite(trimmed, numberOf(trimmed, spliced.expr, scope, spliced.slots)),
    dimensioned: spliced.slots.size > 0 || !equals(shape.dim, DIMENSIONLESS),
    dimension: shape.dim,
    notes: spliced.notes,
    cycles: shape.cycles,
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
): { value: number; given: string; cycles?: number; affine?: AffineTemperature } {
  // A literal the one unit reader accepts converts exactly, unit to unit; anything else
  // (an expression such as `1Hz + 1/(1s)`) is read as an expression and converted from SI.
  if (readQuantityLiteral(raw, reading) !== null) return convertValue(raw, target, reading);
  const b = readBinding(raw, { reading, mode });
  if (!b.dimensioned) return { value: b.value, given: '' };
  const to = parseUnit(target);
  if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
  if (!equals(b.dimension, to.dim)) {
    throw new UnitError(
      `'${raw.trim()}' is ${format(b.dimension)}, but this input is ${format(to.dim)} (${target || 'dimensionless'})`,
    );
  }
  return { value: b.value / to.scale, given: raw.trim(), ...(b.cycles === 0 ? {} : { cycles: b.cycles }) };
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
