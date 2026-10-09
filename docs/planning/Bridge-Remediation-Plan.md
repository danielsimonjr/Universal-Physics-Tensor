# Bridge Equation Remediation Plan

> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. The gap list is [`Bridge-Gap-Inference.md`](Bridge-Gap-Inference.md). The BE-13 heading below names the equation as this plan called it; the catalog name is the record in `data/bridge-catalog.json`.

> Source: the catalog at commit `c276282` (`src/bridges/index.ts` then) + `docs/specification/Part-I.md`, `Part-II.md` | Audit method: programmatic extract via the compiled catalog, tier classifier applied per the brief, narrative-concern (R4) gate verified by spot-reading `notes` text per equation.

This document is a prioritized work queue for fixing or dispositioning each of
the 40 bridge equations catalogued in the UPT specification. It does **not**
modify the index itself — index updates are a separate PR (see "Suggested
index updates" below).

Honest-claude posture: tier assignments come from explicit fields in the index
plus narrative status text preserved in each `notes` entry. Where the index is
silent but the spec text raises a substantive concern (Tier R4), that is
flagged. Where the spec text raises no concern beyond being labelled
speculative, the entry lands in R5. No severities or fix-paths were invented.

## Summary

| Tier | Definition                                                    | Count | Cumulative effort estimate                            |
|------|---------------------------------------------------------------|-------|-------------------------------------------------------|
| R0   | Fix-blocking — `established` (or std-ext) WITH known issues   | 3     | ~6-12 hr (3×S/M spec-edits) — **all 3 resolved 2026-05-04** |
| R1   | Fix-if-cheap — `speculative` with `spec-edit` fix only        | 0     | **All 7 resolved 2026-05-01** (3 fixed → R5; 4 re-tiered → R2) |
| R2   | Reformulate — `reformulation`/`unknown` fix path              | 0     | **All R2 entries rescued under the Wave P pivot (2026-05-06)**: BE-12, 13, 15, 17, 23, 24, 25, 30, 33, 36, 43, 50 reformulated to canonical literature forms (Caldeira-Leggett, Jacobson, Hohenberg-Halperin, Einstein-Cartan, SYK, Förster, IIT, FLM, Hertz-Millis, TeVeS, Bekenstein-Hawking-on-ER-bridge, Wheeler-Feynman) and re-tiered as `speculative`. The earlier Wave J Tier B (2026-05-05) and Wave L Tier E (2026-05-05) intermediate dispositions promoted some of these R2→R3 (invalid); the Wave P pivot reverted those R3 promotions in favor of canonical-form reformulations where the literature provides one. |
| R3   | Unfixable — recommend marking `invalid` or removing           | 0     | **All Wave-P-era R3 dispositions reversed under the Wave Z arc (2026-05-07 → 2026-05-11)**: BE-16 reformulated to Landauer's principle (Wave Z-E commit `29932bf`), BE-37 reformulated to Shapiro gravitational time delay (Wave Z-F commit `05900f3`). Both were lifted from `status: 'invalid'` to `status: 'speculative'` under canonical literature replacements. Earlier transient invalid promotions (BE-23, 25, 30, 43, 50) were already reverted in the Wave P pivot. **The catalog no longer carries any `invalid` entries.** |
| R4   | Narrative-only concerns — extract structured Known Issues     | 0     | **All 16 R4 entries resolved.** 14 of the 16 were populated with structured `known_issues` arrays during the Wave-J → Wave-Z catalog rollout (each canonical reformulation included its own structured known-issue record). The final two (BE-19, BE-41) were polished in v0.2.0 Task 13 (commit `f808c66`) with structured `known_issues` entries derived from their existing prose. |
| R5   | Healthy / ready to implement                                  | 11    | +3 from R1 fixes (BE-18, BE-29, BE-47) + BE-11 R0 → R5. (BE-40 demoted R5 → R2: dimensionally inhomogeneous; see `Tier-5-Encoding-Triage.md`.) |
| **Total** |                                                          | **40**|                                                       |

The status mix of the index after each wave, and the moves between tiers, are `CHANGELOG.md`; the live split is `NOTES.md`.

**Final invalid count after Wave Z arc: 0.** The catalog is closed at 40 / 40 AST encodings with no entries marked `invalid`. The two surviving Wave P invalid entries (BE-16, BE-37) were reformulated to canonical literature forms (Landauer's principle, Shapiro delay) during Wave Z (commits `29932bf` and `05900f3` respectively, both 2026-05-11). See `Tier-5-Encoding-Triage.md` for the full Wave Z closure record.

## Work order

Equations are grouped by remediation tier. Within each tier, ordering is by
estimated effort (smallest first) so quick wins surface ahead of deep
reformulations. Effort estimates (XS <1hr, S 1-2hr, M 2-4hr, L 4-8hr,
XL = needs research) are heuristic and explicitly rationaled per row.

### Tier R0 — Fix-blocking (3)

These are catalog entries the spec marks `established` yet ships with explicit
`Known issue` markers. Each needs either a spec edit to fix the issue or a
status downgrade to `speculative` for honesty.

- **BE-11 Decoherence Master Equation** (established, **S**) — **Resolved 2026-05-04 (branch `fix/be-11-decoherence-coupling`).**
  - Issue: auxiliary rate `γ_k(T,λ) = γ_0 exp(-λ/λ_thermal)` was exponentially
    *decreasing* in coupling λ; standard decoherence rates *increase* with
    coupling (Caldeira-Leggett: γ ∝ λ²).
  - **Action taken:** auxiliary rate replaced with the Caldeira-Leggett
    weak-coupling form `γ_k(λ) = γ_0 (λ/λ_0)²` (Caldeira-Leggett 1985,
    Phys. Rev. A 31, 1059, §III.B; Breuer & Petruccione 2002, §3.6) in
    `docs/specification/Part-I.md` BE-11 entry, with a `Corrected on
    2026-05-04` block recording the original form and citation. Index entry
    in `src/bridges/index.ts` updated: `formula_latex` now includes the
    corrected rate, `known_issues` cleared, `references` populated with five
    primary sources, `dimensional_signature` set to `[frequency]` (the
    Lindblad equation has units `[T^-1]`). Status remains `established` (the
    Lindblad form was always solid; only the auxiliary rate was a
    transcription error). Equation now sits in **Tier R5** (healthy).
  - Source: Part-I, Category A.

- **BE-23 Strange Metal — Black Hole Duality** (~~established~~ → **speculative**, status downgraded 2026-05-01) — **Partially addressed; reclassified R0 → R2.**
  - Issue: substituting τ_P = ℏ/(k_B T) into √(ℏ/(k_B T τ_P)) gives √1 = 1
    identically — the third term of the resistivity expression collapses to
    constant B.
  - **2026-05-01 update (branch `fix/be-23-strange-metal-transcription`):** the
    original `spec-edit` recommendation in this audit (replace with
    `√(k_B T · τ_P / ℏ)`) is **also algebraically vacuous** under the same
    substitution. Since `τ_P · k_B T = ℏ` is the *definition* of `τ_P`, every
    monomial built solely from those two factors collapses to a pure number.
    A non-vacuous third term must introduce a second independent scale
    (candidates: τ_el, SYK J, E_F, MSS Lyapunov bound λ_L = 2π k_B T/ℏ).
    Selecting among these is **not a transcription fix** — it is a research
    decision requiring strange-metal/holography expert input.
  - **Action taken in branch:** status downgraded `established` → `speculative`
    in `src/bridges/index.ts`; original vacuous form preserved verbatim in
    `Part-II.md` with a `Known issue (preserved)` block; `known_issues[0]`
    severity changed `other` → `self-refuting`, fixable changed
    `spec-edit` → `reformulation`. Equation now sits in **Tier R2**.
  - Source: Part-II, Category F.

- **BE-48 Objective Collapse Equation (GRW extension)** (established, **S**) — **RESOLVED 2026-05-04**
  - Original issue: localization operator `L_x = exp[-(r-x)² / (2σ²)]` is
    dimensionless as written; standard GRW carries a `(πσ²)^{-3/4}` prefactor
    so the master equation closes dimensionally and λ has units [1/time].
  - Fix path taken (`spec-edit`): added the canonical 3D GRW prefactor
    `(πσ²)^{-3/4}` to `L_x` in both `docs/specification/Part-II.md` and
    `src/bridges/index.ts` (`formula_latex`). Also bumped the rate from the
    unsourced `1e-17 s^-1` to the canonical GRW `1e-16 s^-1`. Status remains
    `established` (canonical typesetting correction, not a reformulation).
    `dimensional_signature` set to `[time^-1]`. Regression test in
    `tests/bridges/be-48-fix.test.ts`.
  - Citations: Ghirardi-Rimini-Weber 1986 Phys. Rev. D 34:470 (original);
    Bassi-Ghirardi 2003 Phys. Rep. 379:257 review (arXiv:quant-ph/0302164).
  - Source: Part-II, Category O.

### Tier R3 — Unfixable, recommend mark invalid (13)

> **Updated 2026-05-06 (Wave N Tier C, then Wave P-A/P-B/P-C reformulations):**
> Seven R3 dispositions originally applied in Wave N: BE-12 (Mesoscopic Coherence
> Length, Wave N Tier C1), BE-13 (Landauer-Wheeler, Wave N Tier C2), BE-15
> (Universal Emergence, Wave N Tier C3), BE-17 (EM-Gravitational Torsion,
> Wave N Tier C4), BE-24 (Photosynthesis Coherence, Wave N Tier C5), BE-33 (QC
> Critical Point Mapping, Wave N Tier C6), BE-36 (Hybrid linear blend MOND,
> Wave N Tier C7). All seven subsequently reformulated under the Wave P pivot:
> **BE-33 → speculative** (Wave P-A R-A2, canonical Hertz-Millis 3D Heisenberg);
> **BE-12 → speculative** (Wave P-B R-B1, canonical Caldeira-Leggett dephasing
> length); **BE-13 → speculative** (Wave P-B R-B2, Jacobson 1995 thermodynamic
> derivation); **BE-17 → speculative** (Wave P-B R-B3, canonical Einstein-Cartan
> torsion-spin coupling); **BE-24 → speculative** (Wave P-C R-C2, canonical
> Förster FRET); **BE-36 → speculative** (Wave P-C R-C3, canonical Bekenstein
> 2004 TeVeS relativistic MOND); **BE-15 → speculative** (Wave P-D R-D1,
> canonical Hohenberg-Halperin Model A gradient flow). Reformulation pin
> tests at `tests/bridges/be-{12,13,15,17,24,33,36}-reformulation.test.ts`.

> **Updated 2026-05-05/06 (Wave J Tier B + Wave P-A/P-C/P-D):** Three additional
> R3 dispositions applied since the 2026-05-01 BE-16 record: BE-37 (VSL,
> applied 2026-05-05 per `BE-37-VSL-Disposition-Brief.md`), BE-23 (Strange
> Metal, Wave J Tier B1), and BE-30 (ER=EPR, Wave J Tier B2). Subsequently
> reformulated under the Wave P pivot: **BE-30 → speculative** (Wave P-A R-A1,
> Faulkner-Lewkowycz-Maldacena δS_EE = ⟨δH_R⟩); **BE-23 → speculative** (Wave
> P-C R-C1, SYK / Planckian-dissipation linear-in-T resistivity); **BE-25 →
> speculative** (Wave P-D R-D2, canonical IIT Φ_max integrated information —
> dropping the Tegmark-falsified Penrose-Hameroff Orch-OR form for the
> substrate-agnostic IIT framework). BE-37 remains R3-invalid (Ellis-Uzan
> operational-meaninglessness). The original pattern of these four
> dispositions: (i) the displayed formula is mathematically self-refuting
> or operationally ill-formed; (ii) the proposed-fix path requires a research
> commitment, not a transcription edit; (iii) the canonical-replacement-equation
> framing would be a *new* BE rather than a fix of the present transcription.
> Status pin tests prevent silent re-promotion:
> `tests/bridges/be-{16,37}-r3-disposition.test.ts` (still R3-invalid);
> `tests/bridges/be-{23,25,30}-reformulation.test.ts` (Wave P reformulations).

- **BE-12 Mesoscopic Coherence Length** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Caldeira-Leggett dephasing length)**, 2026-05-06, Wave P-B R-B1)
  - Reformulated 2026-05-06 (Wave P-B R-B1, per Math/Researcher iter-5
    strategic pivot): replaced the ill-defined `ξ_coh(T,N) = ξ_0 / √(1 +
    N/N_c + (T/T_c)^ν)` ansatz (three undefined quantities) with the
    canonical Caldeira-Leggett dephasing length: `ξ_dephasing(T) = ℏ /
    √(2 m k_B T γ)`, dimensionally consistent with the thermal de
    Broglie wavelength `λ_T = h/√(2π m k_B T)`. The N-dependence is
    dropped (not in the canonical single-particle form); many-body
    extension is a future-work BE.
  - References: Caldeira-Leggett 1981 PRL 46:211; Caldeira-Leggett 1983
    Physica A 121:587; Wikipedia "Thermal de Broglie wavelength"
    (WebFetch-confirmed); Breuer-Petruccione 2002 §3.6 + §4.5.
  - Honest-claude flag: WebFetch on arXiv:cond-mat/0503100 (the
    candidate Hänggi review) returned a different paper (photonic Fano
    resonators); commitment follows the Caldeira-Leggett textbook
    convention.
  - Reformulation pin: `tests/bridges/be-12-reformulation.test.ts`.

