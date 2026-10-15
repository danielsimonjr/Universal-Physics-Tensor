/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-27`. Bridge. The sum `T + Σ_active / k_B`.

The encoded scalar is the product

```
T_eff = T (1 + Σ_active / (k_B T))
```

For `T ≠ 0` and `k_B ≠ 0` that product is the sum `T + Σ_active / k_B`,
and the sum equals `T` if and only if `Σ_active = 0`. The product
`T · Σ_active / (k_B T)`, with the `1` omitted, is a monomial and is not
that sum. The frequency-dependent Cugliandolo–Kurchan `T_eff(ω)` is not
encoded and is not this statement.
-/

namespace PhysJS.EffectiveTemperature

/-- Encoded product `T (1 + Σ_active / (k_B T))`. -/
noncomputable def encoded (T kB active : ℝ) : ℝ :=
  T * (1 + active / (kB * T))

/-- Rewritten sum `T + Σ_active / k_B`. -/
noncomputable def teff (T kB active : ℝ) : ℝ :=
  T + active / kB

/-- The encoded product is the sum, and the sum equals `T` iff the active
term vanishes.

Not `T_eff(ω)`. -/
theorem sum_eq (T kB active : ℝ) (hT : T ≠ 0) (hk : kB ≠ 0) :
    encoded T kB active = teff T kB active ∧ (teff T kB active = T ↔ active = 0) := by
  refine ⟨?_, ?_⟩
  · unfold encoded teff
    field_simp [hT, hk]
  · constructor
    · intro h
      unfold teff at h
      field_simp [hk] at h
      linarith
    · rintro rfl
      unfold teff
      simp

/-- Omitting the `1` leaves the monomial `T · Σ_active / (k_B T)`. -/
theorem wrong_dictionary (T kB active : ℝ) (hT : T ≠ 0) (hk : kB ≠ 0) :
    T * active / (kB * T) ≠ teff T kB active := by
  intro h
  unfold teff at h
  field_simp [hT, hk] at h
  have : T * kB = 0 := by linarith
  exact mul_ne_zero hT hk this

end PhysJS.EffectiveTemperature
