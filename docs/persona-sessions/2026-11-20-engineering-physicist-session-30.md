# Engineering physicist dogfood, session 30, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: heat transfer and fluids
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "k*A*dT/L"` (0.8, 10 m^2, 20 K, 0.3 m) | 533.333 W | Match. |
| `upt eval` Poiseuille flow (100 Pa, 5 mm, 1e-3, 2 m) | 1.227185e-5 m^3/s | Match. |
| `upt evaluate be-161` Newton cooling | 36.3075 K | 50 e^-0.32. Match. |
| `upt evaluate be-160 --sigma ...` | +/- 7.66 W/m^2 | GUM. Match. |
| `upt evaluate case-lumped-cooling` | T_radiating 351.929 K | Independent RK4. Match. |
| `upt evaluate case-brownian-sphere` | D 4.28754e-13 m^2/s | Match. |
| `upt path model-telegraph model-fick` composed bound | K = 0.0557281 | 9 - 4 sqrt(5). Match. |
| `upt path ... t=200s` horizon | all hold | Uses the point delta, not the printed one. Issue #770. |
| `upt eval "k" "k=1BTU/(h*ft*degF)"` | affine temperature refused | Issue #765. |
| `upt eval "Q" "Q=10gpm"` | unknown unit | Issue #766. |
| `upt derive ... 'k:thermal-conductivity'` | unknown base dimension 'thermal_conductivity' | Issue #769. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #765 | degF refused in a compound unit |
| #766 | common unit names are unknown |
| #769 | `derive` error rewrites a hyphen |
| #770 | `path` horizon does not name its delta |

## Other findings

Fourier conduction, Newton cooling and Reynolds number exist only as catalog bridges, not canonical entries. No radiation exchange, Darcy-Weisbach or convection correlation entry.
