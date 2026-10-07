# Relativity and astrophysics — bridge dogfood of published 8.0.0, 2026-10-06

Model-persona session against the published package `universal-physics-tensor@8.0.0`, not a clone of `src/` and not an independent human review. Persona: relativity and astrophysics (lensing, perihelion, redshift, FRW and Λ, radiation eras, accretion, compact-object scales, gravitational-wave constraints). Nothing below is a code change. A candidate is **unproven** until Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` exists. A units-only match is **partial**.

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

Catalog bridges that already cover it: be-42 Hawking temperature, be-51 lensing, be-52 perihelion, be-57 Unruh, be-63 Chandrasekhar mass, be-64 Eddington luminosity, be-65 Jeans mass, be-68 Tolman–Ehrenfest, be-72 gravitational redshift, be-20 (cosmological-constant density) and be-37 (Shapiro delay, speculative). The last two have no evaluator (`evaluateBridge: catalog id 20 has no evaluator`). The canonical registry has `CE-schwarzschild-radius`, `CE-kepler-third`, `CE-newton-gravitation`, `CE-friedmann`, `CE-friedmann-curvature`, `CE-hubble-distance`, `CE-hawking-temperature`, `CE-bekenstein-hawking`, `CE-perihelion-precession`, `CE-lorentz-factor`, `CE-mass-energy`, `CE-einstein-field-eq`.

`upt search` exits 1, no entry, for: `gravitational wave`, `chirp mass`, `quadrupole`, `inspiral`, `isco`, `photon sphere`, `tidal`, `roche`, `hill sphere`, `luminosity distance`, `angular diameter`, `age of the universe`, `recombination`, `cmb`, `radiation era`, `matter era`, `tov`, `neutron star`, `bondi`, `lense-thirring`, `frame dragging`, `geodetic`, `de sitter`, `virial`, `free-fall`, `rotation curve`, `tully-fisher`, `escape velocity`, `vis-viva`, `synchrotron`, `pulsar`, `magnetar`, `gamma-ray burst`, `hubble tension`.

### Hand-checked values (all pass)

| call | printed | hand value |
|---|---|---|
| `be-42 {M_kg: 1.989e30}` | `6.168429716410344e-8` K | `ℏ c³/(8π G M k_B)` |
| `be-51` at the solar limb (`b = 6.957e8`) | `0.000008492529984347865` rad | `4GM/(c² b)`, 1.75″ |
| `be-52` Mercury (`a = 5.7909e10`, `e = 0.2056`) | `5.020092087396441e-7` rad per orbit | 0.1035″ per orbit |
| `be-57 {a: 9.81}` | `3.977968268250448e-20` K | `ℏ a/(2π c k_B)` |
| `be-64 {M: 1 M☉}` | `1.2574382573536063e+31` W | `4π G M m_p c/σ_T` |
| `be-72 {g1:-0.999, g2:-1}` | `1.0005003753127737` | `√(g₂/g₁)` |
| `CE-schwarzschild-radius`, 1 M☉ | `2954.126555055405` m | `2GM/c²` |
| `CE-kepler-third`, 1 AU | `31553514.07021311` s | `2π√(a³/GM)` |
| `CE-hubble-distance {H: 2.2685e-18}` | `1.3215448886929689e+26` m | `c/H` |
| `CE-lorentz-factor` at 0.6c | `1.2499999999999998` | 1.25 |
| `CE-bekenstein-hawking`, 1 M☉ horizon | `1.4490106337369612e+54` J/K | `k_B c³ A/(4Gℏ)` |
| `upt metric schwarzschild M=1Msun r=1e8` | Kretschmann `1.0468968416359738e-40` | closed form `48 G² M²/(c⁴ r⁶)` = `1.0472236443940216e-40` |

be-42, be-51 (`b ≥ 10 r_s`) and be-52 (`0 ≤ e < 1`) reject their out-of-domain points with `DomainViolationError`. `upt metric schwarzschild … r=1000` exits 2 with `r must be outside the horizon (r_s = 2954.13)`. `upt metric flrw k=1 t=2` prints `H2=0.1111` against `friedmannRhs=-35667122904717292` and says the scale factor is not a solution of the Friedmann equation at the stated ρ, k, Λ.

### Failures (each filed)

| command | result | issue |
|---|---|---|
| `upt eval x x=1mas` | `1e-18` (milliarcsecond read as metre × attosecond) | #477 |
| `upt eval x x=1Rsun`, `1Rearth`, `1Mearth`, `1Mjup`, `1day`, `1hr`, `1uas` | exit 1 | #477 |
| `upt eval x x=70km/s/Mpc`, `70(km/s)/Mpc` | exit 1; `70km/(s*Mpc)` works | #477 |
| `upt eval x x=1Msun/Gyr` | exit 1, ambiguous | #477 (and #469) |
| `upt metric schwarzschild M=1Msun r=0 theta=pi/2` | exit 0, `r=29541.27` (the default) | #478 |
| `upt metric schwarzschild M=-1Msun r=1e8 theta=pi/2` | exit 0, `horizon_m=-2954.13` | #478 |
| `upt metric schwarzschild … theta=pi` | Kretschmann `8.891164427359777e+31` | #478 |
| `evaluateRelation('be-52', {M, major_axis_m, e, T_yr})` | `DomainViolationError (a > 0)`; the CLI accepts it | #479 |
| `evaluate be-52 …` with any `T_yr` | the same `5.02e-7`; no per-century value is printed | #479 |
| `CE-schwarzschild-radius {mass:-1.989e30}` | `-2954.13` | #480 |
| `CE-friedmann {rho:-9.47e-27}` | `-5.295e-36` | #480 |
| `CE-friedmann-curvature {k:1, a:1e26, rho:9.47e-27}` | `-3.69e-36` (H² < 0) | #480 |
| `CE-lorentz-factor {v:1.1c}` | `{ kind: 'unset' }` | #480 |

Re-seen and not refiled: #451 (inputs ignored), #455 (API alias handling), #460 (unlabeled output), #462 and #475 (more units), #469 (milli prefixes), #470 and #474 (canonical domains).

### Derive runs for the proposals

Each is `upt derive … --formula`. A grouping failure is exit 3. A target determined up to a constant is exit 0.

| id | exit | what units gave |
|---|---|---|
| RA-1 | 0 | `r ∝ G M c⁻²`, prefactor 6 as typed |
| RA-2 | 3 | three groups; the mass ratio is free |
| RA-3 | 3 | three groups |
| RA-4 | 3 | two groups; `G M/(c² r)` is free |
| RA-5 | 0 | `t₀ ∝ H₀⁻¹`, prefactor 2/3 as typed |
| RA-6 | 3 | two groups; the mass ratio is free |
| RA-7 | 3 | two groups; `R E/(ℏ c)` is free |
| RA-8 | 0 | `u ∝ k_B⁴ T⁴ ℏ⁻³ c⁻³`, prefactor `π²/15` = 0.658 as typed |
| RA-9 | 3 | two groups; `z` is free |
| RA-10 | 3 | three groups; `γ` and the 3/4 are free |
| RA-11 | 3 | three groups; `P Ṗ` is free |

For RA-1, RA-5 and RA-8 units fix the monomial and leave the dimensionless constant to the physics; a recovered prefactor is the report of the formula that was typed, not a derivation. Values re-computed in Node from CODATA constants: RA-1 8.86 km for 1 M☉ (photon sphere 4.43 km); RA-2 `6.57×10²³ W` for PSR B1913+16 (1.44 and 1.39 M☉, `a` = 1.95×10⁹ m, circular approximation); RA-3 1.64 Gyr for the same circular binary; RA-4 6605 mas/yr for Gravity Probe B (7027 km from Earth's centre); RA-5 9.31 Gyr at H₀ = 70 km/s/Mpc, against a Hubble time of 13.97 Gyr; RA-6 1.496×10⁹ m for Earth; RA-7 2.47×10²⁰ J/K for 1 kg in a 1 m radius; RA-8 `4.1717×10⁻¹⁴ J/m³` at 2.725 K from both forms; RA-9 ratio 4 at z = 1; RA-10 2.45×10⁸ yr for γ = 10³ in 1 nT; RA-11 `1.3×10⁹ T` (1.3×10¹³ G) for I = 10³⁸ kg m², R = 10 km, P = 33.4 ms, Ṗ = 4.2×10⁻¹³.

## 3. Bugs

| # | severity | summary | issue |
|---|---|---|---|
| 1 | high | `upt eval` reads `1mas` as 1e-18 (metre × attosecond); Rsun, Rearth, Mearth, Mjup, `day`, `hr` absent; `km/s/Mpc` refused | [#477](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/477) |
| 2 | medium | `upt metric`: `r=0` silently becomes 10 r_s, a negative mass is accepted, `theta=pi` prints Kretschmann 8.9e31 | [#478](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/478) |
| 3 | medium | be-52: the API ignores `major_axis_m`; `T_yr` has no effect; no per-century value | [#479](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/479) |
| 4 | medium | Canonical gravity and cosmology entries accept unphysical inputs (negative Schwarzschild radius, negative H²); `v ≥ c` returns `unset` | [#480](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/480) |

Four new issues. Related and already open: #451, #455, #460, #462, #469, #470, #474, #475.

## 4. Proposed bridges

"Cross-domain" follows the catalog's own filing: it joins a gravitational or cosmological relation to an electromagnetic, thermal or quantum one. "Standard" stays inside gravity, orbits and cosmology.

| id | type | name | formula | domains linked | why units alone are not enough | existing catalog coverage |
|---|---|---|---|---|---|---|
| RA-1 | standard | Schwarzschild ISCO and photon sphere | `r_ISCO = 6 G M/c²`, `r_ph = 3 G M/c²` | strong-field orbits | monomial fixed; 6 and 3 are the geodesic algebra | partial: `CE-schwarzschild-radius` is `2GM/c²` |
| RA-2 | standard | Gravitational-wave power of a circular binary | `P = (32/5) G⁴ m₁² m₂² (m₁ + m₂)/(c⁵ a⁵)` | general relativity, Kepler orbits | three free groups; the mass-ratio dependence | none |
| RA-3 | standard | Peters inspiral time | `t = (5/256) c⁵ a⁴/(G³ m₁ m₂ (m₁ + m₂))` | GW emission, orbital decay | three free groups | none |
| RA-4 | standard | Geodetic (de Sitter) precession | `Ω = (3/2) (G M)^{3/2}/(c² r^{5/2})` | frame transport, orbits | `G M/(c² r)` is a free group | partial: be-52 is the orbit's own precession |
| RA-5 | standard | Matter-dominated age and Hubble time | `t₀ = 2/(3 H₀)` | FRW cosmology | `1/H₀` is fixed; 2/3 is the dust solution | partial: `CE-hubble-distance` is `c/H₀`, `CE-friedmann` is `H²` |
| RA-6 | standard | Hill radius | `r_H = a (m/(3M))^{1/3}` | three-body dynamics | the mass ratio is a free pure number | none |
| RA-7 | cross-domain | Bekenstein bound | `S ≤ 2π k_B R E/(ℏ c)` | information and thermodynamics, relativity | `R E/(ℏ c)` is a free group | partial: `CE-bekenstein-hawking` is the horizon entropy |
| RA-8 | cross-domain | Photon-gas energy density and CMB scaling | `u = (π²/15) (k_B T)⁴/(ℏ c)³ = (4σ/c) T⁴`, `T(z) = T₀(1 + z)` | thermodynamics, radiation, cosmology | the form is fixed; `π²/15` is the Bose integral | partial: be-165 is `σ`, `CE-stefan-boltzmann` is the flux |
| RA-9 | cross-domain | Etherington reciprocity and Tolman dimming | `d_L = (1 + z)² d_A`, `I_obs = I_em/(1 + z)⁴` | cosmology, photometry | `z` is a pure number | none |
| RA-10 | cross-domain | Synchrotron cooling time | `t = 3 m_e c/(4 σ_T γ U_B)`, `U_B = B²/(2μ₀)` | electrodynamics, relativistic particles | `γ` and the 3/4 are not forced | partial: `CE-thomson-cross-section`, be-74 (magnetic pressure) |
| RA-11 | cross-domain | Pulsar dipole spin-down field | `B = √(3 μ₀ c³ I P Ṗ/(8π² R⁶))` | electromagnetism, rotation, compact objects | `P Ṗ` and `R` are free groups | none |

## 5. Write-ups

All are **unproven**. No measurement was opened for any of them.

**RA-1 ISCO and photon sphere (standard).** For a Schwarzschild black hole the innermost stable circular orbit is at `r = 6 G M/c²` (8.86 km for 1 M☉) and the circular photon orbit is at `3 G M/c²` (4.43 km). Premises: non-rotating, vacuum, test particle. They follow from the effective potential's inflection point and extremum. Both are checkable against the `upt metric --geodesic` path, which already integrates circular Schwarzschild orbits.

**RA-2 Gravitational-wave power (standard).** The quadrupole formula gives, for two point masses on a circular orbit of radius `a`, `P = (32/5) G⁴ m₁² m₂² (m₁ + m₂)/(c⁵ a⁵)`. For PSR B1913+16 in the circular approximation it is 6.6×10²³ W; the real orbit is eccentric and the factor `f(e)` raises it by roughly an order of magnitude. Premises: weak field, slow motion, circular orbit.

**RA-3 Peters inspiral time (standard).** Integrating `da/dt = −(64/5) G³ m₁ m₂ (m₁ + m₂)/(c⁵ a³)` gives `t = (5/256) c⁵ a⁴/(G³ m₁ m₂ (m₁ + m₂))`, 1.64 Gyr for the same circular binary. Premises: circular, adiabatic, point masses, no mass transfer. It pairs with RA-2.

**RA-4 Geodetic precession (standard).** A gyroscope in a circular orbit of radius `r` around mass `M` precesses at `Ω = (3/2)(G M)^{3/2}/(c² r^{5/2})`; Gravity Probe B (7027 km) gives 6605 mas/yr. Premises: weak field, circular orbit, the de Sitter term only (the Lense–Thirring term `G J/(2 c² r³)` is separate). Join: frame transport along a geodesic and the Kepler frequency.

**RA-5 Matter-dominated age (standard).** For a flat dust universe `a ∝ t^{2/3}`, so `H = 2/(3t)` and `t₀ = 2/(3 H₀)`: 9.31 Gyr at 70 km/s/Mpc, younger than the oldest stars, which is the historical reason Λ was reintroduced. Premises: flat, matter only, no radiation, no Λ. A negative-result style relation: it is known to be wrong for our universe and useful as a limit.

**RA-6 Hill radius (standard).** A body of mass `m` orbiting a star of mass `M` at distance `a` keeps satellites inside `r_H = a (m/(3M))^{1/3}`; Earth gives 1.50×10⁹ m. Premises: circular orbit, `m ≪ M`, restricted three-body problem. The factor 3 is the tidal term of the rotating frame.

**RA-7 Bekenstein bound (cross-domain).** A system of energy `E` fitting in a sphere of radius `R` has entropy `S ≤ 2π k_B R E/(ℏ c)`; 1 kg in a 1 m sphere (E = m c²) gives 2.47×10²⁰ J/K. Premises: weakly gravitating, finite size, quantum-mechanical entropy. It is satisfied with equality by a black hole only up to a factor that conventions of "R" change, so the coefficient needs review.

**RA-8 Photon-gas energy density (cross-domain).** Blackbody radiation has `u = a T⁴` with `a = (π²/15) k_B⁴/(ℏ c)³ = 4σ/c`; at 2.725 K both forms give 4.17×10⁻¹⁴ J/m³. In an expanding universe `T(z) = T₀ (1 + z)`, so `u ∝ (1 + z)⁴` and radiation dominates before matter-radiation equality. Premises: thermal equilibrium, no spectral distortion. Join: statistical mechanics, electromagnetism and the FRW expansion.

**RA-9 Etherington reciprocity (cross-domain).** In any metric theory with photon number conservation, the luminosity distance and the angular-diameter distance satisfy `d_L = (1 + z)² d_A`; the surface brightness of a source dims as `(1 + z)⁻⁴` (Tolman). At z = 1 the ratio is 4. Premises: photon number conserved, null geodesics, no absorption. Join: photometry and geometry; a violation is a test of exotic physics.

**RA-10 Synchrotron cooling time (cross-domain).** An electron of Lorentz factor `γ` in a field `B` loses energy at `P = (4/3) σ_T c γ² U_B`, so `t = γ m_e c²/P = 3 m_e c/(4 σ_T γ U_B)` with `U_B = B²/(2 μ₀)`: 2.45×10⁸ yr for γ = 10³ in 1 nT. Premises: ultra-relativistic, isotropic pitch angles, no inverse-Compton loss. Join: electrodynamics, special relativity and the Thomson cross section.

**RA-11 Pulsar dipole field (cross-domain).** Equating the rotational energy loss `I Ω Ω̇` to magnetic dipole radiation `μ₀ m² Ω⁴/(6π c³)` with `B = μ₀ m/(2π R³)` gives `B = √(3 μ₀ c³ I P Ṗ/(8π² R⁶))`. For a Crab-like pulsar it is 1.3×10⁹ T at the pole. The common `3.2×10¹⁹ √(P Ṗ)` gauss formula differs by a factor of a few through the moment of inertia, the radius and the pole-versus-equator convention, which is why this relation needs review before promotion. Premises: orthogonal rotator, vacuum dipole, rigid sphere. Join: electromagnetism, rotation and compact-object structure.

**Count: 6 standard, 5 cross-domain, 11 proposals.**

## 6. Scope statement

No src changes. Awaiting owner review before any fix/PhysJS agents. No release, tag, publish, merge, per-equation module, catalog edit, or specification write-up was made. Bare `e` is the elementary charge and Euler's number is `exp(x)` throughout.
