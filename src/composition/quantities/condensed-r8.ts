/**
 * Quantity nodes for BE-134 through BE-146.
 *
 * Names are new. A shared hyphen token would join these edges to an
 * existing node in the orphan-connector scan.
 *
 * @module composition/quantities/condensed-r8
 */
import type { Quantity } from '../quantity.js';
import { DIMENSIONLESS, ENERGY, LENGTH, MASS, TEMPERATURE, TIME } from '../../dimensional/types.js';

const CLASSICAL = { scale: 'classical', force: 'electromagnetic' } as const;
const MOMENT = { L: 2, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
const MAGNETIZATION = { L: -1, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
const STIFFNESS_AREA = { L: 4, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
const DOS3 = { L: -5, M: -1, T: 2, I: 0, Theta: 0, N: 0, J: 0 } as const;
const DOS2 = { L: -4, M: -1, T: 2, I: 0, Theta: 0, N: 0, J: 0 } as const;
const PER_VOLUME = { L: -3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const PER_AREA = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const VOLTAGE = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
const TESLA = { L: 0, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;
const CURRENT = { L: 0, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
const INDUCTANCE = { L: 2, M: 1, T: -2, I: -2, Theta: 0, N: 0, J: 0 } as const;
const CONDUCTIVITY = { L: -3, M: -1, T: 3, I: 2, Theta: 0, N: 0, J: 0 } as const;

const q = (name: string, symbol: string, dim: Quantity['dim']): Quantity => ({
  name,
  symbol,
  dim,
  attributes: CLASSICAL,
});

/** Bloch magneton quantity. */
export const blochlawMubQ = q('blochlaw-mub', 'μ_B', MOMENT);
/** Bloch zeta quantity. ζ(3/2) is an input. */
export const blochlawZetaQ = q('blochlaw-zeta', 'ζ(3/2)', DIMENSIONLESS);
/** Bloch temperature quantity. */
export const blochlawWarmthQ = q('blochlaw-warmth', 'T', TEMPERATURE);
/** Bloch stiffness quantity. */
export const blochlawDstiffQ = q('blochlaw-dstiff', 'D', STIFFNESS_AREA);
/** Bloch deficit quantity. */
export const blochlawDeficitQ = q('blochlaw-deficit', 'ΔM', MAGNETIZATION);

/** Three-dimensional band mass quantity. */
export const dos3dBandmassQ = q('dos3d-bandmass', 'm', MASS);
/** Three-dimensional energy abscissa quantity. */
export const dos3dAbscissaQ = q('dos3d-abscissa', 'E', ENERGY);
/** Three-dimensional density-of-states quantity. */
export const dos3dStatesQ = q('dos3d-states', 'g_3', DOS3);

/** Two-dimensional band mass quantity. */
export const dos2dBandmassQ = q('dos2d-bandmass', 'm', MASS);
/** Two-dimensional density-of-states quantity. */
export const dos2dStatesQ = q('dos2d-states', 'g_2', DOS2);

/** Thomas–Fermi carrier quantity. */
export const tfscreenN3Q = q('tfscreen-n3', 'n', PER_VOLUME);
/** Thomas–Fermi chemical-energy quantity. */
export const tfscreenChemicalQ = q('tfscreen-chemical', 'E_F', ENERGY);
/** Thomas–Fermi wavevector-squared quantity. */
export const tfscreenK2Q = q('tfscreen-k2', 'k_{TF}^2', PER_AREA);

/** Built-in temperature quantity. */
export const builtinWarmthQ = q('builtin-warmth', 'T', TEMPERATURE);
/** Built-in acceptor quantity. */
export const builtinAcceptorQ = q('builtin-acceptor', 'N_A', PER_VOLUME);
/** Built-in donor quantity. */
export const builtinDonorQ = q('builtin-donor', 'N_D', PER_VOLUME);
/** Built-in intrinsic density quantity. */
export const builtinNiQ = q('builtin-ni', 'n_i', PER_VOLUME);
/** Built-in voltage quantity. */
export const builtinVbiQ = q('builtin-vbi', 'V_{bi}', VOLTAGE);

/** Fermi-offset temperature quantity. */
export const fermioffsetWarmthQ = q('fermioffset-warmth', 'T', TEMPERATURE);
/** Fermi-offset hole mass quantity. */
export const fermioffsetHolemassQ = q('fermioffset-holemass', 'm_h', MASS);
/** Fermi-offset electron mass quantity. */
export const fermioffsetElecmassQ = q('fermioffset-elecmass', 'm_e', MASS);
/** Fermi-offset energy quantity. */
export const fermioffsetMuoffQ = q('fermioffset-muoff', 'ΔE', ENERGY);

/** Onsager k-space area quantity. */
export const onsagerkKareaQ = q('onsagerk-karea', 'A', PER_AREA);
/** Onsager orbit field quantity. */
export const onsagerkOrbitQ = q('onsagerk-orbit', 'F', TESLA);

/** Josephson critical-current quantity. */
export const josephsonlIcQ = q('josephsonl-ic', 'I_c', CURRENT);
/** Josephson inductance quantity. */
export const josephsonlHenryQ = q('josephsonl-henry', 'L_J', INDUCTANCE);

/** Lower-critical London depth quantity. */
export const lowercritPenQ = q('lowercrit-pen', 'λ', LENGTH);
/** Lower-critical core quantity. */
export const lowercritXiQ = q('lowercrit-xi', 'ξ', LENGTH);
/** Lower-critical field quantity. */
export const lowercritBc1Q = q('lowercrit-bc1', 'B_{c1}', TESLA);

/** AC Drude carrier quantity. */
export const acdrudeN3Q = q('acdrude-n3', 'n', PER_VOLUME);
/** AC Drude band mass quantity. */
export const acdrudeBandmassQ = q('acdrude-bandmass', 'm', MASS);
/** AC Drude scattering time quantity. */
export const acdrudeScatterQ = q('acdrude-scatter', 'τ', TIME);
/** AC Drude drive quantity. */
export const acdrudeRadianQ = q('acdrude-radian', 'ω', { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 });
/** AC Drude conductivity quantity. */
export const acdrudeConductQ = q('acdrude-conduct', 'Re σ', CONDUCTIVITY);

/** Matthiessen first lifetime quantity. */
export const matthsumScatter1Q = q('matthsum-scatter1', 'τ_1', TIME);
/** Matthiessen second lifetime quantity. */
export const matthsumScatter2Q = q('matthsum-scatter2', 'τ_2', TIME);
/** Matthiessen parallel lifetime quantity. */
export const matthsumScatterQ = q('matthsum-scatter', 'τ', TIME);

/** Stoner Pauli susceptibility quantity. */
export const stonerchiPauliQ = q('stonerchi-pauli', 'χ_P', DIMENSIONLESS);
/** Stoner product quantity. */
export const stonerchiIgQ = q('stonerchi-ig', 'I g', DIMENSIONLESS);
/** Stoner enhanced susceptibility quantity. */
export const stonerchiEnhancedQ = q('stonerchi-enhanced', 'χ', DIMENSIONLESS);

/** Gorter–Casimir temperature quantity. */
export const gortercasWarmthQ = q('gortercas-warmth', 'T', TEMPERATURE);
/** Gorter–Casimir critical temperature quantity. */
export const gortercasTcQ = q('gortercas-tc', 'T_c', TEMPERATURE);
/** Gorter–Casimir superfluid fraction quantity. */
export const gortercasNsQ = q('gortercas-ns', 'n_s/n', DIMENSIONLESS);
