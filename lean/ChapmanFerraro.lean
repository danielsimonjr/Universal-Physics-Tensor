/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-120`. Bridge. Chapman–Ferraro standoff.

Proved under these hypotheses. The magnetopause is a plane sheet, so
the dipole field is doubled: `B_mp = 2 B_E (R_E / R)³`. The ram
pressure uses `K = 1`, namely `ρ v²`, not `½ ρ v²` and not the
specular `2 ρ v²`. It balances the magnetic pressure `B_mp² / (2 μ0)`,
the same pressure as `be-74`, taken here as an input. The standoff is
the sixth-power form

```
(R / R_E)⁶ = 2 B_E² / (μ0 ρ v²)
```

Specular reflection replaces the numerator `2` by `1`.
-/

namespace PhysJS.ChapmanFerraro

/-- Sixth power of the Chapman–Ferraro standoff at `K = 1`.

`hdipole` is the doubled dipole. `hpressure` is `B² / (2 μ0)`.
`hbalance` equates that pressure to `ρ v²`. -/
theorem standoff_eq (R RE BE ρ v μ0 Bmp pMag : ℝ)
    (hR : R ≠ 0) (hRE : RE ≠ 0) (hρ : ρ ≠ 0) (hv : v ≠ 0) (hμ : μ0 ≠ 0) (hBE : BE ≠ 0)
    (hdipole : Bmp = 2 * BE * (RE / R) ^ 3)
    (hpressure : pMag = Bmp ^ 2 / (2 * μ0))
    (hbalance : ρ * v ^ 2 = pMag) :
    (R / RE) ^ 6 = 2 * BE ^ 2 / (μ0 * ρ * v ^ 2) := by
  have h := hbalance
  rw [hpressure, hdipole] at h
  field_simp [hR, hRE, hρ, hv, hμ, hBE] at h ⊢
  linarith

/-- Specular `2 ρ v²` gives half the `K = 1` numerator. -/
theorem specular_not_ram (BE ρ v μ0 : ℝ) (hρ : ρ ≠ 0) (hv : v ≠ 0) (hμ : μ0 ≠ 0)
    (hBE : BE ≠ 0) :
    BE ^ 2 / (μ0 * ρ * v ^ 2) ≠ 2 * BE ^ 2 / (μ0 * ρ * v ^ 2) := by
  intro hEq
  field_simp [hρ, hv, hμ, hBE] at hEq
  linarith

end PhysJS.ChapmanFerraro
