# Engineering physicist dogfood, session 27, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: applied cases and uncertainty propagation
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt evaluate case-resistor-noise` (README inputs) | V_rms 4.068321e-7 V | sqrt(4kT R_eff B), R_eff = 999.001 ohm. Match. |
| `upt evaluate case-brownian-sphere` (README inputs) | D 2.147198e-13 m^2/s | kT/(6 pi eta a). Match. |
| `upt evaluate case-damped-resonator` (README inputs) | envelope 7.304028e-7 m | x0 e^(-pi/10). Match. |
| `upt evaluate case-lumped-cooling` (README inputs) | T 321.236 K; tau 286.600 s | Match. |
| `upt evaluate case-kepler-rv` (README inputs) | K 12.478651 m/s | Match. |
| resistor case, `--sigma T_K=3 --sigma R_ohm=10` | V_rms +/- 2.88e-9 (0.707 %) | sqrt(2) x 2.03e-9. Match. |
| resistor case, `--corr T_K,R_ohm=0.5` | V_rms +/- 3.39e-9 | Match. |
| Kepler case, `--sigma sin_i=0.01` at sin_i = 1 | c = 16 | K/sin i = 12.48. Issue #778. |
| lumped case, emissivity = 1, `--sigma emissivity=0.001` | c = 0 | About -7 K per unit. Issue #778. |
| resistor case, `f_lo_Hz=0 --sigma f_lo_Hz=1` | internal error, exit 70 | Issue #779. |
| unit inputs: 5mil, 14.7psi, 1kWh, 1lbf, 1hp, 1mmHg, 77degF | SI values | All match. |
| unit inputs: gal, kip, cfm, Btu | unknown unit, exit 1 | Issue #766. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #778 | `--sigma` sensitivity wrong or zero at a domain edge |
| #779 | `--sigma` at a domain boundary crashes with exit 70 |
| #766 | common unit names are unknown |

## Other findings

The resonator and skin-depth case texts say the case "refuses" a regime. The tool prints NOT QUALIFIED and exits 3, which the top-level help describes correctly.
