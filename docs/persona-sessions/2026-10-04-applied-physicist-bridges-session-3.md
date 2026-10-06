# Applied physicist — bridge dogfood of published 3.0.0, 2026-10-04

Model-persona session against the published package `universal-physics-tensor@3.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-300`: `npm init -y && npm i universal-physics-tensor@3.0.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor version gitHead --prefer-online` printed `3.0.0` and `9ea1990899b44807e8d2fa37aba7c2dda9780b68`. Annotated tag `v3.0.0` is object `a6fd7a29904e40483dd743c4d0e213e1bb245e9b` and its target is that commit. The publish workflow is run `37173405878`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v3.0.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `3.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

This session re-runs the commands in `docs/dogfood/2026-10-03-applied-physicist-bridges.md` and `docs/dogfood/2026-10-03-applied-physicist-bridges-r2.md`, then exercises BE-66 through BE-73. A row is **fixed** when that command's failure is gone. Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A composition of two evaluators is **provisional**. A candidate that is not in PhysJS is **unproven**.

`BRIDGE_EQUATIONS.length` is 63. Status counts: 27 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–73, with 54 still printed before 53. Every row object still has `formalRef: null` (the overlay is what `upt atlas` prints). `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 342 quantities, 6 applied cases. `CATALOG_GRAPH` has 54 edges.

## (a) Re-run of the earlier repros

Tally of the fourteen numbered bugs from the 2.0.0 report: **14 fixed, 0 still broken.** Bug 5 was partly fixed on 2.0.1; `mu_0` as a dimension term now succeeds. Tally of N1–N5 from the 2.0.1 report: **5 fixed, 0 still broken.** Commands were run in `/tmp/upt-dogfood-300`. "Printed" is the output of `universal-physics-tensor@3.0.0`.

| # | status | what 3.0.0 printed |
|---|---|---|
| 1 | fixed | Both names recover `2.87097888507872e-21`. `--source=both` prints both and says they agree. Audit: `CE-landauer +[k_B] ×6.931e-1`. |
| 2 | fixed | `upt eval "k_B*T/e" T=22eV` prints the `k_B T` note and `22`. `k_B*T` at that binding is `3.5247885948e-18`. |
| 3 | fixed | `upt evaluate be-16 T_K=300` exits 1 and names `BridgeEquations.landauerEnergy({ temperature_K })` and `upt explain landauer-erasure-energy temperature=300`. |
| 4 | fixed | `upt search "radiation pressure"` (one argument containing a space) exits 0 with be-64, be-66, and `radiation-pressure`. `upt search magnetic-field` exits 0 and prints the query as `magnetic field`, 7 matches. `upt search be-16` exits 0. |
| 5 | fixed | `12nT`, `12uT`, `m_p`, `m_proton`, `N_A`, `F`, `mu0:permeability`, and `mu_0:mu_0` succeed. The `mu_0` derive exits 0 with prefactor `1.0000e+0`. |
| 6 | fixed | Audit heading is `DIMENSIONAL-RECONSTRUCTION MISMATCH (DECOY, 7)`. The five G-closures and `CE-field-energy-density` are in that list. DERIVED 79, DECOY 7, OPEN 23. |
| 7 | fixed | `magnetic-flux-density=12e-9` recovers cyclotron frequency `1.14945997871324`, the same value as `magnetic-field=12e-9`. |
| 8 | fixed | `upt chain` exits 2, cites the GitHub blob of `Bridge-Discovery-Pipeline-Design.md`, and says `be16Edge.confidence` stays speculative while `upt atlas be-16` holds the kind-bridge reference. |
| 9 | fixed | Debye `upt derive` says `NOT a unique monomial` and exits 3. `pressure = intensity/c` exits 3 and says the right-hand side dimension was not established. It does not print `[L^-1 T]`. |
| 10 | fixed | `foerster-radius ≟ schwarzschild-radius` is under `DECOY (recorded verdict)`, with the grounds "a Förster radius is not a Schwarzschild radius". The pointer is the GitHub blob of `docs/research/Orphan-Connector-Analysis.md`. |
| 11 | fixed | `upt explain debye-length` exits 1, says NOT COVERED, and suggests `upt search debye` (`CE-debye-frequency`). It does not suggest `planck-length`. |
| 12 | fixed | `upt regime plasma`, `piezoelectricity`, and `tolman` exit 0 and say no machine condition was evaluated. They do not state an inequality. An unknown family exits 1 and lists those three with the atlas families. |
| 13 | fixed | `upt eval E=1eV` exits 2, `Security: assignment expressions are disabled`. `upt eval E E=1eV` exits 0 and prints `1.602176634e-19`. `upt help eval` states that working form. Top-level help does not say pass `E=<number>`. |
| 14 | fixed | `upt atlas ab-stokes-einstein` names the GitHub blob URLs of `data/atlas/witness-results.json`, `tests/atlas/closure.test.ts`, and `tests/atlas/witness-results.test.ts`. It does not say `bunx vitest`. Derived evidence stays `proposed`. The package still says the witness file is not shipped. |

