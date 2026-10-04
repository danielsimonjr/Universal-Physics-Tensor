/**
 * Proved seeds are composition edges, or a recorded exemption.
 *
 * A catalog seed's edge carries the equation the PhysJS theorem states,
 * including a symbolic form when the scalar grammar can say it.
 * An atlas seed that is only an equation-to-equation analogy is named
 * in `NOT_COMPOSABLE_SEEDS` with the reason. A quantity name is one
 * physical quantity: the denylist is the spellings that must not appear
 * beside the canonical name.
 */

import { describe, expect, it } from 'vitest';
import { bridgeSeedKeys } from '../../src/atlas/physjs-ref.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { PROVED_SEED_EDGES } from '../../src/composition/edges/proved-seeds.js';
import { NOT_COMPOSABLE_SEEDS } from '../../src/composition/not-composable-seeds.js';
import * as quantities from '../../src/composition/quantities.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { CONSTANTS, piMultipleValue } from '../../src/dimensional/symbolic-constants.js';
import { DIMENSIONLESS, type Dimension } from '../../src/dimensional/types.js';
import { equals } from '../../src/dimensional/algebra.js';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { evalExpr } from '../../src/composition/expr-eval.js';

const nodes = Object.values(quantities).filter(
  (value): value is Quantity =>
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'dim' in value,
);

const byName = new Map(nodes.map((q) => [q.name, q]));

/** Spellings that are the same quantity as an existing canonical name. */
const FORBIDDEN_SYNONYMS: Readonly<Record<string, string>> = {
  temp: 'temperature',
  'de-broglie-wavelength': 'thermal-de-broglie-wavelength',
  'thermal-wavelength': 'thermal-de-broglie-wavelength',
  'chandrasekhar-mass': 'mass',
  'hall-conductivity': 'hall-conductance',
  'josephson-frequency': 'frequency',
  'bias-voltage': 'voltage',
  'electric-potential': 'voltage',
  'eta-over-s': 'viscosity-entropy-ratio',
  'viscosity-to-entropy-ratio': 'viscosity-entropy-ratio',
};

/**
 * Pairs that share a dimension and must stay different objects.
 * Merging either name would invent a junction the physics does not have.
 */
const DISTINCT: readonly (readonly [string, string])[] = [
  ['temperature', 'effective-temperature'],
  ['temperature', 'hawking-temperature'],
  ['temperature', 'reference-temperature'],
  ['temperature', 'reheating-temperature'],
  ['mass', 'effective-mass'],
  ['mass', 'tunneling-mass'],
  ['mass', 'defect-rest-mass'],
  ['mass', 'dark-fermion-mass'],
  ['mass', 'reference-mass'],
  ['mass', 'planck-mass'],
  ['minimal-surface-area', 'wormhole-cross-section-area'],
  ['boundary-entanglement-entropy', 'wormhole-entanglement-entropy'],
  ['attempt-frequency', 'frequency'],
  ['chern-number', 'filling-fraction'],
  ['cosmological-constant-curvature', 'rescaled-cosmological-constant'],
  ['time', 'shapiro-delay'],
  ['time', 'quench-timescale'],
  ['alfven-speed', 'fast-magnetosonic-speed'],
  ['alfven-speed', 'sound-speed'],
  ['temperature', 'einstein-temperature'],
  ['temperature', 'clapeyron-temperature'],
  ['temperature', 'peltier-temperature'],
  ['proper-temperature', 'einstein-temperature'],
  ['metric-g00', 'redshift-metric-g00-1'],
  ['metric-g00', 'redshift-metric-g00-2'],
  ['metric-g00', 'gravitational-frequency-ratio'],
];

function leavesOf(node: ExprNode, acc: { name: string; dim: Dimension }[] = []): { name: string; dim: Dimension }[] {
  switch (node.kind) {
    case 'symbol':
      acc.push({ name: node.name, dim: node.dim });
      return acc;
    case 'op':
      for (const arg of node.args) leavesOf(arg, acc);
      return acc;
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      return leavesOf(node.arg, acc);
    default:
      return acc;
  }
}

