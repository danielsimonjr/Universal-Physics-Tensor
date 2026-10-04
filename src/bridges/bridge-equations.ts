/**
 * `BridgeEquations` — a convenience facade over the per-bridge evaluators.
 *
 * Every catalogued bridge ships a self-contained evaluator. BE-11…50 and
 * BE-53/54 live under `src/bridges/equations/`; BE-51/52 and BE-55…65 use
 * dedicated bridge modules. This facade gathers one evaluator for every live
 * catalog id under readable root-level method names, so a
 * consumer can write `BridgeEquations.decoherenceRate({...})` from the package
 * root. Each method is a **1:1 pass-through** to the existing pure function —
 * NO new physics, no recomputation; the method name simply mirrors the
 * evaluator (the `evaluate` prefix dropped).
 *
 * Scope honesty (these are NOT changed by the facade):
 *   - Methods backed by a documented typed-stub / reformulation carry that
 *     module's caveats. In particular `onsagerEntropyProduction` (BE-28) encodes
 *     the Onsager σ = ΣJX *definiendum*, NOT the MEPP maximization principle
 *     (see the ⚠ CRITICAL WARNING in be-28-onsager-entropy-production.ts).
 *   - BE-25 maps to the live IIT `intrinsicInformation`; the archived
 *     Penrose-Hameroff `evaluateOrchOR` is deliberately NOT surfaced.
 *   - BE-51/52 use the validated GR evaluators `gravitationalLensing` and
 *     `perihelionPrecession`.
 *
 * The README previously described this as "specified in Parts I–III"; the specs
 * actually specify the physics + AST encodings, not this TypeScript API, so the
 * facade is a deliberate ergonomic layer, not a spec transcription.
 *
 * @module bridges/bridge-equations
 */

