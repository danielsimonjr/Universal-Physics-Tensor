/**
 * Confrontation registry — maps a bridge id to a normalized
 * `ConfrontationOutcome`-producing `run()`. Wraps the three existing
 * confrontation modules (be-23/36/52) behind the unified outcome shape and
 * hosts the new confrontations. `DATA_CONFRONTED_IDS` is a projection of
 * this registry's keyset (single source of truth). Confrontations are
 * ORTHOGONAL to the discovery funnel — nothing here imports discovery.
 *
 * @module bridges/confrontations
 */
import type { ConfrontationOutcome, ObservationKind } from './observations/types.js';
import { residualInSigma } from './observations/types.js';
import { confrontBE52 } from './be52-mercury-confrontation.js';
import { confrontBE37 } from './be37-cassini-confrontation.js';
import { confrontBE36 } from './be36-gw170817-confrontation.js';
import { confrontBE23 } from './be23-planckian-confrontation.js';
import { confrontBE48 } from './be48-collapse-confrontation.js';
import { confrontBE51 } from './be51-lensing-confrontation.js';
import { confrontBE21 } from './be21-kss-confrontation.js';
import { confrontBE35 } from './be35-bootstrap-confrontation.js';
import { confrontBE11 } from './be11-decoherence-confrontation.js';
import { confrontBE55 } from './be55-quantum-hall-confrontation.js';
import { confrontBE56 } from './be56-casimir-confrontation.js';
import { confrontBE58 } from './be58-johnson-nyquist-confrontation.js';
import { confrontBE59 } from './be59-ac-josephson-confrontation.js';
import { confrontBE60 } from './be60-fractional-qh-confrontation.js';
import { confrontBE61 } from './be61-wiedemann-franz-confrontation.js';
import { confrontBE62 } from './be62-bcs-gap-confrontation.js';
import { confrontBE63 } from './be63-chandrasekhar-mass-confrontation.js';
import { confrontBE64 } from './be64-eddington-luminosity-confrontation.js';
import { confrontBE65 } from './be65-jeans-mass-confrontation.js';

/** One registered confrontation. @public */
export interface ConfrontationEntry {
  readonly bridgeId: number;
  readonly title: string;
  readonly kind: ObservationKind;
  run(): ConfrontationOutcome;
}

/** Rigor of a confrontation — how stringent a test it actually is. @public */
export type RigorTier = 'stringent' | 'moderate' | 'loose';

/**
 * Author-declared rigor of each confrontation. Folds in test PRECISION *and*
 * HONESTY (one-sidedness, order-of-magnitude, caveats) — it is deliberately NOT
 * purely computed: e.g. be-11's ratio is exactly 1 (fractionalGap 0) but its real
 * precision is ~15% gas-to-gas, so it is declared `loose`. The spine is a RIGOR
 * HIERARCHY, not N equal confirmations — after the 2026-07-05 branch expansion the
 * precision core is the quantum-metrology triangle (be-55 QHE 8.6e-11, be-59
 * Josephson 1e-9, be-58 JNT 5 ppm), tighter than the classic GR tests, while all of
 * astrophysics (be-63/64/65) sits in the loose tail. Distribution + an
 * anti-inflation cross-check are pinned in `confrontation-rigor.test.ts`; the
 * reader-facing account is `docs/research/pi-instrument-results.md`.
 *
 * @public
 */
export const CONFRONTATION_RIGOR: ReadonlyMap<number, RigorTier> = new Map([
  // stringent (precision ≤ ~0.5%): metrology triangle + GR PPN-γ + Ising ν
  [55, 'stringent'], // QHE universality 8.6e-11 (tightest in the spine)
  [59, 'stringent'], // Josephson 1e-9
  [58, 'stringent'], // Johnson-Nyquist k_B 5 ppm
  [60, 'stringent'], // fractional QH 1e-5
  [37, 'stringent'], // Shapiro PPN γ 2.3e-5
  [51, 'stringent'], // light deflection PPN γ 6e-5
  [35, 'stringent'], // 3D-Ising ν 0.3% (experiment-limited; bootstrap far tighter)
  // moderate (~1–5%)
  [52, 'moderate'], // Mercury PPN β 1%
  [56, 'moderate'], // Casimir 1% (systematics-dominated)
  [62, 'moderate'], // BCS gap 5% (weak-coupling class)
  // loose (≥~10% / one-sided / order-of-magnitude)
  [11, 'loose'], // decoherence ~15% gas-to-gas (fractionalGap 0 hides it)
  [21, 'loose'], // KSS bound, 26% above
  [23, 'loose'], // Planckian α, factor 2
  [36, 'loose'], // GW speed, one-sided bound
  [48, 'loose'], // GRW collapse, 8-orders bound
  [61, 'loose'], // Wiedemann-Franz, 10% (degenerate-limit)
  [63, 'loose'], // Chandrasekhar, 12% upper-bound (super-Ch exceptions)
  [64, 'loose'], // Eddington, order-unity (super-Eddington exceptions)
  [65, 'loose'], // Jeans, order-of-magnitude
]);

