/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-189`. Bridge. Coulomb-blockade charging energy.

The catalog equation is

```
E_C = e² / (2 C)        blockade when k_B T ≪ E_C
```

`e` is the elementary charge and `C` the island capacitance.
`charging_energy_eq` derives it. With constant `C`, the voltage on an island
carrying charge `q` is `q / C`, so bringing in the charge `Q` from far away
costs the work

```
W(Q) = ∫_0^Q (q / C) dq = Q² / (2 C)
```

and `E_C = W(e)`. The integral is proved. `addition_energy` is the energy to
add one electron to an island already holding `N`: `(2N + 1) E_C`, which is
`E_C` at `N = 0`. `thermal_ratio` writes the blockade condition as the
dimensionless ratio `k_B T / E_C = 2 C k_B T / e²`.

`naive_work_not_charging` shows that the voltage times the charge, `e² / C`,
is twice `E_C`. Premises: metallic island, constant capacitance, level
spacing small against `E_C`. The inequality `k_B T ≪ E_C` is a regime, not a
theorem. Not the thermal noise `k_B T / C` of `be-87`.
-/

namespace PhysJS.ChargingEnergy

open intervalIntegral

/-- Work to charge a capacitor `C` from `0` to `Q`. -/
noncomputable def work (C Q : ℝ) : ℝ := ∫ q in (0 : ℝ)..Q, q / C

lemma work_eq (C Q : ℝ) (hC : C ≠ 0) : work C Q = Q ^ 2 / (2 * C) := by
  unfold work
  have : ∫ q in (0 : ℝ)..Q, q / C = (∫ q in (0 : ℝ)..Q, q) / C := by
    simp [intervalIntegral.integral_div]
  rw [this, integral_id]
  field_simp
  ring

/-- Charging energy of one electron on a capacitance `C`.

`hE` is the work to bring in the charge `e` through the voltage `q / C`.

Not a
derivation of the regime `k_B T ≪ E_C`. -/
theorem charging_energy_eq (EC e C : ℝ) (hC : C ≠ 0)
    (hE : EC = ∫ q in (0 : ℝ)..e, q / C) :
    EC = e ^ 2 / (2 * C) := by
  have := work_eq C e hC
  unfold work at this
  rw [hE, this]

/-- Adding one electron to an island holding `N`: `(2N + 1) E_C`. -/
theorem addition_energy (N e C : ℝ) (hC : C ≠ 0) :
    work C ((N + 1) * e) - work C (N * e) = (2 * N + 1) * (e ^ 2 / (2 * C)) := by
  rw [work_eq C _ hC, work_eq C _ hC]
  field_simp
  ring

/-- Blockade ratio. -/
theorem thermal_ratio (kB T e C : ℝ) (he : e ≠ 0) (hC : C ≠ 0) :
    kB * T / (e ^ 2 / (2 * C)) = 2 * C * kB * T / e ^ 2 := by
  field_simp

/-- The voltage times the charge is twice the work. -/
theorem naive_work_not_charging (e C : ℝ) (he : e ≠ 0) (hC : 0 < C) :
    e * (e / C) ≠ e ^ 2 / (2 * C) := by
  intro h
  have h' : e * (e / C) = e ^ 2 / C := by ring
  rw [h', div_eq_div_iff hC.ne' (by positivity)] at h
  have : e ^ 2 * C = 0 := by nlinarith [h]
  have hpos : 0 < e ^ 2 * C := by positivity
  linarith

end PhysJS.ChargingEnergy
