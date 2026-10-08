/**
 * L0 (dimensional) canonical entries — the 9 textbook equations recovered by
 * the Buckingham-π engine (promoted from the dimensional-derivation benchmark).
 * Dimensions give the monomial exponents only, never the leading constant, so
 * every entry here is `epistemicStatus: 'dimensional'`.
 *
 * @module canonical/entries/dimensional-classics
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { dim } from '../../dimensional/ast-builders.js';
import {
  LENGTH,
  TIME,
  MASS,
  VELOCITY,
  ACCELERATION,
  FORCE,
  ACTION,
  ENTROPY,
  TEMPERATURE,
} from '../../dimensional/types.js';

const G = dim(3, -1, -2); // Newton's constant [L³ M⁻¹ T⁻²]
const LIN_DENSITY = dim(-1, 1, 0); // mass per length [L⁻¹ M]

/** Shared shape for an L0 classic (no L1/L2, fully dimensionally determined). */
const l0 = (
  e: Pick<
    CanonicalEquation,
    | 'id'
    | 'name'
    | 'domain'
    | 'formula_latex'
    | 'dimensional'
    | 'regime'
    | 'assumptions'
    | 'references'
    | 'partnerBridges'
    | 'restatesBridge'
    | 'holds'
    | 'prefactor'
    | 'groupPrefactor'
    | 'unsetFactorNote'
    | 'conventionNote'
    | 'conventionGroup'
    | 'targetAliases'
  >,
): CanonicalEquation => ({
  epistemicStatus: 'dimensional',
  freeDimensionlessGroups: 0,
  ...e,
});

