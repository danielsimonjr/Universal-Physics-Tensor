# Plasma and space — bridge dogfood of published 5.0.0, 2026-10-04

Model-persona session against the published package `universal-physics-tensor@5.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-500`: `npm init -y && npm i universal-physics-tensor@5.0.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@5.0.0 version gitHead --prefer-online` printed `5.0.0` and `4420714b67f5728492ba90d9a983280227b36943`. Annotated tag `v5.0.0` is object `28ebfb885aab8b06499e90fcd208d4e688b0af69` and its target is that commit. The publish workflow is run `37247750332`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v5.0.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `5.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

This session is the plasma and space round. Issue #348 asks for a rotating persona. Its written list begins with condensed matter. The engineering-physicist round is `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md`. The condensed-matter round is `docs/dogfood/2026-10-04-condensed-matter-bridges-r5.md`. The task order after those rounds is plasma and space, then thermal/chemical engineering, relativity/astro, optics/photonics, and acoustics/continuum mechanics. The next persona is thermal/chemical engineering. The workflows exercised here are the Debye length and the plasma parameter, plasma and cyclotron frequencies, the gyroradius, Alfvén and magnetosonic speeds, ion-acoustic waves, the Bohm sheath, Spitzer resistivity and the Coulomb logarithm, magnetic Reynolds and Lundquist numbers, MHD equilibrium and the Bennett pinch, magnetic mirrors and adiabatic invariants, E×B and grad-B drifts, Landau damping, the Parker wind and spiral, the Chapman–Ferraro standoff, the Lawson criterion, Bohm diffusion, and Langmuir probes.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 92. Status counts: 56 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–102, with 54 still printed before 53. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 431 quantities, 6 applied cases, 3 regimes.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-500`. "Printed" is the output of `universal-physics-tensor@5.0.0`.

### Conventions

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and names `upt eval E E=1eV`. `upt eval E E=1eV` prints `1.602176634e-19`. `exp(1)` is `2.718281828459045`. `euler` is refused and names `exp(x)`. `1-e^2` exits 2: `e` is the elementary charge. `upt eval F` is `96485.33212331001`. `upt eval G` is `6.6743e-11`. `upt eval mu0` is `0.0000012566370621200546`. `upt eval eps0` is `8.8541878128e-12`. `mu0*eps0*c^2` is `1`. `upt eval k_B` is `1.380649e-23`. `upt eval hbar` prints the note that `HBAR_SI = H_SI/(2π)` and then `1.0545718176461565e-34`. `upt eval m_p` is `1.67262192369e-27`. `upt eval B B=1nT` is `1e-9`. `upt eval B B=5nT` is `5e-9`. `upt help evaluate` names `BE-51/52/55..102`.

`upt eval "k_B*T/e" T=10eV` exits 0. The note says `T=10eV` is read as `k_B T`, so `T` is `1.160452e+5` K, and the value is `10`. `upt explain` of a temperature slot does not follow that reading. That split is issue #386.

### Plasma frequency, cyclotron, gyroradius

| command | exit | printed |
|---|---|---|
| `upt explain plasma-frequency carrier-density=1e6 charge=1.602176634e-19 vacuum-permittivity=8.8541878128e-12 mass=9.1093837015e-31 --source=canonical` | 0 | recovered `56414.6023118063` via CE-plasma-frequency. The sentence says the inputs fix it up to a dimensionless constant. |
| same command, `charge=-1.602176634e-19` | 0 | recovered `-56414.6023118063`. `--source=both` prints the same negative value. |
| `upt explain cyclotron-frequency charge=-1.602176634e-19 magnetic-field=12e-9 mass=9.1093837015e-31 --source=canonical` | 0 | recovered `-2110.5840129266`. The known set is `{charge, magnetic-field, mass}`. |
| same command, proton mass `1.67262192369e-27` and positive `e` | 0 | recovered `1.14945997871324` |
| `upt explain larmor-radius mass=1.67262192369e-27 speed=4e5 charge=1.602176634e-19 magnetic-field=12e-9 --source=canonical` | 0 | recovered `347989.497161772` |
| `upt explain larmor-radius mass=9.1093837015e-31 speed=1e6 charge=-1.602176634e-19 magnetic-field=1 --source=canonical` | 0 | recovered `-0.00000568563010356572` |

The positive-charge plasma frequency matches `√(n e² / (ε₀ m_e))` at `n = 1e6` m⁻³. The negative print is the same monomial with the signed charge. A plasma frequency is `√(n q² / (ε₀ m))`. The negative value is issue #388. The electron cyclotron at 12 nT is the signed `q B / m`. The 5.0.0 notes already say cyclotron stays signed. The proton Larmor radius at 400 km/s and 12 nT is `m v / (e B)`. The negative electron radius is issue #389.

### Sound speed, most probable speed, ideal gas

| command | exit | printed |
|---|---|---|
| `upt explain speed pressure=1e5 density=1.2 --source=canonical` | 0 | recovered `288.675134594813` via CE-sound-speed. The sentence says the constant was set to 1 and was not recovered. `√(1e5/1.2)` is that print. |
| `upt explain sound-speed pressure=1e5 density=1.2 --source=canonical` | 0 | no derivation path. The dimensional line is `sound-speed ∝ pressure^0.5·density^-0.5`. `--source=both` prints the same sentence. |
| `upt explain sound-speed pressure=1e5 density=1.2 gamma=1.4 --source=canonical` | 1 | `'gamma' did not resolve to a quantity` |
| `upt explain most-probable-speed boltzmann-constant=1.380649e-23 temperature=300 molecular-mass=1.67262192369e-27 --source=canonical` | 0 | recovered `1573.63271668378`. The sentence says the constant was set to 1 and was not recovered. |
| same command, `temperature=10eV` | 0 | recovered `1.15000027903998e-7` |
| same command, `temperature=116045.1812` | 0 | recovered `30949.6900706035`, and the sentence still says the constant was set to 1 |
| `upt explain pressure boltzmann-constant=1.380649e-23 temperature=300 V=0.0224 --source=canonical` | 0 | recovered `1.84908348214286e-19` via CE-ideal-gas. The monomial is `pressure ∝ boltzmann-constant·temperature·V^-1`. |
| `upt explain pressure k_B=1.380649e-23 temperature=300 V=1 --source=canonical` | 1 | `'k_B' did not resolve to a quantity` |
| `upt explain ideal-gas --source=canonical` | 1 | not a quantity. The suggestion list begins with CE-ideal-gas routed to `upt explain pressure`. |
| `upt explain debye-frequency sound-speed=3000 number-density=8.5e28 --source=canonical` | 0 | recovered `13190489016474.5`. The sentence says the constant was set to 1 and names `(6π²)^{1/3}`. |

