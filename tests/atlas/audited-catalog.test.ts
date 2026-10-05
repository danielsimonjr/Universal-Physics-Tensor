/**
 * Atlas Phase 1, S1.5 — the ten audited catalog rows.
 *
 * The overlay adds OPTIONAL fields, so nothing about it fails on its own. This
 * file is what fails. It pins four things, and the third is the one that would
 * otherwise rot silently:
 *
 * 1. Each of the ten chosen rows carries a `relation`.
 * 2. No row's `status` moved. The overlay describes what a bridge IS; it is not
 *    a promotion mechanism, and BE-37 and BE-48 stay `speculative`.
 * 3. Where a bridge has BOTH a catalog row and one or more graph edges, the row
 *    and every edge carry the SAME relation. The literals are duplicated across
 *    two registries for import-hygiene reasons, so only a deep-equal check
 *    stops them drifting apart.
 * 4. `overlayCoverage` reports exactly ten audited records.
 *
 * @module tests/atlas/audited-catalog
 */

import { describe, expect, it } from 'vitest';

import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { overlayCoverage } from '../../src/atlas/coverage.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import {
  CONTRACT_DAMPED_RLC,
  CONTRACT_SPRING_LC,
  relationContractOf,
} from '../../src/atlas/oscillators/bridges-exact.js';
import { LIMIT_CONTRACTS } from '../../src/atlas/oscillators/bridges-limits.js';
import { CONTRACT_CHAIN_WAVE } from '../../src/atlas/oscillators/bridges-coarse.js';

/** The ten rows the Lead chose from the data-confronted set. */
const AUDITED = [11, 21, 35, 37, 48, 51, 52, 55, 58, 59] as const;

/**
 * The statuses as they stood BEFORE this sprint, transcribed from the rows at
 * bfb168a. Snapshotting from the live registry inside the test would compare
 * the data against itself and pass whatever it contained.
 */
const STATUS_BEFORE: Readonly<Record<number, string>> = {
  11: 'established',
  21: 'established',
  35: 'established',
  37: 'speculative',
  48: 'speculative',
  51: 'established',
  52: 'established',
  55: 'established',
  58: 'established',
  59: 'established',
};

const rowOf = (id: number) => {
  const row = BRIDGE_EQUATIONS.find((r) => r.id === id);
  expect(row, `BE-${id} is missing from BRIDGE_EQUATIONS`).toBeDefined();
  return row!;
};

describe('S1.5 — the ten audited catalog rows', () => {
  it('registers 63 catalog rows and 54 graph edges', () => {
    expect(BRIDGE_EQUATIONS).toHaveLength(115);
    // 92 is the record from before be-103..125.
    expect(CATALOG_GRAPH).toHaveLength(106);
    // 83 is the record from before be-103..125. 77 and 68 are the record from before be-88..102.
  });

  it.each(AUDITED)('BE-%i carries a relation', (id) => {
    expect(rowOf(id).relation).toBeDefined();
  });

  it.each(AUDITED)('BE-%i status is unchanged', (id) => {
    expect(rowOf(id).status).toBe(STATUS_BEFORE[id]);
  });

  it('BE-37 and BE-48 are still speculative — the overlay does not promote', () => {
    expect(rowOf(37).status).toBe('speculative');
    expect(rowOf(48).status).toBe('speculative');
  });

  it('BE-35 records what the equation IS, with the not-a-bridge rejection as a counterexample', () => {
    const row = rowOf(35);
    expect(row.relation?.type).toBe('exact-equivalence');
    // The overlay must not contradict the adjudication: the rejection is linked.
    expect(row.counterexamples ?? []).toHaveLength(1);
    expect(row.counterexamples?.[0]?.witness).toContain('rejected.ts');
  });

  it('every conventions object declares at least one field', () => {
    // A declared-but-empty `conventions` would hand out `convention-checked`
    // vacuously — the exploit `derive-evidence` was hardened against.
    for (const id of AUDITED) {
      const conventions = rowOf(id).conventions;
      if (conventions === undefined) continue;
      expect(Object.keys(conventions).length, `BE-${id} conventions`).toBeGreaterThan(0);
    }
  });
});

