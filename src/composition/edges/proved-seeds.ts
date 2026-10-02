/**
 * Composition edges for proved catalog seeds that had no graph edge.
 *
 * BE-40 is a `law`: the SILH potential is one electroweak regime, and
 * `REJECTED_BRIDGE_IDS` records that adjudication. The edge stays out of
 * `CATALOG_FULL_EDGES` so that array's rejection guard still holds. The
 * theorem states V(h), so the graph carries the equation.
 *
 * BE-55, BE-59, BE-60, and BE-63 are bridges. BE-55 and BE-60 share one
 * `hall-conductance` target. BE-63's target is the existing `mass` node.
 *
 * @module composition/edges/proved-seeds
 */

import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { sym } from '../../dimensional/ast-builders.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import { C_SI, G_SI, HBAR_SI, M_U_SI } from '../../core/constants.js';
import { evaluateCompositeHiggs } from '../../bridges/equations/be-40-composite-higgs.js';
import { evaluateQuantumHall } from '../../bridges/be55-quantum-hall.js';
import { evaluateACJosephson } from '../../bridges/be59-ac-josephson.js';
import { evaluateFractionalQH } from '../../bridges/be60-fractional-qh.js';
import type { BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  chernNumberQ,
  compositeHiggsAlphaQ,
  compositeHiggsBetaQ,
  compositeHiggsPotentialQ,
  fillingFractionQ,
  frequencyQ,
  hallConductanceQ,
  higgsDecayConstantQ,
  higgsFieldQ,
  laneEmdenOmega3Q,
  massQ,
  meanMolecularWeightPerElectronQ,
  voltageQ,
} from '../quantities.js';

const isFin = Number.isFinite;
const csym = (name: keyof typeof CONSTANTS): ExprNode => sym(name, CONSTANTS[name].dim);
const qsym = (q: Quantity): ExprNode => sym(q.name, q.dim);
const lit = (n: number): ExprNode => sym(String(n), DIMENSIONLESS);
const pi: ExprNode = sym('pi', DIMENSIONLESS);

const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({
  kind: 'op',
  op: '/',
  args: [num, den],
});
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const minus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [a, b] });
const plus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [a, b] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const trig = (fn: 'sin' | 'cos', arg: ExprNode): ExprNode => ({
  kind: 'transcendental',
  fn,
  arg,
});

/** V(h) = −α f⁴ sin²(h/f) + β f⁴ [sin⁴(h/f) − sin²(h/f) cos²(h/f)]. */
const BE40_SYMBOLIC: ExprNode = (() => {
  const arg = ratio(qsym(higgsFieldQ), qsym(higgsDecayConstantQ));
  const sin2 = pow(trig('sin', arg), lit(2));
  const sin4 = pow(trig('sin', arg), lit(4));
  const cos2 = pow(trig('cos', arg), lit(2));
  const f4 = pow(qsym(higgsDecayConstantQ), lit(4));
  return plus(
    prod(lit(-1), qsym(compositeHiggsAlphaQ), f4, sin2),
    prod(qsym(compositeHiggsBetaQ), f4, minus(sin4, prod(sin2, cos2))),
  );
})();

/** σ_xy = C e² / h. */
const BE55_SYMBOLIC: ExprNode = ratio(
  prod(qsym(chernNumberQ), csym('e'), csym('e')),
  csym('h'),
);

/** f = 2 e V / h. */
const BE59_SYMBOLIC: ExprNode = ratio(
  prod(lit(2), csym('e'), qsym(voltageQ)),
  csym('h'),
);

/** σ_xy = ν e² / h. */
const BE60_SYMBOLIC: ExprNode = ratio(
  prod(qsym(fillingFractionQ), csym('e'), csym('e')),
  csym('h'),
);

/**
 * M = (ω₃⁰ √(3π) / 2) (ℏ c / G)^{3/2} (μ_e m_u)^{−2}.
 * ω₃⁰ is an input. The decimal 2.01824 is the catalog evaluator's choice,
 * not a leaf of this form.
 */
const BE63_SYMBOLIC: ExprNode = prod(
  ratio(prod(qsym(laneEmdenOmega3Q), pow(prod(lit(3), pi), ratio(lit(1), lit(2)))), lit(2)),
  // 3/2 is a numeric-literal exponent: the base ℏc/G is dimensionful.
  // (μ_e m_u)^{−2} is written as a square in the denominator so the leaf is `2`.
  pow(ratio(prod(csym('hbar'), csym('c')), csym('G')), lit(1.5)),
  ratio(lit(1), pow(prod(qsym(meanMolecularWeightPerElectronQ), csym('m_u')), lit(2))),
);

/**
 * BE-40 composite-Higgs potential. A law: every endpoint is quantum/weak.
 * Wraps `evaluateCompositeHiggs` (natural units).
 */
