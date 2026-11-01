# Optics and photonics — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: optics and photonics (blackbody, Fresnel, diffraction, resonators, lasers, nonlinear and electro-optic coefficients, photonic band gaps). Planck, Stefan–Boltzmann and Wien are already catalog bridges (be-164, be-165, be-166), so they are checked and not proposed. Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

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

Exit 1, no entry, for: `fresnel`, `brewster`, `refractive index`, `abbe`, `numerical aperture`, `diffraction`, `rayleigh criterion`, `airy`, `etendue`, `radiance`, `lambert`, `laser`, `gain`, `cavity`, `finesse`, `free spectral range`, `fabry`, `linewidth`, `schawlow`, `gaussian beam`, `rayleigh range`, `beam waist`, `bragg`, `grating`, `photonic`, `band gap`, `plasmon`, `sellmeier`, `cauchy`, `group delay`, `chirp`, `kerr`, `second harmonic`, `phase matching`, `pockels`, `electro-optic`, `acousto-optic`, `faraday`, `verdet`, `birefringence`, `waveplate`, `quantum efficiency`, `responsivity`, `detectivity`, `photodiode`, `solar cell`, `emissivity`, `beer-lambert`, `absorption coefficient`, `mie`, `cherenkov`, `synchrotron`, `optical depth`, `optical tweezers`. Hits: `snell` (CE-snell-law), `malus` (CE-malus-law), `photon` and `photoelectric` (CE-planck-einstein, CE-photoelectric), `wien`, `stefan` (be-166, be-165, CE-wien, CE-stefan-boltzmann), `compton`, `scattering` and `thomson` (CE-compton-*, CE-thomson-cross-section), `radiation pressure` (be-64, be-66), `shot noise` (be-85), `skin depth` (case-skin-depth).

### Hand-checked values (all pass)

| command | printed | hand value |
|---|---|---|
| `evaluateRelation('be-164', {nu_Hz:5e14, T_K:5800})` | `1.2535353026306122e-15` | `8π h ν³/(c³ (e^{hν/kT} − 1))` |
| `be-164` at 1 GHz, 300 K | `3.863203178889813e-27` | Rayleigh–Jeans `8π k T ν²/c³` = 3.8635e-27 (the 8e-5 gap is the `−hν/2kT` correction) |
| `be-165` | `5.6703744191844294e-8` | `π² k_B⁴/(60 ℏ³ c²)` |
| `be-166 {wien_x:4.965114231744276}` | `0.0028977719551851727` | `h c/(k_B x)` |
| `be-66 {I:1361, R:1, θ:0}` | `9.0796146712937e-6` Pa | `2I/c` |
| `CE-planck-einstein {h, ν:5e14}` | `3.313035075e-19` J | `h ν` |
| `CE-stefan-boltzmann {σ, T:5800}` | `64168769.43111582` | `σ T⁴` |
| `CE-wien {b, T:5800}` | `4.996158543103448e-7` m | `b/T` |
| `CE-snell-law {n1:1.5, θ1:.5, θ2:.3}` | `2.4334657722083386` | `n₁ sin θ₁/sin θ₂` |
| `CE-malus-law {I0:1, θ:π/4}` | `0.5000000000000001` | `I₀ cos² θ` |
| `CE-rydberg-formula` 2 → 3 (Hα) | `1524129.3844666667` m⁻¹ | `R (1/4 − 1/9)`, 656.1 nm |
| `CE-compton-shift {θ:π/2}` | `2.4263102386830918e-12` m | `h/(m_e c)` |
| `CE-thomson-cross-section` | `6.652458732150248e-29` m² | `(8π/3) r_e²` |
| `upt eval "h*c/(e*lambda)" lambda=550nm` | `2.254258153330914` eV | `h c/(e λ)` |
| `upt eval "sqrt(mu0/eps0)"` | `376.73031366686985` Ω | vacuum impedance |

