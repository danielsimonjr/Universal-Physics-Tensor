/**
 * Quantum bridges (quantum-classical, information-physical, quantum-biology, quantum-foundations).
 *
 * Catalog edge definitions, split by physics domain from the former
 * `catalog-full.ts` god-file (re-exported via `catalog-full.ts`).
 *
 * @module composition/edges/catalog-quantum
 */

import { DIMENSIONLESS, FREQUENCY } from '../../dimensional/types.js';
import type { ExprNode } from '../../dimensional/validator.js';
import { sym } from '../../dimensional/ast-builders.js';
import { evaluateDNATunneling } from '../../bridges/equations/be-26-dna-tunneling.js';
import { evaluateDecoherenceRate } from '../../bridges/equations/be-11-decoherence-master.js';
import { evaluateEinsteinTrace } from '../../bridges/equations/be-13-einstein-trace.js';
import { evaluateFRETEfficiency } from '../../bridges/equations/be-24-foerster-fret.js';
import { evaluateIntrinsicInformation } from '../../bridges/equations/be-25-iit-phi.js';
import { evaluateQuantumDarwinism } from '../../bridges/equations/be-49-quantum-darwinism.js';
import type { BridgeEdge } from '../edge.js';
import {
  advancedFieldAmplitudeQ,
  attemptFrequencyQ,
  barrierHeightQ,
  barrierWidthQ,
  biologicalRateCorrectionQ,
  conditionalProbabilityQ,
  cosmologicalConstantCurvatureQ,
  darwinismDecayExponentQ,
  darwinismMagnitudeQ,
  decoherenceRateQ,
  donorAcceptorDistanceQ,
  foersterRadiusQ,
  fragmentCountQ,
  fragmentMutualInformationQ,
  fretEfficiencyQ,
  intrinsicInformationQ,
  marginalProbabilityQ,
  mutationRateQ,
  referenceCouplingQ,
  relaxationRateQ,
  retardedFieldAmplitudeQ,
  ricciScalarQ,
  stressEnergyTraceQ,
  systemEnvironmentCouplingQ,
  timeSymmetricFieldAmplitudeQ,
  totalMutualInformationQ,
  tunnelingMassQ,
} from '../quantities.js';
import { isFin } from './_catalog-helpers.js';

/** γ_k = γ_0 (λ / λ_0)², leaves in graph quantity names. */
const BE11_MASTER_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '*',
  args: [
    sym('relaxation-rate', FREQUENCY),
    {
      kind: 'op',
      op: '^',
      args: [
        {
          kind: 'op',
          op: '/',
          args: [
            sym('system-environment-coupling', DIMENSIONLESS),
            sym('reference-coupling', DIMENSIONLESS),
          ],
        },
        sym('2', DIMENSIONLESS),
      ],
    },
  ],
};

