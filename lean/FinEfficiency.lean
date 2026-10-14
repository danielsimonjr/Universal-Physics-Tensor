/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Trigonometric.DerivHyp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-129`. Bridge. Straight fin with an adiabatic tip.

The catalog equations are

```
m = √(2 h / (k t))
η = tanh(m L) / (m L)
```

`efficiency_eq` derives them. The steady fin equation is `θ'' = m² θ`
with `m² = h P / (k A)`. A rectangular fin with `w ≫ t` has `P/A = 2/t`,
both faces. The tip is adiabatic and the base temperature is imposed.
The solution is `θ(x) = θ_b cosh(m (L − x)) / cosh(m L)`. Base conduction
divided by `h P L θ_b` is the efficiency. `one_face_not_two` keeps one
face. `infinite_not_adiabatic` replaces `tanh` by `1`.
-/

namespace PhysJS.FinEfficiency

open Real Set

/-- A function whose derivative vanishes everywhere is constant. -/
lemma eq_of_deriv_zero (f : ℝ → ℝ) (hf : ∀ y, HasDerivAt f 0 y) (a b : ℝ) : f a = f b := by
  by_cases hab : a = b
  · rw [hab]
  have hlt : min a b < max a b := by
    cases le_total a b with
    | inl hle =>
      rw [min_eq_left hle, max_eq_right hle]
      exact lt_of_le_of_ne hle hab
    | inr hle =>
      rw [min_eq_right hle, max_eq_left hle]
      exact lt_of_le_of_ne hle (Ne.symm hab)
  have hcont : ContinuousOn f (Icc (min a b) (max a b)) :=
    fun y _ => (hf y).continuousAt.continuousWithinAt
  have hff : ∀ y ∈ Ioo (min a b) (max a b), HasDerivAt f 0 y := fun y _ => hf y
  obtain ⟨_, _, hslope⟩ := exists_hasDerivAt_eq_slope f (fun _ => (0 : ℝ)) hlt hcont hff
  have hspan : max a b - min a b ≠ 0 := sub_ne_zero.mpr hlt.ne'
  have hflat : f (max a b) = f (min a b) := by
    have hzero : (f (max a b) - f (min a b)) / (max a b - min a b) = 0 := hslope.symm
    rw [div_eq_zero_iff] at hzero
    rcases hzero with h | h
    · linarith
    · exact absurd h hspan
  cases le_total a b with
  | inl hle => simpa [min_eq_left hle, max_eq_right hle] using hflat.symm
  | inr hle => simpa [min_eq_right hle, max_eq_left hle] using hflat

/-- `d/dx [θ' cosh(m(L−x)) + m θ sinh(m(L−x))] = 0` when `θ'' = m² θ`. -/
theorem balance_flat (θ θ' : ℝ → ℝ) (m L x : ℝ)
    (hθ : HasDerivAt θ (θ' x) x) (hθ' : HasDerivAt θ' (m ^ 2 * θ x) x) :
    HasDerivAt (fun y =>
      θ' y * Real.cosh (m * (L - y)) + m * θ y * Real.sinh (m * (L - y))) 0 x := by
  have hu : HasDerivAt (fun y => m * (L - y)) (-m) x := by
    have hraw := (hasDerivAt_const x L).sub (hasDerivAt_id x)
    have hfun : ((fun _ : ℝ => L) - id) = fun y => L - y := by
      ext y
      simp
    rw [hfun] at hraw
    exact (hraw.const_mul m).congr_deriv (by ring)
  have hcosh : HasDerivAt (fun y => Real.cosh (m * (L - y)))
      (Real.sinh (m * (L - x)) * -m) x := by
    have hraw := (Real.hasDerivAt_cosh (m * (L - x))).comp x hu
    have hfun : (Real.cosh ∘ fun y => m * (L - y)) = fun y => Real.cosh (m * (L - y)) := by
      ext y
      rfl
    rw [hfun] at hraw
    exact hraw
  have hsinh : HasDerivAt (fun y => Real.sinh (m * (L - y)))
      (Real.cosh (m * (L - x)) * -m) x := by
    have hraw := (Real.hasDerivAt_sinh (m * (L - x))).comp x hu
    have hfun : (Real.sinh ∘ fun y => m * (L - y)) = fun y => Real.sinh (m * (L - y)) := by
      ext y
      rfl
    rw [hfun] at hraw
    exact hraw
  have hleft := hθ'.mul hcosh
  have hθm : HasDerivAt (fun y => m * θ y) (m * θ' x) x := hθ.const_mul m
  have hright := hθm.mul hsinh
  have hsum := hleft.add hright
  have hfun :
      ((θ' * (fun y => Real.cosh (m * (L - y)))) +
          ((fun y => m * θ y) * (fun y => Real.sinh (m * (L - y))))) =
        fun y =>
          θ' y * Real.cosh (m * (L - y)) + m * θ y * Real.sinh (m * (L - y)) := by
    funext y
    simp only [Pi.add_apply, Pi.mul_apply]
  have hderiv :
      m ^ 2 * θ x * Real.cosh (m * (L - x)) + θ' x * (Real.sinh (m * (L - x)) * -m) +
        (m * θ' x * Real.sinh (m * (L - x)) +
          m * θ x * (Real.cosh (m * (L - x)) * -m)) = 0 := by
    ring
  rw [hfun] at hsum
  exact hsum.congr_deriv hderiv

/-- The adiabatic combination vanishes, so `θ / cosh(m(L−x))` is flat. -/
theorem reduced_flat (θ θ' : ℝ → ℝ) (m L x : ℝ)
    (hθ : HasDerivAt θ (θ' x) x)
    (hcosh : HasDerivAt (fun y => Real.cosh (m * (L - y)))
      (Real.sinh (m * (L - x)) * -m) x)
    (hw : θ' x * Real.cosh (m * (L - x)) + m * θ x * Real.sinh (m * (L - x)) = 0) :
    HasDerivAt (fun y => θ y / Real.cosh (m * (L - y))) 0 x := by
  have hdiv := hθ.div hcosh ((Real.cosh_pos (m * (L - x))).ne')
  have hzero :
      (θ' x * Real.cosh (m * (L - x)) -
          θ x * (Real.sinh (m * (L - x)) * -m)) /
        Real.cosh (m * (L - x)) ^ 2 = 0 := by
    have hnum : θ' x * Real.cosh (m * (L - x)) - θ x * (Real.sinh (m * (L - x)) * -m) =
        θ' x * Real.cosh (m * (L - x)) + m * θ x * Real.sinh (m * (L - x)) := by ring
    rw [hnum, hw]
    simp
  exact hdiv.congr_deriv hzero

/-- Base slope of the adiabatic profile. -/
theorem profile_slope (θb m L : ℝ) :
    HasDerivAt (fun x => θb * Real.cosh (m * (L - x)) / Real.cosh (m * L))
      (-θb * m * Real.tanh (m * L)) 0 := by
  have hu : HasDerivAt (fun x => m * (L - x)) (-m) 0 := by
    have hraw := (hasDerivAt_const 0 L).sub (hasDerivAt_id 0)
    have hfun : ((fun _ : ℝ => L) - id) = fun x => L - x := by
      ext x
      simp
    rw [hfun] at hraw
    exact (hraw.const_mul m).congr_deriv (by ring)
  have hcosh : HasDerivAt (fun x => Real.cosh (m * (L - x)))
      (Real.sinh (m * (L - 0)) * -m) 0 := by
    have hraw := (Real.hasDerivAt_cosh (m * (L - 0))).comp 0 hu
    have hfun : (Real.cosh ∘ fun x => m * (L - x)) = fun x => Real.cosh (m * (L - x)) := by
      ext x
      rfl
    rw [hfun] at hraw
    exact hraw
  have hnum := hcosh.const_mul θb
  have hden : HasDerivAt (fun _ : ℝ => Real.cosh (m * L)) 0 0 := hasDerivAt_const 0 _
  have hdiv := hnum.div hden ((Real.cosh_pos (m * L)).ne')
  have hval :
      (θb * (Real.sinh (m * (L - 0)) * -m) * Real.cosh (m * L) -
          θb * Real.cosh (m * (L - 0)) * 0) / Real.cosh (m * L) ^ 2 =
        -θb * m * Real.tanh (m * L) := by
    rw [sub_zero, Real.tanh_eq_sinh_div_cosh]
    field_simp [(Real.cosh_pos (m * L)).ne']
    ring
  exact hdiv.congr_deriv hval

/-- Adiabatic-tip efficiency, and the rectangular `m`.

`hθ` and `hθ'` are the fin equation `θ'' = m² θ`. `htip` is the adiabatic
tip. `hbase` imposes `θ(0)`. `hm2` is `m² = h P / (k A)`. `hrect` is
`P/A = 2/t`. `hq` is Fourier's law at the base, heat into the fin.
`hqId` is the ideal flow `h P L θ_b`.

Not an
infinite fin, and not one face. -/
theorem efficiency_eq
    (θ θ' : ℝ → ℝ) (m h k t P A L θb q qId η : ℝ)
    (hm : m ≠ 0) (hk : k ≠ 0) (hA : A ≠ 0) (hh : h ≠ 0) (_hP : P ≠ 0)
    (hL : L ≠ 0) (hθb : θb ≠ 0) (ht : t ≠ 0)
    (hθ : ∀ x, HasDerivAt θ (θ' x) x)
    (hθ' : ∀ x, HasDerivAt θ' (m ^ 2 * θ x) x)
    (htip : θ' L = 0)
    (hbase : θ 0 = θb)
    (hm2 : m ^ 2 = h * P / (k * A))
    (hrect : P / A = 2 / t)
    (hmnonneg : 0 ≤ m)
    (hq : q = -k * A * θ' 0)
    (hqId : qId = h * P * L * θb)
    (hη : η = q / qId) :
    η = Real.tanh (m * L) / (m * L) ∧ m = Real.sqrt (2 * h / (k * t)) := by
  let w : ℝ → ℝ := fun y =>
    θ' y * Real.cosh (m * (L - y)) + m * θ y * Real.sinh (m * (L - y))
  have hwderiv : ∀ y, HasDerivAt w 0 y := fun y => balance_flat θ θ' m L y (hθ y) (hθ' y)
  have hwL : w L = 0 := by
    have harg : m * (L - L) = 0 := by ring
    simp only [w, harg, Real.cosh_zero, Real.sinh_zero, htip]
    ring
  have hw0 : ∀ y, w y = 0 := by
    intro y
    have hconst := eq_of_deriv_zero w hwderiv y L
    linarith
  have hargderiv : ∀ x, HasDerivAt (fun y => m * (L - y)) (-m) x := by
    intro x
    have hraw := (hasDerivAt_const x L).sub (hasDerivAt_id x)
    have hfun : ((fun _ : ℝ => L) - id) = fun y => L - y := by
      ext y
      simp
    rw [hfun] at hraw
    exact (hraw.const_mul m).congr_deriv (by ring)
  let z : ℝ → ℝ := fun y => θ y / Real.cosh (m * (L - y))
  have hzderiv : ∀ y, HasDerivAt z 0 y := by
    intro y
    have hcosh : HasDerivAt (fun t => Real.cosh (m * (L - t)))
        (Real.sinh (m * (L - y)) * -m) y := by
      have hraw := (Real.hasDerivAt_cosh (m * (L - y))).comp y (hargderiv y)
      have hfun : (Real.cosh ∘ fun t => m * (L - t)) = fun t => Real.cosh (m * (L - t)) := by
        ext t
        rfl
      rw [hfun] at hraw
      exact hraw
    have hw := hw0 y
    simpa [w, z] using reduced_flat θ θ' m L y (hθ y) hcosh hw
  have hz0 : z 0 = θb / Real.cosh (m * L) := by simp [z, hbase]
  have hθform : ∀ y, θ y = θb * Real.cosh (m * (L - y)) / Real.cosh (m * L) := by
    intro y
    have hz := eq_of_deriv_zero z hzderiv y 0
    rw [hz0] at hz
    have hc : Real.cosh (m * (L - y)) ≠ 0 := (Real.cosh_pos _).ne'
    have hc0 : Real.cosh (m * L) ≠ 0 := (Real.cosh_pos _).ne'
    have hz' : θ y / Real.cosh (m * (L - y)) = θb / Real.cosh (m * L) := by simpa [z] using hz
    rw [div_eq_div_iff hc hc0] at hz'
    rw [eq_div_iff hc0]
    linarith
  let profile : ℝ → ℝ := fun x => θb * Real.cosh (m * (L - x)) / Real.cosh (m * L)
  have hfun : θ = profile := by
    ext y
    simpa [profile] using hθform y
  have hslope : θ' 0 = -θb * m * Real.tanh (m * L) := by
    have hθder := (hθ 0).deriv
    have hPder := (profile_slope θb m L).deriv
    have heq : deriv θ 0 = deriv profile 0 := by simp [hfun]
    rw [hθder, hPder] at heq
    exact heq
  have hconduct : h * P = m ^ 2 * (k * A) := by
    have h := hm2
    field_simp [hk, hA] at h
    linarith
  refine ⟨?_, ?_⟩
  · rw [hη, hq, hqId, hslope]
    have hrewrite : -k * A * (-θb * m * Real.tanh (m * L)) / (h * P * L * θb) =
        Real.tanh (m * L) / (m * L) := by
      rw [hconduct]
      field_simp [hk, hA, hh, hL, hθb, hm]
    exact hrewrite
  · have hm2rect : m ^ 2 = 2 * h / (k * t) := by
      have hPA : P * t = 2 * A := by
        rw [div_eq_div_iff hA ht] at hrect
        linarith
      rw [hm2]
      rw [eq_div_iff (mul_ne_zero hk ht)]
      field_simp [hk, hA]
      linarith
    calc
      m = Real.sqrt (m ^ 2) := (Real.sqrt_sq hmnonneg).symm
      _ = Real.sqrt (2 * h / (k * t)) := by rw [hm2rect]

/-- One face, `P/A = 1/t`, is not `√(2 h / (k t))` when `h`, `k`, and `t` are positive. -/
theorem one_face_not_two (h k t : ℝ) (hh : 0 < h) (hk : 0 < k) (ht : 0 < t) :
    Real.sqrt (h / (k * t)) ≠ Real.sqrt (2 * h / (k * t)) := by
  intro hEq
  have hpos : 0 < k * t := mul_pos hk ht
  have h1 : 0 ≤ h / (k * t) := div_nonneg hh.le hpos.le
  have h2 : 0 ≤ 2 * h / (k * t) := div_nonneg (mul_nonneg (by norm_num) hh.le) hpos.le
  have hsq := congrArg (fun y : ℝ => y ^ 2) hEq
  rw [Real.sq_sqrt h1, Real.sq_sqrt h2] at hsq
  have : h = 2 * h := by
    field_simp [hk.ne', ht.ne'] at hsq
    linarith
  linarith

/-- `tanh` is not `1`, so the adiabatic tip is not the infinite fin. -/
theorem infinite_not_adiabatic (m L : ℝ) (hmL : m * L ≠ 0) :
    Real.tanh (m * L) / (m * L) ≠ 1 / (m * L) := by
  intro hEq
  have hden : m * L ≠ 0 := hmL
  have htanh : Real.tanh (m * L) = 1 := by
    rw [div_eq_div_iff hden hden] at hEq
    exact mul_right_cancel₀ hden hEq
  rw [Real.tanh_eq_sinh_div_cosh] at htanh
  have hc : Real.cosh (m * L) ≠ 0 := (Real.cosh_pos _).ne'
  rw [div_eq_iff hc] at htanh
  have hdiff : Real.cosh (m * L) ^ 2 - Real.sinh (m * L) ^ 2 = 0 := by
    rw [htanh]
    ring
  rw [Real.cosh_sq_sub_sinh_sq] at hdiff
  norm_num at hdiff

end PhysJS.FinEfficiency
