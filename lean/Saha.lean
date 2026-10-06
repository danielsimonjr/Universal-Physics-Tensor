/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.ThermalDeBroglie
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-168`. Bridge. The Saha ionization constant, thermal-wavelength form.

The catalog equation, without spin or internal partition functions, is

```
K = (2 π m_e k_B T / h²)^{3/2} exp(−I / (k_B T))
```

`saha_eq` is that formula. The thermal factor is
`PhysJS.ThermalDeBroglie.wavelength_eq`: `n_Q = λ_T^{−3}` equals the power
`(2 π m k_B T / h²)^{3/2}`. The electron weight `2` and the internal
partition functions of the ion and the atom are not in this statement.
`spin_not_included` records that multiplying by `2` changes `K`.
-/

namespace PhysJS.Saha

open Real

lemma thermal_concentration (ℏ hpl m kB T : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T) (hℏ : 0 < ℏ) (hh : hpl = 2 * π * ℏ) :
    (PhysJS.ThermalDeBroglie.wavelength ℏ m kB T)⁻¹ ^ 3 =
      (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) := by
  have hwave :=
    PhysJS.ThermalDeBroglie.wavelength_eq ℏ hpl m kB T hm hkB hT hℏ hh
  rw [hwave]
  unfold PhysJS.ThermalDeBroglie.wavelengthH
  set s : ℝ := 2 * π * m * kB * T
  have hs : 0 < s := by
    unfold s
    positivity
  have hh0 : 0 < hpl := by
    rw [hh]
    positivity
  rw [inv_div, div_pow, sqrt_eq_rpow]
  rw [← rpow_natCast (s ^ ((1 : ℝ) / 2)) 3, ← rpow_mul hs.le]
  have hden : (hpl ^ 2) ^ ((3 : ℝ) / 2) = hpl ^ (3 : ℝ) := by
    rw [← rpow_natCast hpl 2, ← rpow_mul hh0.le]
    norm_num
  rw [div_rpow hs.le (sq_nonneg hpl), hden, ← rpow_natCast hpl 3]
  norm_num

/-- Saha constant from the thermal wavelength.

Kind `bridge` on `PhysJS.Saha.saha_eq`, once the catalog entry exists.
The covers line still begins with `derivation-step`. Not a second proof
of `be-12`. The factor `2` for electron spin is not included. -/
theorem saha_eq (K nQ I kB T m ℏ hpl : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T) (hℏ : 0 < ℏ) (hh : hpl = 2 * π * ℏ)
    (hnQ : nQ = (PhysJS.ThermalDeBroglie.wavelength ℏ m kB T)⁻¹ ^ 3)
    (hK : K = nQ * exp (-I / (kB * T))) :
    K = (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) * exp (-I / (kB * T)) := by
  rw [hK, hnQ, thermal_concentration ℏ hpl m kB T hm hkB hT hℏ hh]

/-- The typed formula does not contain the electron spin weight `2`. -/
theorem spin_not_included (nQ I kB T : ℝ) (hkB : kB ≠ 0) (hT : T ≠ 0)
    (hnQ : nQ ≠ 0) :
    (2 : ℝ) * nQ * exp (-I / (kB * T)) ≠ nQ * exp (-I / (kB * T)) := by
  intro hEq
  have hexp : exp (-I / (kB * T)) ≠ 0 := exp_ne_zero _
  have h1 : (2 : ℝ) * nQ = nQ := mul_right_cancel₀ hexp hEq
  have h2 : (2 : ℝ) * nQ = 1 * nQ := by simpa [one_mul] using h1
  have h3 : (2 : ℝ) = 1 := mul_right_cancel₀ hnQ h2
  norm_num at h3

end PhysJS.Saha
