# UPT Specification — Revision History

## PhysJS #55 — BE-66, BE-67, and BE-68

- Part-II Bridge Equations 66, 67, and 68 are kind `bridge` at pin `d917fa328039d19c3659f74ea73569effb3ed4fb`. The theorems are `PhysJS.RadiationPressure.pressure_eq`, `PhysJS.AlfvenSpeed.speed_eq`, and `PhysJS.TolmanEhrenfest.hydrostatic_constant`. Each covers line still begins with derivation-step. The catalog path does not pass the reference to deriveEvidence. Edge confidence stays `established`. The 2026-10-03 line below that says none of the three has a `formalRef` is the record from before this pin.

## BE-66–68 catalog write-up

- Part-II §V-C adds Bridge Equations 66 (radiation pressure), 67 (Alfvén speed), and 68 (Tolman–Ehrenfest). None has a `formalRef`. The Lean sketches stay in `docs/planning/Applied-Physicist-Candidate-Bridges-Design.md`. Living catalog counts in the specification index and in Parts I, II, IV, V, and VI now say 58 equations, IDs 11–68. The 2026-10-02 line below that says 55 equations, IDs 11–65, is the state of that day.

> **Proof status as of 2026-10-02.** Parts I and II carry a proof-status blockquote under each Bridge Equation heading, read from PhysJS pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The sentence that those lines are the current proof reading is the record from before PhysJS #55. Bridge Equations 66, 67, and 68 are the section above. The wave entries below are history and are unchanged. The first 2026-10-02 entry adds the BE-55–65 headings at an earlier pin. The second retargets BE-16 and records that BE-42's Hawking temperature is not proved, at pin `c6958650f0be66b21f5cc3992d5474bf97ad5094`. The third moves the permalinks to PhysJS #54. The theorems are unchanged.

## 2026-10-02 — PhysJS #54 comment pin

- Parts I and II permalinks now name commit `2e09357f9674bc60b60b378155a1623c27dc7b04`. The vendored manifest entries are the same as at `c6958650f0be66b21f5cc3992d5474bf97ad5094`. PhysJS #54 fixes the five module comments that said the reference is not a formalRef, and the Landauer comment that said `Derivation step`.

## 2026-10-02 — BE-16 erasure scale, BE-42 feasibility

- Part-I Bridge Equation 16 — kind `bridge`. The theorem is `PhysJS.Landauer.erasure_eq` at pin `c6958650f0be66b21f5cc3992d5474bf97ad5094`: ⟨E⟩ − F = k_B T log 2 for T > 0 on the equal-level two-state ensemble. The covers line still begins with derivation-step. The arbitrary-protocol inequality and the Bérut confrontation stay out.
- Part-II Bridge Equation 42 — kind stays `cross-check`. `PhysJS.HawkingUnruh.dictionary` remains the theorem. PhysJS `docs/feasibility/be-42.md` records that the Hawking temperature is not proved: no Schwarzschild surface gravity and no KMS condition in PhysLean.

## 2026-10-02 — BE-55–65 write-up

- Part-II §V-C — a Bridge Equation section for each of BE-55 through BE-65, in the house format, with the same PhysJS proof-status blockquote under the heading. Kind, theorem, and the missing piece are read from `src/atlas/physjs-ref.ts` and `docs/planning/Bridge-Gap-Inference.md` at pin `dd35202920bf19c39f71f15d9ee740a6d28ec173`. A bare `e` in those formulas is the elementary charge. Euler's number is `\exp`.
- Living catalog counts in the specification index and in Parts I, II, IV, V, and VI now say 55 equations, IDs 11–65. The 2026-06-10 line below that says the catalog was harmonized to 44 bridges is the state of that day.

Provenance ledger for the formal specification (`docs/specification/Part-*.md`).

The spec was hardened across a series of 2026-05 adversarial-review
iterations ("Waves" J, L, N, P, Q, R, S, U, Y, Z and their tiers, plus the
earlier R0/R1/R2/R3 audit loops). The per-note "Wave X Tier Y, per
Reviewer Z" attributions that used to live inline in the spec were
relocated here on 2026-06-10 so the spec documents read as clean
current-state references. **The spec files remain authoritative for
current content; this file records how that content was reached.** Where a
bridge equation was reformulated, the spec's Status line keeps the plain
`Reformulated YYYY-MM-DD` / `Corrected on YYYY-MM-DD` stamp; the wave/
reviewer detail is here.

