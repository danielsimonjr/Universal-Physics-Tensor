/**
 * The bare WKB tunneling rate Γ_WKB = ν₀ exp(−(2/ℏ)√(2m(V−E))·L), the second
 * relation of catalog row 26 (`be-26-wkb`). It is the BE-26 rate without the
 * biological correction f, so the split is exact: be-26 / f = be-26-wkb at the
 * same inputs. Both relations refuse a barrier below the opaque bound 2κL >= 10.
 *
 * The relation has no evaluator. It is reachable by its graph edge and by
 * `evaluateRelation('be-26-wkb')`; `upt evaluate` accepts only `be-<id>` and
 * refuses it.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import { DomainViolationError } from '../../src/bridges/evaluation-errors.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { runCli } from '../../dist/cli/main.js';

const HBAR = 6.62607015e-34 / (2 * Math.PI);
const PROTON = 1.67262192369e-27;
const ELECTRON = 9.1093837015e-31;
const V = 6.408706536e-20; // 0.4 eV in J
const L = 1e-10;
const REFERENCE = {
  'attempt-frequency': 1e13,
  'tunneling-mass': PROTON,
  'barrier-height': V,
  'barrier-width': L,
};
const VALUE = 8.715250700032124;

const kappaL = (m: number, width: number): number => (Math.sqrt(2 * m * V) / HBAR) * width;
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);

function gamma(inputs: Readonly<Record<string, number>>): number {
  const result = evaluateRelation('be-26-wkb', inputs);
  if (result.kind !== 'value') throw new Error(`expected a value, got ${result.kind}`);
  return result.value;
}

function refusal(inputs: Readonly<Record<string, number>>): DomainViolationError {
  try {
    gamma(inputs);
  } catch (error) {
    if (error instanceof DomainViolationError) return error;
    throw error;
  }
  throw new Error('expected a DomainViolationError');
}

describe('be-26-wkb: the bare WKB tunneling rate', () => {
  it('evaluates the proton reference point to 8.715250700032124 /s', () => {
    expect(rel(gamma(REFERENCE), VALUE)).toBeLessThan(1e-12);
    const edge = catalogEdge('be-26-wkb');
    expect(edge.target.name).toBe('wkb-tunneling-rate');
  });

  it('is be-26 divided by the biological correction f, at the same inputs', () => {
    const f = 0.5;
    const be26 = evaluateEdge(catalogEdge('be-26'), { ...REFERENCE, 'biological-rate-correction': f });
    expect(rel(be26 / f, gamma(REFERENCE))).toBeLessThan(1e-12);
  });

  it('decays as exp(-2κL) with the barrier width', () => {
    const twoKappaL = 2 * kappaL(PROTON, L);
    expect(rel(twoKappaL, 27.76853176386612)).toBeLessThan(1e-12);
    const ratio = gamma({ ...REFERENCE, 'barrier-width': 2 * L }) / gamma(REFERENCE);
    expect(rel(ratio, Math.exp(-twoKappaL))).toBeLessThan(1e-9);
  });

  it('refuses an electron at the proton geometry (2κL = 0.648) on the opaque clause', () => {
    expect(rel(2 * kappaL(ELECTRON, L), 0.648)).toBeLessThan(1e-3);
    const error = refusal({ ...REFERENCE, 'tunneling-mass': ELECTRON });
    expect(error.violations.some((v) => v.condition.replace(/\s+/g, '').includes('>=100*hbar*hbar'))).toBe(true);
    // The bare expression bypasses the condition and returns a value outside the WKB regime.
    const unguarded = evaluateFormula(catalogRelations().find((r) => r.id === 'be-26-wkb')!.expression, {
      ...REFERENCE,
      'tunneling-mass': ELECTRON,
    });
    expect(rel(unguarded, 5.230725582044671e12)).toBeLessThan(1e-12);
  });

  it('refuses a transparent barrier (L = 1e-12 m)', () => {
    expect(() => gamma({ ...REFERENCE, 'barrier-width': 1e-12 })).toThrow(DomainViolationError);
  });

  it('`upt evaluate be-26-wkb` is refused: the CLI evaluates only be-<id> rows with an evaluator', async () => {
    const err: string[] = [];
    const code = await runCli(['evaluate', 'be-26-wkb', 'attempt-frequency=1e13'], {
      out: () => undefined,
      err: (s?: string) => err.push(s ?? ''),
      write: () => undefined,
    });
    expect(code).toBe(2);
    expect(err.join('\n')).toMatch(/'be-26-wkb' is not a bridge id/);
  });
});
