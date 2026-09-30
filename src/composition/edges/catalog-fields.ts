/**
 * Field-theory bridges (field unification, modified theories, QFT extensions).
 *
 * Catalog edge definitions, split by physics domain from the former
 * `catalog-full.ts` god-file (re-exported via `catalog-full.ts`).
 *
 * @module composition/edges/catalog-fields
 */

import { evaluateBE17SpinDensitySquared } from '../../bridges/equations/be-17-einstein-cartan.js';
import { evaluateBetaG } from '../../bridges/equations/be-39-asymptotic-safety.js';
import { evaluateGWSpeedRatio } from '../../bridges/equations/be-36-gw-speed-bound.js';
import { evaluateHiggsMass } from '../../bridges/equations/be-18-higgs-mass.js';
import { evaluateMONDForce } from '../../bridges/equations/be-38-mond.js';
import { evaluateSwampland } from '../../bridges/equations/be-41-swampland.js';
import type { BridgeEdge } from '../edge.js';
import {
  cosmologicalConstantDimensionlessQ,
  couplingPrefactorSquaredQ,
  darkFermionMassQ,
  gravitationalWaveSpeedQ,
  gwPhotonSpeedRatioQ,
  massQ,
  mondAccelerationScaleQ,
  mondForceQ,
  newtonCouplingBetaQ,
  newtonCouplingQ,
  newtonianForceQ,
  planckMassQ,
  referenceMassQ,
  scalarFieldReferenceQ,
  scalarFieldValueQ,
  spinDensitySquaredQ,
  swamplandCoefficientQ,
  swamplandTowerMassQ,
  torsionContractionScalarQ,
  truncationCoefficientAQ,
  truncationCoefficientBQ,
  truncationCoefficientCQ,
  vacuumExpectationValueQ,
  yukawaCouplingQ,
} from '../quantities.js';
import { isFin, BE18_SYMBOLIC, BE36_SYMBOLIC } from './_catalog-helpers.js';

