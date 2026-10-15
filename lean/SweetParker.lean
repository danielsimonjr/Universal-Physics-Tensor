/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-193`. Bridge. Sweet-Parker reconnection inflow.

The catalog equation is

```
v_in = v_A S^(-1/2),    S = L v_A / η
```

Proved under these hypotheses. A steady, incompressible current sheet of
length `L` and thickness `δ` has inflow `v_in` and outflow at the Alfven
speed `v_A`. Mass conservation is `v_in L = v_A δ`. Diffusion balance is
`v_in = η / δ`, with `η` the magnetic diffusivity. Eliminating `δ` gives
`v_in² = η v_A / L`, hence `v_in = v_A S^(-1/2)` with the Lundquist number
`S = L v_A / η`. `inflow_eq` is that statement, in `rpow` and in
`1 / sqrt` form.

Not proved: that the outflow speed is `v_A` (it is a premise), uniform
resistivity, or that real reconnection is this slow. The model stays below
the observed fast-reconnection rate; that is a statement about the model.
`exponent_not_fixed` and `wrong_power_ne` show the exponent `-1/2` is
carried by the two balance laws, not by units.
-/

namespace PhysJS.SweetParker

/-- Eliminating the sheet thickness: `v_in² = η v_A / L`. -/
theorem inflow_sq (vin vA L η δ : ℝ)
    (hvA : 0 < vA) (hL : 0 < L) (hδ : 0 < δ)
    (hmass : vin * L = vA * δ) (hdiff : vin = η / δ) :
    vin ^ 2 = η * vA / L := by
  have hη : vin * δ = η := by
    rw [hdiff]
    field_simp
  have hδ' : δ = vin * L / vA := by
    field_simp
    linarith
  rw [eq_div_iff hL.ne']
  have : vin ^ 2 * L = η * vA := by
    have h2 : vin * (vin * L / vA) = η := by
      rw [← hδ']
      exact hη
    field_simp at h2
    nlinarith [h2]
  linarith

/-- Sweet-Parker inflow: `v_in = v_A S^(-1/2)` with `S = L v_A / η`. -/
theorem inflow_eq (vin vA L η δ S : ℝ)
    (hvin : 0 < vin) (hvA : 0 < vA) (hL : 0 < L) (hη : 0 < η) (hδ : 0 < δ)
    (hmass : vin * L = vA * δ) (hdiff : vin = η / δ) (hS : S = L * vA / η) :
    vin = vA * S ^ (-(1 / 2 : ℝ)) ∧ vin = vA / Real.sqrt S := by
  have hsq := inflow_sq vin vA L η δ hvA hL hδ hmass hdiff
  have hSpos : 0 < S := by rw [hS]; positivity
  have hsqrt : 0 < Real.sqrt S := Real.sqrt_pos.mpr hSpos
  have hprod : vin * Real.sqrt S = vA := by
    have hsq2 : (vin * Real.sqrt S) ^ 2 = vA ^ 2 := by
      rw [mul_pow, Real.sq_sqrt hSpos.le, hsq, hS]
      field_simp
    have h0 : 0 ≤ vin * Real.sqrt S := by positivity
    exact (pow_left_inj₀ h0 hvA.le (by norm_num : (2 : ℕ) ≠ 0)).mp hsq2
  have hdiv : vin = vA / Real.sqrt S := by
    rw [eq_div_iff hsqrt.ne']
    exact hprod
  refine ⟨?_, hdiv⟩
  rw [Real.rpow_neg hSpos.le, ← Real.sqrt_eq_rpow, ← div_eq_mul_inv]
  exact hdiv

/-- The inflow is slower than the outflow once `S > 1`. -/
theorem subAlfvenic (vA S : ℝ) (hvA : 0 < vA) (hS : 1 < S) :
    vA / Real.sqrt S < vA := by
  have hs1 : 1 < Real.sqrt S := by
    rw [show (1 : ℝ) = Real.sqrt 1 by simp]
    exact Real.sqrt_lt_sqrt (by norm_num) hS
  rw [div_lt_iff₀ (by linarith)]
  nlinarith

/-- A different power (`S^(-1)`) gives a different inflow for `S > 1`. -/
theorem wrong_power_ne (vA S : ℝ) (hvA : 0 < vA) (hS : 1 < S) :
    vA / S ≠ vA / Real.sqrt S := by
  have hs1 : 1 < Real.sqrt S := by
    rw [show (1 : ℝ) = Real.sqrt 1 by simp]
    exact Real.sqrt_lt_sqrt (by norm_num) hS
  have hlt : Real.sqrt S < S := by
    have hsq := Real.sq_sqrt (by linarith : (0 : ℝ) ≤ S)
    nlinarith
  intro h
  have := div_lt_div_of_pos_left hvA (by linarith) hlt
  linarith

/-- Units do not entail the exponent: every `v_A S^p` is a velocity, and
the two balance laws pick out `p = -1/2` only through `inflow_sq`. -/
theorem exponent_not_fixed (vA S : ℝ) (hvA : 0 < vA) (hS : 1 < S) :
    ∃ p q : ℝ, p ≠ q ∧ vA * S ^ p ≠ vA * S ^ q := by
  refine ⟨0, 1, by norm_num, ?_⟩
  simp only [Real.rpow_zero, Real.rpow_one]
  nlinarith

end PhysJS.SweetParker
