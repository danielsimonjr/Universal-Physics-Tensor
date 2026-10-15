/**
 * Proposal 16: a numeric probe that can REFUTE a symbolic witness. The CAS
 * runner asserts "not checked" when the simplifier cannot reduce lhs − rhs,
 * the weaker guarantee NOTES.md records: a wrong dictionary earns no tag, but
 * is never shown wrong. The probe evaluates both sides at seeded random
 * positive points through `evalExpr` and refutes on disagreement. It is its
 * OWN result kind (`numeric-refuted` / `numeric-agrees` / `numeric-not-run`),
 * carried beside the CAS status and never merged into it (AGENTS law 4); the
 * CAS status, the detail sentence and the derived evidence are unchanged.
 * MathTS `symbolicEqual` is not used: it is the same simplifier.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runWitnessRegistry } from '../../src/atlas/witness-artifact.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';
import {
  NUMERIC_PROBE_POINTS,
  NUMERIC_PROBE_TOLERANCE,
  probeSymbolicWitness,
  runSymbolicWitness,
  tallySymbolicResults,
} from '../../src/atlas/witness-symbolic.js';
import type { SymbolicWitnessSpec } from '../../src/atlas/witness-symbolic.js';
import { isSimplifierAvailable } from '../../src/composition/expr-simplify.js';
import { substitute } from '../../src/composition/expr-subst.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS, ENERGY, LENGTH, MASS } from '../../src/dimensional/types.js';
import { CAPACITANCE, DAMPING, INDUCTANCE, RESISTANCE, SPRING_CONSTANT } from '../../src/atlas/oscillators/dimensions.js';
import { DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from '../../src/atlas/diffusion/dimensions.js';
import { VISCOSITY } from '../../src/atlas/diffusion/models.js';

const here = dirname(fileURLToPath(import.meta.url));
const committed = JSON.parse(readFileSync(resolve(here, '../../data/atlas/witness-results.json'), 'utf-8')) as WitnessResultsArtifact;
const peerPresent = await isSimplifierAvailable();
const peerRequired = process.env.UPT_REQUIRE_PEERS === '1';

const symbolic = (id: string): SymbolicWitnessSpec => {
  const w = WITNESS_REGISTRY.find((r) => r.spec.id === id);
  if (w === undefined || w.kind !== 'symbolic') throw new Error(`${id}: not a registered symbolic witness`);
  return w.spec;
};
const SYMBOLIC_IDS = ['W1s', 'W2s', 'WD2s', 'WD5s'];

const op = (o: '*' | '/' | '^', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });
const n = (value: number): ExprNode => sym(String(value), DIMENSIONLESS);
function through(expr: ExprNode, dictionary: ReadonlyArray<[string, ExprNode]>): ExprNode {
  let out = expr;
  for (const [name, rep] of dictionary) {
    const r = substitute(out, name, rep);
    if (r.count === 0) throw new Error(`control dictionary entry '${name}' matches no leaf`);
    out = r.expr;
  }
  return out;
}
const m = sym('m', MASS);
const k = sym('k', SPRING_CONSTANT);
const b = sym('b', DAMPING);
const L = sym('L', INDUCTANCE);
const C = sym('C', CAPACITANCE);
const R = sym('R', RESISTANCE);
const kappa = sym('kappa', THERMAL_CONDUCTIVITY);
const rho = sym('rho', DENSITY);
const cp = sym('cp', SPECIFIC_HEAT);
const D = sym('D', DIFFUSIVITY);
const q = sym('q', { ...LENGTH, L: -1 });
const kT = sym('kT', ENERGY);
const gamma = sym('gamma', DAMPING);
const eta = sym('eta', VISCOSITY);
const a = sym('a', LENGTH);
const pi = sym('pi', DIMENSIONLESS);

/** The same wrong dictionaries as the CAS negative controls, which could only assert `not 'checked'`. */
const WRONG: ReadonlyArray<{ id: string; wrong: string; lhs: ExprNode }> = [
  { id: 'W1s', wrong: 'k ↦ C instead of k ↦ 1/C', lhs: through(op('/', k, m), [['m', L], ['k', C]]) },
  {
    id: 'W2s',
    wrong: 'b ↦ 1/R (conductance) instead of b ↦ R',
    lhs: through(op('/', op('^', b, n(2)), op('*', n(4), m, k)), [['m', L], ['k', op('/', n(1), C)], ['b', op('/', n(1), R)]]),
  },
  {
    id: 'WD2s',
    wrong: 'κ ↦ D/(ρ c_p) — the dictionary inverted',
    lhs: through(op('/', op('*', kappa, op('^', q, n(2))), op('*', rho, cp)), [['kappa', op('/', D, op('*', rho, cp))]]),
  },
  { id: 'WD5s', wrong: 'γ ↦ 6πη/a — the radius in the denominator', lhs: through(op('/', kT, gamma), [['gamma', op('/', op('*', n(6), pi, eta), a)]]) },
];