/** The rigor tier of a confronted bridge (`'loose'` if unknown). @public */
export function confrontationRigor(bridgeId: number): RigorTier {
  return CONFRONTATION_RIGOR.get(bridgeId) ?? 'loose';
}

/** Count of confrontations by rigor tier. @public */
export function rigorDistribution(): Record<RigorTier, number> {
  const d: Record<RigorTier, number> = { stringent: 0, moderate: 0, loose: 0 };
  for (const t of CONFRONTATION_RIGOR.values()) d[t]++;
  return d;
}

const be52Entry: ConfrontationEntry = {
  bridgeId: 52,
  title: 'GR perihelion precession vs Mercury (Clemence 1947)',
  kind: 'value',
  run() {
    const r = confrontBE52();
    return {
      kind: 'value',
      predicted: r.predicted_arcsec_per_century,
      observed: r.observed_arcsec_per_century,
      sigma: r.observation.observed_sigma_arcsec_per_century,
      residualInSigma: r.residual_in_sigma,
      withinObserved: r.withinObserved,
      units: 'arcsec/century',
      provenance: { citation: r.observation.citation, year: 1947, retrieved: '2026-07-02' },
    };
  },
};

const be23Entry: ConfrontationEntry = {
  bridgeId: 23,
  title: 'Planckian dissipation α vs overdoped cuprates (Legros 2019)',
  kind: 'value',
  run() {
    const r = confrontBE23();
    // withinObserved means "within 1σ" (see ConfrontationOutcome / the CLI's
    // "within 1σ ✓" label) — derive it from the residual, not from
    // r.withinPlanckianBand (a separate O(1)-band membership check that can
    // diverge from the residual verdict away from the committed α).
    return {
      kind: 'value',
      predicted: 1.0,
      observed: r.alphaAggregate,
      sigma: r.alphaAggregateErr,
      residualInSigma: residualInSigma(1.0, r.alphaAggregate, r.alphaAggregateErr),
      withinObserved: residualInSigma(1.0, r.alphaAggregate, r.alphaAggregateErr) <= 1,
      units: 'dimensionless (α)',
      provenance: { citation: r.observation.citation, year: 2019, retrieved: '2026-07-02' },
    };
  },
};

// be-36 upper-bound confrontation. VERIFIED field names (BE36ConfrontationResult,
// be36-gw170817-confrontation.ts:76-93): upperBound, lowerBound, encodedBound,
// passesEncodedBound, observation. It is two-sided; map BE-36's encoded bound
// as `predicted` and the observational positive-side bound as `bound`, with
// `passesEncodedBound` as `satisfied`. GWSpeedObservation's citation field is
// named `citation` (verified at be36-gw170817-confrontation.ts:51).
const be36Entry: ConfrontationEntry = {
  bridgeId: 36,
  title: 'GW speed vs GW170817 bound',
  kind: 'upper-bound',
  run() {
    const r = confrontBE36();
    return {
      kind: 'upper-bound',
      predicted: r.encodedBound,
      bound: r.upperBound,
      satisfied: r.passesEncodedBound,
      predictedIs: 'encoded-bound',
      caveat: `one-sided: +side only (GW170817 −side ${r.lowerBound.toExponential(1)} exceeds the symmetric encoded ±${r.encodedBound.toExponential(0)})`,
      units: '|c_GW − c| / c (dimensionless)',
      provenance: {
        citation: r.observation.citation,
        year: 2017,
        retrieved: '2026-07-02',
        note: `two-sided bound: upper ${r.upperBound}, lower ${r.lowerBound}; encoded |ratio| ≤ ${r.encodedBound}`,
      },
    };
  },
};

const be37Entry: ConfrontationEntry = {
  bridgeId: 37,
  title: 'GR Shapiro delay (PPN γ) vs Cassini (Bertotti 2003)',
  kind: 'value',
  run() {
    const r = confrontBE37();
    return {
      kind: 'value',
      predicted: r.predicted_gamma,
      observed: r.observed_gamma,
      sigma: r.observation.observed_gamma_sigma,
      residualInSigma: r.residual_in_sigma,
      withinObserved: r.withinObserved,
      units: 'PPN γ (dimensionless)',
      provenance: r.observation.provenance,
    };
  },
};

