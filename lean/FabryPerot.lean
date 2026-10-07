/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Complex.Trigonometric
import Mathlib.Analysis.Normed.Field.Lemmas
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Inverse
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-231`. Bridge. Fabry-Perot free spectral range and finesse.

The catalog equations are

```
Δν_FSR = c / (2 n L),     F = π √R / (1 − R),     Δν_line = Δν_FSR / F
```

`fsr_eq` is the resonance spacing. A plane wave of frequency `ν` makes a
round trip of phase `δ = 4π n L ν / c`; resonances sit at `δ = 2π m`, so
adjacent resonances differ by `c / (2 n L)`.

`airy_eq` sums the multiple-reflection series. With equal lossless mirrors
of power reflectance `R` and transmittance `T = 1 − R`, the transmitted
field is `T e^{iδ/2}` times the geometric series `Σ (R e^{iδ})^k`, which
converges because `R < 1` to `1/(1 − R e^{iδ})`. The transmitted intensity
fraction is `T² / |1 − R e^{iδ}|² = (1−R)² / ((1−R)² + 4R sin²(δ/2))`.

`finesse_eq` locates the half-maximum points `δ = ±2 arcsin s` with
`s = (1 − R)/(2√R)` and gets the exact finesse `F = 2π / (δ₊ − δ₋)
= π / (2 arcsin s)`.

Discrepancy with the report. The report's `F = π√R/(1−R) = π/(2s)` is not
exact. Because `arcsin s ≥ s` the exact finesse is `≤ π√R/(1−R)`
(`finesse_le_catalog`), with the two agreeing as `R → 1`. The theorem here
is the exact statement; the catalog form is its small-width limit.
Premises: lossless mirrors, equal reflectances, plane waves at normal
incidence, no absorption, `s ≤ 1` (that is, `R` large enough for the
half-maximum points to exist).
-/

namespace PhysJS.FabryPerot

open Real

/-- Free spectral range from adjacent round-trip phases `2π m`, `2π (m+1)`.

`hm`, `hm1` say the round-trip phase `4π n L ν / c` is `2π m` and
`2π (m + 1)` at the adjacent resonances.

Not dispersion: `n` is taken constant across the interval. -/
theorem fsr_eq (n L c m νm νm1 : ℝ) (hn : 0 < n) (hL : 0 < L) (hc : 0 < c)
    (hm : 4 * π * n * L * νm / c = 2 * π * m)
    (hm1 : 4 * π * n * L * νm1 / c = 2 * π * (m + 1)) :
    νm1 - νm = c / (2 * n * L) := by
  have hpi : 0 < π := pi_pos
  have hd : 4 * π * n * L * (νm1 - νm) / c = 2 * π := by
    have : 4 * π * n * L * (νm1 - νm) / c =
        4 * π * n * L * νm1 / c - 4 * π * n * L * νm / c := by ring
    rw [this, hm, hm1]
    ring
  field_simp at hd ⊢
  nlinarith [hd, hpi]

/-- `cos δ = 1 − 2 sin²(δ/2)`. -/
theorem cos_eq_half (δ : ℝ) : cos δ = 1 - 2 * sin (δ / 2) ^ 2 := by
  have h := cos_two_mul (δ / 2)
  have h2 : 2 * (δ / 2) = δ := by ring
  rw [h2] at h
  rw [h]
  nlinarith [sin_sq_add_cos_sq (δ / 2)]

/-- Airy transmission, as a function of the round-trip phase. -/
noncomputable def airy (R δ : ℝ) : ℝ :=
  (1 - R) ^ 2 / (1 - 2 * R * cos δ + R ^ 2)

/-- The multiple-reflection series and the Airy function.

`T = 1 − R`. The series is summed to `1 / (1 − R e^{iδ})` and the
intensity ratio is the Airy function, equal to
`(1−R)² / ((1−R)² + 4R sin²(δ/2))`. -/
theorem airy_eq (R δ T : ℝ) (hR₀ : 0 < R) (hR₁ : R < 1) (hT : T = 1 - R) :
    HasSum (fun k : ℕ => ((R : ℂ) * Complex.exp (δ * Complex.I)) ^ k)
        (1 - (R : ℂ) * Complex.exp (δ * Complex.I))⁻¹ ∧
      T ^ 2 * Complex.normSq (1 - (R : ℂ) * Complex.exp (δ * Complex.I))⁻¹ = airy R δ ∧
      airy R δ = (1 - R) ^ 2 / ((1 - R) ^ 2 + 4 * R * sin (δ / 2) ^ 2) := by
  have hnorm : ‖(R : ℂ) * Complex.exp (δ * Complex.I)‖ < 1 := by
    rw [norm_mul, Complex.norm_exp_ofReal_mul_I, mul_one, Complex.norm_real,
      Real.norm_of_nonneg hR₀.le]
    exact hR₁
  have hsum := hasSum_geometric_of_norm_lt_one hnorm
  have hns : Complex.normSq (1 - (R : ℂ) * Complex.exp (δ * Complex.I)) =
      1 - 2 * R * cos δ + R ^ 2 := by
    have hre : (1 - (R : ℂ) * Complex.exp (δ * Complex.I)).re = 1 - R * cos δ := by
      simp [Complex.exp_ofReal_mul_I_re]
    have him : (1 - (R : ℂ) * Complex.exp (δ * Complex.I)).im = -(R * sin δ) := by
      simp [Complex.exp_ofReal_mul_I_im]
    rw [Complex.normSq_apply, hre, him]
    nlinarith [sin_sq_add_cos_sq δ]
  have hpos : 0 < 1 - 2 * R * cos δ + R ^ 2 := by
    nlinarith [cos_le_one δ, neg_one_le_cos δ]
  have h2 : 1 - 2 * R * cos δ + R ^ 2 = (1 - R) ^ 2 + 4 * R * sin (δ / 2) ^ 2 := by
    rw [cos_eq_half δ]
    ring
  refine ⟨hsum, ?_, ?_⟩
  · rw [Complex.normSq_inv, hns, hT]
    unfold airy
    ring
  · unfold airy
    rw [h2]

/-- Half the peak transmission exactly at `sin²(δ/2) = s²`, `s = (1−R)/(2√R)`. -/
noncomputable def sHalf (R : ℝ) : ℝ := (1 - R) / (2 * sqrt R)

theorem airy_half_iff (R δ : ℝ) (hR₀ : 0 < R) (hR₁ : R < 1) :
    airy R δ = 1 / 2 ↔ sin (δ / 2) ^ 2 = sHalf R ^ 2 := by
  have hsR : sqrt R ^ 2 = R := sq_sqrt hR₀.le
  have hsp : 0 < sqrt R := sqrt_pos.mpr hR₀
  have hden : 0 < (1 - R) ^ 2 + 4 * R * sin (δ / 2) ^ 2 := by
    have : 0 < 1 - R := by linarith
    positivity
  have e1 : airy R δ = (1 - R) ^ 2 / ((1 - R) ^ 2 + 4 * R * sin (δ / 2) ^ 2) := by
    have h2 : 1 - 2 * R * cos δ + R ^ 2 = (1 - R) ^ 2 + 4 * R * sin (δ / 2) ^ 2 := by
      rw [cos_eq_half δ]
      ring
    unfold airy
    rw [h2]
  rw [e1, div_eq_iff hden.ne']
  unfold sHalf
  rw [div_pow, mul_pow, hsR]
  constructor
  · intro h
    field_simp
    nlinarith
  · intro h
    field_simp at h
    nlinarith

theorem sHalf_pos (R : ℝ) (hR₀ : 0 < R) (hR₁ : R < 1) : 0 < sHalf R := by
  unfold sHalf
  have : 0 < sqrt R := sqrt_pos.mpr hR₀
  have : 0 < 1 - R := by linarith
  positivity

/-- Exact finesse from the two half-maximum points nearest a resonance.

`δm < 0 < δp` in `(-π, π)` are the half-maximum round-trip phases, so their
difference is the full width in phase; one free spectral range is `2π`, and
`F = 2π / (δp − δm)`.

Kind `bridge` on `PhysJS.FabryPerot.finesse_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. The exact
finesse is `π / (2 arcsin s)`; the catalog form `π√R/(1−R)` is its
small-width limit and an upper bound. -/
theorem finesse_eq (R δm δp F : ℝ) (hR₀ : 0 < R) (hR₁ : R < 1)
    (hm₀ : -π < δm) (hm₁ : δm < 0) (hp₀ : 0 < δp) (hp₁ : δp < π)
    (hm : airy R δm = 1 / 2) (hp : airy R δp = 1 / 2)
    (hF : F = 2 * π / (δp - δm)) :
    δp - δm = 4 * arcsin (sHalf R) ∧ F = π / (2 * arcsin (sHalf R)) := by
  have hpi := pi_pos
  have hspos := sHalf_pos R hR₀ hR₁
  have h1 := (airy_half_iff R δp hR₀ hR₁).mp hp
  have h2 := (airy_half_iff R δm hR₀ hR₁).mp hm
  have hsp : 0 < sin (δp / 2) :=
    sin_pos_of_pos_of_lt_pi (by linarith) (by linarith)
  have hsm : sin (δm / 2) < 0 :=
    sin_neg_of_neg_of_neg_pi_lt (by linarith) (by linarith)
  have e1 : sin (δp / 2) = sHalf R := by
    have := (sq_eq_sq₀ hsp.le hspos.le).mp h1
    exact this
  have e2 : sin (δm / 2) = -sHalf R := by
    have := (sq_eq_sq₀ (neg_nonneg.mpr hsm.le) hspos.le).mp (by rw [neg_sq]; exact h2)
    linarith
  have a1 : δp / 2 = arcsin (sHalf R) := by
    rw [← e1, arcsin_sin (by linarith) (by linarith)]
  have a2 : δm / 2 = -arcsin (sHalf R) := by
    rw [← arcsin_neg, ← e2, arcsin_sin (by linarith) (by linarith)]
  have hw : δp - δm = 4 * arcsin (sHalf R) := by linarith
  refine ⟨hw, ?_⟩
  have hapos : 0 < arcsin (sHalf R) := arcsin_pos.mpr hspos
  rw [hF, hw]
  field_simp
  ring