describe('S1.5 — row and edge cannot disagree', () => {
  it('every beId present in BOTH registries carries the same relation on both', () => {
    const edgesWithBeId = CATALOG_GRAPH.filter((e) => e.beId !== null);
    let compared = 0;
    for (const edge of edgesWithBeId) {
      const row = BRIDGE_EQUATIONS.find((r) => r.id === edge.beId);
      if (row === undefined) continue;
      expect(edge.relation, `edge ${edge.id} vs row BE-${edge.beId}`).toStrictEqual(
        row.relation,
      );
      compared += 1;
    }
    // A loop that never ran would pass. Pin that it ran over the real overlap.
    expect(compared).toBeGreaterThan(0);
  });

  it('each audited row that has any edge has at least one, and all of them agree', () => {
    const withEdges = AUDITED.filter((id) =>
      CATALOG_GRAPH.some((e) => e.beId === id),
    );
    // BE-11 (two edges), 21, 37, 48, 51, 52, plus 55 and 59 once those seeds had edges.
    expect(withEdges).toStrictEqual([11, 21, 37, 48, 51, 52, 55, 59]);
    for (const id of withEdges) {
      const edges = CATALOG_GRAPH.filter((e) => e.beId === id);
      for (const edge of edges) {
        expect(edge.relation, `edge ${edge.id}`).toStrictEqual(rowOf(id).relation);
      }
    }
  });
});

describe('S1.5 — overlay coverage', () => {
  const schemaRecords = [...BRIDGE_EQUATIONS, ...CANONICAL_EQUATIONS];

  it('reports exactly ten audited records', () => {
    const coverage = overlayCoverage(schemaRecords, 0, OSCILLATOR_FAMILY.bridges);
    expect(coverage.audited).toBe(10);
    expect(coverage.notYetAudited).toBe(coverage.schema - 10);
  });

  it('counts the catalog plus the canonical registry, and the atlas separately', () => {
    const coverage = overlayCoverage(schemaRecords, 0, OSCILLATOR_FAMILY.bridges);
    expect(coverage.schema).toBe(BRIDGE_EQUATIONS.length + CANONICAL_EQUATIONS.length);
    // The atlas pilot is reported beside the catalog, never inside it.
    expect(coverage.atlas.bridges).toBe(OSCILLATOR_FAMILY.bridges.length);
    expect(coverage.schema).not.toBe(schemaRecords.length + coverage.atlas.bridges);
  });

  it('passes `verified` through rather than deriving it', () => {
    expect(overlayCoverage(schemaRecords, 7, OSCILLATOR_FAMILY.bridges).verified).toBe(7);
  });
});

describe('S1.5 — the five Sprint 0 bridges re-registered through RelationContract', () => {
  it('re-registers all five, with the conditional fields the union requires', () => {
    const contracts = [
      CONTRACT_SPRING_LC,
      CONTRACT_DAMPED_RLC,
      ...LIMIT_CONTRACTS,
      CONTRACT_CHAIN_WAVE,
    ];
    expect(contracts).toHaveLength(OSCILLATOR_FAMILY.bridges.length);

    for (const contract of contracts) {
      if (contract.type === 'exact-equivalence') expect(contract.inverse).toBeTruthy();
      if (contract.type === 'approximation') {
        expect(contract.bound.horizonHolds).toBeTypeOf('function');
        expect(contract.bound.horizon).toBeTruthy();
      }
    }
  });

  it('copies from the record rather than restating it', () => {
    for (const bridge of OSCILLATOR_FAMILY.bridges) {
      const contract = relationContractOf(bridge);
      expect(contract.type).toBe(bridge.relation);
      expect(contract.transformation).toBe(bridge.transformation);
    }
  });

  it('THROWS on the two cases AtlasBridge could only describe in a doc comment', () => {
    const base = OSCILLATOR_FAMILY.bridges.find((b) => b.id === 'ab-spring-lc')!;
    expect(() => relationContractOf({ ...base, inverse: undefined })).toThrow(TypeError);

    const approx = OSCILLATOR_FAMILY.bridges.find((b) => b.relation === 'approximation')!;
    expect(() => relationContractOf({ ...approx, bound: undefined })).toThrow(TypeError);
  });
});
