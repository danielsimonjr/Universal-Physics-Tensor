import { describe, it, expect } from 'vitest';
import { CONFRONTATIONS, listConfrontations, runConfrontation } from '../../src/bridges/confrontations.js';
import { DATA_CONFRONTED_IDS } from '../../src/bridges/confrontation-coverage.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import type { ConfrontationOutcome } from '../../src/bridges/observations/types.js';

describe('confrontation registry', () => {
  it('registers the three existing confrontations (be-23/36/52)', () => {
    expect(CONFRONTATIONS.has(23)).toBe(true);
    expect(CONFRONTATIONS.has(36)).toBe(true);
    expect(CONFRONTATIONS.has(52)).toBe(true);
  });

  it('every entry bridgeId exists in the catalog', () => {
    const catalogIds = new Set(BRIDGE_EQUATIONS.map((e) => e.id));
    for (const entry of listConfrontations()) {
      expect(catalogIds.has(entry.bridgeId), `be-${entry.bridgeId}`).toBe(true);
    }
  });

  it('DATA_CONFRONTED_IDS is exactly the registry keyset, sorted', () => {
    expect([...DATA_CONFRONTED_IDS]).toEqual([...CONFRONTATIONS.keys()].sort((a, b) => a - b));
  });

  it('runConfrontation(52) returns a value-kind outcome within 1 sigma', () => {
    const outcome = runConfrontation(52);
    expect(outcome?.kind).toBe('value');
    if (outcome?.kind === 'value') {
      expect(outcome.withinObserved).toBe(true);
      expect(outcome.units).toBe('arcsec/century');
    }
  });

  it('runConfrontation on an unregistered id returns undefined', () => {
    expect(runConfrontation(99)).toBeUndefined();
  });

  it('every value-kind outcome: withinObserved === (residualInSigma <= 1) — the field means the residual verdict', () => {
    for (const entry of listConfrontations()) {
      const o = entry.run();
      if (o.kind === 'value') {
        expect(o.withinObserved).toBe(o.residualInSigma <= 1);
      }
    }
  });

  it('every outcome carries preprocessing and independence, each sourced or explicitly not recorded', () => {
    for (const entry of listConfrontations()) {
      const o = entry.run();
      const id = `be-${entry.bridgeId}`;
      expect(Object.hasOwn(o, 'preprocessing'), `${id} preprocessing`).toBe(true);
      expect(Object.hasOwn(o, 'independence'), `${id} independence`).toBe(true);
      expect(['recorded', 'not-recorded'], id).toContain(o.preprocessing.state);
      expect(['no-fitted-parameter', 'shares-input', 'not-recorded'], id).toContain(o.independence.state);
      if (o.preprocessing.state === 'recorded') {
        expect(o.preprocessing.statement.trim(), `${id} preprocessing statement`).not.toBe('');
        expect(o.preprocessing.source.trim(), `${id} preprocessing source`).not.toBe('');
      } else {
        expect(Object.keys(o.preprocessing), `${id} not-recorded carries no statement`).toEqual(['state']);
      }
      if (o.independence.state === 'not-recorded') {
        expect(Object.keys(o.independence), `${id} not-recorded carries no statement`).toEqual(['state']);
      } else {
        expect(o.independence.statement.trim(), `${id} independence statement`).not.toBe('');
        expect(o.independence.source.trim(), `${id} independence source`).not.toBe('');
        if (o.independence.state === 'shares-input') expect(o.independence.shared.trim(), id).not.toBe('');
      }
    }
  });

  it('the type refuses an outcome that omits either field', () => {
    const provenance = { citation: 'x', year: 2000, retrieved: '2000-01-01' };
    // @ts-expect-error — preprocessing and independence are required
    const bare: ConfrontationOutcome = { kind: 'consistency', predicted: 1, approaches: 1, fractionalGap: 0, units: '', provenance };
    // @ts-expect-error — independence is required
    const half: ConfrontationOutcome = {
      kind: 'consistency', predicted: 1, approaches: 1, fractionalGap: 0, units: '', provenance,
      preprocessing: { state: 'not-recorded' },
    };
    expect([bare, half]).toHaveLength(2);
  });
});
