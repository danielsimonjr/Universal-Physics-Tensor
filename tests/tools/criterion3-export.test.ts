/**
 * Criterion 3, step 1 (`tools/criterion3-export/`): the two inputs for the blind labelers.
 *
 * The labelers must not be able to read an answer or an atlas structure out of their inputs. These
 * tests pin what the export leaves out, check the leakage scanner on inputs it must flag (a scanner
 * that finds nothing proves nothing), and tie the frozen files in `docs/research/criterion3/` to
 * their recorded hashes and to a fresh export.
 */

import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCorpus,
  buildQueries,
  CONTROL,
  corpusRecord,
  leakTokens,
  QUERY_ORDER_SEED,
  scanLeakage,
  tokenPattern,
  type ExportItem,
  type TokenSources,
} from '../../tools/criterion3-export/export.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import type { CanonicalEquation } from '../../src/canonical/canonical-equation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');
const lfSha = (s: string) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');

const items = JSON.parse(read('tests/fixtures/atlas/benchmark/public/items.json')) as (ExportItem & Record<string, unknown>)[];
const leakyEntry = {
  ...CANONICAL_EQUATIONS.find((e) => e.scalarAst)!,
  partnerBridges: ['21'],
  restatesBridge: 'BE-21',
  model: 'model-spring',
} as CanonicalEquation;

const sources = (over: Partial<TokenSources> = {}): TokenSources => ({
  atlasIds: ['model-spring', 'ab-spring-lc'],
  excludedCanonicalValues: ['12'],
  itemIds: ['mb-waves-1-09'],
  claimedRelations: ['exact-equivalence'],
  splits: ['held-out'],
  authorships: ['independent'],
  labelKinds: ['valid', 'invalid'],
  failureKinds: ['false-inverse', 'omitted-premise'],
  sources: [],
  ...over,
});

describe('criterion 3 export — what the corpus leaves out', () => {
  it('keeps only id, text and expr; text is name, domain and assumptions', () => {
    const r = corpusRecord(leakyEntry);
    expect(Object.keys(r).sort()).toEqual(['expr', 'id', 'text']);
    expect(r.text).toBe([leakyEntry.name, leakyEntry.domain, ...leakyEntry.assumptions].join('\n'));
  });

  it('drops partnerBridges, restatesBridge and model, even when they are set', () => {
    const r = corpusRecord(leakyEntry);
    expect(JSON.stringify(r)).not.toContain('BE-21');
    expect(JSON.stringify(r)).not.toContain('model-spring');
  });

  it('exports every canonical entry once', () => {
    expect(buildCorpus(CANONICAL_EQUATIONS)).toHaveLength(CANONICAL_EQUATIONS.length);
    expect(() => buildCorpus([leakyEntry, leakyEntry])).toThrow(/duplicate/);
  });
});

describe('criterion 3 export — what the queries leave out', () => {
  const { queries, key } = buildQueries(items);

  it('keeps only an opaque id, the premises and conclusion, and expr', () => {
    for (const q of queries) {
      expect(Object.keys(q).sort()).toEqual(['expr', 'id', 'text']);
      expect(q.id).toMatch(/^q-\d{3}$/);
    }
    const item = items.find((i) => i.id === key[queries[0]!.id])!;
    expect(queries[0]!.text).toBe([...item.premises, item.conclusion].join('\n'));
  });

  it('does not carry the item id, whose number gives the verdict away', () => {
    // Measured: in 7 of 8 authoring batches items 01-08 are valid and 09-16 invalid.
    for (const q of queries) expect(q.text).not.toContain(key[q.id]!);
    expect(new Set(Object.values(key))).toEqual(new Set(items.map((i) => i.id)));
  });

  it('orders the queries by SHA-256(seed + item id), not by the file order', () => {
    const again = buildQueries(items);
    expect(again.queries.map((q) => q.id)).toEqual(queries.map((q) => q.id));
    expect(Object.values(key)).not.toEqual(items.map((i) => i.id));
    const other = buildQueries(items, `${QUERY_ORDER_SEED}-other`);
    expect(Object.values(other.key)).not.toEqual(Object.values(key));
  });
});

