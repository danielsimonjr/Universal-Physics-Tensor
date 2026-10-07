/**
 * L1-sum tier — the FIRST canonical entries whose RHS is a genuine
 * NON-monomial: a sum (Bernoulli) and a transcendental (radioactive decay).
 * Dimensional analysis alone cannot pin either as a power-monomial (there are
 * several pressure-dimensioned terms in Bernoulli; a dimensionless factor in
 * decay), so the engine reports `monomial: null` with `freeDimensionlessGroups
 * >= 1` — the CLASSIC "dimensionally underdetermined" state that carries no
 * monomial. What makes these entries new is that the exact form IS known and is
 * carried in the `scalarAst` (so `epistemicStatus` reflects the known closed
 * form, not the dimensional under-determination). Built via `l1()` so the L0
 * fields are engine-derived and self-consistent (F1: monomial:null ⟺ freeGroups
 * >= 1) exactly like the existing underdetermined monomials (Newton F,
 * Bekenstein-Hawking).
 *
 * Value: these enrich the canonical *reference* with famous non-monomial laws
 * and are structurally scanned by `scanLinkages` / `upt recover` (normalForm is
 * sum- and transcendental-aware). A 2026-07-04 measurement found they produce
 * ZERO structural bridge matches today — the value is reference-completeness,
 * not bridge-validation (design + measurement:
 * docs/superpowers/specs/2026-07-04-l1-sum-tier-design.md).
 *
 * @module canonical/entries/nonmonomial
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../dimensional/ast-builders.js';
import { DIMENSIONLESS, TIME } from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const PRESSURE = dim(-1, 1, -2, 0, 0);
const DENSITY = dim(-3, 1, 0, 0, 0);
const VELOCITY = dim(1, 0, -1, 0, 0);
const ACCELERATION = dim(1, 0, -2, 0, 0);
const HEIGHT = dim(1, 0, 0, 0, 0);
const DECAY_CONSTANT = dim(0, 0, -1, 0, 0);
const ENERGY = dim(2, 1, -2, 0, 0);
const PLANCK = dim(2, 1, -1, 0, 0);
const FREQUENCY = dim(0, 0, -1, 0, 0);
const TEMPERATURE = dim(0, 0, 0, 0, 1);
const BOLTZMANN = dim(2, 1, -2, 0, -1);
const MASS = dim(0, 1, 0, 0, 0);
const LENGTH = dim(1, 0, 0, 0, 0);
const INVERSE_LENGTH = dim(-1, 0, 0, 0, 0);
const INTENSITY = dim(0, 1, -3, 0, 0);

export const NONMONOMIAL: readonly CanonicalEquation[] = [
  l1(
    { name: 'bernoulli-total-pressure', dim: PRESSURE },
    [
      { name: 'density', dim: DENSITY },
      { name: 'flow-velocity', dim: VELOCITY },
      { name: 'gravitational-acceleration', dim: ACCELERATION },
      { name: 'height', dim: HEIGHT },
      { name: 'static-pressure', dim: PRESSURE },
    ],
    {
      id: 'CE-bernoulli',
      name: 'Bernoulli equation',
      domain: 'mechanics',
      formula_latex: '\\tfrac12 \\rho v^2 + \\rho g h + P = \\text{const}',
      epistemicStatus: 'scalar-up-to-constant', // exact form known; the ½ on the dynamic term is dropped
      scalarAst: op('+', [
        op('*', [sym('density', DENSITY), pow(sym('flow-velocity', VELOCITY), '2')]),
        op('*', [
          sym('density', DENSITY),
          op('*', [
            sym('gravitational-acceleration', ACCELERATION),
            sym('height', HEIGHT),
          ]),
        ]),
        sym('static-pressure', PRESSURE),
      ]),
      regime: { scale: 'classical' },
      assumptions: ['incompressible', 'inviscid', 'steady flow along a streamline'],
      references: ['Bernoulli 1738 Hydrodynamica'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'remaining-nuclei', dim: DIMENSIONLESS },
    [
      { name: 'initial-nuclei', dim: DIMENSIONLESS },
      { name: 'decay-constant', dim: DECAY_CONSTANT },
      { name: 'elapsed-time', dim: TIME },
    ],
    {
      id: 'CE-radioactive-decay',
      name: 'Radioactive decay law',
      domain: 'quantum', // matches CE-half-life's domain
      formula_latex: 'N = N_0 e^{-\\lambda t}',
      epistemicStatus: 'fully-quantitative', // exact closed form (carried in scalarAst)
      // N0 · exp(−(λ·t)); the exp arg λt is dimensionless ([T⁻¹]·[T]); the unary
      // minus is the sym('-1', DIMENSIONLESS) multiplicative stub (be-34 idiom).
      scalarAst: op('*', [
        sym('initial-nuclei', DIMENSIONLESS),
        {
          kind: 'transcendental',
          fn: 'exp',
          arg: op('*', [
            sym('-1', DIMENSIONLESS),
            op('*', [sym('decay-constant', DECAY_CONSTANT), sym('elapsed-time', TIME)]),
          ]),
        },
      ]),
      regime: { scale: 'quantum' },
      assumptions: ['first-order decay', 'large-N statistical limit'],
      references: ['Rutherford & Soddy 1902'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'photoelectron-max-energy', dim: ENERGY },
    [
      { name: 'planck-constant', dim: PLANCK },
      { name: 'photon-frequency', dim: FREQUENCY },
      { name: 'work-function', dim: ENERGY },
    ],
    {
      id: 'CE-photoelectric',
      name: 'Photoelectric equation',
      domain: 'quantum',
      formula_latex: 'K_{\\max} = h f - W',
      epistemicStatus: 'fully-quantitative', // exact: hf − W (both energy)
      scalarAst: op('-', [
        op('*', [sym('planck-constant', PLANCK), sym('photon-frequency', FREQUENCY)]),
        sym('work-function', ENERGY),
      ]),
      regime: { scale: 'quantum' },
      assumptions: ['single-photon absorption', 'above threshold (hf > W)'],
      references: ['Einstein 1905 Ann. Phys. 17:132'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'carnot-efficiency', dim: DIMENSIONLESS },
    [
      { name: 'cold-reservoir-temperature', dim: TEMPERATURE },
      { name: 'hot-reservoir-temperature', dim: TEMPERATURE },
    ],
    {
      id: 'CE-carnot-efficiency',
      name: 'Carnot efficiency',
      domain: 'thermodynamics',
      formula_latex: '\\eta = 1 - \\tfrac{T_c}{T_h}',
      epistemicStatus: 'fully-quantitative', // exact: 1 − Tc/Th
      // 1 − Tc/Th; the leading 1 is a dimensionless literal stub.
      scalarAst: op('-', [
        sym('1', DIMENSIONLESS),
        op('/', [
          sym('cold-reservoir-temperature', TEMPERATURE),
          sym('hot-reservoir-temperature', TEMPERATURE),
        ]),
      ]),
      regime: { scale: 'classical' },
      assumptions: ['reversible cycle', 'two heat reservoirs'],
      references: ['Carnot 1824 Réflexions sur la puissance motrice du feu'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'boltzmann-factor', dim: DIMENSIONLESS },
    [
      { name: 'state-energy', dim: ENERGY },
      { name: 'boltzmann-constant', dim: BOLTZMANN },
      { name: 'temperature', dim: TEMPERATURE },
    ],
    {
      id: 'CE-boltzmann-factor',
      name: 'Boltzmann factor',
      domain: 'statistical',
      formula_latex: 'e^{-E/k_B T}',
      epistemicStatus: 'fully-quantitative', // exact closed form
      // exp(−E/(kB·T)); the arg −E/(kB T) is dimensionless (energy/energy).
      scalarAst: {
        kind: 'transcendental',
        fn: 'exp',
        arg: op('*', [
          sym('-1', DIMENSIONLESS),
          op('/', [
            sym('state-energy', ENERGY),
            op('*', [sym('boltzmann-constant', BOLTZMANN), sym('temperature', TEMPERATURE)]),
          ]),
        ]),
      },
      regime: { scale: 'classical' },
      assumptions: ['canonical ensemble', 'thermal equilibrium'],
      references: ['Boltzmann 1868 Wien. Ber. 58:517'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'lorentz-factor', dim: DIMENSIONLESS },
    [
      { name: 'velocity', dim: VELOCITY },
      { name: 'speed-of-light', dim: VELOCITY },
    ],
    {
      id: 'CE-lorentz-factor',
      name: 'Lorentz factor',
      domain: 'mechanics', // SR precedent — matches CE-mass-energy's domain
      formula_latex: '\\gamma = \\left(1 - \\tfrac{v^2}{c^2}\\right)^{-1/2}',
      epistemicStatus: 'fully-quantitative', // exact closed form
      // (1 − v²/c²)^(−1/2); the base is dimensionless (velocity²/velocity²), so
      // the fractional literal exponent '-0.5' validates on it directly.
      scalarAst: pow(
        op('-', [
          sym('1', DIMENSIONLESS),
          op('/', [
            pow(sym('velocity', VELOCITY), '2'),
            pow(sym('speed-of-light', VELOCITY), '2'),
          ]),
        ]),
        '-0.5',
      ),
      regime: { scale: 'classical' },
      assumptions: ['special relativity', 'inertial frames'],
      references: ['Einstein 1905 Ann. Phys. 17:891'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'compton-wavelength-shift', dim: LENGTH },
    [
      { name: 'planck-constant', dim: PLANCK },
      { name: 'electron-mass', dim: MASS },
      { name: 'speed-of-light', dim: VELOCITY },
      { name: 'scattering-angle', dim: DIMENSIONLESS },
    ],
    {
      id: 'CE-compton-shift',
      name: 'Compton shift',
      domain: 'quantum',
      formula_latex: '\\Delta\\lambda = \\tfrac{h}{m_e c}(1 - \\cos\\theta)',
      epistemicStatus: 'fully-quantitative', // exact closed form
      // (h/(m·c))·(1 − cos θ); the cos arg (scattering angle) is dimensionless.
      scalarAst: op('*', [
        op('/', [
          sym('planck-constant', PLANCK),
          op('*', [sym('electron-mass', MASS), sym('speed-of-light', VELOCITY)]),
        ]),
        op('-', [
          sym('1', DIMENSIONLESS),
          { kind: 'transcendental', fn: 'cos', arg: sym('scattering-angle', DIMENSIONLESS) },
        ]),
      ]),
      regime: { scale: 'quantum' },
      assumptions: ['elastic photon-electron scattering', 'free electron at rest'],
      references: ['Compton 1923 Phys. Rev. 21:483'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'inverse-transition-wavelength', dim: INVERSE_LENGTH },
    [
      { name: 'rydberg-constant', dim: INVERSE_LENGTH },
      { name: 'lower-level-n', dim: DIMENSIONLESS },
      { name: 'upper-level-n', dim: DIMENSIONLESS },
    ],
    {
      id: 'CE-rydberg-formula',
      name: 'Rydberg formula',
      domain: 'quantum',
      formula_latex: '\\tfrac{1}{\\lambda} = R\\left(\\tfrac{1}{n_1^2} - \\tfrac{1}{n_2^2}\\right)',
      epistemicStatus: 'fully-quantitative', // exact closed form
      // R·(1/n1² − 1/n2²); both level numbers are dimensionless integer counts.
      scalarAst: op('*', [
        sym('rydberg-constant', INVERSE_LENGTH),
        op('-', [
          pow(sym('lower-level-n', DIMENSIONLESS), '-2'),
          pow(sym('upper-level-n', DIMENSIONLESS), '-2'),
        ]),
      ]),
      regime: { scale: 'quantum' },
      assumptions: ['hydrogen-like atom', 'bound-state transition'],
      references: ['Rydberg 1890 / Balmer 1885'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'refracted-index', dim: DIMENSIONLESS },
    [
      { name: 'incident-index', dim: DIMENSIONLESS },
      { name: 'angle-of-incidence', dim: DIMENSIONLESS },
      { name: 'angle-of-refraction', dim: DIMENSIONLESS },
    ],
    {
      id: 'CE-snell-law',
      name: "Snell's law",
      domain: 'electromagnetism', // optics
      formula_latex: 'n_2 = n_1 \\sin\\theta_1 / \\sin\\theta_2', // solved for n2
      epistemicStatus: 'fully-quantitative', // exact closed form
      // n1·sin θ1 / sin θ2; both angles are dimensionless.
      scalarAst: op('/', [
        op('*', [
          sym('incident-index', DIMENSIONLESS),
          { kind: 'transcendental', fn: 'sin', arg: sym('angle-of-incidence', DIMENSIONLESS) },
        ]),
        { kind: 'transcendental', fn: 'sin', arg: sym('angle-of-refraction', DIMENSIONLESS) },
      ]),
      regime: { scale: 'classical' },
      assumptions: ['geometric optics', 'planar interface between isotropic media'],
      references: ['Snell 1621 / Descartes 1637'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'transmitted-intensity', dim: INTENSITY },
    [
      { name: 'incident-intensity', dim: INTENSITY },
      { name: 'polarization-angle', dim: DIMENSIONLESS },
    ],
    {
      id: 'CE-malus-law',
      name: "Malus's law",
      domain: 'electromagnetism',
      formula_latex: 'I = I_0 \\cos^2\\theta',
      epistemicStatus: 'fully-quantitative', // exact closed form
      // I0·cos²θ; the polarization angle is dimensionless.
      scalarAst: op('*', [
        sym('incident-intensity', INTENSITY),
        pow(
          { kind: 'transcendental', fn: 'cos', arg: sym('polarization-angle', DIMENSIONLESS) },
          '2',
        ),
      ]),
      regime: { scale: 'classical' },
      assumptions: ['ideal linear polarizer', 'coherent linearly-polarized incident light'],
      references: ['Malus 1809'],
      partnerBridges: [],
    },
  ),
  // ── poster entries 1, 2, 13 (Sprint 3 / ROADMAP Phase 3) ──────────────────
  // Three of the sixteen poster equations that the registry did not yet carry.
  // Entry numbers are the ROADMAP Phase 3 bridge-line numbering; the entries
  // themselves are DERIVED from the identifying context of those lines
  // (`2 → 13`, `2 → 1`, `13 ↔ 4`, `6 ↔ 13`), not from Appendix A, which is not
  // vendored here.
  l1(
    { name: 'internal-energy-change', dim: ENERGY },
    [
      { name: 'heat-added', dim: ENERGY },
      { name: 'work-done-by-system', dim: ENERGY },
    ],
    {
      id: 'CE-first-law-thermodynamics',
      name: 'First law of thermodynamics',
      domain: 'thermodynamics',
      formula_latex: '\\Delta U = Q - W',
      epistemicStatus: 'fully-quantitative',
      // A genuine DIFFERENCE of two same-dimensioned terms: dimensional
      // analysis alone cannot pin it (three energies), so the engine reports
      // monomial: null with freeGroups >= 1, like Bernoulli above.
      scalarAst: op('-', [
        sym('heat-added', ENERGY),
        sym('work-done-by-system', ENERGY),
      ]),
      regime: { scale: 'classical' },
      assumptions: [
        'closed system',
        'sign convention: Q into the system, W done by the system',
      ],
      references: ['Clausius 1850', 'Callen, Thermodynamics'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'boltzmann-entropy', dim: BOLTZMANN },
    [
      { name: 'boltzmann-constant', dim: BOLTZMANN },
      { name: 'microstate-count', dim: DIMENSIONLESS },
    ],
    {
      id: 'CE-boltzmann-entropy',
      name: 'Boltzmann entropy',
      domain: 'statistical',
      formula_latex: 'S = k_B \ln W',
      epistemicStatus: 'fully-quantitative', // exact closed form
      scalarAst: op('*', [
        sym('boltzmann-constant', BOLTZMANN),
        {
          kind: 'transcendental',
          fn: 'ln',
          arg: sym('microstate-count', DIMENSIONLESS),
        },
      ]),
      forms: { logBase: 'e' },
      regime: { scale: 'mesoscopic' },
      assumptions: ['microcanonical ensemble', 'equiprobable microstates'],
      references: ['Boltzmann 1877 Wien. Ber. 76:373', 'Planck 1901'],
      partnerBridges: [],
    },
  ),
  l1(
    { name: 'normal-probability-density', dim: INVERSE_LENGTH },
    [
      { name: 'standard-deviation', dim: LENGTH },
      { name: 'deviation-from-mean', dim: LENGTH },
    ],
    {
      id: 'CE-normal-distribution',
      name: 'Normal (Gaussian) distribution',
      domain: 'statistical',
      formula_latex:
        'p(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-(x-\\mu)^2 / 2\\sigma^2}',
      // The 1/√(2π) normalisation is a pure numeric prefactor, recorded the way
      // the other prefactors in this registry are.
      epistemicStatus: 'scalar-up-to-constant',
      scalarAst: op('/', [
        {
          kind: 'transcendental',
          fn: 'exp',
          arg: op('*', [
            sym('-1', DIMENSIONLESS),
            op('/', [
              pow(sym('deviation-from-mean', LENGTH), '2'),
              pow(sym('standard-deviation', LENGTH), '2'),
            ]),
          ]),
        },
        sym('standard-deviation', LENGTH),
      ]),
      regime: { scale: 'classical' },
      assumptions: [
        'sigma > 0',
        // The variate carries whatever dimension the modelled quantity has; it
        // is taken length-dimensioned here as the representative case, so that
        // the density is inverse-length. Nothing in the law depends on that
        // choice — only the two dimensions cancelling inside the exponent does.
        'variate taken length-dimensioned as the representative case',
      ],
      references: [
        'Gauss 1809 Theoria Motus',
        'Laplace 1812 Théorie analytique des probabilités',
      ],
      partnerBridges: [],
    },
  ),
];