export const DIMENSIONAL_CLASSICS: readonly CanonicalEquation[] = [
  l0({
    id: 'CE-pendulum-period',
    prefactor: {
      value: 2 * Math.PI,
      quote: String.raw`T_0 = 2\pi\sqrt{\frac \ell g}`,
      locator: "Wikipedia, 'Pendulum (mechanics)', revision 1374595895, wikitext line 171",
    },
    holds: 'length > 0 and gravity > 0',
    name: 'Pendulum period',
    domain: 'mechanics',
    formula_latex: 'T = 2\\pi\\sqrt{L/g}',
    dimensional: {
      target: { name: 'period', dim: TIME },
      governing: [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
      monomial: { length: 0.5, gravity: -0.5 },
    },
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['small-angle', 'point mass', 'rigid massless rod'],
    references: ['Taylor, Classical Mechanics §1'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-kepler-third',
    prefactor: {
      value: 2 * Math.PI,
      quote: String.raw`\frac{a^3}{T^2} = \frac{G(M + m)}{4\pi^2} \approx \frac{GM}{4\pi^2}`,
      locator: "Wikipedia, 'Kepler's laws of planetary motion', revision 1376360196, wikitext line 232",
    },
    holds: 'semi-major-axis > 0 and mass > 0',
    name: "Kepler's third law",
    domain: 'gravitation',
    formula_latex: 'T^2 = 4\\pi^2 a^3/(GM)',
    dimensional: {
      target: { name: 'period', dim: TIME },
      governing: [
        { name: 'semi-major-axis', dim: LENGTH },
        { name: 'G', dim: G },
        { name: 'mass', dim: MASS },
      ],
      monomial: { 'semi-major-axis': 1.5, G: -0.5, mass: -0.5 },
    },
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['two-body', 'M ≫ m'],
    references: ['Kepler 1619; any celestial-mechanics text'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-schwarzschild-radius',
    targetAliases: ['schwarzschild-radius'],
    prefactor: {
      value: 2,
      quote: String.raw`Schwarzschild radius{{br}}<math display="inline">\frac{2GM}{c^2}</math>`,
      locator: "Wikipedia, 'Schwarzschild radius', revision 1373854769, wikitext line 25",
    },
    holds: 'mass > 0',
    name: 'Schwarzschild radius',
    domain: 'general-relativity',
    formula_latex: 'r_s = 2GM/c^2',
    dimensional: {
      target: { name: 'radius', dim: LENGTH },
      governing: [
        { name: 'mass', dim: MASS },
        { name: 'G', dim: G },
        { name: 'c', dim: VELOCITY },
      ],
      monomial: { mass: 1, G: 1, c: -2 },
    },
    regime: { force: 'gravitational' },
    assumptions: ['static', 'spherically symmetric', 'vacuum'],
    references: ['Schwarzschild 1916'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-string-wave-speed',
    prefactor: {
      value: 1,
      quote: String.raw`v=\sqrt{T\over\mu},`,
      locator: "Wikipedia, 'String vibration', revision 1306385524, wikitext line 40",
    },
    holds: 'tension >= 0 and linear-density > 0',
    name: 'Wave speed on a string',
    domain: 'mechanics',
    formula_latex: 'v = \\sqrt{F/\\mu}',
    dimensional: {
      target: { name: 'speed', dim: VELOCITY },
      governing: [
        { name: 'tension', dim: FORCE },
        { name: 'linear-density', dim: LIN_DENSITY },
      ],
      monomial: { tension: 0.5, 'linear-density': -0.5 },
    },
    regime: { scale: 'classical' },
    assumptions: ['ideal flexible string', 'small amplitude'],
    references: ['Any waves/mechanics text'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-planck-length',
    prefactor: {
      value: 1,
      quote: String.raw`<math>l_\text{P} = \sqrt{\frac{\hbar G}{c^3}}</math>`,
      locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 77",
    },
    name: 'Planck length',
    domain: 'quantum',
    formula_latex: '\\ell_P = \\sqrt{\\hbar G/c^3}',
    dimensional: {
      target: { name: 'planck-length', dim: LENGTH },
      governing: [
        { name: 'hbar', dim: ACTION },
        { name: 'G', dim: G },
        { name: 'c', dim: VELOCITY },
      ],
      monomial: { hbar: 0.5, G: 0.5, c: -1.5 },
    },
    regime: { scale: 'quantum', force: 'gravitational' },
    assumptions: [],
    references: ['Planck 1899'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-planck-mass',
    prefactor: {
      value: 1,
      quote: String.raw`<math>m_\text{P} = \sqrt{\frac{\hbar c}{G}}</math>`,
      locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 82",
    },
    name: 'Planck mass',
    domain: 'quantum',
    formula_latex: 'm_P = \\sqrt{\\hbar c/G}',
    dimensional: {
      target: { name: 'planck-mass', dim: MASS },
      governing: [
        { name: 'hbar', dim: ACTION },
        { name: 'c', dim: VELOCITY },
        { name: 'G', dim: G },
      ],
      monomial: { hbar: 0.5, c: 0.5, G: -0.5 },
    },
    regime: { scale: 'quantum', force: 'gravitational' },
    assumptions: [],
    references: ['Planck 1899'],
    partnerBridges: ['41'], // 41 = Swampland Distance Conjecture ([mass])
  }),
  l0({
    id: 'CE-planck-time',
    prefactor: {
      value: 1,
      quote: String.raw`<math>t_\text{P} = \sqrt{\frac{\hbar G}{c^5}}</math>`,
      locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 87",
    },
    name: 'Planck time',
    domain: 'quantum',
    formula_latex: 't_P = \\sqrt{\\hbar G/c^5}',
    dimensional: {
      target: { name: 'planck-time', dim: TIME },
      governing: [
        { name: 'hbar', dim: ACTION },
        { name: 'G', dim: G },
        { name: 'c', dim: VELOCITY },
      ],
      monomial: { hbar: 0.5, G: 0.5, c: -2.5 },
    },
    regime: { scale: 'quantum', force: 'gravitational' },
    assumptions: [],
    references: ['Planck 1899'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-compton-wavelength',
    targetAliases: ['reduced-compton-wavelength'],
    conventionGroup: 'compton-wavelength',
    conventionNote: 'CE-compton-wavelength is the reduced wavelength λ̄ = ħ/(m c), prefactor checked. CE-compton-wavelength-full is λ = h/(m c). The Compton-shift entry uses h/(m c) (1−cos θ). h does not alias ħ.',
    prefactor: {
      value: 1,
      quote: String.raw`\lambda\!\!\!\bar{} = \frac{\lambda}{2 \pi} = \frac{\hbar}{m c},`,
      locator: "Wikipedia, 'Compton wavelength', revision 1376812882, wikitext line 13",
    },
    name: 'Reduced Compton wavelength',
    domain: 'quantum',
    formula_latex: '\\bar{\\lambda}_C = \\hbar/(mc)',
    dimensional: {
      target: { name: 'compton-wavelength', dim: LENGTH },
      governing: [
        { name: 'hbar', dim: ACTION },
        { name: 'mass', dim: MASS },
        { name: 'c', dim: VELOCITY },
      ],
      monomial: { hbar: 1, mass: -1, c: -1 },
    },
    regime: { scale: 'quantum' },
    assumptions: [],
    references: ['Compton 1923'],
    partnerBridges: [],
  }),
  l0({
    id: 'CE-thermal-de-broglie',
    name: 'Thermal de Broglie wavelength',
    domain: 'statistical',
    formula_latex: '\\lambda \\propto \\hbar/\\sqrt{m k_B T}',
    dimensional: {
      target: { name: 'thermal-wavelength', dim: LENGTH },
      governing: [
        { name: 'hbar', dim: ACTION },
        { name: 'mass', dim: MASS },
        { name: 'boltzmann', dim: ENTROPY },
        { name: 'temperature', dim: TEMPERATURE },
      ],
      monomial: { hbar: 1, mass: -0.5, boltzmann: -0.5, temperature: -0.5 },
    },
    regime: { scale: 'quantum' },
    assumptions: ['non-relativistic', 'ideal gas'],
    references: ['Any statistical-mechanics text'],
    // 12 = Caldeira-Leggett dephasing length: same [length] target, a candidate
    // correspondence — NOT a literal restatement, so no restatesBridge.
    partnerBridges: ['12'],
  }),
];
