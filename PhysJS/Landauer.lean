/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.DerivHyp
import Physlib.StatisticalMechanics.CanonicalEnsemble.TwoState

/-!
`be-16`, the `ln 2` only. Property. Not a formalRef.

Physlib's two-state canonical ensemble has

```
(twoState E E).thermodynamicEntropy T = k_B log 2
```

for every temperature, including zero. At `T ≠ 0`, levels `E` and `E + δ`
are not that value. At `T = 0`, `β = 0`, so the same closed form does not
separate the levels. The inequality `E ≥ T ΔS` needs Clausius and is not
this entry. The Bérut confrontation is not this entry.
-/

namespace PhysJS.Landauer

open CanonicalEnsemble Temperature Constants Real

/-- `log(cosh x) − x sinh(x) / cosh(x)`. This is zero only at `x = 0`. -/
noncomputable def entropyGap (x : ℝ) : ℝ :=
  log (cosh x) - x * sinh x / cosh x

lemma entropyGap_zero : entropyGap 0 = 0 := by
  simp [entropyGap, cosh_zero, sinh_zero, log_one]

lemma entropyGap_even (x : ℝ) : entropyGap (-x) = entropyGap x := by
  simp [entropyGap, cosh_neg, sinh_neg, neg_mul, mul_neg]

lemma hasDerivAt_entropyGap (x : ℝ) :
    HasDerivAt entropyGap (-x / cosh x ^ 2) x := by
  have hcosh : HasDerivAt cosh (sinh x) x := hasDerivAt_cosh x
  have hsinh : HasDerivAt sinh (cosh x) x := hasDerivAt_sinh x
  have hne : cosh x ≠ 0 := (cosh_pos x).ne'
  have hlog : HasDerivAt (fun y => log (cosh y)) (sinh x / cosh x) x := hcosh.log hne
  have hmul : HasDerivAt (fun y => y * sinh y) (1 * sinh x + x * cosh x) x :=
    (hasDerivAt_id' x).mul hsinh
  have hdiv : HasDerivAt (fun y => y * sinh y / cosh y)
      (((1 * sinh x + x * cosh x) * cosh x - x * sinh x * sinh x) / cosh x ^ 2) x :=
    hmul.div hcosh hne
  suffices HasDerivAt (fun y => log (cosh y) - y * sinh y / cosh y) (-x / cosh x ^ 2) x by
    unfold entropyGap
    exact this
  convert hlog.sub hdiv using 1
  have hsq : cosh x ^ 2 - sinh x ^ 2 = 1 := cosh_sq_sub_sinh_sq x
  field_simp [hne]
  linear_combination x * hsq

lemma entropyGap_continuous : Continuous entropyGap := by
  refine Continuous.sub (Continuous.log continuous_cosh ?_) ?_
  · intro x
    exact (cosh_pos x).ne'
  · refine Continuous.div (continuous_id.mul continuous_sinh) continuous_cosh ?_
    intro x
    exact (cosh_pos x).ne'

/-- For `x ≠ 0` the gap is strictly negative, so the closed form is not `log 2`. -/
lemma entropyGap_lt_zero {x : ℝ} (hx : x ≠ 0) : entropyGap x < 0 := by
  have hanti : StrictAntiOn entropyGap (Set.Ici 0) := by
    refine strictAntiOn_of_deriv_neg (convex_Ici 0) entropyGap_continuous.continuousOn ?_
    intro y hy
    rw [interior_Ici, Set.mem_Ioi] at hy
    rw [(hasDerivAt_entropyGap y).deriv]
    exact div_neg_of_neg_of_pos (neg_lt_zero.mpr hy) (sq_pos_of_pos (cosh_pos y))
  have habs : entropyGap x = entropyGap |x| := by
    rcases le_total x 0 with hle | hle
    · rw [abs_of_nonpos hle, entropyGap_even]
    · rw [abs_of_nonneg hle]
  have hpos : 0 < |x| := abs_pos.mpr hx
  have hlt : entropyGap |x| < entropyGap 0 :=
    hanti (Set.mem_Ici.mpr (le_refl (0 : ℝ))) (Set.mem_Ici.mpr (abs_nonneg x)) hpos
  simpa [entropyGap_zero, habs] using hlt

/-- Equal levels give thermodynamic entropy `k_B log 2`.

Covers the property of `be-16`. Not `E ≥ T ΔS`, and not the Bérut confrontation. -/
theorem equal_levels (E : ℝ) (T : Temperature) :
    (twoState E E).thermodynamicEntropy T = kB * log 2 := by
  rw [twoState_entropy_eq]
  simp [cosh_zero, tanh_zero, mul_one, mul_zero, sub_zero]

/-- At `T ≠ 0`, unequal levels are not `k_B log 2`. At `T = 0` this fails,
because `β 0 = 0`. -/
theorem wrong_dictionary_unequal (E δ : ℝ) (T : Temperature) (hT : T ≠ 0) (hδ : δ ≠ 0) :
    (twoState E (E + δ)).thermodynamicEntropy T ≠ kB * log 2 := by
  rw [twoState_entropy_eq]
  set x : ℝ := (β T : ℝ) * δ / 2
  have hTval : T.val ≠ 0 := fun h => hT (Temperature.ext h)
  have hβ : (β T : ℝ) ≠ 0 := (beta_pos T (pos_iff_ne_zero.mpr hTval)).ne'
  have hx : x ≠ 0 := by
    intro hzero
    apply hδ
    have hmul : (β T : ℝ) * δ = 0 := by
      have htwice := congrArg (fun t : ℝ => t * 2) hzero
      simpa [x, div_mul_cancel₀ _ (two_ne_zero : (2 : ℝ) ≠ 0)] using htwice
    exact (mul_eq_zero.mp hmul).resolve_left hβ
  have harg : (β T : ℝ) * ((E + δ) - E) / 2 = x := by
    simp [x]
  rw [harg]
  intro heq
  have hinner : log (2 * cosh x) - x * tanh x = log 2 :=
    mul_left_cancel₀ kB_ne_zero heq
  have hsplit : log (2 * cosh x) - x * tanh x = log 2 + entropyGap x := by
    rw [log_mul (by norm_num : (2 : ℝ) ≠ 0) (cosh_pos x).ne', tanh_eq_sinh_div_cosh, entropyGap]
    ring
  have hgap : entropyGap x = 0 := by
    rw [hsplit] at hinner
    linarith
  exact (entropyGap_lt_zero hx).ne hgap

end PhysJS.Landauer
