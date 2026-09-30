/**
 * BE-53 confrontation contract: a refusal without a caller-supplied table
 * and running procedure, and a value outcome when both are supplied.
 * The one-loop evaluator is not this confrontation.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { listConfrontations } from '../../src/bridges/confrontations.js';
import {
  evaluateYangMillsBeta,
  computeB0,
  oneLoopCoefficientStatement,
} from '../../src/bridges/equations/be-53-yang-mills-beta.js';
import {
  requestYangMillsConfrontation,
  type MeasuredCouplingRow,
  type RunningProcedure,
} from '../../src/bridges/be53-yang-mills-confrontation.js';

const FIXTURE_SCALE = 91.2;
const FIXTURE_COUPLING = 0.118;

function fixtureRow(overrides: Partial<MeasuredCouplingRow> = {}): MeasuredCouplingRow {
  return {
    scale: FIXTURE_SCALE,
    value: FIXTURE_COUPLING,
    uncertainty: 0.001,
    citation: 'fixture citation, not a repository dataset',
    ...overrides,
  };
}

function stubProcedure(at: (scale: number) => number): RunningProcedure {
  return {
    record: { loopOrder: '2', flavorThresholds: 'charm, bottom, top, as stated by the caller' },
    at,
  };
}

function jsonOf(value: unknown): string {
  return JSON.stringify(value);
}

describe('requestYangMillsConfrontation', () => {
  it('refuses when the table and the procedure are both absent, and names both', () => {
    const result = requestYangMillsConfrontation({});
    expect(result.status).toBe('refused');
    if (result.status !== 'refused') return;
    expect(result.missing).toEqual(['table', 'running procedure']);
    expect(jsonOf(result)).not.toMatch(/residual/i);
    expect(result).not.toHaveProperty('outcome');
  });

  it('names only the input that is missing', () => {
    const tableOnly = requestYangMillsConfrontation({ table: [fixtureRow()] });
    expect(tableOnly.status).toBe('refused');
    if (tableOnly.status === 'refused') expect(tableOnly.missing).toEqual(['running procedure']);

    const procedureOnly = requestYangMillsConfrontation({
      procedure: stubProcedure((scale) => 0.11 + scale * 1e-6),
    });
    expect(procedureOnly.status).toBe('refused');
    if (procedureOnly.status === 'refused') expect(procedureOnly.missing).toEqual(['table']);
    expect(jsonOf(tableOnly)).not.toMatch(/residual/i);
    expect(jsonOf(procedureOnly)).not.toMatch(/residual/i);
  });

  it('refuses a table whose procedure record states neither loop order nor flavor thresholds', () => {
    const result = requestYangMillsConfrontation({
      table: [fixtureRow()],
      procedure: { record: { loopOrder: '  ', flavorThresholds: '' }, at: () => FIXTURE_COUPLING },
    });
    expect(result.status).toBe('refused');
    if (result.status !== 'refused') return;
    expect(result.missing).toEqual(['loop order', 'flavor thresholds']);
    expect(jsonOf(result)).not.toMatch(/residual/i);
  });

  it('treats the one-loop formula itself as a procedure that states neither loop order nor thresholds', () => {
    const bare = requestYangMillsConfrontation({
      table: [fixtureRow()],
      procedure: evaluateYangMillsBeta,
    });
    expect(bare.status).toBe('refused');
    if (bare.status === 'refused') {
      expect(bare.missing).toEqual(['loop order', 'flavor thresholds']);
      expect(jsonOf(bare)).not.toMatch(/residual/i);
    }

    const attached = requestYangMillsConfrontation({
      table: [fixtureRow()],
      procedure: {
        record: { loopOrder: '1', flavorThresholds: 'none' },
        at: evaluateYangMillsBeta,
      },
    });
    expect(attached.status).toBe('refused');
    if (attached.status === 'refused') {
      expect(attached.missing).toEqual(['loop order', 'flavor thresholds']);
      expect(jsonOf(attached)).not.toMatch(/residual/i);
    }
  });

  it('a stub that states loop order and thresholds, and a fixture table, produce a value outcome', () => {
    const procedure = stubProcedure((scale) => {
      if (scale !== FIXTURE_SCALE) throw new Error(`procedure evaluated off the table scale ${scale}`);
      return FIXTURE_COUPLING;
    });
    const result = requestYangMillsConfrontation({ table: [fixtureRow()], procedure });
    expect(result.status).toBe('confronted');
    if (result.status !== 'confronted') return;
    expect(result.outcome.kind).toBe('value');
    expect(result.outcome.predicted).toBe(FIXTURE_COUPLING);
    expect(result.outcome.observed).toBe(FIXTURE_COUPLING);
    expect(result.outcome.withinObserved).toBe(true);
    // A stub that ignores the table and returns the one-loop formula fails
    // the predicted-coupling assertion above: that formula is not 0.118.
    const oneLoop = evaluateYangMillsBeta({ g: 1, N_c: 3, N_f: 6 });
    expect(result.outcome.predicted).not.toBeCloseTo(oneLoop);
  });

  it('evaluates every table row and reports the largest absolute residual', () => {
    const seen: number[] = [];
    const procedure = stubProcedure((scale) => {
      seen.push(scale);
      return scale === 10 ? 1 : 0;
    });
    const result = requestYangMillsConfrontation({
      table: [
        fixtureRow({ scale: 10, value: 1, uncertainty: 0.1, citation: 'row-a' }),
        fixtureRow({ scale: 20, value: 1, uncertainty: 0.1, citation: 'row-b' }),
      ],
      procedure,
    });
    expect(seen).toEqual([10, 20]);
    expect(result.status).toBe('confronted');
    if (result.status !== 'confronted') return;
    expect(result.outcome.kind).toBe('value');
    expect(result.outcome.predicted).toBe(0);
    expect(result.outcome.observed).toBe(1);
    expect(result.outcome.provenance.citation).toBe('row-b');
  });

  it('refuses a non-finite procedure output without a residual', () => {
    const result = requestYangMillsConfrontation({
      table: [fixtureRow()],
      procedure: stubProcedure(() => Number.NaN),
    });
    expect(result.status).toBe('refused');
    if (result.status !== 'refused') return;
    expect(result.missing).toEqual(['procedure output']);
    expect(jsonOf(result)).not.toMatch(/residual/i);
  });

  it('does not change the catalog status of be-53', () => {
    const before = BRIDGE_EQUATIONS.find((entry) => entry.id === 53)?.status;
    expect(before).toBe('established');
    expect(listConfrontations().some((entry) => entry.bridgeId === 53)).toBe(false);
    requestYangMillsConfrontation({});
    requestYangMillsConfrontation({
      table: [fixtureRow()],
      procedure: stubProcedure(() => FIXTURE_COUPLING),
    });
    expect(BRIDGE_EQUATIONS.find((entry) => entry.id === 53)?.status).toBe(before);
    expect(listConfrontations().some((entry) => entry.bridgeId === 53)).toBe(false);
  });
});

describe('one-loop coefficient', () => {
  it('keeps the SU(3), six-flavor pin on the evaluator, and does not call that pin a confrontation', () => {
    expect(computeB0(3, 6)).toBe(7);
    const expected = -7 / (16 * Math.PI * Math.PI);
    expect(evaluateYangMillsBeta({ g: 1, N_c: 3, N_f: 6 })).toBeCloseTo(expected, 14);
    const encoding = readFileSync(new URL('./be-53-encoding.test.ts', import.meta.url), 'utf8');
    expect(encoding).toContain('β(g=1, N_c=3, N_f=6) = −7/(16π²)');
    expect(encoding).not.toMatch(/confrontation/i);
  });

  it('labels the sign of b₀ as the one-loop coefficient, not a data test', () => {
    const qcd = oneLoopCoefficientStatement(3, 6);
    expect(qcd).toEqual({ label: 'one-loop coefficient', sign: 'positive', b0: 7 });
    expect(oneLoopCoefficientStatement(3, 16.5)).toEqual({
      label: 'one-loop coefficient',
      sign: 'zero',
      b0: 0,
    });
    const infrared = oneLoopCoefficientStatement(3, 18);
    expect(infrared.label).toBe('one-loop coefficient');
    expect(infrared.sign).toBe('negative');
    expect(infrared.b0).toBeLessThan(0);
    expect(jsonOf(qcd)).not.toMatch(/residual|confrontation/i);
  });
});
