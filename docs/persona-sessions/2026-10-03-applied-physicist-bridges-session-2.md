# Applied physicist — bridge dogfood of published 2.0.1, 2026-10-03

Model-persona session against the published package `universal-physics-tensor@2.0.1`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-201`: `npm init -y && npm i universal-physics-tensor@2.0.1`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@2.0.1 version gitHead --prefer-online` printed `2.0.1` and `b2abf1bca457635b76bf28a2c9d3da7b1e27703c`. Annotated tag `v2.0.1` is object `c7974de9d95306621c3f12d854058d2ad3fce50a` and its target is that commit. The CLI is `./node_modules/.bin/upt`. `upt version` prints `2.0.1`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

This session re-runs the commands in `docs/dogfood/2026-10-03-applied-physicist-bridges.md`. A row below is **fixed** when that command's failure is gone, **partly fixed** when one of the named failures remains, and **still broken** when the 2.0.0 failure still prints. Nothing in section (c) is a proved bridge. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A composition of two evaluators is **provisional**. A candidate that is not in PhysJS is **unproven**.

`BRIDGE_EQUATIONS.length` is 58. Status counts: 22 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–68, with 54 still printed before 53. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 328 quantities, 6 applied cases. `CATALOG_GRAPH` has 49 edges, including `be-66`, `be-67`, and `be-68`.

## (a) Re-run of the 2.0.0 repros

Tally of the fourteen numbered bugs: **7 fixed, 1 partly fixed, 6 still broken.** The six still-broken rows are the deferred items 9–14. Commands were run in `/tmp/upt-dogfood-201`. "Printed" is the output of `universal-physics-tensor@2.0.1`.

| # | status | what 2.0.1 printed |
|---|---|---|
| 1 | fixed | Both names recover `2.8710e-21`. `--source=both` prints both and says they agree. Audit: `CE-landauer +[k_B] ×6.931e-1`. |
| 2 | fixed | `upt eval "k_B*T/e" T=22eV` prints `T=22eV is read as k_B T, so T is 2.552994e+5 K` and `22`. `k_B*T` at that binding is `3.5247885948e-18`. |
| 3 | fixed | `upt evaluate be-16 T_K=300` exits 1 and names `BridgeEquations.landauerEnergy({ temperature_K })` and `upt explain landauer-erasure-energy temperature=300`. |
| 4 | fixed | `upt search "radiation pressure"` (one argument) exits 0 with be-64, be-66, and `radiation-pressure`. `upt search magnetic-field` exits 0 and prints the query as `magnetic field`, 7 matches. |
| 5 | partly fixed | `12nT`, `12uT`, `m_p`, `m_proton`, `N_A`, `F`, and `mu0:permeability` succeed. `mu_0:mu_0` still exits 2, `unrecognized dimension term 'mu_0'`. |
| 6 | fixed | Audit heading is `DIMENSIONAL-RECONSTRUCTION MISMATCH (DECOY, 7)`. The five G-closures and `CE-field-energy-density` are in that list. DERIVED 79, DECOY 7, OPEN 23. |
| 7 | fixed | `magnetic-flux-density=12e-9` recovers cyclotron frequency `1.1495e+0`, the same value as `magnetic-field=12e-9`. |
| 8 | fixed | `upt chain` exits 2, cites `https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/planning/Bridge-Discovery-Pipeline-Design.md`, and says `be16Edge.confidence` stays speculative while `upt atlas be-16` holds the kind-bridge reference. |
| 9 | still broken | Debye `upt derive` says `NOT a unique monomial` and exits 0. `pressure = intensity/c` exits 0, prints RHS `[L^-1 T]`, and says that is not a failed check. |
| 10 | still broken | `upt connectors --source=both` still prints `foerster-radius ≟ schwarzschild-radius` and points at `docs/research/Orphan-Connector-Analysis.md`. |
| 11 | still broken | `upt explain debye-length` exits 1 and suggests `planck-length`. |
| 12 | still broken | `upt regime plasma` exits 1. Known families: `oscillators`, `diffusion`, `waves`. |
| 13 | still broken | `upt eval E=1eV` exits 2, `Security: assignment expressions are disabled`. `upt eval E E=1eV` exits 0 and prints `1.602176634e-19`. |
| 14 | still broken | `upt atlas ab-stokes-einstein` still names `tests/atlas/closure.test.ts` and `data/atlas/witness-results.json`, "not shipped in the package". Derived evidence `proposed`. |

