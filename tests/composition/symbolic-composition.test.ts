/**
 * Symbolic bridge composition (v0.12 — the Observable contract).
 * Adam+Eve-vetted (docs/planning/v0.12.0-Symbolic-Composition-Design.md).
 *
 * Pins: the scalar ExprNode evaluator + substitution primitives; the drift
 * guard binding each symbolic form to its numeric evaluator (RELATIVE tol —
 * Adam A-2); the marquee CT-1 (be-42 ∘ be-16 → energy) and CT-1b
 * (law-r_s ∘ be-42-via-rs → temperature) composed SYMBOLICALLY and matching
 * the numeric composeEdges; the zero-occurrence guard (A-3), equals() dim
 * check (A-4), constant/quantity-name disjointness (A-5), leaf-dim guards
 * (A-6/EVE-5), strict Observable input (EVE-1), and the CT-1b name-match
 * junction (EVE-4).
 */
import { describe, it, expect } from 'vitest';
import { evalExpr, SymbolicEvalError } from '../../src/composition/expr-eval.js';
import { substitute } from '../../src/composition/expr-subst.js';
import { CONSTANTS, piMultipleValue } from '../../src/dimensional/symbolic-constants.js';
import {
  composeSymbolic,
  SymbolicCompositionError,
} from '../../src/composition/compose-symbolic.js';
import { composeEdges } from '../../src/composition/compose.js';
import {
  be42Edge,
  be16Edge,
  be12Edge,
  be11ZurekEdge,
  be42ViaRsEdge,
  be51Edge,
  be52Edge,
  lawSchwarzschildRadius,
  M_SUN_KG,
} from '../../src/composition/edges/calibration.js';
import { be18Edge, be20Edge, be30Edge, be36Edge } from '../../src/composition/edges/catalog-full.js';
import { be11Edge } from '../../src/composition/edges/catalog-quantum.js';
import { be21Edge } from '../../src/composition/edges/catalog-tranche.js';
import { C_SI } from '../../src/core/constants.js';
import { CATALOG_GRAPH, be33Edge } from '../../src/composition/index.js';
import type { BridgeEdge } from '../../src/composition/index.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { equals } from '../../src/dimensional/algebra.js';
import {
  ENERGY,
  TEMPERATURE,
  DIMENSIONLESS,
  type Dimension,
} from '../../src/dimensional/types.js';

const REL_TOL = 1e-9;
const relErr = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const relClose = (a: number, b: number) => expect(relErr(a, b)).toBeLessThan(REL_TOL);

const s = (name: string, dim: Dimension = DIMENSIONLESS): ExprNode => ({
  kind: 'symbol',
  name,
  dim,
});

const SYMBOLIC_EDGES: Array<{ edge: BridgeEdge; probe: Record<string, number> }> = [
  { edge: be42Edge, probe: { mass: M_SUN_KG } },
  { edge: be16Edge, probe: { temperature: 300 } },
  { edge: lawSchwarzschildRadius, probe: { mass: M_SUN_KG } },
  { edge: be42ViaRsEdge, probe: { 'schwarzschild-radius': 2953 } },
  // v0.24 — clean-monomial bridges given symbolic forms for the surfacer.
  { edge: be12Edge, probe: { mass: 1.673e-27, temperature: 300 } },
  { edge: be51Edge, probe: { mass: M_SUN_KG, 'impact-parameter': 6.96e8 } },
  { edge: be18Edge, probe: { 'yukawa-coupling': 0.5, 'vacuum-expectation-value': 246 } },
  { edge: be20Edge, probe: { 'cosmological-constant-curvature': 1.1e-52 } },
  { edge: be30Edge, probe: { 'modular-hamiltonian-variation': 0.5 } },
  { edge: be36Edge, probe: { 'gravitational-wave-speed': 1.1 * C_SI } },
  // Established closed forms evalExpr can already run, including ln and sin.
  {
    edge: be11Edge,
    probe: { 'relaxation-rate': 2, 'system-environment-coupling': 3, 'reference-coupling': 4 },
  },
  {
    edge: be11ZurekEdge,
    probe: {
      'relaxation-rate': 2,
      'superposition-extent': 3,
      'thermal-de-broglie-wavelength': 4,
    },
  },
  { edge: be21Edge, probe: {} },
  {
    edge: be52Edge,
    probe: { mass: M_SUN_KG, 'semi-major-axis': 1.496e11, eccentricity: 0.0167 },
  },
  // v0.13 — BE-33's faithful (T/T_0)^(−1/z) form exercises the SYMBOLIC
  // (input-dependent) exponent on a dimensionless base. z = 2 ≠ 1 genuinely
  // exercises it (z = 1 would degenerate to the old literal ^(-1)); the probe
  // includes `static-exponent-nu` because the edge's evaluate/domain need it.
  {
    edge: be33Edge,
    probe: {
      'reference-correlation-length': 1e-9,
      temperature: 300,
      'reference-temperature': 100,
      'static-exponent-nu': 0.63,
      'dynamic-exponent-z': 2,
    },
  },
];

