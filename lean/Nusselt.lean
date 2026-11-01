/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.SteadyProfile
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-157`. Bridge. The Nusselt number, the wall gradient, and `Nu = 1` for conduction.

The catalog product is `Nu k = h L`. Define

```
Nu = L (−T'(0)) / (T_w − T∞)
```

at the wall `x = 0` with `T(0) = T_w`. Newton cooling equals Fourier conduction there,
`h (T_w − T∞) = −k T'(0)`, so `Nu = h L / k`. A layer of thickness `L` in pure steady
conduction (`T'' = 0`, `T(L) = T∞`) has `Nu = 1`. It is not a correlation for `Nu`.
-/

namespace PhysJS.Nusselt

open PhysJS.SteadyProfile

/-- From the film condition, the wall-gradient Nusselt number equals `h L / k`. -/
theorem nusselt_from_film (T : ℝ → ℝ) (Nu hcoeff k L Tw Tinf : ℝ)
    (hk : k ≠ 0) (hΔ : Tw - Tinf ≠ 0)
    (hfilm : hcoeff * (Tw - Tinf) = -k * deriv T 0)
    (hNu : Nu = L * (-deriv T 0) / (Tw - Tinf)) :
    Nu = hcoeff * L / k ∧ Nu * k = hcoeff * L := by
  have hcoef : hcoeff = k * (-deriv T 0) / (Tw - Tinf) := by
    field_simp
    linarith
  have hform : Nu = hcoeff * L / k := by
    rw [hNu, hcoef]
    field_simp
  refine ⟨hform, ?_⟩
  rw [hform]
  field_simp

/-- Pure steady conduction to `T(L) = T∞` has wall-gradient `Nu = 1`. -/
theorem nusselt_conduction_one (T : ℝ → ℝ) (Nu L Tw Tinf : ℝ)
    (hL : L ≠ 0) (hΔ : Tw - Tinf ≠ 0)
    (hwall : T 0 = Tw)
    (hNu : Nu = L * (-deriv T 0) / (Tw - Tinf))
    (h1 : Differentiable ℝ T) (h2 : Differentiable ℝ (deriv T))
    (h0 : ∀ x, deriv (deriv T) x = 0)
    (hfar : T L = Tinf) :
    Nu = 1 := by
  rw [hNu, slab_slope T L hL h1 h2 h0 0, hfar, hwall]
  field_simp
  ring

/-- If the far face is not held at `T∞`, the same linear layer does not have `Nu = 1`. -/
theorem nusselt_far_not_one (T : ℝ → ℝ) (Nu L Tw Tinf Tfar : ℝ)
    (hL : L ≠ 0) (hΔ : Tw - Tinf ≠ 0) (hfar' : Tfar ≠ Tinf)
    (hwall : T 0 = Tw)
    (hNu : Nu = L * (-deriv T 0) / (Tw - Tinf))
    (h1 : Differentiable ℝ T) (h2 : Differentiable ℝ (deriv T))
    (h0 : ∀ x, deriv (deriv T) x = 0)
    (hfar : T L = Tfar) :
    Nu ≠ 1 := by
  intro h1Nu
  rw [hNu, slab_slope T L hL h1 h2 h0 0, hfar, hwall] at h1Nu
  field_simp at h1Nu
  have : Tfar = Tinf := by linarith
  exact hfar' this

/-- Doubling `h` doubles `Nu = h L / k` at fixed `k` and `L`. -/
theorem nusselt_double_h (Nu Nu' hcoeff k L : ℝ) (hk : k ≠ 0)
    (hNu : Nu = hcoeff * L / k) (hNu' : Nu' = (2 * hcoeff) * L / k) :
    Nu' = 2 * Nu := by
  rw [hNu', hNu]
  field_simp [hk]

/-- `Nu = h L / k` is the wall gradient, and a conducting layer has `Nu = 1`.

`hNu` defines `Nu` from the wall gradient; `hfilm` is `h (T_w − T∞) = −k T'(0)`. -/
theorem nusselt_eq (T : ℝ → ℝ) (Nu hcoeff k L Tw Tinf : ℝ)
    (hk : k ≠ 0) (hL : L ≠ 0) (hΔ : Tw - Tinf ≠ 0)
    (hwall : T 0 = Tw)
    (hfilm : hcoeff * (Tw - Tinf) = -k * deriv T 0)
    (hNu : Nu = L * (-deriv T 0) / (Tw - Tinf)) :
    Nu = L * (-deriv T 0) / (Tw - Tinf) ∧ Nu = hcoeff * L / k ∧ Nu * k = hcoeff * L ∧
      (Differentiable ℝ T → Differentiable ℝ (deriv T) → (∀ x, deriv (deriv T) x = 0) →
        T L = Tinf → Nu = 1) := by
  obtain ⟨hform, hprod⟩ := nusselt_from_film T Nu hcoeff k L Tw Tinf hk hΔ hfilm hNu
  refine ⟨hNu, hform, hprod, ?_⟩
  intro h1 h2 h0 hfar
  exact nusselt_conduction_one T Nu L Tw Tinf hL hΔ hwall hNu h1 h2 h0 hfar

/-- Linear profile `T(x) = T_w + (T∞ − T_w) (x / L)` has wall-gradient `Nu = 1`. -/
theorem nusselt_conduction_profile (Tw Tinf L : ℝ) (hL : L ≠ 0) (hΔ : Tw - Tinf ≠ 0) :
    L * (-((Tinf - Tw) / L)) / (Tw - Tinf) = 1 := by
  field_simp [hL, hΔ]
  ring

/-- Catalog inputs `h = 40`, `L = 0.2`, `k = 0.026` give `Nu = 4000/13`. -/
theorem nusselt_catalog :
    (40 : ℝ) * (2 / 10) / (26 / 1000) = 4000 / 13 := by
  norm_num

/-- A conducting fluid layer with `Nu = 1` does not force the solid Biot number to `1`.
The two lengths and conductivities are different materials. -/
theorem nusselt_one_not_biot_one (Nu Bi hsolid ksolid Lsolid : ℝ)
    (hNu : Nu = 1) (hk : ksolid ≠ 0)
    (hBi : Bi = hsolid * Lsolid / ksolid)
    (hne : hsolid * Lsolid ≠ ksolid) :
    Nu = 1 ∧ Bi ≠ 1 := by
  refine ⟨hNu, ?_⟩
  intro hBi1
  have : hsolid * Lsolid = ksolid := by
    rw [hBi] at hBi1
    field_simp [hk] at hBi1
    linarith
  exact hne this

end PhysJS.Nusselt