describe('criterion 3 export — the leakage scanner', () => {
  it('matches a token in every rendering, as a whole word', () => {
    const p = tokenPattern('false-inverse');
    for (const s of ['a false-inverse', 'a false inverse', 'a falseinverse', 'A FALSE_INVERSE']) expect(s.match(p)).not.toBeNull();
    expect('an invalid claim'.match(tokenPattern('valid'))).toBeNull();
  });

  it('finds every planted token in the control string', () => {
    const found = new Set(scanLeakage([{ id: 'control', text: CONTROL.text }], leakTokens(sources())).map((h) => h.token));
    for (const t of CONTROL.mustFind) expect(found.has(t)).toBe(true);
  });

  it('finds a BE id in any separator form, but not "be" before a number in prose', () => {
    const tokens = leakTokens(sources());
    const ids = (text: string) => scanLeakage([{ id: 'x', text }], tokens).filter((h) => h.token === 'BE-<n>').length;
    expect(ids('see BE-35, BE 21 and be-12')).toBe(3);
    expect(ids('the ratio should be 2 or be 35 times larger')).toBe(0);
  });

  it('searches a numeric bridge value as BE-<n>, not as a bare number', () => {
    const tokens = leakTokens(sources());
    expect(tokens.some((t) => t.token === '12')).toBe(false);
    expect(scanLeakage([{ id: 'x', text: 'I_0 = 1.0 x 10^-12 W/m^2' }], tokens)).toEqual([]);
  });

  it('scans the expression symbols and the ids too, not only the text', () => {
    const tokens = leakTokens(sources());
    const expr = { kind: 'symbol', name: 'model-spring', dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } } as never;
    const hits = scanLeakage([{ id: 'mb-waves-1-09', text: 'clean', expr }], tokens);
    expect(hits.map((h) => `${h.field}:${h.token}`).sort()).toEqual(['expr:model-spring', 'id:mb-waves-1-09']);
  });
});

describe('criterion 3 export — the frozen files', () => {
  const dir = 'docs/research/criterion3';
  const freeze = JSON.parse(read(`${dir}/freeze.json`));
  const corpusText = read(`${dir}/corpus.json`);
  const queriesText = read(`${dir}/queries.json`);

  it('match the SHA-256 recorded in freeze.json', () => {
    expect(lfSha(corpusText)).toBe(freeze.files['corpus.json'].sha256);
    expect(lfSha(queriesText)).toBe(freeze.files['queries.json'].sha256);
  });

  it('hold 109 corpus records and 125 queries, and record no commit or tree hash', () => {
    expect(JSON.parse(corpusText)).toHaveLength(freeze.files['corpus.json'].records);
    expect(JSON.parse(queriesText)).toHaveLength(125);
    expect(freeze.files['corpus.json'].records).toBe(109);
    // No commit and no git tree hash: nothing read either, a squash merge made the commit
    // unreachable, and a tree hash went stale on every src/canonical edit. The SHA-256 above
    // and the fresh-export test below are what bind the files.
    expect(freeze).not.toHaveProperty('pinnedCommit');
    expect(freeze).not.toHaveProperty('inputTrees');
  });

  it('equal a fresh export of the live canonical registry', () => {
    // The owner re-pinned this export when src/canonical was unfrozen. Amendment 8 still
    // hashes the corpus the labelers saw, at c144150; this file is the live registry.
    expect(JSON.parse(corpusText)).toEqual(JSON.parse(JSON.stringify(buildCorpus(CANONICAL_EQUATIONS))));
    expect(JSON.parse(queriesText)).toEqual(JSON.parse(JSON.stringify(buildQueries(items).queries)));
  });

  it('carry no id leak, and the report shows the control found every planted token', () => {
    expect(freeze.leakage.idHits).toBe(0);
    expect(freeze.leakage.controlFound).toBe(`${CONTROL.mustFind.length}/${CONTROL.mustFind.length}`);
    const report = read(`${dir}/leakage-report.md`);
    expect(report).toMatch(/\| corpus\.json \| 0 \|/);
    expect(report).toMatch(/\| queries\.json \| 0 \|/);
  });
});