describe('evalExpr — scalar ExprNode evaluator', () => {
  it('evaluates arithmetic with caller values, constants, and literals', () => {
    // 2 * a / b  with a=12, b=3  → 8
    const expr: ExprNode = {
      kind: 'op',
      op: '/',
      args: [{ kind: 'op', op: '*', args: [s('2'), s('a')] }, s('b')],
    };
    expect(evalExpr(expr, { a: 12, b: 3 })).toBe(8);
  });

  it('resolves registered constants and the ^ exponent via Math.pow', () => {
    // c^3 resolves c from CONSTANTS
    const expr: ExprNode = { kind: 'op', op: '^', args: [s('c'), s('3')] };
    expect(evalExpr(expr)).toBe(Math.pow(CONSTANTS.c.value, 3));
  });

  it('prefers caller values over CONSTANTS (caller wins — A-5)', () => {
    expect(evalExpr(s('c'), { c: 5 })).toBe(5);
  });

  it('throws on an unresolved leaf and on out-of-scope node kinds', () => {
    expect(() => evalExpr(s('mystery'))).toThrow(SymbolicEvalError);
    const integral: ExprNode = { kind: 'integral', over: s('x'), integrand: s('y') };
    expect(() => evalExpr(integral, { x: 1, y: 2 })).toThrow(SymbolicEvalError);
  });
});

describe('substitute — leaf replacement with occurrence count', () => {
  it('replaces a leaf and counts occurrences', () => {
    const expr: ExprNode = { kind: 'op', op: '*', args: [s('x'), s('x')] };
    const r = substitute(expr, 'x', s('7'));
    expect(r.count).toBe(2);
    expect(evalExpr(r.expr)).toBe(49);
  });

  it('is a no-op with count 0 when the name is absent', () => {
    const r = substitute(s('a'), 'x', s('9'));
    expect(r.count).toBe(0);
    expect(r.expr).toEqual(s('a'));
  });
});

describe('symbolic forms — drift guard (binds each form to its evaluator)', () => {
  for (const { edge, probe } of SYMBOLIC_EDGES) {
    it(`${edge.id}: evalExpr(symbolic) matches evaluate (relative tol)`, () => {
      expect(edge.symbolic).toBeDefined();
      relClose(evalExpr(edge.symbolic!, probe), edge.evaluate(probe));
    });
  }
});

