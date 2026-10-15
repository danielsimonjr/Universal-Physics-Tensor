/**
 * Every catalog record names the Lean theorem that proves it and its proof
 * status, and both are projections of `formal/lean/manifest.json`.
 *
 * `theorem` is the theorem the manifest entry of the record's `formalKey`
 * names; `proofStatus` is `full` (a reviewed kind-`bridge` theorem), `weak`
 * (any other reference) or `pending` (no theorem), ranked in that order. The
 * drift test is `catalogProofProblems()` over the live catalog; the controls
 * below change one record or one reference and see that check fail, so it is
 * not an empty pass.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { capture } from '../helpers/cli.js';
import { runCli } from '../../src/cli/main.js';
import { catalogFormalRef, catalogProofProblems, deriveProofStatus } from '../../src/atlas/catalog-formal-ref.js';
import { physjsFormalRef } from '../../src/atlas/physjs-ref.js';
import { catalogEntries } from '../../src/bridges/catalog-load.js';
import { PROOF_STATUSES, type CatalogEntry } from '../../src/bridges/catalog-types.js';
import { dataSchema } from '../../src/core/data-file.js';
import { schemaProblems } from '../../src/core/json-schema.js';
import { declaredTheorems } from '../../scripts/lean-index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const theoremFiles = (
  JSON.parse(readFileSync(resolve(root, 'formal/lean/theorem-files.json'), 'utf-8')) as { files: Record<string, string> }
).files;

const entries = catalogEntries();
const full = entries.find((entry) => entry.proofStatus === 'full')!;
const weak = entries.find((entry) => entry.proofStatus === 'weak')!;
const pending = entries.find((entry) => entry.proofStatus === 'pending')!;

/** The catalog with record `id` replaced by `change(record)`. */
function withRecord(id: number, change: (entry: CatalogEntry) => CatalogEntry): CatalogEntry[] {
  return entries.map((entry) => (entry.id === id ? change(entry) : entry));
}

describe('catalog record theorem and proof status', () => {
  it('every record carries the manifest theorem and the derived status (the drift test)', () => {
    expect(catalogProofProblems()).toEqual([]);
    expect(full && weak && pending, 'the catalog has a record of each status').toBeTruthy();
  });

  it('each record theorem is declared in lean/, in the file the theorem map gives', () => {
    const keyed = entries.filter((entry) => entry.formalKey !== undefined);
    expect(keyed.length).toBeGreaterThan(100);
    for (const entry of keyed) {
      const file = theoremFiles[entry.theorem!];
      expect(file, `be-${entry.id} ${entry.theorem}`).toBeDefined();
      expect(declaredTheorems(readFileSync(resolve(root, file!), 'utf-8')), `be-${entry.id}`).toContain(entry.theorem);
    }
  });

  it('the status ranks full, weak, pending and follows the reference kind and review', () => {
    expect(PROOF_STATUSES).toEqual(['full', 'weak', 'pending']);
    expect(deriveProofStatus(undefined)).toBe('pending');
    const ref = catalogFormalRef(full.id)!;
    expect(deriveProofStatus(ref)).toBe('full');
    expect(deriveProofStatus({ ...ref, kind: 'derivation-step' })).toBe('weak');
    expect(deriveProofStatus({ ...ref, fidelity: 'unreviewed' })).toBe('weak');
    for (const entry of entries) {
      expect(entry.proofStatus === 'full', `be-${entry.id}`).toBe(catalogFormalRef(entry.id)?.kind === 'bridge');
    }
  });

  it('CONTROL: a wrong, missing or extra theorem is reported', () => {
    const other = catalogFormalRef(weak.id)!.statement;
    expect(catalogProofProblems(withRecord(full.id, (e) => ({ ...e, theorem: other })))).toEqual([
      `catalog id ${full.id} theorem is '${other}', the manifest entry '${full.formalKey}' names '${full.theorem}'`,
    ]);
    expect(catalogProofProblems(withRecord(full.id, ({ theorem: _drop, ...e }) => e))).toEqual([
      `catalog id ${full.id} theorem is '(none)', the manifest entry '${full.formalKey}' names '${full.theorem}'`,
    ]);
    expect(catalogProofProblems(withRecord(pending.id, (e) => ({ ...e, theorem: other })))).toEqual([
      `catalog id ${pending.id} names theorem '${other}' and has no formalKey`,
    ]);
  });

  it('CONTROL: a status other than the derived one is reported, and so is a manifest change under it', () => {
    expect(catalogProofProblems(withRecord(weak.id, (e) => ({ ...e, proofStatus: 'full' })))).toEqual([
      `catalog id ${weak.id} proofStatus is 'full', derived 'weak'`,
    ]);
    expect(catalogProofProblems(withRecord(pending.id, (e) => ({ ...e, proofStatus: 'weak' })))).toEqual([
      `catalog id ${pending.id} proofStatus is 'weak', derived 'pending'`,
    ]);
    const demoted = (key: string) => (key === full.formalKey ? { ...physjsFormalRef(key), kind: 'property' as const } : physjsFormalRef(key));
    expect(catalogProofProblems(entries, demoted)).toEqual([`catalog id ${full.id} proofStatus is 'full', derived 'weak'`]);
  });

  it('the schema requires a status, a theorem with a key, and pending without one', () => {
    const schema = dataSchema('bridge-catalog.json');
    const file = JSON.parse(readFileSync(resolve(root, 'data/bridge-catalog.json'), 'utf-8')) as {
      entries: Array<Record<string, unknown>>;
    };
    expect(schemaProblems(schema, file)).toEqual([]);
    const at = (id: number) => file.entries.findIndex((entry) => entry['id'] === id);
    const change = (id: number, edit: (entry: Record<string, unknown>) => Record<string, unknown>) => ({
      ...file,
      entries: file.entries.map((entry, i) => (i === at(id) ? edit({ ...entry }) : entry)),
    });
    const problems = (value: unknown) => schemaProblems(schema, value).join('\n');
    expect(problems(change(full.id, ({ proofStatus: _drop, ...e }) => e))).toMatch(/proofStatus/);
    expect(problems(change(full.id, ({ theorem: _drop, ...e }) => e))).toMatch(/theorem/);
    expect(problems(change(full.id, (e) => ({ ...e, proofStatus: 'pending' })))).toMatch(/not one of \["full","weak"\]/);
    expect(problems(change(pending.id, (e) => ({ ...e, proofStatus: 'full' })))).toMatch(/expected "pending"/);
    expect(problems(change(pending.id, (e) => ({ ...e, theorem: full.theorem })))).toMatch(/theorem/);
  });

  it('upt atlas prints the status, in text and JSON, and names it for a record with no theorem', async () => {
    const text = capture();
    expect(await runCli(['atlas', `be-${full.id}`], text.io)).toBe(0);
    expect(text.lines.join('')).toContain('proof status: full (full, weak, pending, best first)');
    const json = capture();
    expect(await runCli(['atlas', `be-${weak.id}`, '--json'], json.io)).toBe(0);
    expect((JSON.parse(json.lines.join('')) as { result: { proofStatus: string } }).result.proofStatus).toBe('weak');
    const none = capture();
    expect(await runCli(['atlas', `be-${pending.id}`], none.io)).not.toBe(0);
    expect(none.err.join('')).toContain('proof status pending');
  });
});
