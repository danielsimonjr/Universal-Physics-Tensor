/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

open MeasureTheory

/-!
`be-161`. Bridge. Newton's law of cooling, integrated.

The flux is `q = h A θ`. The lumped energy balance
`ρ c V dθ/dt = −q` is the linear ODE

```
dθ/dt = −θ / τ,    τ = ρ c V / (h A)
```

`newton_eq` integrates it to `θ(t) = θ(0) exp(−t / τ)`. Radiation in `T⁴`
is not this row.
-/

namespace PhysJS.NewtonCooling

/-- The lumped Newton balance integrates to an exponential.

`hode` is `ρ c V dθ/dt = −h A θ`. The time constant in the conclusion is
`τ = ρ c V / (h A)`. -/
theorem newton_eq (θ : ℝ → ℝ) (ρ c V hcoeff A t θ0 : ℝ)
    (hcap : ρ * c * V ≠ 0) (hconv : hcoeff * A ≠ 0)
    (hode : ∀ s, HasDerivAt θ (-(hcoeff * A) / (ρ * c * V) * θ s) s)
    (h0 : θ 0 = θ0) :
    θ t = θ0 * Real.exp (-t / (ρ * c * V / (hcoeff * A))) := by
  let τ : ℝ := ρ * c * V / (hcoeff * A)
  have hτ : τ ≠ 0 := by
    unfold τ
    exact div_ne_zero hcap hconv
  have hrate : ∀ s, -(hcoeff * A) / (ρ * c * V) * θ s = -(θ s) / τ := by
    intro s
    unfold τ
    field_simp [hcap, hconv]
  let f : ℝ → ℝ := fun s => θ s * Real.exp (s / τ)
  have hf : ∀ s, HasDerivAt f 0 s := by
    intro s
    have hlin : HasDerivAt (fun u : ℝ => u / τ) τ⁻¹ s := by
      have hmul : HasDerivAt (fun u : ℝ => u * τ⁻¹) (1 * τ⁻¹) s :=
        (hasDerivAt_id s).mul_const τ⁻¹
      simpa [div_eq_mul_inv, one_mul] using hmul
    have hexp : HasDerivAt (fun u => Real.exp (u / τ)) (Real.exp (s / τ) * τ⁻¹) s :=
      hlin.exp
    have hθ : HasDerivAt θ (-(θ s) / τ) s := (hode s).congr_deriv (hrate s)
    have hprod := hθ.mul hexp
    refine hprod.congr_deriv ?_
    rw [div_eq_mul_inv]
    ring
  have hderiv : ∀ s ∈ Set.uIcc 0 t, HasDerivAt f 0 s := fun s _ => hf s
  have hint : IntervalIntegrable (fun _ : ℝ => (0 : ℝ)) volume 0 t :=
    intervalIntegrable_const
  have hsub := intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv hint
  have hflat : f t = f 0 := by
    have hconst : ∫ _s in (0 : ℝ)..t, (0 : ℝ) = 0 := by simp
    linarith [hsub, hconst]
  have hf0 : f 0 = θ0 := by
    simp [f, h0, Real.exp_zero]
  have hft : θ t * Real.exp (t / τ) = θ0 := by
    rw [← hf0]
    simpa [f] using hflat
  have hmul := congrArg (fun z : ℝ => z * Real.exp (-t / τ)) hft
  have hcancel : Real.exp (t / τ) * Real.exp (-t / τ) = 1 := by
    rw [← Real.exp_add]
    ring_nf
    exact Real.exp_zero
  calc
    θ t = θ t * (Real.exp (t / τ) * Real.exp (-t / τ)) := by rw [hcancel, mul_one]
    _ = θ0 * Real.exp (-t / τ) := by rw [← mul_assoc, hmul]
    _ = θ0 * Real.exp (-t / (ρ * c * V / (hcoeff * A))) := by simp [τ]

end PhysJS.NewtonCooling
