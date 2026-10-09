/**
 * The constant registry: one row per physical constant a formula may name.
 *
 * A row (written in `constant-rows.ts`) holds the formula name, its other
 * exact-case spellings, the SI value (imported from `core/constants.js`, the
 * one owner of every value), the SI unit in `parseUnit` syntax, the meaning
 * and the source. The dimension is derived from the unit once, here; no second
 * table states it. The rows sit in their own module because the unit table
 * names constants by these spellings, and this module imports the unit parser. Every other
 * constant table in the library ({@link CONSTANTS}, `FORMULA_NAMED`,
 * `CONSTANT_SPELLINGS`, {@link CONSTANT_PROVENANCE}, `CANONICAL_CONSTANTS`,
 * the `upt eval` scope, the binding scope, the gradient constants) is a
 * projection of this array, so a spelling, a value and a dimension cannot
 * disagree between two files. A constant that is also a quantity names its
 * `data/quantities.json` row in `quantity`; the quantity registry derives that
 * row's aliases from here, so the file states no constant spelling.
 *
 * `canonical` marks a universal constant a canonical equation's `governing`
 * list may bake as a leaf. A row that is an overlay for `upt eval` and the
 * dimensional assignment only (`m_p`, `N_A`, the GRW parameters) is not
 * canonical, so the canonical graph does not bake it.
 *
 * Numeric-literal leaves (`'2'`, `'3'`) are NOT registered — `evalExpr`
 * resolves them via `Number(name)` and they are implicitly dimensionless.
 * Non-base-10 tokens (`'8pi'`, `'4pi'`, `'ln2'`) MUST be here (`Number('8pi')`
 * is `NaN`).
 *
 * INTERNAL — not on the public surface.
 *
 * @module dimensional/symbolic-constants
 */

import type { Dimension } from './types.js';
import { parseUnit } from './units.js';
import { CONSTANT_ROWS, constantRow, type ConstantRow } from './constant-rows.js';

/** One registered constant: its row, with the dimension derived from its unit. @internal */
export interface ConstantRecord extends ConstantRow {
  readonly dim: Dimension;
}

/**
 * Every registered constant, the rows of `constant-rows.ts` with each
 * dimension derived once from its unit. Order is the order the tables print.
 * @internal
 */
export const CONSTANT_REGISTRY: readonly ConstantRecord[] = CONSTANT_ROWS.map((constant) => ({
  ...constant,
  dim: parseUnit(constant.unit).dim,
}));

const RECORD_OF_ROW = new Map<ConstantRow, ConstantRecord>(CONSTANT_ROWS.map((constant, i) => [constant, CONSTANT_REGISTRY[i]!]));

/**
 * Every spelling → its record; `constant-rows.ts` refuses a spelling written twice. A constant
 * that is also a quantity (`quantity`, e.g. `k_B` → `boltzmann-constant`) is reachable by that
 * quantity id too, so a user who writes the quantity's name states the constant, and the value
 * is checked against the registry rather than bound.
 */
const BY_SPELLING = new Map<string, ConstantRecord>(
  CONSTANT_REGISTRY.flatMap((record) =>
    [record.name, ...record.spellings, ...(record.quantity === undefined ? [] : [record.quantity])].map(
      (spelling) => [spelling, record] as const,
    ),
  ),
);

/** The registered constant `spelling` names, or undefined. @internal */
export function constantRecord(spelling: string): ConstantRecord | undefined {
  const constant = constantRow(spelling);
  return constant === undefined ? undefined : RECORD_OF_ROW.get(constant);
}

/**
 * Relative tolerance within which a stated constant agrees with the registered
 * value. Textbook roundings such as `b = 2.9e-3` pass.
 * @internal
 */
const CONSTANT_AGREEMENT = 5e-3;

