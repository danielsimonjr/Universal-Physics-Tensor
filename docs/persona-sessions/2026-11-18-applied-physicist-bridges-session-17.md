# Applied physicist dogfood, session 17, 2026-11-18

Persona: Applied physicist (outside the rotation)
Package under test: universal-physics-tensor@15.0.0 (installed from npm)
Next persona: Theoretical physicist (session 18, same day)

A model persona ran this round against the published package, not a human reviewer. It ran in an empty directory: `npm i universal-physics-tensor@15.0.0`. `npm ls` and `upt version` printed 15.0.0. Node was v26.13.0. Each bug below was reproduced on a second, separate install before its issue was filed.

## What was run

About 110 CLI runs and 8 library scripts. The hand value uses the formula stated in the row.

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "2*pi*sqrt(L/g)" L=1m g=9.81` | 2.0060666807106475 | 2π√(1/9.81) = 2.006067. Match. |
| `upt eval "1/(2*pi)*sqrt(k/m)" k=100 m=1` | 1.5915494309189535 | (1/2π)√(k/m). Match. |
| `upt eval "sigma_sb*A*T^4" A=1 T=300` | 459.30032795393896 | σT⁴ = 459.300 W. Match. |
| `upt eval "1/(1/do+1/di)" do=30cm di=60cm` | 0.2 | Thin lens, f = 0.2 m. Match. |
| `upt eval x x=5mph`, `x=1ft`, `T=20degC`, `E=1eV` | 2.2352, 0.3048, 293.15, 1.602176634e-19 | Match. |
| `upt eval "asin(sin(theta)*n1/n2)" theta=30deg n1=1 n2=1.5` | 0.3398369094541219 | asin(1/3). Match. |
| `upt eval "k*A*dT/L" k=0.6 A=2 dT=10degC L=0.05` | 240 | Fourier conduction, a degC difference is 10 K. Match. |
| `upt eval "2*pi*sqrt(L/g)" L=1ft g=32.2ft/s^2` | 1.107265918 | 2π√(0.3048/9.81456). Match. |
| `upt eval "1/0"`, `"sqrt(-4)"`, `"log(0)"` | refused, exit 1 | Clear messages. Pass. |
| `upt eval "2*pi*sqrt(1/9.81"` | parse error, exit 2 | Pass. |
| `upt eval x x=1gal` | 1e-24, exit 0 | Wrong. Issue #676. |
| `upt eval "x+y" x=2kg y=3m` | 5, exit 0 | No dimension check. Issue #677. |
| `upt evaluate be-16 temperature_K=20degC` and `=77degF` | 2.8054e-21 J, 2.8533e-21 J | k_B T ln 2. Match. |
| `upt evaluate be-16 temperature_K=-5` | refused, exit 1 | Domain check. Pass. |
| `upt evaluate be-63 mu_e=2 --sigma mu_e=0.1` | 2.8957e30 kg ± 10 % | M ∝ μ_e⁻², so 2 × 5 %. Match. |
| `upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=3 --sigma R_ohm=10` | 1.6567788e-17 ± 2.34e-19 | 4k_BTR; GUM in quadrature. Match. Unit display: issue #681. |
| `upt evaluate case-resistor-noise T_K=300 R_ohm=1kohm R_in_ohm=1Mohm C_in_F=20pF f_lo_Hz=0 f_hi_Hz=10kHz t_avg_s=10` | V_rms = 4.068321e-7 V, QUALIFIED | √(4k_BT·R_eff·B). Match. Status text: issue #682. |
| same with `f_hi_Hz=100MHz` | VIOLATED flat-band, exit 3 | 2π f R_eff C = 12.55 > 0.1. Correct. |
| `upt explain hawking-temperature mass=1Msun` | 6.16842971641034e-8 | README value. Match. |
| `upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"` | prefactor 6.28318530717959 | README value. Match. |
| `upt map --equation "force = mass*velocity" --equation-only` | MISMATCH, exit 3 | Correct. |
| `upt map --equation "F = m*a" --equation-only` | UNKNOWN, exit 0 | See issue #684. |
| `upt retrieve "period of a pendulum"` | accepted: none | The help example. Issue #679. |
| `upt retrieve ... --embed --embed-backend=ollama --ollama-url=http://127.0.0.1:9` | fallback `process-not-there`, exit 0 | Reason named. Pass. |
| `upt atlas ab-string-wave --run` | WS1 checked, error 8.6e-5 within 2e-4 | Pass. |
| `convertValue` for psi, atm, BTU, kWh, hp, lbf, mmHg, bar, ft/s | 13789.5146 (2 psi), 101.325 kPa, 1055.05585262 J, ... | Match. |
| `convertValue('1 mile','m')`, `('1 gallon','L')` | UnknownUnitError | Issue #678. |
| `convertValue('100 degF','degC')` | UnitError: a declared unit cannot be affine | Issue #693. |
| library `evaluateRelation`, `composeEdges(be-42, be-16)` at M☉ | 6.1684e-8 K, 2.8710e-21 J, 5.9031e-31 J | README values. Match. |

## Candidate bridges (unproven)

### Standard

None proposed.

### Cross-domain

None proposed.

## Bugs found (for the joint review)

| # | Severity | Finding | Issue |
|---|---|---|---|
| 1 | High | A unit name that is not in the table (`gal`) is split into `g` × `al` and gives 1e-24 with exit 0 | #676 |
| 2 | Medium | `eval` adds unlike dimensions (`2kg + 3m` = 5) without a check | #677 |
| 3 | Low | The `retrieve` help example returns nothing | #679 |
| 4 | Low | `be-58` prints `kg^2*m^4/(s^5*A^2)`, not `V^2/Hz` | #681 |
| 5 | Low | `mile` and `gallon` are unknown units | #678 |
| 6 | Low | "undefined here (its premise fails, or it needs an optional input not given)" does not name the cause | #682 |
| 7 | Low | `convertValue` cannot convert into degC or degF | #693 |

## Negative results

- Every hand-checked value matched, including each README example of `explain`, `derive`, `evaluateRelation`, `composeEdges` and `convertValue`.
- Error paths are clear: division by zero, a complex square root, `log(0)`, parse errors, domain violations, undeclared inputs, unit mismatches, and a low band edge above the high one.
- The regime gate works: a 100 MHz band is VIOLATED, NOT QUALIFIED, exit 3.
- Two leads of this round were refuted on reproduction. `canonicalRetrievalCorpus` has `expr` on 93 of 109 records, in the residual form `target − scalarAst`; the first record has none, which the round read as "no expr field". The 15.0.0 regime change is visible: the `ab-telegraph-wave` group set is `tau · D · q^2` only, and `c` appears only in the transformation text, where it is derived.
- `upt check` does not exist. The brief named it by mistake; this is not a package defect.
- Not run: `upt confront`, `upt testplan`, ONNX `retrieve --embed` (downloads a model).
