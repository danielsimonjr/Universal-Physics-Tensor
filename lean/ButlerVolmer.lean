/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Exponential
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-210`. Bridge. Butler–Volmer electrode kinetics.

The catalog equation is

```
i = i₀ [exp(α e η / (k_B T)) − exp(−(1 − α) e η / (k_B T))]
```

with `e` the elementary charge per transferred electron. `butler_volmer_eq`
derives it from activated (Arrhenius) anodic and cathodic currents whose
barriers are shifted by the overpotential, the anodic one lowered by
`α e η` and the cathodic one raised by `(1 − α) e η`, with equal currents
`i₀` at `η = 0` (the definition of the exchange current).
`linear_response` is the small-overpotential slope `di/dη = i₀ e / (k_B T)`
at `η = 0` (the charge-transfer resistance), and `sinh_form` is the symmetric
case `α = 1/2`, `i = 2 i₀ sinh(e η / (2 k_B T))`. `sign_of_current` shows the
current has the sign of `η`.

Scope: one-step single-electron transfer, no mass-transfer limit, `i₀` and
`α` supplied (not derived). The Nernst limit of `be-151` is not proved here.
`slope_needs_alpha_sum_one` records that the slope equals `i₀ e / (k_B T)`
only if the two transfer coefficients add to 1.
-/

namespace PhysJS.ButlerVolmer

open Real

/-- Butler–Volmer from activated anodic and cathodic currents.

`hia`: `i_a = A_a exp(−(G_a − α e η)/(k_B T))`.
`hic`: `i_c = A_c exp(−(G_c + (1 − α) e η)/(k_B T))`.
`ha0`, `hc0`: both equal `i₀` at `η = 0`.

`i₀` and `α` are
inputs, and no mass-transfer limit. -/
theorem butler_volmer_eq (i ia ic i₀ Aa Ac Ga Gc α e η kB T : ℝ)
    (hi : i = ia - ic)
    (hia : ia = Aa * Real.exp (-(Ga - α * e * η) / (kB * T)))
    (hic : ic = Ac * Real.exp (-(Gc + (1 - α) * e * η) / (kB * T)))
    (ha0 : Aa * Real.exp (-Ga / (kB * T)) = i₀)
    (hc0 : Ac * Real.exp (-Gc / (kB * T)) = i₀) :
    i = i₀ * (Real.exp (α * e * η / (kB * T)) -
      Real.exp (-((1 - α) * e * η) / (kB * T))) := by
  have e1 : Real.exp (-(Ga - α * e * η) / (kB * T)) =
      Real.exp (-Ga / (kB * T)) * Real.exp (α * e * η / (kB * T)) := by
    rw [← Real.exp_add]; congr 1; field_simp; ring
  have e2 : Real.exp (-(Gc + (1 - α) * e * η) / (kB * T)) =
      Real.exp (-Gc / (kB * T)) * Real.exp (-((1 - α) * e * η) / (kB * T)) := by
    rw [← Real.exp_add]; congr 1; field_simp; ring
  rw [hi, hia, hic, e1, e2]
  linear_combination (Real.exp (α * e * η / (kB * T))) * ha0 -
    (Real.exp (-((1 - α) * e * η) / (kB * T))) * hc0

/-- Slope of a Butler–Volmer-type current with transfer coefficients `αa`, `αc`
at `η = 0`: `i₀ e (αa + αc) / (k_B T)`. -/
theorem slope_general (i₀ αa αc e kB T : ℝ) :
    HasDerivAt (fun η : ℝ => i₀ * (Real.exp (αa * e * η / (kB * T)) -
        Real.exp (-(αc * e * η) / (kB * T))))
      (i₀ * e * (αa + αc) / (kB * T)) 0 := by
  have h1 : HasDerivAt (fun η : ℝ => αa * e * η / (kB * T)) (αa * e / (kB * T)) 0 := by
    have := ((hasDerivAt_id (0 : ℝ)).const_mul (αa * e)).div_const (kB * T)
    simpa using this
  have h2 : HasDerivAt (fun η : ℝ => -(αc * e * η) / (kB * T)) (-(αc * e) / (kB * T)) 0 := by
    have := (((hasDerivAt_id (0 : ℝ)).const_mul (αc * e)).neg).div_const (kB * T)
    simpa using this
  have := (h1.exp.sub h2.exp).const_mul i₀
  refine this.congr_deriv ?_
  simp only [mul_zero, zero_div, neg_zero, Real.exp_zero, one_mul]
  ring

/-- Small-overpotential slope of the Butler–Volmer current: `i₀ e / (k_B T)`,
independent of `α`. -/
theorem linear_response (i₀ α e kB T : ℝ) :
    HasDerivAt (fun η : ℝ => i₀ * (Real.exp (α * e * η / (kB * T)) -
        Real.exp (-((1 - α) * e * η) / (kB * T))))
      (i₀ * e / (kB * T)) 0 := by
  have := slope_general i₀ α (1 - α) e kB T
  refine this.congr_deriv ?_
  ring

/-- Symmetric case `α = 1/2`: `i = 2 i₀ sinh(e η / (2 k_B T))`. -/
theorem sinh_form (i₀ e η kB T : ℝ) :
    i₀ * (Real.exp ((1 / 2) * e * η / (kB * T)) -
        Real.exp (-((1 - 1 / 2) * e * η) / (kB * T))) =
      2 * i₀ * Real.sinh (e * η / (2 * kB * T)) := by
  rw [Real.sinh_eq]
  have e1 : (1 / 2 : ℝ) * e * η / (kB * T) = e * η / (2 * kB * T) := by
    by_cases h : kB * T = 0
    · have : 2 * kB * T = 0 := by linarith [h]
      rw [h, this]; simp
    · have h2 : 2 * kB * T ≠ 0 := by
        intro h'; apply h; linarith
      field_simp
  have e2 : -((1 - 1 / 2 : ℝ) * e * η) / (kB * T) = -(e * η / (2 * kB * T)) := by
    rw [neg_div, ← e1]; ring
  rw [e1, e2]
  ring

/-- The current has the sign of the overpotential, for `0 < α < 1`. -/
theorem sign_of_current (i₀ α e η kB T : ℝ) (hi₀ : 0 < i₀) (hα0 : 0 < α) (hα1 : α < 1)
    (he : 0 < e) (hkT : 0 < kB * T) :
    0 < i₀ * (Real.exp (α * e * η / (kB * T)) -
        Real.exp (-((1 - α) * e * η) / (kB * T))) ↔ 0 < η := by
  rw [mul_pos_iff_of_pos_left hi₀, sub_pos, Real.exp_lt_exp, div_lt_div_iff_of_pos_right hkT]
  constructor
  · intro h
    have h1 : 0 < 1 - α := by linarith
    nlinarith [mul_pos he h1, mul_pos he hα0]
  · intro h
    have h1 : 0 < 1 - α := by linarith
    nlinarith [mul_pos he h1, mul_pos he hα0, mul_pos (mul_pos he h1) h, mul_pos (mul_pos he hα0) h]

/-- Control: the slope equals `i₀ e / (k_B T)` only when `αa + αc = 1`. -/
theorem slope_needs_alpha_sum_one (i₀ αa αc e kB T : ℝ) (h : i₀ * e / (kB * T) ≠ 0) :
    i₀ * e * (αa + αc) / (kB * T) = i₀ * e / (kB * T) ↔ αa + αc = 1 := by
  constructor
  · intro h'
    have h1 : i₀ * e / (kB * T) * (αa + αc) = i₀ * e / (kB * T) * 1 := by
      calc i₀ * e / (kB * T) * (αa + αc) = i₀ * e * (αa + αc) / (kB * T) := by ring
        _ = i₀ * e / (kB * T) := h'
        _ = i₀ * e / (kB * T) * 1 := by ring
    exact mul_left_cancel₀ h h1
  · intro h'
    rw [mul_div_right_comm, h', mul_one]

end PhysJS.ButlerVolmer
