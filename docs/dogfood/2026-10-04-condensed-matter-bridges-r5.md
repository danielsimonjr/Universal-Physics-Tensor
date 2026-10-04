# Condensed matter — bridge dogfood of published 4.0.0, 2026-10-04

Model-persona session against the published package `universal-physics-tensor@4.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-400`: `npm init -y && npm i universal-physics-tensor@4.0.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@4.0.0 version gitHead --prefer-online` printed `4.0.0` and `9e7dfa279be3c56d83c1f9436cd3034687f00e3f`. Annotated tag `v4.0.0` is object `956f2159c6c25830195aa22f81973b39ed07074c` and its target is that commit. The publish workflow is run `37227889987`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v4.0.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `4.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.67.0)]` and `2.718281828459045`.

This session is the condensed-matter round. Issue #348 asks for a rotating persona. The engineering-physicist round is `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md`. The task order after that round is condensed-matter, then plasma/space, thermal/chemical engineering, relativity/astro, optics/photonics, and acoustics/continuum mechanics. The next persona on that list is plasma/space. The workflows exercised here are band mass and the Fermi sea, Drude and Sommerfeld transport, phonons and lattice heat capacity, Curie and Pauli and Landau magnetism, superconductivity, the semiconductor mass-action law, the quantum Hall effect and the conductance quantum, Wiedemann–Franz, and the metallic plasma frequency.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 77. Status counts: 41 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–87, with 54 still printed before 53. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 382 quantities, 6 applied cases, 3 regimes.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-400`. "Printed" is the output of `universal-physics-tensor@4.0.0`.

### Conventions

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and says energy, and names `upt eval E E=1eV`. `upt eval E E=1eV` prints `1.602176634e-19`, which is 1 eV in joules. `exp(1)` is `2.718281828459045`. `euler` is refused and names `exp(x)`. `1-e^2` exits 2: `e` is the elementary charge and is not dimensionless. `upt eval F` is `96485.33212331001`. `upt eval G` is `6.6743e-11`. `upt eval B B=1G` and `upt eval B B=1gauss` both exit 0 and print `0.0001`. `upt eval hbar` prints a note that `HBAR_SI = H_SI/(2π)` and then `1.0545718176461565e-34`. `upt eval h` is `6.62607015e-34`. `upt eval k_B` is `1.380649e-23`. `upt eval mu0` is `0.0000012566370621200546`. `upt eval eps0` is `8.8541878128e-12`. `mu0*eps0*c^2` is `1`. `upt help evaluate` names `BE-51/52/55..87`.

### Drude transport, Hall, cyclotron

Copper-scale inputs below use `n = 8.47e28` m⁻³, `m = 9.1093837015e-31` kg, and `τ = 2.5e-14` s. `q` is `-1.602176634e-19` C unless the row says otherwise.

| command | exit | printed |
|---|---|---|
| `upt explain electrical-resistivity` with those four inputs, `--source=canonical` | 0 | recovered `1.67588722009127e-8` via CE-drude-resistivity. The sentence says the inputs fix it up to a dimensionless constant. |
| `upt explain electrical-conductivity carrier-density=8.47e28 charge=-1.602176634e-19 carrier-mobility=0.003 --source=canonical` | 0 | recovered `-40711308.26994` |
| same conductivity, `carrier-mobility=-0.00439705002693041` | 0 | recovered `59669886.374904` |
| `upt explain hall-coefficient` with `n` and `q` above, `--source=canonical` | 0 | recovered `-7.36895994623467e-11` via CE-hall-coefficient |
| `upt explain carrier-mobility` with `q`, `τ`, `m`, `--source=canonical` | 0 | recovered `-0.00439705002693041` |
| `upt explain cyclotron-frequency charge=-1.602176634e-19 magnetic-field=1 mass=9.1093837015e-31 --source=canonical` | 0 | recovered `-175882001077.216`. The summary says the inputs do not fix a unique monomial. The derivation line is `∝ charge·magnetic-field·mass^-1`. The input list also names `magnetic-flux-density`. |
| `upt explain drift-velocity carrier-mobility=0.003 electric-field=100 --source=canonical` | 0 | recovered `0.3` |
| `upt evaluate be-70 mu_m2_per_Vs=0.14 T_K=300 q_C=-1.602176634e-19` | 1 | `mu_m2_per_Vs and q_C must have the same sign` |
| same be-70 with both signs negative | 0 | `D_m2_per_s = 0.0036192799701009757` |

