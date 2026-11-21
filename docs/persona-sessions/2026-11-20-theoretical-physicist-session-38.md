# Theoretical physicist dogfood, session 38, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: quantum, field-theory and statistical-mechanics bridges
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt evaluate be-56 d_m=1um` | -1.30013e-3 Pa | Casimir. Match. |
| `upt evaluate be-55`, `be-59`, `be-102` | e^2/h; 2eV/h; 2e^2/h | Match. |
| `upt evaluate be-63`, `be-64`, `be-65` | Chandrasekhar, Eddington, Jeans | Match. |
| `upt evaluate be-164` to `be-169` | Planck, Stefan, Wien, Sackur, Saha, Richardson | Match. |
| `upt explain yang-mills-beta` | -0.0443280 | Match. |
| `upt evaluate be-113` | -6.26657e-3 s^-1 | omega_p taken as omega. Issue #800. |
| `upt evaluate be-120` | standoff-sixth 1138005.2 | R/R_E = 10.22. Issue #801. |
| `upt evaluate be-142 lambda=1.1e-8 xi=1e-8` | 0.1296 T | kappa about 1. Issue #802. |
| `upt evaluate be-56 d_m=1nm` | -1.3e9 Pa, no caveat | Issue #803. |
| `upt evaluate be-168 ... g_ratio=0.5` | not an input | Issue #804. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #800 | be-113 plasma frequency |
| #801 | be-120 output quantity |
| #802 | be-142 domain |
| #803 | be-56 regime |
| #804 | be-168 weights |

## Other findings

No TOV limit, no fine-structure-constant relation, and be-170 ignores its field input (#808). The be-120 factor-4 convention looks right; the persona gave this view from memory.
