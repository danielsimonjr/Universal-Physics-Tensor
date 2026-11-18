# Theoretical physicist dogfood, session 18, 2026-11-18

Persona: Theoretical physicist (outside the rotation)
Package under test: universal-physics-tensor@15.0.0 (installed from npm)
Next persona: Engineering physicist (session 19, same day)

A model persona ran this round against the published package, not a human reviewer. It ran in an empty directory: `npm i universal-physics-tensor@15.0.0`. `npm ls` and `upt version` printed 15.0.0. Node was v26.13.0. Each bug below was reproduced on a second, separate install before its issue was filed.

## What was run

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "2*pi*sqrt(1/9.81)"` | 2.0060666807106475 | README value. Match. |
| `upt derive period ... --formula` | prefactor 6.28318530717959 | 2π. Match. |
| `upt explain hawking-temperature mass=1Msun` | 6.16842971641034e-8 K | T_H(M☉). Match. |
| `upt evaluate be-42 mass=1Msun_iau` | 6.170260410964976e-8 K | Match. |
| `upt evaluate be-63 mu_e=2` | 2.895722231692708e+30 kg | 1.456 M☉, README value. Match. |
| `upt eval "2*G*M/c^2" M=1.989e30` | 2954.126555055405 m | r_s of the Sun. Match. |
| `upt atlas` | 20 bridges, 3 families | Count matches. |
| `upt regime waves` (no `--at`) | every inequality UNCHECKED, exit 0 | As the help says. |
| `upt regime waves --at c=1 omega0=1 k=20` | kg-wave valid; kg-schrodinger VIOLATED; exit 3 | ω0/(ck) = 0.05 ≤ 0.1; ck/ω0 = 20 > 0.1. Correct. |
| same with `c=1m/s omega0=1/s k=20/m` | same verdicts | Unit grammar works. |
| `upt regime diffusion --at dt=1s t=2min` | ab-walk-diffusion valid | 1/120 ≤ 0.01. Correct. |
| `upt map --relation=derivation --source=catalog` | 8 of 159 kept | Help wording matches. |
| `upt map --evidence=formally-proved --source=catalog` | 118 of 159 kept | See Negative results (be-12). |
| `upt explain period` (catalog) | NOT COVERED, exit 1, points to `--source=canonical` | Correct redirect. |
| `upt explain period --source=canonical length=1m gravity=9.81m/s^2` | 2.00606668071065 | Match. |
| library `buckinghamPi` (T, L, g) | 1 group, T²g/L | Correct. |
| library `buckinghamPi` (F, ρ, v, D, μ) | 2 groups, F/(ρv²D²) and Fρ/μ² | Correct. |
| library `buckinghamPi` (L, T) | 0 groups | Correct. |
| `canonicalRetrievalCorpus()` (`universal-physics-tensor/atlas`) | 109 records, 93 with `expr` | Residual form `target − scalarAst`. The 15.0.0 change is visible. |
| `parseUnit('5 km/s')` | throws `unknown unit '5'` | The README says otherwise. Issue #692. |
| `convertValue('1 mile','K')` | UnknownUnitError | Issue #678. |
| error paths (`1/0`, `sqrt(-1)`, a trailing `*`, an unknown flag, `be-42 mass=1s`, `be-63 mu_e=2kg`) | exit 1 or 2 with clear messages | Pass. |

## Candidate bridges (unproven)

### Standard

None proposed.

### Cross-domain

None proposed.

## Bugs found (for the joint review)

| # | Severity | Finding | Issue |
|---|---|---|---|
| 1 | Low | 16 canonical equations have no `scalarAst`, so retrieval cannot rank them by structure; CE-pendulum-period, the README's first example, is one | #680 |
| 2 | Low | The README says `parseUnit` reads a number with a unit; it reads a unit expression only | #692 |
| 3 | Low | `mile` and `furlong` are unknown units (shared with session 17) | #678 |

## Negative results

- Every README example and every hand-checked value matched, including the Buckingham groups.
- The regime verdicts follow the stated inequalities, with and without units.
- A lead of this round was refuted on reproduction: `be-12` keeps the `formally-proved` evidence tag under `upt map --evidence=formally-proved`, although its covers line says "covers its statement only". The catalog record has a reviewed `kind: bridge` reference with proof status `full`, and the evidence is derived from such a reference for its statement only (`WORKFLOWS.md`, Lean formalRef step 4). This is the design, not a defect.
- The 15.0.0 regime change is visible: the regime groups of `ab-telegraph-wave` are `tau · D · q^2` only, and `ab-string-wave` has none. A parameter name in a transformation text (`c² = D/τ`) is derived there, not a regime coordinate.
- Not run: `retrieve --embed` (the ONNX backend downloads a model; the Ollama backend loads a model on the shared host).
