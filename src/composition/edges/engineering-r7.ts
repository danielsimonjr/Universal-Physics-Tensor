/**
 * Composition edges for BE-126 through BE-133.
 *
 * Each edge calls the catalog evaluator. The symbolic form is the same
 * scalar. Kind is `law` because the endpoints share classical
 * electromagnetic attributes. The overlay formalRef is kind `bridge`.
 *
 * @module composition/edges/engineering-r7
 */
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import {
  evaluateBoostConverter,
  evaluateCoaxialCapacitance,
  evaluateCombDrive,
  evaluateDampingRatio,
  evaluateFinEfficiency,
  evaluateJoukowsky,
  evaluateSubthresholdSwing,
  evaluateThermoelectricGenerator,
} from '../../bridges/engineering-r7.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  boostDutyQ,
  boostGainQ,
  coaxInnerQ,
  coaxLinerQ,
  coaxOuterQ,
  coaxSpecificQ,
  combAirgapQ,
  combBiasQ,
  combDielectricQ,
  combFingerCountQ,
  combLateralQ,
  combOverlapQ,
  dampingDashpotQ,
  dampingInertiaQ,
  dampingSpringQ,
  dampingZetaQ,
  finAdiabaticQ,
  finConductivityQ,
  finConvectionQ,
  finSpanQ,
  finWebQ,
  joukowskyBoreQ,
  joukowskyBulkQ,
  joukowskyClosureQ,
  joukowskyJumpQ,
  joukowskyRhoQ,
  joukowskyThkQ,
  joukowskyWallmodQ,
  swingDecadeQ,
  swingDepletionQ,
  swingKelvinQ,
  swingOxideQ,
  tegFigureQ,
  tegOptimumQ,
  tegSinkQ,
  tegSourceQ,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (q: Quantity): ExprNode => ({ kind: 'symbol', name: q.name, dim: q.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '+', args });
const minus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const sqrt = (base: ExprNode): ExprNode => pow(base, lit(0.5));
const lnOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'ln', arg });
const tanhOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'tanh', arg });
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };

const domain = (description: string, predicate: (i: Record<string, number>) => boolean) => ({
  description,
  predicate,
});

/** BE-126 comb-drive lateral force. One sidewall is not this edge. @public */
export const be126Edge: BridgeEdge = withBoundAliases({
  id: 'be-126',
  beId: 126,
  kind: 'law',
  label: 'Comb-drive force F = n ε h V² / g',
  sources: [combFingerCountQ, combDielectricQ, combOverlapQ, combBiasQ, combAirgapQ],
  aliases: {
    'comb-finger-count': ['n'],
    'comb-dielectric': ['eps_F_per_m'],
    'comb-overlap': ['h_m'],
    'comb-bias': ['V_volts'],
    'comb-airgap': ['g_m'],
  },
  target: combLateralQ,
  confidence: 'established',
  domain: domain('g ≠ 0', (i) => finite(i['comb-airgap']) && i['comb-airgap'] !== 0),
  evaluate: (i) =>
    evaluateCombDrive({
      n: i['comb-finger-count'],
      eps_F_per_m: i['comb-dielectric'],
      h_m: i['comb-overlap'],
      V_volts: i['comb-bias'],
      g_m: i['comb-airgap'],
    }).F_N,
  symbolic: ratio(
    prod(qsym(combFingerCountQ), qsym(combDielectricQ), qsym(combOverlapQ), pow(qsym(combBiasQ), lit(2))),
    qsym(combAirgapQ),
  ),
  citation:
    'PhysJS.CombDrive.force_eq. Both sidewalls and the coenergy 1/2 cancel. One sidewall leaves the 1/2. Not be-79.',
});

