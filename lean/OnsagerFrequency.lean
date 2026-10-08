/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-140`. Bridge. Onsager frequency of a Fermi-surface orbit.

The catalog equation is

```
F = (ℏ / (2 π e)) A,    Δ(1/B) = 1/F
```

`e` is the elementary charge and `A` is an extremal cross-section. The
semiclassical area is the hypothesis

```
A = (2 π e B / ℏ) (n + γ)
```

`onsager_frequency` reads the coefficient of `n`. The step from `n` to
`n + 1` changes `n + γ` by `1`, so the Maslov index `γ` cancels and does
not enter `F`. Dropping `γ` on only one of the two orbits leaves `1 − γ`.
`e ≠ 0`, `ℏ ≠ 0`, and `A ≠ 0`. The Hall conductance is not this row.
-/

namespace PhysJS.OnsagerFrequency

open Real

/-- Onsager frequency.

`harea` is the orbit at index `n`, and `hareas` is the next orbit. `Bn` and
`Bsucc` are the fields of those two orbits. `hF` defines `F` as the
reciprocal of `Δ(1/B)`.

`γ` is not part of `F`. -/
theorem onsager_frequency
    (A F e hbar γ n Bn Bsucc : ℝ)
    (he : e ≠ 0) (hh : hbar ≠ 0) (hA : A ≠ 0) (hBn : Bn ≠ 0) (hBs : Bsucc ≠ 0)
    (harea : A = (2 * Real.pi * e / hbar) * Bn * (n + γ))
    (hareas : A = (2 * Real.pi * e / hbar) * Bsucc * (n + 1 + γ))
    (hF : F = 1 / (1 / Bsucc - 1 / Bn)) :
    F = hbar * A / (2 * Real.pi * e) ∧
      1 / Bsucc - 1 / Bn = 2 * Real.pi * e / (hbar * A) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hc : 2 * Real.pi * e / hbar ≠ 0 :=
    div_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num) hπ) he) hh
  have hBnInv : 1 / Bn = (2 * Real.pi * e / hbar) * (n + γ) / A := by
    have hmul : A = Bn * ((2 * Real.pi * e / hbar) * (n + γ)) := by
      rw [harea]
      ring
    field_simp [hA, hBn, hc] at hmul ⊢
    linarith
  have hBsInv : 1 / Bsucc = (2 * Real.pi * e / hbar) * (n + 1 + γ) / A := by
    have hmul : A = Bsucc * ((2 * Real.pi * e / hbar) * (n + 1 + γ)) := by
      rw [hareas]
      ring
    field_simp [hA, hBs, hc] at hmul ⊢
    linarith
  have hstep : (n + 1 + γ) - (n + γ) = 1 := by ring
  have hdiff : 1 / Bsucc - 1 / Bn = 2 * Real.pi * e / (hbar * A) := by
    rw [hBsInv, hBnInv]
    have hsub : (2 * Real.pi * e / hbar) * (n + 1 + γ) / A -
        (2 * Real.pi * e / hbar) * (n + γ) / A =
        (2 * Real.pi * e / hbar) * ((n + 1 + γ) - (n + γ)) / A := by
      field_simp [hA]
    rw [hsub, hstep]
    field_simp [hA, hh]
  refine ⟨?_, hdiff⟩
  rw [hF, hdiff]
  field_simp [he, hh, hA, hπ]

/-- Dropping `γ` on one orbit is not a step of `1`. -/
theorem gamma_not_in_step (n γ : ℝ) (hγ : γ ≠ 0) :
    (n + 1) - (n + γ) ≠ (n + 1 + γ) - (n + γ) := by
  intro hEq
  have hleft : (n + 1) - (n + γ) = 1 - γ := by ring
  have hright : (n + 1 + γ) - (n + γ) = 1 := by ring
  rw [hleft, hright] at hEq
  exact hγ (by linarith)

end PhysJS.OnsagerFrequency
