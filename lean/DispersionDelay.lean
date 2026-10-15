/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.MeasureTheory.Integral.IntervalIntegral.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-199`. Bridge. Pulsar dispersion delay.

The catalog equation is

```
Δt = e² / (8 π² ε0 m_e c) · DM / ν²,    DM = ∫ n dl
```

Proved under these hypotheses. A cold, unmagnetized plasma has the
dispersion relation `ω² = ω_p² + c² k²` with `ω_p² = n e² / (ε0 m_e)`.
`group_velocity_eq` takes the implicit derivative `ω v_g = c² k` and
proves `v_g = c sqrt(1 − ω_p²/ω²)`. For a uniform slab the exact extra
travel time is `L/v_g − L/c`, and `slab_bounds` brackets it by
`(L/c) x/2 ≤ Δt ≤ (L/c) x/(2(1−x))` with `x = ω_p²/ω²`, so the leading
term is a lower bound that is sharp as `x → 0`. `delay_eq` is the algebra
from the leading term `Δt = ∫ ω_p²(l)/(2 c ω²) dl`, with `ω = 2π ν` and
`DM = ∫ n dl`, to the displayed constant.

Not proved: the leading-order truncation for a nonuniform path
(`ν ≫ ν_p`) is the hypothesis `hΔt`, and only the uniform slab is
bracketed. Scattering, a magnetic field and the decimal
4.149 ms GHz² per pc cm⁻³ are outside the proof. The plasma frequency
`ω_p` is the same quantity as in `be-105` and `be-106`; here it enters
through its definition.
-/

namespace PhysJS.DispersionDelay

open Real intervalIntegral

/-- Group velocity of a cold unmagnetized plasma. `hvg` is the implicit
derivative `ω v_g = c² k` of `ω² = ω_p² + c² k²`. -/
theorem group_velocity_eq (ω ωp c k vg : ℝ)
    (hω : 0 < ω) (hc : 0 < c) (hk : 0 < k)
    (hdisp : ω ^ 2 = ωp ^ 2 + c ^ 2 * k ^ 2) (hvg : ω * vg = c ^ 2 * k) :
    vg = c * Real.sqrt (1 - ωp ^ 2 / ω ^ 2) := by
  have hvgpos : 0 < vg := by
    have : 0 < ω * vg := by rw [hvg]; positivity
    exact pos_of_mul_pos_right this hω.le
  have hx : 1 - ωp ^ 2 / ω ^ 2 = (c ^ 2 * k ^ 2) / ω ^ 2 := by
    field_simp
    linarith
  have hsq : (c * Real.sqrt (1 - ωp ^ 2 / ω ^ 2)) ^ 2 = vg ^ 2 := by
    rw [mul_pow, Real.sq_sqrt (by rw [hx]; positivity), hx]
    have : vg = c ^ 2 * k / ω := by
      rw [eq_div_iff hω.ne']; linarith
    rw [this]
    field_simp
  have h0 : 0 ≤ c * Real.sqrt (1 - ωp ^ 2 / ω ^ 2) := by positivity
  exact ((pow_left_inj₀ hvgpos.le h0 (by norm_num : (2 : ℕ) ≠ 0)).mp hsq.symm)

/-- `x/2 ≤ 1/sqrt(1−x) − 1 ≤ x/(2(1−x))` for `0 ≤ x < 1`. -/
theorem excess_bounds (x : ℝ) (hx0 : 0 ≤ x) (hx1 : x < 1) :
    x / 2 ≤ 1 / Real.sqrt (1 - x) - 1 ∧
      1 / Real.sqrt (1 - x) - 1 ≤ x / (2 * (1 - x)) := by
  have h1 : 0 < 1 - x := by linarith
  obtain ⟨s, hs⟩ : ∃ s, s = Real.sqrt (1 - x) := ⟨_, rfl⟩
  have hs0 : 0 < s := by rw [hs]; exact Real.sqrt_pos.mpr h1
  have hs2 : s ^ 2 = 1 - x := by rw [hs]; exact Real.sq_sqrt h1.le
  have hs1 : s ≤ 1 := by nlinarith
  have hxs : x = 1 - s ^ 2 := by linarith
  rw [← hs, hxs]
  refine ⟨?_, ?_⟩
  · rw [show 1 / s - 1 = (1 - s) / s by field_simp, div_le_div_iff₀ (by norm_num) hs0]
    nlinarith [mul_nonneg (sub_nonneg.mpr hs1) (sub_nonneg.mpr hs1), mul_pos hs0 hs0]
  · have h1' : (1 - (1 - s ^ 2)) = s ^ 2 := by ring
    rw [h1', show 1 / s - 1 = (1 - s) / s by field_simp,
      div_le_div_iff₀ hs0 (by positivity)]
    nlinarith [mul_nonneg (sub_nonneg.mpr hs1) hs0.le, mul_pos hs0 hs0,
      mul_nonneg (mul_nonneg (sub_nonneg.mpr hs1) hs0.le) hs0.le]

/-- A uniform slab of length `L`: the exact extra travel time lies between
the leading-order delay and the leading-order delay over `1 − x`. -/
theorem slab_bounds (L c vg x : ℝ) (hL : 0 < L) (hc : 0 < c)
    (hx0 : 0 ≤ x) (hx1 : x < 1) (hvg : vg = c * Real.sqrt (1 - x)) :
    L / c * (x / 2) ≤ L / vg - L / c ∧
      L / vg - L / c ≤ L / c * (x / (2 * (1 - x))) := by
  obtain ⟨hlo, hhi⟩ := excess_bounds x hx0 hx1
  have hs0 : 0 < Real.sqrt (1 - x) := Real.sqrt_pos.mpr (by linarith)
  have key : L / vg - L / c = L / c * (1 / Real.sqrt (1 - x) - 1) := by
    rw [hvg]
    field_simp
  rw [key]
  exact ⟨mul_le_mul_of_nonneg_left hlo (by positivity),
    mul_le_mul_of_nonneg_left hhi (by positivity)⟩

/-- The displayed constant from the leading-order delay integral. -/
theorem delay_eq (e ε0 m c ν L Δt DM : ℝ) (n ωp2 : ℝ → ℝ)
    (hε : ε0 ≠ 0) (hm : m ≠ 0) (hc : c ≠ 0) (hν : ν ≠ 0)
    (hωp : ∀ l, ωp2 l = n l * e ^ 2 / (ε0 * m))
    (hΔt : Δt = ∫ l in (0 : ℝ)..L, ωp2 l / (2 * c * (2 * Real.pi * ν) ^ 2))
    (hDM : DM = ∫ l in (0 : ℝ)..L, n l) :
    Δt = e ^ 2 / (8 * Real.pi ^ 2 * ε0 * m * c) * DM / ν ^ 2 := by
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  have hfun : (fun l => ωp2 l / (2 * c * (2 * Real.pi * ν) ^ 2)) =
      fun l => (e ^ 2 / (8 * Real.pi ^ 2 * ε0 * m * c * ν ^ 2)) * n l := by
    funext l
    rw [hωp l]
    field_simp
    ring
  rw [hΔt, hfun, intervalIntegral.integral_const_mul, ← hDM]
  field_simp

/-- The coefficient is not fixed by units: `r_e c`-type and `e²/(ε0 m c)`
combinations with different numerical factors have the same dimensions,
so two different constants give different delays. -/
theorem coefficient_not_fixed (K₁ K₂ DM ν : ℝ) (hDM : 0 < DM) (hν : 0 < ν)
    (hK : K₁ ≠ K₂) : K₁ * DM / ν ^ 2 ≠ K₂ * DM / ν ^ 2 := by
  intro h
  have hpos : 0 < DM / ν ^ 2 := by positivity
  apply hK
  have : K₁ * (DM / ν ^ 2) = K₂ * (DM / ν ^ 2) := by
    rw [← mul_div_assoc, ← mul_div_assoc]; exact h
  exact mul_right_cancel₀ hpos.ne' this

end PhysJS.DispersionDelay
