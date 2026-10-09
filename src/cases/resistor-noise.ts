/**
 * Applied case: the thermal (Johnson–Nyquist) noise voltage of a resistor as an
 * instrument reads it — over a finite band, loaded by the instrument's input
 * resistance and capacitance.
 *
 * The catalog's BE-58 gives the flat spectral density S_V = 4 k_B T R. A
 * measurement reads an RMS voltage over a band, through an input network, so
 * this case adds the band, the loading, and the two premises that make the
 * spectrum flat (hf ≪ k_BT, and the input RC pole above the band), and checks
 * both. The parent spectrum is integrated numerically for comparison. Given
 * the amplifier's e_n and i_n, it adds them to the reading and checks that the
 * resistor's share can still be resolved in the averaging time.
 *
 * @module cases/resistor-noise
 */
import { H_SI, K_B_SI } from '../core/constants.js';
import { catalogRelations } from '../bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';
import { adaptiveSimpson } from './quadrature.js';
import { check, requirePositive, signedRelativeDifference, type AppliedCase } from './types.js';

const ID = 'case-resistor-noise';

/** h f_hi/(k_B T) ceiling: the Planck factor x/(eˣ−1) is then within x/2 ≤ 0.5% of 1. @internal */
export const CLASSICAL_MAX_X = 0.01;

/** 2π f_hi R_eff C_in ceiling: the input RC pole then passes 1/(1+w²) ≥ 99% at f_hi. @internal */
export const FLAT_BAND_MAX_WRC = 0.1;

/**
 * Ceiling on σ(S_R)/S_R = 1/(φ√(B t_avg)): the resistor's noise power, left after
 * subtracting an exactly known amplifier power, scatters by ≤ 1%. The total
 * power scatters by 1/√(B t_avg) (Dicke 1946); φ is the resistor's share of it.
 * @internal
 */
export const AMPLIFIER_MAX_REL_SIGMA = 0.01;

/** Nyquist's thermal spectral density at f, shaped by the input RC; `x/expm1(x)` → 1 as x → 0. */
function parentDensity(f: number, T: number, rEff: number, c: number): number {
  const x = (H_SI * f) / (K_B_SI * T);
  const planck = x === 0 ? 1 : x / Math.expm1(x);
  const w = 2 * Math.PI * f * rEff * c;
  return (4 * K_B_SI * T * rEff * planck) / (1 + w * w);
}

