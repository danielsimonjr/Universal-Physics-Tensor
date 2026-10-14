/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Pow.Deriv
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-81`. Bridge. Child–Langmuir law.

The catalog equation is

```
J = (4 ε0 / 9) sqrt(2 e / m) V^{3/2} / d²
```

`e` is the elementary charge. `current_eq` derives it for the integrated
profile. Collisionless energy is `(1/2) m v² = e φ`. The current is
`J = ρ v`, and Poisson is `d²φ/dx² = ρ / ε0`, so `J = ε0 φ'' v` wherever
the second derivative exists. A power `φ ∝ x^α` makes `φ'' v` independent
of `x` only for `α = 4/3`. The profile

```
φ(x) = V (x / d)^{4/3}
```

meets `φ(0) = 0`, `φ(d) = V`, and cathode field zero: the exponent `4/3`
is at least 1, so the derivative vanishes at the cathode. For `x > 0` the
second derivative times the ballistic speed is the Child–Langmuir current.
The Mott–Gurney power `3/2` does not cancel. Poisson is not claimed at
`x = 0`, where `φ''` is singular.
-/

namespace PhysJS.ChildLangmuir

open Real

noncomputable def potential (V d x : ℝ) : ℝ :=
  V * (x / d) ^ ((4 : ℝ) / 3)

noncomputable def slopeFn (V d t : ℝ) : ℝ :=
  V * ((4 : ℝ) / 3) * (t / d) ^ ((1 : ℝ) / 3) * (1 / d)

noncomputable def curv (V d x : ℝ) : ℝ :=
  V * ((4 : ℝ) / 9) * (x / d) ^ ((-(2 : ℝ)) / 3) / d ^ 2

/-- `φ'' v` is independent of `x` only for this exponent. -/
theorem power_counting (α : ℝ) (h : α - 2 + α / 2 = 0) : α = 4 / 3 := by
  have hthree : (3 / 2) * α = 2 := by linarith
  field_simp at hthree
  linarith

/-- The drift profile `x^{3/2}` is not the vacuum exponent. -/
theorem mott_power_not_vacuum : ((3 : ℝ) / 2) - 2 + ((3 : ℝ) / 2) / 2 ≠ 0 := by
  norm_num

lemma hasDerivAt_scaled_rpow (d p x : ℝ) (_hd : d ≠ 0) (hx : x / d ≠ 0 ∨ 1 ≤ p) :
    HasDerivAt (fun t => (t / d) ^ p) (p * (x / d) ^ (p - 1) * (1 / d)) x := by
  have hlin : HasDerivAt (fun t => t / d) (1 / d) x := by
    convert (hasDerivAt_id x).const_mul d⁻¹ using 1
    · ext t
      simp [div_eq_mul_inv, mul_comm]
    · simp [div_eq_mul_inv, mul_one]
  have hr := (hasDerivAt_rpow_const hx).comp x hlin
  exact hr.congr_of_eventuallyEq (by filter_upwards with t; rfl)

theorem slope_at (V d x : ℝ) (hd : d ≠ 0) (hx : x ≠ 0) :
    HasDerivAt (fun t => potential V d t) (slopeFn V d x) x := by
  have h := (hasDerivAt_scaled_rpow d ((4 : ℝ) / 3) x hd (Or.inl (div_ne_zero hx hd))).const_mul V
  have hsub : (4 : ℝ) / 3 - 1 = 1 / 3 := by norm_num
  simpa [potential, slopeFn, hsub, mul_assoc, mul_left_comm, mul_comm] using h

theorem curv_at (V d x : ℝ) (hd : d ≠ 0) (hx : x ≠ 0) :
    HasDerivAt (fun t => slopeFn V d t) (curv V d x) x := by
  have hbase := hasDerivAt_scaled_rpow d ((1 : ℝ) / 3) x hd (Or.inl (div_ne_zero hx hd))
  have hcoeff := hbase.const_mul (V * ((4 : ℝ) / 3) * (1 / d))
  have hsub : (1 : ℝ) / 3 - 1 = -(2 : ℝ) / 3 := by norm_num
  have htarget : (V * ((4 : ℝ) / 3) * (1 / d)) * (((1 : ℝ) / 3) * (x / d) ^ ((1 : ℝ) / 3 - 1) * (1 / d)) =
      curv V d x := by
    unfold curv
    rw [hsub]
    field_simp [hd]
    ring
  have hfun : (fun t => slopeFn V d t) =
      fun t => (V * ((4 : ℝ) / 3) * (1 / d)) * (t / d) ^ ((1 : ℝ) / 3) := by
    ext t
    simp only [slopeFn]
    ring
  rw [hfun]
  exact hcoeff.congr_deriv htarget

/-- The exponent `4/3 ≥ 1`, so the cathode field is zero. -/
theorem cathode_field (V d : ℝ) (_hd : d ≠ 0) :
    HasDerivAt (fun t => potential V d t) 0 0 := by
  have hone : (1 : ℝ) ≤ (4 : ℝ) / 3 := by norm_num
  have hlin : HasDerivAt (fun t => t / d) (1 / d) 0 := by
    convert (hasDerivAt_id 0).const_mul d⁻¹ using 1
    · ext t
      simp [div_eq_mul_inv, mul_comm]
    · simp [div_eq_mul_inv, mul_one]
  have hr := (hasDerivAt_rpow_const (Or.inr hone)).comp 0 hlin
  have hzero : ((4 : ℝ) / 3) * ((0 : ℝ) / d) ^ ((4 : ℝ) / 3 - 1) * (1 / d) = 0 := by
    rw [zero_div, show (4 : ℝ) / 3 - 1 = 1 / 3 by norm_num, Real.zero_rpow (by norm_num)]
    ring
  have hmul := hr.const_mul V
  have hderiv : V * (((4 : ℝ) / 3) * ((0 : ℝ) / d) ^ ((4 : ℝ) / 3 - 1) * (1 / d)) = 0 := by
    rw [hzero]
    ring
  have hfun : (fun t => potential V d t) = fun t => V * (t / d) ^ ((4 : ℝ) / 3) := by
    ext t
    rfl
  rw [hfun]
  exact hmul.congr_deriv hderiv

theorem endpoints (V d : ℝ) (hd : d ≠ 0) :
    potential V d 0 = 0 ∧ potential V d d = V := by
  constructor
  · simp [potential, Real.zero_rpow (by norm_num : (4 : ℝ) / 3 ≠ 0)]
  · simp [potential, div_self hd, Real.one_rpow]

/-- Poisson `φ'' = ρ / ε0` and `J = ρ v` are `J = ε0 φ'' v`. -/
theorem poisson_current (ε0 ρ v φ'' J : ℝ) (hε : ε0 ≠ 0)
    (hpoisson : φ'' = ρ / ε0) (hJ : J = ρ * v) :
    J = ε0 * φ'' * v := by
  rw [hJ, hpoisson]
  field_simp [hε]

/-- Child–Langmuir. Energy, Poisson, and `J = ρ v` on `φ = V (x/d)^{4/3}`
at any `x > 0`.

Not
Mott–Gurney. `e` is the elementary charge. -/
theorem current_eq (V d e m ε0 ρ v J x : ℝ)
    (hV : 0 < V) (hd : 0 < d) (he : 0 < e) (hm : 0 < m) (hε : 0 < ε0) (hx : 0 < x)
    (henergy : v ^ 2 = 2 * e * potential V d x / m ∧ 0 ≤ v)
    (hpoisson : curv V d x = ρ / ε0)
    (hJ : J = ρ * v) :
    J = (4 * ε0 / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) / d ^ 2 := by
  have hξ : 0 < x / d := div_pos hx hd
  have hφ : potential V d x = V * (x / d) ^ ((4 : ℝ) / 3) := rfl
  have hv : v = Real.sqrt (2 * e * potential V d x / m) := by
    have hnn : 0 ≤ 2 * e * potential V d x / m := by
      have : 0 ≤ v ^ 2 := sq_nonneg v
      linarith [henergy.1]
    rw [← Real.sqrt_sq henergy.2, henergy.1]
  have hspeed : v = Real.sqrt (2 * e / m) * Real.sqrt V * (x / d) ^ ((2 : ℝ) / 3) := by
    rw [hv, hφ]
    have hnonneg : 0 ≤ 2 * e / m := by positivity
    have hsplit : 2 * e * (V * (x / d) ^ ((4 : ℝ) / 3)) / m =
        (2 * e / m) * (V * (x / d) ^ ((4 : ℝ) / 3)) := by
      field_simp [hm.ne']
    rw [hsplit, Real.sqrt_mul hnonneg, Real.sqrt_mul hV.le]
    have hroot : Real.sqrt ((x / d) ^ ((4 : ℝ) / 3)) = (x / d) ^ ((2 : ℝ) / 3) := by
      rw [Real.sqrt_eq_rpow, ← Real.rpow_mul hξ.le]
      congr 1
      norm_num
    rw [hroot]
    ring
  have hcancel : (x / d) ^ ((-(2 : ℝ)) / 3) * (x / d) ^ ((2 : ℝ) / 3) = 1 := by
    rw [← Real.rpow_add hξ]
    norm_num
  have hprod : curv V d x * v =
      (4 / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) / d ^ 2 := by
    unfold curv
    rw [hspeed]
    have hVpow : V * Real.sqrt V = V ^ ((3 : ℝ) / 2) := by
      rw [Real.sqrt_eq_rpow, mul_comm, ← Real.rpow_add_one hV.ne']
      norm_num
    calc
      V * ((4 : ℝ) / 9) * (x / d) ^ ((-(2 : ℝ)) / 3) / d ^ 2 *
            (Real.sqrt (2 * e / m) * Real.sqrt V * (x / d) ^ ((2 : ℝ) / 3))
          = ((4 : ℝ) / 9) * Real.sqrt (2 * e / m) * (V * Real.sqrt V) *
              ((x / d) ^ ((-(2 : ℝ)) / 3) * (x / d) ^ ((2 : ℝ) / 3)) / d ^ 2 := by ring
      _ = ((4 : ℝ) / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) * 1 / d ^ 2 := by
        rw [hVpow, hcancel]
      _ = (4 / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) / d ^ 2 := by ring
  have hJε := poisson_current ε0 ρ v (curv V d x) J hε.ne' hpoisson hJ
  rw [hJε]
  calc
    ε0 * curv V d x * v = ε0 * (curv V d x * v) := by ring
    _ = ε0 * ((4 / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) / d ^ 2) := by rw [hprod]
    _ = (4 * ε0 / 9) * Real.sqrt (2 * e / m) * V ^ ((3 : ℝ) / 2) / d ^ 2 := by ring

/-- The profile really is an eigenfunction of the two derivatives used above. -/
theorem profile_derivatives (V d x : ℝ) (hd : 0 < d) (hx : 0 < x) :
    HasDerivAt (fun t => potential V d t) (slopeFn V d x) x ∧
      HasDerivAt (fun t => slopeFn V d t) (curv V d x) x ∧
      potential V d 0 = 0 ∧ potential V d d = V ∧
      HasDerivAt (fun t => potential V d t) 0 0 := by
  exact ⟨slope_at V d x hd.ne' hx.ne', curv_at V d x hd.ne' hx.ne',
    (endpoints V d hd.ne').1, (endpoints V d hd.ne').2, cathode_field V d hd.ne'⟩

end PhysJS.ChildLangmuir
