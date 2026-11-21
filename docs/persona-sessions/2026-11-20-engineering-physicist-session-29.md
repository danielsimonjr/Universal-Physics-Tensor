# Engineering physicist dogfood, session 29, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: materials and semiconductor devices
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt evaluate be-99` silicon | 6.67590e15 m^-3 | Intrinsic density. Match. |
| `upt evaluate be-99` GaAs | 2.14350e12 m^-3 | Match. |
| `upt evaluate be-82 I_s_A=1e-12 V_volts=0.6 T_K=300` | 0.0120104 A | Match. |
| `upt evaluate be-82 ... n=1.5` | 'n' is not an input | Issue #776. |
| `upt evaluate be-61` copper | 436.81 W/(m K) | Match. |
| `upt evaluate be-138` NA = ND = 1e22 | 0.714317 V | Built-in potential. Match. |
| `upt evaluate be-90 N=1 T_K=300 thetaD_K=345` | outside the validity domain | Full Debye function missing. Issue #774. |
| `upt derive ... 'e:e' --formula '1/(n*e)'` | declared but not in the formula: e | Issue #775. |
| `upt derive` Wiedemann-Franz | prefactor 3.2898681 | pi^2/3. Match. |
| `upt explain hall-coefficient --source=canonical` | -7.35160e-11 for q = -e | Match. |
| `upt confront be-61` | compatible, 0 % | Issue #762. |
| `upt search thermoelectric` | thermoelectriconsager | Issue #777. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #774 | be-90 has only the low-temperature Debye law |
| #775 | `derive` name `e` reported as not in the formula |
| #776 | be-82 has no ideality factor |
| #777 | be-73 description typo |

## Other findings

The piezoelectric regime has no inequality and no coefficient. No canonical diode, Einstein relation, skin depth or Lorenz entry. No semiconductor applied case.
