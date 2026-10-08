/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-150`. Bridge. Standard reaction Gibbs energy.

The catalog equation is

```
ΔG° = −R T ln K
```

`gibbs_eq` derives it from the ideal activities `μ_i = μ_i° + R T ln a_i`.
At equilibrium the reaction sum `Σ ν_i μ_i` is zero. `ΔG°` is the standard
sum `Σ ν_i μ_i°`, and `ln K = Σ ν_i ln a_i`. Every activity in the sum is
positive, so each logarithm is the real logarithm. This is the equilibrium
condition, not a measured constant.
-/

namespace PhysJS.GibbsIsotherm

/-- Equilibrium of ideal activities is `ΔG° = −R T ln K`.

`hμ` is `μ_i = μ_i° + R T ln a_i`. `hequil` is `Σ ν_i μ_i = 0`.
`hlogK` is the definition `ln K = Σ ν_i ln a_i`, and `hdG` is
`ΔG° = Σ ν_i μ_i°`. -/
theorem gibbs_eq {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ) (R T K dG : ℝ)
    (hT : T ≠ 0) (hR : R ≠ 0) (hK : 0 < K)
    (hact : ∀ i ∈ s, 0 < a i)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogK : Real.log K = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ0 i)
    (hequil : ∑ i ∈ s, ν i * μ i = 0) :
    dG = -R * T * Real.log K ∧ Real.log K = -dG / (R * T) ∧
      Real.exp (Real.log K) = K := by
  have hterm : ∀ i ∈ s, ν i * μ i =
      ν i * μ0 i + (R * T) * (ν i * Real.log (a i)) := by
    intro i hi
    have _hpos := hact i hi
    rw [hμ i hi]
    ring
  have hsplit : ∑ i ∈ s, ν i * μ i =
      ∑ i ∈ s, ν i * μ0 i + (R * T) * ∑ i ∈ s, ν i * Real.log (a i) := by
    rw [show ∑ i ∈ s, ν i * μ i =
        ∑ i ∈ s, (ν i * μ0 i + (R * T) * (ν i * Real.log (a i))) from
      Finset.sum_congr rfl hterm, Finset.sum_add_distrib, Finset.mul_sum]
  rw [hequil, ← hdG, ← hlogK] at hsplit
  have hprod : dG + R * T * Real.log K = 0 := by linarith
  refine ⟨?_, ?_, Real.exp_log hK⟩
  · linarith
  · have hRT : R * T ≠ 0 := mul_ne_zero hR hT
    field_simp [hRT] at hprod ⊢
    linarith

/-- Dropping the minus sign is not the equilibrium condition. -/
theorem sign_needed (R T K : ℝ) (hRT : R * T ≠ 0) (hK : K ≠ 1) (hpos : 0 < K) :
    -R * T * Real.log K ≠ R * T * Real.log K := by
  intro hEq
  have hlog : Real.log K ≠ 0 := by
    intro h0
    have : K = 1 := by
      have h := congrArg Real.exp h0
      rw [Real.exp_log hpos, Real.exp_zero] at h
      exact h
    exact hK this
  have htwice : (2 : ℝ) * (R * T * Real.log K) = 0 := by linarith
  have : R * T * Real.log K = 0 := by linarith
  exact hlog ((mul_eq_zero.mp this).resolve_left hRT)

end PhysJS.GibbsIsotherm
