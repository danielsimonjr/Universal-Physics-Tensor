/**
 * Catalog-tranche edges — six catalog-backed `BridgeEdge` wrappers
 * (v0.10.0 T5), extending the composition graph beyond the v0.8.0
 * calibration set. Each edge wraps an EXISTING validated catalog
 * evaluator (the catalog stays authoritative — design D-4) and carries
 * a first-class validity domain (G-8) mirroring exactly what the
 * wrapped evaluator enforces — no stricter, no looser.
 *
 * Tranche members:
 *   - BE-14 Ryu-Takayanagi entanglement entropy (SI form)
 *   - BE-19 LQC quantum-bounce modified Friedmann
 *   - BE-21 KSS viscosity-to-entropy bound (nullary universal constant)
 *   - BE-48 GRW mass-amplified localization rate
 *   - BE-53 Yang-Mills one-loop β-function
 *   - BE-54 Randall-Sundrum brane modified Friedmann
 *
 * Quantity-name discipline: `mass` is REUSED from the calibration
 * edges (same physical quantity, same dimension, same attributes);
 * `mass-density` and `hubble-rate-squared` are shared between BE-19
 * and BE-54 (both modified-Friedmann edges consume/produce the same
 * physical quantities in the same SI units).
 *
 * @module composition/edges/catalog-tranche
 */

import type { ExprNode } from '../../dimensional/validator.js';
import { sym } from '../../dimensional/ast-builders.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import {
  DIMENSIONLESS,
  AREA,
  ENTROPY,
  FREQUENCY,
  MASS,
} from '../../dimensional/types.js';
import type { Dimension } from '../../dimensional/types.js';
import { evaluateRyuTakayanagi } from '../../bridges/equations/be-14-ryu-takayanagi.js';
import { evaluateQuantumBounce } from '../../bridges/equations/be-19-quantum-bounce.js';
import {
  evaluateKSSBound,
  BE21_KSS_RHS,
  VISCOSITY_OVER_ENTROPY_DENSITY,
} from '../../bridges/equations/be-21-kss-bound.js';
import { evaluateGRWLocalization } from '../../bridges/equations/be-48-grw-localization.js';
import { evaluateYangMillsBeta } from '../../bridges/equations/be-53-yang-mills-beta.js';
import { evaluateRandallSundrumH2 } from '../../bridges/equations/be-54-randall-sundrum-brane.js';
import type { BridgeEdge } from '../edge.js';
import {
  boundaryEntanglementEntropyQ,
  braneTensionQ,
  colorNumberQ,
  criticalDensityQ,
  flavorNumberQ,
  gaugeCouplingQ,
  grwLocalizationRateQ,
  hubbleRateSquaredQ,
  massDensityQ,
  massQ,
  minimalSurfaceAreaQ,
  rescaledCosmologicalConstantQ,
  viscosityEntropyRatioQ,
  yangMillsBetaQ,
} from '../quantities.js';

// --- Local dimension aliases ---

/** Mass-density [M L⁻³] (kg/m³) — BE-19/BE-54 shared convention. */
const MASS_DENSITY: Dimension = {
  L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0,
};

/** [T⁻²] (s⁻²) — H² and the c²-rescaled cosmological constant. */
const T_INV2: Dimension = {
  L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0,
};

// --- Quantity nodes ---

// REUSED from calibration.ts (same name, dimension, and attributes):
// composition junctions match by name, so the physical quantity 'mass'
// must be the SAME node shape wherever it appears in the graph.
// Shared by BE-19 and BE-54 (both modified-Friedmann edges).
// Shared target of BE-19 and BE-54.
// --- Edges ---

/**
 * BE-14 Ryu-Takayanagi as a graph edge: minimal-surface-area →
 * boundary entanglement entropy, S = k_B c³ A / (4 G_N ℏ) (SI form).
 * Wraps `evaluateRyuTakayanagi` (input `area_m2` in m²; returns J/K).
 * Endpoints differ in `scale` (classical bulk geometry → quantum
 * boundary entropy): a bridge. The module also ships a natural-units
 * evaluator (`evaluateRyuTakayanagiNatural`, area in Planck areas);
 * this edge wraps the SI form so the graph stays uniformly SI.
 *
 * @public
 */
export const be14Edge: BridgeEdge = {
  id: 'be-14',
  beId: 14,
  kind: 'bridge',
  label: 'Ryu-Takayanagi entropy S = k_B c³ A / (4 G_N ℏ)',
  sources: [minimalSurfaceAreaQ],
  target: boundaryEntanglementEntropyQ,
  confidence: 'speculative',
  domain: {
    description: 'A ≥ 0 and finite (minimal-surface area)',
    predicate: (i) =>
      Number.isFinite(i['minimal-surface-area']) &&
      i['minimal-surface-area'] >= 0,
  },
  evaluate: (i) =>
    evaluateRyuTakayanagi({ area_m2: i['minimal-surface-area'] }),
  citation: 'Ryu & Takayanagi 2006 PRL 96:181602',
};

