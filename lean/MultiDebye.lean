/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-115`. Bridge. Two-species Debye length.

Proved under these hypotheses. Each species is a linearized Boltzmann
fluid, `δn_s = −n_s q_s φ / (k_B T_s)`. Poisson's equation
`ε0 ∇²φ = −∑ q_s δn_s` then has screening constant

```
1/λ_D² = ∑ n_s q_s² / (ε0 k_B T_s)
```

For two species this is `1/λ_D² = 1/λ₁² + 1/λ₂²`, where
`λ_s² = ε0 k_B T_s / (n_s q_s²)`. The one-species length is not
restated. A finite-sum version is the same algebra term by term; two
species already carry the bridge.
-/

namespace PhysJS.MultiDebye

/-- Two Boltzmann species add in the squared reciprocal Debye length.

`h1` and `h2` are the species lengths. `hsum` is the linearized
Poisson response. -/
theorem debye_two (lam lam1 lam2 eps k T1 T2 n1 n2 q1 q2 : ℝ)
    (hε : eps ≠ 0) (hk : k ≠ 0)
    (hT1 : T1 ≠ 0) (hT2 : T2 ≠ 0)
    (hn1 : n1 ≠ 0) (hn2 : n2 ≠ 0) (hq1 : q1 ≠ 0) (hq2 : q2 ≠ 0)
    (hlam1 : lam1 ≠ 0) (hlam2 : lam2 ≠ 0)
    (h1 : lam1 ^ 2 = eps * k * T1 / (n1 * q1 ^ 2))
    (h2 : lam2 ^ 2 = eps * k * T2 / (n2 * q2 ^ 2))
    (hsum : 1 / lam ^ 2 = n1 * q1 ^ 2 / (eps * k * T1) + n2 * q2 ^ 2 / (eps * k * T2)) :
    1 / lam ^ 2 = 1 / lam1 ^ 2 + 1 / lam2 ^ 2 := by
  rw [hsum, h1, h2]
  field_simp [hε, hk, hT1, hT2, hn1, hn2, hq1, hq2, hlam1, hlam2]

/-- Dropping a species leaves a different length when that species responds. -/
theorem second_species_needed (lam1 n2 q2 eps k T2 : ℝ)
    (hlam1 : lam1 ≠ 0) (hn2 : n2 ≠ 0) (hq2 : q2 ≠ 0) (hε : eps ≠ 0) (hk : k ≠ 0) (hT2 : T2 ≠ 0) :
    1 / lam1 ^ 2 ≠ 1 / lam1 ^ 2 + n2 * q2 ^ 2 / (eps * k * T2) := by
  intro hEq
  field_simp [hlam1, hn2, hq2, hε, hk, hT2] at hEq
  have h0 : lam1 ^ 2 * n2 * q2 ^ 2 = 0 := by linarith
  exact absurd h0 (mul_ne_zero (mul_ne_zero (pow_ne_zero 2 hlam1) hn2) (pow_ne_zero 2 hq2))

end PhysJS.MultiDebye
