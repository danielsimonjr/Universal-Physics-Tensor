# Condensed-matter physicist — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: condensed-matter physicist. The earlier condensed-matter rounds are `2026-10-04-condensed-matter-bridges-session-5.md` and `2026-10-05-condensed-matter-physicist-bridges-session-8.md`; their candidates are now catalog ids be-88 to be-102 and be-134 to be-146, except the two the report of round 8 names as still absent (Landau diamagnetism and the BCS coherence length), which are not re-proposed here. Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

## 1. Package version proved

Scratch directory outside the repo: `npm init -y && npm i universal-physics-tensor@8.0.0`.

| check | printed |
|---|---|
| `npm ls universal-physics-tensor` | `universal-physics-tensor@8.0.0` |
| `require('./node_modules/universal-physics-tensor/package.json').version` | `8.0.0` |
| CLI | `node node_modules/universal-physics-tensor/bin/upt.mjs …` |
| library | `import * as U from 'universal-physics-tensor'`, `U.evaluateRelation(id, inputs)` |

## 2. Commands run and notable outputs

### Hand-checked evaluators

Computed with `evaluateRelation` and compared with a closed form typed independently (CODATA 2018 constants). Copper: n = 8.47×10²⁸ m⁻³, E_F = 7 eV.

| bridge | printed | hand value |
|---|---|---|
| be-88 `k_F` | `13586308449.709091` | `(3π² n)^{1/3}` |
| be-89 Debye cutoff, v = 3000 m/s | `51353028018459.19` | `v (6π² n)^{1/3}` |
| be-90 Debye heat, T = 10 K, θ_D = 343 K | `7.998557202205259e-26` | `(12π⁴/5) N k_B (T/θ_D)³` |
| be-91 Einstein, T = θ_E | `3.813381231508183e-23` | `3 N k_B e/(e−1)²` |
| be-92 Sommerfeld, 300 K | `21312.409215803884` | `π² n k_B² T/(2 E_F)` |
| be-93 Curie–Weiss, T = 300 K, θ = 0 | `0.00026093987733877516` | `n g² S(S+1) μ0 μ_B²/(3 k_B T)` |
| be-94 Pauli | `0.000012243659040620672` | `μ0 μ_B² 3n/(2 E_F)` |
| be-96 upper critical field, ξ = 10 nm | `3.291059784754533` T | `Φ0/(2π ξ²)` |
| be-97 Ambegaokar–Baratoff, 1.764 k_B·9.2 K | `0.002196742610186375` V | `π Δ/(2e)` |
| be-99 silicon `n_i²`-form | `6675898719714784` | `√(N_c N_v) exp(−E_g/2kT)` |
| be-101 BKT | `113.77231481679242` K | `π J/(2 k_B)` |
| be-102 Landauer, ΣT = 1 | `0.00007748091729863649` S | `2e²/h` |
| be-55 / be-59 / be-60 | `3.874e-5` S; `483597848.4169836` Hz; `1.2913e-5` S | `e²/h`; `2eV/h`; `e²/(3h)` |
| be-61 Wiedemann–Franz, Cu 300 K | `436.80920622237164` | `L0 σ T` |
| be-75 London depth | `1.825944053759763e-8` m | `√(m/(μ0 n e²))` |
| be-135 / be-136 density of states | `1.1249273597430353e+47`; `2.6072747621080297e+37` | `(1/2π²)(2m/ℏ²)^{3/2}√E`; `m/(π ℏ²)` |
| be-137 Thomas–Fermi `k²` | `328426576462060000000` | `e² (3n/2E_F)/ε0` |
| be-138 built-in voltage | `0.833370010652644` V | `(kT/e) ln(N_A N_D/n_i²)` |
| be-140 Onsager, A = 10²⁰ m⁻² | `10475.768655092661` T | `ℏ A/(2π e)` |
| be-141 Josephson inductance, 1 µA | `3.2910597847545334e-10` H | `Φ0/(2π I_c)` |
| be-142 lower critical field, λ = 100 nm, ξ = 1 nm | `0.07577945200527982` T | `Φ0 ln κ/(4π λ²)`, a B in tesla |
| be-143 Drude, ω = 0, and ωτ = 1 | `59669886.37490394`; `29834943.18745197` S/m | `n e² τ/m`, and half of it |
| be-145 Stoner, χ_P = 10⁻⁵, x = 0.5 | `0.00002` | `χ_P/(1−x)` |

