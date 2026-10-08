/**
 * Relativity canonical entries: the Einstein field equation (L2 — a structural
 * `EinsteinFieldEquationNode` validated by the existing field-equation
 * predicate) and the Friedmann equation (L1 — the flat, matter-dominated scalar
 * form H² = 8πG ρ / 3).
 *
 * @module canonical/entries/relativity
 */
import type { CanonicalEquation } from '../canonical-equation.js';
import type { EinsteinFieldEquationNode } from '../../dimensional/einstein-equation.js';
import type { EinsteinTensorNode } from '../../dimensional/curvature.js';
import type {
  StressEnergyTensorNode,
  CosmologicalConstantNode,
} from '../../dimensional/stress-energy-validators.js';
import type { MetricTensorNode } from '../../dimensional/metric-validators.js';
import type { RiemannTensorNode } from '../../dimensional/connection-validators.js';
import { metric } from '../../dimensional/metric.js';
import { tsym } from '../../dimensional/tensor.js';
import { sym } from '../../dimensional/ast-builders.js';
import {
  LENGTH,
  DIMENSIONLESS,
  MASS,
  VELOCITY,
  ACTION,
  ENTROPY,
  TEMPERATURE,
  AREA,
  FORCE,
} from '../../dimensional/types.js';
import { dim, op, pow, l1 } from './_l1-build.js';

// ── EFE node builders (the canonical G_μν + Λg_μν = (8πG/c⁴)T_μν structure) ──
const L_INV2 = dim(-2); // [L⁻²] — per-component dim of every EFE term
const ENERGY_DENSITY = dim(-1, 1, -2); // T_μν componentDim [M L⁻¹ T⁻²]

function buildRiemann(mu = 'mu', nu = 'nu'): RiemannTensorNode {
  const gLower = metric(
    'g',
    [
      { label: 'a', variance: 'lower' },
      { label: 'b', variance: 'lower' },
    ],
    DIMENSIONLESS,
    '-,+,+,+',
  );
  const gInverse = metric(
    'g_inv',
    [
      { label: 'a', variance: 'upper' },
      { label: 'b', variance: 'upper' },
    ],
    DIMENSIONLESS,
    '-,+,+,+',
  );
  const xCoord = tsym(
    'x',
    [{ label: 'c', variance: 'upper' }],
    LENGTH,
    'coordinate',
  );
  return {
    kind: 'riemann-tensor',
    upperIndex: { label: 'rho', variance: 'upper' },
    lowerIndices: [
      { label: mu, variance: 'lower' },
      { label: 'lambda', variance: 'lower' },
      { label: nu, variance: 'lower' },
    ],
    gLower,
    gInverse,
    xCoord,
  };
}

function buildEinstein(mu = 'mu', nu = 'nu'): EinsteinTensorNode {
  const riemann = buildRiemann(mu, nu);
  return {
    kind: 'einstein-tensor',
    riemann,
    gLower: riemann.gLower,
    gInverse: riemann.gInverse,
  };
}

const buildT = (mu = 'mu', nu = 'nu'): StressEnergyTensorNode => ({
  kind: 'stress-energy',
  symbol: 'T',
  indices: [
    { label: mu, variance: 'lower' },
    { label: nu, variance: 'lower' },
  ],
  symmetry: 'symmetric',
  componentDim: ENERGY_DENSITY,
});

const buildLambda = (): CosmologicalConstantNode => ({
  kind: 'cosmological-constant',
  symbol: 'Λ',
  dim: L_INV2,
});

const buildMetric = (): MetricTensorNode =>
  metric(
    'g_metric',
    [
      { label: 'mu', variance: 'lower' },
      { label: 'nu', variance: 'lower' },
    ],
    DIMENSIONLESS,
    '-,+,+,+',
  );

/** The canonical Einstein field equation node, G_μν + Λg_μν = (8πG/c⁴)T_μν. @internal */
const EFE_NODE: EinsteinFieldEquationNode = {
  kind: 'einstein-equation',
  lhs: buildEinstein('mu', 'nu'),
  cosmological: buildLambda(),
  metric: buildMetric(),
  rhs: buildT('mu', 'nu'),
  coupling: 'einstein',
};

// ── dimensional layer for the EFE (per-component [L⁻²] from 8πG·T/c⁴) ────────
const GRAV = dim(3, -1, -2);
const EFE_TARGET = { name: 'efe-curvature', dim: L_INV2 };
const EFE_GOV = [
  { name: 'G', dim: GRAV },
  { name: 'c', dim: dim(1, 0, -1) },
  { name: 'stress-energy-density', dim: ENERGY_DENSITY },
];