### Bug 1 — Landauer

```
upt explain erasure-energy temperature=300 --source=both
```

Exit 0. Canonical `CE-landauer` and catalog `be-16` both print `2.8710e-21`. The last line is `erasure-energy and landauer-erasure-energy are one restatement (CE-landauer restates be-16). Values agree.` The same agreement prints when the catalog name is the one typed. `BridgeEquations.landauerEnergy({ temperature_K: 300 })` is `2.870978885078724e-21`. `upt audit --source=canonical` lists `CE-landauer +[k_B] ×6.931e-1`. Stefan–Boltzmann stays `×1.645e-1` and Wien `×1.265e+0`, both empirical/tuned. Planck–Einstein and de Broglie stay `×6.283`.

Catalog explain of the bare name `erasure-energy` still exits 1 and suggests `landauer-erasure-energy`. That is the catalog graph's own name. `--source=both` is what joins them.

### Bug 2 — energy on a temperature binding

`upt eval "k_B*T/e" T=22eV` exits 0, prints the `k_B T` note, and prints `22`. `upt eval "k_B*T" T=22eV` prints `3.5247885948e-18`, which is `22 * e` in joules. `upt eval 22eV` still exits 2 (`eV` is a free symbol). `T=300K` is `4.141947e-21`. `T=25degC` is `4.1164049935e-21`.

### Bug 3 — evaluate be-16

Exit 1: `evaluateBridge: be-16 has no id-keyed evaluator. Landauer energy is BridgeEquations.landauerEnergy({ temperature_K }). From the CLI: upt explain landauer-erasure-energy temperature=300`. `upt evaluate be-42` names `BridgeEquations.hawkingTemperature({ M_kg })` and `upt explain hawking-temperature mass=1.989e30`. `upt explain hawking-temperature mass=1Msun` still prints `6.1684e-8`, spread 0, agreement by construction.

### Bug 4 — search tokens

`upt search radiation pressure` and `upt search "radiation pressure"` both exit 0 with the same three matches: be-64, be-66, and the quantity `radiation-pressure`. `upt search magnetic-flux-density` exits 0 (the query is printed as three words) and finds `CE-poynting-flux` and the quantity `magnetic-flux-density`.

### Bug 5 — prefixes, constants, permeability

| command | exit | printed |
|---|---|---|
| `upt eval m_p` and `upt eval m_proton` | 0 | both `1.67262192369e-27` |
| `upt eval N_A` | 0 | `6.02214076e+23` |
| `upt eval F` | 0 | `96485.33212331001` |
| `upt eval "F/(N_A*e)"` | 0 | `1` |
| `upt eval B B=12nT` | 0 | `1.2000000000000002e-8` |
| `upt eval B B=12uT` | 0 | `0.000012` |
| `upt eval B B=12e-9T` | 0 | note that bare `T` is the tesla, value `1.2e-8` |
| `upt eval "12e-9/sqrt(mu0*14e6*m_p)"` | 0 | `69954.13706220593` |
| `upt derive velocity:velocity B:magnetic_field mu0:permeability rho:density --formula "B/sqrt(mu0*rho)"` | 0 | unique monomial, prefactor `1.0000e+0` |
| `upt derive velocity:velocity B:magnetic_field mu_0:mu_0 rho:mass/length^3 --formula "B/sqrt(mu_0*rho)"` | 2 | `unrecognized dimension term 'mu_0'` |

`sigma` is still free. `sigma_sb` is `5.670374419e-8`. `M_PROTON_SI` is now a root export and equals `m_p`. The leftover is the dimension spelling `mu_0`.

