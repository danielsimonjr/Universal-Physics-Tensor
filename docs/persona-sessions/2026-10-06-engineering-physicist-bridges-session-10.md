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

## 7. Further pass, 1 November 2026

A second exercise of the same published tarball, after this file had already landed. Scratch directory `/tmp/upt-dogfood-800`. Node v22.23.4. `npm view universal-physics-tensor@8.0.0 version gitHead --prefer-online` printed `8.0.0` and `888099c0111d88214b0ca92aa9c7ea45292a9d48`. Annotated tag `v8.0.0` is object `0956655b13c08cd6e870dba88c4fd1447c139ed4` and its target is that commit. Publish run `37527828453` succeeded. `gh release view v8.0.0` returns release not found.

`npm ls universal-physics-tensor` printed `universal-physics-tensor@8.0.0`. Reading `node_modules/universal-physics-tensor/package.json` printed `8.0.0`. `require('universal-physics-tensor/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. That subpath gap is [#556](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/556).

A fresh `npm i universal-physics-tensor@8.0.0` at 8:10 AM America/Chicago resolved `@danielsimonjr/mathts-functions@0.68.5` with `@danielsimonjr/mathts-core@0.16.0`. `upt version` exited 1:

```
Could not load the built package. Run `npm run build` first.
rationalNullspace: entry [0, 0] must be a finite number or a Fraction
```

The stack is `entryToFraction` in mathts-functions 0.68.5, called from `nullSpace` in `dist/dimensional/buckingham.js` while canonical dimensional fields load. The same core `Fraction` is accepted by mathts-functions 0.68.0. This failure is already [#525](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/525) (also #530 and #541). [#548](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/548) is the same report and should be closed as a duplicate. The commands below ran with `@danielsimonjr/mathts-functions` overridden to `0.68.0`. `upt version` then printed `8.0.0`. `upt eval --debug exp(1)` printed `2.718281828459045`.

`BRIDGE_EQUATIONS.length` is 160: 124 established, 33 speculative, 3 highly-speculative; 120 standard and 40 cross-domain. Ids 11–170. `CANONICAL_EQUATIONS.length` is 109. Search footer: 160 catalog bridges, 109 canonical equations, 24 atlas models, 20 atlas bridges, 703 quantities, 6 applied cases, 3 regimes.

### Commands that matched an independent calculation

`k_B = 1.380649e-23`, `e = 1.602176634e-19`, `ε0 = 8.8541878128e-12`.

| command | exit | printed |
|---|---|---|
| `upt eval e` | 0 | `1.602176634e-19` |
| `upt eval E` | 2 | `E` is energy |
| `upt eval '1-e^2'` | 2 | `e` is the elementary charge. Euler's number is `exp(x)` |
| `upt evaluate be-126` `n=50`, `ε0`, `h=20um`, `V=-10`, `g=2um` | 0 | `4.4270939064e-7` |
| `upt evaluate be-127 T_K=300 Cd_F=0 Cox_F=1` | 0 | `0.05952642933233172` |
| `upt evaluate be-128 D=0.4` | 0 | `1.6666666666666667` |
| `upt evaluate be-129` `h=20W/m2K`, `k=200W/mK`, `t=1mm`, `L=5cm` | 0 | `0.8610571715805476` |
| `upt evaluate be-131` water, `K=2.2GPa`, `E=2GPa`, `D=50mm`, wall `2mm`, `Δv=1` | 0 | `277836.25115549687` |
| `upt evaluate be-132` `ε=1e-9`, `b/a=exp(1)` | 0 | `6.283185307179586e-9` |
| `upt evaluate be-133 c=20 k=100 m=1` | 0 | `1` |
| `upt evaluate be-78 E=200GPa I=1cm^4 L=2m` | 0 | `4934.802200544679` |
| `upt evaluate be-82 I_s=1pA V=0.7 T=77degF` | 0 | `298.15` K, `0.6799065147504729` |
| `upt evaluate be-70` both signs negative | 0 | `0.0036192799701009757` |
| `evaluateRelation` Carnot at 300 K and 800 K, reservoir names | — | `0.625` |
| `evaluateRelation` first law, heat 100, work 40 | — | `60` |
| `evaluateRelation` kinetic energy, mass 2, speed 3 | — | `9` |
| copper skin-depth case, `1.68e-8` Ω·m, 1 MHz | 0 | `delta_m = 0.0000652341146231142` |

The fin number is `tanh(mL)/(mL)` with `m = √(2h/(kt))`. Dropping the face count 2 would print `0.9242343145200195`. The Joukowsky number is `ρ c Δv` with `c = 277.8362511554969` m/s. The swing is `ln(10) k_B T / e`. The coax check is `2 π ε`. `77 °F` is `298.15` K. `200W/mK` converts. Opposite carrier signs on be-70 exit 1. Unset sound speed stays `{ kind: 'unset' }`. Plasma frequency at negative charge prints `|charge|` and `56414.6023118063`. Unequal magnetic spellings exit 1. Sensible heat at `temperature-change=10degC` recovers `41800`. Casimir pressure at `100 nm` is `-13.001257732443651` Pa.

`upt audit --source=catalog` prints DERIVED 36, COEFFICIENT UNSET 0, DECOY 23, NOT A MONOMIAL 25, OPEN 74 (sum 158). `upt audit --source=canonical` prints DERIVED 72, COEFFICIENT UNSET 6, NOT A MONOMIAL 0, OPEN 19. `upt map --source=catalog --evidence=formally-proved` keeps 94 of 158 edges. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76.

`upt evaluate be-128 D=2` prints `-1`, inside the stated domain `D ≠ 1`.

### Bugs from this pass

| issue | status in this pass | what 8.0.0 did |
|---|---|---|
| [#550](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/550) | new | `theta_difference_K=10degC` on be-161 becomes `283.15` K. `10` and `10K` stay `10`. `newtontheta0` is `kind: "interval"`. The role lookup uses the key `theta_difference_K`, which is not that record. |
| [#551](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/551) | new | Every bridge print is `value = <number>`. be-63 prints `2.895722239784147e30`. The help example says about `1.456` solar masses. The catalog notes still say fin `m` and the Joukowsky speed are on the result. `buildSpec` returns `{ value }` only. |
| [#552](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/552) | filed this pass | be-154 prints `prandtlmu mu_Pa_s — prandtlmu`. be-147 prints `arrhbarrier`. Section 2 above had left this gloss unfiled. |
| [#553](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/553) | new | be-132 with inner `5 mm` and outer `1 mm` exits 0 and prints `-3.456641746947256e-11`. The domain text requires `a ≠ b`, and the labels say inner and outer. |
| [#556](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/556) | new | `require('universal-physics-tensor/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. `upt version` and `npm ls` still print `8.0.0`. |

These four repeats of issues already on the tracker were opened again and should be closed as duplicates. This pass could not close them: `gh issue close` returned `Resource not accessible by integration`.

| opened again | already tracked | same behavior on 8.0.0 |
|---|---|---|
| [#548](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/548) | [#525](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/525) | fresh install, mathts-functions 0.68.5, `rationalNullspace` |
| [#549](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/549) | [#445](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/445) | `50kJ/mol` and `1L` rejected; bare `50000` gives Arrhenius `17393.17968736233` |
| [#554](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/554) | [#455](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/455) | `extra: 1` ignored; `velocity` on kinetic energy says `missing a finite input` and does not name `speed`. The CLI rejects `extra` on be-133 |
| [#555](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/555) | [#458](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/458) | `1in`, `1inch`, and `1mil` exit 1. `1psi` is `6894.75729276459` Pa |

### Proposals added in this pass

EP-1 through EP-11 above stay as written. These eleven are additional. Each `upt derive` exits 3, the formula dimension matches, and the command says no canonical equation has that target and those variables. Counts for this pass: 7 standard, 4 cross-domain. The file then holds 13 standard and 9 cross-domain proposals.

| id | type | name | formula | domains linked | catalog id |
|---|---|---|---|---|---|
| EP-12 | standard | Logarithmic decrement | `δ = 2 π ζ / √(1−ζ²)` | dynamics, sensors | none. be-133 is `ζ` |
| EP-13 | standard | Square-law MOSFET | `I_D = (1/2) μ C_ox (W/L) (V_GS−V_t)²` | semiconductor devices | none. be-127 is the subthreshold swing |
| EP-14 | standard | Circular squeeze-film damping | `B = (3 π / 2) μ R⁴ / d³` | MEMS, viscous flow | none. be-77 is pipe flux |
| EP-15 | standard | Ideal buck ratio | `V_out / V_in = D` | power electronics | none. be-128 is `1/(1−D)` |
| EP-16 | standard | Friis transmission | `P_r/P_t = G_t G_r (λ/(4 π R))²` | antennas | none |
| EP-17 | standard | Base-excitation transmissibility | `T_R = √((1+(2 ζ r)²)/((1−r²)²+(2 ζ r)²))` | vibration isolation | none. be-133 is `ζ` |
| EP-18 | standard | Harmonic mass sensitivity | `Δf/f = −Δm/(2 m)` | resonant sensors | none. EP-6 is the quartz Sauerbrey law |
| EP-19 | cross-domain | Constrained thermal stress | `σ = E α ΔT` | elasticity, thermal expansion | none. `CE-hooke-law` is `F = −k x` |
| EP-20 | cross-domain | Ideal photodiode responsivity | `ℜ = η e λ / (h c)` | optics, charge | none. `CE-photoelectric` is `hν − φ` |
| EP-21 | cross-domain | Metal foil gauge factor | `GF = 1 + 2 ν` | elasticity, resistance | none. EP-4 takes `GF` as an input |
| EP-22 | cross-domain | Peltier cooler COP | `COP = (T_c/ΔT) (√(1+ZT_m) − T_h/T_c) / (√(1+ZT_m)+1)` | heat, electrical transport | none. EP-10 is `ΔT_max`. be-130 is the generator |

**EP-12.** `upt derive delta:dimensionless zeta:dimensionless --formula "2*pi*zeta/sqrt(1-zeta^2)"` exits 3. Groups `delta` and `zeta`. The `2 π` and the square root are the underdamped cycle of `e^{−ζ ω t}`. No ring-down pair was measured.

**EP-13.** `upt derive Id:I mu:M^-1.T^2.I Cox:I^2.T^4.M^-1.L^-4 WoverL:dimensionless Vov:energy/charge --formula "0.5*mu*Cox*WoverL*Vov^2"` exits 3. Groups `WoverL` and `Id · mu^-1 · Cox^-1 · Vov^-2`. The `1/2` is the channel integral. `upt search "square law"` exits 1. `upt search mosfet` names be-127. Here `e` is not in the formula. No MOSFET curve was measured.

**EP-14.** `upt derive B:M/T visc:L^-1.M.T^-1 R:length gap:length --formula "1.5*pi*visc*R^4/gap^3"` exits 3. Groups `B · visc^-1 · R^-1` and `B · visc^-1 · gap^-1`. Incompressible lubrication, ambient pressure vented at the rim. `upt search "squeeze film"` exits 1. No squeeze-film measurement.

**EP-15.** `upt derive ratio:dimensionless D:dimensionless --formula "D"` exits 3. Groups `ratio` and `D`. Volt-second balance on a continuous-conduction buck. `upt search "buck converter"` exits 1. `upt search buckling` names be-78. No converter measurement.

**EP-16.** `upt derive Pratio:dimensionless Gt:dimensionless Gr:dimensionless lam:length R:length --formula "Gt*Gr*(lam/(4*pi*R))^2"` exits 3. Groups `Pratio`, `Gt`, `Gr`, and `lam · R^-1`. The `(4 π)²` is the sphere and the effective area. `upt search friis` exits 1. No link budget.

**EP-17.** `upt derive TR:dimensionless zeta:dimensionless r:dimensionless --formula "sqrt((1+(2*zeta*r)^2)/((1-r^2)^2+(2*zeta*r)^2))"` exits 3. Groups `TR`, `zeta`, and `r`. Steady base motion of `m ẍ + c (ẋ−ẏ) + k (x−y) = 0`. `upt search transmissibility` exits 1. No sweep.

**EP-18.** `upt derive sens:dimensionless dm:dimensionless --formula "-dm/2"` exits 3. Groups `sens` and `dm`. This is `dω/ω = −dm/(2m)` for a harmonic mode with `Δm ≪ m`. EP-6 is the thickness-shear quartz law, with `f₀²` and the crystal impedance. No frequency shift was measured.

**EP-19.** `upt derive sigma:pressure Emod:pressure alpha:Theta^-1 dT:temperature --formula "Emod*alpha*dT"` exits 3. Groups `sigma · Emod^-1` and `alpha · dT`. Fixed length, uniaxial Hooke, free thermal strain `α ΔT`. The row joins a modulus to an expansion coefficient. `upt search "thermal stress"` exits 1. No constrained-bar stress.

**EP-20.** `upt derive Resp:charge/energy eta:dimensionless ee:e lam:length h:action c:velocity --formula "eta*ee*lam/(h*c)"` exits 3. Groups `eta` and `Resp · ee^-1 · lam^-1 · h · c`. `e` in that formula is the elementary charge. One electron per photon of energy `h c / λ`, times `η`. The row joins an optical wavelength to that charge. `upt search responsivity` exits 1. No responsivity.

**EP-21.** `upt derive GF:dimensionless nu:dimensionless --formula "1+2*nu"` exits 3. Groups `GF` and `nu`. `R = ρ L / A`, axial strain, and two lateral strains `−ν ε`, with resistivity held fixed. The row joins a resistance change to Poisson's ratio. EP-4 then places that `GF` in a bridge. `upt search "gauge factor"` exits 1. No gauge-factor measurement.

**EP-22.** `upt derive COP:dimensionless Th:temperature Tc:temperature ZTm:dimensionless --formula "((Tc/(Th-Tc))*((1+ZTm)^0.5-Th/Tc))/((1+ZTm)^0.5+1)"` exits 3. Groups `COP`, `Th · Tc^-1`, and `ZTm`. Cold-junction heat `S T_c I − I² R/2 − K ΔT`, and `d(COP)/dI = 0`. EP-10 is the zero-load `ΔT_max` from the same `Z`. `upt search "figure of merit"` names be-130. No cooler map.

No src changes. Awaiting owner review before any fix/PhysJS agents.

