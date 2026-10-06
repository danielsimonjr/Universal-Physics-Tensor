/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.KelvinRelation
import Mathlib.Analysis.Calculus.Deriv.Basic
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-170`. Bridge. Onsager reciprocity from a dissipation potential.

The catalog equation is `L12 = L21`. `onsager_eq` is the equality of mixed
partials of the quadratic potential

```
Φ = ½ L11 X1² + L12 X1 X2 + ½ L22 X2²
```

The flux `J_i = ∂Φ/∂X_i` has cross coefficients that are both `L12`.
`entropy_blind` shows an antisymmetric piece `A` drops out of `J · X` and
still separates the two flux coefficients when `A ≠ 0`. The zero-field
hypothesis is this potential: the magnetic case `L12(B) = L21(−B)` is not
this row. `thermoelectric_instance` applies `PhysJS.KelvinRelation.peltier_eq`,
the Kelvin relation of `be-73`, whose structure field is this equality.
It is not a second proof of `Π = S T`.
-/

namespace PhysJS.OnsagerReciprocity

/-- Quadratic dissipation potential. -/
noncomputable def dissipation (L11 L12 L22 X1 X2 : ℝ) : ℝ :=
  (1 / 2) * L11 * X1 ^ 2 + L12 * X1 * X2 + (1 / 2) * L22 * X2 ^ 2

lemma deriv_force1 (L11 L12 L22 X1 X2 : ℝ) :
    HasDerivAt (fun x => dissipation L11 L12 L22 x X2) (L11 * X1 + L12 * X2) X1 := by
  have hsq : HasDerivAt (fun x : ℝ => x ^ 2) (2 * X1) X1 := by
    simpa using hasDerivAt_pow 2 X1
  have hquad := hsq.const_mul ((1 / 2) * L11)
  have hcross : HasDerivAt (fun x : ℝ => L12 * x * X2) (L12 * X2) X1 := by
    have h := (hasDerivAt_id X1).const_mul (L12 * X2)
    simpa [mul_assoc, mul_left_comm, mul_comm] using h
  have hconst : HasDerivAt (fun _ : ℝ => (1 / 2) * L22 * X2 ^ 2) 0 X1 :=
    hasDerivAt_const X1 _
  have hsum := (hquad.add hcross).add hconst
  refine hsum.congr_deriv ?_
  ring

lemma deriv_force2 (L11 L12 L22 X1 X2 : ℝ) :
    HasDerivAt (fun y => dissipation L11 L12 L22 X1 y) (L12 * X1 + L22 * X2) X2 := by
  have hsq : HasDerivAt (fun y : ℝ => y ^ 2) (2 * X2) X2 := by
    simpa using hasDerivAt_pow 2 X2
  have hquad := hsq.const_mul ((1 / 2) * L22)
  have hcross : HasDerivAt (fun y : ℝ => L12 * X1 * y) (L12 * X1) X2 := by
    simpa [mul_assoc, mul_left_comm, mul_comm] using
      (hasDerivAt_id X2).const_mul (L12 * X1)
  have hconst : HasDerivAt (fun _ : ℝ => (1 / 2) * L11 * X1 ^ 2) 0 X2 :=
    hasDerivAt_const X2 _
  have hsum := (hconst.add hcross).add hquad
  refine hsum.congr_deriv ?_
  ring

/-- Mixed partials of `Φ` are both `L12`, so `L12 = L21`.

Kind `bridge` on `PhysJS.OnsagerReciprocity.onsager_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. -/
theorem onsager_eq (L11 L12 L22 X1 X2 : ℝ) :
    deriv (fun y => deriv (fun x => dissipation L11 L12 L22 x y) X1) X2 = L12 ∧
      deriv (fun x => deriv (fun y => dissipation L11 L12 L22 x y) X2) X1 = L12 := by
  have hinner1 : ∀ y, deriv (fun x => dissipation L11 L12 L22 x y) X1 =
      L11 * X1 + L12 * y := by
    intro y
    exact (deriv_force1 L11 L12 L22 X1 y).deriv
  have hinner2 : ∀ x, deriv (fun y => dissipation L11 L12 L22 x y) X2 =
      L12 * x + L22 * X2 := by
    intro x
    exact (deriv_force2 L11 L12 L22 x X2).deriv
  refine ⟨?_, ?_⟩
  · have hfun : (fun y => deriv (fun x => dissipation L11 L12 L22 x y) X1) =
        fun y => L11 * X1 + L12 * y := by
      funext y
      exact hinner1 y
    rw [hfun]
    have hderiv : HasDerivAt (fun y : ℝ => L11 * X1 + L12 * y) L12 X2 := by
      have hconst : HasDerivAt (fun _ : ℝ => L11 * X1) 0 X2 := hasDerivAt_const _ _
      have hraw := (hasDerivAt_id X2).const_mul L12
      have hlin : HasDerivAt (fun y : ℝ => L12 * y) (L12 * 1) X2 := by
        refine hraw.congr_of_eventuallyEq ?_
        filter_upwards with y
        simp
      exact (hconst.add hlin).congr_deriv (by ring)
    exact hderiv.deriv
  · have hfun : (fun x => deriv (fun y => dissipation L11 L12 L22 x y) X2) =
        fun x => L12 * x + L22 * X2 := by
      funext x
      exact hinner2 x
    rw [hfun]
    have hderiv : HasDerivAt (fun x : ℝ => L12 * x + L22 * X2) L12 X1 := by
      have hraw := (hasDerivAt_id X1).const_mul L12
      have hlin : HasDerivAt (fun x : ℝ => L12 * x) (L12 * 1) X1 := by
        refine hraw.congr_of_eventuallyEq ?_
        filter_upwards with x
        simp
      have hconst : HasDerivAt (fun _ : ℝ => L22 * X2) 0 X1 := hasDerivAt_const _ _
      exact (hlin.add hconst).congr_deriv (by ring)
    exact hderiv.deriv

/-- An antisymmetric cross term does not produce entropy, and it does split the fluxes. -/
theorem entropy_blind (A X1 X2 : ℝ) (hA : A ≠ 0) :
    (A * X2) * X1 + (-A * X1) * X2 = 0 ∧ A ≠ -A := by
  refine ⟨by ring, ?_⟩
  intro hEq
  have : (2 : ℝ) * A = 0 := by linarith
  exact hA (by linarith)

/-- The thermoelectric pair of `be-73` uses this equality as `R.onsager`.

`peltier_eq` is not re-proved. -/
theorem thermoelectric_instance (R : PhysJS.KelvinRelation.ThermoelectricOnsager)
    (Eopen dTopen Eiso : ℝ) (hdT : dTopen ≠ 0)
    (hopen : PhysJS.KelvinRelation.electricCurrent R.L11 R.L12 R.T Eopen dTopen = 0)
    (hiso : PhysJS.KelvinRelation.electricCurrent R.L11 R.L12 R.T Eiso 0 ≠ 0) :
    R.L12 = R.L21 ∧
      PhysJS.KelvinRelation.heatCurrent R.L21 R.L22 R.T Eiso 0 /
          PhysJS.KelvinRelation.electricCurrent R.L11 R.L12 R.T Eiso 0 =
        (Eopen / dTopen) * R.T :=
  ⟨R.onsager, PhysJS.KelvinRelation.peltier_eq R Eopen dTopen Eiso hdT hopen hiso⟩

end PhysJS.OnsagerReciprocity
