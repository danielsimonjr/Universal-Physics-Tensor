/**
 * The packaged data files under `data/`, read and checked against their schemas.
 *
 * Every data file the library loads has a schema beside it, named by one
 * convention (`units.json` → `units.schema.json`), and is checked against it
 * with {@link schemaProblems} when it loads, so a malformed file fails at load
 * with every problem listed instead of failing later where a field is read.
 * A file two modules read is parsed and checked once per process.
 *
 * @module core/data-file
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schemaProblems, type JsonSchema } from './json-schema.js';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data');

/** The schema file of `file`: `units.json` → `units.schema.json`. @internal */
export function schemaFileOf(file: string): string {
  return file.replace(/\.json$/, '.schema.json');
}

/** The text of `data/<file>`. @internal */
export function dataText(file: string): string {
  return readFileSync(join(DATA_DIR, file), 'utf8');
}

/** The schema of `data/<file>`, parsed. @internal */
export function dataSchema(file: string): JsonSchema {
  return JSON.parse(dataText(schemaFileOf(file))) as JsonSchema;
}

/**
 * `text`, the contents of `data/<file>`, parsed and checked against `schema`.
 * Throws listing every problem. A test passes a broken copy.
 * @internal
 */
export function parseDataFile(file: string, text: string, schema: JsonSchema): unknown {
  const value: unknown = JSON.parse(text);
  const problems = schemaProblems(schema, value);
  if (problems.length > 0) throw new Error(`data/${file} does not match data/${schemaFileOf(file)}:\n${problems.join('\n')}`);
  return value;
}

const checked = new Map<string, unknown>();

/** `data/<file>`, parsed and checked against its schema, once per process. @internal */
export function checkedDataFile(file: string): unknown {
  if (!checked.has(file)) checked.set(file, parseDataFile(file, dataText(file), dataSchema(file)));
  return checked.get(file);
}
