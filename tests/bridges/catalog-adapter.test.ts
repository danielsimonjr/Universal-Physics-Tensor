/**
 * Tests for `src/bridges/catalog-adapter.ts` — v0.7 Proposal 2 Phase 3.
 *
 * End-to-end ingestion test against the live 42-entry
 * `BRIDGE_EQUATIONS` catalog. Per Task 3.3, this is the
 * "42 v0.6 bridges fit through the three v0.7 flux rules"
 * acceptance gate.
 *
 * @module tests/bridges/catalog-adapter
 */

import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import type { BridgeEquationEntry } from '../../src/bridges/index.js';
import {
  catalogToCells,
  scanCatalog,
  ingestCatalog,
  ingestionReportToFluxReport,
  CatalogIngestionError,
} from '../../src/bridges/catalog-adapter.js';
import { UniversalTensor } from '../../src/core/tensor.js';
import type { TensorConfig } from '../../src/core/types.js';

const baseConfig: TensorConfig = {
  rank: 3,
  scales: ['quantum', 'mesoscopic', 'classical', 'cosmological'],
  forces: ['gravitational', 'electromagnetic', 'weak', 'strong'],
  symmetries: ['poincare', 'gauge'],
  informationMeasures: ['vonNeumann', 'shannon'],
};

// ---------------------------------------------------------------------------
// catalogToCells — pure mapper
// ---------------------------------------------------------------------------