- **BE-13 Information-Geometry Equation (Jacobson 1995 thermodynamic derivation)** (~~highly-speculative~~ → ~~invalid~~ → **speculative (Einstein equations + Jacobson framing)**, 2026-05-06, Wave P-B R-B2)
  - Reformulated 2026-05-06 (Wave P-B R-B2, per Math/Researcher iter-5
    strategic pivot): replaced the Landauer-mis-attributed
    `R_μν − (1/2) R g_μν = (8πG/c⁴)[T_μν^matter + k_B T ln(2) I_μν]`
    form with the canonical Jacobson 1995 thermodynamic-derivation
    form: standard Einstein equations `R_μν − (1/2) R g_μν + Λ g_μν =
    (8πG/c⁴) T_μν`, interpreted as a macroscopic equation of state
    derived from `δQ = T dS` on local Rindler horizons. The spurious
    `k_B T ln(2) I_μν` term is dropped (Jacobson has no such term).
  - References: Jacobson 1995 PRL 75:1260 (arXiv:gr-qc/9504004,
    WebFetch-confirmed abstract); Einstein 1915; Bekenstein 1973
    PRD 7:2333; Hawking 1975 CMP 43:199. Alternative non-equivalent
    paths (Verlinde 2011, Padmanabhan 2010) cited as comparison
    references.
  - Honest-claude flag: WebFetch returned the Jacobson abstract only,
    not the full tensor-equation derivation; commitment to Λ inclusion
    follows the modern convention (Λ is the integration-constant
    freedom in Jacobson's derivation).
  - Reformulation pin: `tests/bridges/be-13-reformulation.test.ts`.

- **BE-15 Universal Emergence Equation** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Hohenberg-Halperin Model A gradient flow)**, 2026-05-06, Wave P-D R-D1)
  - Reformulated 2026-05-06 (Wave P-D R-D1, per Math/Researcher iter-5
    strategic pivot): replaced the conflated `∂O_macro/∂t = F[{O_micro}] +
    η∇²O_macro + ζ(∂²S/∂O²)` form (LHS observable rate; RHS RG-flow
    functional evolving along scale `k`, not time `t`) with the canonical
    Hohenberg-Halperin Model A purely-dissipative gradient flow
    `∂φ/∂t = -Γ δH/δφ + ζ` with FDT noise correlator `⟨ζζ'⟩ = 2 Γ k_B T δ δ`
    and Landau-Ginzburg Hamiltonian `H = ∫d³x [½(∇φ)² + V(φ)]`. Selecting
    Model A pins the order parameter as **non-conserved**; conserved-density
    (Model B), order-parameter-coupled-to-density (Model C), and fluid
    (Model H) variants each warrant a distinct BE entry.
  - References: Hohenberg-Halperin 1977 *Rev. Mod. Phys.* 49:435 (canonical
    Model A/B/C/D/E/F/G/H/J classification); Chaikin-Lubensky 1995 *Principles
    of Condensed Matter Physics* Ch. 8; Goldenfeld 1992 *Lectures on Phase
    Transitions and the Renormalization Group*; Stanley 1971. Wetterich 1993
    and Mori-Zwanzig retained as alternative-path references.
  - Honest-claude flag: WebFetch on the Hohenberg-Halperin RMP itself
    returned 403 (paywall); WebFetch on Wikipedia "Critical phenomena"
    confirmed only the Hohenberg-Halperin nomenclature with one numerical
    Model-H exponent example; explicit Model A Langevin form and FDT noise
    correlator follow standard textbook references.
  - Reformulation pin: `tests/bridges/be-15-reformulation.test.ts`.

