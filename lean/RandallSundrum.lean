/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.QuantumBounce
import Physlib.Cosmology.FLRW.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-54`. Bridge. The catalog Hubble rate, and the positive-tension factor `1/2`.

`be-54.friedmann`. Derivation step. `flat_friedmann`.

`PhysJS.QuantumBounce.dictionary` already proves the limit `σ → ∞` and
the unphysical match at `σ = −ρ_c/2`. This file does not reprove that
limit. For `σ > 0`, `ρ > 0`, and `G > 0`,

```
H²_RS − H²_FRW = (8π G / 3) ρ² / (2σ) > 0
```

with `H²_FRW = (8πG/3) ρ + Λ/3` in the module's `[T⁻²]` convention.
The correction `1 + ρ/σ` drops the `2`. For `σ < 0` the same excess is
negative, so that sign is not a physical brane. Separately, `H²_FRW`
with the module `Λ` equal to Physlib's `Λ c²` is `FirstOrderFriedmann`
at `k = 0`. Using one letter for both `Λ` symbols, and dropping `c²`,
fails when `c² ≠ 1`. This is not a derivation of the brane equation
from the five-dimensional Einstein equation.
-/

namespace PhysJS.RandallSundrum

open Real QuantumBounce Time
open Cosmology.FLRW.FriedmannEquation

/-- The quadratic excess of the Randall–Sundrum rate over the Friedmann value. -/
lemma excess (G ρ σ Λ : ℝ) (hσ : σ ≠ 0) :
    h2Rs G ρ σ Λ - h2Frw G ρ Λ = (8 * π * G / 3) * ρ ^ 2 / (2 * σ) := by
  unfold h2Rs h2Frw
  field_simp [hσ]
  ring

/-- For positive tension the encoded correction is `ρ/(2σ)`, and `H²` lies
strictly above the Friedmann value.

`positive_tension` is separate from the formalRef.
Not the five-dimensional Einstein equation. The limit `σ → ∞` is
`PhysJS.QuantumBounce.dictionary`. -/
theorem positive_tension (G ρ σ Λ : ℝ) (hG : 0 < G) (hρ : 0 < ρ) (hσ : 0 < σ) :
    h2Rs G ρ σ Λ - h2Frw G ρ Λ = (8 * π * G / 3) * ρ ^ 2 / (2 * σ) ∧
      0 < h2Rs G ρ σ Λ - h2Frw G ρ Λ := by
  have heq := excess G ρ σ Λ hσ.ne'
  refine ⟨heq, ?_⟩
  rw [heq]
  positivity

/-- The catalog equation

```
H² = (8π G / 3) ρ (1 + ρ / (2σ)) + Λ / 3
```

for `σ ≠ 0`. The same rate is the Friedmann term plus
`(8π G / 3) ρ² / (2σ)`. `positive_tension` remains the sign of that
excess. Not a derivation from the five-dimensional Einstein equation. -/
theorem brane_friedmann (G ρ σ Λ : ℝ) (hσ : σ ≠ 0) :
    h2Rs G ρ σ Λ = (8 * π * G / 3) * ρ * (1 + ρ / (2 * σ)) + Λ / 3 ∧
      h2Rs G ρ σ Λ = h2Frw G ρ Λ + (8 * π * G / 3) * ρ ^ 2 / (2 * σ) := by
  refine ⟨?_, ?_⟩
  · unfold h2Rs
    rfl
  · unfold h2Rs h2Frw
    field_simp [hσ]
    ring

/-- The module's `[T⁻²]` cosmological term is Physlib's `Λ c²`. At `k = 0`
that is `FirstOrderFriedmann`. -/
theorem flat_friedmann (a ρ : Time → ℝ) (Λ G c : ℝ) (t : Time)
    (hH : (∂ₜ a t / a t) ^ 2 = h2Frw G (ρ t) (Λ * c ^ 2)) :
    FirstOrderFriedmann a ρ 0 Λ G c t := by
  unfold FirstOrderFriedmann
  rw [hH]
  unfold h2Frw
  simp

/-- `1 + ρ/σ` drops the factor `1/2`, and negative tension lies below the
Friedmann value. -/
theorem wrong_dictionary (G ρ σ Λ : ℝ) (hG : 0 < G) (hρ : 0 < ρ) (hσ : 0 < σ) :
    (8 * π * G / 3) * ρ * (1 + ρ / σ) + Λ / 3 ≠ h2Rs G ρ σ Λ ∧
      h2Rs G ρ (-σ) Λ < h2Frw G ρ Λ := by
  constructor
  · intro h
    have hdiff : (8 * π * G / 3) * ρ * (1 + ρ / σ) + Λ / 3 - h2Rs G ρ σ Λ =
        (8 * π * G / 3) * ρ ^ 2 / (2 * σ) := by
      unfold h2Rs
      field_simp [hσ.ne']
      ring
    have hpos : 0 < (8 * π * G / 3) * ρ ^ 2 / (2 * σ) := by positivity
    have hzero : (8 * π * G / 3) * ρ ^ 2 / (2 * σ) = 0 := by
      have := sub_eq_zero.mpr h
      linarith
    exact hpos.ne' hzero
  · have hnegσ : -σ ≠ 0 := neg_ne_zero.mpr hσ.ne'
    have heq := excess G ρ (-σ) Λ hnegσ
    have hquot : (8 * π * G / 3) * ρ ^ 2 / (2 * -σ) < 0 := by
      refine div_neg_of_pos_of_neg ?_ ?_
      · positivity
      · linarith
    linarith

/-- Identifying the module's `Λ` with Physlib's `Λ`, and dropping `c²`, is
not the flat Friedmann term. -/
theorem wrong_lambda (G ρ Λ c : ℝ) (hΛ : Λ ≠ 0) (hc : c ^ 2 ≠ 1) :
    h2Frw G ρ Λ ≠ (8 * π * G / 3) * ρ + Λ * c ^ 2 / 3 := by
  intro h
  unfold h2Frw at h
  field_simp [hΛ] at h
  have hfac : Λ * (c ^ 2 - 1) = 0 := by
    rw [mul_sub, mul_one]
    linarith
  exact hc (sub_eq_zero.mp ((mul_eq_zero.mp hfac).resolve_left hΛ))

end PhysJS.RandallSundrum
