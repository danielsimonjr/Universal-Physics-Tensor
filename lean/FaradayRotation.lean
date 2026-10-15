/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.MeasureTheory.Integral.IntervalIntegral.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-200`. Bridge. Faraday rotation measure.

The catalog equation is

```
Δχ = RM λ²,    RM = e³ / (8 π² ε0 m_e² c³) ∫ n B_∥ dl
```

Proved under these hypotheses. Circularly polarized waves in a cold
magnetized plasma along the field have the Stix indices
`n_R² = 1 − X/(1 − Y)` and `n_L² = 1 − X/(1 + Y)` with
`X = ω_p²/ω²`, `Y = ω_c/ω` (`be-106`). `index_square_difference` is the
exact `n_R² − n_L² = −2 X Y/(1 − Y²)`. The quasi-longitudinal,
`ω ≫ ω_p, ω_c` premise is `(n_R + n_L)(1 − Y²) = 2`; with it
`wavenumber_difference` gives `k_L − k_R = ω_p² ω_c / (c ω²)` for
`k = ω n / c`. The polarization angle turns by half the accumulated phase
difference, `Δχ = ½ ∫ (k_L − k_R) dl` (a sign convention: the opposite
convention flips the overall sign). With `ω_p² = n e²/(ε0 m)`,
`ω_c = e B_∥/m` and `ω = 2π c/λ`, `rotation_eq` is the displayed law.
`rotation_odd` shows the sign of `B_∥` is carried, so a magnitude-only
formula is a different quantity.

Not proved: the Appleton-Hartree expansion beyond the stated premise,
Faraday thinness of the screen, or the decimal
0.812 rad m⁻² per cm⁻³ µG pc.
-/

namespace PhysJS.FaradayRotation

open intervalIntegral

/-- Exact difference of the squared R and L indices. -/
theorem index_square_difference (nR nL X Y : ℝ) (hY : Y ^ 2 ≠ 1)
    (hR : nR ^ 2 = 1 - X / (1 - Y)) (hL : nL ^ 2 = 1 - X / (1 + Y)) :
    nR ^ 2 - nL ^ 2 = -2 * X * Y / (1 - Y ^ 2) := by
  have h1 : 1 - Y ≠ 0 := by
    intro h; apply hY; have : Y = 1 := by linarith
    rw [this]; norm_num
  have h2 : 1 + Y ≠ 0 := by
    intro h; apply hY; have : Y = -1 := by linarith
    rw [this]; norm_num
  have h3 : 1 - Y ^ 2 ≠ 0 := fun h => hY (by linarith)
  rw [hR, hL]
  field_simp
  ring

/-- Wavenumber difference at leading order. `hquasi` is
`(n_R + n_L)(1 − Y²) = 2`. -/
theorem wavenumber_difference (nR nL X Y ω c kR kL : ℝ) (hc : c ≠ 0) (hω : ω ≠ 0)
    (hY : Y ^ 2 ≠ 1)
    (hR : nR ^ 2 = 1 - X / (1 - Y)) (hL : nL ^ 2 = 1 - X / (1 + Y))
    (hquasi : (nR + nL) * (1 - Y ^ 2) = 2)
    (hkR : kR = ω * nR / c) (hkL : kL = ω * nL / c) :
    kL - kR = ω * X * Y / c := by
  have hd := index_square_difference nR nL X Y hY hR hL
  have h3 : 1 - Y ^ 2 ≠ 0 := fun h => hY (by linarith)
  have hdiff : (nR + nL) * (nR - nL) = -2 * X * Y / (1 - Y ^ 2) := by
    rw [← hd]; ring
  have hnn : nL - nR = X * Y := by
    have h4 : (nR + nL) * (1 - Y ^ 2) * (nR - nL) = -2 * X * Y := by
      field_simp at hdiff
      linarith
    rw [hquasi] at h4
    linarith
  rw [hkL, hkR]
  field_simp
  linarith

/-- Rotation angle from the leading-order phase difference. -/
theorem rotation_eq (e ε0 m c lam L Δχ : ℝ) (n B kdiff : ℝ → ℝ)
    (hε : ε0 ≠ 0) (hm : m ≠ 0) (hc : c ≠ 0) (hlam : lam ≠ 0)
    (hk : ∀ l, kdiff l = (n l * e ^ 2 / (ε0 * m)) * (e * B l / m) /
      (c * (2 * Real.pi * c / lam) ^ 2))
    (hΔχ : Δχ = ∫ l in (0 : ℝ)..L, kdiff l / 2) :
    Δχ = (e ^ 3 / (8 * Real.pi ^ 2 * ε0 * m ^ 2 * c ^ 3) *
      ∫ l in (0 : ℝ)..L, n l * B l) * lam ^ 2 := by
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  have hfun : (fun l => kdiff l / 2) =
      fun l => (e ^ 3 * lam ^ 2 / (8 * Real.pi ^ 2 * ε0 * m ^ 2 * c ^ 3)) * (n l * B l) := by
    funext l
    rw [hk l]
    field_simp
    ring
  rw [hΔχ, hfun, intervalIntegral.integral_const_mul]
  ring

/-- Rotation measure as a functional of the signed field. -/
noncomputable def rm (K : ℝ) (n B : ℝ → ℝ) (L : ℝ) : ℝ :=
  K * ∫ l in (0 : ℝ)..L, n l * B l

/-- Reversing the field reverses the rotation measure. -/
theorem rotation_odd (K L : ℝ) (n B : ℝ → ℝ) :
    rm K n (fun l => -B l) L = -rm K n B L := by
  unfold rm
  have : (fun l => n l * -B l) = fun l => (-1 : ℝ) * (n l * B l) := by
    funext l; ring
  rw [this, intervalIntegral.integral_const_mul]
  ring

/-- Signed and absolute line-of-sight fields differ: a reversed field
gives a negative integral, not the magnitude. -/
theorem sign_matters :
    (∫ _ in (0 : ℝ)..1, (1 : ℝ) * (-1)) ≠ ∫ _ in (0 : ℝ)..1, (1 : ℝ) * |(-1 : ℝ)| := by
  simp
  norm_num

end PhysJS.FaradayRotation