- **BE-17 Einstein-Cartan torsion-spin coupling** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Einstein-Cartan, EM-source claim dropped)**, 2026-05-06, Wave P-B R-B3)
  - Reformulated 2026-05-06 (Wave P-B R-B3, per Math/Researcher iter-5
    strategic pivot): replaced the conflated R_μν^λρ = R̊_μν^λρ +
    K_μν^λρ + α(F_μν F^λρ − ...) form with the canonical Einstein-
    Cartan field equations: standard Einstein equation R_μν − (1/2) R
    g_μν + Λ g_μν = (8πG/c⁴) T_μν together with the algebraic
    torsion-spin coupling T^λ_μν = (8πG/c⁴) S^λ_μν, where T^λ_μν is
    the canonical rank-3 torsion tensor and S^λ_μν is the spin
    angular momentum density tensor. **The "EM-Gravitational
    unification via torsion" claim is dropped** — EC torsion is
    sourced by spin, NOT by EM fields. Recovering an EM-gravity
    bridge would require a separate framework (Kaluza-Klein, non-
    minimal F²·R coupling), each warranting its own BE entry.
  - References: Cartan 1922; Hehl-vonderHeyde-Kerlick-Nester 1976
    *Rev. Mod. Phys.* 48:393 (canonical EC review); Trautman 2006
    arXiv:gr-qc/0606062 (WebFetch-confirmed abstract); Shapiro 2002
    *Phys. Rep.* 357:113.
  - Honest-claude flag: WebFetch returned the Trautman 2006 abstract
    only, not the full tensor-equation derivation; commitment to the
    rank-3 T^λ_μν / S^λ_μν form follows the canonical Hehl et al. 1976
    RMP convention.
  - Reformulation pin: `tests/bridges/be-17-reformulation.test.ts`.

- **BE-24 Photosynthesis Coherence Efficiency (Förster FRET)** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Förster FRET)**, 2026-05-06, Wave P-C R-C2)
  - Reformulated 2026-05-06 (Wave P-C R-C2, per Math/Researcher iter-5
    strategic pivot): replaced the bound-violating multiplicative
    `η_classical(1 + κ exp(-t/τ_coh) |⟨ψ_d|ψ_a⟩|²)` form (admits η > 1)
    with the canonical Förster (1948) FRET formulas:
    `k_FRET = (1/τ_D)(R_0/R)⁶` and `η = R_0⁶/(R_0⁶ + R⁶) = 1/(1 +
    (R/R_0)⁶) ∈ [0,1]` by construction, where R is the donor-acceptor
    distance, R_0 is the Förster radius (2-10 nm), and τ_D is the
    donor radiative lifetime. The "quantum enhancement factor" κ is
    dropped — no canonical photosynthesis-FRET literature uses a
    multiplicative coherent-enhancement correction; if a coherent-
    transport model is needed in future, HEOM (Ishizaki-Fleming 2009)
    or Lindblad GKSL (Mohseni-Rebentrost-Lloyd-Aspuru-Guzik 2008) are
    retained as alternative-path references.
  - References: Förster 1948 *Ann. Phys. (Leipzig)* 437:55 (original);
    Lakowicz 2006 *Principles of Fluorescence Spectroscopy* 3rd ed.
    Ch. 13 (textbook); Wikipedia FRET (WebFetch-confirmed canonical
    formulas); Cao 2020 *Sci. Adv.* 6:eaaz4888 (vibrational-reassignment
    consensus); Engel 2007 *Nature* 446:782; Duan 2017 PNAS 114:8493;
    Thyrhaug 2018 *Nat. Chem.* 10:780; Ishizaki-Fleming 2009 JCP
    130:234111 (HEOM alternative); MRLA 2008 JCP 129:174106 (Lindblad/
    ENAQT alternative).
  - Honest-claude flag: WebFetch on the Wikipedia FRET article
    confirmed `k_ET = (R_0/r)⁶/τ_D`, `R_0⁶ ∝ κ² Q_D J / n⁴`, and
    `E = 1/(1 + (r/R_0)⁶)`. The Cao 2020 contested-coherence consensus
    is documented from the prior R3-disposition record without a
    separate WebFetch.
  - Reformulation pin: `tests/bridges/be-24-reformulation.test.ts`.

