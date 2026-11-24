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
 * `scalar-up-to-constant` or included in fully quantitative records. See docs/research/bridges-vs-canonical-map.md.
 *
 * @module canonical/entries/atomic
 */
import { C_SI, M_E_SI } from '../../core/constants.js';
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../dimensional/ast-builders.js';
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
  PERMITTIVITY,
  MOMENTUM,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const MAGNETIC_MOMENT = dim(2, 0, 0, 1); // [L² I] (A·m²)

export const ATOMIC: readonly CanonicalEquation[] = [
  l1({ name: 'rydberg-energy', dim: ENERGY }, [
    { name: 'm_e', dim: MASS },
    { name: 'e', dim: CHARGE },
    { name: 'epsilon_0', dim: PERMITTIVITY },
    { name: 'hbar', dim: ACTION },
  ], {
    id: 'CE-rydberg-energy',
    conventionNote: 'the Rydberg latex is E_R = m_e e^4 / (32 π² ε0² ħ²), which is m e^4 / (8 ε0² h²). The prefactor is in the scalar AST.',
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
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      pow(sym('e', CHARGE), '2'),
      op('*', [
        sym('4pi', DIMENSIONLESS),
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
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('e', CHARGE), sym('hbar', ACTION)]),
      op('*', [sym('2', DIMENSIONLESS), sym('m_e', MASS)]),
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
    holds: 'p > 0',
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
    targetAliases: ['compton-wavelength'],
    conventionGroup: 'compton-wavelength',
    conventionNote: 'CE-compton-wavelength is the reduced wavelength λ̄ = ħ/(m c), prefactor checked. CE-compton-wavelength-full is λ = h/(m c). The Compton-shift entry uses h/(m c) (1−cos θ). h does not alias ħ.',
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
    prefactor: {
      value: (8 * Math.PI) / 3,
      quote: String.raw`\sigma_\text{t} = \frac{8\pi} 3 \left(\frac{q^2}{4\pi\varepsilon_0 mc^2}\right)^2 = \frac{8\pi} 3 {r}^2 = \frac{8 \pi}{3} \left(\alpha \lambda\!\!\!\bar{}_\text{c}\right)^2 ,`,
      locator: "Wikipedia, 'Thomson scattering', revision 1348001870, wikitext line 31",
    },
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
    bound: 'lower',
    name: 'Heisenberg uncertainty principle',
    domain: 'quantum',
    formula_latex: '\\Delta x \\, \\Delta p \\geq \\hbar/2',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('hbar', ACTION), sym('2', DIMENSIONLESS)]),
    conventionNote: 'The recovered value is the lower bound on ΔxΔp. A physical state can have a larger product.',
    regime: { scale: 'quantum' },
    assumptions: [
      'the scalar expression gives the lower bound on the uncertainty product',
      'saturated only by minimum-uncertainty (Gaussian) states',
    ],
    references: ['Heisenberg 1927', 'Kennard 1927', 'Robertson 1929 Phys. Rev. 34:163'],
    partnerBridges: [],
  }),
];

/** A comparison between equations with explicit assumptions and check inputs. */
interface Scope {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  readonly ratio: string;
  readonly equalityWhen: string;
  readonly assumptions: readonly string[];
  readonly sourceEquations: readonly [string, string];
  readonly samples: readonly Readonly<Record<string, number>>[];
}

const electronMomentum = M_E_SI * C_SI;

/** Scoped comparisons between atomic equations, with declared SI controls. @internal */
export const ATOMIC_SCOPED_RELATIONS: readonly Scope[] = [
  {
    id: 'compton-scattering-shift',
    a: 'compton-wavelength-shift',
    b: 'compton-wavelength-full',
    ratio: '1 - cos(scattering-angle)',
    equalityWhen: 'scattering-angle == pi/2',
    assumptions: [
      'Compton scattering from a free electron initially at rest',
      'Use the full Compton wavelength of that electron, with mass = m_e',
      'Scattering angle is in radians in [0, pi]',
    ],
    sourceEquations: ['CE-compton-shift', 'CE-compton-wavelength-full'],
    samples: [0, Math.PI / 2, Math.PI].map((angle) => ({ mass: M_E_SI, 'scattering-angle': angle })),
  },
  {
    id: 'de-broglie-full-compton',
    a: 'de-broglie-wavelength',
    b: 'compton-wavelength-full',
    ratio: 'mass * c / p',
    equalityWhen: 'p == mass * c',
    assumptions: ['Positive momentum magnitude and rest mass of the same particle', 'Both wavelengths use h'],
    sourceEquations: ['CE-de-broglie', 'CE-compton-wavelength-full'],
    samples: [0.5, 1, 2].map((factor) => ({ mass: M_E_SI, p: factor * electronMomentum })),
  },
  {
    id: 'de-broglie-reduced-compton',
    a: 'de-broglie-wavelength',
    b: 'compton-wavelength',
    ratio: '2 * pi * mass * c / p',
    equalityWhen: 'p == (2 * pi) * (mass * c)',
    assumptions: ['Positive momentum magnitude and rest mass of the same particle', 'The numerator uses h and the denominator uses ℏ'],
    sourceEquations: ['CE-de-broglie', 'CE-compton-wavelength'],
    samples: [0.5, 1, Math.PI * 2].map((factor) => ({ mass: M_E_SI, p: factor * electronMomentum })),
  },
];
