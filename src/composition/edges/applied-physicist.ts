/**
 * Composition edges for BE-66, BE-67, and BE-68.
 *
 * Each edge's endpoints state the same scale and force, so `kind` is
 * `law`. None carries `formalRef`. None is a proved seed. Symbolic form
 * is absent: `μ0` is not a registered symbolic constant, and the
 * Tolman square root of a negative component is not a monomial.
 *
 * @module composition/edges/applied-physicist
 */

import { evaluateRadiationPressure } from '../../bridges/be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from '../../bridges/be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from '../../bridges/be68-tolman-ehrenfest.js';
import type { BridgeEdge } from '../edge.js';
import {
  alfvenSpeedQ,
  incidenceAngleQ,
  magneticFluxDensityQ,
  metricG00Q,
  plasmaMassDensityQ,
  poyntingFluxQ,
  properTemperatureQ,
  radiationPressureQ,
  reflectanceQ,
  tolmanInvariantQ,
} from '../quantities.js';

const finite = Number.isFinite;

/**
 * BE-66 radiation pressure:
 * (poynting-flux, reflectance, incidence-angle) → radiation-pressure,
 * `P_n = (I/c) (1+R) cos²θ`. `c` is a constant. Endpoints share the
 * classical electromagnetic attributes: a law.
 *
 * @public
 */
export const be66Edge: BridgeEdge = {
  id: 'be-66',
  beId: 66,
  kind: 'law',
  label: 'Radiation pressure P_n = (I/c) (1+R) cos²θ',
  sources: [poyntingFluxQ, reflectanceQ, incidenceAngleQ],
  target: radiationPressureQ,
  confidence: 'established',
  domain: {
    description: 'I ≥ 0, R on [0, 1], θ finite; transmission 0',
    predicate: (i) =>
      finite(i['poynting-flux']) &&
      i['poynting-flux'] >= 0 &&
      finite(i['reflectance']) &&
      i['reflectance'] >= 0 &&
      i['reflectance'] <= 1 &&
      finite(i['incidence-angle']),
  },
  evaluate: (i) =>
    evaluateRadiationPressure({
      I_W_per_m2: i['poynting-flux'],
      R: i['reflectance'],
      theta_rad: i['incidence-angle'],
    }).P_Pa,
  citation:
    'OpenStax University Physics Vol. 2 §16.5 (absorber I/c, reflector 2I/c). The (1+R) cos²θ factor is this catalog\'s assembly.',
};

/**
 * BE-67 Alfvén speed: (magnetic-flux-density, plasma-mass-density) →
 * alfven-speed, `v_A = B / √(μ0 ρ)`. `ρ` is the total mass density.
 * `μ0` is a constant. Endpoints share the classical electromagnetic
 * attributes: a law.
 *
 * @public
 */
export const be67Edge: BridgeEdge = {
  id: 'be-67',
  beId: 67,
  kind: 'law',
  label: 'Alfvén speed v_A = B / √(μ0 ρ)',
  sources: [magneticFluxDensityQ, plasmaMassDensityQ],
  target: alfvenSpeedQ,
  confidence: 'established',
  domain: {
    description: 'B ≥ 0 and ρ > 0, both finite; ρ is a mass density',
    predicate: (i) =>
      finite(i['magnetic-flux-density']) &&
      i['magnetic-flux-density'] >= 0 &&
      finite(i['plasma-mass-density']) &&
      i['plasma-mass-density'] > 0,
  },
  evaluate: (i) =>
    evaluateAlfvenSpeed({
      B_T: i['magnetic-flux-density'],
      rho_kg_per_m3: i['plasma-mass-density'],
    }).v_m_per_s,
  citation: 'Alfvén 1942 Nature 150:405. SI form B/√(μ0 ρ); ρ is the total mass density.',
};

/**
 * BE-68 Tolman–Ehrenfest: (proper-temperature, metric-g00) →
 * tolman-invariant, `T √(−g_00)`. Endpoints share the classical
 * gravitational attributes: a law. Not an identification with
 * `temperature` or `hawking-temperature`.
 *
 * @public
 */
export const be68Edge: BridgeEdge = {
  id: 'be-68',
  beId: 68,
  kind: 'law',
  label: 'Tolman–Ehrenfest invariant T √(−g_00)',
  sources: [properTemperatureQ, metricG00Q],
  target: tolmanInvariantQ,
  confidence: 'established',
  domain: {
    description: 'T > 0 and g_00 < 0, both finite',
    predicate: (i) =>
      finite(i['proper-temperature']) &&
      i['proper-temperature'] > 0 &&
      finite(i['metric-g00']) &&
      i['metric-g00'] < 0,
  },
  evaluate: (i) =>
    evaluateTolmanEhrenfest({
      T_K: i['proper-temperature'],
      g_00: i['metric-g00'],
    }).invariant_K,
  citation:
    'Tolman & Ehrenfest 1930 Phys. Rev. 36:1791 (T0 √g_44). Catalog form T √(−g_00).',
};

/** The three applied-physicist edges, in catalog-id order. @public */
export const APPLIED_PHYSICIST_EDGES: readonly BridgeEdge[] = [be66Edge, be67Edge, be68Edge];