- **BE-33 Quantum-Classical Critical Point Mapping** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Hertz-Millis, 3D Heisenberg)**, 2026-05-06, Wave P-A R-A2)
  - Reformulated 2026-05-06 (Wave P-A R-A2, per Math/Researcher iter-5
    strategic pivot): replaced the broken `ξ_quantum(T) = ξ_classical /
    √(1 + (E_0/k_B T)²)` ansatz with the canonical Hertz-Millis scaling
    `ξ ~ T^{-ν/z}`, pinned to **3D Heisenberg universality class (z=1,
    ν≈0.71)** as the canonical reference case. Alternative classes
    (Ising / XY / fermionic HMM) deferred to future bridge expansions.
  - References: Hertz 1976 PRB 14:1165, Millis 1993 PRB 48:7183,
    Sondhi-Girvin-Carini-Shahar 1997 RMP 69:315, Sachdev 2011 *Quantum
    Phase Transitions* 2nd ed. Ch. 11.
  - Reformulation pin: `tests/bridges/be-33-reformulation.test.ts`.

- **BE-36 MOND — Dark Matter Interpolation (TeVeS relativistic MOND)** (~~speculative~~ → ~~invalid~~ → **speculative (canonical Bekenstein 2004 TeVeS)**, 2026-05-06, Wave P-C R-C3)
  - Reformulated 2026-05-06 (Wave P-C R-C3, per Math/Researcher iter-5
    strategic pivot): replaced the bespoke hybrid linear blend
    `F = F_N μ(a/a_0) + F_DM (1 − μ(a/a_0))` (not in any published MOND
    literature) with the canonical Bekenstein 2004 TeVeS (Tensor-
    Vector-Scalar gravity) relativistic completion of MOND: action
    `S = S_g + S_φ + S_A + S_matter` with three dynamical fields
    (metric, scalar, timelike vector with `A^μ A_μ = -1`). The non-
    relativistic weak-field limit recovers
    `F_eff = F_N · μ̃^{-1}(F_N/(F_N + a_0))`. The duplicate-of-BE-38
    concern that drove the prior R3 disposition is resolved: BE-38
    covers the **non-relativistic Milgrom μ(x) = x/√(1+x²)** form;
    BE-36 covers the **relativistic completion** (different physical
    content, complementary not duplicative). dependencies: [38].
  - **Known issue documented:** GW170817 graviton-speed bound
    `|c_g − c|/c ≲ 10⁻¹⁵` (Abbott 2017 *ApJ Lett.* 848:L13; Boran
    et al. 2018 *Phys. Rev. D* 97:041501, arXiv:1710.06168) strongly
    constrains original TeVeS variants. Successor candidate:
    Skordis-Złośnik 2021 *Phys. Rev. Lett.* 127:161302
    (arXiv:2007.00082). Marked as severity `other` /
    fixable `reformulation` for future-work refinement.
  - References: Bekenstein 2004 PRD 70:083509 (arXiv:astro-ph/0403694,
    WebFetch-confirmed abstract); Famaey-McGaugh 2012 *Living Rev.
    Relativ.* 15:10 (arXiv:1112.3960; TeVeS-included MOND review);
    Skordis 2009 CQG 26:143001 (TeVeS review); Abbott 2017 ApJ Lett.
    848:L13 (GW170817); Boran et al. 2018 PRD 97:041501; Skordis-
    Złośnik 2021 PRL 127:161302 (successor).
  - Honest-claude flag: WebFetch on arXiv:astro-ph/0403694 returned
    only abstract content (TeVeS as relativistic MOND completion,
    Newtonian + MOND limits); the explicit action terms and physical-
    metric coupling follow standard TeVeS-review references (Skordis
    2009; Famaey-McGaugh 2012). The GW170817 constraint is sourced
    from review-level information.
  - Reformulation pin: `tests/bridges/be-36-reformulation.test.ts`.

- **BE-23 Strange Metal — Black Hole Duality (SYK Planckian dissipation)** (~~speculative~~ → ~~invalid~~ → **speculative (canonical SYK / Planckian-dissipation linear-in-T)**, 2026-05-06, Wave P-C R-C1)
  - Reformulated 2026-05-06 (Wave P-C R-C1, per Math/Researcher iter-5
    strategic pivot): replaced the algebraically-vacuous form
    `ρ(T) = ρ_0 + AT + B √(ℏ/(k_B T τ_P))` (third term collapses to
    `B · 1` under the definitional identity `τ_P · k_B T = ℏ`) with the
    canonical Planckian-dissipation linear-in-T resistivity
    `ρ(T) = ρ_0 + (k_B T / ℏ) · (1/(n_e e²)) · α_SYK`, where the SYK
    relaxation rate τ ~ ℏ/(k_B T) sets the slope and α_SYK is a
    dimensionless O(1) SYK-q-dependent coefficient. The "duality"
    framing connects to Maldacena-Stanford 2016 emergent SL(2,R)
    conformal symmetry in SYK and to Hartnoll-Hofman 2010 holographic
    strange metals.
  - References: Sachdev-Ye 1993 PRL 70:3339; Kitaev 2015 KITP talks;
    Maldacena-Stanford 2016 PRD 94:106002 (arXiv:1604.07818,
    WebFetch-confirmed abstract); Hartnoll 2015 *Nature Phys.* 11:54;
    Hartnoll-Hofman 2010 PRD 81:086004 (arXiv:0912.0008); MSS 2016
    JHEP 1608:106 (arXiv:1503.01409, chaos bound); Bruin 2013 Science
    339:804; Legros 2019 *Nature Phys.* 15:142.
  - Honest-claude flag: WebFetch on arXiv:1604.07818 returned
    abstract-only content (emergent SL(2,R) conformal symmetry); the
    explicit Green's function `G(τ) ∝ |τ|^{-2/q}` and the resistivity
    prefactor follow standard SYK textbook references. The α_SYK
    bundling preserves the bridge framing without committing to a
    specific q-value (q=4 most studied).
  - Reformulation pin: `tests/bridges/be-23-reformulation.test.ts`.