N1–N5:

| # | status | what 3.0.0 printed |
|---|---|---|
| N1 | fixed | Explain of the evaluate keys recovers a value. `radiation-pressure` with `I=1e6 R=0 theta=0` is `0.00333564095198152` via be-66. Alfvén with `B_T` and `rho_kg_per_m3` is `69979.105234293` at density `2.34e-20`. Tolman with `T_K=5800 g_00=-1` is `5800`. |
| N2 | fixed | Tolman text at the solar `g_00` is `5799.98768947203`. JSON `recoveredValue` is `5799.987689472028`. Hawking text at `mass=1Msun` is `6.16842971641034e-8`. |
| N3 | fixed | `upt help evaluate` says `BE-51/52/55..73`. |
| N4 | fixed | `upt derive` of `radiation-pressure` with `poynting_flux` names `be-66` and recovers prefactor `1.0000e+0`. `pressure` with `intensity` does not name be-66. |
| N5 | fixed | The be-66 edge citation is `https://openstax.org/books/university-physics-volume-2/pages/16-4-momentum-and-radiation-pressure`. The sentence that `(1+R) cos²θ` is this catalog's assembly stays. The atlas page does not say §16.5. |

### Bug 1 — Landauer

```
upt explain erasure-energy temperature=300 --source=both
```

Exit 0. Canonical `CE-landauer` and catalog `be-16` both print `2.87097888507872e-21`. The last line is `erasure-energy and landauer-erasure-energy are one restatement (CE-landauer restates be-16). Values agree.` The same agreement prints when the catalog name is the one typed. `BridgeEquations.landauerEnergy({ temperature_K: 300 })` is `2.870978885078724e-21`. Catalog-only explain of the bare name `erasure-energy` still exits 1 and points at `landauer-erasure-energy`. `--source=both` is what joins them.

Stefan–Boltzmann stays `×1.645e-1` and Wien `×1.265e+0`, both empirical/tuned. Planck–Einstein and de Broglie stay `×6.283`.

### Bug 5 — the leftover dimension spelling

```
upt derive velocity:velocity B:magnetic_field mu_0:mu_0 rho:mass/length^3 --formula "B/sqrt(mu_0*rho)"
```

Exit 0. Unique monomial, prefactor `1.0000e+0`. On 2.0.1 this exited 2 with `unrecognized dimension term 'mu_0'`. `sigma` is still free. `sigma_sb` is `5.670374419e-8`.

### Bug 6 — catalog audit as well as the canonical one

Canonical decoys: `CE-point-charge-field`, `CE-larmor-power`, `CE-field-energy-density`, `CE-rydberg-energy`, `CE-classical-electron-radius`, `CE-bohr-magneton`, `CE-bohr-radius`.

