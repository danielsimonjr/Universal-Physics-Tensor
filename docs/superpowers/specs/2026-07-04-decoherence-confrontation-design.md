# BE-11 × matter-wave interferometry — Decoherence Confrontation: Design

**Date:** 2026-07-04 · **Status:** r2 — BUILD as a CONSISTENCY confrontation
(experiment A, Hornberger 2003), after PRIMARY-SOURCE verification caught BOTH
reviewers fabricating the numbers.

## Vet outcome + primary-source verification (2026-07-04) — the honesty save

Both reviewers agreed on experiment A (collisional decoherence, Hornberger et al.
2003, PRL 90:160401) and both returned GREEN — but they gave MATERIALLY DIFFERENT,
and on check FABRICATED, numbers:
- Adam: σ_eff predicted 490±50 Å² vs measured 510±130 Å², attributed to "Table I".
- Eve: σ predicted 4.2e-18 m² (420 Å²) vs 4.0e-18 m² (400 Å²), "Table I + Fig 3".

I fetched the arXiv source (quant-ph/0303093) and read it. NEITHER is right:
- Table I is the van der Waals C₆ parameters, NOT a theory/experiment cross-section
  confrontation. There is no 490/510 or 420/400 Å² pair in the paper.
- The actual confronted observable is the **decoherence pressure p₀** for **9
  gases** (H₂, D₂, He, Ne, Ar, Kr, Xe, N₂, CH₄), theory vs experiment, in **Fig 3**
  (a plot, no number table). σ_eff there is ~40–110 nm² (≈4000–11000 Å²) — the
  reviewers were off by ~10× AND on the wrong quantity.
- The paper's explicit quantitative claim: "very satisfactory agreement over the
  whole broad range" (masses + interaction strengths span ~2 orders of magnitude),
  experimental error **~15%** (pressure measurement), theoretical uncertainty ~5%,
  and the prediction is **parameter-free** ("our calculation, which contains no
  adjustable parameters, agrees well").

Lesson: the reviewer-disagreement → primary-source rule worked exactly as
designed; both confident [High] numbers were fabrications. Do NOT trust
reviewer-supplied numbers without the source.

## What is honestly encodable — a CONSISTENCY confrontation

The paper confronts via a figure, so there is no clean single tabulated
theory/experiment pair, and reading values off Fig 3 would be fabricated
precision. What CAN be encoded, using only the paper's explicitly-stated numbers:
**parameter-free collisional-decoherence theory reproduces the measured
decoherence pressure p₀ across 9 gases within the ~15% experimental uncertainty.**
This is the BE-23 style (a consistency-within-error confirmation), not a precise
σ-residual. Encode `consistency`: predicted (theory/experiment p₀ ratio) = 1.0,
approaches (measured ratio) ≈ 1.0, fractionalGap = 0.15 (the experimental band
within which the 9-gas agreement holds). Provenance records the full story incl.
the parameter-free nature and the 9-gas span.

## (original draft below)

**Status:** r1 — DRAFT, awaiting Adam/Eve number-sourcing vet.
**Program:** keep grounding the evidence spine (open established bridges). BE-11 is
the Lindblad decoherence master equation (rate γ, `[frequency]`) — a general
framework, so a confrontation needs a specific system where theory predicts a
decoherence rate an experiment independently measured.

## Candidate confrontation

Matter-wave interferometry with large molecules (the Arndt/Hornberger/Vienna
program) provides the canonical *quantitative* decoherence confrontations:

- **(A) Collisional decoherence** — Hornberger, Hackermüller, Uttenthaler, Arndt
  et al. 2003, PRL 90:160401 ("Collisional decoherence observed in matter wave
  interferometry"). Theory predicts the interference-visibility decay rate vs
  background-gas pressure from the molecule-gas scattering (localization rate);
  the C70 Talbot-Lau interferometer measured it, agreeing with the parameter-free
  prediction.
- **(B) Thermal decoherence** — Hackermüller, Hornberger, Brezger, Zeilinger,
  Arndt 2004, Nature 427:711 ("Decoherence of matter waves by thermal emission of
  radiation"). Heated fullerenes lose coherence by emitting thermal photons; the
  visibility vs internal temperature matched the predicted rate.

Both are genuine theory-vs-data decoherence confrontations of BE-11's physics.

## What the vet must SOURCE / confirm (this is the crux — high fabrication risk)

Unlike BE-35, I do NOT have these numbers memorized. The vet must either supply a
DEFENSIBLE, citable quantitative confrontation number or recommend DEFER. For the
chosen experiment (A or B), confirm:

1. The cleanest confrontable OBSERVABLE — e.g. the pressure-normalized decoherence
   rate dΓ/dp, the effective localization/decoherence cross-section, or the
   predicted-vs-measured decoherence rate at a stated condition.
2. The PREDICTED value (theory) with its number + a real citation.
3. The MEASURED value with its uncertainty + a real citation.
4. Whether predicted and measured agree within a stated σ (so I can encode a
   value- or consistency-kind residual), OR whether the published agreement is
   only qualitative / "within a factor" (in which case a single-σ residual would
   be fabricated precision → DEFER).

## Honesty bar (the BE-53 lesson)

If neither reviewer can supply a defensible, cross-checkable predicted+measured
pair with a real citation — or if they disagree materially on the numbers —
**DEFER BE-11** rather than encode values I cannot independently verify. A deferred
honest confrontation beats a fabricated one. The two reviewers' numbers will be
treated as candidates requiring agreement, not ground truth.

## Architecture (only if the vet confirms clean numbers)

Mirror `be35-bootstrap-confrontation.ts`: predicted + observed consts, `confrontBE11()`
returning value/consistency-kind, register in `confrontations.ts` (DATA_CONFRONTED_IDS
→ 9), test, public surface, catalog-json + goldens, gate + DGT.

## Go/no-go

Build only on a vet-confirmed, cross-checked, citable predicted+measured pair with
an honest residual. Otherwise DEFER and document (the open established-bridge
frontier keeps BE-11 as a known-but-unencoded target).
