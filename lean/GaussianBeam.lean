/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Complex.Basic
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecificLimits.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-230`. Bridge. Gaussian-beam Rayleigh range and divergence.

The catalog equations are

```
z_R = π n w₀² / λ,    θ = λ / (π n w₀)
```

`rayleigh_range_eq` derives them from the paraxial complex beam parameter.
For a fundamental Gaussian mode in a medium of index `n` the parameter
`q(z) = z + i z_R` (waist at `z = 0`, so the wavefront is flat there and
`q` is purely imaginary) obeys

```
1 / q(z) = 1 / R(z) − i λ / (π n w(z)²)
```

with `R` the wavefront radius and `w` the spot radius. The imaginary part
of `1/q` is `−z_R / (z² + z_R²)`. Evaluated at the waist this fixes
`z_R = π n w₀² / λ`. At general `z` it gives
`w(z)² = w₀² + θ² z²` with `θ = λ/(π n w₀) = w₀ / z_R`, equivalently
`w² = w₀² (1 + (z/z_R)²)`. The far-field limit of `w²/z²` is `θ²`.
Premises: paraxial, TEM₀₀ with `M² = 1`, lossless homogeneous medium. The
form of the `q` relation is the paraxial-wave-equation input; it is a
hypothesis here, not derived from the wave equation.
-/

namespace PhysJS.GaussianBeam

open Filter

/-- Rayleigh range and divergence from the complex beam parameter.

`hq` is the imaginary part of the beam-parameter relation with
`q = z + i z_R`. `hw0` identifies the waist.

Not a
derivation of the `q` relation from the paraxial equation, and not
`M² > 1` beams. -/
theorem rayleigh_range_eq (lam n zR w0 : ℝ) (w : ℝ → ℝ)
    (hlam : 0 < lam) (hn : 0 < n) (hzR : 0 < zR) (hw0pos : 0 < w0)
    (hwpos : ∀ z, 0 < w z)
    (hq : ∀ z : ℝ,
      ((1 : ℂ) / ((z : ℂ) + Complex.I * (zR : ℂ))).im =
        -(lam / (Real.pi * n * (w z) ^ 2)))
    (hw0 : w 0 = w0) :
    zR = Real.pi * n * w0 ^ 2 / lam ∧
      (∀ z, (w z) ^ 2 = w0 ^ 2 + (lam / (Real.pi * n * w0)) ^ 2 * z ^ 2) ∧
      (∀ z, (w z) ^ 2 = w0 ^ 2 * (1 + (z / zR) ^ 2)) ∧
      lam / (Real.pi * n * w0) = w0 / zR := by
  have hpi : 0 < Real.pi := Real.pi_pos
  have him : ∀ z : ℝ, zR / (z ^ 2 + zR ^ 2) = lam / (Real.pi * n * (w z) ^ 2) := by
    intro z
    have h := hq z
    rw [one_div, Complex.inv_im] at h
    have hns : Complex.normSq ((z : ℂ) + Complex.I * (zR : ℂ)) = z ^ 2 + zR ^ 2 := by
      simp [Complex.normSq_apply]
      ring
    have him' : ((z : ℂ) + Complex.I * (zR : ℂ)).im = zR := by simp
    rw [hns, him'] at h
    rw [neg_div] at h
    exact neg_injective h
  have hz0 := him 0
  rw [hw0] at hz0
  have hzR' : zR = Real.pi * n * w0 ^ 2 / lam := by
    field_simp at hz0 ⊢
    nlinarith [hz0]
  have hθ : lam / (Real.pi * n * w0) = w0 / zR := by
    rw [hzR']
    field_simp
  have hwsq : ∀ z, (w z) ^ 2 = w0 ^ 2 * (1 + (z / zR) ^ 2) := by
    intro z
    have h := him z
    have hwz : 0 < w z := hwpos z
    have hden : 0 < z ^ 2 + zR ^ 2 := by positivity
    have : (w z) ^ 2 = lam * (z ^ 2 + zR ^ 2) / (Real.pi * n * zR) := by
      field_simp at h ⊢
      nlinarith [h]
    rw [this, hzR']
    field_simp
    ring
  refine ⟨hzR', ?_, hwsq, hθ⟩
  intro z
  rw [hwsq z, hθ]
  field_simp

/-- Far field: `w(z)² / z²` tends to `θ²`. -/
theorem far_field (w0 zR : ℝ) (w : ℝ → ℝ) (hzR : 0 < zR)
    (hwsq : ∀ z, (w z) ^ 2 = w0 ^ 2 * (1 + (z / zR) ^ 2)) :
    Tendsto (fun z => (w z) ^ 2 / z ^ 2) atTop (nhds ((w0 / zR) ^ 2)) := by
  have hlim : Tendsto (fun z : ℝ => w0 ^ 2 / z ^ 2 + (w0 / zR) ^ 2) atTop
      (nhds (0 + (w0 / zR) ^ 2)) := by
    refine Tendsto.add ?_ tendsto_const_nhds
    exact tendsto_const_nhds.div_atTop (tendsto_pow_atTop (by norm_num) |>.comp tendsto_id)
  rw [zero_add] at hlim
  refine hlim.congr' ?_
  filter_upwards [eventually_gt_atTop (0 : ℝ)] with z hz
  rw [hwsq z]
  field_simp

/-- Without `π` the beam parameter product would be `λ/n`; it is
`λ/(π n)`. -/
theorem pi_needed (lam n w0 : ℝ) (hlam : 0 < lam) (hn : 0 < n) (hw0 : 0 < w0) :
    (lam / (Real.pi * n * w0)) * w0 ≠ lam / n := by
  intro h
  have hpi : 0 < Real.pi := Real.pi_pos
  field_simp at h
  have := Real.pi_gt_three
  linarith

end PhysJS.GaussianBeam
