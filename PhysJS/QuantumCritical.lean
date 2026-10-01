/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Dimensional
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-33`. The catalog scaling, and the finite-temperature product at `z = 1`.

For `z > 0`, `T > 0`, and `T₀ > 0`, the encoded scaling is

```
ξ(T) = ξ₀ (T / T₀) ^ (−1 / z)
```

At `z = 1`, `ξ T = ξ₀ T₀`. The retired exponent `−ν/z` is not `−1/z`
when `ν ≠ 1`. The module's old pin `−0.71 = −71/100` fails `−1/z` at
`z = 1`. At `T = T₀` every exponent agrees, so that direction assumes
`T ≠ T₀`. This is not Hertz–Millis theory, and it does not choose a
universality class.

`scaling_shape` is the Buckingham step. Its hypothesis is that `ξ` is a
dimensionally homogeneous function of a length `ξ₀` and two temperatures.
The conclusion is `ξ = ξ₀ φ(T/T₀)`. The function `φ` is not fixed, so the
exponent `−1/z` is not a conclusion. `every_power_homogeneous` records that
every real power of the temperature ratio has the same homogeneity.
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

/-- The catalog scaling

```
ξ(T) = ξ₀ (T / T₀) ^ (−1 / z)
```

and, at `z = 1`, `ξ(T) = ξ₀ (T / T₀) ^ (−1) = ξ₀ T₀ / T`.
`xi_product` remains the product `ξ T = ξ₀ T₀`. Not Hertz–Millis theory. -/
theorem thermal_scaling (xi0 T T0 z : ℝ) (hT : 0 < T) (hT0 : 0 < T0) :
    xi xi0 T T0 z = xi0 * (T / T0) ^ (-1 / z) ∧
      xi xi0 T T0 1 = xi0 * (T / T0) ^ (-(1 : ℝ)) ∧
      xi xi0 T T0 1 = xi0 * T0 / T := by
  refine ⟨rfl, ?_, ?_⟩
  · unfold xi
    norm_num
  · unfold xi
    have hexp : (-1 : ℝ) / 1 = -1 := by norm_num
    rw [hexp, rpow_neg_one, inv_div]
    field_simp [hT.ne', hT0.ne']

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

/-- Hypothesis: `ξ` is dimensionally homogeneous in a length `ξ₀` and two
temperatures. Then `ξ = ξ₀ φ(T/T₀)` with `φ(u) = f(1, u, 1)`.

`φ` is not fixed. The catalog exponent `−1/z` is not a conclusion, and this
is not Hertz–Millis theory. -/
theorem scaling_shape (f : ℝ → ℝ → ℝ → ℝ)
    (hf : ∀ lams lame s a b, 0 < lams → 0 < lame → 0 < s → 0 < a → 0 < b →
      f (lams * s) (lame * a) (lame * b) = lams * f s a b)
    {xi0 T T0 : ℝ} (hxi : 0 < xi0) (hT : 0 < T) (hT0 : 0 < T0) :
    f xi0 T T0 = xi0 * f 1 (T / T0) 1 :=
  Dimensional.ratio_shape f hf hxi hT hT0

/-- Every real power of `T/T₀` is dimensionally homogeneous. The exponent is
not chosen. -/
theorem every_power_homogeneous (p lams lame xi0 T T0 : ℝ)
    (hlams : 0 < lams) (hlame : 0 < lame) (hxi : 0 < xi0) (hT : 0 < T) (hT0 : 0 < T0) :
    0 < lams * xi0 ∧ 0 < T / T0 ∧
      (lams * xi0) * ((lame * T) / (lame * T0)) ^ p = lams * (xi0 * (T / T0) ^ p) := by
  refine ⟨mul_pos hlams hxi, div_pos hT hT0, ?_⟩
  rw [Dimensional.ratio_power_invariant p lame T T0 hlame.ne']
  exact mul_assoc lams xi0 ((T / T0) ^ p)

end PhysJS.QuantumCritical