/** BE-127 subthreshold swing. The ideal diode drops C_d. @public */
export const be127Edge: BridgeEdge = withBoundAliases({
  id: 'be-127',
  beId: 127,
  kind: 'law',
  label: 'Subthreshold swing S = ln(10) (k_B T / e) (1 + C_d / C_ox)',
  sources: [swingKelvinQ, swingDepletionQ, swingOxideQ],
  aliases: {
    'swing-kelvin': ['T_K'],
    'swing-depletion': ['Cd_F'],
    'swing-oxide': ['Cox_F'],
  },
  target: swingDecadeQ,
  confidence: 'established',
  domain: domain(
    'T ≠ 0, C_ox ≠ 0, and C_ox + C_d ≠ 0',
    (i) =>
      finite(i['swing-kelvin']) &&
      i['swing-kelvin'] !== 0 &&
      finite(i['swing-oxide']) &&
      i['swing-oxide'] !== 0 &&
      i['swing-oxide'] + i['swing-depletion'] !== 0,
  ),
  evaluate: (i) =>
    evaluateSubthresholdSwing({
      T_K: i['swing-kelvin'],
      Cd_F: i['swing-depletion'],
      Cox_F: i['swing-oxide'],
    }).S_V_per_decade,
  symbolic: prod(
    lnOf(lit(10)),
    ratio(prod(csym('k_B'), qsym(swingKelvinQ)), csym('e')),
    plus(lit(1), ratio(qsym(swingDepletionQ), qsym(swingOxideQ))),
  ),
  citation:
    'PhysJS.SubthresholdSwing.swing_eq. e is the elementary charge. Dropping C_d is not the swing when C_d ≠ 0. Not be-82.',
});

/** BE-128 ideal boost ratio. The buck ratio is D. @public */
export const be128Edge: BridgeEdge = withBoundAliases({
  id: 'be-128',
  beId: 128,
  kind: 'law',
  label: 'Boost ratio V_out/V_in = 1/(1 − D)',
  sources: [boostDutyQ],
  aliases: { 'boost-duty': ['D'] },
  target: boostGainQ,
  confidence: 'established',
  domain: domain('D ≠ 1', (i) => finite(i['boost-duty']) && i['boost-duty'] !== 1),
  evaluate: (i) => evaluateBoostConverter({ D: i['boost-duty'] }).ratio,
  symbolic: ratio(lit(1), minus(lit(1), qsym(boostDutyQ))),
  citation:
    'PhysJS.BoostConverter.boost_ratio. Volt-second balance. No real duty equals both this ratio and the buck ratio D.',
});

/** BE-129 adiabatic-tip fin efficiency. The edge value is η. @public */
export const be129Edge: BridgeEdge = withBoundAliases({
  id: 'be-129',
  beId: 129,
  kind: 'law',
  label: 'Fin efficiency η = tanh(m L)/(m L), m = √(2 h/(k t))',
  sources: [finConvectionQ, finConductivityQ, finWebQ, finSpanQ],
  aliases: {
    'fin-convection': ['h_W_per_m2_K'],
    'fin-conductivity': ['k_W_per_m_K'],
    'fin-web': ['t_m'],
    'fin-span': ['L_fin_m'],
  },
  target: finAdiabaticQ,
  confidence: 'established',
  domain: domain(
    'k > 0, t > 0, h > 0, and L ≠ 0',
    (i) =>
      finite(i['fin-conductivity']) &&
      i['fin-conductivity'] > 0 &&
      finite(i['fin-web']) &&
      i['fin-web'] > 0 &&
      finite(i['fin-convection']) &&
      i['fin-convection'] > 0 &&
      finite(i['fin-span']) &&
      i['fin-span'] !== 0,
  ),
  evaluate: (i) =>
    evaluateFinEfficiency({
      h_W_per_m2_K: i['fin-convection'],
      k_W_per_m_K: i['fin-conductivity'],
      t_m: i['fin-web'],
      L_fin_m: i['fin-span'],
    }).eta,
  symbolic: (() => {
    const m = sqrt(ratio(prod(lit(2), qsym(finConvectionQ)), prod(qsym(finConductivityQ), qsym(finWebQ))));
    const mL = prod(m, qsym(finSpanQ));
    return ratio(tanhOf(mL), mL);
  })(),
  citation:
    'PhysJS.FinEfficiency.efficiency_eq. One face is not that m. tanh is not 1, so this is not an infinite fin.',
});

