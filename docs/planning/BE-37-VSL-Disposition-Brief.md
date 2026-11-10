> **SUPERSEDED (2026-05-11):** This brief's R3 / mark-invalid recommendation
> was overridden by Wave Z-F (commit `05900f3`). BE-37 was reformulated as
> Shapiro gravitational time delay and lifted to `status: 'speculative'`.
> This document is retained as a historical record of the deliberation.
> See `Bridge-Remediation-Plan.md` and `v0.3.0-Bridge-Selection.md`.

# BE-37 VSL Disposition Brief — R2 → R3 Evaluation

Working document; not a decision. Linked task #98, pending since Wave F.

## 1. What BE-37 currently says

BE-37 (`Variable Speed of Light Cosmology`, status `speculative`) encodes
`c(t) = c_0 [1 + ε (t/t_P)^n exp(-t/t_c)]`. The `known_issues` entry
(re-tiered R1 → R2 on 2026-05-01) flags it as needing a reformulation that
"cite[s] a specific VSL paper." Candidates: Albrecht-Magueijo 1999,
Moffat 1993, Barrow 1999 — each with different modified Friedmann equations.

- **R2 implies** salvageable via reformulation.
- **R3 implies** no reformulation survives the foundational critique; the
  entry is preserved with `invalid` status as honest record.

## 2. The Ellis-Uzan critique

Ellis & Uzan, "c is the speed of light, isn't it?" *Am. J. Phys.* 73
(2005) 240–247, arXiv:gr-qc/0305099.

**Verbatim abstract** (fetched 2026-05-04 via WebFetch):

> "Theories proposing a varying speed of light have recently been widely
> promoted... In theoretical physics the speed of light, c, is hidden in
> almost all equations but with different facets that we try to distinguish.
> Together with a reminder on scalar-tensor theories of gravity, this sheds
> some light on these proposed varying speed of light theories."

**Reconstructed body argument** (from background knowledge — WebFetch
returned only the abstract; honest-claude flag): since 1983 the SI metre
*defines* c = 299,792,458 m/s. "c varying" is operationally empty as a
bare claim; it requires specifying which *dimensionless* ratio varies —
α, m_p/m_e, a Planck-length ratio. Multiple "facets" of c appear in
physics (propagation, E = mc², gravitational coupling, α). Operationally
meaningful varying-α theories exist (Bekenstein 1982, Sandvik-Barrow-
Magueijo 2002); Ellis-Uzan's stance is that "VSL" is a confused renaming.
**The owner should verify this reconstruction against the paper body.**

## 3. Arguments for R2

- Cited VSL theories *do* identify which constant varies and write modified
  Friedmann equations; reformulating to one of them survives Ellis-Uzan.
- The critique is methodological, not falsifying. Mainstream still publishes
  VSL-adjacent work; R3 is more aggressive than the literature warrants.

## 4. Arguments for R3

- The current ansatz is **original** to this framework — not in any cited
  paper. Reformulating **replaces**, not **patches**.
- Picking among the three cited theories is a *physics* decision; the audit
  note already acknowledges this.
- The validator lacks time-varying-constant support; any honest
  reformulation needs Tier-5 extension first.
- R2 has been blocked since Wave F. Honest-claude favors explicit `invalid`
  over deferred-fix promises.

## 5. Recommended call

**R3 (mark-invalid) with confidence 60.**

The ansatz is original, no cited paper supplies a drop-in replacement, and
the validator lacks symbolic support for time-varying constants. R3 keeps
the entry/citations/known_issues as honest documentation while dropping the
indefinite fix-promise.

Confidence 60 (not higher) because (a) Ellis-Uzan's body argument is not
verified beyond the abstract, (b) mainstream still publishes VSL-adjacent
work, (c) a future contributor with a specific theory could legitimately
reformulate.

Middle ground if R2 stays: add a *second* known_issue citing Ellis-Uzan
and requiring any reformulation to answer "which facet of c is varying."

## 6. What unblocks the call

- The user's read of the Ellis-Uzan paper body (the operational-meaning
  argument needs paper-body verification).
- The user's preferred VSL theory, if any.
- Decision on validator scope: does Tier 5 support time-varying symbolic
  constants? Yes → R2 attractive. No → R3 honest.
