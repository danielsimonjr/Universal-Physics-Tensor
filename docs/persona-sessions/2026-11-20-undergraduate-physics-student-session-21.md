# Undergraduate physics student dogfood, session 21, 2026-11-20

Persona: Undergraduate physics student (outside the rotation)
Package under test: universal-physics-tensor@16.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It learns the package from the README, the help text and the error messages only. It ran in an empty directory: `npm i universal-physics-tensor@16.0.0`. `npm ls` and `upt version` printed 16.0.0. Node was v26.13.0. The MathTS packages installed were `mathts-core@0.28.0`, `mathts-functions@0.86.0` and `mathts-expression@0.14.1`. The round covers the CLI and the library API. Each bug below was reproduced on a second, separate install before its issue was filed.

## What was run (CLI)

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "2*pi*sqrt(1/9.81)"` | 2.0060666807106475 | Pendulum period, 2.00607 s. Match. |
| `upt eval "0.5*m*v^2" m=2kg v=3m/s` | 9 J | Match. |
| `upt eval "F/m" F=10N m=2kg` | 5 m/s^2 | Match. The unit is printed now (#694). |
| `upt eval "V/R" V=12V R=4ohm` | 3 A | Match. |
| `upt eval "m*c^2" m=1g` | 89875517873681.77 J | Match. |
| `upt eval "h*c/lambda" lambda=500nm` | 3.9729e-19 J | Match. |
| `upt eval "1/sqrt(1-(v/c)^2)"` at v = 0.6c | 1.25 | Match. |
| `upt eval "v/f" v=343m/s f=440Hz` | 0.7795454545 m | Match. |
| `upt eval "E/n^2" E=13.6eV n=2` | 5.4474005556e-19 J | Match. |
| `upt eval "2*G*M/c^2" M=1Msun` | 2954.13 m | Schwarzschild radius of the Sun. Match. |
| `upt eval "sigma_sb*T^4" T=300K` | 459.30 kg/s^3 | Value match. The unit is not named (#739). |
| `upt eval "1/(4*pi*eps0)"` | 8987551786.17 kg*m^3/(s^4*A^2) | Value match. The unit is not named (#739). |
| `upt eval "5 km/h"`, `"3 lb*s"` | 1.3888888888888888 m/s, 1.36077711 kg*s | Match. The 16.0.0 operator spellings work. |
| `upt eval "x+y" x=1m y=1s` | exit 1, `Cannot add [time] with running [length]` | Dimension check (#677). Pass. |
| `upt eval "13.6eV/n^2" n=2` | `parse error: Digit expected, got "V"`, exit 2 | A unit inside the formula. Issue #738. |
| `upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"` | prefactor 6.2832 | 2π. Match. |
| `upt derive V:voltage I:current R:resistance --formula "I*R"` | prefactor 1, exit 0 | Named dimension (#683). Pass. |
| `upt derive lambda:length h:action p:momentum --formula "h/p"` | `unknown base dimension 'momentum'`, exit 2 | Issue #740. |
| `upt evaluate be-16 temperature=300` | 2.870978885078724e-21 J | k_B T at 300 K. Match. |
| `upt evaluate be-42 M_kg=1.989e30` | 6.168429716410344e-8 K | Hawking temperature of the Sun. Match. |
| `upt evaluate be-58 T_K=300 R_ohm=1000` | 1.6567788e-17 V^2/Hz | Johnson noise 4 k_B T R. Match. |
| `upt explain kinetic-energy --source=canonical mass=2kg speed=3m/s` | 9 | Match. |
| `upt explain kinetic-energy mass=2kg speed=3m/s` | `NOT COVERED`, exit 1 | Issue #742. |
| `upt search Doppler`, `"thin lens"`, `blackbody`, `"time dilation"` | no entry matches every word | Issue #741. |
| `upt search Stefan` | `(units: ; ...)` | Empty units list. Issue #743. |
| `upt map --equation "F = m*a" --bind-short --equation-only` | `a` bound to `a [length]`, `m` unmatched, exit 3 | Issue #736. |
| `upt map --equation "E = 0.5*m*v^2" --bind-short --equation-only` | `v` binds; `m` and `E` do not; nothing checked | #684, reopened. |
| `upt retrieve --formula="2*pi*sqrt(L/g)" --dim=L:length --dim=g:acceleration` | CE-pendulum-period at index 71 of 109 | Issue #737. |

## What was run (API)

| Call | Result | Verdict |
|---|---|---|
| `parseUnit('km/h').scale` | 0.2777… | Match. |
| `parseUnit('kmh')`, `parseUnit('lbs')` | throw `UnknownUnitError` (`instanceof UnitError`) | The 16.0.0 grammar. Pass. |
| `parseUnit('')` | `{scale: 1}`, dimensionless, no throw | Issue #745. |
| `convertValue('100 degF', 'degC')` | 37.7778 | Match. |
| `convertValue('1 km', 'kg')` | throws a dimension mismatch | Pass. |
| `evaluateRelation('be-42', {mass: 1.989e30})` | 6.168429716410344e-8 | Match. |
| `evaluateRelation('be-16', {temperature: -5})` | throws `DomainViolationError` | Pass. Missing, unknown, NaN and string inputs each throw their own error class. |
| `composeEdges(be-42, be-16).evaluate({mass: M_SUN_KG})` | 5.903e-31 J, `highly-speculative` | Match with the README. |
| `composeEdges(be-16, be-42)` | throws `CompositionJunctionError` | Pass. |
| `CATALOG_GRAPH.length` | 159 | Matches the README. |
| `ATLAS_MODELS.length` (from `universal-physics-tensor/atlas`) | 9 | The CLI reports 24 models. Issue #744. |

## Retests of the session 20 issues

| Issue | 15.0.0 | 16.0.0 | Verdict |
|---|---|---|---|
| #677, `eval` adds unlike dimensions | `2`, exit 0 | exit 1, names both dimensions | Fixed. |
| #694, `eval` prints no unit | `6` | `6 m` | Fixed. |
| #683, `derive` named dimensions | `voltage` unknown | voltage, capacitance, inductance, permittivity accepted | Fixed. `momentum` and `resistivity` are #740. |
| #684, `map --equation` one-letter symbols | `v` does not bind | `v` binds; `m` and `E` do not | Partly fixed. Reopened. |
| #695, `map --family` counts | 1 of 10 kept | the counts add up | Not reproduced on either version. |
| #679, `retrieve` help example | accepted: none | accepted: none | By design (a text claim has no expression). The formula form is #737. |

On 15.0.0, `upt eval "v" v=5kmh` printed `18000000`, a wrong value with exit 0. On 16.0.0 it is refused.

## Candidate bridges (unproven)

### Standard

- **Doppler shift f' = f (v + v_r)/(v − v_s).** A ratio of speeds. Dimensions do not fix its form. `upt search Doppler` finds no entry.
- **Thin-lens equation 1/f = 1/d_o + 1/d_i.** A sum of reciprocal lengths. Dimensions cannot establish it. No entry.
- **Planck spectrum B_ν = (2hν³/c²)/(e^{hν/k_BT} − 1).** The 2 and the exponential are not fixed by dimensions. `search blackbody` finds no entry; Stefan–Boltzmann (be-165) exists.
- **Time dilation Δt = γ Δt₀.** The Lorentz factor exists. No entry is named time dilation.

### Cross-domain

- **Faraday's law ε = −dΦ_B/dt joined to the circuit relation V = IR.** Electromagnetism to circuits. `search Faraday` finds no entry.

## Bugs found (for the joint review)

| # | Severity | Finding | Issue |
|---|---|---|---|
| 1 | Medium | `map --equation --bind-short` binds one-letter names to unrelated quantities (`a` to a length, `F` to the Faraday constant) | #736 |
| 2 | Medium | `map --equation` still does not resolve `m` and `E` | #684 (reopened) |
| 3 | Medium | `retrieve --formula` with `--dim` ranks the pendulum 72nd of 109 | #737 |
| 4 | Low | A unit inside an `eval` formula prints a raw parser error | #738 |
| 5 | Low | Common derived units print as unnamed SI base products | #739 |
| 6 | Low | `derive` has no `momentum` or `resistivity` dimension | #740 |
| 7 | Low | `search` finds no entry for common undergraduate topics | #741 |
| 8 | Low | `explain` without `--source` says NOT COVERED for a canonical quantity | #742 |
| 9 | Low | `search` prints an empty units list | #743 |
| 10 | Low | `ATLAS_MODELS` holds only the oscillator family | #744 |
| 11 | Low | `parseUnit('')` returns a dimensionless unit with no error | #745 |

No finding has its cause in a MathTS package. The parser message in #738 comes from `mathts-expression`, but the parser is correct to refuse `13.6eV`. The defect is that UPT shows the message with no hint.

## Negative results

- Every hand-checked value matched, in the CLI and in the API.
- The error classes of `evaluateRelation` (`DomainViolationError`, `MissingInputError`, `UnknownInputError`, `NonFiniteInputError`, `InputTypeError`) each fire on the matching bad input.
- Not run: `retrieve --embed` (it needs a model), and `confront`, `probe`, `symbolic`, `testplan`, `audit`, `axes`, `discover`, `frontier`, `predict`, `priority`, `connectors`, `candidates`, `ground` and `recover`.
