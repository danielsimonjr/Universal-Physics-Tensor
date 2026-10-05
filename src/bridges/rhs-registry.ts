/**
 * Bridge RHS-AST registry — maps each catalogued bridge id to its faithfully
 * encoded right-hand-side `ExprNode`.
 *
 * The `BRIDGE_EQUATIONS` catalog stores a bridge's `dimensional_signature`
 * (a string) but not its symbolic AST; the per-bridge `*_RHS` ExprNode lives in
 * each `equations/be-NN-*.ts` module. This registry gathers them into one
 * id → AST map so consumers (the dimensional round-trip test, and
 * `bridgeGradientAST` by id) have a single source of truth instead of
 * re-listing 40+ imports.
 *
 * Entries are added here as Tier-5 AST encodings land (the static `import` set
 * gives the type-checker a guarantee that every RHS is in scope). The legacy
 * BE-25 Penrose-Hameroff Orch-OR AST is intentionally excluded — the active
 * BE-25 encoding is the IIT form (`BE25_INTRINSIC_INFORMATION_RHS`).
 *
 * @module bridges/rhs-registry
 */

import type { ExprNode } from '../dimensional/validator.js';
import { bridgeRegistry, registerBridge } from './registry.js';

import { DECOHERENCE_RATE_RHS } from './equations/be-11-decoherence-master.js';
import { BE12_COHERENCE_LENGTH_RHS } from './equations/be-12-coherence-length.js';
import { BE13_EINSTEIN_TRACE_RHS } from './equations/be-13-einstein-trace.js';
import { RYU_TAKAYANAGI_RHS } from './equations/be-14-ryu-takayanagi.js';
import { BE15_COARSENING_LENGTH_SQUARED_RHS } from './equations/be-15-emergence.js';
import { BE16_LANDAUER_RHS } from './equations/be-16-landauer.js';
import { BE17_SPIN_DENSITY_SQUARED_RHS } from './equations/be-17-einstein-cartan.js';
import { BE18_HIGGS_MASS_RHS } from './equations/be-18-higgs-mass.js';
import { QUANTUM_BOUNCE_RHS } from './equations/be-19-quantum-bounce.js';
import { BE20_VACUUM_ENERGY_RHS } from './equations/be-20-vacuum-energy.js';
import { BE21_KSS_RHS } from './equations/be-21-kss-bound.js';
import { BE22_TOPOLOGICAL_ENTANGLEMENT_RHS } from './equations/be-22-topological-entanglement.js';
import { BE23_SYK_RESISTIVITY_RHS } from './equations/be-23-syk-planckian.js';
import { BE24_FRET_EFFICIENCY_RHS } from './equations/be-24-foerster-fret.js';
import { BE25_INTRINSIC_INFORMATION_RHS } from './equations/be-25-iit-phi.js';
import { DNA_TUNNELING_RHS } from './equations/be-26-dna-tunneling.js';
import { BE27_TEFF_RHS } from './equations/be-27-effective-temperature.js';
import { BE28_ENTROPY_PRODUCTION_RHS } from './equations/be-28-onsager-entropy-production.js';
import { BE29_JARZYNSKI_RHS } from './equations/be-29-jarzynski.js';
import { BE30_FLM_RHS } from './equations/be-30-flm-first-law.js';
import { BE31_CAUSAL_SET_BD_RHS } from './equations/be-31-causal-set-bd.js';
import { BE32_QRF_OVERLAP_RHS } from './equations/be-32-quantum-reference-frame.js';
import { BE33_HERTZ_MILLIS_RHS } from './equations/be-33-hertz-millis.js';
import { KIBBLE_ZUREK_RHS } from './equations/be-34-kibble-zurek.js';
import { BE35_CROSSING_EQUATION_RHS } from './equations/be-35-conformal-bootstrap.js';
import { BE36_GW_SPEED_RATIO_RHS } from './equations/be-36-gw-speed-bound.js';
import { BE37_SHAPIRO_DELAY_RHS } from './equations/be-37-shapiro-delay.js';
import { BE38_MOND_FORCE_RHS } from './equations/be-38-mond.js';
import { BE39_BETA_G_RHS } from './equations/be-39-asymptotic-safety.js';
import { BE40_COMPOSITE_HIGGS_RHS } from './equations/be-40-composite-higgs.js';
import { SWAMPLAND_RHS } from './equations/be-41-swampland.js';
import { BE42_HAWKING_TEMPERATURE_RHS } from './equations/be-42-hawking-temperature.js';
import { BE43_ER_EPR_RHS } from './equations/be-43-er-epr.js';
import { BE44_SOFT_HAIR_INTEGRAL_RHS } from './equations/be-44-soft-hair.js';
import { BE45_TCC_RHS } from './equations/be-45-tcc.js';
import { BE46_ANTHROPIC_PROBABILITY_RHS } from './equations/be-46-multiverse-measure.js';
import { BBN_DARK_RHS } from './equations/be-47-bbn-dark-sector.js';
import { BE48_GRW_LOCALIZATION_RHS } from './equations/be-48-grw-localization.js';
import { BE49_QUANTUM_DARWINISM_RHS } from './equations/be-49-quantum-darwinism.js';
import { BE50_TIME_SYMMETRY_RESIDUAL_RHS } from './equations/be-50-wheeler-feynman.js';
import { BE53_BETA_G_RHS } from './equations/be-53-yang-mills-beta.js';
import { BRANE_FRIEDMANN_RHS } from './equations/be-54-randall-sundrum-brane.js';

