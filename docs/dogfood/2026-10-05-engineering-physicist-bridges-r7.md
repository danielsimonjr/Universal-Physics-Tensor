# Engineering physicist — bridge dogfood of published 6.0.0, 2026-10-05

Model-persona session against the published package `universal-physics-tensor@6.0.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-600`: `npm init -y && npm i universal-physics-tensor@6.0.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@6.0.0 version gitHead --prefer-online` printed `6.0.0` and `40c98098ebfbcacd75d70dd06949814c4af68d26`. Annotated tag `v6.0.0` is object `6f77152babee080e17ba020c9ac32bd29d636411` and its target is that commit. The publish workflow is run `37346060294`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v6.0.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `6.0.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.68.0)]` and `2.718281828459045`.

This session is the engineering-physicist round. [Issue #348](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/348) asks for a rotating persona. Its written list begins with condensed matter. The previous engineering-physicist round is `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md`. The condensed-matter round is `docs/dogfood/2026-10-04-condensed-matter-bridges-r5.md`. The plasma and space round is `docs/dogfood/2026-10-04-plasma-space-bridges-r6.md`. The persona for this round is the engineering physicist. The next persona named for the rotation is condensed-matter. The workflows exercised here are electromechanical transducers, heat transfer and thermoelectrics, fluid and structure, semiconductor devices, power and RF, sensors, and control-relevant dimensionless groups.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 115. Status counts: 79 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–125. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 517 quantities, 6 applied cases, 3 regimes. `upt help evaluate` names `BE-16/42/51/52/55..125`.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-600`. "Printed" is the output of `universal-physics-tensor@6.0.0`. The library calls are `evaluateRelation` and the edge objects from that install.

### r4–r6 checklist

| theme | result | what 6.0.0 did |
|---|---|---|
| Carrier, mobility, and charge signs | pass on the values | Einstein, Hall, cyclotron, and conductivity behave as the 6.0.0 sign notes. Plasma frequency and Larmor radius are positive magnitudes. The proportionality sentence on those two is issue #419. |
| Kelvin, eV, and energy in a temperature slot | pass | `upt eval`, `upt explain`, and `upt evaluate` read `10eV` on a temperature name as `k_B T`. `temperature=1m` exits 1. `E=10eV` stays joules. |
| COEFFICIENT UNSET versus a false DERIVED ×1 | pass | Unsourced dimensional rows are the six COEFFICIENT UNSET names. Unbound sound speed prints no recovered number. A sourced 1, including plasma frequency and ideal gas with `N`, stays DERIVED ×1. |
| Synonym uniqueness | pass for one spelling and for equal spellings; fail when the two spellings disagree | One magnetic name, or the same number on both names, is one governing variable. Unequal `magnetic-field` and `magnetic-flux-density` still print a recovered cyclotron frequency. That is issue #418. |
| Bare `e`, bare `E`, Euler only as `exp(x)` | pass | `e` is the elementary charge. Bare `E` exits 2 and names energy. `euler` is refused. `exp(1)` is Euler's number. `1-e^2` exits 2. |

#### Signs

| command | exit | printed |
|---|---|---|
| `upt evaluate be-70 mu_m2_per_Vs=0.14 T_K=300 q_C=-1.602176634e-19` | 1 | `electrical-mobility (mu_m2_per_Vs) and carrier-charge (q_C) must have the same sign` |
| same command, both signs negative | 0 | `D_m2_per_s = 0.0036192799701009757` |
| same command, both signs positive | 0 | the same positive diffusivity |
| `evaluateRelation('be-70', { mu_m2_per_Vs: 0.14, T_K: 300, q_C: -e })` | throw | `CarrierSignError` with that sentence |
| `upt explain hall-coefficient carrier-density=1e22 charge=-1.602176634e-19 --source=canonical` | 0 | recovered `-0.000624150907446076` |
| same Hall command, positive charge | 0 | recovered `0.000624150907446076` |
| `upt explain cyclotron-frequency charge=-1.602176634e-19 magnetic-field=1 mass=9.1093837015e-31 --source=canonical` | 0 | recovered `-175882001077.216`. Known set `{charge, magnetic-field, mass}`. |
| same cyclotron command at `magnetic-field=12e-9` | 0 | recovered `-2110.5840129266` |
| `upt explain electrical-conductivity carrier-density=8.47e28 charge=-1.602176634e-19 carrier-mobility=0.003 --source=canonical` | 1 | `charge and carrier-mobility must have the same sign` |
| same conductivity, both signs negative | 0 | recovered `40711308.26994` |
| same conductivity, both signs positive | 0 | the same positive conductivity |
| `upt explain plasma-frequency` at `n=1e6` m⁻³, `charge=-e`, `ε0`, electron mass | 0 | recovered `56414.6023118063`. The sentence says `∝ …·charge·…`. Issue #419. |
| `upt explain larmor-radius` at electron mass, `speed=1e6`, `charge=-e`, `B=1` | 0 | recovered `0.00000568563010356572`. The sentence says `∝ …·charge^-1·…`. Issue #419. |
| `upt explain carrier-mobility charge=-e relaxation-time=2.5e-14 mass=9.1093837015e-31 --source=canonical` | 0 | recovered `-0.00439705002693041` |
| `upt explain drift-velocity carrier-mobility=-0.003 electric-field=100 --source=canonical` | 0 | recovered `-0.3` |

The positive diffusivity is `μ k_B T / |q|` at `μ = 0.14` m²/(V·s) and 300 K. The conductivity number is `n |q| |μ|` at the copper density used in the round-5 repro. Mobility `q τ / m` stays signed. Drift velocity `μ E` stays signed. Cyclotron frequency stays signed.

#### Temperature

`upt eval "k_B*T/e" T=10eV` exits 0, says `T` is `1.160452e+5` K, and prints `10`. `upt explain most-probable-speed` with `temperature=10eV` says the same reading, prints no recovered number, and says the factor is unset. `upt explain plasma-beta carrier-density=5e6 temperature=10eV magnetic-pressure=5.72957794818894e-11 --source=catalog` recovers `0.139816287385219`. `upt evaluate be-76` with `T_K=10eV` converts to `116045.181215501` K and prints that beta. The same beta at `T_K=116045.1812` is `0.13981628736654325`. `upt evaluate be-82 I_s_A=1e-12 V_volts=0.026 T_K=10eV` prints `I_A = 2.6033829315865732e-15`, which is `I_s (exp(0.026/10) − 1)`. `upt evaluate be-87 T_K=10eV C_F=1e-12` prints `v2_V2 = 0.000001602176634`, which is `(10 e) / C`. `upt evaluate be-73 S_V_per_K=200e-6 T_K=10eV` prints `Pi_V = 23.20903624310016`. `temperature=1m` exits 1 on explain, evaluate, and eval. `upt eval E E=10eV` prints `1.602176634e-18`. `T_K=25degC` on be-87 converts to `298.15` K. `T_K=77degF` exits 1: Fahrenheit is not accepted.

#### Coefficients

| command | exit | printed |
|---|---|---|
| `upt explain sound-speed pressure=1e5 density=1.2 --source=canonical` | 0 | no recovered number. The factor is unset. |
| same command, `gamma=1.4` | 0 | recovered `341.565025531987` |
| same command, `gamma=1` | 0 | recovered `288.675134594813` |
| `upt explain speed pressure=1e5 density=1.2 --source=canonical` | 0 | no derivation path. It does not name CE-sound-speed. |
| `upt explain speed tension=4 linear-density=1 --source=canonical` | 0 | recovered `2` via CE-string-wave-speed |
| `upt explain fermi-energy` with `ℏ`, the electron mass, and `n=8.47e28` | 0 | no recovered number. The factor is unset. It names `(1/2)(3π²)^{2/3}`. |
| `upt explain fermi-velocity` with those inputs | 0 | unset. It names `(3π²)^{1/3}`. |
| `upt explain debye-frequency sound-speed=3000 number-density=8.5e28 --source=canonical` | 0 | unset. It names `(6π²)^{1/3}`. |
| `upt explain pressure` with `k_B`, `T=300`, `V=0.0224`, and no `N` | 0 | no recovered value. It names `N`. |
| same command, `N=6.02214076e23` | 0 | recovered `111354.410064552` |
| `evaluateRelation('CE-sound-speed', { pressure: 1e5, density: 1.2 })` | — | `{ kind: 'unset' }` |
| same call, `gamma: 1.4` | — | `{ kind: 'value', value: 341.5650255319867 }` |
| `upt explain force viscosity=1e-3 radius=1e-6 speed=1e-4 --source=canonical` | 0 | recovered `1.88495559215388e-12` |
| `upt explain dynamic-pressure density=1000 flow-velocity=2 --source=canonical` | 0 | recovered `2000` |
| `upt explain laplace-pressure surface-tension=0.072 droplet-radius=1e-3 --source=canonical` | 0 | recovered `144` |
| `upt explain energy capacitance=2 voltage=3 --source=canonical` | 0 | recovered `9` |
| `upt explain energy inductance=2 current=3 --source=canonical` | 0 | recovered `9` |
| `upt explain magnetic-field current=1 distance=1 mu_0=1.25663706212e-6 --source=canonical` | 0 | recovered `2.00000000108875e-7` |

`upt audit --source=canonical` exits 0: DERIVED 73, COEFFICIENT UNSET 6, DECOY 11, NOT A MONOMIAL 0, OPEN 19. The unset rows are `CE-thermal-de-broglie`, `CE-sound-speed`, `CE-fermi-energy`, `CE-fermi-velocity`, `CE-debye-frequency`, and `CE-mb-most-probable-speed`. `CE-plasma-frequency` is DERIVED `×1.000e+0`. `CE-ideal-gas` is DERIVED `+[k_B] ×1.000e+0`. `CE-jarzynski` is DERIVED `+[k_B] ×1.000e+0`. `CE-stokes-drag` is `×1.885e+1`. `CE-kinetic-energy`, `CE-capacitor-energy`, and `CE-inductor-energy` are `×5.000e-1`. `CE-magnetic-field-wire` is `×1.592e-1`.

The Stokes number is `6π η r v`. Dynamic pressure is `(1/2) ρ v²`. Laplace pressure is `2γ/r`. Capacitor and inductor energies are the half. The wire field is `μ0 I / (2π r)`. Those sourced factors are in the recovered numbers.

#### Synonyms

`upt explain cyclotron-frequency` with `magnetic-field=1` and `magnetic-flux-density=1` exits 0. The known set is `{charge, magnetic-field, mass}`. Recovered value `-175882001077.216`. It does not say the monomial is non-unique. The same command with `magnetic-flux-density=2` instead of `1` exits 0, names both magnetic quantities, prints `Recovered value: -175882001077.216`, and says the inputs do not fix a unique monomial. Flux density alone at `2` recovers `-351764002154.433`. That split is issue #418.

`upt explain erasure-energy temperature=300 --source=catalog` names `landauer-erasure-energy` and recovers `2.87097888507872e-21` via be-16. `upt search "reynolds number"` exits 1. `upt search "prandtl number"` exits 0 on be-86 and says `words in: gloss`. `upt explain debye-length` exits 1, says NOT COVERED, and does not list the phonon Debye family. `upt search landau` says `landau is a prefix of landauer` and also names be-113. `upt explain lenght` exits 1 on the full catalog graph.

#### Bare `e`, `E`, and `exp`

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and names `upt eval E E=1eV`. `upt eval E E=1eV` prints `1.602176634e-19`. `exp(1)` is `2.718281828459045`. `euler` exits 2 and names `exp(x)`. `1-e^2` exits 2: `e` is the elementary charge and is not dimensionless. `upt eval F` is `96485.33212331001`. `upt eval G` is `6.6743e-11`. `upt eval mu0` is `0.0000012566370621200546`. `upt eval eps0` is `8.8541878128e-12`. `mu0*eps0*c^2` is `1`. `upt eval B B=1G` and `upt eval B B=1gauss` both exit 0 and print `0.0001`.

### Proved bridges that this persona already proposed

These commands check the round-4 identities. They are not proposed again. BE-88 through BE-102 and BE-103 through BE-125 are the later rounds and are not proposed again. `upt search` finds `poiseuille`, `hagen`, `buckling`, `pull-in`, `mott-gurney`, `child-langmuir`, `shockley`, `thomson coefficient` (be-83), `shot noise`, `sheet resistance`, and `capacitor` (be-87).

| command | exit | printed |
|---|---|---|
| `upt evaluate be-77 R_m=0.01 deltaP_Pa=1000 mu_Pa_s=0.001 L_m=1` | 0 | `Q_m3_per_s = 0.003926990816987241` |
| `evaluateRelation('be-77', …)` with those inputs | — | the same flow |
| `upt evaluate be-78 E_Pa=2e11 I_m4=1e-8 L_m=2` | 0 | `P_N = 4934.802200544679` |
| `upt evaluate be-79 k_N_per_m=1 g0_m=1e-6 A_m2=1e-8` | 0 | `V_pi_V = 1.8293160570718219` |
| `upt evaluate be-80 eps=8.8541878128e-12 mu_m2_per_Vs=1e-4 V_volts=1 d_m=1e-6` | 0 | `J_A_per_m2 = 996.0961289400001` |
| `upt evaluate be-82 I_s_A=1e-12 V_volts=0.7 T_K=300` | 0 | `I_A = 0.5747545691036854` |
| `upt evaluate be-83 T_K=300 dS_dT_V_per_K2=1e-6` | 0 | `mu_V_per_K = 0.0003` |
| `upt evaluate be-84 V_volts=1 I_A=1e-3` | 0 | `R_s_ohm = 4532.360141827194` |
| `upt evaluate be-85 I_A=1e-6` | 0 | `S_I_A2_per_Hz = 3.204353268e-25` |
| `upt evaluate be-86 C_f=0.004` | 0 | `St = 0.002` |
| `upt evaluate be-87 T_K=300 C_F=1e-12` | 0 | `v2_V2 = 4.1419470000000004e-9` |
| `upt evaluate be-74 B_T=1` | 0 | `p_Pa = 397887.35751312086` |
| `be74Edge.evaluate({ B_T: 1 })` | — | the same pressure |

The pipe flow is `π R⁴ ΔP / (8 μ L)`. The pinned load is `π² E I / L²`. The pull-in voltage is `√(8 k g0³ / (27 ε0 A))`. The Mott–Gurney current is `(9/8) ε μ V² / d³`. The diode current is `I_s (exp(e V / (k_B T)) − 1)` at 0.7 V and 300 K. The sheet resistance is `(π / ln 2) (V/I)`. The shot spectrum is `2 e I`. The Stanton number is `C_f / 2`. The capacitor variance is `k_B T / C`. `be74Edge.evaluate({ B_T: 1 })` returns the pressure. The round-4 library failure on that key does not reproduce.

`upt map --source=catalog --evidence=formally-proved` exits 0: `73 of 106 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76.

`upt audit --source=catalog` exits 0: DERIVED 27, COEFFICIENT UNSET 0, DECOY 15, NOT A MONOMIAL 12, OPEN 52. be-74 is `+[ℏ,c,e] ×5.452e+0 (vacuum constant; μ0 rewritten through α)`. be-80 is `×1.125e+0 (empirical/tuned constant)`. be-84 is `×4.532e+0 (empirical/tuned constant)`. be-85 is `+[e] ×2.000e+0`. be-87 is `+[k_B] ×1.000e+0`. The decoy list is be-42, be-51, be-14, be-27, be-43, be-67, be-75, be-76, be-81, be-92, be-94, be-109, be-117, be-120, be-121. The non-monomial list is be-54, be-36, be-50, be-40, be-69, be-93, be-105, be-106, be-107, be-108, be-112, be-115. The be-80 and be-84 empirical tags are the clean-list mark already recorded for those two ids. They are not filed again.

### Search

Exit 1, no entry: `built-in`, `built in voltage`, `depletion`, `subthreshold`, `mosfet`, `square law`, `boost`, `fin efficiency`, `radiosity`, `emissivity`, `view factor`, `comb drive`, `water hammer`, `joukowsky`, `thermoelectric efficiency`, `figure of merit`, `van der pauw`, `coax`, `coaxial`, `damping ratio`, `insulation`, `squeeze film`, `aperture`, `friis`, `gauge factor`, `wheatstone`, `slit flow`, `nusselt`, `grashof`, `capacitor noise`.

Exit 0, and the hit is a different law or a labeled prefix: `fin` returns be-56 and `case-damped-resonator` because `fin` is a prefix of `finite`, and both hits say so. `critical radius` returns be-118, the Parker radius. `stanton` returns the quantity `stanton-number`. `biot` returns `case-lumped-cooling`. `skin depth` returns `case-skin-depth` only. `piezoelectric` returns the piezoelectricity regime. `landau` returns the Ginzburg–Landau, Landau-damping, and Landauer rows, and it says `landau` is a prefix of `landauer`.

`upt search "van der pauw"` still exits 1. The round-4 four-point writeup already recorded that identity as absent. It is not opened as a new row here. BE-84 remains the equal-spacing sheet factor.

## (b) New candidates

Each row is **unproven**. The dimensional check is the `upt derive` that was run. A recovered prefactor is the command's report of the formula that was typed. No measurement was opened for any of these.

be-77 through be-87 are the round-4 list. be-73 is `Π = S T`. be-83 is `μ_T = T dS/dT`. CE-carnot-efficiency is `1 − T_c/T_h`. CE-stefan-boltzmann is `j = σ T⁴`. CE-capacitance-parallel-plate is `C = ε0 A / d`. CE-simple-harmonic-frequency is `ω = √(k/m)` with a sourced 1. CE-lc-resonance is `ω0 = 1/√(LC)` with a sourced 1. CE-sound-speed is `√(γ P/ρ)` with `γ` unset until it is bound. BE-103 through BE-125 are the round-6 plasma and space list, including the upper hybrid, the R cutoff, and the cross-field factor. None of those rows is the identity below.

Candidates named in the earlier dogfood reports and still absent are not re-proposed: piezoelectric reciprocity, Larché–Cahn, Mott thermopower, the Nernst thermal voltage, the Nernst effect, Abraham–Minkowski, magnetostriction, Vegard, Faraday induction, optomechanics, strain, pyroelectricity, electrostriction, Saha, Soret, Grüneisen, Verdet, and Pockels.

### 1. Comb-drive lateral force — electromechanical transducers — unproven

- **Formula.** For `n` fingers, overlap along `x`, gap `g`, and thickness `h`, `C = 2 n ε0 h x / g` when both sidewalls count. The coenergy derivative at fixed voltage is `F = (1/2) V² dC/dx = n ε0 h V² / g`. The `1/2` and the sidewall `2` cancel only when both sidewalls are in `dC/dx`.
- **Why units are not enough.** `upt derive F:force n:dimensionless eps:eps0 h:length V:energy/charge g:length --formula "n*eps*h*V^2/g"` exits 3. Three groups: `n`, `F · eps^-1 · V^-2`, and `h · g^-1`. The formula dimension is `[force]` and matches. There is no single prefactor. The aspect ratio `h/g` stays free, and the cancelled `1` is not recovered. be-79 is the parallel-plate pull-in voltage. Its fold is normal to the plates.
- **Proof-sketch premises.** Voltage-controlled capacitor, lateral motion, fringe neglected, gap fixed. Coenergy `W' = (1/2) C(x) V²`. Differentiate in `x`.
- **Opened.** No comb-drive measurement.

### 2. Subthreshold swing — semiconductor devices — unproven

- **Formula.** `S = ln(10) (k_B T / e) (1 + C_d / C_ox)`, in volts per decade of drain current, for a MOSFET in weak inversion. Here `e` is the elementary charge. The `ln` is the natural logarithm. A decade is the change of `log10`.
- **Why units are not enough.** `upt derive S:energy/charge T:temperature kB:k_B ee:e Cd:charge^2/energy Cox:charge^2/energy --formula "ln(10)*(kB*T/ee)*(1+Cd/Cox)"` exits 3. Three groups: `S · T^-1 · kB^-1 · ee`, `S^2 · T^-1 · kB^-1 · Cd`, and `S^2 · T^-1 · kB^-1 · Cox`. The formula dimension is a voltage and matches. Units make `k_B T / e` a voltage. They do not produce `ln(10)`, and they do not add the two capacitances. be-82 is the ideal diode current. It is not this gate swing.
- **Proof-sketch premises.** Drift-diffusion in weak inversion, Boltzmann electrons, gate and depletion capacitances as a divider on the surface potential, and a current that is exponential in that potential. The `ln(10)` converts the natural exponent to a decade.
- **Opened.** No subthreshold swing measurement.

### 3. Ideal boost, continuous conduction — power — unproven

- **Formula.** `V_out / V_in = 1 / (1 − D)` for a lossless boost converter in periodic steady state with continuous inductor current. The buck ratio `D` is a different volt-second root.
- **Why units are not enough.** `upt derive ratio:dimensionless D:dimensionless --formula "1/(1-D)"` exits 3. Two groups: `ratio` and `D`. The formula is dimensionless and matches. A duty ratio does not pick `1/(1−D)`. `upt search boost` exits 1.
- **Proof-sketch premises.** Ideal switches, constant input and output voltages over a period, inductor volt-second balance, and current that does not reach zero. The off-state inductor voltage is `V_in − V_out`.
- **Opened.** No converter measurement.

### 4. Straight fin, adiabatic tip — heat transfer — unproven

- **Formula.** For a long rectangular fin of thickness `t`, `m = √(2 h / (k t))`, and the efficiency of an adiabatic tip is `η = tanh(m L) / (m L)`.
- **Why units are not enough.** `upt derive m:L^-1 h:power/area/temperature k:power/length/temperature t:length --formula "sqrt(2*h/(k*t))"` exits 3. Two groups: `m · h^-1 · k` and `m · t`. The formula dimension is `[L^-1]` and matches. The power `1/2` and the face count `2` are not recovered. `upt derive eta:dimensionless mL:dimensionless --formula "tanh(mL)/mL"` exits 3. Two groups: `eta` and `mL`. The formula is dimensionless and matches. `tanh` is not fixed by two pure numbers. `upt search "fin efficiency"` exits 1. `case-lumped-cooling` is the Biot lump, not this fin.
- **Proof-sketch premises.** Steady fin equation `d²θ/dx² = m² θ` with `m² = h P / (k A)`. For `w ≫ t`, `P/A = 2/t`. Adiabatic tip, base temperature imposed. Efficiency is the actual heat flow divided by `h (perimeter · L) θ_b`.
- **Opened.** No fin measurement.

### 5. Thermoelectric generator efficiency — thermoelectrics — unproven

- **Formula.** At the current that maximizes efficiency, `η = (1 − T_c/T_h) (√(1 + Z T_m) − 1) / (√(1 + Z T_m) + T_c/T_h)`, with `Z = S² σ / κ` and `T_m` the mean of the two junction temperatures.
- **Why units are not enough.** `upt derive eta:dimensionless Th:temperature Tc:temperature ZTm:dimensionless --formula "((Th-Tc)/Th)*(sqrt(1+ZTm)-1)/(sqrt(1+ZTm)+Tc/Th)"` exits 3. Three groups: `eta`, `Th · Tc^-1`, and `ZTm`. The formula is dimensionless and matches. The Carnot factor, the two square roots, and the placement of `T_c/T_h` are not fixed by those groups. CE-carnot-efficiency is only `1 − T_c/T_h`. be-73 is `Π = S T`. be-83 is `μ_T = T dS/dT`. `upt search "figure of merit"` and `upt search "thermoelectric efficiency"` exit 1.
- **Proof-sketch premises.** Constant properties, heat current `Q = S T I − I² R / 2 − K ΔT` at the hot junction, electrical power `I² R_load`, and `dη/dI = 0`. The `1/2` on the Joule term is the split of that heat between the two junctions. Matched load is a different stationary point.
- **Opened.** No generator measurement.

### 6. Joukowsky pressure, and the thin-wall pipe speed — fluid and structure — unproven

- **Formula.** A sudden closure gives `Δp = ρ c Δv`. For a thin elastic pipe the wave speed is `c = √(K/ρ) / √(1 + (K/E) (D / e_wall))`, with `K` the fluid bulk modulus, `E` the wall modulus, `D` the diameter, and `e_wall` the wall thickness.
- **Why units are not enough.** `upt derive dp:pressure rho:density c:velocity dv:velocity --formula "rho*c*dv"` exits 3. Two groups: `dp · rho^-1 · c^-2` and `dp · rho^-1 · dv^-2`. The formula dimension is a pressure and matches. `ρ c²` and `ρ (Δv)²` are the other pressures units allow. `upt derive c:velocity K:pressure rho:density E:pressure D:length wall:length --formula "sqrt(K/rho)/sqrt(1+(K/E)*(D/wall))"` exits 3. Three groups: `c^2 · K^-1 · rho`, `K · E^-1`, and `D · wall^-1`. The formula dimension is a velocity and matches. The sum inside the second square root is not a monomial. CE-sound-speed is a fluid `√(γ P/ρ)`. It does not carry the wall.
- **Proof-sketch premises.** One-dimensional unsteady mass and momentum, a closure that adds fluid compressibility to hoop strain, and a valve motion fast compared with `L/c`. The rigid-wall limit drops the second term under the square root.
- **Opened.** No water-hammer measurement.

### 7. Coaxial capacitance per length — power and RF — unproven

- **Formula.** `C' = 2 π ε / ln(b/a)` for a long coaxial pair, inner radius `a`, outer radius `b`, and insulator permittivity `ε`.
- **Why units are not enough.** `upt derive CpL:charge^2/energy/length eps:eps0 b:length a:length --formula "2*pi*eps/ln(b/a)"` exits 3. Two groups: `CpL · eps^-1` and `b · a^-1`. The formula dimension matches capacitance per length. Any function of `b/a` is still a capacitance per length times `ε`. The `2π` and the logarithm are not recovered. CE-capacitance-parallel-plate is `ε A / d`.
- **Proof-sketch premises.** Electrostatic potential between two cylinders, charge per unit length from Gauss's law, and `C' = λ / ΔV`. Fringe at the ends is neglected.
- **Opened.** No coax measurement.

### 8. Damping ratio of a second-order oscillator — control — unproven

- **Formula.** `ζ = c / (2 √(k m))` for `m ẍ + c ẋ + k x = 0`. Critical damping is `ζ = 1`, so `c_crit = 2 √(k m)`.
- **Why units are not enough.** `upt derive zeta:dimensionless c:mass/time k:force/length m:mass --formula "c/(2*sqrt(k*m))"` exits 3. Two groups: `zeta` and `c^2 · k^-1 · m^-1`. The formula is dimensionless and matches. Two pure numbers do not fix the `2`. CE-simple-harmonic-frequency is `√(k/m)` with a sourced 1. CE-lc-resonance is `1/√(LC)` with a sourced 1. Neither row is this ratio. `upt search "damping ratio"` exits 1. `case-damped-resonator` is a ring-down case, not this definition.
- **Proof-sketch premises.** Constant coefficients, the characteristic polynomial `s² + (c/m) s + k/m`, and a zero discriminant. The `2` is `2 √(k/m)` from that discriminant.
- **Opened.** No ring-down measurement.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository.

### Medium

[#417](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/417). **Dimensionful bridge inputs with an empty unit are labeled dimensionless and reject that unit.** `upt evaluate be-78` labels `I_m4 [dimensionless]` and the meaning says metres to the fourth. `I_m4=1e-8m^4` exits 1: `'m^4' is [L^4], but this input is [1]`. The same empty unit is on be-79 `A_m2`, be-80 `eps`, be-82 `I_s_A`, be-84 `I_A`, and be-85 `I_A`. `A_m2=1cm^2`, `eps=…F/m`, `I_s_A=1pA`, `I_A=1mA`, and `I_A=1uA` each exit 1. The bare SI numbers still match the proved formulas, including `P_N = 4934.802200544679` and the 0.7 V diode current `0.5747545691036854`. be-86 `C_f` is dimensionless on purpose.

[#418](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/418). **Cyclotron explain recovers a value when the two magnetic-field names disagree.** Equal `magnetic-field` and `magnetic-flux-density` collapse to one variable and recover `-175882001077.216`. The command with `magnetic-field=1` and `magnetic-flux-density=2` exits 0, says the inputs do not fix a unique monomial, and still prints `Recovered value: -175882001077.216`. Flux density alone at `2` recovers `-351764002154.433`. The printed unequal result is the `magnetic-field=1` product.

[#419](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/419). **Plasma frequency and Larmor radius explains pair an even magnitude with an odd power of charge.** The negative-charge plasma command recovers `56414.6023118063` and says `plasma-frequency ∝ …·charge·…`. The negative-charge Larmor command recovers `0.00000568563010356572` and says `larmor-radius ∝ …·charge^-1·…`. The positive-charge commands print the same magnitudes. Cyclotron frequency and the Hall coefficient stay signed, and their monomials agree with those signs.

### What held, and is not filed

The sign values hold: Einstein opposite signs throw `CarrierSignError`, both signs negative stay the positive diffusivity, conductivity throws on opposite signs and is positive when both are negative, Hall and cyclotron stay signed, and mobility `q τ / m` stays signed. Temperature `10eV` is `k_B T` on eval, explain, and evaluate. A length on a temperature name exits 1. Unbound sound speed, Fermi energy, Fermi velocity, Debye frequency, and the most probable speed print no recovered number. Canonical audit keeps those rows, plus the thermal wavelength, on COEFFICIENT UNSET. Plasma frequency and ideal gas with `N` stay sourced. Stokes drag, dynamic pressure, Laplace pressure, the two stored energies, and the wire field recover the sourced numerical factors. One magnetic spelling, and two spellings of the same number, stay one cyclotron variable. `erasure-energy` resolves to be-16. `upt search "reynolds number"` exits 1. `upt search "prandtl number"` names be-86 in the gloss. `upt explain debye-length` does not list the phonon family. Bare `e`, bare `E`, and `exp(1)` hold. `gauss` converts. The round-4 library call `be74Edge.evaluate({ B_T: 1 })` returns the magnetic pressure. be-77 through be-87 return the proved numbers above. be-80 and be-84 remain on the empirical/tuned audit tag. That tag was already recorded for those ids and is not filed again. A search hit that names a prefix, including `fin` as a prefix of `finite` and `landau` as a prefix of `landauer`, says so.

### Not opened, so not used as a number

No comb-drive, transistor, converter, fin, thermoelectric, pipe, coax, or ring-down measurement. Where a derive prefactor would have appeared, the commands above exited 3 and reported no single prefactor.
