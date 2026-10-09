/**
 * Dimension-spec parser — turns a human string into a {@link Dimension},
 * so CLI users can declare a quantity's dimensions without TypeScript.
 *
 * Accepts (in priority order):
 *   1. a named dimension — the `types.ts` constants (`length`, `time`,
 *      `mass`, `velocity`, `acceleration`, `force`, `energy`, `power`,
 *      `action`, `frequency`, `temperature`, `entropy`, `charge`, `area`,
 *      `dimensionless`, `density`) and the dimensions of the SI units
 *      `m^3`, `Pa`, `Pa*s`, `ohm`, `T`, `H/m`, `A`, `mol`, `cd` under the
 *      names `volume`, `pressure`, `viscosity`, `resistance`,
 *      `magnetic-field`, `permeability`, `current`, `amount` (or
 *      `amount-of-substance`), `luminous-intensity`;
 *   2. a fundamental constant by name — `hbar`/`ℏ`, `c`, `G`, `k_B`/`kB`,
 *      `e` (its SI dimension);
 *   3. a product/quotient of named dimensions or constants — `power/area`,
 *      `length*temperature` (persona finding L1); parentheses group a
 *      denominator or factor (`power/(area*temperature^4)`), a name may
 *      carry an exponent (`mass/length^3`), and a single base letter works
 *      in a quotient (`M/L^3`). A slash that is only the bar of a fractional
 *      exponent (`T^1/2`) stays on the explicit-base path;
 *   4. explicit base exponents — `L^3.M^-1.T^-2` (bases L M T I Theta/Θ N J,
 *      separated by `.`, `*`, or spaces; `^` optional; fractional exponents
 *      like `T^1/2` allowed).
 *
 * Forms 3 and 4 are one grammar, the formula grammar MathTS parses
 * ({@link parseFormulaPNode}). The dimension notation differs from a formula
 * only in spelling, and {@link formulaSyntax} rewrites those spellings
 * before the parse: a `.` between factors is `*`, a space between factors is
 * `*`, a glued exponent (`L2`, `T-2`) takes its `^` unless the letters and
 * the digit together spell a registered atom (`mu0`, `eps0`), a fractional
 * exponent (`T^1/2`) is parenthesized, and a hyphen inside a name
 * (`magnetic-field`) is `_`. There is no subtraction in a dimension, so `-`
 * after a name is always an exponent's sign.
 *
 * @module dimensional/dimension-spec
 */

import type { Dimension } from './types.js';
import {
  DIMENSIONLESS,
  LENGTH,
  AREA,
  TIME,
  FREQUENCY,
  MASS,
  MASS_DENSITY,
  VELOCITY,
  ACCELERATION,
  FORCE,
  ENERGY,
  POWER,
  ACTION,
  TEMPERATURE,
  ENTROPY,
  CHARGE,
} from './types.js';
import { divide, multiply, power } from './algebra.js';
import { dim } from './ast-builders.js';
import { CONSTANT_REGISTRY } from './symbolic-constants.js';
import { unitDimension } from './units.js';
import { parseFormulaPNode, type FormulaPNode } from '../numerical/formula-dimension.js';

/** A bad dimension spec. */
export class DimensionSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DimensionSpecError';
  }
}

/**
 * Named dimensions — matched case-insensitively. Each is a `types.ts`
 * constant or the dimension of an SI unit read by the one unit reader; no
 * exponent tuple is typed here.
 */
const NAMED_DIMS: Readonly<Record<string, Dimension>> = {
  dimensionless: DIMENSIONLESS,
  length: LENGTH,
  area: AREA,
  volume: unitDimension('m^3'),
  time: TIME,
  frequency: FREQUENCY,
  mass: MASS,
  density: MASS_DENSITY,
  velocity: VELOCITY,
  acceleration: ACCELERATION,
  force: FORCE,
  energy: ENERGY,
  power: POWER,
  action: ACTION,
  temperature: TEMPERATURE,
  entropy: ENTROPY,
  charge: CHARGE,
  current: unitDimension('A'),
  electric_current: unitDimension('A'),
  amount: unitDimension('mol'),
  amount_of_substance: unitDimension('mol'),
  luminous_intensity: unitDimension('cd'),
  pressure: unitDimension('Pa'),
  viscosity: unitDimension('Pa*s'),
  resistance: unitDimension('ohm'),
  magnetic_field: unitDimension('T'),
  permeability: unitDimension('H/m'),
};

/**
 * One constant's exact-case spellings, projected from the constant registry.
 * The first name is the formula name the equation path rewrites the others
 * to. `upt eval` binds the same names. A dimension term reads this record.
 *
 * @internal
 */
export const CONSTANT_SPELLINGS: readonly { readonly names: readonly string[]; readonly dim: Dimension }[] =
  CONSTANT_REGISTRY.map((row) => ({ names: [row.name, ...row.spellings], dim: row.dim }));

/** Fundamental constants by their SI dimension — matched EXACT-case, so
 *  `G` (Newton's constant) is never confused with `g` (acceleration). */
const CONST_DIMS: Readonly<Record<string, Dimension>> = Object.fromEntries(
  CONSTANT_SPELLINGS.flatMap(({ names, dim }) => names.map((name) => [name, dim])),
);

const BASES: Record<string, keyof Dimension> = {
  L: 'L',
  M: 'M',
  T: 'T',
  I: 'I',
  THETA: 'Theta',
  'Θ': 'Theta',
  N: 'N',
  J: 'J',
};

