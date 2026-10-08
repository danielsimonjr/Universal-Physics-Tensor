/**
 * L1 (scalar-AST) canonical entries — classical mechanics. The foundational
 * laws (Newton's 2nd, mass–energy, momentum) plus the standard textbook
 * monomial mechanics laws (kinetic/potential energy, work, power, torque,
 * angular momentum, Hooke's law, impulse, SHM). Each is a unique dimensional
 * monomial (0 free groups); L0 fields are engine-derived (see `_l1-build`).
 *
 * Scope: generic, purely dimensional MONOMIAL laws (the "only laws that
 * genuinely fit the dimensional L-layer" bar — Adam+Eve adversarial pass,
 * 2026-06-20). Numeric prefactors (½) are recorded via `scalar-up-to-constant`;
 * √-laws (SHM) are `dimensional` with engine-derived fractional monomials, like
 * the pendulum. See docs/research/bridges-vs-canonical-map.md.
 *
 * @module canonical/entries/mechanics
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../dimensional/ast-builders.js';
import {
  MASS,
  VELOCITY,
  ENERGY,
  FORCE,
  ACCELERATION,
  LENGTH,
  TIME,
  POWER,
  FREQUENCY,
  DIMENSIONLESS,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const MOMENTUM = dim(1, 1, -1); // [L M T⁻¹]
const TORQUE = dim(2, 1, -2); // [L² M T⁻²]
const ANGULAR_MOMENTUM = dim(2, 1, -1); // [L² M T⁻¹]
const MOMENT_OF_INERTIA = dim(2, 1, 0); // [L² M]
const SPRING_CONSTANT = dim(0, 1, -2); // [M T⁻²]
const G_DIM = dim(3, -1, -2); // Newton's constant [L³ M⁻¹ T⁻²]

export const MECHANICS: readonly CanonicalEquation[] = [
  // ── foundational ──────────────────────────────────────────────────────────
  l1({ name: 'force', dim: FORCE }, [
    { name: 'mass', dim: MASS },
    { name: 'acceleration', dim: ACCELERATION },
  ], {
    id: 'CE-newton-second-law',
    name: "Newton's second law",
    domain: 'mechanics',
    formula_latex: 'F = m a',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('mass', MASS), sym('acceleration', ACCELERATION)]),
    regime: { scale: 'classical' },
    assumptions: ['inertial frame', 'constant mass'],
    references: ['Newton, Principia 1687'],
    partnerBridges: [],
  }),
  l1({ name: 'rest-energy', dim: ENERGY }, [
    { name: 'mass', dim: MASS },
    { name: 'c', dim: VELOCITY },
  ], {
    id: 'CE-mass-energy',
    name: 'Mass–energy equivalence',
    domain: 'mechanics',
    formula_latex: 'E = m c^2',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('mass', MASS), pow(sym('c', VELOCITY), '2')]),
    regime: { scale: 'classical' },
    assumptions: ['rest energy of a massive body'],
    references: ['Einstein 1905, Ann. Phys. 18:639'],
    partnerBridges: [],
  }),
  l1({ name: 'p', dim: MOMENTUM }, [
    { name: 'mass', dim: MASS },
    { name: 'velocity', dim: VELOCITY },
  ], {
    id: 'CE-momentum',
    name: 'Momentum (non-relativistic)',
    domain: 'mechanics',
    formula_latex: 'p = m v',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('mass', MASS), sym('velocity', VELOCITY)]),
    regime: { scale: 'classical' },
    assumptions: ['non-relativistic (v ≪ c)'],
    references: ['Newton, Principia 1687'],
    partnerBridges: [],
  }),
  // ── energy ────────────────────────────────────────────────────────────────
  l1({ name: 'kinetic-energy', dim: ENERGY }, [
    { name: 'mass', dim: MASS },
    { name: 'speed', dim: VELOCITY },
  ], {
    id: 'CE-kinetic-energy',
    prefactor: {
      value: 0.5,
      quote: String.raw`E_\text{k} = \frac{1}{2} mv^2`,
      locator: "Wikipedia, 'Kinetic energy', revision 1370969006, wikitext line 56",
    },
    name: 'Kinetic energy',
    domain: 'mechanics',
    formula_latex: 'K = \\tfrac{1}{2} m v^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [sym('mass', MASS), pow(sym('speed', VELOCITY), '2')]),
    regime: { scale: 'classical' },
    assumptions: ['non-relativistic'],
    references: ['Taylor, Classical Mechanics §1'],
    partnerBridges: [],
  }),
  l1({ name: 'rotational-kinetic-energy', dim: ENERGY }, [
    { name: 'moment-of-inertia', dim: MOMENT_OF_INERTIA },
    { name: 'angular-velocity', dim: FREQUENCY },
  ], {
    id: 'CE-rotational-kinetic-energy',
    prefactor: {
      value: 0.5,
      quote: String.raw`E_\text{rotational} = \tfrac{1}{2} I \omega^2`,
      locator: "Wikipedia, 'Rotational energy', revision 1258577842, wikitext line 3",
    },
    name: 'Rotational kinetic energy',
    domain: 'mechanics',
    formula_latex: 'K = \\tfrac{1}{2} I \\omega^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('moment-of-inertia', MOMENT_OF_INERTIA),
      pow(sym('angular-velocity', FREQUENCY), '2'),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['rigid body'],
    references: ['Taylor, Classical Mechanics §10'],
    partnerBridges: [],
  }),
  l1({ name: 'gravitational-potential-energy', dim: ENERGY }, [
    { name: 'G', dim: G_DIM },
    { name: 'mass', dim: MASS },
    { name: 'secondary-mass', dim: MASS },
    { name: 'r', dim: LENGTH },
  ], {
    id: 'CE-gravitational-potential-energy',
    conventionNote: 'gravitational potential energy is U = −G m1 m2/r. The minus is in the scalar AST; a positive formula differs by the factor −1.',
    holds: 'mass >= 0 and secondary-mass >= 0 and r > 0',
    name: 'Gravitational potential energy',
    domain: 'mechanics',
    formula_latex: 'U = -G m_1 m_2 / r',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('-1', DIMENSIONLESS),
      op('/', [
        op('*', [sym('G', G_DIM), sym('mass', MASS), sym('secondary-mass', MASS)]),
        sym('r', LENGTH),
      ]),
    ]),
    regime: { scale: 'classical', force: 'gravitational' },
    assumptions: ['two point masses', 'zero reference at infinity'],
    references: ['Newton, Principia 1687'],
    partnerBridges: [],
  }),
  l1({ name: 'work', dim: ENERGY }, [
    { name: 'force', dim: FORCE },
    { name: 'distance', dim: LENGTH },
  ], {
    id: 'CE-work',
    name: 'Work (constant force)',
    domain: 'mechanics',
    formula_latex: 'W = F d',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('force', FORCE), sym('distance', LENGTH)]),
    regime: { scale: 'classical' },
    assumptions: ['constant force along displacement'],
    references: ['Taylor, Classical Mechanics §4'],
    partnerBridges: [],
  }),
  l1({ name: 'spring-potential-energy', dim: ENERGY }, [
    { name: 'spring-constant', dim: SPRING_CONSTANT },
    { name: 'displacement', dim: LENGTH },
  ], {
    id: 'CE-spring-potential-energy',
    prefactor: {
      value: 0.5,
      quote: String.raw`U_\mathrm{el}(x) = \tfrac 1 2 kx^2`,
      locator: "Wikipedia, 'Hooke's law', revision 1375736650, wikitext line 146",
    },
    name: 'Elastic potential energy',
    domain: 'mechanics',
    formula_latex: 'U = \\tfrac{1}{2} k x^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('spring-constant', SPRING_CONSTANT),
      pow(sym('displacement', LENGTH), '2'),
    ]),
    regime: { scale: 'classical', force: 'emergent' },
    assumptions: ['Hookean (linear) spring'],
    references: ['Taylor, Classical Mechanics §5'],
    partnerBridges: [],
  }),
  // ── power ─────────────────────────────────────────────────────────────────
  l1({ name: 'power', dim: POWER }, [
    { name: 'force', dim: FORCE },
    { name: 'velocity', dim: VELOCITY },
  ], {
    id: 'CE-power',
    name: 'Mechanical power',
    domain: 'mechanics',
    formula_latex: 'P = F v',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('force', FORCE), sym('velocity', VELOCITY)]),
    regime: { scale: 'classical' },
    assumptions: ['force along velocity'],
    references: ['Taylor, Classical Mechanics §4'],
    partnerBridges: [],
  }),
  // ── force ─────────────────────────────────────────────────────────────────
  l1({ name: 'force', dim: FORCE }, [
    { name: 'mass', dim: MASS },
    { name: 'speed', dim: VELOCITY },
    { name: 'radius', dim: LENGTH },
  ], {
    id: 'CE-centripetal-force',
    name: 'Centripetal force',
    domain: 'mechanics',
    formula_latex: 'F = m v^2 / r',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('mass', MASS), pow(sym('speed', VELOCITY), '2')]),
      sym('radius', LENGTH),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['uniform circular motion'],
    references: ['Taylor, Classical Mechanics §1'],
    partnerBridges: [],
  }),
  l1({ name: 'force', dim: FORCE }, [
    { name: 'spring-constant', dim: SPRING_CONSTANT },
    { name: 'displacement', dim: LENGTH },
  ], {
    id: 'CE-hooke-law',
    conventionNote: 'Hooke\'s law is F = −kx. The minus is in the scalar AST; a positive formula differs by the factor −1.',
    name: "Hooke's law",
    domain: 'mechanics',
    formula_latex: 'F = -k x',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('-1', DIMENSIONLESS),
      sym('spring-constant', SPRING_CONSTANT),
      sym('displacement', LENGTH),
    ]),
    regime: { scale: 'classical', force: 'emergent' },
    assumptions: ['linear elastic regime'],
    references: ['Hooke 1678'],
    partnerBridges: [],
  }),
  // ── rotational + impulse ────────────────────────────────────────────────────
  l1({ name: 'torque', dim: TORQUE }, [
    { name: 'radius', dim: LENGTH },
    { name: 'force', dim: FORCE },
  ], {
    id: 'CE-torque',
    name: 'Torque (perpendicular force)',
    domain: 'mechanics',
    formula_latex: '\\tau = r F',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('radius', LENGTH), sym('force', FORCE)]),
    regime: { scale: 'classical' },
    assumptions: ['force perpendicular to lever arm'],
    references: ['Taylor, Classical Mechanics §10'],
    partnerBridges: [],
  }),
  l1({ name: 'angular-momentum', dim: ANGULAR_MOMENTUM }, [
    { name: 'radius', dim: LENGTH },
    { name: 'p', dim: MOMENTUM },
  ], {
    id: 'CE-angular-momentum',
    name: 'Angular momentum (point particle)',
    domain: 'mechanics',
    formula_latex: 'L = r p',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('radius', LENGTH), sym('p', MOMENTUM)]),
    regime: { scale: 'classical' },
    assumptions: ['momentum perpendicular to radius'],
    references: ['Taylor, Classical Mechanics §3'],
    partnerBridges: [],
  }),
  l1({ name: 'moment-of-inertia', dim: MOMENT_OF_INERTIA }, [
    { name: 'mass', dim: MASS },
    { name: 'radius', dim: LENGTH },
  ], {
    id: 'CE-moment-of-inertia',
    name: 'Moment of inertia (point mass)',
    domain: 'mechanics',
    formula_latex: 'I = m r^2',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('mass', MASS), pow(sym('radius', LENGTH), '2')]),
    regime: { scale: 'classical' },
    assumptions: ['point mass at radius r'],
    references: ['Taylor, Classical Mechanics §10'],
    partnerBridges: [],
  }),
  l1({ name: 'p', dim: MOMENTUM }, [
    { name: 'force', dim: FORCE },
    { name: 'time', dim: TIME },
  ], {
    id: 'CE-impulse',
    name: 'Impulse (constant force)',
    domain: 'mechanics',
    formula_latex: 'J = F t',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('force', FORCE), sym('time', TIME)]),
    regime: { scale: 'classical' },
    assumptions: ['constant force over interval t'],
    references: ['Taylor, Classical Mechanics §1'],
    partnerBridges: [],
  }),
  // ── oscillations (√-law: dimensional-only, engine-derived fractional monomial)
  l1({ name: 'angular-velocity', dim: FREQUENCY }, [
    { name: 'spring-constant', dim: SPRING_CONSTANT },
    { name: 'mass', dim: MASS },
  ], {
    id: 'CE-simple-harmonic-frequency',
    prefactor: {
      value: 1,
      quote: String.raw`\omega = \sqrt{\frac k m}.`,
      locator: "Wikipedia, 'Harmonic oscillator', revision 1373924880, wikitext line 44",
    },
    holds: 'spring-constant > 0 and mass > 0',
    name: 'Simple-harmonic angular frequency',
    domain: 'mechanics',
    formula_latex: '\\omega = \\sqrt{k/m}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'classical', force: 'emergent' },
    assumptions: ['ideal mass–spring oscillator'],
    references: ['Taylor, Classical Mechanics §5'],
    partnerBridges: [],
  }),
];
