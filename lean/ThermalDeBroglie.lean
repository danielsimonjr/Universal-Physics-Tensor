/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.Real.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-12`. Bridge. The two writings of the thermal wavelength.

The encoded scalar is

```
λ_T = √(2π ℏ² / (m k_B T)) = h / √(2π m k_B T)
```

with `h = 2π ℏ`. The square root is the non-negative root, so the identity
needs `ℏ > 0`. The form with `ℏ` in the numerator and no `√(2π)`, and
`ℏ / √(2 m k_B T)`, are different lengths. This is not Caldeira–Leggett
dephasing, and it is not the framing dependence on BE-11.
-/

namespace PhysJS.ThermalDeBroglie

open Real

/-- Encoded thermal wavelength `√(2π ℏ² / (m k_B T))`. -/
noncomputable def wavelength (ℏ m kB T : ℝ) : ℝ :=
  √(2 * π * ℏ ^ 2 / (m * kB * T))

/-- The same length written as `h / √(2π m k_B T)`. -/
noncomputable def wavelengthH (h m kB T : ℝ) : ℝ :=
  h / √(2 * π * m * kB * T)

/-- Wave Q encoding: `ℏ` in the numerator and no `√(2π)`. -/
noncomputable def waveQ (ℏ m kB T : ℝ) : ℝ :=
  ℏ / √(m * kB * T)

/-- `ℏ / √(2 m k_B T)`. -/
noncomputable def droppedTwo (ℏ m kB T : ℝ) : ℝ :=
  ℏ / √(2 * m * kB * T)

/-- The two writings agree when `h = 2π ℏ` and `ℏ > 0`.

Not Caldeira–Leggett dephasing. -/
theorem wavelength_eq (ℏ h m kB T : ℝ) (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T)
    (hℏ : 0 < ℏ) (hh : h = 2 * π * ℏ) :
    wavelength ℏ m kB T = wavelengthH h m kB T := by
  unfold wavelength wavelengthH
  have hx : 0 ≤ 2 * π * ℏ ^ 2 / (m * kB * T) := by positivity
  have hy : 0 ≤ h / √(2 * π * m * kB * T) := by
    rw [hh]
    positivity
  rw [sqrt_eq_iff_eq_sq hx hy, hh]
  have hden : 0 < 2 * π * m * kB * T := by positivity
  rw [div_pow, sq_sqrt hden.le]
  field_simp [hm.ne', hkB.ne', hT.ne', hℏ.ne', pi_ne_zero]

/-- The Wave Q form, and `ℏ / √(2 m k_B T)`, are not the thermal wavelength. -/
theorem wrong_dictionary (ℏ m kB T : ℝ) (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T)
    (hℏ : 0 < ℏ) :
    waveQ ℏ m kB T ≠ wavelength ℏ m kB T ∧
      droppedTwo ℏ m kB T ≠ wavelength ℏ m kB T := by
  have hmk : 0 < m * kB * T := by positivity
  have hnonneg : 0 ≤ 2 * π * ℏ ^ 2 / (m * kB * T) := by positivity
  constructor
  · intro h
    have hden : m * kB * T ≠ 0 := hmk.ne'
    have hsq : (waveQ ℏ m kB T) ^ 2 = (wavelength ℏ m kB T) ^ 2 := congrArg (· ^ 2) h
    unfold waveQ wavelength at hsq
    rw [div_pow, sq_sqrt hmk.le, sq_sqrt hnonneg] at hsq
    field_simp [hden] at hsq
    linarith [pi_gt_three, hsq]
  · intro h
    have h2 : 0 < 2 * m * kB * T := by positivity
    have hsq : (droppedTwo ℏ m kB T) ^ 2 = (wavelength ℏ m kB T) ^ 2 :=
      congrArg (· ^ 2) h
    unfold droppedTwo wavelength at hsq
    rw [div_pow, sq_sqrt h2.le, sq_sqrt hnonneg] at hsq
    field_simp [hm.ne', hkB.ne', hT.ne'] at hsq
    have hfour : (2 : ℝ) ^ 2 = 4 := by norm_num
    rw [hfour] at hsq
    linarith [pi_gt_three, hsq]

end PhysJS.ThermalDeBroglie
