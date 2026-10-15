/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
Shared lemma. The decay rate of a Fourier mode under advection and diffusion.

The mode is

```
u(t, x) = exp(−r t) sin(k (x − U t))
```

`mode_solves_iff` proves that `u` solves (`Solves`) `∂u/∂t + U ∂u/∂x = D ∂²u/∂x²` at
every `(t, x)` exactly when `r = D k²`. The advection speed `U` drops out of
the decay rate; it only carries the mode. With `U = 0` this is the
diffusion equation. The dimensionless-number files compare the rates that
this fixes for different diffusivities.
-/

namespace PhysJS.DiffusionMode

/-- The advected Fourier mode `exp(−r t) sin(k (x − U t))`. -/
noncomputable def mode (r k U t x : ℝ) : ℝ :=
  Real.exp (-(r * t)) * Real.sin (k * (x - U * t))

/-- The slope of the mode in `x`. -/
theorem hasDerivAt_x (r k U t x : ℝ) :
    HasDerivAt (fun y => mode r k U t y)
      (Real.exp (-(r * t)) * (Real.cos (k * (x - U * t)) * k)) x := by
  have hin : HasDerivAt (fun y => k * (y - U * t)) k x := by
    simpa using ((hasDerivAt_id x).sub_const (U * t)).const_mul k
  exact ((Real.hasDerivAt_sin _).comp x hin).const_mul _

/-- The curvature of the mode in `x`. -/
theorem hasDerivAt_xx (r k U t x : ℝ) :
    HasDerivAt (fun y => Real.exp (-(r * t)) * (Real.cos (k * (y - U * t)) * k))
      (Real.exp (-(r * t)) * (-Real.sin (k * (x - U * t)) * k * k)) x := by
  have hin : HasDerivAt (fun y => k * (y - U * t)) k x := by
    simpa using ((hasDerivAt_id x).sub_const (U * t)).const_mul k
  exact (((Real.hasDerivAt_cos _).comp x hin).mul_const k).const_mul (Real.exp (-(r * t)))

/-- The slope of the mode in `t`. -/
theorem hasDerivAt_t (r k U t x : ℝ) :
    HasDerivAt (fun s => mode r k U s x)
      (-r * Real.exp (-(r * t)) * Real.sin (k * (x - U * t)) +
        Real.exp (-(r * t)) * (Real.cos (k * (x - U * t)) * (-(k * U)))) t := by
  have hexp : HasDerivAt (fun s => Real.exp (-(r * s))) (Real.exp (-(r * t)) * (-r)) t := by
    have hlin : HasDerivAt (fun s => -(r * s)) (-r) t := by
      exact (((hasDerivAt_id' t).const_mul r).neg).congr_deriv (by ring)
    exact (Real.hasDerivAt_exp _).comp t hlin
  have hin : HasDerivAt (fun s => k * (x - U * s)) (-(k * U)) t := by
    exact ((((hasDerivAt_id' t).const_mul U).const_sub x).const_mul k).congr_deriv (by ring)
  have h := hexp.mul ((Real.hasDerivAt_sin _).comp t hin)
  exact h.congr_deriv (by simp only [Function.comp]; ring)

/-- `mode r k U` solves `∂u/∂t + U ∂u/∂x = D ∂²u/∂x²` at every `(t, x)`. -/
def Solves (r k U D : ℝ) : Prop :=
  ∀ t x, deriv (fun s => mode r k U s x) t + U * deriv (fun y => mode r k U t y) x =
    D * deriv (fun y => deriv (fun z => mode r k U t z) y) x

/-- The mode solves advection–diffusion everywhere exactly when `r = D k²`. -/
theorem mode_solves_iff (r k U D : ℝ) (hk : k ≠ 0) : Solves r k U D ↔ r = D * k ^ 2 := by
  unfold Solves
  have hd1 : ∀ t, deriv (fun z => mode r k U t z) =
      fun y => Real.exp (-(r * t)) * (Real.cos (k * (y - U * t)) * k) := by
    intro t
    funext y
    exact (hasDerivAt_x r k U t y).deriv
  have key : ∀ t x, deriv (fun s => mode r k U s x) t + U * deriv (fun y => mode r k U t y) x -
      D * deriv (fun y => deriv (fun z => mode r k U t z) y) x =
      Real.exp (-(r * t)) * Real.sin (k * (x - U * t)) * (D * k ^ 2 - r) := by
    intro t x
    rw [(hasDerivAt_t r k U t x).deriv, (hasDerivAt_x r k U t x).deriv, hd1 t]
    beta_reduce
    rw [(hasDerivAt_xx r k U t x).deriv]
    ring
  constructor
  · intro h
    have h0 := key 0 (Real.pi / 2 / k)
    rw [h 0 (Real.pi / 2 / k), sub_self] at h0
    have harg : k * (Real.pi / 2 / k - U * 0) = Real.pi / 2 := by
      rw [mul_zero, sub_zero]
      field_simp
    rw [harg, Real.sin_pi_div_two] at h0
    simp at h0
    linarith
  · intro hr t x
    have h := key t x
    have h0 : D * k ^ 2 - r = 0 := by rw [hr]; ring
    rw [h0, mul_zero] at h
    linarith

end PhysJS.DiffusionMode