/** BE-130 thermoelectric generator efficiency. Carnot alone is not this edge. @public */
export const be130Edge: BridgeEdge = withBoundAliases({
  id: 'be-130',
  beId: 130,
  kind: 'law',
  label: 'Thermoelectric efficiency at the stationary current',
  sources: [tegSourceQ, tegSinkQ, tegFigureQ],
  aliases: {
    'teg-source': ['Th_K'],
    'teg-sink': ['Tc_K'],
    'teg-figure': ['Z_per_K'],
  },
  target: tegOptimumQ,
  confidence: 'established',
  domain: domain(
    'T_h ≠ 0, 1 + Z T_m ≥ 0, and the denominator ≠ 0',
    (i) => {
      if (!finite(i['teg-source']) || i['teg-source'] === 0) return false;
      if (!finite(i['teg-sink']) || !finite(i['teg-figure'])) return false;
      const mean = (i['teg-source'] + i['teg-sink']) / 2;
      const inside = 1 + i['teg-figure'] * mean;
      if (inside < 0) return false;
      return Math.sqrt(inside) + i['teg-sink'] / i['teg-source'] !== 0;
    },
  ),
  evaluate: (i) =>
    evaluateThermoelectricGenerator({
      Th_K: i['teg-source'],
      Tc_K: i['teg-sink'],
      Z_per_K: i['teg-figure'],
    }).eta,
  symbolic: (() => {
    const mean = prod(plus(qsym(tegSourceQ), qsym(tegSinkQ)), lit(0.5));
    const m = sqrt(plus(lit(1), prod(qsym(tegFigureQ), mean)));
    const carnot = minus(lit(1), ratio(qsym(tegSinkQ), qsym(tegSourceQ)));
    return ratio(prod(carnot, minus(m, lit(1))), plus(m, ratio(qsym(tegSinkQ), qsym(tegSourceQ))));
  })(),
  citation:
    'PhysJS.ThermoelectricGenerator.efficiency_eq. Matched load m = 1 is not stationary when Z T_m ≠ 0. The Carnot factor alone is not this efficiency.',
});

/** BE-131 Joukowsky pressure. The edge value is Δp. @public */
export const be131Edge: BridgeEdge = withBoundAliases({
  id: 'be-131',
  beId: 131,
  kind: 'law',
  label: 'Joukowsky pressure Δp = ρ c Δv',
  sources: [joukowskyRhoQ, joukowskyClosureQ, joukowskyBulkQ, joukowskyWallmodQ, joukowskyBoreQ, joukowskyThkQ],
  aliases: {
    'joukowsky-rho': ['rho_kg_per_m3'],
    'joukowsky-closure': ['dv_m_per_s'],
    'joukowsky-bulk': ['K_Pa'],
    'joukowsky-wallmod': ['E_Pa'],
    'joukowsky-bore': ['pipe_D_m'],
    'joukowsky-thk': ['wall_m'],
  },
  target: joukowskyJumpQ,
  confidence: 'established',
  domain: domain(
    'ρ > 0, K > 0, E > 0, e_wall > 0, and 1 + (K/E)(D/e_wall) > 0',
    (i) => {
      if (!(i['joukowsky-rho'] > 0 && i['joukowsky-bulk'] > 0 && i['joukowsky-wallmod'] > 0 && i['joukowsky-thk'] > 0)) {
        return false;
      }
      const wall = (i['joukowsky-bulk'] / i['joukowsky-wallmod']) * (i['joukowsky-bore'] / i['joukowsky-thk']);
      return 1 + wall > 0;
    },
  ),
  evaluate: (i) =>
    evaluateJoukowsky({
      rho_kg_per_m3: i['joukowsky-rho'],
      dv_m_per_s: i['joukowsky-closure'],
      K_Pa: i['joukowsky-bulk'],
      E_Pa: i['joukowsky-wallmod'],
      pipe_D_m: i['joukowsky-bore'],
      wall_m: i['joukowsky-thk'],
    }).delta_p_Pa,
  symbolic: (() => {
    const wall = prod(ratio(qsym(joukowskyBulkQ), qsym(joukowskyWallmodQ)), ratio(qsym(joukowskyBoreQ), qsym(joukowskyThkQ)));
    const c = ratio(sqrt(ratio(qsym(joukowskyBulkQ), qsym(joukowskyRhoQ))), sqrt(plus(lit(1), wall)));
    return prod(qsym(joukowskyRhoQ), c, qsym(joukowskyClosureQ));
  })(),
  citation:
    'PhysJS.Joukowsky.joukowsky_eq. ρ (Δv)² is not ρ c Δv when c ≠ Δv. Dropping the wall term is the rigid-pipe speed.',
});

