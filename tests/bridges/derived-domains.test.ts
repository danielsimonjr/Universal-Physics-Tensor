/**
 * The validity domain the loader derives from the evaluator flags, checked
 * against the record and at its boundary.
 *
 * The record states `holds`; a parameter flagged `positive`, `nonnegative`
 * or `temperature: absolute` adds a sign clause on its source when the
 * catalog loads. This test re-derives those clauses from the raw file, so
 * the loaded condition is checked against the record and the flags, not
 * against itself; then it samples each derived clause's boundary through
 * the evaluator: the reference point evaluates, and the same point with one
 * flagged input moved across its sign bound is refused. A loader that
 * dropped a clause would pass the point it should refuse.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import type { CatalogFileRecord } from '../../src/bridges/catalog-types.js';
import { DomainViolationError } from '../../src/bridges/evaluation-errors.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(resolve(here, '..', '..', 'data', 'bridge-catalog.json'), 'utf8')) as CatalogFileRecord;

/** The clauses the flags state for `relation`, re-derived here from the raw file. */
function flagClauses(id: number): { source: string; clause: string; sign: 'positive' | 'nonnegative' }[] {
  const evaluator = raw.evaluators.find((e) => e.catalogId === id);
  const relation = raw.relations.find((r) => r.id === `be-${id}`);
  if (evaluator === undefined || relation === undefined) return [];
  const out: { source: string; clause: string; sign: 'positive' | 'nonnegative' }[] = [];
  for (const p of evaluator.parameters) {
    const sign = p.sign ?? (p.temperature === 'absolute' ? 'nonnegative' : undefined);
    if (sign === undefined || sign === 'any') continue;
    const source =
      relation.sources.find((s) => s === p.key || (relation.aliases[s] ?? []).includes(p.key)) ??
      (relation.sources.includes(p.quantity) ? p.quantity : undefined);
    if (source === undefined) continue;
    out.push({ source, clause: sign === 'positive' ? `${source} > 0` : `${source} >= 0`, sign });
  }
  return out;
}

describe('derived validity domains', () => {
  // The primary relation of each evaluator: `be-<id>`, the one its spec evaluates (be-42-via-rs is a second relation of row 42).
  const rows = raw.relations.filter((r) => r.catalogId !== null && r.id === `be-${r.catalogId}` && raw.evaluators.some((e) => e.catalogId === r.catalogId));

  it('the loaded condition is the record plus the flag clauses, and nothing else', () => {
    let derived = 0;
    for (const record of rows) {
      const loaded = catalogRelations().find((r) => r.id === record.id)!;
      const clauses = flagClauses(record.catalogId!).map((c) => c.clause).filter((clause) => !record.holds.includes(clause));
      const expected = clauses.length === 0 ? record.holds : `${record.holds.trim() === 'true' ? '' : `${record.holds} and `}${clauses.join(' and ')}`;
      expect(loaded.holds, record.id).toBe(expected);
      derived += clauses.length;
    }
    expect(derived).toBeGreaterThan(60);
  });

  it('every derived clause refuses a point across its bound and accepts the reference point', () => {
    let sampled = 0;
    for (const record of rows) {
      const spec = BRIDGE_EVALUATORS.get(record.catalogId!)!;
      const at = { ...record.reference!.inputs };
      expect(() => spec.run(at, 'value'), record.id).not.toThrow();
      for (const { source, sign } of flagClauses(record.catalogId!)) {
        const outside = sign === 'positive' ? 0 : -Math.abs(at[source]!) - 1;
        const moved = { ...at, [source]: outside };
        let thrown: unknown;
        try {
          spec.run(moved, 'value');
        } catch (error) {
          thrown = error;
        }
        expect(thrown, `${record.id} ${source} = ${outside}`).toBeInstanceOf(DomainViolationError);
        sampled += 1;
      }
    }
    expect(sampled).toBeGreaterThan(100);
  });

  it('a flag that states nothing adds nothing: a parameter signed any has no derived clause', () => {
    for (const evaluator of raw.evaluators) {
      for (const p of evaluator.parameters) {
        if (p.sign !== 'any') continue;
        const relation = raw.relations.find((r) => r.id === `be-${evaluator.catalogId}`)!;
        const loaded = catalogRelations().find((r) => r.id === relation.id)!;
        const source = relation.sources.find((s) => s === p.key || (relation.aliases[s] ?? []).includes(p.key)) ?? p.quantity;
        expect(loaded.holds.includes(`${source} >= 0`) && !relation.holds.includes(`${source} >= 0`), `${relation.id} ${p.key}`).toBe(false);
      }
    }
  });
});
