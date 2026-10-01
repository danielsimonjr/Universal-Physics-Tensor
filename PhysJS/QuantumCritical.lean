/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-33`. Derivation step. The finite-temperature exponent `−1/z`.

For `z > 0`, `T > 0`, and `T₀ > 0`, the encoded scaling is

```
ξ(T) = ξ₀ (T / T₀) ^ (−1 / z)
```

At `z = 1`, `ξ T = ξ₀ T₀`. The retired exponent `−ν/z` is not `−1/z`
when `ν ≠ 1`. The module's old pin `−0.71 = −71/100` fails `−1/z` at
`z = 1`. At `T = T₀` every exponent agrees, so that direction assumes
`T ≠ T₀`. This is not Hertz–Millis theory, and it does not choose a
universality class.
-/

namespace PhysJS.QuantumCritical

open Real

/-- Encoded scaling `ξ(T) = ξ₀ (T / T₀) ^ (−1 / z)`. -/
noncomputable def xi (xi0 T T0 z : ℝ) : ℝ :=
  xi0 * (T / T0) ^ (-1 / z)

/-- Retired scaling `ξ₀ (T / T₀) ^ (−ν / z)`. -/
noncomputable def xiRetired (xi0 T T0 ν z : ℝ) : ℝ :=
  xi0 * (T / T0) ^ (-ν / z)

lemma rpow_eq_rpow_iff {r a b : ℝ} (hr : 0 < r) (hr1 : r ≠ 1) : r ^ a = r ^ b ↔ a = b := by
  constructor
  · intro h
    have hlog : a * log r = b * log r := by
      have := congrArg log h
      rwa [log_rpow hr, log_rpow hr] at this
    have hsub : (a - b) * log r = 0 := by
      rw [sub_mul, hlog, sub_self]
    exact sub_eq_zero.mp ((mul_eq_zero.mp hsub).resolve_right (log_ne_zero_of_pos_of_ne_one hr hr1))
  · rintro rfl
    rfl

/-- At `z = 1`, `ξ T = ξ₀ T₀`.

Covers the derivation step of `be-33`. Not Hertz–Millis theory. -/
theorem xi_product (xi0 T T0 : ℝ) (hT : 0 < T) (hT0 : 0 < T0) :
    xi xi0 T T0 1 * T = xi0 * T0 := by
  unfold xi
  have hexp : (-1 : ℝ) / 1 = -1 := by norm_num
  rw [hexp, rpow_neg_one, inv_div]
  field_simp [hT.ne']

/-- The retired exponent `−ν/z` fails `−1/z` at `z = 1` when `ν ≠ 1`.

At `T = T₀` the two scalings agree, so the product comparison assumes
`T ≠ T₀`. -/
theorem wrong_exponent (xi0 T T0 ν : ℝ) (hxi : xi0 ≠ 0) (hT : 0 < T) (hT0 : 0 < T0)
    (hne : T ≠ T0) (hν : ν ≠ 1) :
    -ν / 1 ≠ -1 / 1 ∧ xiRetired xi0 T T0 ν 1 * T ≠ xi0 * T0 := by
  refine ⟨?_, ?_⟩
  · intro h
    rw [div_one, div_one] at h
    exact hν (by linarith)
  · intro hbad
    have hr : 0 < T / T0 := div_pos hT hT0
    have hr1 : T / T0 ≠ 1 := by
      intro h
      field_simp [hT0.ne'] at h
      exact hne h
    have htrue := xi_product xi0 T T0 hT hT0
    have heq : xiRetired xi0 T T0 ν 1 = xi xi0 T T0 1 :=
      mul_right_cancel₀ hT.ne' (hbad.trans htrue.symm)
    unfold xi xiRetired at heq
    have hpow : (T / T0) ^ (-ν / 1) = (T / T0) ^ ((-1 : ℝ) / 1) := mul_left_cancel₀ hxi heq
    have : -ν / 1 = (-1 : ℝ) / 1 := (rpow_eq_rpow_iff hr hr1).mp hpow
    rw [div_one, div_one] at this
    exact hν (by linarith)

/-- The old pin `−0.71 = −71/100` fails `−1` at `z = 1`. -/
theorem old_pin_fails (xi0 T T0 : ℝ) (hxi : xi0 ≠ 0) (hT : 0 < T) (hT0 : 0 < T0)
    (hne : T ≠ T0) :
    -((71 : ℝ) / 100) / 1 ≠ -1 / 1 ∧
      xiRetired xi0 T T0 (71 / 100) 1 * T ≠ xi0 * T0 := by
  exact wrong_exponent xi0 T T0 ((71 : ℝ) / 100) hxi hT hT0 hne (by norm_num)

end PhysJS.QuantumCritical
