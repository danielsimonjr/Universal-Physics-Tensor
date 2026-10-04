/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-79`. Bridge. Parallel-plate electrostatic pull-in.

The catalog equations are

```
g = 2 g0 / 3
V_pi = sqrt(8 k g0³ / (27 ε0 A)) = sqrt(8 k g0² / (27 C0))
```

with `C0 = ε0 A / g0`. `pull_in_eq` derives them. A linear spring faces a
parallel-plate capacitor, fringing neglected, voltage controlled. The
capacitance is `C = ε0 A / g`, so `dC/dg = −ε0 A / g²`. The coenergy force
on the plate is `−(1/2) V² dC/dg`. Equilibrium against the spring is

```
k (g0 − g) = ε0 A V² / (2 g²)
```

so `V²` is proportional to `(g0 − g) g²`. The fold is `dV/dg = 0`, the
critical point of that polynomial. Its only nonzero root is `g = 2 g0 / 3`,
and the second derivative there is negative, so the fold is a maximum of
`V²`. Substituting the gap produces both writings of `V_pi`. A gap of
`g0 / 2` is not the fold.
-/

namespace PhysJS.PullIn

noncomputable def capacitance (ε0 A g : ℝ) : ℝ :=
  ε0 * A / g

/-- `C = ε0 A / g` has slope `−ε0 A / g²`. -/
theorem capacitance_slope (ε0 A g : ℝ) (hg : g ≠ 0) :
    HasDerivAt (fun y => capacitance ε0 A y) (-(ε0 * A) / g ^ 2) g := by
  have hmul := (hasDerivAt_inv hg).const_mul (ε0 * A)
  have hfun : (fun y => capacitance ε0 A y) = fun y => (ε0 * A) * y⁻¹ := by
    ext y
    simp [capacitance, div_eq_mul_inv]
  rw [hfun]
  exact hmul.congr_deriv (by rw [div_eq_mul_inv]; ring)

/-- Spring versus coenergy. The right-hand side is `−(1/2) V² dC/dg`. -/
theorem equilibrium_voltage (k ε0 A g0 g V : ℝ) (hg : g ≠ 0) (hεA : ε0 * A ≠ 0)
    (hforce : k * (g0 - g) = -((1 / 2) * V ^ 2 * (-(ε0 * A) / g ^ 2))) :
    V ^ 2 = 2 * k * (g0 - g) * g ^ 2 / (ε0 * A) := by
  have hrewrite : k * (g0 - g) = (1 / 2) * V ^ 2 * (ε0 * A) / g ^ 2 := by
    calc
      k * (g0 - g) = -((1 / 2) * V ^ 2 * (-(ε0 * A) / g ^ 2)) := hforce
      _ = (1 / 2) * V ^ 2 * (ε0 * A) / g ^ 2 := by ring
  have hclear : V ^ 2 * (ε0 * A) = 2 * k * (g0 - g) * g ^ 2 := by
    have hmid := hrewrite
    field_simp [hg] at hmid
    linarith
  rw [eq_div_iff hεA]
  exact hclear

/-- Derivative of the gap polynomial `(g0 − y) y²`. -/
theorem gap_slope (g0 y : ℝ) :
    HasDerivAt (fun t => (g0 - t) * t ^ 2) (2 * g0 * y - 3 * y ^ 2) y := by
  have hid := hasDerivAt_id y
  have hlin : HasDerivAt (fun t => g0 - t) (-1) y := by
    have h := (hasDerivAt_const y g0).sub hid
    have hfun : ((fun _ : ℝ => g0) - id) = fun t => g0 - t := by
      ext t
      simp
    rw [hfun] at h
    exact h.congr_deriv (by ring)
  have hsq : HasDerivAt (fun t => t ^ 2) (2 * y) y := by
    simpa using hasDerivAt_pow 2 y
  exact (hlin.mul hsq).congr_deriv (by ring)

/-- The only nonzero critical gap is `2 g0 / 3`. -/
theorem fold_root (g0 y : ℝ) (h : 2 * g0 * y - 3 * y ^ 2 = 0) :
    y = 0 ∨ y = 2 * g0 / 3 := by
  have hfact : y * (2 * g0 - 3 * y) = 0 := by
    have : y * (2 * g0 - 3 * y) = 2 * g0 * y - 3 * y ^ 2 := by ring
    linarith
  rcases mul_eq_zero.mp hfact with hy | hrest
  · exact Or.inl hy
  · right
    have : 3 * y = 2 * g0 := by linarith
    field_simp at this ⊢
    linarith

/-- At `2 g0 / 3` the second derivative of the gap polynomial is `−2 g0`. -/
theorem fold_curvature (g0 : ℝ) :
    let g := (2 : ℝ) * g0 / 3
    HasDerivAt (fun y => 2 * g0 * y - 3 * y ^ 2) (2 * g0 - 6 * g) g ∧
      2 * g0 - 6 * g = -2 * g0 := by
  intro g
  refine ⟨?_, ?_⟩
  · have hid := hasDerivAt_id g
    have hlin : HasDerivAt (fun y => 2 * g0 * y) (2 * g0) g := by
      simpa [mul_one] using hid.const_mul (2 * g0)
    have hsq : HasDerivAt (fun y => y ^ 2) (2 * g) g := by
      simpa using hasDerivAt_pow 2 g
    have hcube : HasDerivAt (fun y => 3 * y ^ 2) (3 * (2 * g)) g := by
      simpa [mul_assoc] using hsq.const_mul 3
    exact (hlin.sub hcube).congr_deriv (by ring)
  · field_simp
    ring

/-- Pull-in. The fold of `k (g0 − g) = ε0 A V² / (2 g²)` is `g = 2 g0 / 3`,
and both writings of `V_pi²` are the equilibrium voltage there.

Kind `bridge` on `PhysJS.PullIn.pull_in_eq`, once the catalog entry exists.
The covers line still begins with `derivation-step`. Not a fringing field,
and not `g = g0 / 2`. -/
theorem pull_in_eq (k ε0 A g0 : ℝ) (hk : 0 < k) (hε : 0 < ε0) (hA : 0 < A) (hg0 : 0 < g0) :
    let g := (2 : ℝ) * g0 / 3
    let C0 := ε0 * A / g0
    let Vsq := 8 * k * g0 ^ 3 / (27 * ε0 * A)
    (∀ y, y ≠ 0 → HasDerivAt (fun t => capacitance ε0 A t) (-(ε0 * A) / y ^ 2) y) ∧
      (∀ y V, y ≠ 0 →
        k * (g0 - y) = -((1 / 2) * V ^ 2 * (-(ε0 * A) / y ^ 2)) →
          V ^ 2 = 2 * k * (g0 - y) * y ^ 2 / (ε0 * A)) ∧
      HasDerivAt (fun y => (g0 - y) * y ^ 2) 0 g ∧
      (∀ y, 2 * g0 * y - 3 * y ^ 2 = 0 → y = 0 ∨ y = g) ∧
      2 * g0 - 6 * g < 0 ∧
      2 * k * (g0 - g) * g ^ 2 / (ε0 * A) = Vsq ∧
      Vsq = 8 * k * g0 ^ 2 / (27 * C0) ∧
      Real.sqrt Vsq ^ 2 = Vsq ∧
      Real.sqrt (8 * k * g0 ^ 2 / (27 * C0)) ^ 2 = Vsq := by
  intro g C0 Vsq
  have hεA : ε0 * A ≠ 0 := mul_ne_zero hε.ne' hA.ne'
  have hg : g ≠ 0 := by
    unfold g
    positivity
  refine ⟨capacitance_slope ε0 A,
    fun y V hy hforce => equilibrium_voltage k ε0 A g0 y V hy hεA hforce,
    ?_, ?_, ?_, ?_, ?_, ?_, ?_⟩
  · have hslope := gap_slope g0 g
    have hzero : 2 * g0 * g - 3 * g ^ 2 = 0 := by
      unfold g
      field_simp
      ring
    simpa [hzero] using hslope
  · intro y hy
    have hroot := fold_root g0 y hy
    unfold g
    simpa using hroot
  · have hcur := (fold_curvature g0).2
    have : 2 * g0 - 6 * g = -2 * g0 := hcur
    linarith
  · unfold Vsq g
    field_simp [hε.ne', hA.ne', hg0.ne']
    ring_nf
  · unfold Vsq C0
    field_simp [hε.ne', hA.ne', hg0.ne']
  · have hnn : 0 ≤ Vsq := by
      unfold Vsq
      positivity
    exact Real.sq_sqrt hnn
  · have hnn : 0 ≤ 8 * k * g0 ^ 2 / (27 * C0) := by
      unfold C0
      positivity
    have hsame : 8 * k * g0 ^ 2 / (27 * C0) = Vsq := by
      unfold Vsq C0
      field_simp [hε.ne', hA.ne', hg0.ne']
    simpa [hsame] using Real.sq_sqrt hnn

/-- `g0 / 2` is not a critical gap. -/
theorem half_gap_not_fold (g0 : ℝ) (hg0 : g0 ≠ 0) :
    2 * g0 * (g0 / 2) - 3 * (g0 / 2) ^ 2 ≠ 0 := by
  intro h
  have hval : 2 * g0 * (g0 / 2) - 3 * (g0 / 2) ^ 2 = g0 ^ 2 / 4 := by ring
  rw [hval] at h
  have hsq : g0 ^ 2 = 0 := by
    field_simp at h
    linarith
  exact hg0 (sq_eq_zero_iff.mp hsq)

end PhysJS.PullIn
