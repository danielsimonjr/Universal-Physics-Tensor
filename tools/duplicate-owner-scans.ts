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

/** Files other than the owner, and calls of `alignTemperatureBinding` outside `readNamedBinding`. */
export function temperatureOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  const owner = 'src/numerical/binding-value.ts';
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    if (rel !== owner) {
      if (text.includes('alignTemperatureBinding') || text.includes('TEMPERATURE_BINDING_NAMES')) {
        hits.push(`${rel} names the temperature reader`);
      }
      continue;
    }
    if (!text.includes('TEMPERATURE_BINDING_NAMES')) {
      hits.push(`${owner} does not define TEMPERATURE_BINDING_NAMES`);
    }
    const body = braceBody(text, 'readNamedBinding');
    if (body === null || !body.includes('alignTemperatureBinding(')) {
      hits.push('readNamedBinding does not call alignTemperatureBinding');
    }
    const stripped = body === null ? text : text.replace(body, '');
    const withoutDef = stripped.replace(/function\s+alignTemperatureBinding\s*\(/, 'function alignTemperatureBinding ');
    if (/alignTemperatureBinding\s*\(/.test(withoutDef)) {
      hits.push('alignTemperatureBinding is called outside readNamedBinding');
    }
  }
  return hits;
}

const SEPARATE_NAME_TABLES = ['FORMULA_ALIASES', 'ENTRY_TARGET_ALIASES', 'QUANTITY_SYNONYMS'] as const;

/**
 * A second `function editDistance`, or one of the name tables that aliases.ts
 * replaced. The owner is `src/composition/aliases.ts`.
 */
export function nameTableOwnerHits(root: string): string[] {
  const files: string[] = [];
  walkTs(join(root, 'src'), files);
  const hits: string[] = [];
  const definitions: string[] = [];
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    for (const name of SEPARATE_NAME_TABLES) {
      if (new RegExp(`\\b${name}\\b`).test(text)) hits.push(`${rel} still names ${name}`);
    }
    if (/function\s+editDistance\s*\(/.test(text)) definitions.push(rel);
  }
  const owner = 'src/composition/aliases.ts';
  if (definitions.length !== 1 || definitions[0] !== owner) {
    hits.push(
      definitions.length === 0
        ? 'no function editDistance'
        : `function editDistance is defined in ${definitions.join(', ')}`,
    );
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
  const domain = readFileSync(join(root, 'src/composition/edges/applied-physicist.ts'), 'utf8');
  if (/sameCarrierSign\s*\(/.test(domain)) hits.push('the BE-70 domain calls sameCarrierSign');
  const einstein = readFileSync(join(root, 'src/bridges/be70-einstein-relation.ts'), 'utf8');
  if (/assertSameCarrierSign\s*\(/.test(einstein)) hits.push('evaluateEinsteinRelation calls assertSameCarrierSign');
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
  const temperatureBody =
    temperature.length === 0
      ? '`alignTemperatureBinding` and `TEMPERATURE_BINDING_NAMES` occur only in `src/numerical/binding-value.ts`. `readNamedBinding` is the only caller. No second owner.\n'
      : temperature.map((hit) => `- ${hit}`).join('\n') + '\n';
  const nameBody =
    names.length === 0
      ? '`function editDistance` is defined only in `src/composition/aliases.ts`. `FORMULA_ALIASES`, `ENTRY_TARGET_ALIASES`, and `QUANTITY_SYNONYMS` are not separate tables.\n'
      : names.map((hit) => `- ${hit}`).join('\n') + '\n';
  const signBody =
    signs.length === 0
      ? '`assertSameCarrierSign` is called only from `applyCarrierSignPolicy`. The BE-70 domain does not call `sameCarrierSign`. No second owner.\n'
      : signs.map((hit) => `- ${hit}`).join('\n') + '\n';
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
    signBody
  );
}
