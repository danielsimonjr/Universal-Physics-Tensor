/**
 * L1 (scalar-AST) canonical entries — fluids & waves (classical mechanics).
 * Hydrostatic pressure, the pressure and density definitions, buoyancy, Stokes
 * drag, the wave relation v = fλ, the fluid sound speed, (batch 2) continuity
 * flow rate, Newtonian shear stress, Laplace pressure, dynamic pressure, and
 * (batch 6) harmonic oscillator energy. L0 fields are engine-derived (see
 * `_l1-build`).
 *
 * Scope: generic dimensional MONOMIAL laws (Adam+Eve adversarial audit,
 * 2026-06-20). `domain: 'mechanics'` — the `CanonicalDomain` enum has no
 * `fluids`/`waves` arm, and these are classical-mechanics laws. The sound-speed
 * √-law is `dimensional` (the dimensionless adiabatic index γ is a leading
 * constant, not a governing quantity). Navier–Stokes (a PDE) is out of scope.
 * Poiseuille's law is also out of scope — its two independent length scales
 * (tube radius and length) make it a non-monomial that dimensional analysis
 * alone cannot pin down. See docs/research/bridges-vs-canonical-map.md.
 *
 * Reynolds number (`Re = ρvL/μ`) was in the batch-2 brief but is DELIBERATELY
 * OMITTED: with 4 governing quantities (ρ, v, L, μ) spanning only 3
 * independent base dimensions (L, M, T) and a DIMENSIONLESS target, the
 * Buckingham-π null space is 1-dimensional (`freeDimensionlessGroups === 1`,
 * `monomial === null`, engine-verified) — dimensional analysis alone cannot
 * distinguish Re from Re² or 1/Re, so it fails the "dimensionally unique
 * monomial" bar this batch requires. See the batch-2 report for detail.
 *
 * @module canonical/entries/fluids-waves
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../bridges/equations/_be-helpers.js';
import {
  MASS,
  VELOCITY,
  ACCELERATION,
  FORCE,
  LENGTH,
  AREA,
  FREQUENCY,
  ENERGY,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const PRESSURE = dim(-1, 1, -2); // pascal [M L⁻¹ T⁻²]
const DENSITY = dim(-3, 1, 0); // [M L⁻³]
const VOLUME = dim(3, 0, 0); // [L³]
const VISCOSITY = dim(-1, 1, -1); // dynamic viscosity, Pa·s [M L⁻¹ T⁻¹]
const VOLUME_FLOW_RATE = dim(3, 0, -1); // [L³ T⁻¹]
const SURFACE_TENSION = dim(0, 1, -2); // N/m [M T⁻²]
const SPRING_CONSTANT = dim(0, 1, -2); // N/m [M T⁻²]

export const FLUIDS_WAVES: readonly CanonicalEquation[] = [
  l1({ name: 'pressure', dim: PRESSURE }, [
    { name: 'density', dim: DENSITY },
    { name: 'g', dim: ACCELERATION },
    { name: 'height', dim: LENGTH },
  ], {
    id: 'CE-hydrostatic-pressure',
    name: 'Hydrostatic pressure',
    domain: 'mechanics',
    formula_latex: 'P = \\rho g h',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('density', DENSITY),
      sym('g', ACCELERATION),
      sym('height', LENGTH),
    ]),
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['incompressible fluid', 'uniform gravity'],
    references: ['Pascal 1647'],
    partnerBridges: [],
  }),
  l1({ name: 'pressure', dim: PRESSURE }, [
    { name: 'force', dim: FORCE },
    { name: 'area', dim: AREA },
  ], {
    id: 'CE-pressure-definition',
    name: 'Pressure (force per area)',
    domain: 'mechanics',
    formula_latex: 'P = F / A',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('force', FORCE), sym('area', AREA)]),
    regime: { scale: 'classical' },
    assumptions: ['force normal to surface'],
    references: ['Standard mechanics'],
    partnerBridges: [],
  }),
  l1({ name: 'density', dim: DENSITY }, [
    { name: 'mass', dim: MASS },
    { name: 'volume', dim: VOLUME },
  ], {
    id: 'CE-density-definition',
    name: 'Mass density',
    domain: 'mechanics',
    formula_latex: '\\rho = m / V',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('mass', MASS), sym('volume', VOLUME)]),
    regime: { scale: 'classical' },
    assumptions: ['uniform body'],
    references: ['Standard mechanics'],
    partnerBridges: [],
  }),
  l1({ name: 'force', dim: FORCE }, [
    { name: 'density', dim: DENSITY },
    { name: 'volume', dim: VOLUME },
    { name: 'g', dim: ACCELERATION },
  ], {
    id: 'CE-buoyant-force',
    name: "Buoyant force (Archimedes')",
    domain: 'mechanics',
    formula_latex: 'F_b = \\rho V g',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('density', DENSITY),
      sym('volume', VOLUME),
      sym('g', ACCELERATION),
    ]),
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['fully submerged', 'static fluid'],
    references: ['Archimedes, On Floating Bodies'],
    partnerBridges: [],
  }),
  l1({ name: 'force', dim: FORCE }, [
    { name: 'viscosity', dim: VISCOSITY },
    { name: 'radius', dim: LENGTH },
    { name: 'speed', dim: VELOCITY },
  ], {
    id: 'CE-stokes-drag',
    name: "Stokes' drag",
    domain: 'mechanics',
    formula_latex: 'F_d = 6\\pi \\eta r v',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('viscosity', VISCOSITY),
      sym('radius', LENGTH),
      sym('speed', VELOCITY),
    ]),
    regime: { scale: 'classical', force: 'emergent' },
    assumptions: ['low Reynolds number', 'rigid sphere'],
    references: ['Stokes 1851'],
    partnerBridges: [],
  }),
  l1({ name: 'speed', dim: VELOCITY }, [
    { name: 'frequency', dim: FREQUENCY },
    { name: 'wavelength', dim: LENGTH },
  ], {
    id: 'CE-wave-speed',
    name: 'Wave relation (v = fλ)',
    domain: 'mechanics',
    formula_latex: 'v = f \\lambda',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('frequency', FREQUENCY), sym('wavelength', LENGTH)]),
    regime: { scale: 'classical' },
    assumptions: ['single propagating mode'],
    references: ['Standard wave mechanics'],
    partnerBridges: [],
  }),
  // ── sound speed (√-law: dimensional-only; γ is a dimensionless leading const).
  // The quantity is sound-speed. The generic quantity speed is a flow velocity
  // and a wave speed, and this law does not target it.
  l1({ name: 'sound-speed', dim: VELOCITY }, [
    { name: 'pressure', dim: PRESSURE },
    { name: 'density', dim: DENSITY },
  ], {
    id: 'CE-sound-speed',
    name: 'Speed of sound in a fluid',
    domain: 'mechanics',
    formula_latex: 'c = \\sqrt{\\gamma P / \\rho}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'classical' },
    assumptions: ['adiabatic', 'ideal fluid (γ dimensionless)'],
    references: ['Newton–Laplace'],
    partnerBridges: [],
  }),
  // ── batch 2: continuity/shear/Laplace/dynamic-pressure (Reynolds number
  // excluded — see the module docstring) ─────────────────────────────────────
  l1({ name: 'volume-flow-rate', dim: VOLUME_FLOW_RATE }, [
    { name: 'cross-sectional-area', dim: AREA },
    { name: 'flow-velocity', dim: VELOCITY },
  ], {
    id: 'CE-volume-flow-rate',
    name: 'Volume flow rate (continuity)',
    domain: 'mechanics',
    formula_latex: 'Q = A v',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('cross-sectional-area', AREA),
      sym('flow-velocity', VELOCITY),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['incompressible flow', 'steady state'],
    references: ['Batchelor, An Introduction to Fluid Dynamics'],
    partnerBridges: [],
  }),
  l1({ name: 'shear-stress', dim: PRESSURE }, [
    { name: 'dynamic-viscosity', dim: VISCOSITY },
    { name: 'velocity-gradient', dim: FREQUENCY },
  ], {
    id: 'CE-shear-stress',
    name: 'Shear stress (Newtonian fluid)',
    domain: 'mechanics',
    formula_latex: '\\tau = \\mu (dv/dy)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('dynamic-viscosity', VISCOSITY),
      sym('velocity-gradient', FREQUENCY),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['Newtonian fluid', 'laminar flow'],
    references: ['Newton; standard fluid mechanics'],
    partnerBridges: [],
  }),
  l1({ name: 'laplace-pressure', dim: PRESSURE }, [
    { name: 'surface-tension', dim: SURFACE_TENSION },
    { name: 'droplet-radius', dim: LENGTH },
  ], {
    id: 'CE-laplace-pressure',
    name: 'Laplace pressure (surface tension)',
    domain: 'mechanics',
    formula_latex: '\\Delta P = 2\\gamma / r',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      sym('surface-tension', SURFACE_TENSION),
      sym('droplet-radius', LENGTH),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['spherical interface'],
    references: ['Young–Laplace'],
    partnerBridges: [],
  }),
  l1({ name: 'dynamic-pressure', dim: PRESSURE }, [
    { name: 'density', dim: DENSITY },
    { name: 'flow-velocity', dim: VELOCITY },
  ], {
    id: 'CE-dynamic-pressure',
    name: 'Dynamic pressure',
    domain: 'mechanics',
    formula_latex: 'q = \\tfrac{1}{2} \\rho v^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('density', DENSITY),
      pow(sym('flow-velocity', VELOCITY), '2'),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['incompressible flow'],
    references: ['Bernoulli; standard fluid mechanics'],
    partnerBridges: [],
  }),
  // ── batch 6 (final): harmonic oscillator energy (scalar-up-to-constant,
  // the ½). NOTE: string wave speed (v = √(T/μ)) was in the batch-6 brief but
  // is DELIBERATELY OMITTED here — `CE-string-wave-speed` already exists as an
  // L0 dimensional entry in `dimensional-classics.ts` (tension/linear-density
  // governing set, same physics); adding it here would collide on id and
  // violate the registry's id-uniqueness invariant. See the batch-6 report.
  l1({ name: 'oscillator-energy', dim: ENERGY }, [
    { name: 'spring-constant', dim: SPRING_CONSTANT },
    { name: 'amplitude', dim: LENGTH },
  ], {
    id: 'CE-oscillator-energy',
    name: 'Harmonic oscillator energy',
    domain: 'mechanics',
    formula_latex: 'E = \\tfrac{1}{2} k A^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('spring-constant', SPRING_CONSTANT),
      pow(sym('amplitude', LENGTH), '2'),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['simple harmonic motion', 'linear spring'],
    references: ['Standard mechanics'],
    partnerBridges: [],
  }),
];
