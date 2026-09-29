/**
 * Dimension-spec parser — turns a human string into a {@link Dimension},
 * so CLI users can declare a quantity's dimensions without TypeScript.
 *
 * Accepts (in priority order):
 *   1. a named dimension — `length`, `time`, `mass`, `velocity`,
 *      `acceleration`, `force`, `energy`, `power`, `action`, `frequency`,
 *      `temperature`, `entropy`, `charge`, `area`, `dimensionless`;
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

/** A bad dimension spec. */
export class DimensionSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DimensionSpecError';
  }
}

const d = (
  L = 0,
  M = 0,
  T = 0,
  Theta = 0,
  I = 0,
): Dimension => ({ L, M, T, I, Theta, N: 0, J: 0 });

/** Named dimensions — matched case-insensitively. */
const NAMED_DIMS: Readonly<Record<string, Dimension>> = {
  dimensionless: DIMENSIONLESS,
  length: LENGTH,
  area: AREA,
  time: TIME,
  frequency: FREQUENCY,
  mass: MASS,
  velocity: VELOCITY,
  acceleration: ACCELERATION,
  force: FORCE,
  energy: ENERGY,
  power: POWER,
  action: ACTION,
  temperature: TEMPERATURE,
  entropy: ENTROPY,
  charge: CHARGE,
  pressure: d(-1, 1, -2),
  density: d(-3, 1),
  volume: d(3),
  viscosity: d(-1, 1, -1),
  resistance: d(2, 1, -3, 0, -2),
  magnetic_field: d(0, 1, -2, 0, -1),
};

/** Fundamental constants by their SI dimension — matched EXACT-case, so
 *  `G` (Newton's constant) is never confused with `g` (acceleration). */
const CONST_DIMS: Readonly<Record<string, Dimension>> = {
  hbar: ACTION,
  'ℏ': ACTION,
  c: VELOCITY,
  G: d(3, -1, -2),
  k_B: ENTROPY, // Boltzmann (J/K)
  kB: ENTROPY,
  e: CHARGE, // elementary charge (A·s)
};

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

function parseExponent(raw: string): number {
  if (raw === '') return 1;
  if (raw.includes('/')) {
    const [n, den] = raw.split('/');
    const num = Number(n);
    const dd = Number(den);
    if (!Number.isFinite(num) || !Number.isFinite(dd) || dd === 0) {
      throw new DimensionSpecError(`bad exponent '${raw}'`);
    }
    return num / dd;
  }
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new DimensionSpecError(`bad exponent '${raw}'`);
  return v;
}

/** Resolve one atom: constant (exact case) or named dimension (case-insensitive). */
function resolveAtom(raw: string): Dimension | null {
  const s = raw.trim();
  if (!s) return null;
  if (CONST_DIMS[s]) return CONST_DIMS[s]!;
  const key = s.toLowerCase().replace(/[\s-]+/g, '_');
  return NAMED_DIMS[key] ?? NAMED_DIMS[s.toLowerCase()] ?? null;
}

function baseAtom(id: string): Dimension | null {
  const baseKey = BASES[id.toUpperCase()] ?? BASES[id];
  if (!baseKey) return null;
  const dim = d();
  dim[baseKey] = 1;
  return dim;
}

/**
 * Parse a product/quotient of named dims and constants: `power/area`,
 * `length*temperature`, `L*Theta` is NOT this path (bases go to step 4).
 * Only `*` and `/` as top-level operators; no parentheses, no `^` on names.
 * Returns `null` when the string is not this form (so the base-exponent path
 * can try).
 */
/**
 * A product/quotient with parentheses and exponents: `power/(area*temperature^4)`,
 * `mass/length^3`, `M/L^3`. A slash followed by a digit is a fractional
 * exponent on the explicit-base path (`T^1/2`), not this one.
 */
function parseGroupedProduct(s: string): Dimension {
  let i = 0;
  const skip = (): void => {
    while (s[i] === ' ') i++;
  };
  const parseExponentToken = (): number => {
    skip();
    const start = i;
    if (s[i] === '+' || s[i] === '-') i++;
    if (!/\d/.test(s[i] ?? '')) throw new DimensionSpecError(`bad exponent in '${s}'`);
    while (/\d/.test(s[i] ?? '')) i++;
    if (s[i] === '/' && /\d/.test(s[i + 1] ?? '')) {
      i++;
      while (/\d/.test(s[i] ?? '')) i++;
    }
    return parseExponent(s.slice(start, i));
  };
  const parseAtom = (): Dimension => {
    skip();
    if (s[i] === '(') {
      i++;
      const inner = parseProduct();
      skip();
      if (s[i] !== ')') throw new DimensionSpecError(`unbalanced '(' in '${s}'`);
      i++;
      return inner;
    }
    const start = i;
    while (i < s.length && /[A-Za-zΘ_]/.test(s[i]!)) i++;
    const id = s.slice(start, i);
    if (!id) throw new DimensionSpecError(`unrecognized dimension term '${s.slice(start)}'`);
    const named = resolveAtom(id);
    if (named) return named;
    const base = baseAtom(id);
    if (base) return base;
    throw new DimensionSpecError(
      `unrecognized dimension term '${id}' (use a named dimension, a constant, ` +
        `or bases L M T I Theta N J)`,
    );
  };
  const parsePower = (): Dimension => {
    const base = parseAtom();
    skip();
    if (s[i] !== '^') return base;
    i++;
    return power(base, parseExponentToken());
  };
  const parseProduct = (): Dimension => {
    let acc = parsePower();
    while (true) {
      skip();
      const op = s[i];
      if (op !== '*' && op !== '/') break;
      i++;
      const rhs = parsePower();
      acc = op === '*' ? multiply(acc, rhs) : divide(acc, rhs);
    }
    return acc;
  };
  const out = parseProduct();
  skip();
  if (i !== s.length) throw new DimensionSpecError(`unrecognized dimension term '${s.slice(i)}'`);
  return out;
}

function wantsGroupedProduct(s: string): boolean {
  if (/[()]/.test(s)) return true;
  if (/\/\s*[(A-Za-zΘ]/.test(s)) return true;
  return /\*/.test(s) && /[A-Za-z]{2,}/.test(s);
}

/** Parse a dimension spec string into a {@link Dimension}. @internal */
export function parseDimensionSpec(spec: string): Dimension {
  const s = spec.trim();
  if (!s) throw new DimensionSpecError('empty dimension spec');

  // (1) fundamental constant — EXACT case (G ≠ g).
  if (CONST_DIMS[s]) return CONST_DIMS[s];
  // (2) named dimension — case-insensitive.
  const named = NAMED_DIMS[s.toLowerCase()];
  if (named) return named;

  // (3) product/quotient, including parentheses and named exponents.
  if (wantsGroupedProduct(s)) return parseGroupedProduct(s);

  // (4) explicit base exponents.
  const out = d();
  const parts = s.split(/[.*\s]+/).filter(Boolean);
  for (const part of parts) {
    const m = /^([A-Za-zΘ]+)\^?(-?\d+(?:\/\d+)?)?$/.exec(part);
    if (!m) throw new DimensionSpecError(`unrecognized dimension term '${part}'`);
    const baseKey = BASES[m[1].toUpperCase()] ?? BASES[m[1]];
    if (!baseKey) {
      throw new DimensionSpecError(
        `unknown base dimension '${m[1]}' (use L M T I Theta N J, a named ` +
          `dimension, a constant name, or a named product/quotient like power/area)`,
      );
    }
    out[baseKey] += parseExponent(m[2] ?? '');
  }
  return out;
}
