/**
 * Audit §14 item 14: `upt confront` printed "gap N%" for consistency ratios where N was the
 * record's agreement TOLERANCE, not observed − predicted (be-65 printed 150% for predicted 1.776
 * vs observed 1 M_⊙). Ten of the eleven consistency records carry the bound in `fractionalGap`;
 * be-21 carries the difference, and its prediction is a LOWER LIMIT decided by observed ≥ predicted.
 * (be-11 carried the difference too until its module's 15% tolerance became its bound.) These tests keep
 * the two apart:
 *
 * - every consistency record is classified, and the classification is checked against the field
 *   of the underlying module that `fractionalGap` is copied from;
 * - the actual difference is checked against hand arithmetic done in a different algebraic form;
 * - the compatibility decision agrees with the module's own `consistent`, computed independently.
 */
import { describe, it, expect } from 'vitest';
import { listConfrontations } from '../../src/bridges/confrontations.js';
import { consistencyComparison, type ConfrontationOutcome } from '../../src/bridges/observations/types.js';
import { confrontBE11 } from '../../src/bridges/be11-decoherence-confrontation.js';
import { confrontBE21 } from '../../src/bridges/be21-kss-confrontation.js';
import { confrontBE55 } from '../../src/bridges/be55-quantum-hall-confrontation.js';
import { confrontBE56 } from '../../src/bridges/be56-casimir-confrontation.js';
import { confrontBE59 } from '../../src/bridges/be59-ac-josephson-confrontation.js';
import { confrontBE60 } from '../../src/bridges/be60-fractional-qh-confrontation.js';
import { confrontBE61 } from '../../src/bridges/be61-wiedemann-franz-confrontation.js';
import { confrontBE62 } from '../../src/bridges/be62-bcs-gap-confrontation.js';
import { confrontBE63 } from '../../src/bridges/be63-chandrasekhar-mass-confrontation.js';
import { confrontBE64 } from '../../src/bridges/be64-eddington-luminosity-confrontation.js';
import { confrontBE65 } from '../../src/bridges/be65-jeans-mass-confrontation.js';

type Consistency = Extract<ConfrontationOutcome, { kind: 'consistency' }>;

/** What each module's `fractionalGap` source field is, and (for bounds) its own verdict. */
const MODULE_FIELD: Record<number, () => { is: Consistency['fractionalGapIs']; value: number; consistent?: boolean }> = {
  11: () => ({ is: 'agreement-bound', value: confrontBE11().observation.tolerance, consistent: confrontBE11().withinTolerance }),
  21: () => ({ is: 'observed-difference', value: confrontBE21().fractional_gap, consistent: confrontBE21().satisfiesBound }),
  55: () => ({ is: 'agreement-bound', value: confrontBE55().relative_uncertainty, consistent: confrontBE55().consistent }),
  56: () => ({ is: 'agreement-bound', value: confrontBE56().agreement, consistent: confrontBE56().consistent }),
  59: () => ({ is: 'agreement-bound', value: confrontBE59().relative_uncertainty, consistent: confrontBE59().consistent }),
  60: () => ({ is: 'agreement-bound', value: confrontBE60().relative_uncertainty, consistent: confrontBE60().consistent }),
  61: () => ({ is: 'agreement-bound', value: confrontBE61().agreement, consistent: confrontBE61().consistent }),
  62: () => ({ is: 'agreement-bound', value: confrontBE62().agreement, consistent: confrontBE62().consistent }),
  63: () => ({ is: 'agreement-bound', value: confrontBE63().agreement, consistent: confrontBE63().consistent }),
  64: () => ({ is: 'agreement-bound', value: confrontBE64().agreement, consistent: confrontBE64().consistent }),
  65: () => ({ is: 'agreement-bound', value: confrontBE65().agreement, consistent: confrontBE65().consistent }),
};

const consistencyOutcomes = listConfrontations()
  .map((e) => ({ id: e.bridgeId, o: e.run() }))
  .filter((r): r is { id: number; o: Consistency } => r.o.kind === 'consistency');

