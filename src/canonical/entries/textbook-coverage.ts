/** Textbook relations with explicit scope and distinct quantities for bounds. @module canonical/entries/textbook-coverage */
import type { CanonicalEquation } from '../canonical-equation.js';
import type { ExprNode } from '../../dimensional/ast-types.js';
import { divide } from '../../dimensional/algebra.js';
import {
  ACCELERATION, ACTION, AREA, CHARGE, DIMENSIONLESS, ENERGY, ENTROPY, FREQUENCY,
  GRAVITATIONAL_CONSTANT, LENGTH, MASS, MASS_DENSITY, PERMITTIVITY, PRESSURE,
  TEMPERATURE, TIME, VELOCITY, type Dimension,
} from '../../dimensional/types.js';
import { dim, l1, op, pow } from './_l1-build.js';

const sym = (name: string, dimension: Dimension): Extract<ExprNode, { kind: 'symbol' }> =>
  ({ kind: 'symbol', name, dim: dimension });
const literal = (value: string) => sym(value, DIMENSIONLESS);
const times = (...args: Parameters<typeof op>[1]) => op('*', args);
const over = (a: ExprNode, b: ExprNode) => op('/', [a, b]);
const C = sym('c', VELOCITY);
const G = sym('G', GRAVITATIONAL_CONSTANT);
const hBar = sym('hbar', ACTION);
const entropyConstant = sym('k_B', ENTROPY);
const radius = sym('areal-radius', LENGTH);
const mass = sym('enclosed-mass', MASS);
const pressure = sym('fluid-pressure', PRESSURE);
const rho = sym('mass-energy-density', MASS_DENSITY);
const compactness = over(times(literal('2'), G, mass), times(radius, pow(C, '2')));
const opticalObject = sym('object-distance', LENGTH);
const opticalImage = sym('image-distance', LENGTH);
const focalLength = sym('paraxial-focal-length', LENGTH);
const wavelength = sym('optical-wavelength', LENGTH);
const flux = divide(ACTION, CHARGE);
const ratePerHz = dim(-1, 1, -1);
const h = sym('h', ACTION);
const frequency = sym('frequency', FREQUENCY);
const thermalEnergy = times(entropyConstant, sym('temperature', TEMPERATURE));
const halfPlanckExponent = over(times(h, frequency), times(literal('2'), thermalEnergy));
const halfPlanckDecay: ExprNode = { kind: 'transcendental', fn: 'exp', arg: op('-', [halfPlanckExponent]) };

