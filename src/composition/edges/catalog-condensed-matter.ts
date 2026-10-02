/**
 * Condensed-matter & non-equilibrium bridges (emergence, condensed-matter/high-energy, non-equilibrium stat-mech, phase transitions).
 *
 * Catalog edge definitions, split by physics domain from the former
 * `catalog-full.ts` god-file (re-exported via `catalog-full.ts`).
 *
 * @module composition/edges/catalog-condensed-matter
 */

import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS, TEMPERATURE } from '../../dimensional/types.js';
import { sym } from '../../dimensional/ast-builders.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import { evaluateCoarseningLength } from '../../bridges/equations/be-15-emergence.js';
import { evaluateEffectiveTemperature } from '../../bridges/equations/be-27-effective-temperature.js';
import { evaluateHertzMillis } from '../../bridges/equations/be-33-hertz-millis.js';
import { evaluateKibbleZurek } from '../../bridges/equations/be-34-kibble-zurek.js';
import { evaluateSYKResistivity } from '../../bridges/equations/be-23-syk-planckian.js';
import { evaluateTEE } from '../../bridges/equations/be-22-topological-entanglement.js';
import type { BridgeEdge } from '../edge.js';
import {
  activeNoiseEnergyQ,
  areaLawCoefficientQ,
  boundaryLengthQ,
  carrierDensityQ,
  coarseningLengthQ,
  defectDensityQ,
  defectRestMassQ,
  dynamicExponentZQ,
  effectiveMassQ,
  effectiveTemperatureQ,
  microscopicRelaxationTimeQ,
  modelAMobilityQ,
  quantumCorrelationLengthQ,
  quenchTimescaleQ,
  referenceCorrelationLengthQ,
  referenceTemperatureQ,
  reheatingTemperatureQ,
  residualResistivityQ,
  resistivityQ,
  spatialDimensionQ,
  staticExponentNuQ,
  subsystemEntanglementEntropyQ,
  sykCoefficientQ,
  temperatureQ,
  timeQ,
  topologicalEntanglementEntropyQ,
} from '../quantities.js';
import { isFin, BE33_HERTZ_MILLIS_SYMBOLIC } from './_catalog-helpers.js';

