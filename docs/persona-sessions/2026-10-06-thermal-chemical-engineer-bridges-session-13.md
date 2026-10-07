# Thermal and chemical engineer — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: thermal and chemical engineer. The previous round is `2026-10-06-thermal-chemical-engineer-bridges-session-9.md`; its 24 candidates are now catalog ids be-147 to be-170 (Arrhenius, Eyring, van 't Hoff, Gibbs, Nernst, Clausius–Clapeyron, Raoult, Prandtl, Reynolds, Biot, Nusselt, Schmidt, Sherwood, Fourier, Newton cooling, Otto, Joule–Thomson, Planck, Stefan–Boltzmann, Wien, Sackur–Tetrode, Saha, Richardson–Dushman, Onsager) and are checked here, not proposed again. Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

## 1. Package version proved

Scratch directory outside the repo: `npm init -y && npm i universal-physics-tensor@8.0.0`.

| check | printed |
|---|---|
| `npm ls universal-physics-tensor` | `universal-physics-tensor@8.0.0` |
| `require('./node_modules/universal-physics-tensor/package.json').version` | `8.0.0` |
| CLI | `node node_modules/universal-physics-tensor/bin/upt.mjs …` |
| library | `import * as U from 'universal-physics-tensor'` |

## 2. Commands run and notable outputs

### Coverage of the persona in the catalog

Exit 1, no entry, for: `heat exchanger`, `lmtd`, `ntu`, `effectiveness`, `overall heat transfer`, `thermal resistance`, `radiation exchange`, `view factor`, `emissivity`, `kirchhoff`, `grashof`, `rayleigh number`, `peclet`, `euler number`, `froude`, `weber`, `bond number`, `capillary number`, `ergun`, `kozeny`, `blasius`, `friction factor`, `moody`, `colebrook`, `pump`, `nozzle`, `choked`, `brayton`, `rankine`, `diesel`, `coefficient of performance`, `refrigeration`, `psychrometric`, `humidity`, `dew point`, `wet bulb`, `chemical potential`, `fugacity`, `activity coefficient`, `antoine`, `trouton`, `eotvos`, `kelvin equation`, `gibbs-thomson`, `nucleation`, `freundlich`, `michaelis`, `activation energy`, `collision theory`, `rate law`, `knudsen`, `graham`, `maxwell-stefan`, `wilke-chang`, `debye-huckel`, `ionic strength`, `butler-volmer`, `tafel`, `faraday`, `kohlrausch`, `osmotic`.

### Hand-checked values (all pass)

Computed with `evaluateRelation` and compared with a closed form typed independently (CODATA 2018, R = N_A k_B).

