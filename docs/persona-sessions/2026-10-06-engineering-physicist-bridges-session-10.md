# Engineering physicist — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: engineering physicist (MEMS, sensors, instruments, electronics, control, structures). Nothing below is a code change. A candidate bridge is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

## 1. Package version proved

Scratch directory outside the repo: `npm init -y && npm i universal-physics-tensor@8.0.0` (0 vulnerabilities).

| check | printed |
|---|---|
| `npm ls universal-physics-tensor` | `universal-physics-tensor@8.0.0` |
| `require('./node_modules/universal-physics-tensor/package.json').version` | `8.0.0` |
| CLI | `node node_modules/universal-physics-tensor/bin/upt.mjs …` |
| library | `import * as U from 'universal-physics-tensor'` (223 exports) |

`upt evaluate` lists evaluators `be-16, 42, 51, 52, 55–170`. Every command below ran against that install.

## 2. Commands run and notable outputs

### Hand-checked evaluators (all pass)

| command | printed | hand value |
|---|---|---|
| `evaluate be-130 Th_K=500 Tc_K=300 Z_per_K=0.003` | `0.09278619220204086` | `0.4·(√2.2−1)/(√2.2+0.6)` = 0.0928 |
| `evaluate be-129 h=25 k=200 t=0.002 L=0.05` | `0.9073923048115554` | `tanh(mL)/(mL)`, m = 11.18 /m |
| `evaluate be-131 rho=1000 dv=1 K=2.2e9 E=200e9 D=0.5 wall=0.01` | `1191366.79` Pa | c = 1191 m/s |
| `evaluate be-127 T_K=300 Cd=1pF Cox=1pF` | `0.11905` V/dec | 2·59.5 mV |
| `evaluate be-133 c=2 k=1 m=1` | `1` | critical damping |
| `evaluate be-128 D=0.5` | `2` | 1/(1−D) |
| `evaluate be-132 eps=8.854e-12 a=1mm b=3.5mm` | `4.4407e-11` F/m | 2πε/ln 3.5 |
| `evaluate be-126 n=100 eps=8.854e-12 h=20um V=30V g=2um` | `7.9686e-6` N | n ε h V²/g |
| `evaluate be-162 r=10 gamma=1.4` | `0.6018928…` | 1 − 10^−0.4 |
| `evaluate be-138 T=300 NA=ND=1e23 ni=1e16` | `0.83337` V | kT/e · ln(NA ND/ni²) |

Unit grammar on evaluate worked for `20um`, `30V`, `27degC`, `0.026eV` on a temperature slot, `1pF`, `3e-3/K`, `10mm`, `5cm`, and `2.2GPa`. An unknown key (`foo=1`) exits 1 and names the inputs. A repeated key exits 1.

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `evaluate be-127 T_K=-1K …` | exit 0, `-0.000396842…` | #452 |
| `evaluate be-87 T_K=-300 C_F=1e-12` | exit 0, negative variance | #452 |
| `evaluate be-128 D=1.5` | exit 0, `-2` | #453 |
| `evaluate be-131 … pipe_D_m=-0.5` | exit 0, `2211083.19` | #453 |
| `evaluate be-155 … mu_Pa_s=-0.001` | exit 0, `-50000` | #453 |
| `evaluate be-161 … h_W_per_m2_K=-25` | exit 0, excess grows to 43.25 K | #453 |
| `evaluate be-162 r=0.5 gamma=1.4` | exit 0, `-0.3195` | #453 |
| `evaluate be-133 c=2 k=1` (m omitted) | exit 1, "validity domain (m > 0 and k > 0)" | #454 |
| `evaluateRelation('be-133', {…, zzz:3})` | value, key ignored | #455 |
| `evaluateRelation('be-133', {c_kg_per_s:'2',…})` | `FormulaError … got a complex number (1)` | #455 |
| `derive x:length^2 …` | exit 2, "unknown base dimension 'length'" | #456 |
| `derive x:1/time …` | exit 2, "unrecognized dimension term" | #456 |
| `derive NEP:L^2.M.T^-2.5 …` | exit 2, "unrecognized dimension term '5'" | #457 |
| `eval rho rho=1g/cm^3` | `999.9999999999999` | #458 |
| `eval p p=1ksi`, `L=1in`, `m=1lb`, `F=1lbf` | exit 1 (`psi` works) | #458 |
| `evaluate be-161 … V_m3=0.5236cm^3` | exit 1, "'cm^3' is [L^3], but this input is [1]" | already filed: #445 |

