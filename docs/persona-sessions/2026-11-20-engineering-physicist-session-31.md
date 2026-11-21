# Engineering physicist dogfood, session 31, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: EM, RF and noise
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt evaluate be-58 --sigma T_K=3 --sigma R_ohm=10 --corr T_K,R_ohm=0.5` | 1.73 % | sqrt(3e-4). Match. |
| `upt evaluate be-87 T_K=300 C_F=1pF` | 4.141947e-9 V^2 | kT/C. Match. |
| `upt evaluate case-skin-depth` | delta 6.52341e-5 m | Match. |
| `upt eval "sqrt(L/C)" L=250nH/m C=100pF/m` | 50 ohm | Match. |
| `upt eval "q^2*a^2/(6*pi*epsilon_0*c^3)"` | 5.708327e-24 W | Larmor. Match. |
| `upt eval "x" "x=sqrt(1/s)"`, `e_n=4nV/sqrt(Hz)` | unknown name | Issue #767. |
| `upt confront be-58` | predicted 1.38064852e-23 | CODATA 2014 k_B. Issue #771. |
| `upt evaluate be-66 ... theta_rad=1.2` | 6.569702e-7 Pa, no caveat | Issue #772. |
| `upt derive plasma-frequency:frequency ...` | agrees at prefactor 1 | Angular, not f. #747 comment. |
| `upt eval "sqrt(x)" "x=4e-18V^2/Hz"` | 2e-9 kg*m^2/(s^2.5*A) | Unnamed unit. #739 comment. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #767 | units with sqrt or a fractional exponent |
| #771 | two values of k_B |
| #772 | be-66 reflectance at oblique incidence |

## Other findings

No transmission-line, antenna, decibel, noise-figure or noise-bandwidth entry. `derive` has no number-density dimension (#740 comment).