/**
 * BE-19 LQC quantum bounce as a graph edge:
 * (mass-density, critical-density, rescaled-cosmological-constant) →
 * H² = (8πG/3) ρ (1 − ρ/ρ_crit) + Λ/3. Wraps `evaluateQuantumBounce`
 * (SI inputs kg/m³, kg/m³, s⁻²; returns H² in s⁻²). Λ here is the
 * c²-rescaled [T⁻²] form (Λ_[T⁻²] = c² Λ_[L⁻²], Ryden §6 convention).
 *
 * Domain mirrors the evaluator exactly: ρ ≥ 0, ρ_crit > 0, Λ finite.
 * The evaluator does NOT reject ρ > ρ_crit — super-critical densities
 * are admitted and the bounce factor (1 − ρ/ρ_crit) simply goes
 * negative (H² < 0 signals the classically forbidden region) — so
 * neither does this edge.
 *
 * @public
 */
export const be19Edge: BridgeEdge = {
  id: 'be-19',
  beId: 19,
  kind: 'bridge',
  label: 'LQC bounce H² = (8πG/3) ρ (1 − ρ/ρ_crit) + Λ/3',
  sources: [massDensityQ, criticalDensityQ, rescaledCosmologicalConstantQ],
  target: hubbleRateSquaredQ,
  confidence: 'speculative',
  domain: {
    description: 'ρ ≥ 0, ρ_crit > 0, Λ finite (all SI)',
    predicate: (i) =>
      Number.isFinite(i['mass-density']) &&
      i['mass-density'] >= 0 &&
      Number.isFinite(i['critical-density']) &&
      i['critical-density'] > 0 &&
      Number.isFinite(i['rescaled-cosmological-constant']),
  },
  evaluate: (i) =>
    evaluateQuantumBounce({
      rho: i['mass-density'],
      rho_crit: i['critical-density'],
      Lambda_Tinv2: i['rescaled-cosmological-constant'],
    }),
  citation: 'Ashtekar, Pawlowski & Singh 2006 PRD 74:084003',
};

/**
 * BE-21 KSS bound as a graph edge: () → η/s = ℏ/(4π k_B).
 * Wraps `evaluateKSSBound` (nullary; returns the saturating
 * viscosity-to-entropy-density ratio in K·s — dimension [T Θ], NOT
 * dimensionless; the famous "1/4π" is the natural-units value).
 *
 * Adaptation note: the evaluator takes NO inputs — the bound is a
 * universal constant — so this edge has an EMPTY `sources` array, its
 * `evaluate` ignores its argument, and its domain predicate is
 * vacuously true (there are no inputs to reject).
 *
 * @public
 */
export const be21Edge: BridgeEdge = {
  id: 'be-21',
  beId: 21,
  kind: 'bridge',
  label: 'KSS bound η/s = ℏ/(4π k_B)',
  sources: [],
  target: viscosityEntropyRatioQ,
  confidence: 'established',
  domain: {
    description: 'universal constant — no inputs (vacuously valid)',
    predicate: () => true,
  },
  evaluate: () => evaluateKSSBound(),
  symbolic: BE21_KSS_RHS,
  citation: 'Kovtun, Son & Starinets 2005 PRL 94:111601',
  // -- Atlas Phase 1 overlay: mirrors BRIDGE_EQUATIONS' row, which carries the
  // full '// source:' citation. tests/atlas/audited-catalog.test.ts deep-equals
  // the two, so this copy cannot silently drift from the row.
  relation: {
    type: 'derivation',
    transformation:
      'strongly-coupled large-N quantum fluid -> its two-derivative ' +
      'Einstein-gravity dual: eta from the graviton absorption cross-section, ' +
      's from the horizon area',
  },
};

/**
 * BE-48 GRW mass-amplified localization as a graph edge:
 * mass → λ_GRW(m) = λ_0 (m/m_0). Wraps `evaluateGRWLocalization`
 * with the canonical defaults m_0 = 1.67×10⁻²⁷ kg (nucleon mass) and
 * λ_0 = 10⁻¹⁶ s⁻¹ (GRW 1986); input mass in kg, returns rate in s⁻¹.
 * Endpoints differ in `scale` (classical mass → quantum collapse
 * rate): a bridge. Uses the centralized `mass` quantity node (`src/composition/quantities.ts` — the v0.11 centralization fixed this docstring's previously-false "reuses calibration's node" claim, Adam vet A-2) node.
 *
 * @public
 */
export const be48Edge: BridgeEdge = {
  id: 'be-48',
  beId: 48,
  kind: 'bridge',
  label: 'GRW localization rate λ_GRW = λ_0 (m/m_0)',
  sources: [massQ],
  target: grwLocalizationRateQ,
  confidence: 'speculative',
  domain: {
    description: 'm > 0 and finite (object mass)',
    predicate: (i) => Number.isFinite(i['mass']) && i['mass'] > 0,
  },
  evaluate: (i) => evaluateGRWLocalization({ m_kg: i['mass'] }),
  citation: 'Ghirardi, Rimini & Weber 1986 PRD 34:470',
  // -- Atlas Phase 1 overlay: mirrors BRIDGE_EQUATIONS' row, which carries the
  // full '// source:' citation. tests/atlas/audited-catalog.test.ts deep-equals
  // the two, so this copy cannot silently drift from the row.
  relation: {
    type: 'derivation',
    transformation:
      'single-nucleon GRW localization rate lambda_0 at reference mass m_0 -> ' +
      'composite-mass rate lambda_GRW(m) = lambda_0 (m/m_0) by the GRW (QMSL) ' +
      'centre-of-mass amplification lambda_macro = N lambda_micro',
  },
};