The reciprocal of the printed resistivity is `59669886.3749041`, the both-signs-negative conductivity. `1/(n |q|)` on the Hall inputs is the absolute value of the printed Hall coefficient. `|q| B / m` at 1 T is the absolute value of the printed cyclotron frequency. The negative conductivity and the non-unique cyclotron sentence are issues #370 and #371.

### Fermi sea, plasma frequency, Debye frequency

| command | exit | printed |
|---|---|---|
| `upt explain fermi-energy` with `reduced-planck-constant=1.054571817e-34`, the copper `m` and `n`, `--source=canonical` | 0 | recovered `2.35460972213968e-19` via CE-fermi-energy. The sentence says the inputs fix it up to a dimensionless constant. |
| `upt explain fermi-velocity` with the same three inputs | 0 | recovered `508411.035391819` |
| `upt explain plasma-frequency` with `n`, `charge=1.602176634e-19`, `vacuum-permittivity=8.8541878128e-12`, `m` | 0 | recovered `16418490883261400` |
| `upt explain debye-frequency sound-speed=3000 number-density=8.5e28 --source=canonical` | 0 | recovered `13190489016474.5` |
| `upt explain effective-mass --source=both` | 0 | the quantity is in the graph and has no derivation path |

`2.35460972213968e-19` J is `1.46963` eV. `(ℏ² / 2m) (3π² n)^{2/3}` on the same inputs is `7.03276` eV. The ratio is `4.78539`, which is `(1/2) (3π²)^{2/3}`. The velocity ratio to `(ℏ/m) (3π² n)^{1/3}` is `3.09367`. The Debye print is `v n^{1/3}`; `(6π²)^{1/3}` is `3.89778`. `upt audit --source=canonical` lists `CE-fermi-energy`, `CE-fermi-velocity`, `CE-plasma-frequency`, and `CE-debye-frequency` each as `+[] ×1.000e+0` in the DERIVED block. The latex on the first, second, and fourth rows is a proportionality. This is issue #372.

The plasma print matches `√(n e² / (ε₀ m))`. `upt evaluate be-75 m_kg=9.1093837015e-31 n_per_m3=8.47e28` prints `lambda_m = 1.825944053759763e-8`. The product of that depth and the explained plasma frequency agrees with `c` at the printed precision. `upt explain london-penetration-depth carrier-density=8.47e28 effective-mass=9.1093837015e-31 --source=catalog` recovers the same depth and says the encoded formula carries dimensionful constants. The plasma prefactor `1` is that London depth together with `c = 1/√(μ₀ ε₀)`. It is not proposed again below.

### Encoded condensed-matter bridges

| command | exit | printed |
|---|---|---|
| `upt evaluate be-55 C=1` | 0 | `sigma_xy_S = 0.000038740458649318244`, `R_H_ohm = 25812.807459304513`, `R_K_ohm = 25812.807459304513` |
| `upt evaluate be-60 nu=1/3` | 0 | `nu = 0.3333333333333333`, `R_xy_ohm = 77438.42237791355` |
| `upt evaluate be-59 V_volts=1e-6` | 0 | `f_Hz = 483597848.4169836`, `K_J_Hz_per_V = 483597848416983.6` |
| `upt evaluate be-61 sigma_S_per_m=5.96e7 T_K=300` | 0 | `kappa_W_per_mK = 436.80920622237164`, `L0_W_ohm_per_K2 = 2.443004509073667e-8` |
| `upt evaluate be-62 T_c_K=7.2` | 0 | `gap_0_J = 1.7534124005726843e-22`, `ratio_2gap_over_kTc = 3.527753977724091` |
| `upt atlas be-55` | 0 | `PhysJS.QuantumHall.reciprocal`, kind `bridge`, pin `92f87257a1e3086a48cdc19fe4361cc1c5909d49`. The command says it does not derive `formally-proved`. |
| `upt atlas be-59` | 0 | `PhysJS.Josephson.frequency_eq`, kind `bridge`. The covers line says the factor 2 is the Cooper-pair charge, taken as a premise. |
| `upt atlas be-61` | 0 | `PhysJS.Sommerfeld.integral_eq`, kind `derivation-step`. The covers line says the integral equals `π²/3` and is not the transport law. |
| `upt atlas be-62` | 1 | `be-62 is a catalog equation and has no formalRef` |
| `upt atlas be-75` | 0 | `PhysJS.LondonPenetration.depth_eq`, kind `bridge`. The covers line says units also admit `μ₀ e²/m`. |

