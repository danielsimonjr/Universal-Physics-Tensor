# Theoretical physicist dogfood, session 35, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: composition of catalog bridges
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt evaluate be-42`, `be-16`, `be-57` | 6.16843e-8 K; 2.87098e-21 J; 0.405501 K | Match. |
| `upt explain bh-entropy A=1 --source=canonical` | 1.32131e46 | Match. |
| `composeEdges(be-42, be-16)` at one solar mass | 5.90314e-31 J | Match. |
| weakest-link confidence over 25,122 ordered pairs | consistent | Match. |
| composed vs sequential evaluation, 20 pairs | agree to 1e-9 | Match. |
| canonical vs catalog Hawking-Landauer chain | established vs highly-speculative | Issue #796. |
| `composeEdges(CE-string-wave-speed, CE-kinetic-energy)` | established | Name-only junction. Issue #797. |
| `upt explain landauer-erasure-energy mass=1Msun` | via be-16 only | Route omits be-42. Issue #798. |
| `upt atlas be-14` | Quantum Error Correction Holographic Mapping | Catalog says Ryu-Takayanagi. Issue #799. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #796 | two grades for one composed formula |
| #797 | name-only junctions |
| #798 | `explain` route and missing grades |
| #799 | be-14 two titles |

## Other findings

No Bekenstein bound, Margolus-Levitin bound, area-from-mass route or Unruh identification (#808). `upt chain --help` exits 0 but says exit 2.
