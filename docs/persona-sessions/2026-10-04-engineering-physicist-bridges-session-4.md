# Engineering physicist — bridge dogfood of published 3.1.0, 2026-10-04

Model-persona session against the published package `universal-physics-tensor@3.1.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-310`: `npm init -y && npm i universal-physics-tensor@3.1.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@3.1.0 version gitHead --prefer-online` printed `3.1.0` and `d5db9af65c27c3796d9bde37b7f286923ef12c9d`. Annotated tag `v3.1.0` is object `8d110b6d26cbe3e40ef608446aa2bd0a17cb573c` and its target is that commit. The publish workflow is run `37209533226`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v3.1.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `3.1.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

This session is the engineering-physicist round. Issue #348's written rotation starts at condensed-matter and does not name an engineering physicist. The task for this round places the engineering physicist first, then condensed-matter, plasma/space, thermal/chemical engineering, relativity/astro, optics/photonics, and acoustics/continuum mechanics. The next persona on that list is condensed-matter. The workflows exercised here are electromechanical transducers, heat transfer and thermoelectrics, fluid and structure, semiconductor devices, power and RF, sensors, and control-relevant dimensionless groups.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 66. Status counts: 30 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–76, with 54 still printed before 53. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 345 quantities, 6 applied cases.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-310`. "Printed" is the output of `universal-physics-tensor@3.1.0`.

### The 3.0.0 repros that 3.1.0 closed

| # | status | what 3.1.0 printed |
|---|---|---|
| R3-1 | fixed | `upt explain fast-magnetosonic-speed` with the earlier inputs recovers `91184.3908436435` via be-69 and says the encoded formula adds dimensionful terms. It does not print `∝`. |
| R3-2 | fixed | `upt explain gravitational-frequency-ratio g1=-1 g2=-4` recovers `2` and says the inputs do not fix a unique monomial. |
| R3-3 | fixed | `upt explain not-a-quantity-xyz` exits 1 and suggests `` `upt search not` ``. `upt search a` still finds the quantity `a`. |

`upt help evaluate` names `BE-51/52/55..76`. `upt regime plasma` and `upt regime piezoelectricity` exit 0 and say no machine condition was evaluated.

### BE-74, BE-75, BE-76

`upt atlas be-74`, `be-75`, and `be-76` print `PhysJS.MagneticPressure.pressure_eq`, `PhysJS.LondonPenetration.depth_eq`, and `PhysJS.PlasmaBeta.beta_eq` at pin `ee753df77bd5b29b7207443181606b6004bfcf6a`, kind `bridge`, and say the command does not derive `formally-proved` from the stored reference. The Lean paths are `lean/MagneticPressure.lean`, `lean/LondonPenetration.lean`, and `lean/PlasmaBeta.lean`.

| command | exit | printed |
|---|---|---|
| `upt evaluate be-74 B_T=1` | 0 | `p_Pa = 397887.35751312086` |
| `upt explain magnetic-pressure magnetic-flux-density=1` | 0 | recovered `397887.357513121`. The sentence says the encoded formula carries dimensionful constants. |
| `upt evaluate be-75 m_kg=9.1093837015e-31 n_per_m3=1e28` | 0 | `lambda_m = 5.314093261582035e-8` |
| `upt explain london-penetration-depth effective-mass=9.1093837015e-31 carrier-density=1e28` | 0 | recovered `5.31409326158204e-8`. Same dimensionful-constants sentence. |
| `upt evaluate be-76 n_per_m3=1e20 T_K=300 p_B_Pa=397887.3577297383` | 0 | `beta = 0.00000104098482134066` on the explain of the same inputs |
| `upt explain plasma-beta carrier-density=1e20 temperature=300 magnetic-pressure=397887.3577297383` | 0 | same sentence as be-74 and be-75 |

