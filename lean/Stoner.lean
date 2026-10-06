/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-145`. Bridge. Stoner enhancement of the Pauli susceptibility.

The catalog equation is

```
χ = χ_P / (1 − I g(E_F))
```

The ferromagnetic instability is the pole `I g(E_F) = 1`. `stoner` sums the
geometric series of the contact interaction. The hypothesis is that the
enhanced susceptibility is the Pauli value times `∑ₙ (I g(E_F))ⁿ`, which is
the RPA bubble iterated at one momentum. For `|I g(E_F)| < 1`,
`∑ₙ xⁿ = 1/(1 − x)`. The same closed form has denominator zero if and only
if `I g(E_F) = 1`; that equivalence does not require the series to converge.
`χ_P` is `be-94` and is an input, not a second proof of Pauli
paramagnetism. A finite-range interaction `I(q)` is not this row.
-/

namespace PhysJS.Stoner

open Real

/-- The denominator of the closed form vanishes exactly at `I g = 1`. -/
theorem pole (I gF : ℝ) : 1 - I * gF = 0 ↔ I * gF = 1 := by
  rw [sub_eq_zero, eq_comm]

/-- Stoner susceptibility.

`hseries` is the geometric series of the contact bubbles. `|x| < 1` is the
paramagnetic side, where the series converges. `x = I g(E_F)`.

Kind `bridge` on `PhysJS.Stoner.stoner`, once the catalog entry exists. The
covers line still begins with `derivation-step`. Not a second proof of
`be-94`. The pole is `PhysJS.Stoner.pole`. -/
theorem stoner (χ χP I gF x : ℝ) (hx : |x| < 1) (hxI : x = I * gF)
    (hseries : χ = χP * ∑' n : ℕ, x ^ n) :
    χ = χP / (1 - I * gF) ∧ (1 - I * gF = 0 ↔ I * gF = 1) := by
  have hsum : ∑' n : ℕ, x ^ n = (1 - x)⁻¹ := tsum_geometric_of_abs_lt_one hx
  refine ⟨?_, pole I gF⟩
  rw [hseries, hsum, hxI, ← div_eq_mul_inv]

/-- The first two bubbles are not the closed form. -/
theorem truncation_not_sum (χP x : ℝ) (hχ : χP ≠ 0) (hx : x ≠ 0) (hab : |x| < 1) :
    χP * (1 + x) ≠ χP / (1 - x) := by
  intro hEq
  have hx1 : x ≠ 1 := by
    intro h
    rw [h, abs_one] at hab
    linarith
  have hden : 1 - x ≠ 0 := sub_ne_zero.mpr (Ne.symm hx1)
  have hmul : χP * ((1 + x) * (1 - x)) = χP := by
    have hscale := congrArg (fun z => z * (1 - x)) hEq
    field_simp [hden] at hscale
    simp [hscale]
  have hone : (1 + x) * (1 - x) = 1 := by
    apply mul_left_cancel₀ hχ
    simpa [mul_assoc] using hmul
  have hsq : x ^ 2 = 0 := by
    have : 1 - x ^ 2 = 1 := by
      convert hone using 1
      ring
    linarith
  exact hx (sq_eq_zero_iff.mp hsq)

end PhysJS.Stoner
