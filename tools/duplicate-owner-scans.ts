/**
 * Scans the integration design registers in `docs:deps`.
 *
 * A hit is a second owner. The generated file `docs/architecture/duplicate-owners.md`
 * is this scan's output. The architecture test fails when the list is not empty.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function walkTs(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules') continue;
      walkTs(path, out);
      continue;
    }
    if (name.endsWith('.ts')) out.push(path);
  }
}

/** The `{ ... }` of `function name(`, not a `{` inside the parameter list. */
function braceBody(source: string, name: string): string | null {
  const at = source.indexOf(`function ${name}`);
  if (at < 0) return null;
  let i = at + `function ${name}`.length;
  while (source[i] === ' ' || source[i] === '\n' || source[i] === '\r') i += 1;
  if (source[i] !== '(') return null;
  let paren = 0;
  let brace = 0;
  let open = -1;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '(') paren += 1;
    else if (c === ')') paren -= 1;
    else if (c === '{' && paren === 0) {
      if (open < 0) open = i;
      brace += 1;
    } else if (c === '}' && paren === 0 && open >= 0) {
      brace -= 1;
      if (brace === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/** The temperature spelling check, and calls of `alignTemperatureBinding` outside `readNamedBinding`. */
export function temperatureOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  const owner = 'src/dimensional/formula-names.ts';
  const reader = 'src/numerical/binding-value.ts';
  const definitions: string[] = [];
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    if (text.includes('TEMPERATURE_BINDING_NAMES')) hits.push(`${rel} still names TEMPERATURE_BINDING_NAMES`);
    if (/function\s+isTemperatureName\s*\(/.test(text)) definitions.push(rel);
    if (rel === reader) {
      const body = braceBody(text, 'readNamedBinding');
      if (body === null || !body.includes('alignTemperatureBinding(')) {
        hits.push('readNamedBinding does not call alignTemperatureBinding');
      }
      const stripped = body === null ? text : text.replace(body, '');
      const withoutDef = stripped.replace(/function\s+alignTemperatureBinding\s*\(/, 'function alignTemperatureBinding ');
      if (/alignTemperatureBinding\s*\(/.test(withoutDef)) {
        hits.push('alignTemperatureBinding is called outside readNamedBinding');
      }
      if (!text.includes('isTemperatureName(')) hits.push(`${reader} does not call isTemperatureName`);
    } else if (text.includes('alignTemperatureBinding')) {
      hits.push(`${rel} names the temperature reader`);
    }
  }
  if (definitions.length !== 1 || definitions[0] !== owner) {
    hits.push(
      definitions.length === 0
        ? 'no function isTemperatureName'
        : `function isTemperatureName is defined in ${definitions.join(', ')}`,
    );
  }
  return hits;
}

const SEPARATE_NAME_TABLES = ['FORMULA_ALIASES', 'ENTRY_TARGET_ALIASES', 'QUANTITY_SYNONYMS'] as const;
const DELETED_RESOLVERS = ['resolveToCatalogName', 'rewriteInputKey', 'formulaSpellings', 'synonymInCatalog'] as const;

/**
 * A second `function editDistance`, a second name resolver, or one of the
 * name tables that the synonym groups replaced.
 * `resolveQuantityName` and `SYNONYM_GROUPS` live in `src/dimensional/formula-names.ts`.
 * `editDistance` lives in `src/composition/aliases.ts`.
 */
export function nameTableOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  const distances: string[] = [];
  const resolvers: string[] = [];
  const groups: string[] = [];
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    for (const name of SEPARATE_NAME_TABLES) {
      if (new RegExp(`\\b${name}\\b`).test(text)) hits.push(`${rel} still names ${name}`);
    }
    for (const name of DELETED_RESOLVERS) {
      if (new RegExp(`\\b${name}\\b`).test(text)) hits.push(`${rel} still names ${name}`);
    }
    if (/function\s+editDistance\s*\(/.test(text)) distances.push(rel);
    if (/function\s+resolveQuantityName\s*\(/.test(text)) resolvers.push(rel);
    if (/export\s+const\s+SYNONYM_GROUPS\b/.test(text)) groups.push(rel);
  }
  const distanceOwner = 'src/composition/aliases.ts';
  const nameOwner = 'src/dimensional/formula-names.ts';
  if (distances.length !== 1 || distances[0] !== distanceOwner) {
    hits.push(
      distances.length === 0
        ? 'no function editDistance'
        : `function editDistance is defined in ${distances.join(', ')}`,
    );
  }
  if (resolvers.length !== 1 || resolvers[0] !== nameOwner) {
    hits.push(
      resolvers.length === 0
        ? 'no function resolveQuantityName'
        : `function resolveQuantityName is defined in ${resolvers.join(', ')}`,
    );
  }
  if (groups.length !== 1 || groups[0] !== nameOwner) {
    hits.push(
      groups.length === 0
        ? 'no SYNONYM_GROUPS'
        : `SYNONYM_GROUPS is defined in ${groups.join(', ')}`,
    );
  }
  const aliasesPath = join(root, 'src/composition/aliases.ts');
  if (!existsSync(aliasesPath)) {
    hits.push('NAME_TABLE.synonyms is not SYNONYM_GROUPS');
    return hits;
  }
  const aliases = readFileSync(aliasesPath, 'utf8');
  if (!aliases.includes('synonyms: SYNONYM_GROUPS')) {
    hits.push('NAME_TABLE.synonyms is not SYNONYM_GROUPS');
  }
  return hits;
}

/**
 * `canonicalPrefactor(…) ?? 1` and `recordedDimensionlessCoefficient(…) ?? 1`
 * invent a sourced 1. `makeEvaluate` calls `canonicalGroupPrefactor`.
 */
export function prefactorOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  const invented =
    /canonicalPrefactor\s*\([^)]*\)\s*\?\?\s*1|recordedDimensionlessCoefficient\s*\([^)]*\)\s*\?\?\s*1/;
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    if (invented.test(text)) hits.push(`${rel} combines a missing prefactor with ?? 1`);
  }
  const graphPath = join(root, 'src/composition/canonical-graph.ts');
  if (!existsSync(graphPath)) return hits;
  const body = braceBody(readFileSync(graphPath, 'utf8'), 'makeEvaluate');
  if (body === null || !body.includes('canonicalGroupPrefactor(')) {
    hits.push('makeEvaluate does not call canonicalGroupPrefactor');
  }
  return hits;
}

