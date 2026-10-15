/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-108`. Bridge. Oblique fast and slow magnetosonic speeds.

Proved under the ideal-MHD quartic, the same hypothesis as
`PhysJS.FastMagnetosonic.perpendicular_of_dispersion`:

```
ω⁴ − ω² k² (c_s² + v_A²) + c_s² v_A² k² k_∥² = 0
```

with `k_∥ = k cos θ` and `k ≠ 0`. The phase-speed squares are

```
c_{f,s}² = ½ [c_s² + v_A² ± √((c_s² + v_A²)² − 4 c_s² v_A² cos²θ)]
```

`c_s² ≥ 0` and `v_A² ≥ 0` make the discriminant nonnegative. At
`θ = π/2` the fast root is `c_s² + v_A²` and the slow root is `0`.
That fast value is the phase-speed square of `be-69`; this file does
not re-prove the perpendicular polarization. At `θ = 0` the roots are
`max(c_s², v_A²)` and `min(c_s², v_A²)`. The quartic is not derived
here.
-/

namespace PhysJS.ObliqueMagnetosonic

/-- Discriminant of the oblique magnetosonic quadratic. -/
noncomputable def magnetosonicDisc (cs2 vA2 θ : ℝ) : ℝ :=
  (cs2 + vA2) ^ 2 - 4 * cs2 * vA2 * Real.cos θ ^ 2

/-- Fast phase-speed square. -/
noncomputable def fastSq (cs2 vA2 θ : ℝ) : ℝ :=
  (cs2 + vA2 + Real.sqrt (magnetosonicDisc cs2 vA2 θ)) / 2

/-- Slow phase-speed square. -/
noncomputable def slowSq (cs2 vA2 θ : ℝ) : ℝ :=
  (cs2 + vA2 - Real.sqrt (magnetosonicDisc cs2 vA2 θ)) / 2

theorem disc_nonneg (cs2 vA2 θ : ℝ) (hcs : 0 ≤ cs2) (hvA : 0 ≤ vA2) :
    0 ≤ magnetosonicDisc cs2 vA2 θ := by
  have htrig := Real.sin_sq_add_cos_sq θ
  have hcos : Real.cos θ ^ 2 = 1 - Real.sin θ ^ 2 := by linarith
  unfold magnetosonicDisc
  rw [hcos]
  have hrewrite : (cs2 + vA2) ^ 2 - 4 * cs2 * vA2 * (1 - Real.sin θ ^ 2) =
      (cs2 - vA2) ^ 2 + 4 * cs2 * vA2 * Real.sin θ ^ 2 := by ring
  rw [hrewrite]
  positivity

/-- Either oblique root. The quartic is `hdisp`, with `k_∥ = k cos θ`. -/
theorem phase_speed_eq (ω k cs2 vA2 θ : ℝ)
    (hk : k ≠ 0) (hcs : 0 ≤ cs2) (hvA : 0 ≤ vA2)
    (hdisp : ω ^ 4 - ω ^ 2 * k ^ 2 * (cs2 + vA2) +
      cs2 * vA2 * k ^ 2 * (k * Real.cos θ) ^ 2 = 0) :
    ω ^ 2 / k ^ 2 = fastSq cs2 vA2 θ ∨ ω ^ 2 / k ^ 2 = slowSq cs2 vA2 θ := by
  have hpoly' : (ω ^ 2 / k ^ 2) ^ 2 - (ω ^ 2 / k ^ 2) * (cs2 + vA2) +
      cs2 * vA2 * Real.cos θ ^ 2 = 0 := by
    field_simp [hk] at hdisp ⊢
    linear_combination hdisp
  have hpoly : (ω ^ 2 / k ^ 2) ^ 2 - (cs2 + vA2) * (ω ^ 2 / k ^ 2) +
      cs2 * vA2 * Real.cos θ ^ 2 = 0 := by
    convert hpoly' using 1
    ring
  set u := ω ^ 2 / k ^ 2
  set S := cs2 + vA2
  set P := cs2 * vA2 * Real.cos θ ^ 2
  have hD : 0 ≤ magnetosonicDisc cs2 vA2 θ := disc_nonneg cs2 vA2 θ hcs hvA
  have hsq : Real.sqrt (magnetosonicDisc cs2 vA2 θ) ^ 2 = magnetosonicDisc cs2 vA2 θ :=
    Real.sq_sqrt hD
  have hdisc : magnetosonicDisc cs2 vA2 θ = S ^ 2 - 4 * P := by
    unfold magnetosonicDisc S P
    ring
  have hprod : (u - fastSq cs2 vA2 θ) * (u - slowSq cs2 vA2 θ) =
      u ^ 2 - S * u + P := by
    unfold fastSq slowSq
    generalize hs : Real.sqrt (magnetosonicDisc cs2 vA2 θ) = s
    have hs2 : s ^ 2 = S ^ 2 - 4 * P := by
      rw [← hs, hsq, hdisc]
    have hdiff : (u - (S + s) / 2) * (u - (S - s) / 2) - (u ^ 2 - S * u + P) =
        (S ^ 2 - s ^ 2) / 4 - P := by ring
    rw [← sub_eq_zero, hdiff, hs2]
    ring
  have hzero : (u - fastSq cs2 vA2 θ) * (u - slowSq cs2 vA2 θ) = 0 := by
    rw [hprod]
    simpa [u, S, P] using hpoly
  rcases mul_eq_zero.mp hzero with h | h
  · exact Or.inl (by linarith)
  · exact Or.inr (by linarith)

/-- At `θ = π/2` the fast root is `c_s² + v_A²` and the slow root is `0`. -/
theorem perpendicular_values (cs2 vA2 : ℝ) (hcs : 0 ≤ cs2) (hvA : 0 ≤ vA2) :
    fastSq cs2 vA2 (Real.pi / 2) = cs2 + vA2 ∧ slowSq cs2 vA2 (Real.pi / 2) = 0 := by
  have hdisc : magnetosonicDisc cs2 vA2 (Real.pi / 2) = (cs2 + vA2) ^ 2 := by
    unfold magnetosonicDisc
    rw [Real.cos_pi_div_two]
    ring
  have hS : 0 ≤ cs2 + vA2 := by linarith
  unfold fastSq slowSq
  rw [hdisc, Real.sqrt_sq hS]
  constructor <;> ring

/-- At `θ = 0` the roots are the larger and smaller of `c_s²` and `v_A²`. -/
theorem parallel_values (cs2 vA2 : ℝ) :
    fastSq cs2 vA2 0 = max cs2 vA2 ∧ slowSq cs2 vA2 0 = min cs2 vA2 := by
  have hdisc : magnetosonicDisc cs2 vA2 0 = (cs2 - vA2) ^ 2 := by
    unfold magnetosonicDisc
    rw [Real.cos_zero]
    ring
  unfold fastSq slowSq
  rw [hdisc, Real.sqrt_sq_eq_abs]
  constructor
  · rcases le_total cs2 vA2 with h | h
    · rw [abs_of_nonpos (sub_nonpos.mpr h), max_eq_right h]
      ring
    · rw [abs_of_nonneg (sub_nonneg.mpr h), max_eq_left h]
      ring
  · rcases le_total cs2 vA2 with h | h
    · rw [abs_of_nonpos (sub_nonpos.mpr h), min_eq_left h]
      ring
    · rw [abs_of_nonneg (sub_nonneg.mpr h), min_eq_right h]
      ring

end PhysJS.ObliqueMagnetosonic
