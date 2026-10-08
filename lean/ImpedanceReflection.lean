/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-241`. Bridge. Normal-incidence intensity reflection at an acoustic interface.

The catalog equation is

```
R = ((Z₂ − Z₁) / (Z₂ + Z₁))²        Z = ρ c
```

The premises are plane waves at a planar, lossless interface at normal
incidence. Medium 1 carries an incident wave `p_i` and a reflected wave
`p_r`; medium 2 carries a transmitted wave `p_t`. A plane wave has
particle velocity `±p/Z`, so the interface conditions are pressure
continuity `p_i + p_r = p_t` and velocity continuity
`(p_i − p_r)/Z₁ = p_t/Z₂`. The intensity of a plane wave is `p²/(2Z)`.

`reflection_eq` solves the two continuity conditions for the amplitude
ratio and gives `R = I_r/I_i = ((Z₂ − Z₁)/(Z₂ + Z₁))²`. `energy_balance`
proves `R + T = 1` with `T = I_t/I_i`. It does not treat oblique incidence,
absorption or finite thickness. The acoustic twin of the Fresnel
normal-incidence formula.
-/

namespace PhysJS.ImpedanceReflection

/-- Intensity of a plane wave of pressure amplitude `p` in a medium of
impedance `Z`. -/
noncomputable def intensity (p Z : ℝ) : ℝ := p ^ 2 / (2 * Z)

/-- Reflected pressure ratio and intensity reflection from pressure and
velocity continuity.

Not an
oblique-incidence or lossy result. -/
theorem reflection_eq (pi pr pt Z₁ Z₂ : ℝ)
    (hZ₁ : 0 < Z₁) (hZ₂ : 0 < Z₂) (hpi : pi ≠ 0)
    (hp : pi + pr = pt) (hv : (pi - pr) / Z₁ = pt / Z₂) :
    pr / pi = (Z₂ - Z₁) / (Z₂ + Z₁) ∧
      intensity pr Z₁ / intensity pi Z₁ = ((Z₂ - Z₁) / (Z₂ + Z₁)) ^ 2 := by
  have hZs : Z₂ + Z₁ ≠ 0 := by positivity
  have hr : pr / pi = (Z₂ - Z₁) / (Z₂ + Z₁) := by
    rw [div_eq_div_iff hpi hZs]
    have hv' : Z₂ * (pi - pr) = Z₁ * pt := by
      field_simp at hv
      linarith
    rw [← hp] at hv'
    nlinarith
  refine ⟨hr, ?_⟩
  unfold intensity
  have : pr ^ 2 / (2 * Z₁) / (pi ^ 2 / (2 * Z₁)) = (pr / pi) ^ 2 := by
    field_simp
  rw [this, hr]

/-- Energy balance `R + T = 1`, with `T = I_t / I_i`. -/
theorem energy_balance (pi pr pt Z₁ Z₂ : ℝ)
    (hZ₁ : 0 < Z₁) (hZ₂ : 0 < Z₂) (hpi : pi ≠ 0)
    (hp : pi + pr = pt) (hv : (pi - pr) / Z₁ = pt / Z₂) :
    intensity pr Z₁ / intensity pi Z₁ + intensity pt Z₂ / intensity pi Z₁ = 1 := by
  have hr := (reflection_eq pi pr pt Z₁ Z₂ hZ₁ hZ₂ hpi hp hv).1
  have hZs : Z₂ + Z₁ ≠ 0 := by positivity
  have hpt : pt / pi = 2 * Z₂ / (Z₂ + Z₁) := by
    have : pt / pi = 1 + pr / pi := by rw [← hp]; field_simp
    rw [this, hr]; field_simp; ring
  unfold intensity
  have h1 : pr ^ 2 / (2 * Z₁) / (pi ^ 2 / (2 * Z₁)) = (pr / pi) ^ 2 := by field_simp
  have h2 : pt ^ 2 / (2 * Z₂) / (pi ^ 2 / (2 * Z₁)) = (Z₁ / Z₂) * (pt / pi) ^ 2 := by
    field_simp
  rw [h1, h2, hr, hpt]
  field_simp
  ring

/-- `0 ≤ R ≤ 1` for positive impedances. -/
theorem reflection_bounds (Z₁ Z₂ : ℝ) (hZ₁ : 0 < Z₁) (hZ₂ : 0 < Z₂) :
    0 ≤ ((Z₂ - Z₁) / (Z₂ + Z₁)) ^ 2 ∧ ((Z₂ - Z₁) / (Z₂ + Z₁)) ^ 2 ≤ 1 := by
  have hpos : 0 < Z₂ + Z₁ := by positivity
  refine ⟨sq_nonneg _, ?_⟩
  rw [div_pow, div_le_one (by positivity)]
  nlinarith [mul_pos hZ₁ hZ₂]

/-- No reflection exactly when the impedances match. -/
theorem no_reflection_iff (Z₁ Z₂ : ℝ) (hZ₁ : 0 < Z₁) (hZ₂ : 0 < Z₂) :
    ((Z₂ - Z₁) / (Z₂ + Z₁)) ^ 2 = 0 ↔ Z₁ = Z₂ := by
  have hpos : Z₂ + Z₁ ≠ 0 := by positivity
  constructor
  · intro h
    have := pow_eq_zero_iff (two_ne_zero) |>.mp h
    rcases div_eq_zero_iff.mp this with h0 | h0
    · linarith
    · exact absurd h0 hpos
  · intro h; subst h; simp

/-- Water into air: with `Z₁ = 1.48e6` and `Z₂ = 413` (rayl), `R > 0.998`. -/
theorem water_air : 0.998 < ((413 - 1480000) / (413 + 1480000 : ℝ)) ^ 2 := by
  norm_num

/-- Units alone do not entail the square: the unsquared amplitude ratio
is a different number. -/
theorem square_not_fixed : ∃ Z₁ Z₂ : ℝ, (Z₂ - Z₁) / (Z₂ + Z₁) ≠ ((Z₂ - Z₁) / (Z₂ + Z₁)) ^ 2 :=
  ⟨1, 2, by norm_num⟩

end PhysJS.ImpedanceReflection