`evaluate be-164` unit grammar worked for `500THz`, `5800K`, `0.5eV` on a temperature slot (read as `k_B T`, 5802.26 K), `5800degC` (6073.15 K) and `5800degF`. A wavelength, an energy and a wavenumber in the frequency slot are refused with a dimension message (`'nm' is [length], but this input is [frequency] (Hz)`).

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `explain photon-energy planck-constant=… photon-frequency=5e14 --source=canonical` | `cannot be determined … Knowing one of {nu} would unblock it`; with `nu=5e14` it recovers `3.313035075e-19` | #473 |
| `explain photon-energy h=… nu=…` | exit 1, `'h' did not resolve to a quantity` (also `b`, `sigma_sb`, `wien-constant`) | #473 |
| `explain photoelectron-max-energy … photon-frequency=5e14 work-function=6.889e-19` | `Recovered value: -3.575964925e-19` | #474 |
| `evaluateRelation('CE-rydberg-formula', {… lower:3, upper:2})` | `-1524129.38`; fractional `n = 1.5` accepted | #474 |
| `evaluateRelation('CE-stefan-boltzmann', {T:-5800})` | `+64168769.43` | #474 |
| `evaluateRelation('CE-wien', {T:-5800})` | `-4.996e-7` | #474 |
| `evaluateRelation('CE-malus-law', {I0:-1, …})` | `-0.5` | #474 |
| `evaluateRelation('CE-snell-law', {n1:1.5, θ1:30, θ2:19.47})` | `-1.699`, degrees read as radians | #474 |
| `eval x x=1sr`, `1cd`, `1lx`, `1arcsec`, `1arcmin`, `1%` | exit 1 | #475 |
| `eval x x=1W/(m^2*sr)` | exit 1, `unknown name 'm'` (the unknown token is `sr`) | #475 |
| `eval x x=1GW/cm^2`, `1TW/cm^2`, `1GV/m` | exit 1, ambiguous | #475 |
| `evaluate be-164 nu_Hz=5e14rad/s T_K=5800` | `converted: 5e14rad/s → 500000000000000 Hz`, no 2π | #465 (open) and #475 |

Re-seen and not refiled: #447 (be-166 accepts a non-root `x = 4.5`, printing `0.003197281950008741`), #460 (unlabeled output), #469 (milli-prefixed compound units), #471 (dB, ppm). `upt eval alpha` and `upt eval Z0` are free variables, not constants (`missing values for: Z0`), while `sigma_sb`, `N_A`, `h`, `k_B` are defined; `upt eval "sin(30deg)"` reports `missing values for: deg` because a unit suffix is not read inside a formula. Neither is filed.

### Derive runs for the proposals

Each is `upt derive … --formula`. All thirteen runs exit 3 and every formula dimension matches its target (`✓ homogeneous, matches target`).

| id | free groups | what units left open |
|---|---|---|
| OP-1 | 3 | the square of `(n₁ − n₂)/(n₁ + n₂)` |
| OP-2 | 2 | the 1.22 |
| OP-3 | 2 | the 1/2 and the definition of NA |
| OP-4 | 2 | `π w₀²/λ` against any other group |
| OP-5 FSR / finesse | 2 / 2 | the 2 and `π√R/(1−R)` |
| OP-6 | 3 | `n² A Ω` against any `n^p` |
| OP-7 | 3 | the exponent of the cavity linewidth |
| OP-8 | 4 | the logarithm and the 1/2 |
| OP-9 | 2 | `η` is free |
| OP-10 | 3 | `arcsin` of the contrast, and 4/π |
| OP-11 | 4 | the cube of `n` and the aspect ratio `d/L` |
| OP-12 | 2 | the `8 ln 2` under the root |

