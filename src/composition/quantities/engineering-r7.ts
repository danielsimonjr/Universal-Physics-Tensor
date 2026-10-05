/**
 * Quantity nodes for BE-126 through BE-133.
 *
 * Names are new. A shared hyphen token would join these edges to an
 * existing node in the orphan-connector scan.
 *
 * @module composition/quantities/engineering-r7
 */
import type { Quantity } from '../quantity.js';
import { DIMENSIONLESS, FORCE, LENGTH, MASS, TEMPERATURE } from '../../dimensional/types.js';

const CLASSICAL = { scale: 'classical', force: 'electromagnetic' } as const;
const PERMITTIVITY = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 } as const;
const VOLTAGE = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
const FARAD = { L: -2, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 } as const;
const HEAT_FLUX_COEFF = { L: 0, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 } as const;
const THERMAL_CONDUCTIVITY = { L: 1, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 } as const;
const INV_TEMPERATURE = { L: 0, M: 0, T: 0, I: 0, Theta: -1, N: 0, J: 0 } as const;
const RHO = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const VELOCITY = { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const PRESSURE = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
const DAMPING = { L: 0, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const STIFFNESS = { L: 0, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;

const q = (name: string, symbol: string, dim: Quantity['dim']): Quantity => ({
  name,
  symbol,
  dim,
  attributes: CLASSICAL,
});

/** Comb finger count quantity. */
export const combFingerCountQ = q('comb-finger-count', 'n', DIMENSIONLESS);
/** Comb dielectric quantity. */
export const combDielectricQ = q('comb-dielectric', 'ε', PERMITTIVITY);
/** Comb overlap quantity. */
export const combOverlapQ = q('comb-overlap', 'h', LENGTH);
/** Comb bias quantity. */
export const combBiasQ = q('comb-bias', 'V', VOLTAGE);
/** Comb airgap quantity. */
export const combAirgapQ = q('comb-airgap', 'g', LENGTH);
/** Comb lateral force quantity. */
export const combLateralQ = q('comb-lateral', 'F', FORCE);

/** Swing kelvin quantity. */
export const swingKelvinQ = q('swing-kelvin', 'T', TEMPERATURE);
/** Swing depletion quantity. */
export const swingDepletionQ = q('swing-depletion', 'C_d', FARAD);
/** Swing oxide quantity. */
export const swingOxideQ = q('swing-oxide', 'C_ox', FARAD);
/** Swing decade quantity. */
export const swingDecadeQ = q('swing-decade', 'S', VOLTAGE);

/** Boost duty quantity. */
export const boostDutyQ = q('boost-duty', 'D', DIMENSIONLESS);
/** Boost gain quantity. */
export const boostGainQ = q('boost-gain', 'V_out/V_in', DIMENSIONLESS);

/** Fin convection quantity. */
export const finConvectionQ = q('fin-convection', 'h', HEAT_FLUX_COEFF);
/** Fin conductivity quantity. */
export const finConductivityQ = q('fin-conductivity', 'k', THERMAL_CONDUCTIVITY);
/** Fin web quantity. */
export const finWebQ = q('fin-web', 't', LENGTH);
/** Fin span quantity. */
export const finSpanQ = q('fin-span', 'L', LENGTH);
/** Fin adiabatic efficiency quantity. */
export const finAdiabaticQ = q('fin-adiabatic', 'η', DIMENSIONLESS);

/** Thermoelectric source temperature quantity. */
export const tegSourceQ = q('teg-source', 'T_h', TEMPERATURE);
/** Thermoelectric sink temperature quantity. */
export const tegSinkQ = q('teg-sink', 'T_c', TEMPERATURE);
/** Thermoelectric figure quantity. */
export const tegFigureQ = q('teg-figure', 'Z', INV_TEMPERATURE);
/** Thermoelectric optimum quantity. */
export const tegOptimumQ = q('teg-optimum', 'η', DIMENSIONLESS);

/** Joukowsky density quantity. */
export const joukowskyRhoQ = q('joukowsky-rho', 'ρ', RHO);
/** Joukowsky closure velocity quantity. */
export const joukowskyClosureQ = q('joukowsky-closure', 'Δv', VELOCITY);
/** Joukowsky bulk modulus quantity. */
export const joukowskyBulkQ = q('joukowsky-bulk', 'K', PRESSURE);
/** Joukowsky wall modulus quantity. */
export const joukowskyWallmodQ = q('joukowsky-wallmod', 'E', PRESSURE);
/** Joukowsky bore quantity. */
export const joukowskyBoreQ = q('joukowsky-bore', 'D', LENGTH);
/** Joukowsky wall thickness quantity. */
export const joukowskyThkQ = q('joukowsky-thk', 'e_wall', LENGTH);
/** Joukowsky pressure jump quantity. */
export const joukowskyJumpQ = q('joukowsky-jump', 'Δp', PRESSURE);

/** Coax liner permittivity quantity. */
export const coaxLinerQ = q('coax-liner', 'ε', PERMITTIVITY);
/** Coax inner radius quantity. */
export const coaxInnerQ = q('coax-inner', 'a', LENGTH);
/** Coax outer radius quantity. */
export const coaxOuterQ = q('coax-outer', 'b', LENGTH);
/** Coax specific capacitance quantity. */
export const coaxSpecificQ = q('coax-specific', "C'", PERMITTIVITY);

/** Damping dashpot quantity. */
export const dampingDashpotQ = q('damping-dashpot', 'c', DAMPING);
/** Damping spring quantity. */
export const dampingSpringQ = q('damping-spring', 'k', STIFFNESS);
/** Damping inertia quantity. */
export const dampingInertiaQ = q('damping-inertia', 'm', MASS);
/** Damping zeta quantity. */
export const dampingZetaQ = q('damping-zeta', 'ζ', DIMENSIONLESS);
