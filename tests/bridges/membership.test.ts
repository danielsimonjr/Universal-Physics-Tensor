/**
 * v0.8.0 Phase 4 — bridge-membership criterion + catalog adjudication
 * (G-2, P-4). See docs/architecture/v0.8.0-catalog-adjudication.md.
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import {
  adjudicateBridgeEntry,
  adjudicateCatalog,
} from '../../src/bridges/membership.js';
import {
  REJECTED_BRIDGE_ADJUDICATIONS,
  REJECTED_BRIDGE_IDS,
} from '../../src/bridges/rejected.js';

const byId = (id: number) => {
  const e = BRIDGE_EQUATIONS.find((b) => b.id === id);
  if (!e) throw new Error(`BE-${id} missing from catalog`);
  return e;
};

describe('adjudicateBridgeEntry (graph-native criterion, tuple proxy)', () => {
  it('BE-42 is a BRIDGE post-reversal (gravity → quantum endpoints differ)', () => {
    expect(byId(42).bridges).toEqual(['gravity', 'quantum']);
    expect(adjudicateBridgeEntry(byId(42))).toBe('bridge');
  });

  it('rejected-registry overlay wins over the unknown tuple (r2-4 precedence)', () => {
    // BE-29 Jarzynski: tuple is the historical [unknown,unknown]
    // NOT-A-BRIDGE marker, but the verdict comes from rejected.ts.
    expect(byId(29).bridges).toEqual(['unknown', 'unknown']);
    expect(adjudicateBridgeEntry(byId(29))).toBe('not-a-bridge');
  });

  it('contested entries (not rejected, unknown tuple) are unadjudicated', () => {
    for (const id of [44, 46, 50]) {
      expect(adjudicateBridgeEntry(byId(id))).toBe('unadjudicated');
    }
  });

  it('ordinary differing-tuple entries are bridges', () => {
    expect(adjudicateBridgeEntry(byId(11))).toBe('bridge'); // quantum/classical
    expect(adjudicateBridgeEntry(byId(54))).toBe('bridge'); // quantum/cosmological
  });
});

describe('adjudicateCatalog (whole-catalog tallies)', () => {
  const report = adjudicateCatalog(BRIDGE_EQUATIONS);

  it('160 entries split 152 bridges / 5 not-a-bridge / 3 unadjudicated', () => {
    // 2026-07-05: +4 established bridges (BE-55..58) → 36 → 40 bridges.
    // BE-66..68 differ in their tuples, so they are bridges.
    // BE-74..76 differ in their tuples, so they are bridges. 55 is the
    // count from before those three rows.
    // BE-88..102 differ in their tuples, so they are bridges. 69 is the
    // count from before those fifteen rows. 84 of 92 is the record from
    // before BE-103..125.
    // BE-103..125 are fluid/plasma, so they are bridges.
    // BE-126..133 differ in their tuples, so they are bridges. 107 is the
    // count from before those eight rows.
    // BE-134..146 differ in their tuples, so they are bridges. 115 is the
    // count from before those thirteen rows.
    // BE-147..170 differ in their tuples, so they are bridges. 128 is the
    // count from before those twenty-four rows.
    expect(report.bridges).toHaveLength(152);
    expect(report.notABridges).toHaveLength(5);
    expect(report.unadjudicated).toHaveLength(3);
    expect(
      report.bridges.length +
        report.notABridges.length +
        report.unadjudicated.length,
    ).toBe(BRIDGE_EQUATIONS.length);
  });

  it('the not-a-bridge set is exactly the negative catalog', () => {
    expect([...report.notABridges].sort((a, b) => a - b)).toEqual([
      28, 29, 32, 35, 40,
    ]);
  });

  it('the unadjudicated set is exactly the contested trio', () => {
    expect([...report.unadjudicated].sort((a, b) => a - b)).toEqual([
      44, 46, 50,
    ]);
  });
});

describe('REJECTED_BRIDGE_ADJUDICATIONS (negative catalog, P-4)', () => {
  it('every rejection has a reason and a citation', () => {
    for (const r of REJECTED_BRIDGE_ADJUDICATIONS) {
      expect(r.reason.length).toBeGreaterThan(40);
      expect(r.citation.length).toBeGreaterThan(10);
      expect(r.verdict).toBe('not-a-bridge');
    }
  });

  it('rejected ids all exist in the catalog (rejection is an overlay, not removal)', () => {
    for (const id of REJECTED_BRIDGE_IDS) {
      expect(BRIDGE_EQUATIONS.some((e) => e.id === id)).toBe(true);
    }
  });

  it('no id is both rejected and tuple-adjudicated as a bridge (consistency)', () => {
    for (const id of REJECTED_BRIDGE_IDS) {
      expect(adjudicateBridgeEntry(byId(id))).toBe('not-a-bridge');
    }
  });
});
