/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-206`. Bridge. Darcy–Weisbach pressure drop with the Blasius friction factor.

The catalog equation is

```
Δp = f (L / D) ρ v² / 2,    f = 0.316 Re^(−1/4),    Re = ρ v D / μ
```

`darcy_weisbach_eq` derives the first part from a force balance on a pipe
segment (pressure drop times cross-section equals wall shear times wetted
area) and the definition of the Darcy factor through the wall shear,
`τ_w = f ρ v² / 8`. `laminar_eq` checks the convention against the laminar
Hagen–Poiseuille value (`f = 64 / Re` gives `Δp = 32 μ v L / D²`).
`blasius_eq` takes the Blasius law `f = c Re^(−1/4)` as an *empirical*
hypothesis (the constant `c` and the exponent are not derived; `c = 0.316`
is the usual fit for smooth pipes, `3000 < Re < 10⁵`) and proves what it
implies for the pressure drop,
`Δp = (c / 2) ρ^(3/4) μ^(1/4) v^(7/4) L D^(−5/4)`.
`velocity_scaling` separates that from the laminar (`v¹`) and fully rough
(`v²`) scalings.

Scope: fully developed incompressible flow in a smooth round pipe. Not a
derivation of 0.316 or of the exponent.
-/

namespace PhysJS.BlasiusFriction

open Real

/-- Force balance on a pipe segment plus the definition of the Darcy factor.

`hbal`: `Δp (π D² / 4) = τ_w (π D L)`. `hf`: `τ_w = f ρ v² / 8`.

Kind `bridge` on `PhysJS.BlasiusFriction.darcy_weisbach_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
model of `f`. -/
theorem darcy_weisbach_eq (Δp τw f ρ v D L : ℝ) (hD : 0 < D)
    (hbal : Δp * (π * D ^ 2 / 4) = τw * (π * D * L))
    (hf : τw = f * ρ * v ^ 2 / 8) :
    Δp = f * (L / D) * ρ * v ^ 2 / 2 := by
  have hπ : π ≠ 0 := Real.pi_ne_zero
  have hD0 : D ≠ 0 := hD.ne'
  rw [hf] at hbal
  field_simp at hbal ⊢
  linear_combination (1 / 4 : ℝ) * hbal

/-- Laminar convention check: `f = 64 / Re` is Hagen–Poiseuille. -/
theorem laminar_eq (Δp f ρ v D L μ : ℝ) (hρ : ρ ≠ 0) (hv : v ≠ 0) (hD : 0 < D)
    (hμ : μ ≠ 0)
    (hDW : Δp = f * (L / D) * ρ * v ^ 2 / 2)
    (hf : f = 64 / (ρ * v * D / μ)) :
    Δp = 32 * μ * v * L / D ^ 2 := by
  have hD0 : D ≠ 0 := hD.ne'
  rw [hDW, hf]
  field_simp
  ring

