/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.Order.Field.Basic
import Mathlib.Analysis.Calculus.Deriv.Inv
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

for `φ` and `B` differentiable at the working temperature `T`. The volume
is `v = (∂g/∂P)_T` and the enthalpy is `h = g − T (∂g/∂T)_P`.
`joule_thomson_eq` derives the enthalpy
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
`μ_JT c_p = 2 a / (R T) − b`. `virial_inversion_zero` and
`virial_inversion_signs` are the inversion temperature `T = 2 a / (R b)`
and the signs on either side; `no_attraction` is `a = 0 ⇒ μ_JT c_p = −b`.
`B` is required only at `T`, because `b − a/(R s)` is not differentiable
at `s = 0`. A measured inversion curve is not this row.
-/

namespace PhysJS.JouleThomson

lemma RbT_lt_of_below_inversion {a R b T : ℝ} (hR : 0 < R) (hb : 0 < b)
    (hlt : T < 2 * a / (R * b)) : R * b * T < 2 * a := by
  have h := (lt_div_iff₀ (mul_pos hR hb)).1 hlt
  convert h using 1
  ring

lemma RbT_gt_of_above_inversion {a R b T : ℝ} (hR : 0 < R) (hb : 0 < b)
    (hgt : 2 * a / (R * b) < T) : 2 * a < R * b * T := by
  have h := (div_lt_iff₀ (mul_pos hR hb)).1 hgt
  convert h using 1
  ring

noncomputable def gibbsTP (g : ℝ → ℝ → ℝ) (T P : ℝ) : ℝ := g T P

noncomputable def molarVolumeTP (g : ℝ → ℝ → ℝ) (T P : ℝ) : ℝ :=
  deriv (fun p => gibbsTP g T p) P

noncomputable def molarEntropyTP (g : ℝ → ℝ → ℝ) (T P : ℝ) : ℝ :=
  - deriv (fun t => gibbsTP g t P) T

noncomputable def molarEnthalpyTP (g : ℝ → ℝ → ℝ) (T P : ℝ) : ℝ :=
  gibbsTP g T P - T * deriv (fun t => gibbsTP g t P) T

/-- Maxwell's relation from commuting mixed partials of `g`. -/
theorem maxwell_from_mixed_partials (g : ℝ → ℝ → ℝ) (T P : ℝ)
    (hdiff_s : DifferentiableAt ℝ (fun p => deriv (fun t => g t p) T) P)
    (hcomm :
      deriv (fun p => deriv (fun t => g t p) T) P =
        deriv (fun t => deriv (fun p => g t p) P) T) :
    deriv (fun p => molarEntropyTP g T p) P =
      - deriv (fun t => molarVolumeTP g t P) T := by
  have hs : (fun p => molarEntropyTP g T p) =
      fun p => -deriv (fun t => g t p) T := by
    funext p
    unfold molarEntropyTP gibbsTP
    rfl
  have hv : (fun t => molarVolumeTP g t P) =
      fun t => deriv (fun p => g t p) P := by
    funext t
    unfold molarVolumeTP gibbsTP
    rfl
  rw [hs, hv]
  have hneg : deriv (fun p => -deriv (fun t => g t p) T) P =
      -deriv (fun p => deriv (fun t => g t p) T) P :=
    (hdiff_s.hasDerivAt.neg).deriv
  rw [hneg, hcomm]

theorem enthalpy_pressure_maxwell (g : ℝ → ℝ → ℝ) (T P : ℝ)
    (hdiff_gP : DifferentiableAt ℝ (fun p => g T p) P)
    (hdiff_sP : DifferentiableAt ℝ (fun p => molarEntropyTP g T p) P)
    (hmix :
      deriv (fun p => molarEntropyTP g T p) P =
        - deriv (fun t => molarVolumeTP g t P) T) :
    deriv (fun p => molarEnthalpyTP g T p) P =
      molarVolumeTP g T P - T * deriv (fun t => molarVolumeTP g t P) T := by
  have hh : ∀ p, molarEnthalpyTP g T p = g T p + T * molarEntropyTP g T p := by
    intro p
    unfold molarEnthalpyTP molarEntropyTP gibbsTP
    ring
  have hAt :=
    (hdiff_gP.hasDerivAt.add ((hdiff_sP.hasDerivAt).const_mul T)).congr_of_eventuallyEq
      (by filter_upwards with p; exact hh p)
  rw [hAt.deriv, hmix]
  unfold molarVolumeTP gibbsTP
  ring

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

