/**
 * L1 (scalar-AST) canonical entries — electromagnetism & circuits. The standard
 * textbook monomial EM laws: Ohm's law, electrical power, material resistance,
 * parallel-plate capacitance, capacitor/inductor energy, the field of a long
 * wire, cyclotron frequency, Larmor radius, the point-charge field, and LC
 * resonance. L0 fields are engine-derived (see `_l1-build`).
 *
 * Scope: generic dimensional MONOMIAL laws (Adam+Eve adversarial audit,
 * 2026-06-20). Numeric/geometric prefactors (½, 2π, 4π) are recorded via
 * `scalar-up-to-constant`; the LC √-law is `dimensional`. Maxwell's equations
 * (vector PDEs) are deliberately out of scope. See
 * docs/research/bridges-vs-canonical-map.md.
 *
 * Batch 3 (2026-07-03) appends 5 more monomial laws: RC time constant, the
 * Poynting flux, the solenoid field, Larmor radiated power (distinct from the
 * Larmor gyro-radius above), and the electric-field energy density.
 *
 * @module canonical/entries/electromagnetism
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../bridges/equations/_be-helpers.js';
import {
  MASS,
  VELOCITY,
  ACCELERATION,
  ENERGY,
  POWER,
  LENGTH,
  AREA,
  TIME,
  FREQUENCY,
  CHARGE,
  FORCE,
  DIMENSIONLESS,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const CURRENT = dim(0, 0, 0, 1); // ampere [I]
const VOLTAGE = dim(2, 1, -3, -1); // volt [L² M T⁻³ I⁻¹]
const RESISTANCE = dim(2, 1, -3, -2); // ohm [L² M T⁻³ I⁻²]
const RESISTIVITY = dim(3, 1, -3, -2); // ohm·m [L³ M T⁻³ I⁻²]
const CAPACITANCE = dim(-2, -1, 4, 2); // farad [L⁻² M⁻¹ T⁴ I²]
const INDUCTANCE = dim(2, 1, -2, -2); // henry [L² M T⁻² I⁻²]
const MAGNETIC_FIELD = dim(0, 1, -2, -1); // tesla [M T⁻² I⁻¹]
const ELECTRIC_FIELD = dim(1, 1, -3, -1); // V/m [L M T⁻³ I⁻¹]
const PERMITTIVITY = dim(-3, -1, 4, 2); // ε₀ [L⁻³ M⁻¹ T⁴ I²]
const PERMEABILITY = dim(1, 1, -2, -2); // μ₀ [L M T⁻² I⁻²]
const POYNTING_FLUX = dim(0, 1, -3, 0); // W/m² [M T⁻³] (power per area)
const TURN_DENSITY = dim(-1, 0, 0, 0); // turns/m [L⁻¹]
const FIELD_ENERGY_DENSITY = dim(-1, 1, -2, 0); // J/m³ [L⁻¹ M T⁻²] (energy per volume)

export const ELECTROMAGNETISM: readonly CanonicalEquation[] = [
  l1({ name: 'voltage', dim: VOLTAGE }, [
    { name: 'current', dim: CURRENT },
    { name: 'resistance', dim: RESISTANCE },
  ], {
    id: 'CE-ohm-law',
    name: "Ohm's law",
    domain: 'electromagnetism',
    formula_latex: 'V = I R',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('current', CURRENT), sym('resistance', RESISTANCE)]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['ohmic conductor'],
    references: ['Ohm 1827'],
    partnerBridges: [],
  }),
  l1({ name: 'power', dim: POWER }, [
    { name: 'current', dim: CURRENT },
    { name: 'voltage', dim: VOLTAGE },
  ], {
    id: 'CE-electrical-power',
    name: 'Electrical power',
    domain: 'electromagnetism',
    formula_latex: 'P = I V',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('current', CURRENT), sym('voltage', VOLTAGE)]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: [],
    references: ['Joule 1841'],
    partnerBridges: [],
  }),
  l1({ name: 'resistance', dim: RESISTANCE }, [
    { name: 'resistivity', dim: RESISTIVITY },
    { name: 'length', dim: LENGTH },
    { name: 'area', dim: AREA },
  ], {
    id: 'CE-resistance-material',
    name: 'Resistance of a uniform conductor',
    domain: 'electromagnetism',
    formula_latex: 'R = \\rho L / A',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('resistivity', RESISTIVITY), sym('length', LENGTH)]),
      sym('area', AREA),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['uniform cross-section', 'homogeneous material'],
    references: ['Pouillet 1837'],
    partnerBridges: [],
  }),
  l1({ name: 'capacitance', dim: CAPACITANCE }, [
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'area', dim: AREA },
    { name: 'distance', dim: LENGTH },
  ], {
    id: 'CE-capacitance-parallel-plate',
    name: 'Parallel-plate capacitance',
    domain: 'electromagnetism',
    formula_latex: 'C = \\varepsilon_0 A / d',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('epsilon_0', PERMITTIVITY), sym('area', AREA)]),
      sym('distance', LENGTH),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['vacuum gap', 'ideal plates (no fringing)'],
    references: ['Faraday 1837'],
    partnerBridges: [],
  }),
  l1({ name: 'energy', dim: ENERGY }, [
    { name: 'capacitance', dim: CAPACITANCE },
    { name: 'voltage', dim: VOLTAGE },
  ], {
    id: 'CE-capacitor-energy',
    name: 'Capacitor stored energy',
    domain: 'electromagnetism',
    formula_latex: 'U = \\tfrac{1}{2} C V^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('capacitance', CAPACITANCE),
      pow(sym('voltage', VOLTAGE), '2'),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: [],
    references: ['Standard electromagnetism (Griffiths §2.4)'],
    partnerBridges: [],
  }),
  l1({ name: 'energy', dim: ENERGY }, [
    { name: 'inductance', dim: INDUCTANCE },
    { name: 'current', dim: CURRENT },
  ], {
    id: 'CE-inductor-energy',
    name: 'Inductor stored energy',
    domain: 'electromagnetism',
    formula_latex: 'U = \\tfrac{1}{2} L I^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('inductance', INDUCTANCE),
      pow(sym('current', CURRENT), '2'),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: [],
    references: ['Standard electromagnetism (Griffiths §7.2)'],
    partnerBridges: [],
  }),
  l1({ name: 'magnetic-field', dim: MAGNETIC_FIELD }, [
    { name: 'mu_0', dim: PERMEABILITY },
    { name: 'current', dim: CURRENT },
    { name: 'distance', dim: LENGTH },
  ], {
    id: 'CE-magnetic-field-wire',
    name: 'Magnetic field of a long straight wire',
    domain: 'electromagnetism',
    formula_latex: 'B = \\mu_0 I / (2\\pi r)',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      op('*', [sym('mu_0', PERMEABILITY), sym('current', CURRENT)]),
      sym('distance', LENGTH),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['infinite straight wire', 'magnetostatic'],
    references: ['Ampère 1826'],
    partnerBridges: [],
  }),
  l1({ name: 'cyclotron-frequency', dim: FREQUENCY }, [
    { name: 'charge', dim: CHARGE },
    { name: 'magnetic-field', dim: MAGNETIC_FIELD },
    { name: 'mass', dim: MASS },
  ], {
    id: 'CE-cyclotron-frequency',
    name: 'Cyclotron frequency',
    domain: 'electromagnetism',
    formula_latex: '\\omega_c = q B / m',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('charge', CHARGE), sym('magnetic-field', MAGNETIC_FIELD)]),
      sym('mass', MASS),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['non-relativistic charged particle'],
    references: ['Standard plasma physics'],
    partnerBridges: [],
  }),
  l1({ name: 'larmor-radius', dim: LENGTH }, [
    { name: 'mass', dim: MASS },
    { name: 'speed', dim: VELOCITY },
    { name: 'charge', dim: CHARGE },
    { name: 'magnetic-field', dim: MAGNETIC_FIELD },
  ], {
    id: 'CE-larmor-radius',
    name: 'Larmor (gyro) radius',
    domain: 'electromagnetism',
    formula_latex: 'r_L = m v_\\perp / (|q| B)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('mass', MASS), sym('speed', VELOCITY)]),
      op('*', [{ kind: 'abs', arg: sym('charge', CHARGE) }, sym('magnetic-field', MAGNETIC_FIELD)]),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['velocity perpendicular to B', 'non-relativistic'],
    references: ['Standard plasma physics'],
    partnerBridges: [],
  }),
  l1({ name: 'electric-field', dim: ELECTRIC_FIELD }, [
    { name: 'charge', dim: CHARGE },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'r', dim: LENGTH },
  ], {
    id: 'CE-point-charge-field',
    name: 'Point-charge electric field (Coulomb field)',
    domain: 'electromagnetism',
    formula_latex: 'E = q / (4\\pi \\varepsilon_0 r^2)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      sym('charge', CHARGE),
      op('*', [
        sym('4pi', DIMENSIONLESS),
        sym('epsilon_0', PERMITTIVITY),
        pow(sym('r', LENGTH), '2'),
      ]),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['point charge', 'vacuum', 'electrostatic'],
    references: ['Coulomb 1785'],
    partnerBridges: [],
  }),
  // ── LC resonance (√-law: dimensional-only, engine-derived fractional monomial)
  l1({ name: 'angular-frequency', dim: FREQUENCY }, [
    { name: 'inductance', dim: INDUCTANCE },
    { name: 'capacitance', dim: CAPACITANCE },
  ], {
    id: 'CE-lc-resonance',
    name: 'LC resonant angular frequency',
    domain: 'electromagnetism',
    formula_latex: '\\omega_0 = 1/\\sqrt{L C}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['ideal lossless LC circuit'],
    references: ['Standard circuit theory'],
    partnerBridges: [],
  }),
  // ── Folded in from the former l1-quantum-em batch file (2026-06-22 god-file
  // split): the two electromagnetism-domain force laws. ─────────────────────
  // Coulomb's law  F = q₁ q₂ / (4π ε₀ r²)  (free charge-ratio group)
  l1({ name: 'coulomb-force', dim: FORCE }, [
    { name: 'q_1', dim: CHARGE },
    { name: 'q_2', dim: CHARGE },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'r', dim: LENGTH },
  ], {
    id: 'CE-coulomb',
    name: "Coulomb's law",
    domain: 'electromagnetism',
    formula_latex: 'F = q_1 q_2/(4\\pi\\varepsilon_0 r^2)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('q_1', CHARGE), sym('q_2', CHARGE)]),
      op('*', [
        sym('4pi', DIMENSIONLESS),
        sym('epsilon_0', PERMITTIVITY),
        pow(sym('r', LENGTH), '2'),
      ]),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['point charges', 'vacuum', 'electrostatic'],
    references: ['Coulomb 1785'],
    partnerBridges: [],
  }),
  // Lorentz force magnitude  F = q v B
  l1({ name: 'lorentz-force', dim: FORCE }, [
    { name: 'q', dim: CHARGE },
    { name: 'v', dim: VELOCITY },
    { name: 'B', dim: MAGNETIC_FIELD },
  ], {
    id: 'CE-lorentz-force',
    name: 'Lorentz force (magnitude)',
    domain: 'electromagnetism',
    formula_latex: 'F = q v B',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('q', CHARGE),
      sym('v', VELOCITY),
      sym('B', MAGNETIC_FIELD),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['v ⟂ B (magnitude only)'],
    references: ['Lorentz 1895'],
    partnerBridges: [],
  }),
  // ── batch 3 (2026-07-03): RC time constant, Poynting flux, solenoid field,
  // Larmor radiated power, electric-field energy density. ───────────────────
  l1({ name: 'rc-time-constant', dim: TIME }, [
    { name: 'resistance', dim: RESISTANCE },
    { name: 'capacitance', dim: CAPACITANCE },
  ], {
    id: 'CE-rc-time-constant',
    name: 'RC time constant',
    domain: 'electromagnetism',
    formula_latex: '\\tau = R C',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('resistance', RESISTANCE), sym('capacitance', CAPACITANCE)]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['series RC circuit'],
    references: ['Standard circuit theory'],
    partnerBridges: [],
  }),
  l1({ name: 'poynting-flux', dim: POYNTING_FLUX }, [
    { name: 'electric-field', dim: ELECTRIC_FIELD },
    { name: 'magnetic-flux-density', dim: MAGNETIC_FIELD },
    { name: 'mu_0', dim: PERMEABILITY },
  ], {
    id: 'CE-poynting-flux',
    name: 'Poynting vector (magnitude)',
    domain: 'electromagnetism',
    formula_latex: 'S = E B / \\mu_0',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('electric-field', ELECTRIC_FIELD), sym('magnetic-flux-density', MAGNETIC_FIELD)]),
      sym('mu_0', PERMEABILITY),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['plane EM wave', 'vacuum'],
    references: ['Poynting 1884', 'Griffiths, Introduction to Electrodynamics'],
    partnerBridges: [],
  }),
  l1({ name: 'solenoid-field', dim: MAGNETIC_FIELD }, [
    { name: 'mu_0', dim: PERMEABILITY },
    { name: 'turn-density', dim: TURN_DENSITY },
    { name: 'current', dim: CURRENT },
  ], {
    id: 'CE-solenoid-field',
    name: 'Solenoid magnetic field',
    domain: 'electromagnetism',
    formula_latex: 'B = \\mu_0 n I',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      op('*', [sym('mu_0', PERMEABILITY), sym('turn-density', TURN_DENSITY)]),
      sym('current', CURRENT),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['ideal infinite solenoid'],
    references: ['Ampère 1826', 'Griffiths, Introduction to Electrodynamics'],
    partnerBridges: [],
  }),
  l1({ name: 'larmor-power', dim: POWER }, [
    { name: 'charge', dim: CHARGE },
    { name: 'acceleration', dim: ACCELERATION },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'speed-of-light', dim: VELOCITY },
  ], {
    id: 'CE-larmor-power',
    name: 'Larmor radiated power',
    domain: 'electromagnetism',
    formula_latex: 'P = q^2 a^2 / (6\\pi \\varepsilon_0 c^3)',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      op('*', [pow(sym('charge', CHARGE), '2'), pow(sym('acceleration', ACCELERATION), '2')]),
      op('*', [sym('epsilon_0', PERMITTIVITY), pow(sym('speed-of-light', VELOCITY), '3')]),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['non-relativistic point charge'],
    references: ['Larmor 1897', 'Jackson, Classical Electrodynamics'],
    partnerBridges: [],
  }),
  l1({ name: 'field-energy-density', dim: FIELD_ENERGY_DENSITY }, [
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'electric-field', dim: ELECTRIC_FIELD },
  ], {
    id: 'CE-field-energy-density',
    name: 'Electric-field energy density',
    domain: 'electromagnetism',
    formula_latex: 'u = \\tfrac{1}{2} \\varepsilon_0 E^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('*', [
      sym('epsilon_0', PERMITTIVITY),
      pow(sym('electric-field', ELECTRIC_FIELD), '2'),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['linear vacuum', 'electrostatic'],
    references: ['Griffiths, Introduction to Electrodynamics'],
    partnerBridges: [],
  }),
];
