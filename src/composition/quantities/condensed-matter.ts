/**
 * Centralized Quantity nodes — condensed-matter / critical-dynamics / topological domain.
 * One object per canonical name; consumed (mainly) by `edges/catalog-condensed-matter.ts`.
 * Split from the former `quantities.ts` god-file (2026-06-22); re-exported
 * through the `quantities.ts` barrel so every importer is unchanged. Name
 * uniqueness is pinned by tests/composition/quantities.test.ts.
 *
 * @module composition/quantities/condensed-matter
 */
import type { Quantity } from '../quantity.js';
import {
  DIMENSIONLESS,
  FREQUENCY,
  LENGTH,
  MASS,
  TEMPERATURE,
  TIME,
} from '../../dimensional/types.js';
import {
  INV_LENGTH,
  MOBILITY,
  RESISTIVITY,
  NUMBER_DENSITY,
  ENERGY_DIM2,
  CONDUCTANCE,
  VOLTAGE,
} from './_dims.js';

/** Canonical node for `temperature`. */
// audit 2026-07-02: stripped — generic (spans classical thermodynamics and
// the quantum Hawking-temperature fold target; also resolves the
// hawking-temperature -> temperature QUANTITY_IDENTIFICATIONS fold conflict).
export const temperatureQ: Quantity = {
  name: 'temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: {},
};
/** Canonical node for `model-a-mobility` (Γ, [L²/T]). */
export const modelAMobilityQ: Quantity = {
  name: 'model-a-mobility',
  symbol: 'Γ',
  dim: MOBILITY,
  attributes: { scale: 'mesoscopic', force: 'emergent' },
};
/** Canonical node for `time` (t, [T]). */
export const timeQ: Quantity = {
  name: 'time',
  symbol: 't',
  dim: TIME,
  attributes: {},
};
/** Canonical node for `coarsening-length` (L(t), [L]). */
export const coarseningLengthQ: Quantity = {
  name: 'coarsening-length',
  symbol: 'L(t)',
  dim: LENGTH,
  attributes: { scale: 'mesoscopic', force: 'emergent' },
};
/** Canonical node for `area-law-coefficient` (α, [L⁻¹]). */
export const areaLawCoefficientQ: Quantity = {
  name: 'area-law-coefficient',
  symbol: 'α',
  dim: INV_LENGTH,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `boundary-length` (L(R), [L]). */
export const boundaryLengthQ: Quantity = {
  name: 'boundary-length',
  symbol: 'L(R)',
  dim: LENGTH,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `topological-entanglement-entropy` (γ, dimensionless). */
export const topologicalEntanglementEntropyQ: Quantity = {
  name: 'topological-entanglement-entropy',
  symbol: 'γ',
  dim: DIMENSIONLESS,
  // topology 'z2': γ = log D diagnoses topological ORDER; the canonical case
  // (toric code / ℤ₂ spin liquid) is ℤ₂. Sourced tag for the 2026-07-05 axis
  // expansion — thin coverage; the topology gate stays off until the audit earns it.
  attributes: { scale: 'quantum', information: 'von-neumann', topology: 'z2' },
};
/** Canonical node for `subsystem-entanglement-entropy` (S(R), nats). */
export const subsystemEntanglementEntropyQ: Quantity = {
  name: 'subsystem-entanglement-entropy',
  symbol: 'S(R)',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `residual-resistivity` (ρ_0, Ω·m). */
export const residualResistivityQ: Quantity = {
  name: 'residual-resistivity',
  symbol: 'ρ_0',
  dim: RESISTIVITY,
  attributes: { scale: 'classical', force: 'electromagnetic' },
};
/** Canonical node for `effective-mass` (m*, carrier band mass — DISTINCT from gravitational `mass`). */
export const effectiveMassQ: Quantity = {
  name: 'effective-mass',
  symbol: 'm*',
  dim: MASS,
  // statistics 'fermionic': the effective mass of the (fermionic) conduction electron.
  // 2026-07-05 condensed-matter cluster — honest classification; statistics gate stays
  // off (no same-dimension fermion↔boson pair exists to clash — measured, not assumed).
  attributes: { scale: 'quantum', force: 'electromagnetic', statistics: 'fermionic' },
};
/** Canonical node for `carrier-density` (n_e, [L⁻³]). */
export const carrierDensityQ: Quantity = {
  name: 'carrier-density',
  symbol: 'n_e',
  dim: NUMBER_DENSITY,
  // statistics 'fermionic': the density of the (fermionic) conduction electrons.
  attributes: { scale: 'quantum', force: 'electromagnetic', statistics: 'fermionic' },
};
/** Canonical node for `syk-coefficient` (α_SYK, dimensionless O(1)). */
export const sykCoefficientQ: Quantity = {
  name: 'syk-coefficient',
  symbol: 'α_SYK',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `resistivity` (ρ(T), Ω·m). */
export const resistivityQ: Quantity = {
  name: 'resistivity',
  symbol: 'ρ',
  dim: RESISTIVITY,
  attributes: { scale: 'classical', force: 'electromagnetic' },
};
/** Canonical node for `active-noise-energy` (Σ_active, energy). */
export const activeNoiseEnergyQ: Quantity = {
  name: 'active-noise-energy',
  symbol: 'Σ_active',
  dim: ENERGY_DIM2,
  attributes: { scale: 'mesoscopic', force: 'emergent' },
};
/** Canonical node for `effective-temperature` (T_eff, [Θ]). */
export const effectiveTemperatureQ: Quantity = {
  name: 'effective-temperature',
  symbol: 'T_eff',
  dim: TEMPERATURE,
  attributes: { scale: 'mesoscopic', force: 'emergent' },
};
/** Canonical node for `reference-correlation-length` (ξ_0, [L]). */
export const referenceCorrelationLengthQ: Quantity = {
  name: 'reference-correlation-length',
  symbol: 'ξ_0',
  dim: LENGTH,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `reference-temperature` (T_0, [Θ]). */
export const referenceTemperatureQ: Quantity = {
  name: 'reference-temperature',
  symbol: 'T_0',
  dim: TEMPERATURE,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `static-exponent-nu` (ν, dimensionless). */
export const staticExponentNuQ: Quantity = {
  name: 'static-exponent-nu',
  symbol: 'ν',
  dim: DIMENSIONLESS,
  // symmetry 'conformal': a critical exponent (conformal field theory at criticality).
  attributes: { scale: 'quantum', symmetry: 'conformal' },
};
/** Canonical node for `dynamic-exponent-z` (z, dimensionless). */
export const dynamicExponentZQ: Quantity = {
  name: 'dynamic-exponent-z',
  symbol: 'z',
  dim: DIMENSIONLESS,
  // symmetry 'conformal': the dynamic critical exponent.
  attributes: { scale: 'quantum', symmetry: 'conformal' },
};
/** Canonical node for `quantum-correlation-length` (ξ_quantum, [L]). */
export const quantumCorrelationLengthQ: Quantity = {
  name: 'quantum-correlation-length',
  symbol: 'ξ_quantum',
  dim: LENGTH,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `quench-timescale` (τ_Q, [T]). */
export const quenchTimescaleQ: Quantity = {
  name: 'quench-timescale',
  symbol: 'τ_Q',
  dim: TIME,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `microscopic-relaxation-time` (τ_0, [T]). */
export const microscopicRelaxationTimeQ: Quantity = {
  name: 'microscopic-relaxation-time',
  symbol: 'τ_0',
  dim: TIME,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `spatial-dimension` (d, dimensionless). */
export const spatialDimensionQ: Quantity = {
  name: 'spatial-dimension',
  symbol: 'd',
  dim: DIMENSIONLESS,
  attributes: {},
};
/** Canonical node for `defect-rest-mass` (m_defect, [M]). */
export const defectRestMassQ: Quantity = {
  name: 'defect-rest-mass',
  symbol: 'm_defect',
  dim: MASS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `reheating-temperature` (T_reh, [Θ]). */
export const reheatingTemperatureQ: Quantity = {
  name: 'reheating-temperature',
  symbol: 'T_reh',
  dim: TEMPERATURE,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `defect-density` (n_defect, dimensionless scaling). */
export const defectDensityQ: Quantity = {
  name: 'defect-density',
  symbol: 'n_defect',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `chern-number` (C, TKNN integer). Not the fractional filling. */
export const chernNumberQ: Quantity = {
  name: 'chern-number',
  symbol: 'C',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', topology: 'chern' },
};
/** Canonical node for `filling-fraction` (ν = p/q). Not the integer Chern number. */
export const fillingFractionQ: Quantity = {
  name: 'filling-fraction',
  symbol: 'ν',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', topology: 'chern' },
};
/** Canonical node for `hall-conductance` (σ_xy, siemens). Shared by the integer and fractional Hall relations. */
export const hallConductanceQ: Quantity = {
  name: 'hall-conductance',
  symbol: 'σ_xy',
  dim: CONDUCTANCE,
  attributes: { scale: 'classical', force: 'electromagnetic' },
};
/** Canonical node for `voltage` (V, volt). Electric potential difference. */
export const voltageQ: Quantity = {
  name: 'voltage',
  symbol: 'V',
  dim: VOLTAGE,
  attributes: { scale: 'classical', force: 'electromagnetic' },
};
/**
 * Canonical node for `frequency` (f, hertz).
 * The same node as the wave relation v = fλ. Attributes stay empty:
 * a classical wave and the Josephson frequency are one quantity, and a
 * scale tag on the shared node would mark every use of it.
 * Distinct from `attempt-frequency`, a molecular kinetic prefactor.
 */
export const frequencyQ: Quantity = {
  name: 'frequency',
  symbol: 'f',
  dim: FREQUENCY,
  attributes: {},
};
