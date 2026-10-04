/**
 * Tests for the bridge-index integration scaffold.
 *
 * MVP behavior: the helper accepts a hand-supplied ExprNode AST for a bridge
 * equation and returns the inferred SI dimension. Encoding the full 40-bridge
 * AST library is Tier 5 work; here we pin one example (Ryu-Takayanagi-style
 * area / entropy expression) to lock in the contract.
 */

import { describe, it, expect } from 'vitest';
import {
  inferDimensionForBridge,
  EXPECTED_DIMENSION_BY_BRIDGE,
} from '../../src/dimensional/bridge-check.js';
import { ExprNode } from '../../src/dimensional/validator.js';
import {
  AREA,
  ENTROPY,
  DIMENSIONLESS,
  TIME,
  FREQUENCY,
  MASS,
  Dimension,
} from '../../src/dimensional/types.js';
import { multiply, power } from '../../src/dimensional/algebra.js';
import { LENGTH } from '../../src/dimensional/types.js';
import { k_B, l_P } from '../../src/dimensional/constants.js';
import { BE17_SPIN_DENSITY_SQUARED_RHS } from '../../src/bridges/equations/be-17-einstein-cartan.js';
import { QUANTUM_BOUNCE_RHS } from '../../src/bridges/equations/be-19-quantum-bounce.js';
import { BE22_TOPOLOGICAL_ENTANGLEMENT_RHS } from '../../src/bridges/equations/be-22-topological-entanglement.js';
import { DNA_TUNNELING_RHS } from '../../src/bridges/equations/be-26-dna-tunneling.js';
import { KIBBLE_ZUREK_RHS } from '../../src/bridges/equations/be-34-kibble-zurek.js';
import { SWAMPLAND_RHS } from '../../src/bridges/equations/be-41-swampland.js';
import { BBN_DARK_RHS } from '../../src/bridges/equations/be-47-bbn-dark-sector.js';

const sym = (name: string, dim: Dimension): ExprNode => ({ kind: 'symbol', name, dim });