Entries are grouped by spec part. Each line: `§section — Wave id(s)
date(s) — what changed`. Wave IDs and dates are copied verbatim from the
pre-condensation spec text.

---

## 2026-06-10 — wave-note relocation + structural additions

- Relocated all inline wave/reviewer provenance from Parts I–VI into this
  file (ledgers below). Net spec reduction ≈ 23 KB across the six core
  parts; no current-state content changed.
- Added **Part-X** (connection / curvature / field-equation layers) and
  `docs/specification/README.md` (spec index).
- Part-IV §10.2.1 Planck-length interferometry target formally
  reclassified long-term aspirational.
- Part-V §19.2 and Part-II §6.2.1: deleted the `[SUPERSEDED]` det(C)≠0 ∧
  λ_k≥0 consistency-requirement displays (the Harary 1953 balance-theoretic
  replacement is the live form).
- Catalog harmonized to 44 bridges (IDs 11–54) across all parts; BE-51–54
  formally catalogued in Part-II §V-B.

---

## Part-I — Theoretical foundation + BE-11–20

- §preamble (Framing commitment) — Wave J Tier A, 2026-05-05 — three fresh-eyes reviewers (Math M-C1, Phys C7, CS C2) flagged the catalog-vs-Hilbert-space framing incoherence; spec committed to the labeled multi-index catalog framing.
- §1.2 (Interpretation note) — Wave L Tier D1, per Math C1 iter-3, 2026-05-05 — clarified §1.2 "+" as disjoint union of catalog entries, distinct from §3.3's algebraic "+".
- §1.3 preamble — Wave J Tier E8, per CS C8 + I8 iter-2, 2026-05-05 — weakened "must satisfy" to validator-checked-for-the-AST-encoded-subset; gauge/unitarity/correspondence flagged not machine-checked.
- §1.3 invariant 1 — Wave I.B D11 (Math M-C2) + Wave L Tier D2 (Math C2 iter-3), 2026-05-05; Wave N-completion Tier D3 (Math iter-4 IMP-3), 2026-05-06 — rephrased dimensional consistency to per-BE AST round-trip; tightened to typo-detector status.
- §1.3 invariants 2/3/4 — Wave J Tier A, per Math M-I2 + Phys C7, 2026-05-05 — rephrased gauge / unitarity / correspondence to per-cell (resp. per-bridge) predicates, replacing vacuous aggregate equations.
- §1.3 invariant 4 note — Wave P-A Tier 0-4, per Phys iter-5 C3, 2026-05-06 — added empty-pairs hedge (no quantum/classical pairs encoded yet).
- §BE-12 Status — Wave P-B R-B1 (per Math/Researcher iter-5 pivot), 2026-05-06 — reformulated R3-invalid `ξ_coh(T,N)` to canonical thermal de Broglie wavelength; superseded Wave N Tier C1 disposition.
- §BE-12 Status — Wave Q A2, per Math iter-6 C2, 2026-05-06 — dropped the spurious Caldeira-Leggett γ-prefactor.
- §BE-12 formulation note — Wave T, 2026-05-06 — numerical-prefactor fix (`λ_T = ℏ/√(2π m k_B T)` was off by 2π); caught by the hydrogen-at-300K bracket check.
- §BE-12 historical record — Wave P-B R-B1 (superseding Wave N Tier C1), 2026-05-06 — deleted superseded `ξ_coh(T,N)` form (retained in the R2 gap block).
- §BE-13 Status — Wave P-B R-B2, 2026-05-06 — reformulated Landauer-misattributed form to Jacobson 1995 (arXiv:gr-qc/9504004); superseded Wave N Tier C2.
- §BE-13 historical record — Wave P-B R-B2, 2026-05-06 — deleted superseded `k_B T ln(2) I_μν` form.
- §BE-15 Status — Wave P-D R-D1, 2026-05-06 — reformulated conflated emergence equation to Hohenberg-Halperin Model A.
- §BE-17 Status — Wave P-B R-B3, 2026-05-06 — reformulated three-defect rank-4 form to canonical Einstein-Cartan (Trautman 2006); superseded Wave N Tier C4.
- §BE-17 historical record — Wave P-B R-B3, 2026-05-06 — deleted superseded `R_μν^λρ = R̊ + K + α(FF−¼gF²)` form.
- §BE-19 Status — Wave I.B C1, 2026-05-05 — reformulated ρ_crit to Ashtekar-Pawlowski-Singh γ³-dependent form.
- §BE-19 where-clause — Wave J Tier H (Math M-M1 iter-2), 2026-05-05 — disambiguating parentheses added.
- §BE-19 where-clause — Wave N Tier B (Math IMP-1 + Researcher I-3 iter-4), 2026-05-06 — `Corrected on 2026-05-06` prefactor reconciliation 16 → 32.
- §BE-20 — Wave J Tier H (Math M-M4 iter-2), 2026-05-05 — SVG `n ≥ 2` → `n > 0` to match alt-text/prose.
- §3.1 (CPT) — Wave L Tier J (Math iter-3), 2026-05-05 — CPT acts on per-cell content, not catalog labels.
- §3.2 item 4 — Wave I.B D1 (Math M-C3 + CS C5), 2026-05-05 — removed `C(ρ) ≤ exp(S(ρ))` (fails for pure states); replacement noted vacuous in infinite dimension.
- §3.2 item 4 — Wave J Tier E7 (CS I5 iter-2), 2026-05-05 — strengthened: no general entropy-only circuit-complexity bound; UPT commits to none.
- §3.3 scope note — Wave L Tier D1 (Math C1 iter-3), 2026-05-05 — algebraic "+" vs disjoint-union "+" disambiguation.
- §IV Algorithm 1 — Wave J Tier E2 (CS C1 iter-2), 2026-05-05; Wave N Tier A2 (CS iter-4 C2), 2026-05-06; Wave R (CS iter-7 C1), 2026-05-06 — declared schema with ORACLE subroutines; REPAIR_INCONSISTENCY schema-only (real repair is human audit-tier dispositioning, Waves F–N); ORACLE/SPEC-ONLY call-site tags.
- §IV Algorithm 3A — Wave L Tier B + D3 (CONV-2 + CONV-4 iter-3), 2026-05-05; Wave R (CS iter-7 C2), 2026-05-06 — aggregate Π operations declared schematic renderings of per-cell predicates, not load-bearing.
- §Appendix A — Wave I.B D9 (Researcher I-6), 2026-05-05; plus glossary row stamps (BE-19/34/38/50, stress-energy T, n/BE-20) across Waves I.A C5, J Tier D, L Tier A/J, N-completion D6/E5, R — notation-glossary additions and the Hubble-horizon-area `A_H = 4πc²/H₀²` adoption + SI c²-correction.

