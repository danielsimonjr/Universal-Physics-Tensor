/**
 * L1 (scalar-AST) canonical entries — atomic-scale derived constants and
 * quantum monomials. The Rydberg energy, the classical electron radius, and the
 * Bohr magneton: monomial combinations of fundamental constants (e, ℏ, ε₀, m_e,
 * c); plus the Planck–Einstein relation, the de Broglie wavelength, and the Bohr
 * radius (folded in from the former l1-quantum-em batch file in the 2026-06-22
 * god-file split); plus (batch 6) the Thomson scattering cross-section. L0
 * fields are engine-derived (see `_l1-build`).
 *
 * Scope: generic dimensional MONOMIAL laws (Adam+Eve adversarial audit,
 * 2026-06-20). Leading numeric/geometric prefactors (½, 4π, 8) are recorded via
 * `scalar-up-to-constant`. The fine-structure constant α (dimensionless-only) is
 * out of scope. See docs/research/bridges-vs-canonical-map.md.
 *
 * @module canonical/entries/atomic
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../bridges/equations/_be-helpers.js';
import {
  MASS,
  VELOCITY,
  ENERGY,
  LENGTH,
  AREA,
  ACTION,
  CHARGE,
  FREQUENCY,
  DIMENSIONLESS,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const PERMITTIVITY = dim(-3, -1, 4, 2); // ε₀ [L⁻³ M⁻¹ T⁴ I²]
const MAGNETIC_MOMENT = dim(2, 0, 0, 1); // [L² I] (A·m²)
const MOMENTUM = dim(1, 1, -1); // [L M T⁻¹]

export const ATOMIC: readonly CanonicalEquation[] = [
  l1({ name: 'rydberg-energy', dim: ENERGY }, [
    { name: 'm_e', dim: MASS },
    { name: 'e', dim: CHARGE },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'hbar', dim: ACTION },
  ], {
    id: 'CE-rydberg-energy',
    name: 'Rydberg energy',
    domain: 'quantum',
    formula_latex: 'E_R = m_e e^4 / (32 \\pi^2 \\varepsilon_0^2 \\hbar^2)',
    epistemicStatus: 'fully-quantitative',
    // The ħ form equals m e^4 / (8 ε₀² h²). The old latex omitted 4π².
    scalarAst: op('/', [
      op('*', [sym('m_e', MASS), pow(sym('e', CHARGE), '4')]),
      op('*', [
        sym('32', DIMENSIONLESS),
        pow(sym('pi', DIMENSIONLESS), '2'),
        pow(sym('epsilon_0', PERMITTIVITY), '2'),
        pow(sym('hbar', ACTION), '2'),
      ]),
    ]),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['hydrogen-like', 'non-relativistic'],
    references: ['Rydberg 1888; Bohr 1913'],
    partnerBridges: [],
  }),
  l1({ name: 'classical-electron-radius', dim: LENGTH }, [
    { name: 'e', dim: CHARGE },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'm_e', dim: MASS },
    { name: 'c', dim: VELOCITY },
  ], {
    id: 'CE-classical-electron-radius',
    name: 'Classical electron radius',
    domain: 'quantum',
    formula_latex: 'r_e = e^2 / (4\\pi \\varepsilon_0 m_e c^2)',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      pow(sym('e', CHARGE), '2'),
      op('*', [
        sym('epsilon_0', PERMITTIVITY),
        sym('m_e', MASS),
        pow(sym('c', VELOCITY), '2'),
      ]),
    ]),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['classical point-charge self-energy scale'],
    references: ['Lorentz; Thomson scattering'],
    partnerBridges: [],
  }),
  l1({ name: 'bohr-magneton', dim: MAGNETIC_MOMENT }, [
    { name: 'e', dim: CHARGE },
    { name: 'hbar', dim: ACTION },
    { name: 'm_e', dim: MASS },
  ], {
    id: 'CE-bohr-magneton',
    name: 'Bohr magneton',
    domain: 'quantum',
    formula_latex: '\\mu_B = e \\hbar / (2 m_e)',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: op('/', [
      op('*', [sym('e', CHARGE), sym('hbar', ACTION)]),
      sym('m_e', MASS),
    ]),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['electron magnetic-moment scale'],
    references: ['Bohr 1913; Pauli 1920'],
    partnerBridges: [],
  }),
  // ── Folded in from the former l1-quantum-em batch file (2026-06-22 god-file
  // split): the quantum-domain monomials. ───────────────────────────────────
  // Planck–Einstein  E = h ν
  l1({ name: 'photon-energy', dim: ENERGY }, [
    { name: 'h', dim: ACTION },
    { name: 'nu', dim: FREQUENCY },
  ], {
    id: 'CE-planck-einstein',
    name: 'Planck–Einstein relation',
    domain: 'quantum',
    formula_latex: 'E = h\\nu',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('h', ACTION), sym('nu', FREQUENCY)]),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: [],
    references: ['Planck 1900; Einstein 1905'],
    partnerBridges: [],
  }),
  // de Broglie  λ = h / p
  l1({ name: 'de-broglie-wavelength', dim: LENGTH }, [
    { name: 'h', dim: ACTION },
    { name: 'p', dim: MOMENTUM },
  ], {
    id: 'CE-de-broglie',
    name: 'de Broglie wavelength',
    domain: 'quantum',
    formula_latex: '\\lambda = h/p',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('h', ACTION), sym('p', MOMENTUM)]),
    regime: { scale: 'quantum' },
    assumptions: [],
    references: ['de Broglie 1924'],
    partnerBridges: [],
  }),
  // Bohr radius  a₀ = 4π ε₀ ℏ² / (m_e e²)
  l1({ name: 'bohr-radius', dim: LENGTH }, [
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'hbar', dim: ACTION },
    { name: 'm_e', dim: MASS },
    { name: 'e', dim: CHARGE },
  ], {
    id: 'CE-bohr-radius',
    name: 'Bohr radius',
    domain: 'quantum',
    formula_latex: 'a_0 = 4\\pi\\varepsilon_0\\hbar^2/(m_e e^2)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [
        sym('4pi', DIMENSIONLESS),
        sym('epsilon_0', PERMITTIVITY),
        pow(sym('hbar', ACTION), '2'),
      ]),
      op('*', [sym('m_e', MASS), pow(sym('e', CHARGE), '2')]),
    ]),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['hydrogen-like', 'non-relativistic'],
    references: ['Bohr 1913'],
    partnerBridges: [],
  }),
  // λ = h/(m c). The L0 id CE-compton-wavelength stays the reduced wavelength
  // λ̄ = ħ/(m c); this id is the non-reduced one. Both answer to the catalog
  // name compton-wavelength, and h does not alias ħ.
  l1({ name: 'compton-wavelength-full', dim: LENGTH }, [
    { name: 'h', dim: ACTION },
    { name: 'mass', dim: MASS },
    { name: 'c', dim: VELOCITY },
  ], {
    id: 'CE-compton-wavelength-full',
    name: 'Compton wavelength',
    domain: 'quantum',
    formula_latex: '\\lambda_C = h/(mc)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      sym('h', ACTION),
      op('*', [sym('mass', MASS), sym('c', VELOCITY)]),
    ]),
    regime: { scale: 'quantum' },
    assumptions: [],
    references: ['Compton 1923'],
    partnerBridges: [],
  }),
  // ── batch 6 (final): Thomson cross-section (scalar-up-to-constant, the 8π/3).
  l1({ name: 'thomson-cross-section', dim: AREA }, [
    { name: 'classical-electron-radius', dim: LENGTH },
  ], {
    id: 'CE-thomson-cross-section',
    name: 'Thomson scattering cross-section',
    domain: 'quantum',
    formula_latex: '\\sigma_T = (8\\pi/3) r_e^2',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: pow(sym('classical-electron-radius', LENGTH), '2'),
    regime: { scale: 'quantum', force: 'electromagnetic' },
    assumptions: ['non-relativistic Thomson limit', 'free electron'],
    references: ['J.J. Thomson; Jackson, Classical Electrodynamics'],
    partnerBridges: [],
  }),
  // ── poster entry 4 (Sprint 3 / ROADMAP Phase 3) ───────────────────────────
  // Heisenberg uncertainty, at its SATURATING equality: Δx Δp = ℏ/2. Derived
  // as poster entry 4 from the ROADMAP Phase 3 lines `4` (commutator plus
  // Cauchy–Schwarz) and `13 ↔ 4` (a Gaussian family saturates the bound).
  // Recorded as the bound's equality case, the way CE-landauer records the
  // Landauer bound.
  l1({ name: 'position-momentum-uncertainty-product', dim: ACTION }, [
    { name: 'hbar', dim: ACTION },
  ], {
    id: 'CE-uncertainty-principle',
    name: 'Heisenberg uncertainty principle',
    domain: 'quantum',
    formula_latex: '\Delta x \, \Delta p \geq \hbar/2',
    epistemicStatus: 'scalar-up-to-constant', // the ½ is the dropped prefactor
    scalarAst: sym('hbar', ACTION),
    regime: { scale: 'quantum' },
    assumptions: [
      'a LOWER BOUND, not an equality; the scalarAst is its saturating case',
      'saturated only by minimum-uncertainty (Gaussian) states',
    ],
    references: ['Heisenberg 1927', 'Kennard 1927', 'Robertson 1929 Phys. Rev. 34:163'],
    partnerBridges: [],
  }),
];