/**
 * Numeric bridge id → its encoded RHS AST. Add new entries as Tier-5 encodings
 * land. Ids 11–50, 53, 54 (42 bridges); BE-51/52 are closed-form evaluators
 * without an AST encoding and are intentionally absent.
 */
const RHS_PAIRS: readonly (readonly [number, ExprNode])[] = [
  [11, DECOHERENCE_RATE_RHS],
  [12, BE12_COHERENCE_LENGTH_RHS],
  [13, BE13_EINSTEIN_TRACE_RHS],
  [14, RYU_TAKAYANAGI_RHS],
  [15, BE15_COARSENING_LENGTH_SQUARED_RHS],
  [16, BE16_LANDAUER_RHS],
  [17, BE17_SPIN_DENSITY_SQUARED_RHS],
  [18, BE18_HIGGS_MASS_RHS],
  [19, QUANTUM_BOUNCE_RHS],
  [20, BE20_VACUUM_ENERGY_RHS],
  [21, BE21_KSS_RHS],
  [22, BE22_TOPOLOGICAL_ENTANGLEMENT_RHS],
  [23, BE23_SYK_RESISTIVITY_RHS],
  [24, BE24_FRET_EFFICIENCY_RHS],
  [25, BE25_INTRINSIC_INFORMATION_RHS],
  [26, DNA_TUNNELING_RHS],
  [27, BE27_TEFF_RHS],
  [28, BE28_ENTROPY_PRODUCTION_RHS],
  [29, BE29_JARZYNSKI_RHS],
  [30, BE30_FLM_RHS],
  [31, BE31_CAUSAL_SET_BD_RHS],
  [32, BE32_QRF_OVERLAP_RHS],
  [33, BE33_HERTZ_MILLIS_RHS],
  [34, KIBBLE_ZUREK_RHS],
  [35, BE35_CROSSING_EQUATION_RHS],
  [36, BE36_GW_SPEED_RATIO_RHS],
  [37, BE37_SHAPIRO_DELAY_RHS],
  [38, BE38_MOND_FORCE_RHS],
  [39, BE39_BETA_G_RHS],
  [40, BE40_COMPOSITE_HIGGS_RHS],
  [41, SWAMPLAND_RHS],
  [42, BE42_HAWKING_TEMPERATURE_RHS],
  [43, BE43_ER_EPR_RHS],
  [44, BE44_SOFT_HAIR_INTEGRAL_RHS],
  [45, BE45_TCC_RHS],
  [46, BE46_ANTHROPIC_PROBABILITY_RHS],
  [47, BBN_DARK_RHS],
  [48, BE48_GRW_LOCALIZATION_RHS],
  [49, BE49_QUANTUM_DARWINISM_RHS],
  [50, BE50_TIME_SYMMETRY_RESIDUAL_RHS],
  [53, BE53_BETA_G_RHS],
  [54, BRANE_FRIEDMANN_RHS],
];

for (const [id, rhs] of RHS_PAIRS) registerBridge({ id, rhs });

/** Numeric bridge id → encoded RHS. The projection of `registerBridge`. @internal */
export const BRIDGE_RHS_BY_ID: ReadonlyMap<number, ExprNode> = bridgeRegistry.rhs();

/**
 * Parse a bridge id given as a number, `'42'`, or `'BE-42'` (case-insensitive,
 * optional `BE`/`BE-` prefix) into its numeric form. Throws on an unparseable id.
 */
export function parseBridgeId(bridgeId: number | string): number {
  if (typeof bridgeId === 'number') return bridgeId;
  const m = /^\s*(?:BE[-\s]?)?(\d+)\s*$/i.exec(bridgeId);
  if (!m) {
    throw new TypeError(
      `rhs-registry: cannot parse bridge id '${bridgeId}' — expected a number, '42', or 'BE-42'.`
    );
  }
  return Number(m[1]);
}
