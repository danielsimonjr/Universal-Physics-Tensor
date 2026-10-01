/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Einstein
import Mathlib.Algebra.BigOperators.Ring.Finset
import Mathlib.Tactic.FieldSimp

/-!
`be-17`. Derivation step. The torsion–spin inversion, not the field equation.

`κ` is `PhysJS.Einstein.kappa`, `8πG/c⁴`. If every component satisfies
`T = κ S` and `κ ≠ 0`, the squared contractions obey

```
S·S = T·T / κ² = (c⁴ / (8πG))² T·T
```

`κ²` in the numerator is that inversion run backwards. It agrees with the
true quotient only when `κ⁴ = 1`, so the control assumes `κ⁴ ≠ 1`, and it
needs a nonzero contraction. The Einstein–Cartan field equation and any
Newtonian limit are not this statement.
-/

namespace PhysJS.EinsteinCartan

open Finset Real Einstein

/-- Squared contraction `v·v = ∑ vᵢ²`, summed over the components. -/
def dot {ι : Type*} [Fintype ι] (v : ι → ℝ) : ℝ :=
  ∑ i, v i ^ 2

/-- Componentwise scaling `T = κ S` inverts on the squared contraction. -/
lemma scale {ι : Type*} [Fintype ι] (κ : ℝ) (T S : ι → ℝ) (hκ : κ ≠ 0)
    (h : ∀ i, T i = κ * S i) :
    dot S = dot T / κ ^ 2 := by
  have hT : dot T = κ ^ 2 * dot S := by
    unfold dot
    simp_rw [h, mul_pow]
    rw [← Finset.mul_sum]
  rw [hT]
  field_simp [hκ]

/-- `S·S = T·T / κ²` for `κ = 8πG/c⁴ ≠ 0`.

Covers the derivation step of `be-17`. Not the Einstein–Cartan field
equation, and not a Newtonian limit. -/
theorem inversion {ι : Type*} [Fintype ι] (G c : ℝ) (T S : ι → ℝ)
    (hκ : kappa G c ≠ 0) (h : ∀ i, T i = kappa G c * S i) :
    kappa G c = 8 * π * G / c ^ 4 ∧
      dot S = dot T / kappa G c ^ 2 ∧
      dot S = (c ^ 4 / (8 * π * G)) ^ 2 * dot T := by
  refine ⟨rfl, scale (kappa G c) T S hκ h, ?_⟩
  have hnum : (8 : ℝ) * π * G ≠ 0 := by
    intro h0
    apply hκ
    simp [kappa, h0]
  have hc : c ≠ 0 := by
    intro hc0
    apply hκ
    simp [kappa, hc0]
  have hinv : (kappa G c)⁻¹ = c ^ 4 / (8 * π * G) := by
    unfold kappa
    field_simp [hnum, hc]
  rw [scale (kappa G c) T S hκ h, div_eq_mul_inv, ← inv_pow, hinv, mul_comm]

/-- `κ²` in the numerator is the inversion run backwards. -/
theorem wrong_dictionary {ι : Type*} [Fintype ι] (κ : ℝ) (T S : ι → ℝ) (hκ : κ ≠ 0)
    (h : ∀ i, T i = κ * S i) (hT : dot T ≠ 0) (hκ4 : κ ^ 4 ≠ 1) :
    κ ^ 2 * dot T ≠ dot S := by
  intro hbad
  have htrue := scale κ T S hκ h
  have : κ ^ 2 * dot T = dot T / κ ^ 2 := by
    rw [← htrue]
    exact hbad
  field_simp [hκ, hT] at this
  exact hκ4 this

end PhysJS.EinsteinCartan
