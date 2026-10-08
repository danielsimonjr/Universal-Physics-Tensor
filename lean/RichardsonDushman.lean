/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Gaussian.GaussianIntegral
import Mathlib.MeasureTheory.Integral.IntegralEqImproper
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-169`. Bridge. The Richardson–Dushman current.

The catalog equation is

```
J = (4 π m e k_B² T² / h³) exp(−φ / (k_B T))
```

Here `e` is the elementary charge. `exp_tail` proves
`∫_a^∞ exp(−c x) dx = exp(−c a) / c`. The current is the phase-space
prefactor times one factor of `k_B T` from the parallel tail that starts
at `φ` and one factor of `k_B T` from the remaining energy integral that
starts at `0`. The prefactor `4 π m e / h³` is a hypothesis: the Boltzmann
tail replaces Fermi–Dirac, and the reflection coefficient is `1`.
-/

namespace PhysJS.RichardsonDushman

open Real MeasureTheory Set Filter intervalIntegral

lemma hasDerivAt_exp_antideriv (c x : ℝ) (hc : c ≠ 0) :
    HasDerivAt (fun t => -exp (-c * t) / c) (exp (-c * x)) x := by
  have hlin : HasDerivAt (fun t => -c * t) (-c) x := by
    simpa using (hasDerivAt_id x).const_mul (-c)
  have hexp := hlin.exp
  have hdiv := hexp.div_const c
  have hneg := hdiv.neg
  have hfun : HasDerivAt (fun t => -exp (-c * t) / c)
      (-(exp (-c * x) * -c / c)) x := by
    refine hneg.congr_of_eventuallyEq ?_
    filter_upwards with t
    simp [Pi.neg_apply, div_eq_mul_inv]
  exact hfun.congr_deriv (by field_simp [hc])

/-- `∫_a^∞ e^{−c x} dx = e^{−c a} / c` for `c > 0`. -/
theorem exp_tail (c a : ℝ) (hc : 0 < c) :
    ∫ x in Ioi a, exp (-c * x) = exp (-c * a) / c := by
  let f : ℝ → ℝ := fun t => exp (-c * t)
  have hcont : Continuous f :=
    continuous_exp.comp (continuous_const.mul continuous_id)
  have hFTC : ∀ R, a ≤ R →
      (∫ x in a..R, f x) = (-exp (-c * R) / c) - (-exp (-c * a) / c) := by
    intro R hR
    have hderiv : ∀ x ∈ uIcc a R, HasDerivAt (fun t => -exp (-c * t) / c) (f x) x :=
      fun x _ => hasDerivAt_exp_antideriv c x hc.ne'
    exact integral_eq_sub_of_hasDerivAt hderiv (hcont.intervalIntegrable a R)
  have hfi : ∀ R, IntegrableOn f (Ioc a R) := by
    intro R
    by_cases hle : R ≤ a
    · rw [Ioc_eq_empty (not_lt_of_ge hle)]
      exact integrableOn_empty
    · have hlt : a < R := lt_of_not_ge hle
      simpa [f, intervalIntegrable_iff, uIoc_of_le hlt.le] using hcont.intervalIntegrable a R
  have hbound : ∀ᶠ R in atTop, (∫ x in a..R, ‖f x‖) ≤ exp (-c * a) / c := by
    filter_upwards [eventually_ge_atTop a] with R hR
    have hnorm : (fun x => ‖f x‖) = f := by
      funext x
      simp [f, Real.norm_eq_abs, abs_of_pos (exp_pos _)]
    rw [hnorm, hFTC R hR]
    have hpos : 0 ≤ exp (-c * R) / c := div_nonneg (exp_pos _).le hc.le
    have hrewrite : (-exp (-c * R) / c) - (-exp (-c * a) / c) =
        exp (-c * a) / c - exp (-c * R) / c := by ring
    rw [hrewrite]
    linarith
  have hint := integrableOn_Ioi_of_intervalIntegral_norm_bounded (exp (-c * a) / c) a
    hfi tendsto_id hbound
  have hlim_anti : Tendsto (fun R => exp (-c * R)) atTop (nhds 0) :=
    tendsto_exp_atBot.comp
      ((tendsto_const_mul_atBot_of_neg (neg_lt_zero.mpr hc)).mpr tendsto_id)
  have hlim : Tendsto (fun R => ∫ x in a..R, f x) atTop
      (nhds (exp (-c * a) / c)) := by
    have hsub : Tendsto (fun R => (-exp (-c * R) / c) - (-exp (-c * a) / c)) atTop
        (nhds ((-0) / c - (-exp (-c * a) / c))) :=
      (hlim_anti.neg.div_const c).sub tendsto_const_nhds
    have hval : (-0) / c - (-exp (-c * a) / c) = exp (-c * a) / c := by
      ring
    rw [hval] at hsub
    refine hsub.congr' ?_
    filter_upwards [eventually_ge_atTop a] with R hR
    exact (hFTC R hR).symm
  have hset := intervalIntegral_tendsto_integral_Ioi a hint tendsto_id
  exact tendsto_nhds_unique hset hlim

/-- Richardson–Dushman current from the two energy tails.

`hpref` is `4 π m e / h³`. `e` is the elementary charge. The two integrals
are `exp_tail`. -/
theorem richardson_eq (J pref hpl φ kB T m e : ℝ)
    (hh : hpl ≠ 0) (hk : 0 < kB) (hT : 0 < T) (he : e ≠ 0)
    (hpref : pref = 4 * π * m * e / hpl ^ 3)
    (hJ : J = pref *
      (∫ ε in Ioi 0, exp (-ε / (kB * T))) *
      (∫ E in Ioi φ, exp (-E / (kB * T)))) :
    J * hpl ^ 3 * exp (φ / (kB * T)) = 4 * π * m * e * kB ^ 2 * T ^ 2 := by
  have hc : 0 < (1 : ℝ) / (kB * T) := by positivity
  have h0 := exp_tail (1 / (kB * T)) 0 hc
  have hφ := exp_tail (1 / (kB * T)) φ hc
  have htail0 : ∫ ε in Ioi 0, exp (-ε / (kB * T)) = kB * T := by
    have hcongr : ∫ ε in Ioi 0, exp (-ε / (kB * T)) =
        ∫ ε in Ioi 0, exp (-(1 / (kB * T)) * ε) := by
      refine setIntegral_congr_fun measurableSet_Ioi fun ε _ => ?_
      congr 1
      field_simp
    rw [hcongr, h0]
    have hzero : -(1 / (kB * T)) * 0 = 0 := by ring
    rw [hzero, exp_zero]
    field_simp [hk.ne', hT.ne']
  have htailφ : ∫ E in Ioi φ, exp (-E / (kB * T)) =
      kB * T * exp (-(φ / (kB * T))) := by
    have hcongr : ∫ E in Ioi φ, exp (-E / (kB * T)) =
        ∫ E in Ioi φ, exp (-(1 / (kB * T)) * E) := by
      refine setIntegral_congr_fun measurableSet_Ioi fun E _ => ?_
      congr 1
      field_simp
    rw [hcongr, hφ]
    field_simp [hk.ne', hT.ne']
  rw [hJ, htail0, htailφ]
  have hcancel : exp (-(φ / (kB * T))) * exp (φ / (kB * T)) = 1 := by
    rw [← exp_add]
    ring_nf
    exact exp_zero
  calc
    pref * (kB * T) * (kB * T * exp (-(φ / (kB * T)))) * hpl ^ 3 * exp (φ / (kB * T)) =
        pref * (kB * T) * (kB * T) *
          (exp (-(φ / (kB * T))) * exp (φ / (kB * T))) * hpl ^ 3 := by ring
    _ = pref * kB ^ 2 * T ^ 2 * hpl ^ 3 := by
      rw [hcancel]
      ring
    _ = 4 * π * m * e * kB ^ 2 * T ^ 2 := by
      rw [hpref]
      field_simp [hh]

end PhysJS.RichardsonDushman
