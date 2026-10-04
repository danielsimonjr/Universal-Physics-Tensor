/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-99`. Bridge. Intrinsic carrier density and the law of mass action.

The catalog equations are

```
n_i = √(N_c N_v) exp(−E_g / (2 k_B T))
n p = n_i²
```

`mass_action` derives both. The Boltzmann tails

```
n = N_c exp(−(E_c − μ) / (k_B T))
p = N_v exp(−(μ − E_v) / (k_B T))
```

with `E_g = E_c − E_v` are the hypotheses. Their product cancels `μ` and is
`N_c N_v exp(−E_g / (k_B T))`, which is the square of `n_i`. Dropping the `2`
in the exponent is a different density. Fermi–Dirac integrals are not this row.
-/

namespace PhysJS.MassAction

open Real

/-- Intrinsic density and `n p = n_i²`.

`hn` and `hp` are the nondegenerate Boltzmann tails. `hgap` is the gap.
`hni` is the geometric-mean definition of `n_i`.

Kind `bridge` on `PhysJS.MassAction.mass_action`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a
Fermi–Dirac integral. -/
theorem mass_action
    (n p ni Nc Nv Ec Ev μ Eg k T : ℝ)
    (_hkT : k * T ≠ 0) (hNc : 0 ≤ Nc) (hNv : 0 ≤ Nv)
    (hn : n = Nc * Real.exp (-(Ec - μ) / (k * T)))
    (hp : p = Nv * Real.exp (-(μ - Ev) / (k * T)))
    (hgap : Eg = Ec - Ev)
    (hni : ni = Real.sqrt (Nc * Nv) * Real.exp (-Eg / (2 * k * T))) :
    n * p = Nc * Nv * Real.exp (-Eg / (k * T)) ∧ n * p = ni ^ 2 := by
  have hprod : n * p =
      Nc * Nv * (Real.exp (-(Ec - μ) / (k * T)) * Real.exp (-(μ - Ev) / (k * T))) := by
    rw [hn, hp]
    ring
  have hexp : Real.exp (-(Ec - μ) / (k * T)) * Real.exp (-(μ - Ev) / (k * T)) =
      Real.exp ((-(Ec - μ) / (k * T)) + (-(μ - Ev) / (k * T))) := by
    rw [← Real.exp_add]
  have hsum : -(Ec - μ) / (k * T) + -(μ - Ev) / (k * T) = -Eg / (k * T) := by
    rw [hgap]
    field_simp [_hkT]
    ring
  have hnp : n * p = Nc * Nv * Real.exp (-Eg / (k * T)) := by
    rw [hprod, hexp, hsum]
  refine ⟨hnp, ?_⟩
  have hsq : (Real.sqrt (Nc * Nv)) ^ 2 = Nc * Nv := Real.sq_sqrt (mul_nonneg hNc hNv)
  have hdouble : -Eg / (k * T) = -Eg / (2 * k * T) + -Eg / (2 * k * T) := by
    field_simp [_hkT]
    ring
  have htwo : (Real.exp (-Eg / (2 * k * T))) ^ 2 = Real.exp (-Eg / (k * T)) := by
    rw [pow_two, ← Real.exp_add, ← hdouble]
  rw [hnp, hni]
  have hsqmul : (Real.sqrt (Nc * Nv) * Real.exp (-Eg / (2 * k * T))) ^ 2 =
      (Real.sqrt (Nc * Nv)) ^ 2 * (Real.exp (-Eg / (2 * k * T))) ^ 2 := by
    ring
  rw [hsqmul, hsq, htwo]

/-- The exponent without the factor `2` is not `n_i`. -/
theorem half_gap_needed (Nc Nv Eg kT : ℝ) (hpos : 0 < Nc * Nv) (hEg : Eg ≠ 0) (hkT : kT ≠ 0) :
    Real.sqrt (Nc * Nv) * Real.exp (-Eg / kT) ≠
      Real.sqrt (Nc * Nv) * Real.exp (-Eg / (2 * kT)) := by
  intro hEq
  have hs : Real.sqrt (Nc * Nv) ≠ 0 := (Real.sqrt_pos.mpr hpos).ne'
  have hexp : Real.exp (-Eg / kT) = Real.exp (-Eg / (2 * kT)) :=
    mul_left_cancel₀ hs hEq
  have harg := Real.exp_injective hexp
  have hden2 : (2 : ℝ) * kT ≠ 0 := mul_ne_zero (by norm_num) hkT
  field_simp [hkT, hden2] at harg
  linarith

end PhysJS.MassAction
