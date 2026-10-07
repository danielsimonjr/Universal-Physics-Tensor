/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-182`. Bridge. Mean free path and the Ioffe–Regel criterion.

The catalog equation is

```
ℓ = v_F τ = ℏ k_F τ / m*        k_F ℓ = 2 E_F τ / ℏ
```

`mean_free_path_eq` derives it for an isotropic band with one relaxation time.
The premises are the Fermi momentum `ℏ k_F = m* v_F`, free flight at the
constant speed `v_F` (`dx/dt = v_F`, so the distance covered in the time `τ`
is `x(τ) − x(0)`), and the Fermi energy `E_F = ℏ² k_F² / (2 m*)`. From them
`ℓ = ℏ k_F τ / m*`, `k_F ℓ = 2 E_F τ / ℏ`, and the Ioffe–Regel statement
`1 ≤ k_F ℓ ↔ ℏ / τ ≤ 2 E_F`.

`coefficient_not_fixed` separates `c v_F τ` from `v_F τ` for any `c ≠ 1`:
the dimensional group `ℏ k_F² τ / m` is free, so units alone do not choose
`ℓ = v_F τ`. Not a derivation of `τ` (that is `be-143` style transport) and
not a statement about the regime `ℏ / τ ≪ E_F` beyond the equivalence above.
-/

namespace PhysJS.MeanFreePath

/-- A constant derivative is a linear function. -/
lemma linear_of_hasDerivAt (x : ℝ → ℝ) (v : ℝ) (hx : ∀ t, HasDerivAt x v t) (t : ℝ) :
    x t = x 0 + v * t := by
  have h : ∀ s, HasDerivAt (fun r => x r - v * r) 0 s := by
    intro s
    have := (hx s).sub ((hasDerivAt_id s).const_mul v)
    exact this.congr_deriv (by simp)
  have hc := is_const_of_deriv_eq_zero (f := fun r => x r - v * r)
    (fun s => (h s).differentiableAt) (fun s => (h s).deriv) t 0
  simp only [mul_zero, sub_zero] at hc
  linarith

/-- Mean free path of a degenerate Fermi gas with one relaxation time.

`hpF` is `ℏ k_F = m* v_F`. `hflight` is free flight at the Fermi speed.
`hℓ` is `ℓ = x(τ) − x(0)`. `hEF` is `E_F = ℏ² k_F² / (2 m*)`.

Kind `bridge` on `PhysJS.MeanFreePath.mean_free_path_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
derivation of `τ`, and not a statement about anisotropic bands. -/
theorem mean_free_path_eq (x : ℝ → ℝ) (ℓ vF τ ħ kF m EF : ℝ)
    (hħ : 0 < ħ) (hm : 0 < m) (hτ : 0 < τ) (hkF : 0 < kF)
    (hpF : ħ * kF = m * vF)
    (hflight : ∀ t, HasDerivAt x vF t)
    (hℓ : ℓ = x τ - x 0)
    (hEF : EF = ħ ^ 2 * kF ^ 2 / (2 * m)) :
    ℓ = vF * τ ∧ ℓ = ħ * kF * τ / m ∧ kF * ℓ = 2 * EF * τ / ħ ∧
      (1 ≤ kF * ℓ ↔ ħ / τ ≤ 2 * EF) := by
  have hlin := linear_of_hasDerivAt x vF hflight τ
  have h1 : ℓ = vF * τ := by rw [hℓ, hlin]; ring
  have hv : vF = ħ * kF / m := by
    field_simp [hm.ne']
    linarith
  have h2 : ℓ = ħ * kF * τ / m := by rw [h1, hv]; ring
  have h3 : kF * ℓ = 2 * EF * τ / ħ := by
    rw [h2, hEF]
    field_simp [hm.ne', hħ.ne']
  refine ⟨h1, h2, h3, ?_⟩
  rw [h3, le_div_iff₀ hħ, div_le_iff₀ hτ]
  constructor <;> intro h <;> linarith

/-- Any other numerical factor gives a different length. -/
theorem coefficient_not_fixed (vF τ c : ℝ) (hv : vF ≠ 0) (hτ : τ ≠ 0) (hc : c ≠ 1) :
    c * (vF * τ) ≠ vF * τ := by
  intro h
  have hp : vF * τ ≠ 0 := mul_ne_zero hv hτ
  apply hc
  have := mul_right_cancel₀ hp (by simpa using h : c * (vF * τ) = 1 * (vF * τ))
  exact this

end PhysJS.MeanFreePath
