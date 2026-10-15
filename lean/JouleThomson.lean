/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-163`. Bridge. The Joule–Thomson coefficient from the Gibbs energy.

The gas has the second-virial Gibbs energy per mole

```
g(T, P) = φ(T) + R T ln P + B(T) P
```

for differentiable `φ` and `B`. The volume is `v = (∂g/∂P)_T` and the
enthalpy is `h = g − T (∂g/∂T)_P`. `joule_thomson_eq` derives the enthalpy
differential's pressure coefficient instead of assuming it,

```
(∂h/∂P)_T = v − T (∂v/∂T)_P = B − T B'
```

and at constant enthalpy `μ_JT = −(∂h/∂P)_T / c_p`, so

```
μ_JT c_p = T (∂v/∂T)_p − v = T B' − B
```

An ideal gas, `B = 0`, has `μ_JT = 0`. `virial_inversion` is
`B(T) = b − a / (R T)`, the low-density van der Waals gas, with
`μ_JT c_p = 2 a / (R T) − b`. A measured inversion curve is not this row.
-/

namespace PhysJS.JouleThomson

/-- Second-virial molar Gibbs energy `φ(T) + R T ln P + B(T) P`. -/
noncomputable def gibbs (φ B : ℝ → ℝ) (R T P : ℝ) : ℝ :=
  φ T + R * T * Real.log P + B T * P

/-- Molar volume `(∂g/∂P)_T`. -/
noncomputable def volume (φ B : ℝ → ℝ) (R T P : ℝ) : ℝ :=
  deriv (fun p => gibbs φ B R T p) P

/-- Molar enthalpy `g − T (∂g/∂T)_P`. -/
noncomputable def enthalpy (φ B : ℝ → ℝ) (R T P : ℝ) : ℝ :=
  gibbs φ B R T P - T * deriv (fun s => gibbs φ B R s P) T

theorem volume_eq (φ B : ℝ → ℝ) (R T P : ℝ) (hP : P ≠ 0) :
    volume φ B R T P = R * T / P + B T := by
  have h : HasDerivAt (fun p => gibbs φ B R T p) (R * T * P⁻¹ + B T * 1) P :=
    (((Real.hasDerivAt_log hP).const_mul (R * T)).const_add (φ T)).add
      ((hasDerivAt_id' P).const_mul (B T))
  unfold volume
  rw [h.deriv]
  field_simp

theorem enthalpy_eq (φ B : ℝ → ℝ) (R T P : ℝ) (hφ : Differentiable ℝ φ)
    (hB : Differentiable ℝ B) :
    enthalpy φ B R T P = φ T - T * deriv φ T + (B T - T * deriv B T) * P := by
  have h : HasDerivAt (fun s => gibbs φ B R s P)
      (deriv φ T + R * 1 * Real.log P + deriv B T * P) T :=
    (((hφ T).hasDerivAt).add (((hasDerivAt_id' T).const_mul R).mul_const (Real.log P))).add
      (((hB T).hasDerivAt).mul_const P)
  unfold enthalpy gibbs
  unfold gibbs at h
  rw [h.deriv]
  ring

/-- The enthalpy's pressure slope is `v − T (∂v/∂T)_P`, and `μ_JT c_p = T B' − B`.

`hisen` is `μ_JT = −(∂h/∂P)_T / c_p`. An ideal gas, `B = 0`, has `μ_JT = 0`. -/
theorem joule_thomson_eq (φ B : ℝ → ℝ) (R T P μJT cp : ℝ)
    (hφ : Differentiable ℝ φ) (hB : Differentiable ℝ B) (hP : P ≠ 0) (hcp : cp ≠ 0)
    (hisen : μJT = -deriv (fun p => enthalpy φ B R T p) P / cp) :
    deriv (fun p => enthalpy φ B R T p) P =
        volume φ B R T P - T * deriv (fun s => volume φ B R s P) T ∧
      μJT * cp = T * deriv (fun s => volume φ B R s P) T - volume φ B R T P ∧
      μJT * cp = T * deriv B T - B T ∧
      ((∀ s, B s = 0) → μJT = 0) := by
  have hhfun : (fun p => enthalpy φ B R T p) =
      fun p => (φ T - T * deriv φ T) + (B T - T * deriv B T) * p := by
    funext p
    exact enthalpy_eq φ B R T p hφ hB
  have hhP : deriv (fun p => enthalpy φ B R T p) P = B T - T * deriv B T := by
    rw [hhfun]
    have h := ((hasDerivAt_id' P).const_mul (B T - T * deriv B T)).const_add
      (φ T - T * deriv φ T)
    rw [h.deriv]
    ring
  have hvfun : (fun s => volume φ B R s P) = fun s => R * s / P + B s := by
    funext s
    exact volume_eq φ B R s P hP
  have hvT : deriv (fun s => volume φ B R s P) T = R / P + deriv B T := by
    rw [hvfun]
    have h : HasDerivAt (fun s => R * s / P + B s) (R * 1 / P + deriv B T) T :=
      (((hasDerivAt_id' T).const_mul R).div_const P).add ((hB T).hasDerivAt)
    rw [h.deriv]
    ring
  have hslope : deriv (fun p => enthalpy φ B R T p) P =
      volume φ B R T P - T * deriv (fun s => volume φ B R s P) T := by
    rw [hhP, hvT, volume_eq φ B R T P hP]
    field_simp
    ring
  have hprod : μJT * cp = T * deriv B T - B T := by
    rw [hisen, hhP]
    field_simp
    ring
  refine ⟨hslope, ?_, hprod, ?_⟩
  · rw [hprod, hvT, volume_eq φ B R T P hP]
    field_simp
    ring
  · intro h0
    have hB0 : deriv B T = 0 := by
      have : B = fun _ => 0 := funext h0
      rw [this, deriv_const]
    rw [h0 T, hB0, mul_zero, sub_zero] at hprod
    exact (mul_eq_zero.mp hprod).resolve_right hcp

/-- With `B(T) = b − a / (R T)`, `μ_JT c_p = 2 a / (R T) − b`. -/
theorem virial_inversion (φ : ℝ → ℝ) (R T P μJT cp a b : ℝ)
    (hφ : Differentiable ℝ φ) (hR : R ≠ 0) (hT : T ≠ 0) (hP : P ≠ 0) (hcp : cp ≠ 0)
    (hB : Differentiable ℝ (fun s => b - a / (R * s)))
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun s => b - a / (R * s)) R T p) P / cp) :
    μJT * cp = 2 * a / (R * T) - b := by
  have h := (joule_thomson_eq φ (fun s => b - a / (R * s)) R T P μJT cp hφ hB hP hcp hisen).2.2.1
  have hd : HasDerivAt (fun s => b - a / (R * s)) (a / (R * T ^ 2)) T := by
    have hinv : HasDerivAt (fun s : ℝ => s⁻¹) (-(T ^ 2)⁻¹) T := hasDerivAt_inv hT
    have := (hinv.const_mul (a / R)).const_sub b
    refine (this.congr_deriv (by ring)).congr_of_eventuallyEq ?_
    filter_upwards with s
    ring
  rw [h, hd.deriv]
  field_simp
  ring

end PhysJS.JouleThomson