import { evaluateDecoherenceRate } from './equations/be-11-decoherence-master.js';
import { evaluateThermalDeBroglie } from './equations/be-12-coherence-length.js';
import { evaluateEinsteinTrace } from './equations/be-13-einstein-trace.js';
import { evaluateRyuTakayanagi, evaluateRyuTakayanagiNatural } from './equations/be-14-ryu-takayanagi.js';
import { evaluateCoarseningLength, evaluateCoarseningLengthSquared } from './equations/be-15-emergence.js';
import { evaluateLandauerEnergy } from './equations/be-16-landauer.js';
import { evaluateBE17SpinDensitySquared } from './equations/be-17-einstein-cartan.js';
import { evaluateHiggsMass } from './equations/be-18-higgs-mass.js';
import { evaluateQuantumBounce } from './equations/be-19-quantum-bounce.js';
import { evaluateCosmologicalConstantDensity } from './equations/be-20-vacuum-energy.js';
import { evaluateKSSBound } from './equations/be-21-kss-bound.js';
import { evaluateTEE } from './equations/be-22-topological-entanglement.js';
import { evaluateSYKResistivity } from './equations/be-23-syk-planckian.js';
import { evaluateFRETEfficiency } from './equations/be-24-foerster-fret.js';
import { evaluateIntrinsicInformation } from './equations/be-25-iit-phi.js';
import { evaluateDNATunneling } from './equations/be-26-dna-tunneling.js';
import { evaluateEffectiveTemperature } from './equations/be-27-effective-temperature.js';
import { evaluateOnsagerEntropyProduction } from './equations/be-28-onsager-entropy-production.js';
import { evaluateJarzynski } from './equations/be-29-jarzynski.js';
import { evaluateBekensteinBound, evaluateFLMFirstLaw } from './equations/be-30-flm-first-law.js';
import { evaluateBenincasaDowker } from './equations/be-31-causal-set-bd.js';
import { evaluateQRFOverlap } from './equations/be-32-quantum-reference-frame.js';
import { evaluateHertzMillis } from './equations/be-33-hertz-millis.js';
import { evaluateKibbleZurek } from './equations/be-34-kibble-zurek.js';
import { evaluateCrossingEquation } from './equations/be-35-conformal-bootstrap.js';
import { evaluateGWSpeedRatio } from './equations/be-36-gw-speed-bound.js';
import { evaluateShapiroDelay } from './equations/be-37-shapiro-delay.js';
import { evaluateMONDForce } from './equations/be-38-mond.js';
import { evaluateBetaG, evaluateBetaLambda } from './equations/be-39-asymptotic-safety.js';
import { evaluateCompositeHiggs } from './equations/be-40-composite-higgs.js';
import { evaluateSwampland } from './equations/be-41-swampland.js';
import { evaluateHawkingTemperature } from './equations/be-42-hawking-temperature.js';
import { evaluateEREPRBound } from './equations/be-43-er-epr.js';
import { evaluateBE44SoftHairCharge } from './equations/be-44-soft-hair.js';
import { evaluateTCC } from './equations/be-45-tcc.js';
import { evaluateWeinbergVilenkinP } from './equations/be-46-multiverse-measure.js';
import { evaluateBBNDark } from './equations/be-47-bbn-dark-sector.js';
import { evaluateGRWLocalization } from './equations/be-48-grw-localization.js';
import { evaluateQuantumDarwinism } from './equations/be-49-quantum-darwinism.js';
import { evaluateWFTimeSymmetry } from './equations/be-50-wheeler-feynman.js';
import { evaluateYangMillsBeta } from './equations/be-53-yang-mills-beta.js';
import { evaluateRandallSundrumH2 } from './equations/be-54-randall-sundrum-brane.js';
import { evaluateGravitationalLensing } from './gravitational-lensing.js';
import { evaluatePerihelionPrecession } from './perihelion-precession.js';
import { evaluateQuantumHall } from './be55-quantum-hall.js';
import { evaluateCasimir } from './be56-casimir.js';
import { evaluateUnruh } from './be57-unruh.js';
import { evaluateJohnsonNyquist } from './be58-johnson-nyquist.js';
import { evaluateACJosephson } from './be59-ac-josephson.js';
import { evaluateFractionalQH } from './be60-fractional-qh.js';
import { evaluateWiedemannFranz } from './be61-wiedemann-franz.js';
import { evaluateBCSGap } from './be62-bcs-gap.js';
import { evaluateChandrasekharMass } from './be63-chandrasekhar-mass.js';
import { evaluateEddingtonLuminosity } from './be64-eddington-luminosity.js';
import { evaluateJeansMass } from './be65-jeans-mass.js';
import { evaluateRadiationPressure } from './be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from './be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from './be68-tolman-ehrenfest.js';
import { evaluateFastMagnetosonic } from './be69-fast-magnetosonic.js';
import { evaluateEinsteinRelation } from './be70-einstein-relation.js';
import { evaluateClapeyron } from './be71-clapeyron.js';
import { evaluateGravitationalRedshift } from './be72-gravitational-redshift.js';
import { evaluateKelvinPeltier } from './be73-kelvin-peltier.js';
import { evaluateMagneticPressure } from './be74-magnetic-pressure.js';
import { evaluateLondonPenetration } from './be75-london-penetration.js';
import { evaluatePlasmaBeta } from './be76-plasma-beta.js';
import { evaluateHagenPoiseuille } from './be77-hagen-poiseuille.js';
import { evaluateEulerBuckling } from './be78-euler-buckling.js';
import { evaluatePullIn } from './be79-pull-in.js';
import { evaluateMottGurney } from './be80-mott-gurney.js';
import { evaluateChildLangmuir } from './be81-child-langmuir.js';
import { evaluateShockleyDiode } from './be82-shockley-diode.js';
import { evaluateThomsonCoefficient } from './be83-thomson.js';
import { evaluateFourPointSheet } from './be84-four-point.js';
import { evaluateShotNoise } from './be85-shot-noise.js';
import { evaluateReynoldsAnalogy } from './be86-reynolds-analogy.js';
import { evaluateCapacitorNoise } from './be87-capacitor-noise.js';
import { evaluateFermiSea } from './be88-fermi-sea.js';
import { evaluateDebyeCutoff } from './be89-debye-cutoff.js';
import { evaluateDebyeHeat } from './be90-debye-heat.js';
import { evaluateEinsteinSolid } from './be91-einstein-solid.js';
import { evaluateSommerfeldHeat } from './be92-sommerfeld-heat.js';
import { evaluateCurieWeiss } from './be93-curie-weiss.js';
import { evaluatePauliParamagnetism } from './be94-pauli-paramagnetism.js';
import { evaluateGinzburgLandau } from './be95-ginzburg-landau.js';
import { evaluateUpperCritical } from './be96-upper-critical.js';
import { evaluateAmbegaokarBaratoff } from './be97-ambegaokar-baratoff.js';
import { evaluateBcsJump } from './be98-bcs-jump.js';
import { evaluateMassAction } from './be99-mass-action.js';
import { evaluateLyddaneSachsTeller } from './be100-lyddane-sachs-teller.js';
import { evaluateBktJump } from './be101-bkt-jump.js';
import { evaluateLandauerConductance } from './be102-landauer-conductance.js';

