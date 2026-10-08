/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-96`. Bridge. Upper critical field.

The catalog equation is

```
B_c2 = Φ₀ / (2 π ξ²),    Φ₀ = h / (2 e)
```

`critical_field` derives it. The linearized Ginzburg–Landau balance sets the
lowest Landau level of charge `q = 2e` equal to `|α|`. The level

```
ℏ |q| B / (2 m*) = ℏ e B / m*
```

is a hypothesis, not the spectrum of the covariant Laplacian. The coherence
length in this normalization is the hypothesis `|α| = ℏ² / (2 m* ξ²)`.
`Φ₀ = h / (2e)` is the Cooper-pair flux, the reciprocal of the Josephson
constant, taken as that definition. Charge `e` instead of `2e` is a different
field. `h = 2 π ℏ`.
-/

namespace PhysJS.UpperCritical

open Real

/-- Upper critical field. `hll` is the Landau-level ground energy of charge
`q`. `hξ` is the GL length. `hinst` is the linear instability.

Not the
harmonic-oscillator spectrum. -/
theorem critical_field
    (B ξ Φ0 hbar h e m α q eigenvalue : ℝ)
    (hm : m ≠ 0) (he : e ≠ 0) (hξ : ξ ≠ 0) (hhbar : hbar ≠ 0)
    (hcharge : q = 2 * e)
    (hll : eigenvalue = hbar * q * B / (2 * m))
    (hξdef : α = hbar ^ 2 / (2 * m * ξ ^ 2))
    (hinst : eigenvalue = α)
    (hflux : Φ0 = h / (2 * e))
    (hh : h = 2 * Real.pi * hbar) :
    B = hbar / (2 * e * ξ ^ 2) ∧ B = Φ0 / (2 * Real.pi * ξ ^ 2) ∧ Φ0 = h / (2 * e) := by
  have hB : B = hbar / (2 * e * ξ ^ 2) := by
    have heq : hbar * q * B / (2 * m) = hbar ^ 2 / (2 * m * ξ ^ 2) := by
      rw [← hll, hinst, hξdef]
    rw [hcharge] at heq
    field_simp [hm, he, hξ, hhbar] at heq ⊢
    linarith
  refine ⟨hB, ?_, hflux⟩
  rw [hB, hflux, hh]
  field_simp [he, hξ, hhbar]

/-- Charge `e` is not the pair charge `2e`. -/
theorem single_charge_not_pair (hbar e ξ : ℝ) (hh : hbar ≠ 0) (he : e ≠ 0) (hξ : ξ ≠ 0) :
    hbar / (e * ξ ^ 2) ≠ hbar / (2 * e * ξ ^ 2) := by
  intro hEq
  have hden1 : e * ξ ^ 2 ≠ 0 := mul_ne_zero he (pow_ne_zero 2 hξ)
  have hden2 : (2 : ℝ) * e * ξ ^ 2 ≠ 0 := mul_ne_zero (mul_ne_zero (by norm_num) he) (pow_ne_zero 2 hξ)
  field_simp [hh, hden1, hden2] at hEq
  linarith

end PhysJS.UpperCritical
