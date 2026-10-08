/**
 * Criterion 3, step 1: export the two inputs for the blind labelers.
 *
 * Spec: `Dropbox/_fleet/specs/2026-09-24-upt-criterion3-design.md` §3, §4 and §9 (Mothership).
 *
 * - `corpus.json`: every canonical L-layer entry (`src/canonical/entries/*.ts`) as
 *   `{ id, text, expr? }`. `text` is the name, the domain and the assumptions, one per line; `expr`
 *   is the `scalarAst` when present. `partnerBridges`, `restatesBridge`, `model` and every other field
 *   are left out: they name atlas bridges or models, or carry nothing a labeler reads.
 * - `queries.json`: every frozen benchmark item (`tests/fixtures/atlas/benchmark/public/items.json`)
 *   as `{ id, text, expr }`. `text` is the premises then the conclusion, one per line; `expr` is the
 *   item's `expr`. The verdict and answer fields (`claimedRelation`, `split`, `authorship`, `source`)
 *   and the machine fields are left out.
 * - The item ids and the file order are left out TOO. Measured: in 7 of the 8 authoring batches the
 *   first eight items are valid and the rest invalid, so an item id (`mb-waves-1-09`) or a position
 *   carries the verdict. Each query therefore gets an opaque id `q-NNN`, in the order of
 *   SHA-256(seed + item id). The map back to item ids (`queries-key.json`) stays in the repository
 *   and is NOT given to the labelers.
 * - `leakage-report.md`: every hit of an atlas bridge, model or rejection id, a `BE-` id, a canonical
 *   excluded-field value, or a verdict word, in any id, text or expression of either file. A scan
 *   that finds nothing proves nothing, so the report also runs the scanner on a control string that
 *   carries known tokens.
 * - `freeze.json`: the pinned commit, the SHA-256 of both files, the counts and the join rules.
 *   It records no git tree hash of the inputs: nothing read one, a squash merge drops the commit it
 *   was taken at, and every later edit under `src/canonical` made it stale. The SHA-256 binds the
 *   files, and `tests/tools/criterion3-export.test.ts` binds them to a fresh export of the registry.
 *
 * Run from a tree whose inputs match HEAD (the export refuses otherwise, so the pin is true):
 *   bun tools/criterion3-export/export.ts [--copy <dir>]
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CanonicalEquation } from '../../src/canonical/canonical-equation.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';

/** A corpus record, in the shape `src/atlas/benchmark/baselines.ts` scores. */
export interface CorpusRecord {
  readonly id: string;
  readonly text: string;
  readonly expr?: ExprNode;
}

/** A query record: an opaque id, the claim as a reader sees it, and its expression. */
export interface QueryRecord {
  readonly id: string;
  readonly text: string;
  readonly expr: ExprNode;
}

/** The fields of a frozen item that the export reads; every other field is ignored. */
export interface ExportItem {
  readonly id: string;
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly expr: ExprNode;
}

/** One leakage hit. */
export interface LeakHit {
  readonly record: string;
  readonly field: 'id' | 'text' | 'expr';
  readonly token: string;
  readonly tokenClass: TokenClass;
  readonly context: string;
}

/** `id`: must have zero hits. `verdict` and `provenance`: listed for review. */
export type TokenClass = 'id' | 'verdict' | 'provenance';

/** One search token. `pattern` is matched case-insensitively, as a whole word. */
export interface LeakToken {
  readonly token: string;
  readonly tokenClass: TokenClass;
  readonly pattern: RegExp;
}

/** The seed of the query order. Changing it changes `queries.json` and its hash. */
export const QUERY_ORDER_SEED = 'upt-criterion3-2026-09-24';

/** The join rules, recorded in `freeze.json` so the texts can be rebuilt and checked. */
export const JOIN_RULES = {
  corpus: 'name, domain, then each assumption, joined by "\\n"',
  queries: 'each premise, then the conclusion, joined by "\\n"',
} as const;

/** A corpus record from a canonical entry: name, domain, assumptions; `scalarAst` as `expr`. */
export function corpusRecord(e: CanonicalEquation): CorpusRecord {
  const text = [e.name, e.domain, ...e.assumptions].join('\n');
  return e.scalarAst ? { id: e.id, text, expr: e.scalarAst } : { id: e.id, text };
}