const be48Entry: ConfrontationEntry = {
  bridgeId: 48,
  title: 'GRW collapse rate vs LISA-Pathfinder bound (Carlesso 2016)',
  kind: 'upper-bound',
  run() {
    const r = confrontBE48();
    return {
      kind: 'upper-bound',
      predicted: r.predicted_rate_per_s,
      bound: r.bound_rate_per_s,
      satisfied: r.satisfied,
      predictedIs: 'point',
      units: 's⁻¹ (collapse rate)',
      provenance: r.observation.provenance,
    };
  },
};

const be51Entry: ConfrontationEntry = {
  bridgeId: 51,
  title: 'GR light deflection (PPN γ) vs VLBI (Lambert 2009)',
  kind: 'value',
  run() {
    const r = confrontBE51();
    return {
      kind: 'value',
      predicted: r.predicted_arcsec,
      observed: r.observed_arcsec,
      sigma: r.observed_sigma_arcsec,
      residualInSigma: r.residual_in_sigma,
      withinObserved: r.withinObserved,
      units: 'arcsec (solar-limb deflection)',
      provenance: r.observation.provenance,
      measured: {
        quantity: 'PPN γ',
        value: r.observation.observed_gamma,
        sigma: r.observation.observed_gamma_sigma,
        source: 'VLBI',
        derivation: '(1+γ)/2 × predicted',
      },
    };
  },
};

const be21Entry: ConfrontationEntry = {
  bridgeId: 21,
  title: 'KSS viscosity bound vs quark-gluon plasma (Bernhard-Moreland-Bass 2019)',
  kind: 'consistency',
  run() {
    const r = confrontBE21();
    return {
      kind: 'consistency',
      predicted: r.predicted_bound,
      approaches: r.observed_eta_over_s,
      fractionalGap: r.fractional_gap,
      units: 'η/s (ℏ/k_B units); KSS lower bound 1/(4π), observed satisfies + nearly saturates',
      provenance: r.observation.provenance,
    };
  },
};

const be35Entry: ConfrontationEntry = {
  bridgeId: 35,
  title: 'Conformal bootstrap 3D-Ising ν vs experiment (Pelissetto-Vicari 2002)',
  kind: 'value',
  run() {
    const r = confrontBE35();
    return {
      kind: 'value',
      predicted: r.predicted_nu,
      observed: r.observed_nu,
      sigma: r.observed_sigma,
      residualInSigma: r.residual_in_sigma,
      withinObserved: r.withinObserved,
      units: 'ν (3D-Ising correlation-length exponent, dimensionless)',
      provenance: r.observation.provenance,
    };
  },
};

const be11Entry: ConfrontationEntry = {
  bridgeId: 11,
  title: 'Decoherence master equation vs collisional decoherence (Hornberger 2003)',
  kind: 'consistency',
  run() {
    const r = confrontBE11();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.fractional_gap,
      units:
        'p₀(theory)/p₀(exp) ratio; parameter-free 9-gas agreement within 15% experimental error',
      provenance: r.observation.provenance,
    };
  },
};

const be55Entry: ConfrontationEntry = {
  bridgeId: 55,
  title: 'Quantum Hall universality (graphene vs GaAs) — Janssen 2012',
  kind: 'consistency',
  run() {
    const r = confrontBE55();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.relative_uncertainty,
      units: 'R_H(graphene)/R_H(GaAs) ratio; topological universality to 8.6e-11',
      provenance: r.observation.provenance,
    };
  },
};

const be56Entry: ConfrontationEntry = {
  bridgeId: 56,
  title: 'Casimir force vs corrected theory (Mohideen-Roy 1998)',
  kind: 'consistency',
  run() {
    const r = confrontBE56();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.agreement,
      units: 'measured/theory force ratio; ~1% agreement (corrected theory, systematics-dominated)',
      provenance: r.observation.provenance,
    };
  },
};

const be58Entry: ConfrontationEntry = {
  bridgeId: 58,
  title: 'Johnson-Nyquist S_V=4k_BTR via JNT k_B (Flowers-Jacobs 2017)',
  kind: 'value',
  run() {
    const r = confrontBE58();
    return {
      kind: 'value',
      predicted: r.predicted_k_B,
      observed: r.observed_k_B,
      sigma: r.sigma,
      residualInSigma: r.residual_in_sigma,
      withinObserved: r.withinObserved,
      units: 'k_B (J/K); JNT via S_V=4k_BTR vs CODATA',
      provenance: r.observation.provenance,
    };
  },
};

