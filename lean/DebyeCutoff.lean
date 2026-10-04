/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-89`. Bridge. Debye cutoff.

The catalog equation is

```
ω_D = v_s (6 π² n)^{1/3}
```

`debye_cutoff` derives it. Three acoustic branches, one speed, and one atom
per cell put `3n` modes in the sphere:

```
3 · (4π/3) k_D³ / (2π)³ = 3 n
```

The `3` cancels, and the one-branch count is `k_D³ = 6 π² n`. A linear
branch is `ω_D = v_s k_D`. Setting the three-branch sum equal to `n`, rather
than to `3n`, is a different cutoff, `k_D³ = 2 π² n`. The branch count and
the common speed are hypotheses.
-/

namespace PhysJS.DebyeCutoff

open Real

/-- Three branches filling `3n` states. -/
theorem mode_count (kD n : ℝ)
    (hcount : 3 * ((4 / 3) * Real.pi * kD ^ 3) / (2 * Real.pi) ^ 3 = 3 * n) :
    kD ^ 3 = 6 * Real.pi ^ 2 * n := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hden : (2 * Real.pi) ^ 3 ≠ 0 := pow_ne_zero 3 (mul_ne_zero (by norm_num) hπ)
  have hclear : 3 * ((4 / 3) * Real.pi * kD ^ 3) = 3 * n * (2 * Real.pi) ^ 3 := by
    rw [← hcount]
    field_simp [hden]
  have hpow : (2 * Real.pi) ^ 3 = 8 * Real.pi ^ 3 := by ring
  rw [hpow] at hclear
  have hleft : 3 * ((4 / 3) * Real.pi * kD ^ 3) = 4 * Real.pi * kD ^ 3 := by ring
  rw [hleft] at hclear
  have h4π : (4 : ℝ) * Real.pi ≠ 0 := mul_ne_zero (by norm_num) hπ
  apply mul_left_cancel₀ h4π
  calc
    (4 * Real.pi) * kD ^ 3 = 3 * n * (8 * Real.pi ^ 3) := hclear
    _ = (4 * Real.pi) * (6 * Real.pi ^ 2 * n) := by ring

theorem wavevector_root (kD n : ℝ) (hk : 0 ≤ kD)
    (hcube : kD ^ 3 = 6 * Real.pi ^ 2 * n) :
    kD = (6 * Real.pi ^ 2 * n) ^ ((1 : ℝ) / 3) := by
  have hroot : (kD ^ 3) ^ ((3 : ℕ)⁻¹ : ℝ) = kD :=
    Real.pow_rpow_inv_natCast hk (by decide : (3 : ℕ) ≠ 0)
  have hexp : ((3 : ℕ)⁻¹ : ℝ) = (1 : ℝ) / 3 := by norm_num
  rw [← hroot, ← hcube, hexp]

/-- Debye frequency. `hcount` is three branches equal to `3n`. `hspeed` is
one linear branch, `ω_D = v_s k_D`.

Kind `bridge` on `PhysJS.DebyeCutoff.debye_cutoff`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not `k_D³ = 2 π² n`. -/
theorem debye_cutoff (ωD vs kD n : ℝ) (hk : 0 ≤ kD)
    (hcount : 3 * ((4 / 3) * Real.pi * kD ^ 3) / (2 * Real.pi) ^ 3 = 3 * n)
    (hspeed : ωD = vs * kD) :
    kD = (6 * Real.pi ^ 2 * n) ^ ((1 : ℝ) / 3) ∧ ωD = vs * (6 * Real.pi ^ 2 * n) ^ ((1 : ℝ) / 3) := by
  have hroot := wavevector_root kD n hk (mode_count kD n hcount)
  exact ⟨hroot, by rw [hspeed, hroot]⟩

/-- Equating the three-branch sum to `n` is not `(6 π² n)`. -/
theorem atom_count_not_mode_count (kD n : ℝ) (hn : n ≠ 0)
    (hcount : 3 * ((4 / 3) * Real.pi * kD ^ 3) / (2 * Real.pi) ^ 3 = n) :
    kD ^ 3 ≠ 6 * Real.pi ^ 2 * n := by
  have hthree : 3 * ((4 / 3) * Real.pi * kD ^ 3) / (2 * Real.pi) ^ 3 = 3 * (n / 3) := by
    rw [hcount]
    field_simp
  have hwrong : kD ^ 3 = 6 * Real.pi ^ 2 * (n / 3) := mode_count kD (n / 3) hthree
  intro hEq
  have hsame : 6 * Real.pi ^ 2 * n = 6 * Real.pi ^ 2 * (n / 3) := hEq.symm.trans hwrong
  field_simp at hsame
  linarith

end PhysJS.DebyeCutoff
