# Undergraduate physics student dogfood, session 25, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Area: waves, optics and modern physics
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 22 to 26 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #745 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "h/(m_e*c)*(1-cos(theta))"` at 90 deg | 2.42631e-12 | Compton shift. Match. |
| `upt eval "h/sqrt(2*m_e*K)"` at K=100 eV | 1.22643e-10 m | de Broglie. Match. |
| `upt eval "1/(R_inf*(1/n1^2-1/n2^2))"` from 2 to 3 | 6.56112e-7 m | H-alpha. Match. |
| `upt eval "exp(-2*sqrt(2*m_e*(Vb-Eb))/hbar*L)"` | 3.54873e-5 | Tunnelling. Match. |
| `upt eval "h*c/(lambda*e)" lambda=500nm` | 2.4797 V | Value match. eV is shown as V (#739 comment). |
| `upt evaluate be-56 d_m=1um` | -1.300126e-3 Pa | Casimir. Match. |
| `upt symbolic --simplify` CT-1b | 6.16843e-8 K | Match. |
| `upt explain bohr-radius --source=canonical` | no value printed | Issue #749. |
| `upt eval "h*f - W" f=1e14Hz W=2.3eV` | -3.0224e-19 J, exit 0 | `explain` refuses. Issue #754. |
| `upt retrieve "wave speed on a string" --formula="sqrt(T/mu)" ...` | CE-string-wave-speed at index 99 | #737 comment. |
| `upt metric minkowski` | Ricci 0, Kretschmann 0 | Match. |

Each value marked Match agrees with a hand value from CODATA 2018 constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #749 | `explain` with no inputs prints no value |
| #754 | `eval` accepts a negative photoelectron energy |

## Other findings

No standing-wave, beats, decibel, critical-angle, binding-energy, particle-in-a-box or relativistic-momentum entry (#741 comment).
