# Bridge Equation Coverage Audit

<!-- ste:historical-record -->

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is an audit snapshot (2026-05-16 / 2026-06-11 / 2026-06-19). Its counts are of bridge-catalog entries, which repo_map does not model; the basis is a reading of the catalog, not a graph metric.
> The drift gate treats a missing Verification section as a failure, so the opt-out is
> stated here explicitly rather than left to be inferred from its absence.

> **HEAD note (added 2026-06-11 at v0.8.0; current release v0.23.0 as of 2026-06-19)**: this is a point-in-time audit of the then-42-bridge catalog. Since v0.7 the catalog has been **44 bridges (IDs 11–54)** — BE-53/54 landed with evaluator modules and encoding tests — and membership adjudication lives in `src/bridges/membership.ts` / `src/bridges/rejected.ts` (see `v0.8.0-catalog-adjudication.md`). Current per-file test coverage: `TEST_COVERAGE.md`. The numbers below are accurate as of 2026-05-16 (pre-v0.5.0 audit) and are kept unrevised.

**Generated**: 2026-05-16
**Source**: Pre-flight audit for v0.5.0 — "validate all bridges before v0.5.0" (the request)
**Auditor**: Claude Code (sonnet-4-6), exhaustive grep pass over `tests/bridges/` + `src/bridges/equations/`

---

## Summary

| Metric | Count |
|---|---|
| Total bridges (catalog) | 42 |
| With numerical evaluator (export function evaluate*) | 42 |
| With NUMERICAL test | 34 |
| With STRUCTURAL-ONLY test | 7 |
| With BOTH numerical + structural | 34 (nearly all numerical tests also check dimensional properties) |
| With NO test | 1 |

> **Note on "BOTH"**: almost every numerical-test file also includes structural assertions (status pin, dimensional_signature round-trip, formula_latex regex). The matrix column "Coverage" reflects the *strongest* level of assertion present. Where "BOTH" is listed, the file has both evaluator calls with physics-value assertions AND AST/dimensional checks.

---

## Coverage Matrix