/**
 * A hand-maintained `BRIDGE_EQUATIONS = [` is a second catalog. The projection
 * is `registerBridge` then `equations()`.
 */
const BRIDGE_LITERAL = /BRIDGE_EQUATIONS\s*(?::[^=]+)?=\s*\[/;

/** True when `source` assigns `BRIDGE_EQUATIONS` from an array literal. */
export function bridgeEquationLiteral(source: string): boolean {
  return BRIDGE_LITERAL.test(source);
}

/** A `function canonicalJson(` or `function captureEnvironment(` is a definition. A re-export is not. */
export function jsonDefinition(source: string, name: 'canonicalJson' | 'captureEnvironment'): boolean {
  return new RegExp(`function\\s+${name}\\s*\\(`).test(source);
}

/**
 * `canonicalJson` and `captureEnvironment` are defined in one module.
 * A second file, or a missing owner, is a hit.
 */
export function jsonOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const owner = 'src/composition/canonical-json.ts';
  const hits: string[] = [];
  for (const name of ['canonicalJson', 'captureEnvironment'] as const) {
    const definitions: string[] = [];
    for (const file of files) {
      const rel = relative(root, file).replaceAll('\\', '/');
      if (jsonDefinition(readFileSync(file, 'utf8'), name)) definitions.push(rel);
    }
    if (definitions.length !== 1 || definitions[0] !== owner) {
      hits.push(
        definitions.length === 0
          ? `no function ${name}`
          : `function ${name} is defined in ${definitions.join(', ')}`,
      );
    }
  }
  return hits;
}

/** Files under `src/` that still assign `BRIDGE_EQUATIONS` from a literal. */
export function bridgeRegistryHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  for (const file of files) {
    if (bridgeEquationLiteral(readFileSync(file, 'utf8'))) {
      const rel = relative(root, file).replaceAll('\\', '/');
      hits.push(`${rel} assigns BRIDGE_EQUATIONS from a literal`);
    }
  }
  return hits;
}

/** The classical RK4 update `(h / 6) *`. A comment that names the weights is a hit too. */
export function classicalRk4Literal(source: string): boolean {
  return /\(h \/ 6\) \*/.test(source);
}

const MASS_DENSITY_OWNER = 'src/dimensional/types.ts';

/** A `const MASS_DENSITY` assignment. `export { MASS_DENSITY } from` is not one. */
export function massDensityAssignment(source: string): boolean {
  return /(?:export\s+)?const\s+MASS_DENSITY\b/.test(source);
}

/**
 * One `const MASS_DENSITY`, and it is the dimensional export.
 * A second assignment, or a missing owner, is a hit.
 */
export function massDensityHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const assignments: string[] = [];
  for (const file of files) {
    if (massDensityAssignment(readFileSync(file, 'utf8'))) {
      assignments.push(relative(root, file).replaceAll('\\', '/'));
    }
  }
  if (assignments.length === 1 && assignments[0] === MASS_DENSITY_OWNER) return [];
  if (assignments.length === 0) return ['no const MASS_DENSITY'];
  return assignments.map((file) => `${file} assigns MASS_DENSITY`);
}

/** Files under `src/` that still update a state with the classical RK4 weights. */
export function classicalRk4Hits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  for (const file of files) {
    if (classicalRk4Literal(readFileSync(file, 'utf8'))) {
      const rel = relative(root, file).replaceAll('\\', '/');
      hits.push(`${rel} still steps with (h / 6) *`);
    }
  }
  return hits;
}

