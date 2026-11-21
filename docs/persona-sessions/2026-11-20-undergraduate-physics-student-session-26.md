# Undergraduate physics student dogfood, session 26, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Area: the library API and the advanced CLI commands
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 22 to 26 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #745 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `composeEdges(be-42, be-16).evaluate({mass: M_SUN_KG})` | 5.903143823302079e-31 | README value. Match. |
| `convertValue('100 degF','degC')` | 37.7778 | Match. |
| `parseUnit('kW h').scale` | 3600000 | Match. |
| `upt metric schwarzschild M=1Msun r=1e8 theta=pi/2` | K = 1.04722e-40 | 48 G^2 M^2 / (c^4 r^6). Match. |
| `upt metric flrw k=1 t=2` | R = 2.3811015779522995 | Match. |
| `upt confront be-58` | residual 0.814 sigma | Match. |
| `upt confront be-53` | refused, exit 0 | Issue #757. |
| `upt axes` (scale row) | OR 0.429, p = 0.619 | Fisher test. Match. |
| `upt probe run` (help pendulum example) | c = 6.283 +/- 0.00025 | 2 pi. Match. |
| `upt discover` funnel | 4192 = 1 + 30 + 2365 + 20 + 0 + 1776 | The parts sum. Match. |
| `queryLaws({scale:'galactic'})` | [] | The constructor throws for the same value. Issue #758. |
| `composeEdges(undefined, edge)` | TypeError reading 'target' | Issue #759. |

Each value marked Match agrees with a hand value from CODATA 2018 constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #757 | `confront` exits 0 on a refusal |
| #758 | `queryLaws` returns [] for an unknown scale; a duplicate `addLaw` returns false |
| #759 | `composeEdges(undefined, edge)` throws a raw TypeError |

## Other findings

The `atlas` and `probe` subpaths are not in the README. `evaluateRelation` error messages name `M_kg` and `temperature_K`, not the README keys.
