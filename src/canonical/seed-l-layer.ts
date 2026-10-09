/**
 * Seed the canonical-equation registry into the tensor's L-layer (Π = L + B + E)
 * via the existing `addLaw` path. `canonicalToLaw` maps a registry entry onto the
 * `PhysicalLaw` shape; `seedCanonicalLaws` adds them all and returns the count.
 *
 * @module canonical/seed-l-layer
 */
import type { CanonicalEquation } from './canonical-equation.js';
import type { PhysicalLaw, TensorConfig } from '../core/types.js';
import { UniversalTensor } from '../core/tensor.js';
import { CANONICAL_EQUATIONS } from './registry.js';

/** A `TensorConfig` whose axes cover every regime the canonical registry uses,
 *  so `seedCanonicalLaws` never trips axis-membership validation. The scale,
 *  force and symmetry lists are the tensor's own unions (`PhysicalScale`,
 *  `Force`, `Symmetry`), written here because the canonical layer may not
 *  import the composition layer's axis registry (`layer:check`);
 *  `tests/composition/axes.test.ts` compares them to that registry so the two
 *  cannot drift apart. The information measures are the tensor's camelCase
 *  vocabulary (`InformationMeasure`). */
export const CANONICAL_TENSOR_CONFIG: TensorConfig = {
  rank: 6,
  scales: ['quantum', 'mesoscopic', 'classical', 'cosmological'],
  forces: ['gravitational', 'electromagnetic', 'weak', 'strong', 'emergent'],
  symmetries: ['poincare', 'gauge', 'conformal', 'susy', 'emergent'],
  informationMeasures: ['vonNeumann', 'shannon', 'kolmogorov', 'quantumDiscord'],
};

/** Map a canonical entry onto the `PhysicalLaw` shape the L-layer consumes.
 *  Canonical laws are ground truth → `confidence: 1`. Regime axes map to the
 *  law's single-valued axis arrays (empty when the regime leaves an axis open). */
export function canonicalToLaw(ce: CanonicalEquation): PhysicalLaw {
  const r = ce.regime;
  return {
    id: ce.id,
    name: ce.name,
    equation: ce.formula_latex,
    scales: r.scale ? [r.scale] : [],
    forces: r.force ? [r.force] : [],
    symmetries: r.symmetry ? [r.symmetry] : [],
    confidence: 1,
    informationMeasures: r.information ? [r.information] : undefined,
    dimensions: r.dimension !== undefined ? [r.dimension] : undefined,
    topologies: r.topology !== undefined ? [r.topology] : undefined,
    references: [...ce.references],
  };
}

/** Seed every canonical equation into `t`'s L-layer. Returns the count added. */
export function seedCanonicalLaws(t: UniversalTensor): number {
  let added = 0;
  for (const ce of CANONICAL_EQUATIONS) {
    if (t.addLaw(canonicalToLaw(ce))) added++;
  }
  return added;
}
