/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Dimensional
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-66`. Bridge. Radiation pressure on an opaque surface.

The catalog equation is

```
P_n = (I / c) (1 + R) cos²θ
```

`pressure_eq` derives it from three named premises. The energy flux on the
surface is the foreshortened intensity `I cos θ`. A vacuum ray carries
normal momentum `(cos θ) / c` per unit energy. Transmission is zero, so
the absorbed fraction is `1 - R` and deposits that momentum once, while
specular reflectance `R` reverses the normal component and deposits it
twice. `R = 0`, `θ = 0` is the absorber `I / c`. `R = 1`, `θ = 0` is the
reflector `2 I / c`.

`pressure_monomial` is the Buckingham step on `{P, I, c}`: homogeneity
gives `P = C I / c` with `C = f(1, 1)` unfixed. The optical factor
`(1 + R) cos²θ` is not that monomial. `coefficient_unfixed` separates any
other factor from `1`. `reflector_not_absorber` separates `2 I / c` from
`I / c`. `oblique_endpoints` is the endpoint check, and it rejects a single
cosine where `cos θ` is neither `0` nor `1`.

Physlib has no Maxwell-stress module and no surface boundary condition.
This file does not import one. Diffuse reflection, thermal emission, and a
transmitting film are outside the statement. The Eddington luminosity is
not this statement.
-/

namespace PhysJS.RadiationPressure

open Real Finset

/-- Catalog normal pressure. Transmission is zero. -/
noncomputable def normalPressure (I c R θ : ℝ) : ℝ :=
  (I / c) * (1 + R) * Real.cos θ ^ 2

/-- Foreshortening, normal momentum per energy, and the opaque split into
absorption and specular reversal give the catalog pressure.

`hflux` is the energy per unit time on a unit of surface. `hmom` is the
normal momentum per unit energy of a vacuum ray. `hdeposit` deposits the
absorbed fraction once and the reflected fraction twice. -/
theorem pressure_eq (I c R θ P flux mom : ℝ) (hc : c ≠ 0)
    (hflux : flux = I * Real.cos θ)
    (hmom : mom = Real.cos θ / c)
    (hdeposit : P = flux * mom * ((1 - R) + 2 * R)) :
    P = normalPressure I c R θ := by
  have hsplit : (1 - R) + 2 * R = 1 + R := by ring
  rw [hdeposit, hflux, hmom, hsplit]
  unfold normalPressure
  field_simp [hc]

/-- Absorber endpoint `R = 0`, `θ = 0`. -/
theorem absorber_endpoint (I c : ℝ) (hc : c ≠ 0) :
    normalPressure I c 0 0 = I / c := by
  unfold normalPressure
  rw [Real.cos_zero]
  field_simp [hc]
  ring

/-- Reflector endpoint `R = 1`, `θ = 0`. -/
theorem reflector_endpoint (I c : ℝ) (hc : c ≠ 0) :
    normalPressure I c 1 0 = 2 * I / c := by
  unfold normalPressure
  rw [Real.cos_zero]
  field_simp [hc]
  ring

/-- `[I] = M T⁻³`. -/
def intensityDim : Dimensional.Dim 3
  | 0 => 1
  | 1 => 0
  | 2 => -3

/-- `[c] = L T⁻¹`. -/
def speedDim : Dimensional.Dim 3
  | 0 => 0
  | 1 => 1
  | 2 => -1

/-- `[P] = M L⁻¹ T⁻²`. -/
def pressureDim : Dimensional.Dim 3
  | 0 => 1
  | 1 => -1
  | 2 => -2

/-- The two inputs, in the order `(I, c)`. -/
def pressureInputs : Fin 2 → Dimensional.Dim 3
  | 0 => intensityDim
  | 1 => speedDim

/-- The monomial exponents forced by `[P] = [I][c]⁻¹`. -/
def pressureExponent : Fin 2 → ℚ
  | 0 => 1
  | 1 => -1

lemma pressure_dimension_eq :
    ∀ i, pressureDim i = ∑ j : Fin 2, pressureExponent j * pressureInputs j i := by
  intro i
  fin_cases i
  · simp [pressureDim, pressureExponent, pressureInputs, intensityDim, speedDim, Fin.sum_univ_two]
  · simp [pressureDim, pressureExponent, pressureInputs, intensityDim, speedDim, Fin.sum_univ_two]
  · simp [pressureDim, pressureExponent, pressureInputs, intensityDim, speedDim, Fin.sum_univ_two]
    norm_num

/-- Every positive `(I, c)` is a unit change of `(1, 1)`. The time unit is
held fixed. -/
lemma pressure_reach (x : Fin 2 → ℝ) (hx : ∀ j, 0 < x j) :
    ∃ lam : Fin 3 → ℝ, (∀ i, 0 < lam i) ∧
      ∀ j, Dimensional.factor lam (pressureInputs j) = x j := by
  let lam : Fin 3 → ℝ := fun i => if i = 0 then x 0 else if i = 1 then x 1 else 1
  refine ⟨lam, ?_, ?_⟩
  · intro i
    fin_cases i <;> simp [lam, hx 0, hx 1]
  · intro j
    fin_cases j
    · unfold Dimensional.factor
      rw [Fin.prod_univ_three]
      simp [pressureInputs, intensityDim, lam, rpow_one, rpow_zero, mul_one]
    · unfold Dimensional.factor
      rw [Fin.prod_univ_three]
      simp [pressureInputs, speedDim, lam, rpow_one, rpow_zero, one_mul, mul_one]

/-- Hypothesis: a positive pressure is dimensionally homogeneous in `I` and
`c` alone. Then `P = C I / c` and `C = f(1, 1)`.

`C = 1` is not derived, and neither is `(1 + R) cos²θ`. -/
theorem pressure_monomial (f : (Fin 2 → ℝ) → ℝ)
    (hf : Dimensional.Homogeneous pressureInputs pressureDim f) {x : Fin 2 → ℝ}
    (hx : ∀ j, 0 < x j) :
    f x = f (fun _ => 1) * x 0 / x 1 := by
  have hform := Dimensional.monomial_form pressureInputs pressureDim pressureExponent
    pressure_dimension_eq pressure_reach hf hx
  rw [hform, Fin.prod_univ_two]
  simp only [pressureExponent]
  rw [show ((1 : ℚ) : ℝ) = 1 by norm_num, rpow_one,
    show (((-1 : ℚ) : ℝ) = -1) by norm_num, rpow_neg_one, ← mul_assoc, ← div_eq_mul_inv]

/-- Units give `P = C * I / c`. `C` is a hypothesis.

Covers a derivation step only. Not the optical boundary condition. -/
theorem coefficient_unfixed
    (I c C : ℝ) (hI : 0 < I) (hc : 0 < c) (hC : C ≠ 1) :
    C * I / c ≠ I / c := by
  intro hEq
  field_simp [hc.ne', hI.ne'] at hEq
  exact hC hEq

/-- The reflector value is not the absorber value when `I ≠ 0`.

This fails on the true absorber claim. It does not choose `C` after the fact. -/
theorem reflector_not_absorber (I c : ℝ) (hI : I ≠ 0) (hc : 0 < c) :
    I / c ≠ 2 * I / c := by
  intro hEq
  have hc0 : c ≠ 0 := hc.ne'
  field_simp [hc0] at hEq
  linarith

/-- Endpoint check for the oblique hypothesis, transmission zero.

`R = 0` and `θ = 0` is `I / c`. `R = 1` and `θ = 0` is `2 I / c`.
A third factor, `(1 + R) * cos θ` with only one cosine, fails at `θ ≠ 0`. -/
theorem oblique_endpoints
    (I c θ : ℝ) (hc : 0 < c) (hI : 0 < I) (hθ : Real.cos θ ≠ 0)
    (hθ1 : Real.cos θ ≠ 1) :
    (I / c) * (1 + 0) * Real.cos 0 ^ 2 = I / c ∧
      (I / c) * (1 + 1) * Real.cos 0 ^ 2 = 2 * I / c ∧
      (I / c) * (1 + 1) * Real.cos θ ≠ (I / c) * (1 + 1) * Real.cos θ ^ 2 := by
  have hc0 : c ≠ 0 := hc.ne'
  have hcos0 : Real.cos 0 = 1 := Real.cos_zero
  refine ⟨?_, ?_, ?_⟩
  · rw [hcos0]
    field_simp [hc0]
    ring
  · rw [hcos0]
    field_simp [hc0]
    ring
  · intro hEq
    have hfac : (I / c) * (1 + 1) ≠ 0 := by
      positivity
    have hcos : Real.cos θ = Real.cos θ ^ 2 := mul_left_cancel₀ hfac hEq
    have hdiff : Real.cos θ * (1 - Real.cos θ) = 0 := by
      linear_combination hcos
    rcases mul_eq_zero.mp hdiff with h0 | h1
    · exact hθ h0
    · exact hθ1 (by linarith)

end PhysJS.RadiationPressure