`h/e²` is the printed `R_K`. `3 R_K` is `77438.42237791354`. `2e/h` is the printed `K_J`. `1/K_J` is `2.0678338484619295e-15`, and `h/(2e)` is that same number. The flux quantum is that reciprocal. It is not proposed again. `2π exp(-γ)` with `γ = 0.5772156649015328606` is the printed BCS ratio. `upt help evaluate` already names the weak-coupling BCS evaluator.

`upt map --source=catalog --evidence=formally-proved` exits 0: `35 of 68 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76. be-55 and be-60 form a cluster of 2 on `hall-conductance`. be-59, be-70, and be-77 through be-87 are among the isolated kept edges. be-61 and be-62 are not in the kept set.

`upt audit --source=catalog` exits 0: DERIVED 20, DECOY 9, NOT A MONOMIAL 5, OPEN 34. be-55 and be-60 are in the OPEN list at complexity 1. be-75 is in the decoy list, with be-42, be-51, be-14, be-27, be-43, be-67, be-76, and be-81. be-59 is `+[ℏ,e] ×3.183e-1 (empirical/tuned constant)`. `1/π` is `0.3183098861837907`. The 4.0.0 notes already say be-59, be-80, and be-84 stay on that tag because the clean-constant list does not contain the prefactor. That line is not filed again. Canonical audit: DERIVED 79, DECOY 7, NOT A MONOMIAL 0, OPEN 23.

### Search, regime, discover

Exit 1, no entry: `band structure`, `phonon`, `debye temperature`, `debye length`, `dulong`, `curie`, `curie-weiss`, `pauli`, `diamagnetism`, `paramagnetism`, `susceptibility`, `brillouin`, `magnon`, `stoner`, `ginzburg`, `flux quantum`, `semiconductor`, `mass action`, `bloch`, `landau level`, `landau diamagnetism`, `thomas-fermi`, `screening`, `kondo`, `luttinger`, `de haas`, `lyddane`, `bohm-staver`, `bkt`, `berezinskii`, `sum rule`, `gruneisen`, `mott thermopower`, `matthiessen`.

Exit 0, and the hit is a different law or a different object: `landau` returns be-16, `CE-landauer`, and `landauer-erasure-energy`. `coherence length` returns only be-12. `intrinsic` returns the quantity `intrinsic-information`. `conductance quantum` returns be-55 and be-60. `onsager` returns be-73. `thermopower` returns be-73. `fermi energy` returns CE-fermi-energy and also be-18, matched on the description. `effective mass` returns the quantity `effective-mass` and also be-37, matched on the description. Those description hits are labeled. `landau` and `coherence length` are issues #375 and #374.

Exit 0 on the law the query names: `drude resistivity` returns CE-drude-resistivity. `hall coefficient` returns CE-hall-coefficient. `plasma frequency` returns CE-plasma-frequency. `debye` and `debye frequency` return CE-debye-frequency. `bcs`, `superconductivity`, and `gap` return be-62 (`gap` also returns `pull-in-gap` and `child-gap`). `london` returns be-75. `josephson` returns be-59. `quantum hall`, `von klitzing`, and `tknn` return be-55, and `quantum hall` also returns be-60. `wiedemann` and `lorenz number` return be-61. `thomson coefficient` returns be-83 and the quantity `thomson-coefficient`. `skin depth` returns `case-skin-depth` and does not name be-75. `sommerfeld` returns be-61.

`upt regime superconductivity` and `upt regime condensed-matter` exit 1 and list `oscillators`, `diffusion`, `waves`, `plasma`, `piezoelectricity`, `tolman`. `upt regime plasma` exits 0 and says no machine condition was evaluated.

`upt discover --source=canonical` exits 0. Funnel: 377 candidates, 59 promising, 305 inert, 12 magnitude-clash, 0 contradictory, 1 axis-clash. The text does not contain `fermi`, `debye`, `plasma`, `hall`, `drude`, `london`, `phonon`, or `carrier`. The first promising row is `hubble-distance` with `compton-wavelength-full`. The banner says promising means worth a physicist's minute.

`upt explain be-12` exits 0 and says a bridge id is not a graph quantity. `upt search "coherence length"` names that command as the route. `upt atlas be-12` prints the thermal-wavelength theorem. The same explain sentence is what `upt explain be-16` and `upt explain be-18` print.

## (b) New candidates

Each row is **unproven**. The dimensional check is the `upt derive` that was run. A recovered prefactor is the command's report of the formula that was typed. No measurement was opened for any of these. CE-fermi-energy, CE-fermi-velocity, CE-plasma-frequency, and CE-debye-frequency store proportionalities. be-55 and be-60 are `σ = C e²/h` and `σ = ν e²/h`. be-59 is `f = 2eV/h`, and `h/(2e)` is `1/K_J`. be-61 is the Lorenz number. be-62 is the weak-coupling gap ratio. be-75 is the London depth. be-12 is the thermal de Broglie wavelength. CE-equipartition is `(3/2) k_B T`. CE-drude-resistivity, CE-hall-coefficient, CE-carrier-mobility, and CE-cyclotron-frequency are the monomials those names say. be-70, be-80, and be-82 are the Einstein relation, Mott–Gurney, and the Shockley diode. None of those rows is the identity below.

Candidates named in the earlier dogfood reports and still absent are not re-proposed: piezoelectric reciprocity, Larché–Cahn, Mott thermopower, the Nernst thermal voltage, the Nernst effect, Abraham–Minkowski, magnetostriction, Vegard, Faraday induction, optomechanics, strain, pyroelectricity, electrostriction, Saha, Soret, Grüneisen, Verdet, and Pockels. The metallic plasma frequency is `c/λ_L` from be-75 and is not a new bridge. The flux quantum is `1/K_J` from be-59 and is not a new bridge.

### 1. Parabolic band and the spin-1/2 Fermi sea — bands ↔ statistics — unproven

- **Formula.** `E(k) = ℏ² k² / (2 m*)` for an isotropic edge, so `1/m* = ℏ^{-2} ∂²E/∂k²`. For two spin states and a filled sphere, `k_F = (3 π² n)^{1/3}` and `E_F = ℏ² k_F² / (2 m*)`. Then `v_F = ℏ k_F / m*`.
- **Why units are not enough.** `upt derive EF:energy hbar:action m:mass n:L^-3 --formula "(hbar^2/(2*m))*(3*pi^2*n)^(2/3)"` exits 0. Unique monomial `EF ∝ hbar^2 · m^-1 · n^{2/3}`. Recovered prefactor `4.7854e+0`, which is `(1/2)(3π²)^{2/3}` because that factor was typed. The velocity command with `(3π²)^{1/3}` exits 0 and recovers `3.0937e+0` for the same reason. CE-fermi-energy and CE-fermi-velocity are those monomials with the constant unset. No catalog edge is named. `upt explain effective-mass` has no derivation path.
- **Proof-sketch premises.** One isotropic parabolic minimum, spin 1/2, periodic box, T = 0, states filled up to a sphere. The `2` in the denominator is the quadratic term. The `3π²` is two spins times the sphere volume in units of `(2π)³`.
- **Opened.** No band-structure or specific-heat measurement.

### 2. Debye cutoff — phonons ↔ density — unproven

- **Formula.** `ω_D = v_s (6 π² n)^{1/3}` for three acoustic branches and one speed.
- **Why units are not enough.** `upt derive wD:frequency vs:velocity n:L^-3 --formula "vs*(6*pi^2*n)^(1/3)"` exits 0. Unique monomial `wD ∝ vs · n^{1/3}`. Recovered prefactor `3.8978e+0`, which is `(6π²)^{1/3}` because it was typed. CE-debye-frequency is that monomial with the constant unset. `upt search phonon` exits 1.
- **Proof-sketch premises.** Three linear acoustic branches, one atom per primitive cell, mode count equal to the atom density. `3 · (4π/3) k_D³ / (2π)³ = n` is the count. A different branch count changes the number.
- **Opened.** No phonon density of states.

### 3. Debye T³ law — phonons ↔ heat capacity — unproven

- **Formula.** `C_V = (12 π⁴ / 5) N k_B (T / θ_D)³` for `T ≪ θ_D`.
- **Why units are not enough.** `upt derive C:energy/temperature N:dimensionless T:temperature theta:temperature kB:k_B --formula "(12/5)*pi^4*N*kB*(T/theta)^3"` exits 3. Three groups: `N`, `T/θ`, and `C/k_B`. The formula dimension matches entropy. There is no single prefactor. `upt search dulong` and `upt search "debye temperature"` exit 1. CE-heat-capacity is `Q = m c ΔT`.
- **Proof-sketch premises.** The Debye density of states, the Bose integral extended to infinity, and `∫_0^∞ x³ /(exp(x)−1) dx = π⁴/15`. Differentiating `U ∝ T⁴` supplies the extra factor 4 that turns `3/5` into `12/5`.
- **Opened.** No low-temperature heat-capacity measurement.

### 4. Einstein oscillators, and the Dulong–Petit limit — phonons ↔ equipartition — unproven

- **Formula.** `C_V = 3 N k_B (θ_E/T)² exp(θ_E/T) / (exp(θ_E/T) − 1)²`. The high-temperature limit is `3 N k_B`.
- **Why units are not enough.** The same command with that function of `θ_E/T` exits 3. Three groups, as in the Debye T³ check. The formula dimension matches entropy. Units do not produce the Einstein function or the limit `3`. `upt derive C:energy/temperature N:dimensionless kB:k_B --formula "3*N*kB"` also exits 3: groups `N` and `C/k_B`. CE-equipartition is `(3/2) k_B T`, the kinetic piece.
- **Proof-sketch premises.** Three independent quantum harmonic oscillators per atom, and the Planck oscillator energy. Each oscillator has a kinetic quadratic term and a potential quadratic term, so the classical limit is `k_B` per direction and `3 k_B` per atom.
- **Opened.** No Einstein-solid heat capacity.

### 5. Sommerfeld electronic heat capacity — Fermi gas ↔ thermodynamics — unproven

- **Formula.** Per volume, `c_V = (π² / 2) n k_B² T / E_F` for a parabolic three-dimensional gas. With `g(E_F) = (3/2) n / E_F` the same statement is `c_V = (π² / 3) k_B² T g(E_F)`.
- **Why units are not enough.** `upt derive c:entropy/L^3 n:L^-3 T:temperature EF:energy kB:k_B --formula "(pi^2/2)*n*kB^2*T/EF"` exits 3. Two groups: `c /(n k_B)` and `k_B T / E_F`. The formula dimension matches. The `π²/2` is not recovered. be-61's covers line states `∫ x² exp(x) / (1+exp(x))² dx = π²/3` and says that integral is not the transport law. It does not state this heat capacity. `upt search sommerfeld` returns be-61 only.
- **Proof-sketch premises.** Degenerate Fermi–Dirac integrals, a parabolic density of states, and the identification of the energy fluctuation with `c_V`. The transport step that turns the same integral into the Lorenz number is be-61's stated gap, and it is a different identification.
- **Opened.** No electronic specific-heat coefficient.

### 6. Curie–Weiss law — local moments ↔ mean field — unproven

- **Formula.** `χ = C / (T − θ)` with `C = μ₀ n g² μ_B² S(S+1) / (3 k_B)` for spin `S`. The classical vector moment replaces `g² μ_B² S(S+1)` by `μ²` and keeps the `3`.
- **Why units are not enough.** `upt derive chi:dimensionless mu0:permeability n:L^-3 mom:I.L^2 T:temperature kB:k_B --formula "mu0*n*mom^2/(3*kB*T)"` exits 3. Two dimensionless groups, `χ` and `μ₀ n μ² / (k_B T)`. The formula dimension is dimensionless and matches. The `3` is not recovered. `upt derive chi:dimensionless Cc:temperature T:temperature theta:temperature --formula "Cc/(T-theta)"` exits 3. Three groups: `χ`, `Cc/T`, and `Cc/θ`. The formula dimension matches. Units do not choose the subtraction or the sign of `θ`. `upt search curie` and `upt search "curie-weiss"` exit 1.
- **Proof-sketch premises.** High-temperature expansion of the Brillouin function, or of the Langevin function for a classical moment, plus a mean-field shift of the argument. Ferromagnetic and antiferromagnetic `θ` differ by that sign.
- **Opened.** No susceptibility curve.

### 7. Pauli paramagnetism — spin ↔ Fermi-surface density of states — unproven

- **Formula.** `χ_P = μ₀ μ_B² g(E_F) = μ₀ μ_B² (3 n) / (2 E_F)` for a parabolic band. `g(E_F)` counts both spins.
- **Why units are not enough.** `upt derive chi:dimensionless mu0:permeability n:L^-3 muB:I.L^2 EF:energy --formula "mu0*muB^2*(3/2)*n/EF"` exits 3. Two dimensionless groups, `χ` and `μ₀ n μ_B² / E_F`. The `3/2` is not recovered. `upt search pauli` exits 1. No catalog edge.
- **Proof-sketch premises.** Zeeman shift of the two spin Fermi spheres, linear response, and the parabolic density of states. The `3/2` is `E g'(E)/g` at a `√E` density of states, evaluated as `g(E_F) = (3/2) n / E_F`.
- **Opened.** No Pauli susceptibility.