Also noted and not filed as a bug: `be-154`…`be-163` parameters print `meaning` text equal to the quantity token (for example `prandtlmu mu_Pa_s — prandtlmu`). It is unfriendly output, not a wrong value. `be126Edge`…`be133Edge` and the other per-bridge `be*Edge` names are not root exports of 8.0.0; the bridges are reached through `evaluateRelation` and `CATALOG_GRAPH`.

### Search and coverage

Exit 1, no entry: `cantilever`, `resonant frequency`, `gauge factor`, `strain`, `wheatstone`, `bolometer`, `noise equivalent power`, `quality factor`, `spring softening`, `stoney`, `thermal stress`, `hertzian`, `sauerbrey`, `microbalance`, `quartz`, `king's law`, `hot wire`, `characteristic impedance`, `transmission line`, `rise time`, `settling time`, `thermal expansion`, `squeeze film`, `callendar`, `piezoresistive`, `harvester`, `mass loading`, `overshoot`, `fatigue`, `thermal resistance`, `heat sink`, `pitot`, `venturi`, `orifice`, `strouhal`. A hit that is a different law: `hertz` returns be-33 (Hertz–Millis), `bernoulli` returns be-78 (Bernoulli beam text), `bandwidth` returns be-85, `peltier` returns be-73 (Π = S T, not the cooler limit), `thermal noise` returns be-58.

### Derive runs for the proposals

Each is `upt derive … --formula`. A grouping failure is exit 3.

| id | exit | what units gave |
|---|---|---|
| EP-1 | 3 | two groups, `k · E^-1 · L^-1` and `k^4 · E^-4 · I^-1`; no unique monomial |
| EP-2 | 3 | three groups; `I · A^-2`, `I · L^-4` free |
| EP-3 | 3 | three groups; `A · g^-2` free; the difference is not a monomial |
| EP-4 | 3 | three dimensionless groups, no prefactor |
| EP-5 | 3 | `a · b^-1` free; `Z0² · mu^-1 · eps` fixed |
| EP-6 | 3 | three groups |
| EP-7 | 0 | `x2 ∝ kB·T·k^-1`, prefactor 1 as typed |
| EP-8 | 0 | `SF ∝ kB·T·c`, prefactor 4 as typed |
| EP-9 | 0 | squared form `NEP2 ∝ kB·T²·G`, prefactor 4 as typed |
| EP-10 | 3 | `dT · Z` and `dT · Tc^-1` free |
| EP-11 | 3 | `P · m^-1 · A^-2 · w` and `zeta` free |