The library evaluator at `B_T = 1` returns the same pressure, `397887.35751312086`. `1/(2 · 4π · 10⁻⁷)` is `397887.35772973835`. The ratio is `0.9999999994555809`. `upt eval mu0` is `0.0000012566370621200546`. `4π · 10⁻⁷` is `0.0000012566370614359173`. `mu0*eps0*c^2` is `1`. Plasma beta from the package pressure, `n = 1e20`, `T = 300`, is `0.0000010409848219073948`. `2 μ0 n k_B T / B²` at `B = 1` is `0.0000010409848213406626`. The ratio is `1.0000000005444192`. Quantity-name `composeEdges(be74Edge, be76Edge)` has id `be-74>>be-76`, confidence `established`, kind `bridge`, and returns that beta. The reverse compose throws `CompositionJunctionError`.

`upt map --source=catalog --evidence=formally-proved` exits 0: `24 of 57 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76. `upt audit --source=catalog` exits 0: DERIVED 15, DECOY 8, NOT A MONOMIAL 5, OPEN 29. be-74 is `+[ℏ,c,e] ×5.452e+0 (empirical/tuned constant)`. be-75 and be-76 are in the decoy list. be-69 is in NOT A MONOMIAL. Canonical audit: DERIVED 79, DECOY 7, NOT A MONOMIAL 0, OPEN 23.

The dimensionful-constants sentence on be-74, be-75, and be-76 is the sentence the 3.1.0 changelog records for a formula whose constants are baked in. It is not filed here.

### Engineering cases already in the package

| command | exit | printed |
|---|---|---|
| `upt evaluate case-skin-depth` copper example (`rho_ohm_m=1.68e-8`, `f_Hz=1MHz`, `l_mfp_m=39nm`, `v_carrier_m_per_s=1.57e6`, `thickness_m=1mm`) | 0 | `delta_m = 0.0000652341146231142`, QUALIFIED |
| same case, `rho_ohm_m=1800`, `f_Hz=1MHz`, `thickness_m=1m` | 3 | `delta_m = 21.352876296703318`, `delta_maxwell_m = 22.44734623806739`, `maxwell_deviation = -0.0487572085250777`, good-conductor and thick VIOLATED |
| `upt evaluate case-lumped-cooling` help example (`a_m=5mm`, copper, `h=20`, `emissivity=0.05`, `T0_K=100degC`, `T_inf_K=20degC`, `t_s=300`) | 0 | `tau_s = 286.6004166666667`, `Bi = 0.00008312551953449709`, `T_K = 321.236052397565`, `parent_deviation = -0.000052203242016934936`, QUALIFIED |
| `upt evaluate be-58 T_K=300 R_ohm=1kohm` | 0 | `S_V_V2_per_Hz = 1.6567788e-17` |
| `upt evaluate be-61 sigma_S_per_m=5.96e7 T_K=293.15` | 0 | `kappa_W_per_mK = 426.8353960136274`, `L0_W_ohm_per_K2 = 2.443004509073667e-8` |
| `upt evaluate be-73 S_V_per_K=200e-6 T_K=300` | 0 | `Pi_V = 0.060000000000000005` |
| `upt evaluate be-70 mu_m2_per_Vs=0.14 T_K=300 q_C=-1.602176634e-19` | 0 | `D_m2_per_s = -0.0036192799701009757` |
| same with both signs negative | 0 | `D_m2_per_s = 0.0036192799701009757` |
| `upt explain force viscosity=1e-3 radius=1e-6 speed=1e-4 --source=canonical` | 0 | recovered `1e-13` via CE-stokes-drag |
| `upt explain dynamic-pressure density=1000 flow-velocity=2 --source=canonical` | 0 | recovered `4000` |
| `upt explain laplace-pressure surface-tension=0.072 droplet-radius=1e-3 --source=canonical` | 0 | recovered `72` |
| `upt explain hall-coefficient carrier-density=1e22 charge=-1.602176634e-19 --source=canonical` | 0 | recovered `-0.000624150907446076` |
| `upt explain sound-speed pressure=1e5 density=1.2 --source=canonical` | 0 | cannot be determined; proportionality only. Adding `gamma=1.4` exits 1: `gamma` did not resolve |

The copper skin depth is the case's own example scale, about 65.234 µm. The lumped time constant is `ρ c a / (3 h)`. The Hall number is `1/(n q)`. Johnson–Nyquist is `4 k_B T R`. Wiedemann–Franz prints `L0 = (π²/3) (k_B/e)²`. The catalog note on be-61 already records the degenerate-limit caveat, including copper near 0 °C. Kelvin is `Π = S T`.

### Conventions

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and says energy, and names `upt eval E E=1eV`. `exp(1)` is `2.718281828459045`. `euler` is refused and names `exp(x)`. `1-e^2` exits 2: `e` is the elementary charge and is not dimensionless. `upt eval F` is `96485.33212331001`. `upt eval G` is `6.6743e-11`. `upt eval B B=1G` exits 0, says bare `G` is the gauss (`1e-4 T`), and prints `0.0001`. `upt eval B B=1gauss` exits 1. `convertValue` of `25degC` to `K` is `298.15`. `1 bar` to `Pa` is `100000`. `1 atm` to `Pa` is `101325`. `degF` is refused, which is what `upt help evaluate` says. `psi`, `torr`, `inch`, `cP`, `hp`, `BTU`, and the spelled unit `gauss` are unknown.

### Search

Exit 1, no entry: `poiseuille`, `hagen`, `pipe flow`, `friction factor`, `darcy`, `buckling`, `euler buckling`, `pull-in`, `pull in`, `mems`, `electrostatic`, `mott-gurney`, `mott gurney`, `child-langmuir`, `child langmuir`, `space charge`, `shockley`, `diode`, `ideal diode`, `van der pauw`, `four-point`, `four point`, `sheet resistance`, `shot noise`, `schottky`, `wheatstone`, `strain gauge`, `gauge factor`, `nusselt`, `reynolds`, `prandtl`, `grashof`, `stanton`, `peclet`, `mach`, `knudsen`, `added mass`, `view factor`, `radiation shield`, `poole`, `frenkel`, `richardson`, `thermionic`, `depletion`, `built-in`, `built in voltage`, `coax`, `friis`, `antenna`, `piezoelectric`, `piezo`, `figure of merit`, `lmtd`, `fin efficiency`.

Exit 0, and the hit is a different law: `thomson coefficient` returns be-73 only. `skin depth` returns be-75 and `case-skin-depth`. `onsager` returns be-73. `biot` returns `case-lumped-cooling`. `seebeck` and `peltier` return be-73 and quantities. `stokes` returns be-70's description, `CE-stokes-drag`, `CE-stokes-einstein`, `model-stokes-drag`, and `ab-stokes-einstein`. `bernoulli` returns `CE-bernoulli`. `hall coefficient` returns `CE-hall-coefficient`. `conductivity` also hits Casimir through a description word. That hit is labeled.

`magnetic pressure`, `london penetration`, and `plasma beta` exit 0 on be-74, be-75, and be-76. Those three are the round-3 candidates and are not re-proposed.

## (b) New candidates

Each row is **unproven**. The dimensional check is the `upt derive` that was run. A recovered prefactor is the command's report of the formula that was typed. No measurement was opened for any of these. `docs/research/canonical-expansion-candidate-audit.md` already names Hagen–Poiseuille as a two-length backlog example and does not encode it. The spec's four-point function (be-35) is the conformal crossing equation, not a sheet-resistance probe. be-58 is `S_V = 4 k_B T R`. be-73 is `Π = S T`, and its proof-status paragraph says the first Thomson relation `μ = T dS/dT` is a different equation. `CE-equipartition` is `(3/2) k_B T`. `CE-capacitor-energy` latex is `(1/2) C V²`. None of those rows is the identity below.

Candidates named in the earlier dogfood reports and still absent are not re-proposed: piezoelectric reciprocity, Larché–Cahn, Mott thermopower, the Nernst thermal voltage, the Nernst effect, Abraham–Minkowski, magnetostriction, Vegard, Faraday induction, optomechanics, strain, pyroelectricity, electrostriction, Saha, Soret, Grüneisen, Verdet, and Pockels. Skin depth is `case-skin-depth`, `δ = √(2ρ/(ωμ))`, and is not a new bridge. Stokes drag, dynamic pressure, and Laplace pressure are canonical rows; the dropped factor is issue #354.

### 1. Hagen–Poiseuille, and the laminar Darcy number — fluids ↔ continuum — unproven

- **Formula.** Volume flow `Q = π R⁴ ΔP / (8 μ L)`. With `D = 2R` and `Q = v π R²`, the Darcy friction factor defined by `f_D = (ΔP/L) D / (ρ v² / 2)` satisfies `f_D Re = 64`.
- **Why units are not enough.** `upt derive volume_flow:L^3/T R:L dP:pressure mu:viscosity Lpipe:L --formula "pi*R^4*dP/(8*mu*Lpipe)"` exits 3. Two groups: `volume_flow · R^-3 · dP^-1 · mu` and `R · Lpipe^-1`. The formula dimension is `[L^3 T^-1]` and matches. There is no single prefactor. The `8` and the `π` are not recovered. Two dimensionless groups do not pick `f_D Re = 64`.
- **Proof-sketch premises.** Steady incompressible Newtonian flow in a straight circular pipe, no-slip, fully developed, axial pressure gradient only. Integrate the parabolic profile. The Darcy definition is then algebra on that profile. Other duct shapes change the number. The research note already records the two-length exclusion. It does not state a PhysJS theorem.
- **Opened.** No pipe-flow measurement.

### 2. Euler buckling, pinned–pinned — structures ↔ elasticity — unproven

- **Formula.** `P_cr = π² E I / L²` for a pinned–pinned column.
- **Why units are not enough.** `upt derive Pcr:force Emod:pressure Isec:L^4 Lbeam:length --formula "pi^2*Emod*Isec/Lbeam^2"` exits 3. Two groups: `Pcr^2 · Emod^-2 · Isec^-1` and `Pcr · Emod^-1 · Lbeam^-2`. The formula dimension is `[force]` and matches. Units give `P = E L² f(I/L⁴)`. They do not give `π²`. A cantilever replaces `π²` by `π²/4`. That factor is the same eigenvalue with a different length.
- **Proof-sketch premises.** Euler–Bernoulli beam, `E I y'' = −P y`, pinned ends `y(0) = y(L) = 0`, lowest eigenvalue `(π/L)²`.
- **Opened.** No column test.

### 3. Parallel-plate electrostatic pull-in — electromechanics — unproven

- **Formula.** Equilibrium `k (g0 − g) = ε0 A V² / (2 g²)`. The fold is at `g = (2/3) g0`, so `V_pi = sqrt(8 k g0³ / (27 ε0 A))`. With `C0 = ε0 A / g0` the same voltage is `sqrt(8 k g0² / (27 C0))`.
- **Why units are not enough.** With `g0` and `A` separate, `upt derive V:energy/charge k:force/length g0:length A:area eps0:eps0 --formula "sqrt(8*k*g0^3/(27*eps0*A))"` exits 3. Groups `g0^2 · A^-1` and `V^2 · k^-1 · g0^-1 · eps0`. The aspect ratio stays free. With capacitance as one input, `upt derive V:energy/charge k:force/length g0:length C:charge^2/energy --formula "sqrt(8*k*g0^2/(27*C))"` exits 0. The monomial is `V ∝ k^0.5 · g0 · C^-0.5`. The recovered prefactor is `5.4433e-1`, which is `sqrt(8/27)` because that factor was typed. No catalog edge is named.
- **Proof-sketch premises.** Parallel plate, linear spring, voltage control, fringing neglected, quasi-static. The fold is `dV/dg = 0`. The `2/3` and the `8/27` are that derivative.
- **Opened.** No MEMS measurement.

### 4. Mott–Gurney — semiconductors ↔ electrostatics — unproven

- **Formula.** `J = (9/8) ε μ V² / d³` for a trap-free solid with drift-only transport.
- **Why units are not enough.** `upt derive J:I/L^2 mu:M^-1.T^2.I V:energy/charge d:length eps0:eps0 --formula "(9/8)*eps0*mu*V^2/d^3"` exits 0. Unique monomial `J ∝ mu · V^2 · d^-3 · eps0`. Recovered prefactor `1.1250e+0`, which is `9/8` because it was typed. `upt search mott-gurney` exits 1. No catalog edge.
- **Proof-sketch premises.** Drift current `J = q n μ E`, Poisson's equation, `E(0) = 0` at the injecting contact, integrate twice. The `9/8` is that integral. This is not the vacuum Child–Langmuir law.
- **Opened.** No space-charge diode measurement.

### 5. Child–Langmuir — vacuum electronics — unproven

- **Formula.** `J = (4 ε0 / 9) sqrt(2 e / m) V^{3/2} / d²`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive J:I/L^2 V:energy/charge d:length m:mass eps0:eps0 e:e --formula "(4*eps0/9)*sqrt(2*e/m)*V^(3/2)/d^2"` exits 3. Two groups: `J^2 · V^-4 · d^3 · m · eps0^-3` and `J^2 · V^-1 · d^6 · m · e^-3`. The formula dimension is `[L^-2 I]` and matches. The `4/9` is not recovered. Without declaring `e` the target is outside the span.
- **Proof-sketch premises.** Collisionless energy `(1/2) m v² = e V`, `J = ρ v`, Poisson, cathode field zero, integrate. Distinct from Mott–Gurney: the carriers are ballistic, and the voltage power is `3/2`.
- **Opened.** No vacuum-diode measurement.

