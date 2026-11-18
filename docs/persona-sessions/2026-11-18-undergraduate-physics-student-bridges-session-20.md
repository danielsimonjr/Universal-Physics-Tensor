# Undergraduate physics student dogfood, session 20, 2026-11-18

Persona: Undergraduate physics student (outside the rotation)
Package under test: universal-physics-tensor@15.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7, after session 19)

A model persona ran this round against the published package, not a human reviewer. The persona is new to the package. It tries to learn the package from the README, the help text and the error messages alone. It ran in an empty directory: `npm i universal-physics-tensor@15.0.0`. `npm ls` and `upt version` printed 15.0.0. Node was v26.13.0. Each bug below was reproduced on a second, separate install before its issue was filed or commented.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "2*pi*sqrt(1/9.81)"` | 2.0060666807106475 | Pendulum period, 2.00607 s. Match. |
| `upt eval "sqrt(2*9.81*0.2)"` | 1.9809088823063015 | Free-fall speed √(2gh). Match. |
| `upt eval "1/(4*pi*8.854e-12)"` | 8987742437.988218 | Coulomb constant. Match. |
| `upt eval e`, `"log(100)"`, `"log10(100)"` | 1.602176634e-19, 4.605…, 2 | `e` is the elementary charge and `log` is natural, as the help says. |
| `upt eval "lg(100)"` | unknown function, names `log10`, exit 2 | Helpful error. Pass. |
| `upt eval "1/0"`, `"1+1" --bogus` | exit 1, exit 2 | Clear errors. Pass. |
| `upt eval "hbar*c^3/(8*pi*G*M*k_B)" M=1.989e30` | 6.168429716410344e-8 | Hawking temperature of the Sun. Match. |
| `upt eval "F/m" F=10N m=2kg` | 5 | 5 m/s². No unit printed. Issue #694. |
| `upt eval "x+y" x=1m y=1s` | 2, exit 0 | No dimension check. Issue #677. |
| `upt eval T T=20degC` | 293.15 | Match. |
| `upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"` | prefactor 6.28318 | 2π. Match. |
| `upt derive kinetic-energy:energy mass:mass speed:velocity --formula "mass*speed^2"` | differs from CE-kinetic-energy by a factor of 2, exit 3 | Correct catch. Pass. |
| same with `"0.5*mass*speed^2"` | prefactor 0.5, agrees | Pass. |
| `upt derive energy:energy mass:mass speed:speed ...` | `unknown base dimension 'speed'`, exit 2 | `velocity` works. Comment on issue #683. |
| `upt evaluate be-63 mu_e=2` | 2.895722e30 kg | 1.456 M☉. Match. |
| `upt search pendulum`, `"kinetic energy"` | the expected entries | Pass. |
| `upt search "free fall"`, `equipartition` | no entry; be-167 only | Negative results. |
| `upt atlas ab-pendulum-linear` | δ = 0.0158525, θ0 ≤ 0.5 rad | 1 + θ0²/16 at 0.5 rad. Consistent. |
| `upt map --equation "E = 0.5*m*v^2" --bind-short --equation-only` | `m` taken as dimensionless, `E` not resolved | Comment on issue #684. |
| `upt map --relation=derivation --family=oscillators` | shown: 1 bridge touches; filter: 1 of 10 kept | Issue #695. |
| `upt retrieve "period of a pendulum"` | accepted: none | Issue #679 (sessions 17 and 19). |

## Candidate bridges (unproven)

### Standard

- **Free-fall speed v = √(2gh).** Dimensions do not fix the 2. `upt search "free fall"` finds no entry.
- **Equipartition, ½ k_B T per quadratic degree of freedom.** Dimensions do not fix the ½. `upt search equipartition` finds only be-167.

### Cross-domain

- **Kinetic pressure P = ⅓ρ⟨v²⟩.** Dimensions do not fix the ⅓. Not searched.

## Bugs found (for the joint review)

| # | Severity | Finding | Issue |
|---|---|---|---|
| 1 | Medium | `eval` adds unlike dimensions (shared with session 17) | #677 |
| 2 | Low | `eval` prints the result with no unit, and the help does not say that it is SI | #694 |
| 3 | Medium | `map --equation` does not resolve `E`, and `--bind-short` does not bind `m` (shared with sessions 17 and 19) | #684 |
| 4 | Low | `derive` does not accept `speed` as a dimension name (shared with session 19) | #683 |
| 5 | Low | `map --family` filter count does not match the shown count, and it names no denominator | #695 |
| 6 | Low | The `retrieve` help example returns nothing (shared with sessions 17 and 19) | #679 |

## Negative results

- Every hand-checked value matched.
- Four leads of this round were refuted on reproduction:
  - `upt derive energy:energy mass:mass velocity:velocity --formula "mass*velocity^2"` prints MATCHES with prefactor 1. The prefactor is the user's own formula. The line says "the prefactor is NOT checked", and it says why: no canonical equation has the target `energy` with these variables. With the target `kinetic-energy`, the factor of 2 is caught. The output is correct.
  - `upt` with no arguments prints a demo and says "run `upt help` for usage". This is the design.
  - The catalog sizes do not disagree. There are 160 records, ids be-11 to be-170. The 159 graph edges are a different set: an edge is a relation, not a record.
  - `upt map --help` is long. This is not a defect.
- Not run: `retrieve --embed` with a model.