For EP-7, EP-8 and EP-9 units fix the monomial and leave the dimensionless constant (1, 4, 4) to the physics. A recovered prefactor is the report of the formula that was typed, not a derivation.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | medium | Negative absolute temperature accepted by be-82, be-87, be-127, be-130 (be-16, be-58 reject it) | [#452](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/452) |
| 2 | medium | Unphysical signs accepted: be-128 duty, be-131 diameter, be-155 viscosity, be-161 h and t, be-162 ratio | [#453](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/453) |
| 3 | medium | A missing evaluator input is reported as a validity-domain violation | [#454](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/454) |
| 4 | medium | `evaluateRelation` ignores unknown keys and gives a nonsense error for a numeric string | [#455](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/455) |
| 5 | low | `derive`: bare power of a named dimension rejected with a self-contradicting message; `1/time` unrecognized | [#456](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/456) |
| 6 | low | `derive`: explicit grammar cannot write a fractional exponent (per √Hz) | [#457](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/457) |
| 7 | low | `eval`: `1g/cm^3` is `999.9999999999999`; `psi` accepted while `in`, `ft`, `lb`, `lbf`, `mph`, `ksi` are not | [#458](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/458) |
| — | medium | be-161 `V_m3` labeled dimensionless and rejects `cm^3` | already open: [#445](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/445) |

Seven new issues. The be-161 label bug was not refiled.

## 4. Proposed bridges

"Cross-domain" here follows the catalog's own filing: a relation that joins a thermal, quantum or statistical constant with a second field (the catalog files BE-58, BE-82, BE-87, BE-127, BE-130 that way). "Standard" is a relation inside one engineering field. Both are proposals only. No catalog id is assigned.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| EP-1 | standard | Cantilever tip stiffness | `k = 3 E I / L³` | solid mechanics, MEMS | `k ∝ E L` fixes nothing about the 3 or the I and L split | none (`CE-hooke-law` is the spring, not the beam) |
| EP-2 | standard | Cantilever fundamental frequency | `f₁ = (λ₁²/2π) √(E I / (ρ A L⁴))`, λ₁ = 1.8751 | structural dynamics, resonant sensors | λ₁ is the first root of `cos λ cosh λ = −1`, a transcendental number | none |
| EP-3 | standard | Electrostatic spring softening | `k_eff = k − ε₀ A V² / (g − x)³` | electrostatics, MEMS | difference of two stiffnesses; units allow any power of `V` and `g` | partial: be-79 is the pull-in voltage at the same law |
| EP-4 | standard | Quarter-bridge strain gauge | `V_out/V_ex = GF ε / (4 + 2 GF ε)` | strain sensing, resistor networks | only dimensionless numbers; the 4 and 2 are the bridge | none |
| EP-5 | standard | Coaxial characteristic impedance | `Z₀ = (1/2π) √(μ/ε) ln(b/a)` | transmission lines, magnetostatics | `a/b` is a free group; the log and 2π are geometry | partial: be-132 is C′, this is √(L′/C′) |
| EP-6 | standard | Sauerbrey mass loading | `Δf = −2 f₀² Δm / (A √(ρ_q μ_q))` | acoustics, mass sensing | `f₀²` and the 2 are not fixed by dimensions | none |
| EP-7 | cross-domain | Equipartition displacement | `⟨x²⟩ = k_B T / k` | thermodynamics, mechanics | `k_B T/k` fixed up to a constant; the ½ per quadratic mode is physics | partial: be-87 is the same law for `C`; be-167 mentions equipartition |
| EP-8 | cross-domain | Thermomechanical force noise | `S_F = 4 k_B T c` (one-sided) | fluctuation–dissipation, mechanical sensors | form fixed up to a constant; the 4 is the one-sided convention | partial: be-58 is the electrical analogue |
| EP-9 | cross-domain | Bolometer thermal-fluctuation NEP | `NEP² = 4 k_B T² G` | thermal physics, radiation detection | form fixed up to a constant; `T²` vs `T` is dimensionally forced but 4 is not | none |
| EP-10 | cross-domain | Peltier cooler maximum ΔT | `ΔT_max = ½ Z T_c²` | thermoelectricity, thermal management | `Z T_c²` and `T_c` are both temperatures; units cannot choose | partial: be-130 uses the same `Z`; be-73 is Π = S T |
| EP-11 | cross-domain | Matched vibration-harvester power | `P = m A² / (16 ζ_m ω_n)` at resonance, matched load | mechanics, electromagnetic transduction | `P ∝ m A²/ω` fixed; `ζ` is a free pure number | none |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**EP-1 Cantilever tip stiffness (standard).** `k = 3 E I / L³` for a clamped–free Euler–Bernoulli beam loaded at the tip; for a rectangle `I = w t³/12`, so `k = E w t³ / (4 L³)`. Premises: small deflection, uniform section, slender (shear ignored), clamped end rigid. The beam equation integrates twice to `δ = F L³/(3 E I)`. It pairs with be-78 (buckling uses the same `E I`).

**EP-2 Cantilever fundamental frequency (standard).** `f₁ = (λ₁²/2π) √(E I/(ρ A L⁴))`, λ₁ = 1.87510407. Premises: Euler–Bernoulli, uniform section, no added mass or damping. Separation of variables gives `cos λ cosh λ = −1`. Consistency check: `k` from EP-1 with the effective mass `0.2427 ρ A L` gives the same `f₁`.

**EP-3 Electrostatic spring softening (standard).** Force on a movable plate at voltage `V` is `ε₀ A V²/(2 (g−x)²)`; its derivative is `ε₀ A V²/(g−x)³`, which subtracts from the mechanical stiffness: `k_eff = k − ε₀ A V²/(g−x)³`. Premises: voltage-controlled, fringe field ignored, parallel plates. Zero of `k_eff` at `x = g/3` is the pull-in point of be-79, which is the consistency check.

**EP-4 Quarter-bridge strain gauge (standard).** With `ΔR/R = GF ε` in one arm of a balanced Wheatstone bridge, `V_out/V_ex = x/(4+2x)` for `x = GF ε` (small-signal limit `x/4`). Premises: three fixed equal resistors, no lead-wire resistance, no self-heating. The exact form shows the bridge non-linearity that the small-signal rule hides.

**EP-5 Coaxial characteristic impedance (standard).** `Z₀ = √(L′/C′)`, with `L′ = (μ/2π) ln(b/a)` and `C′ = 2π ε/ln(b/a)` (be-132). Premises: lossless, TEM, uniform. Consistency check: `Z₀ = 59.96 Ω · ln(b/a)/√ε_r` in vacuum units.

**EP-6 Sauerbrey mass loading (standard).** `Δf = −2 f₀² Δm / (A √(ρ_q μ_q))` for a thin rigid film on a thickness-shear quartz resonator. Premises: film mass small against crystal mass, rigid and uniform, `Δf ≪ f₀`. The dimensionless 2 comes from the shear-wave node condition.

**EP-7 Equipartition displacement (cross-domain).** One quadratic degree of freedom carries `½ k_B T`; with `½ k ⟨x²⟩` this gives `⟨x²⟩ = k_B T/k`. Premises: harmonic, thermal equilibrium, classical (`ℏω ≪ k_B T`). It is the mechanical twin of be-87, `⟨v²⟩ = k_B T/C`, and it is how AFM cantilevers are stiffness-calibrated.

**EP-8 Thermomechanical force noise (cross-domain).** The fluctuation–dissipation theorem for a viscous damper `c` gives a one-sided force spectral density `S_F = 4 k_B T c`. Premises: linear damping, thermal equilibrium, classical. Consequence for a proof mass: acceleration noise floor `√(4 k_B T ω₀ / (m Q))`, using `c = m ω₀/Q`. The electrical analogue is be-58.

**EP-9 Bolometer thermal-fluctuation NEP (cross-domain).** Energy exchange through thermal conductance `G` to a bath at `T` gives power fluctuations `⟨ΔP²⟩ = 4 k_B T² G Δf`, so `NEP² = 4 k_B T² G`. Premises: thermal-fluctuation-noise limited (no Johnson or photon noise), single thermal link, bath at `T`. Join: thermodynamics plus radiation detection.

**EP-10 Peltier cooler maximum ΔT (cross-domain).** With zero heat load and optimal current, `ΔT_max = ½ Z T_c²`. Premises: constant properties, Z = S²/(R K), hot side held at `T_h = T_c + ΔT`, Peltier and Joule terms only. It uses the same `Z` that be-130 takes as input.

**EP-11 Matched harvester power (cross-domain).** Williams–Yates / Roundy form: `P = m ζ_e A² / (4 ω_n (ζ_e + ζ_m)²)` at resonance for base-acceleration amplitude `A`. At the matched point `ζ_e = ζ_m` this is `m A²/(16 ζ_m ω_n)`. Premises: linear spring–mass, electromagnetic damping proportional to velocity, resonant drive. Join: mechanics plus electromagnetic transduction. The formula is quoted from memory of the literature; its source and page must be fixed before any promotion.

**Count: 6 standard, 5 cross-domain, 11 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.