/**
 * BE-11 canonical decoherence master rate (Caldeira-Leggett weak-coupling
 * form): (relaxation-rate, system-environment-coupling, reference-coupling) →
 * γ_k = γ_0 (λ/λ_0)². Wraps `evaluateDecoherenceRate` (γ_0 in s⁻¹, λ/λ_0 in
 * any consistent unit; returns s⁻¹). DISTINCT from {@link be11ZurekEdge}: that
 * one is the SPATIAL specialization (λ₀ = thermal de Broglie wavelength); this
 * is the bare coupling-ratio master rate. Both wrap the same evaluator but on
 * different source quantities.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be11Edge: BridgeEdge = {
  id: 'be-11-master',
  beId: 11,
  kind: 'bridge',
  label: 'Decoherence master rate γ_k = γ_0 (λ/λ_0)²',
  sources: [relaxationRateQ, systemEnvironmentCouplingQ, referenceCouplingQ],
  target: decoherenceRateQ,
  confidence: 'established',
  domain: {
    description: 'γ_0 ≥ 0, λ finite, λ_0 > 0',
    predicate: (i) =>
      isFin(i['relaxation-rate']) &&
      i['relaxation-rate'] >= 0 &&
      isFin(i['system-environment-coupling']) &&
      isFin(i['reference-coupling']) &&
      i['reference-coupling'] > 0,
  },
  evaluate: (i) =>
    evaluateDecoherenceRate({
      gamma0_per_s: i['relaxation-rate'],
      lambda: i['system-environment-coupling'],
      lambda0: i['reference-coupling'],
    }),
  symbolic: BE11_MASTER_SYMBOLIC,
  citation: 'Caldeira & Leggett 1983 Physica A 121:587; Lindblad 1976 CMP 48:119',
  // -- Atlas Phase 1 overlay: mirrors BRIDGE_EQUATIONS' BE-11 row, which carries
  // the full '// source:' citation. tests/atlas/audited-catalog.test.ts
  // deep-equals the two, so this copy cannot silently drift from the row.
  relation: {
    type: 'coarse-graining',
    transformation:
      'rho_total on (system (x) environment) -> rho = Tr_env rho_total, under ' +
      'Born-Markov (weak coupling; environment correlation time << system ' +
      'relaxation time)',
  },
};

/**
 * BE-13 trace of Einstein equations: (cosmological-constant-curvature,
 * stress-energy-trace) → R = 4Λ − (8πG/c⁴) T. Wraps `evaluateEinsteinTrace`
 * (Λ in m⁻², T in J/m³; returns R in m⁻²). Shares the `ricci-scalar` target
 * with {@link be31Edge}.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be13Edge: BridgeEdge = {
  id: 'be-13',
  beId: 13,
  kind: 'bridge',
  label: 'Einstein trace R = 4Λ − (8πG/c⁴) T',
  sources: [cosmologicalConstantCurvatureQ, stressEnergyTraceQ],
  target: ricciScalarQ,
  confidence: 'speculative',
  domain: {
    description: 'Λ and T finite (all SI)',
    predicate: (i) =>
      isFin(i['cosmological-constant-curvature']) &&
      isFin(i['stress-energy-trace']),
  },
  evaluate: (i) =>
    evaluateEinsteinTrace({
      Lambda_per_m2: i['cosmological-constant-curvature'],
      T_trace_J_per_m3: i['stress-energy-trace'],
    }),
  citation: 'Jacobson 1995 PRL 75:1260; MTW Gravitation §17.4',
};

/**
 * BE-24 Förster FRET efficiency: (donor-acceptor-distance, foerster-radius) →
 * η = R_0⁶/(R_0⁶ + R⁶). Wraps `evaluateFRETEfficiency` (R, R_0 in m; returns
 * dimensionless ∈ [0,1]).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be24Edge: BridgeEdge = {
  id: 'be-24',
  beId: 24,
  kind: 'bridge',
  label: 'FRET efficiency η = R_0⁶/(R_0⁶ + R⁶)',
  sources: [donorAcceptorDistanceQ, foersterRadiusQ],
  target: fretEfficiencyQ,
  confidence: 'speculative',
  domain: {
    description: 'R > 0 and R_0 > 0',
    predicate: (i) =>
      isFin(i['donor-acceptor-distance']) &&
      i['donor-acceptor-distance'] > 0 &&
      isFin(i['foerster-radius']) &&
      i['foerster-radius'] > 0,
  },
  evaluate: (i) =>
    evaluateFRETEfficiency({
      R: i['donor-acceptor-distance'],
      R_0: i['foerster-radius'],
    }),
  citation: 'Förster 1948 Ann. Phys. 437:55; Lakowicz 2006 Princ. Fluoresc. Spectrosc. Ch.13',
};

/**
 * BE-25 IIT intrinsic information (the IIT module, NOT orch-or):
 * (conditional-probability, marginal-probability) → ii = p_cond·log₂(p_cond/p_marg).
 * Wraps `evaluateIntrinsicInformation` (both ∈ [0,1]; returns bits). Note the
 * evaluator throws RangeError on the KL singularity p_cond>0, p_marg=0; the
 * domain rejects that case so `evaluateEdge` surfaces a DomainViolationError
 * instead.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be25Edge: BridgeEdge = {
  id: 'be-25',
  beId: 25,
  kind: 'bridge',
  label: 'IIT intrinsic information ii = p(s̃|s)·log₂[p(s̃|s)/p(s̃)]',
  sources: [conditionalProbabilityQ, marginalProbabilityQ],
  target: intrinsicInformationQ,
  confidence: 'speculative',
  domain: {
    description: 'p_cond, p_marg ∈ [0,1]; not (p_cond>0 and p_marg=0) (KL singularity)',
    predicate: (i) => {
      const pc = i['conditional-probability'];
      const pm = i['marginal-probability'];
      if (!isFin(pc) || pc < 0 || pc > 1) return false;
      if (!isFin(pm) || pm < 0 || pm > 1) return false;
      if (pc > 0 && pm === 0) return false;
      return true;
    },
  },
  evaluate: (i) =>
    evaluateIntrinsicInformation({
      p_cond: i['conditional-probability'],
      p_marg: i['marginal-probability'],
    }),
  citation: 'Tononi 2008 Biol. Bull. 215:216; Oizumi, Albantakis & Tononi 2014 PLoS Comput. Biol. 10:e1003588',
};

/**
 * BE-26 DNA mutation tunneling rate: (attempt-frequency, tunneling-mass,
 * barrier-height, barrier-width, biological-rate-correction) →
 * Γ = ν₀ exp[−(2/ℏ)√(2m(V−E))·L]·f. Wraps `evaluateDNATunneling` (SI; returns
 * s⁻¹). `tunneling-mass` is the proton mass, DISTINCT from gravitational `mass`.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be26Edge: BridgeEdge = {
  id: 'be-26',
  beId: 26,
  kind: 'bridge',
  label: 'DNA tunneling Γ = ν₀ exp[−(2/ℏ)√(2m(V−E))·L]·f',
  sources: [attemptFrequencyQ, tunnelingMassQ, barrierHeightQ, barrierWidthQ, biologicalRateCorrectionQ],
  target: mutationRateQ,
  // Catalog index status: field is authoritative (CLAUDE.md). BE-26's
  // module docstring says 'established' but the registry pins 'speculative'.
  confidence: 'speculative',
  domain: {
    description: 'ν₀ ≥ 0, m > 0, V−E ≥ 0, barrier-width > 0, f finite',
    predicate: (i) =>
      isFin(i['attempt-frequency']) &&
      i['attempt-frequency'] >= 0 &&
      isFin(i['tunneling-mass']) &&
      i['tunneling-mass'] > 0 &&
      isFin(i['barrier-height']) &&
      i['barrier-height'] >= 0 &&
      isFin(i['barrier-width']) &&
      i['barrier-width'] > 0 &&
      isFin(i['biological-rate-correction']),
  },
  evaluate: (i) =>
    evaluateDNATunneling({
      nu_0: i['attempt-frequency'],
      m: i['tunneling-mass'],
      V_minus_E: i['barrier-height'],
      barrier_width: i['barrier-width'],
      f_correction: i['biological-rate-correction'],
    }),
  citation: 'Löwdin 1963 Adv. Quantum Chem. 2:213; Gamow 1928',
};

/**
 * BE-49 quantum-Darwinism mutual-information decay: (total-mutual-information,
 * darwinism-magnitude, fragment-count, darwinism-decay-exponent) →
 * I(S:F_k) = I(S:E) − α k^(−β). Wraps `evaluateQuantumDarwinism` (all
 * dimensionless; the evaluator is β-agnostic).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be49Edge: BridgeEdge = {
  id: 'be-49',
  beId: 49,
  kind: 'bridge',
  label: 'Quantum Darwinism I(S:F_k) = I(S:E) − α k^(−β)',
  sources: [totalMutualInformationQ, darwinismMagnitudeQ, fragmentCountQ, darwinismDecayExponentQ],
  target: fragmentMutualInformationQ,
  confidence: 'speculative',
  domain: {
    description: 'I(S:E), α, β finite; k > 0',
    predicate: (i) =>
      isFin(i['total-mutual-information']) &&
      isFin(i['darwinism-magnitude']) &&
      isFin(i['fragment-count']) &&
      i['fragment-count'] > 0 &&
      isFin(i['darwinism-decay-exponent']),
  },
  evaluate: (i) =>
    evaluateQuantumDarwinism({
      I_SE: i['total-mutual-information'],
      alpha: i['darwinism-magnitude'],
      k: i['fragment-count'],
      beta: i['darwinism-decay-exponent'],
    }),
  citation: 'Zurek 2009 Nat. Phys. 5:181; Blume-Kohout & Zurek 2006 PRA 73:062310',
};

const BE50_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '/',
  args: [
    {
      kind: 'op',
      op: '+',
      args: [
        sym(retardedFieldAmplitudeQ.name, retardedFieldAmplitudeQ.dim),
        sym(advancedFieldAmplitudeQ.name, advancedFieldAmplitudeQ.dim),
      ],
    },
    sym('2', DIMENSIONLESS),
  ],
};

/**
 * BE-50 Wheeler-Feynman time-symmetric field:
 * A = (A_ret + A_adv)/2. This is the catalog `formula_latex` and the
 * PhysJS statement. The residual r = (A_ret − A_adv)/(A_ret + A_adv)
 * remains `evaluateWFTimeSymmetry` and `time-symmetry-residual`; it is
 * not the theorem, so the edge no longer evaluates it.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be50Edge: BridgeEdge = {
  id: 'be-50',
  beId: 50,
  kind: 'bridge',
  label: 'Wheeler-Feynman A = (A_ret + A_adv)/2',
  sources: [retardedFieldAmplitudeQ, advancedFieldAmplitudeQ],
  target: timeSymmetricFieldAmplitudeQ,
  confidence: 'highly-speculative',
  domain: {
    description: 'A_ret and A_adv finite',
    predicate: (i) =>
      isFin(i['retarded-field-amplitude']) && isFin(i['advanced-field-amplitude']),
  },
  evaluate: (i) =>
    (i['retarded-field-amplitude'] + i['advanced-field-amplitude']) / 2,
  symbolic: BE50_SYMBOLIC,
  citation: 'Wheeler & Feynman 1945 RMP 17:157; Cramer 1986 RMP 58:647',
};