## Part-II — BE-21–54

- §BE-21 — Wave J Tier C1/C2, Wave I.B C2a, 2026-05-05 — Son-Starinets venue/attribution corrections (JHEP 0209:042 vs hep-th/0205052; *Phys. Rev. D* 65:104021 regression), Iqbal-Liu 2009 year fix, G_R dimension sign-error `[L]^{2Δ−d}` → `[L]^{d−2Δ}`.
- §BE-22 — 2026-05-05 — reformulated to canonical Kitaev-Preskill / Levin-Wen single-subsystem TEE form (removed ill-defined finite-T and area-law-reintroducing terms).
- §BE-23 — Wave Q A1, Wave P-C R-C1, 2026-05-06 — added missing m* effective-mass prefactor (Ω·m consistency); reformulated vacuous ρ(T) term to canonical SYK/Planckian linear-in-T resistivity.
- §BE-24 — Wave P-C R-C2, 2026-05-06 — reformulated bound-violating multiplicative coherence ansatz to canonical Förster FRET rate/efficiency.
- §BE-25 — Wave Q B1/B2, Wave P-D R-D2, Wave L Tier B3, 2026-05-06 — archived Penrose-Hameroff Orch-OR; reformulated to IIT Φ_max; tractability corrected formally-divergent → numerical-asymptotic (Φ_max Turing-decidable).
- §BE-26 — Wave S, Wave I.B C6, 2026-05-05/06 — status downgraded established → speculative; registered WKB mutation-rate overshoot known issue.
- §BE-27 — Wave N-completion Tier E2, 2026-05-06 — FDT prefactor verification; cross-correlator flagged schematic vs canonical Kubo/Callen-Welton.
- §BE-28 — 2026-05 — reformulated to Onsager σ = Σᵢ Jᵢ Xᵢ (carries the ⚠ CRITICAL WARNING that the encoded form is the MEPP definiendum, not the variational principle).
- §BE-29 — R1 audit, 2026-05-01 — `Corrected on` block: dT^{μν} → Hilbert action variation.
- §BE-30 — Wave P-A R-A1, 2026-05-06 — reformulated ill-formed metric-entanglement form to canonical FLM/first-law δS_EE = ⟨δH_R⟩.
- §BE-31 — Wave I.B C3, 2026-05-05 — reformulated dimension-mismatched form to Benincasa-Dowker d=4 inclusion-exclusion.
- §BE-33 — commit 394d164 (2026-05-20), Wave P-A R-A2 (2026-05-06) — corrected finite-T exponent −ν/z → −1/z; reformulated broken ξ ansatz to Hertz-Millis 3D-Heisenberg scaling.
- §BE-34 — Wave L Tier I4, 2026-05-05 — dimensional fix: explicit 1/a^d prefactor on Kibble-Zurek defect density.
- §BE-36 — Wave P-C R-C3, Wave Y, Wave I.B C4, 2026-05-06/07 — reformulated hybrid blend → TeVeS → GW170817 graviton-speed bound AST encoding.
- §BE-37 — Wave Z-F, 2026-05-11 — reformulated R3-invalid VSL ansatz to canonical Shapiro gravitational time delay.
- §BE-38 — Wave I.B C4, Wave L Tier H2, Wave U, 2026-05-05/06 — reformulated tanh interpolation → Milgrom μ(x); SciPost 2016 → 2017 fix; Wave U Tier-5 explicit ν-form AST encoding.
- §BE-39 — Wave N-completion Tier E3, Wave S, 2026-05-06 — sign-convention note + missing −Fg² term in β_λ.
- §BE-40 — Wave J Tier C5, Wave N Tier A5, 2026-05-05/06 — `Corrected on` f² → f⁴ dimensional fix; author re-attribution to Giudice-Grojean-Pomarol-Rattazzi 2007.
- §BE-43 — Wave P-A R-A3, Wave R, 2026-05-06 — reformulated malformed dℓ/dt form to canonical Bekenstein-Hawking ER=EPR bound.
- §BE-47 — R1 audit, 2026-05-01 — `Corrected on` block: +3HY drag term / n_b² → n_p n_n.
- §BE-50 — Wave P-A R-A4, 2026-05-06 — reformulated ill-posed δ⁴ retrocausal action to canonical Wheeler-Feynman half-retarded-plus-half-advanced form.
- §6.2 / §6.2.1 — Wave J Tier C6 (Math M-I8), Wave L Tier C (CONV-3 iter-3), 2026-05-05 — Gram-form alternative retired for the Harary 1953 balance-theoretic check; deleted the `[SUPERSEDED]` det(C)≠0 ∧ λ_k≥0 note and its formula display.

