# Theoretical physicist dogfood, session 34, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: symbolic work and dimensional analysis
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt symbolic` CT-1 at one solar mass | 5.90314382330208e-31 J | hbar c^3 ln2/(8 pi G M). Match. |
| `upt derive` Planck length, time, mass | prefactor 1 | Match. |
| `upt derive` pendulum, Kepler, Bohr, Stokes, Maxwell speed | 2 pi, 2 pi, 4 pi, 6 pi, sqrt(8/pi) | Match. |
| `upt derive` Poiseuille and Hawking variable sets | 2 groups, exit 3 | Group counts correct. |
| `upt map --equation` rest energy (SI and `--natural`) | factor 1/c^2; agrees | Match. |
| `upt audit --source=canonical` | DECOY: Hawking, Bekenstein-Hawking, light deflection | `map` agrees with each. Issue #790. |
| `upt audit --source=canonical` | CE-lorentz-factor DERIVED x1 | One free group. Issue #790. |
| `upt derive ... permittivity:permittivity --formula ...` | internal error, exit 70 | Issue #805. |
| `upt derive temperature ... from {M, hbar, c, G}` | NOT a unique monomial | No monomial exists. Issue #806. |
| `upt map --equation` Coulomb with `r^2` | dimensional MISMATCH | r dropped. Issue #807. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #790 | `audit` DECOY and DERIVED groups |
| #805 | `derive` exit 70 with `permittivity` |
| #806 | `derive` header when no monomial exists |
| #807 | `map` dimension verdict drops a name |

## Other findings

Several textbook prefactors stay COEFFICIENT UNSET (thermal de Broglie, Fermi energy, Debye frequency). The uncertainty relation cannot be written. `derive` prints decimal prefactors where `audit` prints exact forms.