Catalog audit exits 0 with DERIVED 15 and DECOY 7: `be-42`, `be-51`, `be-14`, `be-27`, `be-43`, `be-67`, `be-69`. The heading says a decoy is not a physical refutation. be-69 is in that list because the sum of squares is not the monomial the reconstruction recovers. The formally-proved map filter still keeps be-69. Those are different facts.

### Bug 9 — exit 3

Debye, same formula as the earlier reports, exits 3 with two groups `length^3 · n` and `length · eps0 · kT · e^-2`. The formula dimension is still `[length]`.

```
upt map --equation-only --equation "pressure = intensity/c"
```

Exit 3. `NOT ESTABLISHED: 'intensity' has no catalog dimension, so the right-hand side dimension was not established and is not reported.` The hint names `incident-intensity`, `poynting-flux`, `radiative-flux`, `transmitted-intensity`. The text does not contain `[L^-1 T]` and does not name be-66. `pressure = N*k_B*temperature/V` exits 0 and agrees with `CE-ideal-gas`, prefactor 1.

### Bug 10 — ledger and URL

`--source=both`: `22 of the isolated bridges share a name token with the core; 12 are truly unconnected.` `--source=catalog`: `12 of the isolated bridges share a name token with the core; 13 are truly unconnected.` The catalog unconnected list is `be-14, be-17, be-21, be-25, be-30, be-39, be-43, be-46, be-49, be-50, be-53, be-66, be-72`. The footer on both runs is `https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/research/Orphan-Connector-Analysis.md`. The bare repository path is not in the text.

### Bug 12 — vacuous regimes

`upt regime oscillators --at theta0=0.2` exits 0. `ab-pendulum-linear` is the bridge that prints `valid`. The model rows, including `model-pendulum`, print the vacuous sentence.

### Bug 14 — Stokes–Einstein page

Exit 0. Stored evidence `numerically-supported, proposed`. Derived evidence `proposed`. `formally-proved (derived from formalRef): no`. Witness lines are the GitHub blob URLs above. `upt atlas ab-kg-oscillator` prints `formally-proved (derived from formalRef): YES`.

### Conventions that still hold

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and says energy, and names `upt eval E E=1eV`. `euler` is refused and names `exp(x)`. `1-e^2` exits 2 and names `one_minus_e_sq`. `mu0*eps0*c^2` is `1`. `mu0` and `mu_0` are both `0.0000012566370621200546`. `m_e` is `9.1093837015e-31`. `log(10)` is `2.302585092994046`. `log10(10)` is `1`. `ln2` and `ln(2)` are `0.6931471805599453`. `k_B*298.15/e*ln(10)` is `0.05915934968478234`. `k_B/e` is `0.00008617333262145179`. `T=300K` is `4.141947e-21`. `T=25degC` is `4.1164049935e-21`. `upt eval 22eV` exits 2 (`eV` is a free symbol). `B=12e-9T` is `1.2e-8` and notes that bare `T` is the tesla. `n=14cm^-3` is `13999999.999999998`. `12e-9/sqrt(mu0*14e6*m_p)` is `69954.13706220593`.

`upt evaluate be-64` at `M_kg=1.989e30` and at `M_kg=1Msun` both print `L_Edd_W = 1.2574382573536063e31` and `L_Edd_solar = 32848.43932480685`, with the same `Msun` versus IAU `GM☉` note. be-61 prints `kappa_W_per_mK = 425.08278457881806 ± 7.46`. be-58 prints `S_V_V2_per_Hz = 1.6567788e-17 ± 5.52e-21`. be-56 prints Casimir pressure `-13.001257732443651`. `L0` is still `2.443004509073667e-8 ± 0`.

`upt explain temperatur` exits 0 and says `'temperature' is in the graph, but cannot be determined from {}`. That is the one-token typo resolving, with no inputs supplied. `upt explain not-a-quantity-xyz` exits 1.

## (b) BE-66 through BE-73

