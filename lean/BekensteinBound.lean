/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-222`. Bridge. Bekenstein bound and its black-hole saturation.

The catalog relation is the inequality

```
S ≤ 2π k_B R E / (ℏ c)
```

for a weakly gravitating system of energy `E` inside a sphere of radius
`R`. The inequality itself is a hypothesis here (`hbound` in `bound_monotone`); it is not
derived from quantum field theory or the generalised second law in this
file. What is proved from stated premises:

* `saturation_eq`: with the Bekenstein-Hawking entropy
  `S = k_B c³ A / (4 G ℏ)`, the horizon area `A = 4π r_s²`,
  `r_s = 2 G M / c²`, and `E = M c²`, the Schwarzschild black hole of
  radius `R = r_s` satisfies the bound with equality
  `S = 2π k_B R E / (ℏ c)`. This pins the coefficient `2π` to the choice
  `R = r_s`, the radius of the smallest sphere that contains the system.
* `radius_convention`: if `R = λ r_s` the bound is `λ` times the horizon
  entropy; so `λ = 1` is the saturated convention and another convention
  (e.g. a diameter, `λ = 2`) changes the coefficient by that factor.
* `bound_monotone`: the right side is monotone in `R` and `E`, so a system
  that satisfies the bound at `(R, E)` satisfies it at any `R' ≥ R`,
  `E' ≥ E`.
* `bound_le_area_iff`: the bound is below the horizon-area (holographic)
  entropy `π k_B c³ R² / (G ℏ)` of the enclosing sphere exactly when
  `E ≤ R c⁴ / (2 G)`, the mass of the black hole of radius `R`.

Not a derivation of the bound, not for strongly gravitating or unbounded
systems. The 2.47e20 J/K value for 1 kg in 1 m is not evaluated.
-/

namespace PhysJS.BekensteinBound

open Real

/-- Right-hand side of the Bekenstein bound. -/
noncomputable def sBound (k ħ c R E : ℝ) : ℝ :=
  2 * π * k * R * E / (ħ * c)

/-- Bekenstein-Hawking entropy of a horizon of area `A`. -/
noncomputable def sBH (k ħ c G A : ℝ) : ℝ :=
  k * c ^ 3 * A / (4 * G * ħ)

/-- Schwarzschild black hole saturates the bound with `R = r_s`, `E = M c²`. -/
theorem saturation_eq (k ħ c G M R E A S : ℝ) (hG : 0 < G) (hħ : 0 < ħ) (hc : 0 < c)
    (hR : R = 2 * G * M / c ^ 2) (hE : E = M * c ^ 2) (hA : A = 4 * π * R ^ 2)
    (hS : S = sBH k ħ c G A) :
    S = sBound k ħ c R E := by
  have hc0 : c ≠ 0 := hc.ne'
  have hG0 : G ≠ 0 := hG.ne'
  have hħ0 : ħ ≠ 0 := hħ.ne'
  rw [hS, sBH, sBound, hA, hE, hR]
  field_simp

/-- Radius convention `R = λ r_s`: the bound is `λ` times the horizon entropy. -/
theorem radius_convention (k ħ c G M l : ℝ) (hG : 0 < G) (hħ : 0 < ħ) (hc : 0 < c) :
    sBound k ħ c (l * (2 * G * M / c ^ 2)) (M * c ^ 2) =
      l * sBH k ħ c G (4 * π * (2 * G * M / c ^ 2) ^ 2) := by
  have hc0 : c ≠ 0 := hc.ne'
  have hG0 : G ≠ 0 := hG.ne'
  have hħ0 : ħ ≠ 0 := hħ.ne'
  rw [sBH, sBound]
  field_simp

/-- Monotonicity of the bound in `R` and `E`; hence the inequality, once
true at `(R, E)`, persists at larger `R`, `E`. -/
theorem bound_monotone (k ħ c R R' E E' S : ℝ) (hk : 0 ≤ k) (hħ : 0 < ħ) (hc : 0 < c)
    (hR : 0 ≤ R) (hE : 0 ≤ E) (hRR : R ≤ R') (hEE : E ≤ E')
    (hbound : S ≤ sBound k ħ c R E) :
    S ≤ sBound k ħ c R' E' := by
  refine hbound.trans ?_
  unfold sBound
  apply div_le_div_of_nonneg_right _ (by positivity)
  have hpi : 0 < π := Real.pi_pos
  have h1 : R * E ≤ R' * E' := mul_le_mul hRR hEE hE (hR.trans hRR)
  have : 0 ≤ 2 * π * k := by positivity
  calc 2 * π * k * R * E = 2 * π * k * (R * E) := by ring
    _ ≤ 2 * π * k * (R' * E') := mul_le_mul_of_nonneg_left h1 this
    _ = 2 * π * k * R' * E' := by ring

/-- Holographic comparison: the bound is below the horizon-area entropy of the
enclosing sphere iff `E ≤ R c⁴ / (2 G)`. -/
theorem bound_le_area_iff (k ħ c G R E : ℝ) (hk : 0 < k) (hG : 0 < G) (hħ : 0 < ħ)
    (hc : 0 < c) (hR : 0 < R) :
    sBound k ħ c R E ≤ sBH k ħ c G (4 * π * R ^ 2) ↔ E ≤ R * c ^ 4 / (2 * G) := by
  have hpi : 0 < π := Real.pi_pos
  unfold sBound sBH
  rw [div_le_div_iff₀ (by positivity) (by positivity)]
  rw [le_div_iff₀ (by positivity)]
  constructor
  · intro h
    have hpos : 0 < 2 * π * k * R * ħ * c * G := by positivity
    nlinarith [h, hpos, mul_pos hpi hk, mul_pos hR hħ, mul_pos hc hG]
  · intro h
    have hpos : 0 < 2 * π * k * R * ħ * c * G := by positivity
    nlinarith [h, hpos, mul_pos hpi hk, mul_pos hR hħ, mul_pos hc hG]

/-- Units alone do not fix the coefficient: `2π` is one choice of dimensionless
prefactor and `4π` is another; they differ for any positive `R E / (ℏ c)`. -/
theorem coefficient_not_fixed (k R E ħ c : ℝ) (hk : 0 < k) (hR : 0 < R) (hE : 0 < E)
    (hħ : 0 < ħ) (hc : 0 < c) :
    2 * π * k * R * E / (ħ * c) ≠ 4 * π * k * R * E / (ħ * c) := by
  have hpi : 0 < π := Real.pi_pos
  intro h
  have hd : 0 < ħ * c := by positivity
  rw [div_left_inj' hd.ne'] at h
  have : 0 < 2 * π * k * R * E := by positivity
  linarith

end PhysJS.BekensteinBound
