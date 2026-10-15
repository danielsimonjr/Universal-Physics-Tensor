/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-42`. Cross-check.

`be-42`, with BE-57 and the edge `be-42-via-rs`. One entry, key `be-42`.

```
T_H(M)   = ℏ c³ / (8 π G M k_B)
T_H(r_s) = ℏ c / (4 π k_B r_s)
T_U(a)   = ℏ a / (2 π c k_B)
```

`T_H(2 G M / c²) = T_H(M)` and `T_U(c⁴ / (4 G M)) = T_H(M)`. The
acceleration `c⁴ / (2 G M)` is not that dictionary. This certifies the
`8π`, `4π`, and `2π` under that dictionary. It does not certify the
Hawking effect. It is a cross-check.
-/

namespace PhysJS.HawkingUnruh

open Real

/-- Hawking temperature `ℏ c³ / (8 π G M k_B)`. -/
noncomputable def hawking (ℏ c G M kB : ℝ) : ℝ :=
  ℏ * c ^ 3 / (8 * π * G * M * kB)

/-- Horizon form `ℏ c / (4 π k_B r_s)`, the `be-42-via-rs` edge. -/
noncomputable def hawkingRadius (ℏ c kB r : ℝ) : ℝ :=
  ℏ * c / (4 * π * kB * r)

/-- Unruh temperature `ℏ a / (2 π c k_B)`, BE-57. -/
noncomputable def unruh (ℏ a c kB : ℝ) : ℝ :=
  ℏ * a / (2 * π * c * kB)

/-- The Schwarzschild radius and the surface-gravity acceleration match.

Covers the cross-check of `be-42` with BE-57 and `be-42-via-rs`, not the
Hawking effect. -/
theorem dictionary (ℏ c G M kB : ℝ) (hc : c ≠ 0) (hG : G ≠ 0) (hM : M ≠ 0) (hk : kB ≠ 0) :
    hawkingRadius ℏ c kB (2 * G * M / c ^ 2) = hawking ℏ c G M kB ∧
      unruh ℏ (c ^ 4 / (4 * G * M)) c kB = hawking ℏ c G M kB := by
  constructor
  · unfold hawkingRadius hawking
    field_simp [hc, hG, hM, hk, pi_ne_zero]
    ring
  · unfold unruh hawking
    field_simp [hc, hG, hM, hk, pi_ne_zero]
    ring

/-- `T_U(c⁴ / (2 G M))` is not `T_H(M)`. -/
theorem wrong_dictionary_twice (ℏ c G M kB : ℝ) (hℏ : ℏ ≠ 0) (hc : c ≠ 0) (hG : G ≠ 0)
    (hM : M ≠ 0) (hk : kB ≠ 0) :
    unruh ℏ (c ^ 4 / (2 * G * M)) c kB ≠ hawking ℏ c G M kB := by
  unfold unruh hawking
  intro h
  field_simp [hℏ, hc, hG, hM, hk, pi_ne_zero] at h
  linarith

end PhysJS.HawkingUnruh