Catalog rows 66–73 are `established`. Edge confidence is `established` on all eight. Kind is `law`. The published edge comment says the overlay formalRef is kind `bridge`, so each id is a seed, and a proof does not promote the confidence field.

Root exports used here: `evaluateRadiationPressure`, `evaluateAlfvenSpeed`, `evaluateTolmanEhrenfest`, `evaluateFastMagnetosonic`, `evaluateEinsteinRelation`, `evaluateClapeyron`, `evaluateGravitationalRedshift`, `evaluateKelvinPeltier`, `tolmanTemperatureAt`, `alfvenProtonOnlyDensity`, `M_PROTON_SI`, `GM_SUN_SI`, `be66Edge` through `be73Edge`, `be16Edge`, `be42Edge`, `composeEdges`, and `CompositionJunctionError` (from the package root; the class is the one `composeEdges` throws).

`M_PROTON_SI` is `1.67262192369e-27`. `alfvenProtonOnlyDensity(14e6)` is `2.3416706931660002e-20`. `GM_SUN_SI` is `1.3271244e20`.

### Search

| query | exit | hits |
|---|---|---|
| `radiation pressure`, `alfven`, `tolman`, `fast magnetosonic`, `clapeyron`, `gravitational redshift`, `peltier`, `seebeck` | 0 | the matching new bridge |
| `ehrenfest` | 0 | be-68 only |
| `einstein relation` | 0 | be-70 and `CE-planck-einstein` |
| `nernst-einstein`, `nernst` | 1 | no entry |
| `clausius` | 0 | `CE-clausius-entropy` only |
| `redshift` | 0 | be-72 |
| `thomson` | 0 | be-64, be-66, be-73, and `CE-thomson-cross-section` (5 matches) |
| `sound speed` | 0 | be-69, `CE-sound-speed`, `CE-debye-frequency`, `ab-sound-speed`, and the quantity `sound-speed` |
| `debye length` | 1 | no entry. `upt search debye` still finds `CE-debye-frequency` |

### Explain and evaluate

Explain text is 15 significant digits. The evaluator prints the full float.

| command | exit | printed |
|---|---|---|
| `upt evaluate be-66 I_W_per_m2=1e6 R=0 theta_rad=0` | 0 | `P_Pa = 0.0033356409519815205` |
| same, `R=1` | 0 | `P_Pa = 0.006671281903963041` |
| same, `R=0.5` | 0 | `P_Pa = 0.005003461427972281` |
| `R=1`, `theta_rad=π/4` | 0 | `P_Pa = 0.0033356409519815214` |
| explain `radiation-pressure` with `I=1e6 R=0 theta=0` | 0 | `0.00333564095198152` via be-66 |
| explain, reflectance 1 | 0 | `0.00667128190396304` |
| `upt evaluate be-67 B_T=12e-9 rho_kg_per_m3=2.341670693166e-20` | 0 | `v_m_per_s = 69954.13706220593` |
| same, `B_T=12nT` | 0 | `12nT → 1.2e-8 T`, `v_m_per_s = 69954.13706220595` |
| explain with density `2.341670693166e-20` | 0 | `69954.1370622059` via be-67 |
| `upt evaluate be-68 T_K=5800 g_00=-1` | 0 | `invariant_K = 5800` |
| solar `g_00=-0.9999957549948597` | 0 | `invariant_K = 5799.987689472028` |
| `g_00=0.5` | 1 | `g_00 must be finite and < 0` |
| `upt evaluate be-69` with `cs_m_per_s=58489.41649057923` and the proton-only density | 0 | `v_m_per_s = 91184.39084364349` |
| `cs_m_per_s=0` | 0 | `v_m_per_s = 69954.13706220593`. Explain names be-69, not be-67 |
| `upt evaluate be-70 mu_m2_per_Vs=1e-8 T_K=300 q_C=1.602176634e-19` | 0 | `D_m2_per_s = 2.5851999786435537e-10` |
| `upt evaluate be-71 L_J_per_kg=2.26e6 T_K=373.15 delta_v_m3_per_kg=1.672` | 0 | `slope_Pa_per_K = 3622.335900169705` |
| `upt evaluate be-72 g1=-1 g2=-4` | 0 | `frequency_ratio = 2`. Explain uses quantity names `redshift-metric-g00-1` and `redshift-metric-g00-2` |
| `g1=0.5` or `g2=0` | 1 | that component `must be finite and < 0` |
| `upt evaluate be-73 S_V_per_K=2e-4 T_K=300` | 0 | `Pi_V = 0.060000000000000005`. Explain text is `0.06` |

