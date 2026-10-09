/**
 * Axis-discrimination audit — the anti-inert-metadata gate. Confirms the gated
 * axes (scale/force) fire, the new axes abstain (thin coverage → correctly
 * ungated), and that gate ⟺ measured discrimination holds.
 * @module tests/composition/axis-audit
 */
import { describe, it, expect } from 'vitest';
import { auditAxisDiscrimination } from '../../src/composition/axis-audit.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { proposeLinkCandidates } from '../../src/composition/bridge-analysis.js';
import { REGISTRY_ATTRIBUTES_BY_NAME } from '../../src/composition/discovery.js';

describe('auditAxisDiscrimination', () => {
  const report = auditAxisDiscrimination(CATALOG_GRAPH);
  const by = (axis: string) => report.find((r) => r.axis === axis)!;

  it('audits every registry axis', () => {
    expect(report.map((r) => r.axis)).toEqual([
      'scale', 'force', 'information', 'symmetry', 'topology', 'statistics',
    ]);
  });

  it('the gated axes (scale, force) actually FIRE on the catalog', () => {
    expect(by('scale').gated).toBe(true);
    expect(by('scale').fires).toBeGreaterThan(0);
    expect(by('scale').discriminates).toBe(true);
    expect(by('force').gated).toBe(true);
    expect(by('force').fires).toBeGreaterThan(0);
  });

  it('the new axes are UNGATED and do not fire (measured across topology/statistics/symmetry)', () => {
    for (const axis of ['symmetry', 'topology', 'statistics']) {
      expect(by(axis).gated).toBe(false);
      expect(by(axis).fires).toBe(0);
      expect(by(axis).discriminates).toBe(false);
    }
  });

  it('symmetry is POPULATED (graph quantities tagged) yet still checked=0 — the funnel never proposes them', () => {
    // 2026-07-05 symmetry-axis test: gauge couplings / curvatures / critical exponents
    // carry symmetry tags, and a sweep finds same-dimension different-symmetry pairs — but
    // the discovery funnel surfaces only UNCONNECTED coincidences, and those quantities are
    // already anchored/connected, so none becomes a candidate. checked=0 → cannot gate.
    // (docs/research/rank7-axis-measurement.md.)
    expect(by('symmetry').checked).toBe(0);
  });

  it('INVARIANT: no axis is gated without measured discrimination', () => {
    // The whole point — a gate must be earned by firing, never asserted by vision.
    for (const r of report) {
      if (r.gated) expect(r.discriminates).toBe(true);
    }
  });

  it('CONTROL: an injected symmetry clash on a real candidate pair is CHECKED and FIRES (the gate can see every axis)', () => {
    // 9.0.0 audit §4 C2: `effectiveAttributes` once propagated only scale, force and
    // information, so symmetry, topology and statistics measured `checked: 0` whatever
    // the data said, and the anti-inert-metadata gate was itself inert for the axes it
    // exists to earn. A clash planted on one real pair must register on every axis.
    const [pair] = proposeLinkCandidates(CATALOG_GRAPH);
    expect(pair).toBeDefined();
    for (const [axis, left, right] of [
      ['symmetry', 'gauge', 'poincare'],
      ['topology', 'chern', 'trivial'],
      ['statistics', 'bosonic', 'fermionic'],
    ] as const) {
      const injected = new Map(REGISTRY_ATTRIBUTES_BY_NAME);
      injected.set(pair!.a, { ...(injected.get(pair!.a) ?? {}), [axis]: left });
      injected.set(pair!.b, { ...(injected.get(pair!.b) ?? {}), [axis]: right });
      const row = auditAxisDiscrimination(CATALOG_GRAPH, injected).find((r) => r.axis === axis)!;
      expect(row.checked, axis).toBeGreaterThanOrEqual(1);
      expect(row.fires, axis).toBeGreaterThanOrEqual(1);
      expect(row.discriminates, axis).toBe(true);
    }
    // The same plant on scale is the positive control the old code already passed.
    const scaleMap = new Map(REGISTRY_ATTRIBUTES_BY_NAME);
    scaleMap.set(pair!.a, { ...(scaleMap.get(pair!.a) ?? {}), scale: 'quantum' });
    scaleMap.set(pair!.b, { ...(scaleMap.get(pair!.b) ?? {}), scale: 'classical' });
    expect(auditAxisDiscrimination(CATALOG_GRAPH, scaleMap).find((r) => r.axis === 'scale')!.fires).toBeGreaterThanOrEqual(1);
  });

  it('clashRate is fires/checked and bounded [0,1]', () => {
    for (const r of report) {
      expect(r.clashRate).toBeGreaterThanOrEqual(0);
      expect(r.clashRate).toBeLessThanOrEqual(1);
      if (r.checked > 0) expect(r.clashRate).toBeCloseTo(r.fires / r.checked, 10);
    }
  });
});