/** [T^-2] for BE-19 RHS (H² in c²-rescaled Friedmann form). */
const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** [L^-2 M^2 T^-2] for BE-17 RHS (Einstein-Cartan squared-invariant spin density). */
const SPIN_DENSITY_SQUARED: Dimension = { L: -2, M: 2, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** [L^-3 T^-1] for BE-47 RHS (per-volume number density rate). */
const INV_VOLUME_PER_TIME: Dimension = multiply(power(LENGTH, -3), { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 });

describe('inferDimensionForBridge', () => {
  it('Ryu-Takayanagi-shape entropy expression infers ENTROPY', () => {
    // S = k_B A / (4 ℓ_P^2)
    const expr: ExprNode = {
      kind: 'op', op: '/',
      args: [
        { kind: 'op', op: '*', args: [sym('k_B', k_B), sym('A', AREA)] },
        {
          kind: 'op', op: '*',
          args: [
            sym('4', DIMENSIONLESS),
            { kind: 'op', op: '^', args: [sym('lP', l_P), { kind: 'symbol', name: '2', dim: DIMENSIONLESS }] },
          ],
        },
      ],
    };
    // Bridge 14 in the index is a Ryu-Takayanagi-family bridge; we pin the dim.
    const d = inferDimensionForBridge(14, expr);
    expect(d).toEqual(ENTROPY);
  });

  it('returns null when the expression itself is dimensionally inconsistent', () => {
    const expr: ExprNode = {
      kind: 'op', op: '+',
      args: [sym('A', AREA), sym('t', { L: 0, M: 0, T: 1, I: 0, Theta: 0, N: 0, J: 0 })],
    };
    expect(inferDimensionForBridge(99, expr)).toBeNull();
  });

  // --- bridgeId is now consulted (Wave-F repair, theme B). When the id is
  // present in EXPECTED_DIMENSION_BY_BRIDGE, the inferred dim is checked
  // against the expected and a mismatch returns null. Unknown ids fall
  // through to the inferred dim unchanged. ---

  it('known bridge id (BE-14) with matching inferred dim returns the inferred dim', () => {
    // BE-14 expects ENTROPY. The Ryu-Takayanagi-shape AST infers ENTROPY.
    const expr: ExprNode = {
      kind: 'op', op: '/',
      args: [
        { kind: 'op', op: '*', args: [sym('k_B', k_B), sym('A', AREA)] },
        {
          kind: 'op', op: '*',
          args: [
            sym('4', DIMENSIONLESS),
            { kind: 'op', op: '^', args: [sym('lP', l_P), { kind: 'symbol', name: '2', dim: DIMENSIONLESS }] },
          ],
        },
      ],
    };
    expect(inferDimensionForBridge(14, expr)).toEqual(ENTROPY);
  });

  it('known bridge id (BE-14) with mismatched inferred dim returns null', () => {
    // Pass a perfectly-valid expression whose inferred dim is AREA, not
    // ENTROPY. BE-14's expected-dim guard should reject it.
    const areaOnly: ExprNode = sym('A', AREA);
    expect(inferDimensionForBridge(14, areaOnly)).toBeNull();
  });

  it('unknown bridge id passes through to inferred dim (current MVP)', () => {
    // Bridge id 99999 is not in EXPECTED_DIMENSION_BY_BRIDGE. Returns the
    // inferred dim unchanged.
    const areaOnly: ExprNode = sym('A', AREA);
    expect(inferDimensionForBridge(99999, areaOnly)).toEqual(AREA);
  });

  // --- Wave-G repair (CR-F1): cross-check map extended for the 7 new
  //     AST encodings (BE-19, 22, 25, 26, 34, 41, 47). For each, the
  //     module's registered RHS must satisfy the per-bridge expected
  //     dim guard, and a deliberately-wrong AST must be rejected. ---

  describe('Wave-G expected-dimension entries (cross-check map)', () => {
    it('BE-17 (Einstein-Cartan squared-invariant RHS): infers [L^-2 M^2 T^-2]', () => {
      expect(inferDimensionForBridge(17, BE17_SPIN_DENSITY_SQUARED_RHS)).toEqual(SPIN_DENSITY_SQUARED);
    });
    it('BE-17 rejects wrong AST (AREA instead of [L^-2 M^2 T^-2])', () => {
      expect(inferDimensionForBridge(17, sym('A', AREA))).toBeNull();
    });

    it('BE-19 (RHS = H² Friedmann): infers [T^-2]', () => {
      expect(inferDimensionForBridge(19, QUANTUM_BOUNCE_RHS)).toEqual(T_INV2);
    });
    it('BE-19 rejects wrong AST (AREA instead of T^-2)', () => {
      expect(inferDimensionForBridge(19, sym('A', AREA))).toBeNull();
    });

    it('BE-22 (TEE RHS): infers DIMENSIONLESS', () => {
      expect(inferDimensionForBridge(22, BE22_TOPOLOGICAL_ENTANGLEMENT_RHS)).toEqual(DIMENSIONLESS);
    });
    it('BE-22 rejects wrong AST (TIME instead of DIMENSIONLESS)', () => {
      expect(inferDimensionForBridge(22, sym('t', TIME))).toBeNull();
    });

    // BE-25 (Orch-OR) cross-check tests REMOVED 2026-05-06 (Wave Q B2,
    // per CS iter-6 C2): the legacy AST module is archived (encodes the
    // dropped Penrose-Hameroff form). BE-25 was reformulated to IIT
    // Φ_max in Wave P-D R-D2; Φ has no SI dimension (units are bits
    // when log₂ is used). The legacy AST module's [time] inference is
    // still tested in `tests/bridges/be-25-encoding.test.ts` as an
    // archive regression — it just no longer participates in this
    // per-bridge cross-check.

    it('BE-26 (DNA-tunneling RHS): infers FREQUENCY', () => {
      expect(inferDimensionForBridge(26, DNA_TUNNELING_RHS)).toEqual(FREQUENCY);
    });
    it('BE-26 rejects wrong AST (TIME instead of FREQUENCY)', () => {
      expect(inferDimensionForBridge(26, sym('t', TIME))).toBeNull();
    });

    it('BE-34 (Kibble-Zurek RHS): infers DIMENSIONLESS', () => {
      expect(inferDimensionForBridge(34, KIBBLE_ZUREK_RHS)).toEqual(DIMENSIONLESS);
    });
    it('BE-34 rejects wrong AST (MASS instead of DIMENSIONLESS)', () => {
      expect(inferDimensionForBridge(34, sym('m', MASS))).toBeNull();
    });

    it('BE-41 (swampland RHS): infers MASS', () => {
      expect(inferDimensionForBridge(41, SWAMPLAND_RHS)).toEqual(MASS);
    });
    it('BE-41 rejects wrong AST (TIME instead of MASS)', () => {
      expect(inferDimensionForBridge(41, sym('t', TIME))).toBeNull();
    });

    it('BE-47 (BBN-dark RHS): infers [L^-3 T^-1]', () => {
      expect(inferDimensionForBridge(47, BBN_DARK_RHS)).toEqual(INV_VOLUME_PER_TIME);
    });
    it('BE-47 rejects wrong AST (FREQUENCY instead of [L^-3 T^-1])', () => {
      expect(inferDimensionForBridge(47, sym('f', FREQUENCY))).toBeNull();
    });

    it('cross-check map size matches the 40 currently-registered AST modules (post Wave Z-G BE-28 Onsager — FULL COVERAGE)', () => {
      // Wave-G originally added entries for BE-19, 22, 25, 26, 34, 41, 47
      // alongside BE-11 and BE-14 (total = 9). Wave Q B2 removed BE-25
      // (Penrose-Hameroff AST archived under Wave P-D R-D2 IIT
      // reformulation), leaving 8. Wave T added BE-12, restoring 9.
      // Wave U added BE-38 Milgrom MOND, reaching 10. Wave V (2026-05-07)
      // adds BE-24 (→11), BE-43 (→12), BE-33 (→13), BE-23 (→14), then
      // BE-40 Composite Higgs Potential (→15). Wave W (2026-05-07) adds
      // BE-49 Quantum Darwinism (→16), BE-45 TCC (→17), and BE-31
      // Benincasa-Dowker discrete Ricci scalar (→18). Wave X (2026-05-07)
      // adds BE-39 asymptotic-safety β-functions (→19).
      // Wave Y (2026-05-07) added BE-21 KSS viscosity-to-entropy bound
      // (→20), BE-29 Jarzynski free-energy equality (→21), BE-42
      // Hawking temperature (→22), BE-48 GRW mass-amplified rate (→23),
      // BE-20 observed cosmological-constant mass density (→24),
      // BE-13 trace of Einstein equations (→25),
      // BE-30 FLM first-law (→26),
      // BE-18 Higgs-like dark-fermion mass (→27).
      // Wave Z-A (2026-05-07) added 4 OpenAI-proposed dimensionless
      // reductions: BE-32 QRF Born-rule overlap (→28), BE-35 CFT
      // crossing-symmetry residual (→29), BE-46 Weinberg-Vilenkin
      // anthropic probability (→30), BE-50 Wheeler-Feynman time-
      // symmetry residual (→31). Earlier Wave Y count of 29 + Wave Z-A
      // 4 entries = 33.
      // Wave Z-B (2026-05-07) re-adds BE-25 IIT inner intrinsic
      // information ii(s,s̃) = p(s̃|s)·log₂[p(s̃|s)/p(s̃)] under the
      // IIT Φ_max reformulation (→34). The legacy Penrose-Hameroff
      // `be-25-orch-or.ts` AST remains archived (Wave Q B2); the
      // new entry references `be-25-iit-phi.ts`. ii is DIMENSIONLESS
      // (bits is a pseudo-unit not in the SI 7-base system).
      // Wave Z-C (2026-05-07) added BE-17 (Einstein-Cartan
      // squared-invariant S²_spin = (c⁴/(8πG))² · T² → [L^-2 M^2 T^-2])
      // and BE-44 (soft-hair L²-norm Q_soft² = ∫(∂_u C)² du →
      // [L^2 T^-1]), bringing the total to 36.
      // Wave Z-D (2026-05-11) added BE-15 (Model A Kawasaki-Gunton
      // coarsening L(t)² = Γ·t → [area]), bringing the total to 37.
      // OpenAI o3 Wave Z-D consultation confirmed Kawasaki-Gunton over
      // generic equipartition (which would mislabel Model A as generic
      // stat-mech).
      // Wave Z-E (2026-05-11) added BE-16 (Landauer's principle
      // E_min = k_B · T · ln(2) → [energy]), reformulating from
      // 'invalid' (broken C(ρ) ansatz) per OpenAI o3 consultation —
      // same precedent as Wave P-D BE-25 Penrose-Hameroff → IIT.
      // Bringing the total to 38.
      // Wave Z-F (2026-05-11) added BE-37 (Shapiro gravitational
      // time-delay Δt = (2GM/c³)·ln(R_far/R_near) → [time]),
      // reformulating from 'invalid' (operationally-meaningless
      // vacuum c(t,x)≠const per Ellis-Uzan 2005) per OpenAI o3
      // consultation — same Wave-P-D reformulation precedent.
      // Bringing the total to 39.
      // Wave Z-G (2026-05-11) added BE-28 (Onsager linear-response
      // entropy production σ = Σ J·X → [W/K]). User-confirmed
      // relabeling from MEPP variational principle, accepting the
      // trade-off that this does NOT capture MEPP's maximization
      // claim. Bringing the total to **40**.
      // v0.7 BE-X catalog extension (2026-05-24, parallel-agent dispatch)
      // added BE-53 (Yang-Mills β-function, DIMENSIONLESS) and BE-54
      // (Randall-Sundrum brane Friedmann, T_INV2). Updated total: **42**.
      // E1 of BRIDGE-PHYSICS-AUDIT-v2.md flagged the silent gap; this
      // commit closes it.
      // 64 is the record from before be-77..87.
      expect(EXPECTED_DIMENSION_BY_BRIDGE.size).toBe(90);
      // 75 is the record from before be-88..102.
      for (const id of [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 53, 54, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102]) {
        expect(EXPECTED_DIMENSION_BY_BRIDGE.has(id)).toBe(true);
      }
    });
  });
});