theorem enthalpy_eq (φ B : ℝ → ℝ) (R T P : ℝ) (hφ : DifferentiableAt ℝ φ T)
    (hB : DifferentiableAt ℝ B T) :
    enthalpy φ B R T P = φ T - T * deriv φ T + (B T - T * deriv B T) * P := by
  have h : HasDerivAt (fun s => gibbs φ B R s P)
      (deriv φ T + R * 1 * Real.log P + deriv B T * P) T :=
    ((hφ.hasDerivAt).add (((hasDerivAt_id' T).const_mul R).mul_const (Real.log P))).add
      ((hB.hasDerivAt).mul_const P)
  unfold enthalpy gibbs
  unfold gibbs at h
  rw [h.deriv]
  ring

/-- The enthalpy's pressure slope is `v − T (∂v/∂T)_P`, and `μ_JT c_p = T B' − B`.

`hisen` is `μ_JT = −(∂h/∂P)_T / c_p`. An ideal gas, `B = 0`, has `μ_JT = 0`. -/
theorem joule_thomson_eq (φ B : ℝ → ℝ) (R T P μJT cp : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (hB : DifferentiableAt ℝ B T) (hP : P ≠ 0) (hcp : cp ≠ 0)
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
      (((hasDerivAt_id' T).const_mul R).div_const P).add hB.hasDerivAt
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

lemma virial_B_hasDerivAt (a b R T : ℝ) (hR : R ≠ 0) (hT : T ≠ 0) :
    HasDerivAt (fun s => b - a / (R * s)) (a / (R * T ^ 2)) T := by
  have hinv : HasDerivAt (fun s : ℝ => s⁻¹) (-(T ^ 2)⁻¹) T := hasDerivAt_inv hT
  have := (hinv.const_mul (a / R)).const_sub b
  refine (this.congr_deriv (by ring)).congr_of_eventuallyEq ?_
  filter_upwards with s
  field_simp [hR]

/-- With `B(T) = b − a / (R T)`, `μ_JT c_p = 2 a / (R T) − b`.

`B` is differentiable at the working `T ≠ 0`; it is not differentiable on all
of `ℝ`. -/
theorem virial_inversion (φ : ℝ → ℝ) (R T P μJT cp a b : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (hR : R ≠ 0) (hT : T ≠ 0) (hP : P ≠ 0) (hcp : cp ≠ 0)
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun s => b - a / (R * s)) R T p) P / cp) :
    μJT * cp = 2 * a / (R * T) - b := by
  have hd := virial_B_hasDerivAt a b R T hR hT
  have hB : DifferentiableAt ℝ (fun s => b - a / (R * s)) T := hd.differentiableAt
  have h := (joule_thomson_eq φ (fun s => b - a / (R * s)) R T P μJT cp hφ hB hP hcp hisen).2.2.1
  rw [h, hd.deriv]
  field_simp
  ring

theorem virial_inversion_zero (φ : ℝ → ℝ) (R T P μJT cp a b : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (ha : 0 < a) (hb : 0 < b) (hR : 0 < R) (hT : 0 < T) (hP : P ≠ 0)
    (hcp : cp ≠ 0)
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun s => b - a / (R * s)) R T p) P / cp) :
    μJT * cp = 0 ↔ T = 2 * a / (R * b) := by
  have hprod := virial_inversion φ R T P μJT cp a b hφ hR.ne' hT.ne' hP hcp hisen
  constructor
  · intro h0
    have : 2 * a / (R * T) = b := by linarith [hprod]
    field_simp [hT.ne', hR.ne', hb.ne'] at this ⊢
    linarith
  · intro hTinv
    rw [hTinv] at hprod
    field_simp [hR.ne', hb.ne', hT.ne'] at hprod ⊢
    linarith

theorem virial_inversion_signs (φ : ℝ → ℝ) (R T P μJT cp a b : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (ha : 0 < a) (hb : 0 < b) (hR : 0 < R) (hT : 0 < T) (hP : P ≠ 0)
    (hcp : 0 < cp)
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun s => b - a / (R * s)) R T p) P / cp) :
    (T < 2 * a / (R * b) → 0 < μJT * cp) ∧
      (T = 2 * a / (R * b) → μJT * cp = 0) ∧
        (2 * a / (R * b) < T → μJT * cp < 0) := by
  have hprod := virial_inversion φ R T P μJT cp a b hφ hR.ne' hT.ne' hP hcp.ne' hisen
  refine ⟨?_, ?_, ?_⟩
  · intro hlt
    rw [hprod]
    have hmul : R * b * T < 2 * a := RbT_lt_of_below_inversion hR hb hlt
    field_simp [hT.ne', hR.ne', hb.ne']
    linarith [hmul]
  · intro heq
    rw [heq] at hprod
    field_simp [hR.ne', hb.ne', hT.ne'] at hprod ⊢
    linarith
  · intro hgt
    rw [hprod]
    have hmul : 2 * a < R * b * T := RbT_gt_of_above_inversion hR hb hgt
    field_simp [hT.ne', hR.ne', hb.ne']
    linarith [hmul]

/-- No attraction: `a = 0` and constant `b` give `μ_JT c_p = −b`. -/
theorem no_attraction (φ : ℝ → ℝ) (R T P μJT cp b : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (hP : P ≠ 0) (hcp : cp ≠ 0)
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun _ => b) R T p) P / cp) :
    μJT * cp = -b := by
  have hB : DifferentiableAt ℝ (fun _ : ℝ => b) T := differentiableAt_const b
  have h := (joule_thomson_eq φ (fun _ => b) R T P μJT cp hφ hB hP hcp hisen).2.2.1
  rw [h, deriv_const]
  ring

theorem no_attraction_neg (φ : ℝ → ℝ) (R T P μJT cp b : ℝ)
    (hφ : DifferentiableAt ℝ φ T) (hb : 0 < b) (hP : P ≠ 0) (hcp : cp ≠ 0)
    (hisen : μJT = -deriv (fun p => enthalpy φ (fun _ => b) R T p) P / cp) :
    μJT * cp < 0 := by
  have h := no_attraction φ R T P μJT cp b hφ hP hcp hisen
  linarith [h, hb]

theorem per_mass_quotient (μJT cp T v dvt : ℝ) (hT : T = 300) (hv : v = 0.2) (hdvt : dvt = 0.002)
    (hcp : cp = 1000) (hμ : μJT * cp = T * dvt - v) : μJT = 4 / 10000 := by
  rw [hT, hv, hdvt, hcp] at hμ
  linarith

end PhysJS.JouleThomson