describe('proved seeds on the composition graph', () => {
  const exempt = new Map(NOT_COMPOSABLE_SEEDS.map((row) => [row.id, row.reason]));
  const edgeIds = new Set(CATALOG_GRAPH.map((edge) => edge.id));

  it('the five new catalog edges are the proved-seed module', () => {
    expect(PROVED_SEED_EDGES.map((edge) => edge.id)).toEqual([
      'be-40',
      'be-55',
      'be-59',
      'be-60',
      'be-63',
    ]);
    for (const edge of PROVED_SEED_EDGES) {
      expect(CATALOG_GRAPH).toContain(edge);
    }
  });

  it('every seed key is an edge id or a documented exemption', () => {
    const missing: string[] = [];
    for (const key of bridgeSeedKeys()) {
      if (!edgeIds.has(key) && !exempt.has(key)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  it('every exemption is a seed, has a reason, and is not also an edge', () => {
    const seeds = new Set(bridgeSeedKeys());
    for (const row of NOT_COMPOSABLE_SEEDS) {
      expect(seeds.has(row.id), row.id).toBe(true);
      expect(row.reason.trim().length).toBeGreaterThan(40);
      expect(edgeIds.has(row.id), row.id).toBe(false);
    }
  });

  it('every catalog seed edge has a symbolic form whose dimension is the target', () => {
    const seeds = new Set(bridgeSeedKeys());
    for (const edge of CATALOG_GRAPH) {
      if (!seeds.has(edge.id)) continue;
      expect(edge.symbolic, edge.id).toBeDefined();
      const report = validate(edge.symbolic!);
      expect(report.ok, edge.id).toBe(true);
      if (report.inferredDimension === null) throw new Error(`${edge.id}: no inferred dimension`);
      expect(equals(report.inferredDimension, edge.target.dim), edge.id).toBe(true);
    }
  });
});

describe('catalog quantity names', () => {
  it('does not register a forbidden synonym of a canonical name', () => {
    for (const node of nodes) {
      const canonical = FORBIDDEN_SYNONYMS[node.name];
      expect(canonical, node.name).toBeUndefined();
    }
    for (const edge of CATALOG_GRAPH) {
      for (const q of [...edge.sources, edge.target]) {
        expect(FORBIDDEN_SYNONYMS[q.name], `${edge.id} ${q.name}`).toBeUndefined();
      }
    }
  });

  it('keeps distinct quantities distinct', () => {
    for (const [a, b] of DISTINCT) {
      const left = byName.get(a);
      const right = byName.get(b);
      expect(left, a).toBeDefined();
      expect(right, b).toBeDefined();
      expect(left).not.toBe(right);
      expect(left!.name).not.toBe(right!.name);
    }
  });

  it('gives one object to one name, and a symbolic leaf the dimension of that object', () => {
    for (const edge of CATALOG_GRAPH) {
      const seen = new Set<string>();
      for (const source of edge.sources) {
        expect(seen.has(source.name), edge.id).toBe(false);
        seen.add(source.name);
        expect(byName.get(source.name), source.name).toBe(source);
      }
      expect(byName.get(edge.target.name), edge.target.name).toBe(edge.target);
      if (edge.symbolic === undefined) continue;
      for (const leaf of leavesOf(edge.symbolic)) {
        if (leaf.name in CONSTANTS) {
          expect(equals(leaf.dim, CONSTANTS[leaf.name]!.dim), `${edge.id} ${leaf.name}`).toBe(true);
        } else if (Number.isFinite(Number(leaf.name)) || piMultipleValue(leaf.name) !== undefined) {
          expect(equals(leaf.dim, DIMENSIONLESS), `${edge.id} ${leaf.name}`).toBe(true);
        } else {
          const q = byName.get(leaf.name);
          expect(q, `${edge.id} leaf ${leaf.name}`).toBeDefined();
          expect(equals(leaf.dim, q!.dim), `${edge.id} ${leaf.name}`).toBe(true);
        }
      }
    }
  });
});

describe('symbolic forms agree with the edge evaluator', () => {
  const probes: Readonly<Record<string, Record<string, number>>> = {
    'be-27': { temperature: 300, 'active-noise-energy': 1e-20 },
    'be-37': { mass: 1.989e30, 'far-radius': 1.5e11, 'near-radius': 6.96e8 },
    'be-43': { 'wormhole-cross-section-area': 1e-20 },
    'be-50': { 'retarded-field-amplitude': 3, 'advanced-field-amplitude': 1 },
    'be-54': {
      'mass-density': 1e-26,
      'brane-tension': 1e90,
      'rescaled-cosmological-constant': 1e-35,
    },
    'be-40': {
      'higgs-field': 0.2,
      'higgs-decay-constant': 1,
      'composite-higgs-alpha': 0.5,
      'composite-higgs-beta': 0.25,
    },
    'be-55': { 'chern-number': 2 },
    'be-59': { voltage: 1e-6 },
    'be-60': { 'filling-fraction': 1 / 3 },
    'be-63': { 'mean-molecular-weight-per-electron': 2, 'lane-emden-omega-3': 2.01824 },
    'be-66': { 'poynting-flux': 1e6, reflectance: 0.4, 'incidence-angle': Math.PI / 5 },
    'be-67': { 'magnetic-flux-density': 12e-9, 'plasma-mass-density': 14e6 * 1.67262192369e-27 },
    'be-68': { 'proper-temperature': 300, 'metric-g00': -0.8 },
    'be-69': { 'sound-speed': 1e5, 'magnetic-flux-density': 1e-4, 'plasma-mass-density': 1e-6 },
    'be-70': { 'electrical-mobility': 1e-8, 'einstein-temperature': 300, 'carrier-charge': 1.602176634e-19 },
    'be-71': { 'specific-latent-heat': 2.26e6, 'clapeyron-temperature': 373.15, 'specific-volume-change': 1.672 },
    'be-72': { 'redshift-metric-g00-1': -1, 'redshift-metric-g00-2': -4 },
    'be-73': { 'seebeck-coefficient': 2e-4, 'peltier-temperature': 300 },
    'be-77': { 'pipe-radius': 0.01, 'pipe-pressure-drop': 1000, 'dynamic-viscosity': 0.001, 'pipe-length': 1 },
    'be-78': { 'youngs-modulus': 2e11, 'area-moment': 1e-8, 'column-length': 1 },
    'be-79': { 'pull-in-stiffness': 1, 'pull-in-gap': 1e-6, 'pull-in-area': 1e-6 },
    'be-80': { 'mott-permittivity': 1e-11, 'mott-mobility': 1e-8, 'mott-voltage': 1, 'mott-thickness': 1e-6 },
    'be-81': { 'child-carrier-mass': 9.1093837015e-31, 'child-voltage': 1, 'child-gap': 1e-3 },
    'be-82': { 'shockley-saturation': 1e-12, 'shockley-voltage': 0.2, 'shockley-temperature': 300 },
    'be-83': { 'thomson-temperature': 300, 'seebeck-slope': 1e-6 },
    'be-84': { 'four-point-voltage': 1e-3, 'four-point-current': 1e-3 },
    'be-85': { 'shot-current': 1e-3 },
    'be-86': { 'skin-friction': 0.004 },
    'be-87': { 'capacitor-temperature': 300, capacitance: 1e-12 },
    'be-88': { 'fermi-sea-density': 1e28, 'fermi-sea-mass': 9.109e-31 },
    'be-89': { 'debye-sound-speed': 1e3, 'debye-atom-density': 1e28 },
    'be-90': { 'debye-atom-count': 1, 'debye-temperature': 10, 'debye-theta': 200 },
    'be-91': { 'einstein-atom-count': 1, 'einstein-solid-temperature': 300, 'einstein-theta': 200 },
    'be-92': { 'sommerfeld-density': 1e28, 'sommerfeld-temperature': 10, 'sommerfeld-fermi-energy': 1e-18 },
    'be-93': {
      'curie-density': 1e28,
      'curie-g-factor': 2,
      'curie-spin': 0.5,
      'curie-magneton': 9.274e-24,
      'curie-temperature': 300,
      'weiss-temperature': 0,
    },
    'be-94': { 'pauli-density': 1e28, 'pauli-fermi-energy': 1e-18, 'pauli-magneton': 9.274e-24 },
    'be-95': { 'gl-kappa': 1 },
    'be-96': { 'upper-critical-length': 1e-7 },
    'be-97': { 'ambegaokar-gap': 1e-22 },
    'be-98': { 'bcs-quartic': 1 },
    'be-99': {
      'conduction-dos': 1e25,
      'valence-dos': 1e25,
      'mass-action-gap': 1e-19,
      'mass-action-temperature': 300,
    },
    'be-100': { 'lst-static': 10, 'lst-infinity': 2 },
    'be-101': { 'bkt-stiffness': 1e-21 },
    'be-102': { 'landauer-transmission': 1 },
  };

  for (const [id, probe] of Object.entries(probes)) {
    it(`${id}: evalExpr matches evaluate`, () => {
      const edge = CATALOG_GRAPH.find((candidate) => candidate.id === id);
      expect(edge, id).toBeDefined();
      expect(edge!.symbolic, id).toBeDefined();
      const symbolic = evalExpr(edge!.symbolic!, probe);
      const numeric = edge!.evaluate(probe);
      expect(Math.abs(symbolic - numeric) / Math.abs(numeric)).toBeLessThan(1e-9);
    });
  }
});
