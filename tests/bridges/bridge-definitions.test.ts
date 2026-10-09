/**
 * Three definitions of "bridge" live in the catalog, and they disagree. This
 * test records the measured state (AGENTS law 5: a negative result is a
 * result), so that a change to any of the three is a decision and not a
 * drift. Making one derive from another is an owner decision; the data is
 * in the 9.0.1 package report.
 *
 * 1. The row's `type`: `cross-domain` (the specification's 40 bridges) or
 *    `standard` (120).
 * 2. The relation's `kind`: `bridge` or `law`, what the composition graph
 *    reads (`compose.ts`, `graph-viz.ts`).
 * 3. The membership verdict of `adjudicateBridgeEntry`: the `bridges` tuple
 *    proxy with the rejection ledger as overlay.
 *
 * `upt coverage` counts every row under the word "bridge"; that wording is
 * the composition package's (`audit-coverage.ts`).
 */
import { describe, expect, it } from 'vitest';
import { catalogEntries, catalogRelations } from '../../src/bridges/catalog-load.js';
import { adjudicateCatalog } from '../../src/bridges/membership.js';
import { allQuantityRecords } from '../../src/dimensional/quantity-registry.js';

describe('the three definitions of "bridge", measured', () => {
  const entries = catalogEntries();
  const relations = catalogRelations();
  const byId = new Map(entries.map((e) => [e.id, e]));

  it('the row type: 40 cross-domain and 120 standard', () => {
    expect(entries.filter((e) => e.type === 'cross-domain')).toHaveLength(40);
    expect(entries.filter((e) => e.type === 'standard')).toHaveLength(120);
  });

  it('the relation kind: 52 bridge and 106 law', () => {
    expect(relations.filter((r) => r.kind === 'bridge')).toHaveLength(52);
    expect(relations.filter((r) => r.kind === 'law')).toHaveLength(106);
  });

  it('the membership verdict: 152 bridge, 5 not-a-bridge, 3 unadjudicated', () => {
    const report = adjudicateCatalog(entries);
    expect([report.bridges.length, report.notABridges.length, report.unadjudicated.length]).toEqual([152, 5, 3]);
  });

  it('kind and type disagree on 43 relations: 27 standard rows with a bridge relation, 16 cross-domain rows with a law', () => {
    const rows = relations.filter((r) => r.catalogId !== null);
    const bridgeOnStandard = rows.filter((r) => r.kind === 'bridge' && byId.get(r.catalogId!)!.type === 'standard');
    const lawOnCrossDomain = rows.filter((r) => r.kind === 'law' && byId.get(r.catalogId!)!.type === 'cross-domain');
    expect(bridgeOnStandard).toHaveLength(27);
    expect(lawOnCrossDomain).toHaveLength(16);
  });

  it('kind and the quantity regime attributes disagree on 17 relations', () => {
    // The membership criterion in words: a bridge's endpoints differ in at least one regime attribute.
    const quantity = new Map(allQuantityRecords().map((q) => [q.id, q]));
    const differs = (r: (typeof relations)[number]): boolean => {
      const target = quantity.get(r.target)!;
      return r.sources.some((s) => {
        const source = quantity.get(s)!;
        return Object.keys({ ...target.attributes, ...source.attributes }).some((k) => target.attributes[k] !== source.attributes[k]);
      });
    };
    const disagree = relations.filter((r) => (differs(r) ? 'bridge' : 'law') !== r.kind).map((r) => r.id);
    expect(disagree).toHaveLength(17);
    expect(disagree).toContain('law-schwarzschild-radius');
  });
});