The library calls match those evaluator numbers. `tolmanTemperatureAt(5800, -0.9999957549948597)` is `5800.012310554101`, the inverse of the invariant call.

Clapeyron's source quantity on the edge is `specific-latent-heat`, not the energy node `latent-heat`. Explain of `clapeyron-slope` with those graph names recovers `3622.3359001697`.

### Evidence grade

`upt atlas be-66` through `upt atlas be-73` each exit 0, say the id is a catalog equation rather than an atlas bridge, print kind `bridge` at pin `3af15b49be09442350510e7c7f56f4aab92ea3bc`, and then say the command prints the stored formalRef and does not derive `formally-proved` from it.

| id | theorem |
|---|---|
| be-66 | `PhysJS.RadiationPressure.pressure_eq` |
| be-67 | `PhysJS.AlfvenSpeed.speed_eq` |
| be-68 | `PhysJS.TolmanEhrenfest.hydrostatic_constant` |
| be-69 | `PhysJS.FastMagnetosonic.speed_eq` |
| be-70 | `PhysJS.EinsteinRelation.diffusion_eq` |
| be-71 | `PhysJS.Clapeyron.slope_eq` |
| be-72 | `PhysJS.GravitationalRedshift.frequency_ratio` |
| be-73 | `PhysJS.KelvinRelation.peltier_eq` |

`upt atlas be-16` prints `PhysJS.Landauer.erasure_eq` at that same pin, kind `bridge`, and says `be16Edge.confidence` is `speculative`, that `composeEdges` of be-42 with be-16 is `highly-speculative`, and that the formalRef does not make the chain formally-proved. `upt atlas be-57` still exits 1: no formalRef.

```
upt map --source=both --evidence=formally-proved
```

