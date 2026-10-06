# BE-51 Gravitational-Lensing Confrontation — Design

**Date:** 2026-07-04 · **Status:** r2 — **VET GREEN (Adam + Eve, 2026-07-04);
Option B (modern VLBI) locked with vet-confirmed + self-verified numbers.**

## Vet outcome — encode these EXACT values (self-verified arithmetic)

Both reviewers GREEN on legitimacy (independent measurement, not reproduction).
Confirmed/corrected:
- Predicted α_GR = **1.7508″** (evaluator, M_⊙/R_⊙, γ=1); Newtonian 0.8754″.
- Modern VLBI: PPN **γ − 1 = (−0.8 ± 1.2)×10⁻⁴** → γ = 0.99992 ± 0.00012
  (Lambert & Le Poncin-Lafitte 2009, A&A 499, 331; compiled in Will 2014 LRR).
- Converted observed limb deflection (both vet + my own calc):
  (1+γ)/2 = 0.99996 → **α_obs = 0.99996 × 1.7508 = 1.75073″**,
  **σ = 0.6×10⁻⁴ × 1.7508 = 0.000105″**, **residual ≈ 0.67σ**, withinObserved = true.
- (Eve's α_obs = 1.7501″ was a digit slip; Adam's 1.75073″ matches my calc — encode 1.75073.)
- (Option A's 1919 Sobral/Príncipe errors in r1 were WRONG — ±0.12/±0.30 per the
  primary source, not ±0.16/±0.40. Moot since Option B chosen, but noted.)

**Honest framing (provenance):** the observed value is the VLBI-measured PPN γ
expressed as the equivalent solar-limb deflection (γ × the constant baseline
4GM_⊙/R_⊙c² = 1.7508″; the baseline is pure constants, not GR-theory, so this is
a genuine test of γ vs 1, not circular). This tests γ via light **deflection** —
complementary to be-37's γ via Shapiro **delay**: the same PPN parameter through
two independent experiments (radio-source astrometry vs spacecraft ranging).

---


**Program:** Evidence spine (Program B). First target from the 2026-07-04
grounding — the shovel-ready, un-tracked, standout confrontation.

## Goal

Add a 6th real-data confrontation: **BE-51 gravitational lensing** — the third
classic test of general relativity, joining be-52 (Mercury perihelion, 0.26σ)
and be-37 (Shapiro delay, 0.91σ). Predicted from the bridge's OWN evaluator
(`evaluateGravitationalLensing`, α = 4GM/(bc²)) vs an INDEPENDENT measured
deflection. Consumed live by `upt confront` as a pass/fail residual.

## Substrate (verified)

- BE-51 is `status: 'established'` (`index.ts:1785`); evaluator
  `evaluateGravitationalLensing({M_kg, b_m}) → {alpha_rad, alpha_arcsec}`
  (`gravitational-lensing.ts:70`); grazing-solar prediction α ≈ 1.7508″
  (M = M_⊙, b = R_⊙). In-repo citations: Dyson-Eddington-Davidson 1920 (1919
  eclipse) + Will 2014 Living Rev. Relativity 17:4 (modern tests).
- Confrontation shape (`confrontations.ts`, `observations/types.ts`):
  `ConfrontationEntry {bridgeId, title, kind, run()}`; `run()` → a `value`-kind
  outcome `{predicted, observed, sigma, residualInSigma, withinObserved, units,
  provenance}`. Add = a `confrontBE51()` module + hardcoded observation const,
  wrapped and registered in the REGISTRY Map. `DATA_CONFRONTED_IDS` (5 → 6) is a
  projection of the keyset — no second list to edit.

## The confrontation-vs-reproduction guard (load-bearing)

The bridge encodes GR's deflection formula; a legitimate confrontation must
compare its prediction to an **independent measurement**, not recompute the
formula. Both candidate observed values qualify:
- **Classic:** 1919 eclipse photographic star-shift (Dyson-Eddington-Davidson
  1920) — an independent astrometric measurement.
- **Modern:** VLBI quasar-deflection γ (compiled in Will 2014) — an independent
  radio-astrometric measurement.
Either is an observation the bridge does not contain. NOT a reproduction.

## The observed value — TWO options, VET TO CONFIRM THE EXACT NUMBERS

The predicted value is unambiguous (evaluator, 1.7508″ at the solar limb). The
**observed** value + citation is what the vet must confirm (I must not hardcode a
misremembered number):

- **Option A (classic, iconic, in-repo citation):** 1919 Sobral result
  ≈ **1.98″ ± 0.16** (Dyson-Eddington-Davidson 1920); GR predicts 1.75″,
  Newtonian 0.87″. Residual ≈ 1.4σ — *consistent with GR, and rules out the
  Newtonian half-value at high significance.* Honest but a loose residual (the
  1919 data was marginal).
- **Option B (modern, tight, Will 2014):** VLBI light-deflection gives γ (or
  (1+γ)/2) consistent with 1 to ~10⁻⁴; predicted deflection 1.7508″ vs observed
  ≈ 1.7508″ within ~10⁻⁴″. Sub-σ residual, matching the precision of the other
  two GR confrontations — BUT requires the vet to confirm the exact modern γ
  value + its primary citation (Lambert & Le Poncin-Lafitte 2009 / Shapiro 2004,
  as cited within Will 2014).

**Recommendation to the vet:** Option B if the exact modern γ + citation can be
pinned confidently (consistency with be-52/be-37's modern-precision framing);
otherwise Option A (textbook-certain, in-repo citation). Either is honest. The
vet MUST return the exact observed value, σ, and primary citation to encode —
no fabricated precision.

## Architecture (execute after vet confirms the number)

| File | Responsibility |
|---|---|
| `src/bridges/be51-lensing-confrontation.ts` (create) | `OBSERVED` const (vet-confirmed value + σ + citation) + `confrontBE51()` calling `evaluateGravitationalLensing(M_⊙, R_⊙)`, returning a `value`-kind outcome with `residualInSigma`. Mirror `be37-cassini-confrontation.ts`. |
| `src/bridges/confrontations.ts` (modify) | register the BE-51 entry in the REGISTRY Map (→ `DATA_CONFRONTED_IDS` becomes {23,36,37,48,51,52}). |
| `tests/bridges/be51-lensing-confrontation.test.ts` (create) | pin predicted ≈ 1.7508″, the observed const, the residual band, `withinObserved`, and the outcome shape. |
| `data/bridge-catalog.json` (regenerate) | `npm run catalog:json` — `confrontations` array gains BE-51 (schemaVersion 2 already carries confrontations). |
| CLI golden `confront*` if pinned | re-pin (the confront output gains a row). |

## Out of scope

Any un-sourced/fabricated number; the paywalled confrontations (be-16, be-23
table); reproduction-not-confrontation cases (be-12, be-38). BE-53/BE-21 are the
NEXT confrontations, not this one.

## Go/no-go

Buildable and value is real (grounding-confirmed: live residual, not write-only).
The only gate is the vet confirming the exact observed value + citation. On
confirmation, execute the 4-file change and the full-suite gate.
