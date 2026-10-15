/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-125`. Bridge. The mirror threshold.

Proved under this criterion, not under a kinetic integral. The
bi-Maxwellian mirror mode is unstable exactly when

```
β_⊥ (T_⊥ / T_∥ − 1) > 1
```

with the `be-76` beta `β_⊥ = 2 μ0 p_⊥ / B²` and `β_⊥ > 0`, `T_∥ > 0`.
That inequality is `T_⊥ / T_∥ − 1 > 1/β_⊥`. A beta that omits the `2`,
`β_no2 = μ0 p / B² = β/2`, turns the threshold `1/β_no2` into `2/β`.
Writing `2/β` against the `be-76` beta is that other convention.
`PhysJS.PlasmaBeta.beta_eq` does not prove the inequality. The mirror
integral is not evaluated. This is not the loss cone.
-/

namespace PhysJS.MirrorInstability

/-- Mirror threshold with the `be-76` beta.

`hc` is the instability criterion. The equivalent form divides by
`β_⊥ > 0`. -/
theorem mirror_threshold (unstable : Prop) (βPerp Tperp Tpar : ℝ)
    (hβ : 0 < βPerp) (hT : 0 < Tpar)
    (hc : unstable ↔ 1 < βPerp * (Tperp / Tpar - 1)) :
    unstable ↔ 1 / βPerp < Tperp / Tpar - 1 := by
  rw [hc]
  rw [mul_comm]
  exact (div_lt_iff₀ hβ).symm

/-- Omitting the `2` in beta replaces `1/β` by `2/β`. Those thresholds differ. -/
theorem omitted_two (β βNo2 : ℝ) (hβ : β ≠ 0) (h : βNo2 = β / 2) :
    βNo2 ≠ 0 ∧ 1 / βNo2 = 2 / β ∧ 2 / β ≠ 1 / β := by
  have hne : βNo2 ≠ 0 := by
    intro h0
    rw [h, div_eq_zero_iff] at h0
    rcases h0 with hβ0 | h2
    · exact hβ hβ0
    · norm_num at h2
  refine ⟨hne, ?_, ?_⟩
  · rw [h]
    field_simp [hβ]
  · intro hEq
    field_simp [hβ] at hEq
    norm_num at hEq

/-- Temperature ratio is not the temperature difference. At `T_∥ = 2` and `T_⊥ = 4`
the ratio excess is `1` and the difference excess is `3`. -/
theorem ratio_not_difference :
    (4 : ℝ) / 2 - 1 ≠ 4 - 1 := by
  norm_num

end PhysJS.MirrorInstability