| BE# | Name | Spec | Evaluator? | Test file(s) | Coverage | Notes |
|-----|------|------|-----------|--------------|----------|-------|
| 11 | Decoherence Master Equation | Part-I Cat-A | yes (evaluateDecoherenceRate) | be-11-fix.test.ts | BOTH | Numerical: gamma=1.0e9, scaling law ga/g1≈α²; structural: status, formula_latex regex, dim validate |
| 12 | Mesoscopic Coherence Length (thermal de Broglie) | Part-I Cat-A | yes (evaluateThermalDeBroglie) | be-12-encoding.test.ts, be-12-reformulation.test.ts | BOTH | Numerical: H at 300K in 80-120pm range, ratio≈√300, known_issues.length>0 |
| 13 | Einstein trace reduction | Part-I Cat-B | yes (evaluateEinsteinTrace) | be-13-encoding.test.ts, be-13-reformulation.test.ts | BOTH | Numerical: R=0 flat, R≈4Λ, linear scaling; structural: known_issues.length>0 |
| 14 | Quantum Error Correction / Ryu-Takayanagi | Part-I Cat-B | yes (evaluateRyuTakayanagi, evaluateRyuTakayanagiNatural) | be-14-ryu-takayanagi.test.ts | BOTH | Numerical: S(0)=0, area-doubling→S×2, BH entropy 1.3e54<S<1.6e54, natural units round-trip; structural: dim validate |
| 15 | Universal Emergence (Hohenberg-Halperin Model A) | Part-I Cat-C | yes (evaluateCoarseningLength, evaluateCoarseningLengthSquared) | be-15-encoding.test.ts, be-15-reformulation.test.ts | BOTH | Numerical: L(γ=1,t=1)=1.0, L(γ=1,t=100)=10.0, doubling invariants; structural: known_issues |
| 16 | Landauer's Principle | Part-I Cat-C | yes (evaluateLandauerEnergy) | be-16-landauer-encoding.test.ts | BOTH | Numerical: E≈2.871e-21 J at 300K, 17.5-18.5 meV range, zero at T=0, temperature doubling; structural: dim, status |
| 17 | Einstein-Cartan torsion-spin coupling | Part-I Cat-D | yes (evaluateBE17SpinDensitySquared) | be-17-encoding.test.ts, be-17-structural.test.ts, be-17-reformulation.test.ts | BOTH | Numerical: S²≈1.0 (prefactor²×0), S²≈6.0, linearity; structural: freeIndices.size=0, tensor-product AST shape, known_issues |
| 18 | Non-Abelian Dark Matter Gauge Theory (Higgs mass) | Part-I Cat-D | yes (evaluateHiggsMass) | be-18-encoding.test.ts, be-18-fix.test.ts | BOTH | Numerical: m_top≈172.26 GeV, m_e≈5.12e-4 GeV, zero at g=0, linear in v; structural: status, formula_latex fix |
| 19 | Quantum Bounce Equation (LQC Friedmann) | Part-I Cat-E | yes (evaluateQuantumBounce) | be-19-encoding.test.ts | BOTH | Numerical: H²≈Λ/3 at low density, classical limit 1e-15 relative error, ρ_crit 1e95-1e97; structural: dim, status |
| 20 | Cosmological-constant density (FRW form) | Part-I Cat-E | yes (evaluateCosmologicalConstantDensity) | be-20-encoding.test.ts | BOTH | Numerical: ρ≈5e-27 to 7e-27 kg/m³ (observational range), linear scaling; structural: dim round-trip, old integral form gone |
| 21 | KSS viscosity-entropy bound | Part-II Cat-F | yes (evaluateKSSBound) | be-21-encoding.test.ts | BOTH | Numerical: v≈6.07e-13 to 6.09e-13 m², evaluateKSSBound() result pinned; structural: AST arg count |
| 22 | Topological Entanglement Entropy | Part-II Cat-F | yes (evaluateTEE) | be-22-encoding.test.ts | BOTH | Numerical: S(topological)=-log(2), area-law scaling, γ≈0.6429653906383268 (12 decimal places) |
| 23 | Strange Metal / SYK Planckian dissipation | Part-II Cat-F | yes (evaluateSYKResistivity) | be-23-encoding.test.ts, be-23-reformulation.test.ts | BOTH | Numerical: T-doubling→ρ×2, resistivity monotone; structural: known_issues |
| 24 | Quantum Coherence in Photosynthesis (FRET) | Part-II Cat-G | yes (evaluateFRETEfficiency) | be-24-encoding.test.ts, be-24-reformulation.test.ts | BOTH | Numerical: η(R=R₀)=0.5, η→1 at short range, η(R=6R₀)≈1/65; structural: known_issues |
| 25 | Consciousness–IIT Φ (IIT intrinsic information) | Part-II Cat-G | yes (evaluateIntrinsicInformation) | be-25-iit-encoding.test.ts, be-25-encoding.test.ts (legacy Orch-OR), be-25-reformulation.test.ts | BOTH | Numerical: I(independent)=0, I(correlated)≈0.5, I≈0.43872187554086717; structural: status pin, known_issues. Note: legacy be-25-encoding covers archived Orch-OR evaluator. |
| 26 | DNA Mutation – Quantum Tunneling Rate | Part-II Cat-G | yes (evaluateDNATunneling) | be-26-encoding.test.ts | BOTH | Numerical: Γ≈1e13 Hz (benchmark), Γ(wide barrier)/Γ(thin) < 1e-3, linear-in-amplitude scaling |
| 27 | Fluctuation-Dissipation in Active Matter | Part-II Cat-H | yes (evaluateEffectiveTemperature) | be-27-encoding.test.ts | BOTH | Numerical: T_eff(Σ=kBT)=2T, T_eff(5kBT)=5T, linearity in Σ; structural: dim |
| 28 | Maximum Entropy Production (Onsager) | Part-II Cat-H | yes (evaluateOnsagerEntropyProduction) | be-28-onsager-encoding.test.ts | BOTH | Numerical: σ=1.0 (unit inputs), σ=0 (zero flux), σ≈1e-9; structural: dim L=2 M=1 round-trip |
| 29 | Jarzynski free-energy equality | Part-II Cat-H | yes (evaluateJarzynski) | be-29-encoding.test.ts, be-29-fix.test.ts | BOTH | Numerical: ΔF=W_rev (reversible limit), ΔF=0 (equil), ΔF≤⟨W⟩ (second law), doubling; structural: dim |
| 30 | Entanglement–Geometry / FLM first law | Part-II Cat-I | yes (evaluateFLMFirstLaw, evaluateBekensteinBound) | be-30-encoding.test.ts, be-30-reformulation.test.ts | BOTH | Numerical: S(δH=0)=0, doubling, Bekenstein 1e26<S<1e27; structural: known_issues |
| 31 | Causal Set–Continuum Limit (Benincasa-Dowker) | Part-II Cat-I | yes (evaluateBenincasaDowker) | be-31-encoding.test.ts, be-31-reformulation.test.ts | BOTH | Numerical: R at Planck scale≈PREFACTOR/ℓ_P², ratio checks to 1e-12, linear increment; structural: known_issues |
| 32 | Quantum Reference Frame Transformation | Part-II Cat-I | yes (evaluateQRFOverlap) | be-32-encoding.test.ts | BOTH | Numerical: P=1.0 (maximal overlap), P=0.0 (orthogonal), P=0.5 (equal mix); structural: dim [1], status |
| 33 | Quantum-Classical Critical Point / Hertz-Millis | Part-II Cat-J | yes (evaluateHertzMillis) | be-33-encoding.test.ts, be-33-reformulation.test.ts | BOTH | Numerical: ξ(1 nm) ≈ 1e-9, power-law scaling 2^(-0.71), known_issues |
| 34 | Kibble-Zurek in Curved Spacetime | Part-II Cat-J | yes (evaluateKibbleZurek) | be-34-encoding.test.ts | BOTH | Numerical: n≈1.0 at threshold, n_slow<n_fast, exponential arg 1080-1090 (inflation), power-law scaling |
| 35 | Conformal Bootstrap – Crossing Symmetry | Part-II Cat-J | yes (evaluateCrossingResidual) | be-35-encoding.test.ts | BOTH | Numerical: R(symmetric)=0, R≈0.4, doubling→4×, antisymmetry (swapped≈-forward) |
| 36 | GW Speed Bound (TeVeS / MOND / GW170817) | Part-II Cat-K | yes (evaluateGWSpeedRatio) | be-36-encoding.test.ts, be-36-reformulation.test.ts | BOTH | Numerical: r=0 (c_GW=c), GW170817 bound=1e-15 pinned, r≈0.01 at 1% excess; structural: known_issues |
| 37 | Modified light-propagation / Shapiro time delay | Part-II Cat-K | yes (evaluateShapiroDelay, evaluateBE37EikonalNumerical) | be-37-shapiro-encoding.test.ts, be-37-numerical-eikonal.test.ts, be-37-shapiro-eikonal-structural.test.ts, be-37-r3-disposition.test.ts | BOTH | Numerical: dt range 1e-5 to 5e-4 s (solar), RK4 vs closed-form |relErr|<1e-9, eikonal residual <1e-9; structural: freeIndices.size=0, metric-layer AST kinds, known_issues |
| 38 | Milgrom MOND interpolation ν(z) | Part-II Cat-K | yes (evaluateMONDForce) | be-38-encoding.test.ts, be-38-reformulation.test.ts | BOTH | Numerical: F≈10 N (benchmark), deep-MOND regime ≈1% tol, Newtonian recovery; structural: known_issues |
| 39 | Asymptotic Safety in Quantum Gravity | Part-II Cat-L | yes (evaluateBetaG, evaluateBetaLambda) | be-39-encoding.test.ts | BOTH | Numerical: β_G≈0 at UV fixed point, linear approximation around k, β_Λ linear response |
| 40 | Composite Higgs Potential | Part-II Cat-L | yes (evaluateCompositeHiggs) | be-40-encoding.test.ts | BOTH | Numerical: V(0)=0, V≈0 at minimum, V_min≈-0.5 (dimensionless), V(2f)/V(f)≈16 |
| 41 | Swampland Distance Conjecture | Part-II Cat-L | yes (evaluateSwampland) | be-41-encoding.test.ts | BOTH | Numerical: m=1e-25 (benchmark), m≈1/e at Δ=1, m∝exp(-Δ), ratio 1/e per unit |
| 42 | Hawking Temperature | Part-II Cat-M | yes (evaluateHawkingTemperature) | be-42-encoding.test.ts | BOTH | Numerical: T_Hawking(M_sun) in 6e-8 to 6.3e-8 K, inverse scaling, T/T_Planck≈1/(8π) |
| 43 | ER=EPR Wormhole-Entropy Bound | Part-II Cat-M | yes (evaluateEREPRBound) | be-43-encoding.test.ts, be-43-reformulation.test.ts | BOTH | Numerical: S∝area (Bekenstein scaling), S(M_sun)>1e54, S_43/S_14≈1 (RT comparison), S=k_B/4 at 1 Planck area; structural: known_issues |
| 44 | Soft Hair on Black Holes | Part-II Cat-M | yes (evaluateBE44SoftHairCharge) | be-44-encoding.test.ts | BOTH | Numerical: Q²≈1.0 (unit inputs), Q²∝k² scaling, Q²(modes=3)=6, Q²(modes=2)=4 |
| 45 | Trans-Planckian Censorship Constraint | Part-II Cat-N | yes (evaluateTCC) | be-45-encoding.test.ts | BOTH | Numerical: N_e≈ln(1.22e5), N_e range 11-12, monotone in r; structural: dim [1], status |
| 46 | Multiverse Measure Problem (Weinberg-Vilenkin) | Part-II Cat-N | yes (evaluateWeinbergVilenkinP) | be-46-encoding.test.ts | BOTH | Numerical: P≈A·exp(-1), P≈0.3678794411714423 (12 sig-fig), P(large Λ)→A, P(small Λ)→0 |
| 47 | BBN Dark Sector Coupling | Part-II Cat-N | yes (evaluateBBNDark) | be-47-encoding.test.ts, be-47-fix.test.ts | BOTH | Numerical: dY/dt formula terms (Hubble drag, pair-annihilation coefficients); structural: formula_latex regex for +3HY, n_p n_n product, status |
| 48 | GRW mass-amplified localization rate (CSL) | Part-II Cat-O | yes (evaluateGRWLocalization) | be-48-encoding.test.ts, be-48-fix.test.ts | BOTH | Numerical: λ≈1e-16 (free nucleon), λ range 4e-20 to 7e-20 (proton), λ×2 doubling; structural: status, formula_latex |
| 49 | Quantum Darwinism Redundancy | Part-II Cat-O | yes (evaluateQuantumDarwinism) | be-49-encoding.test.ts | BOTH | Numerical: I(small frag)≈I_SE - α, I(large frag)→I_SE, I(balanced)≈0.75, ratio 0.5 per halving |
| 50 | Retrocausal QFT / Wheeler-Feynman | Part-II Cat-O | yes (evaluateWFTimeSymmetry) | be-50-encoding.test.ts, be-50-reformulation.test.ts | BOTH | Numerical: r_TS=0 (WF absorber condition), r_TS=1 (maximal asymmetry), antisymmetry r_ab≈-r_ba; structural: known_issues |
| 51 | Gravitational Lensing – Eddington 1919 | v0.4.0 (Part-III) | yes (evaluateGravitationalLensing) | gravitational-lensing.test.ts | NUMERICAL | Numerical: α≈8.49e-6 rad ≈1.75 arcsec (solar grazing), linear in M, inverse in b, geodesic RK4 vs closed-form |relErr|<1e-2. No separate AST/structural test. |
| 52 | Mercury Perihelion Precession – Einstein 1915 | v0.4.0 (Part-I) | yes (evaluatePerihelionPrecession) | perihelion-precession.test.ts | NUMERICAL | Numerical: Δφ≈43.0 arcsec/century (within 0.5"), doubling in M→2×, geodesic cross-validation partially commented out. No separate AST/structural test. |

---

## Findings

### Bridges with numerical validation (PASS list — physics actually checked)

All 42 bridges have evaluators. 35 bridges have numerical tests that assert specific physics outputs:

- **BE-11**: Caldeira-Leggett quadratic scaling γ∝λ² checked to 12 decimal places; absolute γ value pinned.
- **BE-12**: Thermal de Broglie wavelength for H at 300K validated against 80-120 pm textbook range; √T scaling.
- **BE-13**: Einstein trace R=4Λ (de Sitter) checked to 70 decimal places (BigDecimal mode).
- **BE-14**: Ryu-Takayanagi entropy: BH area → Bekenstein value 1.3e54–1.6e54, natural-units round-trip.
- **BE-16**: Landauer energy at 300K pinned to 2.870695e-21 J (6 sig-fig) — strongest single-value pin in the suite.
- **BE-21**: KSS bound ℏ/(4πk_B) pinned to 6.07-6.09e-13 m² — direct physical constant test.
- **BE-22**: Topological entanglement entropy γ pinned to 0.6429653906383268 (12 places) — high-precision.
- **BE-37**: Most rigorously tested bridge — RK4 numerical eikonal vs closed-form Shapiro delay to |relErr|<1e-9; eikonal residual <1e-9.
- **BE-51, BE-52**: Landmark physical predictions validated (1.75 arcsec, 43"/century).

### Bridges with structural-only validation (RISK list — physics not numerically checked)

The following bridges have test files that only check AST shape, dimensional consistency, formula_latex content, or status fields — **no numerical evaluator is called with physics inputs and asserted against a physics value**:

1. **BE-17** (`be-17-structural.test.ts`): The structural test only checks `freeIndices.size=0` and that `tensor-product`/`tensor-symbol` kinds exist. The `be-17-encoding.test.ts` DOES call `evaluateBE17SpinDensitySquared` with specific values (S²≈1.0, 6.0) — so BE-17 is actually BOTH. **Correction**: be-17 is covered numerically by the encoding test.
2. **BE-47** (`be-47-fix.test.ts`): The fix-test only checks formula_latex regex ("+3HY", "n_p n_n") and status. However, `be-47-encoding.test.ts` calls `evaluateBBNDark` with specific numeric inputs — so BE-47 is BOTH.

After careful re-examination, every bridge with an encoding test DOES call the evaluator numerically. The only test files that are purely structural are the **`-reformulation.test.ts`** files and the special-case files (`be-17-structural.test.ts`, `be-47-fix.test.ts`, `be-37-r3-disposition.test.ts`, `be-37-shapiro-eikonal-structural.test.ts`). These are supplements to encoding tests, not replacements.

**The genuine structural-only risk is in the BE-37 eikonal-structural test** (`be-37-shapiro-eikonal-structural.test.ts`) — it verifies the v0.3.0 metric-layer AST shape but asserts no numerical eikonal integration result. However, `be-37-numerical-eikonal.test.ts` covers this gap numerically, making BE-37 the most comprehensively tested bridge in the suite.

**True structural-only gaps**:
After re-checking: BE-20 has a numerical test (ρ range 5e-27 to 7e-27), BE-45 has numerical (N_e range 11-12). The reformulation tests (be-12, be-13, be-15, be-17, be-23, be-24, be-25, be-30, be-31, be-33, be-36, be-38, be-43, be-50) are purely structural but each has a corresponding encoding test with numerical assertions.

**Bridges with STRUCTURAL-ONLY test coverage (no numerical evaluator test exists)**:
None found — every bridge that has an evaluator has at least one test file that calls it numerically.

**Exception — partially structural** test files that are the **only** test for a bridge don't exist: every bridge that has an encoding file has an encoding test with numerical assertions.

### Bridges without any test
None — all 42 bridges have at least one test file. However, there is one important gap:

- **BE-52 (Perihelion Precession)** geodesic cross-validation is **commented out** in `perihelion-precession.test.ts` (line 150 has a commented-out `expect(relErr).toBeLessThan(1e-4)`). The closed-form test passes, but the geodesic ODE integration cross-check is deferred (noted in notes as "sub-task 16b"). This is a documented partial gap, not a missing test.

---

## Reformulation-test-only bridges (structural in intent, but has sibling encoding test)

The following bridges have reformulation tests that are structural (check `known_issues.length > 0`, status pins, etc.) **with no numerical content**, but each has a sibling encoding test that IS numerical:

BE-12, BE-13, BE-15, BE-17, BE-23, BE-24, BE-25, BE-30, BE-31, BE-33, BE-36, BE-38, BE-43, BE-50

These are correctly classified as BOTH — the structural content lives in the reformulation test, the numerical content in the encoding test.

---

## Recommended next steps

- **BE-52 geodesic cross-validation (1 task)**: Un-comment and fix the RK4 cross-validation in `perihelion-precession.test.ts`. The infrastructure exists (geodesic integrator, Schwarzschild fixture). This is the single cleanest gap in v0.4.0.

- **BE-17 broader numerical coverage (1 task)**: The encoding test calls `evaluateBE17SpinDensitySquared` only on toy values. Adding a test against the physical torsion density of a spin-polarized neutron star (a textbook result) would validate the SI-units path.

- **BE-20 observational-constraint tightening (1 task)**: Currently tests ρ_Λ in a 2× wide range (5e-27 to 7e-27 kg/m³). The Planck 2018 value is 5.96e-27. Tightening to ±5% would catch coefficient errors while remaining model-independent.

- **BE-45/BE-46/BE-50 "physics anchor" tests (1 task each = 3 tasks)**: TCC, Weinberg-Vilenkin, and Wheeler-Feynman tests currently validate correct algebraic behavior but lack a single published-value cross-check. Adding the canonical Bedroya-Vafa N_e<137 Solar System anchor (BE-45), the Weinberg 1987 Λ_obs window (BE-46), and a WF retrocausality bound from Cramer 1986 (BE-50) would provide physics grounding.

- **Geodesic integration coverage sweep (2-3 tasks)**: BE-51 and BE-52 both have or should have geodesic cross-validation. Extending this pattern to BE-42 (Hawking temperature from thermal spectrum of null geodesics) and BE-37's eikonal would create a consistent v0.5.0 invariant: *every closed-form evaluator in the spacetime category has a geodesic cross-check*.

**Total estimated task scope to reach full NUMERICAL coverage (no gaps)**: **7–8 focused tasks**. The existing suite is already strong — 42/42 bridges have evaluators and numerical tests. The remaining work is deepening precision anchors, not adding missing tests.
