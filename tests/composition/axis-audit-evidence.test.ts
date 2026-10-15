/**
 * Axis gates earn their place by evidence (proposal 13). Beside the firing count, the audit
 * now tests each axis's fires against the INDEPENDENT magnitude falsifier's clashes with
 * Fisher's exact test (MathTS `fisherExact`) over the candidates where both gates ran, and
 * flags `earned` at α = 0.05. The existing `discriminates` flag (fires > 0) and `GATE_AXES`
 * are NOT changed by this.
 *
 * @module tests/composition/axis-audit-evidence
 */
import { describe, it, expect } from 'vitest';
import { AUDIT_ALPHA, auditAxisDiscrimination } from '../../src/composition/axis-audit.js';
import { GATE_AXES } from '../../src/composition/axes.js';
import { rankDiscoveries } from '../../src/composition/discovery.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { Quantity, RegimeAttributes } from '../../src/composition/quantity.js';
import type { RepresentativeValue } from '../../src/composition/representative-values.js';
import { DIMENSIONLESS, ENERGY } from '../../src/dimensional/types.js';

// Eight isolated equations s_i → q_i. Every q_i has the energy dimension, so the funnel proposes
// all 28 pairs; the sources are dimensionless and never proposed. The magnitudes put q1..q4 near
// 1 J and q5..q8 near 1e10 J: the 16 cross pairs clash (ten decades), the 12 within pairs do not.
const q = (name: string, dim: Quantity['dim']): Quantity => ({ name, symbol: name, dim, attributes: {} });
const edge = (i: number): BridgeEdge => ({
  id: `e${i}`,
  beId: null,
  kind: 'law',
  label: `e${i}`,
  sources: [q(`s${i}`, DIMENSIONLESS)],
  target: q(`q${i}`, ENERGY),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: () => 0,
  citation: 'synthetic',
});
const GRAPH = [1, 2, 3, 4, 5, 6, 7, 8].map(edge);
const REP: Record<string, RepresentativeValue> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`q${i}`, { value: (i <= 4 ? 1 : 1e10) * (((i - 1) % 4) + 1), source: 'synthetic' }]),
);
// `scale` coincides with the magnitudes; `force` alternates independently of them.
const ATTRS: ReadonlyMap<string, RegimeAttributes> = new Map(
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => [
    `q${i}`,
    { scale: i <= 4 ? 'quantum' : 'cosmological', force: i % 2 === 1 ? 'electromagnetic' : 'gravitational' },
  ]),
);

describe('auditAxisDiscrimination — Fisher evidence beside the firing count', () => {
  const report = auditAxisDiscrimination(GRAPH, ATTRS, [], { representativeValues: REP });
  const by = (axis: string) => report.find((r) => r.axis === axis)!;

  it('α is 0.05, stated', () => {
    expect(AUDIT_ALPHA).toBe(0.05);
  });

  it('an axis whose fires coincide with the magnitude clashes is earned', () => {
    const scale = by('scale');
    expect(scale.fires).toBe(16);
    expect(scale.discriminates).toBe(true);
    expect(scale.evidence.n).toBe(28);
    expect(scale.evidence.table).toEqual([
      [16, 0],
      [0, 12],
    ]);
    expect(scale.evidence.pValue).toBeLessThan(AUDIT_ALPHA);
    expect(scale.earned).toBe(true);
  });

  it('an axis that fires independently of the falsifier is NOT earned, though it fires', () => {
    const force = by('force');
    expect(force.fires).toBe(16);
    expect(force.discriminates).toBe(true); // the old criterion still holds: it fires
    expect(force.evidence.n).toBe(28);
    expect(force.evidence.table).toEqual([
      [8, 8],
      [8, 4],
    ]);
    expect(force.evidence.oddsRatio).toBeCloseTo(0.5, 12);
    expect(force.evidence.pValue).toBeGreaterThan(AUDIT_ALPHA);
    expect(force.earned).toBe(false);
  });

  it('an axis nothing carries has an empty table, p = 1 and no odds ratio, and is not earned', () => {
    const symmetry = by('symmetry');
    expect(symmetry.checked).toBe(0);
    expect(symmetry.evidence.n).toBe(0);
    expect(symmetry.evidence.table).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(symmetry.evidence.pValue).toBe(1);
    expect(symmetry.evidence.oddsRatio).toBeNull();
    expect(symmetry.earned).toBe(false);
  });

  it('CONTROL: an axis whose fires AVOID the clashes is not earned either, whatever its p', () => {
    // Reverse the scale labels on half the quantities so fires land on the within pairs.
    const reversed = new Map(ATTRS);
    for (const i of [1, 2, 5, 6]) reversed.set(`q${i}`, { ...ATTRS.get(`q${i}`)!, scale: i <= 4 ? 'cosmological' : 'quantum' });
    const scale = auditAxisDiscrimination(GRAPH, reversed, [], { representativeValues: REP }).find((r) => r.axis === 'scale')!;
    const [[a, b], [c, d]] = scale.evidence.table;
    expect(a * d).toBeLessThanOrEqual(b * c);
    expect(scale.earned).toBe(false);
  });
});