export const be40Edge: BridgeEdge = {
  id: 'be-40',
  beId: 40,
  kind: 'law',
  label: 'Composite Higgs V(h) = −α f⁴ sin²(h/f) + β f⁴ [sin⁴(h/f) − sin²(h/f) cos²(h/f)]',
  sources: [higgsFieldQ, higgsDecayConstantQ, compositeHiggsAlphaQ, compositeHiggsBetaQ],
  target: compositeHiggsPotentialQ,
  confidence: 'established',
  domain: {
    description: 'f > 0; h, α, β finite (natural units)',
    predicate: (i) =>
      isFin(i['higgs-decay-constant']) &&
      i['higgs-decay-constant'] > 0 &&
      isFin(i['higgs-field']) &&
      isFin(i['composite-higgs-alpha']) &&
      isFin(i['composite-higgs-beta']),
  },
  evaluate: (i) =>
    evaluateCompositeHiggs({
      h: i['higgs-field'],
      f: i['higgs-decay-constant'],
      alpha: i['composite-higgs-alpha'],
      beta: i['composite-higgs-beta'],
    }),
  symbolic: BE40_SYMBOLIC,
  citation: 'Kaplan & Georgi 1984 PLB 136:183; Giudice, Grojean, Pomarol & Rattazzi 2007 JHEP 0706:045',
};

/**
 * BE-55 integer quantum Hall conductance σ_xy = C e²/h.
 * The resistance R_H = h/(C e²) is the reciprocal of this relation.
 */
export const be55Edge: BridgeEdge = {
  id: 'be-55',
  beId: 55,
  kind: 'bridge',
  label: 'Integer quantum Hall σ_xy = C e²/h',
  sources: [chernNumberQ],
  target: hallConductanceQ,
  confidence: 'established',
  domain: {
    description: 'C is a nonzero integer',
    predicate: (i) => Number.isInteger(i['chern-number']) && i['chern-number'] !== 0,
  },
  evaluate: (i) => evaluateQuantumHall({ C: i['chern-number'] }).sigma_xy_S,
  symbolic: BE55_SYMBOLIC,
  citation: 'von Klitzing 1980 PRL 45:494; Thouless, Kohmoto, Nightingale & den Nijs 1982 PRL 49:405',
  relation: {
    type: 'derivation',
    transformation:
      'filled Bloch bands of a 2D electron gas in a strong field -> Kubo ' +
      'transverse conductance sigma_xy = C e^2/h, C the TKNN/Chern integer',
  },
};

/** BE-59 AC Josephson frequency f = 2eV/h. */
export const be59Edge: BridgeEdge = {
  id: 'be-59',
  beId: 59,
  kind: 'bridge',
  label: 'AC Josephson f = 2eV/h',
  sources: [voltageQ],
  target: frequencyQ,
  confidence: 'established',
  domain: {
    description: 'V finite',
    predicate: (i) => isFin(i['voltage']),
  },
  evaluate: (i) => evaluateACJosephson({ V_volts: i['voltage'] }).f_Hz,
  symbolic: BE59_SYMBOLIC,
  citation: 'Josephson 1962 Phys. Lett. 1:251',
  relation: {
    type: 'derivation',
    transformation:
      'DC bias V across a Josephson junction -> radiation frequency ' +
      'f = (2e/h) V via the phase relation d(phi)/dt = 2eV/hbar',
  },
};

/**
 * BE-60 fractional quantum Hall conductance σ_xy = ν e²/h.
 * Same target object as {@link be55Edge}. The wrapped evaluator accepts ν > 0 only.
 */
export const be60Edge: BridgeEdge = {
  id: 'be-60',
  beId: 60,
  kind: 'bridge',
  label: 'Fractional quantum Hall σ_xy = ν e²/h',
  sources: [fillingFractionQ],
  target: hallConductanceQ,
  confidence: 'established',
  domain: {
    description: 'ν finite and > 0',
    predicate: (i) => isFin(i['filling-fraction']) && i['filling-fraction'] > 0,
  },
  evaluate: (i) => evaluateFractionalQH({ nu: i['filling-fraction'] }).sigma_xy_S,
  symbolic: BE60_SYMBOLIC,
  citation: 'Tsui, Störmer & Gossard 1982 PRL 48:1559; Laughlin 1983 PRL 50:1395',
};

/**
 * BE-63 Chandrasekhar mass. Target is `mass`: the limit is a mass.
 * ω₃⁰ stays an input. `m_u` is the registered atomic-mass constant.
 */
export const be63Edge: BridgeEdge = {
  id: 'be-63',
  beId: 63,
  kind: 'bridge',
  label: 'Chandrasekhar mass M = (ω₃⁰ √(3π)/2) (ℏc/G)^{3/2} (μ_e m_u)^{−2}',
  sources: [laneEmdenOmega3Q, meanMolecularWeightPerElectronQ],
  target: massQ,
  confidence: 'established',
  domain: {
    description: 'μ_e > 0 and ω₃⁰ finite',
    predicate: (i) =>
      isFin(i['mean-molecular-weight-per-electron']) &&
      i['mean-molecular-weight-per-electron'] > 0 &&
      isFin(i['lane-emden-omega-3']),
  },
  evaluate: (i) => {
    const omega = i['lane-emden-omega-3'];
    const mu = i['mean-molecular-weight-per-electron'];
    const prefactor = (omega * Math.sqrt(3 * Math.PI)) / 2;
    return prefactor * Math.pow((HBAR_SI * C_SI) / G_SI, 1.5) * Math.pow(mu * M_U_SI, -2);
  },
  symbolic: BE63_SYMBOLIC,
  citation: 'Chandrasekhar 1931 ApJ 74:81',
};

/** Proved catalog seeds that were absent from the calibration, tranche, and catalog-full arrays. */
export const PROVED_SEED_EDGES: readonly BridgeEdge[] = [
  be40Edge,
  be55Edge,
  be59Edge,
  be60Edge,
  be63Edge,
];
