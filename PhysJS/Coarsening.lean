/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-15`. Derivation step. `z = 2` if and only if `L² ∝ t`.

For `Γ > 0`, `t > 0`, and `z > 0`,

```
L(t) = L₀ (t / t₀) ^ (1 / z)
Γ = L₀² / t₀
```

obeys `L(t)² = Γ t` if and only if `z = 2`. At `t = t₀` the ratio holds
for every `z`, so that direction assumes `t ≠ t₀`. Model B's `z = 3`
gives `L³ ∝ t` and fails `L² = Γ t`. This is not the Model A Langevin
equation. The Langevin kinetic coefficient is a different `Γ`.
-/

namespace PhysJS.Coarsening

open Real

/-- Scaling `L(t) = L₀ (t / t₀) ^ (1 / z)`. -/
noncomputable def length (L0 t t0 z : ℝ) : ℝ :=
  L0 * (t / t0) ^ (1 / z)

/-- Coarsening constant `Γ = L₀² / t₀`. -/
noncomputable def gammaConst (L0 t0 : ℝ) : ℝ :=
  L0 ^ 2 / t0

lemma rpow_eq_one_iff {r a : ℝ} (hr : 0 < r) (hr1 : r ≠ 1) : r ^ a = 1 ↔ a = 0 := by
  constructor
  · intro h
    have hlog : a * log r = 0 := by
      have := congrArg log h
      rwa [log_rpow hr, log_one] at this
    exact (mul_eq_zero.mp hlog).resolve_right (log_ne_zero_of_pos_of_ne_one hr hr1)
  · rintro rfl
    exact rpow_zero r

lemma ratio (L0 t t0 z : ℝ) (ht : 0 < t) (ht0 : 0 < t0) (hz : 0 < z) :
    length L0 t t0 z ^ 2 / t = gammaConst L0 t0 * (t / t0) ^ (2 / z - 1) := by
  have hr : 0 < t / t0 := div_pos ht ht0
  unfold length gammaConst
  have hsq : ((t / t0) ^ (1 / z)) ^ 2 = (t / t0) ^ (2 / z) := by
    rw [← rpow_two, ← rpow_mul hr.le]
    congr 1
    field_simp [hz.ne']
  rw [mul_pow, hsq, rpow_sub_one hr.ne']
  field_simp [ht.ne', ht0.ne']

/-- `L(t)² = Γ t` if and only if `z = 2`.

Covers the derivation step of `be-15`. Not the Langevin equation. -/
theorem exponent_iff (L0 t t0 z : ℝ) (hL : L0 ≠ 0) (ht : 0 < t) (ht0 : 0 < t0)
    (hz : 0 < z) (htne : t ≠ t0) :
    0 < gammaConst L0 t0 ∧
      (length L0 t t0 z ^ 2 / t = gammaConst L0 t0 ↔ z = 2) := by
  refine ⟨div_pos (sq_pos_of_ne_zero hL) ht0, ?_⟩
  have hr : 0 < t / t0 := div_pos ht ht0
  have hr1 : t / t0 ≠ 1 := by
    intro h
    field_simp [ht0.ne'] at h
    exact htne h
  rw [ratio L0 t t0 z ht ht0 hz]
  constructor
  · intro h
    have hΓ : gammaConst L0 t0 ≠ 0 := (div_pos (sq_pos_of_ne_zero hL) ht0).ne'
    have hpow : (t / t0) ^ (2 / z - 1) = 1 := by
      apply mul_left_cancel₀ hΓ
      rw [mul_one]
      exact h
    have hexp : 2 / z - 1 = 0 := (rpow_eq_one_iff hr hr1).mp hpow
    have hdiv : 2 / z = 1 := by linarith
    have : 2 = 1 * z := (div_eq_iff hz.ne').mp hdiv
    linarith
  · intro hz2
    rw [hz2]
    have : (2 : ℝ) / 2 - 1 = 0 := by norm_num
    rw [this, rpow_zero, mul_one]

/-- Model B's `z = 3` gives `L³ ∝ t` and fails `L² = Γ t`. -/
theorem wrong_dictionary (L0 t t0 : ℝ) (hL : L0 ≠ 0) (ht : 0 < t) (ht0 : 0 < t0)
    (htne : t ≠ t0) :
    length L0 t t0 3 ^ 3 / t = L0 ^ 3 / t0 ∧
      length L0 t t0 3 ^ 2 / t ≠ gammaConst L0 t0 := by
  have hr : 0 < t / t0 := div_pos ht ht0
  refine ⟨?_, ?_⟩
  · unfold length
    have hcube : ((t / t0) ^ (1 / (3 : ℝ))) ^ 3 = t / t0 := by
      rw [← rpow_natCast, ← rpow_mul hr.le]
      have : (1 / (3 : ℝ)) * (3 : ℕ) = 1 := by norm_num
      rw [this, rpow_one]
    rw [mul_pow, hcube]
    field_simp [ht.ne', ht0.ne']
  · have hiff :=
      (exponent_iff L0 t t0 3 hL ht ht0 (by norm_num : (0 : ℝ) < 3) htne).2
    intro h
    exact (by norm_num : (3 : ℝ) ≠ 2) (hiff.mp h)

end PhysJS.Coarsening