- **BE-30 Entanglement-Geometry Equation (ER=EPR generalized)** (~~highly-speculative~~ → **invalid**, 2026-05-05, Wave J Tier B2)
  - Spec quote (verbatim from Known Issue): four orthogonal defects — (a)
    `Tr_j(ρ_{ij} log ρ_{ij})` is a scalar so `⟨x|...|x⟩` is undefined; (b) LHS
    rank-2 vs RHS scalar mismatch; (c) `|x⟩` non-normalizable; (d) κ ~ ℓ_P²
    gives κ·S units of [L]² but δg should be dimensionless.
  - Disposition rationale (per Math M-C5 + Phys C5 iter-1, re-flagged iter-2):
    no consistent reading. Canonical replacement is the Faulkner-Lewkowycz-
    Maldacena 2013 (arXiv:1307.2892) linear-response formula `δS_EE = ⟨δH_R⟩`,
    which is a *different* equation, not a fix of the current transcription.
  - Status pin: `tests/bridges/be-30-r3-disposition.test.ts`.

### Tier R3 — Original record (1, since lifted)

> **Disposition decision (2026-05-01):** Option 1 originally selected — mark invalid.
> Rationale at the time: keeps the record visible, flags the problem, preserves
> the option to reformulate later if a clean S vs. S_vN distinction emerges.
> Implemented on branch `chore/bridge-index-followups`: added `'invalid'` to
> the `BridgeEquationStatus` type union; flipped BE-16 `status: 'speculative' →
> 'invalid'`; added regression test in `tests/bridges-index.test.ts` pinning
> the disposition so a future contributor cannot silently re-promote it.
>
> **Lifted 2026-05-11 (Wave Z-E, commit `29932bf`):** the canonical reformulation
> path *was* found — Landauer's principle (`E_min = k_B T ln 2` per erased bit;
> Landauer 1961 IBM J. Res. Dev. 5:183; Bennett 1982 Int. J. Theor. Phys. 21:905).
> The bridge was renamed to "Information-Thermodynamics Bridge (Landauer's
> principle)" and re-statused `invalid` → `speculative` (canonical formula;
> the cross-categorical "information ↔ thermodynamics" bridge framing remains
> the speculative element). The original Tr(ρ log ρ) form is preserved in the
> bridge module's docstring as historical record. Status pin tests in
> `tests/bridges/be-16-encoding.test.ts` prevent silent re-promotion to
> `established`. Cross-validated by OpenAI o3 and Gemini Pro independently.