/** The corpus, in registry order. */
export function buildCorpus(entries: readonly CanonicalEquation[]): CorpusRecord[] {
  const ids = new Set<string>();
  for (const e of entries) {
    if (ids.has(e.id)) throw new Error(`duplicate canonical id ${e.id}`);
    ids.add(e.id);
  }
  return entries.map(corpusRecord);
}

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/**
 * The queries in the order of SHA-256(seed + item id), with opaque ids `q-001`…, and the key that
 * maps each opaque id back to its item id.
 */
export function buildQueries(items: readonly ExportItem[], seed = QUERY_ORDER_SEED): { queries: QueryRecord[]; key: Record<string, string> } {
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) throw new Error('duplicate item id');
  const ordered = [...items].sort((a, b) => (sha256(seed + a.id) < sha256(seed + b.id) ? -1 : 1));
  const width = Math.max(3, String(ordered.length).length);
  const key: Record<string, string> = {};
  const queries = ordered.map((item, n) => {
    const id = `q-${String(n + 1).padStart(width, '0')}`;
    key[id] = item.id;
    return { id, text: [...item.premises, item.conclusion].join('\n'), expr: item.expr };
  });
  return { queries, key };
}

/**
 * A whole-word, case-insensitive pattern. A hyphen or underscore in the token also matches a space,
 * a hyphen, an underscore or nothing, because "false-inverse", "false inverse" and "falseinverse"
 * are all renderings of one token.
 */
