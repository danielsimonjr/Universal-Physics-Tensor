# BE-35 × 3D Ising — Conformal-Bootstrap Confrontation: Design

**Date:** 2026-07-04 · **Status:** r2 — vet-confirmed GREEN (Adam + Eve). BUILD.
Predicted ν = 0.629971(4) (KPSV16 bootstrap, via Δ_ε = 1.412625). Observed
ν = 0.630(2) EXPERIMENTAL (Pelissetto & Vicari 2002, fluid critical points) — both
reviewers required the experimental value, NOT Monte-Carlo (bootstrap-vs-MC is
theory-vs-theory; the experimental value makes it a genuine theory-vs-DATA test).
Residual ≈ 0.015σ, within 1σ. Honest caveat to encode: experimental precision
(±0.002) is far coarser than the bootstrap (±0.000004) — this confirms CONSISTENCY,
not a precision stress-test.

## Vet outcome (2026-07-04, both GREEN)

- Predicted: **ν = 0.629971(4)**, derived from the bootstrap operator dimension
  Δ_ε = 1.412625(10) via ν = 1/(3 − Δ_ε). Citation: Kos, Poland, Simmons-Duffin &
  Vichi, "Precision Islands in the Ising and O(N) Models", JHEP 08 (2016) 036,
  arXiv:1603.04436. (Δ_σ = 0.5181489(10) is the cleanest primary output, but ν is
  the exponent with a measured counterpart.)
- Observed: **ν = 0.630(2)** — experimental average over liquid-vapor / binary-fluid
  critical points (3D-Ising universality class). Citation: Pelissetto & Vicari,
  "Critical phenomena and renormalization-group theory", Phys. Rep. 368, 549 (2002).
  Both reviewers rejected the Monte-Carlo value (Hasenbusch 2010, 0.63002(10)) for
  the "observed" slot: it is a numerical experiment, so bootstrap-vs-MC would be
  theory-vs-theory, not a data confrontation.
- Residual: |0.629971 − 0.630| / 0.002 = **0.0145σ** — within 1σ; a strong positive.
- Honest framing (both): a parameter-free CFT prediction confirmed by precision
  measurement of a real critical system — but experiment cannot resolve the
  bootstrap's 5-digit precision, so it is a consistency confirmation.

## (original draft below)

**Status:** r1 — DRAFT, awaiting Adam/Eve data-confirmation vet.
**Program:** grow the evidence spine (the "better option" — real data over decoy
connectors). Confronts an OPEN established bridge (BE-35) on a famous, precisely-
measured result. Mirrors the BE-21/BE-23 pattern (a cited theory value as the
prediction, an independent measurement as the observed).

## The bridge and its confrontable consequence

BE-35 encodes the conformal-bootstrap crossing equation
(`⟨O₁O₂O₃O₄⟩ = Σ C C g_{Δ,ℓ}(u,v)`, dimensionless). Its flagship empirical
consequence is the **3D Ising universality-class critical exponents**: the
numerical bootstrap pins the operator dimensions Δ_σ, Δ_ε — and hence the
correlation-length exponent ν = 1/(3 − Δ_ε) and anomalous dimension η = 2Δ_σ − 1 —
to remarkable precision, parameter-free, and they match experiment and Monte Carlo.

## The confrontation (value kind)

- **Predicted (conformal bootstrap):** the correlation-length exponent
  **ν ≈ 0.6300** (I have Kos, Poland, Simmons-Duffin & Vichi 2016:
  ν = 0.629971(4), from Δ_ε = 1.412625). VET TO CONFIRM the exact value + citation.
- **Observed (independent measurement):** the 3D-Ising ν measured in real systems
  in that universality class (uniaxial magnets, binary-fluid / liquid-vapor
  critical points) — experimentally **ν ≈ 0.63** with an error bar of order 0.01;
  OR the high-precision Monte-Carlo value (Hasenbusch 2010, ν = 0.63002(10)).
  VET TO DECIDE: encode the EXPERIMENTAL ν (a genuine lab measurement, wider
  error) or the MC ν (tighter, but numerical not lab), and confirm the exact
  value + σ + citation.
- **Residual:** |predicted − observed| / σ_observed — expected ≪ 1σ (the bootstrap
  and measurement agree to several digits: a strong positive confrontation).

## Legitimacy (confrontation vs reproduction)

The bootstrap value and the measured exponent are INDEPENDENT determinations of
the same universal number — the bootstrap from CFT crossing symmetry + unitarity,
the measurement from a physical (or Monte-Carlo) critical system. Confronting them
is genuine, not a recompute. Consistent with the honesty guard: I cite the
bootstrap value as a published result (I cannot solve the bootstrap by hand — same
honest stance as BE-21 citing 1/4π), not a number I computed from the AST.

## What the vet must decide / confirm (no fabrication)

1. The exact bootstrap prediction to encode (ν = 0.629971(4)? or Δ_σ = 0.5181489(10)?
   — pick the one whose measured counterpart is cleanest) + the exact citation.
2. The observed value: EXPERIMENTAL 3D-Ising ν + its error + a real citation
   (preferred — it makes this a true lab-data confrontation), OR the MC value if no
   defensible experimental number exists; state which and why.
3. Confirm the residual is honestly < 1σ and the framing ("bootstrap prediction
   confronts measured 3D-Ising exponent") is not overclaimed.
4. GREEN/YELLOW/RED, and if any number is uncertain, SAY SO rather than inventing
   precision (the BE-53 lesson — defer over fabricate).

## Architecture (after vet confirms)

Mirror `be21-kss-confrontation.ts`: `src/bridges/be35-bootstrap-confrontation.ts`
(OBSERVED const + predicted const + `confrontBE35()` returning a value-kind result),
register in `confrontations.ts` (kind `value`; DATA_CONFRONTED_IDS auto-projects
7 → 8), add a test, add to the public surface, regenerate catalog-json +
confront/coverage goldens. Gate + DGT.

## Go/no-go

Build only if the vet confirms a defensible predicted value AND a defensible
measured value with a real citation and an honest < 1σ residual. If the only
"measurement" is another bootstrap/MC computation with no independent lab number
and the vet judges that theory-vs-theory rather than a data confrontation, DEFER
(honest) rather than dress a computation up as data.
