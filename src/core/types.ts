/**
 * Core types for Universal Physics Tensor Framework
 *
 * These types define the fundamental structure of the tensor and its components.
 */

import { ALPHA, C_SI, E_SI, G_SI, H0_SI, H_SI, HBAR_SI, K_B_SI, L_P_SI, M_P_SI, T_P_SI } from './constants.js';

/**
 * Physical scales represented in the tensor
 */
export type PhysicalScale =
  | 'quantum'       // < 10^-9 m (Planck to atomic)
  | 'mesoscopic'    // 10^-9 to 10^-6 m (nano to micro)
  | 'classical'     // 10^-6 to 10^26 m (micro to cosmological)
  | 'cosmological'; // > 10^26 m (galactic and beyond)

/**
 * Fundamental forces
 */
export type Force =
  | 'gravitational'
  | 'electromagnetic'
  | 'weak'
  | 'strong'
  | 'emergent'; // Effective forces (friction, tension, etc.)

/**
 * Symmetry types.
 *
 * @public
 */
export type Symmetry =
  | 'poincare'    // Spacetime symmetries
  | 'gauge'       // Internal symmetries (U(1), SU(2), SU(3))
  | 'conformal'   // Scale invariance
  | 'susy'        // Supersymmetry
  | 'emergent';   // Effective symmetries

/**
 * Information-theoretic measures used to classify catalog entries that
 * touch the information ↔ geometry bridge axis.
 *
 * @public
 */
export type InformationMeasure =
  | 'vonNeumann'     // Quantum entropy: S = -Tr(ρ log ρ)
  | 'shannon'        // Classical entropy: H = -Σ p log p
  | 'kolmogorov'     // Algorithmic complexity
  | 'quantumDiscord';// Quantum correlations beyond entanglement

/**
 * Tensor configuration for initialization
 */
export interface TensorConfig {
  /** Tensor rank (3-6) */
  rank: 3 | 4 | 5 | 6;

  /** Physical scales to include */
  scales: PhysicalScale[];

  /** Forces to include */
  forces: Force[];

  /** Symmetries to consider */
  symmetries?: Symmetry[];

  /** Information measures to track */
  informationMeasures?: InformationMeasure[];

  /** Enable sparse representation for memory efficiency */
  sparse?: boolean;
}

/**
 * Tensor indices for addressing specific components
 */
export interface TensorIndices {
  scale?: PhysicalScale;
  force?: Force;
  symmetry?: Symmetry;
  information?: InformationMeasure;
  dimension?: number;
  topology?: number;
}

/**
 * Known physical law representation
 */
export interface PhysicalLaw {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Mathematical formulation (LaTeX) */
  equation: string;

  /** Applicable scales */
  scales: PhysicalScale[];

  /** Involved forces */
  forces: Force[];

  /** Required symmetries */
  symmetries: Symmetry[];

  /** Confidence level (0-1) */
  confidence: number;

  /** Applicable information measures (optional) */
  informationMeasures?: InformationMeasure[];

  /** Applicable spatial/spacetime dimensions (optional) */
  dimensions?: number[];

  /** Applicable topological invariants (optional) */
  topologies?: number[];

  /** References to experimental validation */
  references?: string[];
}

/**
 * Bridge equation connecting different regimes
 */
export interface BridgeEquation {
  /** Unique identifier */
  id: string;

  /** Name */
  name: string;

  /** Source regime indices */
  source: TensorIndices;

  /** Target regime indices */
  target: TensorIndices;

  /** Mathematical formulation */
  equation: string;

  /** Theoretical confidence (0-1) */
  confidence: number;

  /** Experimental validation status */
  validated: boolean;

  /** Context and description */
  description: string;
}

/**
 * Emergent phenomenon from higher-order correlations
 */
export interface EmergentPhenomenon {
  /** Unique identifier */
  id: string;

  /** Name */
  name: string;

  /** Order of correlation (≥3) */
  order: number;

  /** Involved indices */
  indices: TensorIndices[];

  /** Mathematical description */
  description: string;

  /** Prediction confidence */
  confidence: number;
}

/**
 * Physical constants used in computations: a projection of `core/constants.ts`,
 * the one owner of the values.
 */
export const PhysicalConstants = {
  // Fundamental constants
  c: C_SI,
  h: H_SI,
  hbar: HBAR_SI,
  G: G_SI,
  kB: K_B_SI,
  e: E_SI,

  // Derived constants
  alpha: ALPHA,
  lP: L_P_SI,
  tP: T_P_SI,
  mP: M_P_SI,

  // Cosmological. Planck 2018 CMB, Aghanim et al. A&A 641 A6 2020; SH0ES local
  // measurement gives ~73.0 ± 1.0 km/s/Mpc (the "Hubble tension").
  H0: H0_SI,
} as const;