describe('consistency records keep the agreement bound apart from the actual difference', () => {
  it('every consistency record in the registry is classified here', () => {
    expect(consistencyOutcomes.map((r) => r.id).sort((a, b) => a - b)).toEqual(
      Object.keys(MODULE_FIELD).map(Number).sort((a, b) => a - b),
    );
  });

  it('fractionalGapIs names the module field fractionalGap is copied from', () => {
    for (const { id, o } of consistencyOutcomes) {
      const m = MODULE_FIELD[id]();
      expect(o.fractionalGapIs, `be-${id}`).toBe(m.is);
      expect(o.fractionalGap, `be-${id}`).toBe(m.value);
    }
  });

  it('an observed-difference record: fractionalGap is |observed − predicted|/|predicted|, and no bound is invented', () => {
    const rows = consistencyOutcomes.filter((r) => r.o.fractionalGapIs === 'observed-difference');
    expect(rows.map((r) => r.id)).toEqual([21]);
    for (const { id, o } of rows) {
      const c = consistencyComparison(o);
      expect(Math.abs(o.fractionalGap), `be-${id}`).toBeCloseTo(Math.abs(c.relativeDifference), 15);
      expect(c.agreementBound, `be-${id}`).toBeNull();
    }
  });

  it('every consistency record makes a compatibility decision, and it equals the module’s own verdict', () => {
    for (const { id, o } of consistencyOutcomes) {
      const c = consistencyComparison(o);
      expect(c.rule, `be-${id}`).not.toBeNull();
      expect(c.withinBound, `be-${id}`).toBe(MODULE_FIELD[id]().consistent);
    }
  });

  it('be-11: the bound is the module’s stated 15% tolerance, and the decision holds by construction', () => {
    const o = consistencyOutcomes.find((r) => r.id === 11)!.o;
    const c = consistencyComparison(o);
    // The source: agreement 'within the ~15% experimental uncertainty' (be11 module provenance).
    expect(c.agreementBound).toBe(0.15);
    expect(c.rule).toBe('|difference| ≤ agreement bound');
    // Negative result: the observed slot is the stated agreement encoded as ratio 1, so the difference is
    // 0 by construction and this decision cannot fail on this record.
    expect(o.approaches).toBe(o.predicted);
    expect(c.relativeDifference).toBe(0);
  });

  it('be-21: a lower limit, decided by observed ≥ 1/(4π), and the whole extraction band satisfies it', () => {
    const o = consistencyOutcomes.find((r) => r.id === 21)!.o;
    expect(o.predictedIs).toBe('lower-limit');
    const c = consistencyComparison(o);
    expect(c.rule).toBe('observed ≥ predicted lower limit');
    expect(c.withinBound).toBe(true);
    // Second method: ħ/(4π k_B) in ħ/k_B units, by hand: 1 / 12.566370614 = 0.0795774715.
    expect(o.predicted).toBeCloseTo(0.0795774715, 10);
    // The decision does not rest on the representative 0.10: the band's lower edge, 0.08, also
    // lies above the bound, by (0.08 − 0.0795775)/0.0795775 = 0.53%.
    const [low] = confrontBE21().observation.band;
    expect(low).toBeGreaterThanOrEqual(o.predicted);
    expect((low - o.predicted) / o.predicted).toBeCloseTo(0.00531, 5);
  });

  it('an agreement-bound record: the compatibility decision equals the module’s own `consistent`', () => {
    for (const { id, o } of consistencyOutcomes.filter((r) => r.o.fractionalGapIs === 'agreement-bound')) {
      const c = consistencyComparison(o);
      expect(c.agreementBound, `be-${id}`).toBe(o.fractionalGap);
      expect(c.withinBound, `be-${id}`).toBe(MODULE_FIELD[id]().consistent);
    }
  });

  // Hand arithmetic, as observed/predicted − 1 (not the (observed − predicted)/predicted the code
  // uses), from the values `upt confront` prints; six-decimal literals worked on paper.
  const HAND: Record<number, { form: number; paper: number }> = {
    11: { form: 1 / 1 - 1, paper: 0 },
    21: { form: 0.1 * 4 * Math.PI - 1, paper: 0.256637 }, // 0.4π − 1 = 1.256637 − 1
    55: { form: 1 / 1 - 1, paper: 0 },
    56: { form: 1 / 1 - 1, paper: 0 },
    59: { form: 1 / 1 - 1, paper: 0 },
    60: { form: 1 / 1 - 1, paper: 0 },
    61: { form: 2.443004509073667e-8 / 2.443004509073667e-8 - 1, paper: 0 },
    62: { form: 3.5 / 3.527753977724091 - 1, paper: -0.007867 }, // −0.027754 / 3.527754
    63: { form: 1.35 / 1.4558683947324034 - 1, paper: -0.072718 }, // −0.105868 / 1.455868
    64: { form: 1 / 1 - 1, paper: 0 },
    65: { form: 1 / 1.7759676829994302 - 1, paper: -0.436927 }, // 0.563073 − 1
  };

  it('the actual difference matches hand arithmetic for every consistency record', () => {
    for (const { id, o } of consistencyOutcomes) {
      const d = consistencyComparison(o).relativeDifference;
      expect(d, `be-${id} vs observed/predicted − 1`).toBeCloseTo(HAND[id].form, 15);
      expect(d, `be-${id} vs paper`).toBeCloseTo(HAND[id].paper, 6);
    }
  });

  it('the six audited records: the printed bound is not the difference', () => {
    const byId = new Map(consistencyOutcomes.map((r) => [r.id, r.o]));
    for (const [id, bound, paper] of [
      [56, 0.01, 0], [61, 0.1, 0], [62, 0.05, -0.007867], [63, 0.12, -0.072718], [64, 0.5, 0], [65, 1.5, -0.436927],
    ] as const) {
      const c = consistencyComparison(byId.get(id)!);
      expect(c.agreementBound, `be-${id}`).toBe(bound);
      expect(c.relativeDifference, `be-${id}`).toBeCloseTo(paper, 6);
      expect(c.withinBound, `be-${id}`).toBe(true);
    }
  });

  it('control: a difference beyond its bound is decided OUTSIDE, and a bound is never read as a difference', () => {
    const provenance = { citation: 'x', year: 2000, retrieved: '2000-01-01' };
    const base = {
      kind: 'consistency', units: '', provenance,
      preprocessing: { state: 'not-recorded' }, independence: { state: 'not-recorded' },
    } as const;
    const outside = consistencyComparison({ ...base, predicted: 2, approaches: 1, fractionalGap: 0.4, fractionalGapIs: 'agreement-bound' });
    expect(outside.relativeDifference).toBe(-0.5);
    expect(outside.withinBound).toBe(false);
    const labelled = consistencyComparison({ ...base, predicted: 1, approaches: 1, fractionalGap: 1.5, fractionalGapIs: 'agreement-bound' });
    expect(labelled.relativeDifference).toBe(0);
    expect(() => consistencyComparison({ ...base, predicted: 0, approaches: 1, fractionalGap: 0, fractionalGapIs: 'observed-difference' })).toThrow(RangeError);
  });

  it('control: a lower limit the observation falls below is decided OUTSIDE; with neither rule, no decision is made', () => {
    const provenance = { citation: 'x', year: 2000, retrieved: '2000-01-01' };
    const base = {
      kind: 'consistency', units: '', provenance,
      preprocessing: { state: 'not-recorded' }, independence: { state: 'not-recorded' },
    } as const;
    const below = consistencyComparison({ ...base, predicted: 1 / (4 * Math.PI), approaches: 0.07, fractionalGap: 0.07 * 4 * Math.PI - 1, fractionalGapIs: 'observed-difference', predictedIs: 'lower-limit' });
    expect(below.withinBound).toBe(false);
    expect(below.rule).toBe('observed ≥ predicted lower limit');
    const saturated = consistencyComparison({ ...base, predicted: 0.25, approaches: 0.25, fractionalGap: 0, fractionalGapIs: 'observed-difference', predictedIs: 'lower-limit' });
    expect(saturated.withinBound).toBe(true);
    const none = consistencyComparison({ ...base, predicted: 2, approaches: 1, fractionalGap: -0.5, fractionalGapIs: 'observed-difference' });
    expect(none.rule).toBeNull();
    expect(none.withinBound).toBeNull();
    // A lower limit and an agreement bound on one record contradict each other.
    expect(() => consistencyComparison({ ...base, predicted: 1, approaches: 1, fractionalGap: 0.1, fractionalGapIs: 'agreement-bound', predictedIs: 'lower-limit' })).toThrow(RangeError);
  });
});
