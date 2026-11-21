# Theoretical physicist dogfood, session 37, 2026-11-20

Persona: Theoretical physicist (outside the rotation)
Area: the discovery tools
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona works in closed forms, limits and conventions. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. Sessions 33 to 38 ran in parallel, one subject area each. Each bug below was reproduced on a second, separate install before its issue was filed. Known issues #684, #736 to #760 and #762 to #779 were not reported again.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt discover` funnel | 4192 total; categories sum to 4192 | Match. |
| `upt axes` scale table | Fisher p 0.619, OR 0.429 | Match. |
| `upt probe run` pendulum | c = 6.283, not novel | 2 pi. Match. |
| `upt priority` | of 34 non-established bridges | List differs from catalog. Issue #785. |
| `upt probe study` | no-credible-candidate and credible | Issue #786. |
| `upt frontier --json` | one reason for 4192 records | Issue #787. |
| `upt candidates` | [alfven], [gap] | Kind tags, not dimensions. Issue #788. |
| `upt probe design --h1=...` | file not found | Issue #789. |
| `upt audit` | be-48 DERIVED; 5 bridges absent | Issue #790. |

Each value marked Match agrees with a hand value from CODATA constants. No finding has its cause in MathTS.

## Bugs filed

| Issue | Finding |
|---|---|
| #785 | `priority` set and footer |
| #786 | `probe study` labels |
| #787 | `frontier` reasons |
| #788 | `candidates` brackets |
| #789 | `probe design` input and help |

## Other findings

Every promising candidate relation was judged a dimensional coincidence. The magnitude test accepts any pair within three decades.