### 6. Shockley ideal diode — semiconductors — unproven

- **Formula.** `I = I_s (exp(e V / (k_B T)) − 1)`. `e` is the elementary charge. Euler's number is the `exp`.
- **Why units are not enough.** `upt derive I:charge/time Isat:charge/time V:energy/charge T:temperature k_B:k_B e:e --formula "Isat*(exp(e*V/(k_B*T))-1)"` exits 3. Groups `I · Isat^-1` and `V · T^-1 · k_B^-1 · e`. The formula dimension is `[I]` and matches. Units make `e V / (k_B T)` dimensionless. They do not produce the exponential or the `−1`. `upt search shockley` and `upt search diode` exit 1.
- **Proof-sketch premises.** Quasi-equilibrium Boltzmann factors on both sides of an abrupt junction, detailed balance at `V = 0`, low injection, ideality 1.
- **Opened.** No diode I–V.

### 7. Thomson coefficient — thermoelectrics — unproven

- **Formula.** `μ_T = T dS/dT`, the first Thomson relation as the be-73 proof-status paragraph names it.
- **Why units are not enough.** `Π` and `S T` already share a dimension, and be-73 is that product. `μ_T` and `S` also share a dimension, so a list `{μ_T, S, T}` without the derivative does not state the relation. `upt search thomson coefficient` exits 0 on be-73 only, because the description contains those words. The spec says the first Thomson relation is not be-73.
- **Proof-sketch premises.** The Onsager equality `L12 = L21` already used for `Π = S T`, plus the entropy flow carried by the charge current. The Thomson heat along a temperature gradient is `T` times the temperature derivative of `S`.
- **Opened.** No thermocouple heat measurement. This is not a second copy of Kelvin `Π = S T`.