### 8. Landau diamagnetism — orbital motion ↔ the same Fermi gas — unproven

- **Formula.** `χ_L = −χ_P / 3` for free electrons in three dimensions.
- **Why units are not enough.** `upt derive chi:dimensionless chiP:dimensionless --formula "-chiP/3"` exits 3. Two groups, `χ` and `χ_P`. The formula is dimensionless and matches. A ratio of two susceptibilities does not fix `−1/3` or the sign. `upt search "landau diamagnetism"` exits 1. `upt search landau` exits 0 on Landauer's principle, which is issue #375.
- **Proof-sketch premises.** Sum over Landau levels of the orbital free energy of the same parabolic gas that fixes `χ_P`, weak field, no spin–orbit coupling. The orbital piece is one third of the spin piece and opposite in sign. A lattice potential changes the number.
- **Opened.** No diamagnetic measurement.

### 9. BCS coherence length — superconductivity ↔ the Fermi velocity — unproven

- **Formula.** `ξ₀ = ℏ v_F / (π Δ)`.
- **Why units are not enough.** `upt derive xi:length hbar:action vF:velocity Delta:energy --formula "hbar*vF/(pi*Delta)"` exits 0. Unique monomial `ξ ∝ ℏ v_F / Δ`. Recovered prefactor `3.1831e-1`, which is `1/π` because it was typed. No catalog edge is named. be-12 is `√(2π ℏ² / (m k_B T))`. be-75 is the London depth. `upt search "coherence length"` returns be-12, which is issue #374.
- **Proof-sketch premises.** Weak-coupling BCS coherence factors, the Pippard kernel in the clean limit, and the zero-temperature gap. The `π` is that integral. A dirty limit replaces this length by a geometric mean with the mean free path, and that replacement is a different formula.
- **Opened.** No coherence-length measurement.

