/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-21`. Derivation step. The KSS saturating value, not the bound.

The encoded scalar is the equality

```
η/s = ℏ / (4 π k_B),    4 π k_B (η/s) = ℏ
```

for `k_B ≠ 0`. The factor `8π` is the one in `PhysJS.HawkingUnruh.hawking`.
In place of `4π` it is twice `ℏ`, not `ℏ`, once `ℏ ≠ 0`. The inequality
`η/s ≥ ℏ / (4 π k_B)` is a conjecture and is not this statement.
-/

namespace PhysJS.Kss

open Real

/-- Saturating ratio `η/s = ℏ / (4 π k_B)`. -/
noncomputable def ratio (ℏ kB : ℝ) : ℝ :=
  ℏ / (4 * π * kB)

/-- Clearing the denominator recovers `ℏ`.

Covers the derivation step of `be-21`. Not the inequality. -/
theorem saturating (ℏ kB : ℝ) (hk : kB ≠ 0) :
    ratio ℏ kB = ℏ / (4 * π * kB) ∧ 4 * π * kB * ratio ℏ kB = ℏ := by
  unfold ratio
  refine ⟨rfl, ?_⟩
  field_simp [hk, pi_ne_zero]

/-- The Hawking factor `8π` in place of `4π` is not the saturating value. -/
theorem wrong_dictionary_hawking (ℏ kB : ℝ) (hℏ : ℏ ≠ 0) (hk : kB ≠ 0) :
    8 * π * kB * ratio ℏ kB ≠ ℏ := by
  unfold ratio
  intro h
  field_simp [hℏ, hk, pi_ne_zero] at h
  linarith

end PhysJS.Kss