Exit 0. `21 of 163 kept; 32 dropped (did not match); 110 dropped (no overlay metadata)`. Catalog-only: `21 of 54 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The 21 ids are be-12, be-16, be-21, be-27, be-33, be-37, be-40, be-43, be-54, be-55, be-59, be-60, be-63, be-66, be-67, be-68, be-69, be-70, be-71, be-72, be-73. The cluster of 6 is be-12, be-16, be-37, be-27, be-33, be-63. be-67 and be-69 share a component. The other new ids are isolated in that filter.

### Composition

Calls are `composeEdges` from the published package.

| call | result |
|---|---|
| `composeEdges(be42Edge, be16Edge).evaluate({ mass: 1.989e30 })` | `5.903143823302079e-31`, id `be-42>>be-16`, confidence `highly-speculative`, kind `bridge` |
| `composeEdges(be68Edge, be16Edge)` and the swap | `CompositionJunctionError`. `tolman-invariant` matches none of `temperature`. `landauer-erasure-energy` matches none of `proper-temperature`, `metric-g00` |
| `composeEdges(be66Edge, be67Edge)` and the swap | `CompositionJunctionError` on `radiation-pressure` versus the Alfvén sources, and on `alfven-speed` versus the radiation-pressure sources |
| `composeEdges(be72Edge, be68Edge)` and the swap | `CompositionJunctionError`. `gravitational-frequency-ratio` matches none of `proper-temperature`, `metric-g00`. `tolman-invariant` matches none of the two redshift `g_00` nodes |
| `composeEdges(be69Edge, be67Edge)` and the swap | `CompositionJunctionError`. `fast-magnetosonic-speed` is not an Alfvén source. `alfven-speed` is not a fast-mode source. `c_s = 0` recovers the Alfvén number and does not identify the edges |

`upt symbolic` prints CT-1 as `landauer-erasure-energy(mass) = k_B·(hbar·c^3 / (8pi·G·mass·k_B))·ln2` and `confidence: highly-speculative`. The symbolic table's solar Hawking line stays `6.1684e-8`. That table keeps its own formatting; the explain text of the same temperature is the 15-digit form.

```
upt map --equation-only --equation "radiation_pressure = poynting-flux/c"
upt map --equation-only --equation "radiation_pressure = I_W_per_m2/c"
```

Both exit 0, dimension `[L^-1 M T^-2]`, and name be-66. `upt derive` of `alfven-speed` from `magnetic_flux_density` alone exits 3: the formula dimension is `[M T^-2 I^-1]`, not velocity, and the text does not name be-67. The density source is missing, so that omission matches the rule that a missing dimensionful source is not the edge. `upt derive` of `fast-magnetosonic-speed` from `sound_speed` alone exits 0 with prefactor 1 and does not name be-69.

## (c) New candidates

The five candidates in the 2.0.1 report are now be-69 through be-73. They are not re-proposed. Piezoelectricity, magnetostriction, Vegard, the Nernst effect, Faraday induction, optomechanics, strain, pyroelectricity, electrostriction, Saha, Soret, Grüneisen, Verdet, Pockels, and Abraham–Minkowski were searched again and are still absent. `upt search minkowski` exits 0 on be-57 (the Unruh description contains the word). That hit is not an Abraham–Minkowski momentum law, and this session does not encode one. `upt search hall effect` exits 0 on be-55 and be-60. `upt search skin depth` exits 0 on `case-skin-depth`.

### 1. Magnetic pressure — plasma ↔ continuum — partial

- **Formula people write.** Isotropic magnetic pressure `B² / (2 μ0)`, beside the Alfvén speed.
- **Dimensional check.** `upt derive pressure:pressure B:magnetic_field mu0:permeability --formula "B^2/(2*mu0)"` exits 0. Unique monomial `pressure ∝ B^2·mu0^-1`, recovered prefactor `5.0000e-1`. The same command with `B^2/mu0` recovers prefactor `1.0000e+0`. Units fix the monomial. They do not pick the 2. No catalog edge is named. `upt search magnetic pressure` exits 1.
- **Composition check.** be-67's target is `alfven-speed`, not a pressure. `composeEdges` was not given a pressure edge to join. `ρ v_A²` is `B² / μ0` only after substituting the Alfvén formula; that substitution is not a junction of quantity names.
- **Numeric check.** None taken from a measurement. The prefactor above is the derive report, not a probe of an MHD simulation.
- **Source opened.** None this session. The factor `1/2` is the formula that was typed into `upt derive`.
- **Regime.** Ideal MHD, the same setting as be-67's covers line. Not a kinetic pressure.
- **Known.** The Alfvén edge. The gap is a pressure node `B² / (2 μ0)` that the catalog does not name.
- **Next step.** An L1 relation whose target is a magnetic pressure, with the `1/2` stated rather than left as the Buckingham constant. Not a second copy of be-67.

### 2. London depth — electromagnetism ↔ superconductivity — absent, and not a unique monomial

- **Formula people write.** `λ_L = sqrt(m / (μ0 n q²))`.
- **Dimensional check.** `upt derive length:length m:mass mu0:permeability n:L^-3 q:charge --formula "sqrt(m/(mu0*n*q^2))"` exits 3. Two groups: `length^3 · n` and `length · m · mu0^-1 · q^-2`. The formula dimension is `[length]`. This is the same two-group shape as the Debye length, which also exits 3. `upt search london` and `upt search london penetration` exit 1.
- **What this is not.** A unique-monomial proof. Number density and a length are dimensionally dependent.
- **Source opened.** None. No penetration-depth table was used.
- **Next step.** A specification that states the depth and says the units do not fix it, the same honesty the Debye derive already prints. Not a fake unique monomial.

### 3. Plasma β — still not an inequality, and not a unique monomial

- **Formula people write.** `β = 2 μ0 p / B²`, gas pressure over magnetic pressure.
- **Dimensional check.** `upt derive beta:dimensionless p:pressure B:magnetic_field mu0:permeability --formula "2*mu0*p/B^2"` exits 3. Two groups: `beta`, and `p · B^-2 · mu0`. A dimensionless target plus one dimensionless combination of the inputs is not a determining monomial.
- **What already exists.** `upt regime plasma` exits 0 and says no machine condition was evaluated. `upt search plasma beta` exits 1. `upt search beta` exits 0 on three catalog quantities (`yang-mills-beta`, `newton-coupling-beta`, `composite-higgs-beta`). None of those is this ratio.
- **Next step.** Leave the regime vacuous. Do not invent a plasma-β inequality. A later relation would have to state the ratio as a definition, not as a gate the regime command already refused to print.

`upt search thomson coefficient` exits 0 on be-73, because the description contains those words. be-73 is `Π = S T`. It is not `T dS/dT`. This session did not open a thermoelectric paper and does not propose that derivative as a bridge.

## (d) New bugs

Reported only. Nothing in this file changes `src/`.

### Medium

R3-1. **The fast-magnetosonic dimensional line says the speed is proportional to the sound speed, including when that input is zero.** `upt explain fast-magnetosonic-speed sound-speed=58489.41649057923 magnetic-flux-density=12e-9 plasma-mass-density=2.341670693166e-20` recovers `91184.3908436435` via be-69, which is `sqrt(v_A² + c_s²)` on these inputs, and then prints `fast-magnetosonic-speed ∝ sound-speed`. The same sentence prints when `cs_m_per_s=0`, beside recovered value `69954.1370622059`. A speed proportional to a zero sound speed would be zero. The named formula on the line above is the sum of squares. The catalog audit lists be-69 as a dimensional-reconstruction mismatch for this reason. The evaluator is the one that matches the theorem.

R3-2. **Gravitational redshift is described as carrying dimensionful constants.** `upt explain gravitational-frequency-ratio g1=-1 g2=-4` recovers `2` via be-72, `ν1/ν2 = √(g2/g1)`, and then says `those inputs alone do not fix it — the encoded formula carries dimensionful constants`. Both inputs are dimensionless. The printed law has no dimensionful constant. The value is the square root of the ratio of the two metric components.

### Low

R3-3. **A failed explain splits a hyphen and suggests the quantity named `a`.** `upt explain not-a-quantity-xyz` exits 1, NOT COVERED, and says `` `upt search a` finds `` the quantity `a` and `semi-major-axis`. The miss contains the word `a` between hyphens. `debye-length` no longer suggests `planck-length`. This suggestion is the one-letter token.

### What held, and is not filed as a bug

Clapeyron and Kelvin explain lines say the inputs fix the target up to a dimensionless constant, and the recovered values are the closed forms (`3622.3359001697` and `0.06`). The monomials match those laws. The fast-magnetosonic line does not, which is why only that one is R3-1. `upt symbolic` still prints the Hawking temperature as `6.1684e-8` in its table. Explain of the same quantity prints `6.16842971641034e-8`. Search of `einstein relation` still also returns `CE-planck-einstein`, and now also returns be-70. `upt search debye length` still exits 1.

### Not opened, so not used as a number

Alfvén 1942; a magnetic-pressure measurement; a London-depth table; Kelvin's thermoelectric paper; any paper that would turn plasma β into an inequality. Where a derive prefactor appears above, it is the command's report of the formula that was typed.
