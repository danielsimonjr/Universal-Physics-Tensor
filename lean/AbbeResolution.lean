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
`be-229`. Bridge. Abbe resolution of a periodic object.

The catalog equation is

```
d = λ / (2 NA),   NA = n sin θ
```

`resolution_eq` derives it from the grating equation. A periodic object of
period `d` in a medium of index `n`, lit by a plane wave at angle `θ_i`,
sends its first order to `n sin θ₁ = n sin θ_i + λ/d`. The image carries
the period only if both the zeroth and the first order pass the objective,
`|n sin θ_i| ≤ NA` and `|n sin θ₁| ≤ NA`. Subtracting gives `λ/d ≤ 2 NA`,
so `d ≥ λ/(2 NA)`, with equality exactly for the symmetric oblique setting
`n sin θ_i = −NA`, `n sin θ₁ = +NA`.

Discrepancy with the report. The report states `λ/(2 NA)` for coherent
axial illumination. With axial illumination `n sin θ_i = 0` the same
argument gives the weaker `d ≥ λ/NA` (`axial_resolution`); the factor of 2
needs oblique (or matched-condenser) illumination. `illumination_resolution`
is the general `d ≥ λ/(NA + NA_ill)`. Scalar theory, a grating object, no
aberrations. The 1/2 is therefore a statement about the illumination
geometry, not a universal constant.
-/

namespace PhysJS.AbbeResolution

/-- Smallest transmitted period for the symmetric oblique setting.

`hgrat` is the first-order grating equation `n sin θ₁ = n sin θ_i + λ/d`,
written with `si = n sin θ_i` and `s1 = n sin θ₁`. `hlo`, `hhi` say both
orders lie in the numerical aperture, `NA`, and the setting is symmetric.

Not
axial illumination, which gives `λ/NA`. -/
theorem resolution_eq (lam d NA si s1 : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hNA : 0 < NA)
    (hgrat : s1 = si + lam / d)
    (hsi : si = -NA) (hs1 : s1 = NA) :
    d = lam / (2 * NA) := by
  have h : lam / d = 2 * NA := by linarith
  field_simp at h ⊢
  linarith

/-- Both orders in the aperture bound the period from below. -/
theorem period_bound (lam d NA si s1 : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hNA : 0 < NA)
    (hgrat : s1 = si + lam / d)
    (hsi : |si| ≤ NA) (hs1 : |s1| ≤ NA) :
    lam / (2 * NA) ≤ d := by
  have h1 : lam / d ≤ 2 * NA := by
    have := (abs_le.mp hsi).1
    have := (abs_le.mp hs1).2
    linarith
  rw [div_le_iff₀ (by positivity)]
  rw [div_le_iff₀ hd] at h1
  nlinarith

/-- With illumination confined to `|n sin θ_i| ≤ NAi` the bound is
`d ≥ λ/(NA + NAi)`. -/
theorem illumination_resolution (lam d NA NAi si s1 : ℝ) (hlam : 0 < lam)
    (hd : 0 < d) (hNA : 0 < NA) (hNAi : 0 ≤ NAi)
    (hgrat : s1 = si + lam / d)
    (hsi : |si| ≤ NAi) (hs1 : |s1| ≤ NA) :
    lam / (NA + NAi) ≤ d := by
  have h1 : lam / d ≤ NA + NAi := by
    have := (abs_le.mp hsi).1
    have := (abs_le.mp hs1).2
    linarith
  rw [div_le_iff₀ (by positivity)]
  rw [div_le_iff₀ hd] at h1
  nlinarith

/-- Axial illumination: the bound is `λ/NA`, twice `λ/(2 NA)`. -/
theorem axial_resolution (lam d NA s1 : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hNA : 0 < NA)
    (hgrat : s1 = 0 + lam / d) (hs1 : |s1| ≤ NA) :
    lam / NA ≤ d := by
  have := illumination_resolution lam d NA 0 0 s1 hlam hd hNA le_rfl hgrat
    (by simp) hs1
  simpa using this

/-- `λ/(2 NA)` is not transmitted by axial illumination. -/
theorem half_period_not_axial (lam NA : ℝ) (hlam : 0 < lam) (hNA : 0 < NA) :
    lam / (2 * NA) < lam / NA := by
  apply div_lt_div_of_pos_left hlam hNA
  linarith

end PhysJS.AbbeResolution