Values re-computed in Node: OP-1 glass (n = 1.5) `R` = 0.04, water 0.0201; OP-2 the Airy limit for 550 nm and 100 mm is 1.38 arcsec; OP-3 196 nm at NA = 1.4; OP-4 `z_R` = 1.24 m and divergence 0.403 mrad for a 0.5 mm waist at 633 nm; OP-5 `FSR` = 999 MHz, finesse 313, linewidth 3.2 MHz for 15 cm and `R` = 0.99; OP-6 1×10⁻⁷ m² sr for 1 mm² and 0.1 sr; OP-7 1.0×10⁻³ Hz for 1 MHz cavity width and 1 mW; OP-8 157.7 m⁻¹ for `α` = 100 m⁻¹, 1 mm, `R` = 0.9 and 0.99; OP-9 1.0001 A/W at 1550 nm and η = 0.8; OP-10 relative gap 0.75 (1/3.5) and 0.098 (3.5/3.0); OP-11 1.28 V for 5 µm, 2 cm, n = 2.14, r₃₃ = 30.8 pm/V; OP-12 1.70 GHz for sodium at 589 nm and 500 K.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | medium | `explain photon-energy` cannot use `photon-frequency` (the registry has `nu` and `photon-frequency` as separate quantities); `h`, `b`, `sigma_sb` do not resolve | [#473](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/473) |
| 2 | medium | Canonical optics and quantum entries accept unphysical inputs: negative photoelectron energy below threshold, Rydberg `n₁ > n₂`, `T < 0`, `I₀ < 0`, negative index | [#474](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/474) |
| 3 | low | Radiometric units absent (`sr`, `cd`, `lx`, `arcsec`, `%`); `1W/(m^2*sr)` blames `m`; `GW/cm^2`, `TW/cm^2`, `GV/m` ambiguous | [#475](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/475) |

Three new issues. Related and already open: #447, #460, #465, #469, #470, #471.

## 4. Proposed bridges

"Cross-domain" follows the catalog's own filing: it joins an optical relation to a thermal, quantum, atomic or materials relation. "Standard" stays inside geometric, wave or resonator optics.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| OP-1 | standard | Fresnel normal-incidence reflectance | `R = ((n₁ − n₂)/(n₁ + n₂))²` | interfaces, refractive index | dimensionless; any function of `n₂/n₁` passes | partial: CE-snell-law is the angle law |
| OP-2 | standard | Rayleigh diffraction limit | `θ = 1.22 λ/D` | aperture diffraction | the 1.22 is the first zero of `J₁` divided by π | none |
| OP-3 | standard | Abbe resolution | `d = λ/(2 NA)`, `NA = n sin θ` | imaging, refraction | monomial fixed, the 1/2 is a convention | none |
| OP-4 | standard | Gaussian-beam Rayleigh range | `z_R = π n w₀²/λ`, `θ = λ/(π n w₀)` | paraxial wave optics | `w₀²/λ` fixed by units, `π` is not | none |
| OP-5 | standard | Fabry–Perot free spectral range and finesse | `Δν_FSR = c/(2 n L)`, `F = π√R/(1 − R)` | cavity resonance | the 2 and the `π√R/(1−R)` form | none |
| OP-6 | standard | Étendue and radiance invariance | `G = n² A Ω`, `L/n² = const` | radiometry, refraction | `n` is a pure number, so its power is free | none |
| OP-7 | cross-domain | Schawlow–Townes linewidth | `Δν = π h ν (Δν_c)²/P` | quantum noise, laser cavity | `h ν Δν_c²/P` is one of several fits; the exponent of `Δν_c` is physics | none |
| OP-8 | cross-domain | Laser threshold gain | `g_th = α_i + (1/(2L)) ln(1/(R₁ R₂))` | gain medium, cavity mirrors | a sum of two inverse lengths with a logarithm | none |
| OP-9 | cross-domain | Photodiode responsivity | `ℛ = η e λ/(h c)` | photon energy, charge, quantum efficiency | `η` is a pure number; `e λ/(h c)` is fixed up to it | partial: be-85 is the shot noise on the same photocurrent |
| OP-10 | cross-domain | Photonic-crystal band-gap width (quarter-wave stack) | `Δω/ω₀ = (4/π) arcsin(\|n₂ − n₁\|/(n₂ + n₁))` | electromagnetism, periodic materials | arcsine of a pure number | none |
| OP-11 | cross-domain | Electro-optic half-wave voltage | `V_π = λ d/(n³ r L)` | crystal tensor, electrostatics, optics | four free groups; the cube of `n` and `d/L` | none |
| OP-12 | cross-domain | Doppler line width | `Δν_D = ν₀ √(8 k_B T ln 2/(m c²))` | thermal motion, spectroscopy | `k_B T/(m c²)` is a pure number | partial: be-164 and be-165 are the continuum |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**OP-1 Fresnel reflectance (standard).** At normal incidence from index `n₁` to `n₂` the intensity reflectance is `R = ((n₁ − n₂)/(n₁ + n₂))²`: 4.0% for air to glass (n = 1.5), 2.0% for air to water. Premises: lossless dielectrics, planar interface, normal incidence.  The same algebra gives the acoustic impedance reflectance.

**OP-2 Rayleigh diffraction limit (standard).** A circular aperture of diameter `D` resolves two points at the angle `θ = 1.22 λ/D`; 550 nm through 100 mm gives 1.38 arcsec. Premises: uniform illumination, circular aperture, far field, the Rayleigh peak-on-first-zero criterion. The 1.22 is a criterion, not a measurement limit.

**OP-3 Abbe resolution (standard).** A microscope resolves a period `d = λ/(2 NA)` with `NA = n sin θ`; 196 nm at NA = 1.4 and 550 nm. Premises: coherent axial illumination, scalar theory, the lens collects the first diffraction order.

**OP-4 Gaussian-beam range and divergence (standard).** A fundamental Gaussian beam of waist `w₀` has `z_R = π n w₀²/λ` and far-field half-angle `θ = λ/(π n w₀)`. A 0.5 mm waist at 633 nm gives 1.24 m and 0.403 mrad. Premises: paraxial, TEM₀₀, `M² = 1`. Both are the same relation in different forms.

**OP-5 Fabry–Perot resonator (standard).** A two-mirror cavity of length `L` and index `n` has `Δν_FSR = c/(2 n L)`; its finesse is `F = π√R/(1 − R)` for equal mirror reflectances `R`, and the line width is `Δν_FSR/F`. 15 cm and `R` = 0.99 give 999 MHz, 313 and 3.2 MHz. Premises: lossless mirrors, plane waves at normal incidence, no absorption in the medium.

**OP-6 Étendue and radiance (standard).** The étendue of a beam through area `A` into solid angle `Ω` in a medium of index `n` is `G = n² A Ω`; it is conserved through lossless passive optics, and so is the basic radiance `L/n²`. 1 mm² and 0.1 sr give 10⁻⁷ m² sr. Premises: geometric optics, no scattering, no absorption. The steradian is not in the unit grammar (#475).

**OP-7 Schawlow–Townes linewidth (cross-domain).** The fundamental laser line width from spontaneous emission is `Δν = π h ν (Δν_c)²/P`, with `Δν_c` the passive-cavity width and `P` the output power. A 1 MHz cavity at 633 nm and 1 mW gives 1 mHz. Premises: four-level ideal inversion, a single mode, above threshold. Join: quantum noise (`h ν`) and a cavity relation. The coefficient differs by a factor of 2 between treatments, which is why it is a candidate for review.

**OP-8 Laser threshold gain (cross-domain).** At threshold the round-trip gain equals the loss: `g_th = α_i + (1/(2L)) ln(1/(R₁ R₂))`. For `α` = 100 m⁻¹, 1 mm and `R` = 0.9 and 0.99 it is 157.7 m⁻¹. Premises: Fabry–Perot cavity, uniform gain, no scattering. Join: material gain and absorption with the mirror reflectances.

**OP-9 Photodiode responsivity (cross-domain).** The photocurrent per optical power is `ℛ = η e λ/(h c)` in A/W; η = 0.8 at 1550 nm gives 1.0001 A/W. Premises: every absorbed photon yields at most one carrier pair, no gain, no saturation. Join: photon energy `h c/λ` (be-164's quantum), elementary charge `e`, and a materials efficiency `η`. It sets the photocurrent behind be-85's shot noise.

**OP-10 Photonic band-gap width (cross-domain).** A quarter-wave stack of indices `n₁` and `n₂` has a relative gap `Δω/ω₀ = (4/π) arcsin(|n₂ − n₁|/(n₂ + n₁))`: 0.75 for air and 3.5, 0.098 for 3.5 and 3.0. Premises: infinite periodic stack, normal incidence, lossless, quarter-wave layers. Join: Maxwell's equations in a periodic dielectric and the material indices.

**OP-11 Electro-optic half-wave voltage (cross-domain).** For a transverse Pockels modulator of length `L` and electrode gap `d`, the half-wave voltage is `V_π = λ d/(n³ r L)`. Lithium niobate (`r₃₃` = 30.8 pm/V, n = 2.14) with 5 µm and 2 cm gives 1.28 V. Premises: one crystal axis, one polarization, the field uniform across the gap, `r` the relevant tensor component.

**OP-12 Doppler line width (cross-domain).** Thermal motion broadens a line to a full width `Δν_D = ν₀ √(8 k_B T ln 2/(m c²))`. Sodium at 589 nm and 500 K gives 1.70 GHz. Premises: Maxwellian gas, non-relativistic, low pressure, no collisional broadening. Join: statistical mechanics (`k_B T`), mass, and the optical frequency.

**Count: 6 standard, 6 cross-domain, 12 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.

## Addendum, 1 Nov 2026

Same tarball, SHA-256 `6350e6afe49cc874684c07eb8389b5a86bfa12a0f5e1360852cb7fcebb6889d2`. Node v22.23.4. A fresh `npm i universal-physics-tensor@8.0.0` at 8:11 AM CT resolves `@danielsimonjr/mathts-functions@0.68.5` (it nests `@danielsimonjr/mathts-core@0.18.1`; the top-level core is `0.16.0`) and `upt version` exits 1 with `rationalNullspace: entry [0, 0] must be a finite number or a Fraction`. That load failure is [#525](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/525). The commands in this addendum used the tarball with functions pinned to `0.68.0`, which prints `8.0.0`. `upt eval e` is `1.602176634e-19`. `upt eval --debug exp(1)` is `2.718281828459045`.

The checks in §2 still hold on that pin: id 164 at `5e14` Hz and `5800` K is `1.2535353026306122e-15`, id 165 is `5.6703744191844294e-8`, and id 166 at `wien_x=4.965114231744276` is `0.0028977719551851727`. `upt explain radiative-flux temperature=5800 --source=canonical` is `64168769.4311158`. Snell at `45deg` and `28.1255deg` with incident index `1` is `1.50000027927637`. Malus at intensity `2` and `45deg` is `1`.

Three defects below are not the closed rows in §3.

[#543](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/543). **The CLI and `evaluateRelation` do not share temperature names.** `upt evaluate be-164 nu_Hz=5e14 temperature=5800`, and the same command with `T=5800` and with `temp=5800`, each exit 0 and print `1.2535353026306122e-15` with the input shown as `T_K`. `evaluateRelation('be-164', { nu_Hz: 5e14, temperature: 5800 })` and the same call with `T: 5800` throw `ν > 0 and T > 0`. The library call with `T_K: 5800` returns the CLI number. `upt evaluate be-16 temperature=300` exits 1 and says the input is `temperature_K`. `evaluateRelation('be-16', { temperature: 300 })` returns `2.870978885078724e-21`, and `T_K: 300` throws the domain sentence. `upt evaluate be-58 temperature=300 R_ohm=1000` prints `1.6567788e-17`. `evaluateRelation('be-58', { temperature: 300, R_ohm: 1000 })` throws. The `T_K` library call returns `1.6567788e-17`.

[#544](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/544). **`frequency` and `nu` can disagree and a number is still printed.** `upt explain photon-energy nu=5e14 frequency=6e14 --source=canonical` exits 0, says the inputs do not fix a unique monomial, and prints `3.313035075e-19`, which is `h·5e14`. `h·6e14` is `3.97564209e-19`. `upt explain speed frequency=5e14 nu=6e14 wavelength=500nm --source=canonical` exits 0 and prints `250000000`, with proportionality `frequency·wavelength`. The magnetic-field pair on this pin still exits 1 and prints no value. [#473](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/473) is the closed report that `photon-frequency` does not reach the Planck–Einstein edge. This row is the disagreeing pair that still returns a number.

[#546](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/546). **`f-number` and `v number` hit other records.** `upt search f-number` exits 0 on `flavor-number`, symbol `N_f`, words in the name and the symbol. `upt search "v number"` exits 0 on catalog id 156, the Biot number, words in the name and the description. `upt search fresnel` and `upt search abbe` still exit 1.

Already filed, and the copies opened from this pass name the same defects. `upt explain photon-energy nu=500nm --source=canonical` exits 0 and prints `3.313035075e-40`. `nu=1s` and `nu=1Hz` both print `6.62607015e-34`. `upt explain speed frequency=1Hz wavelength=1kg --source=canonical` prints `1`. `upt evaluate be-164` rejects `500nm` and `1s` on `nu_Hz`. That scale-without-dimension path is [#537](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/537); [#542](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/542) is the same report. The steradian, the arcsecond, and `1W/(m^2*sr)` blaming `m` are [#475](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/475). `upt eval t t=1mas` printing `1e-18` is [#477](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/477). `parseUnit('mas')` on this pin is scale `1e-18` and dimension length·time. [#545](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/545) is those two. [#541](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/541) is the load failure already filed as #525.

No src changes. Awaiting owner review.