### Bug 6 — audit heading

DERIVED 79, DECOY 7, OPEN 23. The decoy line names `CE-point-charge-field`, `CE-larmor-power`, `CE-field-energy-density`, `CE-rydberg-energy`, `CE-classical-electron-radius`, `CE-bohr-magneton`, `CE-bohr-radius`.

### Bug 7 — two names for B

Both cyclotron explains exit 0 and recover `1.1495e+0` through `CE-cyclotron-frequency`. The flux-density call lists `magnetic-field` among the known inputs. It no longer suggests the wire law.

### Bug 8 — chain

Exit 2. The text says the orchestrator stays internal, a chain is provisional and does not derive `formally-proved`, `be16Edge.confidence` stays `speculative`, and `upt atlas be-16` shows the kind-bridge formalRef. The design URL is the GitHub blob linked above.

`upt atlas be-16` prints `PhysJS.Landauer.erasure_eq` at pin `d917fa328039d19c3659f74ea73569effb3ed4fb`, kind `bridge`, then: "This command prints the stored catalog formalRef. It does not derive formally-proved from it." It adds that `be16Edge.confidence` is `speculative`, that `composeEdges` of be-42 with be-16 is `highly-speculative`, and that the formalRef does not make the chain formally-proved. `upt atlas be-57` still exits 1: no formalRef.

`composeEdges(be42Edge, be16Edge).evaluate({ mass: 1.989e30 })` is `5.903143823302079e-31` J, confidence `highly-speculative`, id `be-42>>be-16`.

### Bugs 9–14

Debye derive, same formula as the 2.0.0 report, still exits 0 with two groups `length^3 · n` and `length · eps0 · kT · e^-2`. The formula dimension is still `[length]`.

```
upt map --equation-only --equation "pressure = intensity/c"
```

Exit 0. `UNKNOWN: RHS is [L^-1 T] but the target is [L^-1 M T^-2]`. The placeholder `intensity` is dimensionless, and the line says that is not a failed check. A new hint follows: did you mean `incident-intensity`, `poynting-flux`, `radiative-flux`, `transmitted-intensity`. The dimension line is still the wrong one.

Connectors: 20 isolated bridges have a same-kind connector, 11 are truly unconnected, the same eleven ids as in the 2.0.0 report. `foerster-radius ≟ schwarzschild-radius` is still on the screen. The pointer is still the repository path. `be-68` is in the isolated list.

`upt regime oscillators --at theta0=0.2` still exits 0. The pendulum bridge is the one that is valid at `theta0=0.2`.

The conventions that held in 2.0.0 still hold: `upt eval e` is `1.602176634e-19`; `E` exits 2 and says energy; `euler` is refused; `1-e^2` exits 2 and names `one_minus_e_sq`; `mu0*eps0*c^2` is `1`; `log(10)` is `2.302585092994046`; `log10(10)` is `1`; `ln2` is `0.6931471805599453`. `k_B*298.15/e*ln(10)` and the `log(10)` form both print `0.05915934968478234`. `k_B/e` is `0.00008617333262145179`.

`upt evaluate be-64` at `M_kg=1.989e30` and at `M_kg=1Msun` both print `L_Edd_W = 1.2574382573536063e31`, `L_Edd_solar = 32848.43932480685`, with the same `Msun` versus IAU `GM☉` note. be-61, be-58, and be-56 print the same central values as in the 2.0.0 report (`425.08278457881806 ± 7.46`, `1.6567788e-17 ± 5.52e-21`, Casimir pressure `-13.001257732443651`). `L0` is still `2.443004509073667e-8 ± 0`.

One-word searches that still exit 1: `piezo`, `magnetostriction`, `vegard`, `nernst`, `seebeck`, `faraday`, `optomechanics`, `strain`, `pyroelectric`. `upt search debye length` still exits 1. `upt search alfven` now exits 0 on be-67.

## (b) BE-66, BE-67, BE-68

