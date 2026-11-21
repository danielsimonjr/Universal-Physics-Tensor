# Engineering physicist dogfood, session 28, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: bridges as bench measurement plans
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt confront be-58` | residual 0.814 sigma | Match. |
| `upt confront be-51` | 0.667 sigma | Match. |
| `upt confront be-63` | -7.27 % | Match. |
| `upt confront be-55` | actual difference 0 %, compatible | Observed equals predicted. Issue #762. |
| `upt testplan case-skin-depth` | delta 65 um; l/delta 189; d/delta 0.17; 0.65 | All four match. The one buildable plan. |
| `upt testplan case-resistor-noise` | RC pole near 1.7 Hz | 1.75 kHz. Issue #763. |
| `upt testplan be-58` | Preprocessing: preprocessing: not-recorded | Issue #763. |
| `upt probe study` (Johnson data, no baseline) | chi^2/nu 5.95e3, no-credible-candidate | Match. |
| `upt probe study` baseline with `k_B` or a literal | exit 1 | Issue #764. |
| `upt evaluate be-85 I_A=1mA` | 3.2044e-22 A^2/Hz | 2eI. Match. |
| `upt evaluate be-141 Ic_A=1e-6` | 3.2911e-10 H | hbar/(2e Ic). Match. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #762 | `confront` passes records whose observed value is the predicted value |
| #763 | `testplan` text errors |
| #764 | `probe study` baseline cannot hold a constant |

## Other findings

Shot noise (be-85), Josephson inductance (be-141) and radiation pressure (be-66) have no case or test plan. A shot-noise case like case-resistor-noise would be useful.