All of these agree to the printed digits. be-100 prints `2.5` for ε(0)/ε(∞) = 10/4, which is `ω_LO²/ω_TO²`; the output carries no name (issue #460 from the plasma round). Sign and range checks that were correct: be-88, 89, 90, 91, 94, 95, 96, 97, 101, 134, 135, 142, 145 and 146 each reject their negative and out-of-range points with `DomainViolationError`.

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `evaluate be-143 … omega_rad_s=1THz` | `converted: 1THz → 1000000000000 rad/s`, value `59632615.99` (correct ω = 2π×10¹² gives `58233043.62`) | #465 |
| `evaluate be-143 … omega_rad_s=60rpm` | `converted: 60rpm → 1 rad/s` | #465 |
| `eval x x=1H`, `1nH`, `1Wb`, `1uWb` | exit 1, not a number with an optional unit | #466 |
| `eval x x=1kOhm` | exit 1 (`1kohm` works) | #466 |
| `eval x x=1uohm.cm` | exit 1, `unsupported node 'AccessorNode'` | #466 |
| `eval x x=1Oe`, `1emu`, `10kG` | exit 1 | #466 |
| `evaluateRelation('be-93', {…, T_K:100, theta_K:200})` | `-7.83e-4` (formula past its regime) | #467 |
| `evaluateRelation('be-100', {eps_static:2, eps_inf:4})` | `0.5` | #467 |
| `evaluateRelation('be-98', {zeta:-1})` | `-1.714` | #467 |
| `evaluateRelation('be-137', {n:-8.47e28, …})` | `-3.28e20` | #467 |
| `evaluateRelation('be-138', {T_K:-300, …})` | `-0.833` V | #467 |
| `evaluateRelation('be-92', {T_K:1e6, E_F_J:7 eV, …})` | `7.1e7`, 140 T_F, no regime flag | #467 |

Already filed and re-seen, not refiled: #449 (be-90 above θ_D), #450 (Laughlin ν parsed as unit), #451 (inputs that Fermi, Matthiessen and Gorter–Casimir evaluators ignore), #454 (missing input shown as a domain violation: `evaluate be-88 n_per_m3=…` with no `m_kg`), #460 (unlabeled output), #462 (`1m_e` leaks `__u0_e`; no `muB` unit). Not filed: `upt explain fermi-velocity` without `--source=canonical` says NOT COVERED and then lists the canonical entry, which is the intended route.

### Unit grammar that worked

`25fs`, `1THz` (read as 10¹² rad/s, see #465), `8.47e22/cm^3`, `1e16/cm^2`, `1/angstrom^2`, `500meV*angstrom^2` and `500meV*Å^2` for the magnon stiffness, `1.5meV`, `10nm`, `1uA`, `1uV`, `2.8e19/cm^3`, `1.12eV`, `7eV`, `300K`, `1pF`, `1aF`, `1mS`, `1uohm*cm`. `1G` is the gauss. `upt eval "e^2/h"` is `0.000038740458649318244`, `"h/(2*e)"` is `2.0678338484619295e-15`, `"h/e^2"` is `25812.807459304513`, and `"pi^2*k_B^2*T/(3*h)"` at 1 K is `9.46431151638664e-13`.

### Search and coverage

Exit 1, no entry: `kondo`, `rkky`, `weak localization`, `bloch oscillation`, `wigner`, `friedel`, `little parks`, `pippard`, `plasmon`, `mean free path`, `magnetoresistance`, `shubnikov`, `spin wave`, `polaron`, `schottky`, `clausius mossotti`, `coulomb blockade`, `charging energy`, `exciton`, `gruneisen`, `kapitza`, `domain wall`, `depairing`, `critical current`, `ferroelectric`, `flux quantum`, `landau diamagnetism`, `ioffe regel`. Hit: `hall` and `hall coefficient` (CE-hall-coefficient), `mobility`, `resistivity`, `work function`, `zeeman`, `curie temperature`, `fermi liquid`, `effective mass`, `bohr radius`, `thermal conductivity`. A hit is a different law when it is a description-word match.

### Derive runs for the proposals

Each is `upt derive … --formula`. A grouping failure is exit 3. A target that is determined up to a constant is exit 0.

| id | exit | what units gave |
|---|---|---|
| CM-1 | 3 | two groups; `ℏ k_F² τ/m` is a free dimensionless group |
| CM-2 | 0 | `ω ∝ e E a ℏ⁻¹`, prefactor 1 as typed |
| CM-3 | 3 | `ℓ/ξ₀` is free |
| CM-4 | 3 | two groups; a first attempt with a wrong polarizability dimension printed `⚠ homogeneous but ≠ target [1]` and the corrected one printed `✓` |
| CM-5 | 3 | `λ` and `ξ` are both lengths, so only `λ^a ξ^b` with `a + b = 3` is fixed |
| CM-6 | 3 | difference of two energies, two groups |
| CM-7 | 3 | three groups; `μ/m` and `ε_r` are pure numbers |
| CM-8 | 0 | `E_C ∝ e² C⁻¹`, prefactor 1/2 as typed |
| CM-9 | 3 | two groups; `τ_φ/τ` is free |
| CM-10 | 0 | `κ₀ ∝ k_B² T ℏ⁻¹`, prefactor π/6 as typed |
| CM-11 | 3 | `g` free; no unique monomial |

For CM-2, CM-8 and CM-10 units fix the monomial and leave the dimensionless constant to the physics; a recovered prefactor is the report of the formula that was typed, not a derivation. Values re-computed in Node from CODATA constants: CM-1 Cu `v_F` = 1.573×10⁶ m/s, `ℓ` = 39.3 nm at τ = 25 fs, `k_F ℓ` = 534; CM-2 `ω_B` = 7.60×10¹¹ rad/s at E = 10⁶ V/m, a = 0.5 nm; CM-5 6.3×10¹² A/m² for λ = 40 nm, ξ = 10 nm; CM-7 4.74 meV and 11.8 nm for GaAs (μ = 0.058 m_e, ε_r = 12.9); CM-8 80.1 meV at 1 aF against `k_B T` = 0.0862 meV at 1 K; CM-10 9.464×10⁻¹³ W/K² per kelvin.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | high | Hz, THz and rpm convert into an angular-frequency slot with factor 1 (`1THz` → 10¹² rad/s; `60rpm` → 1 rad/s) | [#465](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/465) |
| 2 | low | Henry and weber missing from the unit grammar; `kOhm` rejected; `uohm.cm` leaks `AccessorNode` | [#466](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/466) |
| 3 | medium | Condensed-matter evaluators accept unphysical inputs and out-of-regime points (be-92, 93, 98, 99, 100, 102, 137–140, 143) | [#467](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/467) |

Three new issues. Open and related from earlier rounds: #449, #450, #451, #454, #460, #462.

## 4. Proposed bridges

"Cross-domain" follows the catalog's own filing: it joins a thermal, quantum, atomic or statistical constant with a second condensed-matter relation. "Standard" stays inside one relation family.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| CM-1 | standard | Mean free path and Ioffe–Regel | `ℓ = v_F τ = ℏ k_F τ/m*`, `k_F ℓ ≳ 1` | Fermi gas, Drude transport | `ℏ k_F² τ/m` is a free group, so `ℓ = v_F τ` is a choice | partial: be-88 gives `k_F`, be-143 gives `τ` |
| CM-2 | standard | Bloch-oscillation frequency | `ω_B = e E a/ℏ` | band structure, electric field | monomial fixed, the 1 and the `a` (lattice constant) are physics | none |
| CM-3 | standard | Pippard coherence length | `1/ξ = 1/ξ₀ + 1/(α ℓ)` | superconductivity, disorder | two lengths; the harmonic sum and α are not forced | none (the BCS `ξ₀` is itself absent) |
| CM-4 | standard | Clausius–Mossotti | `(ε_r − 1)/(ε_r + 2) = N α/(3 ε₀)` | dielectrics, polarizability | a dimensionless equality; the 3 and the `ε+2` are the Lorentz field | none |
| CM-5 | standard | Depairing current density | `J_d = Φ₀/(3√3 π μ₀ λ² ξ)` | Ginzburg–Landau, flux quantum | `λ^a ξ^b` with `a + b = 3` all fit | partial: be-142 and be-96 use the same `Φ₀`, `λ` and `ξ` |
| CM-6 | standard | Schottky–Mott barrier | `φ_B = Φ_M − χ_s` (n-type) | metal–semiconductor contact | a difference of two energies | partial: be-138 is the p–n built-in voltage |
| CM-7 | cross-domain | Wannier exciton | `E_X = (μ/m_e) R_y/ε_r²`, `a_X = a_B ε_r m_e/μ` | atomic hydrogen, semiconductor optics | two pure numbers, `μ/m_e` and `ε_r`, set the scale | none |
| CM-8 | cross-domain | Coulomb-blockade charging energy | `E_C = e²/(2C)`, blockade when `k_B T ≪ E_C` | electrostatics, thermal energy, single-electron devices | monomial fixed, the ½ and the inequality are physics | partial: be-87 is `k_B T/C`, the thermal noise on the same `C` |
| CM-9 | cross-domain | Weak-localization correction | `Δσ = −(e²/(π h)) ln(τ_φ/τ)` per spin species, 2D | quantum interference, transport | `τ_φ/τ` is a free group; the logarithm and the coefficient are physics | none (be-102 is `2e²/h`) |
| CM-10 | cross-domain | Thermal-conductance quantum | `κ₀ = π² k_B² T/(3 h)` | quantum transport, thermodynamics | monomial fixed, π²/3 is the Bose integral | partial: be-61 is the Lorenz number linking `κ` and `σ` |
| CM-11 | cross-domain | Kondo temperature | `k_B T_K ≈ D √(ρ J) exp(−1/(ρ J))` | magnetic impurities, Fermi sea | `ρ J` is dimensionless and sits in an exponent; units cannot choose it | none |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**CM-1 Mean free path and Ioffe–Regel (standard).** For a degenerate Fermi gas, `ℓ = v_F τ` with `v_F = ℏ k_F/m*`. Copper at 300 K gives `v_F` = 1.57×10⁶ m/s and `ℓ` ≈ 39 nm at τ = 25 fs, so `k_F ℓ` ≈ 534. The Ioffe–Regel limit `k_F ℓ ≈ 1` marks where Boltzmann transport stops. Premises: isotropic band, a single relaxation time, `ℏ/τ ≪ E_F`.

**CM-2 Bloch oscillation (standard).** A carrier in a periodic band and a uniform field `E` has `ℏ dk/dt = e E`, so it traverses the Brillouin zone in a time `2π ℏ/(e E a)` and oscillates at `ω_B = e E a/ℏ`. Premises: single band, no scattering within a period (`ω_B τ ≫ 1`), no Zener tunneling. 7.6×10¹¹ rad/s for E = 10⁶ V/m, a = 0.5 nm.

**CM-3 Pippard coherence length (standard).** Impurity scattering shortens the superconducting coherence length: `1/ξ = 1/ξ₀ + 1/(α ℓ)`, with α of order 1 (its value depends on the reference and is not fixed here). Premises: local electrodynamics replaced by a nonlocal kernel, `ℓ` from be-143-style transport. The relation needs `ξ₀`, which is not yet a catalog entry.

**CM-4 Clausius–Mossotti (standard).** `(ε_r − 1)/(ε_r + 2) = N α/(3 ε₀)` links the dielectric constant to the number density `N` and the molecular polarizability `α` (`C m²/V`). Premises: cubic or isotropic site symmetry, Lorentz local field, non-polar or weakly polar. It is the inverse map of the Lorentz–Lorenz relation at optical frequency.

**CM-5 Depairing current density (standard).** The Ginzburg–Landau maximum supercurrent is `J_d = Φ₀/(3√3 π μ₀ λ² ξ)`. For λ = 40 nm and ξ = 10 nm it is 6.3×10¹² A/m² (6.3×10⁸ A/cm²). Premises: GL regime near T_c, uniform thin film narrower than λ, no vortices. Consistency check: `J_d = H_c/λ` times a numerical factor.

**CM-6 Schottky–Mott barrier (standard).** The ideal barrier height for an n-type contact is `φ_Bn = Φ_M − χ_s`, the metal work function minus the semiconductor electron affinity. Premises: no interface states, no image-force lowering; Fermi-level pinning is the usual failure of the rule and is the interesting negative result.

**CM-7 Wannier exciton (cross-domain).** The electron–hole pair is a hydrogen atom with reduced mass `μ` and a screened Coulomb potential: `E_X = (μ/m_e) R_y/ε_r²` and `a_X = a_B ε_r m_e/μ`. GaAs (μ = 0.058 m_e, ε_r = 12.9) gives 4.74 meV and 11.8 nm. Premises: parabolic isotropic bands, static dielectric constant, `a_X` much larger than the lattice constant.

**CM-8 Coulomb-blockade charging energy (cross-domain).** Adding one electron to an island of capacitance `C` costs `E_C = e²/(2C)`; transport is blocked when `k_B T ≪ E_C`. 80.1 meV at 1 aF, against `k_B T` = 0.0862 meV at 1 K. Premises: metallic island, constant capacitance, discrete level spacing small against `E_C`.

**CM-9 Weak localization (cross-domain).** Interference of time-reversed paths lowers the 2D conductance: `Δσ = −(e²/(π h)) ln(τ_φ/τ)` per spin species in the orthogonal class, with `e²/(π h)` = 1.23×10⁻⁵ S. Premises: diffusive, 2D, `τ_φ ≫ τ`, no spin–orbit scattering (with it the sign flips to antilocalization).

**CM-10 Thermal-conductance quantum (cross-domain).** One ballistic channel carries `κ = (π² k_B²/(3 h)) T` per mode, `κ₀/T` = 9.464×10⁻¹³ W/K². Premises: one-dimensional ballistic channel, adiabatic contacts, bosonic carriers. The Bose integral gives the π²/3.

**CM-11 Kondo temperature (cross-domain).** The scale below which a magnetic impurity is screened is `k_B T_K ≈ D √(ρ J) exp(−1/(ρ J))`, with `D` the bandwidth, `ρ` the density of states per spin and `J` the exchange. For D = 1 eV and ρJ = 0.2 it is about 35 K. The prefactor and the convention of `ρ J` (`2ρJ` in some texts) differ between references, so this is the candidate most likely to end as a convention note rather than a bridge.

**Count: 6 standard, 5 cross-domain, 11 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.
