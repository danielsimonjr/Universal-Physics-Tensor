# Condensed matter — bridge dogfood of published 6.1.0, 2026-10-05

Model-persona session against the published package `universal-physics-tensor@6.1.0`, not a clone of `src/` and not an independent human review. Scratch directory `/tmp/upt-dogfood-610`: `npm init -y && npm i universal-physics-tensor@6.1.0`. Node v22.14.0. The install added 22 packages and reported 0 vulnerabilities. `npm view universal-physics-tensor@6.1.0 version gitHead --prefer-online` printed `6.1.0` and `3511a7b7ecc236930d6138847d96eaa5cb383030`. Annotated tag `v6.1.0` is object `f1a0b41fb12d5ef40c95beeb36bedac0ef6a030b` and its target is that commit. The publish workflow is run `37382786833`. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v6.1.0`. The CLI is `./node_modules/.bin/upt`. `upt version` prints `6.1.0`. `upt eval --show-parser` prints `mathts`. `upt eval --debug exp(1)` prints `[parser: mathts (@danielsimonjr/mathts-functions 0.68.0)]` and `2.718281828459045`.

This session is the condensed-matter round. [Issue #348](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/348) asks for a rotating persona. Its written list begins with condensed matter. The engineering-physicist rounds are `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md` and `docs/dogfood/2026-10-05-engineering-physicist-bridges-r7.md`. The earlier condensed-matter round is `docs/dogfood/2026-10-04-condensed-matter-bridges-r5.md`. The plasma and space round is `docs/dogfood/2026-10-04-plasma-space-bridges-r6.md`. The persona for this round is the condensed-matter physicist. The next persona on the written list, after plasma and space already ran as round 6, is thermal and chemical engineering. The workflows exercised here are the regression classes from rounds 4–7, then band mass, phonons, superconductivity, magnetism, transport, semiconductors, the quantum Hall effect, and the density of states.

Nothing below is a code change. A bridge is real in this repo only when Lean 4 in [PhysJS](https://github.com/danielsimonjr/PhysJS) states it and a reviewed `formalRef` of kind `bridge` is what `deriveEvidence` reads. Buckingham-π returns a form up to a dimensionless constant. A units-only match is **partial**. A candidate that is not in PhysJS is **unproven**. None of the candidates below is marked proved.

`BRIDGE_EQUATIONS.length` is 123. Status counts: 87 `established`, 33 `speculative`, 3 `highly-speculative`. Ids run 11–133. `CANONICAL_EQUATIONS.length` is 109. Search footer: 24 atlas models, 20 atlas bridges, 553 quantities, 6 applied cases, 3 regimes. `upt help evaluate` names `BE-16/42/51/52/55..133`.

## (a) What was run

Commands were run in `/tmp/upt-dogfood-610`. "Printed" is the output of `universal-physics-tensor@6.1.0`. The library calls are `evaluateRelation` and `convertValue` from that install.

### r4–r7 checklist

| theme | result | what 6.1.0 did |
|---|---|---|
| Empty and missing unit declarations (#376, #383, #417) | pass on the original keys and on the dimensionful siblings that use a separator; fail on a concatenated token | be-83 accepts `V/K2`, `V/K^2`, and `V/K²`. be-78 accepts `m^4`. be-79 accepts `cm^2`. be-80 accepts `F/m`. be-82 accepts `pA`. be-84 accepts `mA`. be-85 accepts `uA` and rejects a metre. `m2`, `cm2`, and a parenthesized `cm^2/(V*s)` convert. `W/m2K` and `cm^2/Vs` do not. That is issue #428. |
| Synonym collapse and disagreement (#371, #379, #418) | pass for the magnetic pair on cyclotron, Larmor, Poynting, and an unused pair on plasma frequency; fail for the temperature spellings and for the Landauer input spelling | Equal magnetic spellings are one cyclotron variable. Unequal spellings exit 1 with no recovered value. `T` and `temperature` do not. `erasure-energy` as an input does not resolve. Those are issues #425 and #426. |
| Even-in-charge magnitude (#398, #419) | pass on the value and on the printed power | Plasma frequency prints `\|charge\|` and `56414.6023118063`. Larmor radius prints `\|charge\|^-1` and `0.00000568563010356572`. Drude resistivity stays `charge^-2` and positive. Larmor power stays `charge^2` and matches `q² a² / (6π ε0 c³)`. Cyclotron, Hall, mobility, Lorentz force, and the grad-B drift stay signed. |
| Temperature binding through `readNamedBinding` (#395, #404) | pass on value slots named `temperature` or a declared kelvin key, on eval, explain, evaluate, discover, regime, and a path sweep; fail for `T` and `temp` as explain names, and for `--sigma` | `10eV`, `10meV`, and `10keV` become `k_B T` on those value paths. `temperature=1m` exits 1. `E=10eV` stays joules. `77degF` is refused. `--sigma T_K=10eV` is rejected. That is issue #427. The `T` / `temp` miss is issue #425. |
| Carrier sign through `applyCarrierSignPolicy` (#364, #378, #405) | pass | Einstein opposite signs throw `CarrierSignError` from the CLI and from `evaluateRelation`. Both signs negative stay the positive diffusivity. Conductivity throws on opposite signs and is positive when both are negative. Hall, cyclotron, mobility `q τ / m`, drift velocity, and the grad-B drift stay signed. Mott–Gurney rejects a negative mobility with its own domain message. |

#### Units

| command | exit | printed |
|---|---|---|
| `upt evaluate be-83 T_K=300 dS_dT_V_per_K2=1e-6` | 0 | `dS_dT_V_per_K2 [V/K^2]`, `mu_V_per_K = 0.0003` |
| same, `1e-6V/K2`, `1e-6V/K^2`, and `1e-6V/K²` | 0 | the same `0.0003` |
| `upt evaluate be-78 E_Pa=2e11 I_m4=1e-8m^4 L_m=2` | 0 | `I_m4 [m^4]`, `P_N = 4934.802200544679` |
| `upt evaluate be-79 … A_m2=1cm^2` | 0 | `A_m2 = 0.0001` |
| `upt evaluate be-80 eps=…F/m …` | 0 | `J_A_per_m2 = 996.0961289400001` |
| `upt evaluate be-82 I_s_A=1pA V_volts=0.7 T_K=300` | 0 | `I_A = 0.5747545691036854` |
| `upt evaluate be-84 V_volts=1 I_A=1mA` | 0 | `R_s_ohm = 4532.360141827194` |
| `upt evaluate be-85 I_A=1uA` | 0 | `S_I_A2_per_Hz = 3.204353268e-25` |
| `upt evaluate be-85 I_A=1m` | 1 | `'m' is [length], but this input is [I]` |
| `upt evaluate be-88 n_per_m3=8.47e22cm^-3 …` | 0 | `n_per_m3 = 8.47e28`, the same `k_F` as the bare density |
| `upt evaluate be-96 xi_m=10nm` | 0 | `xi_m = 1e-8`, `B_c2_T = 3.291059784754533` |
| `upt evaluate be-61 sigma_S_per_m=5.96e5S/cm T_K=300` | 0 | the same `κ` and `L0` as `5.96e7` |
| `upt evaluate be-92 … E_F_J=7eV` | 0 | `E_F_J = 1.1215236438e-18`, `c_V = 2516.22304791073` |
| `upt evaluate be-99 … E_g_J=1.12eV T_K=300` | 0 | `n_i_per_m3 = 6675898719714784` |
| `upt evaluate be-106 omega_c_rad_s=1Hz omega_p_rad_s=1rad/s` | 0 | `1Hz → 1 rad/s`, `1rad/s → 1 rad/s`, `omega_R = 1.618033988749895` |
| `upt evaluate be-66 … theta_rad=90deg` on be-108 | 0 | `90deg → 1.5707963267949` |
| `upt evaluate be-129 h_W_per_m2_K=20W/m2K …` | 1 | `unknown name 'm2'`. Issue #428. |
| `upt evaluate be-129 h_W_per_m2_K=20W/(m2*K) …` | 0 | `20W/(m2*K) → 20 W/(m^2*K)`, `eta = 0.9966799462495581` |
| `upt evaluate be-70 mu_m2_per_Vs=1400cm^2/Vs … q_C=-e` | 1 | `unknown name 'Vs'`. Issue #428. |
| `upt evaluate be-70 mu_m2_per_Vs=1400cm^2/(V*s) … q_C=-e` | 1 | the carrier-sign sentence, so the unit became a positive `0.14` |

`convertValue('1Hz', 'rad/s')` is `1`. `convertValue('1Hz', 'deg/s')` is `57.29577951308232`. `convertValue('90deg', 'rad')` is `π/2`. The hertz and the radian per second are the same coherent second⁻¹ in this table. A cycle and a radian differ by `2π`, and that factor is not inserted. The degree conversion is consistent with that identification, so it is not filed. `convertValue('1m2', 'm^2')` is `1`. `convertValue('1W/m2K', 'W/(m^2*K)')` throws `unknown unit 'm2K'`.

`B_c2` at `ξ = 10 nm` is `ℏ / (2 e ξ²) = Φ₀ / (2π ξ²) = 3.29106 T`. The silicon-scale mass-action density is `√(N_c N_v) exp(−E_g / (2 k_B T))` at `N_c = 2.8e25`, `N_v = 1.04e25`, `E_g = 1.12 eV`, and `300 K`.

#### Synonyms

`upt explain cyclotron-frequency` with `magnetic-field=1` and `magnetic-flux-density=1` exits 0. The known set is `{charge, magnetic-field, mass}`. Recovered value `-175882001077.216`. The command with `magnetic-flux-density=2` exits 1: `magnetic-field and magnetic-flux-density are one quantity and disagree (magnetic-field=1, magnetic-flux-density=2)`. It prints no recovered value. The same sentence is what Larmor radius, the Poynting flux, and a plasma-frequency command that also carries the disagreeing pair all print. Flux density alone at `1` recovers the cyclotron frequency. One spelling still evaluates.

`upt eval 'k_B*T/e' T=300 temperature=400` exits 0 and prints `0.025851999786435535`. `T_K=400` and `temp=400` beside `T=300` print the same 300 K value. The formula `k_B*temperature/e` with those two bindings prints `0.034469333048580714`. That split is issue #425.

`upt explain erasure-energy temperature=300 --source=catalog` exits 0 and recovers `2.87097888507872e-21` via be-16. `upt explain landauer-erasure-energy temperature=300 erasure-energy=2.87e-21 --source=catalog` exits 1: `'erasure-energy' did not resolve to a quantity`. That split is issue #426.

#### Even charge, and the carrier sign

| command | exit | printed |
|---|---|---|
| plasma frequency at `n=1e6` m⁻³, `charge=-e`, `ε0`, electron mass | 0 | `56414.6023118063`. The monomial is `\|charge\|`. |
| the same command, positive charge | 0 | the same magnitude and the same `\|charge\|` |
| Larmor radius, electron, `speed=1e6`, `charge=-e`, `B=1` | 0 | `0.00000568563010356572`. The monomial is `\|charge\|^-1`. |
| Larmor power, `charge=-e`, `acceleration=1`, `ε0`, `c` | 0 | `5.70832676502951e-54`. The monomial is `charge^2`. |
| Drude resistivity, copper `n`, `τ=2.5e-14`, `charge=-e` | 0 | `1.67588722009127e-8`. The monomial is `charge^-2`. |
| cyclotron frequency, `charge=-e`, `B=1` | 0 | `-175882001077.216`. The monomial is `charge`. |
| cyclotron frequency, positive charge | 0 | `175882001077.216` |
| Hall coefficient, `n=1e22`, `charge=-e` | 0 | `-0.000624150907446076` |
| carrier mobility, `q=-e`, `τ=2.5e-14` | 0 | `-0.00439705002693041` |
| conductivity, `μ=0.003`, `q=-e` | 1 | `charge and carrier-mobility must have the same sign` |
| conductivity, both signs negative | 0 | `59669886.374904` |
| Lorentz force, `q=-e`, `v=1e6`, `B=1` | 0 | `-1.602176634e-13`. The monomial is `q·v·B`. |
| `upt evaluate be-111` at electron mass, `v_⊥=1e6`, `\|∇B\|=1`, `q=-e`, `B=1` | 0 | `v_m_s = -2.842815051782862` |
| the same grad-B command, positive charge | 0 | `+2.842815051782862` |
| `upt evaluate be-70` both signs negative | 0 | `D_m2_per_s = 0.0036192799701009757` |
| `evaluateRelation('be-70', { mu: 0.14, T: 300, q: -e })` | throw | `CarrierSignError` |
| the same call, both signs negative | — | `{ kind: 'value', value: 0.0036192799701009757 }` |
| `upt evaluate be-80` with `mu_m2_per_Vs=-1e-4` | 1 | `mu_m2_per_Vs must be finite and > 0` |

`upt explain electric-field` with `charge=-e`, `r=1`, and `ε0` exits 0 and prints `-1.80951281797278e-8`. That magnitude is `e/ε0`. `e/(4π ε0)` is `1.4399645482891602e-9`. The Coulomb force on the same charge recovers `2.30707755234174e-28`, which is `e²/(4π ε0)`. The field and the force differ by `4π`. That is issue #429. The sign of the field follows the sign of the charge.

`upt explain force` with `charge`, `speed`, and `magnetic-field` exits 0 and names no Lorentz path. The quantity `lorentz-force` takes `q`, `v`, and `B`. The hint on the missed path names those three symbols. No wrong force is printed, and this is not filed.

#### Temperature

`upt eval "k_B*T/e" T=10eV` exits 0, says `T` is `1.160452e+5` K, and prints `10`. `upt eval E E=10eV` prints `1.602176634e-18`. `upt explain most-probable-speed` with `temperature=10eV` says the same reading and prints no recovered number. `T=10eV` and `temp=10eV` on that command print the reading and exit 1. `temperature=1m` exits 1.

`upt evaluate be-76` with `T_K=10eV` converts to `116045.181215501` K and prints `beta = 0.13981628738521928`. `upt explain plasma-beta` at `temperature=10keV` recovers `139.816287385219`. `T_c_K=10eV` on be-62, `thetaD_K=100eV` on be-90, `thetaE_K=10eV` on be-91, `T_K=10eV` on be-99 and be-127, `T_e_K=10eV` on be-103, and `Th_K=10eV` with `Tc_K=5eV` on be-130 all convert. `T_K=25degC` on be-87 is `298.15` K. `T_K=77degF` exits 1. `T_K=10meV` on be-58 is `116.045181215501` K.

`upt discover --source=canonical --anchor=temperature=10eV` exits 0. The anchor line is `temperature=116045.18121550081`. The funnel is 377 candidates, 39 promising, 331 inert, 6 magnitude-clash, 0 contradictory, 1 axis-clash. `upt regime plasma --at temperature=10eV` prints `at temperature=116045.18121550081` and says no machine condition was evaluated. `upt path model-pendulum model-spring --at theta0=0.2 t=10 --sweep T=10eV:20eV:3` sweeps `T` from `116045.18121550081` to `232090.36243100162`. All three rows are past the horizon.

`upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=10eV` exits 1: `'eV' is [energy], but this input is [temperature] (K)`. That is issue #427.

#### Carrier sign on the library id

`evaluateRelation('be-62', { T_c_K: 7.2 })` throws `unknown id 'be-62'`. `upt evaluate be-62 T_c_K=7.2` exits 0. The same unknown-id throw is what `be-56`, `be-57`, `be-58`, `be-61`, `be-64`, and `be-65` produce. `be-55` and `be-88` resolve. `evaluateRelation('CE-sound-speed', { pressure: 1e5, density: 1.2 })` is `{ kind: 'unset' }`. That id gap is issue #424.

### Encoded condensed-matter bridges

Copper-scale inputs below use `n = 8.47e28` m⁻³ and `m = 9.1093837015e-31` kg where a row needs them.

| command | exit | printed |
|---|---|---|
| `upt evaluate be-88 n_per_m3=8.47e28 m_kg=…` | 0 | `k_F_per_m = 13586308449.709091`, `E_F_J = 1.1267725832776453e-18`, `v_F_m_per_s = 1572854.812840057` |
| `evaluateRelation('be-88', …)` | — | the edge value `k_F` only |
| `upt evaluate be-89 v_m_per_s=3000 n_per_m3=8.5e28` | 0 | `omega_D_rad_per_s = 51413585890627.625` |
| `upt evaluate be-90 N=1 T_K=10 thetaD_K=300` | 0 | `C_V_J_per_K = 1.1954467922400392e-25` |
| `upt evaluate be-91 N=1 T_K=10eV thetaE_K=10eV` | 0 | `C_V_J_per_K = 3.813381231508183e-23` |
| `upt evaluate be-92 n_per_m3=1e28 T_K=300 E_F_J=7eV` | 0 | `c_V_J_per_K_m3 = 2516.22304791073` |
| `upt evaluate be-93` at `n=1e28`, `g=2`, `spin=0.5`, `μ_B`, `T=300`, `θ=0` | 0 | `C_K = 0.07828196320163251`, `chi = 0.00026093987733877505` |
| the same Curie command, `theta_K=-50` | 0 | `chi = 0.0002236627520046643` |
| `upt evaluate be-94` at `n=1e28`, `E_F=1e-18`, `μ_B` | 0 | `chi_P = 0.0000016211987131855611` |
| `upt evaluate be-55 C=1` | 0 | `R_K_ohm = 25812.807459304513` |
| `upt evaluate be-60 nu=1/3` | 0 | `R_xy` is `3 R_K` on the 4.0.0 print; this round did not repeat the fraction |
| `upt evaluate be-59 V_volts=1uV` | 0 | `f_Hz = 483597848.4169836`, `K_J_Hz_per_V = 483597848416983.6` |
| `upt evaluate be-61 sigma_S_per_m=5.96e7 T_K=300` | 0 | `L0_W_ohm_per_K2 = 2.443004509073667e-8` |
| `upt evaluate be-62 T_c_K=7.2` | 0 | `ratio_2gap_over_kTc = 3.527753977724091` |
| `upt evaluate be-75` at copper `n` and the electron mass | 0 | `lambda_m = 1.82594405375976e-8` on explain of the same inputs |
| `upt evaluate be-96 xi_m=10nm` | 0 | `B_c2_T = 3.291059784754533` |
| `upt evaluate be-97 Delta_J=1meV` | 0 | `IcRn_V = 0.0015707963267948964` |
| `upt evaluate be-98 zeta=1.202056903159594` | 0 | `ratio = 1.4261269244240702` |
| `upt evaluate be-100 eps_static=11.7 eps_inf=1` | 0 | `frequency_ratio_sq = 11.7` |
| `upt evaluate be-101 J_J=1e-21` | 0 | `T_K = 113.77231481679242` |
| `upt evaluate be-102 sum_Tn=1` | 0 | `G_S = 0.00007748091729863649` |
| `upt explain effective-mass --source=both` | 0 | the quantity is in the graph and has no derivation path |
| `upt explain fermi-energy` with `ℏ`, the electron mass, and the copper density | 0 | no recovered number. The factor is unset. It names `(1/2)(3π²)^{2/3}`. |

`k_F = (3π² n)^{1/3}`, `E_F = ℏ² k_F² / (2m)`, and `v_F = ℏ k_F / m` are the be-88 triple. The CLI prints all three. `evaluateRelation` returns `k_F`. `ω_D = v (6π² n)^{1/3}` is the be-89 number. The Debye `T³` heat capacity at `N=1`, `T=10`, `θ_D=300` is `(12π⁴/5) k_B (T/θ_D)³`. The Einstein value at `θ_E = T` is `3 N k_B` times the Einstein function at `x=1`. The Curie constant at `S=1/2`, `g=2` is `μ₀ n g² μ_B² S(S+1) / (3 k_B)`. A negative Weiss temperature divides by `T − θ = 350` K. The Pauli number is `μ₀ μ_B² (3n) / (2 E_F)`. `R_K = h/e²`. `G = 2e²/h` for one open channel. `1/K_J` from the printed Josephson constant is `h/(2e)`. The BCS ratio is `2π exp(−γ)`. The heat-capacity jump is `12/(7 ζ(3))`. `π Δ / (2e)` at `1 meV` is the Ambegaokar–Baratoff voltage. `π J / (2 k_B)` at `1e-21` J is the BKT temperature.

`upt explain fermi-energy` still prints no recovered number. be-88 is the evaluated Fermi sea. The canonical row stays on COEFFICIENT UNSET.

`upt map --source=catalog --evidence=formally-proved` exits 0: `81 of 114 kept; 32 dropped (did not match); 1 dropped (no overlay metadata)`. The cluster of 11 is be-12, be-16, be-37, be-27, be-33, be-63, be-67, be-69, be-74, be-75, be-76.

`upt audit --source=catalog` exits 0: DERIVED 27, COEFFICIENT UNSET 0, DECOY 15, NOT A MONOMIAL 13, OPEN 59. `upt audit --source=canonical` exits 0: DERIVED 73, COEFFICIENT UNSET 6, DECOY 11, NOT A MONOMIAL 0, OPEN 19. The unset rows are `CE-thermal-de-broglie`, `CE-sound-speed`, `CE-fermi-energy`, `CE-fermi-velocity`, `CE-debye-frequency`, and `CE-mb-most-probable-speed`. `CE-point-charge-field` is in the decoy list. `CE-coulomb` is open at complexity 1.

### Search

Exit 1, no entry: `band structure`, `phonon`, `bloch`, `neel`, `néel`, `fermi level`, `thomas-fermi`, `matthiessen`, `stoner`, `built-in`, `built in voltage`, `de haas`, `flux quantum`, `landau diamagnetism`, `intrinsic carrier`, `magnon`, `kondo`, `luttinger`.

Exit 0 on the law the query names: `debye temperature` returns the quantity `debye-temperature`. `einstein solid` returns be-91. `curie` and `curie-weiss` return be-93. `quantum hall` returns be-55 and be-60. `von klitzing` returns be-55. `mass action` returns be-99. `drude` returns CE-drude-resistivity and CE-electrical-conductivity. `wiedemann` returns be-61. `hall coefficient` returns CE-hall-coefficient. `superconductivity` returns be-62. `effective mass` returns the quantity `effective-mass`.

Exit 0, and the hit is a different law, labeled by field: `density of states` returns be-102, words in the description. `coherence length` returns be-12. The be-12 hit quotes the thermal-wavelength identity and says it is not Caldeira–Leggett dephasing. Issue #374 is closed. The BCS length `ξ₀ = ℏ v_F / (π Δ)` is still absent, and it is not re-proposed below. `upt solve` is an unknown command and exits 2.

### Conventions

`upt eval e` is `1.602176634e-19`. Bare `E` exits 2 and names `upt eval E E=1eV`. `exp(1)` is `2.718281828459045`. `euler` exits 2 and names `exp(x)`.

## (b) New candidates

Each row is **unproven**. The dimensional check is the `upt derive` that was run. A recovered prefactor is the command's report of the formula that was typed. No measurement was opened for any of these.

be-88 through be-102 are the round-5 condensed-matter list that PhysJS proved, except Landau diamagnetism `χ_L = −χ_P / 3` and the BCS coherence length `ξ₀ = ℏ v_F / (π Δ)`. Both are still absent. They stay the round-5 proposals and are not given a new number. The curvature definition `1/m* = ℏ^{-2} ∂²E/∂k²` was the first sentence of that round's Fermi-sea candidate. be-88 is `k_F` only. The curvature sentence is not numbered again. `Φ₀ = h/(2e)` is `1/K_J` from be-59. be-55 and be-60 are `e²/h`. be-61 is the Lorenz number. be-62 is the zero-temperature gap ratio. be-75 is the London depth. be-89, be-90, and be-91 are the Debye cutoff, the Debye `T³` law, and the Einstein solid. be-93 is Curie–Weiss, and a negative `θ` is the antiferromagnetic sign of that formula. be-94 is Pauli paramagnetism. be-96 is `B_c2`. be-99 is the mass-action density. CE-drude-resistivity, CE-hall-coefficient, CE-carrier-mobility, and CE-electrical-conductivity are the monomials those names say. None of those rows is the identity below.

### 1. Bloch `T^{3/2}` law — magnons ↔ magnetization — unproven — BE-134

- **Formula.** For quadratic magnons `ℏ ω = D k²` and `g = 2`, the magnetization deficit per volume is `ΔM = μ_B ζ(3/2) (k_B T / (4π D))^{3/2}`. `ζ(3/2) = 2.612375348685488`. A nearest-neighbor Heisenberg ferromagnet writes the same integral with `D = 2 J S a²` and an extra `1/S`.
- **Why units are not enough.** `upt derive dM:I/L T:temperature D:M.L^4.T^-2 muB:I.L^2 kB:k_B --formula "muB*(kB*T/(4*pi*D))^(3/2)*2.612"` exits 0. Unique monomial `ΔM ∝ T^{1.5}·D^{-1.5}·μ_B·k_B^{1.5}`. Recovered prefactor `5.8635e-2`, which is `ζ(3/2)/(4π)^{3/2}` because that factor was typed. `upt search bloch` and `upt search magnon` exit 1. No catalog edge.
- **Proof-sketch premises.** Bose integral of a quadratic density of states, one flipped spin per magnon, `k_B T ≪` the zone-boundary energy so the cutoff may be infinity. `ζ(3/2)` is that integral, the same kind of hypothesis BE-90 takes for `π⁴/15`.
- **Lean.** Ready once `ζ(3/2)` is a hypothesis. The lattice form in `J` and `S` is a second theorem that substitutes `D`.
- **Opened.** No magnetization curve.

### 2. Three-dimensional density of states — bands ↔ counting — unproven — BE-135

- **Formula.** Both spins, one isotropic parabola: `g(E) = (1/(2π²)) (2m/ℏ²)^{3/2} √E` per volume per energy.
- **Why units are not enough.** `upt derive g:M^-1.L^-5.T^2 E:energy m:mass hbar:action --formula "(1/(2*pi^2))*(2*m/hbar^2)^(3/2)*sqrt(E)"` exits 0. Unique monomial `g ∝ E^{0.5}·m^{1.5}·ℏ^{-3}`. Recovered prefactor `1.4329e-1`, which is `(1/(2π²)) 2^{3/2}` because it was typed. be-88 is `k_F`, not `g(E)`. `upt search "density of states"` returns be-102 on the description. No catalog edge is this function.
- **Proof-sketch premises.** Differentiate `n = k³/(3π²)` with `E = ℏ² k²/(2m)`. The `2` in the spin count is the same integer as be-88. One spin drops a factor `1/2`.
- **Lean.** Ready. It is the derivative of the count be-88 already uses.
- **Opened.** No tunneling or specific-heat density of states.

### 3. Two-dimensional density of states — bands ↔ counting — unproven — BE-136

- **Formula.** Both spins, one isotropic parabola, per area: `g(E) = m / (π ℏ²)`, independent of `E`.
- **Why units are not enough.** `upt derive g2:M^-1.L^-4.T^2 m:mass hbar:action --formula "m/(pi*hbar^2)"` exits 0. Unique monomial `g ∝ m·ℏ^{-2}`. Recovered prefactor `3.1831e-1`, which is `1/π` because it was typed. No catalog edge.
- **Proof-sketch premises.** `n = k²/(2π)` for two spins, `E = ℏ² k²/(2m)`, differentiate. A valley degeneracy `g_v` multiplies the result and is a different integer.
- **Lean.** Ready. The constant is the phase-space area of one ring.
- **Opened.** No two-dimensional electron gas.

### 4. Thomas–Fermi wavevector — screening ↔ the Fermi-surface density of states — unproven — BE-137

- **Formula.** `k_TF² = e² g(E_F) / ε0 = (e² / ε0) (3n) / (2 E_F)` for a parabolic three-dimensional gas. Here `e` is the elementary charge. `g(E_F)` counts both spins.
- **Why units are not enough.** `upt derive k2:L^-2 n:L^-3 EF:energy eps:eps0 ee:e --formula "ee^2*(3*n)/(2*eps*EF)"` exits 3. Two groups: `k2³·n^{-2}` and `k2·E_F^{-2}·ε0^{-2}·e⁴`. The formula dimension is `[L^-2]` and matches. The `3/2` is not recovered. The classical Debye length is a different temperature. be-115 is a sum of two classical lengths. `upt search thomas-fermi` exits 1.
- **Proof-sketch premises.** Linearized Thomas–Fermi, Poisson's equation, and candidate 2 at `E_F`, or the equivalent `g(E_F) = (3/2) n / E_F` from be-88's parabola. A lattice dielectric replaces `ε0`.
- **Lean.** Ready from that density of states and the linear response.
- **Opened.** No screening length.

### 5. Built-in voltage — a p–n junction ↔ the mass-action law — unproven — BE-138

- **Formula.** `V_bi = (k_B T / e) ln(N_A N_D / n_i²)` for complete ionization and nondegenerate Boltzmann tails. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive Vbi:energy/charge T:temperature kB:k_B ee:e Na:L^-3 Nd:L^-3 ni:L^-3 --formula "(kB*T/ee)*ln(Na*Nd/ni^2)"` exits 3. Three groups: `V_bi · T^{-1} · k_B^{-1} · e`, `N_A/N_D`, and `N_A/n_i`. The formula dimension is a voltage and matches. Units make `k_B T/e` a voltage. They do not produce the logarithm. be-99 is `n_i`. be-82 is the ideal diode current. `upt search "built-in"` and `upt search "built in voltage"` exit 1.
- **Proof-sketch premises.** Charge neutrality on each side, Boltzmann factors, and `n p = n_i²` from be-99. The argument of the logarithm is `N_A N_D / n_i²`.
- **Lean.** Ready from be-99 and the Boltzmann tail.
- **Opened.** No capacitance–voltage profile.