// ── Friedmann (flat, matter-dominated): H² = 8πG ρ / 3 ───────────────────────
const HSQUARED = dim(0, 0, -2); // [T⁻²]
const DENSITY = dim(-3, 1); // [M L⁻³]
const FRIEDMANN_TARGET = { name: 'hubble-rate-squared', dim: HSQUARED };
const FRIEDMANN_GOV = [
  { name: 'G', dim: GRAV },
  { name: 'rho', dim: DENSITY },
];

export const RELATIVITY: readonly CanonicalEquation[] = [
  l1(EFE_TARGET, EFE_GOV, {
    id: 'CE-einstein-field-eq',
    conventionNote: 'the Einstein-equation metric node is mostly-plus (−,+,+,+), the same signature as upt metric. The 8π is in the scalar AST, so a comparison checks it.',
    name: 'Einstein field equation',
    domain: 'general-relativity',
    formula_latex: 'G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = (8\\pi G/c^4) T_{\\mu\\nu}',
    epistemicStatus: 'fully-quantitative',
    // The 8π is in this scalar record as well as in the field equation, so a
    // comparison checks it. The metric node is mostly-plus, the signature
    // `upt metric` differentiates.
    scalarAst: op('/', [
      op('*', [sym('8pi', DIMENSIONLESS), sym('G', GRAV), sym('stress-energy-density', ENERGY_DENSITY)]),
      pow(sym('c', VELOCITY), '4'),
    ]),
    fieldEquation: EFE_NODE,
    regime: { force: 'gravitational', symmetry: 'poincare' },
    assumptions: ['classical GR', 'pseudo-Riemannian spacetime'],
    references: ['Einstein 1915'],
    partnerBridges: ['13'], // 13 = Einstein trace reduction (Jacobson stays framing)
  }),
  l1(
    FRIEDMANN_TARGET,
    [
      ...FRIEDMANN_GOV,
      { name: 'c', dim: dim(1, 0, -1) },
      { name: 'curvature-k', dim: DIMENSIONLESS },
      { name: 'scale-factor', dim: LENGTH },
    ],
    {
      id: 'CE-friedmann-curvature',
      holds: 'rho >= 0 and scale-factor > 0 and 8 * pi * G * rho / 3 - curvature-k * c ^ 2 / scale-factor ^ 2 >= 0',
      name: 'Friedmann equation (with curvature)',
      domain: 'cosmology',
      formula_latex: 'H^2 = 8\\pi G \\rho/3 - k c^2/a^2',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('-', [
        op('/', [
          op('*', [sym('8pi', DIMENSIONLESS), sym('G', GRAV), sym('rho', DENSITY)]),
          sym('3', DIMENSIONLESS),
        ]),
        op('/', [
          op('*', [sym('curvature-k', DIMENSIONLESS), pow(sym('c', VELOCITY), '2')]),
          pow(sym('scale-factor', LENGTH), '2'),
        ]),
      ]),
      regime: { scale: 'cosmological', force: 'gravitational' },
      assumptions: ['matter-dominated', 'Λ=0', 'FLRW', 'k the normalized curvature'],
      references: ['Friedmann 1922'],
      partnerBridges: [],
    },
  ),
  l1(FRIEDMANN_TARGET, FRIEDMANN_GOV, {
    id: 'CE-friedmann',
    holds: 'rho >= 0',
    name: 'Friedmann equation (flat, matter-dominated)',
    domain: 'cosmology',
    formula_latex: 'H^2 = 8\\pi G \\rho/3',
    epistemicStatus: 'fully-quantitative',
    scalarAst: op('/', [
      op('*', [sym('8pi', DIMENSIONLESS), sym('G', GRAV), sym('rho', DENSITY)]),
      sym('3', DIMENSIONLESS),
    ]),
    regime: { scale: 'cosmological', force: 'gravitational' },
    assumptions: ['flat (k=0)', 'matter-dominated', 'Λ=0', 'FLRW'],
    references: ['Friedmann 1922'],
    partnerBridges: [],
  }),
  l1(
    { name: 'hawking-temperature', dim: TEMPERATURE },
    [
      { name: 'hbar', dim: ACTION },
      { name: 'c', dim: VELOCITY },
      { name: 'G', dim: GRAV },
      { name: 'mass', dim: MASS },
      { name: 'k_B', dim: ENTROPY },
    ],
    {
      id: 'CE-hawking-temperature',
      holds: 'mass > 0',
      name: 'Hawking temperature',
      domain: 'general-relativity',
      formula_latex: 'T_H = \\hbar c^3/(8\\pi G M k_B)',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('/', [
        op('*', [sym('hbar', ACTION), pow(sym('c', VELOCITY), '3')]),
        op('*', [
          sym('8pi', DIMENSIONLESS),
          sym('G', GRAV),
          sym('mass', MASS),
          sym('k_B', ENTROPY),
        ]),
      ]),
      regime: { force: 'gravitational' },
      assumptions: ['Schwarzschild', 'semiclassical'],
      references: ['Hawking 1975'],
      // 42 = "Hawking temperature (canonical 1975)" — a genuine restatement.
      partnerBridges: ['42'],
      restatesBridge: '42',
    },
  ),
  l1(
    { name: 'light-deflection', dim: DIMENSIONLESS },
    [
      { name: 'G', dim: GRAV },
      { name: 'mass', dim: MASS },
      { name: 'c', dim: VELOCITY },
      { name: 'impact_parameter', dim: LENGTH },
    ],
    {
      id: 'CE-light-deflection',
      name: 'Light deflection (Eddington weak-field)',
      domain: 'general-relativity',
      formula_latex: '\\alpha = 4 G M/(c^2 b)',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('/', [
        op('*', [sym('4', DIMENSIONLESS), sym('G', GRAV), sym('mass', MASS)]),
        op('*', [pow(sym('c', VELOCITY), '2'), sym('impact_parameter', LENGTH)]),
      ]),
      regime: { force: 'gravitational' },
      assumptions: ['weak field', 'grazing ray'],
      references: ['Einstein 1915; Eddington 1919'],
      partnerBridges: ['51'],
      restatesBridge: '51',
    },
  ),
  l1(
    { name: 'perihelion-precession', dim: DIMENSIONLESS },
    [
      { name: 'G', dim: GRAV },
      { name: 'mass', dim: MASS },
      { name: 'c', dim: VELOCITY },
      { name: 'a', dim: LENGTH },
    ],
    {
      id: 'CE-perihelion-precession',
      name: 'Perihelion precession (Einstein)',
      domain: 'general-relativity',
      formula_latex: '\\Delta\\phi = 6\\pi G M/(c^2 a (1-e^2))',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('/', [
        op('*', [sym('6pi', DIMENSIONLESS), sym('G', GRAV), sym('mass', MASS)]),
        op('*', [
          pow(sym('c', VELOCITY), '2'),
          sym('a', LENGTH),
          sym('one_minus_e_sq', DIMENSIONLESS),
        ]),
      ]),
      regime: { force: 'gravitational' },
      assumptions: ['weak field', 'nearly-circular orbit'],
      references: ['Einstein 1915'],
      partnerBridges: ['52'],
      restatesBridge: '52',
    },
  ),
  // ── Folded in from the former l1-gravity-thermo batch file (2026-06-22
  // god-file split): the gravitation-domain monomials. ──────────────────────
  // Bekenstein–Hawking entropy  S = k_B c³ A / (4 G ℏ)  (AREA form; free group)
  l1(
    { name: 'bh-entropy', dim: ENTROPY },
    [
      { name: 'k_B', dim: ENTROPY },
      { name: 'c', dim: VELOCITY },
      { name: 'A', dim: AREA },
      { name: 'G', dim: GRAV },
      { name: 'hbar', dim: ACTION },
    ],
    {
      id: 'CE-bekenstein-hawking',
      holds: 'A >= 0',
      name: 'Bekenstein–Hawking entropy',
      domain: 'general-relativity',
      formula_latex: 'S = k_B c^3 A/(4 G \\hbar)',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('/', [
        op('*', [sym('k_B', ENTROPY), pow(sym('c', VELOCITY), '3'), sym('A', AREA)]),
        op('*', [sym('4', DIMENSIONLESS), sym('G', GRAV), sym('hbar', ACTION)]),
      ]),
      forms: { areaOrRadius: 'area' },
      regime: { force: 'gravitational', information: 'vonNeumann' },
      assumptions: ['stationary horizon', 'semiclassical'],
      references: ['Bekenstein 1973; Hawking 1975'],
      // 42 = Hawking temperature (same black-hole-thermodynamics family). No
      // bridge literally encodes S=A/4, so no restatesBridge.
      partnerBridges: ['42'],
    },
  ),
  // Newton's law of gravitation  F = G m₁ m₂ / r²  (free mass-ratio group)
  l1(
    { name: 'gravitational-force', dim: FORCE },
    [
      { name: 'G', dim: GRAV },
      { name: 'mass', dim: MASS },
      { name: 'secondary-mass', dim: MASS },
      { name: 'r', dim: LENGTH },
    ],
    {
      id: 'CE-newton-gravitation',
      holds: 'mass >= 0 and secondary-mass >= 0 and r > 0',
      name: "Newton's law of gravitation",
      domain: 'gravitation',
      formula_latex: 'F = G m_1 m_2/r^2',
      epistemicStatus: 'fully-quantitative',
      scalarAst: op('/', [
        op('*', [sym('G', GRAV), sym('mass', MASS), sym('secondary-mass', MASS)]),
        pow(sym('r', LENGTH), '2'),
      ]),
      regime: { scale: 'classical', force: 'gravitational' },
      assumptions: ['point masses', 'non-relativistic'],
      references: ['Newton 1687'],
      partnerBridges: [],
    },
  ),
];