### 10. Ginzburg–Landau type boundary — superconductivity ↔ electromagnetism — unproven

- **Formula.** The interface energy between normal and superconducting regions changes sign at `κ = λ / ξ = 1/√2`. Type II is `κ > 1/√2`.
- **Why units are not enough.** `λ` and `ξ` are both lengths, so `κ` is already dimensionless. `upt derive kappa:dimensionless --formula "1/sqrt(2)"` exits 0. The monomial is a pure number. Recovered prefactor `7.0711e-1` because `1/√2` was typed. `upt search ginzburg` exits 1. No catalog edge.
- **Proof-sketch premises.** Ginzburg–Landau free energy, the domain-wall solution at the thermodynamic critical field, and the sign of that wall energy. The `1/√2` is the root of that sign change.
- **Opened.** No magnetization curve.

### 11. Upper critical field — flux quantum ↔ the coherence length — unproven

- **Formula.** `B_c2 = Φ₀ / (2 π ξ²)`, with `Φ₀ = h / (2e)`.
- **Why units are not enough.** `upt derive B:M.T^-2.I^-1 Phi:M.T^-2.I^-1.L^2 xi:L --formula "Phi/(2*pi*xi^2)"` exits 0. Unique monomial `B ∝ Φ / ξ²`. Recovered prefactor `1.5915e-1`, which is `1/(2π)` because it was typed. No catalog edge is named. `Φ₀ = 1/K_J` is be-59. The `2π` is not that reciprocal. `upt search "flux quantum"` exits 1.
- **Proof-sketch premises.** Linearized Ginzburg–Landau equation in a uniform field, the lowest Landau level, and the flux quantum from the Cooper-pair charge. The `2π` is that eigenvalue.
- **Opened.** No upper-critical-field measurement.