Catalog rows 66–68 are `established`. Each row object still has `formalRef: null` (the overlay is what `upt atlas` prints). Root exports used here: `evaluateRadiationPressure`, `evaluateAlfvenSpeed`, `evaluateTolmanEhrenfest`, `tolmanTemperatureAt`, `alfvenProtonOnlyDensity`, `M_PROTON_SI`, `be66Edge`, `be67Edge`, `be68Edge`, and `BridgeEquations.radiationPressure`, `.alfvenSpeed`, `.tolmanEhrenfest`.

Edge confidence is `established` on all three. Kind is `law`. The published edge comment says the overlay formalRef is kind `bridge`, so each id is a seed, and a proof does not promote the confidence field.

### Search, explain, evaluate

`upt search radiation pressure`, `radiation-pressure`, `alfven`, `alfven-speed`, `tolman`, and `ehrenfest` all exit 0 and name the new bridge.

```
upt explain radiation-pressure poynting-flux=1e6 reflectance=0 incidence-angle=0
```

Exit 0. Determined via be-66. Text value `3.3356e-3`. JSON `recoveredValue` is `0.0033356409519815205` for `R=0`, and `0.006671281903963041` for `reflectance=1` at normal incidence.

```
upt explain alfven-speed magnetic-flux-density=12e-9 plasma-mass-density=2.341670693166e-20
```

Exit 0. Text value `6.9954e+4` via be-67.

```
upt explain tolman-invariant proper-temperature=5800 metric-g00=-0.9999957549948597
```

Exit 0. Text value `5.8000e+3`. JSON `recoveredValue` is `5799.987689472028`. The text rounding is bug N2 below.

`upt evaluate` with no id lists be-66 (`I_W_per_m2`, `R`, `theta_rad`), be-67 (`B_T`, `rho_kg_per_m3`), and be-68 (`T_K`, `g_00`).

| command | printed |
|---|---|
| `upt evaluate be-66 I_W_per_m2=1e6 R=0 theta_rad=0` | `P_Pa = 0.0033356409519815205` |
| `upt evaluate be-66 I_W_per_m2=1e6 R=1 theta_rad=0` | `P_Pa = 0.006671281903963041` |
| `upt evaluate be-66 I_W_per_m2=1e6 R=0.5 theta_rad=0` | `P_Pa = 0.005003461427972281` |
| `upt evaluate be-66 I_W_per_m2=1e6 R=1 theta_rad=0.7853981633974483` | `P_Pa = 0.0033356409519815214` |
| `upt evaluate be-67 B_T=12e-9 rho_kg_per_m3=2.341670693166e-20` | `v_m_per_s = 69954.13706220593` |
| `upt evaluate be-67 B_T=12nT rho_kg_per_m3=2.341670693166e-20` | `v_m_per_s = 69954.13706220595`, with `12nT → 1.2e-8 T` |
| `upt evaluate be-68 T_K=5800 g_00=-1` | `invariant_K = 5800` |
| `upt evaluate be-68 T_K=5800 g_00=-0.9999957549948597` | `invariant_K = 5799.987689472028` |
| `upt evaluate be-68 T_K=5800 g_00=0.5` | exit 1, `g_00 must be finite and < 0` |

`alfvenProtonOnlyDensity(14e6)` is `2.3416706931660002e-20` kg/m³. That is the density used above (`n m_p` at `n = 14e6 m^-3`). The speed matches the 2.0.0 proton-only figure. The 2.0.0 report compared `69.95 km/s` with Louarn et al., Astron. Astrophys. **656**, A36 (2021), doi:10.1051/0004-6361/202141095, whose sentence is `V_a ∼ 60 km/s`. That paper was not re-opened this session.

`tolmanTemperatureAt(5800, g_00)` with the solar `g_00` below returns `5800.012310554101`. That is the proper temperature whose invariant equals 5800 K.

The `g_00` used above is `-(1 - 2 GM_SUN_SI / (R c²))` at `R = 6.957e8 m`: `2 GM_SUN_SI / (R c²) = 4.245005140290713e-6`, so `g_00 = -0.9999957549948597`. The fractional gap `(5800 - 5799.987689472028) / 5800` is the weak-field `GM/(R c²)` scale. It is computed from the package constants. No laboratory temperature was opened.