### 8. Collinear four-point sheet resistance — sensors ↔ electrostatics — unproven

- **Formula.** `R_s = (π / ln 2) (V/I)` for an infinite thin sheet and four equally spaced collinear probes.
- **Why units are not enough.** `upt derive Rs:resistance ratio:resistance --formula "pi*ratio/ln(2)"` exits 0. Unique monomial `Rs ∝ ratio`. Recovered prefactor `4.5324e+0`, which is `π / ln 2` because it was typed. `upt search four-point`, `four point`, and `sheet resistance` exit 1. be-35 is the conformal four-point function in Part II. It is not this probe factor. The van der Pauw identity `exp(−π R_A/R_s) + exp(−π R_B/R_s) = 1` was searched and is also absent. The measured prefactor here is the equal-spacing limit.
- **Proof-sketch premises.** Two-dimensional Laplace equation, current in at one point and out at another, potential difference of the inner pair, infinite homogeneous sheet, then the equal-spacing limit.
- **Opened.** No wafer measurement.

### 9. Full shot noise — sensors ↔ charge — unproven

- **Formula.** One-sided Schottky spectrum `S_I = 2 e I`. `e` is the elementary charge.
- **Why units are not enough.** `upt derive S:I^2.T Icur:I e:e --formula "2*e*Icur"` exits 0. Unique monomial `S ∝ Icur · e`. Recovered prefactor `2.0000e+0` because the `2` was typed. The same command without declaring `e` exits 3: the target is not in the span. `e I` already has the units of ampere squared per hertz. be-58's factor `4` is Johnson–Nyquist, a different law. `upt search shot noise` exits 1. Part II mentions shot noise as the measurement that read the FQHE charge `e/3`. It does not state this spectrum.
- **Proof-sketch premises.** Poisson arrivals of charge `e`, transit time short, no partition, one-sided spectrum. The `2` is that convention together with the Poisson variance.
- **Opened.** No noise spectrum.

