# Theoretical physicist dogfood, session 36, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: the atlas of asymptotic limits
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt atlas ab-pendulum-linear` | delta 0.0158525311 | Exact AGM. Match. |
| `upt atlas ab-telegraph-diffusion`, `ab-telegraph-wave` | 0.0557281; 0.00501256 | Match. |
| `upt atlas ab-klein-gordon-wave`, `ab-kg-schrodinger` | 0.00498756; 0.00248758 | Match. |
| `upt regime diffusion` at the boundaries | inclusive at 0.05 and 25 | Consistent with atlas and path. |
| `upt regime oscillators --at q=0.99 a=1` | ignored coordinates q, a | Issue #791. |
| `upt path model-chain model-wave-1d` | composed bound delta = 0 | Lattice error 1.04 %. Issue #792. |
| `upt atlas ab-damped-massless` | delta 1.5 labelled sup of the error | Error sup about 0.52. Issue #793. |
| `upt path model-pendulum model-spring ... t=101` | 16 T0/theta0^2 beside 4 T0/theta0^2 | Issue #794. |
| `upt regime tolman` | VACUOUS | Not an atlas family. Issue #795. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #791 | `regime` ignores q and a |
| #792 | `path` zero bound |
| #793 | damped-massless delta label |
| #794 | pendulum horizon text |
| #795 | `regime` and `atlas` family lists |

## Other findings

Six bridges state no error bound (#808). The telegraph-diffusion horizon constant 0.1 has no stated origin (comment on #770).
