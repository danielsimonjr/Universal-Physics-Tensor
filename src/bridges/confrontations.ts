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
 * purely computed: e.g. be-11's ratio is exactly 1 (actual difference 0) but its real
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
  [11, 'loose'], // decoherence ~15% gas-to-gas (an actual difference of 0 hides it)
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
      preprocessing: {
        state: 'recorded',
        statement:
          'observed is the ANOMALOUS advance: the residual left after subtracting the Newtonian planetary perturbations (Le Verrier / Newcomb / Clemence)',
        source: [
          { file: 'src/bridges/be52-mercury-confrontation.ts', quote: 'precession — the residual left after subtracting the Newtonian planetary' },
          { file: 'src/bridges/be52-mercury-confrontation.ts', quote: 'Measured ANOMALOUS perihelion advance (″/Julian century) — the GR residual.' },
        ],
      },
      independence: { state: 'not-recorded' },
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
      preprocessing: {
        state: 'recorded',
        statement:
          "the source converts the T-linear resistivity slope to α via the Drude relation ρ = m*/(n e² τ); only its abstract-level aggregate (α within ~×2 of 1) is encoded, as α = 1.0 ± 0.4, an additive σ narrower than the paper's multiplicative factor-2 spread; the per-material table was not reproduced",
        source: [
          { file: 'src/bridges/be23-planckian-confrontation.ts', quote: 'ρ = m* / (n e² τ), into a Planckian scattering coefficient α defined by' },
          { file: 'src/bridges/be23-planckian-confrontation.ts', quote: 'The per-material α table from Legros et al. was NOT reproduced here:' },
          { file: 'src/bridges/be23-planckian-confrontation.ts', quote: 'α = 1.0 ± 0.4 (i.e., α is O(1), within roughly a factor of 2 of the' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the predicted α = 1 is the Planckian reference fixed in the encoding, not fitted to this data; BE-23 does not predict α (α_SYK is a free O(1) coefficient), so this checks the O(1) assumption, not a prediction',
        source: [
          { file: 'src/bridges/be23-planckian-confrontation.ts', quote: 'NOT claimed: that UPT/SYK *predicts* α (BE-23 bundles α_SYK as a' },
        ],
      },
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
      preprocessing: {
        state: 'recorded',
        statement:
          "both bounds are recomputed from the observed 1.74 s GW-to-GRB lag at the paper's conservative lower distance 26 Mpc (not the 40 Mpc central value); the upper bound attributes the whole lag to faster GW travel, the lower bound assumes an intrinsic EM emission delay of at most 10 s",
        source: [
          { file: 'src/bridges/be36-gw170817-confrontation.ts', quote: "with the paper's CONSERVATIVE lower distance bound D = 26 Mpc" },
          { file: 'src/bridges/be36-gw170817-confrontation.ts', quote: '(attributes the whole observed' },
          { file: 'src/bridges/be36-gw170817-confrontation.ts', quote: '(assumes a 10 s intrinsic EM' },
        ],
      },
      independence: {
        state: 'shares-input',
        shared: 'GW170817 itself',
        statement:
          "the encoded range |Δv|/c ≤ 1e-15 is the bridge's canonical GW170817 bound, so the comparison checks the encoding against the observation it was named for, not an independent prediction",
        source: [
          { file: 'src/bridges/equations/be-36-gw-speed-bound.ts', quote: 'Canonical GW170817 upper bound on |Δv|/c.' },
        ],
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
      preprocessing: { state: 'not-recorded' },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the prediction is γ = 1 exactly, fixed by the encoded GR Shapiro form; it takes no input parameter',
        source: [
          { file: 'src/bridges/be37-cassini-confrontation.ts', quote: 'so the predicted PPN gamma is exactly 1' },
          { file: 'src/bridges/be37-cassini-confrontation.ts', quote: 'const predicted_gamma = 1;' },
        ],
      },
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
      preprocessing: {
        state: 'recorded',
        statement:
          'the bound was derived by Carlesso et al. from the LISA-Pathfinder data (Armano et al. 2016) for the CSL model at r_C = 100 nm; it is compared with the GRW single-nucleon rate, a related but distinct model',
        source: [
          { file: 'src/bridges/be48-collapse-confrontation.ts', quote: 'LISA-Pathfinder data Armano et al. 2016' },
          { file: 'src/bridges/be48-collapse-confrontation.ts', quote: 'λ ≤ 2.96×10⁻⁸ s⁻¹ (r_C = 100 nm)' },
          { file: 'src/bridges/be48-collapse-confrontation.ts', quote: 'MODEL CAVEAT: GRW and CSL are related-but-distinct collapse models; this' },
        ],
      },
      independence: { state: 'not-recorded' },
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
      preprocessing: {
        state: 'recorded',
        statement:
          'the source reports γ − 1 = (−0.8 ± 1.2)×10⁻⁴; the repo converts it to a deflection as (1+γ)/2 × the predicted solar-limb value, and σ likewise',
        source: [
          { file: 'src/bridges/be51-lensing-confrontation.ts', quote: 'γ − 1 = (−0.8 ± 1.2)×10⁻⁴' },
          { file: 'src/bridges/be51-lensing-confrontation.ts', quote: 'const scaling = (1 + obs.observed_gamma) / 2;' },
          { file: 'src/bridges/be51-lensing-confrontation.ts', quote: 'const observed_sigma_arcsec = (obs.observed_gamma_sigma / 2) * predicted_arcsec;' },
        ],
      },
      independence: {
        state: 'shares-input',
        shared: 'the solar-limb baseline 4GM☉/(R☉c²) (GM☉ IAU 2015 nominal, R☉ = 6.957e8 m)',
        statement:
          'the derived deflection is the predicted value scaled by the measured γ, so the baseline cancels and the residual is |γ − 1|/σ_γ: the test is of γ alone',
        source: [
          { file: 'src/bridges/be51-lensing-confrontation.ts', quote: 'const observed_arcsec = scaling * predicted_arcsec;' },
          { file: 'src/bridges/be51-lensing-confrontation.ts', quote: 'const SOLAR_RADIUS_M = 6.957e8;' },
        ],
      },
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
      fractionalGapIs: 'observed-difference',
      predictedIs: 'lower-limit',
      units: 'η/s (ℏ/k_B units); KSS lower bound 1/(4π), observed satisfies + nearly saturates',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'η/s is temperature-dependent; the Bayesian hydrodynamic extraction from RHIC/LHC flow observables gives a minimum near T_c spanning ~0.08–0.15 across analyses, and the record takes 0.10 as representative, with no σ',
        source: [
          { file: 'src/bridges/be21-kss-confrontation.ts', quote: 'Bayesian eta/s extraction from RHIC/LHC heavy-ion flow observables' },
          { file: 'src/bridges/be21-kss-confrontation.ts', quote: 'eta/s is temperature-dependent; the extracted minimum near T_c spans ~0.08-0.15 (hbar/k_B units) across analyses, representative ~0.10.' },
          { file: 'src/bridges/be21-kss-confrontation.ts', quote: 'observed_eta_over_s: 0.1,' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the KSS bound 1/(4π) contains no parameter; the record states the η/s extraction from flow observables is independent of the bound, not a recompute of 1/(4π)',
        source: [
          { file: 'src/bridges/be21-kss-confrontation.ts', quote: 'INDEPENDENT hydrodynamic extraction (flow observables), not a recompute of 1/(4pi).' },
        ],
      },
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
      preprocessing: {
        state: 'recorded',
        statement:
          'observed ν is an experimental average over liquid-vapor and binary-fluid critical points compiled by Pelissetto & Vicari 2002; Monte-Carlo values were deliberately excluded from the observed slot',
        source: [
          { file: 'src/bridges/be35-bootstrap-confrontation.ts', quote: 'experimental average over liquid-vapor / binary-fluid critical points' },
          { file: 'src/bridges/be35-bootstrap-confrontation.ts', quote: 'were deliberately NOT used for the observed slot' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the record states the bootstrap ν (from Δ_ε = 1.412625(10), Kos et al. 2016) is a parameter-free CFT prediction and the experimental ν an independent determination, not a recompute',
        source: [
          { file: 'src/bridges/be35-bootstrap-confrontation.ts', quote: 'INDEPENDENT determination (real critical systems), not a recompute of the bootstrap.' },
          { file: 'src/bridges/be35-bootstrap-confrontation.ts', quote: 'Delta_epsilon = 1.412625(10)' },
        ],
      },
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
      // The module's stated tolerance (the source's ~15% experimental uncertainty); the actual
      // difference is computed by `consistencyComparison`, never read from this field.
      fractionalGap: r.observation.tolerance,
      fractionalGapIs: 'agreement-bound',
      units:
        'p₀(theory)/p₀(exp) ratio; parameter-free 9-gas agreement within 15% experimental error',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'the source compares theory and experiment in a figure (Fig 3) with no tabulated pair; its stated agreement across 9 gases within ~15% is encoded as ratio 1.0 with a 15% tolerance, not transcribed per gas',
        source: [
          { file: 'src/bridges/be11-decoherence-confrontation.ts', quote: 'figure (Fig 3), so there is no clean tabulated pair, and this module encodes' },
          { file: 'src/bridges/be11-decoherence-confrontation.ts', quote: 'observed_ratio: 1.0,' },
          { file: 'src/bridges/be11-decoherence-confrontation.ts', quote: 'tolerance: DECOHERENCE_EXPERIMENTAL_TOLERANCE,' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the source states its calculation "contains no adjustable parameters"',
        source: [
          { file: 'src/bridges/be11-decoherence-confrontation.ts', quote: 'our calculation, which contains no adjustable parameters, agrees well' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'R_H(graphene)/R_H(GaAs) ratio; topological universality to 8.6e-11',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          "the source's graphene-vs-GaAs agreement to a relative 8.6e-11 is encoded as ratio 1 with that relative uncertainty; no measured ratio value is transcribed",
        source: [
          { file: 'src/bridges/be55-quantum-hall-confrontation.ts', quote: 'observed_ratio: 1,' },
          { file: 'src/bridges/be55-quantum-hall-confrontation.ts', quote: 'relative_uncertainty: 8.6e-11,' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the predicted ratio is 1 with no parameter; R_K = h/e² is exact by the post-2019 SI, and the material-to-material ratio tests universality, not that definitional value',
        source: [
          { file: 'src/bridges/be55-quantum-hall-confrontation.ts', quote: 'Post-2019 SI fixes h and e exactly, so R_K = h/e² is exact BY DEFINITION and' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'measured/theory force ratio; ~1% agreement (corrected theory, systematics-dominated)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'sphere-plate measurement compared with theory corrected for finite conductivity, surface roughness, temperature and electrostatic patches; the ~1% agreement is at the smallest separation and is encoded as ratio 1 with 1% agreement',
        source: [
          { file: 'src/bridges/be56-casimir-confrontation.ts', quote: 'require finite-conductivity/surface-roughness/temperature/electrostatic-patch corrections' },
          { file: 'src/bridges/be56-casimir-confrontation.ts', quote: 'corrected theory to ~1% at the smallest separation' },
          { file: 'src/bridges/be56-casimir-confrontation.ts', quote: 'agreement: 0.01,' },
        ],
      },
      independence: { state: 'not-recorded' },
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
      preprocessing: { state: 'not-recorded' },
      independence: {
        state: 'shares-input',
        shared: 'the CODATA 2014 k_B (the predicted value is this reference constant, not a bridge output) and a resistance calibration traceable to the quantum Hall effect (the physics of be-55)',
        statement:
          'the record states resistance (QHE) and temperature (acoustic/ITS-90) are traceable independently of the noise relation; whether this measurement entered the CODATA 2014 adjustment is not recorded',
        source: [
          { file: 'src/bridges/be58-johnson-nyquist-confrontation.ts', quote: 'const predicted_k_B = K_B_CODATA_2014;' },
          { file: 'src/bridges/be58-johnson-nyquist-confrontation.ts', quote: 'resistance traceable to the quantum Hall effect (BE-55), temperature to acoustic/ITS-90 thermometry, both independent of the noise relation' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'V(junction A)/V(junction B) ratio; Josephson-volt universality to ~1e-9',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'the parts-in-10⁹ agreement of independently built Josephson standards is encoded as a junction-to-junction ratio of 1 with a conservative 1e-9 bound (best comparisons reach ~1e-10 to 1e-11)',
        source: [
          { file: 'src/bridges/be59-ac-josephson-confrontation.ts', quote: 'Conservative 1e-9 bound; the best comparisons reach ~1e-10 to 1e-11.' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the predicted ratio is 1 with no parameter; K_J = 2e/h is exact by the post-2019 SI, and the junction independence, not that definitional value, is what is tested',
        source: [
          { file: 'src/bridges/be59-ac-josephson-confrontation.ts', quote: 'K_J = 2e/h is exact by the SI, so confronting its value is circular.' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'R_xy(plateau)/(3·R_K) ratio; the ⅓ fraction (topological order) to ~1e-5',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'the fractional quantization confirmed to ~1e-5 in high-mobility samples is encoded as R_xy/(3·R_K) = 1 with a conservative 1e-5 bound',
        source: [
          { file: 'src/bridges/be60-fractional-qh-confrontation.ts', quote: 'High-mobility samples confirm the fractional quantization to ~1e-5; conservative bound' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the predicted fraction 1/3 has no parameter; R_K is definitional (post-2019 SI), so the fraction is what is tested, and the record states no single-particle theory predicts it',
        source: [
          { file: 'src/bridges/be60-fractional-qh-confrontation.ts', quote: 'Non-circular: no single-particle theory predicts the 1/3.' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'Lorenz number L (W·Ω·K⁻²); degenerate-limit consistency, material spread ~10% (caveat)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          "the source's recovery of L₀ in high-RRR silver is encoded as observed = L₀; the 10% figure is the stated material-spread bound (Cu at 0 °C ~9% low), not a measured gap",
        source: [
          { file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', quote: 'L_measured: LORENZ_NUMBER_SI, // degenerate limit recovers L₀' },
          { file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', quote: 'Real metals deviate — Cu@0°C ~2.23e-8 (~9% low)' },
          { file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', quote: 'The ~10% bound covers the material spread' },
        ],
      },
      independence: {
        state: 'shares-input',
        shared: 'the value itself: the observed slot is the predicted constant L₀ = (π²/3)(k_B/e)²',
        statement:
          "observed equals predicted by construction, so this record cannot show a discrepancy; it records the source's statement, not an independent number",
        source: [
          { file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', quote: 'const predicted_L0 = LORENZ_NUMBER_SI;' },
          { file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', quote: 'L_measured: LORENZ_NUMBER_SI,' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: '2Δ(0)/k_BT_c; weak-coupling class ~3.5, strong-coupling to ~4.3 (caveat)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'a representative weak-coupling value (Sn ~3.5) fills the observed slot; the class spans Al ~3.4 to strong-coupling Pb ~4.3, which is not used; 5% is the stated agreement bound',
        source: [
          { file: 'src/bridges/be62-bcs-gap-confrontation.ts', quote: 'ratio_measured: 3.5, // Sn, weak-coupling' },
          { file: 'src/bridges/be62-bcs-gap-confrontation.ts', quote: 'Real conventional superconductors range from a little below 3.5 (Al) to' },
          { file: 'src/bridges/be62-bcs-gap-confrontation.ts', quote: 'agreement: 0.05,' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'the weak-coupling ratio 2π/e^γ ≈ 3.528 is a pure number with no material parameter',
        source: [
          { file: 'src/bridges/be62-bcs-gap.ts', symbol: 'BCS_GAP_RATIO' },
          { file: 'src/bridges/be62-bcs-gap.ts', quote: 'export const BCS_GAP_RATIO = (2 * Math.PI) / Math.exp(EULER_GAMMA);' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'M_⊙; WD max ~1.35 vs M_Ch~1.44 (upper-bound; super-Chandrasekhar SNe caveat)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'observed is the highest reliably measured white-dwarf mass (~1.35 M_⊙); super-Chandrasekhar SN Ia progenitor inferences (2.4–2.8 M_⊙) are not used for the observed slot; 12% is the stated agreement bound',
        source: [
          { file: 'src/bridges/be63-chandrasekhar-mass-confrontation.ts', quote: 'mass (~1.35 M_⊙, the highest reliably measured)' },
          { file: 'src/bridges/be63-chandrasekhar-mass-confrontation.ts', quote: 'M_observed_solar: 1.35,' },
          { file: 'src/bridges/be63-chandrasekhar-mass-confrontation.ts', quote: '2006gz/2007if/2009dc) imply progenitor masses up to 2.4–2.8 M_⊙ via rotation' },
          { file: 'src/bridges/be63-chandrasekhar-mass-confrontation.ts', quote: 'agreement: 0.12,' },
        ],
      },
      independence: {
        state: 'no-fitted-parameter',
        statement:
          'M_Ch is evaluated from ℏ, c, G and the atomic mass unit at μ_e = 2, with no parameter taken from white-dwarf masses',
        source: [
          { file: 'src/bridges/be63-chandrasekhar-mass-confrontation.ts', quote: 'evaluateChandrasekharMass({ mu_e: 2 })' },
          { file: 'src/bridges/be63-chandrasekhar-mass.ts', quote: 'Math.pow((HBAR_SI * C_SI) / G_SI, 1.5) * Math.pow(mu_e * M_U_SI, -2)' },
        ],
      },
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
      fractionalGapIs: 'agreement-bound',
      units: 'peak L/L_Edd (order unity; super-Eddington ULX caveat)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'observed is the peak Eddington ratio of the brightest sub-Eddington AGN/X-ray binaries, encoded as 1 with an order-unity (50%) bound; super-Eddington sources (ULX pulsars) are not in the observed slot',
        source: [
          { file: 'src/bridges/be64-eddington-luminosity-confrontation.ts', symbol: 'EddingtonRatioObservation' },
          { file: 'src/bridges/be64-eddington-luminosity-confrontation.ts', quote: 'The brightest sub-Eddington accretors saturate near L/L_Edd ≈ 1; the broad' },
          { file: 'src/bridges/be64-eddington-luminosity-confrontation.ts', quote: 'observed_ratio: 1,' },
          { file: 'src/bridges/be64-eddington-luminosity-confrontation.ts', quote: 'agreement: 0.5,' },
        ],
      },
      independence: { state: 'not-recorded' },
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
      fractionalGapIs: 'agreement-bound',
      units: 'M_⊙; order-of-magnitude collapse scale (convention-dependent prefactor caveat)',
      provenance: r.observation.provenance,
      preprocessing: {
        state: 'recorded',
        statement:
          'the Jeans mass is evaluated at dense core-forming conditions (T = 10 K, ρ ≈ 3.8e-16 kg/m³ ~ 10⁵ cm⁻³ of H₂, μ = 2.3), not at cloud-average density where M_J is tens of M_⊙; 150% is the stated agreement bound',
        source: [
          { file: 'src/bridges/be65-jeans-mass-confrontation.ts', quote: 'Dense core-forming conditions (T=10 K, ρ≈3.8×10⁻¹⁶ kg/m³ ~ 10⁵ cm⁻³ of H₂,' },
          { file: 'src/bridges/be65-jeans-mass-confrontation.ts', quote: '(At cloud-AVERAGE density M_J is tens of M_⊙ — the well-known "Jeans mass' },
          { file: 'src/bridges/be65-jeans-mass-confrontation.ts', quote: 'agreement: 1.5,' },
        ],
      },
      independence: {
        state: 'shares-input',
        shared: "the cloud conditions T, ρ, μ: the prediction is evaluated at the observation record's own conditions",
        statement:
          'the module chose them as the conditions where fragmentation occurs; whether they were chosen independently of the ~1 M_⊙ core scale is not recorded',
        source: [
          { file: 'src/bridges/be65-jeans-mass-confrontation.ts', symbol: 'MOLECULAR_CLOUD_FRAGMENT' },
          { file: 'src/bridges/be65-jeans-mass-confrontation.ts', quote: 'evaluateJeansMass({ T_K: obs.T_K, rho_kg_per_m3: obs.rho_kg_per_m3, mu: obs.mu })' },
        ],
      },
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
