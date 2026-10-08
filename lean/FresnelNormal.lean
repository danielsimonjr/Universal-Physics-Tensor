/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-227`. Bridge. Fresnel reflectance at normal incidence.

The catalog equation is

```
R = ((n₁ − n₂) / (n₁ + n₂))²
```

`reflectance_eq` derives it from impedance matching at a planar interface
between two lossless, non-magnetic dielectrics. The tangential electric
field is continuous, `E_i + E_r = E_t`. The tangential magnetic field is
continuous, and for a non-magnetic medium a plane wave has `H = n E / (μ0 c)`
with the reflected wave travelling backwards, so
`n₁ (E_i − E_r) = n₂ E_t`. Solving the two linear equations gives the
amplitude coefficients `r = (n₁ − n₂)/(n₁ + n₂)` and `t = 2 n₁/(n₁ + n₂)`.
The reflectance is `R = r²`. The transmittance `T = (n₂/n₁) t²` is the
energy flux ratio, and `R + T = 1` follows. The same algebra with
acoustic impedances in place of indices gives the acoustic reflectance.
Not covered: oblique incidence, absorbing media, magnetic media, thin films.
-/

namespace PhysJS.FresnelNormal

/-- Reflection and transmission amplitudes from continuity of `E` and `H`.

`hE` is continuity of the tangential electric field. `hH` is continuity of
the tangential magnetic field with `H = n E Y0`, `Y0 = 1/(μ0 c)`, the sign
of the reflected wave reversed. `R` is the intensity reflectance `(E_r/E_i)²`
and `T` the energy flux ratio `n₂ E_t² / (n₁ E_i²)`.

Not
oblique incidence and not absorbing media. -/
theorem reflectance_eq (n₁ n₂ Y0 Ei Er Et R T : ℝ)
    (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) (hY0 : Y0 ≠ 0) (hEi : Ei ≠ 0)
    (hE : Ei + Er = Et)
    (hH : n₁ * Y0 * (Ei - Er) = n₂ * Y0 * Et)
    (hR : R = (Er / Ei) ^ 2)
    (hT : T = n₂ * Et ^ 2 / (n₁ * Ei ^ 2)) :
    Er / Ei = (n₁ - n₂) / (n₁ + n₂) ∧
      Et / Ei = 2 * n₁ / (n₁ + n₂) ∧
      R = ((n₁ - n₂) / (n₁ + n₂)) ^ 2 ∧
      T = 4 * n₁ * n₂ / (n₁ + n₂) ^ 2 ∧ R + T = 1 := by
  have hsum : n₁ + n₂ ≠ 0 := by positivity
  have hH' : n₁ * (Ei - Er) = n₂ * Et := by
    have := hH
    have h2 : Y0 * (n₁ * (Ei - Er) - n₂ * Et) = 0 := by linarith
    rcases mul_eq_zero.mp h2 with h | h
    · exact absurd h hY0
    · linarith
  have hEt : Et = Ei + Er := hE.symm
  have hEr : Er * (n₁ + n₂) = Ei * (n₁ - n₂) := by
    rw [hEt] at hH'
    linarith
  have hr : Er / Ei = (n₁ - n₂) / (n₁ + n₂) := by
    field_simp [hEi, hsum]
    linarith
  have ht : Et / Ei = 2 * n₁ / (n₁ + n₂) := by
    rw [hEt, add_div, div_self hEi, hr]
    field_simp [hsum]
    ring
  have hRv : R = ((n₁ - n₂) / (n₁ + n₂)) ^ 2 := by rw [hR, hr]
  have hTv : T = 4 * n₁ * n₂ / (n₁ + n₂) ^ 2 := by
    have : Et ^ 2 / Ei ^ 2 = (Et / Ei) ^ 2 := by rw [div_pow]
    rw [hT]
    have h1 : n₂ * Et ^ 2 / (n₁ * Ei ^ 2) = (n₂ / n₁) * (Et / Ei) ^ 2 := by
      field_simp [hn₁.ne', hEi]
    rw [h1, ht]
    field_simp [hn₁.ne', hsum]
    ring
  refine ⟨hr, ht, hRv, hTv, ?_⟩
  rw [hRv, hTv]
  field_simp [hsum]
  ring

/-- The reflectance is unchanged when the two media are swapped. -/
theorem reflectance_symm (n₁ n₂ : ℝ) :
    ((n₁ - n₂) / (n₁ + n₂)) ^ 2 = ((n₂ - n₁) / (n₂ + n₁)) ^ 2 := by
  rw [add_comm n₂ n₁, ← neg_sub n₁ n₂, neg_div, neg_sq]

/-- Air to glass: `n = 1.5` reflects 4 percent. -/
theorem air_glass : ((1 - (3 / 2 : ℝ)) / (1 + 3 / 2)) ^ 2 = 1 / 25 := by norm_num

/-- The amplitude coefficient is not the reflectance: for distinct positive
indices `r² ≠ r`. -/
theorem amplitude_not_reflectance (n₁ n₂ : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂)
    (hne : n₁ ≠ n₂) :
    ((n₁ - n₂) / (n₁ + n₂)) ^ 2 ≠ (n₁ - n₂) / (n₁ + n₂) := by
  intro h
  have hsum : n₁ + n₂ ≠ 0 := by positivity
  field_simp [hsum] at h
  have : (n₁ - n₂) * (n₁ - n₂ - (n₁ + n₂)) = 0 := by nlinarith
  rcases mul_eq_zero.mp this with h1 | h1
  · exact hne (by linarith)
  · linarith

/-- Matched media do not reflect. -/
theorem matched_no_reflection (n : ℝ) :
    ((n - n) / (n + n)) ^ 2 = 0 := by
  simp

end PhysJS.FresnelNormal