/**
 * BE-15 Kawasaki-Gunton coarsening length: (model-a-mobility, time) →
 * L(t) = √(Γ t). Wraps `evaluateCoarseningLength` (Γ in m²/s, t in s; returns
 * m). Endpoints differ in `scale` (microscale kinetic coefficient → emergent
 * correlation length): a bridge.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be15Edge: BridgeEdge = {
  id: 'be-15',
  beId: 15,
  kind: 'bridge',
  label: 'Model A coarsening length L(t) = √(Γ t)',
  sources: [modelAMobilityQ, timeQ],
  target: coarseningLengthQ,
  confidence: 'speculative',
  domain: {
    description: 'Γ > 0 and t > 0 (all SI)',
    predicate: (i) =>
      isFin(i['model-a-mobility']) &&
      i['model-a-mobility'] > 0 &&
      isFin(i['time']) &&
      i['time'] > 0,
  },
  evaluate: (i) =>
    evaluateCoarseningLength({ gamma: i['model-a-mobility'], t: i['time'] }),
  citation: 'Kawasaki & Gunton 1976 PRA 13:2294; Hohenberg & Halperin 1977 RMP 49:435',
};

/**
 * BE-22 topological entanglement entropy: (area-law-coefficient,
 * boundary-length, topological-entanglement-entropy) → S(R) = α·L − γ (nats).
 * Wraps `evaluateTEE` (α in m⁻¹, L in m, γ in nats; returns nats).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be22Edge: BridgeEdge = {
  id: 'be-22',
  beId: 22,
  kind: 'bridge',
  label: 'Topological entanglement entropy S(R) = α·L − γ',
  sources: [areaLawCoefficientQ, boundaryLengthQ, topologicalEntanglementEntropyQ],
  target: subsystemEntanglementEntropyQ,
  confidence: 'speculative',
  domain: {
    description: 'α finite, L ≥ 0, γ finite',
    predicate: (i) =>
      isFin(i['area-law-coefficient']) &&
      isFin(i['boundary-length']) &&
      i['boundary-length'] >= 0 &&
      isFin(i['topological-entanglement-entropy']),
  },
  evaluate: (i) =>
    evaluateTEE({
      alpha_per_meter: i['area-law-coefficient'],
      perimeter_m: i['boundary-length'],
      gamma: i['topological-entanglement-entropy'],
    }),
  citation: 'Kitaev & Preskill 2006 PRL 96:110404; Levin & Wen 2006 PRL 96:110405',
};

/**
 * BE-23 SYK Planckian resistivity: (residual-resistivity, effective-mass,
 * carrier-density, temperature, syk-coefficient) →
 * ρ(T) = ρ_0 + (m* k_B T)/(n_e e² ℏ) · α_SYK. Wraps `evaluateSYKResistivity`
 * (SI; returns Ω·m). Uses `effective-mass` (carrier band mass), DISTINCT from
 * the gravitational `mass` node — the namespacing gate in action. Reuses the
 * canonical `temperature` node.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be23Edge: BridgeEdge = {
  id: 'be-23',
  beId: 23,
  kind: 'bridge',
  label: 'SYK Planckian resistivity ρ(T) = ρ_0 + (m* k_B T)/(n_e e² ℏ)·α_SYK',
  sources: [residualResistivityQ, effectiveMassQ, carrierDensityQ, temperatureQ, sykCoefficientQ],
  target: resistivityQ,
  confidence: 'speculative',
  domain: {
    description: 'ρ_0 ≥ 0, m* > 0, n_e > 0, T ≥ 0, α_SYK finite',
    predicate: (i) =>
      isFin(i['residual-resistivity']) &&
      i['residual-resistivity'] >= 0 &&
      isFin(i['effective-mass']) &&
      i['effective-mass'] > 0 &&
      isFin(i['carrier-density']) &&
      i['carrier-density'] > 0 &&
      isFin(i['temperature']) &&
      i['temperature'] >= 0 &&
      isFin(i['syk-coefficient']),
  },
  evaluate: (i) =>
    evaluateSYKResistivity({
      rho_0: i['residual-resistivity'],
      m_star_kg: i['effective-mass'],
      n_e_per_m3: i['carrier-density'],
      T_K: i['temperature'],
      alpha_SYK: i['syk-coefficient'],
    }),
  citation: 'Sachdev & Ye 1993 PRL 70:3339; Hartnoll 2015 Nature Phys. 11:54',
};

/**
 * BE-27 Cugliandolo-Kurchan effective temperature: (temperature,
 * active-noise-energy) → T_eff = T(1 + Σ_active/(k_B T)). Wraps
 * `evaluateEffectiveTemperature` (T in K, Σ in J; returns K). Reuses the
 * canonical `temperature` node. The symbolic form is the same algebra,
 * T·(1 + Σ_active/(k_B T)).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
const BE27_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '*',
  args: [
    sym('temperature', TEMPERATURE),
    {
      kind: 'op',
      op: '+',
      args: [
        sym('1', DIMENSIONLESS),
        {
          kind: 'op',
          op: '/',
          args: [
            sym('active-noise-energy', activeNoiseEnergyQ.dim),
            {
              kind: 'op',
              op: '*',
              args: [sym('k_B', CONSTANTS.k_B.dim), sym('temperature', TEMPERATURE)],
            },
          ],
        },
      ],
    },
  ],
};

export const be27Edge: BridgeEdge = {
  id: 'be-27',
  beId: 27,
  kind: 'bridge',
  label: 'Effective temperature T_eff = T(1 + Σ_active/(k_B T))',
  sources: [temperatureQ, activeNoiseEnergyQ],
  target: effectiveTemperatureQ,
  confidence: 'speculative',
  domain: {
    description: 'T > 0 and Σ_active finite',
    predicate: (i) =>
      isFin(i['temperature']) &&
      i['temperature'] > 0 &&
      isFin(i['active-noise-energy']),
  },
  evaluate: (i) =>
    evaluateEffectiveTemperature({
      T_K: i['temperature'],
      Sigma_active_J: i['active-noise-energy'],
    }),
  symbolic: BE27_SYMBOLIC,
  citation: 'Cugliandolo & Kurchan 1993 J. Phys. A 26:L401',
};

export const be33Edge: BridgeEdge = {
  id: 'be-33',
  beId: 33,
  kind: 'bridge',
  label: 'Hertz-Millis correlation length ξ(T) = ξ_0 (T/T_0)^(−1/z)',
  sources: [referenceCorrelationLengthQ, temperatureQ, referenceTemperatureQ, staticExponentNuQ, dynamicExponentZQ],
  target: quantumCorrelationLengthQ,
  confidence: 'speculative',
  domain: {
    description: 'ξ_0 > 0, T > 0, T_0 > 0, ν finite, z ≠ 0',
    predicate: (i) =>
      isFin(i['reference-correlation-length']) &&
      i['reference-correlation-length'] > 0 &&
      isFin(i['temperature']) &&
      i['temperature'] > 0 &&
      isFin(i['reference-temperature']) &&
      i['reference-temperature'] > 0 &&
      isFin(i['static-exponent-nu']) &&
      isFin(i['dynamic-exponent-z']) &&
      i['dynamic-exponent-z'] !== 0,
  },
  evaluate: (i) =>
    evaluateHertzMillis({
      xi_0_m: i['reference-correlation-length'],
      T_K: i['temperature'],
      T_0_K: i['reference-temperature'],
      nu: i['static-exponent-nu'],
      z: i['dynamic-exponent-z'],
    }),
  symbolic: BE33_HERTZ_MILLIS_SYMBOLIC,
  citation: 'Hertz 1976 PRB 14:1165; Millis 1993 PRB 48:7183; Sachdev 2011 QPT 2nd ed. Ch.11',
};

/**
 * BE-34 Kibble-Zurek defect density: (quench-timescale,
 * microscopic-relaxation-time, spatial-dimension, static-exponent-nu,
 * dynamic-exponent-z, defect-rest-mass, reheating-temperature) →
 * n = (τ_Q/τ_0)^(−dν/(1+zν))·exp(−mc²/(k_B T_reh)). Wraps `evaluateKibbleZurek`
 * (SI; returns dimensionless). Reuses BE-33's `static-exponent-nu` and
 * `dynamic-exponent-z` nodes (same critical exponents).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be34Edge: BridgeEdge = {
  id: 'be-34',
  beId: 34,
  kind: 'bridge',
  label: 'Kibble-Zurek n = (τ_Q/τ_0)^(−dν/(1+zν))·exp(−mc²/k_B T_reh)',
  sources: [
    quenchTimescaleQ,
    microscopicRelaxationTimeQ,
    spatialDimensionQ,
    staticExponentNuQ,
    dynamicExponentZQ,
    defectRestMassQ,
    reheatingTemperatureQ,
  ],
  target: defectDensityQ,
  confidence: 'established',
  domain: {
    description: 'τ_Q>0, τ_0>0, d/ν/z finite, m_defect≥0, T_reh>0, 1+zν≠0',
    predicate: (i) =>
      isFin(i['quench-timescale']) &&
      i['quench-timescale'] > 0 &&
      isFin(i['microscopic-relaxation-time']) &&
      i['microscopic-relaxation-time'] > 0 &&
      isFin(i['spatial-dimension']) &&
      isFin(i['static-exponent-nu']) &&
      isFin(i['dynamic-exponent-z']) &&
      isFin(i['defect-rest-mass']) &&
      i['defect-rest-mass'] >= 0 &&
      isFin(i['reheating-temperature']) &&
      i['reheating-temperature'] > 0 &&
      1 + i['dynamic-exponent-z'] * i['static-exponent-nu'] !== 0,
  },
  evaluate: (i) =>
    evaluateKibbleZurek({
      tau_Q: i['quench-timescale'],
      tau_0: i['microscopic-relaxation-time'],
      d: i['spatial-dimension'],
      nu: i['static-exponent-nu'],
      z: i['dynamic-exponent-z'],
      m_defect: i['defect-rest-mass'],
      T_reh: i['reheating-temperature'],
    }),
  citation: 'Kibble 1976 J. Phys. A 9:1387; Zurek 1985 Nature 317:505',
};