### 6. Semiconductor Fermi level — intrinsic offset, and the extrinsic logarithm — unproven — BE-139

- **Formula.** From midgap, `E_F − (E_c+E_v)/2 = (3/4) k_B T ln(m_h*/m_e*)`. For a nondegenerate n-type semiconductor with complete ionization, `E_c − E_F = k_B T ln(N_c / N_D)`.
- **Why units are not enough.** `upt derive dE:energy T:temperature kB:k_B ratio:dimensionless --formula "(3/4)*kB*T*ln(ratio)"` exits 3. Two groups: `ΔE/(k_B T)` and `ratio`. The same command with `kB*T*ln(ratio)` exits 3 on the same two groups. The formula dimension is an energy and matches. The `3/4` and the logarithm are not recovered. be-99 cancels the chemical potential in the product `n p`. `upt search "fermi level"` exits 1. `upt explain effective-mass` has no derivation path.
- **Proof-sketch premises.** `N_c / N_v = (m_e*/m_h*)^{3/2}`, so the intrinsic chemical potential that equalizes `n` and `p` carries `(3/4) k_B T` times the log of the mass ratio. The extrinsic line is the Boltzmann inversion of `n = N_D = N_c exp(−(E_c−E_F)/k_B T)`.
- **Lean.** Ready. The `3/4` is the exponent `3/2` inside a square root of the two effective densities of states.
- **Opened.** No Fermi-level measurement.

