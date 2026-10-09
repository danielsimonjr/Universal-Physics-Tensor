/**
 * A JSON Schema reader for the keyword subset the repository's data schemas use.
 *
 * The library adds no runtime dependency for this, so the schema a data file
 * names is checked here, at load, and not only by a test. A keyword outside
 * the subset is an error in the schema, not a keyword silently ignored, so a
 * schema cannot state a rule this reader does not enforce.
 *
 * Subset: `type` (a name or an array of names), `required`, `properties`,
 * `additionalProperties` (boolean or schema), `propertyNames`, `items`,
 * `minItems`, `maxItems`, `uniqueItems`, `minLength`, `pattern`, `minimum`,
 * `enum`, `const`, `if`/`then`/`else`, and `$ref` to `#/$defs/<name>` or `#/definitions/<name>`. `$schema`, `$id`, `$defs`,
 * `title` and `description` are annotations.
 *
 * @module core/json-schema
 */

/** A JSON Schema document or subschema, as parsed from JSON. @internal */
export type JsonSchema = { readonly [keyword: string]: unknown };

const ANNOTATIONS = new Set(['$schema', '$id', '$defs', 'definitions', 'title', 'description']);
const KEYWORDS = new Set([
  'type',
  'required',
  'properties',
  'additionalProperties',
  'propertyNames',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minLength',
  'pattern',
  'minimum',
  'enum',
  'const',
  '$ref',
  'if',
  'then',
  'else',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case 'object':
      return isObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    default:
      throw new Error(`json-schema: unsupported type '${type}'`);
  }
}

function resolveRef(root: JsonSchema, ref: string): JsonSchema {
  // `#/$defs/<name>` (2019-09 and later) or `#/definitions/<name>` (draft-07): both are a
  // local definition table and nothing else is resolved.
  const m = /^#\/(\$defs|definitions)\/([^/]+)$/.exec(ref);
  const defs = m === null ? undefined : root[m[1]!];
  const target = m === null || !isObject(defs) ? undefined : defs[m[2]!];
  if (!isObject(target)) throw new Error(`json-schema: unresolved $ref '${ref}'`);
  return target;
}

function check(root: JsonSchema, schema: JsonSchema, value: unknown, path: string, problems: string[]): void {
  for (const keyword of Object.keys(schema)) {
    if (!KEYWORDS.has(keyword) && !ANNOTATIONS.has(keyword)) {
      throw new Error(`json-schema: keyword '${keyword}' at ${path} is outside the supported subset`);
    }
  }
  if (typeof schema['$ref'] === 'string') check(root, resolveRef(root, schema['$ref']), value, path, problems);
  // `if`/`then`/`else`: the branch whose condition the value meets is checked; the condition's
  // own problems are not reported.
  if (isObject(schema['if'])) {
    const condition: string[] = [];
    check(root, schema['if'], value, path, condition);
    const branch = condition.length === 0 ? schema['then'] : schema['else'];
    if (isObject(branch)) check(root, branch, value, path, problems);
  }
  if (schema['type'] !== undefined) {
    const types = Array.isArray(schema['type']) ? (schema['type'] as unknown[]) : [schema['type']];
    if (types.length === 0 || types.some((type) => typeof type !== 'string')) {
      throw new Error(`json-schema: 'type' at ${path} is not a type name or an array of type names`);
    }
    if (!types.some((type) => typeMatches(type as string, value))) {
      problems.push(`${path}: expected ${types.join(' or ')}`);
      return;
    }
  }
  if ('const' in schema && JSON.stringify(schema['const']) !== JSON.stringify(value)) {
    problems.push(`${path}: expected ${JSON.stringify(schema['const'])}`);
  }
  if (Array.isArray(schema['enum']) && !schema['enum'].some((option) => JSON.stringify(option) === JSON.stringify(value))) {
    problems.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema['enum'])}`);
  }
  if (typeof value === 'number' && typeof schema['minimum'] === 'number' && value < schema['minimum']) {
    problems.push(`${path}: ${value} is less than ${schema['minimum']}`);
  }
  if (typeof value === 'string') {
    if (typeof schema['minLength'] === 'number' && [...value].length < schema['minLength']) {
      problems.push(`${path}: shorter than ${schema['minLength']}`);
    }
    if (typeof schema['pattern'] === 'string' && !new RegExp(schema['pattern'], 'u').test(value)) {
      problems.push(`${path}: '${value}' does not match ${schema['pattern']}`);
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema['minItems'] === 'number' && value.length < schema['minItems']) {
      problems.push(`${path}: fewer than ${schema['minItems']} items`);
    }
    if (typeof schema['maxItems'] === 'number' && value.length > schema['maxItems']) {
      problems.push(`${path}: more than ${schema['maxItems']} items`);
    }
    if (schema['uniqueItems'] === true) {
      const seen = new Set(value.map((item) => JSON.stringify(item)));
      if (seen.size !== value.length) problems.push(`${path}: items are not unique`);
    }
    if (isObject(schema['items'])) {
      const items = schema['items'];
      value.forEach((item, i) => check(root, items, item, `${path}[${i}]`, problems));
    } else if (Array.isArray(schema['items'])) {
      // A tuple: each position has its own schema; a position past the tuple is unchecked.
      (schema['items'] as unknown[]).forEach((itemSchema, i) => {
        if (!isObject(itemSchema)) throw new Error(`json-schema: items[${i}] at ${path} is not a schema`);
        if (i < value.length) check(root, itemSchema, value[i], `${path}[${i}]`, problems);
      });
    }
  }
  if (isObject(value)) {
    const properties = isObject(schema['properties']) ? schema['properties'] : {};
    if (Array.isArray(schema['required'])) {
      for (const key of schema['required'] as readonly string[]) {
        if (!Object.hasOwn(value, key)) problems.push(`${path}: missing '${key}'`);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      const where = `${path}.${key}`;
      if (isObject(schema['propertyNames'])) check(root, schema['propertyNames'], key, `${where} (name)`, problems);
      // Own properties only: a `__proto__` key must not resolve to Object.prototype.
      const declared = Object.hasOwn(properties, key) ? properties[key] : undefined;
      if (isObject(declared)) {
        check(root, declared, child, where, problems);
      } else if (schema['additionalProperties'] === false) {
        problems.push(`${where}: unexpected property`);
      } else if (isObject(schema['additionalProperties'])) {
        check(root, schema['additionalProperties'], child, where, problems);
      }
    }
  }
}

/**
 * Every place `value` breaks `schema`, as `$.path: reason` lines. Empty when it conforms.
 * Throws when the schema uses a keyword outside the subset.
 * @internal
 */
export function schemaProblems(schema: JsonSchema, value: unknown): string[] {
  const problems: string[] = [];
  check(schema, schema, value, '$', problems);
  return problems;
}
