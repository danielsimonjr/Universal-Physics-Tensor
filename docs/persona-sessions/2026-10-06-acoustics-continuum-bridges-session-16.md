# Acoustics and continuum mechanics — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: acoustics and continuum mechanics (wave speeds, impedance, attenuation, elasticity moduli, fluid–structure and thermo/EM coupling). Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

## 1. Package version proved

Scratch directory outside the repo: `npm init -y && npm i universal-physics-tensor@8.0.0`.

| check | printed |
|---|---|
| `npm ls universal-physics-tensor` | `universal-physics-tensor@8.0.0` |
| `require('./node_modules/universal-physics-tensor/package.json').version` | `8.0.0` |
| CLI | `node node_modules/universal-physics-tensor/bin/upt.mjs …` |
| library | `import * as U from 'universal-physics-tensor'` |

`universal-physics-tensor@6.0.0` was installed in a second scratch directory for one regression comparison (#469). No physics claim rests on it.

## 2. Commands run and notable outputs

### Coverage of the persona in the catalog

`upt search` exits 1, no entry, for: `impedance`, `acoustic impedance`, `attenuation`, `absorption`, `stokes` (only `CE-stokes-drag`), `kirchhoff`, `navier`, `bulk modulus` (only be-131 by description), `shear modulus`, `poisson ratio`, `lame`, `cantilever`, `bending`, `plate`, `shell`, `membrane`, `vibration`, `helmholtz`, `organ pipe`, `standing wave`, `doppler`, `mach`, `rayleigh`, `love wave`, `p wave`, `seismic`, `wave equation`, `group velocity`, `thermoacoustic`, `sonoluminescence`, `cavitation`, `capillary`, `womersley`, `added mass`, `pitot`, `reverberation`, `sabine`, `transmission loss`, `mass law`, `decibel`, `sound level`, `strain`, `thermal expansion`, `thermoelastic`, `creep`, `loss factor`, `maxwell model`, `kelvin voigt`, `viscoelastic`, `magnetostriction`. Hits: `sound speed` returns be-69 and be-103 (plasma), `wave speed` returns be-67 (Alfvén), `reynolds` returns be-86 and be-155, `bernoulli` returns `CE-bernoulli` and be-78 by description, `string` returns `CE-string-wave-speed` and `ab-string-wave`, `surface tension` returns `CE-laplace-pressure`.

The mechanics entries in the canonical registry are `CE-string-wave-speed`, `CE-sound-speed`, `CE-wave-speed`, `CE-pendulum-period`, `CE-hooke-law`, `CE-simple-harmonic-frequency`, `CE-hydrostatic-pressure`, `CE-pressure-definition`, `CE-stokes-drag`, `CE-volume-flow-rate`, `CE-shear-stress`, `CE-laplace-pressure`, `CE-dynamic-pressure`, `CE-kinetic-pressure`, `CE-bernoulli`. The waves atlas family has `ab-string-wave`, `ab-wave-dalembert`, `ab-sound-speed`, `ab-stiff-string`, `ab-klein-gordon-wave`, `ab-kg-schrodinger`, `ab-kg-oscillator`.

### Hand-checked values (all pass)

| command | printed | hand value |
|---|---|---|
| `explain sound-speed pressure=101325 density=1.204 gamma=1.4 --source=canonical` | `343.248841865287` | `√(γ P/ρ)` |
| `explain speed frequency=440 wavelength=0.78 --source=canonical` | `343.2` | `f λ` |
| `explain period length=1 gravity=9.81 --source=canonical` | `2.00606668071065` | `2π√(L/g)` |
| `explain pressure density=1000 g=9.81 height=10 --source=canonical` | `98100` | `ρ g h` |
| `explain laplace-pressure surface-tension=0.072 droplet-radius=1e-3` | `144` | `2γ/r` |
| `explain dynamic-pressure density=1.2 flow-velocity=30` | `540` | `½ ρ v²` |
| `explain kinetic-pressure number-density=2.5e25 molecular-mass=4.65e-26 mean-square-speed=2.5e5` | `96875` | `n m ⟨v²⟩/3` |
| `explain thermal-diffusivity thermal-conductivity=0.6 density=1000 specific-heat-capacity=4180` | `1.43540669856459e-7` | `k/(ρ c_p)` |
| `explain force viscosity=1e-3 radius=1e-3 speed=0.01` | `1.88495559215388e-7` | `6π η r v` |
| `evaluateRelation('CE-string-wave-speed', {tension:100, 'linear-density':0.01})` | `100` | `√(F/μ)` |
| `regime waves --at p0=101325 p1=1013.25` / `p1=1013.26` | valid / VIOLATED | `p₀/p₁ ≥ 100` at its edge |
| `regime waves --at F=100 EI=1e-2 k=10` | valid | `β = EI k²/F = 0.01`, the edge |

`upt atlas ab-sound-speed` records the isothermal (Newton) counterexample, 290.1 m/s for air at 20 °C against 343 m/s, and derives `contradicted` from it, which is the stated design. `upt atlas ab-stiff-string` derives `formally-proved, contradicted` with `delta = 0.00498756211208895` = `√(1+β) − 1` at β = 0.01. `upt path model-string model-dalembert` composes two bridges and says the cell `restriction then derivation` is silent by design. `upt path model-euler-linear model-sound` says the sound-speed bridge is multi-premise and a path composes one premise at a time.

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `eval x x=72mN/m` | exit 1, `'mN/m' is ambiguous: mN/m or m·N/m`; 6.0.0 printed `0.07200000000000001` | #469 |
| `eval x x=720mW/cm^2`, `1mPa*s`, `1mJ/m^2`, `1mV/m`, `1mg/L` | exit 1, ambiguous | #469 |
| `evaluate be-79 k_N_per_m=1mN/m …` | `converted: 1mN/m → 0.001 N/m` (the evaluator slot accepts it) | #469 |
| `explain laplace-pressure … droplet-radius=-1e-3 --source=canonical` | `Recovered value: -144` | #470 |
| `explain kinetic-pressure … mean-square-speed=-2.5e5` | `-96875` | #470 |
| `explain sound-speed … density=-1.204 gamma=1.4` | exit 0, no recovered value and no reason | #470 |
| `evaluateRelation('CE-string-wave-speed', {tension:-100, …})` | `{ kind: 'unset' }` | #470 |
| `evaluateRelation('CE-bernoulli', {all five inputs})` | `{ kind: 'unset' }`; the total is 111810 Pa | #470 |
| `eval x x=1dB`, `1Np`, `1rayl`, `1St`, `1cSt`, `1poise`, `1Mach`, `1ppm` | exit 1 | #471 |
| `eval x x=1mmH2O`, `1inHg`, `1kgf/cm^2`, `1dyn/cm`, `1ft/s` | exit 1 | #471 |

Re-seen and not refiled: #454 (`evaluateRelation('CE-wave-speed', {freq:440, …})` says `missing a finite input` and names no key), #458 (imperial units), #460 (unlabeled evaluator output). `upt explain string-wave-speed` is NOT COVERED because the CE target is `speed`, which is the intended name.

### Derive runs for the proposals

Each is `upt derive … --formula`. All eleven exit 3 and every formula dimension matches its target (`✓ homogeneous, matches target`).

| id | free groups | what units left open |
|---|---|---|
| AC-1 | 2 | which combination of `K` and `G` |
| AC-2 | 2 | the function `9KG/(3K+G)` |
| AC-3 | 2 | the square of `(Z₂−Z₁)/(Z₂+Z₁)` |
| AC-4 | 2 | the 4/3 and the 1/2 |
| AC-5 | 3 | `A/(V L)` against any other pair |
| AC-6 | 2 | `c/v` against any power |
| AC-7 | 2 | `γ`, a pure number, in a square root |
| AC-8 | 4 | the Debye form `ωτ/(1+ω²τ²)` |
| AC-9 | 2 | `d²/(ε s)` against any pure-number group |
| AC-10 | 2 | `n` is dimensionless, so its exponent is free |
| AC-11 | 2 | the product `β c²/C_p`, and `μ_a F` |

Values re-computed in Node: AC-1 steel (K = 160 GPa, G = 80 GPa, ρ = 7850) `c_p` = 5828 m/s, `c_s` = 3192 m/s, bar speed `√(E/ρ)` = 5119 m/s; AC-2 `E` = 205.7 GPa and ν = 0.2857; AC-3 water into air `R` = 0.99888; AC-5 a 1 L bottle with a 10 mm radius, 70 mm effective neck gives 115.6 Hz; AC-6 Mach angle 30° at `v = 2c`; AC-7 a 3 mm air bubble in water gives 1095 Hz; AC-10 silica (n = 1.45, v = 5960 m/s, λ = 1.55 µm) gives 11.15 GHz; AC-11 the Grüneisen parameter of water is 0.113.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | medium | `upt eval` rejects milli-prefixed compound units as ambiguous (`72mN/m`, `720mW/cm^2`, `1mPa*s`); 6.0.0 and `upt evaluate` accept them | [#469](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/469) |
| 2 | medium | Canonical mechanics entries return negative magnitudes silently; out-of-domain inputs print nothing or `unset`; `CE-bernoulli` is `unset` on complete inputs | [#470](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/470) |
| 3 | low | dB, Np, rayl, Stokes, poise, Mach, ppm and several pressure and force units are absent | [#471](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/471) |

Three new issues. Related and already open: #454, #458, #460, #461, #463.

## 4. Proposed bridges

"Cross-domain" follows the catalog's own filing: it joins a thermal, optical, electromagnetic or statistical relation to a continuum-mechanics one. "Standard" stays inside acoustics or elasticity.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| AC-1 | standard | Elastic-wave speeds | `c_p = √((K + 4G/3)/ρ)`, `c_s = √(G/ρ)` | elasticity, wave propagation | `K` and `G` are both pressures; their combination is not forced | none (`CE-string-wave-speed` and `CE-sound-speed` are fluid and string) |
| AC-2 | standard | Young's modulus from bulk and shear | `E = 9KG/(3K + G)`, `ν = (3K − 2G)/(2(3K + G))` | isotropic elasticity | any degree-one function of `K`, `G` is a pressure | none |
| AC-3 | standard | Normal-incidence intensity reflection | `R = ((Z₂ − Z₁)/(Z₂ + Z₁))²`, `Z = ρ c` | acoustic impedance | a pure number of two equal-dimension impedances | none |
| AC-4 | standard | Stokes–Kirchhoff classical absorption | `α = ω²/(2ρc³) [4μ/3 + μ_B + κ(1/c_v − 1/c_p)]` | viscous and thermal loss in a wave | the 4/3, the 1/2 and the bracket are not forced | none |
| AC-5 | standard | Helmholtz resonator | `f = (c/2π) √(A/(V L_eff))` | cavity acoustics | `A/(V L)` is one of three free groups | none |
| AC-6 | standard | Mach angle | `sin μ = c/v` | supersonic flow | dimensionless; any function of `c/v` passes | none |
| AC-7 | cross-domain | Minnaert bubble resonance | `f = (1/(2π R)) √(3γ p/ρ)` | bubble dynamics, gas thermodynamics (polytropic index γ) | `γ` is a pure number inside a root | none (`CE-sound-speed` also carries `γ`) |
| AC-8 | cross-domain | Zener thermoelastic damping | `Q⁻¹ = (E α² T/C_v) · ωτ/(1 + (ωτ)²)` | elasticity, heat conduction, vibration loss | four free groups; the Debye form is physics | none (be-71 and be-161 are other thermal laws) |
| AC-9 | cross-domain | Piezoelectric coupling factor | `k² = d²/(ε^T s^E)` | elasticity, electrostatics | any pure-number group of `d`, `ε`, `s` fits | none |
| AC-10 | cross-domain | Brillouin frequency shift | `ν_B = 2 n v/λ₀` (backscatter) | light scattering, acoustic phonons | `n` is dimensionless, so its exponent is free | none |
| AC-11 | cross-domain | Photoacoustic initial pressure | `p₀ = (β c²/C_p) μ_a F` | optical absorption, thermal expansion, sound | the Grüneisen factor and the product are not forced | none |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**AC-1 Elastic-wave speeds (standard).** In an isotropic solid the longitudinal (P) and shear (S) waves have `c_p = √((K + 4G/3)/ρ)` and `c_s = √(G/ρ)`. For steel the numbers are 5.83 and 3.19 km/s. The thin-bar speed `√(E/ρ)` (5.12 km/s) is a third speed and is not either of these. Premises: homogeneous, isotropic, linear, small strain, an infinite medium for P and S.

**AC-2 Moduli relation (standard).** For an isotropic solid the four elastic constants reduce to two: `E = 9KG/(3K + G)` and `ν = (3K − 2G)/(2(3K + G))`. For `K = 160` GPa and `G = 80` GPa, `E` = 205.7 GPa and ν = 0.286. Premises: isotropy and linear elasticity; a negative `K` or `G` is outside the thermodynamic stability range. The relation is the algebra that AC-1 and the bar speed share.

**AC-3 Intensity reflection (standard).** At a planar boundary between media of characteristic impedance `Z = ρ c`, the reflected fraction of intensity at normal incidence is `R = ((Z₂ − Z₁)/(Z₂ + Z₁))²` and the transmitted fraction is `1 − R`. Water into air gives `R` = 0.99888, `T` = 0.0011. Premises: plane wave, planar infinite interface, lossless, normal incidence. It is the acoustic twin of the Fresnel normal-incidence formula.

**AC-4 Stokes–Kirchhoff absorption (standard).** The classical absorption coefficient of a viscous, heat-conducting fluid is `α = (ω²/(2ρc³)) [4μ/3 + μ_B + κ(1/c_v − 1/c_p)]`. With the shear term alone, air at 100 kHz gives 0.098 Np/m = 0.85 dB/m; the bulk-viscosity and thermal terms add to it. Premises: `ω τ ≪ 1` for every relaxation process, linear acoustics, no molecular relaxation. It is the named piece of `ab-sound-speed`'s "does NOT preserve: viscous and thermal attenuation".

**AC-5 Helmholtz resonator (standard).** A cavity of volume `V` with a neck of area `A` and effective length `L_eff` resonates at `f = (c/2π) √(A/(V L_eff))`. A 1 L bottle with a 10 mm neck radius and 70 mm effective length gives 115.6 Hz. Premises: the cavity is small against the wavelength (lumped), the neck air moves as a rigid slug, the end correction is folded into `L_eff`.

**AC-6 Mach angle (standard).** A source moving at `v > c` makes a cone of half-angle `μ` with `sin μ = c/v`. At `v = 2c` it is 30°. Premises: steady, uniform medium, `c` the local sound speed, a point source. The Mach number is `1/sin μ`.

**AC-7 Minnaert resonance (cross-domain).** A gas bubble of radius `R` in a liquid of density `ρ` and ambient pressure `p` pulsates at `f = (1/(2π R)) √(3γ p/ρ)`; a 3 mm air bubble in water gives 1095 Hz. Join: the polytropic index `γ` is thermodynamics, the restoring force is the gas compressibility, the inertia is the liquid. Premises: spherical, small amplitude, `R` ≪ wavelength, no surface tension or viscosity.

**AC-8 Zener thermoelastic damping (cross-domain).** A flexing beam has a temperature gradient across it; heat flow dissipates energy: `Q⁻¹ = Δ · ωτ/(1 + (ωτ)²)` with the relaxation strength `Δ = E α² T/C_v`. For a silicon-like solid (E = 170 GPa, α = 2.6×10⁻⁶ K⁻¹, T = 300 K, C_v = 1.66 MJ m⁻³ K⁻¹) `Δ` = 2.1×10⁻⁴. Premises: linear, one thermal relaxation time `τ`, adiabatic at high `ω`. Join: elasticity, thermal expansion, heat conduction.

**AC-9 Piezoelectric coupling (cross-domain).** The electromechanical coupling factor is `k² = d²/(ε^T s^E)`: charge per unit stress `d`, permittivity at constant stress `ε^T`, compliance at constant field `s^E`. It is dimensionless and bounded by 1. Premises: one coupling mode (for example thickness or 33), linear, quasi-static. Join: elasticity and electrostatics.

**AC-10 Brillouin shift (cross-domain).** Light backscattered from a thermal acoustic wave is shifted by `ν_B = 2 n v/λ₀`. For silica (n = 1.45, v = 5960 m/s) at 1.55 µm it is 11.15 GHz. Premises: backscatter geometry, phase matching `q = 2k`, an isotropic transparent medium. Join: optics and elastic waves.

**AC-11 Photoacoustic initial pressure (cross-domain).** A short laser pulse that is absorbed and thermalized before the medium expands produces `p₀ = Γ μ_a F` with `Γ = β c²/C_p`, the Grüneisen parameter. Water has `Γ` = 0.113; with `μ_a` = 100 m⁻¹ and a 200 J/m² fluence the pressure is about 2.3 kPa. Premises: stress and thermal confinement (pulse shorter than both relaxation times), linear absorption, no scattering. Join: optics, thermodynamics and acoustics.

**Count: 6 standard, 5 cross-domain, 11 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.