### 12. Ambegaokar–Baratoff — tunneling ↔ the BCS gap — unproven

- **Formula.** At zero temperature, `I_c R_n = π Δ / (2 e)`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive Ic:charge/time Rn:resistance Delta:energy ee:e --formula "pi*Delta/(2*ee*Rn)"` exits 0. Unique monomial `I_c ∝ Δ / (e R_n)`. Recovered prefactor `1.5708e+0`, which is `π/2` because it was typed. be-59 is `f = 2e V / h`. It does not state this product. No catalog edge.
- **Proof-sketch premises.** Tunnel Hamiltonian, identical gaps on the two sides, zero temperature, and the BCS coherence factors integrated across the gap. The `π/2` is that integral.
- **Opened.** No junction critical current.

### 13. BCS specific-heat jump — superconductivity ↔ the normal Fermi gas — unproven

- **Formula.** `ΔC / C_n = 12 / (7 ζ(3))` at `T_c` in weak coupling. `ζ(3) = 1.202056903159594`, and the ratio is `1.42613`.
- **Why units are not enough.** `upt derive ratio:dimensionless --formula "12/(7*1.202056903159594)"` exits 0. The target is already dimensionless. Recovered prefactor `1.4261e+0` because that number was typed. be-62 prints `2Δ(0)/(k_B T_c) = 3.527753977724091`, which is `2π exp(−γ)`. A gap ratio and a heat-capacity ratio are different pure numbers. `upt atlas be-62` says be-62 has no formalRef.
- **Proof-sketch premises.** Weak-coupling gap slope at `T_c`, the condensation-energy second derivative, and the normal-state Sommerfeld heat capacity in the denominator. Strong coupling changes the number.
- **Opened.** No specific-heat jump.

### 14. Intrinsic density and the mass-action law — semiconductor statistics — unproven

- **Formula.** `n_i = √(N_c N_v) exp(−E_g / (2 k_B T))`, so `n p = n_i²` for a nondegenerate intrinsic gap.
- **Why units are not enough.** `upt derive ni:L^-3 Nc:L^-3 Nv:L^-3 Eg:energy T:temperature kB:k_B --formula "sqrt(Nc*Nv)*exp(-Eg/(2*kB*T))"` exits 3. Three groups: `n_i/N_c`, `n_i/N_v`, and `E_g/(k_B T)`. The formula dimension is a number density and matches. Units make the exponent dimensionless. They do not produce the exponential, the square root, or the `2`. be-82 is `I = I_s (exp(e V / (k_B T)) − 1)`. `upt search "mass action"` and `upt search semiconductor` exit 1. `upt search intrinsic` returns `intrinsic-information`.
- **Proof-sketch premises.** Two nondegenerate parabolic bands, Boltzmann tails, and a chemical potential that cancels in the product `n p`. The `2` is the square root of `exp(−E_g / k_B T)`.
- **Opened.** No intrinsic carrier-density measurement.

### 15. Lyddane–Sachs–Teller — polar phonons ↔ the dielectric function — unproven

- **Formula.** `ω_LO² / ω_TO² = ε(0) / ε(∞)` for one infrared-active branch.
- **Why units are not enough.** `upt derive R:dimensionless wL:frequency wT:frequency --formula "(wL/wT)^2"` exits 3. Two groups, `R` and `ω_LO/ω_TO`. The formula is dimensionless and matches. A ratio of frequencies does not have to be squared, and nothing in the dimensions equates it to a ratio of dielectric constants. `upt search lyddane` exits 1. No catalog edge.
- **Proof-sketch premises.** A harmonic polar lattice, one transverse oscillator in `ε(ω)`, no damping, and the longitudinal root where `ε(ω) = 0`. The squares are those pole and zero frequencies.
- **Opened.** No infrared reflectance.

### 16. Berezinskii–Kosterlitz–Thouless jump — two-dimensional phase stiffness — unproven

- **Formula.** `k_B T_BKT = π J / 2`, with `J` the renormalized stiffness at the jump.
- **Why units are not enough.** `upt derive T:temperature J:energy kB:k_B --formula "pi*J/(2*kB)"` exits 0. Unique monomial `T ∝ J / k_B`. Recovered prefactor `1.5708e+0`, which is `π/2` because it was typed. `upt search bkt` and `upt search kosterlitz` exit 1. No catalog edge. Curie–Weiss is a different temperature, candidate 6.
- **Proof-sketch premises.** Two-dimensional XY model, vortex unbinding, and the universal jump of the renormalized helicity modulus. A three-dimensional ordering temperature is not this number.
- **Opened.** No superfluid-density jump.

### 17. Landauer conductance of one spin-degenerate channel — mesoscopics ↔ charge — unproven

- **Formula.** `G = (2 e² / h) Σ_n T_n` for a two-terminal conductor with spin degeneracy left intact. For one perfectly transmitting mode, `G = 2 e² / h`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive G:M^-1.L^-2.T^3.I^2 ee:e hh:action --formula "2*ee^2/hh"` exits 0. Unique monomial `G ∝ e² / h`. Recovered prefactor `2.0000e+0` because the `2` was typed. No catalog edge is named. be-55 is `σ_xy = C e² / h` for a Hall Chern number. `C = 1` is `e²/h`. `upt search "conductance quantum"` returns be-55 and be-60. The `2` in be-59 is the Cooper-pair charge in `2e/h`, a frequency over a voltage, not this conductance.
- **Proof-sketch premises.** Coherent two-terminal scattering, spin degeneracy not lifted, and transmission eigenvalues of the scatterer. Lifting the spin degeneracy replaces `2` by `1` per spin species. That replacement is the same monomial with a different integer.
- **Opened.** No conductance histogram.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository.