### 7. Onsager frequency — a Fermi-surface area ↔ the field period — unproven — BE-140

- **Formula.** `F = (ℏ / (2π e)) A`, where `A` is an extremal cross-section of the Fermi surface and `Δ(1/B) = 1/F`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive F:M.T^-2.I^-1 hbar:action ee:e A:L^-2 --formula "hbar*A/(2*pi*ee)"` exits 0. Unique monomial `F ∝ ℏ·e^{-1}·A`. Recovered prefactor `1.5915e-1`, which is `1/(2π)` because it was typed. be-55 is `e²/h`, a conductance. `upt search "de haas"` exits 1. No catalog edge.
- **Proof-sketch premises.** Semiclassical quantization of the orbit area, `A_n = (2π e B / ℏ) (n + γ)`. The frequency in `1/B` is that coefficient of `n`. The Maslov index `γ` shifts the intercept and does not change `F`.
- **Lean.** Ready. `γ` stays out of the frequency.
- **Opened.** No magnetization oscillation.

### 8. Josephson inductance — the small-phase expansion — unproven — BE-141

- **Formula.** At `φ = 0`, `L_J = Φ₀ / (2π I_c) = ℏ / (2 e I_c)`. Here `e` is the elementary charge.
- **Why units are not enough.** `upt derive LJ:M.L^2.T^-2.I^-2 Ic:charge/time hbar:action ee:e --formula "hbar/(2*ee*Ic)"` exits 0. Unique monomial `L_J ∝ I_c^{-1}·ℏ·e^{-1}`. Recovered prefactor `5.0000e-1`, which is `1/2` because it was typed. be-59 is `f = 2e V / h`. The `2` is the same Cooper-pair charge. The inductance is `V / (dI/dt)` at fixed `I_c`, a different relation. No catalog edge.
- **Proof-sketch premises.** `I = I_c sin φ`, `V = (ℏ / 2e) dφ/dt`, and `cos φ = 1` at `φ = 0`. A finite phase replaces `I_c` by `I_c cos φ`.
- **Lean.** Ready from the Josephson equations be-59 already uses.
- **Opened.** No junction inductance.

### 9. Lower critical field — a flux quantum in the London vortex — unproven — BE-142

- **Formula.** `B_c1 = (Φ₀ / (4π λ²)) ln(λ/ξ)`, with `Φ₀ = h/(2e)`.
- **Why units are not enough.** `upt derive Bc1:M.T^-2.I^-1 h:action ee:e lam:length xi:length --formula "(h/(2*ee))/(4*pi*lam^2)*ln(lam/xi)"` exits 3. Two groups: `B_c1 · h^{-1} · e · λ²` and `B_c1 · h^{-1} · e · ξ²`. The formula dimension matches a magnetic field. The logarithm and the `4π` are not recovered. be-96 is `B_c2 = ℏ / (2 e ξ²) = Φ₀ / (2π ξ²)`. `upt search "flux quantum"` exits 1.
- **Proof-sketch premises.** London vortex energy per length, the core cutoff `ξ`, and the flux quantum from the Cooper-pair charge. The logarithm is that cutoff. A different core energy changes the additive constant under the log, not the `Φ₀/(4π λ²)`.
- **Lean.** Ready if the core cutoff is a hypothesis. The prefactor is the London line energy.
- **Opened.** No magnetization curve of a type-II sample.

### 10. AC Drude conductivity — the real Lorentzian — unproven — BE-143

- **Formula.** `Re σ(ω) = σ₀ / (1 + ω² τ²)`, with `σ₀ = n e² τ / m` the DC Drude conductivity.
- **Why units are not enough.** `upt derive sig:M^-1.L^-3.T^3.I^2 s0:M^-1.L^-3.T^3.I^2 w:frequency tau:time --formula "s0/(1+w^2*tau^2)"` exits 3. Two groups: `σ/σ₀` and `ω τ`. The formula dimension matches a conductivity. A ratio of two conductivities does not have to be that Lorentzian. CE-drude-resistivity and CE-electrical-conductivity are the DC monomials. be-123 is `1/(1+α²)` for cross-field diffusion, a different `α`.
- **Proof-sketch premises.** A relaxation `exp(−t/τ)` in the current, and the real part of its Fourier transform. The `1` in the denominator is the DC piece.
- **Lean.** Ready from that transform. The DC `σ₀` stays the canonical monomial.
- **Opened.** No optical conductivity.

### 11. Matthiessen's rule — independent scattering rates — unproven — BE-144

- **Formula.** `1/τ = 1/τ₁ + 1/τ₂` for two independent mechanisms, and the same sum for the resistivities when each `ρ_i ∝ 1/τ_i`.
- **Why units are not enough.** `upt derive tau:time t1:time t2:time --formula "1/(1/t1+1/t2)"` exits 3. Two groups: `τ/τ₁` and `τ/τ₂`. The formula dimension is a time and matches. Two times do not have to combine as a parallel sum. `upt search matthiessen` exits 1. CE-drude-resistivity is one `τ`.
- **Proof-sketch premises.** Independent Poisson processes, so the rates add. A mechanism that changes the distribution function, rather than only the lifetime, is outside this sum.
- **Lean.** Ready as the sum of rates once independence is the hypothesis. It is not a derivation from a collision integral.
- **Opened.** No residual-resistivity plot.

### 12. Stoner denominator — the enhanced Pauli susceptibility — unproven — BE-145

- **Formula.** `χ = χ_P / (1 − I g(E_F))`. The ferromagnetic instability is the pole `I g(E_F) = 1`. `χ_P` is be-94.
- **Why units are not enough.** `upt derive ratio:dimensionless x:dimensionless --formula "1/(1-x)"` exits 3. Two groups, `ratio` and `x`. The formula is dimensionless and matches. Two pure numbers do not have to be that denominator. `upt search stoner` exits 1. be-94 is `χ_P` with no interaction `I`.
- **Proof-sketch premises.** Mean-field shift of the spin bands, or the RPA bubble summed as a geometric series. `I` is the contact interaction. A finite-range interaction replaces `I` by `I(q)`.
- **Lean.** Ready as that geometric series. The pole is the same formula, not a second bridge.
- **Opened.** No enhanced susceptibility.

### 13. Gorter–Casimir two-fluid fraction — superconductivity ↔ temperature — unproven — BE-146

- **Formula.** `n_s / n = 1 − (T/T_c)^4`. The penetration depth that follows is `λ(T) = λ(0) / √(1 − (T/T_c)^4)`.
- **Why units are not enough.** `upt derive ns:dimensionless t:temperature tc:temperature --formula "1-(t/tc)^4"` exits 3. Two groups: `n_s` and `T/T_c`. The formula is dimensionless and matches. A temperature ratio does not have to enter as the fourth power. be-62 is the zero-temperature gap ratio. be-75 is `λ(0)`.
- **Proof-sketch premises.** The two-fluid assumption that the superfluid fraction is that power of the reduced temperature. The exponent `4` is the phenomenological input. Weak-coupling BCS replaces it by a different function of `Δ(T)`.
- **Lean.** The exponent is an axiom here, not a derived integer. A proof that assumes the exponent can state the algebra. A proof that derives the exponent needs a different theorem, and this row is not that theorem.
- **Opened.** No penetration-depth curve.

## (c) Bugs filed

Reported only. Nothing in this file changes `src/`. Each item is a GitHub issue on this repository.

### Medium

[#424](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/424). **`evaluateRelation` rejects seven catalog ids the CLI evaluates.** `upt evaluate be-62 T_c_K=7.2` prints the BCS gap and the ratio `3.527753977724091`. `upt evaluate be-61` prints `L0 = 2.443004509073667e-8`. `evaluateRelation('be-62')` and `evaluateRelation('be-61')` throw `unknown id`. The same throw is what be-56, be-57, be-58, be-64, and be-65 produce. be-55 and be-88 resolve. `resolveEdge` searches the graph and does not call the evaluator registry. Those seven rows have no edge id.

[#425](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/425). **Temperature spellings `T`, `temp`, and `T_K` do not share one binding.** `upt eval 'k_B*T/e' T=300 temperature=400` prints the 300 K value. The formula that names `temperature` prints the 400 K value. Explain of `T=10eV` and of `temp=10eV` converts the energy and then says the name did not resolve. Explain of `temperature=10eV` binds the slot. `readNamedBinding` lists all four names. `NAME_TABLE.synonyms` does not, so `collapseSynonymGovernors` never compares them. This is the synonym class of #418 on a different table.

[#426](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/426). **`erasure-energy` resolves as a target and not as an input.** Explain of `erasure-energy` at 300 K recovers `2.87097888507872e-21`. Explain of `landauer-erasure-energy` with `erasure-energy=2.87e-21` exits 1: the input name did not resolve. `magnetic-flux-density` still works as a cyclotron input. `resolveToCatalogName` maps the target. `rewriteInputKey` does not map the input, because `erasure-energy` is not itself a graph quantity. Same synonym theme as #425, different function.

[#427](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/427). **A temperature uncertainty in eV is rejected on a kelvin slot.** `T_K=10meV` on be-58 converts to `116.045181215501` K. `--sigma T_K=10eV` exits 1: eV is energy and the input is a temperature. `T_c_K=10eV` on be-62 converts. `parseUncertainty` calls `bindingInUnit` with the difference reading. The value path calls `readNamedBinding`. Same temperature theme as #425, different function.

[#428](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/428). **Concatenated unit tokens `m2K` and `Vs` are unknown.** `20W/m2K` exits 1 with `unknown name 'm2'`. `20W/(m2*K)` converts and prints `eta = 0.9966799462495581`. `1400cm^2/Vs` exits 1 with `unknown name 'Vs'`. `1400cm^2/(V*s)` converts and then hits the carrier-sign check. `V/K2` on be-83 still converts, and `1m2` converts to `m^2`. `factorExponent` peels a trailing exponent only. This is the unit class of #376, #383, and #417.

[#429](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/429). **Point-charge field explain drops the `4π` that Coulomb's law keeps.** The field command recovers `-1.80951281797278e-8`, which is `−e/ε0`. The force command recovers `2.30707755234174e-28`, which is `e²/(4π ε0)`. The ratio of the two magnitudes, per charge, is `4π`. The field AST divides by `ε0 r²`. The force AST includes `4pi`. The field stays signed.

### What held, and is not filed

The original unit keys hold: be-83 is `V/K^2` and accepts `V/K2`, `V/K^2`, and `V/K²`; be-78 accepts `m^4`; be-79 accepts `cm^2`; be-80 accepts `F/m`; be-82, be-84, and be-85 accept ampere prefixes; a metre on be-85 is rejected. Densities in `cm^-3`, a coherence length in `nm`, a conductivity in `S/cm`, an energy in `eV`, a gap in `meV`, a Debye temperature in `K`, a Bohr magneton in `J/T`, and `90deg` on an angle slot all convert. `1 Hz` converts as `1 rad/s` and as `57.3 deg/s`, which is one identification, and it is not filed.

The magnetic synonym pair holds on cyclotron frequency, Larmor radius, the Poynting flux, and a plasma-frequency command that also carries the pair. Equal numbers are one variable. Unequal numbers exit 1 with no recovered value.

Plasma frequency, Larmor radius, Drude resistivity, and Larmor power print a positive magnitude. The printed powers are `\|charge\|`, `\|charge\|^-1`, `charge^-2`, and `charge^2`. Cyclotron frequency, the Hall coefficient, mobility, drift velocity, the Lorentz force, and the grad-B drift stay signed. Einstein opposite signs throw `CarrierSignError` from the CLI and from `evaluateRelation`. Both signs negative stay `D = 0.0036192799701009757`. Conductivity throws on opposite signs and is `59669886.374904` when both are negative.

`temperature=10eV` and a declared kelvin slot, including `T_c`, `θ_D`, `θ_E`, `T_e`, `T_h`, and `T_c` of the generator, read `k_B T` on eval, explain, evaluate, a discover anchor, a regime coordinate, and a path sweep. `temperature=1m` exits 1. `E=10eV` stays joules. Fahrenheit is refused. Celsius on be-87 is `298.15` K. Unbound Fermi energy names `(1/2)(3π²)^{2/3}` and prints no recovered number. Canonical audit keeps the six COEFFICIENT UNSET rows.

be-88 through be-102, be-55, be-59, be-61, and be-75 return the textbook numbers above. Curie–Weiss accepts a negative Weiss temperature. `upt solve` is not a command and exits 2. A search hit that names a description, including be-102 on `density of states` and be-12 on `coherence length`, says which field matched. Bare `e`, bare `E`, and `exp(1)` hold.

### Not opened, so not used as a number

No magnetization, tunneling, junction, oscillation, optical-conductivity, or penetration-depth measurement. Where a derive prefactor appears above, it is the command's report of the formula that was typed.
