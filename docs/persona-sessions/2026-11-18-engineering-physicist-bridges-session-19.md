# Engineering physicist dogfood, session 19, 2026-11-18

Persona: Engineering physicist (rotation position 1 of 7)
Package under test: universal-physics-tensor@15.0.0 (installed from npm)
Next persona: Condensed-matter physicist (rotation position 2 of 7)

A model persona ran this round against the published package, not a human reviewer. It ran in an empty directory: `npm i universal-physics-tensor@15.0.0`. `npm ls` and `upt version` printed 15.0.0. Node was v26.13.0. Each bug below was reproduced on a second, separate install before its issue was filed.

## What was run

About 120 CLI runs and 2 library scripts. Each number matches at displayed precision.

| Command | Printed | Hand value / verdict |
|---|---|---|
| `upt eval "1/(2*pi*sqrt(1e-3*1e-6))"` | 5032.921210448703 | f = 1/(2π√(LC)). Match. |
| `upt eval "1/(2*pi*1000*1e-6)"` | 159.15494309189535 | f_c = 1/(2πRC). Match. |
| `upt eval "B/mu0" B=12nT` | 0.009549296586785936 | 9.549e-3 A/m. Match. |
| `upt eval "2mH"` | `missing values for: mH`, exit 2 | Issue #690. |
| `upt evaluate case-resistor-noise ...` | V_rms = 4.068321e-7 V; σ_rel = 0.00158114 | √(4k_BT·R_eff·B) with R_eff = 999.001 Ω; 1/(2√(Bt)). Match. |
| `upt evaluate be-58 T_K=300 R_ohm=1000 --sigma ...` | 1.6567788e-17 ± 2.34e-19 | 4k_BTR; GUM in quadrature. Match. |
| `upt evaluate be-78 E_Pa=200e9 I_m4=8.33e-6 L_m=3 --sigma E_Pa=10e9 --sigma L_m=0.01` | 1826973.44 N ± 92200 N (5.04 %) | π²EI/L². Match. |
| `upt evaluate be-79 k_N_per_m=1 g0_m=2e-6 A_m2=1e-8` | 5.174087 V | √(8kg³/(27ε₀A)). Match. |
| `upt evaluate be-85 I_A=1mA` | 3.2043533e-22 A²/Hz | 2eI. Match. |
| `upt evaluate be-59 V_volts=1uV` | 483597848 Hz | 2eV/h. Match. |
| `upt evaluate be-159 km_m_per_s=1e-5 L_m=0.01 D_m2_per_s=1e-9` | 100 | Sh = k_m L/D. Match. |
| `upt evaluate be-66 I_W_per_m2=1361 R=0 theta_rad=0` | 4.5398e-6 Pa | I/c. Match. |
| `upt evaluate be-126 n=100 eps_F_per_m=8.854e-12 h_m=10um V_volts=10 g_m=2um` | 4.427e-7 N | nεhV²/g. Match. |
| `upt confront be-58` | residual −0.81σ | Within 1σ. Pass. |
| `upt derive` for the pendulum, the LC and the RC circuits | prefactors 2π, 1/(2π), 1 | Match. |
| `upt derive` for the cantilever deflection F·L³/(3EI) | NOT a unique monomial, exit 3 | F/E is an area, so the rank is 2. Correct refusal. |
| `upt derive x:voltage R:resistance` | `unknown base dimension 'voltage'`, exit 2 | Issue #683. |
| `upt derive tau:time m:mass b:M.T^-1 k:M.T^-2 --formula "m/b"` | NOT a unique monomial, exit 3 | Issue #685. |
| `upt derive V:... R:resistance I:current --formula "V/(R*I)"` | `undeclared symbol 'V'`, exit 2 | Issue #686. |
| `upt map --equation "omega = sqrt(k/m)" --equation-only` | `k`, `m` taken as dimensionless | Issue #684. |
| `upt map --relation=derivation --source=both` | 8 of 268 kept; 2 and 258 dropped | The counts add up. Pass. |
| `upt regime oscillators --at theta0=0.6` / `theta0=0.2` | VIOLATED exit 3 / valid exit 0 | Pass. |
| `upt regime waves --at F=100 --at EI=0.01 --at k=5 --at mu=0.01` | `no record in family 'waves' uses it` | Issue #687. |
| `upt explain damping-spring --source=catalog` | `cannot be determined from {} (no inputs)` | Issue #689. |
| `upt search mems`, `upt search sensor` | no entry | Issue #691. |
| atlas bounds: stiff string, telegraph wave, linear pendulum, spring-LC counterexample | δ = 0.004987562, 0.0050126, 0.0158525; ζ = 0.5 | Hand values match. |

## Candidate bridges (unproven)

### Standard

- **Lumped thermal RC against electrical RC.** τ = R_th·C_th = R·C. A lumped thermal node, C_th dT/dt = (T_amb − T)/R_th, has the form of the first-order model with b = C_th and k = 1/R_th.
- **Euler buckling and parallel-plate pull-in as fold thresholds.** P_cr = π²EI/L² (be-78) and V_pi = √(8kg₀³/(27ε₀A)) (be-79) are both the fold point of a spring-restored load.

### Cross-domain

- **Johnson noise against the Einstein relation.** S_V = 4k_BTR (be-58) and D = μk_BT/q (be-70) each write a fluctuation as k_BT times a dissipative coefficient. Candidate: one fluctuation–dissipation statement.
- **Stiff string against a tensioned MEMS beam resonator.** ω² = (F/μ)k² + (EI/μ)k⁴ is the same two-term dispersion.

## Bugs found (for the joint review)

| # | Severity | Finding | Issue |
|---|---|---|---|
| 1 | Medium | `derive` has no named dimension for voltage, capacitance, inductance or permittivity | #683 |
| 2 | Medium | `map --equation` does not resolve `k`, `m` or `omega`, places `F = m*a` in a cluster through an unbound name, and `--bind-short` binds `a` to a length with no warning (shared with session 17) | #684 |
| 3 | Low | `derive` reports a non-unique monomial when a declared variable is unused, and does not name it | #685 |
| 4 | Low | `derive` calls the target an undeclared symbol when the target is in its own formula | #686 |
| 5 | Low | `regime` says no record uses `mu`; the stiff-string horizon uses it | #687 |
| 6 | Low | The `retrieve` help example returns nothing (shared with session 17) | #679 |
| 7 | Low | `map --help` does not list the `--relation` and `--evidence` values | #688 |
| 8 | Low | `explain <quantity>` with no inputs gives a confusing message | #689 |
| 9 | Low | `eval "2mH"` reports a free variable and gives no unit hint | #690 |
| 10 | Low | `search` finds nothing for `mems` or `sensor` | #691 |

## Negative results

- Every hand-checked value matched, including the GUM uncertainties and four atlas bounds.
- The cantilever refusal is correct: F, E, L and I have rank 2, so dimensions do not fix the 1/3.
- A lead of this round was refuted on reproduction: `upt regime --at` with one quoted string of several pairs fails, but the help's own form, several unquoted pairs after one `--at` (`--at tau=1 D=1 q=1`), works. The help is correct.
- Not run: `retrieve --embed` with the ONNX vector cache (the peer is not installed), `--fetch-model` (a download), the Ollama backend, and the `engines.node >=22.12` floor (the run used Node v26.13.0).