/**
 * BE-53 Yang-Mills one-loop β-function as a graph edge:
 * (gauge-coupling, color-number, flavor-number) →
 * β(g) = −b₀ g³/(16π²) with b₀ = (11/3)N_c − (2/3)N_f.
 * Wraps `evaluateYangMillsBeta` (all dimensionless; RG-discipline).
 * The sparse regime axes cannot express the UV↔IR scale-flow this
 * bridge mediates (asymptotic freedom: g → 0 in the UV); `kind:
 * 'bridge'` follows the catalog classification.
 *
 * Domain mirrors the evaluator: g finite, N_c > 0, N_f ≥ 0 (the
 * evaluator does not enforce integrality of N_c/N_f and neither does
 * this edge — analytic continuation in N_c, N_f is standard RG
 * practice).
 *
 * @public
 */
export const be53Edge: BridgeEdge = {
  id: 'be-53',
  beId: 53,
  kind: 'bridge',
  label: 'Yang-Mills β(g) = −[(11/3)N_c − (2/3)N_f] g³/(16π²)',
  sources: [gaugeCouplingQ, colorNumberQ, flavorNumberQ],
  target: yangMillsBetaQ,
  confidence: 'established',
  domain: {
    description: 'g finite, N_c > 0, N_f ≥ 0',
    predicate: (i) =>
      Number.isFinite(i['gauge-coupling']) &&
      Number.isFinite(i['color-number']) &&
      i['color-number'] > 0 &&
      Number.isFinite(i['flavor-number']) &&
      i['flavor-number'] >= 0,
  },
  evaluate: (i) =>
    evaluateYangMillsBeta({
      g: i['gauge-coupling'],
      N_c: i['color-number'],
      N_f: i['flavor-number'],
    }),
  citation: 'Gross & Wilczek 1973 PRL 30:1343; Politzer 1973 PRL 30:1346',
};

/**
 * BE-54 Randall-Sundrum brane cosmology as a graph edge:
 * (mass-density, brane-tension, rescaled-cosmological-constant) →
 * H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3.
 * The wrapped evaluator drops Λ/3 and the Weyl C/a⁴ term. The edge
 * adds Λ/3, the term the theorem and `formula_latex` include, using
 * the same `rescaled-cosmological-constant` node as {@link be19Edge}.
 * The Weyl term stays out: it is not in the theorem.
 *
 * @public
 */
const BE54_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '+',
  args: [
    {
      kind: 'op',
      op: '*',
      args: [
        {
          kind: 'op',
          op: '/',
          args: [
            {
              kind: 'op',
              op: '*',
              args: [sym('8pi', CONSTANTS['8pi'].dim), sym('G', CONSTANTS.G.dim)],
            },
            sym('3', DIMENSIONLESS),
          ],
        },
        sym('mass-density', massDensityQ.dim),
        {
          kind: 'op',
          op: '+',
          args: [
            sym('1', DIMENSIONLESS),
            {
              kind: 'op',
              op: '/',
              args: [
                sym('mass-density', massDensityQ.dim),
                {
                  kind: 'op',
                  op: '*',
                  args: [sym('2', DIMENSIONLESS), sym('brane-tension', braneTensionQ.dim)],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'op',
      op: '/',
      args: [
        sym('rescaled-cosmological-constant', rescaledCosmologicalConstantQ.dim),
        sym('3', DIMENSIONLESS),
      ],
    },
  ],
};

export const be54Edge: BridgeEdge = {
  id: 'be-54',
  beId: 54,
  kind: 'bridge',
  label: 'Randall-Sundrum brane H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3',
  sources: [massDensityQ, braneTensionQ, rescaledCosmologicalConstantQ],
  target: hubbleRateSquaredQ,
  confidence: 'speculative',
  domain: {
    description: 'ρ ≥ 0, σ > 0, Λ finite (all SI)',
    predicate: (i) =>
      Number.isFinite(i['mass-density']) &&
      i['mass-density'] >= 0 &&
      Number.isFinite(i['brane-tension']) &&
      i['brane-tension'] > 0 &&
      Number.isFinite(i['rescaled-cosmological-constant']),
  },
  evaluate: (i) =>
    evaluateRandallSundrumH2({
      rho_kg_per_m3: i['mass-density'],
      sigma_kg_per_m3: i['brane-tension'],
    }) + i['rescaled-cosmological-constant'] / 3,
  symbolic: BE54_SYMBOLIC,
  citation: 'Randall & Sundrum 1999 PRL 83:4690; Binétruy et al. 2000 PLB 477:285',
};