| bridge | inputs | printed | hand value |
|---|---|---|---|
| be-147 Arrhenius | A = 10¹³ s⁻¹, Ea = 50 kJ/mol, 300 K | `19696.844058205552` | `A exp(−Ea/RT)` |
| be-148 Eyring | ΔG‡ = 80 kJ/mol per molecule, 300 K | `0.07361785215296593` | `(k_B T/h) exp(−ΔG‡/k_B T)` |
| be-149 van 't Hoff | ΔH = −50 kJ/mol, 298.15 K | `-0.06764974936291045` | `ΔH/(R T²)` |
| be-150 | K = 10⁵, 298.15 K | `-28540.04751267629` | `−R T ln K` |
| be-151 Nernst | E° = 1.1 V, n = 2, Q = 10 | `1.070420325157609` | `E° − (RT/nF) ln Q` |
| be-152 Clapeyron | ΔH = 40.65 kJ/mol, 373.15 → 383.15 K | `0.3419590398621668` | `ln(P₂/P₁)` (the output is the logarithm; see #460) |
| be-153 Raoult | x = 0.4, P* = 101325 | `40530` | `x P*` |
| be-154 Prandtl, water | μ = 1 mPa s, c_p = 4180, k = 0.6 | `6.966666666666667` | `μ c_p/k` |
| be-155, 156, 157 | Re, Bi, Nu | `50000`; `0.0003125`; `96.15384615384616` | `ρ v L/μ`; `h L/k`; `h L/k` |
| be-158, 159 | Sc, Sh | `999.9999999999999`; `1000.0000000000001` | 1000, 1000 |
| be-160 Fourier | 1.4 W/(m K), 350 → 300 K, 0.1 m | `700` | `k ΔT/L` |
| be-161 Newton cooling | copper sphere, 100 s | `18.126437103317397` | `θ₀ exp(−t/τ)` |
| be-162 Otto | r = 10, γ = 1.4 | `0.6018928294465027` | `1 − r^(1−γ)` |
| be-163 Joule–Thomson, air | 300 K | `0.00012835820895522389` | `(T ∂v/∂T − v)/c_p` |
| be-167 Sackur–Tetrode, argon | 298.15 K, 1 atm, N = N_A | `154.7362165796083` J/(mol K) | tabulated 154.8 |
| be-168 Saha | hydrogen, 10⁴ K | `337879466391912200000` | `(2π m k T/h²)^{3/2} e^{−I/kT}` |
| be-169 Richardson, W (4.5 eV) | 2000 K | `21.997169675684532` | `4π m e k² T²/h³ · e^{−φ/kT}` |

The unit grammar worked for `50kJ/mol` and `1kcal/mol` on `eval`, `8.314J/(mol*K)`, `4.18kJ/(kg*K)`, `25degC` (298.15 K), `77degF`, `1atm`, `1bar`, `1mol/L`, `1kmol`, `10K/min`, `1BTU`, `1W/(m^2*K)`. `upt eval "N_A*k_B"` is `8.31446261815324`, `F` is `96485.33212331001`.

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `evaluateRelation('be-147', {…, T_K:-300})` | `5.08e21` | #482 |
| `evaluateRelation('be-148', {…, T_K:-300})` | `-5.3e26` | #482 |
| `evaluateRelation('be-153', {x:1.4, …})` | `141855` Pa | #482 |
| `evaluateRelation('be-154', {…, k:-0.6})` | `-6.97` | #482 |
| `evaluateRelation('be-167', {nQ:1e30, n:1e32, N:1})` | `-2.9e-23` J/K (degenerate regime) | #482 |
| `evaluateRelation('CE-carnot-efficiency', {Tc:600, Th:300})` | `-1`; `{Tc:-300, Th:600}` gives `1.5` | #483 |
| `evaluateRelation('CE-clausius-entropy', {heat:100, T:-300})` | `-0.333` | #483 |
| `evaluateRelation('CE-boltzmann-entropy', {W:0.5})` | `-9.57e-24` | #483 |
| `CE-heat-capacity`, `CE-latent-heat` with `m = -1` | `-41800`, `-2260000` | #483 |
| `upt canonical --json`, `CE-normal-distribution` | `formula_latex` contains U+000C and `sigmasqrt{2pi}` | #484 |
| `CE-first-law-thermodynamics`, `CE-uncertainty-principle` | `Delta U = Q - W`, `Delta x , Delta p geq hbar/2` | #484 |
| `eval x x=1M`, `1mM`, `1psia`, `25℃`, `1ton` | exit 1 | #485 |
| `eval "R*T" T=300` | `missing values for: R` (`F` is defined, `R` is not) | #485 |
| `derive … --formula "rp^gam"` (both declared dimensionless) | `✗ exponent must be a numeric constant` | #486 |
| `map --equation "eta = 1 - r^(1-gamma)"` | `upt: exponent must be a numeric constant`, exit 2 | #486 |
| `derive … sig:sigma_sb` | `unrecognized dimension term 'sigma_sb'` | #486 |
| `evaluate be-147 … Ea_J_per_mol=50kJ/mol` | `'kJ/mol' is [L^2 M T^-2 N^-1], but this input is [1]` | #445 (open) |

Re-seen and not refiled: #445 (molar energy labeled dimensionless), #446 (Newton cooling and a Celsius excess), #447 (Wien non-root), #449, #451, #454, #460 (unlabeled output), #469 (`1mW/(m*K)` ambiguous), #471.

### Derive runs for the proposals

Each is `upt derive … --formula`. Ten of the twelve exit 3 with a formula dimension that matches its target (`✓ homogeneous, matches target`). TC-5 is refused for its symbolic exponent (#486), and TC-11 needed the Stefan–Boltzmann constant declared by its explicit dimension because `sigma_sb` is not a derive name (#486).

| id | free groups | what units left open |
|---|---|---|
| TC-1 | 2 | the logarithmic mean |
| TC-2 | 3 | the exponential form of `ε(NTU, C_r)` |
| TC-3 | 3 | the Blasius `0.316 Re^{-1/4}` (the second run, `f` from `Re`, has 2 groups) |
| TC-4 | 3 | the two Ergun coefficients 150 and 1.75 |
| TC-5 | — | `rp^((1−γ)/γ)` is refused, see #486; with a numeric exponent it matches |
| TC-6 | 2 | `K P` is free |
| TC-7 | 3 | `sinh` of `α F η/RT` |
| TC-8 | 4 | the 8π and the screening length |
| TC-9 | 3 | `γ V_m/(r k_B T)` fixed up to the 2 |
| TC-10 | 2 | the `√2 π` |
| TC-11 | 4 | the gray-body denominator (with `σ` declared as `power/(area*temperature^4)`) |
| TC-12 | 2 | `z²` and the 1 |

Values re-computed in Node from CODATA constants: TC-1 `ΔT_lm` = 36.41 K, 182 kW at U = 500 W/(m² K), A = 10 m²; TC-2 `ε` = 0.7746 at NTU = 2, `C_r` = 0.5; TC-3 `f` = 0.0211, Δp = 2.11 kPa for 10 m of 50 mm water pipe at 1 m/s; TC-4 64.1 kPa/m (viscous 9.4 plus inertial 54.7) for 3 mm beads at ε = 0.4 and 0.1 m/s; TC-5 `η` = 0.482 at `r_p` = 10, γ = 1.4; TC-7 `i/i₀` = 6.86 at α = 0.5, η = 0.1 V, 298.15 K; TC-8 `γ_±` = 0.889 at 0.01 mol/L in water (Debye length 3.04 nm); TC-9 `P/P₀` = 1.110 for a 10 nm water droplet; TC-10 66.8 nm for N₂ at 1 atm and 298 K; TC-11 2056 W/m² for 500 K and 300 K gray plates of emissivity 0.8; TC-12 5.0 mS m²/mol for Na⁺.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | medium | be-147, 148, 153, 154 and 167 accept unphysical signs, a mole fraction above 1, and the degenerate regime | [#482](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/482) |
| 2 | medium | Canonical thermodynamic entries accept unphysical inputs (Carnot efficiency 1.5 or −1, negative entropy, negative mass) | [#483](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/483) |
| 3 | low | Three canonical entries have malformed `formula_latex` (a form-feed character, dropped backslashes) | [#484](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/484) |
| 4 | low | Molarity `M`, `psia`, `℃`, `ton` absent; the gas constant `R` is not an `eval` name | [#485](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/485) |
| 5 | medium | `derive` and `map --equation` reject a symbolic exponent on a dimensionless base; `sigma_sb` is not a derive dimension | [#486](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/486) |

Five new issues. Related and already open: #445, #446, #447, #449, #451, #460, #469.

## 4. Proposed bridges

"Cross-domain" follows the catalog's own filing: it joins a thermal relation to an electromagnetic, electrochemical, interfacial or kinetic-theory relation. "Standard" stays inside heat transfer, fluid mechanics, cycles or adsorption.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| TC-1 | standard | Log-mean temperature difference | `Q = U A ΔT_lm`, `ΔT_lm = (ΔT₁ − ΔT₂)/ln(ΔT₁/ΔT₂)` | heat exchangers | the logarithmic mean is one of many means of two temperatures | none (be-160 is the slab, be-156 and be-157 are `h` groups) |
| TC-2 | standard | Counterflow ε–NTU | `ε = (1 − e^{−NTU(1−C_r)})/(1 − C_r e^{−NTU(1−C_r)})` | heat exchangers | a function of two pure numbers | none |
| TC-3 | standard | Darcy–Weisbach with the Blasius friction factor | `Δp = f (L/D) ρ v²/2`, `f = 0.316 Re^{-1/4}` | pipe flow | `f` is a free function of `Re`; the 0.316 and −1/4 are empirical | partial: be-155 is Re; be-77 is the laminar pipe |
| TC-4 | standard | Ergun equation | `Δp/L = 150 μ(1−ε)² v/(ε³ d²) + 1.75 ρ(1−ε) v²/(ε³ d)` | packed beds | three free groups; the 150 and 1.75 are fitted | none |
| TC-5 | standard | Brayton cycle | `η = 1 − r_p^{(1−γ)/γ}` | gas-turbine cycles | dimensionless; any function of `r_p`, γ | partial: be-162 is the Otto cycle `1 − r^{1−γ}` |
| TC-6 | standard | Langmuir isotherm | `θ = K P/(1 + K P)` | adsorption, surface chemistry | `K P` is a free group; the form is a site-balance | none |
| TC-7 | cross-domain | Butler–Volmer | `i = i₀ [e^{α e η/(k_B T)} − e^{−(1−α) e η/(k_B T)}]` | electrochemistry, kinetics, thermodynamics | `e η/(k_B T)` is a pure number inside two exponentials | partial: be-147 (rate), be-151 (Nernst) |
| TC-8 | cross-domain | Debye–Hückel limiting law | `ln γ_± = −z² e² κ/(8π ε₀ ε_r k_B T)`, `κ² = 2 N_A e² I/(ε₀ ε_r k_B T)` | electrostatics, statistical mechanics, solutions | four free groups; the 8π is the Poisson–Boltzmann linearisation | none |
| TC-9 | cross-domain | Kelvin equation | `ln(P/P₀) = 2 γ V_m/(r k_B T)` | interfacial tension, vapor pressure, thermodynamics | `γ V_m/(r k_B T)` is a pure number in an exponent | partial: be-152 (Clapeyron), be-153 (Raoult) |
| TC-10 | cross-domain | Gas mean free path | `λ = k_B T/(√2 π d² p)` | kinetic theory, thermodynamics, molecular size | monomial `k_B T/(d² p)` fixed, the `√2 π` is not | none (CE-ideal-gas, CE-kinetic-pressure give `p`) |
| TC-11 | cross-domain | Gray-body radiation exchange | `q = σ (T₁⁴ − T₂⁴)/(1/ε₁ + 1/ε₂ − 1)` | thermal radiation, surface properties | `ε` is a pure number; the denominator is a series of resistances | partial: be-165, CE-stefan-boltzmann |
| TC-12 | cross-domain | Nernst–Einstein ionic conductivity | `Λ = z² e² D/(k_B T)` per ion, `Λ_m = z² F² D/(R T)` | electrolytes, diffusion, thermodynamics | monomial fixed, the 1 is physics; sign and `z²` are not forced | partial: be-70 (Einstein relation), CE-stokes-einstein |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**TC-1 Log-mean temperature difference (standard).** The duty of a heat exchanger with terminal differences `ΔT₁` and `ΔT₂` is `Q = U A ΔT_lm`, with `ΔT_lm = (ΔT₁ − ΔT₂)/ln(ΔT₁/ΔT₂)`: 36.4 K and 182 kW for 60 K, 20 K, U = 500 W/(m² K), A = 10 m². Premises: constant U and heat capacities, steady state, no phase change, no losses. The limit `ΔT₁ → ΔT₂` is a removable singularity that an evaluator must handle.

**TC-2 Counterflow ε–NTU (standard).** The effectiveness of a counterflow exchanger is `ε = (1 − e^{−NTU(1−C_r)})/(1 − C_r e^{−NTU(1−C_r)})`, with `NTU = U A/C_min`. NTU = 2 and `C_r` = 0.5 give 0.775. Premises: constant U, no phase change, steady state. At `C_r = 1` the formula is 0/0 with the limit `NTU/(1 + NTU)`.

**TC-3 Darcy–Weisbach with Blasius (standard).** The pressure drop is `Δp = f (L/D) ρ v²/2`; for smooth turbulent flow `f = 0.316 Re^{-1/4}` (valid for `3000 < Re < 10⁵`). 10 m of 50 mm water pipe at 1 m/s gives `f` = 0.0211 and 2.11 kPa. Premises: fully developed, smooth wall, incompressible. The Blasius law is empirical, so the value is the review item.

**TC-4 Ergun equation (standard).** Flow through a packed bed has `Δp/L = 150 μ(1−ε)² v/(ε³ d²) + 1.75 ρ(1−ε) v²/(ε³ d)`, viscous plus inertial. 3 mm beads at ε = 0.4 and 0.1 m/s gives 64.1 kPa/m. Premises: spherical uniform particles, superficial velocity `v`, incompressible. The coefficients 150 and 1.75 are fitted and carry spread across references.

**TC-5 Brayton cycle (standard).** An ideal gas-turbine cycle at pressure ratio `r_p` has `η = 1 − r_p^{(1−γ)/γ}`; 0.482 at 10 and γ = 1.4. Premises: ideal gas, constant γ, isentropic compression and expansion, isobaric heat exchange. It is the companion of be-162. A first attempt to run it through `upt derive` was refused for the symbolic exponent (#486).

**TC-6 Langmuir isotherm (standard).** The fractional coverage is `θ = K P/(1 + K P)`, 0.5 at `K P` = 1. Premises: one site per molecule, no interaction, a single layer, reversible adsorption. `K` is the ratio of rate constants and has an Arrhenius dependence (be-147), which is the link between this relation and the catalog.

**TC-7 Butler–Volmer (cross-domain).** An electrode reaction has `i = i₀ [exp(α e η/(k_B T)) − exp(−(1−α) e η/(k_B T))]`, with `e` the elementary charge per electron; at `η = 0.1 V`, α = 0.5, 298 K the ratio `i/i₀` is 6.86. Premises: one-step single-electron transfer, no mass-transfer limit, `i₀` supplied. Join: electrochemistry, the Arrhenius rate (be-147) and the Nernst equation (be-151) as its `η → 0` limit.

**TC-8 Debye–Hückel limiting law (cross-domain).** The activity coefficient of an ion in a dilute electrolyte is `ln γ = −z² e² κ/(8π ε₀ ε_r k_B T)` with `κ² = 2 N_A e² I/(ε₀ ε_r k_B T)`; 0.01 mol/L of a 1:1 salt in water gives γ = 0.889 and a screening length of 3.04 nm. Premises: dilute (`I` below about 0.01 mol/L), point ions, linearised Poisson–Boltzmann. Join: electrostatics, statistical mechanics and solution chemistry.

**TC-9 Kelvin equation (cross-domain).** The vapor pressure over a droplet of radius `r` is raised: `ln(P/P₀) = 2 γ V_m/(r k_B T)` (`V_m` the volume per molecule). A 10 nm water droplet at 298 K gives a ratio 1.110. Premises: spherical interface, bulk surface tension, ideal vapor, incompressible liquid. Join: surface tension and thermodynamics.

**TC-10 Mean free path (cross-domain).** A hard-sphere gas of diameter `d` has `λ = k_B T/(√2 π d² p)`; N₂ at 1 atm and 298 K gives 66.8 nm. Premises: dilute, hard spheres, Maxwellian speeds. Join: kinetic theory with the ideal-gas law. It is the length that sets the Knudsen number and the kinetic thermal conductivity.

**TC-11 Gray-body radiation exchange (cross-domain).** Two large parallel gray plates exchange `q = σ (T₁⁴ − T₂⁴)/(1/ε₁ + 1/ε₂ − 1)`; 500 K and 300 K with ε = 0.8 gives 2056 W/m². Premises: diffuse gray surfaces, vacuum between, infinite parallel geometry. Join: be-165's quantum constant and the surface emissivity of the materials.

**TC-12 Nernst–Einstein conductivity (cross-domain).** The limiting ionic conductivity follows from diffusion: `Λ_m = z² F² D/(R T)`; Na⁺ (D = 1.33×10⁻⁹ m²/s, 298 K) gives 5.0 mS m²/mol, the tabulated value. Premises: infinite dilution, no ion pairing. Join: electrolyte conduction and the Einstein relation (be-70).

**Count: 6 standard, 6 cross-domain, 12 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.