export function tokenPattern(token: string): RegExp {
  const parts = token.split(/[-_\s]+/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![A-Za-z0-9])${parts.join('[-_\\s]?')}(?![A-Za-z0-9])`, 'gi');
}

/** Every string in an expression tree: symbol names and any other string field. */
export function exprStrings(node: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, k?: string): void => {
    if (typeof v === 'string') {
      if (k !== 'kind' && k !== 'op') out.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, kk);
  };
  walk(node);
  return out;
}

/** Scan ids, texts and expression strings of the records for every token. */
export function scanLeakage(records: readonly (CorpusRecord | QueryRecord)[], tokens: readonly LeakToken[]): LeakHit[] {
  const hits: LeakHit[] = [];
  for (const r of records) {
    const fields: [LeakHit['field'], string][] = [
      ['id', r.id],
      ['text', r.text],
      ...(r.expr ? exprStrings(r.expr).map((s): [LeakHit['field'], string] => ['expr', s]) : []),
    ];
    for (const [field, value] of fields) {
      for (const t of tokens) {
        for (const m of value.matchAll(t.pattern)) {
          const i = m.index ?? 0;
          const context = value.slice(Math.max(0, i - 40), i + m[0].length + 40).replace(/\s+/g, ' ');
          hits.push({ record: r.id, field, token: t.token, tokenClass: t.tokenClass, context });
        }
      }
    }
  }
  return hits;
}

/** The inputs from which the leak tokens are drawn. */
export interface TokenSources {
  readonly atlasIds: readonly string[];
  readonly excludedCanonicalValues: readonly string[];
  readonly itemIds: readonly string[];
  readonly claimedRelations: readonly string[];
  readonly splits: readonly string[];
  readonly authorships: readonly string[];
  readonly labelKinds: readonly string[];
  readonly failureKinds: readonly string[];
  readonly sources: readonly string[];
}

/** The leak tokens: ids (must not occur) and verdict and provenance words (listed for review). */
export function leakTokens(s: TokenSources): LeakToken[] {
  const out = new Map<string, LeakToken>();
  const add = (token: string, tokenClass: TokenClass, pattern = tokenPattern(token)): void => {
    const k = `${tokenClass}:${token.toLowerCase()}`;
    if (!out.has(k) && token.trim().length > 0) out.set(k, { token, tokenClass, pattern });
  };
  // Uppercase BE with any separator, or lowercase be only with a hyphen or underscore: a
  // case-insensitive "be 2" would match ordinary prose ("should be 2").
  add('BE-<n>', 'id', /(?<![A-Za-z0-9])(?:BE[-_\s]?|be[-_])\d{1,3}(?![0-9])/g);
  // A canonical entry names a catalog bridge by its bare number ("12" for BE-12). As a leak it would
  // read "BE-12", which the BE-<n> pattern above finds; a bare "12" would only match physics numbers.
  const named = s.excludedCanonicalValues.filter((v) => !/^\d+$/.test(v));
  for (const t of [...s.atlasIds, ...named, ...s.itemIds]) add(t, 'id');
  for (const t of [...s.claimedRelations, ...s.splits, ...s.authorships, ...s.labelKinds, ...s.failureKinds]) add(t, 'verdict');
  for (const t of s.sources) add(t, 'provenance');
  return [...out.values()];
}

/** The control string, and the tokens the scanner must find in it. */
export const CONTROL = {
  text: 'Control: see be-35, model-spring and ab-spring-lc; a false inverse, an omitted-premise; this is invalid.',
  mustFind: ['BE-<n>', 'model-spring', 'ab-spring-lc', 'false-inverse', 'omitted-premise', 'invalid'],
} as const;

/** The report, as Markdown. */
export function leakageReport(
  corpusHits: readonly LeakHit[],
  queryHits: readonly LeakHit[],
  tokens: readonly LeakToken[],
  controlFound: readonly string[],
): string {
  const rows = (hits: readonly LeakHit[]) =>
    hits.length === 0
      ? ['None.']
      : ['| Record | Field | Token | Class | Context |', '|---|---|---|---|---|', ...hits.map((h) => `| ${h.record} | ${h.field} | ${h.token} | ${h.tokenClass} | ${h.context.replace(/\|/g, '\\|')} |`)];
  const count = (hits: readonly LeakHit[], c: TokenClass) => hits.filter((h) => h.tokenClass === c).length;
  const missing = CONTROL.mustFind.filter((t) => !controlFound.includes(t));
  return [
    '# Criterion 3 inputs - leakage report',
    '',
    'Generated by `bun tools/criterion3-export/export.ts`. Do not edit by hand.',
    '',
    `Tokens searched: ${tokens.length} (${tokens.filter((t) => t.tokenClass === 'id').length} id, ${tokens.filter((t) => t.tokenClass === 'verdict').length} verdict, ${tokens.filter((t) => t.tokenClass === 'provenance').length} provenance), whole-word and case-insensitive, in every id, text and expression string.`,
    '',
    `**Control:** the scanner, run on "${CONTROL.text}", found ${controlFound.length} of the ${CONTROL.mustFind.length} planted tokens${missing.length ? ` (MISSED: ${missing.join(', ')})` : ''}.`,
    '',
    '| File | id hits (must be 0) | verdict-word hits | provenance hits |',
    '|---|---|---|---|',
    `| corpus.json | ${count(corpusHits, 'id')} | ${count(corpusHits, 'verdict')} | ${count(corpusHits, 'provenance')} |`,
    `| queries.json | ${count(queryHits, 'id')} | ${count(queryHits, 'verdict')} | ${count(queryHits, 'provenance')} |`,
    '',
    'A verdict word in a text is not by itself leakage: "approximation" or "valid" can be natural',
    'physics prose. Each hit is listed so a reader can judge it. A canonical entry names a catalog',
    'bridge by its bare number; that number is searched in its BE-<n> form, not as a bare number.',
    '',
    '## corpus.json hits',
    '',
    ...rows(corpusHits),
    '',
    '## queries.json hits',
    '',
    ...rows(queryHits),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- I/O (the command line)

function git(root: string, args: readonly string[]): string {
  const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

async function main(argv: readonly string[]): Promise<number> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const inputs = ['src/canonical', 'tests/fixtures/atlas/benchmark/public/items.json'];
  const dirty = git(root, ['status', '--porcelain', '--', ...inputs]);
  if (dirty) {
    console.error(`refusing to export: the inputs differ from HEAD, so the pin would be false:\n${dirty}`);
    return 1;
  }
  const commit = git(root, ['rev-parse', 'HEAD']);

  const { CANONICAL_EQUATIONS } = await import('../../src/canonical/registry.js');
  const { ATLAS_FAMILIES } = await import('../../src/atlas/families.js');
  const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const items = read('tests/fixtures/atlas/benchmark/public/items.json') as (ExportItem & Record<string, unknown>)[];
  // The answer key is read ONLY for its vocabulary (the kind and failure-kind words), never per item.
  const labels = read('tests/fixtures/atlas/benchmark/scorer/labels.json') as { kind: string; failureKind?: string }[];

  const corpus = buildCorpus(CANONICAL_EQUATIONS);
  const { queries, key } = buildQueries(items);

  const uniq = (xs: readonly (string | undefined)[]) => [...new Set(xs.filter((x): x is string => typeof x === 'string'))].sort();
  const tokens = leakTokens({
    atlasIds: uniq(ATLAS_FAMILIES.flatMap((f) => [...f.models.map((m) => m.id), ...f.bridges.map((b) => b.id), ...f.rejections.map((r) => r.id)])),
    excludedCanonicalValues: uniq(CANONICAL_EQUATIONS.flatMap((e) => [...e.partnerBridges, e.restatesBridge, e.model])),
    itemIds: uniq(items.map((i) => i.id)),
    claimedRelations: uniq(items.map((i) => i.claimedRelation as string)),
    splits: uniq(items.map((i) => i.split as string)),
    authorships: uniq(items.map((i) => i.authorship as string)),
    labelKinds: uniq(labels.map((l) => l.kind)),
    failureKinds: uniq(labels.map((l) => l.failureKind)),
    sources: uniq(items.map((i) => i.source as string)),
  });
  const controlFound = uniq(scanLeakage([{ id: 'control', text: CONTROL.text }], tokens).map((h) => h.token));
  const corpusHits = scanLeakage(corpus, tokens);
  const queryHits = scanLeakage(queries, tokens);

  const outDir = join(root, 'docs/research/criterion3');
  mkdirSync(outDir, { recursive: true });
  const corpusText = json(corpus);
  const queriesText = json(queries);
  const report = leakageReport(corpusHits, queryHits, tokens, controlFound);
  const freeze = {
    pinnedCommit: commit,
    files: {
      'corpus.json': { sha256: sha256(corpusText), records: corpus.length, withExpr: corpus.filter((r) => r.expr).length },
      'queries.json': { sha256: sha256(queriesText), records: queries.length },
    },
    queryOrderSeed: QUERY_ORDER_SEED,
    joinRules: JOIN_RULES,
    excluded: {
      corpus: ['partnerBridges', 'restatesBridge', 'model', 'and every field other than id, name, domain, assumptions, scalarAst'],
      queries: ['the item id and the file order', 'claimedRelation', 'split', 'authorship', 'source', 'family', 'sideConditions', 'conventions', 'regime', 'renamedVariant'],
    },
    leakage: {
      idHits: corpusHits.concat(queryHits).filter((h) => h.tokenClass === 'id').length,
      verdictHits: corpusHits.concat(queryHits).filter((h) => h.tokenClass === 'verdict').length,
      provenanceHits: corpusHits.concat(queryHits).filter((h) => h.tokenClass === 'provenance').length,
      controlFound: `${controlFound.length}/${CONTROL.mustFind.length}`,
    },
  };
  writeFileSync(join(outDir, 'corpus.json'), corpusText);
  writeFileSync(join(outDir, 'queries.json'), queriesText);
  writeFileSync(join(outDir, 'queries-key.json'), json(key));
  writeFileSync(join(outDir, 'freeze.json'), json(freeze));
  writeFileSync(join(outDir, 'leakage-report.md'), report);

  const copyIdx = argv.indexOf('--copy');
  if (copyIdx >= 0) {
    const dest = argv[copyIdx + 1];
    if (!dest) throw new Error('--copy needs a directory');
    mkdirSync(dest, { recursive: true });
    // The key is NOT copied: it maps opaque ids back to item ids, which carry the verdict.
    for (const f of ['corpus.json', 'queries.json', 'freeze.json', 'leakage-report.md']) copyFileSync(join(outDir, f), join(dest, f));
  }
  console.log(json(freeze));
  const missing = CONTROL.mustFind.filter((t) => !controlFound.includes(t));
  return freeze.leakage.idHits === 0 && missing.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
