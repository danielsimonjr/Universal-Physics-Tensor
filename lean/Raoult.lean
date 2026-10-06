/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.GibbsIsotherm
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-153`. Bridge. Raoult's law.

The catalog equation is

```
P_i = x_i P_i*
```

`raoult_eq` derives it by calling `PhysJS.GibbsIsotherm.gibbs_eq` twice.
Species `0` is the vapor and species `1` is the liquid, with `ν = (1, −1)`.
The liquid activity is the mole fraction `x`, and the vapor activity is
`P / P°`. The pure liquid, activity `1`, equilibrates at `P*`. Both
equilibria share the standard sum `ΔG° = μ_v° − μ_l°`, so the equilibrium
constants agree and `P / x = P*`. A real mixture with a different activity
is not this row. This is not a second proof of `be-150`.
-/

namespace PhysJS.Raoult

/-- Partial pressure of an ideal component, from the Gibbs isotherm.

Kind `bridge` on `PhysJS.Raoult.raoult_eq`, once the catalog entry exists.
The covers line still begins with `derivation-step`. -/
theorem raoult_eq (μ0v μ0l R T P x Psat Pstd : ℝ)
    (hT : T ≠ 0) (hR : R ≠ 0) (hPstd : 0 < Pstd) (hx : 0 < x) (hP : 0 < P)
    (hPsat : 0 < Psat)
    (hequil : (μ0v + R * T * Real.log (P / Pstd)) - (μ0l + R * T * Real.log x) = 0)
    (hequilPure : (μ0v + R * T * Real.log (Psat / Pstd)) - μ0l = 0) :
    P = x * Psat := by
  classical
  let s : Finset (Fin 2) := Finset.univ
  let ν : Fin 2 → ℝ := fun i => if i = 0 then 1 else -1
  let μ0 : Fin 2 → ℝ := fun i => if i = 0 then μ0v else μ0l
  let a : Fin 2 → ℝ := fun i => if i = 0 then P / Pstd else x
  let μ : Fin 2 → ℝ := fun i => μ0 i + R * T * Real.log (a i)
  let K : ℝ := (P / Pstd) / x
  have hK : 0 < K := div_pos (div_pos hP hPstd) hx
  have hact : ∀ i ∈ s, 0 < a i := by
    intro i _
    fin_cases i
    · simpa [a] using div_pos hP hPstd
    · simpa [a] using hx
  have hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i) := fun _ _ => rfl
  have hν0 : ν 0 = 1 := by simp [ν]
  have hν1 : ν 1 = -1 := by simp [ν]
  have ha0 : a 0 = P / Pstd := by simp [a]
  have ha1 : a 1 = x := by simp [a]
  have hμ00 : μ0 0 = μ0v := by simp [μ0]
  have hμ01 : μ0 1 = μ0l := by simp [μ0]
  have hlogK : Real.log K = ∑ i ∈ s, ν i * Real.log (a i) := by
    rw [Fin.sum_univ_two, hν0, hν1, ha0, ha1]
    change Real.log ((P / Pstd) / x) =
      1 * Real.log (P / Pstd) + -1 * Real.log x
    rw [Real.log_div (div_pos hP hPstd).ne' hx.ne']
    ring
  let dG : ℝ := μ0v - μ0l
  have hdG : dG = ∑ i ∈ s, ν i * μ0 i := by
    rw [Fin.sum_univ_two, hν0, hν1, hμ00, hμ01]
    change μ0v - μ0l = 1 * μ0v + -1 * μ0l
    ring
  have heqsum : ∑ i ∈ s, ν i * μ i = 0 := by
    rw [Fin.sum_univ_two, hν0, hν1]
    simp only [μ, hμ00, hμ01, ha0, ha1]
    convert hequil using 1
    ring_nf
  have hG :=
    PhysJS.GibbsIsotherm.gibbs_eq s ν μ μ0 a R T K dG hT hR hK hact hμ hlogK hdG heqsum
  let ap : Fin 2 → ℝ := fun i => if i = 0 then Psat / Pstd else 1
  let μp : Fin 2 → ℝ := fun i => μ0 i + R * T * Real.log (ap i)
  let Kp : ℝ := Psat / Pstd
  have hKp : 0 < Kp := div_pos hPsat hPstd
  have hactp : ∀ i ∈ s, 0 < ap i := by
    intro i _
    fin_cases i
    · simpa [ap] using div_pos hPsat hPstd
    · simp [ap]
  have hμp : ∀ i ∈ s, μp i = μ0 i + R * T * Real.log (ap i) := fun _ _ => rfl
  have hap0 : ap 0 = Psat / Pstd := by simp [ap]
  have hap1 : ap 1 = 1 := by simp [ap]
  have hlogKp : Real.log Kp = ∑ i ∈ s, ν i * Real.log (ap i) := by
    rw [Fin.sum_univ_two, hν0, hν1, hap0, hap1, Real.log_one]
    change Real.log (Psat / Pstd) = 1 * Real.log (Psat / Pstd) + -1 * 0
    ring
  have heqsump : ∑ i ∈ s, ν i * μp i = 0 := by
    rw [Fin.sum_univ_two, hν0, hν1]
    simp only [μp, hμ00, hμ01, hap0, hap1, Real.log_one, mul_zero, add_zero]
    convert hequilPure using 1
    ring_nf
  have hGp :=
    PhysJS.GibbsIsotherm.gibbs_eq s ν μp μ0 ap R T Kp dG hT hR hKp hactp hμp hlogKp hdG heqsump
  have hlogs : Real.log K = Real.log Kp := by
    have hRT : R * T ≠ 0 := mul_ne_zero hR hT
    have hclear : R * T * Real.log K = R * T * Real.log Kp := by
      linarith [hG.2.1, hGp.2.1]
    exact mul_left_cancel₀ hRT hclear
  have hKeq : K = Kp := by
    have h := congrArg Real.exp hlogs
    rwa [Real.exp_log hK, Real.exp_log hKp] at h
  have hPeq : P = x * Psat := by
    have hdiv : (P / Pstd) / x = Psat / Pstd := hKeq
    have hmul := congrArg (fun z : ℝ => z * x * Pstd) hdiv
    have hleft : (P / Pstd) / x * x * Pstd = P := by
      field_simp [hx.ne', hPstd.ne']
    have hright : Psat / Pstd * x * Pstd = x * Psat := by
      field_simp [hPstd.ne']
    linarith
  exact hPeq

end PhysJS.Raoult
