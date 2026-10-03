# Applied physicist — bridge dogfood of published 2.0.0, 2026-10-03

Model-persona session against the published package `universal-physics-tensor@2.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-200`: `npm init -y && npm i universal-physics-tensor@2.0.0`. Node v22.14.0, npm 10.9.7. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@2.0.0 version gitHead --prefer-online` printed `2.0.0` and `283fdb93d84f251270dfe3fcfe2cf4d7bb1741e4`. That gitHead is master at the start of the session. Annotated tag `v2.0.0` is object `b17412ac19fadd33aebb27e935a784e1d3dae719` and its target is that commit. The CLI is `./node_modules/.bin/upt`. `upt version` prints `2.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

Nothing below is a proved bridge. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A composition of two evaluators is **provisional**. A candidate that is not in PhysJS is **unproven**.

The session read `docs/research/Orphan-Connector-Analysis.md`, `docs/planning/Bridge-Gap-Inference.md`, the be-* / ab-* surfaces the published CLI actually prints, and the canonical audit. It does not re-propose `ab-stokes-einstein`, and it does not promote a same-dimension connector the orphan note already rejected. `docs/planning/Bridge-Gap-Inference.md` already records that units do not fix `C` (`PhysJS.Dimensional.monomial_form`), that be-57 has no key, that be-61's transport step is the gap after `π²/3`, and that be-64's Thomson force and gravity are premises. The candidates below are the relations those notes do not already encode.

## (a) Session log

Commands were run in `/tmp/upt-dogfood-200` unless a library snippet is marked as such. "Printed" is the output of `universal-physics-tensor@2.0.0`.

### Conventions and the constants the evaluator knows

| command | exit | printed |
|---|---|---|
| `upt eval e` | 0 | `1.602176634e-19` |
| `upt eval E` | 2 | `E` is energy; pass `E=<number>` |
| `upt eval E E=1eV` | 0 | `1.602176634e-19` |
| `upt eval E=1eV` | 2 | `Security: assignment expressions are disabled` |
| `upt eval euler` | 2 | `euler` is not Euler's number; write `exp(x)` |
| `upt eval "1-e^2"` | 2 | charge is not dimensionless; names `one_minus_e_sq` |
| `upt eval "mu0*eps0*c^2"` | 0 | `1` |
| `upt eval mu0` and `upt eval mu_0` | 0 | both `0.0000012566370621200546` |
| `upt eval m_e` | 0 | `9.1093837015e-31` |
| `upt eval m_p` | 2 | free variable `m_p` |
| `upt eval N_A` | 2 | free variable `N_A` |
| `upt eval F` | 2 | free variable `F` (not the faraday) |
| `upt eval sigma` | 2 | free variable `sigma` |
| `upt eval sigma_sb` | 0 | `5.670374419e-8` |
| `upt eval ln2`, `upt eval "ln(2)"` | 0 | both `0.6931471805599453` |
| `upt eval "log(10)"` | 0 | `2.302585092994046` (natural log) |
| `upt eval "log10(10)"` | 0 | `1` |
| `upt eval "k_B*T" T=300K` | 0 | `4.141947e-21` |
| `upt eval "k_B*T" T=25degC` | 0 | `4.1164049935e-21` |
| `upt eval B B=12e-9T` | 0 | note `bare T is the tesla; Ts is a terasecond`, value `1.2e-8` |
| `upt eval B B=12nT` | 1 | `'12nT' is not a number with an optional unit` |
| `upt eval B B=12uT` | 1 | `'12uT' is not a number with an optional unit` |
| `upt eval n n=14cm^-3` | 0 | `13999999.999999998` |
| `upt eval "12e-9/sqrt(mu0*14e6*m_p)"` | 2 | free variables `m_p, mu0` (a missing name is listed beside a constant that does evaluate alone) |

Help for `upt eval` already says `log` is the natural logarithm and names `log10`. That part is not a surprise. The surprise is the binding `T=22eV`, recorded under the bugs: it exits 0.

`M_PROTON_SI` is not a root export. The Eddington module in the tarball sets `const M_PROTON_SI = 1.67262192369e-27`. Substituting that number, `upt eval "12e-9/sqrt(mu0*14e6*1.67262192369e-27)"` prints `69954.13706220593`.

### What the registries already contain

`BRIDGE_EQUATIONS.length` is 55. Status counts: 19 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–65 with 54 printed before 53. `CANONICAL_EQUATIONS.length` is 109. Atlas, from the search footer: 24 models, 20 bridges. `upt regime plasma` exits 1: known families are `oscillators`, `diffusion`, `waves`.

One-word searches, each exit 1, no match: `piezo`, `magnetostriction`, `vegard`, `nernst`, `seebeck`, `faraday`, `alfven`, `optomechanics`, `strain`, `pyroelectric`. `upt search debye length` (two words) exits 1. `upt search radiation pressure` (two words) exits 0 and returns be-64 only. `upt search "radiation pressure"` (one quoted argument) exits 1. `upt search magnetic-field` and `upt search magnetic-flux-density` exit 1.

`upt explain alfven-speed`, `debye-length`, `seebeck-coefficient`, and `radiation-pressure` are NOT COVERED. `debye-length` suggests `planck-length`. `seebeck-coefficient` suggests `syk-coefficient`, `area-law-coefficient`, `swampland-coefficient`, `fret-efficiency`.

