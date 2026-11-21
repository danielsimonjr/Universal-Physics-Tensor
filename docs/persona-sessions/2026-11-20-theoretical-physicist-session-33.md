# Theoretical physicist dogfood, session 33, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: general relativity
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt metric schwarzschild M=1Msun r=1e8 theta=pi/2` | K 1.0472236e-40; horizon 2954.13 m | 48(GM/c^2)^2/r^6; 2GM/c^2. Match. |
| `upt metric flrw k=1 t=2` and `k=0` | R 2.3811016; rho 1.98716e8 | 6k/a^2; 3H^2/(8 pi G). Match. |
| `upt evaluate be-51` (Sun, b = R_sun) | 8.49253e-6 rad | 4GM/(bc^2). Match. |
| `upt evaluate be-52` (Mercury) | 43.008 arcsec/century | Match. |
| `upt evaluate be-42 M_kg=1Msun` | 6.16843e-8 K | Hawking temperature. Match. |
| `upt metric kerr a=0` vs `schwarzschild` | Gamma^r_tt 1.477e-13 vs 13274.79 | Ratio c^2. Issue #781. |
| `upt metric kerr a=10 ... --geodesic` | radial potential is negative, exit 1 | Issue #782. |
| `upt explain hubble-rate-squared ... curvature-k=1` | Recovered value 5.59e-36 | Curvature branch H^2 < 0. Issue #783. |
| `upt metric minkowski` | R = 0 (unresolved) | Exact zero. Issue #784. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #781 | Kerr Christoffel symbols in ct units |
| #782 | Kerr geodesic refusal and drift |
| #783 | Friedmann curvature branch dropped |
| #784 | exact zero printed as unresolved |
| #808 | missing Kerr horizons and ISCO |

## Other findings

No Kerr horizons, ISCO or photon sphere; `search Kerr` and `search Kretschmann` find nothing; the atlas has no relativity family; be-37 does not say it is the leading-order Shapiro term.
