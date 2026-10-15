/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-80`. Bridge. Mott–Gurney law.

The catalog equation is

```
J = (9 / 8) ε μ V² / d³
```

for a trap-free solid with drift-only transport. `current_eq` integrates it.
Drift is `J = q n μ E` and Poisson is `dE/dx = q n / ε`, so

```
E dE/dx = J / (ε μ)
```

which is `d/dx (E² / 2) = J / (ε μ)`. The injecting contact has `E(0) = 0`
and a nonnegative field, so `E(x) = sqrt(2 J x / (ε μ))`. The voltage is
`∫₀ᵈ E`. The square root integrates to a factor `2/3`, and clearing it
produces `9/8`. `coefficient_not_fixed` separates any other factor.
This is not the vacuum Child–Langmuir law: the carriers drift, and the
voltage power is `2`.
-/

namespace PhysJS.MottGurney

open Real Set MeasureTheory intervalIntegral

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

theorem integrate_const (f : ℝ → ℝ) (c x : ℝ) (hf : ∀ y, HasDerivAt f c y) (h0 : f 0 = 0) :
    f x = c * x := by
  let g : ℝ → ℝ := fun y => f y - c * y
  have hg : ∀ y, HasDerivAt g 0 y := by
    intro y
    have hlin : HasDerivAt (fun t => c * t) c y := by
      simpa [mul_one] using (hasDerivAt_id y).const_mul c
    exact ((hf y).sub hlin).congr_deriv (by ring)
  have hconst := eq_of_deriv_zero g hg x 0
  have hg0 : g 0 = 0 := by simp [g, h0]
  have hgx : g x = 0 := hconst.trans hg0
  have hsub : f x - c * x = 0 := by simpa [g] using hgx
  linarith

/-- One integration of `E dE/dx = c`, with `E(0) = 0`. -/
theorem field_squared (E s : ℝ → ℝ) (c : ℝ)
    (hE : ∀ x, HasDerivAt E (s x) x) (hprod : ∀ x, E x * s x = c) (h0 : E 0 = 0) (x : ℝ) :
    (E x) ^ 2 / 2 = c * x := by
  let f : ℝ → ℝ := fun t => (E t) ^ 2 / 2
  have hf : ∀ y, HasDerivAt f c y := by
    intro y
    have hmul := (hE y).mul (hE y)
    have hsq : HasDerivAt (fun t => (E t) ^ 2) (2 * E y * s y) y := by
      simp only [pow_two]
      exact hmul.congr_deriv (by ring)
    have hdiv := hsq.div_const 2
    exact hdiv.congr_deriv (by
      have : 2 * E y * s y / 2 = E y * s y := by ring
      rw [this, hprod y])
  have hf0 : f 0 = 0 := by simp [f, h0]
  exact integrate_const f c x hf hf0

/-- Mott–Gurney. `hprod` is drift current times Poisson's equation,
`E dE/dx = J / (ε μ)`. `h0` is the injecting contact. `hsign` keeps the
nonnegative root. `hV` is the second integral.

Not
Child–Langmuir. -/
theorem current_eq (E s : ℝ → ℝ) (J ε μ d V : ℝ)
    (hε : 0 < ε) (hμ : 0 < μ) (hJ : 0 ≤ J) (hd : 0 < d)
    (hE : ∀ x, HasDerivAt E (s x) x)
    (hprod : ∀ x, E x * s x = J / (ε * μ))
    (h0 : E 0 = 0)
    (hsign : ∀ x, 0 ≤ x → 0 ≤ E x)
    (hV : V = ∫ x in (0 : ℝ)..d, E x) :
    J = (9 / 8) * ε * μ * V ^ 2 / d ^ 3 := by
  have hεμ : ε * μ ≠ 0 := mul_ne_zero hε.ne' hμ.ne'
  have hsq : ∀ x, (E x) ^ 2 = 2 * J * x / (ε * μ) := by
    intro x
    have hhalf := field_squared E s (J / (ε * μ)) hE hprod h0 x
    field_simp [hεμ] at hhalf ⊢
    linarith
  have hroot : ∀ x, 0 ≤ x → E x = Real.sqrt (2 * J * x / (ε * μ)) := by
    intro x hx
    have hnn : 0 ≤ E x := hsign x hx
    rw [← Real.sqrt_sq hnn, hsq x]
  have hc : 0 ≤ 2 * J / (ε * μ) := by positivity
  have hfactor : ∀ x, 0 ≤ x → E x = Real.sqrt (2 * J / (ε * μ)) * Real.sqrt x := by
    intro x hx
    rw [hroot x hx]
    have hsplit : 2 * J * x / (ε * μ) = (2 * J / (ε * μ)) * x := by
      field_simp [hεμ]
    rw [hsplit, Real.sqrt_mul hc x]
  have hpoint : ∀ x ∈ Set.uIcc (0 : ℝ) d, E x = Real.sqrt (2 * J / (ε * μ)) * Real.sqrt x := by
    intro x hx
    have hx0 : 0 ≤ x := by
      rw [Set.uIcc_of_le hd.le] at hx
      exact hx.1
    exact hfactor x hx0
  have hint := integral_rpow (a := (0 : ℝ)) (b := d) (r := (1 : ℝ) / 2)
    (Or.inl (by norm_num : -1 < (1 : ℝ) / 2))
  have hsqrt : (fun x : ℝ => Real.sqrt x) = fun x => x ^ ((1 : ℝ) / 2) := by
    ext x
    exact Real.sqrt_eq_rpow x
  have hzero : (0 : ℝ) ^ ((1 : ℝ) / 2 + 1) = 0 := Real.zero_rpow (by norm_num)
  have hdiv : (1 : ℝ) / 2 + 1 = 3 / 2 := by norm_num
  have hint_eq : (∫ x in (0 : ℝ)..d, Real.sqrt x) = d ^ ((3 : ℝ) / 2) / ((3 : ℝ) / 2) := by
    rw [hsqrt, hint, hzero, hdiv, sub_zero]
  have hVval : V = Real.sqrt (2 * J / (ε * μ)) * (d ^ ((3 : ℝ) / 2) / ((3 : ℝ) / 2)) := by
    rw [hV, integral_congr hpoint, intervalIntegral.integral_const_mul, hint_eq]
  have hVval' : V = Real.sqrt (2 * J / (ε * μ)) * (2 / 3) * d ^ ((3 : ℝ) / 2) := by
    rw [hVval]
    field_simp
  have hsqsqrt : Real.sqrt (2 * J / (ε * μ)) ^ 2 = 2 * J / (ε * μ) := Real.sq_sqrt hc
  have hpow : (d ^ ((3 : ℝ) / 2)) ^ 2 = d ^ 3 := by
    rw [← Real.rpow_natCast, ← Real.rpow_mul hd.le]
    norm_num
  have hVsq : V ^ 2 = (2 * J / (ε * μ)) * (4 / 9) * d ^ 3 := by
    calc
      V ^ 2 = (Real.sqrt (2 * J / (ε * μ)) * (2 / 3) * d ^ ((3 : ℝ) / 2)) ^ 2 := by rw [hVval']
      _ = Real.sqrt (2 * J / (ε * μ)) ^ 2 * (2 / 3) ^ 2 * (d ^ ((3 : ℝ) / 2)) ^ 2 := by ring
      _ = (2 * J / (ε * μ)) * (4 / 9) * d ^ 3 := by rw [hsqsqrt, hpow]; ring
  have hd3 : d ^ 3 ≠ 0 := pow_ne_zero 3 hd.ne'
  field_simp [hεμ, hd3] at hVsq ⊢
  linarith

/-- Replacing `9/8` by any other factor misses the integral, once the rest
is nonzero. -/
theorem coefficient_not_fixed (ε μ V d C : ℝ) (hε : ε ≠ 0) (hμ : μ ≠ 0) (hV : V ≠ 0)
    (hd : d ≠ 0) (hC : C ≠ 9 / 8) :
    C * ε * μ * V ^ 2 / d ^ 3 ≠ (9 / 8) * ε * μ * V ^ 2 / d ^ 3 := by
  intro hEq
  have hnum : ε * μ * V ^ 2 ≠ 0 :=
    mul_ne_zero (mul_ne_zero hε hμ) (pow_ne_zero 2 hV)
  have hden : d ^ 3 ≠ 0 := pow_ne_zero 3 hd
  have hdenC : (9 / 8 : ℝ) ≠ 0 := by norm_num
  by_cases hC0 : C = 0
  · rw [hC0, zero_mul, zero_mul, zero_mul, zero_div] at hEq
    have hright : (9 / 8) * ε * μ * V ^ 2 / d ^ 3 ≠ 0 :=
      div_ne_zero (mul_ne_zero (mul_ne_zero (mul_ne_zero hdenC hε) hμ) (pow_ne_zero 2 hV)) hden
    exact hright hEq.symm
  rw [div_eq_div_iff hden hden] at hEq
  have hcancel := mul_right_cancel₀ hden hEq
  have hcomm : (ε * μ * V ^ 2) * C = C * ε * μ * V ^ 2 ∧
      (ε * μ * V ^ 2) * (9 / 8) = (9 / 8) * ε * μ * V ^ 2 := by
    constructor <;> ring
  rw [← hcomm.1, ← hcomm.2] at hcancel
  exact hC (mul_left_cancel₀ hnum hcancel)

end PhysJS.MottGurney