/**
 * BE-17 Einstein-Cartan torsion-spin squared invariant:
 * (einstein-coupling-prefactor-squared, torsion-contraction-scalar) →
 * S²_spin = (c⁴/8πG)² · T_λμν T^λμν. Wraps `evaluateBE17SpinDensitySquared`
 * (prefactor in [M²L²T⁻⁴], contraction in [T²L⁻⁴]; returns [M²L⁻²T⁻²]).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be17Edge: BridgeEdge = {
  id: 'be-17',
  beId: 17,
  kind: 'bridge',
  label: 'Einstein-Cartan S²_spin = (c⁴/8πG)² · T·T',
  sources: [couplingPrefactorSquaredQ, torsionContractionScalarQ],
  target: spinDensitySquaredQ,
  confidence: 'speculative',
  domain: {
    description: 'prefactor finite, torsion contraction ≥ 0 (sum of squares)',
    predicate: (i) =>
      isFin(i['einstein-coupling-prefactor-squared']) &&
      isFin(i['torsion-contraction-scalar']) &&
      i['torsion-contraction-scalar'] >= 0,
  },
  evaluate: (i) =>
    evaluateBE17SpinDensitySquared({
      coupling_prefactor_squared: i['einstein-coupling-prefactor-squared'],
      torsion_squared: i['torsion-contraction-scalar'],
    }),
  citation: 'Hehl et al. 1976 RMP 48:393; Cartan 1922 C. R. Acad. Sci. 174:593',
};

/**
 * BE-18 Higgs-like dark mass generation: (yukawa-coupling,
 * vacuum-expectation-value) → m_dark = g_dark · v_dark (natural units;
 * mass-as-energy). Wraps `evaluateHiggsMass` (g dimensionless, v in GeV;
 * returns GeV).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be18Edge: BridgeEdge = {
  id: 'be-18',
  beId: 18,
  kind: 'bridge',
  label: 'Higgs-like dark mass m_dark = g_dark · v_dark',
  sources: [yukawaCouplingQ, vacuumExpectationValueQ],
  target: darkFermionMassQ,
  confidence: 'speculative',
  domain: {
    description: 'g_dark and v_dark finite',
    predicate: (i) =>
      isFin(i['yukawa-coupling']) && isFin(i['vacuum-expectation-value']),
  },
  evaluate: (i) =>
    evaluateHiggsMass({
      g_dark: i['yukawa-coupling'],
      v_dark_GeV: i['vacuum-expectation-value'],
    }),
  symbolic: BE18_SYMBOLIC,
  citation: 'Peskin & Schroeder 1995 QFT §20.1',
};

/**
 * BE-36 GW170817 graviton-photon speed ratio: gravitational-wave-speed →
 * (c_GW − c)/c. Wraps `evaluateGWSpeedRatio` (c_GW in m/s; returns
 * dimensionless signed ratio).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be36Edge: BridgeEdge = {
  id: 'be-36',
  beId: 36,
  kind: 'bridge',
  label: 'GW170817 speed ratio (c_GW − c)/c',
  sources: [gravitationalWaveSpeedQ],
  target: gwPhotonSpeedRatioQ,
  confidence: 'speculative',
  domain: {
    description: 'c_GW > 0 and finite',
    predicate: (i) =>
      isFin(i['gravitational-wave-speed']) &&
      i['gravitational-wave-speed'] > 0,
  },
  evaluate: (i) =>
    evaluateGWSpeedRatio({ c_GW_m_per_s: i['gravitational-wave-speed'] }),
  symbolic: BE36_SYMBOLIC,
  citation: 'Abbott et al. 2017 ApJ Lett. 848:L13; Boran et al. 2018 PRD 97:041501',
};

/**
 * BE-38 Milgrom MOND force: (newtonian-force, mass, mond-acceleration-scale) →
 * F = F_N·ν(z), z = F_N/(m a_0). Wraps `evaluateMONDForce` (SI; returns N).
 * Reuses the gravitational `mass` node (the test particle's gravitational mass).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be38Edge: BridgeEdge = {
  id: 'be-38',
  beId: 38,
  kind: 'bridge',
  label: 'MOND force F = F_N·ν(F_N/(m a_0))',
  sources: [newtonianForceQ, massQ, mondAccelerationScaleQ],
  target: mondForceQ,
  confidence: 'speculative',
  domain: {
    description: 'F_N > 0, m > 0, a_0 > 0',
    predicate: (i) =>
      isFin(i['newtonian-force']) &&
      i['newtonian-force'] > 0 &&
      isFin(i['mass']) &&
      i['mass'] > 0 &&
      isFin(i['mond-acceleration-scale']) &&
      i['mond-acceleration-scale'] > 0,
  },
  evaluate: (i) =>
    evaluateMONDForce({
      F_N_newton: i['newtonian-force'],
      m_kg: i['mass'],
      a_0_m_per_s2: i['mond-acceleration-scale'],
    }),
  citation: 'Milgrom 1983 ApJ 270:365; Famaey & McGaugh 2012 Living Rev. Relativity 15:10',
};

/**
 * BE-39 asymptotic-safety β_g: (newton-coupling-dimensionless,
 * cosmological-constant-dimensionless, truncation-coefficient-a/b/c) →
 * β_g = 2g + A g² + B g³ − C g²λ. Wraps `evaluateBetaG` (all dimensionless).
 * The module also ships `evaluateBetaLambda`; this edge wraps the β_g branch.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be39Edge: BridgeEdge = {
  id: 'be-39',
  beId: 39,
  kind: 'bridge',
  label: 'Asymptotic safety β_g = 2g + A g² + B g³ − C g²λ',
  sources: [
    newtonCouplingQ,
    cosmologicalConstantDimensionlessQ,
    truncationCoefficientAQ,
    truncationCoefficientBQ,
    truncationCoefficientCQ,
  ],
  target: newtonCouplingBetaQ,
  confidence: 'speculative',
  domain: {
    description: 'g, λ, A, B, C all finite',
    predicate: (i) =>
      isFin(i['newton-coupling-dimensionless']) &&
      isFin(i['cosmological-constant-dimensionless']) &&
      isFin(i['truncation-coefficient-a']) &&
      isFin(i['truncation-coefficient-b']) &&
      isFin(i['truncation-coefficient-c']),
  },
  evaluate: (i) =>
    evaluateBetaG({
      g: i['newton-coupling-dimensionless'],
      lambda: i['cosmological-constant-dimensionless'],
      A: i['truncation-coefficient-a'],
      B: i['truncation-coefficient-b'],
      C: i['truncation-coefficient-c'],
    }),
  citation: 'Reuter 1998 PRD 57:971; Reuter & Weyer 2009 Gen. Rel. Grav. 41:983',
};

/**
 * BE-41 Swampland distance conjecture: (reference-mass, swampland-coefficient,
 * scalar-field-value, scalar-field-reference, planck-mass) →
 * m(φ) = m₀ exp(−α|φ−φ₀|/M_P). Wraps `evaluateSwampland` (consistent units;
 * returns same unit as m₀).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be41Edge: BridgeEdge = {
  id: 'be-41',
  beId: 41,
  kind: 'bridge',
  label: 'Swampland tower mass m(φ) = m₀ exp(−α|φ−φ₀|/M_P)',
  sources: [referenceMassQ, swamplandCoefficientQ, scalarFieldValueQ, scalarFieldReferenceQ, planckMassQ],
  target: swamplandTowerMassQ,
  confidence: 'speculative',
  domain: {
    description: 'm₀ ≥ 0, α/φ/φ₀ finite, M_P > 0',
    predicate: (i) =>
      isFin(i['reference-mass']) &&
      i['reference-mass'] >= 0 &&
      isFin(i['swampland-coefficient']) &&
      isFin(i['scalar-field-value']) &&
      isFin(i['scalar-field-reference']) &&
      isFin(i['planck-mass']) &&
      i['planck-mass'] > 0,
  },
  evaluate: (i) =>
    evaluateSwampland({
      m0: i['reference-mass'],
      alpha: i['swampland-coefficient'],
      phi: i['scalar-field-value'],
      phi0: i['scalar-field-reference'],
      M_P: i['planck-mass'],
    }),
  citation: 'Ooguri & Vafa 2007 Nucl. Phys. B 766:21; Vafa 2005 (hep-th/0509212)',
};