## Part-III — Algorithms + information theory

- §preamble — Wave N (CS iter-4 C1/C3), 2026-05-06; Wave J Tier E4 / Wave L; Wave N-completion Tier D4 — recorded deletion of the formal complexity-class chain `P ⊆ NP ⊆ … ⊆ TENSOR ⊆ …` and the TENSOR-COMPLETE list from §VIII; Algorithm 3/3A/3B numbering reconciliation.
- §VIII heading — Wave L Tier A (CS C3 iter-3), 2026-05-05 (hedge history Wave I.B D6 / Wave J Tier E1) — heading reformulated; alignment note removed.
- §VIII Definition 8.1 — Wave J Tier E6 (Math M-I4 iter-2) + Wave L Tier G4 (Math iter-3), 2026-05-05 — uniform-on-populated-cells distribution pin (content incl. `log_2 44 ≈ 5.46 bits` kept in spec).
- §VIII Definition 8.1 — Wave I.B D4 (Math M-I), 2026-05-05 — `Corrected` marker on the double-counting fix to the subadditivity bound (Cover-Thomas / MacKay citations kept).
- §Conjecture 8.1 — Wave J Tier E5 (Math M-I3 iter-2) + Wave L Tier A (CONV-1: Math C4 + CS C4/C5 + Phys C1 iter-3), 2026-05-05; Wave R (Math iter-7 IMP-1), 2026-05-06 — relabeled theorem → conjecture; rewrote `A_universe` → Gibbons-Hawking horizon area `A_H`, `∂ universe` → H_3, added max(0,…) floor; restored the SI c² factor.
- §VIII Computational Complexity Classes / Algorithm 6 — Wave N Tier A (CS iter-4 C1/C3/C4), 2026-05-06 — deleted the class chain + TENSOR-COMPLETE list (no Turing-machine model / completeness reductions); Algorithm 6 scoped to tree-width schematic (Markov-Shi 2008).

