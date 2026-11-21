# Undergraduate physics student dogfood, session 24, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Area: thermodynamics and statistical mechanics
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 22 to 26 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #745 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "sqrt(3*R*T/M)"` at T=300, M=0.028 | 516.963 m/s | rms speed of N2. Match. |
| `upt eval "e*sigma_sb*A*T^4"` at 0.9, 2 m^2, 350 K | 1531.639 | Match. |
| `upt eval "1-r^(1-gamma)"` at r=8, gamma=1.4 | 0.5647247 | Otto efficiency. Match. |
| `upt evaluate be-166 wien_x=4.965114` | 2.8977721e-3 m K | Wien constant. Match. |
| `upt evaluate be-91 N=1 T=300 thetaE=300` | 3.81338e-23 J/K | Einstein solid. Match. |
| `upt evaluate be-16 temperature_K=-5` | exit 1, outside the domain | Match. |
| `upt eval "T" T=-300K` | -300 K, exit 0 | Issue #754. |
| `upt derive pressure:pressure N:amount ... --formula "N*k_B*temperature/V"` | fails the dimension check, then "agrees" | Issue #752. |
| `upt canonical --vars` (CE-ideal-gas) | k_B, temperature, V | N is missing. Issue #753. |
| `upt derive ... --formula=heat/temperature` | exit 2, use '--formula VALUE' | `retrieve` needs the other form. Issue #755. |
| `upt derive eta:dimensionless ... --formula "1-Tc/Th"` | exit 3, 2 free groups | Issue #760. |
| `upt retrieve "Carnot efficiency" --formula="1 - Tc/Th" ...` | CE-carnot-efficiency at index 10 | #737 comment. |

Each value marked Match agrees with a hand value from CODATA 2018 constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #752 | `derive` agrees after a failed dimension check |
| #753 | `canonical --vars` omits N for CE-ideal-gas |
| #754 | `eval` accepts a negative absolute temperature |
| #755 | `derive` and `retrieve` need opposite `--formula` syntax |

## Other findings

No partition-function, Bose-Einstein, Fermi-Dirac, free-energy or PV^gamma entry. No thermodynamics atlas family (#741 comment).
