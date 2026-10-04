/**
 * L1 (scalar-AST) canonical entries — condensed-matter physics. The PILOT batch
 * of the canonical L-layer expansion: 9 standard free-electron / Drude-model
 * monomial laws (carrier transport, Fermi gas, collective lattice/plasma
 * frequencies). Each is a unique dimensional monomial (0 free groups); L0
 * fields are engine-derived (see `_l1-build`).
 *
 * The pilot brief specified 10 laws including cyclotron frequency
 * (`ω_c = qB/m`), but that law is already canonical as `CE-cyclotron-frequency`
 * in `electromagnetism.ts` — it is omitted here to avoid a duplicate registry
 * entry for the same textbook relation (see the PILOT report for detail).
 *
 * 6 of the remaining laws are fully-quantitative. Five are clean integer
 * monomials. The angular plasma frequency is `√(n q²/(ε₀ m))`, so its factor
 * is 1 and it carries a `scalarAst`. Fermi energy, Fermi velocity, and the
 * Debye frequency omit `scalarAst` and stay `dimensional`: the unit monomial
 * is not those textbook factors.
 *
 * @module canonical/entries/condensed-matter
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../bridges/equations/_be-helpers.js';
import { MASS, VELOCITY, ENERGY, TIME, FREQUENCY, CHARGE } from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const ELECTRIC_FIELD = dim(1, 1, -3, -1); // V/m [L M T⁻³ I⁻¹]
const CARRIER_DENSITY = dim(-3, 0, 0, 0); // [L⁻³] (number density)
const CARRIER_MOBILITY = dim(0, -1, 2, 1); // [M⁻¹ T² I]
const ELECTRICAL_CONDUCTIVITY = dim(-3, -1, 3, 2); // siemens/m [L⁻³ M⁻¹ T³ I²]
const ELECTRICAL_RESISTIVITY = dim(3, 1, -3, -2); // ohm·m [L³ M T⁻³ I⁻²]
const HALL_COEFFICIENT = dim(3, 0, -1, -1); // [L³ T⁻¹ I⁻¹]
const REDUCED_PLANCK = dim(2, 1, -1, 0); // J·s [L² M T⁻¹]
const VACUUM_PERMITTIVITY = dim(-3, -1, 4, 2); // farad/m [L⁻³ M⁻¹ T⁴ I²]

export const CONDENSED_MATTER: readonly CanonicalEquation[] = [
  // ── free-carrier transport (fully-quantitative clean monomials) ───────────
  l1({ name: 'carrier-mobility', dim: CARRIER_MOBILITY }, [
    { name: 'charge', dim: CHARGE },
    { name: 'relaxation-time', dim: TIME },
    { name: 'mass', dim: MASS },
  ], {
    id: 'CE-carrier-mobility',
    name: 'Carrier mobility',
    domain: 'condensed-matter',
    formula_latex: '\\mu = q\\tau/m',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('charge', CHARGE), sym('relaxation-time', TIME)]),
      sym('mass', MASS),
    ]),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['Drude free-electron model'],
    references: ['Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'electrical-conductivity', dim: ELECTRICAL_CONDUCTIVITY }, [
    { name: 'carrier-density', dim: CARRIER_DENSITY },
    { name: 'charge', dim: CHARGE },
    { name: 'carrier-mobility', dim: CARRIER_MOBILITY },
  ], {
    id: 'CE-electrical-conductivity',
    name: 'Electrical conductivity (Drude)',
    domain: 'condensed-matter',
    formula_latex: '\\sigma = n q \\mu',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('carrier-density', CARRIER_DENSITY),
      sym('charge', CHARGE),
      sym('carrier-mobility', CARRIER_MOBILITY),
    ]),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['Drude free-electron model'],
    references: ['Ashcroft & Mermin, Solid State Physics (Drude model)'],
    partnerBridges: [],
  }),
  l1({ name: 'electrical-resistivity', dim: ELECTRICAL_RESISTIVITY }, [
    { name: 'mass', dim: MASS },
    { name: 'carrier-density', dim: CARRIER_DENSITY },
    { name: 'charge', dim: CHARGE },
    { name: 'relaxation-time', dim: TIME },
  ], {
    id: 'CE-drude-resistivity',
    name: 'Drude resistivity',
    domain: 'condensed-matter',
    formula_latex: '\\rho = m/(n q^2 \\tau)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      sym('mass', MASS),
      op('*', [
        sym('carrier-density', CARRIER_DENSITY),
        pow(sym('charge', CHARGE), '2'),
        sym('relaxation-time', TIME),
      ]),
    ]),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['Drude free-electron model'],
    references: ['Drude 1900', 'Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'hall-coefficient', dim: HALL_COEFFICIENT }, [
    { name: 'carrier-density', dim: CARRIER_DENSITY },
    { name: 'charge', dim: CHARGE },
  ], {
    id: 'CE-hall-coefficient',
    name: 'Hall coefficient',
    domain: 'condensed-matter',
    formula_latex: 'R_H = 1/(nq)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: pow(
      op('*', [sym('carrier-density', CARRIER_DENSITY), sym('charge', CHARGE)]),
      '-1',
    ),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['single-carrier Drude model', 'low magnetic field'],
    references: ['Kittel, Introduction to Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'drift-velocity', dim: VELOCITY }, [
    { name: 'carrier-mobility', dim: CARRIER_MOBILITY },
    { name: 'electric-field', dim: ELECTRIC_FIELD },
  ], {
    id: 'CE-drift-velocity',
    name: 'Carrier drift velocity',
    domain: 'condensed-matter',
    formula_latex: 'v_d = \\mu E',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('carrier-mobility', CARRIER_MOBILITY),
      sym('electric-field', ELECTRIC_FIELD),
    ]),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['Drude free-electron model', 'linear-response (low-field) regime'],
    references: ['Drude 1900', 'Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  // ── Fermi gas + collective frequencies (√-laws: dimensional-only,
  // engine-derived fractional monomials) ────────────────────────────────────
  l1({ name: 'fermi-energy', dim: ENERGY }, [
    { name: 'reduced-planck-constant', dim: REDUCED_PLANCK },
    { name: 'mass', dim: MASS },
    { name: 'carrier-density', dim: CARRIER_DENSITY },
  ], {
    id: 'CE-fermi-energy',
    name: 'Fermi energy',
    domain: 'condensed-matter',
    formula_latex: 'E_F \\propto \\hbar^2 n^{2/3}/m',
    epistemicStatus: 'dimensional',
    regime: { scale: 'mesoscopic' },
    assumptions: ['degenerate free-electron gas', 'T ≈ 0'],
    references: ['Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'fermi-velocity', dim: VELOCITY }, [
    { name: 'reduced-planck-constant', dim: REDUCED_PLANCK },
    { name: 'mass', dim: MASS },
    { name: 'carrier-density', dim: CARRIER_DENSITY },
  ], {
    id: 'CE-fermi-velocity',
    name: 'Fermi velocity',
    domain: 'condensed-matter',
    formula_latex: 'v_F \\propto (\\hbar/m) n^{1/3}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'mesoscopic' },
    assumptions: ['degenerate free-electron gas', 'T ≈ 0'],
    references: ['Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'plasma-frequency', dim: FREQUENCY }, [
    { name: 'carrier-density', dim: CARRIER_DENSITY },
    { name: 'charge', dim: CHARGE },
    { name: 'vacuum-permittivity', dim: VACUUM_PERMITTIVITY },
    { name: 'mass', dim: MASS },
  ], {
    id: 'CE-plasma-frequency',
    name: 'Plasma frequency',
    domain: 'condensed-matter',
    formula_latex: '\\omega_p = \\sqrt{n q^2/(\\varepsilon_0 m)}',
    epistemicStatus: 'fully-quantitative',
    scalarAst: pow(
      op('/', [
        op('*', [sym('carrier-density', CARRIER_DENSITY), pow(sym('charge', CHARGE), '2')]),
        op('*', [sym('vacuum-permittivity', VACUUM_PERMITTIVITY), sym('mass', MASS)]),
      ]),
      '0.5',
    ),
    regime: { scale: 'mesoscopic', force: 'electromagnetic' },
    assumptions: ['free-electron gas', 'long-wavelength (q→0) limit'],
    references: ['Kittel, Introduction to Solid State Physics', 'Ashcroft & Mermin, Solid State Physics'],
    partnerBridges: [],
  }),
  l1({ name: 'debye-frequency', dim: FREQUENCY }, [
    { name: 'sound-speed', dim: VELOCITY },
    { name: 'number-density', dim: CARRIER_DENSITY },
  ], {
    id: 'CE-debye-frequency',
    name: 'Debye frequency',
    domain: 'condensed-matter',
    formula_latex: '\\omega_D \\propto v_s n^{1/3}',
    epistemicStatus: 'dimensional',
    regime: { scale: 'mesoscopic', force: 'emergent' },
    assumptions: ['Debye model of lattice vibrations', 'linear dispersion'],
    references: ['Debye 1912', 'Kittel, Introduction to Solid State Physics'],
    partnerBridges: [],
  }),
];
