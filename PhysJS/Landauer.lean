/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.DerivHyp
import Physlib.StatisticalMechanics.CanonicalEnsemble.TwoState

/-!
`be-16`. Bridge. The encoded Landauer scale.

UPT stores a `formalRef` of kind `bridge` on `PhysJS.Landauer.erasure_eq`,
the equal-level two-state case. The covers line still begins with
`derivation-step`.

The encoded scalar is

```
E_min = k_B T log 2
```

Read here as the free-energy deficit `⟨E⟩ − F` of Physlib's equal-level
two-state ensemble. `equal_levels` is the entropy step,
`thermodynamicEntropy = k_B log 2`. For `T > 0` the closed forms of
`meanEnergy` and `helmholtzFreeEnergy` give `⟨E⟩ − F = T S`, so the
deficit is `k_B T log 2`. The common level cancels. At `T > 0`, levels
`E` and `E + δ` are not that deficit. At `T = 0`, `β = 0`, so the
Helmholtz closed form does not separate the levels. The inequality
`E ≥ T ΔS` for an arbitrary erasure protocol needs Clausius and is not
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

The entropy step of `be-16`. Not `E ≥ T ΔS`, and not the Bérut confrontation. -/
theorem equal_levels (E : ℝ) (T : Temperature) :
    (twoState E E).thermodynamicEntropy T = kB * log 2 := by
  rw [twoState_entropy_eq]
  simp [cosh_zero, tanh_zero, mul_one, mul_zero, sub_zero]

/-- Encoded scale, read as `⟨E⟩ − F` of the equal-level two-state ensemble. -/
noncomputable def erasureEnergy (E : ℝ) (T : Temperature) : ℝ :=
  (twoState E E).meanEnergy T - (twoState E E).helmholtzFreeEnergy T

lemma temp_ne_of_pos {T : Temperature} (hT : 0 < T.val) : T ≠ 0 := by
  intro hEq
  have hval : T.val ≠ 0 := hT.ne'
  rw [hEq] at hval
  exact hval rfl

/-- For any two levels and `T > 0`, `⟨E⟩ − F = T S`. -/
lemma deficit_eq_temp_mul_entropy (E₀ E₁ : ℝ) (T : Temperature) (hT : 0 < T.val) :
    (twoState E₀ E₁).meanEnergy T - (twoState E₀ E₁).helmholtzFreeEnergy T =
      (T.val : ℝ) * (twoState E₀ E₁).thermodynamicEntropy T := by
  have hTne : T ≠ 0 := temp_ne_of_pos hT
  have hβ : (β T : ℝ) ≠ 0 := (beta_pos T hT).ne'
  have hT0 : (T.val : ℝ) ≠ 0 := by exact_mod_cast hT.ne'
  have hinv : (T.val : ℝ) * kB = 1 / (β T : ℝ) := by
    have hkβ : (kB : ℝ) * (β T : ℝ) = 1 / (T.val : ℝ) := kB_mul_beta T hT
    field_simp [hβ, hT0, kB_ne_zero] at hkβ ⊢
    linarith
  rw [twoState_meanEnergy_eq, twoState_helmholtzFreeEnergy_eq_T_neq_zero E₀ E₁ T hTne,
    twoState_entropy_eq]
  set x : ℝ := (β T : ℝ) * (E₁ - E₀) / 2
  have hhalf : (E₁ - E₀) / 2 = x / (β T : ℝ) := by
    unfold x
    field_simp [hβ]
  rw [hhalf]
  have hassoc : (T.val : ℝ) * (kB * (log (2 * cosh x) - x * tanh x)) =
      ((T.val : ℝ) * kB) * (log (2 * cosh x) - x * tanh x) := by
    ring
  rw [hassoc, hinv]
  field_simp [hβ]
  ring

/-- The equal-level deficit is the encoded scale `k_B T log 2`.

Kind `bridge` on `PhysJS.Landauer.erasure_eq`. The covers line still
begins with `derivation-step`. Not `E ≥ T ΔS` for an arbitrary
protocol, and not the Bérut confrontation. -/
theorem erasure_eq (E : ℝ) (T : Temperature) (hT : 0 < T.val) :
    erasureEnergy E T = kB * (T.val : ℝ) * log 2 := by
  unfold erasureEnergy
  rw [deficit_eq_temp_mul_entropy E E T hT, equal_levels]
  ring

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

/-- At `T > 0`, unequal levels are not `k_B T log 2`. At `T = 0` the
Helmholtz closed form divides by `β = 0`. -/
theorem wrong_dictionary_deficit (E δ : ℝ) (T : Temperature) (hT : 0 < T.val) (hδ : δ ≠ 0) :
    (twoState E (E + δ)).meanEnergy T - (twoState E (E + δ)).helmholtzFreeEnergy T ≠
      kB * (T.val : ℝ) * log 2 := by
  intro hEq
  have hdef := deficit_eq_temp_mul_entropy E (E + δ) T hT
  have hT0 : (T.val : ℝ) ≠ 0 := by exact_mod_cast hT.ne'
  have hTne : T ≠ 0 := temp_ne_of_pos hT
  have hS : (twoState E (E + δ)).thermodynamicEntropy T = kB * log 2 := by
    apply mul_left_cancel₀ hT0
    have hscaled : (T.val : ℝ) * (twoState E (E + δ)).thermodynamicEntropy T =
        kB * (T.val : ℝ) * log 2 := by
      rw [← hdef]
      exact hEq
    simpa [mul_assoc, mul_left_comm, mul_comm] using hscaled
  exact wrong_dictionary_unequal E δ T hTne hδ hS

end PhysJS.Landauer