describe('the live catalog, pinned once; GATE_AXES unchanged', () => {
  const report = auditAxisDiscrimination(CATALOG_GRAPH);
  const by = (axis: string) => report.find((r) => r.axis === axis)!;

  it('GATE_AXES is still scale and force: the evidence flag changes no gate', () => {
    expect([...GATE_AXES]).toEqual(['scale', 'force']);
    for (const r of report) if (r.gated) expect(r.discriminates).toBe(true);
  });

  it('NEGATIVE RESULT, pinned once: neither gated axis is earned by evidence on the catalog', () => {
    // The magnitude falsifier runs on few candidates (the representative-value table has
    // sixteen rows), so the tables are tiny and nearly every row is a clash: scale has twenty
    // candidates where both gates ran, odds ratio 0.43 and p = 0.62 (the association is, if
    // anything, negative); force has six, all clashes, a zero margin, p = 1. The gates stay,
    // because their criterion is firing (`discriminates`, pinned above); the evidence says the
    // firing has not been shown to agree with the independent falsifier. A measurement, not a
    // target: re-measure when the catalog or the table changes and record the move.
    expect(by('scale').evidence.table).toEqual([
      [9, 3],
      [7, 1],
    ]);
    expect(by('scale').evidence.n).toBe(20);
    expect(by('scale').evidence.oddsRatio).toBeCloseTo(3 / 7, 12);
    expect(by('scale').evidence.pValue.toFixed(3)).toBe('0.619');
    expect(by('scale').earned).toBe(false);
    expect(by('force').evidence.table).toEqual([
      [5, 0],
      [1, 0],
    ]);
    expect(by('force').evidence.n).toBe(6);
    expect(by('force').evidence.oddsRatio).toBeNull();
    expect(by('force').evidence.pValue).toBe(1);
    expect(by('force').earned).toBe(false);
    for (const r of report) {
      const [[a, b], [c, d]] = r.evidence.table;
      expect(r.evidence.n).toBe(a + b + c + d);
      expect(a + b).toBeLessThanOrEqual(r.fires);
      expect(r.evidence.pValue).toBeGreaterThanOrEqual(0);
      expect(r.evidence.pValue).toBeLessThanOrEqual(1);
    }
  });

  it('SECOND METHOD: the funnel\'s own output gives the same scale and force tables', () => {
    // Derived from `rankDiscoveries`, not from the audit's gate: a candidate is in the table
    // when its magnitude gate ran and the axis did not abstain; it fires when the axis clash
    // diagnostic names the axis; it clashes when the verdict is magnitude-clash.
    const ranked = rankDiscoveries(CATALOG_GRAPH);
    const tableOf = (axis: string): number[][] => {
      const t = [
        [0, 0],
        [0, 0],
      ];
      for (const c of ranked) {
        if (!c.magnitudeChecked) continue;
        if ((c.axisUnstated ?? []).some((u) => u.axis === axis)) continue;
        const fired = c.axisClashes.some((s) => s.startsWith(`${axis}:`));
        const clash = c.verdict === 'magnitude-clash';
        t[fired ? 0 : 1][clash ? 0 : 1]++;
      }
      return t;
    };
    expect(tableOf('scale')).toEqual([
      [9, 3],
      [7, 1],
    ]);
    expect(tableOf('force')).toEqual([
      [5, 0],
      [1, 0],
    ]);
  });
});
