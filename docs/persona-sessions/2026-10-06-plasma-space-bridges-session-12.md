# Plasma and space physicist — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: plasma and space physicist. The previous plasma round is `2026-10-04-plasma-space-bridges-session-6.md`; its 23 candidates are now catalog ids be-103 to be-125 and are not proposed again. Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

## 1. Package version proved

Scratch directory outside the repo: `npm init -y && npm i universal-physics-tensor@8.0.0`.

| check | printed |
|---|---|
| `npm ls universal-physics-tensor` | `universal-physics-tensor@8.0.0` |
| `require('./node_modules/universal-physics-tensor/package.json').version` | `8.0.0` |
| CLI | `node node_modules/universal-physics-tensor/bin/upt.mjs …` |

For regression comparison only, `universal-physics-tensor@6.0.0` was installed in a second scratch directory. No physics claim rests on it.

## 2. Commands run and notable outputs

### Hand-checked evaluators (all pass)

Computed with `evaluateRelation` and compared with a closed form typed independently (SI CODATA constants).

| bridge | inputs | printed | hand value |
|---|---|---|---|
| be-67 Alfvén | B = 10 nT, n = 10⁶ m⁻³ protons | `218120.34472849965` | `B/√(μ0 n m_p)` = 218120.3447285 |
| be-69 fast magnetosonic | c_s = 30 km/s, same plasma | `220173.76043588738` | `√(c_s² + v_A²)` |
| be-64 Eddington | 1 M☉ | `1.2574382573536063e+31` | `4π G M m_p c/σ_T` |
| be-105 upper hybrid | n = 10¹¹ m⁻³, B = 50 µT | `19889618.67802499` | `√(ω_p² + ω_c²)` |
| be-103 Bohm | T_e = 10⁵ K, protons | `28730.4712051947` | `√(k_B T_e/m_p)` |
| be-118 Parker radius | c_s = 120 km/s, 1 M☉ | `4609438437.5` | `G M/(2 c_s²)` |
| be-115 two-species | λ = 3, 4 m | `2.4` | `(1/9 + 1/16)^-1/2` |
| be-66 radiation pressure | 1361 W/m², R = 1 | `9.0796146712937e-6` | `2I/c` |
| be-120 Chapman–Ferraro | B_E = 31 µT, ρ = 5 cm⁻³ protons, v = 400 km/s | `1143025.0469471207` | `(2B²/(μ0 ρ v²))` = 1.143e6, which is `(R/R_E)^6`; `R/R_E` = 10.23 |
| be-123 | α = 10 | `0.009900990099009901` | `1/(1 + α²)` |

CLI unit grammar worked for `50nT`, `1G` (gauss), `1gauss`, `10eV` on a temperature slot (read as k_B T), `1keV`, `1MeV`, `1AU`, `400km/s`, `120km/s`, `1Msun`, `30deg`, `1.361kW/m^2`, `1/cm^3`, `1e5cm^-3`, `1.67e-27g/cm^3`. The Msun conversion prints the IAU caveat. `upt eval "sqrt(eps0*k_B*T/(n*e^2))" T=1eV n=1e6` prints `7.433941994700463` m (Debye length). `upt eval "sqrt(k_B*T/m_p)" T=10eV` prints `30949.690072670575`. `upt explain larmor-radius …` and `upt explain plasma-frequency …` print a recovered value and the `|charge|` proportionality; two disagreeing magnetic-field spellings exit 1.

### Failures and surprises

| command | result | issue |
|---|---|---|
| `evaluate be-120 B_E_T=… rho_kg_per_m3=… v_m_per_s=…` | 8.0.0: `value = 1143450.21`; 6.0.0 printed `standoff_sixth = 1143450.2110350155` | #460 |
| `evaluate be-67 …` | 8.0.0: `value = 218291.5`; 6.0.0: `v_m_per_s = 218291.50359208556` | #460 |
| `eval B B=3ugauss` | `448.7936121` (6.0.0 rejected it) | #461 |
| `eval B B=1mG` | `0.0001` (6.0.0 rejected it) | #461 |
| `eval B B=1uG`, `1nG`, `1kG` | exit 1 | #461 |
| `evaluate be-67 B_T=1mG …` | exit 1, "'mG' is [L M T^-2 I^-1]" | #461 |
| `eval m m=1u`, `1amu`, `1Da` | exit 1 | #462 |
| `eval m m=1m_p` | exit 1, `unknown name '__u0_p'` | #462 |
| `eval L L=1Lsun`, `S=1Jy`, `E=1erg`, `n=1cc` | exit 1 | #462 |
| `evaluateRelation('be-76', {n:-1e6, T_K:1e5, p_B_Pa:1e-12})` | `-1.38` | #463 |
| `evaluateRelation('be-110', {B0_T:2, Bm_T:1})` | `2` | #463 |
| `evaluateRelation('be-116', {Z:-1, …})` | negative resistivity | #463 |
| `evaluateRelation('be-122', {m_e_kg: mp, m_i_kg: me})` | `4.18` | #463 |
| `evaluateRelation('be-103', {T_e_K:-1e5, …})` | `FormulaError`, not `DomainViolationError` | #463 |

