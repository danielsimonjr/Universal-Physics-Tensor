/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-238`. Bridge. Doppler line width.

The catalog equation is

```
Δν_D = ν₀ √(8 k_B T ln 2 / (m c²))
```

`doppler_fwhm_eq` derives it. In a low-pressure gas at temperature `T` the
line-of-sight velocity has the Maxwell density `f(v) ∝ exp(−m v² / (2 k_B T))`.
To first order in `v/c` an atom moving at `v` emits at `ν = ν₀ (1 + v/c)`, so
the line profile is `exp(−m c² (ν − ν₀)² / (2 k_B T ν₀²))`, a Gaussian
centred at `ν₀`. `halfMax_iff` shows the profile is at least half of its
peak exactly when `|ν − ν₀| ≤ ν₀ √(2 k_B T ln 2 / (m c²))`, because
`exp(−a x²) ≥ 1/2` is `a x² ≤ ln 2`. The full width at half maximum is
twice that, and `√4 = 2` gives the `8 ln 2` under the root.
Premises: Maxwellian gas, non-relativistic, no collisional or natural
broadening, first-order Doppler shift.
-/

namespace PhysJS.DopplerWidth

open Real

/-- Doppler line profile, up to normalisation. -/
noncomputable def profile (m kT c ν₀ ν : ℝ) : ℝ :=
  exp (-(m * c ^ 2 * (ν - ν₀) ^ 2 / (2 * kT * ν₀ ^ 2)))

/-- Half width at half maximum. -/
noncomputable def halfWidth (m kT c ν₀ : ℝ) : ℝ :=
  ν₀ * sqrt (2 * kT * log 2 / (m * c ^ 2))

/-- The profile exceeds half its peak exactly within the half width. -/
theorem halfMax_iff (m kT c ν₀ ν : ℝ) (hm : 0 < m) (hkT : 0 < kT) (hc : 0 < c)
    (hν₀ : 0 < ν₀) :
    profile m kT c ν₀ ν₀ / 2 ≤ profile m kT c ν₀ ν ↔
      |ν - ν₀| ≤ halfWidth m kT c ν₀ := by
  have hpeak : profile m kT c ν₀ ν₀ = 1 := by simp [profile]
  rw [hpeak]
  unfold profile halfWidth
  have hmc : 0 < m * c ^ 2 := by positivity
  have hden : 0 < 2 * kT * ν₀ ^ 2 := by positivity
  have hl2 : 0 < log 2 := log_pos (by norm_num)
  have hstep : 1 / 2 ≤ exp (-(m * c ^ 2 * (ν - ν₀) ^ 2 / (2 * kT * ν₀ ^ 2))) ↔
      m * c ^ 2 * (ν - ν₀) ^ 2 / (2 * kT * ν₀ ^ 2) ≤ log 2 := by
    rw [← Real.log_le_iff_le_exp (by norm_num : (0 : ℝ) < 1 / 2), one_div, log_inv]
    constructor <;> intro h <;> linarith
  rw [show (1 : ℝ) / 2 = 1 / 2 from rfl, hstep]
  have hsq : sqrt (2 * kT * log 2 / (m * c ^ 2)) ^ 2 = 2 * kT * log 2 / (m * c ^ 2) :=
    sq_sqrt (by positivity)
  have hxabs : (ν - ν₀) ^ 2 = |ν - ν₀| ^ 2 := (sq_abs _).symm
  constructor
  · intro h
    have h' : (ν - ν₀) ^ 2 ≤ (ν₀ * sqrt (2 * kT * log 2 / (m * c ^ 2))) ^ 2 := by
      rw [mul_pow, hsq]
      rw [div_le_iff₀ hden] at h
      rw [show ν₀ ^ 2 * (2 * kT * log 2 / (m * c ^ 2)) =
        (2 * kT * ν₀ ^ 2 * log 2) / (m * c ^ 2) by ring, le_div_iff₀ hmc]
      nlinarith
    exact abs_le_of_sq_le_sq h' (by positivity)
  · intro h
    have h' : |ν - ν₀| ^ 2 ≤ (ν₀ * sqrt (2 * kT * log 2 / (m * c ^ 2))) ^ 2 :=
      pow_le_pow_left₀ (abs_nonneg _) h 2
    rw [← hxabs, mul_pow, hsq] at h'
    rw [div_le_iff₀ hden]
    have : ν₀ ^ 2 * (2 * kT * log 2 / (m * c ^ 2)) =
        (2 * kT * ν₀ ^ 2 * log 2) / (m * c ^ 2) := by ring
    rw [this, le_div_iff₀ hmc] at h'
    nlinarith

/-- A half-maximum point sits at distance `halfWidth` from the centre. -/
theorem half_point_sq (m kT c ν₀ ν : ℝ) (hm : 0 < m) (hkT : 0 < kT) (hc : 0 < c)
    (hν₀ : 0 < ν₀) (h : profile m kT c ν₀ ν = profile m kT c ν₀ ν₀ / 2) :
    (ν - ν₀) ^ 2 = halfWidth m kT c ν₀ ^ 2 := by
  have hpeak : profile m kT c ν₀ ν₀ = 1 := by simp [profile]
  rw [hpeak] at h
  unfold profile at h
  have hmc : 0 < m * c ^ 2 := by positivity
  have hden : 0 < 2 * kT * ν₀ ^ 2 := by positivity
  have hl2 : 0 ≤ log 2 := (log_pos (by norm_num)).le
  have h2 : -(m * c ^ 2 * (ν - ν₀) ^ 2 / (2 * kT * ν₀ ^ 2)) = -log 2 := by
    apply exp_injective
    rw [h, exp_neg, exp_log (by norm_num)]
    norm_num
  have h3 : m * c ^ 2 * (ν - ν₀) ^ 2 = log 2 * (2 * kT * ν₀ ^ 2) := by
    have : m * c ^ 2 * (ν - ν₀) ^ 2 / (2 * kT * ν₀ ^ 2) = log 2 := by linarith
    rw [div_eq_iff hden.ne'] at this
    exact this
  unfold halfWidth
  have hsq : sqrt (2 * kT * log 2 / (m * c ^ 2)) ^ 2 = 2 * kT * log 2 / (m * c ^ 2) :=
    sq_sqrt (by positivity)
  rw [mul_pow, hsq]
  field_simp
  linarith

/-- Full width at half maximum from the two half-maximum points.

`hlo`, `hhi` say the profile is half its peak at `νlo < ν₀ < νhi`, and
`Δν = νhi − νlo`.

Kind `bridge` on `PhysJS.DopplerWidth.doppler_fwhm_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not
collisional or natural broadening, not the relativistic correction. -/
theorem doppler_fwhm_eq (m kT c ν₀ νlo νhi Δν : ℝ) (hm : 0 < m) (hkT : 0 < kT)
    (hc : 0 < c) (hν₀ : 0 < ν₀)
    (hlo : profile m kT c ν₀ νlo = profile m kT c ν₀ ν₀ / 2)
    (hhi : profile m kT c ν₀ νhi = profile m kT c ν₀ ν₀ / 2)
    (hlt : νlo < ν₀) (hgt : ν₀ < νhi) (hFW : Δν = νhi - νlo) :
    Δν = ν₀ * sqrt (8 * kT * log 2 / (m * c ^ 2)) := by
  have hw : 0 ≤ halfWidth m kT c ν₀ := by
    unfold halfWidth
    positivity
  have h1 := half_point_sq m kT c ν₀ νlo hm hkT hc hν₀ hlo
  have h2 := half_point_sq m kT c ν₀ νhi hm hkT hc hν₀ hhi
  have hlo' : νlo = ν₀ - halfWidth m kT c ν₀ := by
    have : (ν₀ - νlo) ^ 2 = halfWidth m kT c ν₀ ^ 2 := by nlinarith
    have := (sq_eq_sq₀ (by linarith) hw).mp this
    linarith
  have hhi' : νhi = ν₀ + halfWidth m kT c ν₀ := by
    have := (sq_eq_sq₀ (by linarith) hw).mp h2
    linarith
  have hl2 : 0 ≤ log 2 := (log_pos (by norm_num)).le
  have h8 : 8 * kT * log 2 / (m * c ^ 2) = 2 ^ 2 * (2 * kT * log 2 / (m * c ^ 2)) := by
    ring
  rw [hFW, hhi', hlo']
  unfold halfWidth
  rw [h8, sqrt_mul (by positivity), sqrt_sq (by norm_num)]
  ring

