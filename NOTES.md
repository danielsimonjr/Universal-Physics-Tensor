# NOTES.md — stateful (everything here carries an "as of" and is EXPECTED to go stale)

The law is `AGENTS.md`. **This file exists so that status never has to be written into a design
document.** If you are about to put MET / UNMET / a current count / a date into
`docs/planning/*`, it belongs here instead.

Rewrite freely. A stale line here is normal. A stale line in a design doc is a defect, because
nothing validates prose and the next reader cannot tell.

---

## As of 2026-10-05

- **The PhysJS table is generated.** `src/atlas/physjs-entries.generated.ts` is the compiled copy of `formal/physjs/manifest.json`. `PHYSJS_COMMIT` is that file's `commit`. Each generated export has a summary line. The sentence that `PHYSJS_ENTRIES` is hand-copied in `src/atlas/physjs-ref.ts` is the record from before this change.
- **Explaining `sound-speed` uses CE-sound-speed, and a bound `gamma` is √γ.** `upt explain sound-speed pressure=1e5 density=1.2 --source=canonical` names CE-sound-speed and prints `Recovered value: 288.675134594813`, and says the constant was set to 1. The same command with `gamma=1.4` prints `341.565025531987` and does not say the constant was set to 1. `gamma=1` prints the bare value and does not say the constant was set to 1. `upt explain speed pressure=1e5 density=1.2 --source=canonical` does not name CE-sound-speed. `upt explain speed tension=4 linear-density=1 --source=canonical` still names CE-string-wave-speed and prints `2`. `compareWithCanonical('speed', ['pressure', 'density'], …)` still names CE-sound-speed. CE-schwarzschild-radius still targets `radius`. The canonical audit still lists CE-sound-speed as COEFFICIENT UNSET. `upt map --source=canonical` is 23 components over 109 edges and 71 compose into chains, and `sound-speed` is a link hub. The combined map is 70 components over 192 edges and 154 compose into chains. The component counts are unchanged. The sentences 74 and 156 are the record from before this target. The committed architecture maps were behind the tree: they omitted `N` and `one_minus_e_sq`, labeled the reduced Compton law as the full one, and drew the flat Friedmann equation as isolated. Regenerating them also shows an 84-law core, three two-law clusters, and 19 isolated laws. The sentence that `upt explain sound-speed` has no derivation path, and that `upt explain speed` with those inputs prints `288.675134594813` via CE-sound-speed, is the record from before this target. Issues 391 and 392 are not fixed in this change.
- **`docs:deps` follows `export * as`.** `src/atlas/public.ts` is an internal dependency of `src/index.ts` (`export * as atlas from './atlas/public.js'`). The counts are the regeneration paragraph in `docs/architecture/INTEGRATION_MAP.md`. The sentence that the generator misses `export * as`, and that `public.ts` is the unused file, is the record from before this change.
- **A magnitude that is even in a signed input stays positive.** `upt explain plasma-frequency carrier-density=1e6 charge=-1.602176634e-19 vacuum-permittivity=8.8541878128e-12 mass=9.1093837015e-31 --source=canonical` prints `Recovered value: 56414.6023118063`. `upt explain larmor-radius mass=9.1093837015e-31 speed=1e6 charge=-1.602176634e-19 magnetic-field=1 --source=canonical` prints `Recovered value: 0.00000568563010356572`. Cyclotron frequency at that charge stays `-175882001077.216`. A Hall coefficient at `carrier-density=1e6` and that charge stays negative. Opposite charge and mobility still throw. The sentence that those two explains print `-56414.6023118063` and `-0.00000568563010356572` is the record from before this absolute value. Issues 390–392 were not fixed by that absolute value.
- **Integration design, owner accepted 2026-10-04.** `docs/planning/v6.0.0-Design.md` is the target for the 6.0.0 break. The owner resolved the five open questions: `upt evaluate` converts an energy in a kelvin slot through `readNamedBinding`; the Larmor radius is a magnitude and cyclotron frequency stays signed; `BridgeEquations`, `evaluateEinsteinRelation`, and the other per-bridge APIs are removed with no compatibility shims; ideal-gas `N` stays a dimensionless input; if MathTS has no public scalar-expression builder, one is added in `danielsimonjr/MathTS` (packages `@danielsimonjr/mathts-*`) before phase 6 lowers, and publishing MathTS is the owner's job. No `src/` change in the design note. The phases are open tasks in `ACTIVE.md`. The sentence that the owner has not accepted the note, and that PR #395 is the only open round-6 fix, is the record from before this acceptance.
- **A fully-quantitative count is an input of the canonical evaluator.** `upt explain pressure boltzmann-constant=1.380649e-23 temperature=300 V=0.0224 --source=canonical` exits 0 with no recovered value and names `N`. The same command with `N=6.02214076e23` prints `Recovered value: 111354.410064552` and `pressure ∝ boltzmann-constant·temperature·V^-1·N`. Perihelion at `mass=1.989e30`, `a=5.79e10`, `one_minus_e_sq=1` is `6π G M / (c² a)`. Hawking temperature at a solar mass is `ℏ c³ / (8π G M k_B)`. Newton at unit masses and unit radius is `G`. The canonical audit is DERIVED 73, COEFFICIENT UNSET 6, DECOY 11, OPEN 19. `CE-jarzynski` stays DERIVED `×1`. `upt discover --source=canonical` is 377 candidates, 59 promising, 298 inert, 19 magnitude-clash, 0 contradictory, 1 axis-clash. The sentence that ideal-gas explain prints `1.84908348214286e-19`, that the canonical audit is DECOY 7 and OPEN 23, and that the canonical discovery funnel is 305 inert and 12 magnitude-clash, is the record from before this input. Issues 388–392 were not fixed by that input. Phase 5 of the integration design does not reimplement this path.
- **An energy on a temperature binding is k_B T outside `upt eval`.** `upt explain most-probable-speed boltzmann-constant=1.380649e-23 temperature=10eV molecular-mass=1.67262192369e-27 --source=canonical` prints `Recovered value: 30949.6900726706` and says the energy is read as k_B T. The same command at `temperature=300` still prints `1573.63271668378` and does not say k_B T. `upt explain plasma-beta carrier-density=5e6 temperature=10eV magnetic-pressure=5.72957794818894e-11 --source=catalog` prints `0.139816287385219`. `temperature=1m` exits 1. `upt evaluate be-76 T_K=10eV` still exits 1. A discovery anchor `temperature=10eV` prints kelvin `116045.18121550081`. The scale is the bound `boltzmann-constant` when it is a bare number or J/K. The sentence that those explains print `1.15000027903998e-7` and `1.93037217362116e-24` is the record from before this reading. Issues 388–392 were not fixed by that reading. Issue 387 is the count evaluation above.
- **Integration map.** `docs/architecture/INTEGRATION_MAP.md` is the measurement of parallel implementations on `b1db6b66f101448b1e3a9c2f11c4b4e08f71260f`. The counts live in that file. No `src/` change.
- **Package version 5.0.0 is on npm.** `npm view universal-physics-tensor@5.0.0 version gitHead --prefer-online` printed `5.0.0` and `4420714b67f5728492ba90d9a983280227b36943`. Annotated tag `v5.0.0` is object `28ebfb885aab8b06499e90fcd208d4e688b0af69` and its target is that commit. Publish run `37247750332` succeeded. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v5.0.0`. The sentence that npm `latest` is still `4.0.0` is the record from before this measurement.
- **Plasma and space dogfood, round 6, 2026-10-04.** The session, the new candidates, and the filed bugs are `docs/dogfood/2026-10-04-plasma-space-bridges-r6.md`. Model persona on the published package `universal-physics-tensor@5.0.0`, not a human reviewer. The new candidates are unproven. The bugs are issues 386–392 and are not fixed in this change. The session does not change `src/`.

## As of 2026-10-04

- **Package version in this tree is 5.0.0.** npm `latest` is still `4.0.0` until the tag workflow publishes this version. The major note is the [5.0.0] section. Since published `4.0.0` (`9e7dfa27`), a monomial odd in both carrier charge and mobility throws `CarrierSignError`, the canonical audit splits an unsourced 1 into COEFFICIENT UNSET, a catalog bridge with no evaluator routes to `upt atlas`, and be-83's slope is `V/K^2`. The public exports added since `4.0.0` are the BE-88 through BE-102 evaluators, their input and result types, and `be88Edge` through `be102Edge`. No export was removed. The sentence that the package version stays 4.0.0 is the record from before this bump.
- **A dimensional entry with no sourced prefactor is not a recovered factor of 1.** `upt audit --source=canonical` is DERIVED 73, COEFFICIENT UNSET 6, DECOY 7, NOT A MONOMIAL 0, OPEN 23. The unset rows are `CE-thermal-de-broglie`, `CE-sound-speed`, `CE-fermi-energy`, `CE-fermi-velocity`, `CE-debye-frequency`, and `CE-mb-most-probable-speed`. `upt explain fermi-energy` with `reduced-planck-constant=1.054571817e-34`, copper `m` and `n` still prints `Recovered value: 2.35460972213968e-19` and says the constant was set to 1, which is not `(1/2)(3π²)^{2/3}`. Fermi velocity names `(3π²)^{1/3}`. Debye frequency names `(6π²)^{1/3}`. `CE-plasma-frequency` is `ω_p = √(n q²/(ε₀ m))` and stays DERIVED `×1.000e+0`. `CE-simple-harmonic-frequency` stays DERIVED because its table sources the 1. The sentence that the canonical audit is DERIVED 79 and that those four condensed-matter rows are DERIVED `×1` is the record from before this split.
- **A declared hyphenated name is one symbol in `upt derive --formula`.** `upt derive fermi-energy:energy reduced-planck-constant:action mass:mass carrier-density:L^-3 --formula "(reduced-planck-constant^2/(2*mass))*(3*pi^2*carrier-density)^(2/3)"` exits 0 and the recovered prefactor is `4.7854e+0`. A formula that still writes `reduced-planck-constant` when that name was not declared names `undeclared symbol 'reduced'` and says a hyphen between names is subtraction. The sentence that the declared-name command exits 2 is the record from before this rewrite.
- **Search for a catalog bridge with no evaluator names the formula.** `upt search "coherence length"` exits 0, routes to `upt atlas be-12`, and quotes `Not Caldeira–Leggett dephasing`. `upt search landau` exits 0 and says `landau is a prefix of landauer`. `upt search "landau diamagnetism"` exits 1. The sentence that coherence length routes to `upt explain be-12` is the record from before this route.
- **be-83's Seebeck slope is V/K^2.** `upt evaluate be-83 T_K=300 dS_dT_V_per_K2=1e-6` prints `dS_dT_V_per_K2 [V/K^2]` and `mu_V_per_K = 0.0003`. `dS_dT_V_per_K2=1e-6V/K2` converts to the same result. The sentence that the slope is labeled dimensionless, and that `V/K2` is `unknown name 'K2'`, is the record from before this unit.
- **PhysJS pin `03e8bb77c952f720bdd2730af2afc6a7f2d36243` (PhysJS #65).** Lean files stay `lean/<File>.lean`. The vendored manifest adds be-88 through be-102. Each proof is complete. The axioms are `propext`, `Classical.choice`, and `Quot.sound`. Kind is `bridge`. Fifty catalog rows derive `formally-proved`. Fifty-one catalog ids are kind `bridge`. BE-90 takes `I = π⁴/15` as a hypothesis and differentiates the energy. BE-95 is the sign of one trial wall. BE-97 is `T = 0` only. BE-98 reads `ζ` as the GL quartic coefficient. BE-101 is the energy-entropy argument. Landau diamagnetism and the BCS coherence length `ξ₀ = ℏ v_F/(π Δ)` have no bridge id. The r5 dogfood line that equates the three-branch Debye sum to `n` gives `k_D³ = 2 π² n`; the proved count is `3n` states. The fifteen edges are isolated. The catalog audit is DERIVED 25, DECOY 11, NOT A MONOMIAL 6, OPEN 41. The evaluate range is `BE-51/52/55..102`. Package version stays 4.0.0. The sentence that the pin is `92f87257a1e3086a48cdc19fe4361cc1c5909d49`, that thirty-five catalog rows derive `formally-proved`, and that the catalog audit is DERIVED 20, DECOY 9, NOT A MONOMIAL 5, OPEN 34 is the record from before this pin.
- **A synonym is one governing variable.** `upt explain cyclotron-frequency charge=-1.602176634e-19 magnetic-field=1 mass=9.1093837015e-31 --source=canonical` prints `Recovered value: -175882001077.216` and `cyclotron-frequency ∝ charge·magnetic-field·mass^-1`. The known set is `{charge, magnetic-field, mass}`. It does not say the inputs do not fix a unique monomial, and it does not name `magnetic-flux-density`. Larmor radius at `speed=1e6` with positive charge prints `0.00000568563010356572`. `magnetic-flux-density=1` still recovers the positive cyclotron frequency. Two different numbers on the pair stay two inputs. The sentence that the cyclotron summary lists `magnetic-flux-density` and says the monomial is not unique is the record from before this collapse.

- **A positive transport coefficient of charge and mobility rejects opposite signs.** `upt explain electrical-conductivity carrier-density=8.47e28 charge=-1.602176634e-19 carrier-mobility=0.003 --source=canonical` exits 1 with `charge and carrier-mobility must have the same sign`. Both signs negative (`carrier-mobility=-0.00439705002693041`) print `Recovered value: 59669886.374904`. A zero mobility stays 0. Hall and cyclotron stay signed. `evaluateEinsteinRelation` still throws `mu_m2_per_Vs and q_C must have the same sign`. `PhysJS.EinsteinRelation.diffusion_eq` is unchanged. The sentence that the mixed-sign explain prints a negative siemens per metre is the record from before this check.

- **Condensed-matter dogfood, round 5, 2026-10-04.** The session, the new candidates, and the filed bugs are `docs/dogfood/2026-10-04-condensed-matter-bridges-r5.md`. Model persona on the published package `universal-physics-tensor@4.0.0`, not a human reviewer. The new candidates are unproven. The bugs are issues 370–376 and are not fixed in this change. The session does not change `src/`.

- **Package version 4.0.0 is on npm.** `npm view universal-physics-tensor version gitHead --prefer-online` printed `4.0.0` and `9e7dfa279be3c56d83c1f9436cd3034687f00e3f`. `npm view universal-physics-tensor dist-tags --prefer-online` printed `latest` `4.0.0`. Annotated tag `v4.0.0` is object `956f2159c6c25830195aa22f81973b39ed07074c` and its target is that commit. Publish run `37227889987` succeeded. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v4.0.0`. The sentence that npm `latest` is still `3.1.0` is the record from before that measurement.
- **Package version in this tree is 4.0.0.** npm `latest` is still `3.1.0` until the tag workflow publishes this version. `evaluateEinsteinRelation` throws when the product of μ and q is negative. Canonical explain multiplies the sourced prefactor. The public exports added since `3.1.0` are the BE-77 through BE-87 evaluators, their input and result types, and `be77Edge` through `be87Edge`. No export was removed. The sentence that the package version is 3.1.0 is the record from before this bump.
- **The canonical graph evaluator multiplies the sourced prefactor.** `upt explain force viscosity=1e-3 radius=1e-6 speed=1e-4 --source=canonical` prints `Recovered value: 1.88495559215388e-12`. Dynamic pressure at density 1000 and flow velocity 2 prints `2000`. Laplace pressure at surface tension 0.072 and radius 1 mm prints `144`. The canonical audit stays DERIVED 79, DECOY 7, OPEN 23. Field energy and Larmor stay decoys. Stokes–Einstein is derived and clean at `1/(6π)`. The sentence that those three explains recover `1e-13`, `4000`, and `72` is the record from before this factor.
- **Search indexes domain regime registrations.** `upt search piezoelectric` and `upt search piezo` name `upt regime piezoelectricity` and say `vacuous registration (no inequality)`. Plasma and Tolman do the same. A registration that states an inequality does not say vacuous. `upt regime plasma` still says no machine condition was evaluated. The sentence that `upt search piezoelectric` exits 1 is the record from before this index.
- **be-74's audit tag is a vacuum constant rewritten through α.** `upt audit` prints `be-74 +[ℏ,c,e] ×5.452e+0 (vacuum constant; μ0 rewritten through α)`. JSON `cleanPrefactor` is false. Stefan–Boltzmann and Wien stay `(empirical/tuned constant)` on `{ℏ, c, k_B}`. be-48, be-59, be-80, and be-84 stay empirical. The sentence that be-74 is tagged empirical/tuned is the record from before this label.
- **Einstein relation requires the same sign of μ and q.** `evaluateEinsteinRelation` throws `mu_m2_per_Vs and q_C must have the same sign` when the product is negative. `upt evaluate be-70 mu_m2_per_Vs=0.14 T_K=300 q_C=-1.602176634e-19` exits 1. Both signs negative print `D_m2_per_s = 0.0036192799701009757`. `μ = 0` stays `D = 0`. `q = 0` stays rejected. `T < 0` with matching signs is unchanged. `PhysJS.EinsteinRelation.diffusion_eq` is unchanged. The sentence that opposite signs print `D_m2_per_s = -0.0036192799701009757` is the record from before this check.
- **A comparison residual is a signed relative difference.** `signedRelativeDifference` is the glossary for value/reference − 1. The poor-conductor skin-depth run prints `maxwell_deviation = -0.0487572085250777` beside that phrase. The copper lumped-cooling example prints `parent_deviation = -0.000052203242016934936` beside it. Resistor-noise and the Brownian Langevin, hydrodynamic, and wall residuals use the same phrase. Kepler's `(1 + q)^{2/3} − 1` still says excess. The sentence that those lines say "relative excess" is the record from before this glossary.
- **PhysJS pin `92f87257a1e3086a48cdc19fe4361cc1c5909d49` (PhysJS #64).** Lean files stay `lean/<File>.lean`. The vendored manifest adds `be-77` `PhysJS.HagenPoiseuille.flow_eq`, `be-78` `PhysJS.EulerBuckling.critical_load`, `be-79` `PhysJS.PullIn.pull_in_eq`, `be-80` `PhysJS.MottGurney.current_eq`, `be-81` `PhysJS.ChildLangmuir.current_eq`, `be-82` `PhysJS.ShockleyDiode.shockley_eq`, `be-83` `PhysJS.Thomson.thomson_eq`, `be-84` `PhysJS.FourPoint.sheet_eq`, `be-85` `PhysJS.ShotNoise.shot_eq`, `be-86` `PhysJS.ReynoldsAnalogy.reynolds_eq`, and `be-87` `PhysJS.CapacitorNoise.noise_eq`. Each proof is complete. The axioms are `propext`, `Classical.choice`, and `Quot.sound`. Kind is `bridge`. Thirty-five catalog rows derive `formally-proved`. Thirty-six catalog ids are kind `bridge`. Four-point takes the radial `1/r` field as a premise. Reynolds takes matched wall slopes and `Pr = 1`. Thomson reads BE-73 along temperature. The quantities do not meet, so the edges do not compose. `e` is the elementary charge. Euler's number is `exp`. A sentence that opens with Not, and a sentence that says "is a different", is dropped from the catalog search text. `upt search "thomson coefficient"` names be-83 and does not name be-73. `upt search "skin depth"` names `case-skin-depth` and does not name be-75. `onsager` and `reversibility` still name be-73. The catalog audit is DERIVED 20, DECOY 9, NOT A MONOMIAL 5, OPEN 34. be-81 is the new decoy. be-82 is open at complexity 0. be-80 and be-84 recover `9/8` and `π/ln 2`, which the clean-constant list does not contain, so those prefactors stay tagged empirical/tuned. The formally-proved map filter is `35 of 177 kept`. The evaluate range is `BE-51/52/55..87`. Package version stays 3.1.0. The sentence that the pin is `ee753df77bd5b29b7207443181606b6004bfcf6a`, that twenty-four catalog rows derive `formally-proved`, and that the catalog audit is DERIVED 15, DECOY 8, OPEN 29 is the record from before this pin.
- **An edge alias is an evaluate key.** `be74Edge.evaluate({ B_T: 1 })` and `evaluateEdge(be74Edge, { B_T: 1 })` are `397887.35751312086`. `composeEdges(be74Edge, be76Edge).evaluate({ B_T: 1, n_per_m3: 1e20, T_K: 300 })` is `0.0000010409848219073948`. BE-66 through BE-76 evaluate from their first alias. Disagreeing aliases throw `AliasConflictError` and name the source. The sentence that `B_T` fails a finiteness check on the edge is the record from before this binding.
- **The spelled unit `gauss` is 10⁻⁴ T.** `upt eval B B=1gauss` and `convertValue('1 gauss', 'T')` are `0.0001`. `G` is the same unit. `GPa` stays a gigapascal. Bare `upt eval G` stays Newton's constant. The sentence that `1gauss` is an unknown unit is the record from before this alias.
- **Package version 3.1.0 is on npm.** `npm view universal-physics-tensor@3.1.0 version gitHead` printed `3.1.0` and `d5db9af65c27c3796d9bde37b7f286923ef12c9d`. Annotated tag `v3.1.0` is object `8d110b6d26cbe3e40ef608446aa2bd0a17cb573c` and its target is that commit. Publish run `37209533226` succeeded. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v3.1.0`. The sentence that npm `latest` is still `3.0.0` is the record from before that measurement.
- **Engineering-physicist dogfood, round 4, 2026-10-04.** The re-run of the 3.0.0 repros that 3.1.0 closed, the BE-74 through BE-76 checks, the engineering cases, the new candidates, and the filed bugs are `docs/dogfood/2026-10-04-engineering-physicist-bridges-r4.md`. Model persona on the published package, not a human reviewer. The new candidates are unproven. The bugs are issues 351–358 and are not fixed in this change. The session does not change `src/`.
- **Package version in this tree is 3.1.0.** npm `latest` is still `3.0.0` until the tag workflow publishes this version. The public exports added since `3.0.0` are `evaluateMagneticPressure`, `evaluateLondonPenetration`, `evaluatePlasmaBeta`, their input and result types, and `be74Edge`, `be75Edge`, and `be76Edge`. No export was removed. The sentence that the package version is 3.0.0 is the record from before this bump.
- **PhysJS pin `ee753df77bd5b29b7207443181606b6004bfcf6a` (PhysJS #62 and #63).** Lean files are `lean/<File>.lean`. There is no `lean/PhysJS/` directory and no `lean.lean`. Theorem names are `PhysJS.*`. The vendored manifest adds `be-74` `PhysJS.MagneticPressure.pressure_eq`, `be-75` `PhysJS.LondonPenetration.depth_eq`, and `be-76` `PhysJS.PlasmaBeta.beta_eq`. Each proof is complete. The axioms are `propext`, `Classical.choice`, and `Quot.sound`. Kind is `bridge`. Twenty-four catalog rows derive `formally-proved`. Twenty-five catalog ids are kind `bridge`. `p_B = B²/(2 μ0)`. The 2 is the inductor integral. `λ_L = √(m/(μ0 n e²))` and `e` is the elementary charge. `β = 2 μ0 n k_B T / B²` by substituting the magnetic pressure. The composition edge is `n k_B T / p_B`. `composeEdges` of be-74 into be-76 meets on `magnetic-pressure`. Not a plasma-β inequality. `upt regime plasma` stays vacuous. The catalog audit is DERIVED 15, DECOY 8, NOT A MONOMIAL 5, OPEN 29. be-74 is derived. be-75 and be-76 are decoys. The formally-proved map filter is `24 of 166 kept`. `runChainPipeline(CATALOG_GRAPH)` returns the provisional stub `chain-be-74-be-76` and the two regime rejections. The stub is not a formalRef. The evaluate range is `BE-51/52/55..76`. The sentence that the pin is `4ea35872513f8d4d12a01bfac225156bdddb87a9` and that Lean files are `lean/PhysJS/<File>.lean` is the record from before this pin. The sentence that the catalog audit is DERIVED 14, DECOY 6 is the record from before be-74..76.
- **A missing dimensionful constant is the span failure.** `outsideGoverningSpan` is true only when the target's dimension is not in the span of the governing variables. `upt explain gravitational-frequency-ratio g1=-1 g2=-4` recovers `2` and says the inputs do not fix a unique monomial. It does not say the formula carries dimensionful constants. Hawking temperature from mass alone still does. The sentence that gravitational redshift carries dimensionful constants is the record from before this judgement.
- **A suggestion query drops a hyphen token shorter than three letters.** `searchNameWords` is the ranking. `upt explain not-a-quantity-xyz` does not print `` `upt search a` ``. Explicit `upt search a` still finds the quantity `a`. `schrodinger-equation` still searches `schrodinger`. The sentence that a failed explain of `not-a-quantity-xyz` suggests `a` is the record from before this threshold.
- **A sum of dimensionful terms is not a monomial reconstruction.** `formulaShape` reads the encoded formula. be-69, be-36, be-40, be-50, and be-54 are `not-a-monomial`. The catalog audit is DERIVED 14, DECOY 6, NOT A MONOMIAL 5, OPEN 29. be-69 is not in the decoy list. The canonical audit stays DERIVED 79, DECOY 7, OPEN 23. `upt map --source=both --evidence=formally-proved` still keeps be-69: the filter reads the Lean kind, not the reconstruction. Explain of `fast-magnetosonic-speed` does not print ∝. be-36's triage tier is 3. The sentence that the catalog audit lists seven mismatches including be-69, and that be-36 is grounded in tier 2, is the record from before this classification.
- **PhysJS pin `4ea35872513f8d4d12a01bfac225156bdddb87a9` (PhysJS #61).** Lean files are `lean/PhysJS/<File>.lean`. Theorem names and the vendored manifest entries are unchanged. `physjsFileUrl` is the permalink builder. The committed catalog and atlas JSON are regenerated from it. The sentence that the pin is `3af15b49be09442350510e7c7f56f4aab92ea3bc` and that the path is `PhysJS/<File>.lean` is the record from before this move.
- **Package version 3.0.0 is on npm.** `npm view universal-physics-tensor version gitHead` printed `3.0.0` and `9ea1990899b44807e8d2fa37aba7c2dda9780b68`. Annotated tag `v3.0.0` is object `a6fd7a29904e40483dd743c4d0e213e1bb245e9b` and its target is that commit. Publish run `37173405878` succeeded. The GitHub release is `https://github.com/danielsimonjr/Universal-Physics-Tensor/releases/tag/v3.0.0`. The sentence that the `v3.0.0` tag is not pushed, and that npm `2.0.1` remains the published release, is the record from before that measurement.
- **Applied-physicist dogfood, round 3, 2026-10-04.** The re-run, the BE-66 through BE-73 checks, the migration-note checks, the new candidates, and the new bugs are `docs/dogfood/2026-10-04-applied-physicist-bridges-r3.md`. Model persona on the published package, not a human reviewer. The fourteen bugs from the 2.0.0 report and N1–N5 from the 2.0.1 report behave as the 3.0.0 migration notes. The new bugs are recorded there and are not fixed in this change. The new candidates are unproven. The session does not change `src/`.

## As of 2026-10-03

- **Package version 2.0.1 is on npm.** `npm view universal-physics-tensor@2.0.1 version gitHead` printed `2.0.1` and `b2abf1bca457635b76bf28a2c9d3da7b1e27703c`. Annotated tag `v2.0.1` is object `c7974de9d95306621c3f12d854058d2ad3fce50a` and its target is that commit. The sentence that the tag is not pushed, and that npm `2.0.0` remains the published release, is the record from before that measurement. Publishing further releases stays the owner's job.
- **Applied-physicist dogfood, round 2, 2026-10-03.** The re-run, the BE-66/67/68 checks, the new candidates, and the new bugs are `docs/dogfood/2026-10-03-applied-physicist-bridges-r2.md`. Model persona on the published package, not a human reviewer. The new candidates are unproven. The session does not change `src/`.
- **Open dogfood items are grouped by mechanism in `docs/planning/root-cause-analysis-2026-10-03.md`.** The re-run is `docs/dogfood/2026-10-03-applied-physicist-bridges-r2.md`. The name-resolution cause, including the evaluate-key miss and `mu_0` as a dimension term, is the alias-registry bullet. A determination that was not established exits 3; that is the exit bullet. Plasma, piezoelectricity, and Tolman are vacuous regime registrations; that is the regime bullet. Explain text prints a recovered value at 15 significant digits; that is the formatter bullet. Derive and map name a catalog edge when the target and the sources are that edge; that is the known-relation bullet. The sentence that the derive report does not name be-66 is the record from before this report. The sentence that the Tolman text rounding stays open is the record from before this formatter. The evaluate help range is the registry bullet. Connectors read the ledger; that is the connector bullet. The OpenStax section number is closed by the citation bullet. The sentence that the second report is not in `docs/dogfood` is the record from before #332.

- **PhysJS pin `3af15b49be09442350510e7c7f56f4aab92ea3bc` (PhysJS #57).** The vendored manifest adds `be-69` `PhysJS.FastMagnetosonic.speed_eq`, `be-70` `PhysJS.EinsteinRelation.diffusion_eq`, `be-71` `PhysJS.Clapeyron.slope_eq`, `be-72` `PhysJS.GravitationalRedshift.frequency_ratio`, and `be-73` `PhysJS.KelvinRelation.peltier_eq`. Each proof is complete. The axioms are `propext`, `Classical.choice`, and `Quot.sound`. Kind is `bridge` while the covers line still begins with `derivation-step`. Passing the reference to `deriveEvidence` lights `formally-proved`. The catalog path passes a kind-`bridge` reference, so catalog evidence and `deriveEdgeEvidence` are `formally-proved` for an adjudicated row, including `be-40`, whose membership stays not-a-bridge. `be-50` is unadjudicated, so that verdict stays `proposed`. A derivation-step, a property, and a cross-check are not passed. `be-30` stays `proposed`. `be-35` stays `contradicted`. `be16Edge.confidence` stays `speculative`. `composeEdges(be42Edge, be16Edge)` stays `highly-speculative`. `composeEdges` of be-72 with be-68 throws: the quantities are disjoint, and the frequency ratio is not the Tolman invariant. Nested `perpendicularQuartic` and `tolmanRatio` are not the formalRef. There is no `entropy_slope` key. Twenty-one catalog rows derive `formally-proved`. Twenty-two catalog ids are kind `bridge`. The sentence that the pin is `d917fa328039d19c3659f74ea73569effb3ed4fb`, that seventeen catalog ids are kind `bridge`, and that sixteen catalog rows derive `formally-proved` is the record from before this pin. The sentence that the pin is `2e09357f9674bc60b60b378155a1623c27dc7b04` and that fourteen catalog ids are kind `bridge` is the record from before PhysJS #55.

- **Package version in this tree is 3.0.0.** The `v3.0.0` tag is not pushed. npm `2.0.1` remains the published release until the owner publishes. The sentence that the package version is 2.0.1 is the record from before this bump.

- **Derive and map share one known-relation report.** `upt derive radiation-pressure:pressure poynting_flux:power/area c:velocity --formula "poynting_flux/c"` names be-66 and still says the canonical prefactor is not checked. `upt map` of `radiation_pressure = poynting_flux/c` names the same edge. The full source set is an exact match. `pressure` with `intensity` does not name be-66. A canonical factor still exits 3. The sentence that derive does not name be-66 is the record from before this report.

- **Explain text prints a recovered value at 15 significant digits.** `upt explain tolman-invariant proper-temperature=5800 metric-g00=-0.9999957549948597` prints `5799.98768947203`. JSON `recoveredValue` stays `5799.987689472028`. The summary and the derivation line call one function. Relative spread stays one-digit exponential. The sentence that the text was `5.8000e+3` is the record from before this formatter.

- **`upt connectors` reads the adjudication ledger.** A decoy or an entailed pair is printed under that verdict, with the grounds. A pair with no ledger row is unadjudicated. A shared name token is a token. `foerster-radius~schwarzschild-radius` is a decoy: a Förster radius is not a Schwarzschild radius. The coarsening and tunneling pairs stay the decoys the ledger already recorded. The sentence that headed them as the motivated set is the record from before this change.

- **Top-level help is the command registry.** `upt --help` is each command's own help. `upt eval E E=1eV` is the binding. `upt eval E=1eV` stays exit 2. The evaluate sentence names the registered evaluators, `BE-51/52/55..76`. The sentence that the range is `BE-51/52/55..73` is the record from before PhysJS #62. The sentence that the range is `BE-51/52/55..68` is the record from before PhysJS #57. The sentence that help says pass `E=<number>` and that the range is `BE-51/52/55..65` is the record from before the registry change.

- **Plasma, piezoelectricity, and Tolman are regime registrations with an empty inequality list.** `upt regime plasma` exits 0 and says no machine condition was evaluated. The same sentence is what piezoelectricity and Tolman print. No plasma-β, piezoelectric, or Tolman inequality is registered. An unknown name still exits 1. The command source names no family. The line that `upt regime plasma` exits 1 and lists only the three atlas families is the record from before this registration.

- **Derive and map share one exit for a result that was not established.** A non-unique monomial exits 3. A catalog target whose dimension depends on an unresolved name exits 3 and does not quote the placeholder dimension. A canonical agreement stays exit 0. An unbound target stays exit 0. The Debye derive and `pressure = intensity/c` exiting 0 are the record from before this classification.

- **Evaluate, explain, map, derive, and search read one alias registry.** An evaluate key is an alias of that edge's graph quantity. `upt explain debye-length` names `CE-debye-frequency` and does not suggest `planck-length`. `temperatur` is `temperature`. A supplied name that does not resolve exits 1. `mu_0` as a dimension term is permeability. The lines that explain of `I`, `R`, and `theta` exits 0 with no derivation path are the record from before this registry.

- **A published citation is a GitHub blob URL, and be-66 cites the OpenStax page.** Command text that named a repository file names `https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/` plus that path. The be-66 citation is `https://openstax.org/books/university-physics-volume-2/pages/16-4-momentum-and-radiation-pressure`. The sentence that named §16.5 is the record from before this change. `--stored` still reads the checkout artifact. The package still does not ship `docs/`, `tests/`, or `data/`.

- **`upt chain` cites the design on GitHub and does not run the orchestrator.** `be16Edge.confidence` is `speculative`. `composeEdges(be42Edge, be16Edge)` is `highly-speculative`. `upt atlas be-16` prints the kind-`bridge` formalRef and says that grade does not make the chain `formally-proved`. `upt symbolic` prints the same grade beside CT-1. The sentence that the command cites `docs/planning/Bridge-Discovery-Pipeline-Design.md` is the record from the 2026-10-03 dogfood.

- **`magnetic-flux-density` evaluates the cyclotron frequency.** It is the same vacuum B as `magnetic-field`. The 2026-10-03 dogfood line that the flux-density call has no derivation path and suggests the wire law is the record from before this shared name.

- **Canonical G-closures are not derived prefactors.** `upt audit --source=canonical` reports DERIVED 79, DECOY 7, OPEN 23. `CE-rydberg-energy`, `CE-bohr-radius`, `CE-classical-electron-radius`, `CE-bohr-magneton`, and `CE-field-energy-density` are reconstruction mismatches. Stefan–Boltzmann and Wien stay empirical/tuned. Planck–Einstein and de Broglie stay `×6.283`. The 2026-10-03 dogfood counts DERIVED 84, DECOY 2, OPEN 23 are the record from before this gate.

- **`upt search` breaks a query on spaces and hyphens.** `upt search "radiation pressure"` matches be-64. `upt search magnetic-field` matches that name. `upt search be-16` matches be-16. The three exit-1 results are the record from before this split.

- **`nT` and `uT` are tesla. `m_p`, `N_A`, and `F` evaluate. `permeability` is a dimension.** `B=12nT` is `12e-9` T. `B=12uT` is `12e-6` T. `Ts` stays a terasecond. `sigma` stays free. `mu0:permeability` is `L M T^-2 I^-2`. The 2026-10-03 dogfood lines that those commands fail are the record from before this change.

- **`upt evaluate be-16` names `BridgeEquations.landauerEnergy` and `upt explain landauer-erasure-energy temperature=300`.** Both return `k_B T ln 2`. The sentence that told the reader to see `upt evaluate` with no args is the record from before this hint.

- **A temperature binding refuses a unit that is not a temperature, and reads an energy as `k_B T`.** `upt eval "k_B*T/e" T=22eV` is 22. `T=1m` exits 1. `T=300K` and `T=25degC` stay absolute kelvin. The lines `3.0374278e-22` and `4.866495848622025e-41` are the record from before this conversion.
- **Canonical Landauer is `k_B T ln 2`.** `CE-landauer` and `be-16` agree. `upt explain --source=both` prints `erasure-energy` and `landauer-erasure-energy`. `upt audit --source=canonical` reports `CE-landauer ×6.931e-1`. The coefficient is applied only when the canonical entry restates a catalog bridge. `CE-rydberg-energy` and `CE-bohr-radius` stay the G-closure factors from the 2026-10-03 dogfood. The lines `4.1419e-21` and `×1.000e+0` for `CE-landauer` are the record from before this coefficient.
- **Package version 2.0.0 is on npm.** `npm view universal-physics-tensor@2.0.0 version gitHead` printed `2.0.0` and `283fdb93d84f251270dfe3fcfe2cf4d7bb1741e4`. Annotated tag `v2.0.0` is object `b17412ac19fadd33aebb27e935a784e1d3dae719` and its target is that commit. The sentence that the tag is not pushed is the record from before that measurement. Publishing further releases stays the owner's job.
- **Applied-physicist dogfood, 2026-10-03.** The session log, the candidate bridges, and the bugs are `docs/dogfood/2026-10-03-applied-physicist-bridges.md`. Model persona on the published package, not a human reviewer. The candidates are unproven. The session does not change `src/`.
- **Bare `e` is the elementary charge through MathTS `{ physics: true, charge: 'scalar' }`.** `@danielsimonjr/mathts-functions` is ^0.67.0. `1-e^2` with no binding stays near 1. `{ physics: true }` without `charge: 'scalar'` is still the coulomb Unit. `exp(1)` is Euler's number. `E` is energy. The name `euler` is refused. The 2026-10-03 sentence that the adapter kept `{ e: E_SI }` is the record from before 0.67.0.
- **Buckingham-π calls MathTS `rationalNullspace`.** Exponents still pass through the denominator-≤720 check. A matrix with no rows uses `{ columns }`. The numeric `nullspace` is not that call.
- **Both uncertainty contracts call MathTS function-form `propagateUncertainty`.** The graph-layer result still reports `bound.delta` beside `sigma`. The CLI helper still reports the curvature ratio and pairwise correlations. Each uncertain input is its own call, and that call's values object is only that input: MathTS differentiates every key of `values`, and stepping an exact `f_lo = 0` discarded the partials. The correlation sum stays in the helper. `compileExpr` quotes an undefined name; the `FormulaError` text stays `Undefined symbol process`.
- **GL4 steps call MathTS `gaussLegendre4`.** Step-halving and `onStep` stay. `onStep.iterations` is that step's Picard count. `solveODE` is not this call.
- **Unit dimensions go through `toSiDimensionVector`.** A MathTS unit is used when its SI magnitude and 7-base dimension match the local table. `bit` stays ln 2 nat. Affine °C, a solar mass, a Julian year, and the gauss stay local. `Dimension` stays the 7-field record.

## As of 2026-10-02

- **A bad Kerr geodesic value exits 1.** `upt metric kerr --geodesic` with a non-positive mass, or with `|a|` above GM/c², is `CliError`. A missing metric name stays exit 2. A finite-difference refusal stays exit 2. Package version in this tree is still 1.0.4.
- **The fixed-step geodesic RK4 calls MathTS.** `integrateGeodesic` and `integrateRK4` use `solveODESystem` with `dt`. `solveODE` is adaptive and is not that call. `gl4-integrator.ts` and `composition/uncertainty.ts` stay. Package version in this tree is still 1.0.4.
- **Unit conversion and the 16-point rule call MathTS.** `convertValue` uses `unit` and `toSI` when that SI ratio matches the local scale. A temperature difference does not. `bit` stays ln 2 nat. Buckingham-π stays the local exact rational null space. `integrateGaussLegendre` uses `rootsLegendre(16)`. `gaussQuad` is not that degree. Package version in this tree is still 1.0.4.
- **MathTS is required.** The nine `@danielsimonjr/mathts-*` packages are dependencies: autograd ^0.3.16, core ^0.16.0, expression ^0.9.0, functions ^0.66.0, matrix ^0.7.6, parallel ^0.6.8, tensor ^0.2.22, wasm ^0.3.0, workerpool ^0.2.6. `@viz-js/viz` stays an optional peer. The 2026-09-29 sentence that they are still optional peers is the record from that date. This repository does not publish a MathTS tarball. The 2.0.0 release commit is the package version. The `v2.0.0` tag is not pushed.
- **npm 1.0.3.** Published. git `d22aed695c8cb1426e9e611c5528008406a22b79`, Publish run 37021003665. `npm view universal-physics-tensor version` is `1.0.3`. The sentence under 2026-10-01 that npm 1.0.2 is the published release is the record from that date. Package version in this tree is 1.0.4. The `v1.0.4` tag is not pushed with the release commit.
- **Index names.** `LabeledTensor.contract` matches `UniversalIndexId`. A name that appears on both operands with more than one id throws `IndexNameMismatchError` and names both ids. Distinct names stay an outer product. The same id still contracts.
- **`upt chain`.** Registered. `upt help` does not list it. Running it prints that the orchestrator stays internal, that a chain is provisional and is not written to the catalog, and exits 2. `runChainPipeline` is not a public export. `upt help chain` prints that status.
- **README counts.** `scripts/readme-status.ts` stamps the development-status table, the membership sentence, the TypeScript badge, and the ROADMAP Phase 4 kind sentence. `docs-fresh` runs `--check` after `docs:deps`.
- **PhysJS pin.** Main `2e09357f9674bc60b60b378155a1623c27dc7b04` (PhysJS #54). The manifest entries are unchanged from `c6958650f0be66b21f5cc3992d5474bf97ad5094`. At that previous pin, five module comments still said the reference is not a formalRef (`Lindblad.lean`, `Jarzynski.lean`, `QuantumBounce.lean`, `Fret.lean`, `HawkingUnruh.lean`), and `Landauer.lean` said `Derivation step`. At this pin those comments name the UPT `formalRef`. The only manifest change from `dd35202920bf19c39f71f15d9ee740a6d28ec173` to `c6958650f0be66b21f5cc3992d5474bf97ad5094` was `be-16`: `PhysJS.Landauer.erasure_eq` replaces `PhysJS.Landauer.equal_levels`. The proof is complete. The axioms are `propext`, `Classical.choice`, and `Quot.sound`. The kind is `bridge`. BE-42 stays `cross-check`.
- **Reviewed formalRef, three counts.** Ten atlas bridges carry a reviewed PhysJS `formalRef` and derive `formally-proved`. Sixteen catalog equations carry a counted `formalRef` and do not light `formally-proved`: `be-64` `PhysJS.Eddington.balance_iff`, `be-53` `PhysJS.YangMills.b0_pos_iff_nf_le`, `be-58` `PhysJS.JohnsonNyquist.tendsto_classical`, `be-38` `PhysJS.Mond.tendsto_nu_limits`, `be-13` `PhysJS.Einstein.trace_eq`, `be-34` `PhysJS.KibbleZurek.exponent`, `be-65` `PhysJS.Jeans.mass_eq`, `be-51` `PhysJS.Deflection.line_integral`, `be-61` `PhysJS.Sommerfeld.integral_eq`, and seven bucket-A partial statements: `be-14` `PhysJS.PlanckArea.area_law`, `be-17` `PhysJS.EinsteinCartan.inversion`, `be-22` `PhysJS.ToricCode.toric`, `be-15` `PhysJS.Coarsening.exponent_iff`, `be-32` `PhysJS.BornOverlap.modulus_sq`, `be-35` `PhysJS.Crossing.antisymmetry`, `be-30` `PhysJS.Entanglement.first_variation`. Fourteen bucket-A theorems state the catalogued equation, so the kind is `bridge` while the covers line still begins with `derivation-step`: `be-12` `PhysJS.ThermalDeBroglie.wavelength_eq`, `be-16` `PhysJS.Landauer.erasure_eq` (⟨E⟩ − F = k_B T log 2 for T > 0 on the equal-level two-state ensemble; not E ≥ T ΔS for an arbitrary protocol, and not the Bérut confrontation), `be-59` `PhysJS.Josephson.frequency_eq`, `be-55` `PhysJS.QuantumHall.reciprocal`, `be-21` `PhysJS.Kss.saturating`, `be-43` `PhysJS.PlanckArea.area_law`, `be-37` `PhysJS.Shapiro.radial_integral`, `be-27` `PhysJS.EffectiveTemperature.sum_eq`, `be-40` `PhysJS.CompositeHiggs.scale_free`, `be-63` `PhysJS.Chandrasekhar.prefactor`, `be-54` `PhysJS.RandallSundrum.brane_friedmann` (H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3 for σ ≠ 0; not derived from the five-dimensional Einstein equation), `be-50` `PhysJS.TimeSymmetric.wheeler_feynman` (A = (A_ret + A_adv)/2; the id remains contested), `be-33` `PhysJS.QuantumCritical.thermal_scaling` (ξ(T) = ξ₀ (T/T₀)^{−1/z}; not Hertz–Millis), `be-60` `PhysJS.Laughlin.filling_fraction` (σ_xy = ν e²/h and R_xy = R_K/ν for nonzero integers p, q; not the Laughlin wavefunction or the charge e/3). Passing one of those references to `deriveEvidence` lights `formally-proved`. `be-28` `PhysJS.EntropyProduction.nonneg` is kind `property`: the theorem is non-negativity of the defining sum, not the variational principle. Three catalog equations carry a cross-check and do not light the tag: `be-42` `PhysJS.HawkingUnruh.dictionary` (names BE-57 and `be-42-via-rs`; BE-57 has no reference; PhysJS #53 records that the Hawking temperature is not proved, because PhysLean has no Schwarzschild surface gravity and no KMS condition, and the dictionary remains the theorem), `be-24` `PhysJS.Fret.dictionary`, `be-19` `PhysJS.QuantumBounce.dictionary` (names BE-54, whose own reference is `PhysJS.RandallSundrum.brane_friedmann`). Two carry a property and do not light the tag: `be-29` `PhysJS.Jarzynski.jensen_work` (`⟨W⟩ ≥ ΔF` by Jensen, not Jarzynski's equality), `be-11` `PhysJS.Lindblad.preserve`. The owner admitted both kinds on 2026-10-01. Each reference carries `kind` and a permalink `url`. `deriveEvidence` lights `formally-proved` only for `kind: 'bridge'`. A passed-in property lights `formally-proved-property` and a passed-in cross-check lights `formally-proved-cross-check`. Those labels are not the proved-bridge count. A reduction, a limit, and a derivation-step light none of the three. The catalog path still omits the reference. `PhysJS.SpringLc` and `PhysJS.DampedRlc` link to `PhysJS/OscillatorDictionary.lean`. Nested and not the reference: `oneLoop` on `be-53`, `inversion` on `be-38`, `vacuum` and `corollary` on `be-13` (`PhysJS.Einstein.friedmann_corollary` is the BE-20 statement; BE-20 has no key), `friedmann` on `be-54`, `lengthMonomial` on `be-15` (`PhysJS.Coarsening.length_monomial_at`; assumes dimensional homogeneity with [Γ] = L^z T⁻¹ and gives L = C (Γ t)^{1/z}; C is unfixed and z = 2 is not derived), `torsionMonomial`, `coefficientNotFixed`, and `unitCoefficient` on `be-17` (`PhysJS.EinsteinCartan.torsion_monomial`, `coefficient_not_fixed`, `inversion_of_unit_coefficient`; the coefficient C is unfixed by dimensions and C = 1 is assumed), and `scalingShape` and `everyPower` on `be-33` (`PhysJS.QuantumCritical.scaling_shape` and `every_power_homogeneous`; the shape only, and the exponent is not chosen). The five rank-1 `planeWave` objects stay nested. `be-28`, `be-32`, `be-35`, and `be-40` stay not-a-bridge. The pin is PhysJS main `2e09357f9674bc60b60b378155a1623c27dc7b04`. The 2026-10-01 reading that be-16 was kind `property` at `PhysJS.Landauer.equal_levels`, that thirteen catalog ids were kind `bridge`, and that the pin was `dd35202920bf19c39f71f15d9ee740a6d28ec173`, is the record from that date. PhysJS is public (`https://github.com/danielsimonjr/PhysJS`; GitHub API `private: false`). BE-38's catalog name is `Milgrom MOND interpolation ν(z)`. BE-36 keeps its name.

## As of 2026-10-01

- The live task list and the 2026-10-01 gate ruling are `ACTIVE.md`. Paragraphs below that still call a human-reviewer gate or either dropped study open are the record from the date in their heading.
- **Proved, with an unresolved counterexample.** Six atlas bridges derive both `formally-proved` and `contradicted` (`ab-spring-lc`, `ab-pendulum-linear`, `ab-telegraph-diffusion`, `ab-klein-gordon-wave`, `ab-kg-schrodinger`, `ab-stiff-string`). `upt atlas` prints that pair. The proof is not withdrawn and the counterexample is not resolved. The other four proved bridges have no counterexample.
- **Formula symbols.** A bare `e` is the elementary charge (`E_SI`, dimension charge). `E` is energy and is not filled in. Euler's number is `exp(x)`, for example `exp(1)`. The name `euler` is refused, and the error names `exp(x)`. `--allow-euler` is not a flag. `parsePhysics('e^2', {})` is charge squared. Mixing that charge into a dimensionless sum (`1-e^2`) is an error on `upt eval` and `upt map`: declare or bind `e`, or write `exp(x)`. The map message names `one_minus_e_sq`. A declared dimensionless `e` stays dimensionless. The 2026-10-01 sentence that Euler's number is `exp(1)` or `euler` is the record from that date. The 2026-09-29 sentence that a bare `e` is warned as Euler's number is the record from that date.
- **Library API dogfood, three personas, 2026-10-01.** Findings are in `docs/dogfood/2026-10-01-library-api.md`. The session is model-persona use of the public API on master `c9fbc0bb`. It does not change `src/`.
- **npm 1.0.2.** Published. gitHead `6807247bfbdc403a3f2ff7616a69d4520165a572`. The round-3 report is `docs/dogfood/2026-10-02-npm-1.0.2.md`. The sentence that 1.0.2 was not published is the record from earlier on 2026-10-02. The 2026-10-01 sentence that npm 1.0.1 is the published release is the record from that date.
- **`upt atlas be-<n>`.** A catalog id whose entry has a `formalRef` prints that stored reference, including `kind` and `url`, and the catalog name. It does not derive `formally-proved`. A catalog equation with no reference says so. Atlas bridges stay `ab-*`. The catalog name of equation 13 is `Einstein trace reduction`. Jacobson stays in the context and the notes. `PhysJS.Einstein.trace_eq` is kind `reduction` and declines Jacobson's thermodynamic derivation. The proposal that asked for the rename is `docs/planning/BE-13-name-proposal.md`. The PhysJS module comments that deny those references are in the PhysJS repository, not in this tree.

## As of 2026-09-30

- **Reviewed formalRef.** Ten bridges carry a reviewed PhysJS `formalRef`, each `system: 'lean4-physjs'`. Milestone 1 is the five rank-1 dispersion bounds (`covers_bound_delta`) and `ab-pendulum-linear`, retargeted at `PhysJS.Pendulum.linearizedEquationOfMotion_iff`. Milestone 2 adds `ab-kg-oscillator`, `ab-spring-lc`, `ab-damped-rlc`, and `ab-wave-dalembert`. Each of those four certifies the bridge transformation named in the scoping report §4.3: the uniform-mode restriction, the oscillator dictionary (the circuit reading stays this repository's claim), and the missing direction of d'Alembert's formula. The five rank-1 entries also carry a nested `planeWave` object (`planeWave_iff_dispersion`). That object is not the `formalRef`. That meets the ≥5 gate. The 2026-09-24 deferral still means the criterion does not block DONE. The manifest pin is PhysJS main `d1c1b18fb54d5fe3aa14f8307b5349b0d672d70c`. PhysJS is public (`https://github.com/danielsimonjr/PhysJS`; GitHub API `private: false`).
- **Tier 11 hybrid retrieval.** `upt retrieve` is the atlas search (`rankByStructure` on the live canonical registry). The default does not call out of process. `--embed` asks local Ollama for `qwen3-embedding:4b`. A cosine order is a proposal, not an acceptance. Fallback names one of four reasons and exits 0. The frozen vector file is ranked in tests and is not re-embedded. The study's recall is not recomputed. A live GPU run is outside this gate. The 0.50.0 release is still open.
- **Composition-derived recovery.** `scanCompositionRecovery` on `CATALOG_GRAPH` examines 8 pairs and 0 structural matches. The pairs are `be-12`→`be-11-zurek`, `be-42`→`be-12`, `be-42`→`be-16`, `be-42`→`be-33`, `be-42-via-rs`→`be-12`, `be-42-via-rs`→`be-16`, `be-42-via-rs`→`be-33`, and `law-schwarzschild-radius`→`be-42-via-rs`. A chain is `recovers` or it is not a hit. It is not `restates-canonical`.

## As of 2026-09-29

- **CLI dogfood, three personas, 2026-09-29.** Findings are in `docs/dogfood/2026-09-29-applied-physicist.md`, `docs/dogfood/2026-09-29-gr-qft.md` and `docs/dogfood/2026-09-29-engineering-physicist.md`.
- **MathTS optional peers, 2026-09-29.** Ranges match `npm view`: autograd 0.3.15, core 0.15.5,
  expression 0.8.2, functions 0.65.0, matrix 0.7.5, parallel 0.6.7, tensor 0.2.21, wasm 0.3.0,
  workerpool 0.2.6. Still optional peers. The packages themselves were not republished.
- **Tier 10, as of 2026-09-29.** Daniel approved the §11 defaults in
  `docs/design/tier-10-cross-family-path.md`. M1–M4 are in. `upt path` labels `crossFamily` and
  `modelFamilies` from the models the route visits. Across families a matching norm name is not a
  transport: only a witnessed `NormTransport` carries a bound, and its factor is applied; otherwise
  the reason is `cross-family-unmapped` and there is no `bound` key. A missing Lipschitz constant
  is reported first. Each step's regime is its own tri-state; a colliding group name is unchecked
  on every step that defines it. A horizon is restated only through a declared time map on that
  step. Exit 3 is a check that ran and failed. A no-claim stays exit 0. Help states the gates.
  There is no sigma. `--at` is one flat namespace. `ab-stokes-einstein` is still a named join.
  The composition table is unchanged. `src/` scope after `docs:deps`: 392 files, 2824 exports,
  1341 re-exports.
- **`upt probe scan` gaps, measured 2026-09-29, rechecked on master `40bf16f`, contract held 2026-09-30.** Library
  `scanWithExpressionGaps(CATALOG_GRAPH)` and `upt probe scan --json` agree: 6 searchable
  prediction-residual gaps, one per applied case. `--all` lists 232 Product A wrappers
  (216 relation-link, 16 regime-transition), none of those searchable. Combined list 238.
  The split is pinned in `tests/composition/probe/expression-gaps.test.ts`, and the emitted
  `fg-expr-*` ids match `APPLIED_CASES` exactly. `searchable: true` on those gaps is the
  Tier 8 listing flag. Each record has empty observations and no named baseline or dataset.
  A detected prediction residual, under Scientific-Bridge-Discovery-v1, needs both, so the
  listing is not that detection. The 0.48.0 release is still open.
- **Tree-sitter.** `src/cli/commands/path.ts` and `src/numerical/mathts-tensor.ambient.d.ts` parsed
  with ERROR nodes under tree-sitter-typescript 0.23.2 and compiled under tsc. Both rewritten.
  The scan in `tests/internal/src-parses.test.ts` is green, and the two old constructs still error.
- **CLI dogfood open items, after the owner unfroze `src/canonical`:** `upt metric` (alias
  `curvature`) reports Christoffel, Ricci, the Ricci scalar and the Kretschmann scalar for
  Minkowski, Schwarzschild, FLRW and Kerr. The line element and the canonical Einstein-equation
  metric node are both (−,+,+,+). Schwarzschild Kretschmann is checked against
  `48 G² M² / (c⁴ r⁶)`. `--geodesic` integrates a short Schwarzschild circular orbit and a Kerr
  geodesic. θ = π/2 is an equatorial circular orbit. Any other θ is an inclined spherical orbit
  whose polar turning point is that θ. Initial data use the Carter constant. The integrator is
  the second-order geodesic equation. ISCO radii, the equatorial photon sphere, and a spherical
  photon orbit between those radii are checked. a = 0 matches a Schwarzschild geodesic.
  `--natural` sets ħ = c = 1 and `--geometrized` also sets G = 1; the SI default still refuses
  `rest_energy = mass`. Flat `CE-friedmann` is `H² = 8πGρ/3`. `CE-friedmann-curvature` is
  `H² = 8πGρ/3 − k c²/a²`. `1Msun` is `M_SUN_SI = 1.989e30` kg. `GM_sun` is `GM_SUN_SI` and
  `Msun_iau` is `GM_SUN_SI/G_SI`, both registered constants. `HBAR_SI` is `H_SI/(2π)`. The
  CODATA display `1.054571817e-34` is smaller by a relative `6.127e-10`. Planck-unit constants
  stay the published CODATA 2018 values. The Einstein 8π is in the scalar AST. Reduced Compton
  is `CE-compton-wavelength` with sourced prefactor 1; `CE-compton-wavelength-full` is
  λ = h/(m c). The registry has 109 entries. The criterion 3 live export matches that registry.
  Amendment 8 still hashes the labelled corpus at `c144150` (107 records, 89 expressions). The
  study runner still refuses a tree that does not match Amendment 8, which is the closed study.
  `upt eval --show-parser` prints `mathts` or `builtin`; `upt version` stays a bare semver.
- **CLI GR/QFT dogfood** (model persona, not a human reviewer): the findings report is the PR
  description for `cursor/gr-cli-dogfood-91ec`.
  Fixed in that branch: perihelion `6pi` now compares; Newton's `m_1 m_2` compares when every
  same-dimension assignment agrees; `schwarzschild-radius` reaches the frozen target `radius`;
  `sqrt(-1)` says complex; a bare `e` is warned as Euler's number; be-51/be-52 warn inside 10 r_s.
  The leftovers named in that report are closed in the open-items paragraph above.

## As of 2026-09-27

- **CLI applied-physics audit** (`docs/audit/Universal_Physics_Tensor_CLI_Audit.md`): all 14 §11
  findings are fixed (F10 was already correct and is now pinned by a test). All 20 §14 improvements
  have landed: audit I1 through F01, and the open parts of audit I3, I4, I10 and I13 on 2026-09-27.
  Landed is not limit-free; the limits each still has are in `todo.md`. Audit I2 landed by owner
  decision 2026-09-27 (`docs/planning/ADR-transported-norm-composition.md`, option 4).
- **Audit I2 as landed:** the composition table has 9 defined cells and 55 silent ones; the widened
  cell is approximation then exact-equivalence, and exact then approximation stays silent. One norm
  transport is declared: `nt-spring-lc-relative-period` on `ab-spring-lc` (model-spring → model-lc,
  K = 1), with witness W1τ (checked; fine error 7.1e-11, refinement ratio 256). `upt path
  model-pendulum model-lc --at theta0=0.2 T0=1 t=10` now composes K = 1 · delta = 0.0158525 in
  relative period error; the point bound 0.0025057 agrees with the series θ0²/16 + 11θ0⁴/3072 to
  1.5e-8. Composite evidence of that route: `contradicted`, with numerically-supported and proposed
  undecided until its witnesses are run (`contradicted` comes from the parts' stored counterexamples).
  **Negative result:** `ab-heat-diffusion` declares no transport, so model-telegraph → model-heat
  still refuses as `norm-not-stated`; a declaration needs its own witness for the model-fick →
  model-heat direction and a horizon restatement through D = κ/(ρc_p), and neither exists. Absolute
  period and trajectory norms have no declaration and stay refused through `ab-spring-lc`.
- `confront` data handling: preprocessing recorded for 17 of 19 records, not recorded for 2 (be-37,
  be-58). Independence: 10 no fitted parameter, 5 share an input (be-36, be-51, be-58, be-61, be-65),
  4 not recorded (be-48, be-52, be-56, be-64). be-61's observed Lorenz number is the predicted
  constant by construction, so that record cannot show a discrepancy (negative result).
- **Fixed defect, scope corrected:** the consistency "gap" `confront` printed was the agreement bound,
  not the observed−predicted difference, for **9 of 11** consistency records (be-55, 56, 59, 60, 61,
  62, 63, 64, 65), not the six first recorded here; be-55/59/60 were hidden by rounding to 0.0%. Now
  the actual difference is printed beside the bound: 0 for be-11/55/56/59/60/61/64, −0.787% be-62,
  −7.27% be-63, −43.7% be-65, +25.7% be-21; every bounded record is compatible. No pinned number
  changed. be-65's ±150% bound accepts any observed value from 0 to 4.44 M_⊙: its low side cannot
  fail (negative result about the record).
- `confront` compatibility decisions: all 11 consistency records now make one (2026-09-27). be-11 takes
  its module's 15% tolerance as the bound; be-21 is decided by observed ≥ 1/(4π), a one-sided lower-limit
  rule. Both are compatible. be-11's decision cannot fail on this record: its observed slot is the
  source's stated agreement, encoded as ratio 1, so the difference is 0 by construction (negative result,
  as for be-61). be-21's decision does not rest on the representative 0.10: the extraction band's
  lower edge, 0.08, is also above the bound, by 0.53%.
- Atlas equation links: 9 of 24 atlas models record a canonical equation. All 12 recorded links are
  checked numerically from the model (the eight older ones on 2026-09-27, plus `model-lc` →
  CE-capacitor-energy, new), and the unchecked-link ratchet list is empty. The 15 models without a
  link each state a reason (`NO_LINK_REASONS`). Four reasons are shown by a failing check:
  - `model-rlc` against CE-lc-resonance is 2% off at ζ = 0.2, and so is `model-damped-spring`
    against CE-simple-harmonic-frequency;
  - `model-cubic-spring` fails at βx0²/k = 0.1;
  - `model-klein-gordon` fails against CE-wave-speed, with a phase velocity ≠ c.

  Negative results:
  - `model-stokes-drag`'s check is a transcription of a closed-form law;
  - CE-inductor-energy has no sourced ½, so `model-lc` cannot link it yet;
  - CE-sound-speed's √γ is not used by `compareWithCanonical`, which cannot bind γ.

  `CanonicalEquation.model` stays unset. The live criterion 3 export was re-pinned when the owner
  unfroze `src/canonical`. Amendment 8 still hashes the labelled corpus at `c144150`. The study's
  pinned code blobs still match; the study runner still refuses a tree that is not that corpus.
- Observable translations: `ab-pendulum-linear` declares phase and position; `ab-spring-lc` declares
  a phase carriage. Every other bridge answers UNDETERMINED outside its bound's own norm.
  As of 2026-09-27 (audit I8 limits):
  - The position bound's Fourier-series premise is checked against RK4 over one period at θ0 ∈ {0.01,
    0.1, 0.2, 0.3, 0.4, 0.5} (W7xs, 1e-9 rad). It is not derived, and not checked between those points.
  - The phase point witness is now run down to a drift of 1e-4 rad in 512 T0 (θ0 ≈ 7.0e-4; it was 0.01
    rad, θ0 ≈ 0.007), at a tolerance of 5e-8 relative (it was 1e-5).
  - Its (1+ε) control can be refuted only where ε/(1+ε) exceeds that tolerance, so it cannot fail below
    θ0 ≈ 9e-4 (it was 0.013; measured: not refuted at 8.5e-4, refuted at 9e-4; not run at 6.9e-4, run at
    7.1e-4). That floor is inherent: the wrong map and the declared one differ by ε
    relative, so no witness of finite precision separates them as θ0 → 0 (negative result).
  - No other translation or carriage was added. `ab-spring-lc` would need a position carriage from
    angle to charge with a declared amplitude scale, and none is derived. No other bridge's bound has a
    derived map into another observable.
- `map --all-routes`: no ordered model pair has more than one simple route under `upt path`'s traversal
  (exact equivalence both ways, other relations forward, multi-premise bridges not followed). The
  undirected graph has two cycles (through `ab-stokes-einstein` and `ab-kg-schrodinger`); the
  traversal rules exclude both second routes (negative result).
- `--record`/`--replay`: `eval 'ln(x)' x=-1` fails with different stderr under the builtin and MathTS
  parsers, so a recorded failure does not reproduce across a parser change (negative result).
- `--record`/`--replay` (2026-09-27, audit I17 limits): `map --out`, the probe subverbs and `--stored`
  now replay under stated rules (`docs/planning/Experiment-Record-Replay-Design-Note.md`). An entry
  hashes its command's loaded modules: 34 for `evaluate`, 48 for `eval` (about 3–4.5 kB of an entry of
  about 13 kB). A probe search under the default 5 s budget gave identical output on two runs.
  `--budget-ms=1` is not a reliable stop: `Date.now()` does not move inside a millisecond, and on
  2026-09-29 a replay of that pendulum search finished as `exhausted-space` and was called
  reproduced. The clock is `performance.now()` now; a 1 µs cap states `time-limit`. Per-entry attribution is not
  done and cannot be derived from the import graph (negative result).
- `case-lumped-cooling`: at the textbook limit Bi = 0.1 the lumped temperature excess is 5.5% below
  the heat-equation mean at t = τ and 16% below at 3τ; Bi ≤ 0.1 does not bound the late-time relative
  error (negative result). `case-kepler-rv`'s double-pulsar agreement is consistency with a GR-fitted
  timing solution, not an independent test.
- `case-lumped-cooling` with radiation kept (2026-09-27, audit I20 limit): for the 1 cm oxidized steel
  ball at 1000 K in still air (the linear-loss failure example), T_radiating_K = 711.2 K after 60 s,
  against Newton's 929.8 K, at Bi_radiating = 0.0020. For the valid copper example the two differ
  by 0.53 K of a 28 K excess (1.9%; h_rad/h ≈ 0.021). Still refused, not evaluated: hydrodynamic
  memory near a wall, the parallel lubrication limit and the anomalous skin effect. The Faxén terms
  past 9/16 are still quoted and not checked. The atlas has no EM, thermal or astrophysical family:
  none of those cases has a derived bound (reasons in `todo.md`, I20).
- `probe study` large-amplitude control: the fitted θ² coefficient is 0.068, not the series' 1/16,
  because the θ⁴ term is not admitted and is absorbed; it is not a recovery of the series coefficient.
- `probe study` (2026-09-27, audit I19 limits): the synthetic physical-pendulum control
  (`pendulum-physical`, both families declared knowing the law) admits amplitude² and bob_ratio², fitted
  0.0674 and 0.214 (series 1/16 and 1/5; θ⁴ and ρ⁴ not admitted), and survives its holdout (χ² = 8.12
  on ν = 5, p = 0.15). Either family alone finds no credible candidate. Over 2000 honest re-measurements
  (7 pairs, α = 0.2) the identity test flags 9.65% and the affine test 9.70%, against α/2 = 10%; either
  flags 14.35%, so the combined false-flag rate is below α, not α/2. No shipped fixture's
  replication rows share inputs with its study rows, so none of them is tested for closeness.
- `discover --require-falsifier` hides **49 of 49** promising rows on `--source=canonical` and 4 of 7
  on the catalog: no independent falsifier ran and survived on them (negative result).
- `confront` by statistic: 6 σ-residual tests, 2 limits and 11 consistency ratios (no σ). The
  ratios are not precision tests and are never counted as such.
- `atlas --run`: all 20 atlas bridges have an entry in `WITNESS_REGISTRY` and run witnesses
  in-process (2026-09-27; it was 17 of 20). The three added are executable specs of W7
  (`ab-pendulum-linear`, RK4 T/T0 at θ0 = 0.2, matches AGM to 3.5e-13), W8b (`ab-damped-massless`,
  RK4 offset 0.0574 at m = 0.01 against the bound's 0.12, matches the closed form to 2e-9) and W9
  (`ab-chain-wave`, integrated ring, 1 − ω/(cq) over (qa)²/24 = 0.99952 at N = 32). 22 witness
  results, all checked. Negative results: `ab-damped-massless`'s bound is not sharp (5.7× loose at
  its sup), so W8b is attributed as `bound-holds-at` one point, not as the bound's value; `ab-chain-wave`
  has no bound, so W9 is attributed to a preserved property, not to a bound.
- Atlas-wide evidence (`upt atlas --evidence --stored`, 2026-09-27): of 20 bridges, 17 derive
  numerically-supported and 3 leave it undecided (their numeric witnesses have no in-process runner:
  ab-spring-lc, ab-damped-rlc, ab-stokes-einstein); 4 symbolically-checked; 1 formally-proved; 12
  contradicted (from their stored counterexamples, outside the regime); 0 empirically-supported. 21 of 40
  recorded bridge witnesses have a stored result, all checked; 19 have none. With no results source,
  proposed is undecided on 8 bridges.
- F02 as measured on `discover --source=canonical`: 49 promising, 0 mechanism-tested, 0 data-tested,
  49 without magnitude evidence, 49 with the axis unresolved, 0 with an entailed consequence.
  So nothing in the promising set is evidence yet (negative result).
- Persona W7 (Landauer `ln(2)` in `map --equation`) is **fixed**: the equation compare evaluates with
  the active formula parser, so `ln(2)` agrees with CE-landauer, and the catalog target
  `landauer-erasure-energy` reaches CE-landauer through BE-16, which CE-landauer records that it
  restates. Before the fix, `evalExpr` rejected `transcendental`, and the target names never met.
- **Persona retest (post-fix note), dispositions** (dispositions per item in `todo.md`, Active queue):
  - Eight monomial-only canonical entries hold a governing constant. Before the fix, three of them gave
    a wrong prefactor verdict: CE-kepler-third (factor 122404), CE-schwarzschild-radius (7.426e-28)
    and CE-einstein-field-eq. The persona asked whether it was two. Kepler III and the Schwarzschild
    radius now agree at ratio 1, and a halved prefactor reads 0.5 with exit 3.
  - The EFE is now prefactor-unchecked: its 8π sits only in its field equation, and `src/canonical`
    is frozen (negative result).
  - The Planck length, mass and time now compare at the SI constant values, with prefactor 1 sourced.
    An all-constant comparison checks the value, not the form (limit).
  - CE-compton-wavelength stays prefactor-unchecked: it writes ħ/(mc), the reduced Compton wavelength.
  - Persona W6 is disclosed, not refused: `unruh_temperature = hbar*a/(2*pi*k_B*c)` still binds `a` to
    the length `a` and prints RHS [T^2 Theta], and now says so. `sigma` is pointed to `sigma_sb`, not
    aliased.
  - Q4 (`discover` ordering) is not changed; it is Mothership's call.

## As of 2026-09-26

- **CLI applied-physicist persona retest on 0.47.1 after the fix batch** (model persona, not a human
  reviewer): findings in `docs/research/cli-physicist-persona-0.47.1-post-fix.md`. Prior W1–Q2 still
  hold. New open triage: W4 (Kepler/Schwarzschild monomial constants→1), W5 (Planck all-constant
  RHS refused), W6 (`a`→perihelion not acceleration), W7 (Landauer `ln(2)` vs `ln2`), L5–L8, Q3–Q4,
  persona I5–I8. No code change in that pass; Mothership to triage.
- **CLI applied-physicist persona pass on 0.47.1** (model persona, not a human reviewer): findings in
  `docs/research/cli-physicist-persona-0.47.1.md`. W1–W3, L1–L4, Q1–Q2, persona I1–I4 fixed in the patch
  batch on `cursor/persona-cli-fixes-b6c5` (dispositions in that note).

## As of 2026-09-23

### Phase exit criteria — kept separate from "tasks landed"

- **UPT is DONE** (owner, 2026-09-24; pre-registration Amendment 12): every §7 criterion is measured
  and reported. Criteria 2 and 3 are NOT MET, and they are the study's findings. Hybrid retrieval is
  future work (ROADMAP §8).

Those are different claims and merging them produces a false green.

- **Phase 4.** ≥ 20 bridges across ≥ 5 relation types: **met**, 20 bridges and 6 types.
  Zero `formally-proved` without a `formalRef`: **met by construction**. ≥ 5 bridges with a
  reviewed `formalRef`: **1 of 5, DEFERRED by the owner on 2026-09-24** (pre-registration
  Amendment 10); it no longer blocks DONE. The one counterpart is in Physlib
  (`ab-pendulum-linear`). No further checked counterpart exists in Physlib, Mathlib or the other
  systems searched (`docs/research/phase-4-formalref-scoping.md`). The PhysJS proofs are deferred
  with it.
- **Phase 5.** The frozen set is **no longer empty**: 125 frozen and 3 contested items, all
  MODEL-authored and MODEL-rated (`claude-fable-5-1`, pre-registration Amendment 2). Model-rater
  kappa: **0.984** valid/invalid, **0.978** nine-category. That is agreement between two
  instances of ONE model, not human inter-rater reliability.
- **Phase 6.** The study success path has **run once** on the non-empty set. It exposed two
  defects, both fixed: the validator rejected every "x = 0", and the atlas condition accepted items
  that no instrument had checked. Result: the atlas rejects **6 of 61** invalid items, all with the
  right failure kind, abstains on **116 of 125**, **1** wrong accept and **1** false reject.
  **Criterion 2 (atlas vs the best LOCAL LLM, Amendment 4): NOT MET, and it stands as measured (no
  re-run; Mothership, 2026-09-24).** qwen3.8:27b rejected 51/61
  invalid items against the atlas's 6/61; the interval for the difference is −73.8%
  [−82.7%, −58.7%]. The atlas made 1 wrong accept against 9–13 for the models, by abstaining on
  116/125. gemma4:26b returned empty answers
  on 64/125 items under the frozen 8,192-token context.
- **Criterion 3 (recall@10, typed structural search vs embeddings): NOT MET** (2026-09-24,
  pre-registration Amendment 11). On PRIMARY (n = 50), the embedding condition (qwen3-embedding:4b,
  frozen vectors) scored 49/50 = 98.0% [89.5%, 99.6%] and 30/30 in-distribution. The typed structural
  search's interval, [14.3%, 37.4%], does not lie above 98.0%. A second embedding pass gave the same
  49/50, with no query crossing the depth cut (min cosine 0.9972). Result:
  `docs/research/criterion3/results-embedding.md`. Before that, as INTERIM (Amendment 8), the in-process conditions ran on PRIMARY (n = 50, MODEL
  labels): text retrieval 34/50 = 68.0% [54.2%, 79.2%]; symbol matching and typed structural search
  both 12/50 = 24.0% [14.3%, 37.4%], and 0/30 on the in-distribution families. The typed structural
  tier never fired (0 of 11,125 key equalities): 123/125 queries are `lhs − rhs` residuals and the
  corpus stores right-hand sides. Every expression-condition hit is fluid statics, sharing only `g`
  (one hit is an id tie-break). The embedding condition waits for LLMBench
  (`docs/research/atlas-study-results.md`).
  EXPLORATORY, post hoc (Amendment 9): with the corpus in residual form, `target − scalarAst`, typed
  structural search is still 12/50 = 24.0% on PRIMARY and 0/30 in-distribution. The keys now match in
  4 of 11,125 pairs, and all 4 are correct references. The remaining misses are real formula
  differences, not a representation mismatch. It never replaces the criterion.
- **Baseline construction (from that run):** a reasoning model needs a context that holds its
  reasoning AND its answer. With `num_ctx` 8192, gemma4:26b's reasoning filled the context on 64/125
  items and left the answer empty. Size the context per model before freezing a baseline config.
- **Owner decisions (2026-09-23):** exported atlas data is CC BY 4.0 (`LICENSE-DATA`) and the code
  stays MIT; one maintainer across all families, by choice; no hosted frontier-LLM run (Amendment
  5); reviewer time is not measured, because there are no independent human reviewers.
- **Amended 2026-09-23 by Mothership under the owner's delegation** (pre-registration Amendment 6,
  ROADMAP §7): the reported κ is MODEL agreement and human κ is NOT MEASURED; criterion 5 (practical
  value, human time and error rate) is NOT MEASURED; per-bridge curation cost (Phases 0 and 4,
  criterion 6) is NOT MEASURED, and the reported cost is the MODEL cost, USD 19.34 for the set, about
  USD 0.15 per authored item. These are amendments, not met criteria.
- **Phase 0 independent physicist review: AMENDED 2026-09-24** (pre-registration Amendment 7). NOT
  MEASURED (no human reviewer). A model-persona review (Fable) returned 13 findings; 9 are fixed with
  tests and 4 stand with evidence (`docs/research/phase-0-model-persona-review.md`).

### Separate from the criteria above

- **Uniformity.** `ApproximationBound.uniformity` is required (`readonly string[] | null`).
  `boundPath` returns `uniformity-unanalysed` and no number when any bound on the path has
  `null` or `[]`. Construction does not throw. `propagateUncertainty` does not implement this
  gate.
- **Architecture-docs gate in CI: decided, not pending** (owner, relayed by Mothership 2026-09-23). No
  credential, no publish, no copy of the private `skills` tooling. The gate stays in the pre-push hook.
  The architecture docs are updated by hand from the data of this repository's own
  `tools/create-dependency-graph`, until `repo-tools` replaces that tool.
- **Still not startable here:** an independent physicist review; per-bridge person-hours (the logs are per agent / per batch); embeddings (no worker);
  a separate data licence (owner decision).
- **Standing physicist-review surfaces** (moved from `docs/architecture/OVERVIEW.md` on 2026-09-23;
  not re-checked then): the CONTRIBUTING.md tasks; the contested BE-44/46/50 adjudications; the
  C2/C3 calibration targets; the CI-1/CI-2 dynamic-scaling call; and the §XXVII-B adjudication of the
  Part-XI machine-derived proposals.
- **Composition table** remained 56 silent cells on 2026-09-23 (not widened then); see the 2026-09-27
  block for the I2 widening to 55.
- **`8 → 12`** direction is unresolved. The poster records it as one approximation, `d-8-to-12`.

### Results

- **Every registered witness has a negative control:** 14 numeric and 4 CAS. Of the 12 controls
  written on 2026-09-22, the **9 numeric** wrong hypotheses are **REFUTED** and the **3 CAS** ones
  are **UNRESOLVED, not refuted**. The simplifier cannot reduce `lhs − rhs` to zero, so those
  assert only "not checked". **Never merge those two counts.**
- **Link prediction is NEGATIVE.** Over 20 leave-one-bridge-out trials, text overlap **beats** the
  typed-graph predictor on both recall@10 (0.80 vs 0.70) and MRR (0.42 vs 0.28). This is a result
  and it is reported as one, not softened and not re-run looking for a better answer.

### Open defects and unknowns

- **Pre-push doc gates on 1.0.3 (2026-10-02).** The private `code_docs.py` and `repo_map.py` are not in this environment, so neither local gate was executed here. `.githooks/code-docs-baseline.txt` stays 152; it was not raised, and it was not lowered, because the private checker did not run. After merging #298 (`9022d73`), `src/`-scope prose was re-read from `bun run docs:deps`: 422 files, 2986 exports, 1396 re-exports, 92067 lines, 0 circular dependencies. The earlier reading on `d22aed69` was 421 files, 2977 exports, 1396 re-exports, 91581 lines. Domain claims were re-read from the registries: 55 catalog entries, 46 `CATALOG_GRAPH` edges, 109 canonical equations, 19 confrontations. `linkageMap(CATALOG_GRAPH)` is 26 components and 19 compositions. Whole-repository Verification tables (1025 files, 3697 exports, and the reachable, orphan, and type-only rows) and the `FILE_INVENTORY.md` zone census were not re-measured. CI job `code-docs ratchet (non-required)` runs the in-repo `--paths` checker on pull requests. It does not read the baseline. `repo_map.py` stays out of CI. The 2026-09-27 measurements below are that day's record.
- **The code-docs ratchet drifted on `master` (found 2026-09-27).** The pre-push gate counts MUST
  doc-comment issues against `.githooks/code-docs-baseline.txt` (153). Measured with the same tool
  and environment: 153 at `6d0feed`, where the baseline was set, and 221 at `master` `335e970`. So 68
  exported symbols reached `master` undocumented. Every commit on `master` after `6d0feed` is a GitHub
  merge (27 on the first-parent line, #186–#212): a merge on GitHub runs no local hook, a push from a machine without the tool
  skips the check, and CI does not run it. Which PR added which symbol was not measured. The audit
  branch added 16 more; all 84 are documented
  there, and the count is back to 153. The gate stays a local hook only, so the drift can recur.
  On this machine the gate first crashed, because `tree_sitter_typescript` was missing from the
  Python on PATH; the tool's pinned `requirements.txt` was installed.
- **The architecture-docs claims drifted on `master` too (found 2026-09-27).** The pre-push gate's
  `repo_map.py check . --docs docs/architecture` fails on `master` `335e970`: the hand-written
  Verification tables claim 898 files and 3120 exports, and `master` measures 956 and 3441. The same
  route as the code-docs drift applies: GitHub merges run no local hook, and CI does not run this
  check. On the audit branch the seven hand-written docs were re-measured (976 files, 3533 exports,
  370 reachable, 10 test-only, 5 duplicate names) and the check exits 0. No generated report was
  edited. Three of the five duplicate names (`MASS_DENSITY`, `canonicalJson`,
  `propagateUncertainty`) are triaged as drift risks in `docs/architecture/duplicate-symbols.md`;
  none was changed in code.
- **The pre-push gate did not run for the `cd4f0d5` push (2026-09-24).** `core.hooksPath` was found
  set to the absolute `.git\hooks`, which holds only sample hooks. The repo's `prepare` script sets
  `.githooks`. `.git/config` was last written at 14:02:16. At 14:02 a security-guidance plugin review
  created a worktree (`agent-a98a8f4aee09f8ec6`). **The mechanism is unproven:** other repos with
  Claude-created worktrees still read `.githooks`, and Mothership is investigating. The setting is
  restored. The checks that CI does not run passed on `cd4f0d5`: `repo_map` exit 0, and code-docs
  154, equal to the baseline. The stale worktree and its merged branch were removed.
- A **flaky test WAS captured failing** on 2026-09-23 19:50, in the pre-push gate for `e1b7bea`
  (a docs-only commit): `tests/composition/probe/coverage-backfill.test.ts > backend nonzero exit +
  store illegal transition > reports worker stderr on nonzero exit`, `AssertionError: expected 'worker
  timed out after 1000ms' to match /exited 2/` (line 464). The test gives `runBackendWorker` a
  1000 ms budget to spawn `node -e "process.exit(2)"`; the budget includes process start-up, and a bare
  spawn of that command measured 843–4307 ms on the loaded host at the time. It was a wall-clock race by
  design. Whether it is the flaky test seen before is unknown. **Race removed** in the item-1 fix (see
  `CHANGELOG.md`): the test now drives a fake worker with no clock; five real-worker siblings in the
  same race class use a named 30 s hang guard. A real-process test can still lose to a start-up
  longer than that guard.
- **Sprint 0 closure: moot** (2026-09-25). UPT is DONE under Amendment 12, so its wrap checklist no
  longer gates anything. The original note, kept for the record: The Phase 0 curation-cost log said on 2026-09-20 that Sprint
  0 was not closed: `docs-fresh` was red and the wrap checklist was incomplete. `docs-fresh` was
  green on every push checked on 2026-09-22; the wrap checklist has not been re-checked.

### Measured facts about the tree (moved from `CLAUDE.md`; re-measure before quoting)

- **Lines of code (whole repository):** 135,606, from `repo_map` `totalLinesOfCode`, measured
  2026-09-23 at `67caf85`. Not gated; see `docs/architecture/OVERVIEW.md`.
- **Toolchain:** TypeScript `^7.0.2` (verified 2026-09-22). The full suite ran 4,659 tests at
  `cbf2e40` (2026-09-22); it took about 58 s warm when measured on 2026-09-21.
- **Bridge catalog** (re-counted from `BRIDGE_EQUATIONS` and `CATALOG_GRAPH`): 58 bridges, IDs 11–68.
  Status: 22 established, 33 speculative, 3 highly speculative, 0 invalid. The graph has 49 edges.
  16 are AST-less (BE-51, 52, 55…68). 17 have no graph edge (BE-28, 29, 32, 35, 40, 44, 55…65).
  BE-66, BE-67, and BE-68 have edges and no `formalRef`. The 2026-09-21 sentence that said 55 bridges
  and 41 edges is the count from that day.
- **Axes:** `RegimeAttributes` carries six axes (scale, force, information, symmetry, topology,
  statistics). `GATE_AXES` is scale and force; topology, symmetry and statistics are typed and
  wired but ungated, for thin coverage.
- **CLI:** the `upt` CLI (27 data-bearing commands + `help`/`version`).
- **Atlas families:** oscillators 9 models, 5 bridges, 1 rejection; diffusion 8 models, 8 bridges;
  waves 7 models, 7 bridges.
- **Atlas import sites** (measured 2026-09-22): value imports at `bridges/index.ts:40`
  (`deriveRegimeGroups`), `composition/compose.ts:46-47` (`composition-table`, `conventions`) and
  `composition/graph-viz.ts:28` (`derive-evidence`); type-only imports from `atlas/types.ts` at
  `bridges/index.ts:36`, `composition/compose.ts:48`, `composition/edge.ts:24`, `graph-viz.ts:24`
  and `uncertainty.ts:25`.
  `docs:deps` reports 0 circular dependencies.
- **Dependabot PRs against the lockfile problem** described in `MEMORY.md` (Stack): #177–181 are CLOSED, and
  `gh pr list --state open` shows 0 open PRs (checked 2026-09-25).

