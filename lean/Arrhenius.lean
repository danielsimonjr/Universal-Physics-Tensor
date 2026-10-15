/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.ImproperIntegrals
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-147`. Bridge. Arrhenius rate, molar and per molecule.

The catalog equation is

```
k = A exp(−Ea / (R T)),   R = N_A k_B
```

with `A` independent of temperature. `arrhenius_eq` derives it. The
premise is Arrhenius's definition of the activation energy,

```
Ea = R T² d(ln k)/dT,
```

held constant for every `T > 0`, with `k` positive and differentiable. The
rate is then `A exp(−Ea / (R T))` for one constant `A > 0`. With
`R = N_A k_B` and `ε = Ea / N_A`, the same rate is `A` times the fraction
of a Boltzmann population `exp(−E / (k_B T))` on `E > 0` whose energy
exceeds `ε`. That fraction is `exp(−ε / (k_B T))` (`boltzmann_tail`), so
the molar exponential is the molecular Boltzmann factor.

`activation_energy` is the converse: every `A exp(−Ea / (R T))` with a
constant `A > 0` has `R T² d(ln k)/dT = Ea`. `log_linear` is the straight
line `ln k = ln A − (Ea / R)(1 / T)`, `two_temperature` the ratio form
`ln(k₂ / k₁) = −(Ea / R)(1 / T₂ − 1 / T₁)`, and `rate_pos` and
`rate_strictMonoOn` positivity and strict increase in `T` for `Ea > 0`.

The prefactor is not derived. The Boltzmann population has a weight
`exp(−E / (k_B T))` per unit energy, a constant density of states. Collision
theory and Eyring (`be-148`) put a temperature-dependent factor in front;
that is not this row.
-/

namespace PhysJS.Arrhenius

/-- The `R = N_A k_B` step: the molar exponent at barrier `Ea` is the
molecular exponent at `ε = Ea / N_A`. -/
theorem molar_exponent (Ea R T NA kB ε : ℝ)
    (hR : R = NA * kB) (hε : ε = Ea / NA) :
    -Ea / (R * T) = -ε / (kB * T) := by
  rw [hR, hε, neg_div, neg_div, neg_inj, div_div, mul_assoc]

/-- Boltzmann tail. With weight `exp(−E / (k_B T))` on `E > 0`, the share of
the population above `ε` is `exp(−ε / (k_B T))`. For `ε ≥ 0` this is a
fraction of the whole population. -/
theorem boltzmann_tail (kB T ε : ℝ) (hkB : 0 < kB) (hT : 0 < T) :
    (∫ E in Set.Ioi ε, Real.exp (-E / (kB * T))) /
        (∫ E in Set.Ioi 0, Real.exp (-E / (kB * T))) =
      Real.exp (-ε / (kB * T)) := by
  have hkT : 0 < kB * T := mul_pos hkB hT
  set a : ℝ := -(kB * T)⁻¹ with ha_def
  have ha : a < 0 := neg_neg_of_pos (inv_pos.mpr hkT)
  have hfun : (fun E : ℝ => Real.exp (-E / (kB * T))) =
      fun E : ℝ => Real.exp (a * E) := by
    funext E
    rw [ha_def]
    ring_nf
  rw [hfun, integral_exp_mul_Ioi ha ε, integral_exp_mul_Ioi ha 0, mul_zero,
    Real.exp_zero]
  have hne : a ≠ 0 := ha.ne
  field_simp
  rw [ha_def]
  ring_nf

/-- Arrhenius from a constant activation energy, molar and per molecule.

`k t` is the rate at temperature `t`. It is positive and differentiable on
`t > 0`, and its activation energy `R t² d(ln k)/dt` is the same `Ea` at
every `t > 0`. Then one constant `A > 0` gives, at every `T > 0`,
`k T = A exp(−Ea / (R T))`, and, at `R = N_A k_B` and `ε = Ea / N_A`,
`k T = A` times the Boltzmann share above `ε` of `boltzmann_tail`. -/
theorem arrhenius_eq (k : ℝ → ℝ) (Ea R NA kB ε : ℝ)
    (hNA : 0 < NA) (hkB : 0 < kB)
    (hR : R = NA * kB) (hε : ε = Ea / NA)
    (hpos : ∀ t, 0 < t → 0 < k t)
    (hdiff : ∀ t, 0 < t → DifferentiableAt ℝ k t)
    (hEa : ∀ t, 0 < t → R * t ^ 2 * deriv (fun s => Real.log (k s)) t = Ea) :
    ∃ A : ℝ, 0 < A ∧ ∀ T, 0 < T →
      k T = A * Real.exp (-Ea / (R * T)) ∧
      k T = A * ((∫ E in Set.Ioi ε, Real.exp (-E / (kB * T))) /
        (∫ E in Set.Ioi 0, Real.exp (-E / (kB * T)))) := by
  have hR0 : R ≠ 0 := by
    rw [hR]
    exact mul_ne_zero hNA.ne' hkB.ne'
  -- `ln k + (Ea / R) / t` has zero derivative on `t > 0`.
  set g : ℝ → ℝ := fun t => Real.log (k t) + Ea / R * t⁻¹ with hg
  have hlogd : ∀ t, 0 < t → DifferentiableAt ℝ (fun s => Real.log (k s)) t :=
    fun t ht => (hdiff t ht).log (hpos t ht).ne'
  have hgd : ∀ t, 0 < t →
      HasDerivAt g (deriv (fun s => Real.log (k s)) t + Ea / R * (-(t ^ 2)⁻¹)) t :=
    fun t ht => (hlogd t ht).hasDerivAt.add ((hasDerivAt_inv ht.ne').const_mul (Ea / R))
  have hzero : Set.EqOn (deriv g) 0 (Set.Ioi 0) := by
    intro t ht
    have ht' : 0 < t := ht
    rw [(hgd t ht').deriv, Pi.zero_apply]
    have hdl : deriv (fun s => Real.log (k s)) t = Ea / (R * t ^ 2) := by
      rw [← hEa t ht']
      field_simp [hR0, ht'.ne']
    rw [hdl]
    field_simp [hR0, ht'.ne']
    ring
  have hgdiff : DifferentiableOn ℝ g (Set.Ioi 0) :=
    fun t ht => (hgd t ht).differentiableAt.differentiableWithinAt
  obtain ⟨c, hc⟩ :=
    isOpen_Ioi.exists_is_const_of_deriv_eq_zero isPreconnected_Ioi hgdiff hzero
  refine ⟨Real.exp c, Real.exp_pos c, fun T hT => ?_⟩
  have hmolar : k T = Real.exp c * Real.exp (-Ea / (R * T)) := by
    have hgT : Real.log (k T) + Ea / R * T⁻¹ = c := hc T hT
    rw [← Real.exp_add, ← Real.exp_log (hpos T hT)]
    congr 1
    rw [← hgT]
    field_simp [hR0, hT.ne']
    ring
  refine ⟨hmolar, ?_⟩
  rw [boltzmann_tail kB T ε hkB hT, hmolar,
    molar_exponent Ea R T NA kB ε hR hε]

/-- The converse. A rate `A exp(−Ea / (R t))` with constant `A > 0` has
activation energy `R T² d(ln k)/dT = Ea` at every `T > 0`. -/
theorem activation_energy (A Ea R T : ℝ) (hA : 0 < A) (hR : R ≠ 0) (hT : 0 < T) :
    R * T ^ 2 *
        deriv (fun t => Real.log (A * Real.exp (-Ea / (R * t)))) T = Ea := by
  have hfun : (fun t => Real.log (A * Real.exp (-Ea / (R * t)))) =ᶠ[nhds T]
      fun t => Real.log A + (-Ea / R) * t⁻¹ := by
    filter_upwards [eventually_ne_nhds hT.ne'] with t ht
    rw [Real.log_mul hA.ne' (Real.exp_ne_zero _), Real.log_exp]
    field_simp [hR, ht]
  have hd : HasDerivAt (fun t => Real.log A + (-Ea / R) * t⁻¹)
      ((-Ea / R) * (-(T ^ 2)⁻¹)) T := by
    simpa using ((hasDerivAt_inv hT.ne').const_mul (-Ea / R)).const_add (Real.log A)
  rw [(hd.congr_of_eventuallyEq hfun).deriv]
  field_simp [hR, hT.ne']

/-- `ln k` is linear in `1 / T` with slope `−Ea / R`. -/
theorem log_linear (A Ea R T : ℝ) (hA : 0 < A) (hR : R ≠ 0) (hT : T ≠ 0) :
    Real.log (A * Real.exp (-Ea / (R * T))) = Real.log A - Ea / R * (1 / T) := by
  rw [Real.log_mul hA.ne' (Real.exp_ne_zero _), Real.log_exp]
  field_simp [hR, hT]
  ring

/-- Two temperatures: `ln(k₂ / k₁) = −(Ea / R)(1 / T₂ − 1 / T₁)`. -/
theorem two_temperature (A Ea R T₁ T₂ : ℝ) (hA : 0 < A) (hR : R ≠ 0)
    (hT₁ : T₁ ≠ 0) (hT₂ : T₂ ≠ 0) :
    Real.log (A * Real.exp (-Ea / (R * T₂)) / (A * Real.exp (-Ea / (R * T₁)))) =
      -(Ea / R) * (1 / T₂ - 1 / T₁) := by
  rw [Real.log_div (mul_pos hA (Real.exp_pos _)).ne' (mul_pos hA (Real.exp_pos _)).ne',
    log_linear A Ea R T₂ hA hR hT₂, log_linear A Ea R T₁ hA hR hT₁]
  ring

/-- The rate is positive. -/
theorem rate_pos (A Ea R T : ℝ) (hA : 0 < A) : 0 < A * Real.exp (-Ea / (R * T)) :=
  mul_pos hA (Real.exp_pos _)

/-- With `A > 0`, `Ea > 0` and `R > 0`, the rate strictly increases with `T > 0`. -/
theorem rate_strictMonoOn (A Ea R : ℝ) (hA : 0 < A) (hEa : 0 < Ea) (hR : 0 < R) :
    StrictMonoOn (fun T => A * Real.exp (-Ea / (R * T))) (Set.Ioi 0) := by
  intro T₁ hT₁ T₂ hT₂ hlt
  have h₁ : (0 : ℝ) < T₁ := hT₁
  have harg : -Ea / (R * T₁) < -Ea / (R * T₂) := by
    rw [neg_div, neg_div, neg_lt_neg_iff]
    exact div_lt_div_of_pos_left hEa (mul_pos hR h₁) (mul_lt_mul_of_pos_left hlt hR)
  exact mul_lt_mul_of_pos_left (Real.exp_lt_exp.mpr harg) hA

/-- A barrier of zero is not a positive molar barrier. -/
theorem barrier_needed (A Ea R T : ℝ) (hA : A ≠ 0) (hEa : Ea ≠ 0) (hRT : R * T ≠ 0) :
    A * Real.exp (-Ea / (R * T)) ≠ A := by
  intro hEq
  have hEq' : A * Real.exp (-Ea / (R * T)) = A * 1 := by simpa [mul_one] using hEq
  have hexp : Real.exp (-Ea / (R * T)) = 1 := mul_left_cancel₀ hA hEq'
  have harg : -Ea / (R * T) = 0 :=
    Real.exp_injective (hexp.trans Real.exp_zero.symm)
  rcases div_eq_zero_iff.mp harg with hEa0 | hden
  · exact hEa (neg_eq_zero.mp hEa0)
  · exact absurd hden hRT

end PhysJS.Arrhenius
