/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-126`. Bridge. Comb-drive lateral force.

The catalog equation is

```
F = n ε h V² / g
```

`force_eq` derives it. Overlap `x` runs along both sidewalls of `n`
fingers, the gap `g` is fixed, and fringe is neglected, so

```
C = 2 n ε h x / g
```

The capacitor is voltage-controlled. Coenergy is `(1/2) C V²`, and the
lateral force is `(1/2) V² dC/dx`. The sidewall `2` and the coenergy `1/2`
cancel. `one_sidewall_not_two` keeps one wall, so the `1/2` remains.
This is not the normal pull-in of `be-79`.
-/

namespace PhysJS.CombDrive

/-- Both sidewalls: `C = 2 n ε h x / g`. -/
noncomputable def capacitance (n ε h g x : ℝ) : ℝ :=
  2 * n * ε * h * x / g

/-- Overlap derivative at fixed gap. -/
theorem capacitance_slope (n ε h g x : ℝ) (hg : g ≠ 0) :
    HasDerivAt (fun y => capacitance n ε h g y) (2 * n * ε * h / g) x := by
  have hlin : HasDerivAt (fun y => (2 * n * ε * h / g) * y) ((2 * n * ε * h / g) * 1) x :=
    (hasDerivAt_id x).const_mul (2 * n * ε * h / g)
  have hfun : (fun y => capacitance n ε h g y) = fun y => (2 * n * ε * h / g) * y := by
    ext y
    simp only [capacitance]
    field_simp [hg]
  rw [hfun]
  exact hlin.congr_deriv (by ring)

/-- Comb-drive force. The derivative is `capacitance_slope`. The coenergy
force is `(1/2) V²` times that slope.

Kind `bridge` on `PhysJS.CombDrive.force_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not `be-79`. -/
theorem force_eq (n ε h g V : ℝ) (hg : g ≠ 0) :
    (∀ x, HasDerivAt (fun y => capacitance n ε h g y) (2 * n * ε * h / g) x) ∧
      (1 / 2) * V ^ 2 * (2 * n * ε * h / g) = n * ε * h * V ^ 2 / g := by
  refine ⟨fun x => capacitance_slope n ε h g x hg, ?_⟩
  field_simp [hg]

/-- One sidewall drops the `2`. The coenergy `1/2` no longer cancels. -/
theorem one_sidewall_not_two (n ε h g V : ℝ) (hg : g ≠ 0) (hpos : n * ε * h * V ^ 2 ≠ 0) :
    (1 / 2) * V ^ 2 * (n * ε * h / g) ≠ n * ε * h * V ^ 2 / g := by
  intro hEq
  have hscaled : (1 / 2) * (n * ε * h * V ^ 2) = n * ε * h * V ^ 2 := by
    field_simp [hg] at hEq
    linarith
  have : n * ε * h * V ^ 2 = 0 := by linarith
  exact hpos this

end PhysJS.CombDrive