/** A stated value for a registered constant disagrees with the registry. The equations use the registered value. @internal */
export class ConstantDisagreementError extends Error {
  constructor(
    readonly key: string,
    readonly constant: string,
    readonly registered: number,
    readonly given: number,
  ) {
    super(
      `'${key}' is the registered constant ${constant} = ${registered}; ` +
        `${given} disagrees, and the equations use the registered value, so it cannot be rebound.`,
    );
    this.name = 'ConstantDisagreementError';
  }
}

/**
 * The registered constant `key` names when `value` agrees with it within
 * {@link CONSTANT_AGREEMENT}, or null when `key` names no constant. A value
 * that disagrees throws {@link ConstantDisagreementError}: a constant is not
 * a graph quantity, so a stated value is checked, never bound.
 * @internal
 */
export function constantAgreement(key: string, value: number): string | null {
  const record = BY_SPELLING.get(key);
  if (record === undefined) return null;
  if (Math.abs(value - record.value) > CONSTANT_AGREEMENT * Math.abs(record.value)) {
    throw new ConstantDisagreementError(key, record.name, record.value, value);
  }
  return record.name;
}

/** The notes of the registered constants among `names`, each once, in registry order. @internal */
export function constantNotes(names: Iterable<string>): string[] {
  const seen = new Set<ConstantRecord>();
  for (const name of names) {
    const record = BY_SPELLING.get(name);
    if (record?.note !== undefined) seen.add(record);
  }
  return CONSTANT_REGISTRY.filter((record) => seen.has(record)).map((record) => record.note!);
}

/** Every spelling → SI value, for a numeric scope. `pi` and `tau` are added. @internal */
export function constantScope(): Record<string, number> {
  const scope: Record<string, number> = { pi: Math.PI, tau: 2 * Math.PI };
  for (const [spelling, record] of BY_SPELLING) scope[spelling] = record.value;
  return scope;
}

/** A registered constant leaf: SI value + SI dimension. @internal */
export interface NamedConstantValue {
  readonly value: number;
  readonly dim: Dimension;
}

/**
 * Constant leaves a `symbolic` ExprNode may reference, keyed by formula name:
 * the canonical rows of {@link CONSTANT_REGISTRY}. `ln2`/`8pi`/`4pi`
 * reproduce the evaluators' `Math.LN2` / `8*Math.PI` / `4*Math.PI` exactly
 * (same IEEE-754 primitives).
 */
export const CONSTANTS: Readonly<Record<string, NamedConstantValue>> = Object.fromEntries(
  CONSTANT_REGISTRY.filter((record) => record.canonical).map((record) => [
    record.name,
    { value: record.value, dim: record.dim },
  ]),
);

/** What a registered constant is, its SI unit, and where its value comes from (audit I10). @internal */
export interface ConstantProvenance {
  readonly meaning: string;
  /** The SI unit, in the syntax `parseUnit` reads; the registered dimension is derived from it. */
  readonly unit: string;
  readonly source: string;
}

/** One row per {@link CONSTANT_REGISTRY} name. @internal */
export const CONSTANT_PROVENANCE: Readonly<Record<string, ConstantProvenance>> = Object.fromEntries(
  CONSTANT_REGISTRY.map((record) => [
    record.name,
    { meaning: record.meaning, unit: record.unit, source: record.source },
  ]),
);

/**
 * A spelled-out multiple of π written as one symbol (`pi`, `6pi`). `2pi`,
 * `4pi` and `8pi` are also registered in {@link CONSTANTS}; this covers the
 * multiples an encoder spelled out and did not register (`6pi` in
 * CE-perihelion-precession). The structural normal form already drops these.
 * The numeric evaluator has to resolve them too, or a comparison treats `6pi`
 * as a free symbol and never aligns the formula.
 * @internal
 */
export function piMultipleValue(name: string): number | undefined {
  const m = /^(\d*)pi$/.exec(name);
  if (m === null) return undefined;
  const n = m[1] === '' ? 1 : Number(m[1]);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n * Math.PI;
}