/** Canonical textbook relations, including typed bounds and scope assumptions. */
export const TEXTBOOK_COVERAGE: readonly CanonicalEquation[] = [
  l1(sym('observed-acoustic-frequency', FREQUENCY), [
    sym('source-frequency', FREQUENCY), sym('sound-speed', VELOCITY), sym('source-approach-speed', VELOCITY),
  ], {
    id: 'CE-acoustic-doppler',
    name: 'Acoustic Doppler effect',
    searchTerms: ['Doppler shift'],
    domain: 'mechanics',
    formula_latex: String.raw`f_o = f_s c_s/(c_s-v_s)`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(sym('source-frequency', FREQUENCY), sym('sound-speed', VELOCITY)),
      op('-', [sym('sound-speed', VELOCITY), sym('source-approach-speed', VELOCITY)])),
    holds: 'source-frequency > 0 and sound-speed > 0 and abs(source-approach-speed) < sound-speed',
    regime: { scale: 'classical' },
    assumptions: ['uniform stationary medium', 'stationary observer', 'subsonic source moving along the line of sight, positive toward the observer'],
    references: ['Halliday, Resnick and Walker, Fundamentals of Physics, Waves II'],
    partnerBridges: [],
  }),
  l1(focalLength, [opticalObject, opticalImage], {
    id: 'CE-thin-lens-mirror',
    name: 'Thin lens and spherical mirror equation',
    searchTerms: ['thin lens', 'spherical mirror', 'Gaussian imaging'],
    domain: 'electromagnetism',
    formula_latex: String.raw`1/f=1/d_o+1/d_i`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(opticalObject, opticalImage), op('+', [opticalObject, opticalImage])),
    holds: 'object-distance != 0 and image-distance != 0 and object-distance + image-distance != 0',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['paraxial rays', 'thin lens or spherical mirror', 'real-is-positive signed distances'],
    references: ['Hecht, Optics, Geometrical Optics'],
    partnerBridges: [],
  }),
  l1(opticalImage, [opticalObject, focalLength], {
    id: 'CE-thin-lens-image-distance',
    name: 'Thin lens and spherical mirror image distance',
    searchTerms: ['thin lens', 'spherical mirror', 'Gaussian imaging', 'virtual image distance'],
    domain: 'electromagnetism',
    formula_latex: String.raw`d_i=f d_o/(d_o-f)`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(focalLength, opticalObject), op('-', [opticalObject, focalLength])),
    holds: 'object-distance != 0 and paraxial-focal-length != 0 and object-distance != paraxial-focal-length',
    conventionNote: 'Distances use the real-is-positive convention. At the focal plane the outgoing rays are parallel and the image is at infinity.',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['paraxial rays', 'thin lens or spherical mirror', 'real-is-positive signed distances'],
    references: ['Hecht, Optics, Geometrical Optics'],
    partnerBridges: [],
  }),
  l1(sym('blackbody-spectral-energy-density', ratePerHz), [
    frequency, sym('temperature', TEMPERATURE), h, C, entropyConstant,
  ], {
    id: 'CE-planck-blackbody-spectrum',
    name: 'Planck blackbody spectrum',
    searchTerms: ['blackbody radiation', 'spectral energy density'],
    domain: 'thermodynamics',
    formula_latex: String.raw`u_\nu=8\pi h\nu^3/[c^3(\exp(h\nu/(k_BT))-1)]`,
    epistemicStatus: 'fully-quantitative',
    // Use 1/(exp(x)−1) = exp(−x)(1+coth(x/2))/2 to avoid cancellation.
    // Distribute exp(−x) across two half-decays after the prefactor.
    // The prefactor can keep the final value representable even when exp(−x) alone underflows.
    scalarAst: times(times(over(times(literal('4pi'), h, pow(frequency, '3'),
      op('+', [literal('1'), over(literal('1'), { kind: 'transcendental', fn: 'tanh', arg: halfPlanckExponent })])),
    pow(C, '3')), halfPlanckDecay), halfPlanckDecay),
    holds: 'frequency > 0 and temperature > 0',
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['thermal equilibrium', 'spectral energy density per volume per cycle frequency', 'two polarizations'],
    references: ['Planck 1901, Annalen der Physik 309:553–563'],
    partnerBridges: ['164'],
  }),
  l1(sym('average-induced-emf', divide(ENERGY, CHARGE)), [
    sym('flux-linkage-change', flux), sym('time-interval', TIME),
  ], {
    id: 'CE-faraday-induction',
    name: "Faraday’s law of induction",
    searchTerms: ['Faraday induction', 'Lenz law'],
    domain: 'electromagnetism',
    formula_latex: String.raw`\overline{\mathcal E}=-\Delta\Lambda/\Delta t`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(op('-', [sym('flux-linkage-change', flux)]), sym('time-interval', TIME)),
    holds: 'time-interval > 0',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['flux linkage includes all turns', 'average over a finite interval', 'consistent contour and flux orientation'],
    references: ['Griffiths, Introduction to Electrodynamics, Faraday’s law'],
    partnerBridges: [],
  }),
  l1(sym('projectile-horizontal-range', LENGTH), [
    sym('launch-speed', VELOCITY), sym('launch-angle', DIMENSIONLESS), sym('gravity', ACCELERATION),
  ], {
    id: 'CE-level-projectile-range',
    name: 'Projectile motion on level ground',
    searchTerms: ['projectile range'],
    domain: 'mechanics',
    formula_latex: String.raw`R=v_0^2\sin(2\theta)/g`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(pow(sym('launch-speed', VELOCITY), '2'), {
      kind: 'transcendental', fn: 'sin', arg: times(literal('2'), sym('launch-angle', DIMENSIONLESS)),
    }), sym('gravity', ACCELERATION)),
    holds: 'gravity > 0 and launch-speed > 0 and launch-angle >= 0 and launch-angle <= pi/2',
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['no drag', 'constant gravity', 'launch and landing at the same height'],
    references: ['OpenStax University Physics 1, Projectile Motion'],
    partnerBridges: [],
  }),
  l1(sym('double-slit-fringe-spacing', LENGTH), [wavelength, sym('screen-distance', LENGTH), sym('slit-separation', LENGTH)], {
    id: 'CE-double-slit-interference',
    name: 'Double-slit interference fringe spacing',
    searchTerms: ['double slit', 'Young interference'],
    domain: 'electromagnetism',
    formula_latex: String.raw`\Delta y\simeq\lambda D/d`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(wavelength, sym('screen-distance', LENGTH)), sym('slit-separation', LENGTH)),
    holds: 'optical-wavelength > 0 and screen-distance > 0 and slit-separation > 0',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['coherent monochromatic light', 'far field and small observation angles'],
    references: ['OpenStax University Physics 3, Double-Slit Interference'],
    partnerBridges: [],
  }),
  l1(sym('first-diffraction-minimum-sine', DIMENSIONLESS), [wavelength, sym('slit-width', LENGTH)], {
    id: 'CE-single-slit-diffraction',
    name: 'Single-slit diffraction first minimum',
    domain: 'electromagnetism',
    formula_latex: String.raw`\sin\theta_1=\lambda/a`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(wavelength, sym('slit-width', LENGTH)),
    holds: 'optical-wavelength > 0 and slit-width >= optical-wavelength',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['Fraunhofer diffraction', 'single rectangular slit', 'monochromatic illumination'],
    references: ['OpenStax University Physics 3, Single-Slit Diffraction'],
    partnerBridges: [],
  }),
  l1(sym('tov-pressure-gradient', divide(PRESSURE, LENGTH)), [mass, radius, pressure, rho, G, C], {
    id: 'CE-tolman-oppenheimer-volkoff',
    name: 'Tolman–Oppenheimer–Volkoff equilibrium and mass limit',
    searchTerms: ['TOV limit', 'neutron star maximum mass'],
    domain: 'general-relativity',
    formula_latex: String.raw`dP/dr=-G(\rho+P/c^2)(m+4\pi r^3P/c^2)/[r^2(1-2Gm/(rc^2))]`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(op('-', [times(G,
      op('+', [rho, over(pressure, pow(C, '2'))]),
      op('+', [mass, over(times(literal('4pi'), pow(radius, '3'), pressure), pow(C, '2'))]))]),
      times(pow(radius, '2'), op('-', [literal('1'), compactness]))),
    holds: 'areal-radius > 0 and enclosed-mass >= 0 and mass-energy-density >= 0 and fluid-pressure >= 0 and areal-radius > 2*G*enclosed-mass/c^2',
    conventionNote: 'This is the pressure gradient used to compute the mass limit. The maximum mass depends on the chosen equation of state and the stable branch of equilibria. The 1939 ideal-neutron-gas model gives approximately 0.7 solar masses.',
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['static spherical nonrotating perfect fluid', 'mass-energy-density is energy density divided by c²'],
    references: ['Tolman 1939, Phys. Rev. 55:364', 'Oppenheimer and Volkoff 1939, Phys. Rev. 55:374'],
    partnerBridges: [],
  }),
  l1(sym('fine-structure-constant', DIMENSIONLESS), [sym('e', CHARGE), sym('epsilon_0', PERMITTIVITY), hBar, C], {
    id: 'CE-fine-structure-constant',
    name: 'Fine-structure constant',
    searchTerms: ['alpha', 'electromagnetic coupling'],
    domain: 'quantum',
    formula_latex: String.raw`\alpha=e^2/(4\pi\epsilon_0\hbar c)`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(pow(sym('e', CHARGE), '2'), times(literal('4pi'), sym('epsilon_0', PERMITTIVITY), hBar, C)),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['low-energy electromagnetic coupling', 'SI vacuum constants'],
    references: ['CODATA 2022 recommended values, fine-structure constant'],
    partnerBridges: [],
  }),
  l1(sym('bekenstein-entropy-upper-bound', ENTROPY), [sym('system-energy', ENERGY), sym('enclosing-radius', LENGTH), entropyConstant, hBar, C], {
    id: 'CE-bekenstein-bound',
    bound: 'upper',
    name: 'Bekenstein entropy bound',
    searchTerms: ['Bekenstein bound', 'entropy upper bound'],
    domain: 'information',
    formula_latex: String.raw`S\leq 2\pi k_B R E/(\hbar c)`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(literal('2pi'), entropyConstant, sym('enclosing-radius', LENGTH), sym('system-energy', ENERGY)), times(hBar, C)),
    holds: 'system-energy >= 0 and enclosing-radius > 0',
    conventionNote: 'The value is an upper bound on the system entropy under the stated assumptions.',
    regime: { force: 'gravitational' },
    assumptions: ['complete isolated system', 'weak self-gravity for the ordinary matter form'],
    references: ['Bekenstein 1981, Phys. Rev. D 23:287'],
    partnerBridges: [],
  }),
  l1(sym('orthogonalization-time-lower-bound', TIME), [sym('mean-energy-above-ground', ENERGY), hBar], {
    id: 'CE-margolus-levitin-bound',
    bound: 'lower',
    name: 'Margolus–Levitin quantum speed limit',
    searchTerms: ['Margolus Levitin bound', 'orthogonalization time'],
    domain: 'quantum',
    formula_latex: String.raw`\tau_\perp\geq\pi\hbar/(2(E-E_0))`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(literal('pi'), hBar), times(literal('2'), sym('mean-energy-above-ground', ENERGY))),
    holds: 'mean-energy-above-ground > 0',
    conventionNote: 'The value is a lower bound on the time to reach an orthogonal quantum state.',
    regime: { scale: 'quantum' },
    assumptions: ['time-independent Hamiltonian', 'mean energy measured above the ground state', 'orthogonal final state'],
    references: ['Margolus and Levitin 1998, Physica D 120:188–195'],
    partnerBridges: [],
  }),
  l1(sym('unruh-temperature', TEMPERATURE), [sym('proper-acceleration', ACCELERATION), hBar, C, entropyConstant], {
    id: 'CE-unruh-temperature',
    name: 'Unruh temperature of an accelerated detector',
    searchTerms: ['Unruh effect', 'uniform proper acceleration'],
    domain: 'quantum',
    formula_latex: String.raw`T_U=\hbar a/(2\pi c k_B)`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(hBar, sym('proper-acceleration', ACCELERATION)), times(literal('2pi'), C, entropyConstant)),
    holds: 'proper-acceleration >= 0',
    regime: { scale: 'quantum' },
    assumptions: ['uniform proper acceleration', 'Minkowski vacuum', 'thermal detector response'],
    references: ['Unruh 1976, Phys. Rev. D 14:870'],
    partnerBridges: ['57'],
    restatesBridge: '57',
  }),
  l1(sym('A', AREA), [sym('mass', MASS), G, C], {
    id: 'CE-schwarzschild-horizon-area',
    name: 'Schwarzschild horizon area',
    searchTerms: ['black hole horizon area'],
    domain: 'general-relativity',
    formula_latex: String.raw`A=16\pi G^2M^2/c^4`,
    epistemicStatus: 'fully-quantitative',
    scalarAst: over(times(literal('16pi'), pow(G, '2'), pow(sym('mass', MASS), '2')), pow(C, '4')),
    holds: 'mass > 0',
    regime: { force: 'gravitational' },
    assumptions: ['Schwarzschild black hole', 'no charge or spin', 'area A is the event-horizon area'],
    references: ['Schwarzschild 1916; area of a sphere at r_s = 2GM/c²'],
    partnerBridges: [],
  }),
];