### 10. Reynolds analogy at Prandtl number 1 — heat transfer ↔ momentum — unproven

- **Formula.** `St = C_f / 2` when the turbulent Prandtl number is 1.
- **Why units are not enough.** `upt derive St:dimensionless Cf:dimensionless --formula "Cf/2"` exits 3. Two groups, `St` and `Cf`. The formula is dimensionless and matches. A pair of dimensionless numbers does not fix the `1/2`. `upt search reynolds`, `stanton`, `prandtl`, and `nusselt` exit 1. `biot` finds only `case-lumped-cooling`. Buckingham on `{Nu, Re, Pr}` leaves a free function. Fitted correlations such as Dittus–Boelter are not Lean targets. `f_D Re = 64` is the laminar sibling under candidate 1.
- **Proof-sketch premises.** A boundary layer whose momentum and heat diffusivities are the same, with the skin-friction definition that already contains `1/2`.
- **Opened.** No boundary-layer traverse.

### 11. Capacitor equilibrium noise — sensors ↔ statistical mechanics — unproven

- **Formula.** `<v²> = k_B T / C`, from `(1/2) C <v²> = (1/2) k_B T`.
- **Why units are not enough.** `upt derive meansq:energy^2/charge^2 T:temperature C:charge^2/energy k_B:k_B --formula "k_B*T/C"` exits 0. Unique monomial `meansq ∝ T · C^-1 · k_B`. Recovered prefactor `1.0000e+0`. The same command with `2*k_B*T/C` recovers `2.0000e+0`. Units fix the monomial and do not pick the `1`. `CE-equipartition` is the kinetic `(3/2) k_B T`. `CE-capacitor-energy` stores the `1/2` in latex and drops it in the scalar the explain path uses, which is the same class as issue #354. Neither row is this identity.
- **Proof-sketch premises.** Classical equipartition, one quadratic term in voltage, and the capacitance definition `U = (1/2) C V²`. The two halves cancel.
- **Opened.** No noise measurement.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository.

