/**
 * L1 (scalar-AST) canonical entries — statistical mechanics. 4 standard
 * kinetic-theory / equilibrium-statistics monomial laws (equipartition,
 * Stokes-Einstein diffusion, kinetic pressure, Maxwell-Boltzmann speed).
 * Each is a unique dimensional monomial (0 free groups); L0 fields are
 * engine-derived (see `_l1-build`).
 *
 * Mean free path (`λ = 1/(nσ)`) was deliberately EXCLUDED from this batch:
 * number density and cross-section are both pure-length dimension, so the
 * combination is dimensionally underdetermined (`nσ^1.5` is dimensionless) —
 * forcing it would violate the 0-free-groups invariant this file otherwise
 * holds to.
 *
 * 3 of the 4 laws are clean monomials with an exact prefactor left aside
 * (`scalarAst` included, `scalar-up-to-constant`); the Maxwell-Boltzmann
 * most-probable speed is a fractional-power monomial (a square root) —
 * `scalarAst` is OMITTED and `epistemicStatus` is `dimensional`, exactly like
 * the Fermi-gas √-laws in `condensed-matter.ts`.
 *
 * @module canonical/entries/statistical-mechanics
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../dimensional/ast-builders.js';
import { MASS, VELOCITY, ENERGY, TEMPERATURE } from '../../dimensional/types.js';
import { dim, op, l1 } from './_l1-build.js';

const BOLTZMANN_CONSTANT = dim(2, 1, -2, 0, -1); // J/K [L² M T⁻² Θ⁻¹]
const DIFFUSION_COEFFICIENT = dim(2, 0, -1, 0, 0); // m²/s [L² T⁻¹]
const DYNAMIC_VISCOSITY = dim(-1, 1, -1, 0, 0); // Pa·s [L⁻¹ M T⁻¹]
const PARTICLE_RADIUS = dim(1, 0, 0, 0, 0); // [L]
const NUMBER_DENSITY = dim(-3, 0, 0, 0, 0); // [L⁻³]
const KINETIC_PRESSURE = dim(-1, 1, -2, 0, 0); // Pa [L⁻¹ M T⁻²]
const MEAN_SQUARE_SPEED = dim(2, 0, -2, 0, 0); // m²/s² [L² T⁻²]

export const STATISTICAL_MECHANICS: readonly CanonicalEquation[] = [
  l1({ name: 'thermal-energy', dim: ENERGY }, [
    { name: 'k_B', dim: BOLTZMANN_CONSTANT },
    { name: 'temperature', dim: TEMPERATURE },
  ], {
    id: 'CE-equipartition',
    prefactor: {
      value: 1.5,
      quote: String.raw`\langle H_{\mathrm{kin}} \rangle = \left\langle \frac{p^2}{2m} \right\rangle = \langle \tfrac{1}{2} m v^{2} \rangle = \tfrac{3}{2} k_\text{B} T.`,
      locator: "Wikipedia, 'Equipartition theorem', revision 1373697867, wikitext line 304",
    },
    holds: 'temperature >= 0',
    name: 'Equipartition (mean kinetic energy)',
    domain: 'statistical',
    formula_latex: '\\langle E \\rangle = \\tfrac{3}{2} k_B T',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('k_B', BOLTZMANN_CONSTANT),
      sym('temperature', TEMPERATURE),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['ideal gas', 'thermal equilibrium', '3 translational DOF'],
    references: ['Reif, Fundamentals of Statistical and Thermal Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'diffusion-coefficient', dim: DIFFUSION_COEFFICIENT }, [
    { name: 'k_B', dim: BOLTZMANN_CONSTANT },
    { name: 'temperature', dim: TEMPERATURE },
    { name: 'dynamic-viscosity', dim: DYNAMIC_VISCOSITY },
    { name: 'particle-radius', dim: PARTICLE_RADIUS },
  ], {
    id: 'CE-stokes-einstein',
    prefactor: {
      value: 1 / (6 * Math.PI),
      quote: String.raw`D = \frac{k_\text{B} T}{6\pi\,\eta\,r}.`,
      locator: "Wikipedia, 'Einstein relation (kinetic theory)', revision 1353047788, wikitext line 79",
    },
    holds: 'temperature > 0 and dynamic-viscosity > 0 and particle-radius > 0',
    name: 'Stokes-Einstein diffusion',
    domain: 'statistical',
    formula_latex: 'D = k_B T/(6\\pi\\mu r)',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      op('*', [
        sym('k_B', BOLTZMANN_CONSTANT),
        sym('temperature', TEMPERATURE),
      ]),
      op('*', [
        sym('dynamic-viscosity', DYNAMIC_VISCOSITY),
        sym('particle-radius', PARTICLE_RADIUS),
      ]),
    ]),
    regime: { scale: 'mesoscopic' },
    assumptions: ['spherical particle', 'low Reynolds number'],
    references: ['Einstein 1905', 'Sutherland 1905'],
    partnerBridges: [],
  }),
  l1({ name: 'kinetic-pressure', dim: KINETIC_PRESSURE }, [
    { name: 'number-density', dim: NUMBER_DENSITY },
    { name: 'molecular-mass', dim: MASS },
    { name: 'mean-square-speed', dim: MEAN_SQUARE_SPEED },
  ], {
    id: 'CE-kinetic-pressure',
    prefactor: {
      value: 1 / 3,
      quote: String.raw`= \frac{1}{3} n mv_\text{rms}^2`,
      locator: "Wikipedia, 'Kinetic theory of gases', revision 1371478093, wikitext line 173",
    },
    holds: 'number-density >= 0 and molecular-mass > 0 and mean-square-speed >= 0',
    name: 'Kinetic pressure of an ideal gas',
    domain: 'statistical',
    formula_latex: 'P = \\tfrac{1}{3} n m \\langle v^2 \\rangle',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      op('*', [
        sym('number-density', NUMBER_DENSITY),
        sym('molecular-mass', MASS),
      ]),
      sym('mean-square-speed', MEAN_SQUARE_SPEED),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['ideal gas', 'isotropic velocity distribution'],
    references: ['Maxwell 1860', 'Reif, Fundamentals of Statistical and Thermal Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'most-probable-speed', dim: VELOCITY }, [
    { name: 'k_B', dim: BOLTZMANN_CONSTANT },
    { name: 'temperature', dim: TEMPERATURE },
    { name: 'molecular-mass', dim: MASS },
  ], {
    id: 'CE-mb-most-probable-speed',
    holds: 'temperature >= 0 and molecular-mass > 0',
    name: 'Maxwell-Boltzmann most-probable speed',
    domain: 'statistical',
    formula_latex: 'v_p = \\sqrt{2 k_B T/m}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'classical' },
    assumptions: ['Maxwell-Boltzmann distribution'],
    references: ['Maxwell 1860', 'Reif, Fundamentals of Statistical and Thermal Physics'],
    partnerBridges: [],
  }),
];
