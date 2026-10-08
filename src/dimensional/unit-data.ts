/**
 * The unit table, loaded from `data/units.json` and validated once.
 *
 * The file is checked against `data/units.schema.json` when this module
 * loads (`core/json-schema`), then against the rules a schema cannot state:
 * every scale expression reads, a symbol is spelled by one row, a refused
 * spelling and an affine spelling are not also a unit, every prefix letter is
 * both a prefix and a unit, and every `{NAME}` in a note is a constant. A
 * file that breaks one throws here, so `units.ts` never reads a half-valid table.
 *
 * A scale is an exact expression, read by `exact-scale.ts`. A name in it is a
 * shared scale from the file's `scales`, `pi`, `ln2`, or one of the constants
 * of `core/constants.ts` in `UNIT_CONSTANTS`, read through its shortest decimal
 * (`scaleOf`). Those constants are imported by name, not as a namespace, so the
 * CLI record's static reach (`cli/record-reach.ts`) names the constants the unit
 * table can read instead of the whole constants table; a name outside them is
 * refused when the file loads. The raw
 * rows are strings and integer exponents, so another exact reader (MathTS)
 * replaces this loader without touching the file.
 *
 * @module dimensional/unit-data
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C_SI, E_SI, M_SUN_IAU_SI, M_SUN_SI, M_U_SI } from '../core/constants.js';
import { schemaProblems, type JsonSchema } from '../core/json-schema.js';
import type { Dimension } from './types.js';
import { decimalScale, irrationalScale, readScaleExpression, scaleOf, type ExactScale } from './exact-scale.js';

type DimensionFile = Partial<Record<keyof Dimension, number>>;

interface UnitFileRow {
  readonly symbols: readonly string[];
  readonly scale: string;
  readonly dimension: DimensionFile;
  readonly prefixable: boolean;
  readonly cycles?: true;
}

interface AffineFileRow {
  readonly id: string;
  readonly scale: string;
  readonly icePoint: string;
  readonly symbols: readonly string[];
}

interface UnitFile {
  readonly scales: Readonly<Record<string, string>>;
  readonly prefixes: Readonly<Record<string, string>>;
  readonly units: readonly UnitFileRow[];
  readonly refused: readonly { readonly symbol: string; readonly reason: string }[];
  readonly prefixLetterUnits: { readonly letters: readonly string[] };
  readonly affine: { readonly iceKelvin: string; readonly scales: readonly AffineFileRow[] };
  readonly spellingNotes: readonly { readonly spelling: string; readonly note: string }[];
}

/** One unit symbol, read exactly. @internal */
export interface UnitRow {
  /** Exact scale to SI base units. */
  readonly scale: ExactScale;
  readonly dim: Dimension;
  /** Takes an SI prefix. */
  readonly prefixable: boolean;
  /**
   * The unit counts cycles (turns), not radians. An angular-frequency input in
   * rad/s takes 2π per cycle; the radian itself does not.
   */
  readonly cycles?: true;
}

/** One affine temperature scale, read exactly. @internal */
export interface AffineRow {
  readonly id: string;
  /** Kelvin per degree, exactly. */
  readonly scale: ExactScale;
  /** The reading at the ice point (0 °C, 273.15 K), exactly. */
  readonly icePoint: ExactScale;
  readonly symbols: readonly string[];
}

/** The unit table `units.ts` reads. @internal */
export interface UnitTableData {
  readonly units: ReadonlyMap<string, UnitRow>;
  readonly prefixes: ReadonlyMap<string, ExactScale>;
  /** Refused spelling → the message it prints. */
  readonly refused: ReadonlyMap<string, string>;
  readonly prefixLetterUnits: ReadonlySet<string>;
  /** Kelvin at 0 °C, exactly. */
  readonly iceKelvin: ExactScale;
  readonly affine: readonly AffineRow[];
  /** Spelling → its note, with every `{NAME}` replaced by that constant. */
  readonly spellingNotes: ReadonlyMap<string, string>;
  /** SHA-256 of `data/units.json` with line endings as LF, for the CLI record fingerprint. */
  readonly sha256: string;
}

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data');
const BASES = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const IRRATIONAL: Readonly<Record<string, ExactScale>> = { pi: irrationalScale(Math.PI), ln2: irrationalScale(Math.LN2) };

/**
 * The `core/constants.ts` values `data/units.json` names (in a scale or a note
 * placeholder). The file is checked against this set at load, so a row naming
 * another constant fails until it is imported here.
 */
