/**
 * The verdicts that depend on the "a constant times that one" decision, pinned
 * BEFORE the sample points, the ratio statistic and the tolerance moved into
 * `canonical/fixed-points.ts` (proposal 6), and kept after the move.
 *
 * Three callers are swept over the registries: the derivation audit of every
 * catalog and canonical edge (status and recovered prefactor), the
 * bridge-canonical linkage scan (classification and the recovery spread), and
 * `explain`'s dimensional form of every catalog edge from its own sources
 * (the encoded-matches-monomial check). The snapshot is the record of the
 * verdicts on the tree before the move; a changed verdict fails here.
 *
 * `cleanPrefactor` is deliberately NOT in the audit pin: proposal 3 changes
 * that field on purpose, and its moves are reported separately.
 */
import { describe, expect, it } from 'vitest';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { scanLinkages } from '../../src/canonical/linkage.js';
import { explainQuantity } from '../../src/composition/explain.js';

const sig = (x: number | undefined): string | undefined => (x === undefined ? undefined : x.toPrecision(12));

describe('verdicts that rest on the fixed-point sample scheme', () => {
  it('derivation audit: status and recovered prefactor of every catalog and canonical edge', () => {
    const rows: Record<string, string> = {};
    for (const edge of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) {
      const d = attemptDerivation(edge);
      rows[edge.id] = [d.status, d.subset?.join(',') ?? '', sig(d.prefactor) ?? ''].join(' | ');
    }
    expect(rows).toMatchSnapshot();
  });

  it('linkage scan: classification and recovery spread of every non-unrelated pair', () => {
    const rows = scanLinkages().map((r) =>
      [r.canonicalId, r.bridgeId, r.classification, r.recovery === null ? 'no-recovery' : `${r.recovery.tested} ${sig(r.recovery.maxRelErr)}`].join(' | '),
    );
    expect(rows).toMatchSnapshot();
  });

  it("explain: each catalog edge's dimensional form from its own sources", () => {
    const rows: Record<string, string> = {};
    for (const edge of CATALOG_GRAPH) {
      const names = edge.sources.map((s) => s.name);
      const explanation = explainQuantity(CATALOG_GRAPH, edge.target.name, names);
      const own = explanation.derivations.find((d) => d.edge === edge.id);
      rows[edge.id] = own === undefined ? 'no-derivation' : (own.dimensionalForm?.formula ?? 'no-dimensional-form');
    }
    expect(rows).toMatchSnapshot();
  });
});