### Medium

[#370](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/370). **Drude conductivity is negative when mobility is positive and the carrier charge is negative.** `upt explain electrical-conductivity carrier-density=8.47e28 charge=-1.602176634e-19 carrier-mobility=0.003 --source=canonical` exits 0 and prints `-40711308.26994`. Both signs negative print `59669886.374904`. The Drude resistivity on the matching `τ` is `1.67588722009127e-8`, whose reciprocal is that positive conductivity. `upt evaluate be-70` with a positive mobility and `q = −e` exits 1.

[#371](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/371). **Cyclotron and Larmor explain say the monomial is not unique.** `upt explain cyclotron-frequency` with `magnetic-field=1` lists `magnetic-flux-density` as well and says the inputs do not fix a unique monomial. The derivation line is `∝ charge·magnetic-field·mass^-1`. The recovered value is `-175882001077.216`. Larmor radius with one magnetic field prints the same sentence. Its derivation line is a unique monomial, and the recovered radius at the inputs above is `0.00000568563010356572`.

[#372](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/372). **Explain and the canonical audit present the unit monomial as the Fermi energy, Fermi velocity, and Debye frequency.** The copper-density Fermi explain prints `2.35460972213968e-19` J, which is `1.46963` eV. `(ℏ² / 2m) (3π² n)^{2/3}` is `7.03276` eV. The velocity print is low by `(3π²)^{1/3}`. The Debye print is `v n^{1/3}`, low by `(6π²)^{1/3}`. The audit lists all three, and the plasma frequency, as DERIVED `×1.000e+0`. The plasma `×1` matches `√(n e² / (ε₀ m))` and matches `c / λ_L` from be-75.

[#373](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/373). **A hyphenated name in `upt derive --formula` is parsed as subtraction.** The dimension argument `reduced-planck-constant:action` is accepted and printed in the monomial. The formula then exits 2 with `undeclared symbol 'reduced'`. Short names `hbar`, `m`, and `n` exit 0 and recover `4.7854e+0`.

[#374](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/374). **Search for coherence length returns the thermal de Broglie wavelength.** `upt search "coherence length"` exits 0 on be-12 only and routes to `upt explain be-12`, which exits 0 and prints no formula. `upt atlas be-12` prints `PhysJS.ThermalDeBroglie.wavelength_eq` and says the theorem is not Caldeira–Leggett dephasing. `upt search ginzburg` exits 1.

[#376](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/376). **be-83 labels dS/dT dimensionless.** `upt evaluate be-83 T_K=300 dS_dT_V_per_K2=1e-6` exits 0, labels the slope `[dimensionless]`, and prints `mu_V_per_K = 0.0003`. The meaning string says volts per kelvin squared. JSON `unit` is empty. `dS_dT_V_per_K2=1e-6V/K2` exits 1 with `unknown name 'K2'`.

### Low

[#375](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/375). **`upt search landau` returns Landauer's principle.** Exit 0 on be-16, `CE-landauer`, and `landauer-erasure-energy`. `upt search "landau diamagnetism"` and `upt search "landau level"` exit 1.

### What held, and is not filed

`upt evaluate be-70` rejects opposite signs of mobility and charge. `upt eval B B=1gauss` prints `0.0001`. `upt explain` of Stokes drag at the round-4 inputs recovers `1.88495559215388e-12`. `upt search "thomson coefficient"` names be-83 and does not name be-73. `upt search "skin depth"` names `case-skin-depth` and does not name be-75. Hall coefficient with a negative charge recovers `1/(n q)`. The BCS ratio print equals `2π exp(−γ)`. The von Klitzing print equals `h/e²`. `1/K_J` equals `h/(2e)`. The explained plasma frequency times the be-75 depth agrees with `c`. be-59, be-80, and be-84 remain on the empirical/tuned audit tag, which the 4.0.0 notes already record. be-75 remains in the catalog decoy list. be-61's covers line still says the Sommerfeld integral is not the transport law. A search hit that names a description word, such as be-18 on `fermi` and be-37 on `effective mass`, is labeled.

### Not opened, so not used as a number

No band-structure, heat-capacity, susceptibility, coherence-length, critical-field, junction, carrier-density, reflectance, or conductance measurement. Where a derive prefactor appears above, it is the command's report of the formula that was typed.