const UNIT_CONSTANTS: Readonly<Record<string, number>> = { C_SI, E_SI, M_SUN_IAU_SI, M_SUN_SI, M_U_SI };

/** A constant the unit file may name, or undefined. */
function constantValue(name: string): number | undefined {
  return Object.hasOwn(UNIT_CONSTANTS, name) ? UNIT_CONSTANTS[name] : undefined;
}

function dimension(d: DimensionFile): Dimension {
  const out: Record<string, number> = {};
  for (const base of BASES) out[base] = d[base] ?? 0;
  return out as unknown as Dimension;
}

/**
 * Validate and read `text`, the contents of `data/units.json`, against `schema`.
 * Throws on a file the schema or the table rules reject. A test passes a broken copy.
 * @internal
 */
export function readUnitFile(text: string, schema: JsonSchema): UnitTableData {
  const raw: unknown = JSON.parse(text);
  const problems = schemaProblems(schema, raw);
  if (problems.length > 0) throw new Error(`data/units.json does not match data/units.schema.json:\n${problems.join('\n')}`);
  const file = raw as UnitFile;

  const named = new Map<string, ExactScale>();
  const reading = new Set<string>();
  const resolve = (name: string): ExactScale | undefined => {
    const irrational = IRRATIONAL[name];
    if (irrational !== undefined) return irrational;
    const shared = file.scales[name];
    if (shared !== undefined) {
      const done = named.get(name);
      if (done !== undefined) return done;
      if (reading.has(name)) throw new Error(`data/units.json: scale '${name}' is defined in terms of itself`);
      reading.add(name);
      const scale = readScaleExpression(shared, resolve);
      reading.delete(name);
      named.set(name, scale);
      return scale;
    }
    const value = constantValue(name);
    return value === undefined ? undefined : scaleOf(value);
  };
  const read = (text: string, where: string): ExactScale => {
    try {
      return readScaleExpression(text, resolve);
    } catch (error) {
      throw new Error(`data/units.json ${where}: ${(error as Error).message}`);
    }
  };

  const prefixes = new Map(Object.entries(file.prefixes).map(([prefix, text]) => [prefix, decimalScale(text)!] as const));
  const units = new Map<string, UnitRow>();
  for (const row of file.units) {
    const scale = read(row.scale, `unit ${row.symbols[0]}`);
    const unit: UnitRow = { scale, dim: dimension(row.dimension), prefixable: row.prefixable, ...(row.cycles ? { cycles: true as const } : {}) };
    for (const symbol of row.symbols) {
      if (units.has(symbol)) throw new Error(`data/units.json: unit '${symbol}' is spelled by two rows`);
      units.set(symbol, unit);
    }
  }
  const refused = new Map<string, string>();
  for (const { symbol, reason } of file.refused) {
    if (units.has(symbol) || refused.has(symbol)) throw new Error(`data/units.json: refused '${symbol}' is also a unit or refused twice`);
    refused.set(symbol, reason);
  }
  for (const letter of file.prefixLetterUnits.letters) {
    if (!prefixes.has(letter) || !units.has(letter)) {
      throw new Error(`data/units.json: prefix letter '${letter}' is not both a prefix and a unit`);
    }
  }
  const affine = file.affine.scales.map((row) => {
    for (const symbol of row.symbols) {
      if (units.has(symbol) || refused.has(symbol)) throw new Error(`data/units.json: affine '${symbol}' is also a unit or refused`);
    }
    return { id: row.id, scale: read(row.scale, `affine ${row.id}`), icePoint: read(row.icePoint, `affine ${row.id}`), symbols: row.symbols };
  });
  const spellingNotes = new Map<string, string>();
  for (const { spelling, note } of file.spellingNotes) {
    const filled = note.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name: string) => {
      const value = constantValue(name);
      if (value === undefined) throw new Error(`data/units.json: note for '${spelling}' names '${name}', which is not a constant`);
      return String(value);
    });
    spellingNotes.set(spelling, filled);
  }
  return {
    units,
    prefixes,
    refused,
    prefixLetterUnits: new Set(file.prefixLetterUnits.letters),
    iceKelvin: read(file.affine.iceKelvin, 'affine iceKelvin'),
    affine,
    spellingNotes,
    sha256: createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex'),
  };
}

/** The unit table, read once from `data/units.json`. @internal */
export const UNIT_DATA: UnitTableData = readUnitFile(
  readFileSync(join(DATA_DIR, 'units.json'), 'utf8'),
  JSON.parse(readFileSync(join(DATA_DIR, 'units.schema.json'), 'utf8')) as JsonSchema,
);
