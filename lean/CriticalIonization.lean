/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-203`. Bridge. Alfven critical ionization velocity (energy condition only).

The catalog equation is

```
v_crit = √(2 e φ_i / m_n)
```

Scope-limited. Proved from the single premise `½ m_n v² = e φ_i`: the
neutral's relative kinetic energy equals the ionization energy.
`critical_velocity_eq` solves it for the positive speed,
`threshold_iff` says `½ m_n v² ≥ e φ_i` is exactly `v ≥ v_crit`, and
`hydrogen_bracket` brackets the value for hydrogen (`φ_i = 13.6 V`,
`e = 1.602176634e-19 C` exact, atomic mass `1.6735575e-27 kg`, taken as
numerals) between 51.0 and 51.1 km/s.

Not proved, and not claimed: that the energy condition is a threshold for
an ionizing instability. Whether a neutral stream across a magnetized
plasma ionizes at `v_crit`, by what transfer of energy to electrons, is
an experimental and contested premise (the Alfven critical velocity
phenomenon). This file certifies only the algebra of the energy
condition. `coefficient_not_fixed` shows units leave the `2` free.
-/

namespace PhysJS.CriticalIonization

/-- Solve the energy condition for the speed. -/
theorem critical_velocity_eq (m e φ v : ℝ) (hm : 0 < m)
    (hv : 0 < v) (hbal : 1 / 2 * m * v ^ 2 = e * φ) :
    v = Real.sqrt (2 * e * φ / m) := by
  have hsq : v ^ 2 = 2 * e * φ / m := by
    rw [eq_div_iff hm.ne']
    linarith
  rw [← hsq, Real.sqrt_sq hv.le]

/-- Above threshold means kinetic energy at least the ionization energy. -/
theorem threshold_iff (m e φ v : ℝ) (hm : 0 < m) (hv : 0 < v) :
    e * φ ≤ 1 / 2 * m * v ^ 2 ↔ Real.sqrt (2 * e * φ / m) ≤ v := by
  rw [Real.sqrt_le_left hv.le, div_le_iff₀ hm]
  constructor <;> intro h <;> linarith

/-- Hydrogen: `φ = 13.6 V`, `e` exact, `m = 1.6735575e-27 kg` give a speed
between 51.0 and 51.1 km/s. -/
theorem hydrogen_bracket :
    (51000 : ℝ) < Real.sqrt (2 * 1.602176634e-19 * 13.6 / 1.6735575e-27) ∧
      Real.sqrt (2 * 1.602176634e-19 * 13.6 / 1.6735575e-27) < 51100 := by
  constructor
  · rw [Real.lt_sqrt (by norm_num)]
    norm_num
  · rw [Real.sqrt_lt' (by norm_num)]
    norm_num

/-- Units leave the factor free: a different factor `k` in
`v² = k e φ / m` is dimensionally the same but gives a different speed. -/
theorem coefficient_not_fixed (m e φ k₁ k₂ : ℝ) (hm : 0 < m) (he : 0 < e)
    (hφ : 0 < φ) (hk₁ : 0 < k₁) (hk₂ : 0 < k₂) (hk : k₁ ≠ k₂) :
    Real.sqrt (k₁ * e * φ / m) ≠ Real.sqrt (k₂ * e * φ / m) := by
  intro h
  have h1 := Real.sqrt_inj (by positivity) (by positivity) |>.mp h
  apply hk
  have : k₁ * (e * φ / m) = k₂ * (e * φ / m) := by
    rw [← mul_div_assoc, ← mul_div_assoc, ← mul_assoc, ← mul_assoc]; exact h1
  exact mul_right_cancel₀ (by positivity) this

end PhysJS.CriticalIonization