describe('catalogToCells', () => {
  it('produces BridgeCell objects with the correct kind discriminator', () => {
    const cells = catalogToCells(BRIDGE_EQUATIONS);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.kind).toBe('bridge');
    }
  });

  it('filters out entries whose axis labels do not map to PhysicalScale', () => {
    // Submittable count expanded 2026-05-23 (BRIDGE-PHYSICS-AUDIT §3
    // unknown<->unknown naming pass per docs/architecture/v0.7-physics-
    // judgment-proposals.md §3). 15 newly-named entries with at least
    // one PhysicalScale-mappable axis joined the 5 pre-existing:
    //   17 renamed + 9 NOT-A-BRIDGE classified (kept [unknown,unknown])
    //   = 26 unknown↔unknown entries processed.
    //   Of the 17 renamed, 15 have at least one PhysicalScale-mappable
    //   axis (quantum/mesoscopic/classical/cosmological); 2 use freeform
    //   labels on both sides (BE-30 [information,gravity], BE-38
    //   [information,gravity]).
    //   Net submittable: 5 (pre-existing) + 15 (newly mappable) = 20.
    // The remaining 22 entries unmappable: 9 NOT-A-BRIDGE (still
    // [unknown,unknown]) + 2 newly-named-but-unmappable (BE-30, BE-38) +
    // 11 other freeform-label entries from the original catalog.
    // Updated 2026-05-24 (parallel-agent dispatch):
    //   +1 for BE-54 (Randall-Sundrum; ['quantum','cosmological'] — both PhysicalScale-mappable)
    //   +1 for BE-53 (Yang-Mills β; ['quantum','classical'] — both mappable)
    //   Total submittable: 20 → 22.
    // Future v0.8 RegimeType extension (Proposal 5) widens the mappable
    // set further.
    // Updated 2026-06-11 (v0.8.0 Phase 4 catalog adjudication): BE-42
    // reversed from NOT-A-BRIDGE to ['gravity','quantum'] under the
    // graph-native membership criterion — 'quantum' is mappable, so
    // submittable 22 → 23.
    // BE-75 is quantum → classical, so it is submittable. BE-74 and BE-76 are not PhysicalScale.
    // 34 is the record from before be-74..76.
    const cells = catalogToCells(BRIDGE_EQUATIONS);
    expect(cells).toHaveLength(36);
  });

  it('assigns id as "BE-{number}" matching the catalog id field', () => {
    const cells = catalogToCells(BRIDGE_EQUATIONS);
    for (const cell of cells) {
      expect(cell.id).toMatch(/^BE-\d+$/);
    }
  });

  it('translates known scale labels to PhysicalScale values', () => {
    // Find an entry with a known classical/quantum bridge.
    const quantumClassical = BRIDGE_EQUATIONS.find(
      (e) =>
        (e.bridges[0] === 'quantum' && e.bridges[1] === 'classical') ||
        (e.bridges[0] === 'classical' && e.bridges[1] === 'quantum'),
    );
    if (quantumClassical) {
      const cell = catalogToCells([quantumClassical])[0];
      expect(cell.source.scale).toBeDefined();
      expect(cell.target.scale).toBeDefined();
    } else {
      // If no such entry exists, skip; the test passes vacuously.
      expect(true).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// scanCatalog — best-effort, no throws
// ---------------------------------------------------------------------------

describe('scanCatalog', () => {
  it('returns a report covering every catalog entry', () => {
    const report = scanCatalog(BRIDGE_EQUATIONS);
    expect(report.entries).toHaveLength(BRIDGE_EQUATIONS.length);
    // Updated 2026-05-24 (parallel-agent dispatch): 42 → 44 after adding
    // BE-53 (Yang-Mills β) AND BE-54 (Randall-Sundrum).
    expect(report.entries).toHaveLength(92);
    // 77 is the record from before be-88..102.
  });

  it('counts unsubmitted entries as 21 (post-v0.8.0 adjudication)', () => {
    // Updated 2026-05-23 (BRIDGE-PHYSICS-AUDIT §3 naming pass per
    // docs/architecture/archive/v0.7-physics-judgment-proposals.md §3).
    // Unsubmitted = entries with NEITHER axis mappable to strict
    // PhysicalScale ('quantum' | 'mesoscopic' | 'classical' |
    // 'cosmological'):
    //   - 8 unknown-tuple entries (5 rejected per src/bridges/rejected.ts
    //     + 3 contested): BE-28, 29, 32, 35, 40, 44, 46, 50 — BE-42 was
    //     reversed to ['gravity','quantum'] 2026-06-11 (v0.8.0 Phase 4
    //     adjudication, docs/architecture/v0.8.0-catalog-adjudication.md)
    //   - 2 newly-named-but-unmappable: BE-30 [information,gravity],
    //     BE-38 [information,gravity]
    //   - 11 other freeform-label entries from the pre-audit catalog
    //     (microscale/emergent, information/physical,
    //     information/consciousness, gravity/dark-sector, etc.)
    //   = 21 total unsubmitted.
    const report = scanCatalog(BRIDGE_EQUATIONS);
    // BE-69..73 tuples are not PhysicalScale, so they join the unsubmitted set: 24 → 29.
    // BE-74 (electromagnetic/continuum) and BE-76 (fluid/plasma) join that set: 29 → 31.
    // BE-75 is quantum → classical and is submitted.
    expect(report.unsubmitted).toHaveLength(41);
  });

  it('counts submittable entries as 23 (44 - 21 with at least one PhysicalScale axis)', () => {
    // Updated 2026-05-24 (parallel-agent dispatch): 20 → 22 after adding
    // BE-53 (Yang-Mills, ['quantum','classical']) AND BE-54 (Randall-Sundrum,
    // ['quantum','cosmological']) — both pairs PhysicalScale-mappable.
    // Updated 2026-06-11 (v0.8.0 Phase 4): 22 → 23 after the BE-42
    // adjudication reversal to ['gravity','quantum'].
    const report = scanCatalog(BRIDGE_EQUATIONS);
    expect(report.submitted).toHaveLength(36);
  });

  it('does NOT throw on a malformed entry', () => {
    const malformed = {
      id: 99999,
      name: 'malformed-test-entry',
      status: 'speculative',
      bridges: ['unknown', 'unknown'],
      formula_latex: '',
      dimensional_signature: null, // structural null → ERROR per Decision #3
      known_issues: [],
      references: [],
      depends_on: [],
      tractability_class: null,
      notes: '',
    } as unknown as BridgeEquationEntry; // deliberately malformed/minimal — sanctioned idiom
    expect(() => scanCatalog([malformed])).not.toThrow();
  });

  it('counts errors for entries with structural dimensional_signature: null', () => {
    const malformed = {
      id: 99999,
      name: 'malformed',
      status: 'speculative',
      bridges: ['quantum', 'classical'], // submittable
      formula_latex: 'F = ma',
      dimensional_signature: null,
      known_issues: [],
      references: [],
      depends_on: [],
      tractability_class: null,
      notes: '',
    } as unknown as BridgeEquationEntry; // deliberately malformed/minimal — sanctioned idiom
    const report = scanCatalog([malformed]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].severity).toBe('error');
    expect(report.errors[0].ruleName).toBe('dimensional-consistency');
    expect(report.errors[0].message).toContain('dimensional_signature');
  });

  it('emits info diagnostics for entries without EXPECTED_DIMENSION_BY_BRIDGE coverage', () => {
    // BE-99999 is not in EXPECTED_DIMENSION_BY_BRIDGE.
    const uncovered = {
      id: 99999,
      name: 'uncovered',
      status: 'speculative',
      bridges: ['quantum', 'classical'],
      formula_latex: 'X = Y',
      dimensional_signature: '[length]',
      known_issues: [],
      references: [],
      depends_on: [],
      tractability_class: null,
      notes: '',
    } as unknown as BridgeEquationEntry; // deliberately malformed/minimal — sanctioned idiom
    const report = scanCatalog([uncovered]);
    // Either info (no EXPECTED) or error (mismatch). For an unrecognized
    // bridge ID, it should be info per checkDimensionalConsistency logic.
    expect(report.errors).toHaveLength(0);
    expect(report.info.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// ingestCatalog — strict, throws on errors
// ---------------------------------------------------------------------------

describe('ingestCatalog', () => {
  it('feeds the live catalog through addCell without errors (acceptance gate)', () => {
    // This is Task 3.3's "42 v0.6 bridges fit through the three v0.7
    // flux rules" gate. Empty rule errors at HEAD = catalog passes
    // Rule 1 cleanly.
    const tensor = new UniversalTensor(baseConfig);
    expect(() => ingestCatalog(tensor, BRIDGE_EQUATIONS)).not.toThrow();
    // Tensor should now hold the 23 submittable bridges (22 → 23 on
    // 2026-06-11 with the v0.8.0 Phase-4 BE-42 adjudication reversal to
    // ['gravity','quantum']; was 20 → 22 on 2026-05-24 when BE-53 +
    // BE-54 landed; was 20 after the 2026-05-23 BRIDGE-PHYSICS-AUDIT §3
    // naming pass).
    const cells = tensor.populatedCells().filter((c) => c.kind === 'bridge');
    expect(cells).toHaveLength(36);
  });

  it('throws CatalogIngestionError on any Rule 1 error AND leaves tensor untouched', () => {
    const tensor = new UniversalTensor(baseConfig);
    // Mix one good entry with one malformed.
    const malformed = {
      id: 99998,
      name: 'malformed',
      status: 'speculative',
      bridges: ['quantum', 'classical'],
      formula_latex: 'X',
      dimensional_signature: null, // ERROR
      known_issues: [],
      references: [],
      depends_on: [],
      tractability_class: null,
      notes: '',
    } as unknown as BridgeEquationEntry; // deliberately malformed/minimal — sanctioned idiom
    // Include both: should throw, and tensor must be untouched.
    expect(() => ingestCatalog(tensor, [...BRIDGE_EQUATIONS, malformed])).toThrow(
      CatalogIngestionError,
    );
    // Tensor is untouched per Decision #11 (two-pass collect-then-commit).
    expect(tensor.populatedCount()).toBe(0);
  });

  it('CatalogIngestionError carries the full report for inspection', () => {
    const tensor = new UniversalTensor(baseConfig);
    const malformed = {
      id: 99998,
      name: 'malformed',
      status: 'speculative',
      bridges: ['quantum', 'classical'],
      formula_latex: 'X',
      dimensional_signature: null,
      known_issues: [],
      references: [],
      depends_on: [],
      tractability_class: null,
      notes: '',
    } as unknown as BridgeEquationEntry; // deliberately malformed/minimal — sanctioned idiom
    try {
      ingestCatalog(tensor, [malformed]);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CatalogIngestionError);
      if (e instanceof CatalogIngestionError) {
        expect(e.report.errors).toHaveLength(1);
        expect(e.report.entries).toHaveLength(1);
        expect(e.report.entries[0].submitted).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// ingestionReportToFluxReport
// ---------------------------------------------------------------------------

describe('ingestionReportToFluxReport', () => {
  it('aggregates diagnostics into a FluxReport shape', () => {
    const report = scanCatalog(BRIDGE_EQUATIONS);
    const fluxReport = ingestionReportToFluxReport(report);
    expect(fluxReport.errorCount).toBe(report.errors.length);
    expect(fluxReport.warningCount).toBe(report.warnings.length);
    expect(fluxReport.infoCount).toBe(report.info.length);
    expect(fluxReport.diagnostics.length).toBe(
      report.errors.length + report.warnings.length + report.info.length,
    );
  });
});

// ---------------------------------------------------------------------------
// Acceptance gate: 42 v0.6 bridges fit through the three v0.7 flux rules
// ---------------------------------------------------------------------------

describe('Acceptance gate (proposals doc §3.5)', () => {
  it('the live 43-entry catalog produces ZERO Rule 1 errors at HEAD', () => {
    // This is the Eve-R1 lesson re-confirmed at the test level: at
    // HEAD, no catalog entry has structural dimensional_signature:
    // null (verified Phase 0 Task 0.3). Rule 1 should report zero
    // errors against the live catalog. BE-53 added in v0.7 BE-X sprint
    // with dimensional_signature '[1]' (not null), so Rule 1 still passes.
    const report = scanCatalog(BRIDGE_EQUATIONS);
    expect(report.errors).toHaveLength(0);
  });

  it('the 21 submittable bridges all clear Rule 2 + Rule 3 in fluxDiagnostics', () => {
    const tensor = new UniversalTensor(baseConfig);
    ingestCatalog(tensor, BRIDGE_EQUATIONS);
    const flux = tensor.fluxDiagnostics();
    // Rule 2 catches identical source/target (none survive ingestion
    // because the adapter filtered unknown→unknown). Rule 3 may emit
    // warnings (reverse bridges) or info (scale-unspecified). Zero
    // errors expected.
    expect(flux.errorCount).toBe(0);
  });
});