## Part-IV — Validation framework

- §10.2.1 — 2026-06-10 — Planck-length interferometry target reclassified long-term aspirational.
- §11.1.1 / §11.1.2 — Wave J Tier A + Wave L Tier B (CONV-2 iter-3), 2026-05-05; Wave L Tier A rewrite; Wave N-completion Tier E4/E8 + Wave R (Math iter-7 IMP-1), 2026-05-06 — catalog-framing scope notes; Hubble-horizon-area `A_H` adoption + SI c²-correction on the holographic bound.
- §11.2.1 — Wave I.B D5 (Math M-I), Wave J Tier D7 (Math M-M9 + CS I1 iter-2), Wave L Tier F1 (Researcher C2 iter-3), 2026-05-05; Wave Q C3 (CS iter-6 C3), 2026-05-06 — Gödel/cardinality undecidability arguments condensed to one rationale sentence each; Israeli-Goldenfeld year 2006 → 2004 fix; retracted `|𝒞(Π)| < |𝒰(Π)|` formula deleted (Wolfram framing kept).
- §12.2.1 / .1.1 / .1.2 / .2.2 — Wave I.B D2/D3 (CS C3/C4), Wave J Tier D8 (Math M-I6 iter-2), 2026-05-05; Wave N Tier A2 (CS iter-4 C2), 2026-05-06 — validator-capability hedges; scope-limitation lists (kept verbatim); deleted the conflated `Computational Power ≤ (E·T/ℏ)·(V/ℓ_P³)` display for orthogonal bounds.
- §12.3 / §14.1.3 — Wave J Tier E3 (CS C4 iter-2), Wave L Tier E3 cascade (Phys C4 iter-3, Tegmark 2000), 2026-05-05; Wave P-D R-D2 — consciousness-engineering excision (BE-25); BE-25 IIT-reformulation scope note.
- §Appendix B — Wave L Tier B (CONV-2 iter-3), Wave J, Wave L Tier A, 2026-05-05 — speculative-content relegation rationale and cross-reference table.

## Part-V — Advanced mathematics

- §19.2 — Wave J Tier C6 (Phys C6 + Math M-I8), 2026-05-05 — det(C)≠0 ∧ λ_k≥0 shown not simultaneously satisfiable for {−1,0,+1} matrices with −1 off-diagonals; Harary 1953 balance-theoretic replacement; deleted the `[SUPERSEDED]` requirement display.
- §19.2 — Wave J Tier A (catalog-framing) + Wave L Tier C (CONV-3 iter-3: Math C3 + Phys C5), 2026-05-05 — scope-note + entry-construction-recipe attributions.
- §19.3 / §19.3.1 — Wave N-completion Tier D1 (Phys iter-4), 2026-05-06 — `[S]` (entropy/action conflation) split into `[S_E]` (J/K) and `[S_A]` (J·s); dimensional matching is exact integer-vector equality.
- §21.2 / §21.2.2 — Wave L Tier E3 cascade (Phys C4 iter-3, Tegmark 2000), 2026-05-05 — DNA-mutation directionality correction; BE-25 excision.
- §Conclusion — Wave N-completion D5 + Wave P-A Tier 0-1 (Math iter-5 CRIT-1), 2026-05-06; Wave N-completion Tier E7/D8 — replaced drift-prone hard-coded `known_issues` enumeration with the `src/bridges/index.ts` pointer; framework-statistics single-source-of-truth designation; 11 → 12 algorithm-count reconciliation (3A/3B split).

