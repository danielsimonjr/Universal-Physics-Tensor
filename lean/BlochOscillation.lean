/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-183`. Bridge. Bloch-oscillation frequency.

The catalog equation is

```
ω_B = e E a / ℏ
```

`e` is the elementary charge, `E` the uniform field, `a` the lattice constant.
`bloch_frequency_eq` derives it from the semiclassical equation of motion
`ℏ dk/dt = e E` (so `k(t) = k(0) + e E t / ℏ`) and the Brillouin-zone
periodicity: the carrier returns to the same state after the crystal
momentum has advanced by the reciprocal-lattice length `G = 2π / a`. The
period is `T_B = 2π ℏ / (e E a)` and `ω_B T_B = 2π`.

`units_do_not_fix_frequency` separates `c e E a / ℏ` from `e E a / ℏ` for any
`c ≠ 1`. Premises: a single band, no scattering within a period
(`ω_B τ ≫ 1`), no Zener tunnelling. None of those is proved here.
-/

namespace PhysJS.BlochOscillation

/-- A constant derivative is a linear function. -/
lemma linear_of_hasDerivAt (k : ℝ → ℝ) (v : ℝ) (hk : ∀ t, HasDerivAt k v t) (t : ℝ) :
    k t = k 0 + v * t := by
  have h : ∀ s, HasDerivAt (fun r => k r - v * r) 0 s := by
    intro s
    have := (hk s).sub ((hasDerivAt_id s).const_mul v)
    exact this.congr_deriv (by simp)
  have hc := is_const_of_deriv_eq_zero (f := fun r => k r - v * r)
    (fun s => (h s).differentiableAt) (fun s => (h s).deriv) t 0
  simp only [mul_zero, sub_zero] at hc
  linarith

/-- Bloch frequency from the crystal-momentum equation of motion.

`hmotion` is `ℏ dk/dt = e E` at every time. `hperiod` is the first return:
after `T`, `k` has advanced by `G = 2π / a`. `hω` is `ω T = 2π`.

Not a derivation of the band, of `ω_B τ ≫ 1`, or of the absence of Zener
tunnelling. -/
theorem bloch_frequency_eq (k : ℝ → ℝ) (e E a ħ T ω : ℝ)
    (hħ : 0 < ħ) (he : 0 < e) (hE : 0 < E) (ha : 0 < a) (hT : 0 < T)
    (hmotion : ∀ t, HasDerivAt k (e * E / ħ) t)
    (hperiod : k T = k 0 + 2 * Real.pi / a)
    (hω : ω * T = 2 * Real.pi) :
    T = 2 * Real.pi * ħ / (e * E * a) ∧ ω = e * E * a / ħ := by
  have hlin := linear_of_hasDerivAt k (e * E / ħ) hmotion T
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  have hT' : (e * E / ħ) * T = 2 * Real.pi / a := by linarith
  have hTval : T = 2 * Real.pi * ħ / (e * E * a) := by
    field_simp [hħ.ne', he.ne', hE.ne', ha.ne'] at hT' ⊢
    linarith
  refine ⟨hTval, ?_⟩
  have h2 : ω * T = (e * E * a / ħ) * T := by
    rw [hω, hTval]
    field_simp [hħ.ne', he.ne', hE.ne', ha.ne']
  exact mul_right_cancel₀ hT.ne' h2

/-- Any other numerical factor gives a different frequency. -/
theorem units_do_not_fix_frequency (e E a ħ c : ℝ) (he : e ≠ 0) (hE : E ≠ 0) (ha : a ≠ 0)
    (hħ : ħ ≠ 0) (hc : c ≠ 1) :
    c * (e * E * a / ħ) ≠ e * E * a / ħ := by
  intro h
  have hp : e * E * a / ħ ≠ 0 := div_ne_zero (mul_ne_zero (mul_ne_zero he hE) ha) hħ
  apply hc
  exact mul_right_cancel₀ hp (by simpa using h : c * (e * E * a / ħ) = 1 * (e * E * a / ħ))

end PhysJS.BlochOscillation
