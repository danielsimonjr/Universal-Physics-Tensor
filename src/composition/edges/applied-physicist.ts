/**
 * Composition edges for BE-66, BE-67, and BE-68.
 *
 * Each edge's endpoints state the same scale and force, so `kind` is
 * `law`. The overlay `formalRef` is kind `bridge`, so each id is a
 * seed. Confidence stays `established`: that grade is the catalog
 * status, and a proof does not promote it. `μ0` is `1/(ε0 c²)`, the
 * same product the Alfvén evaluator uses, so the leaf is `epsilon_0`
 * and `c` rather than a new canonical constant.
 *
 * @module composition/edges/applied-physicist
 */

import { evaluateRadiationPressure } from '../../bridges/be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from '../../bridges/be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from '../../bridges/be68-tolman-ehrenfest.js';
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import type { BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
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
const qsym = (q: Quantity): ExprNode => ({ kind: 'symbol', name: q.name, dim: q.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });

/** P_n = (I/c) (1+R) cos²θ. */
const BE66_SYMBOLIC: ExprNode = prod(
  ratio(qsym(poyntingFluxQ), csym('c')),
  plus(lit(1), qsym(reflectanceQ)),
  pow({ kind: 'transcendental', fn: 'cos', arg: qsym(incidenceAngleQ) }, lit(2)),
);

/** μ0 = 1/(ε0 c²). v_A = B / √(μ0 ρ). */
const BE67_SYMBOLIC: ExprNode = ratio(
  qsym(magneticFluxDensityQ),
  pow(prod(ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2)))), qsym(plasmaMassDensityQ)), lit(0.5)),
);

/** T √(−g_00), written (−1)·g_00 because unary minus is not an operator. */
const BE68_SYMBOLIC: ExprNode = prod(
  qsym(properTemperatureQ),
  pow(prod(lit(-1), qsym(metricG00Q)), lit(0.5)),
);

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
  symbolic: BE66_SYMBOLIC,
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
  symbolic: BE67_SYMBOLIC,
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
  symbolic: BE68_SYMBOLIC,
  citation:
    'Tolman & Ehrenfest 1930 Phys. Rev. 36:1791 (T0 √g_44). Catalog form T √(−g_00).',
};

/** The three applied-physicist edges, in catalog-id order. @public */
export const APPLIED_PHYSICIST_EDGES: readonly BridgeEdge[] = [be66Edge, be67Edge, be68Edge];