## Part-VI — Governance + framework statistics

- §28.2 — Wave L Tier E3 cascade (Phys C4 iter-3, Tegmark 2000 *Phys. Rev. E* 61:4194), 2026-05-05 — Consciousness Engineering Applications excised; IIT/PCI alternative-basis recommendation.
- §28.3 — Wave L Tier G3 (propagated from Wave J Tier E3, Math M-I6 iter-2), 2026-05-05 — speculative-algorithms warning (cross-referenced to Part-IV §12.3).
- §Conclusion item 2 — Wave N-completion Tier D7 (Researcher iter-4), 2026-05-06 — algorithm-count off-by-one correction (12 numbered; 3A/3B split across Part-I §IV / Part-III §VII).
- §Conclusion "What remains" + Framework Statistics — Wave N-completion Tier D5/E7 (Researcher iter-4), 2026-05-06 (ref Wave L Tier H3) — removed the hard-coded 27-entry `known_issues` BE list for the `src/bridges/index.ts` pointer rule; single-source-of-truth designation.

---

## 2026-06-11 (second pass) — essay relegation (G-4) + Part-IX Phase-B closure

- **G-4 executed:** Part-V §XXI (technology transfer/applications) +
  §XXII (risk assessment) and Part-VI §XXVIII–§XXX (advanced
  applications, emergency protocols, international governance)
  relocated verbatim to `docs/essays/` with heading-preserving stubs.
  Part-V 1208 → 1077 lines; Part-VI 770 → 299. §XXX-B
  (Status-Promotion Protocol) kept in core, renumbered §XXVII-B.
- **Part-IX:** C1/C4/C5 calibration rows marked REALIZED (CT-3, CT-1,
  CT-2+CT-4); the Phase-B positive-outcome bar (≥3 of C1–C5) recorded
  as MET 2026-06-11.

## 2026-06-14 — Part-IX §9 Phase-D candidate identifications

- **Part-IX §9 added:** three machine-proposed candidate quantity
  identifications (CI-1 correlation length, CI-2 critical timescale, CI-3
  information–cosmology energy) recorded as **PROPOSED, UNADJUDICATED**
  Phase-D hypothesis-generation output — surfaced by the linkage-map
  candidate generator (`proposeLinkCandidates`; 132 same-dimension pairs →
  3), none registered in `QUANTITY_IDENTIFICATIONS`, each pending physicist
  adjudication under the Status-Promotion Protocol (Part-VI §XXVII-B).
  Full analysis: `docs/research/Linkage-Candidate-Proposals.md`. README
  Part-IX status updated (Phases B–D met).

## Part XI — Proposed Equations (new, 2026-06-19)

- New non-normative supplement `Part-XI-Proposed-Equations.md`, indexed in the
  README. Catalogs the identity-consequence surfacer's machine-derived candidate
  relations (`upt discover --derive`; `deriveProposedBridges`/`toProposedEntry` in
  `src/composition/proposed-bridges.ts`) as **PROPOSED, UNADJUDICATED** output:
  PE-1 "Landauer photon" `ν = k_B ln2 T/h` and PE-2 dark-fermion/erasure
  temperature `T = v g/(k_B ln2)`. Held OUT of the 44-entry `BRIDGE_EQUATIONS`
  catalog; promotion requires the Status-Promotion Protocol (Part-VI §XXVII-B) via
  `promoteProposal`. Snapshot of 2 equations at `--source=both`; code + tests
  (`tests/composition/proposed-bridges.test.ts`) authoritative.