/** `assertSameCarrierSign` has no caller except `applyCarrierSignPolicy`. */
export function signOwnerHits(root: string): string[] {
  const policyPath = join(root, 'src/bridges/carrier-sign.ts');
  if (!existsSync(policyPath)) return [];
  const hits: string[] = [];
  const policy = readFileSync(policyPath, 'utf8');
  const body = braceBody(policy, 'applyCarrierSignPolicy');
  if (body === null || !body.includes('assertSameCarrierSign(')) {
    hits.push('applyCarrierSignPolicy does not call assertSameCarrierSign');
  }
  const outside = body === null ? policy : policy.replace(body, '');
  const withoutDef = outside.replace(/function\s+assertSameCarrierSign\s*\(/, 'function assertSameCarrierSign ');
  if (/assertSameCarrierSign\s*\(/.test(withoutDef)) {
    hits.push('assertSameCarrierSign is called outside applyCarrierSignPolicy');
  }
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    if (rel === 'src/bridges/carrier-sign.ts') continue;
    const text = readFileSync(file, 'utf8');
    if (/assertSameCarrierSign\s*\(/.test(text)) hits.push(`${rel} calls assertSameCarrierSign`);
    if (/sameCarrierSign\s*\(/.test(text)) hits.push(`${rel} calls sameCarrierSign`);
  }
  const graph = readFileSync(join(root, 'src/composition/canonical-graph.ts'), 'utf8');
  if (/assertCarrierProductSign\s*\(/.test(graph)) hits.push('canonical-graph calls assertCarrierProductSign');
  if (/magnitudeBase\s*\(/.test(graph)) hits.push('canonical-graph calls magnitudeBase');
  return hits;
}

/** The committed duplicate-owner report. */
export function renderDuplicateOwners(root: string): string {
  const temperature = temperatureOwnerHits(root);
  const names = nameTableOwnerHits(root);
  const signs = signOwnerHits(root);
  const prefactors = prefactorOwnerHits(root);
  const bridges = bridgeRegistryHits(root);
  const json = jsonOwnerHits(root);
  const rk4 = classicalRk4Hits(root);
  const density = massDensityHits(root);
  const temperatureBody =
    temperature.length === 0
      ? '`function isTemperatureName` is defined only in `src/dimensional/formula-names.ts`. `alignTemperatureBinding` is called only from `readNamedBinding`. `TEMPERATURE_BINDING_NAMES` is not a second list.\n'
      : temperature.map((hit) => `- ${hit}`).join('\n') + '\n';
  const nameBody =
    names.length === 0
      ? '`function resolveQuantityName` and `SYNONYM_GROUPS` are defined only in `src/dimensional/formula-names.ts`. `function editDistance` is defined only in `src/composition/aliases.ts`. `resolveToCatalogName`, `rewriteInputKey`, `formulaSpellings`, and `synonymInCatalog` are not separate resolvers.\n'
      : names.map((hit) => `- ${hit}`).join('\n') + '\n';
  const signBody =
    signs.length === 0
      ? '`assertSameCarrierSign` is called only from `applyCarrierSignPolicy`. No second owner.\n'
      : signs.map((hit) => `- ${hit}`).join('\n') + '\n';
  const prefactorBody =
    prefactors.length === 0
      ? '`canonicalPrefactor(…) ?? 1` does not occur. `makeEvaluate` calls `canonicalGroupPrefactor`.\n'
      : prefactors.map((hit) => `- ${hit}`).join('\n') + '\n';
  const bridgeBody =
    bridges.length === 0
      ? '`BRIDGE_EQUATIONS` is the projection of the catalog file. No hand-maintained catalog literal.\n'
      : bridges.map((hit) => `- ${hit}`).join('\n') + '\n';
  const jsonBody =
    json.length === 0
      ? '`function canonicalJson` and `function captureEnvironment` are defined only in `src/composition/canonical-json.ts`.\n'
      : json.map((hit) => `- ${hit}`).join('\n') + '\n';
  const rk4Body =
    rk4.length === 0
      ? 'No classical RK4 weight `(h / 6) *` remains under `src/`.\n'
      : rk4.map((hit) => `- ${hit}`).join('\n') + '\n';
  const densityBody =
    density.length === 0
      ? '`const MASS_DENSITY` is defined only in `src/dimensional/types.ts`.\n'
      : density.map((hit) => `- ${hit}`).join('\n') + '\n';
  return (
    '<!-- repo-map:no-verification -->\n' +
    '<!-- GENERATED FILE -- do not edit by hand. Edit the generator at\n' +
    '     tools/create-dependency-graph/create-dependency-graph.ts, then run\n' +
    '     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->\n\n' +
    '# Duplicate owners\n\n' +
    'The live list of a second owner for a concept the integration design assigned once.\n' +
    '`docs/architecture/INTEGRATION_MAP.md` points here and does not copy these rows.\n\n' +
    '## Hits\n\n' +
    temperatureBody +
    '\n' +
    nameBody +
    '\n' +
    signBody +
    '\n' +
    prefactorBody +
    '\n' +
    bridgeBody +
    '\n' +
    jsonBody +
    '\n' +
    rk4Body +
    '\n' +
    densityBody
  );
}
