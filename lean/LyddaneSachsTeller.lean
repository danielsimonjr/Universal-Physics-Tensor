/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-100`. Bridge. Lyddane–Sachs–Teller relation, undamped.

The catalog equation is

```
ω_LO² / ω_TO² = ε(0) / ε(∞)
```

`lst` derives it from one oscillator

```
ε(ω) = ε(∞) + S / (ω_TO² − ω²)
```

with no damping. `ε(ω_LO) = 0` fixes the strength, and `ε(0)` is that
function at zero frequency. The squares are part of the statement: the
unsquared frequency ratio is a different number when `ω_LO ≠ ω_TO`. A
damped pole is not this row.
-/

namespace PhysJS.LyddaneSachsTeller

/-- Undamped LST. `hzero` is `ε(ω_LO) = 0`. `hstatic` is `ε(0)`.

Kind `bridge` on `PhysJS.LyddaneSachsTeller.lst`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a damped
oscillator. -/
theorem lst (ε0 εinf S ωLO ωTO : ℝ)
    (hinf : εinf ≠ 0) (hTO : ωTO ≠ 0) (hdiff : ωTO ^ 2 - ωLO ^ 2 ≠ 0)
    (hzero : εinf + S / (ωTO ^ 2 - ωLO ^ 2) = 0)
    (hstatic : ε0 = εinf + S / ωTO ^ 2) :
    ωLO ^ 2 / ωTO ^ 2 = ε0 / εinf := by
  have hS : S = εinf * (ωLO ^ 2 - ωTO ^ 2) := by
    have hquot : S / (ωTO ^ 2 - ωLO ^ 2) = -εinf := by linarith
    have : S = -εinf * (ωTO ^ 2 - ωLO ^ 2) := by
      field_simp [hdiff] at hquot
      linarith
    linarith
  rw [hstatic, hS]
  field_simp [hinf, hTO]
  ring

/-- The unsquared ratio is not the dielectric ratio when the frequencies differ. -/
theorem squares_needed (ωLO ωTO : ℝ) (hTO : 0 < ωTO) (hLO : 0 < ωLO) (hne : ωLO ≠ ωTO) :
    ωLO / ωTO ≠ ωLO ^ 2 / ωTO ^ 2 := by
  intro h
  rw [div_eq_div_iff hTO.ne' (pow_ne_zero 2 hTO.ne')] at h
  have h1 : ωLO * ωTO = ωLO ^ 2 := by
    apply mul_right_cancel₀ hTO.ne'
    calc
      ωLO * ωTO * ωTO = ωLO * ωTO ^ 2 := by ring
      _ = ωLO ^ 2 * ωTO := h
  have h2 : ωTO = ωLO := by
    apply mul_left_cancel₀ hLO.ne'
    calc
      ωLO * ωTO = ωLO ^ 2 := h1
      _ = ωLO * ωLO := by ring
  exact hne h2.symm

end PhysJS.LyddaneSachsTeller