/-- The half-maximum edges are exactly where the profile equals half the peak. -/
theorem edge_half (m kT c ν₀ : ℝ) (hm : 0 < m) (hkT : 0 < kT) (hc : 0 < c)
    (hν₀ : 0 < ν₀) :
    profile m kT c ν₀ (ν₀ + halfWidth m kT c ν₀) = profile m kT c ν₀ ν₀ / 2 := by
  unfold profile halfWidth
  have hmc : 0 < m * c ^ 2 := by positivity
  have hl2 : 0 ≤ log 2 := (log_pos (by norm_num)).le
  have hsq : sqrt (2 * kT * log 2 / (m * c ^ 2)) ^ 2 = 2 * kT * log 2 / (m * c ^ 2) :=
    sq_sqrt (by positivity)
  have harg : m * c ^ 2 * (ν₀ + ν₀ * sqrt (2 * kT * log 2 / (m * c ^ 2)) - ν₀) ^ 2 /
      (2 * kT * ν₀ ^ 2) = log 2 := by
    have : (ν₀ + ν₀ * sqrt (2 * kT * log 2 / (m * c ^ 2)) - ν₀) ^ 2 =
        ν₀ ^ 2 * sqrt (2 * kT * log 2 / (m * c ^ 2)) ^ 2 := by ring
    rw [this, hsq]
    field_simp
  rw [harg]
  simp [exp_neg, exp_log]

/-- Widths scale as `T^{1/2}`: quadrupling `T` doubles the half width; the
exponent is not 1. -/
theorem width_quadruple_T (m kT c ν₀ : ℝ) (hm : 0 < m) (hkT : 0 < kT) (hc : 0 < c)
    (hν₀ : 0 < ν₀) :
    halfWidth m (4 * kT) c ν₀ = 2 * halfWidth m kT c ν₀ := by
  unfold halfWidth
  have hl2 : 0 ≤ log 2 := (log_pos (by norm_num)).le
  have h : 2 * (4 * kT) * log 2 / (m * c ^ 2) =
      2 ^ 2 * (2 * kT * log 2 / (m * c ^ 2)) := by ring
  rw [h, sqrt_mul (by positivity), sqrt_sq (by norm_num)]
  ring

end PhysJS.DopplerWidth
