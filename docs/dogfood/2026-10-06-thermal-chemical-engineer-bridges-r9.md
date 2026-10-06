# Thermal and chemical engineering — bridge dogfood of published 7.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@7.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-700`: `npm i universal-physics-tensor@7.0.0`. Node v22.14.0. `npm audit` reports 0 vulnerabilities. `npm view universal-physics-tensor@7.0.0 version gitHead --prefer-online` printed `7.0.0` and `9c3002507c52deb0d21d06b09448170bd8c7f80c`. Annotated tag `v7.0.0` is object `34b8e2a9255d5e78673c6232fb1d9a2fa340624e` and its target is that commit. The publish workflow is run `37418794710`. `gh release view v7.0.0` returns release not found. The CLI is `./node_modules/.bin/upt`. `upt version` prints `7.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.68.0)]` and `2.718281828459045`.

This session is the thermal and chemical engineering round. [Issue #348](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/348) asks for a rotating persona. The condensed-matter round is `docs/dogfood/2026-10-05-condensed-matter-physicist-bridges-r8.md`. The engineering-physicist rounds are `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md` and `docs/dogfood/2026-10-05-engineering-physicist-bridges-r7.md`. The plasma and space round is `docs/dogfood/2026-10-04-plasma-space-bridges-r6.md`. The persona for this round is the thermal and chemical engineer. The workflows exercised here are the regression classes from rounds 4–8, including the siblings of the unified paths in #431, then heat transfer, a cycle, a real-gas coefficient, phase equilibrium, kinetics, electrochemistry, and mass transfer.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 136. Status counts: 100 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–146 with no duplicates. `CANONICAL_EQUATIONS.length` is 109. Search footer: 136 catalog bridges, 109 canonical equations, 24 atlas models, 20 atlas bridges, 596 quantities, 6 applied cases, 3 regimes. `upt help evaluate` names `BE-16/42/51/52/55..146`. `upt map --source=catalog --evidence=formally-proved` keeps 94 of 127 edges, drops 32 that did not match, and drops 1 with no overlay metadata. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-700`. "Printed" is the output of `universal-physics-tensor@7.0.0`. The library calls are `evaluateRelation`, `parseUnit`, and `convertValue` from that install.

### r4–r8 checklist, and the siblings of #431

| theme | result | what 7.0.0 did |
|---|---|---|
| Empty and missing unit declarations, and the concatenated tokens of #428 | pass on the original keys and on `m2K`, `Vs`, `W/m2K`, and `cm^2/Vs`; fail when the token is already one factor | be-83 accepts `V/K2` and `V/K^2`. be-78 accepts `m^4`. be-79 accepts `cm^2`. be-80 accepts `F/m`. be-82 accepts `pA`. be-84 accepts `mA`. be-85 accepts `uA` and rejects a metre. `20W/m2K` and `20W/(m2*K)` both give `eta = 0.9242343145200195` at `k = 200`. `1400cm^2/Vs` parses; the Einstein command then hits the carrier-sign check. `W/mK` and `kg/ms` take the prefix reading. That is issue #435. Litre, BTU, psi, kcal, torr, mmHg, and centipoise are unknown. That is issue #436. |
| Synonym collapse and disagreement (#371, #379, #418, #425, #426) | pass for the three registered groups; fail for Boltzmann spellings and for the two specific-heat names | Equal magnetic spellings are one cyclotron variable. Unequal spellings exit 1 with no recovered value. `T` and `temperature` at different numbers exit 1. `erasure-energy` resolves as a Landauer input. `k_B=1` beside `boltzmann-constant=2` still prints a number. `specific-heat=1000` beside `specific-heat-capacity=385` still prints a diffusivity. That is issue #437. |
| Even-in-charge magnitude, and the dimensionless coefficients of #429 | pass on the monomials; fail on a sum and on an exponential | Plasma frequency prints `\|charge\|` and `56414.6023118063`. Larmor radius prints `\|charge\|^-1` and `0.00000568563010356572`. The point-charge field at `charge=-e`, `r=1` is `-1.43996454784257e-9`. Larmor power is `5.70832676502951e-54`. Equipartition at 300 K is `6.2129205e-21`. Carnot, the first law, and the Boltzmann factor throw `missing a finite input`. That is issue #438. |
| Temperature binding (#395, #404, #425, #427) | pass on the four spellings, on a declared kelvin slot, and on `--sigma`; fail when the value itself is a Celsius difference | `T=10eV`, `temperature=10eV`, and `temp=10eV` read `k_B T`. `--sigma T_K=10eV` converts and flags the linearization. `--sigma T_K=10degC` stays a 10 K difference. `temperature-change=10degC` on sensible heat becomes 283.15 K. That is issue #434. |
| Carrier sign (#364, #378, #405) | pass | Einstein opposite signs throw `CarrierSignError` from the CLI and from `evaluateRelation`. Both signs negative stay `D = 0.0036192799701009757`. Conductivity throws on opposite signs and is `40711308.26994` when both are negative. |
| `resolveEvaluable` shared by CLI and library (#424) | pass for catalog and canonical ids | `evaluateRelation('be-62')` returns the gap `1.7534124005726843e-22`. `be-61` returns `L0 = 2.443004509073667e-8`. `be-16`, `be-58`, and `be-71` return values. Empty inputs on be-53, be-54, and be-134 through be-146 throw `DomainViolationError`, not an unknown id. `case-lumped-cooling` is an unknown id. Cases are a CLI path. |

#### Units

| command | exit | printed |
|---|---|---|
| `upt evaluate be-83 T_K=300 dS_dT_V_per_K2=1e-6` | 0 | `mu_V_per_K = 0.0003` |
| same, `1e-6V/K2` and `1e-6V/K^2` | 0 | the same `0.0003` |
| `upt evaluate be-129 h_W_per_m2_K=20W/m2K k_W_per_m_K=200 …` | 0 | `20W/m2K → 20`, `eta = 0.9242343145200195` |
| the same command with `20W/(m2*K)` | 0 | the same `eta` |
| `upt evaluate be-129 … k_W_per_m_K=401W/mK` | 1 | `'W/mK' is [L^2 M T^-3 Theta^-1]`, input is `W/(m*K)`. Issue #435. |
| `upt evaluate be-129 … k_W_per_m_K=401W/(m*K)` | 0 | `eta = 0.9604106075918019` |
| `upt evaluate case-brownian-sphere … eta_Pa_s=1kg/ms` | 1 | `'kg/ms' is [M T^-1]`, input is `Pa*s`. Issue #435. |
| `upt evaluate be-70 mu_m2_per_Vs=1400cm^2/Vs … q_C=-e` | 1 | the carrier-sign sentence, so the unit became a positive `0.14` |
| `upt eval V V=1L` | 1 | `'1L' is not a number with an optional unit`. Issue #436. |
| `upt eval E E=1BTU`, `E=1kcal/mol`, `P=1psi`, `P=1torr`, `eta=1cP` | 1 | unknown unit. Issue #436. |

`parseUnit('W/mK').scale` is `1000`. `parseUnit('kg/ms').scale` is `1000` with dimension mass per time. `parseUnit('mK')` is a millikelvin, scale `0.001`. `parseUnit('mPas')` throws `'mPas' is ambiguous: mPa·s or m·Pa·s`. `parseUnit('mPa*s')` is `0.001` Pa·s. `kJ/mol`, `J/molK`, `J/(mol*K)`, `bar`, `mbar`, `atm`, `kPa`, `mol`, `g/mol`, `cm3`, `kJ/kg`, `J/kgK`, and `kWh` parse. `convertValue` reads `25degC` as `298.15` K and `1bar` as `100000` Pa.

#### Synonyms, and the coefficient path

`upt explain cyclotron-frequency` with `magnetic-field=1` and `magnetic-flux-density=1` exits 0. Recovered value `-175882001077.216`. The command with `magnetic-flux-density=2` exits 1 and prints no value.

`upt eval 'k_B*T/e' T=300 temperature=400` exits 1: `T and temperature are one quantity and disagree`. The agreeing command prints `0.025851999786435535`. `T_K=400` beside `T=300` exits 1. `upt explain erasure-energy temperature=300 --source=catalog` recovers `2.87097888507872e-21`. The same number as an `erasure-energy` input resolves and cross-checks be-16.

`upt eval 'k_B*T' T=300 k_B=1 boltzmann-constant=2` exits 0 and prints `300`. `upt eval 'k_B*T' T=10eV k_B=1 boltzmann-constant=2` says `T` is `8.010883e-19` K and prints `8.01088317e-19`. `upt explain thermal-diffusivity density=8933 thermal-conductivity=401 specific-heat-capacity=385 specific-heat=1000 --source=canonical` exits 0, says the monomial is not unique, and recovers `0.000116596713484657` from `specific-heat-capacity` alone. That split is issue #437.

| command | exit | printed |
|---|---|---|
| plasma frequency, `n=1e6`, `charge=-e` | 0 | `56414.6023118063`. The monomial is `\|charge\|`. |
| Larmor radius, `charge=-e`, `B=1` | 0 | `0.00000568563010356572`. The monomial is `\|charge\|^-1`. |
| Larmor power, `charge=-e`, `acceleration=1`, `c` | 0 | `5.70832676502951e-54` |
| point-charge field, `charge=-e`, `r=1` | 0 | `-1.43996454784257e-9` |
| Coulomb force, both charges `-e`, `r=1` | 0 | `2.30707755234174e-28` |
| field energy density, `electric-field=1` | 0 | `4.4270939064e-12` |
| Hooke, `k=1`, `x=1` | 0 | `-1` |
| equipartition, `T=300` | 0 | `6.2129205e-21` |
| `evaluateRelation('CE-carnot-efficiency', { cold: 300, hot: 800 })` | throw | `missing a finite input`. Issue #438. |
| `evaluateRelation('CE-first-law-thermodynamics', { heat: 100, work: 40 })` | throw | the same sentence |
| `evaluateRelation('CE-boltzmann-factor', …)` | throw | the same sentence |

Library values on the same install: kinetic energy `m=2`, `v=3` is `9`; capacitor and inductor energy at `2` and `3` are `9`; dynamic pressure `ρ=1000`, `v=2` is `2000`; Laplace pressure `γ=0.072`, `r=1 mm` is `144`; Stokes drag is `1.88495559215388e-12`; half-life at `λ=1` is `0.6931471805599453`; Stefan–Boltzmann at `300` K is `459.300327939`; Wien at `5800` K is `4.99615854310345e-7`. Canonical audit tags equipartition `×1.500e+0` and kinetic pressure `×3.333e-1` as empirical. The printed numbers are `(3/2) kT` and `(1/3) ρ v²`.

`epsilon_0` as an explain binding exits 1: the name did not resolve. The field command without that binding recovers the `4π` value above. `vacuum-permittivity` is the plasma-frequency input name.

#### Temperature

`upt eval "k_B*T/e" T=10eV` exits 0, says `T` is `1.160452e+5` K, and prints `10`. `upt eval E E=10eV` prints `1.602176634e-18`. Explain of most-probable speed with `temperature=10eV`, with `T=10eV`, and with `temp=10eV` each converts and prints no recovered number. The factor is unset. `temperature=1m` exits 1.

`upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=10eV` exits 0. `S_V = 1.6567788e-17 ± 6.41e-15`, and the linearization is flagged. `--sigma T_K=10degC` is `± 5.52e-19`, relative `3.33%`. `upt evaluate be-87 T_K=25degC C_F=1e-12` converts to `298.15` K and prints `v2_V2 = 4.1164049935e-9`. `T_K=77degF` exits 1.

`upt discover --source=canonical --anchor=temperature=10eV` exits 0. The anchor line is `temperature=116045.18121550081`. The funnel is 377 candidates, 39 promising, 331 inert, 6 magnitude-clash, 0 contradictory, 1 axis-clash.

`upt explain heat-energy mass=1 specific-heat=4180 temperature-change=10degC --source=canonical` recovers `1183567`. The same command with `10` or `10K` recovers `41800`. `upt eval '4180*dT' dT=10degC` prints `1183567`. `upt eval 'T2-T1' T2=100degC T1=20degC` prints `80`. That difference-versus-point split is issue #434.

`upt eval '1-Tc/Th' Tc=300 Th=10eV` prints `-187245272233822880000`. `Th` is not in the temperature group. `upt evaluate be-130 Th_K=600degC Tc_K=25degC Z_per_K=0.001` converts each junction (`873.15` K and `298.15` K) and prints `eta = 0.10664733971181045`. The group comment says `Th_K` and `Tc_K` stay out of the temperature group. This eval is not filed.

#### Carrier sign, and the library id

`upt evaluate be-70` with opposite signs exits 1: `electrical-mobility (mu_m2_per_Vs) and carrier-charge (q_C) must have the same sign`. `evaluateRelation('be-70', …)` throws `CarrierSignError` on that pair. Both signs negative return `D_m2_per_s = 0.0036192799701009757`. Hall coefficient at `n=1e22`, `charge=-e` is `-0.000624150907446076`. Cyclotron frequency stays signed.

### Encoded thermal and chemical paths

| command | exit | printed |
|---|---|---|
| `upt evaluate be-71 L_J_per_kg=2256.4kJ/kg T_K=100degC delta_v_m3_per_kg=1.672` | 0 | `L = 2256400`, `T = 373.15`, `slope_Pa_per_K = 3616.565807585364` |
| the same latent heat as `40.66kJ/mol` | 1 | `kJ/mol` is energy per amount; the slot is `J/kg` |
| `upt evaluate case-lumped-cooling` copper sphere, `a=5 mm`, `h=20`, `100degC` to `20degC`, `t=300` | 0 | `tau_s = 286.6004166666667`, `Bi = 8.312551953449709e-5`, `T_K = 321.236052397565`. The lumped check holds (`Bi ≤ 0.1`). |
| `upt evaluate case-brownian-sphere T_K=20degC eta_Pa_s=1e-3 a_m=1um …` | 0 | `D_m2_per_s = 2.1471978227748074e-13`, `gamma = 1.8849555921538757e-8`, `Re = 6.936778535904651e-4` |
| `evaluateRelation('CE-ideal-gas', { N: N_A, T: 298.15, V: 0.001 })` | — | `P = 2478957.029602388` Pa |
| the same call with `N = 1` | — | `P = 4.1164049935e-18` Pa |
| `upt explain radiative-flux temperature=100degC --source=canonical` | 0 | `1099.3741485584` |
| `upt explain peak-wavelength temperature=5800 --source=canonical` | 0 | `4.99615854310345e-7` |
| `upt eval 'A*exp(-Ea/(N_A*k_B*T))' A=1e13 Ea=50kJ/mol T=25degC` | 0 | `17393.17968736233` |
| `upt eval 'E0-(N_A*k_B*T)/(n*F)*ln(Q)' E0=0 n=1 Q=10 T=25degC` | 0 | `-0.05915934968478233` |
| `upt eval 'k_B*T/h' T=298.15` | 0 | `6212437991620.116` |
| `upt eval N_A*k_B` | 0 | `8.31446261815324` |
| `upt eval F` | 0 | `96485.33212331001` |
| `upt eval R` | 2 | `R` is unbound |
| `upt evaluate be-86 C_f=0.005` | 0 | `St = 0.0025` |
| `upt explain carnot-efficiency` at `300` K and `800` K | 0 | names `CE-carnot-efficiency` and prints no recovered value |

`N` on the ideal-gas law is a dimensionless count. Explain of `pressure` with a supplied `k_B` exits 1: `k_B` did not resolve, because that constant is baked. `upt eval V V=1L` exits 1, so a litre was not the volume in the ideal-gas call. The volume that evaluated is `0.001` m³.

Search exits 1 for `arrhenius`, `eyring`, `nernst`, `van t hoff`, `gibbs`, `raoult`, `fourier`, `nusselt`, `newton cooling`, `otto`, `rankine`, `van der waals`, `butler volmer`, `faraday`, `saha`, `sackur tetrode`, `mass transfer`, `sherwood`, `schmidt`, `lewis`, `dittus`, `joule thomson`, `fugacity`, `chemical potential`, `antoine`, `trouton`, and `blackbody`. `biot` and `biot number` name `case-lumped-cooling`. `prandtl` and `reynolds` name be-86. `reynolds number` exits 1. `fick` names `model-fick` and the atlas bridges into it. `clausius` names `CE-clausius-entropy`. `clapeyron` names be-71 among three hits. `ideal gas` names `CE-ideal-gas`. `stefan` names `CE-stefan-boltzmann`. `wien` names `CE-wien`. `carnot` names `CE-carnot-efficiency`. `stokes-einstein` names `CE-stokes-einstein`. `planck` returns 19 hits and does not name a spectral law. These misses are search results. They are not filed.

`upt audit --source=catalog` exits 0: DERIVED 31, COEFFICIENT UNSET 0, DECOY 16, NOT A MONOMIAL 14, OPEN 66. `upt audit --source=canonical` exits 0: DERIVED 72, COEFFICIENT UNSET 6 (`CE-thermal-de-broglie`, `CE-sound-speed`, `CE-fermi-energy`, `CE-fermi-velocity`, `CE-debye-frequency`, `CE-mb-most-probable-speed`), DECOY 12, NOT A MONOMIAL 0, OPEN 19. `CE-carnot-efficiency`, `CE-boltzmann-factor`, and `CE-first-law-thermodynamics` are in that OPEN list at complexity 1. `CE-stefan-boltzmann` is DERIVED `×1.645e-1` with the empirical tag. Its AST is `sigma_sb * T^4`. `CE-wien` is DERIVED `×1.265e+0` with the empirical tag. Its AST is `b / T`.

Bare `e` prints `1.602176634e-19`. Bare `E` exits 2 and names energy. `euler` is refused. `1-e^2` exits 2 on a dimension mismatch.

## (b) New candidates

Every row is unproven. The next catalog id after BE-146 would be BE-147. A recovered prefactor is the command's report of the formula that was typed. `upt derive` on each row says no canonical equation has that target and those variables.

Already encoded, and not proposed again: BE-16 Landauer, BE-21 KSS, BE-28 Onsager entropy production, BE-29 Jarzynski, BE-42 Hawking temperature, BE-43 area law, BE-57 Unruh, BE-58 Johnson–Nyquist, BE-61 Wiedemann–Franz, BE-70 Einstein relation, BE-71 Clapeyron slope, BE-73 Kelvin `Π = S T`, BE-86 Reynolds analogy at `Pr = 1`, BE-87 `kT/C`, BE-134 through BE-146, `CE-stefan-boltzmann` as `j = σ T^4`, `CE-wien` as `λ = b/T`, `CE-ideal-gas`, `CE-carnot-efficiency`, `CE-stokes-einstein`, `CE-bekenstein-hawking`, and `model-fick`.

| id | type | name | equation | domains | constants | from the catalog |
|---|---|---|---|---|---|---|
| BE-147 | standard | Arrhenius rate | `k = A exp(−Ea/(R T))` | chemical kinetics | `R = N_A k_B` | no edge |
| BE-148 | standard | Eyring rate | `k = (k_B T / h) exp(−ΔG‡/(k_B T))` | kinetics ↔ statistical mechanics | `h`, `k_B` | no edge |
| BE-149 | standard | van 't Hoff | `d ln K / dT = ΔH° / (R T²)` | chemical equilibrium | `R` | no edge |
| BE-150 | standard | Gibbs isotherm | `ΔG° = −R T ln K` | chemical equilibrium | `R` | no edge |
| BE-151 | standard | Nernst ↔ Gibbs | `E = E° − (R T /(n F)) ln Q`, `ΔG = −n F E` | electrochemistry ↔ thermodynamics | `F = N_A e`, `R` | no edge. BE-82 is a diode current |
| BE-152 | standard | Integrated Clausius–Clapeyron | `ln(P2/P1) = −(ΔH/R) (1/T2 − 1/T1)` | phase equilibrium | `R` | BE-71 is the slope, not this integral |
| BE-153 | standard | Raoult | `P_i = x_i P_i*` | phase equilibrium | none | no edge |
| BE-154 | standard | Prandtl number | `Pr = μ c_p / k` | heat transfer ↔ momentum | none | BE-86 assumes `Pr = 1` |
| BE-155 | standard | Reynolds number | `Re = ρ v L / μ` | fluid mechanics | none | BE-86 is not this definition |
| BE-156 | standard | Biot number | `Bi = h L_c / k` | heat transfer | none | the lumped case prints `Bi`; no bridge id |
| BE-157 | standard | Nusselt number | `Nu = h L / k` | convection | none | BE-86 says it is not a Nusselt correlation |
| BE-158 | standard | Schmidt number | `Sc = μ / (ρ D)` | mass transfer | none | no edge |
| BE-159 | standard | Sherwood number | `Sh = k_m L / D` | mass transfer | none | no edge |
| BE-160 | standard | Fourier conduction | `q = −k dT/dx` | heat conduction | none | no edge. Search `fourier` exits 1 |
| BE-161 | standard | Newton cooling | `q = h A ΔT` | convection | none | the lumped case integrates the ODE |
| BE-162 | standard | Otto efficiency | `η = 1 − r^(1−γ)` | thermodynamic cycles | `γ` | no edge. `CE-carnot-efficiency` is a different cycle |
| BE-163 | standard | Joule–Thomson | `μ_JT = [T (∂v/∂T)_p − v] / c_p` | real gas | none | no edge |
| BE-164 | cross-domain | Planck spectrum | `u(ν) = (8π h ν³/c³) / (exp(hν/(k_B T)) − 1)` | thermal radiation ↔ quantum electromagnetism | `h`, `c`, `k_B` | `CE-stefan-boltzmann` and `CE-wien` take `σ` and `b` as inputs |
| BE-165 | cross-domain | Stefan–Boltzmann constant | `σ = π² k_B⁴ / (60 ℏ³ c²)` | thermal radiation ↔ quantum electromagnetism | `ℏ`, `c`, `k_B` | the law `j = σ T^4` is encoded; this constant is not an edge |
| BE-166 | cross-domain | Wien displacement constant | `b = h c / (k_B x)`, `x` the root of `(5−x) = 5 exp(−x)` | thermal radiation ↔ quantum electromagnetism | `h`, `c`, `k_B` | `CE-wien` takes `b` as an input |
| BE-167 | cross-domain | Sackur–Tetrode | `S = N k_B (ln(n_Q/n) + 5/2)` | thermodynamics ↔ quantum statistics | `k_B`, and `h` inside `n_Q` | `CE-thermal-de-broglie` is the wavelength and is COEFFICIENT UNSET |
| BE-168 | cross-domain | Saha ionization | `K = (2π m k_B T / h²)^(3/2) exp(−I/(k_B T))` | chemistry ↔ plasma | `h`, `k_B` | no edge. Search `saha` exits 1 |
| BE-169 | cross-domain | Richardson–Dushman | `J = (4π m e k_B² / h³) T² exp(−φ/(k_B T))` | thermionic emission ↔ quantum statistics | `h`, `k_B`, `e` | no edge |
| BE-170 | cross-domain | Onsager reciprocity | `L_12 = L_21` | nonequilibrium thermodynamics ↔ transport | none | BE-73 assumes it for `Π = S T`. BE-28 is `σ = Σ J X` |

### 1. Arrhenius rate — kinetics — unproven — BE-147 — standard

- **Formula.** `k = A exp(−Ea / (R T))`, with `R = N_A k_B`. `Ea` and `R T` are energies per amount.
- **Why units are not enough.** `upt derive k:frequency T:temperature Ea:L^2.M.T^-2.N^-1 R:L^2.M.T^-2.Theta^-1.N^-1 A:frequency --formula 'A*exp(-Ea/(R*T))'` exits 3. Two groups: `T · Ea^-1 · R` and `k · A^-1`. The formula dimension is a frequency and matches. The exponential is not recovered. `upt search arrhenius` exits 1. `upt eval` of `A=1e13`, `Ea=50kJ/mol`, `T=25degC` prints `17393.17968736233`.
- **Proof-sketch premises.** A Boltzmann factor on a molar barrier, and a temperature-independent prefactor `A`. The Eyring identification of `A` is BE-148.
- **Lean.** `k * exp(Ea / (R * T)) = A`, with `R = N_A * k_B`, for `T > 0`.
- **Opened.** No measured rate constant.

### 2. Eyring rate — kinetics ↔ statistical mechanics — unproven — BE-148 — standard

- **Formula.** `k = (k_B T / h) exp(−ΔG‡ / (k_B T))`. The Arrhenius link, for the unimolecular solution convention, is `A = (k_B T / h) exp(ΔS‡ / R)` and `Ea = ΔH‡ + R T`.
- **Why units are not enough.** `upt derive k:frequency T:temperature dG:energy h:action kB:k_B --formula '(kB*T/h)*exp(-dG/(kB*T))'` exits 3. Two groups: `k · dG^-1 · h` and `T · dG^-1 · kB`. The formula dimension is a frequency and matches. `upt eval 'k_B*T/h' T=298.15` prints `6212437991620.116`. `upt search eyring` exits 1. `CE-boltzmann-factor` is the exponential alone and does not evaluate (issue #438).
- **Proof-sketch premises.** Transition-state theory: one reactive crossing of the barrier, and the phase-space factor `k_B T / h`. A transmission coefficient replaces the leading `1`.
- **Lean.** `k * h * exp(dG / (k_B * T)) = k_B * T`.
- **Opened.** No measured activation parameters.

### 3. van 't Hoff — equilibrium — unproven — BE-149 — standard

- **Formula.** `d ln K / dT = ΔH° / (R T²)`.
- **Why units are not enough.** `upt derive s:Theta^-1 T:temperature dH:L^2.M.T^-2.N^-1 R:L^2.M.T^-2.Theta^-1.N^-1 --formula 'dH/(R*T^2)'` exits 3. Two groups: `s · T` and `s · dH · R^-1`. The formula dimension is `Θ^-1` and matches. `upt eval 'dH/(R*T*T)' dH=40000 R=8.314 T=298.15` prints `0.05412281089298579`. `upt search "van t hoff"` exits 1.
- **Proof-sketch premises.** `ΔG° = −R T ln K` from BE-150, and `ΔG° = ΔH° − T ΔS°` at constant `ΔH°`.
- **Lean.** The derivative of `ln K` in `T` equals `dH / (R * T^2)`.
- **Opened.** No van 't Hoff plot.

### 4. Gibbs isotherm — equilibrium — unproven — BE-150 — standard

- **Formula.** `ΔG° = −R T ln K`, an energy per amount.
- **Why units are not enough.** `upt derive dG:L^2.M.T^-2.N^-1 T:temperature R:L^2.M.T^-2.Theta^-1.N^-1 K:dimensionless --formula '-R*T*ln(K)'` exits 3. Two groups: `dG · T^-1 · R^-1` and `K`. The formula dimension matches energy per amount. The logarithm is not recovered. `upt search gibbs` exits 1.
- **Proof-sketch premises.** The equilibrium condition `Σ ν_i μ_i = 0` with `μ_i = μ_i° + R T ln a_i`.
- **Lean.** `dG = -R * T * ln K` for `K > 0` and `T > 0`.
- **Opened.** No equilibrium constant.

### 5. Nernst ↔ Gibbs — electrochemistry ↔ thermodynamics — unproven — BE-151 — standard

- **Formula.** `E = E° − (R T / (n F)) ln Q` and `ΔG = −n F E`, with `F = N_A e`. Here `e` is the elementary charge.
- **Why units are not enough.** The cell command exits 3 with three groups: `n`, `Ecell · T^-1 · R^-1 · F`, and `Q`. The formula dimension is a voltage and matches. The Gibbs command `dG = -n*F*Ecell` exits 3 with groups `n` and `dG · F^-1 · Ecell^-1`. The formula dimension is energy per amount and matches. `upt eval` of the Nernst line at `n=1`, `Q=10`, `T=25degC`, `E°=0` prints `-0.05915934968478233`. `upt eval F` prints `96485.33212331001`. `upt search nernst` exits 1. BE-82 is the ideal diode current.
- **Proof-sketch premises.** BE-150 for `ΔG°`, the electrical work `n F E` per amount, and `F = N_A e`.
- **Lean.** `E = E0 - (R * T / (n * F)) * ln Q` and `dG = -n * F * E`, with `F = N_A * e`.
- **Opened.** No cell potential.

### 6. Integrated Clausius–Clapeyron — phase equilibrium — unproven — BE-152 — standard

- **Formula.** `ln(P2/P1) = −(ΔH/R) (1/T2 − 1/T1)` for an ideal vapor and a constant enthalpy of vaporization.
- **Why units are not enough.** `upt derive lnP:dimensionless T1:temperature T2:temperature dH:L^2.M.T^-2.N^-1 R:L^2.M.T^-2.Theta^-1.N^-1 --formula '-(dH/R)*(1/T2-1/T1)'` exits 3. Three groups: `lnP`, `T1 · T2^-1`, and `T1 · dH^-1 · R`. The formula is dimensionless and matches. BE-71 evaluates `dP/dT = L / (T Δv)`. Water at `2256.4 kJ/kg` and `100degC` prints `slope_Pa_per_K = 3616.565807585364`. The source of that evaluator says the ideal-vapor integral is a different function. `upt search clausius-clapeyron` exits 1.
- **Proof-sketch premises.** BE-71, `Δv ≈ R T / P` per amount for the vapor, and `ΔH` constant between the two temperatures.
- **Lean.** `ln (P2 / P1) = -(dH / R) * (1/T2 - 1/T1)`, under those two hypotheses.
- **Opened.** No vapor-pressure pair.

### 7. Raoult — phase equilibrium — unproven — BE-153 — standard

- **Formula.** `P_i = x_i P_i*`.
- **Why units are not enough.** `upt derive P:L^-1.M.T^-2 x:dimensionless Psat:L^-1.M.T^-2 --formula 'x*Psat'` exits 3. Two groups: `x` and `P · Psat^-1`. The formula dimension is a pressure and matches. A mole fraction times a pressure does not have to be the partial pressure. `upt search raoult` exits 1.
- **Proof-sketch premises.** An ideal mixture, so the activity is the mole fraction, and equilibrium with a pure-component vapor pressure.
- **Lean.** `P = x * Psat`.
- **Opened.** No partial-pressure measurement.

### 8. Prandtl number — heat transfer ↔ momentum — unproven — BE-154 — standard

- **Formula.** `Pr = μ c_p / k`.
- **Why units are not enough.** `upt derive Pr:dimensionless mu:L^-1.M.T^-1 cp:L^2.T^-2.Theta^-1 k:L.M.T^-3.Theta^-1 --formula 'mu*cp/k'` exits 3. Two groups: `Pr` and `mu · cp · k^-1`. The formula is dimensionless and matches. BE-86 at `C_f = 0.005` prints `St = 0.0025`. Its context defines `Pr` and then sets `Pr = 1`. The evaluator does not take `μ`, `c_p`, or `k`.
- **Proof-sketch premises.** The definition of the ratio of momentum diffusivity to thermal diffusivity. BE-86 is the consequence at `Pr = 1`, not this definition.
- **Lean.** `Pr * k = mu * cp`.
- **Opened.** No measured Prandtl number.

### 9. Reynolds number — fluid mechanics — unproven — BE-155 — standard

- **Formula.** `Re = ρ v L / μ`.
- **Why units are not enough.** `upt derive Re:dimensionless rho:M/L^3 v:velocity Lchar:length mu:L^-1.M.T^-1 --formula 'rho*v*Lchar/mu'` exits 3. Two groups: `Re` and `rho · v · Lchar · mu^-1`. The formula is dimensionless and matches. `upt search "reynolds number"` exits 1. `upt search reynolds` names BE-86, which returns `St = C_f / 2`.
- **Proof-sketch premises.** The ratio of inertial flux `ρ v²` to viscous flux `μ v / L`. The brownian case prints a radius-based `Re` and does not store this definition as a bridge.
- **Lean.** `Re * mu = rho * v * L`.
- **Opened.** No pipe-flow Reynolds number.

### 10. Biot number — heat transfer — unproven — BE-156 — standard

- **Formula.** `Bi = h L_c / k`, with `L_c = V/A`.
- **Why units are not enough.** `upt derive Bi:dimensionless h:M.T^-3.Theta^-1 Lc:length k:L.M.T^-3.Theta^-1 --formula 'h*Lc/k'` exits 3. Two groups: `Bi` and `h · Lc · k^-1`. The formula is dimensionless and matches. The copper-sphere case prints `Bi = 8.312551953449709e-5` and holds the check `Bi ≤ 0.1`. `upt search "biot number"` names that case. There is no catalog id.
- **Proof-sketch premises.** Conduction resistance `L_c / k` over convection resistance `1/h`. The case uses `L_c = a/3` for a sphere.
- **Lean.** `Bi * k = h * Lc`.
- **Opened.** No Biot measurement beyond the case print.

### 11. Nusselt number — convection — unproven — BE-157 — standard

- **Formula.** `Nu = h L / k`, with `k` the fluid conductivity.
- **Why units are not enough.** The same shape as BE-156, with the fluid `k`. Exit 3. Two groups: `Nu` and `h · L · k^-1`. The formula is dimensionless and matches. BE-86's context says the analogy is not a Nusselt correlation. `upt search nusselt` exits 1.
- **Proof-sketch premises.** The definition `h = Nu k / L`. A correlation such as Dittus–Boelter is a further function of `Re` and `Pr`, and this row is the definition.
- **Lean.** `Nu * k = h * L`.
- **Opened.** No heat-transfer coefficient.

### 12. Schmidt number — mass transfer — unproven — BE-158 — standard

- **Formula.** `Sc = μ / (ρ D)`.
- **Why units are not enough.** `upt derive Sc:dimensionless mu:L^-1.M.T^-1 rho:M/L^3 D:L^2/T --formula 'mu/(rho*D)'` exits 3. Two groups: `Sc` and `mu · rho^-1 · D^-1`. The formula is dimensionless and matches. `upt search schmidt` exits 1. `model-fick` is the diffusion model. It does not define `Sc`.
- **Proof-sketch premises.** Momentum diffusivity `μ/ρ` over species diffusivity `D`.
- **Lean.** `Sc * rho * D = mu`.
- **Opened.** No Schmidt number.

### 13. Sherwood number — mass transfer — unproven — BE-159 — standard

- **Formula.** `Sh = k_m L / D`.
- **Why units are not enough.** `upt derive Sh:dimensionless km:L/T Lchar:length D:L^2/T --formula 'km*Lchar/D'` exits 3. Two groups: `Sh` and `km · Lchar · D^-1`. The formula is dimensionless and matches. `upt search sherwood` exits 1.
- **Proof-sketch premises.** The mass-transfer analogue of BE-157. `k_m` is the film coefficient in `N = k_m Δc`.
- **Lean.** `Sh * D = km * L`.
- **Opened.** No mass-transfer coefficient.

### 14. Fourier conduction — heat conduction — unproven — BE-160 — standard

- **Formula.** `q = −k dT/dx`.
- **Why units are not enough.** `upt derive q:power/area k:L.M.T^-3.Theta^-1 dT:temperature dx:length --formula '-k*dT/dx'` exits 0. Unique monomial `q ∝ k · dT · dx^-1`. Recovered prefactor `−1`, because it was typed. No canonical edge. `upt search fourier` exits 1. The heat-equation model is not this constitutive law.
- **Proof-sketch premises.** A linear response of the heat flux to the temperature gradient. The minus sign is the direction of the flux.
- **Lean.** `q * dx = -k * dT`.
- **Opened.** No conduction measurement.

### 15. Newton cooling — convection — unproven — BE-161 — standard

- **Formula.** `q = h A ΔT`.
- **Why units are not enough.** `upt derive q:power h:power/(area*temperature) A:area dT:temperature --formula 'h*A*dT'` exits 0. Unique monomial `q ∝ h · A · dT`. Recovered prefactor `1`, because it was typed. No canonical edge. The lumped case integrates `ρ c V dT/dt = −h A (T − T∞)`. `upt search "newton cooling"` exits 1.
- **Proof-sketch premises.** A linear surface flux in the excess temperature. Radiation is a separate `T^4` term. The case bounds it.
- **Lean.** `q = h * A * dT`.
- **Opened.** No cooled-surface measurement beyond the case.

### 16. Otto efficiency — a cycle — unproven — BE-162 — standard

- **Formula.** `η = 1 − r^(1−γ)` for a cold-air standard cycle. At `γ = 1.4` the exponent is `−0.4`.
- **Why units are not enough.** A formula `1-r^(1-gamma)` is refused: the exponent must be a numeric constant. `upt derive eta:dimensionless r:dimensionless --formula '1-r^(-0.4)'` exits 3. Two groups: `eta` and `r`. The formula is dimensionless and matches. `upt search otto` exits 1. `CE-carnot-efficiency` is `1 − Tc/Th` and does not evaluate (issue #438).
- **Proof-sketch premises.** Isentropic compression and expansion of an ideal gas with constant `γ`, and the definition of the compression ratio. The exponent `1−γ` is that gas.
- **Lean.** `eta = 1 - r^(1 - gamma)`, with `gamma` a constant greater than 1 and `r > 0`.
- **Opened.** No engine map.

### 17. Joule–Thomson — a real gas — unproven — BE-163 — standard

- **Formula.** `μ_JT = [T (∂v/∂T)_p − v] / c_p`. In the derive command, `alpha` is `(∂v/∂T)_p`.
- **Why units are not enough.** `upt derive muJT:temperature/pressure cp:L^2.T^-2.Theta^-1 T:temperature v:L^3/M alpha:L^3.M^-1.Theta^-1 --formula '(T*alpha-v)/cp'` exits 3. Two groups: `muJT · cp · v^-1` and `muJT · cp · T^-1 · alpha^-1`. The formula dimension matches temperature per pressure. `upt search "joule thomson"` exits 1. `CE-ideal-gas` evaluates `P = N k_B T / V` and has no Joule–Thomson coefficient.
- **Proof-sketch premises.** The isenthalpic derivative `(∂T/∂P)_H` from `dh = c_p dT + [v − T (∂v/∂T)_p] dP`. An ideal gas sets the bracket to zero.
- **Lean.** `muJT * cp = T * (dv_dT)_p - v`.
- **Opened.** No inversion curve.

### 18. Planck spectrum — thermal radiation ↔ quantum electromagnetism — unproven — BE-164 — cross-domain

- **Formula.** `u(ν) = (8π h ν³ / c³) / (exp(h ν / (k_B T)) − 1)`.
- **Why units are not enough.** `upt derive u:M.L^-1.T^-1 h:action nu:frequency c:velocity kB:k_B T:temperature --formula '(8*pi*h*nu^3/c^3)/(exp(h*nu/(kB*T))-1)'` exits 3. Two groups: `u · h^-1 · nu^-3 · c^3` and `h · nu · kB^-1 · T^-1`. The formula dimension matches energy per volume per frequency. `upt search planck` does not name this spectrum. `CE-stefan-boltzmann` takes `sigma_sb` as an input. `CE-wien` takes `b` as an input.
- **Proof-sketch premises.** One photon mode density `8π ν² / c³`, energy `h ν`, and the Bose factor. The `8π` counts two polarizations.
- **Lean.** `u * (exp(h * nu / (k_B * T)) - 1) * c^3 = 8 * pi * h * nu^3`.
- **Opened.** No spectrum.

### 19. Stefan–Boltzmann constant — thermal radiation ↔ quantum electromagnetism — unproven — BE-165 — cross-domain

- **Formula.** `σ = π² k_B⁴ / (60 ℏ³ c²)`, equal to `2 π⁵ k_B⁴ / (15 h³ c²)`.
- **Why units are not enough.** `upt derive sig:M.T^-3.Theta^-4 kB:k_B hbar:action c:velocity --formula 'pi^2*kB^4/(60*hbar^3*c^2)'` exits 0. Unique monomial `sig ∝ kB^4 · hbar^-3 · c^-2`. Recovered prefactor `1.6449e-1`, which is `π²/60` because it was typed. No canonical edge. Explain of radiative flux at `100degC` recovers `1099.3741485584` from the baked `σ`. The lumped-case source derives `σ` from `2 π⁵ k⁴ / (15 h³ c²)` and the library print of that constant is `5.6703744191844314e-8`. The catalog row is still `j = σ T^4`.
- **Proof-sketch premises.** Integrate BE-164 over frequency. The `π²/60` is that Bose integral.
- **Lean.** `sigma * 60 * hbar^3 * c^2 = pi^2 * k_B^4`.
- **Opened.** No radiometer.

### 20. Wien displacement constant — thermal radiation ↔ quantum electromagnetism — unproven — BE-166 — cross-domain

- **Formula.** `b = h c / (k_B x)`, where `x` solves `(5 − x) = 5 exp(−x)` and `x ≈ 4.965114231744276`. Then `λ_max T = b`.
- **Why units are not enough.** `upt derive b:length*temperature h:action c:velocity kB:k_B --formula 'h*c/(kB*4.965114231744276)'` exits 0. Unique monomial `b ∝ h · c · kB^-1`. Recovered prefactor `2.0141e-1`, which is `1/4.965114231744276` because it was typed. No canonical edge. Explain at `5800` K recovers `4.99615854310345e-7` from the baked `b`. `CE-wien` does not derive `b`.
- **Proof-sketch premises.** Maximize BE-164 in wavelength. The transcendental root is the hypothesis that makes the number, not a second bridge.
- **Lean.** `b * k_B * x = h * c`, with `x` defined by `(5 - x) = 5 * exp(-x)`.
- **Opened.** No peak-wavelength derivation beyond the baked `b`.

### 21. Sackur–Tetrode — thermodynamics ↔ quantum statistics — unproven — BE-167 — cross-domain

- **Formula.** `S = N k_B (ln(n_Q / n) + 5/2)`, with `n_Q = (2π m k_B T / h²)^(3/2)` the thermal density.
- **Why units are not enough.** `upt derive S:entropy nQ:L^-3 n:L^-3 N:dimensionless kB:k_B --formula 'N*kB*(ln(nQ/n)+2.5)'` exits 3. Three groups: `nQ · n^-1`, `N`, and `S · kB^-1`. The formula dimension is an entropy and matches. `CE-thermal-de-broglie` is the wavelength alone and is COEFFICIENT UNSET. `upt search "sackur tetrode"` exits 1.
- **Proof-sketch premises.** The ideal-gas partition function, Stirling's approximation, and the thermal wavelength. The `5/2` is `ln` of the momentum integral plus one from Stirling.
- **Lean.** `S = N * k_B * (ln (nQ / n) + 5/2)` for `N > 0` and `nQ > 0`.
- **Opened.** No absolute entropy.

### 22. Saha ionization — chemistry ↔ plasma — unproven — BE-168 — cross-domain

- **Formula.** `K = (2π m k_B T / h²)^(3/2) exp(−I / (k_B T))` for the electron mass `m` and ionization energy `I`, up to the internal partition functions.
- **Why units are not enough.** `upt derive K:L^-3 T:temperature kB:k_B m:mass h:action IP:energy --formula '(2*pi*m*kB*T/h^2)^(3/2)*exp(-IP/(kB*T))'` exits 3. Two groups: `K² · T^-3 · kB^-3 · m^-3 · h^6` and `T · kB · IP^-1`. The formula dimension is an inverse volume and matches. `upt search saha` exits 1. The plasma bridges BE-103 through BE-125 do not name this equilibrium.
- **Proof-sketch premises.** Chemical equilibrium of ionization, with the translational partition function of the free electron. The typed formula is that translational factor times the Boltzmann factor of `I`. An electron-spin weight of `2`, and the internal partition functions of the ion and the atom, multiply `K` and are further hypotheses.
- **Lean.** `K = (2 * pi * m * k_B * T / h^2)^(3/2) * exp(-IP / (k_B * T))`.
- **Opened.** No ionization balance.

### 23. Richardson–Dushman — thermionic emission ↔ quantum statistics — unproven — BE-169 — cross-domain

- **Formula.** `J = (4π m e k_B² / h³) T² exp(−φ / (k_B T))`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive J:charge/(time*area) T:temperature kB:k_B phi:energy me:mass ee:charge h:action --formula '(4*pi*me*ee*kB^2/h^3)*T^2*exp(-phi/(kB*T))'` exits 3. Two groups: `T · kB · phi^-1` and `J · T^-2 · kB^-2 · me^-1 · ee^-1 · h^3`. The formula dimension is a current density and matches. The `T²` and the work function sit in different groups.
- **Proof-sketch premises.** A flux of electrons over a work function `φ`, from the Fermi tail, with the free-electron density of states. A material-dependent reflection coefficient multiplies `J`.
- **Lean.** `J * h^3 * exp(phi / (k_B * T)) = 4 * pi * m * e * k_B^2 * T^2`.
- **Opened.** No emission current.

### 24. Onsager reciprocity — nonequilibrium thermodynamics ↔ transport — unproven — BE-170 — cross-domain

- **Formula.** `L_12 = L_21` for the linear flux–force matrix.
- **Why units are not enough.** `upt derive diff:dimensionless L12:dimensionless L21:dimensionless --formula 'L12-L21'` exits 3. Three groups: `diff`, `L12`, and `L21`. The formula is dimensionless and matches. Two pure numbers do not have to be equal. BE-73 states `Π = S T` when the coefficients agree, and the agreement is a structure field rather than a numeric input. BE-28 states `σ = Σ J_i X_i`. BE-140 is the de Haas–van Alphen frequency and shares the name only.
- **Proof-sketch premises.** Microscopic reversibility of the equilibrium fluctuations. A magnetic field replaces the equality by `L_12(B) = L_21(−B)`.
- **Lean.** `L12 = L21` at zero magnetic field, as an axiom of the linear regime. The thermoelectric instance is BE-73.
- **Opened.** No cross-coefficient measurement.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository. Each repro is the published `7.0.0` CLI or `evaluateRelation`.

### Medium

[#434](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/434). **A temperature difference in `degC` is read as an absolute point.** Sensible heat at `temperature-change=10degC` recovers `1183567`. The same heat at `10` or `10K` recovers `41800`. `upt eval '4180*dT' dT=10degC` prints `1183567`. Two absolute bindings `100degC` and `20degC` subtract to `80`. `--sigma T_K=10degC` stays a 10 K difference. Owning function: `plainUnit` / `readBinding` in `src/numerical/binding-value.ts`. Explain and eval call `readNamedBinding` with the default absolute reading. `CE-heat-capacity` types `temperature-change` as a temperature.

[#435](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/435). **A prefix-plus-unit token hides the product reading of `W/mK` and `kg/ms`.** `401W/mK` on be-129 exits 1: the token is watts per millikelvin. `401W/(m*K)` converts. `1kg/ms` on the brownian viscosity exits 1: the token is kilograms per millisecond. `parseUnit('W/mK').scale` is `1000`. Owning function: `readFactorToken` in `src/dimensional/units.ts`. `tryOneFactor` returns before segmentation, so `mK` and `ms` never become `m·K` and `m·s`. `m2K`, `Vs`, and a lone `mK` still behave as #428 specified. `mPas` stays an ambiguous refusal and is not this issue.

[#436](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/436). **Litre, BTU, psi, kcal, torr, and centipoise are unknown units.** `upt eval V V=1L`, `E=1BTU`, `E=1kcal/mol`, `P=1psi`, `P=1torr`, `P=1mmHg`, and `eta=1cP` all exit 1. `kJ/mol`, `bar`, `atm`, `mol`, and `degC` parse. Owning function: the `UNITS` map read by `parseUnit` in `src/dimensional/units.ts`.

[#437](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/437). **Boltzmann spellings and the two specific-heat names are not one synonym group.** `k_B=1` beside `boltzmann-constant=2` prints `300` at `T=300`, and at `T=10eV` divides by one spelling and multiplies by the other. Thermal diffusivity with `specific-heat-capacity=385` and `specific-heat=1000` prints `0.000116596713484657` and says the monomial is not unique. The magnetic pair on the same release exits 1 and prints no value. Owning function: `SYNONYM_GROUPS` / `assertSynonymAgreement` in `src/dimensional/formula-names.ts`. `boltzmannBindingScale` in `src/numerical/binding-value.ts` already ranks `boltzmann-constant`, `k_B`, and `kB` as one scale.

[#438](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/438). **Fully-quantitative non-monomials report a missing finite input.** `evaluateRelation('CE-carnot-efficiency', { cold: 300, hot: 800 })` throws that sentence. `1 − 300/800 = 0.625`. The first law at heat `100` and work `40`, and the Boltzmann factor at a finite `E`, `k_B`, and `T`, throw the same sentence. Explain names the equation and prints no recovered value. Owning functions: `makeEvaluate` in `src/composition/canonical-graph.ts`, which returns `NaN` for a sum or an exponential, and `evaluateRelation` in `src/composition/evaluate-relation.ts`, which maps a non-finite value to a missing input. The `4π`, `1/2`, `2`, `6π`, and `3/2` monomials on this release return numbers.

### What held, and is not filed

The original unit keys hold, and so do the concatenated tokens #428 named: `V/K2`, `m^4`, `cm^2`, `F/m`, ampere prefixes, `W/m2K`, and `cm^2/Vs`. A metre on be-85 is rejected. `mPas` is refused as ambiguous. `1 Hz` was left as the identification recorded in round 8. Fahrenheit is refused. Celsius on an absolute kelvin slot is `298.15` K. `--sigma` in `degC` and in `eV` converts.

The three synonym groups hold. Equal magnetic spellings are one cyclotron variable. Unequal spellings exit 1 with no value. `T`, `temp`, `T_K`, and `temperature` agree or refuse together. `erasure-energy` resolves as an input. `Th_K` and `Tc_K` stay distinct and each convert on be-130. An eval that names bare `Th` and binds `10eV` keeps joules. That is the temperature group as written, and it is not filed.

Plasma frequency, Larmor radius, the point-charge field, the Coulomb force, and Larmor power print the signed or even magnitudes above, including `4π`. Equipartition, Stokes–Einstein, dynamic pressure, Laplace pressure, and the half-life print `3/2`, `1/(6π)`, `1/2`, `2`, and `ln 2`. Einstein opposite signs throw from the CLI and from `evaluateRelation`. Both signs negative stay the positive diffusivity.

`evaluateRelation` resolves be-16, be-58, be-61, be-62, be-71, and be-134 through be-146. A case id is unknown. `CE-sound-speed` with no coefficient returns `{ kind: 'unset' }`. The six COEFFICIENT UNSET canonical rows are unchanged. Johnson–Nyquist at `300` K and `1000` ohm is `1.6567788e-17`. The Clapeyron slope, the fin efficiency, the lumped copper sphere, and the brownian sphere return the numbers above. `N_A`, `k_B`, `kB`, and `F` evaluate. `R` is unbound. `exp(1)` holds. Bare `e` is the elementary charge. Bare `E` is energy.

### Not opened, so not used as a number

No rate constant, equilibrium constant, cell potential, vapor-pressure pair, heat-transfer coefficient, engine map, inversion curve, spectrum, radiometer, absolute entropy, ionization balance, emission current, or cross-coefficient was measured. Where a derive prefactor appears above, it is the command's report of the formula that was typed.