Not filed, noted: `upt map --equation "v_A = B/sqrt(mu0*rho)"` takes `B` and `rho` as dimensionless and suggests `F` and `newtonrho` for them; the same formula through `upt derive` with declared dimensions recovers prefactor 1. `upt explain alfven-speed … mass-density=…` hints `plasma-mass-density`; `density` alone does not resolve. `be-119` returns `-1.07151` for a prograde wind, a sign convention that is not printed (covered by #460). `upt search gyroradius` and `gyrofrequency` exit 1 although `larmor` and `cyclotron` hit.

### Search and coverage

Exit 1, no entry: `sweet-parker`, `reconnection`, `sedov`, `blast wave`, `rankine`, `strong shock`, `bondi`, `stromgren`, `recombination`, `dispersion measure`, `faraday rotation`, `rotation measure`, `synchrotron`, `larmor formula`, `free-free`, `critical ionization`, `coulomb logarithm`, `magnetic reynolds`, `hill sphere`, `roche`, `escape velocity`, `virial`, `free-fall`, `kelvin-helmholtz`, `photoionization`, `magnetic moment`, `adiabatic invariant`, `polytrope`, `scale height`, `barometric`, `collisionless skin`. Hit but a different law: `bohm diffusion` returns be-123 (classical ratio), `bremsstrahlung` returns be-121 (description), `accretion` and `thomson` return be-64, `spitzer` returns be-116 (Lorentz, description), `lundquist` returns be-117 (description), `skin depth` returns `case-skin-depth` (a conductor). `upt regime plasma` still says VACUOUS.

### Derive runs for the proposals

| id | exit | what units gave |
|---|---|---|
| PS-1 | 3 | two free groups; the exponent −1/2 is not chosen |
| PS-2 | 0 | `R ∝ E^0.2 t^0.4 ρ^-0.2`, prefactor 1.15 as typed |
| PS-3 | 3 | dimensionless; two free groups |
| PS-4 | 0 | `D ∝ k_B T e⁻¹ B⁻¹`, prefactor 1/16 as typed |
| PS-5 | 3 | two velocities; `v²` and `c_s²` cannot be told apart |
| PS-6 | 3 | `α n/Q` is a free dimensionless group |
| PS-7 | 3 | three groups; `e²/(ε0 m c)` is only one of several constant combinations |
| PS-8 | 3 | four groups |
| PS-9 | 0 | `P ∝ q² a² ε⁻¹ c⁻³`, prefactor 5.3052e-2 = 1/(6π) as typed |
| PS-10 | 3 | seven groups. The first attempt, written from memory without `ℏ`, printed `formula dimension [L M^2 T^-4] ⚠ ≠ target [power/volume]`, and the same formula with `16/(3ℏ)` printed `✓ matches target`. The derive caught the missing action |
| PS-11 | 0 | `v ∝ (e φ/m)^0.5`, prefactor √2 as typed |

For PS-2, PS-4, PS-9 and PS-11 units fix the monomial and leave the dimensionless constant to the physics; a recovered prefactor is the report of the formula that was typed, not a derivation. Literature numbers re-computed in Node from CODATA constants: PS-7 gives 4.1488 ms·GHz² per pc cm⁻³; PS-8 gives 0.8119 rad m⁻² per cm⁻³ µG pc; PS-6 gives 3.15 pc at Q = 10⁴⁹ s⁻¹, n = 100 cm⁻³, α_B = 2.6×10⁻¹³ cm³ s⁻¹; PS-10 gives 5.41×10⁻²⁵ W m⁻³ at T = 10⁷ K, n = 10⁶ m⁻³, ḡ = 1.2, against 5.31×10⁻²⁵ from the cgs `1.4×10⁻²⁷ T^½ n_e n_i ḡ`.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | medium | `upt evaluate` prints an unlabeled `value =`; 6.0.0 printed the output name | [#460](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/460) |
| 2 | high | `upt eval` reads `3ugauss` as 448.79 and `1mG` as 1e-4 (6.0.0 rejected both); `uG`, `nG`, `kG` rejected | [#461](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/461) |
| 3 | low | Atomic mass unit missing; `1m_p` leaks `__u0_p`; CGS astro units absent | [#462](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/462) |
| 4 | medium | Plasma evaluators accept unphysical signs and orderings (be-76, 110, 111, 114–118, 121–125); be-103/105 throw `FormulaError` | [#463](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/463) |

Four new issues. Related and already open from the previous round: #452, #453, #458.

## 4. Proposed bridges

Classification follows the catalog's own filing: **cross-domain** joins a constant or quantity from a second field (atomic recombination, radio propagation, electromagnetic radiation theory, quantum constants) to a plasma or astrophysical relation; **standard** stays inside plasma, fluid or gas dynamics.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| PS-1 | standard | Sweet–Parker reconnection inflow | `v_in = v_A S^-1/2`, `S = L v_A/η` | MHD, resistive diffusion | `v_A η/L` vs `v_A (η/L v_A)^p` differ by a free group | partial: be-117 resistive decay is the diffusion half |
| PS-2 | standard | Sedov–Taylor blast radius | `R = ξ(γ) (E t²/ρ)^{1/5}` | gas dynamics, supernova remnants | units fix the 1/5, not `ξ(γ)` (1.15 at γ = 5/3) | none |
| PS-3 | standard | Strong-shock compression | `ρ₂/ρ₁ = (γ+1)/(γ−1)` | gas dynamics | dimensionless: any function of γ passes | none |
| PS-4 | standard | Bohm diffusion | `D_B = k_B T_e/(16 e B)` | magnetized plasma transport | units fix the monomial; the 1/16 is empirical | partial: be-123 is the classical 1/(1+α²) ratio |
| PS-5 | standard | Bondi–Hoyle accretion radius | `r = 2 G M/(v² + c_s²)` | gravity, gas dynamics | `v²` and `c_s²` are both velocity²; the sum and the 2 are not forced | partial: be-118 is `G M/(2 c_s²)` for the wind |
| PS-6 | cross-domain | Strömgren radius | `R_S = (3 Q/(4π α_B n²))^{1/3}` | photoionization, recombination, interstellar plasma | `α n/Q` is a free group; 3/(4π) and case B are physics | none |
| PS-7 | cross-domain | Pulsar dispersion delay | `Δt = e²/(8π² ε0 m_e c) · DM/ν²` | cold-plasma refraction, radio astronomy | `e²/(ε0 m c)` vs `r_e c` vs `α ℏ/(m c)`-type combinations all fit | partial: be-106 is the cutoff, not the group delay |
| PS-8 | cross-domain | Faraday rotation measure | `RM = e³/(8π² ε0 m_e² c³) ∫ n B_∥ dl`, `Δχ = RM λ²` | magnetized cold plasma, polarimetry | four free groups; the 1/(8π²) is not fixed | none (be-105/106 are the dispersion roots) |
| PS-9 | cross-domain | Larmor radiation power | `P = q² a²/(6π ε0 c³)` | electrodynamics, accelerated charge | monomial fixed, the 1/(6π) is not | none |
| PS-10 | cross-domain | Thermal bremsstrahlung power density | `P = (16/(3ℏ)) (e²/4πε0)³/(m c³) √(2π k_B T/(3m)) Z² n_e n_i ḡ` | quantum electrodynamics, thermal plasma | seven free groups; units caught a dropped `ℏ` | none |
| PS-11 | cross-domain | Critical ionization velocity | `v_crit = √(2 e φ_i/m_n)` | atomic ionization, plasma instability | monomial fixed, the 2 and the instability premise are not | none |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**PS-1 Sweet–Parker inflow (standard).** A steady current sheet of length `L` and thickness `δ` with inflow `v_in` and outflow `v_A`: mass conservation `v_in L = v_A δ` and diffusion balance `v_in = η/δ` give `v_in/v_A = S^-1/2`, `S = μ0 σ L v_A = L v_A/η`. Premises: incompressible, steady, uniform resistivity, outflow at the Alfvén speed. It stays below the observed fast-reconnection rate, which is a negative result about the model, not about the algebra.

**PS-2 Sedov–Taylor radius (standard).** A point explosion of energy `E` in a uniform medium of density `ρ` has the similarity solution `R = ξ (E t²/ρ)^{1/5}`. Premises: adiabatic, strong shock, negligible ambient pressure and negligible radiative loss. `ξ` comes from the energy integral and depends on γ (1.15 at 5/3, 1.03 at 7/5).

**PS-3 Strong-shock compression (standard).** The Rankine–Hugoniot conditions with upstream Mach number → ∞ give `ρ₂/ρ₁ = (γ+1)/(γ−1)`, 4 for γ = 5/3. Premises: ideal gas, stationary planar shock. With a perpendicular field the ratio is the root of a quadratic in β and M and is not this.

**PS-4 Bohm diffusion (standard).** Cross-field diffusion coefficient `D_B = k_B T_e/(16 e B)`. The 1/16 is an empirical coefficient from Bohm's experiments, not a derivation; it is the anomalous alternative to the classical `1/(1+α²)` of be-123. Premises: magnetized, turbulent, electron temperature in energy units.

**PS-5 Bondi–Hoyle radius (standard).** The accretion radius `r_BH = 2 G M/(v_∞² + c_s²)` reduces to `2 G M/c_s²` for a body at rest. Premises: a point mass, uniform gas, no radiation feedback, no angular momentum. The factor 2 and the quadrature sum are conventions of the capture-radius definition.

**PS-6 Strömgren radius (cross-domain).** Ionization balance for a uniform hydrogen cloud, `Q = (4π/3) R³ n² α_B`, gives `R_S = (3Q/(4π α_B n²))^{1/3}`. Premises: case B recombination (no recombination straight to the ground state), pure hydrogen, sharp boundary. α_B is atomic physics at a stated temperature. Join: radiation transfer plus atomic recombination plus plasma density.

**PS-7 Dispersion delay (cross-domain).** For a cold unmagnetized plasma the group delay at `ν ≫ ν_p` is `Δt = (e²/(8π² ε0 m_e c)) DM/ν²`, `DM = ∫ n dl`. It is the 4.149 ms GHz² constant of pulsar timing. Premises: cold, `ν ≫ ν_p`, no scattering. Join: the be-106 plasma frequency feeds the refractive index `√(1−ω_p²/ω²)`; radio propagation supplies the delay.

**PS-8 Faraday rotation (cross-domain).** The polarization angle rotates by `Δχ = RM λ²`, `RM = (e³/(8π² ε0 m_e² c³)) ∫ n B_∥ dl`. Premises: quasi-longitudinal propagation, `ω ≫ ω_p, ω_c`, a Faraday-thin screen. Join: gyrotropic plasma dielectric plus radio polarimetry. It carries the sign of `B_∥`, so a magnitude-only evaluator would be wrong.

**PS-9 Larmor radiation (cross-domain).** A non-relativistic accelerated charge radiates `P = q² a²/(6π ε0 c³)`. Premises: `v ≪ c`, point charge, far field. Join: classical electrodynamics supplies the formula; gyrating plasma electrons supply the acceleration (`a = ω_c v_⊥`), which gives cyclotron emission.

**PS-10 Thermal bremsstrahlung (cross-domain).** Free–free emissivity of a Maxwellian plasma, integrated over frequency: `P = (16/(3ℏ)) (e²/(4π ε0))³/(m c³) √(2π k_B T/(3m)) Z² n_e n_i ḡ_B` (SI form of Rybicki–Lightman 5.15b, hand-converted from cgs; the cgs check reproduces `1.4×10⁻²⁷ T^½` to 2%). Premises: non-relativistic, optically thin, Born approximation, thermally averaged Gaunt factor ḡ_B ≈ 1.2. The first typed attempt omitted `ℏ` and `upt derive` flagged the dimension, which is the cleanest demonstration in this session of what units can and cannot settle.

**PS-11 Critical ionization velocity (cross-domain).** Alfvén's condition `½ m_n v² = e φ_i` for a neutral gas streaming across a magnetized plasma. For hydrogen `φ_i = 13.6 V` gives 51 km/s. The monomial is dimensional, but whether the condition is a threshold for an instability is experimental and contested, so this is the candidate most likely to end as a negative result.

**Count: 5 standard, 6 cross-domain, 11 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.

## 7. Second pass, 2026-11-01

Same published package, a later install. This section does not replace sections 1–6. Candidates already in the table above are not proposed again. Nothing here changes `src/`.

### Version

`npm view universal-physics-tensor@8.0.0 version gitHead` prints `8.0.0` and `888099c0111d88214b0ca92aa9c7ea45292a9d48`. Annotated tag `v8.0.0` is object `0956655b13c08cd6e870dba88c4fd1447c139ed4` and its target is that commit. The message is `v8.0.0: data-driven bridge catalog and engine`. Publish workflow run `37527828453` succeeded. `gh release view v8.0.0` returns release not found.

On Node v22.23.4 a fresh `npm i universal-physics-tensor@8.0.0` resolves `@danielsimonjr/mathts-functions@0.68.5` (the range is `^0.68.0`, and `@danielsimonjr/mathts-core` is `0.16.0`). Importing the package throws `rationalNullspace: entry [0, 0] must be a finite number or a Fraction` from `dist/dimensional/buckingham.js`. `upt version` does not run. That failure is [#525](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/525). [#530](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/530) is the same repro and should be closed as a duplicate.

The commands below pin `@danielsimonjr/mathts-functions@0.68.0`. `import { BRIDGE_EQUATIONS }` has length 160. `upt version` prints `8.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` names `@danielsimonjr/mathts-functions 0.68.0` and prints `2.718281828459045`. `upt eval e` prints `1.602176634e-19`. `upt eval euler` exits 2 and names `exp(x)`.

### Overlap the first table missed

PS-9 says the Larmor power has no catalog row. `upt search "larmor power"` exits 0 on `CE-larmor-power`. `upt explain larmor-power` with `charge=-e`, `acceleration=1`, `vacuum-permittivity`, and `speed-of-light` recovers `5.70832676502951e-54` and the monomial `charge^2·acceleration^2·vacuum-permittivity^-1·speed-of-light^-3`. That is the canonical law. PS-9 is not proposed again.

### Bugs this pass filed

Each repro is published `@8.0.0` with functions pinned at 0.68.0, except the load failure, which is the unpinned install.

| issue | what @8.0.0 did | already filed |
|---|---|---|
| [#533](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/533) | `upt search saha` lists quantities `sahamass`, `sahawarmth`, `sahaion`, `sahaconst`, and says `saha is a prefix of sahamass`. `upt explain sahamass --source=catalog` has no derivation path. `upt evaluate` prints `m_kg [kg] sahamass m_kg — sahamass`. The same slug pattern is on the round-9 rows (`arrhprefac`, `newtonvol`, `vanthoffenthalpy`, `clapintlatent`, and the rest of that block). | no |
| [#535](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/535) | Notes on ids 147–170 say `kind bridge` and `formally-proved`. `upt atlas be-147` through `upt atlas be-170 --json` each print `formalRef.kind` `derivation-step`. `upt map --source=catalog --evidence=formally-proved` keeps 94 of 158 and does not list 147–170. The Saha note names `PhysJS.Saha.saha_eq` as kind `bridge`. | no |
| [#536](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/536) | `upt search "coulomb logarithm"` exits 1. `upt evaluate` with no id describes be-116's `ln_Lambda` as `Coulomb logarithm`. `upt search logarithm` hits be-127 and be-142, not be-116. `upt search spitzer` hits be-116 on the description. | the miss is in section 2; it was not an issue |
| [#531](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/531) | `upt evaluate be-110 B0_T=2 Bm_T=1` exits 0 and prints `value = 2`. The target symbol is `sin²θ_lc`. `Bm = 0` throws. | duplicate of [#463](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/463). Close 531. |
| [#532](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/532) | `upt evaluate be-120 B_E_T=3.12e-5 rho_kg_per_m3=8.36310961845e-21 v_m_per_s=4e5` prints `value = 1157821.3337150936`. The sixth root is `10.247240393394772`. JSON output has no symbol. | duplicate of [#460](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/460). Close 532. |
| [#534](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/534) | `Ea_J_per_mol=50kJ/mol` on be-147 exits 1 (`input is [1]`). Bare `50000` at `T_K=300` and `A_Hz=1e13` prints `19696.844058205552`. `dH_J_per_mol=40kJ/mol` on be-149 and be-152 exits 1. `V_m3=0.001m3` on be-161 exits 1. | duplicate of [#445](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/445). Close 534. |

This pass could not close 530, 531, 532, or 534. The token can open an issue and cannot close one.

### Further candidates

Every row is unproven. A recovered prefactor is the derive command's report of the formula that was typed. No measurement was opened. `upt derive` on each row says no canonical equation has that target and those variables.

| id | type | formula | domains | why units are not enough | catalog overlap |
|---|---|---|---|---|---|
| PS-12 | standard | `ω² = ω_p² + 3 k² v_t²`, `v_t² = k_B T/m` | plasma waves | exit 3. Groups `w/wp` and `w/(k v_t)`. The `3` is not recovered. | `upt search bohm-gross` exits 0 on be-113, description only. be-113 says Bohm–Gross is nested and does not replace `ω`. |
| PS-13 | standard | `p_⊥/(ρ B)` and `p_∥ B²/ρ³` constant | kinetic MHD | each typed target exits 0 with prefactor `1.0000e+0`. Units do not choose those powers against any other pair. | `upt search cgl` exits 0 on be-124, description only. be-124 says the CGL closure is not derived. |
| PS-14 | standard | `E_D = n e³ lnΛ / (4 π ε0² k_B T)` | runaway electrons | exit 3. Three groups, including `lnΛ`. The `4π` is not recovered. Here `e` is the elementary charge. | `upt search dreicer` exits 1. be-116 takes `ln Λ` and is not this field. |
| PS-15 | standard | `γ = (√3/2) (m_e/(2 m_i))^{1/3} ω_pe` | two-stream / Buneman | exit 3. Groups `γ/ω_pe` and `m_e/m_i`. The `1/3` and `√3/2` are not recovered. | `upt search buneman` and `upt search two-stream` exit 1. |
| PS-16 | standard | `Δv = ± ΔB / √(μ0 ρ)` | MHD waves | exit 0. Monomial `Δv ∝ ΔB·ρ^-0.5·μ0^-0.5`, prefactor `1`. The sign is not in that monomial. | `upt search walen` exits 1. be-67 is the phase speed of one polarization, not the jump. |
| PS-17 | standard | `q = 2π a B_t / (R B_p)`, kink when `q < 1` | MHD stability | exit 3. Groups `q`, `a/R`, and `B_t/B_p`. The `2π` and the threshold `1` are not recovered. | `upt search kruskal` exits 1. |
| PS-18 | cross-domain | `P = u/3` | photon gas, hydrodynamics | exit 0. `P ∝ u`, prefactor `3.3333e-1` because `1/3` was typed. | `upt search "radiation pressure"` hits be-64 and be-66. be-66 is `(I/c)(1+R) cos²θ` and is not this pressure. |
| PS-19 | cross-domain | `ω_c = (3/2) γ² (e B/m) sinψ` | relativity, cyclotron radiation | exit 3. Groups `γ` and `ω/ω_ce`. The `3/2` and the power `2` are not recovered. | `upt search synchrotron` exits 1. The cyclotron monomial is separate. |
| PS-20 | cross-domain | `Ṁ = π exp(3/2) G² M² ρ_∞ / c_s³` | gravitation, accretion | exit 3. Two groups. `π exp(3/2) = 14.079641459047734` was typed, not recovered. | `upt search bondi` exits 1. PS-5 is the capture radius. be-118 is `G M/(2 c_s²)`, the sonic radius, not the rate. |
| PS-21 | cross-domain | `q = 3 r/(r−1)` | shocks, cosmic rays | exit 3. Two pure numbers. The `3` is not recovered. A strong shock `r = 4` gives `q = 4`. | `upt search "shock acceleration"` exits 1. PS-3 is the density ratio, not the spectrum. |
| PS-22 | cross-domain | `H = k_B (T_e + T_i)/(m_i g)` | ionosphere, gravitation | exit 3. Groups `T_e/T_i` and `H m_i g /(k_B T_e)`. The sum is not a monomial. | `upt search "scale height"` exits 1. be-65 is a mass. be-118 is a wind radius. |
| PS-23 | cross-domain | `P = (4/3) σ_T c β² γ² u_rad` | scattering, radiation | exit 3. Groups `β`, `γ`, and `P/(σ_T c u)`. The `4/3` is not recovered. | `upt search "inverse compton"` exits 1. `upt search compton` hits the Compton wavelengths and the shift. `CE-thomson-cross-section` is the area, audit tag `×8.378e+0`. |

**PS-12 Bohm–Gross (standard).** Cold-fluid electrons plus the one-dimensional adiabatic moment give `ω² = ω_p² (1 + 3 k² λ_D²)` with `v_t² = k_B T/m` and `λ_D² = v_t²/ω_p²`. The `3` is that moment. A convention `v_t² = 2 k_B T/m` rewrites it.

**PS-13 Chew–Goldberger–Low (standard).** The double-adiabatic invariants are `p_⊥/(ρ B)` and `p_∥ B² / ρ³`. be-124 uses a CGL wave root as a hypothesis and does not derive the closure. Firehose and mirror thresholds are that root, not these two constants.

**PS-14 Dreicer field (standard).** `E_D = n e³ lnΛ / (4 π ε0² k_B T)` is the field at which the collisional drag on a thermal electron, with `v_T² = k_B T/m`, no longer confines a runaway. The Coulomb logarithm is held constant. be-116 is the resistivity that uses the same logarithm. It is not this field.

**PS-15 Buneman rate (standard).** Cold electrons drifting through cold ions, `m_e ≪ m_i`, grow at `γ = (√3/2) (m_e/(2 m_i))^{1/3} ω_pe` on the fastest mode. The mass-ratio power is the cubic root of the dispersion, not a dimensional requirement.

**PS-16 Walén jump (standard).** An incompressible Alfvénic fluctuation satisfies `Δv = ± ΔB / √(μ0 ρ)`. The sign is the propagation direction along `B`. be-67 is `B/√(μ0 ρ)` for the background phase speed of one transverse polarization.

**PS-17 Kruskal–Shafranov (standard).** A large-aspect-ratio circular plasma has safety factor `q = 2π a B_t / (R B_p)`. The external kink is unstable for `q_a < 1`. The `2π` is the poloidal trip around the torus. A non-circular cross-section is a different definition.

**PS-18 Photon-gas pressure (cross-domain).** An isotropic photon gas has `P = u/3`. With `u = 4 σ T⁴ / c` this is `P = 4 σ T⁴ / (3 c)`. be-66 is the pressure of a directed beam on an opaque surface. The Eddington luminosity be-64 uses radiation force and is not this equation of state.

**PS-19 Synchrotron critical frequency (cross-domain).** `ω_c = (3/2) γ² ω_ce sinψ` with `ω_ce = |e| B / m`. The `γ²` is relativistic beaming. The rest-frame cyclotron frequency does not contain it.

**PS-20 Isothermal Bondi rate (cross-domain).** Steady spherical accretion with `v→0` and `ρ→ρ_∞` at infinity passes through `v = c_s` at `r_c = G M / (2 c_s²)`, which is be-118, and the density there is `ρ_∞ exp(3/2)`. The rate is `Ṁ = 4π r_c² ρ_c c_s = π exp(3/2) G² M² ρ_∞ / c_s³`. PS-5 is the Bondi–Hoyle capture radius, a different length.

**PS-21 Diffusive shock acceleration (cross-domain).** A test-particle power law at a shock of compression `r` has momentum index `q = 3r/(r−1)`. The `3` is the dimension of momentum space. PS-3 is the hydrodynamic `r` for a strong gas shock. It does not state `q`.

**PS-22 Ambipolar scale height (cross-domain).** A quasineutral ionosphere with `T_e` and `T_i` has `H = k_B (T_e + T_i)/(m_i g)`. Units do not choose the sum of the two temperatures. be-65 counts a cloud mass. This row is a length.

**PS-23 Inverse Compton power (cross-domain).** In the Thomson limit, `P = (4/3) σ_T c β² γ² u_rad`. The `4/3` is the isotropic average of the scattered power. `CE-thomson-cross-section` supplies `σ_T` and is not this cooling rate.

Addendum count: 6 standard (PS-12–PS-17) and 6 cross-domain (PS-18–PS-23). Section 4 is unchanged: 5 standard and 6 cross-domain. PS-9 stays in that table. The overlap note above records that it is already `CE-larmor-power`, so it is not a new bridge.

No src changes. Awaiting owner review.