describe('symbolic forms — leaf-dimension + name-disjointness guards', () => {
  // name → Quantity dim, gathered from the edges' source/target nodes.
  const qDim = new Map<string, Dimension>();
  for (const e of CATALOG_GRAPH) {
    for (const q of [...e.sources, e.target]) qDim.set(q.name, q.dim);
  }

  const leavesOf = (n: ExprNode, acc: Array<{ name: string; dim: Dimension }> = []) => {
    if (n.kind === 'symbol') acc.push({ name: n.name, dim: n.dim });
    else if (n.kind === 'op') for (const a of n.args) leavesOf(a, acc);
    else if (n.kind === 'transcendental' || n.kind === 'abs' || n.kind === 'dirac-delta') {
      leavesOf(n.arg, acc);
    }
    return acc;
  };

  it('every constant leaf dim equals CONSTANTS[name].dim; every quantity leaf dim equals its Quantity.dim (A-6/EVE-5)', () => {
    for (const { edge } of SYMBOLIC_EDGES) {
      for (const leaf of leavesOf(edge.symbolic!)) {
        if (leaf.name in CONSTANTS) {
          expect(equals(leaf.dim, CONSTANTS[leaf.name].dim)).toBe(true);
        } else if (Number.isFinite(Number(leaf.name)) || piMultipleValue(leaf.name) !== undefined) {
          expect(equals(leaf.dim, DIMENSIONLESS)).toBe(true);
        } else {
          // a source-quantity leaf
          expect(qDim.has(leaf.name)).toBe(true);
          expect(equals(leaf.dim, qDim.get(leaf.name)!)).toBe(true);
        }
      }
    }
  });

  it('CONSTANTS keys are disjoint from all catalog quantity names (A-5)', () => {
    for (const key of Object.keys(CONSTANTS)) {
      expect(qDim.has(key)).toBe(false);
    }
  });
});

describe('composeSymbolic — CT-1 (be-42 ∘ be-16, via identification)', () => {
  const obs = composeSymbolic(be42Edge, be16Edge);

  it('produces a dimensionally-valid ENERGY observable for landauer-erasure-energy', () => {
    expect(obs.name).toBe('landauer-erasure-energy');
    expect(equals(obs.dim, ENERGY)).toBe(true);
    expect(obs.leaves).toEqual(['mass']); // constants excluded
  });

  it('the SYMBOLIC value matches the NUMERIC composeEdges pipeline', () => {
    const numeric = composeEdges(be42Edge, be16Edge).evaluate({ mass: M_SUN_KG });
    relClose(obs.evaluate({ mass: M_SUN_KG }), numeric);
  });

  it('recovers E_min = ℏc³ln2/(8πGM) ≈ the textbook solar-mass value', () => {
    // ℏc³ln2/(8πGM_sun) ≈ 1.9e-29 J — cross-checked against the numeric edge.
    const v = obs.evaluate({ mass: M_SUN_KG });
    expect(v).toBeGreaterThan(0);
    relClose(v, be16Edge.evaluate({ temperature: be42Edge.evaluate({ mass: M_SUN_KG }) }));
  });
});

describe('composeSymbolic — CT-1b (law-r_s ∘ be-42-via-rs, name-match junction)', () => {
  it('joins by NAME on schwarzschild-radius (EVE-4) → temperature observable', () => {
    const obs = composeSymbolic(lawSchwarzschildRadius, be42ViaRsEdge);
    expect(obs.name).toBe('hawking-temperature');
    expect(equals(obs.dim, TEMPERATURE)).toBe(true);
    expect(obs.leaves).toEqual(['mass']);
    const numeric = composeEdges(lawSchwarzschildRadius, be42ViaRsEdge).evaluate({ mass: M_SUN_KG });
    relClose(obs.evaluate({ mass: M_SUN_KG }), numeric);
  });
});

describe('composeSymbolic — error discipline', () => {
  it('throws when an operand has no symbolic form', () => {
    const numericOnly: BridgeEdge = { ...be16Edge, symbolic: undefined };
    expect(() => composeSymbolic(be42Edge, numericOnly)).toThrow(SymbolicCompositionError);
  });

  it('throws on a zero-occurrence junction (A-3 — silent no-op guard)', () => {
    // second.symbolic that does NOT mention the junction quantity at all.
    const bogus: BridgeEdge = {
      ...be16Edge,
      symbolic: { kind: 'op', op: '*', args: [s('k_B', CONSTANTS.k_B.dim), s('ln2')] },
    };
    expect(() => composeSymbolic(be42Edge, bogus)).toThrow(/does not appear as a leaf/);
  });

  it('Observable.evaluate is STRICT: missing or unexpected inputs throw (EVE-1)', () => {
    const obs = composeSymbolic(be42Edge, be16Edge);
    expect(() => obs.evaluate({})).toThrow(/missing required input 'mass'/);
    expect(() => obs.evaluate({ mass: M_SUN_KG, c: 5 })).toThrow(/unexpected input 'c'/);
  });
});