OpenStax University Physics Volume 2, §16.4, https://openstax.org/books/university-physics-volume-2/pages/16-4-momentum-and-radiation-pressure , states the time-averaged pressure `I/c` for a perfect absorber and `2I/c` for a perfect reflector at normal incidence. The same text is numbered 16.5 on Physics LibreTexts. The be-66 edge citation says `OpenStax University Physics Vol. 2 §16.5` and says the `(1+R) cos²θ` factor is the catalog's assembly. The evaluated endpoints match the absorber and the reflector. The oblique value at `θ = π/4` and `R = 1` is `I/c`, which is `(2I/c) cos²(π/4)`.

### Evidence grade

```
upt atlas be-66
upt atlas be-67
upt atlas be-68
```

Each exits 0, says the id is a catalog equation rather than an atlas bridge, prints kind `bridge` at the same PhysJS pin as be-16, and then says the command prints the stored formalRef and does not derive `formally-proved` from it.

| id | theorem | covers, as printed |
|---|---|---|
| be-66 | `PhysJS.RadiationPressure.pressure_eq` | `P_n = (I/c)(1+R) cos²θ`. `R = 0`, `θ = 0` is `I/c`. `R = 1`, `θ = 0` is `2I/c`. Homogeneity leaves `C` unfixed. Not the Maxwell stress tensor, and not the Eddington luminosity. |
| be-67 | `PhysJS.AlfvenSpeed.speed_eq` | phase speed `B/√(μ0 ρ)` for one transverse polarization. `ρ` is the total mass density. Proton-only `n m_p` is a different density when electrons contribute. A Gaussian `4π` is not the SI speed. |
| be-68 | `PhysJS.TolmanEhrenfest.hydrostatic_constant` | `T √(-g_00)` equal at the endpoints when `g_00 < 0`, from hydrostatic balance and the equilibrium Gibbs relation. The 1930 `T √g_44` agrees when `g_44 = -g_00`. Not a horizon temperature and not `PhysJS.HawkingUnruh.dictionary`. |

```
upt map --source=catalog --evidence=formally-proved
```