### Medium

[#351](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/351). **be-74 edge evaluate treats the CLI key `B_T` as a non-finite field.** `upt evaluate be-74 B_T=1` exits 0 and prints `p_Pa = 397887.35751312086`. `be74Edge.evaluate({ B_T: 1 })` throws `B_T must be finite`. `evaluateEdge(be74Edge, { B_T: 1 })` throws `DomainViolationError`. `composeEdges(be74Edge, be76Edge).evaluate({ B_T: 1, n_per_m3: 1e20, T_K: 300 })` throws the composed domain error. The quantity names `magnetic-flux-density`, `carrier-density`, and `temperature` return `0.0000010409848219073948`. `evaluateMagneticPressure({ B_T: 1 })` succeeds. The wrapper drops the alias.

[#352](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/352). **be-70 returns a negative diffusivity for a positive mobility and `q = −e`.** `upt evaluate be-70 mu_m2_per_Vs=0.14 T_K=300 q_C=-1.602176634e-19` exits 0 and prints `D_m2_per_s = -0.0036192799701009757`. Both signs negative prints the positive value. `q_C = 0` throws. The algebra is `D = μ k_B T / q`. A datasheet mobility is positive for electrons.

[#353](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/353). **Search returns be-73 for the Thomson coefficient and be-75 for skin depth.** `upt search thomson coefficient` exits 0 with be-73 only, matched on the description. be-73 is `Π = S T`. `upt search skin depth` exits 0 with be-75 and `case-skin-depth`. be-75's own note says it is not the classical skin depth.

[#354](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/354). **Canonical explain drops the factor stored on Stokes drag, dynamic pressure, and Laplace pressure.** Stokes latex is `F_d = 6π η r v`. Explain of `viscosity=1e-3 radius=1e-6 speed=1e-4` recovers `1e-13`. `6π η r v` on those inputs is `1.8849555921538758e-12`. Dynamic pressure latex is `(1/2) ρ v²`. Explain of `density=1000 flow-velocity=2` recovers `4000`. `(1/2) ρ v²` is `2000`. Laplace latex is `ΔP = 2γ/r`. Explain of `surface-tension=0.072 droplet-radius=1e-3` recovers `72`. `2γ/r` is `144`. The rows are `scalar-up-to-constant` and the scalar AST omits the factor. The recovered number is the product of the inputs. `upt explain stokes-drag` exits 1 and points at `upt explain force --source=canonical`. Using `radius` instead of `droplet-radius` for Laplace says there is no derivation path.

[#355](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/355). **Catalog audit marks the magnetic-pressure factor empirical/tuned.** `upt audit --source=catalog` lists be-74 as `+[ℏ,c,e] ×5.452e+0 (empirical/tuned constant)`. `5.452` is `1/(8 π α)`, the rewrite of `1/(2 μ0)` through `α`. The theorem is `p_B = B²/(2 μ0)`. The tag is the automatic mark for a prefactor that is not in the clean list.

### Low

[#356](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/356). **Skin depth and lumped cooling call a negative residual an excess.** The poor-conductor skin-depth run prints `maxwell_deviation = -0.0487572085250777` beside the label "relative excess of the classical δ over the parent penetration depth". The copper lumped-cooling example prints `parent_deviation = -0.000052203242016934936` beside "relative excess of the lumped ratio over the parent's volume mean". Both residuals are negative. The comparison line is the same ratio.

[#357](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/357). **The unit name `gauss` is rejected; only `G` is the gauss.** `upt eval B B=1G` exits 0, explains the gauss, and prints `0.0001`. `upt eval B B=1gauss` exits 1: `1gauss` is not a number with an optional unit. `convertValue` of `1 gauss` to `T` fails with `unknown unit 'gauss'`.

[#358](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/358). **`upt search piezoelectric` misses the piezoelectricity regime.** `upt search piezoelectric` and `upt search piezo` exit 1. `upt regime piezoelectricity` exits 0 and prints the vacuous registration.

### What held, and is not filed

R3-1, R3-2, and R3-3 behave as the 3.1.0 notes. The dimensionful-constants sentence on magnetic pressure, the London depth, and plasma beta is that shipped sentence. `μ0` versus `4π · 10⁻⁷` differs in the tenth digit of the pressure ratio above. `degF` is refused, as the help text says. Bare `F` is the Faraday constant and bare `G` is Newton's constant. The gauss spelling of `G` is explained on `B B=1G`. Sound speed with pressure and density and no `γ` exits 0 and does not invent a number. A search hit that names the description word, such as Casimir on `conductivity`, is labeled. Hall coefficient with a negative charge recovers `1/(n q)`.

### Not opened, so not used as a number

No pipe-flow, column, MEMS, diode, wafer, noise, or boundary-layer measurement. Where a derive prefactor appears above, it is the command's report of the formula that was typed.
