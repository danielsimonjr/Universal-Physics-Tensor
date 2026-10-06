/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-144`. Bridge. Matthiessen's rule.

The catalog equations are

```
1/τ = 1/τ₁ + 1/τ₂
ρ = ρ₁ + ρ₂
```

when each resistivity is proportional to the scattering rate of one
mechanism. `matthiessen` derives both. Independence is the hypothesis that
the joint survival is the product of the exponential survivals,

```
exp(−t / τ) = exp(−t / τ₁) exp(−t / τ₂)
```

`Real.exp` is injective, so the rates add. The common Drude factor
`ρ_i = C / τ_i` then makes the resistivities add. A mechanism that changes
the distribution, rather than only the lifetime, is outside this sum. The
times are nonzero. This is not a collision integral.
-/

namespace PhysJS.Matthiessen

open Real

/-- Independent exponential clocks add their rates. -/
theorem rate_sum (τ τ1 τ2 : ℝ) (hτ : τ ≠ 0) (hτ1 : τ1 ≠ 0) (hτ2 : τ2 ≠ 0)
    (hsurv : ∀ t, Real.exp (-t / τ) = Real.exp (-t / τ1) * Real.exp (-t / τ2)) :
    1 / τ = 1 / τ1 + 1 / τ2 := by
  have _ := hτ
  have _ := hτ1
  have _ := hτ2
  have hprod : Real.exp (-(1 : ℝ) / τ) =
      Real.exp (-(1 : ℝ) / τ1 + -(1 : ℝ) / τ2) := by
    rw [hsurv 1, ← Real.exp_add]
  have harg := Real.exp_injective hprod
  rw [show (-(1 : ℝ) / τ) = -(1 / τ) by ring,
    show (-(1 : ℝ) / τ1) = -(1 / τ1) by ring,
    show (-(1 : ℝ) / τ2) = -(1 / τ2) by ring, ← neg_add] at harg
  exact neg_injective harg

/-- Matthiessen's rule.

`hsurv` is independence of the two Poisson processes. `hρ`, `hρ1`, and
`hρ2` are one Drude factor `C` on each lifetime.

Kind `bridge` on `PhysJS.Matthiessen.matthiessen`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a collision
integral. -/
theorem matthiessen (τ τ1 τ2 ρ ρ1 ρ2 C : ℝ)
    (hτ : τ ≠ 0) (hτ1 : τ1 ≠ 0) (hτ2 : τ2 ≠ 0)
    (hsurv : ∀ t, Real.exp (-t / τ) = Real.exp (-t / τ1) * Real.exp (-t / τ2))
    (hρ : ρ = C / τ) (hρ1 : ρ1 = C / τ1) (hρ2 : ρ2 = C / τ2) :
    1 / τ = 1 / τ1 + 1 / τ2 ∧ ρ = ρ1 + ρ2 := by
  have hrates := rate_sum τ τ1 τ2 hτ hτ1 hτ2 hsurv
  refine ⟨hrates, ?_⟩
  rw [hρ, hρ1, hρ2]
  have hsum : C / τ = C * (1 / τ1 + 1 / τ2) := by
    rw [← hrates]
    field_simp [hτ]
  rw [hsum]
  field_simp [hτ1, hτ2]

/-- One lifetime is not the parallel sum. -/
theorem single_not_sum (τ1 τ2 : ℝ) (_hτ1 : τ1 ≠ 0) (hτ2 : τ2 ≠ 0) :
    1 / τ1 ≠ 1 / τ1 + 1 / τ2 := by
  intro hEq
  exact one_div_ne_zero hτ2 (by linarith : (1 : ℝ) / τ2 = 0)

end PhysJS.Matthiessen
