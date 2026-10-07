/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-234`. Bridge. Laser threshold gain.

The catalog equation is

```
g_th = α_i + (1 / (2 L)) ln(1 / (R₁ R₂))
```

`threshold_gain_eq` derives it from the round-trip balance of a
two-mirror (Fabry-Perot) cavity of length `L`. A light intensity that makes
one round trip is multiplied by `R₁ R₂ exp(2 (g − α_i) L)`, where `g` is the
uniform power gain coefficient, `α_i` the internal loss coefficient, and
`R₁`, `R₂` the mirror power reflectances. Steady oscillation needs that
factor to equal 1. Taking logarithms gives the threshold above; for equal
mirrors the mirror term is `ln(1/R)/L`. `growth_iff` shows the round-trip
factor exceeds 1 exactly when `g > g_th`, so the threshold is the
crossover, not just a solution. Premises: uniform gain, no scattering, no
gain saturation, lossless mirrors apart from the transmission in `R`.
-/

namespace PhysJS.LaserThreshold

open Real

/-- Round-trip intensity factor. -/
noncomputable def roundTrip (R₁ R₂ g α L : ℝ) : ℝ :=
  R₁ * R₂ * exp (2 * (g - α) * L)

/-- Threshold gain from unit round-trip factor.

`hbal` is steady oscillation: the round-trip factor equals 1.

Kind `bridge` on `PhysJS.LaserThreshold.threshold_gain_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not saturation, not non-uniform gain, and not a prediction of `α_i`. -/
theorem threshold_gain_eq (R₁ R₂ g α L : ℝ) (hR₁ : 0 < R₁) (hR₂ : 0 < R₂)
    (hL : 0 < L) (hbal : roundTrip R₁ R₂ g α L = 1) :
    g = α + (1 / (2 * L)) * log (1 / (R₁ * R₂)) := by
  unfold roundTrip at hbal
  have hRR : 0 < R₁ * R₂ := mul_pos hR₁ hR₂
  have hexp : exp (2 * (g - α) * L) = 1 / (R₁ * R₂) := by
    field_simp
    linarith
  have hlog : 2 * (g - α) * L = log (1 / (R₁ * R₂)) := by
    rw [← hexp, log_exp]
  field_simp
  linarith

/-- The round-trip factor exceeds 1 exactly above threshold. -/
theorem growth_iff (R₁ R₂ g α L : ℝ) (hR₁ : 0 < R₁) (hR₂ : 0 < R₂) (hL : 0 < L) :
    1 < roundTrip R₁ R₂ g α L ↔
      α + (1 / (2 * L)) * log (1 / (R₁ * R₂)) < g := by
  unfold roundTrip
  have hRR : 0 < R₁ * R₂ := mul_pos hR₁ hR₂
  have h1 : 1 < R₁ * R₂ * exp (2 * (g - α) * L) ↔ 1 / (R₁ * R₂) < exp (2 * (g - α) * L) := by
    rw [div_lt_iff₀ hRR]
    constructor <;> intro h <;> linarith
  rw [h1, ← Real.log_lt_iff_lt_exp (by positivity), ]
  have : (1 / (2 * L)) * log (1 / (R₁ * R₂)) < g - α ↔
      log (1 / (R₁ * R₂)) < 2 * (g - α) * L := by
    constructor
    · intro h
      have := mul_lt_mul_of_pos_left h (by positivity : (0 : ℝ) < 2 * L)
      field_simp at this
      linarith
    · intro h
      field_simp
      linarith
  constructor
  · intro h
    have := this.mpr h
    linarith
  · intro h
    apply this.mp
    linarith

/-- Equal mirrors: the mirror loss is `ln(1/R)/L`. -/
theorem equal_mirror_loss (R L : ℝ) (hR : 0 < R) (hL : 0 < L) :
    (1 / (2 * L)) * log (1 / (R * R)) = log (1 / R) / L := by
  have : log (1 / (R * R)) = 2 * log (1 / R) := by
    rw [one_div, one_div, log_inv, log_inv, log_mul hR.ne' hR.ne']
    ring
  rw [this]
  field_simp

/-- Using `1/L` in place of `1/(2L)` gives a different threshold whenever the
mirror term is nonzero. -/
theorem round_trip_factor_two (R₁ R₂ L : ℝ) (hR₁ : 0 < R₁) (hR₂ : 0 < R₂)
    (hL : 0 < L) (h : R₁ * R₂ < 1) :
    (1 / (2 * L)) * log (1 / (R₁ * R₂)) ≠ (1 / L) * log (1 / (R₁ * R₂)) := by
  have hRR : 0 < R₁ * R₂ := mul_pos hR₁ hR₂
  have hpos : 0 < log (1 / (R₁ * R₂)) := by
    apply log_pos
    rw [lt_div_iff₀ hRR]
    linarith
  intro heq
  have : (1 / (2 * L)) * log (1 / (R₁ * R₂)) = (1 / L) * log (1 / (R₁ * R₂)) := heq
  field_simp at this
  linarith

end PhysJS.LaserThreshold
