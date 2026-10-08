/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-147`. Bridge. Arrhenius rate, molar and per molecule.

The catalog equation is

```
k = A exp(−Ea / (R T))
```

with `R = N_A k_B`. `arrhenius_eq` is the equivalence of that molar form
with the molecular Boltzmann factor `exp(−ε / (k_B T))` at
`ε = Ea / N_A`. The prefactor `A` is temperature-independent here. The
Eyring identification of `A` is `be-148`, not this row.
-/

namespace PhysJS.Arrhenius

/-- Molar Arrhenius rate and the molecular Boltzmann factor.

`hR` is `R = N_A k_B`. `hε` is the energy per molecule `Ea / N_A`.

Not a
derivation of the prefactor `A`. -/
theorem arrhenius_eq (k A Ea R T NA kB ε : ℝ)
    (hT : 0 < T) (hNA : NA ≠ 0) (hkB : kB ≠ 0)
    (hR : R = NA * kB) (hε : ε = Ea / NA)
    (hk : k = A * Real.exp (-Ea / (R * T))) :
    k * Real.exp (Ea / (R * T)) = A ∧
      k = A * Real.exp (-ε / (kB * T)) := by
  have hR0 : R ≠ 0 := by
    rw [hR]
    exact mul_ne_zero hNA hkB
  have hRT : R * T ≠ 0 := mul_ne_zero hR0 hT.ne'
  have hcancel : Real.exp (-Ea / (R * T)) * Real.exp (Ea / (R * T)) = 1 := by
    rw [← Real.exp_add]
    ring_nf
    exact Real.exp_zero
  refine ⟨?_, ?_⟩
  · rw [hk, mul_assoc, hcancel, mul_one]
  · have harg : -Ea / (R * T) = -ε / (kB * T) := by
      rw [hε, hR]
      field_simp [hNA, hkB, hT.ne']
    rw [hk, harg]

/-- A barrier of zero is not a positive molar barrier. -/
theorem barrier_needed (A Ea R T : ℝ) (hA : A ≠ 0) (hEa : Ea ≠ 0) (hRT : R * T ≠ 0) :
    A * Real.exp (-Ea / (R * T)) ≠ A := by
  intro hEq
  have hEq' : A * Real.exp (-Ea / (R * T)) = A * 1 := by simpa [mul_one] using hEq
  have hexp : Real.exp (-Ea / (R * T)) = 1 := mul_left_cancel₀ hA hEq'
  have harg : -Ea / (R * T) = 0 :=
    Real.exp_injective (hexp.trans Real.exp_zero.symm)
  rcases div_eq_zero_iff.mp harg with hEa0 | hden
  · exact hEa (neg_eq_zero.mp hEa0)
  · exact absurd hden hRT

end PhysJS.Arrhenius
