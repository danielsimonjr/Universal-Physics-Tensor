/**
 * Criterion 3, step 3: the frozen labels and truth sets (`docs/research/criterion3/`), and the
 * pre-registration amendment (Amendment 8) that records their hashes.
 *
 * These tests bind every hash in the amendment's table to its committed file, check that the two
 * labelers labelled the frozen inputs, and derive the truth sets again from the two labeler files.
 * A truth set that differs from the frozen `truth.json` fails here. Each rule is paired with an input
 * that must break it.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveTruth, jaccard, type LabelerFile } from '../../tools/criterion3-study/labels.js';
import { amendmentSection } from '../../tools/criterion3-study/run.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = resolve(root, 'docs/research/criterion3');
const readText = (p: string) => readFileSync(resolve(dir, p), 'utf-8');
const readJson = (p: string) => JSON.parse(readText(p));
// The RAW bytes: the labeler files carry CRLF line ends, and their frozen hash is of those bytes.
const rawSha = (p: string) => createHash('sha256').update(readFileSync(resolve(dir, p))).digest('hex');

const note = readFileSync(resolve(root, 'docs/research/atlas-benchmark-preregistration.md'), 'utf-8');
// Only Amendment 8's own text: a later amendment's pins or hashes must not be read as its.
const amendment = amendmentSection(note, 8);
const table = new Map([...amendment.matchAll(/^\| ([\w./-]+\.json) \| ([0-9a-f]{64}) \|$/gm)].map((m) => [m[1]!, m[2]!]));

const a = readJson('labels/labeler-A.json') as LabelerFile;
const b = readJson('labels/labeler-B.json') as LabelerFile;
const agreed = readJson('labels/agreed-labels.json');
const truth = readJson('truth.json');
const queryIds = (readJson('queries.json') as { id: string }[]).map((q) => q.id);
const corpusIds = new Set((readJson('corpus.json') as { id: string }[]).map((r) => r.id));

/**
 * The exported corpus the labelers saw. Amendment 8 names the canonical tree at c144150;
 * the file itself landed in 1263bce and was not edited after that. The working-tree
 * corpus.json is the live registry export.
 */
const LABELLED_CORPUS_COMMIT = '1263bce2d2253d6a38ba319e74cacfbee5451fcd';

describe('criterion 3 — Amendment 8 freezes the files', () => {
  it('lists the seven files, each with the SHA-256 of its committed bytes', () => {
    expect([...table.keys()].sort()).toEqual(
      ['corpus.json', 'labels/agreed-labels.json', 'labels/labeler-A.json', 'labels/labeler-B.json', 'queries-key.json', 'queries.json', 'truth.json'].sort(),
    );
    for (const [file, hash] of table) {
      if (file === 'corpus.json') {
        const historical = execFileSync('git', ['show', `${LABELLED_CORPUS_COMMIT}:docs/research/criterion3/corpus.json`]);
        expect(createHash('sha256').update(historical).digest('hex'), file).toBe(hash);
      } else {
        expect(rawSha(file), file).toBe(hash);
      }
    }
  });

  it('writes those hashes WITHOUT back quotes, so the item-set hash stays the last back-quoted one', () => {
    for (const hash of table.values()) expect(note).not.toContain(`\`${hash}\``);
  });

  it('names the labelled corpus, and the same query hash as the export freeze', () => {
    const freeze = readJson('freeze.json');
    // Queries were not relabelled. The corpus hash in Amendment 8 is the file at c144150;
    // freeze.json tracks the live export, which the export test binds to the registry.
    expect(table.get('queries.json')).toBe(freeze.files['queries.json'].sha256);
    const historical = execFileSync('git', ['show', `${LABELLED_CORPUS_COMMIT}:docs/research/criterion3/corpus.json`]);
    expect(createHash('sha256').update(historical).digest('hex')).toBe(table.get('corpus.json'));
    expect(freeze.files['corpus.json'].sha256).toBe(rawSha('corpus.json'));
  });
});

describe('criterion 3 — the labelers labelled the frozen inputs', () => {
  it('both labeler files name the frozen corpus and query hashes, and a model', () => {
    for (const l of [a, b]) {
      expect(l.queries_sha256).toBe(table.get('queries.json'));
      expect(l.corpus_sha256).toBe(table.get('corpus.json'));
      expect(l.model).toBe('claude-opus-5-5');
    }
  });
});

describe('criterion 3 — the truth sets, derived again', () => {
  const derived = deriveTruth(a, b, queryIds, corpusIds);

  it('equal the frozen truth.json', () => {
    expect(JSON.parse(JSON.stringify(derived))).toEqual(truth);
  });

  it('have the counts the amendment states', () => {
    expect(Object.keys(derived.primary)).toHaveLength(50);
    expect(Object.keys(derived.secondary)).toHaveLength(64);
    expect(derived.excluded.bothNone).toHaveLength(49);
    expect(derived.excluded.oneNone).toHaveLength(12);
    expect(derived.excluded.partialOverlap).toHaveLength(14);
    expect(derived.agreement.exactSet).toBe(99);
    expect(derived.agreement.exactSetRate).toBeCloseTo(0.792, 3);
    expect(derived.agreement.meanJaccard).toBeCloseTo(0.847, 3);
    expect(derived.agreement.meanJaccardExcludingBothNone).toBeCloseTo(0.748, 3);
  });

  it('PRIMARY equals the agreed labels Mothership computed', () => {
    expect(derived.primary).toEqual(Object.fromEntries(Object.entries(agreed.agreed_labels as Record<string, string[]>).map(([q, ids]) => [q, [...ids].sort()])));
  });

  it('SECONDARY truth for a partial overlap is the intersection, never the union', () => {
    for (const q of derived.excluded.partialOverlap) {
      const inter = a.labels[q]!.ids.filter((x) => b.labels[q]!.ids.includes(x)).sort();
      expect(derived.secondary[q]).toEqual(inter);
    }
  });

  it('FAILS on a query only one labeler labelled, and on an id that is not in the corpus', () => {
    const { [queryIds[0]!]: _dropped, ...rest } = a.labels;
    expect(() => deriveTruth({ ...a, labels: rest }, b, queryIds, corpusIds)).toThrow(/not labelled by both/);
    const q = queryIds[0]!;
    const bad = { ...a, labels: { ...a.labels, [q]: { ids: ['CE-no-such-entry'] } } };
    expect(() => deriveTruth(bad, b, queryIds, corpusIds)).toThrow(/not a corpus id/);
  });

  it('moves a query out of PRIMARY when one labeler changes its label (the control)', () => {
    const q = Object.keys(derived.primary)[0]!;
    const other = [...corpusIds].find((id) => !derived.primary[q]!.includes(id))!;
    const changed = { ...b, labels: { ...b.labels, [q]: { ids: [other] } } };
    const t = deriveTruth(a, changed, queryIds, corpusIds);
    expect(t.primary[q]).toBeUndefined();
  });

  it('treats two empty label sets as full agreement', () => {
    expect(jaccard(new Set(), new Set())).toBe(1);
    expect(jaccard(new Set(['x']), new Set(['y']))).toBe(0);
  });
});
