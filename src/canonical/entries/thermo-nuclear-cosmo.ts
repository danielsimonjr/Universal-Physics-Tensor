/**
 * L1 (scalar-AST) canonical entries — thermodynamic, statistical, nuclear, and
 * cosmological monomial laws: sensible heat capacity, radioactive half-life,
 * the Hubble distance, plus the Landauer bound, the Jarzynski equality, the
 * Stefan–Boltzmann law, the ideal-gas law, and Wien's displacement (the
 * latter five folded in from the former l1-gravity-thermo / l1-quantum-em
 * batch files in the 2026-06-22 god-file split), plus a batch-4 (2026-07-03)
 * trio of thermodynamics monomials: latent heat, the Clausius entropy change,
 * and thermal diffusivity. L0 fields are engine-derived (see `_l1-build`).
 *
 * Scope: generic dimensional MONOMIAL laws (Adam+Eve adversarial audit,
 * 2026-06-20). `domain` is the nearest `CanonicalDomain` arm (the enum has no
 * `nuclear`; radioactive decay → `quantum`). Skipped as degenerate:
 * radioactive-activity `A=λN` (N dimensionless ⇒ activity ≡ decay-constant) and
 * the Chandrasekhar mass (the (ℏc/G)/m_p² group is dimensionless ⇒
 * underdetermined). See docs/research/bridges-vs-canonical-map.md.
 *
 * @module canonical/entries/thermo-nuclear-cosmo
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import { sym } from '../../bridges/equations/_be-helpers.js';
import {
  MASS,
  VELOCITY,
  ENERGY,
  LENGTH,
  TIME,
  FREQUENCY,
  TEMPERATURE,
  ENTROPY,
  DIMENSIONLESS,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

const SPECIFIC_HEAT = dim(2, 0, -2, 0, -1); // [L² T⁻² Θ⁻¹] (J·kg⁻¹·K⁻¹)
const SB_FLUX = dim(0, 1, -3); // radiative flux W/m² = [M T⁻³]
const SIGMA_SB = dim(0, 1, -3, 0, -4); // Stefan–Boltzmann σ [M T⁻³ Θ⁻⁴] (Θ is 5th arg)
const PRESSURE = dim(-1, 1, -2); // [M L⁻¹ T⁻²]
const VOLUME = dim(3); // [L³]
const WIEN_B = dim(1, 0, 0, 0, 1); // Wien constant [L Θ]
const SPECIFIC_LATENT_HEAT = dim(2, 0, -2, 0, 0); // [L² T⁻²] (J·kg⁻¹, no Θ dependence)
const THERMAL_CONDUCTIVITY = dim(1, 1, -3, 0, -1); // [L M T⁻³ Θ⁻¹] (W·m⁻¹·K⁻¹)
const DENSITY = dim(-3, 1, 0, 0, 0); // [M L⁻³] (kg/m³)
const THERMAL_DIFFUSIVITY = dim(2, 0, -1, 0, 0); // [L² T⁻¹] (m²/s)

export const THERMO_NUCLEAR_COSMO: readonly CanonicalEquation[] = [
  l1({ name: 'heat-energy', dim: ENERGY }, [
    { name: 'mass', dim: MASS },
    { name: 'specific-heat', dim: SPECIFIC_HEAT },
    { name: 'temperature-change', dim: TEMPERATURE },
  ], {
    id: 'CE-heat-capacity',
    name: 'Sensible heat (heat capacity)',
    domain: 'thermodynamics',
    formula_latex: 'Q = m c \\Delta T',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('mass', MASS),
      sym('specific-heat', SPECIFIC_HEAT),
      sym('temperature-change', TEMPERATURE),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['no phase change', 'constant specific heat'],
    references: ['Standard thermodynamics'],
    partnerBridges: [],
  }),
  l1({ name: 'half-life', dim: TIME }, [
    { name: 'decay-constant', dim: FREQUENCY },
  ], {
    id: 'CE-half-life',
    name: 'Radioactive half-life',
    domain: 'quantum',
    formula_latex: 't_{1/2} = \\ln 2 / \\lambda',
    epistemicStatus: 'scalar-up-to-constant',
    scalarAst: pow(sym('decay-constant', FREQUENCY), '-1'),
    regime: { scale: 'quantum' },
    assumptions: ['first-order (exponential) decay'],
    references: ['Rutherford–Soddy 1902'],
    partnerBridges: [],
  }),
  l1({ name: 'hubble-distance', dim: LENGTH }, [
    { name: 'c', dim: VELOCITY },
    { name: 'hubble-rate', dim: FREQUENCY },
  ], {
    id: 'CE-hubble-distance',
    name: 'Hubble distance',
    domain: 'cosmology',
    formula_latex: 'D_H = c / H_0',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('c', VELOCITY), sym('hubble-rate', FREQUENCY)]),
    regime: { scale: 'cosmological' },
    assumptions: ['present-epoch Hubble parameter'],
    references: ['Hubble 1929'],
    partnerBridges: [],
  }),
  // ── Folded in from the former l1-gravity-thermo / l1-quantum-em batch files
  // (2026-06-22 god-file split): the thermodynamic / statistical monomials. ──
  // Landauer minimum erasure energy  E = k_B T ln2  (natural log)
  l1({ name: 'erasure-energy', dim: ENERGY }, [
    { name: 'k_B', dim: ENTROPY },
    { name: 'temperature', dim: TEMPERATURE },
  ], {
    id: 'CE-landauer',
    name: 'Landauer erasure bound',
    domain: 'information',
    formula_latex: 'E = k_B T \\ln 2',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('k_B', ENTROPY),
      sym('T', TEMPERATURE),
      sym('ln2', DIMENSIONLESS),
    ]),
    forms: { logBase: 'e' },
    regime: { scale: 'mesoscopic', information: 'shannon' },
    assumptions: ['isothermal', 'quasi-static erasure'],
    references: ['Landauer 1961'],
    // 16 = "Information-Thermodynamics Bridge (Landauer's principle)" — a
    // genuine restatement (the canonical Landauer bound IS bridge 16).
    partnerBridges: ['16'],
    restatesBridge: '16',
  }),
  // Jarzynski equality  ΔF = −k_B T ln⟨exp(−W/k_B T)⟩  (dimensionless log factor)
  l1({ name: 'free-energy-difference', dim: ENERGY }, [
    { name: 'k_B', dim: ENTROPY },
    { name: 'temperature', dim: TEMPERATURE },
  ], {
    id: 'CE-jarzynski',
    name: 'Jarzynski free-energy equality',
    domain: 'statistical',
    formula_latex: '\\Delta F = -k_B T \\ln \\langle \\exp(-W/(k_B T)) \\rangle',
    // The leading dimensionless factor is the ensemble functional
    // ln⟨exp(−βW)⟩, not a universal constant, so the strongest honest claim
    // is the algebraic form up to that factor.
    epistemicStatus: 'scalar-up-to-constant',
    // Mirrors BE29_JARZYNSKI_RHS: −1 · k_B · T · ln⟨exp(−βW)⟩, the log encoded
    // as a dimensionless stub (the AST has no ln primitive). Structurally this
    // is the k_B·T·(dimensionless) thermodynamic form — the same one Landauer
    // shares, which is exactly why BE-29 "recovers" CE-landauer.
    scalarAst: op('*', [
      sym('-1', DIMENSIONLESS),
      sym('k_B', ENTROPY),
      sym('T', TEMPERATURE),
      sym('ln_avg_exp_minus_betaW', DIMENSIONLESS),
    ]),
    regime: { scale: 'mesoscopic' },
    assumptions: ['isothermal', 'arbitrary work protocol between two equilibria'],
    references: ['Jarzynski 1997 PRL 78:2690'],
    // 29 = BE-29 (Jarzynski equality) — this canonical entry IS that bridge's
    // own relation, so it is a declared restatement (NOT a discovery). Its
    // structural match to CE-landauer stays a `recovers` form-coincidence.
    partnerBridges: ['29'],
    restatesBridge: '29',
  }),
  // Stefan–Boltzmann law  j = σ T⁴  (radiative FLUX)
  l1({ name: 'radiative-flux', dim: SB_FLUX }, [
    { name: 'sigma_sb', dim: SIGMA_SB },
    { name: 'temperature', dim: TEMPERATURE },
  ], {
    id: 'CE-stefan-boltzmann',
    name: 'Stefan–Boltzmann law',
    domain: 'thermodynamics',
    formula_latex: 'j = \\sigma T^4',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [sym('sigma_sb', SIGMA_SB), pow(sym('T', TEMPERATURE), '4')]),
    forms: { quantityKind: 'flux' },
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['blackbody', 'thermal equilibrium'],
    references: ['Stefan 1879; Boltzmann 1884'],
    partnerBridges: [],
  }),
  // Ideal gas law  P = N k_B T / V  (N is a dimensionless count)
  l1({ name: 'pressure', dim: PRESSURE }, [
    { name: 'k_B', dim: ENTROPY },
    { name: 'temperature', dim: TEMPERATURE },
    { name: 'V', dim: VOLUME },
  ], {
    id: 'CE-ideal-gas',
    name: 'Ideal gas law',
    domain: 'thermodynamics',
    formula_latex: 'P = N k_B T/V',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('N', DIMENSIONLESS), sym('k_B', ENTROPY), sym('T', TEMPERATURE)]),
      sym('V', VOLUME),
    ]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['ideal gas', 'thermal equilibrium'],
    references: ['Clapeyron 1834'],
    partnerBridges: [],
  }),
  // Wien's displacement  λ_max = b / T  (blackbody peak wavelength)
  l1({ name: 'peak-wavelength', dim: LENGTH }, [
    { name: 'b', dim: WIEN_B },
    { name: 'temperature', dim: dim(0, 0, 0, 0, 1) },
  ], {
    id: 'CE-wien',
    name: "Wien's displacement law",
    domain: 'thermodynamics',
    formula_latex: '\\lambda_{max} = b/T',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('b', WIEN_B), sym('T', dim(0, 0, 0, 0, 1))]),
    regime: { scale: 'classical', force: 'electromagnetic' },
    assumptions: ['blackbody', 'thermal equilibrium'],
    references: ['Wien 1893'],
    partnerBridges: [],
  }),
  // ── Batch 4 (2026-07-03): 3 more thermodynamics monomials. ─────────────────
  // Latent heat of phase transition  Q = m L  (specific latent heat L)
  l1({ name: 'latent-heat', dim: ENERGY }, [
    { name: 'mass', dim: MASS },
    { name: 'specific-latent-heat', dim: SPECIFIC_LATENT_HEAT },
  ], {
    id: 'CE-latent-heat',
    name: 'Latent heat of phase transition',
    domain: 'thermodynamics',
    formula_latex: 'Q = m L',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('*', [
      sym('mass', MASS),
      sym('specific-latent-heat', SPECIFIC_LATENT_HEAT),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['isothermal phase transition'],
    references: ['Callen, Thermodynamics'],
    partnerBridges: [],
  }),
  // Clausius entropy change  ΔS = Q/T  (reversible, constant-temperature)
  l1({ name: 'entropy-change', dim: ENTROPY }, [
    { name: 'heat', dim: ENERGY },
    { name: 'temperature', dim: TEMPERATURE },
  ], {
    id: 'CE-clausius-entropy',
    name: 'Clausius entropy change',
    domain: 'thermodynamics',
    formula_latex: '\\Delta S = Q/T',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [sym('heat', ENERGY), sym('temperature', TEMPERATURE)]),
    regime: { scale: 'classical' },
    assumptions: ['reversible process', 'constant temperature'],
    references: ['Clausius 1865', 'Callen, Thermodynamics'],
    partnerBridges: [],
  }),
  // Thermal diffusivity  α = k/(ρ c_p)
  l1({ name: 'thermal-diffusivity', dim: THERMAL_DIFFUSIVITY }, [
    { name: 'thermal-conductivity', dim: THERMAL_CONDUCTIVITY },
    { name: 'density', dim: DENSITY },
    { name: 'specific-heat-capacity', dim: SPECIFIC_HEAT },
  ], {
    id: 'CE-thermal-diffusivity',
    name: 'Thermal diffusivity',
    domain: 'thermodynamics',
    formula_latex: '\\alpha = k/(\\rho c_p)',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      sym('thermal-conductivity', THERMAL_CONDUCTIVITY),
      op('*', [sym('density', DENSITY), sym('specific-heat-capacity', SPECIFIC_HEAT)]),
    ]),
    regime: { scale: 'classical' },
    assumptions: ['homogeneous isotropic medium'],
    references: ['Carslaw & Jaeger, Conduction of Heat in Solids'],
    partnerBridges: [],
  }),
];