export const RESISTOR_NOISE_CASE: AppliedCase = {
  id: ID,
  title: 'Resistor thermal-noise measurement (bandwidth, instrument loading)',
  parameters: [
    { key: 'T_K', quantity: 'temperature', symbol: 'T', unit: 'K', meaning: 'absolute temperature of the resistor and of the instrument input, > 0 K', temperature: 'absolute' },
    { key: 'R_ohm', quantity: 'resistance under test', symbol: 'R', unit: 'ohm', meaning: 'the resistor whose noise is measured, > 0' },
    { key: 'R_in_ohm', quantity: 'instrument input resistance', symbol: 'R_in', unit: 'ohm', meaning: 'the input resistance in parallel with R, > 0 (a physical resistor at T)' },
    { key: 'C_in_F', quantity: 'input capacitance', symbol: 'C_in', unit: 'F', meaning: 'instrument input plus cable capacitance in parallel with R, ≥ 0' },
    { key: 'f_lo_Hz', quantity: 'lower band edge', symbol: 'f_lo', unit: 'Hz', meaning: 'lower edge of the ideal (brick-wall) measurement band, ≥ 0' },
    { key: 'f_hi_Hz', quantity: 'upper band edge', symbol: 'f_hi', unit: 'Hz', meaning: 'upper edge of the band, > f_lo; B = f_hi − f_lo is the noise-equivalent bandwidth' },
    { key: 't_avg_s', quantity: 'averaging time', symbol: 't_avg', unit: 's', meaning: 'how long the RMS is averaged, > 0' },
    {
      key: 'e_n2_V2_per_Hz',
      quantity: 'amplifier voltage-noise power density',
      symbol: 'e_n²',
      unit: 'V^2/Hz',
      meaning: "the square of the amplifier's input voltage noise e_n, white over the band (4 nV/√Hz → 1.6e-17), ≥ 0",
      optional: true,
    },
    {
      key: 'i_n2_A2_per_Hz',
      quantity: 'amplifier current-noise power density',
      symbol: 'i_n²',
      unit: 'A^2/Hz',
      meaning: "the square of the amplifier's input current noise i_n, white over the band (1 pA/√Hz → 1e-24), ≥ 0",
      optional: true,
    },
  ],
  governing: {
    parent: [
      'S_V(f) = 4 R_eff · hf/(e^{hf/k_BT} − 1) · 1/(1 + (2πf R_eff C_in)²)   (Nyquist 1928, thermal part; seen through the input RC)',
      'V_rms² = ∫_{f_lo}^{f_hi} S_V(f) df',
    ],
    scalar: [
      'S_V = 4 k_B T R_eff,  R_eff = R R_in/(R + R_in)   (BE-58 with the loaded resistance)',
      'V_rms = √(4 k_B T R_eff B),  B = f_hi − f_lo',
      'through an amplifier: V_rms,total² = (4 k_B T R_eff + e_n² + i_n² R_eff²) B, e_n and i_n uncorrelated (the e_n–i_n model; Motchenbacher & Connelly 1993)',
    ],
    distinction:
      'S_V(f) is a spectral density — a function of frequency fixed by the fluctuation–dissipation theorem and shaped by ' +
      'the input network; 4k_BTR_eff is its flat, classical value, and √(4k_BT R_eff B) integrates that constant over an ' +
      'ideal band. Nyquist derived it from the thermal modes of a transmission line (a 1-D field); the lumped circuit keeps ' +
      'only the port voltage.',
  },
  observable: 'V_rms_V',
  outputs: [
    { key: 'B_Hz', symbol: 'B', unit: 'Hz', meaning: 'noise-equivalent bandwidth f_hi − f_lo' },
    { key: 'R_eff_ohm', symbol: 'R_eff', unit: 'ohm', meaning: 'R in parallel with R_in: the resistance the instrument sees' },
    { key: 'S_V_V2_per_Hz', symbol: 'S_V', unit: 'V^2/Hz', meaning: 'flat one-sided spectral density 4k_BT R_eff' },
    { key: 'V_rms_unloaded_V', symbol: 'V_rms,0', unit: 'V', meaning: 'open-circuit value √(4k_BTRB), with no instrument attached' },
    { key: 'V_rms_V', symbol: 'V_rms', unit: 'V', meaning: 'the RMS noise voltage the instrument reads (scalar model)' },
    { key: 'loading_ratio', symbol: 'V_rms/V_rms,0', unit: '', meaning: '√(R_in/(R + R_in)): what the input resistance removes' },
    { key: 'V_rms_parent_V', symbol: 'V_rms,parent', unit: 'V', meaning: 'the parent spectrum integrated over the band (adaptive Simpson)' },
    { key: 'parent_deviation', symbol: 'V_rms/V_rms,parent − 1', unit: '', meaning: signedRelativeDifference('scalar result', 'parent') },
    { key: 'V_rms_rel_sigma', symbol: 'σ(V_rms)/V_rms', unit: '', meaning: 'statistical scatter of an RMS averaged over t_avg: 1/(2√(B t_avg)) (Dicke radiometer relation)' },
    { key: 'V_rms_total_V', symbol: 'V_rms,total', unit: 'V', meaning: 'what the instrument reads with its amplifier noise added in quadrature; not defined without e_n2/i_n2' },
    { key: 'resistor_fraction', symbol: 'φ', unit: '', meaning: "the thermal share of the read noise power, 4k_BTR_eff/(4k_BTR_eff + e_n² + i_n²R_eff²); not defined without e_n2/i_n2" },
    { key: 'T_n_K', symbol: 'T_n', unit: 'K', meaning: "the amplifier's noise temperature for the source R_eff, (e_n² + i_n²R_eff²)/(4k_B R_eff); not defined without e_n2/i_n2" },
  ],
  conditions: [
    'thermal equilibrium: R and the instrument input at one temperature T, no DC current through R',
    'the instrument reads the voltage across R ∥ R_in ∥ C_in (open-circuit source, no other load)',
    'stationary Gaussian noise; the band is an ideal brick wall of width B (the real filter enters only through its noise-equivalent bandwidth)',
  ],
  comparison: {
    reference: "the parent: Nyquist's thermal spectrum through the input RC, integrated over [f_lo, f_hi]",
    valueKey: 'V_rms_V',
    referenceKey: 'V_rms_parent_V',
    deviationKey: 'parent_deviation',
    method: 'adaptive Simpson quadrature, relative tolerance 1e-10',
  },
  notIncluded: [
    "the amplifier's noise when e_n2 and i_n2 are left out; when given, their 1/f corners and their correlation (taken white and uncorrelated)",
    '1/f (excess) noise, which needs a current through R',
    'the zero-point term hf/2 of the quantum fluctuation–dissipation theorem (the parent here is the thermal part)',
    'frequency dependence of R and R_in over the band',
  ],
  measurement: [
    'digitize the voltage across R through a band-pass of noise-equivalent bandwidth B and average the RMS over t_avg; ' +
      'compare with V_rms_V ± V_rms_rel_sigma·V_rms_V (statistical scatter only)',
    "measure the amplifier's own noise with its input shorted and subtract it in quadrature before comparing",
    '`upt confront --bridge=be-58`: the NIST Johnson-noise-thermometry k_B, which tests S_V = 4k_BTR with R traceable to the quantum Hall effect',
  ],
  links: [
    { id: `be-${58}`, role: 'the flat spectral density S_V = 4k_BTR (catalog evaluator: `upt evaluate be-58`)' },
    { id: `be-${55}`, role: 'quantum Hall resistance standard to which R is traceable in the JNT comparison' },
  ],
  examples: {
    valid: {
      args: ['T_K=300', 'R_ohm=1kohm', 'R_in_ohm=1Mohm', 'C_in_F=20pF', 'f_lo_Hz=0', 'f_hi_Hz=10kHz', 't_avg_s=10', 'e_n2_V2_per_Hz=1e-18', 'i_n2_A2_per_Hz=1e-24'],
      note: 'a 1 kΩ resistor at 300 K, a 1 MΩ ∥ 20 pF input with 1 nV/√Hz and 1 pA/√Hz of amplifier noise, a 10 kHz band, 10 s of averaging',
      fails: [],
    },
    failures: [
      {
        args: ['T_K=20mK', 'R_ohm=50', 'R_in_ohm=1Mohm', 'C_in_F=0', 'f_lo_Hz=1GHz', 'f_hi_Hz=2GHz', 't_avg_s=1'],
        note: 'a 50 Ω load at 20 mK read at 1–2 GHz: hf/k_BT ≈ 4.8, the spectrum is not flat and 4k_BTR overstates it',
        fails: ['classical'],
      },
      {
        args: ['T_K=300', 'R_ohm=1Mohm', 'R_in_ohm=10Mohm', 'C_in_F=100pF', 'f_lo_Hz=0', 'f_hi_Hz=100kHz', 't_avg_s=1'],
        note: 'a 1 MΩ resistor through 100 pF: the RC pole sits near 1.7 Hz, far below the 100 kHz band edge',
        fails: ['flat-band'],
      },
      {
        args: ['T_K=300', 'R_ohm=10', 'R_in_ohm=1Mohm', 'C_in_F=20pF', 'f_lo_Hz=0', 'f_hi_Hz=10kHz', 't_avg_s=10', 'e_n2_V2_per_Hz=1.6e-17', 'i_n2_A2_per_Hz=1e-24'],
        note: 'a 10 Ω resistor through a 4 nV/√Hz amplifier: the amplifier adds ~100× the resistor\'s noise power, which 10 s cannot resolve to 1%',
        fails: ['amplifier'],
      },
    ],
  },
  /** Evaluate the measured Johnson-Nyquist RMS voltage and instrument-regime checks for the supplied inputs. */
  run(i) {
    requirePositive(ID, i, ['T_K', 'R_ohm', 'R_in_ohm', 'f_hi_Hz', 't_avg_s']);
    const { T_K: T, R_ohm: R, R_in_ohm: Rin, C_in_F: C, f_lo_Hz: fLo, f_hi_Hz: fHi, t_avg_s: tAvg } = i as Record<string, number>;
    if (!Number.isFinite(C) || C < 0) throw new Error(`${ID}: C_in_F must be a finite number ≥ 0 (got ${C})`);
    if (!Number.isFinite(fLo) || fLo < 0 || fLo >= fHi) throw new Error(`${ID}: need 0 ≤ f_lo_Hz < f_hi_Hz (got ${fLo}, ${fHi})`);
    const B = fHi - fLo;
    const rEff = (R * Rin) / (R + Rin);
    const noise = catalogRelations().find((row) => row.target === 'voltage-noise-density');
    if (noise === undefined) throw new Error(`${ID}: the resistor-noise relation is not in the catalog`);
    const spectral = (temperature: number, ohms: number): number =>
      evaluateCatalogRelation(noise, { 'johnson-temperature': temperature, resistance: ohms });
    const S = spectral(T, rEff);
    const S0 = spectral(T, R);
    const vRms = Math.sqrt(S * B);
    const vParent = Math.sqrt(adaptiveSimpson((f) => parentDensity(f, T, rEff, C), fLo, fHi));
    const x = (H_SI * fHi) / (K_B_SI * T);
    const wrc = 2 * Math.PI * fHi * rEff * C;
    const checks = [
      check('classical', 'flat, classical spectrum: hf ≪ k_BT across the band', 'h f_hi/(k_B T)', x, '<=', CLASSICAL_MAX_X,
        'chosen threshold for ≪ 1: the Planck factor at f_hi is then within x/2 ≤ 0.5% of 1'),
      check('flat-band', 'the input RC pole lies above the band', '2π f_hi R_eff C_in', wrc, '<=', FLAT_BAND_MAX_WRC,
        'chosen threshold for ≪ 1: the RC low-pass then passes ≥ 99% of the density at f_hi'),
    ];
    const unchecked = [
      'R_in is a physical resistance at T; an actively synthesized or cold input adds less noise than its resistance would, ' +
        'down to the resistor alone divided by the input: V_rms,0 · R_in/(R + R_in)',
      'no DC current through R, so no 1/f excess noise',
    ];
    const withAmplifier = i.e_n2_V2_per_Hz !== undefined || i.i_n2_A2_per_Hz !== undefined;
    let amp: { total: number; fraction: number; tN: number } | null = null;
    if (withAmplifier) {
      const en2 = i.e_n2_V2_per_Hz ?? 0;
      const in2 = i.i_n2_A2_per_Hz ?? 0;
      for (const [k, v] of [['e_n2_V2_per_Hz', en2], ['i_n2_A2_per_Hz', in2]] as const) {
        if (!Number.isFinite(v) || v < 0) throw new Error(`${ID}: ${k} must be a finite number ≥ 0 (got ${v})`);
      }
      const excess = en2 + in2 * rEff * rEff;
      const fraction = S / (S + excess);
      amp = { total: Math.sqrt((S + excess) * B), fraction, tN: excess / (4 * K_B_SI * rEff) };
      checks.push(
        check('amplifier', "the resistor's noise is resolved above the amplifier's in t_avg", '1/(φ √(B t_avg))', 1 / (fraction * Math.sqrt(B * tAvg)), '<=',
          AMPLIFIER_MAX_REL_SIGMA,
          "chosen threshold: after subtracting the amplifier's power (known exactly, e.g. from a long shorted-input run) the resistor's power scatters by ≤ 1%"),
      );
      unchecked.push(
        `e_n and i_n are white over the band and uncorrelated${i.e_n2_V2_per_Hz === undefined ? '; e_n was not given and is taken as 0' : ''}` +
          `${i.i_n2_A2_per_Hz === undefined ? '; i_n was not given and is taken as 0' : ''}`,
      );
    }
    return {
      outputs: {
        B_Hz: B,
        R_eff_ohm: rEff,
        S_V_V2_per_Hz: S,
        V_rms_unloaded_V: Math.sqrt(S0 * B),
        V_rms_V: vRms,
        loading_ratio: Math.sqrt(S / S0),
        V_rms_parent_V: vParent,
        parent_deviation: vRms / vParent - 1,
        V_rms_rel_sigma: 1 / (2 * Math.sqrt(B * tAvg)),
        V_rms_total_V: amp?.total ?? null,
        resistor_fraction: amp?.fraction ?? null,
        T_n_K: amp?.tN ?? null,
      },
      checks,
      unchecked,
    };
  },
};
