/**
 * v0.10.0 T5 — catalog-tranche edges (BE-14/19/21/48/53/54).
 *
 * Per edge: one closed-form value pin (computed from the SAME constants
 * the wrapped evaluator uses — PhysicalConstants literals, or the BE-48
 * module's canonical GRW defaults — so 1e-12 pins are exact-arithmetic
 * comparisons, not fitted tolerances) and one domain-rejection case via
 * `evaluateEdge`. Plus a drift guard: every tranche edge's `beId` exists
 * in `BRIDGE_EQUATIONS` and its `confidence` equals that entry's
 * `status`.
 */
import { describe, it, expect } from 'vitest';
import {
  be14Edge,
  be19Edge,
  be21Edge,
  be48Edge,
  be53Edge,
  be54Edge,
  evaluateEdge,
  DomainViolationError,
} from '../../src/composition/index.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { PhysicalConstants } from '../../src/core/types.js';

const { hbar, c, G, kB } = PhysicalConstants;

const relErr = (actual: number, expected: number): number =>
  Math.abs(actual - expected) / Math.abs(expected);

const TRANCHE = [be14Edge, be19Edge, be21Edge, be48Edge, be53Edge, be54Edge];

describe('BE-14 — Ryu-Takayanagi edge', () => {
  it('matches S = k_B c³ A / (4 G ℏ) to relErr ≤ 1e-12', () => {
    for (const A of [1, 1e-70, 1.13e7]) {
      const expected = (kB * c * c * c * A) / (4 * G * hbar);
      expect(
        relErr(evaluateEdge(be14Edge, { 'minimal-surface-area': A }), expected),
      ).toBeLessThanOrEqual(1e-12);
    }
  });

  it('rejects negative area (domain violation)', () => {
    expect(() =>
      evaluateEdge(be14Edge, { 'minimal-surface-area': -1 }),
    ).toThrow(DomainViolationError);
  });
});

describe('BE-19 — LQC quantum-bounce edge', () => {
  // Canonical LQC critical density ≈ 0.41 ρ_Planck ≈ 2.1e96 kg/m³.
  const rho_crit = 2.1e96;
  const Lambda = 1.1056e-35; // c² Λ_[L⁻²] for Λ ≈ 1.23e-52 m⁻²

  it('matches H² = (8πG/3) ρ (1 − ρ/ρ_crit) + Λ/3 to relErr ≤ 1e-12', () => {
    for (const rho of [1e-26, 0.5 * rho_crit, rho_crit]) {
      const expected =
        ((8 * Math.PI * G) / 3) * rho * (1 - rho / rho_crit) + Lambda / 3;
      const actual = evaluateEdge(be19Edge, {
        'mass-density': rho,
        'critical-density': rho_crit,
        'rescaled-cosmological-constant': Lambda,
      });
      expect(relErr(actual, expected)).toBeLessThanOrEqual(1e-12);
    }
  });

  it('at ρ = ρ_crit the bounce factor vanishes: H² = Λ/3 exactly', () => {
    const actual = evaluateEdge(be19Edge, {
      'mass-density': rho_crit,
      'critical-density': rho_crit,
      'rescaled-cosmological-constant': Lambda,
    });
    expect(actual).toBe(Lambda / 3);
  });

  it('rejects non-positive critical density (domain violation)', () => {
    expect(() =>
      evaluateEdge(be19Edge, {
        'mass-density': 1,
        'critical-density': 0,
        'rescaled-cosmological-constant': Lambda,
      }),
    ).toThrow(DomainViolationError);
  });
});

describe('BE-21 — KSS bound edge (nullary)', () => {
  it('matches η/s = ℏ/(4π k_B) to relErr ≤ 1e-12', () => {
    const expected = hbar / (4 * Math.PI * kB);
    expect(relErr(evaluateEdge(be21Edge, {}), expected)).toBeLessThanOrEqual(
      1e-12,
    );
  });

  it('has no rejectable domain: nullary universal constant (vacuous predicate)', () => {
    // Honest adaptation: the wrapped evaluator takes NO inputs, so the
    // edge has an empty `sources` array and a vacuously true domain —
    // there is nothing to reject. Pin that shape instead.
    expect(be21Edge.sources).toHaveLength(0);
    expect(be21Edge.domain.predicate({})).toBe(true);
    expect(() => evaluateEdge(be21Edge, {})).not.toThrow();
  });
});

describe('BE-48 — GRW localization edge', () => {
  it('matches λ_GRW = λ_0 (m/m_0) with canonical defaults to relErr ≤ 1e-12', () => {
    // Same constants as the evaluator's defaults: λ_0 = 1e-16 /s,
    // m_0 = 1.67e-27 kg (GRW 1986 nucleon values).
    for (const m of [9.1093837015e-31, 1.67e-27, 1e-3]) {
      const expected = 1e-16 * (m / 1.67e-27);
      expect(
        relErr(evaluateEdge(be48Edge, { mass: m }), expected),
      ).toBeLessThanOrEqual(1e-12);
    }
  });

  it('rejects non-positive mass (domain violation)', () => {
    expect(() => evaluateEdge(be48Edge, { mass: 0 })).toThrow(
      DomainViolationError,
    );
  });
});

describe('BE-53 — Yang-Mills β-function edge', () => {
  it('matches β(g) = −b₀ g³/(16π²), QCD b₀ = 7, to relErr ≤ 1e-12', () => {
    for (const g of [0.1, 1.2, 2.5]) {
      const b0 = (11 / 3) * 3 - (2 / 3) * 6; // = 7 for N_c=3, N_f=6
      const expected = -(b0 * g * g * g) / (16 * Math.PI * Math.PI);
      const actual = evaluateEdge(be53Edge, {
        'gauge-coupling': g,
        'color-number': 3,
        'flavor-number': 6,
      });
      expect(relErr(actual, expected)).toBeLessThanOrEqual(1e-12);
    }
  });

  it('rejects non-positive color number (domain violation)', () => {
    expect(() =>
      evaluateEdge(be53Edge, {
        'gauge-coupling': 1,
        'color-number': 0,
        'flavor-number': 6,
      }),
    ).toThrow(DomainViolationError);
  });
});

describe('BE-54 — Randall-Sundrum brane edge', () => {
  it('matches H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3 to relErr ≤ 1e-12', () => {
    const sigma = 1e90;
    for (const [rho, lambda] of [[1e-26, 0], [1e89, 0], [2e90, 0], [1e-26, 3e-35]] as const) {
      const expected =
        ((8 * Math.PI * G) / 3) * rho * (1 + rho / (2 * sigma)) + lambda / 3;
      const actual = evaluateEdge(be54Edge, {
        'mass-density': rho,
        'brane-tension': sigma,
        'rescaled-cosmological-constant': lambda,
      });
      expect(relErr(actual, expected)).toBeLessThanOrEqual(1e-12);
    }
  });

  it('rejects non-positive brane tension (domain violation)', () => {
    expect(() =>
      evaluateEdge(be54Edge, { 'mass-density': 1, 'brane-tension': 0 }),
    ).toThrow(DomainViolationError);
  });
});

describe('Tranche drift guard — catalog cross-reference', () => {
  it('every tranche edge beId exists in BRIDGE_EQUATIONS and confidence === status', () => {
    for (const edge of TRANCHE) {
      const entry = BRIDGE_EQUATIONS.find((e) => e.id === edge.beId);
      expect(entry, `BE-${edge.beId} must exist in BRIDGE_EQUATIONS`).toBeDefined();
      expect(
        edge.confidence,
        `${edge.id}: confidence must equal catalog status`,
      ).toBe(entry?.status);
    }
  });
});