`√(2 k_B T / m_p)` at `T = 116045.1812` K is `43769.471452014666`. The print `30949.6900706035` is `√(k_B T / m_p)`. The coefficient-unset sentence is the 5.0.0 behavior for CE-mb-most-probable-speed. The `10eV` print is `k_B` low because the kelvin slot received joules. That is issue #386. The sound-speed quantity and the speed quantity are issue #390. `N_A k_B T / 0.0224` with `N_A = 6.02214076e23` is `111354.410064552` Pa. The explained pressure is that number divided by Avogadro's number. That is issue #387. `upt explain debye-length` exits 1 and lists the phonon Debye family. That is issue #392.

### Encoded plasma bridges

The solar-wind-scale inputs below use `B = 12` nT and `ρ = 2.341670693166e-20` kg/m³, five protons per cubic centimetre at the package proton mass. `p_B` at that field is the be-74 print.

| command | exit | printed |
|---|---|---|
| `upt explain alfven-speed magnetic-flux-density=12e-9 plasma-mass-density=2.341670693166e-20 --source=catalog` | 0 | recovered `69954.1370622059`. The sentence says the encoded formula carries dimensionful constants. |
| `upt evaluate be-67 B_T=12e-9 rho_kg_per_m3=2.341670693166e-20` | 0 | `v_m_per_s = 69954.13706220593` |
| `upt evaluate be-67 B_T=12nT rho_kg_per_m3=2.341670693166e-20` | 0 | converts `12nT → 1.2e-8 T` and prints `v_m_per_s = 69954.13706220595`. The stored tesla is `1.2000000000000002e-8`. |
| `upt evaluate be-69 cs_m_per_s=0 B_T=12e-9 rho_kg_per_m3=2.341670693166e-20` | 0 | `v_m_per_s = 69954.13706220593`. The input line says zero sound speed recovers the Alfvén number of this polarization. |
| `upt evaluate be-69 cs_m_per_s=5e4` with the same `B` and `ρ` | 0 | `v_m_per_s = 85985.93659499148` |
| `upt explain fast-magnetosonic-speed` with `sound-speed=5e4` and those field and density inputs | 0 | recovered `85985.9365949915`. The sentence says the formula adds dimensionful terms, so it is not a proportionality. |
| `upt evaluate be-74 B_T=12e-9` | 0 | `p_Pa = 5.72957794818894e-11` |
| `upt evaluate be-76 n_per_m3=5e6 T_K=116045.1812 p_B_Pa=5.72957794818894e-11` | 0 | `beta = 0.13981628736654325` |
| `upt explain plasma-beta carrier-density=5e6 temperature=116045.1812 magnetic-pressure=5.72957794818894e-11 --source=catalog` | 0 | recovered `0.139816287366543` |
| `upt explain plasma-beta carrier-density=5e6 temperature=10 magnetic-pressure=1 --source=catalog` | 0 | recovered `6.903245e-16`, which is `n k_B T / p_B` at 10 K |
| `upt explain plasma-beta carrier-density=5e6 temperature=10eV magnetic-pressure=5.72957794818894e-11 --source=catalog` | 0 | recovered `1.93037217362116e-24` |
| `upt evaluate be-76 n_per_m3=5e6 T_K=10eV p_B_Pa=5.72957794818894e-11` | 1 | `'eV' is [energy], but this input is [temperature] (K)` |
| `upt explain london-penetration-depth carrier-density=5e6 effective-mass=1.67262192369e-27 --source=catalog` | 0 | recovered `101835.350955242` |

`5e6 * k_B * (10 * e) / p_B` is the tiny beta. `5e6 * k_B * 116045.1812 / p_B` is the kelvin beta. The `10eV` explain is issue #386. The London depth at the proton mass and `n = 5e6` m⁻³ is the ion inertial length `c/ω_pi` as the same monomial as be-75. It is not proposed again.

`upt atlas be-67` prints `PhysJS.AlfvenSpeed.speed_eq`, kind `bridge`, pin `03e8bb77c952f720bdd2730af2afc6a7f2d36243`. The covers line says the speed is `B/√(μ0 ρ)` for one transverse polarization, and that inserting tesla into `B/√(4πρ)` is a different speed. `upt atlas be-69` prints `PhysJS.FastMagnetosonic.speed_eq`. The covers line says `√(c_s² + B²/(μ0 ρ))` is the perpendicular compressional root, and that it is not the oblique fast mode. `upt atlas be-74` prints `PhysJS.MagneticPressure.pressure_eq`. The covers line says the 2 is the inductor integral, and that `C = 1` is the battery work per volume. `upt atlas be-76` prints `PhysJS.PlasmaBeta.beta_eq`. The covers line says `β = 2 μ0 n k_B T / B²`, and that the theorem is not a plasma-β inequality. Each command says it prints the stored formalRef and does not derive `formally-proved`.

