/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-173`. Bridge. Electrostatic spring softening.

The catalog equation is

```
k_eff = k − ε0 A V² / (g − x)³
```

for a voltage-driven parallel-plate actuator with a linear spring. The
plate displacement `x` closes the gap to `g − x`, so `C(x) = ε0 A / (g − x)`
and `dC/dx = ε0 A / (g − x)²`. The coenergy force along `x` is
`F_e = (1/2) V² dC/dx = ε0 A V² / (2 (g − x)²)`, and the net force is
`F(x) = −k x + F_e(x)`. `stiffness_eq` proves `k_eff = −dF/dx`
equals `k − ε0 A V² / (g − x)³`. The electrostatic term has the opposite
sign to the spring: it softens it. `pull_in_gap_eq` proves that equilibrium
(`F = 0`) together with `k_eff = 0` forces `x = g / 3`, the gap
`g − x = 2 g / 3` of `be-79`, and that the voltage there is
`V² = 8 k g³ / (27 ε0 A)`, the `be-79` pull-in value.

Premises: voltage control, parallel plates, no fringing, linear spring.
`exponent_not_free` separates `(g − x)²`, which units would allow.
This is not charge control, where the electrostatic stiffness vanishes.
-/

namespace PhysJS.SpringSoftening

/-- Plate capacitance at displacement `x`. -/
noncomputable def cap (ε0 A g x : ℝ) : ℝ := ε0 * A / (g - x)

/-- Electrostatic force `(1/2) V² dC/dx`. -/
noncomputable def force (ε0 A V g x : ℝ) : ℝ := ε0 * A * V ^ 2 / (2 * (g - x) ^ 2)

/-- `dC/dx = ε0 A / (g − x)²`. -/
theorem cap_slope (ε0 A g x : ℝ) (hx : g - x ≠ 0) :
    HasDerivAt (cap ε0 A g) (ε0 * A / (g - x) ^ 2) x := by
  have hlin : HasDerivAt (fun t : ℝ => g - t) (-1) x := by
    simpa using (hasDerivAt_id x).const_sub g
  have hinv := hlin.inv hx
  have hmul := hinv.const_mul (ε0 * A)
  have hfun : cap ε0 A g = fun t => (ε0 * A) * (fun t : ℝ => g - t)⁻¹ t := by
    ext t
    simp [cap, div_eq_mul_inv]
  rw [hfun]
  refine hmul.congr_deriv ?_
  field_simp

/-- The force is `(1/2) V²` times the capacitance slope. -/
theorem force_eq_coenergy (ε0 A V g x : ℝ) (hx : g - x ≠ 0) :
    force ε0 A V g x = (1 / 2) * V ^ 2 * (ε0 * A / (g - x) ^ 2) := by
  unfold force
  field_simp

/-- Slope of the electrostatic force: `ε0 A V² / (g − x)³`. -/
theorem force_slope (ε0 A V g x : ℝ) (hx : g - x ≠ 0) :
    HasDerivAt (force ε0 A V g) (ε0 * A * V ^ 2 / (g - x) ^ 3) x := by
  have hlin : HasDerivAt (fun t : ℝ => g - t) (-1) x := by
    simpa using (hasDerivAt_id x).const_sub g
  have hsq := hlin.pow 2
  have hinv := hsq.inv (pow_ne_zero 2 hx)
  have hmul := hinv.const_mul (ε0 * A * V ^ 2 / 2)
  have hfun : force ε0 A V g = fun t => (ε0 * A * V ^ 2 / 2) *
      ((fun t : ℝ => (g - t) ^ 2) t)⁻¹ := by
    ext t
    simp [force, div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc]
  rw [hfun]
  refine hmul.congr_deriv ?_
  simp only [Pi.pow_apply, Nat.cast_ofNat]
  field_simp
  ring

/-- Net force on the plate: spring plus electrostatic. -/
noncomputable def netForce (k ε0 A V g x : ℝ) : ℝ := -k * x + force ε0 A V g x

/-- Effective stiffness `k_eff = −dF/dx = k − ε0 A V² / (g − x)³`.

Not
charge control, and not a fringing field. `pull_in_gap_eq` ties the zero of
this stiffness to the `be-79` pull-in. -/
theorem stiffness_eq (k ε0 A V g x : ℝ) (hx : g - x ≠ 0) :
    HasDerivAt (netForce k ε0 A V g) (-(k - ε0 * A * V ^ 2 / (g - x) ^ 3)) x := by
  have hspring : HasDerivAt (fun t : ℝ => -k * t) (-k) x := by
    simpa using (hasDerivAt_id x).const_mul (-k)
  have hsum := hspring.add (force_slope ε0 A V g x hx)
  have hfun : netForce k ε0 A V g = fun t => -k * t + force ε0 A V g t := by
    ext t
    rfl
  rw [hfun]
  exact hsum.congr_deriv (by ring)

/-- Softening: the effective stiffness is below `k` when the drive is on. -/
theorem softening_lt (k ε0 A V g x : ℝ) (hε : 0 < ε0) (hA : 0 < A) (hV : V ≠ 0)
    (hpos : 0 < g - x) :
    k - ε0 * A * V ^ 2 / (g - x) ^ 3 < k := by
  have hV2 : 0 < V ^ 2 := by positivity
  have : 0 < ε0 * A * V ^ 2 / (g - x) ^ 3 := by positivity
  linarith

/-- Equilibrium together with vanishing effective stiffness gives
`x = g / 3`, and then the `be-79` voltage. -/
theorem pull_in_gap_eq (k ε0 A V g x : ℝ) (hk : 0 < k) (hε : 0 < ε0) (hA : 0 < A)
    (hV : V ≠ 0) (hpos : 0 < g - x)
    (heq : netForce k ε0 A V g x = 0)
    (hsoft : k - ε0 * A * V ^ 2 / (g - x) ^ 3 = 0) :
    x = g / 3 ∧ V ^ 2 = 8 * k * g ^ 3 / (27 * ε0 * A) := by
  have hx : g - x ≠ 0 := hpos.ne'
  have hc : 0 < ε0 * A * V ^ 2 := by positivity
  have hkc : k * (g - x) ^ 3 = ε0 * A * V ^ 2 := by
    field_simp at hsoft
    linarith
  have hspring : k * x = ε0 * A * V ^ 2 / (2 * (g - x) ^ 2) := by
    unfold netForce force at heq
    linarith
  have h2 : k * x * (2 * (g - x) ^ 2) = ε0 * A * V ^ 2 := by
    rw [hspring]
    field_simp
  have hgx : (g - x) ^ 2 ≠ 0 := pow_ne_zero 2 hx
  have h3 : (g - x) ^ 2 * (2 * x - (g - x)) = 0 := by
    have : k * ((g - x) ^ 2 * (2 * x - (g - x))) = 0 := by nlinarith [hkc, h2]
    rcases mul_eq_zero.mp this with h | h
    · exact absurd h hk.ne'
    · exact h
  have hxg : x = g / 3 := by
    rcases mul_eq_zero.mp h3 with h | h
    · exact absurd h hgx
    · linarith
  refine ⟨hxg, ?_⟩
  have hgx3 : g - x = 2 * g / 3 := by rw [hxg]; ring
  rw [hgx3] at hkc
  field_simp
  nlinarith [hkc]

/-- Squares, not cubes, in the denominator is the force, not the stiffness. -/
theorem exponent_not_free (ε0 A V d : ℝ) (hc : ε0 * A * V ^ 2 ≠ 0) (hd : 0 < d) (hd1 : d ≠ 1) :
    ε0 * A * V ^ 2 / d ^ 2 ≠ ε0 * A * V ^ 2 / d ^ 3 := by
  intro h
  have hd2 : d ^ 2 ≠ 0 := by positivity
  have hd3 : d ^ 3 ≠ 0 := by positivity
  field_simp at h
  have h' : (ε0 * A * V ^ 2) * (d - 1) = 0 := by linarith
  rcases mul_eq_zero.mp h' with h1 | h1
  · exact hc h1
  · exact hd1 (by linarith)

end PhysJS.SpringSoftening