`ab-stokes-einstein` is already the fluid–thermal bridge: `D = k_B T/(6πηa)`, regime `Re ≤ 0.1` and `m/(γt) ≤ 0.01`, derived evidence `proposed`, no formalRef. The witness line cites `D = 4.29e-13 m²/s` for `a = 0.5 µm`, `T = 293.15 K`, `η = 1.0016e-3 Pa·s`, and says `data/atlas/witness-results.json` is a repository artifact, not shipped. `upt path model-langevin model-fick` is `ab-langevin-diffusion`, bound vacuous, and says the multi-premise Stokes bridge is not that path. This session does not re-propose it.

`upt atlas be-16` prints `PhysJS.Landauer.erasure_eq` at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`, kind `bridge`, and then: "This command prints the stored catalog formalRef. It does not derive formally-proved from it." The covers line is the equal-level two-state deficit `⟨E⟩ − F = k_B T log 2` for `T > 0`, not `E ≥ T ΔS` for an arbitrary protocol, and not the Bérut confrontation. The `BRIDGE_EQUATIONS` row for id 16 has `status: "speculative"` and `formalRef: null`. `upt atlas be-57` exits 1: catalog equation, no formalRef.

### Radiation pressure, the missing premise of be-64

```
upt derive pressure:pressure intensity:power/area c:velocity --formula "intensity/c"
```

Exit 0. Unique monomial `pressure ∝ intensity·c^-1`. Formula dimension `[L^-1 M T^-2]`. Recovered prefactor `1.0000e+0`. No canonical partner, so the prefactor is not checked.

```
upt map --equation-only --equation "radiation_pressure = poynting-flux/c"
```

Exit 0. RHS dimension `[L^-1 M T^-2]`. Joins the anchored cluster via `poynting-flux`. Target unknown.

```
upt map --equation-only --equation "pressure = intensity/c"
```

Exit 0. Prints `UNKNOWN: RHS is [L^-1 T] but the target is [L^-1 M T^-2]` because `intensity` was taken as dimensionless. The line says that is not a failed check.

Library `buckinghamPi` on `{pressure, intensity [M T^-3], c}`: verdict `single-invariant`, one group `pressure · intensity^-1 · c`. `dimensionallyDetermines` is true, monomial `{intensity: 1, c: -1}`, `upToDimensionlessConstant: true`.

Illustrative evaluation, not a measurement: `I = 1e6 W/m²` gives `I/c = 0.0033356409519815205 Pa` and `2I/c = 0.006671281903963041 Pa`.

`upt evaluate be-64 M_kg=1.989e30` and `M_kg=1Msun` both print `L_Edd_W = 1.2574382573536063e31`, `L_Edd_solar = 32848.43932480685`. The `1Msun` note says `Msun` is `M_SUN_SI = 1.989e30`, not `GM☉/G`, and that `G×Msun` is about `3.0e-4` high versus the IAU `GM☉`.

### Alfvén speed, Debye length, plasma β, cyclotron

```
upt derive velocity:velocity B:magnetic_field mu0:permeability rho:density --formula "B/sqrt(mu0*rho)"
```

Exit 2: `unknown base dimension 'permeability'`.

```
upt derive velocity:velocity B:magnetic_field mu_0:mu_0 rho:mass/length^3 --formula "B/sqrt(mu_0*rho)"
```

Exit 2: `unrecognized dimension term 'mu_0'`.

```
upt derive velocity:velocity B:magnetic_field mu0:L.M.T^-2.I^-2 rho:density --formula "B/sqrt(mu0*rho)"
```

Exit 0. Unique monomial `velocity ∝ B·mu0^-0.5·rho^-0.5`. Recovered prefactor `1.0000e+0`. No canonical partner.

```
upt map --equation-only --equation "alfven_speed = magnetic_flux_density/sqrt(mu_0*density)"
```

Exit 0. RHS dimension `[velocity]`. Joins via `density`, `magnetic-flux-density`, `mu_0`.

```
upt derive length:length eps0:L^-3.M^-1.T^4.I^2 kT:energy n:L^-3 e:charge --formula "sqrt(eps0*kT/(n*e^2))"
```

Exit 0. **Not** a unique monomial. Two groups: `length^3 · n` and `length · eps0 · kT · e^-2`. The formula is still dimension `[length]`. "No single prefactor." Exit stays 0.

Library `buckinghamPi` agrees: Debye set verdict `multiple-invariants`; `dimensionallyDetermines` is false, "1 dimensionless combination(s) among them". Plasma β on `{β, p, B, μ0}` is two groups, `beta` and `p · B^-2 · mu0`. Magnetostriction on `{λ_s, B, M_s}` has the single group `lambda_s`: the strain is not fixed by `B` and `M_s`. `dimensionallyDetermines(λ_s | B, M_s)` is false.

Library numbers for the rounded solar-wind inputs below, proton mass `1.67262192369e-27` kg, package `e`, `k_B`, `mu0`, `c`:

| quantity | value |
|---|---|
| `v_A = B/sqrt(μ0 n m_p)` at `B = 12e-9 T`, `n = 14e6 m^-3` | `69954.13706220746 m/s` (`69.954 km/s`) |
| `22 eV` as a temperature | `255299.39867410177 K` |
| `sqrt(kT/m)`, `sqrt(2kT/m)`, `sqrt(3kT/m)` | `45.906`, `64.921`, `79.511 km/s` |
| `ω = eB/m_p` | `1.1494599787132362 rad/s` |
| gyroperiod `2π/ω`, cyclic frequency | `5.466206239049142 s`, `0.18294223749851635 Hz` |
| `ω_pi`, `c/ω_pi` | `4926.076524747029 rad/s`, `60.858 km` |
| `λ_D = sqrt(ε0 kT/(n e^2))` | `9.31893946591933 m` |
| `(sqrt(kT/m)/ω_pi) / λ_D` | `1.0000000000000002` |
| `p` from `300 eV/cm^3`, `B²/(2μ0)`, ratio | `4.8065299019999995e-11 Pa`, `5.7295779481891894e-11 Pa`, `0.8388977243112792` |

```
upt explain cyclotron-frequency charge=1.602176634e-19 magnetic-field=12e-9 mass=1.67262192369e-27 --source=canonical
```

Exit 0. Recovered `1.1495e+0`. Form `cyclotron-frequency ∝ charge·magnetic-field·mass^-1`.

The same call with `magnetic-flux-density=12e-9` exits 0 and says there is no derivation path. It asks for one of `current`, `distance`, `magnetic-field`, `mu_0`. The dimension line still says the flux-density name would fix the frequency up to a constant.

### Tolman–Ehrenfest, Nernst scale, piezo, chemo-mechanics, Mott, Abraham

Library Buckingham, all unproven:

| set | verdict | what dimensions do |
|---|---|---|
| `{dlnT, g, c, dr}` | two groups: `dlnT`, and `g · c^-2 · dr` | do not entail `T √(-g_00) = const` |
| `{V, k_B, T, e}` | one group `V · k_B^-1 · T^-1 · e` | `V ∝ k_B T / e`, constant unfixed |
| `{D, stress, strain, E}` | two groups: `strain`, and `D · stress^-1 · E` | `D E / stress` is dimensionless; the Maxwell equality is not forced |
| `{μ, Ω, stress}` | one group `μ · Ω^-1 · stress^-1` | `μ ∝ Ω · stress`, the `1/3` and the sign unfixed |
| `{S, e, k_B, kT, E_F}` | two groups: `S · e · k_B^-1`, and `kT · E_F^-1` | not a unique monomial |
| `{g, S, c}` momentum density | one group `g · S^-1 · c^2` | `g ∝ S / c^2`, the `n` factor unfixed |

`upt eval "k_B*298.15/e*ln(10)"` and the same formula with `log(10)` both print `0.05915934968478234`. `k_B/e` from the package constants is `8.617333262145179e-5 V/K`.

Solar compactness at the IAU nominal radius `R = 6.957e8 m` (used as that defined length; the resolution text was not reopened): `G_SI * M_SUN_SI / (R c²) = 2.1231324960869663e-6`, `GM_SUN_SI / (R c²) = 2.122502570145357e-6`. No laboratory temperature was opened.

Tensor, MathTS engine (`getActiveEngine()` is a `Promise` and resolves to `MathTSEngine`). Two `makeIndex('dimension','j')` calls throw `IndexNameMismatchError` and name both ids. Reusing one id contracts. A rank-3 `d_ijk` with only the `111` component `2.31e-12`, contracted with `σ_11 = 1e6`, returned axis `i` and data `[0.00000231, 0, 0]`. That `2.31e-12` is a definitional stand-in, not a fit. See candidate 7 for the citation and what was not opened.

### Chains, evaluators, regime, connectors, audit

`composeEdges(be42Edge, be16Edge).evaluate({ mass: 1.989e30 })` is `5.903143823302079e-31` J, confidence `highly-speculative`, id `be-42>>be-16`. `propagateUncertainty` with mass sigma `1e24` returns the same value, sigma `2.9678953361243236e-37`, partial `mass` `-2.9678953361243234e-61`. A hand-built Unruh edge whose target is named `temperature`, composed with `be16Edge`, at `a = 9.81` returns `3.806887634553404e-43` J, confidence `speculative`. `upt evaluate be-57 a_m_s2=9.81` prints `T_K = 3.977968268250448e-20`, and `k_B` times that temperature times `ln 2` is the composed energy. `upt chain` exits 2 and points at `docs/planning/Bridge-Discovery-Pipeline-Design.md`. That file is not in the published tarball.

```
upt explain landauer-erasure-energy temperature=300 --source=catalog
```

Exit 0. `be-16`, `E_min = k_B T ln2`, recovered `2.8710e-21`. `BridgeEquations.landauerEnergy({ temperature_K: 300 })` is `2.870978885078724e-21`.

```
upt explain erasure-energy temperature=300 --source=canonical
```

Exit 0. `CE-landauer`, recovered `4.1419e-21`, which is `k_B * 300` and is missing `ln 2`. `--source=both` on `erasure-energy` prints only that canonical number. `--source=both` on `landauer-erasure-energy` prints only the catalog number. Catalog explain of `erasure-energy` exits 1 and suggests `landauer-erasure-energy`. The two names are not one node, so the factor `1/ln 2` never appears as a disagreement.

```
upt evaluate be-16 T_K=300
```

Exit 1: `evaluateBridge: be-16 has no evaluator (only closed-form + spacetime bridges do — see `upt evaluate` with no args)`. It does not name `BridgeEquations.landauerEnergy` or `upt explain`.

```
upt evaluate be-42 M_kg=1.989e30
```

Exit 1, and this one does name `BridgeEquations.hawkingTemperature({ M_kg })` and `upt explain hawking-temperature mass=1.989e30`. That explain command at `mass=1Msun` prints `6.1684e-8` from `be-42` and `be-42-via-rs`, relative spread 0, "agreement by construction".

```
upt evaluate be-61 sigma_S_per_m=5.8e7 T_K=300 --sigma T_K=1 --sigma sigma_S_per_m=1e6
```

`kappa_W_per_mK = 425.08278457881806 ± 7.46` (relative 1.76%). `L0_W_ohm_per_K2 = 2.443004509073667e-8 ± 0`. The Lorenz number does not depend on the inputs, so `± 0` is the propagation, and it reads like a measured zero.

```
upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=0.1
```

`S_V_V2_per_Hz = 1.6567788e-17 ± 5.52e-21`.

```
upt evaluate be-56 d_m=100nm
```

`pressure_Pa = -13.001257732443651`, with the note that displayed `hbar` is the truncated quotient.

`upt regime oscillators --at theta0=0.2`: `ab-pendulum-linear` is valid (`theta0 ≤ 0.5`); the other oscillator models and `ab-spring-lc` are VACUOUS.

`upt connectors --source=both` exits 0. It says 19 isolated bridges have a same-kind connector and 11 are truly unconnected: `CE-bohr-magneton`, `CE-snell-law`, `be-17`, `be-21`, `be-25`, `be-30`, `be-39`, `be-46`, `be-49`, `be-50`, `be-53`. The same screen still prints `foerster-radius ≟ schwarzschild-radius` and the other decoys. It points at `docs/research/Orphan-Connector-Analysis.md`, which is not in the tarball. This session does not adjudicate them again.

`upt audit --source=canonical` exits 0: DERIVED 84, DECOY 2 (`CE-point-charge-field`, `CE-larmor-power`), OPEN 23. `CE-landauer` is DERIVED `+[k_B] ×1.000e+0`. `CE-planck-einstein` and `CE-de-broglie` are `×6.283` (`2π`). `CE-stefan-boltzmann` is `×1.645e-1` and `CE-wien` is `×1.265e+0`, both marked empirical/tuned. `CE-rydberg-energy` `×3.520e-25`, `CE-classical-electron-radius` `×2.191e+21`, `CE-bohr-magneton` `×2.389e+22`, and `CE-bohr-radius` `×2.605e+23` are DERIVED with `ℏ, c, G` and the same empirical/tuned mark. `CE-field-energy-density` is `×1.090e+1` with `ℏ, c, e`.

The canonical-graph comment in the tarball says the leading dimensionless constant (`2π`, `¼`, …) is taken as 1, and that values are correct up to an O(1) factor. `CE-landauer`'s AST multiplies by a dimensionless symbol `ln2`. The graph evaluator follows the dimensional monomial, so that symbol does not enter the number `upt explain` recovers.

## (b) Candidate bridges

Every row is unproven. "Partial" means dimensions fixed a form and left a constant or an identification open. None of these is novel physics. The gap is that the published registries do not carry the relation.

### 1. Radiation pressure — optics ↔ continuum mechanics — partial

- **Formula.** Time-averaged pressure `P = I/c` on a perfect absorber at normal incidence, and `P = 2I/c` on a perfect mirror. Energy density of a beam `u = I/c`, and for the absorber `P = u`.
- **Dimensional check.** Unique monomial `P ∝ I c^-1`. The factor 1 versus 2 is the optical boundary condition. Buckingham does not choose it. `upt derive` recovers prefactor 1 only because the formula supplied was `I/c`.
- **Numeric check.** Illustrative only: `10^6 W/m²` gives `3.3356409519815205×10^-3 Pa` and twice that. Literature actually opened: the unsigned note *Some Astronomical Consequences of the Pressure of Light*, Nature **75**, 90–93 (1906), doi:10.1038/075090a0, says Nichols and Hull confirmed Maxwell's calculation that the pressure on 1 cm² equals the energy in 1 cm³ of the beam. Nichols and Hull, Phys. Rev. (Series I) **13**, 307 (1901) and **17**, 91 (1903), were not opened. A later reassessment's percent was not opened and is not cited. OpenStax University Physics Volume 2, §16.4, states `P = I/c` and `P = 2I/c`; that is a textbook restatement, not a measurement.
- **Regime.** Classical electromagnetism, time average, normal incidence, perfect absorber or perfect reflector. A real surface is neither.
- **Known.** Maxwell; the 1906 note. Catalog gap. It is the local force law that be-64 / `PhysJS.Eddington.balance_iff` takes as a premise. The gap note already says the Thomson force is assumed and that units do not make the luminosity a cap.
- **Next step.** A specification section beside be-64 and `CE-poynting-flux`. Lean target: the momentum flux, with the optical boundary condition stated. Stays partial until 1 versus 2 is a hypothesis rather than a silent prefactor. Not kind `bridge` from `monomial_form` alone.

### 2. Alfvén speed — fluid ↔ plasma — partial

- **Formula.** `v_A = B / sqrt(μ0 ρ)` in SI, with `ρ` the mass density.
- **Dimensional check.** Unique monomial. `upt derive` with `μ0` written `L.M.T^-2.I^-2` recovers prefactor 1 for the formula that was typed. Buckingham still says the constant is unfixed. Named dimension `permeability` is rejected.
- **Numeric check.** Proton-only, rounded inputs `B ∼ 12 nT`, `N ∼ 14 cm^-3` from Louarn et al., Astron. Astrophys. **656**, A36 (2021), doi:10.1051/0004-6361/202141095, https://www.aanda.org/articles/aa/full_html/2021/12/aa41095-21/aa41095-21.html . Computed `69.95 km/s`. The paper's own sentence, with tildes: `V_a ∼ 60 km/s`. The paper writes the transform `b = B/(μ0 ρ)^{1/2}`. The 17% gap is the rounded inputs and a proton-only density; helium loading was not computed and is not invented here. This is not a precision test.
- **Regime.** Ideal MHD, SI, single-fluid density. Not a kinetic dispersion relation.
- **Known.** The paper uses it. Alfvén 1942 was not opened. Catalog gap beside `CE-plasma-frequency`. `upt explain alfven-speed` is NOT COVERED.
- **Next step.** A canonical equation `CE-alfven-speed`. Lean target: the SI monomial with `C = 1` as a stated hypothesis, the same shape as `PhysJS.Dimensional.monomial_form`, not a proved plasma theorem.

### 3. Debye length as a composition — plasma ↔ thermal — partial

- **Formula.** `λ_D = sqrt(ε0 kT / (n e^2))` is not a unique monomial of `{ε0, kT, n, e}`. The identity that does close it, once a thermal speed is named, is `λ_D = sqrt(kT/m) / ω_pi` when `ω_pi = sqrt(n e^2 / (ε0 m))`. Computed ratio `1.0000000000000002`.
- **Dimensional check.** Two π-groups. `upt derive` exits 0 anyway. The printed basis is `λ^3 n` and `λ ε0 kT e^-2`, a valid null-space basis, not the conventional Debye combination. The formula is still homogeneous of dimension length.
- **Numeric check.** Same Louarn rounded inputs. `sqrt(2kT/m) = 64.92 km/s` sits on the paper's `V_th ∼ 65 km/s`. `sqrt(kT/m) = 45.91 km/s`. Ion inertial length `c/ω_pi = 60.86 km`; the paper says the thermal Larmor radius `∼ 55 km` is "about" the ion inertial length. `λ_D = 9.32 m`. The paper does not report a Debye length. Using the paper's `∼ 65 km/s` in `λ = V/ω_p` would be high by `sqrt(2)` relative to `sqrt(kT/m)`. The match of the ratio to 1 is an identity of the two definitions, not a measurement.
- **Regime.** Weakly coupled, nondegenerate, one temperature, one species. The most-probable speed, the 1D thermal speed, and `sqrt(3kT/m)` are different quantities (`sqrt(3kT/m) = 79.51 km/s` here).
- **Known.** Standard plasma formulary. A composition of pieces the canonical layer almost has (`CE-plasma-frequency` exists; a named thermal speed exists as `CE-mb-most-probable-speed` and is not this `sqrt(kT/m)`). Not a new monomial.
- **Next step.** Do not add a fake unique monomial. A composition note beside `CE-plasma-frequency` that names which thermal speed. Lean target would be that identity, after the plasma-frequency convention is stated.

### 4. Plasma β — fluid ↔ plasma — partial

- **Formula.** Often `β = 2 μ0 p / B^2`. Dimensions also allow `μ0 p / B^2` with no 2.
- **Dimensional check.** Two invariants. The factor 2 is a definition.
- **Numeric check.** Louarn `P ∼ 300 eV cm^-3`, `B ∼ 12 nT`: `p / (B^2/(2μ0)) = 0.839`. The paper says `β ∼ 1`. Dropping the 2 still leaves a number of order 1 (`∼ 0.42`). The tildes do not pin the 2.
- **Regime.** Scalar pressure, SI magnetic pressure `B^2/(2μ0)`.
- **Known.** Definition, not a bridge. The paper states the ratio and does not write the 2.
- **Next step.** If it is encoded at all, encode it as a named definition with the 2 explicit. Not a Lean bridge target.

### 5. Tolman–Ehrenfest — gravitation ↔ thermodynamics — unproven, not a monomial

- **Formula.** In the 1930 signature, proper temperature satisfies `T0 √g_44 = constant` through a body in thermal equilibrium in a static field.
- **Dimensional check.** `{d ln T, g, c, dr}` has two invariants. Dimensions do not entail the criterion. The identification of the dimensionless gravitational piece with `d ln T` is the bridge.
- **Numeric check.** No laboratory gradient was opened. At `R = 6.957e8 m`, `GM_SUN_SI/(R c²) = 2.122502570145357e-6` and `G_SI M_SUN_SI/(R c²) = 2.1231324960869663e-6`. That is the weak-field fractional scale of the linearization, computed here, not a measured `ΔT/T`.
- **Regime.** Static metric, local thermodynamic equilibrium, perfect fluid or the solid-capable extension in the 1930 abstract. Not a horizon temperature.
- **Known.** Tolman and Ehrenfest, Phys. Rev. **36**, 1791 (1930), doi:10.1103/PhysRev.36.1791. The abstract opened here states that `T0 √g_44` is constant. UPT has Hawking temperature at infinity (be-42, a cross-check, and the gap note says the temperature is not proved) and does not have this equilibrium gradient. Not novel.
- **Next step.** A specification section distinct from `PhysJS.HawkingUnruh.dictionary`. Lean target: the static-metric criterion. The dictionary assumes Hawking and Unruh and does not derive Unruh. Do not chain this through be-42.

### 6. Nernst thermal voltage — electrochemistry ↔ thermodynamics — partial

- **Formula.** The scale is `k_B T / e`. A decade of activity, for a one-electron reaction, multiplies by `ln(10)`. The reaction quotient and the electron count are not fixed by dimensions.
- **Dimensional check.** Unique monomial `V ∝ k_B T e^-1`. Partial because `ln(Q)/n` is outside the monomial.
- **Numeric check.** From the package's 2019 SI constants, `(k_B * 298.15 / e) * ln(10) = 0.05915934968478234 V`, and `k_B/e = 8.617333262145179e-5 V/K`. No laboratory cell table was opened. This is the thermodynamic decade slope, not a measured electrode.
- **Regime.** Dilute activities, isothermal, the reaction written with a definite `n`. Not a kinetic overpotential.
- **Known.** Nernst's 1889 paper was not opened. `upt search nernst`, `seebeck`, and `faraday` miss. `N_A` and the faraday are not eval symbols.
- **Next step.** An L1 non-monomial in the style of `CE-boltzmann-factor`, not a `monomial_form` proof. Faraday as `N_A * e` can wait until `N_A` is a constant.

### 7. Piezoelectric Maxwell relation — electromagnetism ↔ continuum — partial

- **Formula.** At constant temperature, `(∂D/∂σ)_E = (∂ε/∂E)_σ`. A linear law `D_i = d_ijk σ_jk` is a rank-3 constitutive map. Dimensions give `[d] = C/N = m/V`.
- **Dimensional check.** Two groups. Strain is free. `D · E / stress` is dimensionless, so the two derivatives have the same dimension. The equality is thermodynamics, not Buckingham.
- **Numeric check.** Definitional, not a fit. Papet et al., J. Appl. Phys. **126**, 144102 (2019), doi:10.1063/1.5116026, HAL hal-02316058, comparison table: α-SiO₂ `d_11 = 2.31 pC/N`. That cell's marker in the manuscript points at Frankel et al., IEEE Sensors (2008), which was not opened. Bechmann, Phys. Rev. **110**, 1060 (1958), is reference 24 of the same manuscript and was not opened; this session does not attribute 2.31 to Bechmann's own table, and it does not check the sign. `2.31e-12 C/N` times `1 MPa` is `D = 2.31e-6 C/m²`. The rank-3 contraction above returned that component and zeros elsewhere.
- **Regime.** Linear piezoelectricity, the electrical and mechanical boundary conditions named. No `upt regime` family covers it.
- **Known.** Curie, and the Maxwell relation of the free energy. Not a scalar monomial to prove.
- **Next step.** A rank-3 constitutive cell, not a bridge id that claims `d` is determined. Lean target would be the equality of mixed derivatives under a stated thermodynamic potential.

### 8. Larché–Cahn chemo-mechanics — electrochemistry ↔ solid mechanics — partial

- **Formula.** An open-system diffusion potential shifts by a term of dimension partial molar volume times stress: `μ ∝ Ω σ`.
- **Dimensional check.** Unique monomial. The trace factor `1/3` and the sign are not fixed.
- **Numeric check.** None. No primary partial molar volume was opened. A "∼280%" volume-expansion figure was seen in a secondary review and is not used: the primary cell paper that review points at was not opened, and a percent is not a formula check.
- **Regime.** Small strain, interstitial or substitutional solid solution, the stress measure named. Not a battery-degradation model.
- **Known.** Larché and Cahn, Acta Metallurgica **21**, 1051–1063 (1973), and the later NBS reprint. Those PDFs were not opened in this session, so the `1/3` is not quoted from them here. Absent from UPT. Not novel.
- **Next step.** An open-system elasticity section. Lean needs a free-energy differential. `monomial_form` only recovers `μ = C Ω σ` with `C` unfixed.

### 9. Mott thermopower — thermal transport ↔ electrical transport — partial

- **Formula.** The scale is `k_B/e`. A metal thermopower is that scale times a dimensionless function of `kT/E_F` (the Mott formula). Sibling of be-61.
- **Dimensional check.** Two invariants: `S e / k_B` and `kT/E_F`. Not unique.
- **Numeric check.** None. `k_B/e = 8.617333262145179e-5 V/K` is the unit scale, computed. Mott and Jones was not opened. No copper thermopower table was opened. No sanity claim against a specimen.
- **Regime.** Degenerate Fermi liquid, elastic scattering, the Sommerfeld expansion. The gap note already says be-61's `C = π²/3` is the integral and the transport identification is the gap.
- **Known.** Not novel. `upt explain seebeck-coefficient` misses.
- **Next step.** A regime-limited note beside be-61. Not a unique-monomial proof. Do not read the be-61 `L0 ± 0` line as a measurement of copper.

### 10. Abraham–Minkowski momentum — optics ↔ continuum — unresolved, do not encode

- **Formula people write.** Electromagnetic momentum density `g = S/c²` (Abraham) or a factor `n` larger (Minkowski). Buckingham gives `g ∝ S c^-2` and stops.
- **Dimensional check.** Unique up to a dimensionless factor. The factor is the controversy.
- **Numeric check.** None attempted. There is no single number to match.
- **Regime.** A linear dielectric, and a split between field momentum and material momentum.
- **Status.** Pfeifer, Nieminen, Heckenberg, and Rubinsztein-Dunlop, Rev. Mod. Phys. **79**, 1197 (2007), erratum **81**, 443 (2009), doi:10.1103/RevModPhys.79.1197. The abstract opened here: no electromagnetic energy-momentum tensor is complete on its own; with the material tensor, the predictions agree; the preferred form is a choice. Not a bridge to add.

### 11. Magnetostriction — electromagnetism ↔ continuum — negative

Saturation strain is dimensionless. `buckinghamPi` on `{λ_s, B, M_s}` returns the group `λ_s` alone. `dimensionallyDetermines` is false. No Terfenol number was opened. There is no candidate equation.

### 12. Provisional chains — not new laws

- Hawking temperature composed into Landauer energy at one solar mass: `5.903143823302079e-31 J`, confidence `highly-speculative`. The mass uncertainty above tracks `E ∝ 1/M`. be-42 is a cross-check. be-16's proved statement is the equal-level deficit, and `be16Edge.confidence` is still `speculative`, so the chain prints the edge field. This is not a horizon erasure machine. Provisional.
- Unruh at `9.81 m/s²` composed into the same Landauer evaluator: `3.806887634553404e-43 J`. `upt evaluate be-57` supplies the temperature. be-57 has no PhysJS key. The gap note says `C = 1/(2π)` is not fixed by units. Provisional, and not a realizable machine.
- Cyclotron on the Louarn inputs is a use of `CE-cyclotron-frequency`, not a new bridge. The paper writes `ω_ci = qB/M ∼ 1.15 Hz` and `gyroperiod ∼ 5.5 s`. Those two clauses agree with `1.149 rad/s` and `5.466 s` only if `1.15` is radians per second. Labeling it hertz is the paper's slip. `0.183 Hz` would be the cyclic frequency.

### Cyclotron cross-check, kept separate from the candidates

`CE-cyclotron-frequency` already exists and the canonical explain recovers the angular frequency with prefactor 1 when the input is named `magnetic-field`. The flux-density name does not. That is bug 7, not a missing law.

## (c) Bugs, friction, missing pieces

Ranked by what a working session actually hit. Repro commands assume the scratch install above. No code change is in this report.

### High

1. **Canonical Landauer drops `ln 2`, and the two names hide it.** `upt explain erasure-energy temperature=300 --source=canonical` prints `4.1419e-21`. `upt explain landauer-erasure-energy temperature=300 --source=catalog` prints `2.8710e-21`. Ratio `1/ln 2`. `--source=both` follows whichever name was typed and does not show the other. `upt audit --source=canonical` lists `CE-landauer +[k_B] ×1.000e+0`. The audit compares the monomial evaluator with itself, and that evaluator already took the dimensionless factor as 1, so the control cannot fail. The AST and `formula_latex` both carry `ln 2`. `BridgeEquations.landauerEnergy` and be-16 include it.

2. **An energy unit on a temperature binding is accepted as kelvin.** `upt eval "k_B*T/e" T=22eV` exits 0 and prints `3.0374278e-22`. `upt eval "k_B*T" T=22eV` prints `4.866495848622025e-41`. `22 eV` was converted to joules (`22 * e`) and that number was used as kelvin. A temperature whose `kT` is `22 eV` has one-electron voltage `22 V`. The printed voltage is `22 * k_B`, small by `1/k_B`. There is no note. `upt eval 22eV` exits 2 (`eV` is a free symbol). The bug is the binding converter, not the MathTS formula parser. `T=300K` and `T=25degC` behave.

3. **`upt evaluate be-16` does not name the command that works.** Exit 1: `be-16 has no evaluator (only closed-form + spacetime bridges do — see `upt evaluate` with no args)`. `upt evaluate` with no id does not list be-16. `upt evaluate be-42` does name `BridgeEquations.hawkingTemperature` and `upt explain hawking-temperature mass=1.989e30`. be-16 has both `BridgeEquations.landauerEnergy({ temperature_K })` and `upt explain landauer-erasure-energy temperature=300`.

### Medium

4. **Search treats a quoted phrase as one token, and a hyphenated quantity name as one token.** `upt search radiation pressure` exits 0 (be-64). `upt search "radiation pressure"` exits 1. `upt search magnetic-field` exits 1, while `upt explain cyclotron-frequency ... magnetic-field=12e-9` accepts that name. Help says every word must match. The hyphen is not a word break.

5. **SI prefixes and a few constants a plasma or electrochemistry formula needs.** `upt eval B B=12nT` and `B=12uT` exit 1. `B=12e-9T` exits 0 and notes that bare `T` is the tesla. `m_p`, `m_proton`, `N_A`, and `F` are free. `sigma` is free; `sigma_sb` is the Stefan–Boltzmann constant, and help says so. `upt derive ... mu0:permeability` exits 2, `unknown base dimension 'permeability'`. `mu_0:mu_0` exits 2, `unrecognized dimension term 'mu_0'`. The dimension that works is `L.M.T^-2.I^-2`. When `m_p` is unknown, `upt eval "12e-9/sqrt(mu0*14e6*m_p)"` lists free variables `m_p, mu0` even though `upt eval mu0` succeeds.

6. **`DERIVED` plus "empirical/tuned constant" for an atomic law closed by `G`.** `upt audit --source=canonical` puts `CE-rydberg-energy`, `CE-classical-electron-radius`, `CE-bohr-magneton`, and `CE-bohr-radius` under DERIVED, with factors `10^-25` to `10^23`, constants `ℏ, c, G`. Closing an electromagnetic law with `G` is not a derivation of that law. The empirical/tuned mark is on the line. The heading still says "recognized monomial, prefactor recovered". `CE-field-energy-density` at `×1.090e+1` with `ℏ, c, e` is the same shape. Stefan–Boltzmann `×0.1645` and Wien `×1.265` are real transcendental prefactors and are easier to misread as the same kind of miss.

7. **Two names for `B`.** `magnetic-field=12e-9` recovers the cyclotron frequency. `magnetic-flux-density=12e-9` exits 0, says no derivation path, and suggests `current`, `distance`, `magnetic-field`, `mu_0` — the wire law — while the dimension line already shows `charge · magnetic-flux-density / mass`.

8. **A chain is a dead command in the published package, and a proved Landauer edge still says speculative.** `upt chain` exits 2 and cites `docs/planning/Bridge-Discovery-Pipeline-Design.md`, absent from the tarball. Composition is library-only (`composeEdges`). `be16Edge.confidence` is `'speculative'`, so Hawking∘Landauer prints `highly-speculative` with no sentence that `upt atlas be-16` holds a kind-`bridge` reference which that command itself refuses to turn into `formally-proved`. Chained results stay provisional by the repo's own rule. The friction is that the printed confidence and the atlas page describe different facts and do not point at each other.

9. **A non-unique formula and a placeholder dimension both exit 0.** The Debye `upt derive` says "NOT a unique monomial" and exits 0. `upt map --equation-only --equation "pressure = intensity/c"` exits 0, labels the mismatch UNKNOWN, and prints RHS dimension `[L^-1 T]` because `intensity` was filled in as dimensionless. A reader who trusts the dimension line records the wrong dimension. The UNKNOWN sentence does say it is not a failed check.

10. **`upt connectors` still prints rejected decoys, and cites a doc the tarball does not contain.** `foerster-radius ≟ schwarzschild-radius` is on the screen. `docs/research/Orphan-Connector-Analysis.md` (2026-07-04 refresh in the repo) already marks that pair a decoy and keeps CI-1 and CI-2 as the motivated orphan connectors. The command's pointer to that file is not resolvable from the installed package. This session does not re-rank those pairs.

### Low

11. **`upt explain debye-length` suggests `planck-length`.** Exit 1. `upt search debye` does find `CE-debye-frequency`, which is a frequency, not a length. The suggestion is a length-token match.

12. **No regime family for the domains this session cared about.** `upt regime plasma` exits 1. Known families: `oscillators`, `diffusion`, `waves`. Piezoelectricity, a plasma β, and a Tolman gradient have nowhere to hang a machine inequality.

13. **Assignment syntax versus the help example.** Help says pass `E=<number>`. `upt eval E=1eV` exits 2, `Security: assignment expressions are disabled`. The working form is `upt eval E E=1eV`. Bindings are separate arguments. MathTS is right to refuse an assignment inside the formula; the help line is what gets typed into the formula slot.

14. **Witness paths in `upt atlas` point at the repository.** `ab-stokes-einstein` says the symbolic witness is decided by `data/atlas/witness-results.json`, "not shipped in the package", and names `tests/atlas/closure.test.ts`. A consumer of the npm package cannot run that file.

### MathTS, as distinct from UPT

What held: bare `e` is the elementary charge (`1.602176634e-19`); `exp(1)` is Euler's number; the name `euler` is refused; `1-e^2` is a dimension error and names `one_minus_e_sq`; `log` is `ln` and `log10` exists; `LabeledTensor.contract` matches index id and the mismatch error names both ids. Those are the 0.67.0 seams and the 1.0.3 index rule, and they behaved.

What is UPT rather than MathTS: the `T=22eV` binding (bug 2); the canonical evaluator taking a dimensionless AST factor as 1 (bug 1); the Debye null-space basis, which is a valid basis and does not print the combination a physicist writes (candidate 3). `getActiveEngine()` returning `Promise<TensorEngine>` is the declared signature; the promise resolves to `MathTSEngine`.

### Not opened, so not used as a number

Maxwell 1873; the Nichols–Hull papers themselves; any later percent on that experiment; Alfvén 1942; a helium-loaded solar-wind density; Bechmann's table and the sign of quartz `d_11`; Frankel et al. 2008 beyond the Papet citation; Nernst 1889; a copper Seebeck table; Mott and Jones; a silicon partial molar volume; Terfenol `λ_s`; Eddington 1926 (the be-64 module comment was not re-derived); the IAU resolution PDF that defines `R_sun` and `GM_SUN_SI`. Where a computed stand-in appears above, it is marked as computed.
