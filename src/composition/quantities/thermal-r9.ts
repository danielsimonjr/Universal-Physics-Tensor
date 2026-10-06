/**
 * Quantity nodes for BE-147 through BE-170.
 *
 * Names have no hyphen and no capital. A shared hyphen token would join these
 * edges to an existing node in the orphan-connector scan, and a capital is
 * not a ledger slug.
 *
 * @module composition/quantities/thermal-r9
 */
import type { Quantity } from '../quantity.js';
import {
  DIMENSIONLESS,
  ENERGY,
  ENTROPY,
  FREQUENCY,
  LENGTH,
  MASS,
  MASS_DENSITY,
  TEMPERATURE,
  TIME,
  VELOCITY,
} from '../../dimensional/types.js';

const CLASSICAL = { scale: 'classical', force: 'electromagnetic' } as const;

const PER_AMOUNT_ENERGY = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: -1, J: 0 } as const;
const PER_TEMP = { L: 0, M: 0, T: 0, I: 0, Theta: -1, N: 0, J: 0 } as const;
const VOLTAGE = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
const PRESSURE = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
const VISCOSITY = { L: -1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const SPECIFIC_HEAT = { L: 2, M: 0, T: -2, I: 0, Theta: -1, N: 0, J: 0 } as const;
const CONDUCTIVITY = { L: 1, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 } as const;
const FILM = { L: 0, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 } as const;
const DIFFUSIVITY = { L: 2, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const HEAT_FLUX = { L: 0, M: 1, T: -3, I: 0, Theta: 0, N: 0, J: 0 } as const;
const VOLUME = { L: 3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const AREA = { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const SPECIFIC_VOLUME = { L: 3, M: -1, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const SPECIFIC_VOLUME_PER_TEMP = { L: 3, M: -1, T: 0, I: 0, Theta: -1, N: 0, J: 0 } as const;
const JT = { L: 1, M: -1, T: 2, I: 0, Theta: 1, N: 0, J: 0 } as const;
const SPECTRAL = { L: -1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const STEFAN = { L: 0, M: 1, T: -3, I: 0, Theta: -4, N: 0, J: 0 } as const;
const WIEN = { L: 1, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 } as const;
const PER_VOLUME = { L: -3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
const CURRENT_DENSITY = { L: -2, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
const TESLA = { L: 0, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;

const q = (name: string, symbol: string, dim: Quantity['dim']): Quantity => ({
  name,
  symbol,
  dim,
  attributes: CLASSICAL,
});

/** Arrhenius prefactor. */
export const arrhprefacQ = q('arrhprefac', 'A', FREQUENCY);
/** Arrhenius barrier per amount. */
export const arrhbarrierQ = q('arrhbarrier', 'E_a', PER_AMOUNT_ENERGY);
/** Arrhenius temperature. */
export const arrhwarmthQ = q('arrhwarmth', 'T', TEMPERATURE);
/** Arrhenius rate. */
export const arrhrateQ = q('arrhrate', 'k', FREQUENCY);

/** Eyring barrier, per molecule. */
export const eyringbarrierQ = q('eyringbarrier', 'ΔG^‡', ENERGY);
/** Eyring temperature. */
export const eyringwarmthQ = q('eyringwarmth', 'T', TEMPERATURE);
/** Eyring rate. */
export const eyringrateQ = q('eyringrate', 'k', FREQUENCY);

/** van 't Hoff enthalpy per amount. */
export const vanthoffenthalpyQ = q('vanthoffenthalpy', 'ΔH°', PER_AMOUNT_ENERGY);
/** van 't Hoff temperature. */
export const vanthoffwarmthQ = q('vanthoffwarmth', 'T', TEMPERATURE);
/** van 't Hoff slope. */
export const vanthoffslopeQ = q('vanthoffslope', 'd\\ln K/dT', PER_TEMP);

/** Gibbs equilibrium constant. */
export const gibbsisoKQ = q('gibbsisok', 'K', DIMENSIONLESS);
/** Gibbs temperature. */
export const gibbsisowarmthQ = q('gibbsisowarmth', 'T', TEMPERATURE);
/** Gibbs energy per amount. */
export const gibbsisodGQ = q('gibbsisodg', 'ΔG°', PER_AMOUNT_ENERGY);

/** Nernst standard potential. */
export const nernstgE0Q = q('nernstge0', 'E°', VOLTAGE);
/** Nernst electron count. */
export const nernstgnQ = q('nernstgn', 'n', DIMENSIONLESS);
/** Nernst reaction quotient. */
export const nernstgQQ = q('nernstgq', 'Q', DIMENSIONLESS);
/** Nernst temperature. */
export const nernstgwarmthQ = q('nernstgwarmth', 'T', TEMPERATURE);
/** Nernst cell voltage. */
export const nernstgEQ = q('nernstge', 'E', VOLTAGE);

/** Integrated Clausius–Clapeyron latent heat. */
export const clapintlatentQ = q('clapintlatent', 'ΔH', PER_AMOUNT_ENERGY);
/** Integrated Clausius–Clapeyron first temperature. */
export const clapintwarm1Q = q('clapintwarm1', 'T_1', TEMPERATURE);
/** Integrated Clausius–Clapeyron second temperature. */
export const clapintwarm2Q = q('clapintwarm2', 'T_2', TEMPERATURE);
/** Integrated Clausius–Clapeyron log ratio. */
export const clapintlnQ = q('clapintln', '\\ln(P_2/P_1)', DIMENSIONLESS);

/** Raoult mole fraction. */
export const raoultmoleQ = q('raoultmole', 'x', DIMENSIONLESS);
/** Raoult saturation pressure. */
export const raoultsatQ = q('raoultsat', 'P^*', PRESSURE);
/** Raoult partial pressure. */
export const raoultvaporQ = q('raoultvapor', 'P', PRESSURE);

/** Prandtl viscosity. */
export const prandtlmuQ = q('prandtlmu', 'μ', VISCOSITY);
/** Prandtl specific heat. */
export const prandtlcpQ = q('prandtlcp', 'c_p', SPECIFIC_HEAT);
/** Prandtl conductivity. */
export const prandtlkQ = q('prandtlk', 'k', CONDUCTIVITY);
/** Prandtl number. */
export const prandtlratioQ = q('prandtlratio', 'Pr', DIMENSIONLESS);

/** Reynolds density. */
export const reynumrhoQ = q('reynumrho', 'ρ', MASS_DENSITY);
/** Reynolds speed. */
export const reynumvelQ = q('reynumvel', 'v', VELOCITY);
/** Reynolds length. */
export const reynumlenQ = q('reynumlen', 'L', LENGTH);
/** Reynolds viscosity. */
export const reynummuQ = q('reynummu', 'μ', VISCOSITY);
/** Reynolds number. */
export const reynumratioQ = q('reynumratio', 'Re', DIMENSIONLESS);

/** Biot film coefficient. */
export const biotfilmQ = q('biotfilm', 'h', FILM);
/** Biot length. */
export const biotlengthQ = q('biotlength', 'L_c', LENGTH);
/** Biot conductivity. */
export const biotkQ = q('biotk', 'k', CONDUCTIVITY);
/** Biot number. */
export const biotratioQ = q('biotratio', 'Bi', DIMENSIONLESS);

/** Nusselt film coefficient. */
export const nusseltfilmQ = q('nusseltfilm', 'h', FILM);
/** Nusselt length. */
export const nusseltlenQ = q('nusseltlen', 'L', LENGTH);
/** Nusselt conductivity. */
export const nusseltkQ = q('nusseltk', 'k', CONDUCTIVITY);
/** Nusselt number. */
export const nusseltratioQ = q('nusseltratio', 'Nu', DIMENSIONLESS);

/** Schmidt viscosity. */
export const schmidtmuQ = q('schmidtmu', 'μ', VISCOSITY);
/** Schmidt density. */
export const schmidtrhoQ = q('schmidtrho', 'ρ', MASS_DENSITY);
/** Schmidt diffusivity. */
export const schmidtdiffQ = q('schmidtdiff', 'D', DIFFUSIVITY);
/** Schmidt number. */
export const schmidtratioQ = q('schmidtratio', 'Sc', DIMENSIONLESS);

/** Sherwood mass-transfer coefficient. */
export const sherwoodkmQ = q('sherwoodkm', 'k_m', VELOCITY);
/** Sherwood length. */
export const sherwoodlenQ = q('sherwoodlen', 'L', LENGTH);
/** Sherwood diffusivity. */
export const sherwooddiffQ = q('sherwooddiff', 'D', DIFFUSIVITY);
/** Sherwood number. */
export const sherwoodratioQ = q('sherwoodratio', 'Sh', DIMENSIONLESS);

/** Fourier conductivity. */
export const fourierslabkQ = q('fourierslabk', 'k', CONDUCTIVITY);
/** Fourier temperature at x = L. */
export const fourierslabendQ = q('fourierslabend', 'T(L)', TEMPERATURE);
/** Fourier temperature at x = 0. */
export const fourierslabstartQ = q('fourierslabstart', 'T(0)', TEMPERATURE);
/** Fourier thickness. */
export const fourierslablenQ = q('fourierslablen', 'L', LENGTH);
/** Fourier heat flux. */
export const fourierslabfluxQ = q('fourierslabflux', 'q', HEAT_FLUX);

/** Newton density. */
export const newtonrhoQ = q('newtonrho', 'ρ', MASS_DENSITY);
/** Newton specific heat. */
export const newtoncpQ = q('newtoncp', 'c', SPECIFIC_HEAT);
/** Newton volume. */
export const newtonvolQ = q('newtonvol', 'V', VOLUME);
/** Newton film coefficient. */
export const newtonfilmQ = q('newtonfilm', 'h', FILM);
/** Newton area. */
export const newtonareaQ = q('newtonarea', 'A', AREA);
/** Newton time. */
export const newtontimeQ = q('newtontime', 't', TIME);
/** Newton excess temperature at t = 0. The evaluator key carries `difference`. */
export const newtontheta0Q = q('newtontheta0', 'θ(0)', TEMPERATURE);
/** Newton excess temperature at t. */
export const newtonthetaQ = q('newtontheta', 'θ(t)', TEMPERATURE);

/** Otto compression ratio. */
export const ottoratioQ = q('ottoratio', 'r', DIMENSIONLESS);
/** Otto heat-capacity ratio. */
export const ottogammaQ = q('ottogamma', 'γ', DIMENSIONLESS);
/** Otto efficiency. */
export const ottoetaQ = q('ottoeta', 'η', DIMENSIONLESS);

/** Joule–Thomson temperature derivative of specific volume. */
export const jtcdvdtQ = q('jtcdvdt', '(∂v/∂T)_p', SPECIFIC_VOLUME_PER_TEMP);
/** Joule–Thomson specific volume. */
export const jtcvolumeQ = q('jtcvolume', 'v', SPECIFIC_VOLUME);
/** Joule–Thomson temperature. */
export const jtcwarmthQ = q('jtcwarmth', 'T', TEMPERATURE);
/** Joule–Thomson specific heat. */
export const jtcpQ = q('jtcp', 'c_p', SPECIFIC_HEAT);
/** Joule–Thomson coefficient. */
export const jtcmuQ = q('jtcmu', 'μ_{JT}', JT);

/** Planck frequency. */
export const planckfreqQ = q('planckfreq', 'ν', FREQUENCY);
/** Planck temperature. */
export const planckwarmthQ = q('planckwarmth', 'T', TEMPERATURE);
/** Planck spectral density. */
export const planckuQ = q('plancku', 'u_ν', SPECTRAL);

/** Stefan–Boltzmann constant from the integral. */
export const stefansigmaQ = q('stefansigma', 'σ', STEFAN);

/** Wien root. Not evaluated. */
export const wienrootQ = q('wienroot', 'x', DIMENSIONLESS);
/** Wien displacement constant. */
export const wienbQ = q('wienb', 'b', WIEN);

/** Sackur–Tetrode particle count. */
export const sackurcountQ = q('sackurcount', 'N', DIMENSIONLESS);
/** Sackur–Tetrode quantum concentration. */
export const sackurquantumQ = q('sackurquantum', 'n_Q', PER_VOLUME);
/** Sackur–Tetrode number density. */
export const sackurdensityQ = q('sackurdensity', 'n', PER_VOLUME);
/** Sackur–Tetrode entropy. */
export const sackurentropyQ = q('sackurentropy', 'S', ENTROPY);

/** Saha mass. */
export const sahamassQ = q('sahamass', 'm', MASS);
/** Saha temperature. */
export const sahawarmthQ = q('sahawarmth', 'T', TEMPERATURE);
/** Saha ionization energy. */
export const sahaionQ = q('sahaion', 'I', ENERGY);
/** Saha ionization constant. */
export const sahaconstQ = q('sahaconst', 'K', PER_VOLUME);

/** Richardson mass. */
export const richardsmassQ = q('richardsmass', 'm', MASS);
/** Richardson temperature. */
export const richardswarmthQ = q('richardswarmth', 'T', TEMPERATURE);
/** Richardson work function. */
export const richardsphiQ = q('richardsphi', 'φ', ENERGY);
/** Richardson current density. */
export const richardsjQ = q('richardsj', 'J', CURRENT_DENSITY);

/** Onsager cross coefficient. */
export const onsagerl12Q = q('onsagerl12', 'L_{12}', DIMENSIONLESS);
/** Onsager magnetic field. Zero is the stated regime. */
export const onsagerb0Q = q('onsagerb0', 'B', TESLA);
/** Onsager reciprocal coefficient. */
export const onsagerl21Q = q('onsagerl21', 'L_{21}', DIMENSIONLESS);