Exit 0. `16 of 49 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. be-66, be-67, and be-68 are among the eight isolated edges that the filter keeps, together with be-21, be-40, be-43, be-54, and be-59. be-16 is in the anchored cluster with be-12, be-37, be-27, be-33, and be-63. The grade the 2.0.0 atlas page refused to derive is the grade this filter keeps.

### Composition

The only catalog edges whose endpoints are `radiation-pressure`, `alfven-speed`, `tolman-invariant`, `poynting-flux`, `plasma-mass-density`, or `proper-temperature` are be-66, be-67, and be-68 themselves. They share no quantity with each other or with be-16, be-42, or be-64.

| call | result |
|---|---|
| `composeEdges(be42Edge, be16Edge)` | `5.903143823302079e-31` J, `highly-speculative` |
| `composeEdges(be68Edge, be16Edge)` | `CompositionJunctionError`: target `tolman-invariant` matches none of `temperature` |
| `composeEdges(be16Edge, be68Edge)` | `CompositionJunctionError`: target `landauer-erasure-energy` matches none of `proper-temperature`, `metric-g00` |
| `composeEdges(be66Edge, be67Edge)` and the swap | `CompositionJunctionError` on `radiation-pressure` versus the Alfvén sources, and on `alfven-speed` versus the radiation-pressure sources |

`upt map --equation-only --equation "radiation_pressure = poynting-flux/c"` exits 0, dimension `[L^-1 M T^-2]`, and joins the anchored cluster via `poynting-flux` and `radiation-pressure`. Nearest equations include be-66 and `CE-poynting-flux`. `upt derive` of `pressure ∝ intensity/c` still says no canonical equation has that target, so it does not name be-66. The Alfvén map of `alfven_speed = magnetic_flux_density/sqrt(mu_0*density)` joins via `alfven-speed` and lists be-67 among the nearest equations.

A hand product of the two speeds is in candidate 1. It is not a `composeEdges` result.

## (c) New candidates

Every row is unproven. The three bridges above are the relations the 2.0.0 report asked for; they are not re-proposed. Piezoelectricity, the Nernst scale, Larché–Cahn, Mott, Abraham–Minkowski, magnetostriction, Debye length, and plasma β were searched again and are still absent, except where a search word now hits a different law (`thomson` hits be-64, be-66, and `CE-thomson-cross-section`; `einstein relation` hits `CE-planck-einstein`).

### 1. Perpendicular fast magnetosonic speed — fluid ↔ plasma — partial, not a monomial

- **Formula.** For propagation perpendicular to a uniform field, the fast mode has `ω² = (c_s² + c_A²) k_⊥²`, with `c_A = |B| / sqrt(μ0 ρ)` and `c_s = sqrt(γ p / ρ)`. The slow mode has `ω² = 0` in that limit.
- **Dimensional check.** `{v_fast, v_A, c_s}` is `multiple-invariants`: `v_fast / v_A` and `v_fast / c_s`. `dimensionallyDetermines` is false. The sum of squares is not a monomial.
- **Composition check.** be-67 produces `alfven-speed`. `CE-sound-speed` and `ab-sound-speed` exist (`upt search sound speed` exits 0). No catalog edge takes both. `composeEdges` cannot see the sum.
- **Numeric check.** Illustration on the same rounded inputs as the 2.0.0 report, proton-only density, `γ = 5/3`. `p = 300 eV/cm³ = 4.8065299019999995e-11 Pa`, `c_s = 58489.41649057923 m/s`, `v_A = 69954.13706220593 m/s`, `sqrt(v_A² + c_s²) = 91184.39084364349 m/s`. Not a measured phase speed. Louarn was not re-opened, and this session does not compare the sum to the paper's flow speed.
- **Source opened.** Anthony Yeates, MHD lecture notes, §5.6, https://www.maths.dur.ac.uk/users/anthony.yeates/NOTES/mhd_notes/_book/dynamics.html . Equation (5.25) at `k_∥ = 0` is the perpendicular fast mode. The notes set `γ = 5/3` for a hydrogen plasma and define `c_A` in the SI form be-67 evaluates. Alfvén 1942 was not opened. The be-67 edge prints `Alfvén 1942 Nature 150:405`; that page was not opened here.
- **Regime.** Ideal MHD, homogeneous background, perpendicular propagation, adiabatic closure. Not a kinetic dispersion relation. be-67's covers line already excludes that.
- **Known.** The notes. The gap is that the proved Alfvén edge and the existing sound speed do not meet.
- **Next step.** A composition whose inputs are `alfven-speed` and `sound-speed`, with the perpendicular limit stated. Not a `monomial_form` proof.

### 2. Electrical Einstein relation — electrochemistry ↔ diffusion — partial

- **Formula.** `D = μ_q k_B T / q`, with `μ_q` the electrical mobility (drift speed per electric field).
- **Dimensional check.** One group `D · μ^-1 · kT^-1 · q`. `dimensionallyDetermines` is true, monomial `{μ: 1, kT: 1, q: -1}`, `upToDimensionlessConstant: true`. The constant is unfixed by units.
- **What already exists.** `ab-stokes-einstein` is the Stokes form `D = k_B T / (6 π η a)`. `CE-carrier-mobility` is `μ = q τ / m`. `upt search einstein relation` exits 0 on `CE-planck-einstein` only. `upt search nernst-einstein` exits 1.
- **Numeric check.** None. No specimen diffusivity was opened. `k_B/e = 8.617333262145179e-5 V/K` is the voltage scale, computed from the package constants.
- **Source opened.** Einstein relation (kinetic theory), https://en.wikipedia.org/wiki/Einstein_relation_(kinetic_theory) . The page states `D = μ k_B T` for the force-mobility, `D = μ_q k_B T / q` for electrical mobility, and the Stokes–Einstein–Sutherland form. The same page states a Fermi-liquid form `D = μ_q E_F / q`. That second form is why a metal is not this monomial; it is the same two-invariant shape as the Mott note in the 2.0.0 report.
- **Regime.** Classical, dilute, non-degenerate. The page says the classical relation is modified for a Fermi liquid.
- **Known.** Sutherland, Einstein, Smoluchowski, as that page names them. The Stokes form is already an atlas bridge. The electrical form is the gap.
- **Next step.** An L1 relation beside `CE-carrier-mobility`, distinct from `ab-stokes-einstein`. Not a unique-monomial proof of the `6π`.

### 3. Clapeyron slope — thermodynamics ↔ phase change — partial

- **Formula.** `dP/dT = L / (T Δv) = Δs / Δv` along a coexistence curve.
- **Dimensional check.** Specific latent heat and specific volume: one group `dP/dT · L^-1 · T · Δv`. Monomial `{L: 1, T: -1, Δv: -1}`, constant unfixed.
- **What already exists.** `upt search clausius` exits 0 on `CE-clausius-entropy` only (`ΔS` from heat over temperature). It does not name the coexistence slope.
- **Numeric check.** None. No vapor-pressure table was opened. A latent-heat number in a course PDF was not used.
- **Source opened.** Clausius–Clapeyron relation, https://en.wikipedia.org/wiki/Clausius–Clapeyron_relation . The page states `dP/dT = L / (T Δv) = Δs / Δv`.
- **Regime.** Two-phase equilibrium of one constituent. The ideal-gas vapor approximation that drops the liquid volume is a further step, and this session did not evaluate it.
- **Known.** The page names Clapeyron and Clausius. Absent from the registries as a slope.
- **Next step.** A derivative relation beside `CE-clausius-entropy`. The entropy-over-volume form is the bridge; the monomial only recovers the dimension of the slope.

### 4. Gravitational frequency shift — gravitation ↔ optics — unproven, not a monomial

- **Formula people write.** A fractional frequency shift of order `ΔΦ / c²` in a weak static field. BE-68 is `T √(-g_00)` for proper temperature. The covers line says it is not a horizon temperature and not the Hawking–Unruh dictionary. It does not state a photon frequency.
- **Dimensional check.** `{z, Φ, c}` is two groups: `z`, and `Φ · c^-2`. `dimensionallyDetermines` is false. Dimensions do not entail the identification.
- **Numeric check.** None taken from a measurement. Half of the section (b) compactness `2 GM_SUN_SI / (R c²) = 4.245005140290713e-6` is `GM_SUN_SI / (R c²) = 2.1225025701453565e-6`, computed from the package constants. Pound and Rebka, Phys. Rev. Lett. **4**, 337 (1960), doi:10.1103/PhysRevLett.4.337, is the experiment. The PDF text retrieved this session did not preserve a clean exponent, and the abstract page had no abstract body, so no measured fraction is used.
- **Search.** `upt search redshift` and `upt search gravitational redshift` exit 1.
- **Known.** The 1960 letter. Not a second copy of BE-68.
- **Next step.** A specification section that states the frequency shift and says it is not `PhysJS.TolmanEhrenfest.hydrostatic_constant`. Do not chain it through be-42.

### 5. Kelvin relation — thermoelectric linkage — partial, no paper opened

- **Formula people write.** Peltier coefficient `Π = S T`, with `S` the Seebeck coefficient.
- **Dimensional check.** `{Π, S, T}` with `Π` a voltage and `S` a voltage per kelvin: one group `Π · S^-1 · T^-1`. Monomial `{S: 1, T: 1}`, constant unfixed.
- **Search.** `upt search peltier` and `upt search seebeck` exit 1. `upt search thomson` does not find a thermoelectric coefficient.
- **Numeric check.** None. Kelvin's paper was not opened, so this row does not cite a measured thermopower. It is the dimensional scale, recorded because both names are still absent after the 2.0.0 Mott note.
- **Next step.** Open the relation before encoding it. Not a monomial proof.

### Negative and already present

London penetration on `{λ, m, μ0, n, e}` is two groups, `λ³ n` and `λ m μ0^-1 e^-2`, the same non-uniqueness as Debye length. `upt search london` exits 1. Not a new monomial. Skin depth is already `case-skin-depth` (`upt search skin depth` exits 0). Magnetic pressure is still absent (`upt search magnetic pressure` exits 1) and is the factor-of-two definition inside the 2.0.0 plasma-β note, not a new bridge. Magnetostriction, pyroelectricity, electrostriction, Vegard, Saha, Soret, Grüneisen, Joule–Thomson, Verdet, Pockels, and optomechanics still have no search hit. Those were not given formulas this session.

## (d) New bugs and friction

Ranked by what this session hit. No code change is in this report. The residual of bug 5 (`mu_0` as a dimension term) stays in the table above.

### High

N1. **`upt explain` accepts the keys `upt evaluate` prints, exits 0, and says there is no path.** The evaluate listing for be-66 is `I_W_per_m2`, `R`, `theta_rad`. The explain that works is `poynting-flux`, `reflectance`, `incidence-angle`.

```
upt explain radiation-pressure I=1e6 R=0 theta=0
```

Exit 0. `cannot be determined from {I, R, theta}`. It then says knowing one of `incidence-angle`, `poynting-flux`, `reflectance` would unblock it.

```
upt explain alfven-speed B_T=12e-9 rho_kg_per_m3=2.34e-20
```

Exit 0. `cannot be determined from {B_T, rho_kg_per_m3}`, and it names `magnetic-flux-density` and `plasma-mass-density`.

```
upt explain tolman-invariant T_K=5800 g_00=-1
```

Exit 0. `cannot be determined from {T_K, g_00}`, and it names `metric-g00` and `proper-temperature`.

The same calls with the graph names recover the values in section (b). A reader who copies the evaluate keys gets a successful-looking miss.

### Medium

N2. **The text report rounds away the Tolman correction that the JSON keeps.** `upt explain tolman-invariant proper-temperature=5800 metric-g00=-0.9999957549948597` prints `5.8000e+3`. The JSON `recoveredValue` is `5799.987689472028`. `upt evaluate be-68` prints the full invariant. The fractional shift on these inputs is about `2.12e-6`. Five significant figures in the text make the metric look idle.

### Low

N3. **`upt evaluate --help` still says the closed-form range is BE-51/52/55..65.** The no-argument listing includes be-66, be-67, and be-68, and those commands exit 0.

N4. **`upt derive` of the radiation-pressure monomial does not name be-66.** It recovers prefactor 1 and says no canonical equation has that target. The catalog equation is be-66, on the quantity `radiation-pressure`. The map of an explicit `radiation_pressure = poynting-flux/c` does name be-66.

N5. **The be-66 citation says OpenStax §16.5.** The OpenStax site numbers that section 16.4. LibreTexts numbers the same chapter 16.5. The edge text already says `(1+R) cos²θ` is the catalog's assembly, which matches the OpenStax page stating only the normal-incidence absorber and reflector.

### MathTS, as distinct from UPT

What held, again: bare `e` is the charge; `exp(1)` is Euler's number; `euler` is refused; `1-e^2` names `one_minus_e_sq`; `log` is `ln` and `log10` exists. The new failures are UPT's explain bindings (N1), UPT's text rounding (N2), and the help range (N3). Buckingham on the Debye set is the same valid null-space basis as in the 2.0.0 report.

### Not opened, so not used as a number

Alfvén 1942 (the be-67 edge prints Nature 150:405; that page was not opened); Louarn 2021 beyond the comparison already printed in the 2.0.0 report; Pound and Rebka's measured fraction (the retrieved PDF did not preserve a clean exponent); a vapor-pressure table; a specimen diffusivity or mobility; Kelvin's thermoelectric paper; a Verdet constant; a London depth; Maxwell 1873. Where a computed stand-in appears above, it is marked as computed.