/** Resolve one atom: constant (exact case, `_` or `-`) or named dimension (case-insensitive). */
function resolveAtom(raw: string): Dimension | null {
  const s = raw.trim();
  if (!s) return null;
  const constant = CONST_DIMS[s] ?? CONST_DIMS[s.replaceAll('_', '-')];
  if (constant) return constant;
  const key = s.toLowerCase().replace(/[\s-]+/g, '_');
  return NAMED_DIMS[key] ?? NAMED_DIMS[s.toLowerCase()] ?? null;
}

function baseAtom(id: string): Dimension | null {
  // A single base letter is read in its own case: `m` is the metre's symbol, not mass,
  // and `t`, `i`, `n`, `j` are not bases either (Tom's second round; it read `m^3` as M³).
  // `Theta`/`THETA`/`Θ` are the one multi-letter base and stay case-insensitive.
  if (id.length === 1 && /[a-z]/.test(id)) {
    const upper = id.toUpperCase();
    if (BASES[upper] !== undefined) {
      throw new DimensionSpecError(`'${id}' is not a base letter: the bases are L M T I Θ N J in that case (mass is M, length is L); a unit symbol is not a dimension`);
    }
    return null;
  }
  const baseKey = id.length > 1 ? BASES[id.toUpperCase()] ?? BASES[id] : BASES[id];
  if (!baseKey) return null;
  const out = dim();
  out[baseKey] = 1;
  return out;
}

/**
 * The dimension notation in formula syntax. Each rewrite is a spelling the
 * notation allows and a formula does not; none adds an operator a reader
 * did not write.
 */
function formulaSyntax(spec: string): string {
  return (
    spec
      // A hyphen inside a name: `magnetic-field` is `magnetic_field`.
      .replace(/(?<=[A-Za-zΘ])-(?=[A-Za-zΘ])/g, '_')
      // Spaces around an operator carry nothing; between two factors they multiply.
      .replace(/\s*([*/^().])\s*/g, '$1')
      .replace(/\s+/g, '*')
      // A glued exponent: `L2`, `T-2`, `T-2.5`. The letters and the digit
      // together may spell a registered atom (`mu0`, `eps0`, `mu_0`); that
      // token is a name, not a base with an exponent.
      .replace(/([A-Za-zΘ_]+)([+-]?\d)/g, (token, word: string, digit: string) =>
        resolveAtom(token) !== null ? token : `${word}^${digit}`,
      )
      // A fractional exponent: `T^1/2` is `T^(1/2)`.
      .replace(/\^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, '^($1/$2)')
      // A dot between factors is a product; a dot before a digit is a decimal point.
      .replace(/\.(?!\d)/g, '*')
  );
}

/** A numeric exponent: a number, a signed number, or a quotient or product of numbers. */
function exponentOf(node: FormulaPNode, spec: string): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'neg':
      return -exponentOf(node.arg, spec);
    case 'op': {
      const values = node.args.map((arg) => exponentOf(arg, spec));
      if (node.op === '/') return values.reduce((a, b) => a / b);
      if (node.op === '*') return values.reduce((a, b) => a * b, 1);
      if (node.op === '+') return values.reduce((a, b) => a + b, 0);
      return values.length === 1 ? -values[0]! : values.reduce((a, b) => a - b);
    }
    default:
      throw new DimensionSpecError(`bad exponent in '${spec}'`);
  }
}

function unknownTerm(id: string): DimensionSpecError {
  return new DimensionSpecError(
    `unknown base dimension '${id}' (use L M T I Theta N J, a named dimension, a constant name, ` +
      'or a named product/quotient like power/area)',
  );
}

/** The dimension a parsed spec states. */
function dimensionOf(node: FormulaPNode, spec: string): Dimension {
  switch (node.kind) {
    case 'sym': {
      const found = resolveAtom(node.name) ?? baseAtom(node.name);
      if (found === null) throw unknownTerm(node.name);
      return { ...found };
    }
    case 'num':
      // A literal 1 is the dimensionless numerator: `1/time`.
      if (node.value === 1) return dim();
      throw new DimensionSpecError(`a number is not a dimension term ('${node.value}' in '${spec}')`);
    case 'pow': {
      const exponent = exponentOf(node.exp, spec);
      if (!Number.isFinite(exponent)) throw new DimensionSpecError(`bad exponent in '${spec}'`);
      return { ...power(dimensionOf(node.base, spec), exponent) };
    }
    case 'op': {
      if (node.op !== '*' && node.op !== '/') {
        throw new DimensionSpecError(`unrecognized dimension term '${spec}' (a dimension has no '${node.op}')`);
      }
      const [first, ...rest] = node.args.map((arg) => dimensionOf(arg, spec));
      return { ...rest.reduce((acc, next) => (node.op === '*' ? multiply(acc, next) : divide(acc, next)), first!) };
    }
    case 'neg':
      throw new DimensionSpecError(`unrecognized dimension term '${spec}' (a dimension has no sign)`);
    case 'call':
      throw new DimensionSpecError(`unrecognized dimension term '${node.fn}' in '${spec}'`);
  }
}

/** Parse a dimension spec string into a {@link Dimension}. @internal */
export function parseDimensionSpec(spec: string): Dimension {
  const s = spec.trim();
  if (!s) throw new DimensionSpecError('empty dimension spec');
  // A whole name: a constant (exact case, so G is not g) or a named dimension.
  const whole = resolveAtom(s);
  if (whole) return whole;
  let node: FormulaPNode;
  try {
    node = parseFormulaPNode(formulaSyntax(s));
  } catch (error) {
    throw new DimensionSpecError(
      `unrecognized dimension spec '${s}' (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const out = dimensionOf(node, s);
  // A zero exponent raised to a negative power is -0; a dimension has no signed zero.
  for (const key of Object.keys(out) as (keyof Dimension)[]) if (out[key] === 0) out[key] = 0;
  return out;
}
