/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.KelvinRelation
import Mathlib.Analysis.Calculus.Deriv.Basic
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-170`. Bridge. Onsager reciprocity from microscopic reversibility.

The catalog equation is `L12 = L21`. The system jumps between finitely
many states `i` with rates `W i j`, and its equilibrium distribution `π`
has detailed balance, `π_i W_ij = π_j W_ji`: every jump is as frequent as
its reverse, which is microscopic reversibility at zero field. Onsager's
regression takes the kinetic coefficient of the observables `A_a`, `A_b` to
be the initial slope of their equilibrium cross-correlation,

```
L_ab = d/dt ⟨A_a(t) A_b(0)⟩ at t = 0 = ∑_{i,j} π_i A_b(i) W_ij A_a(j)
```

`onsager_eq` proves `L_ab = L_ba` from detailed balance, so `L12 = L21`.
`not_without_balance` is a three-state cycle without detailed balance whose
coefficients differ, so the hypothesis is needed. `potential_symmetric` is
the macroscopic reading, the equal mixed partials of the quadratic
dissipation potential

```
Φ = ½ L11 X1² + L12 X1 X2 + ½ L22 X2²
```

`entropy_blind` shows an antisymmetric piece `A` drops out of `J · X` and
still separates the two flux coefficients when `A ≠ 0`. The magnetic case
`L12(B) = L21(−B)` is not this row. `thermoelectric_instance` applies
`PhysJS.KelvinRelation.peltier_eq`, the Kelvin relation of `be-73`, whose
structure field is this equality. It is not a second proof of `Π = S T`.
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

/-- Kinetic coefficient: equilibrium regression sum. -/
noncomputable def kinetic {ι : Type*} [Fintype ι] (π : ι → ℝ) (W : ι → ι → ℝ) (A_a A_b : ι → ℝ) : ℝ :=
  ∑ i, ∑ j, π i * A_b i * W i j * A_a j

noncomputable def obsGenerator {ι : Type*} [Fintype ι] (W : ι → ι → ℝ) (f : ι → ℝ) (i : ι) : ℝ :=
  ∑ j, W i j * (f j - f i)

def rowSumZero {ι : Type*} [Fintype ι] (W : ι → ι → ℝ) : Prop :=
  ∀ i, ∑ j, W i j = 0

theorem obsGenerator_eq_sum {ι : Type*} [Fintype ι] (W : ι → ι → ℝ) (f : ι → ℝ) (i : ι)
    (hrow : ∑ j, W i j = 0) :
    obsGenerator W f i = ∑ j, W i j * f j := by
  unfold obsGenerator
  calc
    ∑ j, W i j * (f j - f i) = ∑ j, (W i j * f j - W i j * f i) := by
      refine Finset.sum_congr rfl fun j _ => ?_
      ring
    _ = ∑ j, W i j * f j - ∑ j, W i j * f i := by
      rw [Finset.sum_sub_distrib]
    _ = ∑ j, W i j * f j - (∑ j, W i j) * f i := by
      rw [Finset.sum_mul]
    _ = ∑ j, W i j * f j := by rw [hrow, zero_mul, sub_zero]

theorem regression_eq_kinetic {ι : Type*} [Fintype ι] (π : ι → ℝ) (W : ι → ι → ℝ) (A_a A_b : ι → ℝ)
    (hrow : rowSumZero W) :
    ∑ i, π i * A_b i * obsGenerator W A_a i = kinetic π W A_a A_b := by
  unfold kinetic
  refine Finset.sum_congr rfl fun i _ => ?_
  calc
    π i * A_b i * obsGenerator W A_a i = π i * A_b i * ∑ j, W i j * A_a j := by
      rw [obsGenerator_eq_sum W A_a i (hrow i)]
    _ = ∑ j, π i * A_b i * W i j * A_a j := by
      rw [Finset.mul_sum]
      refine Finset.sum_congr rfl fun j _ => ?_
      ring

/-- Zero rates give every kinetic coefficient `0`. -/
theorem zero_rates {ι : Type*} [Fintype ι] (π A_a A_b : ι → ℝ) :
    kinetic π (fun _ _ => (0 : ℝ)) A_a A_b = 0 := by
  simp [kinetic]

/-- Detailed balance makes the kinetic coefficients symmetric, `L_ab = L_ba`. -/
theorem onsager_eq {ι : Type*} [Fintype ι] (π : ι → ℝ) (W : ι → ι → ℝ)
    (hdb : ∀ i j, π i * W i j = π j * W j i) (A_a A_b : ι → ℝ) :
    kinetic π W A_a A_b = kinetic π W A_b A_a := by
  unfold kinetic
  rw [Finset.sum_comm]
  refine Finset.sum_congr rfl (fun j _ => Finset.sum_congr rfl (fun i _ => ?_))
  have h := hdb i j
  calc π i * A_b i * W i j * A_a j = (π i * W i j) * A_b i * A_a j := by ring
    _ = (π j * W j i) * A_b i * A_a j := by rw [h]
    _ = π j * A_a j * W j i * A_b i := by ring

/-- Without detailed balance on a proper generator, `L_ab ≠ L_ba`. -/
noncomputable def cycleGenerator (i j : Fin 3) : ℝ :=
  if j = i then (-1 : ℝ) else if j = i + 1 then 1 else 0

theorem not_without_balance :
    kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
        (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) = 0 ∧
      kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
          (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) = 1 / 3 ∧
      kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
          (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) ≠
        kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
          (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) := by
  have h0 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
      (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) = 0 := by
    norm_num [kinetic, cycleGenerator, Fin.sum_univ_three]
  have h1 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
      (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) = 1 / 3 := by
    norm_num [kinetic, cycleGenerator, Fin.sum_univ_three]
  exact ⟨h0, h1, by linarith [h0, h1]⟩

/-- Reverse cycle: `W_ij = 1` for `j = i + 2`, diagonal `−1`. -/
noncomputable def reverseCycleGenerator (i j : Fin 3) : ℝ :=
  if j = i then (-1 : ℝ) else if j = i + 2 then 1 else 0

/-- Reversing the three-state cycle negates `L_ab − L_ba`. -/
theorem reverse_cycle_negates :
    kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) reverseCycleGenerator
        (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) -
      kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) reverseCycleGenerator
        (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) =
      -(kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
          (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) -
        kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
          (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0)) := by
  have hfwd0 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
      (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) = 0 := by
    norm_num [kinetic, cycleGenerator, Fin.sum_univ_three]
  have hfwd1 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) cycleGenerator
      (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) = 1 / 3 := by
    norm_num [kinetic, cycleGenerator, Fin.sum_univ_three]
  have hrev0 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) reverseCycleGenerator
      (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) = 1 / 3 := by
    norm_num [kinetic, reverseCycleGenerator, Fin.sum_univ_three]
  have hrev1 : kinetic (fun _ : Fin 3 => (1 / 3 : ℝ)) reverseCycleGenerator
      (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) = 0 := by
    norm_num [kinetic, reverseCycleGenerator, Fin.sum_univ_three]
  linarith [hfwd0, hfwd1, hrev0, hrev1]

noncomputable def dissipationTwo (L11 L12 L21 L22 X1 X2 : ℝ) : ℝ :=
  (1 / 2) * L11 * X1 ^ 2 + (1 / 2) * L12 * X1 * X2 + (1 / 2) * L21 * X1 * X2 +
    (1 / 2) * L22 * X2 ^ 2

noncomputable def flux1 (L11 L12 A X1 X2 : ℝ) : ℝ := L11 * X1 + L12 * X2 + A * X2

noncomputable def flux2 (L21 L22 A X1 X2 : ℝ) : ℝ := L21 * X1 + L22 * X2 - A * X1

theorem entropy_blind (L11 L12 L21 L22 A X1 X2 : ℝ) (hA : A ≠ 0) :
    flux1 L11 L12 A X1 X2 * X1 + flux2 L21 L22 A X1 X2 * X2 =
      L11 * X1 ^ 2 + L12 * X1 * X2 + L21 * X1 * X2 + L22 * X2 ^ 2 ∧
      (X2 ≠ 0 → flux1 L11 L12 A X1 X2 ≠ L11 * X1 + L12 * X2) ∧
      (X1 ≠ 0 → flux2 L21 L22 A X1 X2 ≠ L21 * X1 + L22 * X2) := by
  refine ⟨?_, ?_, ?_⟩
  · unfold flux1 flux2
    ring
  · intro hx2 hEq
    have : A * X2 = 0 := by unfold flux1 at hEq; linarith
    exact hA ((mul_eq_zero.mp this).resolve_right hx2)
  · intro hx1 hEq
    have : A * X1 = 0 := by unfold flux2 at hEq; linarith
    exact hA ((mul_eq_zero.mp this).resolve_right hx1)

noncomputable def swapGenerator (i j : Fin 2) : ℝ :=
  if j = i then (-1 : ℝ) else 1

theorem fin_two_witness :
    kinetic (fun _ : Fin 2 => (1 / 2 : ℝ)) swapGenerator
        (fun i => if i = 0 then 1 else 0) (fun i => if i = 1 then 1 else 0) = 1 / 2 ∧
      kinetic (fun _ : Fin 2 => (1 / 2 : ℝ)) swapGenerator
          (fun i => if i = 1 then 1 else 0) (fun i => if i = 0 then 1 else 0) = 1 / 2 := by
  norm_num [kinetic, swapGenerator, Fin.sum_univ_two]

/-- Mixed partials of `Φ` are both `L12`, the macroscopic form of `L12 = L21`. -/
theorem potential_symmetric (L11 L12 L22 X1 X2 : ℝ) :
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

theorem potential_two_cross (L11 L12 L21 L22 X1 X2 : ℝ) :
    deriv (fun y => deriv (fun x => dissipationTwo L11 L12 L21 L22 x y) X1) X2 =
        (L12 + L21) / 2 ∧
      ((L12 + L21) / 2 = L12 ↔ L12 = L21) := by
  have hfun : ∀ x y, dissipationTwo L11 L12 L21 L22 x y =
      dissipation L11 ((L12 + L21) / 2) L22 x y := by
    intro x y
    unfold dissipationTwo dissipation
    ring
  have h1 := (potential_symmetric L11 ((L12 + L21) / 2) L22 X1 X2).1
  have hderiv : deriv (fun y => deriv (fun x => dissipationTwo L11 L12 L21 L22 x y) X1) X2 =
      (L12 + L21) / 2 := by
    have hEq : (fun y => deriv (fun x => dissipationTwo L11 L12 L21 L22 x y) X1) =
        fun y => deriv (fun x => dissipation L11 ((L12 + L21) / 2) L22 x y) X1 := by
      funext y
      congr 1
      ext x
      rw [hfun x y]
    rw [hEq, h1]
  refine And.intro hderiv ?_
  constructor
  · intro h; linarith
  · intro h; rw [h]; ring

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