`upt map --source=catalog --evidence=formally-proved` exits 0: `50 of 83 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76. be-55 and be-60 form a cluster of 2 on `hall-conductance`. The isolated list has 37 edges and includes be-81 and be-88 through be-102.

`upt audit --source=catalog` exits 0: DERIVED 25, COEFFICIENT UNSET 0, DECOY 11, NOT A MONOMIAL 6, OPEN 41. be-74 is `+[ℏ,c,e] ×5.452e+0 (vacuum constant; μ0 rewritten through α)`. The decoy list is be-42, be-51, be-14, be-27, be-43, be-67, be-75, be-76, be-81, be-92, be-94. The non-monomial list is be-54, be-36, be-50, be-40, be-69, be-93. Canonical audit: DERIVED 73, COEFFICIENT UNSET 6, DECOY 7, OPEN 23. The unset rows are `CE-thermal-de-broglie`, `CE-sound-speed`, `CE-fermi-energy`, `CE-fermi-velocity`, `CE-debye-frequency`, and `CE-mb-most-probable-speed`. `CE-ideal-gas` is `+[k_B] ×1.000e+0` in the DERIVED block. `CE-plasma-frequency` stays DERIVED `×1`.

`upt regime plasma` exits 0 and says no machine condition was evaluated.

`upt discover --source=catalog` exits 0. The captured head is the first rows of the report. Funnel: 710 candidates, 15 promising, 230 inert, 20 magnitude-clash, 0 contradictory, 445 axis-clash. The first promising row is `landauer-erasure-energy ≟ dark-fermion-mass`. The banner says promising means worth a physicist's minute.

### Search

Exit 1, no entry: `debye length`, `debye-length`, `plasma parameter`, `gyroradius`, `ion acoustic`, `ion-acoustic`, `bohm`, `sheath`, `spitzer`, `coulomb logarithm`, `coulomb log`, `lundquist`, `magnetic reynolds`, `magnetic reynolds number`, `bennett`, `pinch`, `magnetic mirror`, `adiabatic invariant`, `exb`, `grad-b`, `landau damping`, `parker`, `spiral`, `chapman`, `ferraro`, `standoff`, `magnetopause`, `lawson`, `bohm diffusion`, `langmuir probe`, `upper hybrid`, `lower hybrid`, `whistler`, `firehose`, `mirror instability`, `inertial length`, `two-stream`, `two stream`, `harris`.

Exit 0 on the law the query names: `plasma frequency` returns CE-plasma-frequency. `cyclotron` returns CE-cyclotron-frequency. `larmor` returns CE-larmor-radius and CE-larmor-power, and both hits are labeled. `alfven` returns be-67, be-69 on the description, and the quantity `alfven-speed`. The be-69 hit is labeled. `magnetosonic` returns be-69. `plasma beta` returns be-76. `magnetic pressure` returns be-74 and be-76, and the be-76 hit is labeled.

Exit 0, and the hit is a different law: `reynolds number` returns only be-86. `landau` returns be-95 on the name, be-102, be-16, and `CE-landauer` with the prefix note `landau is a prefix of landauer`, and be-96 on the description. `landau damping` exits 1. `drift` returns be-70, be-80 on the description, and CE-drift-velocity. `resistivity` returns be-23 on the description and CE-drude-resistivity. `coulomb` returns CE-point-charge-field and CE-coulomb. `debye` returns be-89, be-90, and CE-debye-frequency, eleven matches, all phonon. `langmuir` returns be-81. `ideal gas` returns CE-ideal-gas, CE-kinetic-pressure, and be-71 and be-76 on the description. Those description hits are labeled. `sound speed` routes CE-sound-speed to `upt explain speed` and the quantity `sound-speed` to `upt explain sound-speed`. The Reynolds hit and the Debye-length suggestion are issues #391 and #392. The prefix note on `landau` is the 5.0.0 behavior and is not filed again.

## (b) New candidates

Each row is **unproven**. The dimensional check is the `upt derive` that was run. A recovered prefactor is the command's report of the formula that was typed. No measurement was opened for any of these.

be-67 is the Alfvén speed. be-69 is the perpendicular fast magnetosonic speed, and its covers line says it is not the oblique fast mode. be-74 is `p_B = B²/(2 μ0)`. be-75 is `λ_L = √(m/(μ0 n e²))`, the same monomial as an inertial length `c/ω_p`. be-76 is plasma beta. be-81 is the Child–Langmuir current. BE-88 through BE-102 are the condensed-matter candidates from the round-5 report. Landau diamagnetism `χ_L = −χ_P/3` and the BCS coherence length `ξ₀ = ℏ v_F/(π Δ)` have no bridge id. CE-plasma-frequency, CE-cyclotron-frequency, and CE-larmor-radius are the monomials those names say. CE-sound-speed is `√(γ P/ρ)` with the coefficient unset. CE-kinetic-energy is `(1/2) m v²`. CE-equipartition is `(3/2) k_B T`. None of those rows is the identity below.

The one-species Debye length was already proposed in `docs/dogfood/2026-10-03-applied-physicist-bridges.md` as the composition `λ_D = √(k_B T/m) / ω_p`. This session re-ran `upt derive lam:length n:L^-3 T:temperature eps0:eps0 kB:k_B ee:e --formula "sqrt(eps0*kB*T/(n*ee^2))"`. It exits 3. Two groups: `lam^3 · n` and `lam · T · eps0 · kB · ee^-2`. That identity is not proposed again. The multi-species sum below is a different structure.

Candidates named in the earlier dogfood reports and still absent are not re-proposed: piezoelectric reciprocity, Larché–Cahn, Mott thermopower, the Nernst thermal voltage, the Nernst effect, Abraham–Minkowski, magnetostriction, Vegard, Faraday induction, optomechanics, strain, pyroelectricity, electrostriction, Saha, Soret, Grüneisen, Verdet, and Pockels. The empirical Bohm diffusivity `k_B T/(16 e B)` is not a closed derivation, and the number 16 is not proposed. The Lawson triple product near `10^{21}` keV·s/m³ is an evaluation at one temperature, and that number is not proposed.

### 1. Bohm sheath — cold ions, and the one-dimensional warm-ion closure — unproven

- **Formula.** At the sheath edge, cold ions satisfy `u ≥ √(k_B T_e / m_i)`, so the Mach number is at least 1. For ions that are adiabatic in one dimension, `γ_i = 3`, and `c_s = √((k_B T_e + 3 k_B T_i)/m_i)`. The three-dimensional adiabatic index `5/3` is a different closure.
- **Why units are not enough.** `upt derive cs:velocity Te:temperature mi:mass kB:k_B --formula "sqrt(kB*Te/mi)"` exits 0. Unique monomial `cs ∝ Te^0.5·mi^-0.5·kB^0.5`. Recovered prefactor `1.0000e+0` because that factor was typed. `upt derive M:dimensionless u:velocity cs:velocity --formula "u/cs"` exits 3. Two groups: `M` and `u/cs`. An inequality between two velocities is not a monomial. `upt search bohm` and `upt search sheath` exit 1. CE-sound-speed is a fluid `√(γ P/ρ)` with `γ` unset.
- **Proof-sketch premises.** Boltzmann electrons, cold or one-dimensional adiabatic ions, quasineutral plasma matched to a non-neutral sheath, and a monotonic potential. The `3` is the one-dimensional adiabatic moment, the same integer as the Bohm–Gross `3` in candidate 11. The threshold is the point where the sheath solution stops being oscillatory.
- **Opened.** No sheath measurement.

### 2. Ion-acoustic dispersion — cold ions — unproven

- **Formula.** `ω² = k² c_s² / (1 + k² λ_De²)` with `c_s² = k_B T_e / m_i` and `λ_De² = ε0 k_B T_e / (n e²)`.
- **Why units are not enough.** `upt derive w:frequency k:L^-1 cs:velocity lam:length --formula "k*cs/sqrt(1+k^2*lam^2)"` exits 3. Two groups: `w · k^-1 · cs^-1` and `k · lam`. The formula dimension matches a frequency. Units leave a free function of `k λ_De`. The long-wavelength limit is candidate 1's cold sound speed. be-69 adds `c_s²` to `v_A²` and is a different mode.
- **Proof-sketch premises.** Boltzmann electrons, cold fluid ions, quasineutrality relaxed through Poisson, and `ω ≪ ω_pe`. Warm ions replace the numerator with `γ_i k_B T_i/m_i` plus the electron term. That replacement is a different formula.
- **Opened.** No ion-acoustic dispersion measurement.

### 3. Upper hybrid — electron plasma frequency and electron cyclotron frequency — unproven

- **Formula.** `ω_uh² = ω_pe² + ω_ce²`, with `ω_ce = |e| B / m_e`.
- **Why units are not enough.** `upt derive wuh:frequency wp:frequency wc:frequency --formula "sqrt(wp^2+wc^2)"` exits 3. Two groups: `wuh/wp` and `wuh/wc`. The formula dimension matches a frequency. A sum of squares of two frequencies is not fixed by either frequency alone. CE-plasma-frequency and CE-cyclotron-frequency are the separate monomials.
- **Proof-sketch premises.** Cold electrons, immobile ions, and a wave electric field perpendicular to a uniform `B`. The extraordinary-mode root at `k → 0` and `k ∥ B = 0` is this sum.
- **Opened.** No upper-hybrid resonance.

### 4. R and L cutoffs — cold electron plasma — unproven

- **Formula.** For immobile ions and `ω_c = |e| B / m_e`, the cold refractive index of the circular modes is `n² = 1 − ω_p² / (ω (ω ∓ ω_c))`. The cutoffs are `ω_R = [ω_c + √(ω_c² + 4 ω_p²)] / 2` and `ω_L = [−ω_c + √(ω_c² + 4 ω_p²)] / 2`. The low-frequency R-mode limit `ω ≪ ω_ce` is the whistler `ω = ω_ce (k d_e)²`, with `d_e = c / ω_pe`.
- **Why units are not enough.** `upt derive wR:frequency wc:frequency wp:frequency --formula "(wc+sqrt(wc^2+4*wp^2))/2"` exits 3. Two groups: `wR/wc` and `wR/wp`. The `4` and the minus sign on the L root are not fixed by two frequencies. `upt derive w:frequency wce:frequency k:L^-1 de:length --formula "wce*(k*de)^2"` exits 3. Two groups: `w/wce` and `k · de`. The power 2 on `k d_e` is the same cold-plasma expansion, so the whistler is this limit and is not a second bridge. `upt search whistler` and `upt search "upper hybrid"` exit 1.
- **Proof-sketch premises.** Cold electrons, a uniform field, and the Stix R and L combinations. The square root is the quadratic `ω² ∓ ω ω_c − ω_p² = 0`.
- **Opened.** No cutoff-frequency measurement.

### 5. Lower hybrid — ion and electron cyclotron frequencies — unproven

- **Formula.** `ω_LH² = [1/ω_pi² + 1/(ω_ci ω_ce)]^{-1}`. In the dense limit `ω_pe² ≫ ω_ce²` this is `√(ω_ci ω_ce)`. The identity used to pass between the two writings is `ω_pe² / ω_ce² = ω_pi² / (ω_ci ω_ce)`.
- **Why units are not enough.** `upt derive wLH:frequency wpi:frequency wci:frequency wce:frequency --formula "1/sqrt(1/wpi^2+1/(wci*wce))"` exits 3. Three groups: `wLH/wpi`, `wLH/wci`, and `wLH/wce`. A reciprocal sum of a frequency squared and a product of two frequencies is not a monomial. The geometric mean is one limit of that sum. `upt search "lower hybrid"` exits 1.
- **Proof-sketch premises.** Cold two-fluid plasma, quasineutrality, and a perpendicular electrostatic root with both species magnetized. The identity above is `n e²/(ε0 m)` arranged once for each mass.
- **Opened.** No lower-hybrid frequency.

### 6. Oblique fast and slow magnetosonic speeds — ideal MHD — unproven

- **Formula.** `c_{f,s}² = (1/2) [c_s² + v_A² ± √((c_s² + v_A²)² − 4 c_s² v_A² cos²θ)]`. At `θ = 90°` the fast root is `√(c_s² + v_A²)` and the slow root is 0. At `θ = 0` the two roots are the larger and the smaller of `c_s` and `v_A`.
- **Why units are not enough.** `upt derive cf:velocity cs:velocity vA:velocity theta:dimensionless --formula "sqrt(0.5*(cs^2+vA^2+sqrt((cs^2+vA^2)^2-4*cs^2*vA^2*theta^2)))"` exits 3. Three groups: `cf/cs`, `cf/vA`, and `theta`. The formula dimension matches a velocity. The `1/2`, the discriminant, and the choice of sign are not fixed by the two speeds. be-69 is the `θ = 90°` fast root only. Its covers line says it is not the oblique fast mode. `c_s = 0` on be-69 recovers the Alfvén number printed in section (a).
- **Proof-sketch premises.** Ideal MHD, a uniform background field, and the cold or adiabatic sound speed already defined. The angle is between `k` and `B`.
- **Opened.** No oblique-mode measurement.

### 7. Bennett relation — Z-pinch equilibrium — unproven

- **Formula.** `μ0 I² / (8π) = ∫ p dA` over the pinch cross-section. For a hydrogenic line with `N_e = N_i = N` and temperatures `T_e` and `T_i`, `μ0 I² / (8π) = N k_B (T_e + T_i)`. The isothermal one-temperature form that was typed is `I = √(8π N_line k_B T / μ0)`.
- **Why units are not enough.** `upt derive Icur:I mu0:permeability Nline:L^-1 T:temperature kB:k_B --formula "sqrt(8*pi*Nline*kB*T/mu0)"` exits 0. Unique monomial `Icur ∝ mu0^-0.5·Nline^0.5·T^0.5·kB^0.5`. Recovered prefactor `5.0133e+0`, which is `√(8π) = 5.0132565492620005` because that factor was typed. be-74 is `B²/(2 μ0)` for a solenoid. `upt search bennett` and `upt search pinch` exit 1.
- **Proof-sketch premises.** Steady axisymmetry, `B_θ = μ0 I(r)/(2π r)`, `j_z = (1/(2π r)) dI/dr`, and `dp/dr = −j_z B_θ`. Then `dp/dr = −μ0 /(8π² r²) d(I²)/dr`. The 8 is the 2 in `d(I²) = 2 I dI` together with the two factors of `2π`. Integration by parts with `p → 0` at infinity produces `μ0 I²/(8π)`.
- **Opened.** No pinch profile.

### 8. Loss cone — magnetic moment and the mirror ratio — unproven

- **Formula.** `sin² θ_lc = B_0 / B_m = 1/R_m`, where `θ` is the pitch angle at the weaker field `B_0` and `R_m = B_m/B_0`.
- **Why units are not enough.** `upt derive s:dimensionless Rm:dimensionless --formula "1/Rm"` exits 3. Two groups: `s` and `Rm`. Two pure numbers do not have to be reciprocals, and the square on the sine is not fixed by the mirror ratio. The magnetic moment `μ = m v_⊥² / (2 B)` uses the 2 from kinetic energy, which is CE-kinetic-energy, so that 2 is not a separate bridge. `upt search "magnetic mirror"` and `upt search "adiabatic invariant"` exit 1.
- **Proof-sketch premises.** `μ` conserved, energy conserved, and `v_∥ = 0` at the mirror point. Then `v_⊥0² / v² = B_0 / B_m`.
- **Opened.** No loss-cone distribution.

### 9. Grad-B and curvature drifts — the one-half sits only on `v_⊥²` — unproven

- **Formula.** `v_∇B = m v_⊥² (B × ∇B) / (2 q B³)` and, for a vacuum low-β field with `κ = ∇_⊥ ln B`, `v_c = m v_∥² (B × ∇B) / (q B³)`. The sum is `v_d = m (v_∥² + v_⊥²/2) (B × ∇B) / (q B³)`.
- **Why units are not enough.** `upt derive vd:velocity m:mass q:charge B:M.T^-2.I^-1 vpar:velocity vperp:velocity kappa:L^-1 --formula "(m/(q*B))*(vpar^2+vperp^2/2)*kappa"` exits 3. Three groups: `vd/vpar`, `vd/vperp`, and `vd · m · q^-1 · B^-1 · kappa`. The formula dimension matches a velocity. Units do not put the `1/2` on the perpendicular term and leave the parallel term bare. `upt search "grad-b"` exits 1. `upt search drift` returns be-70, be-80, and CE-drift-velocity.
- **Proof-sketch premises.** Guiding-center ordering, `μ = m v_⊥²/(2B)`, and `v = F × B / (q B²)` with `F = −μ ∇B`. The curvature drift uses the centrifugal force `m v_∥² κ` and the vacuum relation between `κ` and `∇B`. A high-β curvature is a different vector.
- **Opened.** No drift-orbit measurement.

### 10. E×B drift — the scalar monomial is unique; the cross product is the content — unproven

- **Formula.** `v_E = E × B / B²`. The drift does not reverse when the sign of `q` reverses.
- **Why units are not enough.** `upt derive v:velocity E:M.L.T^-3.I^-1 B:M.T^-2.I^-1 q:charge m:mass --formula "E/B"` exits 0. The header lists `{E, B, q, m}`. The monomial drops `q` and `m`: `v ∝ E·B^-1`. Recovered prefactor `1.0000e+0` because `E/B` was typed. The same command without `q` and `m` exits 0 with the same monomial and the same prefactor. Electric field in this package is `[L M T^-3 I^-1]`, so `E/B` is a velocity. Units fix that scalar monomial. They do not state the cross product, and they do not state that the charge sign cancels. `upt search exb` exits 1. CE-drift-velocity is `v = μ E`.
- **Proof-sketch premises.** A steady perpendicular drift, `m dv/dt = q (E + v × B)`, and no extra time scale. Averaging the gyration leaves `E × B / B²`.
- **Opened.** No E×B flow.

### 11. Landau damping — Maxwellian, with `v_t² = k_B T / m` — unproven

- **Formula.** `γ = −√(π/8) ω_p (k λ_D)^{-3} exp(−3/2 − 1/(2 k² λ_D²))`, where `λ_D² = ε0 k_B T / (n e²) = v_t² / ω_p²` and the real frequency in the exponent is the Bohm–Gross root `ω² = ω_p² (1 + 3 k² λ_D²)`. The `3` is the large-phase-velocity Maxwellian moment. `√(π/8) = √(π/2) / 2`. A convention `v_t² = 2 k_B T / m` rewrites every numerical factor.
- **Why units are not enough.** `upt derive gamma:frequency wp:frequency x:dimensionless --formula "-sqrt(pi/8)*wp*x^(-3)*exp(-3/2-1/(2*x^2))"` exits 3. Two groups: `gamma/wp` and `x`. The formula dimension matches a frequency. The power `−3`, the `3/2`, the `1/2` inside the exponent, and the minus sign are not fixed by `ω_p` and `k λ_D`. The sign is damping for `df/dv < 0` at the phase velocity. `upt search "landau damping"` exits 1. `upt search landau` returns the Ginzburg–Landau and Landauer rows named in section (a), and it says `landau` is a prefix of `landauer`.
- **Proof-sketch premises.** Vlasov–Poisson, a Maxwellian with `v_t² = k_B T/m`, the Landau contour, and `k λ_D ≪ 1` so that `ω` in the prefactor may be replaced by `ω_p` while the exponent keeps the Bohm–Gross phase velocity.
- **Opened.** No damping-rate measurement.

### 12. Debye-sphere count and the classical Coulomb argument — unproven

- **Formula.** `N_D = (4π/3) n λ_D³`. With `b_90 = e² / (12 π ε0 k_B T)`, from `(1/2) μ v_rel² = (3/2) k_B T` so that `μ v_rel² = 3 k_B T`, and with `b_max = λ_D`, `Λ = λ_D / b_90 = 12 π n λ_D³ = 9 N_D`.
- **Why units are not enough.** `upt derive Nd:dimensionless n:L^-3 lam:length --formula "(4*pi/3)*n*lam^3"` exits 3. Two groups: `Nd` and `n · lam^3`. `upt derive Lam:dimensionless n:L^-3 lam:length --formula "12*pi*n*lam^3"` exits 3. Two groups: `Lam` and `n · lam^3`. `9 · (4π/3) = 12π = 37.69911184307752`, so the two pure numbers are the same sphere once the impact-parameter convention is fixed. A cutoff at `k_B T` or at `2 k_B T` changes the number. The one-species length itself is the earlier candidate named above and is not proposed again. `upt search "coulomb logarithm"` and `upt search "plasma parameter"` exit 1. `upt search coulomb` returns the point-charge field and the Coulomb force.
- **Proof-sketch premises.** A Debye sphere of volume `4π λ_D³/3`, Rutherford scattering, and the stated energy in `b_90`. The logarithm is `ln(b_max/b_90)` after the angular integral, under `Λ ≫ 1`.
- **Opened.** No Coulomb-logarithm measurement.

### 13. Multi-species Debye length — reciprocal squares — unproven

- **Formula.** `1/λ_D² = Σ_s 1/λ_s²`, with `λ_s² = ε0 k_B T_s / (n_s q_s²)`.
- **Why units are not enough.** `upt derive lam:length l1:length l2:length --formula "1/sqrt(1/l1^2+1/l2^2)"` exits 3. Two groups: `lam/l1` and `lam/l2`. The formula dimension matches a length. A sum of reciprocal squares is not either length, and it is not the one-species monomial re-run above.
- **Proof-sketch premises.** Linearized Boltzmann (or adiabatic) response of each species in Poisson's equation. Each species contributes `q_s² n_s / (ε0 k_B T_s)` to `k²`.
- **Opened.** No two-temperature Debye length.

### 14. Lorentz plasma resistivity — the factor `4 √(2π) / 3` — unproven

- **Formula.** `η_L = (4 √(2π) / 3) Z e² m_e^{1/2} ln Λ / ((4π ε0)² (k_B T_e)^{3/2})`. Here `e` is the elementary charge. The parallel Spitzer–Härm factor near `0.51` at `Z = 1` is a different integral, from electron-electron collisions, and is not this theorem.
- **Why units are not enough.** `upt derive eta:M.L^3.T^-3.I^-2 Z:dimensionless lnL:dimensionless Te:temperature me:mass ee:e eps0:eps0 kB:k_B --formula "(4*sqrt(2*pi)/3)*Z*ee^2*sqrt(me)*lnL/((4*pi*eps0)^2*(kB*Te)^(3/2))"` exits 3. Three groups: `Z`, `lnL`, and `eta^2 · Te^3 · me^-1 · ee^-4 · eps0^4 · kB^3`. The formula dimension matches resistivity. `4 √(2π) / 3 = 3.3421710328413337`. At `k_B T_e = e`, `Z = 1`, and `ln Λ = 1`, the formula is `0.0001031362122638491` Ω·m. A quoted parallel value `5.2×10^{-5}` Ω·m at those inputs is `0.504` times that Lorentz value. Density cancels because `ν ∝ n`. One power of `Z` remains because `ν ∝ n_i Z² = n_e Z`. `upt search spitzer` exits 1. CE-drude-resistivity is `m / (n q² τ)`.
- **Proof-sketch premises.** Lorentz electron-ion collisions, a Maxwellian electron background, the Coulomb logarithm held constant, and no electron-electron contribution. The `3/2` power of temperature is the thermal velocity in the collision frequency together with the resistivity `m_e ν / (n e²)`.
- **Opened.** No resistivity measurement.

### 15. Resistive-slab decay — `π²` — and the magnetic Reynolds and Lundquist numbers — unproven

- **Formula.** The slowest decay of a resistive slab of thickness `L` with pinned edges is `τ = μ0 σ L² / π²`. The diffusivity in that time is `η_m = 1/(μ0 σ)`, so `Rm = μ0 σ v L` and `S = μ0 σ v_A L` are the two groups built from it. A Gaussian fundamental differs by `4π` and is a different eigenfunction.
- **Why units are not enough.** `upt derive tau:time mu0:permeability sigma:M^-1.L^-3.T^3.I^2 L:length --formula "mu0*sigma*L^2/pi^2"` exits 0. Unique monomial `tau ∝ mu0·sigma·L^2`. Recovered prefactor `1.0132e-1`, which is `1/π² = 0.10132118364233778` because that factor was typed. `Rm` and `S` are dimensionless, so units do not choose the velocity inside them. `upt search lundquist` and `upt search "magnetic reynolds"` exit 1. `upt search "reynolds number"` returns only be-86, which is issue #391.
- **Proof-sketch premises.** `∂B/∂t = η_m ∇²B` in SI, a slab eigenfunction `sin(π x / L)`, and the definitions of `Rm` and `S` as `v L / η_m` and `v_A L / η_m`.
- **Opened.** No resistive-decay time.

### 16. Parker critical radius — the spherical factor `1/2` — unproven

- **Formula.** An isothermal spherical wind passes through `v = c_s` at `r_c = G M / (2 c_s²)`.
- **Why units are not enough.** `upt derive rc:length G:L^3.M^-1.T^-2 Mstar:mass cs:velocity --formula "G*Mstar/(2*cs^2)"` exits 0. Unique monomial `rc ∝ G·Mstar·cs^-2`. Recovered prefactor `5.0000e-1` because the `2` was typed. The escape-speed radius `2 G M / v²` uses the reciprocal arrangement of that `2`. `upt search parker` exits 1.
- **Proof-sketch premises.** Steady isothermal flow, spherical continuity, and momentum `v dv/dr = −(1/ρ) dp/dr − G M / r²` with `c_s² = dp/dρ`. The critical point is where `v² = c_s²` and `2 c_s² / r = G M / r²` at the same radius. The `2` is the spherical `2/r` divergence.
- **Opened.** No solar-wind critical point.

### 17. Parker spiral — ratio and winding sign — unproven

- **Formula.** For a radial wind of constant speed beyond the source surface, `B_φ / B_r = −Ω r sinθ / v_r`. The minus sign is the sense in which the field is wound.
- **Why units are not enough.** `upt derive ratio:dimensionless Omega:frequency r:length v:velocity --formula "-Omega*r/v"` exits 3. Two groups: `ratio` and `Omega · r · v^-1`. The formula is dimensionless and matches. Units do not fix the minus sign, and they do not require the equatorial `sinθ`. `upt search spiral` exits 1. be-67 is the Alfvén speed along a field that is already given.
- **Proof-sketch premises.** Ideal induction in the rotating frame, `B_r ∝ 1/r²` from ∇·B = 0, and `v_r` constant. The azimuthal field is the rotational lag accumulated over `r / v_r`.
- **Opened.** No spiral-angle measurement.

### 18. Chapman–Ferraro standoff — the sheet factor 2 and the sixth root — unproven

- **Formula.** A plane magnetopause sheet doubles the dipole, `B_mp = 2 B_eq(r)`. Balance `ρ v² = B_mp² / (2 μ0)` with ram pressure `ρ v²` (the factor `K = 1`). Then `R_mp / R_E = [2 B_E² / (μ0 ρ v²)]^{1/6}`. Specular reflection replaces `ρ v²` by `2 ρ v²` and changes the 2. CE-dynamic-pressure is `(1/2) ρ v²` and is a different pressure.
- **Why units are not enough.** `upt derive Rmp:length RE:length BE:M.T^-2.I^-1 rho:L^-3.M v:velocity mu0:permeability --formula "RE*(2*BE^2/(mu0*rho*v^2))^(1/6)"` exits 3. Two groups: `Rmp/RE` and `BE² · rho^-1 · v^-2 · mu0^-1`. The formula dimension matches a length. Units leave a free function of that pressure ratio. The sixth root is the dipole `B ∝ r^{-3}` inside a pressure that scales as `B²`. be-74 supplies the `2` in `B²/(2 μ0)`. `upt search chapman`, `upt search ferraro`, `upt search standoff`, and `upt search magnetopause` exit 1.
- **Proof-sketch premises.** A dipole, a thin plane current sheet, and Newtonian ram pressure with `K = 1`. The algebra is `ρ v² = [2 B_E (R_E/r)^3]² / (2 μ0)`.
- **Opened.** No magnetopause standoff.

### 19. Lawson breakeven — the factor 12 — unproven

- **Formula.** For a 50-50 deuterium-tritium plasma with `T_e = T_i` and both species counted, `n τ = 12 k_B T / (⟨σv⟩ E)`. The `12` is `4 × 3`: the reactivity of a 50-50 mix is `n² ⟨σv⟩ / 4`, and the thermal energy density is `3 n k_B T`. Ignition uses the same `12` with `E` equal to the alpha energy, `3.5` MeV, rather than the total `17.6` MeV.
- **Why units are not enough.** `upt derive ntau:T.L^-3 TT:temperature sigv:L^3.T^-1 EE:energy kB:k_B --formula "12*kB*TT/(sigv*EE)"` exits 3. Two groups: `ntau · sigv` and `TT · EE^-1 · kB`. The formula dimension is `[L^-3 T]` and matches. Units do not produce the `12`. `upt search lawson` exits 1. CE-equipartition is `(3/2) k_B T` for one species.
- **Proof-sketch premises.** Maxwellian ions, a charged-particle confinement time `τ`, negligible bremsstrahlung, and the two counting factors above. The empirical triple product is this identity evaluated at one temperature.
- **Opened.** No fusion reactivity.

### 20. Langmuir probe — sheath-edge flux and floating potential — unproven

- **Formula.** Cold ions reach the sheath edge at the Bohm speed after a presheath drop `k_B T_e / (2 e)`, so the ion flux is `Γ_i = n_0 exp(−1/2) √(k_B T_e / m_i)`. The one-sided electron flux to a wall at potential `Φ_w` is `Γ_e = n_0 exp(e Φ_w / k_B T_e) √(k_B T_e / (2π m_e))`. Floating balance gives `e Φ_w / (k_B T_e) = (1/2) ln(2π m_e / m_i) − 1/2`. For the package masses, `m_p/m_e = 1836.1526734400013` and that potential is `−3.338775328391138` in units of `k_B T_e / e`.
- **Why units are not enough.** `upt derive Gamma:L^-2.T^-1 n:L^-3 cs:velocity --formula "n*exp(-1/2)*cs"` exits 0. Unique monomial `Gamma ∝ n·cs`. Recovered prefactor `6.0653e-1`, which is `exp(−1/2) = 0.6065306597126334` because that factor was typed. `upt derive phi:dimensionless mr:dimensionless --formula "0.5*ln(2*pi*mr)-0.5"` exits 3. Two groups: `phi` and `mr`. The logarithm and the two factors of `1/2` are not fixed by the mass ratio. be-81 is `J = (4 ε0 / 9) √(2 e / m) V^{3/2} / d²`. `upt search "langmuir probe"` exits 1. `upt search langmuir` returns be-81.
- **Proof-sketch premises.** Candidate 1 for the ions, a half-Maxwellian electron flux, and `Γ_i = Γ_e` at a floating wall. The `2π` is the one-sided Gaussian integral.
- **Opened.** No probe characteristic.

### 21. Classical cross-field diffusion — `1 / (1 + ω_c² τ²)` — unproven

- **Formula.** `D_⊥ / D_∥ = 1 / (1 + ω_c² τ²)`, with `D_∥` from the Einstein relation be-70.
- **Why units are not enough.** `upt derive ratio:dimensionless wc:frequency tau:time --formula "1/(1+wc^2*tau^2)"` exits 3. Two groups: `ratio` and `wc · tau`. The formula is dimensionless and matches. Units do not produce the Lorentzian. be-70 is `D = μ k_B T / q` along the mobility it is given. `upt search "bohm diffusion"` exits 1. The empirical `1/16` is not this identity.
- **Proof-sketch premises.** A drag `−m v / τ` plus the Lorentz force, the resulting mobility tensor, and Einstein's relation applied to each eigenvalue. The `1` in the denominator is the parallel piece.
- **Opened.** No cross-field diffusion coefficient.

### 22. Firehose threshold — the 2 in plasma beta — unproven

- **Formula.** `p_∥ − p_⊥ > B² / μ0`. With be-76's definition `β = 2 μ0 p / B²`, the same statement is `β_∥ − β_⊥ > 2`.
- **Why units are not enough.** `upt derive dbeta:dimensionless bpar:dimensionless bperp:dimensionless --formula "bpar-bperp"` exits 3. Three groups: `dbeta`, `bpar`, and `bperp`. A difference of two betas is not fixed by either beta. The threshold `2` is `B²/μ0` divided into be-76's `2 μ0 / B²`. Using `B²/(2 μ0)` in the pressure threshold would halve it. `upt search firehose` exits 1. be-76's covers line says the theorem is not a plasma-β inequality.
- **Proof-sketch premises.** Chew–Goldberger–Low pressure, a uniform field perturbed by a long-parallel mode, and the magnetic tension `B²/μ0` losing to the parallel-pressure excess.
- **Opened.** No anisotropy threshold.

### 23. Mirror instability — `1/β_⊥`, with be-76's beta — unproven

- **Formula.** For a bi-Maxwellian with cold electrons, `T_⊥ / T_∥ − 1 > 1/β_⊥`, where `β_⊥ = 2 μ0 p_⊥ / B²`. That `β_⊥` is the same number as the cgs `8π p_⊥ / B²`. The threshold is `1/β_⊥`. It is `2/β_⊥` only if beta was defined without be-76's 2.
- **Why units are not enough.** `upt derive thr:dimensionless beta:dimensionless --formula "1+1/beta"` exits 3. Two groups: `thr` and `beta`. The formula is dimensionless and matches. Units do not require the reciprocal, and they do not choose `1` rather than `2` once the beta convention is left unstated. `upt search "mirror instability"` exits 1. Candidate 8 is the single-particle loss cone. This row is a kinetic instability threshold.
- **Proof-sketch premises.** The low-frequency mirror mode of a bi-Maxwellian, quasineutral electrons, and `β_⊥` as in be-76. Hasegawa's cgs form with `8π p / B²` is this inequality.
- **Opened.** No mirror-mode threshold.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository.

### High

[#386](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/386). **Explain treats `temperature=10eV` as joules in the kelvin slot.** `upt eval "k_B*T/e" T=10eV` says `T` is `1.160452e+5` K. `upt evaluate be-76` with `T_K=10eV` exits 1 because eV is energy. `upt explain plasma-beta` with `temperature=10eV` and the be-74 pressure exits 0 and prints `1.93037217362116e-24`. The same command at `temperature=116045.1812` prints `0.139816287366543`. `upt explain most-probable-speed` with `temperature=10eV` prints `1.15000027903998e-7`. At `116045.1812` K it prints `30949.6900706035` and still says the constant was set to 1.

[#387](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/387). **Ideal-gas explain returns `k_B T/V` and drops `N`.** `upt explain pressure boltzmann-constant=1.380649e-23 temperature=300 V=0.0224 --source=canonical` prints `1.84908348214286e-19`. The latex of CE-ideal-gas is `P = N k_B T/V`. The governing names are `k_B`, `temperature`, and `V`. `N_A k_B T / 0.0224` is `111354.410064552` Pa. The audit lists `CE-ideal-gas +[k_B] ×1.000e+0` as DERIVED. `k_B` as an explain key does not resolve. The quantity name is `boltzmann-constant`.

### Medium

[#388](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/388). **Plasma frequency is negative when the carrier charge is negative.** The `n = 1e6` m⁻³ electron command with `charge=-e` prints `-56414.6023118063`. The positive charge prints `56414.6023118063`. The monomial is odd in `charge`. The angular plasma frequency is even in `charge`.

[#389](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/389). **Larmor radius is negative when the charge is negative.** `upt explain larmor-radius` at electron mass, `speed=1e6`, `charge=-e`, and `magnetic-field=1` prints `-0.00000568563010356572`. The proton command at 400 km/s and 12 nT prints `347989.497161772`. A gyroradius is a length.

[#390](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/390). **Explaining `sound-speed` does not use the sound-speed equation.** `upt explain sound-speed pressure=1e5 density=1.2` exits 0 and says the graph has no derivation path. `upt explain speed` with those inputs recovers `288.675134594813` via CE-sound-speed and says the constant was set to 1. `gamma=1.4` on `sound-speed` exits 1. `upt search "sound speed"` routes the equation to `explain speed` and the quantity to `explain sound-speed`.

[#391](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/391). **Search for Reynolds number returns the Reynolds analogy.** `upt search "reynolds number"` exits 0 on be-86 only. `upt search "magnetic reynolds"` and `upt search lundquist` exit 1.

### Low

[#392](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/392). **A plasma Debye length query is answered with the phonon Debye family.** `upt search "debye length"` exits 1. `upt explain debye-length` exits 1 and lists be-89, CE-debye-frequency, and the phonon quantities. `upt search debye` returns those eleven phonon rows. be-89 and be-90 are the Debye cutoff and the Debye heat capacity.

### What held, and is not filed

Cyclotron frequency stays signed, which the 5.0.0 notes already say. `upt search landau` names the prefix of `landauer`. `upt explain debye-frequency` names `(6π²)^{1/3}` and says the printed 1 was not recovered. The same sentence is what Fermi energy, Fermi velocity, and the most probable speed already print. be-67, be-75, and be-76 stay in the catalog decoy list. be-69 stays in the non-monomial list, and its explain says the formula adds dimensionful terms. be-74's audit tag stays the vacuum constant rewritten through α. `upt regime plasma` stays the vacuous registration. `12nT` converts to `1.2e-8` T. `upt evaluate be-70` still rejects opposite signs of mobility and charge. A search hit that names a description word, such as be-69 on `alfven` and be-76 on `ideal gas`, is labeled. CE-kinetic-pressure remains on the automatic clean-list tag for its `1/3`, which the sourced-prefactor notes already record.

### Not opened, so not used as a number

No solar-wind, magnetopause, fusion-reactivity, probe, pinch, or damping measurement. Where a derive prefactor appears above, it is the command's report of the formula that was typed. The Lorentz resistivity `0.0001031362122638491` and the floating potential `−3.338775328391138` are evaluations of those typed formulas at the constants named beside them.