const be59Entry: ConfrontationEntry = {
  bridgeId: 59,
  title: 'Josephson-volt universality (junction-independence) — Kautz 1996 / BIPM',
  kind: 'consistency',
  run() {
    const r = confrontBE59();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.relative_uncertainty,
      units: 'V(junction A)/V(junction B) ratio; Josephson-volt universality to ~1e-9',
      provenance: r.observation.provenance,
    };
  },
};

const be60Entry: ConfrontationEntry = {
  bridgeId: 60,
  title: 'Fractional QH ν=1/3 plateau (R_xy=3·R_K) — Tsui-Störmer-Gossard 1982',
  kind: 'consistency',
  run() {
    const r = confrontBE60();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.relative_uncertainty,
      units: 'R_xy(plateau)/(3·R_K) ratio; the ⅓ fraction (topological order) to ~1e-5',
      provenance: r.observation.provenance,
    };
  },
};

const be61Entry: ConfrontationEntry = {
  bridgeId: 61,
  title: 'Wiedemann-Franz Lorenz number vs degenerate limit (Kumar 2023)',
  kind: 'consistency',
  run() {
    const r = confrontBE61();
    return {
      kind: 'consistency',
      predicted: r.predicted_L0,
      approaches: r.observed_L,
      fractionalGap: r.agreement,
      units: 'Lorenz number L (W·Ω·K⁻²); degenerate-limit consistency, material spread ~10% (caveat)',
      provenance: r.observation.provenance,
    };
  },
};

const be62Entry: ConfrontationEntry = {
  bridgeId: 62,
  title: 'BCS gap ratio 2Δ/k_BT_c=3.528 vs weak-coupling superconductors (Tinkham)',
  kind: 'consistency',
  run() {
    const r = confrontBE62();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.agreement,
      units: '2Δ(0)/k_BT_c; weak-coupling class ~3.5, strong-coupling to ~4.3 (caveat)',
      provenance: r.observation.provenance,
    };
  },
};

const be63Entry: ConfrontationEntry = {
  bridgeId: 63,
  title: 'Chandrasekhar mass ~1.4 M_⊙ vs white-dwarf max (Shapiro-Teukolsky)',
  kind: 'consistency',
  run() {
    const r = confrontBE63();
    return {
      kind: 'consistency',
      predicted: r.predicted_solar,
      approaches: r.observed_solar,
      fractionalGap: r.agreement,
      units: 'M_⊙; WD max ~1.35 vs M_Ch~1.44 (upper-bound; super-Chandrasekhar SNe caveat)',
      provenance: r.observation.provenance,
    };
  },
};

const be64Entry: ConfrontationEntry = {
  bridgeId: 64,
  title: 'Eddington luminosity vs peak accretion ratio (Rybicki-Lightman)',
  kind: 'consistency',
  run() {
    const r = confrontBE64();
    return {
      kind: 'consistency',
      predicted: r.predicted_ratio,
      approaches: r.observed_ratio,
      fractionalGap: r.agreement,
      units: 'peak L/L_Edd (order unity; super-Eddington ULX caveat)',
      provenance: r.observation.provenance,
    };
  },
};

const be65Entry: ConfrontationEntry = {
  bridgeId: 65,
  title: 'Jeans mass vs molecular-cloud fragmentation scale (Binney-Tremaine)',
  kind: 'consistency',
  run() {
    const r = confrontBE65();
    return {
      kind: 'consistency',
      predicted: r.predicted_solar,
      approaches: r.observed_solar,
      fractionalGap: r.agreement,
      units: 'M_⊙; order-of-magnitude collapse scale (convention-dependent prefactor caveat)',
      provenance: r.observation.provenance,
    };
  },
};

const REGISTRY = new Map<number, ConfrontationEntry>([
  [11, be11Entry],
  [55, be55Entry],
  [56, be56Entry],
  [58, be58Entry],
  [59, be59Entry],
  [60, be60Entry],
  [61, be61Entry],
  [62, be62Entry],
  [63, be63Entry],
  [64, be64Entry],
  [65, be65Entry],
  [21, be21Entry],
  [35, be35Entry],
  [23, be23Entry],
  [36, be36Entry],
  [37, be37Entry],
  [48, be48Entry],
  [51, be51Entry],
  [52, be52Entry],
]);

/** The registry (frozen view). @public */
export const CONFRONTATIONS: ReadonlyMap<number, ConfrontationEntry> = REGISTRY;

/** All entries, in ascending bridge-id order. @public */
export function listConfrontations(): ConfrontationEntry[] {
  return [...REGISTRY.values()].sort((a, b) => a.bridgeId - b.bridgeId);
}

/** Run one confrontation; `undefined` if the id is not registered. @public */
export function runConfrontation(bridgeId: number): ConfrontationOutcome | undefined {
  return REGISTRY.get(bridgeId)?.run();
}