/**
 * Root-level facade keyed by readable method names. Each value is a re-export of
 * the bridge's existing `evaluate*()` function; the bridge ID is in the comment.
 *
 * @public
 */
export const BridgeEquations = {
  decoherenceRate: evaluateDecoherenceRate,                 // BE-11
  thermalDeBroglie: evaluateThermalDeBroglie,               // BE-12
  einsteinTrace: evaluateEinsteinTrace,                     // BE-13
  ryuTakayanagi: evaluateRyuTakayanagi,                     // BE-14
  ryuTakayanagiNatural: evaluateRyuTakayanagiNatural,       // BE-14 (natural units)
  coarseningLength: evaluateCoarseningLength,               // BE-15
  coarseningLengthSquared: evaluateCoarseningLengthSquared, // BE-15 (squared form)
  landauerEnergy: evaluateLandauerEnergy,                   // BE-16
  spinDensitySquared: evaluateBE17SpinDensitySquared,       // BE-17
  higgsMass: evaluateHiggsMass,                             // BE-18
  quantumBounce: evaluateQuantumBounce,                     // BE-19
  cosmologicalConstantDensity: evaluateCosmologicalConstantDensity, // BE-20
  kssBound: evaluateKSSBound,                               // BE-21 (no-arg constant)
  topologicalEntanglementEntropy: evaluateTEE,              // BE-22
  sykResistivity: evaluateSYKResistivity,                   // BE-23
  fretEfficiency: evaluateFRETEfficiency,                   // BE-24
  intrinsicInformation: evaluateIntrinsicInformation,       // BE-25 (IIT; OrchOR archived)
  dnaTunneling: evaluateDNATunneling,                       // BE-26
  effectiveTemperature: evaluateEffectiveTemperature,       // BE-27
  onsagerEntropyProduction: evaluateOnsagerEntropyProduction, // BE-28 (definiendum, NOT MEPP)
  jarzynski: evaluateJarzynski,                             // BE-29
  bekensteinBound: evaluateBekensteinBound,                 // BE-30
  flmFirstLaw: evaluateFLMFirstLaw,                         // BE-30 (first law)
  benincasaDowker: evaluateBenincasaDowker,                 // BE-31
  qrfOverlap: evaluateQRFOverlap,                           // BE-32
  hertzMillis: evaluateHertzMillis,                         // BE-33
  kibbleZurek: evaluateKibbleZurek,                         // BE-34
  crossingEquation: evaluateCrossingEquation,               // BE-35 (v^Δφ g(u,v) − u^Δφ g(v,u))
  gwSpeedRatio: evaluateGWSpeedRatio,                       // BE-36
  shapiroDelay: evaluateShapiroDelay,                       // BE-37
  mondForce: evaluateMONDForce,                             // BE-38
  betaG: evaluateBetaG,                                     // BE-39 (Newton coupling)
  betaLambda: evaluateBetaLambda,                           // BE-39 (cosmological coupling)
  compositeHiggs: evaluateCompositeHiggs,                   // BE-40
  swampland: evaluateSwampland,                             // BE-41
  hawkingTemperature: evaluateHawkingTemperature,           // BE-42
  erEprBound: evaluateEREPRBound,                           // BE-43
  softHairCharge: evaluateBE44SoftHairCharge,               // BE-44
  tcc: evaluateTCC,                                         // BE-45
  weinbergVilenkinP: evaluateWeinbergVilenkinP,             // BE-46
  bbnDark: evaluateBBNDark,                                 // BE-47
  grwLocalization: evaluateGRWLocalization,                 // BE-48
  quantumDarwinism: evaluateQuantumDarwinism,               // BE-49
  wfTimeSymmetry: evaluateWFTimeSymmetry,                   // BE-50
  yangMillsBeta: evaluateYangMillsBeta,                     // BE-53
  randallSundrumH2: evaluateRandallSundrumH2,               // BE-54
  // Closed-form / spacetime catalog additions:
  gravitationalLensing: evaluateGravitationalLensing,       // BE-51
  perihelionPrecession: evaluatePerihelionPrecession,       // BE-52
  quantumHall: evaluateQuantumHall,                         // BE-55
  casimir: evaluateCasimir,                                 // BE-56
  unruh: evaluateUnruh,                                     // BE-57
  johnsonNyquist: evaluateJohnsonNyquist,                   // BE-58
  acJosephson: evaluateACJosephson,                         // BE-59
  fractionalQuantumHall: evaluateFractionalQH,              // BE-60
  wiedemannFranz: evaluateWiedemannFranz,                   // BE-61
  bcsGap: evaluateBCSGap,                                   // BE-62
  chandrasekharMass: evaluateChandrasekharMass,             // BE-63
  eddingtonLuminosity: evaluateEddingtonLuminosity,         // BE-64
  jeansMass: evaluateJeansMass,                             // BE-65
  radiationPressure: evaluateRadiationPressure,             // BE-66
  alfvenSpeed: evaluateAlfvenSpeed,                         // BE-67
  tolmanEhrenfest: evaluateTolmanEhrenfest,                 // BE-68
  fastMagnetosonic: evaluateFastMagnetosonic,               // BE-69
  einsteinRelation: evaluateEinsteinRelation,               // BE-70
  clapeyron: evaluateClapeyron,                             // BE-71
  gravitationalRedshift: evaluateGravitationalRedshift,     // BE-72
  kelvinPeltier: evaluateKelvinPeltier,                     // BE-73
  magneticPressure: evaluateMagneticPressure,               // BE-74
  londonPenetration: evaluateLondonPenetration,             // BE-75
  plasmaBeta: evaluatePlasmaBeta,                           // BE-76
  hagenPoiseuille: evaluateHagenPoiseuille,                 // BE-77
  eulerBuckling: evaluateEulerBuckling,                     // BE-78
  pullIn: evaluatePullIn,                                   // BE-79
  mottGurney: evaluateMottGurney,                           // BE-80
  childLangmuir: evaluateChildLangmuir,                     // BE-81
  shockleyDiode: evaluateShockleyDiode,                     // BE-82
  thomsonCoefficient: evaluateThomsonCoefficient,           // BE-83
  fourPointSheet: evaluateFourPointSheet,                   // BE-84
  shotNoise: evaluateShotNoise,                             // BE-85
  reynoldsAnalogy: evaluateReynoldsAnalogy,                 // BE-86
  capacitorNoise: evaluateCapacitorNoise,                   // BE-87
  fermiSea: evaluateFermiSea,                               // BE-88
  debyeCutoff: evaluateDebyeCutoff,                         // BE-89
  debyeHeat: evaluateDebyeHeat,                             // BE-90
  einsteinSolid: evaluateEinsteinSolid,                     // BE-91
  sommerfeldHeat: evaluateSommerfeldHeat,                   // BE-92
  curieWeiss: evaluateCurieWeiss,                           // BE-93
  pauliParamagnetism: evaluatePauliParamagnetism,           // BE-94
  ginzburgLandau: evaluateGinzburgLandau,                   // BE-95
  upperCritical: evaluateUpperCritical,                     // BE-96
  ambegaokarBaratoff: evaluateAmbegaokarBaratoff,           // BE-97
  bcsJump: evaluateBcsJump,                                 // BE-98
  massAction: evaluateMassAction,                           // BE-99
  lyddaneSachsTeller: evaluateLyddaneSachsTeller,           // BE-100
  bktJump: evaluateBktJump,                                 // BE-101
  landauerConductance: evaluateLandauerConductance,         // BE-102
} as const;