- **BE-16 Complexity-Entropy Production Relation** → **Information-Thermodynamics Bridge (Landauer's principle)** (~~speculative~~ → ~~invalid~~ → **speculative**, 2026-05-11, Wave Z-E)
  - Spec/index quote (verbatim from `notes` + `known_issues`):
    > "**Additional Second-Law problem:** combining `I = Tr(ρ log ρ) = -S_vN`
    > with `dS/dt = k_B · C(ρ) · dI/dt` gives `dS/dt = -k_B · C(ρ) · dS_vN/dt`.
    > If S and S_vN are taken to be the same entropy, this forces
    > `dS/dt (1 + k_B C(ρ)) = 0`, i.e., `dS/dt = 0` for any `C(ρ) > -1/k_B`
    > — the equation algebraically forbids entropy change, violating the
    > Second Law. The formula is therefore not merely imprecise; it is
    > self-refuting unless S and S_vN are distinct quantities (which must
    > then be defined separately)."
  - Three known issues are stamped `unfixable-must-mark-invalid`:
    - `self-refuting` — the algebra above.
    - `sign` — `I := Tr(ρ log ρ)` is *negative* von Neumann entropy; sign
      convention in the equation as written should be checked.
    - `undefined-quantity` — circuit complexity `C(ρ)` is not independently
      defined; absent an operational definition (e.g., gate count in a
      universal gate set) the equation degenerates into a definition of
      complexity rather than a falsifiable physical relation.
  - **Owner-decision options:**
    1. **Add `'invalid'` to `BridgeEquationStatus` and mark BE-16 invalid.**
       Cheapest. Preserves traceability — readers can see why something was
       removed and the algebra that refuted it.
    2. **Remove BE-16 entirely from the spec.** Cleaner catalog but loses the
       cautionary value.
    3. **Reformulate.** Requires (a) introducing a distinct symbol for
       entropy vs. von Neumann entropy in two coupled equations, and
       (b) supplying an operational `C(ρ)` definition that monotonicity-bounds
       the result. This is a research project, not a spec edit — XL effort
       and may not converge to a physically defensible form.
  - **Tier-3 author has not pre-decided.** All three options are physically
    defensible given the spec text. Daniel decides.
  - Honest-claude qualifier: the algebraic argument as written assumes
    `S = S_vN` (i.e., that "entropy" in `dS/dt` and "von Neumann entropy" are
    the same quantity). The argument is correct *under that assumption*. A
    reformulation path that explicitly distinguishes thermodynamic S (e.g.,
    coarse-grained Gibbs) from S_vN (microscopic) is mathematically
    consistent — but the spec as currently written does not make that
    distinction, so the "self-refuting" verdict is appropriate for the
    equation *as written*.

### Tier R1 — Fix-if-cheap

> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. Single
> batch addressed all 7 originally-R1 entries: 3 received clean spec-edit
> fixes and moved to R5; **4 were re-tiered R1 → R2** after the fix loop
> revealed the audit's `spec-edit` classification was optimistic for those
> entries. **STOP-style flag for audit accuracy**: 4 of 7 R1 entries
> systematically over-promoted reformulation work as transcription fixes;
> the audit's R1/R2 boundary should be revisited before further batches.
> Per-entry resolutions:

- **BE-12 Mesoscopic Coherence Length Equation** — **R1 → R2** (preserved).
  No literature interpolation of this form exists; identifying
  `ω_decoherence` with `ω_c` from BE-11 or motivating the cube exponent
  requires inventing physics, not citing it. See commit `8b3f894`.
- **BE-17 Electromagnetic-Gravitational Unification via Torsion** — **R1 → R2**
  (preserved). Three coupled issues — 4-vs-2-index Maxwell mismatch,
  `l_EM` not-a-length, rank-4 vs canonical rank-3 contorsion — each requires
  a structural rewrite, not a typo fix. See commit `cec784e`.
- **BE-18 Non-Abelian Dark Matter Gauge Theory** — **R1 → R5** (FIXED).
  Added missing `|D_μ Φ|²` kinetic term; flipped `+V → −V` to canonical
  L = T − V. Cited Peskin-Schroeder §20.1. Status remains `speculative`
  (form is canonical; the dark-sector physics conjecture is what is
  speculative). See commit `7a5bb9c`.
- **BE-29 Jarzynski Equality Extension to Gravity** — **R1 → R5** (FIXED).
  Replaced ill-defined `g_{μν} dT^{μν}` with the canonical Hilbert action
  variation `T^{μν} δg_{μν} √(−g) d⁴x`; corrected prefactor to
  `1/(2c⁴)` per the standard `T^{μν}` definition. Cited MTW §21.3, Wald
  §E.1. Status remains `speculative` (curved-spacetime Jarzynski
  conjecture is the unverified content). See commit `542d2f4`.
- **BE-31 Causal Set — Continuum Limit** — **R1 → R2** (preserved).
  Audit's own recommendation ("replaced with their published formula") is
  reformulation language. The `V^{2/4}→V^{1/2}` typo *is* a clean
  spec-edit, but cannot ship in isolation because the structurally
  different `(ρ²ℓ_P⁴)^{1/4}` Ricci-correction term (vs. Benincasa-Dowker's
  count-difference formula) needs a structural rewrite. See commit `80a45aa`.
- **BE-37 Variable Speed of Light Cosmology** → **Shapiro gravitational time delay** —
  **R2 → R3 (INVALID), 2026-05-05; LIFTED to speculative, 2026-05-11 (Wave Z-F,
  commit `05900f3`).** The Ellis-Uzan 2005 critique remains correct for the
  *original* VSL ansatz, but the Wave Z arc found that the bridge framing
  ("variable light propagation as a probe of spacetime structure") admits a
  fully canonical, operationally well-defined reformulation: the Shapiro
  gravitational time delay (`Δt = (2GM/c³) ln(...)`; Shapiro 1964 PRL 13:789).
  The bridge was renamed to "Modified light-propagation: Shapiro gravitational
  time delay" and re-statused `invalid` → `speculative`. The original VSL
  ansatz is preserved in the bridge module's docstring as historical record.
  Status pin tests in `tests/bridges/be-37-encoding.test.ts` prevent silent
  re-promotion to `established`. Cross-validated by OpenAI o3 and Gemini Pro
  independently. See also `docs/planning/BE-37-VSL-Disposition-Brief.md` for
  the (now superseded) invalid-disposition reasoning.
- **BE-47 Big Bang Nucleosynthesis — Dark Sector Coupling** — **R1 → R5**
  (FIXED). Added Hubble drag `+3HY` on LHS; replaced single-species
  `n_b²` with species-correct product `n_p n_n` for the canonical
  `p+n→d+γ` two-body reaction. Cited Kolb-Turner §5.2, Steigman 2007,
  Pitrou-Coc-Uzan-Vangioni 2018. Status remains `speculative` (the
  dark-sector coupling extension is the unverified content). See commit
  `bfaac89`.

**Aggregate**: 3 fixed (R1→R5), 4 preserved (R1→R2). Suite grew 126 → 172
passing tests across 7 atomic commits on branch `fix/r1-batch-spec-edits`.

### Tier R2 — Reformulate

> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. Per-bridge structured
> gap-records added to `src/bridges/index.ts` notes, `Part-{I,II}.md`
> "R2 reformulation gap" blocks, and `tests/bridges/be-XX-r2-spec.test.ts`
> regressions. No bridge was promoted to R5 or invalidated to R3 — all
> nine require physics judgment from a domain expert. Originally 5 + 4
> from R1 re-tier on 2026-05-01.
>
> The "domain-expert question" produced for each bridge is the most
> valuable artifact for collaboration; consolidated below.

#### Documented R2 (gap-specified)

| BE | Name | Status | Domain-expert question |
|----|------|--------|------------------------|
| 12 | Mesoscopic Coherence Length | speculative | Which microscopic length should `ξ_0` be (thermal de Broglie / BEC healing / Caldeira-Leggett cutoff), and is `ω_decoherence` = `ω_c` of BE-11 or a distinct decoherence-onset scale? |
| 13 | Landauer-Wheeler Information-Geometry | highly-speculative | Should the bridge be reformulated via Jacobson's thermodynamic derivation, Verlinde's entropic-gravity ansatz, or a from-scratch information-stress-energy tensor with new operational definition? Three non-equivalent paths. |
| 15 | Universal Emergence | speculative | Should the equation be replaced with Hohenberg-Halperin model A/B/C gradient flow, Wetterich exact RG, or Mori-Zwanzig projection? Each yields a different operational equation. |
| 17 | EM-Gravitational Torsion | speculative | What is the correct rank-4 EM RHS (antisymmetrized δ-product Maxwell vs. direct F_{μν}F^{λρ}), which physical length should `l_EM` be (r_e / λ_C / l_P), and how does the rank-3 contorsion couple? |
| 24 | Photosynthesis Coherence | speculative | Should photosynthetic-coherence enhancement be modeled via FRET, HEOM/Redfield, or Lindblad master equation, given Cao et al. 2020 attribute observed FMO oscillations to vibrational rather than electronic coherence? |
| 31 | Causal Set Continuum | speculative | Replace with Benincasa-Dowker count-difference Ricci scalar `R(p) = (4/√6) ℓ_P^{-2} [1 - (N_0 - 9N_1 + 16N_2 - 8N_3)/⟨n(p)⟩]` in d=4; verify constants and dimension-specific adjustment. |
| 33 | Quantum-Classical Critical Point | speculative | Replace with Hertz-Millis canonical scaling `ξ ~ T^{-ν/z}`, choose target universality class (3D Ising / XY / Heisenberg / fermionic Hertz-Millis-Moriya), decide z=1 vs. general-z. |
| 37 | Variable Speed of Light Cosmology | ~~speculative~~ → **invalid** (R3 disposition 2026-05-05) | ~~Pick one of three frameworks~~ → R3-applied: Ellis-Uzan critique survives all three frameworks; no defensible reformulation. See `docs/planning/BE-37-VSL-Disposition-Brief.md`. |
| 38 | Entropic Gravity Correction | speculative | Replace with canonical MOND (Milgrom 1983, recovers √(F_N a_0) by construction), Verlinde 2016 mass-correction (arXiv:1611.02269), or TeVeS relativistic MOND (Bekenstein 2004)? Cross-check with BE-36 (shared a_0). |
| 40 | Composite Higgs Potential | established | `V(h)` mixes `[energy²]` and `[energy⁴]` terms as written — dimensionally inhomogeneous. Requires a homogeneous reformulation (postulate sin/cos dimensionless and absorb hidden `f²` powers into α/β, or introduce explicit `f²` factors). See `Tier-5-Encoding-Triage.md` `no-r2-gap` note. |

**Reclassifications:** none auto-applied. Two flagged for owner attention:

- **BE-37 (VSL)** — **R3 APPLIED 2026-05-05.** Daniel accepted the
  Wave-2 disposition brief recommendation (R3 mark-invalid, confidence 60).
  Ellis-Uzan 2005 critique (operational meaninglessness of bare c(t))
  combined with non-equivalence of the three canonical VSL frameworks
  blocks every reformulation path. Status: `invalid`. Brief at
  `docs/planning/BE-37-VSL-Disposition-Brief.md`.
- All other 8 R2 entries have at least one literature-cited reformulation
  path that is physically defensible; preserved as R2.

### Tier R4 — Narrative-only concerns, needs Known Issue extraction

> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. When this triage was first written
> (2026-05-04), 16 bridges carried prose-only concerns in `notes` with empty
> `known_issues: []` arrays. By the time Task 13 of v0.2.0 (2026-05-12,
> commit `f808c66`) ran a fresh audit, only **2 of the 16** still needed work:
> **BE-19** (Quantum Bounce — `ρ_crit` deviation from canonical LQC) and **BE-41**
> (Swampland Distance Conjecture — active-research caveats). The other 14 had
> already been polished to structured `known_issues` arrays during the Wave J →
> Wave Z catalog rollout: each canonical reformulation (BE-23, 24, 25, 30, 33,
> 36, 43, 50, etc.) shipped its own structured known-issue record as part of
> the reformulation commit. Task 13 closed the remaining two with the same
> structured-record idiom.

The originally-listed 16 entries are preserved below for historical reference;
each is now marked with its actual disposition.

- **BE-19 Quantum Bounce Equation** — `ρ_crit = 3c²/(8πGℓ_P²)` differs from canonical LQC ρ_crit. **Resolved 2026-05-12 (v0.2.0 Task 13, commit `f808c66`):** structured `known_issues` entry added recording the deviation from the canonical Ashtekar-Pawlowski-Singh LQC value. (S)
- **BE-20 Vacuum Fluctuation Dark Energy Coupling** — naive evaluation reproduces the cosmological-constant problem (~120 orders of magnitude); spec acknowledges this. (S)
- **BE-22 Topological Entanglement Entropy — QG Link** — finite-T and area-scaling extensions are novel additions not in literature. (S)
- **BE-25 Consciousness — Information Integration Bridge (IIT Φ)** — Reformulated 2026-05-06 (Wave P-D R-D2) to canonical Integrated Information Theory (Tononi) Φ_max form: `Φ_max(S) = min_θ [ii(s,s̃) - ii_θ(s,s̃)]` with intrinsic information `ii(s,s̃) = p(s̃|s) log₂[p(s̃|s)/p(s̃)]` (Tononi 2008; Oizumi-Albantakis-Tononi 2014 IIT 3.0; Albantakis et al. 2023 IIT 4.0 arXiv:2212.14787). The Tegmark-falsified Penrose-Hameroff Orch-OR form `t_OR = ℏ/(Δm c² Δx/ℓ_P)` is fully dropped; IIT is substrate-agnostic and consistent with the Tegmark-decoherence rebuttal (no quantum-coherence claim). Status: R3-invalid → speculative (IIT canonical and calculable; bridge framing speculative — Aaronson 2014 / Doerig 2019 contest the IIT-consciousness identification). Part-IV §12.3 / Part-V §21.2.2 / Part-VI §28.2 excisions (Wave L Tier B3) are NOT restored under reformulation; IIT-clinical applications outside UPT scope. (S)
- **BE-27 Fluctuation-Dissipation Violation in Active Matter** — specific functional form is conjectural; standard concept exists (Cugliandolo 2011) but specific equation is novel. (S)
- **BE-30 Entanglement-Geometry Equation** — Reformulated 2026-05-06 (Wave P-A R-A1) to canonical FLM first-law / linear-response form `δS_EE(R) = ⟨δH_R⟩` (Blanco-Casini-Hung-Myers 2013 arXiv:1305.3182; FLM 2013 arXiv:1307.2892). Status moved R3-invalid → R5-leaning speculative (canonical formula, speculative QG-emergence framing). (S)
- **BE-36 MOND — Dark Matter Interpolation Function** — spec says formula is "**not a standard MOND formulation**"; should be encoded as severity. (S)
- **BE-39 Asymptotic Safety in Quantum Gravity** — spec flags the fact this is active research, not confirmed. (S)
- **BE-41 Swampland Distance Conjecture Equation** — same: active research, not confirmed. **Resolved 2026-05-12 (v0.2.0 Task 13, commit `f808c66`):** structured `known_issues` entry added recording active-research caveats. (S)
- **BE-42 Firewall Complement Principle** — spec: decomposition `|ψ⟩ = a|smooth⟩ + b|firewall⟩` is "tautological" without further structure. (S)
- **BE-43 ER=EPR Wormhole-Entropy Bound** — Reformulated 2026-05-06 (Wave P-A R-A3) to canonical Bekenstein-Hawking-applied-to-ER-bridge form `S_entanglement ~ A_wormhole / (4 ℓ_P²)` (Maldacena-Susskind 2013 arXiv:1306.0533; Bekenstein 1973 PRD 7:2333; Hawking 1975 CMP 43:199; Stanford-Susskind 2014 PRD 90:126007 [arXiv:1406.2678] complexity-volume companion; companion Susskind-Zhao 2014 [arXiv:1408.2823] extension to switchbacks — citation disambiguation Wave R 2026-05-06 per Researcher iter-7 C2). Status moved R3-invalid → speculative (canonical bound, ER=EPR framing remains conjectural). (S)
- **BE-44 Soft Hair on Black Holes** — based on Hawking-Perry-Strominger 2016; "speculative" status acknowledged. (S)
- **BE-45 Trans-Planckian Censorship Constraint** — formula adds terms beyond canonical Bedroya-Vafa; spec says "non-standard". (S)
- **BE-46 Multiverse Measure Problem** — spec acknowledges untestability. Needs an `untestable` or `interpretational` severity. (S)
- **BE-49 Quantum Darwinism Redundancy** — spec: specific decay form is phenomenological. (S)
- **BE-50 Retrocausal QFT (Wheeler-Feynman half-retarded-plus-half-advanced)** — Reformulated 2026-05-06 (Wave P-A R-A4) to canonical W-F 1945 absorber-theory form `A_μ(x) = (1/2)[A_μ^ret(x) + A_μ^adv(x)]` (Wheeler-Feynman 1945 RMP 17:157; Wheeler-Feynman 1949 RMP 21:425; Cramer 1986 RMP 58:647 transactional interpretation; Hoyle-Narlikar 1995 RMP 67:113 cosmological-absorber). Status moved R3-invalid → highly-speculative (canonical W-F form, absorber boundary condition empirically untested in QFT). (S)

### Tier R5 — Healthy / ready to implement (11)

No known issues recorded and no narrative concerns beyond status labelling.
These are the **candidate pool for Tier 5 implementation work** (the Bridge Eq
14 end-to-end pipeline already in flight is the canonical first consumer).

- **BE-11 Decoherence Master Equation** (established) — R0 fix landed
  2026-05-04 (Caldeira-Leggett `γ_k(λ) = γ_0 (λ/λ_0)²` replaces the
  exponential-decreasing auxiliary rate). See R0 history above.
- **BE-14 Quantum Error Correction Holographic Mapping** (established) — already in flight.
- **BE-18 Non-Abelian Dark Matter Gauge Theory** (speculative) — R1 fix
  landed 2026-05-01 (added `|D_μ Φ|²` kinetic term, flipped `+V → −V`
  for canonical `L = T − V`). See R1 history above.
- **BE-21 AdS/CMT Correspondence Equation** (established).
- **BE-26 DNA Mutation — Quantum Tunneling Rate** (established).
- **BE-28 Maximum Entropy Production Principle** (speculative — clean prose).
- **BE-29 Jarzynski Equality Extension to Gravity** (speculative) — R1
  fix landed 2026-05-01 (replaced ill-defined `g_{μν} dT^{μν}` with the
  canonical Hilbert action variation `T^{μν} δg_{μν} √(−g) d⁴x`,
  prefactor corrected to `1/(2c⁴)`). See R1 history above.
- **BE-32 Quantum Reference Frame Transformation** (speculative — clean prose).
- **BE-34 Kibble-Zurek Mechanism in Curved Spacetime** (established).
- **BE-35 Conformal Bootstrap — Physical Operator Equation** (established).
- **BE-47 Big Bang Nucleosynthesis — Dark Sector Coupling**
  (speculative) — R1 fix landed 2026-05-01 (added Hubble drag `+3HY` on
  LHS; replaced single-species `n_b²` with species-correct product
  `n_p n_n` for the canonical `p+n→d+γ` two-body reaction). See R1
  history above.

## Dependency observations

The index records exactly one cross-equation dependency: **BE-12 → BE-11** (the
mesoscopic coherence length equation references the decoherence rate from
BE-11). This was already in the index; no update needed.

Searching Parts I-II for the prose patterns "Bridge Eq(uation) N", "from Eq N",
and "see Eq N" confirmed: **no other in-spec cross-references between catalog
entries appear within Parts I-II.** The 40-equation catalog is structurally
flat by design.

Parts IV-VI *do* reference catalog equations as downstream consumers (e.g.,
Part-V applies BE-14, BE-13, BE-24, BE-25; Part-IV targets BE-11, BE-18, BE-19,
BE-20, BE-46; Part-IV § retrocausality references BE-50). These are
*application* references, not derivational dependencies inside the catalog —
BE-14 does not depend on BE-13, etc. They do not belong in the index's
`dependencies[]` field. (If a future "where used" or "applications" field is
added to the schema, the Part IV-VI consumer references would populate it.)

A scan of shared physical symbols across catalog entries surfaced three soft
co-references worth noting (these are shared *physical quantities*, not
equation-level dependencies, and the brief's threshold of "more than 5
divergent dependencies" is **not** met):

- **a_0 (MOND acceleration scale)** appears in both **BE-36** and **BE-38** —
  these are co-related models of the same regime; if either is reformulated,
  the other should be sanity-checked for consistency.
- **M_P (Planck mass)** appears in **BE-41** and **BE-45** — both
  swampland/string-theory bounds; same comment.
- **T_c (critical temperature)** appears in **BE-12** and **BE-22** —
  unrelated physical contexts (mesoscopic coherence vs. topological
  entanglement entropy at finite T); coincidental symbol overlap, not a
  dependency.

### Suggested index updates (separate PR — not modified in this branch)

1. **Eq 50** has an explicit `**Known issue with citations:**` marker in the
   spec that the extractor (`scripts/extract.py`) missed because it only
   scans `**Known issue:**`, `**Additional known issue:**`, and
   `**Bound violation:**`. Update extractor to also catch `**Known issue with
   citations:**` (and any other `**Known issue ...` variant), then
   re-extract.
2. **R4 entries (16 of them)** carry substantive physical concerns in their
   prose that should be encoded as structured `KnownIssue` records. The
   simplest path: a manual pass distilling each entry's notes into 1-3
   `{severity, description, fixable}` records.
3. The `BridgeEquationStatus` union currently includes `'standard-extension'`
   but no entry uses it. Either populate it (some `established` entries are
   really standard extensions of textbook physics) or remove it from the type
   for honesty. Low priority.
4. **Eq 16** likely needs a new status value `'invalid'` if the
   "mark-invalid" disposition is chosen. Type union update + the entry's
   status field flip + a `removed_reason` or `invalidation_note` field
   describing the self-refuting algebra.

## Recommended next steps

1. **R0 + R3 first.** R0 are correctness bugs in equations the spec claims are
   established — these damage the catalog's trust ceiling. R3 (BE-16) is a
   policy decision that blocks any downstream consumer of complexity-entropy
   coupling.
2. **R4 cleanup pass.** 16 equations × ~1-2 hr each, batched. Mostly
   mechanical: re-read spec section, encode existing prose as structured
   `KnownIssue[]`. Extractor improvement (suggested-update #1) handles BE-50
   automatically.
3. **R5 → Tier 5 implementation pool.** Hand the 8 healthy equations to the
   in-flight BE-14 pipeline as the candidate set; they're ready for
   computational embedding work.
4. **R1 batch.** Seven small spec-edits in a single PR; ~1 day of work total.
5. **R2 reformulations.** Case-by-case research items (BE-13 and BE-15 are
   the heaviest); not blocking the pipeline but should be tracked
   individually.

## Verification

Spot-check (per the brief): tier assignments verified against spec text for
BE-11 (R0 — confirmed: Lindblad part is established, auxiliary γ_k issue is
explicit), BE-16 (R3 — confirmed: spec text contains the verbatim
"self-refuting" sentence), BE-23 (R0 — confirmed: τ_P substitution collapses
the radical to 1), BE-48 (R0 — confirmed: GRW prefactor missing),
BE-19 (R4 — confirmed: spec acknowledges ρ_crit deviation from canonical LQC).
All five spot-checks consistent with assigned tier.

`npm run build && npx vitest run` — verified passing before commit (no source
modified; doc-only change).