/-- The exact finesse never exceeds the catalog form `π√R/(1−R)`. -/
theorem finesse_le_catalog (R : ℝ) (hR₀ : 0 < R) (hR₁ : R < 1) (hs : sHalf R ≤ 1) :
    π / (2 * arcsin (sHalf R)) ≤ π * sqrt R / (1 - R) := by
  have hspos := sHalf_pos R hR₀ hR₁
  have hge : sHalf R ≤ arcsin (sHalf R) := by
    have h := sin_arcsin (by linarith : -1 ≤ sHalf R) hs
    have hn : 0 ≤ arcsin (sHalf R) := arcsin_nonneg.mpr hspos.le
    calc sHalf R = sin (arcsin (sHalf R)) := h.symm
      _ ≤ arcsin (sHalf R) := sin_le hn
  have hcat : π * sqrt R / (1 - R) = π / (2 * sHalf R) := by
    unfold sHalf
    have : 0 < 1 - R := by linarith
    have : 0 < sqrt R := sqrt_pos.mpr hR₀
    field_simp
  rw [hcat]
  apply div_le_div_of_nonneg_left pi_pos.le (by positivity)
  linarith

/-- Line width is the free spectral range over the finesse.

`δ = 4π n L ν / c` is linear in `ν`, so the phase width `δp − δm` maps to
`c (δp − δm) / (4π n L)`. -/
theorem linewidth_eq (n L c δm δp F : ℝ) (hn : 0 < n) (hL : 0 < L) (hc : 0 < c)
    (hlt : δm < δp) (hF : F = 2 * π / (δp - δm)) :
    c * (δp - δm) / (4 * π * n * L) = (c / (2 * n * L)) / F := by
  have hpi : 0 < π := pi_pos
  have hd : δp - δm ≠ 0 := by linarith
  rw [hF]
  field_simp
  norm_num

end PhysJS.FabryPerot