describe('the numeric probe of a symbolic witness', () => {
  it('the four registered true claims agree at every seeded point: worst relative difference ≤ 1e-15, WD5s exactly 0', () => {
    expect(NUMERIC_PROBE_POINTS).toBe(8);
    expect(NUMERIC_PROBE_TOLERANCE).toBe(1e-12);
    for (const id of SYMBOLIC_IDS) {
      const p = probeSymbolicWitness(symbolic(id));
      expect(p.kind, id).toBe('numeric-agrees');
      expect(p.points, id).toBe(NUMERIC_PROBE_POINTS);
      expect(p.worst, id).toBeLessThanOrEqual(1e-15); // measured 1.0e-16 at most
    }
    expect(probeSymbolicWitness(symbolic('WD5s')).worst).toBe(0);
  });

  it('each wrong dictionary of the CAS controls is numerically REFUTED, by O(1)', () => {
    for (const { id, wrong, lhs } of WRONG) {
      const p = probeSymbolicWitness({ ...symbolic(id), id: `${id}-wrong`, lhs });
      expect(p.kind, `${id}: ${wrong}`).toBe('numeric-refuted');
      expect(p.worst, `${id}: ${wrong}`).toBeGreaterThan(0.1);
    }
  });

  it('is seeded by the witness id, so a re-run sees the same points and the same worst value', () => {
    const first = probeSymbolicWitness(symbolic('W2s'));
    const second = probeSymbolicWitness(symbolic('W2s'));
    expect(second).toEqual(first);
  });

  it('a claim the evaluator cannot reach a finite number for is numeric-not-run, never refuted', () => {
    // 1/0: the evaluator refuses a non-finite operator result (a name such as '1e400' is a free symbol to it, not a literal).
    const p = probeSymbolicWitness({ id: 'probe-inf', lhs: op('/', n(1), n(0)), rhs: op('/', n(1), n(0)) });
    expect(p.kind).toBe('numeric-not-run');
    expect(p.points).toBe(0);
    expect(p.worst).toBeUndefined();
  });

  it('two free symbols that are not equal are refuted (the probe reads the claim, not the dictionary)', () => {
    const p = probeSymbolicWitness({ id: 'probe-ab', lhs: sym('a', LENGTH), rhs: sym('b', LENGTH) });
    expect(p.kind).toBe('numeric-refuted');
  });
});

describe('the probe rides on the symbolic run without touching the CAS result', () => {
  it('with a stub simplifier the CAS status follows the stub and the probe is its own field', async () => {
    const notSimplified = async (e: ExprNode) => ({ expr: e, simplified: false });
    const r = await runSymbolicWitness(symbolic('W1s'), notSimplified);
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('not-simplified');
    expect(r.numericProbe.kind).toBe('numeric-agrees');
    const wrong = await runSymbolicWitness({ ...symbolic('W1s'), id: 'W1s-wrong', lhs: WRONG[0]!.lhs }, notSimplified);
    expect(wrong.status).toBe('unresolved');
    expect(wrong.numericProbe.kind).toBe('numeric-refuted');
    const absent = await runSymbolicWitness(symbolic('W1s'), null);
    expect(absent.reason).toBe('peer-absent');
    expect(absent.numericProbe.kind).toBe('numeric-agrees');
  });

  it.skipIf(!peerPresent && !peerRequired)('with the real peer every registered symbolic witness keeps the CAS status and detail the committed artifact records', async () => {
    for (const id of SYMBOLIC_IDS) {
      const row = committed.results.find((r) => r.witnessId === id);
      const r = await runSymbolicWitness(symbolic(id));
      expect(r.status, id).toBe(row?.status);
      expect(r.detail, id).toBe(row?.detail);
      expect(r.numericProbe.kind, id).toBe('numeric-agrees');
    }
  });

  it('the artifact rows carry no probe, so the published evidence derivation is unchanged', async () => {
    const artifact = await runWitnessRegistry(WITNESS_REGISTRY.filter((w) => w.kind === 'symbolic'), null);
    expect(artifact.results).toHaveLength(SYMBOLIC_IDS.length);
    for (const row of artifact.results) {
      expect(Object.keys(row).sort()).toEqual(['detail', 'kind', 'reason', 'recordId', 'status', 'witnessId']);
    }
  });

  it('the numeric and the CAS outcomes are tallied as two sets of numbers, never one', async () => {
    const notSimplified = async (e: ExprNode) => ({ expr: e, simplified: false });
    const results = [
      ...(await Promise.all(SYMBOLIC_IDS.map((id) => runSymbolicWitness(symbolic(id), notSimplified)))),
      ...(await Promise.all(WRONG.map((w) => runSymbolicWitness({ ...symbolic(w.id), id: `${w.id}-wrong`, lhs: w.lhs }, notSimplified)))),
    ];
    expect(tallySymbolicResults(results)).toEqual({
      cas: { checked: 0, refuted: 0, unresolved: 8 },
      numeric: { agrees: 4, refuted: 4, notRun: 0 },
    });
  });
});
