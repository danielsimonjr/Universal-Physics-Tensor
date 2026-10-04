/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-101`. Bridge. BKT jump, as the vortex heuristic.

The catalog equation is

```
k_B T_BKT = π J / 2
```

`bkt_jump` derives that temperature. `vortex_energy` is the phase gradient
of `θ = φ` between a core `a` and a radius `R`:

```
∫_a^R (J / 2) |∇θ|² 2π r dr = π J ln(R / a)
```

The entropy premise is the area of places the core can sit,
`S = k_B ln((R / a)²)`, which is `2 k_B ln(R / a)`. The free energy
`F = E − T S` vanishes at a radius past the core only when
`k_B T = π J / 2`. Counting the circumference instead of the area gives
`π J`, not `π J / 2`. `J` is the stiffness in that vortex energy. If a
renormalized stiffness is supplied, the same algebra applies; this file
does not prove the renormalization-group flow.
-/

namespace PhysJS.BktJump

open Real intervalIntegral MeasureTheory Set

/-- Energy of one `θ = φ` vortex. `J` is the stiffness in `(J/2)|∇θ|²`. -/
theorem vortex_energy (J a R : ℝ) (ha : 0 < a) (hR : a < R) :
    (∫ r in a..R, (J / 2) * (1 / r) ^ 2 * (2 * Real.pi * r)) =
      Real.pi * J * Real.log (R / a) := by
  have hpos : 0 < R := lt_trans ha hR
  have hpoint : ∀ r ∈ Set.uIcc a R,
      (J / 2) * (1 / r) ^ 2 * (2 * Real.pi * r) = (Real.pi * J) / r := by
    intro r hr
    rw [Set.uIcc_of_le hR.le] at hr
    have hr0 : r ≠ 0 := (lt_of_lt_of_le ha hr.1).ne'
    field_simp [hr0]
  rw [intervalIntegral.integral_congr hpoint]
  rw [intervalIntegral.integral_congr fun r _ => div_eq_mul_one_div (Real.pi * J) r,
    intervalIntegral.integral_const_mul, integral_one_div_of_pos ha hpos]

/-- Area entropy is twice the radial logarithm. -/
theorem area_entropy (S kB a R : ℝ) (_ha : 0 < a) (_hR : a < R)
    (hcount : S = kB * Real.log ((R / a) ^ 2)) :
    S = 2 * kB * Real.log (R / a) := by
  rw [hcount, Real.log_pow (R / a) 2]
  ring

/-- BKT temperature. `hE` is the vortex integral. `hS` is the area count.
`hzero` is indifference, `F = 0`, at one radius past the core.

Kind `bridge` on `PhysJS.BktJump.bkt_jump`, once the catalog entry exists.
The covers line still begins with `derivation-step`. Not the
renormalization-group flow. -/
theorem bkt_jump (E S F J kB T a R : ℝ) (ha : 0 < a) (hR : a < R)
    (hE : E = ∫ r in a..R, (J / 2) * (1 / r) ^ 2 * (2 * Real.pi * r))
    (hS : S = kB * Real.log ((R / a) ^ 2))
    (hF : F = E - T * S)
    (hzero : F = 0) :
    kB * T = Real.pi * J / 2 := by
  have hEval := vortex_energy J a R ha hR
  have hSent := area_entropy S kB a R ha hR hS
  have hlog : Real.log (R / a) ≠ 0 := by
    have hratio : 1 < R / a := (one_lt_div ha).mpr hR
    exact (Real.log_pos hratio).ne'
  have hcoef : (Real.pi * J - 2 * kB * T) * Real.log (R / a) = 0 := by
    rw [hF, hE, hEval, hSent] at hzero
    linear_combination hzero
  have : Real.pi * J - 2 * kB * T = 0 := (mul_eq_zero.mp hcoef).resolve_right hlog
  linarith

/-- Circumference entropy unbinds at `π J`, not at `π J / 2`. -/
theorem length_not_area (J : ℝ) (hJ : J ≠ 0) :
    Real.pi * J ≠ Real.pi * J / 2 := by
  intro h
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp [hπ, hJ] at h
  linarith

end PhysJS.BktJump
