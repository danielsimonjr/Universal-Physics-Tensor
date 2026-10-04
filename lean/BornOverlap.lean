/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Complex.Basic
import Mathlib.Tactic.Linarith

/-!
`be-32`. Derivation step. One group element's Born overlap.

For real and imaginary parts `c` and `s`,

```
|⟨ψ_A|U(g)|ψ_B⟩|² = c² + s²
```

That equality is `Complex.normSq` of the one matrix element `c + s i`.
A sum of squares above `1` is not a probability in `[0, 1]`, which is
the module's rejection of `c² + s² > 1`. The difference `c² − s²`
agrees only at `s = 0`. This is not the Giacomini–Castro-Ruiz–Brukner
transformation, and not a Haar integral. The catalog records this id
as not-a-bridge. This lemma does not decide that.
-/

namespace PhysJS.BornOverlap

open Complex

/-- Modulus squared of one matrix element `c + s i`.

This is the definition of `normSq` on that element. A value above `1`
is not a probability in `[0, 1]`. Covers the derivation step of
`be-32`. Not a quantum-reference-frame transformation. -/
theorem modulus_sq (c s : ℝ) :
    normSq ((c : ℂ) + s * I) = c ^ 2 + s ^ 2 ∧
      0 ≤ c ^ 2 + s ^ 2 ∧
      (1 < c ^ 2 + s ^ 2 → ¬ (0 ≤ c ^ 2 + s ^ 2 ∧ c ^ 2 + s ^ 2 ≤ 1)) := by
  refine ⟨normSq_add_mul_I c s, add_nonneg (sq_nonneg c) (sq_nonneg s), ?_⟩
  intro hOver ⟨_, hle⟩
  linarith

/-- `c² − s²` is not the modulus squared when `s ≠ 0`. -/
theorem wrong_difference (c s : ℝ) (hs : s ≠ 0) : c ^ 2 - s ^ 2 ≠ c ^ 2 + s ^ 2 := by
  intro h
  have h2 : (2 : ℝ) * s ^ 2 = 0 := by linarith
  have hs0 : s ^ 2 = 0 := (mul_eq_zero.mp h2).resolve_left (by norm_num)
  exact hs (sq_eq_zero_iff.mp hs0)

/-- The unit pair `3/5`, `4/5` has overlap `1`. The difference is not `1`. -/
theorem unit_pair :
    (3 / 5 : ℝ) ^ 2 + (4 / 5) ^ 2 = 1 ∧ (3 / 5 : ℝ) ^ 2 - (4 / 5) ^ 2 ≠ 1 := by
  constructor <;> norm_num

end PhysJS.BornOverlap
