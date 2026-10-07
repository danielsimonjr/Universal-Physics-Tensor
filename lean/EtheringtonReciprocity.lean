/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-224`. Bridge. Etherington reciprocity and Tolman surface-brightness dimming.

The catalog equations are

```
d_L = (1 + z)² d_A
I_obs = I_em / (1 + z)⁴
```

Premises (hypotheses). A source of bolometric luminosity `L` at redshift `z`
and comoving transverse distance `χ` (a pure geometric number of the
metric, whatever the curvature). Photon number is conserved, so the flux is
the emitted energy per photon divided by `(1 + z)`, the arrival rate divided by
`(1 + z)`, spread over the comoving sphere `4π χ²`:

```
F = L / (4π χ² (1 + z)²)                                  (hflux)
```

The luminosity distance is defined by `F = L / (4π d_L²)`, `d_L > 0`.
A proper transverse size `s` is seen at angle `θ` with `s = χ θ / (1 + z)`
(the emission-time scale factor is `1/(1 + z)`), and the angular-diameter
distance is `s = d_A θ`. `luminosity_distance_eq` gives `d_L = (1 + z) χ`,
`angular_distance_eq` gives `d_A = χ / (1 + z)`, `etherington_eq` combines
them (through `reciprocity_eq`) to `d_L = (1 + z)² d_A`, and `tolman_eq` gives
`I_obs = I_em / (1 + z)⁴` with `I = F / Ω`, `Ω = A_s / d_A²`, and
isotropic `I_em = L / (4π A_s)`. `photon_loss_breaks_reciprocity` shows that
a surviving photon fraction `η < 1` is detected as a violation.

Premises: metric theory, photon number conserved, null geodesics, no
absorption. Not a derivation of the redshift factor `1 + z` of the
photon energy and rate from the Friedmann geometry (it is taken as the
hypothesis `hflux`). Nothing numerical (the ratio 4 at z = 1 is the
algebra `ratio_at_one`) is measured.
-/

namespace PhysJS.EtheringtonReciprocity

open Real

/-- `d_L = (1 + z) χ` from the flux with conserved photon number. -/
theorem luminosity_distance_eq (L F χ z dL : ℝ) (hL : 0 < L) (hχ : 0 < χ) (hz : 0 ≤ z)
    (hdL : 0 < dL)
    (hflux : F = L / (4 * π * χ ^ 2 * (1 + z) ^ 2))
    (hdef : F = L / (4 * π * dL ^ 2)) :
    dL = (1 + z) * χ := by
  have hpi : 0 < π := Real.pi_pos
  have h1 : 0 < 1 + z := by linarith
  have h : dL ^ 2 = ((1 + z) * χ) ^ 2 := by
    have h' : L / (4 * π * dL ^ 2) = L / (4 * π * χ ^ 2 * (1 + z) ^ 2) := by
      rw [← hdef, ← hflux]
    rw [div_eq_div_iff (by positivity) (by positivity)] at h'
    have : 4 * π * L * (dL ^ 2 - ((1 + z) * χ) ^ 2) = 0 := by nlinarith [h']
    have h4 : 4 * π * L ≠ 0 := by positivity
    have := (mul_eq_zero.mp this).resolve_left h4
    nlinarith [this]
  exact (pow_left_inj₀ hdL.le (by positivity) (by norm_num : (2 : ℕ) ≠ 0)).mp h

/-- `d_A = χ / (1 + z)` from `s = χ θ / (1 + z) = d_A θ`. -/
theorem angular_distance_eq (s θ χ z dA : ℝ) (hθ : 0 < θ) (hz : 0 ≤ z)
    (hs : s = χ * θ / (1 + z)) (hdef : s = dA * θ) :
    dA = χ / (1 + z) := by
  have h1 : 0 < 1 + z := by linarith
  have : dA * θ = χ / (1 + z) * θ := by rw [← hdef, hs]; field_simp
  exact mul_right_cancel₀ hθ.ne' this

/-- Etherington reciprocity. -/
theorem reciprocity_eq (χ z dL dA : ℝ) (hz : 0 ≤ z)
    (hL : dL = (1 + z) * χ) (hA : dA = χ / (1 + z)) :
    dL = (1 + z) ^ 2 * dA := by
  have h1 : 0 < 1 + z := by linarith
  rw [hL, hA]; field_simp

/-- Etherington from the premises: `d_L = (1 + z)² d_A`. -/
theorem etherington_eq (L F χ z dL s θ dA : ℝ) (hL : 0 < L) (hχ : 0 < χ) (hz : 0 ≤ z)
    (hdL : 0 < dL) (hθ : 0 < θ)
    (hflux : F = L / (4 * π * χ ^ 2 * (1 + z) ^ 2))
    (hdef : F = L / (4 * π * dL ^ 2))
    (hs : s = χ * θ / (1 + z)) (hAdef : s = dA * θ) :
    dL = (1 + z) ^ 2 * dA :=
  reciprocity_eq χ z dL dA hz (luminosity_distance_eq L F χ z dL hL hχ hz hdL hflux hdef)
    (angular_distance_eq s θ χ z dA hθ hz hs hAdef)

/-- Tolman dimming of the surface brightness. -/
theorem tolman_eq (L F A_s Ω dL dA Iem Iobs z : ℝ) (hL : 0 < L) (hz : 0 ≤ z)
    (hA : 0 < A_s) (hdA : 0 < dA)
    (hdL : dL = (1 + z) ^ 2 * dA) (hF : F = L / (4 * π * dL ^ 2))
    (hΩ : Ω = A_s / dA ^ 2) (hIem : Iem = L / (4 * π * A_s))
    (hIobs : Iobs = F / Ω) :
    Iobs = Iem / (1 + z) ^ 4 := by
  have hpi : 0 < π := Real.pi_pos
  have h1 : 0 < 1 + z := by linarith
  rw [hIobs, hF, hΩ, hIem, hdL]
  field_simp

/-- If only a fraction `η ∈ (0,1)` of the photons survives, the flux relation
is incompatible with `d_L = (1+z)² d_A`: reciprocity fails. -/
theorem photon_loss_breaks_reciprocity (L F χ z dL dA η : ℝ) (hL : 0 < L) (hχ : 0 < χ)
    (hz : 0 ≤ z) (hη : 0 < η) (hη1 : η < 1)
    (hflux : F = η * L / (4 * π * χ ^ 2 * (1 + z) ^ 2))
    (hdef : F = L / (4 * π * dL ^ 2)) (hA : dA = χ / (1 + z)) :
    dL ≠ (1 + z) ^ 2 * dA := by
  have hpi : 0 < π := Real.pi_pos
  have h1 : 0 < 1 + z := by linarith
  intro h
  rw [hA] at h
  have hd : dL = (1 + z) * χ := by rw [h]; field_simp
  rw [hd] at hdef
  rw [hdef] at hflux
  have h' : L * (4 * π * χ ^ 2 * (1 + z) ^ 2) = η * L * (4 * π * ((1 + z) * χ) ^ 2) := by
    rw [div_eq_div_iff (by positivity) (by positivity)] at hflux
    linarith
  have : 4 * π * L * χ ^ 2 * (1 + z) ^ 2 * (1 - η) = 0 := by nlinarith [h']
  have h4 : 4 * π * L * χ ^ 2 * (1 + z) ^ 2 ≠ 0 := by positivity
  have := (mul_eq_zero.mp this).resolve_left h4
  linarith

/-- The ratio is `4` at `z = 1`. -/
theorem ratio_at_one : ((1 : ℝ) + 1) ^ 2 = 4 ∧ ((1 : ℝ) + 1) ^ 4 = 16 := by
  constructor <;> norm_num

end PhysJS.EtheringtonReciprocity
