# Engineering physicist dogfood, session 32, 2026-11-20

Persona: Engineering physicist (outside the rotation)
Area: an engineering workflow through the CLI and the library
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona designs instruments and devices. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 27 to 32 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install, and again on a third install, before its issue was filed. Known issues #684 and #736 to #760 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| cantilever first mode, `upt eval` (Si, 2 mm, 50 mm) | 1100.49 s^-1 | Match. |
| `upt map --equation` cantilever with catalog names | consistent [frequency] | Match. |
| `upt eval` thermistor beta model (10 kohm, 3950 K, 350 K) | 1404.86 ohm | Match. |
| `upt evaluate case-resistor-noise` with amplifier noise | V_rms_total 5.792171e-7 V | Match. |
| `upt eval "B+T" B=3950 T=350K` | 4300, exit 0 | Issue #768. |
| `parseUnit('V/sqrt(Hz)')` | UnknownUnitError | Issue #767. |
| `convertValue('1 kbit','bit')` | unknown unit | Issue #766. |
| `CATALOG_GRAPH.length` | 159 | README says 160. Issue #773. |
| `upt search Johnson noise` | be-58 missing | #756 comment. |
| `--record=FILE` then `--replay=FILE` | reproduced, exit 0 | Match. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #768 | a bare number takes any dimension |
| #773 | `CATALOG_GRAPH` count differs from the README |

## Other findings

`map --equation` cannot take declared dimensions for user names. `derive` exits 3 for the correct cantilever stiffness 3EI/L^3 (#760 comment). No beam, thermistor or Wheatstone entry.