/-- Blasius law as an empirical hypothesis `f = c Re^(−1/4)`: the pressure drop
scales as `ρ^(3/4) μ^(1/4) v^(7/4) L D^(−5/4)`. -/
theorem blasius_eq (Δp f c ρ v D L μ : ℝ) (hρ : 0 < ρ) (hv : 0 < v) (hD : 0 < D)
    (hμ : 0 < μ)
    (hDW : Δp = f * (L / D) * ρ * v ^ 2 / 2)
    (hB : f = c * (ρ * v * D / μ) ^ (-(1 / 4 : ℝ))) :
    Δp = c / 2 * ρ ^ (3 / 4 : ℝ) * μ ^ (1 / 4 : ℝ) * v ^ (7 / 4 : ℝ) * L *
      D ^ (-(5 / 4 : ℝ)) := by
  have hRe : (ρ * v * D / μ) ^ (-(1 / 4 : ℝ)) =
      ρ ^ (-(1 / 4 : ℝ)) * v ^ (-(1 / 4 : ℝ)) * D ^ (-(1 / 4 : ℝ)) * μ ^ (1 / 4 : ℝ) := by
    rw [Real.div_rpow (by positivity) hμ.le, Real.mul_rpow (by positivity) hD.le,
      Real.mul_rpow hρ.le hv.le, Real.rpow_neg hμ.le]
    rw [Real.rpow_neg hρ.le, Real.rpow_neg hv.le, Real.rpow_neg hD.le]
    have : (μ ^ (1 / 4 : ℝ)) ≠ 0 := (Real.rpow_pos_of_pos hμ _).ne'
    simp only [one_div]
    field_simp
  have h1 : ρ ^ (3 / 4 : ℝ) = ρ * ρ ^ (-(1 / 4 : ℝ)) := by
    rw [show (3 / 4 : ℝ) = 1 + -(1 / 4) by norm_num, Real.rpow_add hρ, Real.rpow_one]
  have h2 : v ^ (7 / 4 : ℝ) = v ^ 2 * v ^ (-(1 / 4 : ℝ)) := by
    rw [show (7 / 4 : ℝ) = (2 : ℕ) + -(1 / 4) by norm_num, Real.rpow_add hv,
      Real.rpow_natCast]
  have h3 : D ^ (-(5 / 4 : ℝ)) = D ^ (-(1 / 4 : ℝ)) * D⁻¹ := by
    rw [show -(5 / 4 : ℝ) = -(1 / 4) + -1 by norm_num, Real.rpow_add hD,
      Real.rpow_neg_one]
  rw [hDW, hB, hRe, h1, h2, h3]
  have hD0 : D ≠ 0 := hD.ne'
  field_simp

/-- Force balance, wall-shear definition of `f`, and the empirical Blasius law
together: the catalog pair `Δp = f (L / D) ρ v² / 2`, `f = c Re^(−1/4)`.

Kind `bridge` on `PhysJS.BlasiusFriction.darcy_blasius_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. The
constant `c` (0.316) and the exponent are empirical hypotheses. -/
theorem darcy_blasius_eq (Δp τw f c ρ v D L μ : ℝ) (hρ : 0 < ρ) (hv : 0 < v)
    (hD : 0 < D) (hμ : 0 < μ)
    (hbal : Δp * (π * D ^ 2 / 4) = τw * (π * D * L))
    (hτ : τw = f * ρ * v ^ 2 / 8)
    (hB : f = c * (ρ * v * D / μ) ^ (-(1 / 4 : ℝ))) :
    Δp = f * (L / D) * ρ * v ^ 2 / 2 ∧
      Δp = c / 2 * ρ ^ (3 / 4 : ℝ) * μ ^ (1 / 4 : ℝ) * v ^ (7 / 4 : ℝ) * L *
        D ^ (-(5 / 4 : ℝ)) := by
  have h := darcy_weisbach_eq Δp τw f ρ v D L hD hbal hτ
  exact ⟨h, blasius_eq Δp f c ρ v D L μ hρ hv hD hμ h hB⟩

/-- Doubling the velocity multiplies the Blasius pressure drop by `2^(7/4)`,
strictly between the laminar factor `2` and the quadratic factor `4`. -/
theorem velocity_scaling : (2 : ℝ) < 2 ^ (7 / 4 : ℝ) ∧ (2 : ℝ) ^ (7 / 4 : ℝ) < 4 := by
  constructor
  · calc (2 : ℝ) = 2 ^ (1 : ℝ) := (Real.rpow_one 2).symm
      _ < 2 ^ (7 / 4 : ℝ) := Real.rpow_lt_rpow_of_exponent_lt (by norm_num) (by norm_num)
  · calc (2 : ℝ) ^ (7 / 4 : ℝ) < 2 ^ (2 : ℝ) :=
        Real.rpow_lt_rpow_of_exponent_lt (by norm_num) (by norm_num)
      _ = 4 := by norm_num

/-- The constant is not fixed by the structure: two constants give two
different pressure drops for the same flow. -/
theorem coefficient_not_fixed (c₁ c₂ x : ℝ) (hc : c₁ ≠ c₂) (hx : 0 < x) :
    c₁ * x ≠ c₂ * x := fun h => hc (mul_right_cancel₀ hx.ne' h)

end PhysJS.BlasiusFriction