/** BE-132 coaxial capacitance per length. Dropping 2π is not this edge. @public */
export const be132Edge: BridgeEdge = withBoundAliases({
  id: 'be-132',
  beId: 132,
  kind: 'law',
  label: "Coaxial C' = 2 π ε / ln(b/a)",
  sources: [coaxLinerQ, coaxInnerQ, coaxOuterQ],
  aliases: {
    'coax-liner': ['eps_F_per_m'],
    'coax-inner': ['a_m'],
    'coax-outer': ['b_m'],
  },
  target: coaxSpecificQ,
  confidence: 'established',
  domain: domain(
    'a > 0, b > 0, a ≠ b, and ε ≠ 0',
    (i) => i['coax-inner'] > 0 && i['coax-outer'] > 0 && i['coax-inner'] !== i['coax-outer'] && i['coax-liner'] !== 0,
  ),
  evaluate: (i) =>
    evaluateCoaxialCapacitance({
      eps_F_per_m: i['coax-liner'],
      a_m: i['coax-inner'],
      b_m: i['coax-outer'],
    }).C_F_per_m,
  symbolic: ratio(prod(lit(2), pi, qsym(coaxLinerQ)), lnOf(ratio(qsym(coaxOuterQ), qsym(coaxInnerQ)))),
  citation:
    'PhysJS.CoaxialCapacitance.capacitance_per_length. Dropping 2 π is not this capacitance. Not a parallel-plate ε A/d.',
});

/** BE-133 damping ratio. Dropping the 2 is not this edge. @public */
export const be133Edge: BridgeEdge = withBoundAliases({
  id: 'be-133',
  beId: 133,
  kind: 'law',
  label: 'Damping ratio ζ = c / (2 √(k m))',
  sources: [dampingDashpotQ, dampingSpringQ, dampingInertiaQ],
  aliases: {
    'damping-dashpot': ['c_kg_per_s'],
    'damping-spring': ['k_N_per_m'],
    'damping-inertia': ['m_kg'],
  },
  target: dampingZetaQ,
  confidence: 'established',
  domain: domain('m > 0 and k > 0', (i) => i['damping-inertia'] > 0 && i['damping-spring'] > 0),
  evaluate: (i) =>
    evaluateDampingRatio({
      c_kg_per_s: i['damping-dashpot'],
      k_N_per_m: i['damping-spring'],
      m_kg: i['damping-inertia'],
    }).zeta,
  symbolic: ratio(
    qsym(dampingDashpotQ),
    prod(lit(2), sqrt(prod(qsym(dampingSpringQ), qsym(dampingInertiaQ)))),
  ),
  citation:
    'PhysJS.DampingRatio.damping_ratio. For c ≥ 0 the discriminant vanishes iff ζ = 1. Dropping the 2 is not this ratio.',
});

/** Engineering edges, in catalog-id order. @public */
export const ENGINEERING_R7_EDGES: readonly BridgeEdge[] = [
  be126Edge,
  be127Edge,
  be128Edge,
  be129Edge,
  be130Edge,
  be131Edge,
  be132Edge,
  be133Edge,
];
