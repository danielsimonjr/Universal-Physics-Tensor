/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-70`. Bridge. The electrical Einstein relation.

The catalog equation is

```
D = μ k_B T / q
```

`diffusion_eq` derives it where a drift flux cancels a diffusion flux.
The density is the classical Boltzmann profile in an electric potential,

```
n = n_ref exp(−q V / (k_B T))
```

and the field is `E = −dV/dx`. Equilibrium at one point of nonzero field
is `μ n E = D dn/dx`. The carrier charge `q` and `k_B T` are nonzero.
`n_ref > 0` keeps the profile positive.

`force_mobility_form` is the other writing `D = μ_force k_B T`, with the
relation `μ_force = μ / q` as a hypothesis. It is not a Langevin equation.
`charge_factor_needed` drops `q` and fails when `q ≠ 1`. `fermi_not_classical`
is `μ E_F / q`, the Fermi-liquid form, and it fails when `E_F ≠ k_B T`.
`coefficient_not_fixed` separates any other factor from `1`.

Not the Stokes–Einstein relation `D = k_B T / (6 π η a)`. The Boltzmann
profile is a hypothesis, not a master equation. A metal is not this profile.
-/

namespace PhysJS.EinsteinRelation

open Real Filter

/-- Diffusivity on the Boltzmann profile, where drift cancels diffusion.

`hn` is the classical equilibrium profile. `hE` is the electric field.
`heq` is detailed balance at `x`: the drift flux equals the diffusion
flux. `E ≠ 0` is what lets the cancellation fix `D`. -/
theorem diffusion_eq (n V : ℝ → ℝ) (nRef D μ q kB T E x : ℝ)
    (hnRef : 0 < nRef) (hkT : kB * T ≠ 0) (hq : q ≠ 0)
    (hV : DifferentiableAt ℝ V x)
    (hn : ∀ y, n y = nRef * Real.exp (-(q * V y) / (kB * T)))
    (hE : E = -(deriv V x)) (hE0 : E ≠ 0)
    (heq : μ * n x * E = D * deriv n x) :
    D = μ * kB * T / q := by
  have harg_eq : ∀ y, -(q * V y) / (kB * T) = (-q / (kB * T)) * V y := by
    intro y
    field_simp [hkT]
  have hlin : HasDerivAt (fun y => (-q / (kB * T)) * V y)
      ((-q / (kB * T)) * deriv V x) x :=
    hV.hasDerivAt.const_mul (-q / (kB * T))
  have harg : HasDerivAt (fun y => -(q * V y) / (kB * T))
      ((-q / (kB * T)) * deriv V x) x :=
    hlin.congr_of_eventuallyEq (Eventually.of_forall harg_eq)
  have hexp : HasDerivAt (fun y => Real.exp (-(q * V y) / (kB * T)))
      (Real.exp (-(q * V x) / (kB * T)) * ((-q / (kB * T)) * deriv V x)) x :=
    harg.exp
  have hmul := hexp.const_mul nRef
  have hAt : HasDerivAt n
      (nRef * (Real.exp (-(q * V x) / (kB * T)) *
        ((-q / (kB * T)) * deriv V x))) x :=
    hmul.congr_of_eventuallyEq (Eventually.of_forall hn)
  have hderiv : deriv n x = n x * (q / (kB * T)) * E := by
    rw [hAt.deriv, hn x, hE]
    ring
  have hbal : μ * n x * E = D * (n x * (q / (kB * T)) * E) := by
    rw [← hderiv]
    exact heq
  have hn0 : n x ≠ 0 := by
    rw [hn x]
    exact mul_ne_zero hnRef.ne' (Real.exp_ne_zero _)
  have hclear : μ * (kB * T) = D * q := by
    have hmul : μ * n x * E * (kB * T) = D * n x * q * E := by
      calc
        μ * n x * E * (kB * T) = D * (n x * (q / (kB * T)) * E) * (kB * T) := by rw [hbal]
        _ = D * n x * q * E * ((kB * T) / (kB * T)) := by ring
        _ = D * n x * q * E * 1 := by rw [div_self hkT]
        _ = D * n x * q * E := by ring
    apply mul_left_cancel₀ (mul_ne_zero hn0 hE0)
    calc
      n x * E * (μ * (kB * T)) = μ * n x * E * (kB * T) := by ring
      _ = D * n x * q * E := hmul
      _ = n x * E * (D * q) := by ring
  rw [eq_div_iff hq, hclear.symm]
  ring

/-- Force mobility and electrical mobility are the same relation when
`μ_force = μ / q`. That link is a hypothesis. -/
theorem force_mobility_form (μ μForce q kB T : ℝ) (hq : q ≠ 0)
    (hlink : μForce = μ / q) :
    μForce * kB * T = μ * kB * T / q := by
  rw [hlink]
  field_simp [hq]

/-- Dropping the charge fails when `q ≠ 1`. -/
theorem charge_factor_needed (μ kB T q : ℝ) (hμ : μ ≠ 0) (hkT : kB * T ≠ 0)
    (hq : q ≠ 0) (hq1 : q ≠ 1) :
    μ * kB * T / q ≠ μ * kB * T := by
  intro hEq
  field_simp [hμ, hkT, hq] at hEq
  apply hq1
  apply mul_left_cancel₀ hkT
  linarith

/-- The Fermi-liquid form is not the classical relation when `E_F ≠ k_B T`. -/
theorem fermi_not_classical (μ q EF kB T : ℝ) (hμ : μ ≠ 0) (hq : q ≠ 0)
    (hEF : EF ≠ kB * T) :
    μ * EF / q ≠ μ * kB * T / q := by
  intro hEq
  field_simp [hμ, hq] at hEq
  exact hEF hEq

/-- `D = C μ k_B T / q`. `C` is unfixed. -/
theorem coefficient_not_fixed (μ kB T q C : ℝ) (hμ : μ ≠ 0) (hkT : kB * T ≠ 0)
    (hq : q ≠ 0) (hC : C ≠ 1) :
    C * (μ * kB * T / q) ≠ μ * kB * T / q := by
  intro hEq
  field_simp [hμ, hkT, hq] at hEq
  apply hC
  apply mul_left_cancel₀ hkT
  linarith

/-- Stokes–Einstein is a different formula unless the mobility matches
`1 / (6 π η a)`. -/
theorem not_stokes (μ q kB T η a : ℝ) (hq : q ≠ 0) (hkT : kB * T ≠ 0)
    (hη : 0 < η) (ha : 0 < a)
    (hmiss : μ / q ≠ 1 / (6 * Real.pi * η * a)) :
    μ * kB * T / q ≠ kB * T / (6 * Real.pi * η * a) := by
  intro hEq
  have hden : 6 * Real.pi * η * a ≠ 0 := by positivity
  field_simp [hq, hkT, hden] at hEq
  have hmul : μ * (6 * Real.pi * η * a) = q := by
    apply mul_left_cancel₀ hkT
    calc
      (kB * T) * (μ * (6 * Real.pi * η * a)) = μ * kB * T * 6 * Real.pi * η * a := by ring
      _ = kB * T * q := hEq
      _ = (kB * T) * q := by ring
  have hratio : μ / q = 1 / (6 * Real.pi * η * a) := by
    field_simp [hq, hden]
    convert hmul using 1
    ring
  exact hmiss hratio

end PhysJS.EinsteinRelation
