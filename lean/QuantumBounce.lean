/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity

/-!
`be-19`. Cross-check.

`be-19`, naming BE-54. One entry, key `be-19`.

`Λ` is the modules' `[T⁻²]` symbol. With `ρ_c ≠ 0`,

```
H²_LQC = (8πG/3) ρ (1 − ρ/ρ_c) + Λ/3
H²_RS  = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3
```

`H²_LQC` at `σ` replaced by the identification equals `H²_RS` at
`σ = −ρ_c/2`. As `ρ_c → ∞` and as `σ → ∞`, both tend to
`(8πG/3) ρ + Λ/3`. At `ρ = ρ_c` and `Λ = 0`, `H²_LQC = 0`.
`σ = +ρ_c/2` is not the LQC polynomial. `σ < 0` is not a physical
Randall–Sundrum brane.
-/

namespace PhysJS.QuantumBounce

open Real Filter Topology

/-- Loop-quantum Hubble rate `H²_LQC`. -/
noncomputable def h2Lqc (G ρ ρc Λ : ℝ) : ℝ :=
  (8 * π * G / 3) * ρ * (1 - ρ / ρc) + Λ / 3

/-- Randall–Sundrum Hubble rate `H²_RS`. -/
noncomputable def h2Rs (G ρ σ Λ : ℝ) : ℝ :=
  (8 * π * G / 3) * ρ * (1 + ρ / (2 * σ)) + Λ / 3

/-- The shared Friedmann limit `(8πG/3) ρ + Λ/3`. -/
noncomputable def h2Frw (G ρ Λ : ℝ) : ℝ :=
  (8 * π * G / 3) * ρ + Λ / 3

/-- `σ = −ρ_c/2` matches the two polynomials. At the critical density and
`Λ = 0`, the loop rate vanishes. Both rates tend to the Friedmann value.

Covers the cross-check of `be-19` with BE-54. `σ < 0` is not a physical
Randall–Sundrum brane. -/
theorem dictionary (G ρ ρc Λ : ℝ) (hρc : ρc ≠ 0) :
    h2Lqc G ρ ρc Λ = h2Rs G ρ (-(ρc / 2)) Λ ∧
      h2Lqc G ρc ρc 0 = 0 ∧
      Tendsto (fun ρc' : ℝ => h2Lqc G ρ ρc' Λ) atTop (𝓝 (h2Frw G ρ Λ)) ∧
      Tendsto (fun σ : ℝ => h2Rs G ρ σ Λ) atTop (𝓝 (h2Frw G ρ Λ)) := by
  refine ⟨?_, ?_, ?_, ?_⟩
  · unfold h2Lqc h2Rs
    field_simp [hρc]
    ring
  · unfold h2Lqc
    field_simp [hρc]
    ring
  · unfold h2Lqc h2Frw
    have hinv : Tendsto (fun ρc' : ℝ => (ρc' : ℝ)⁻¹) atTop (𝓝 0) :=
      tendsto_inv_atTop_zero (𝕜 := ℝ)
    have hdiv : Tendsto (fun ρc' : ℝ => ρ / ρc') atTop (𝓝 0) := by
      simpa [div_eq_mul_inv, mul_zero] using Filter.Tendsto.const_mul ρ hinv
    have hsub : Tendsto (fun ρc' : ℝ => 1 - ρ / ρc') atTop (𝓝 1) := by
      have h := (tendsto_const_nhds : Tendsto (fun _ : ℝ => (1 : ℝ)) atTop (𝓝 1)).sub hdiv
      simpa [sub_zero] using h
    have hmul := Filter.Tendsto.const_mul ((8 * π * G / 3) * ρ) hsub
    have hmul' : Tendsto (fun ρc' : ℝ => (8 * π * G / 3) * ρ * (1 - ρ / ρc')) atTop
        (𝓝 ((8 * π * G / 3) * ρ)) := by
      simpa [mul_one] using hmul
    have hadd := hmul'.add
      (tendsto_const_nhds : Tendsto (fun _ : ℝ => Λ / 3) atTop (𝓝 (Λ / 3)))
    simpa [add_comm, add_left_comm, add_assoc] using hadd
  · unfold h2Rs h2Frw
    have hinv : Tendsto (fun σ : ℝ => (σ : ℝ)⁻¹) atTop (𝓝 0) :=
      tendsto_inv_atTop_zero (𝕜 := ℝ)
    have hdiv : Tendsto (fun σ : ℝ => ρ / (2 * σ)) atTop (𝓝 0) := by
      have h := Filter.Tendsto.const_mul (ρ * (2 : ℝ)⁻¹) hinv
      simpa [mul_zero, div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using h
    have hadd : Tendsto (fun σ : ℝ => 1 + ρ / (2 * σ)) atTop (𝓝 1) := by
      have h := (tendsto_const_nhds : Tendsto (fun _ : ℝ => (1 : ℝ)) atTop (𝓝 1)).add hdiv
      simpa [add_zero] using h
    have hmul := Filter.Tendsto.const_mul ((8 * π * G / 3) * ρ) hadd
    have hmul' : Tendsto (fun σ : ℝ => (8 * π * G / 3) * ρ * (1 + ρ / (2 * σ))) atTop
        (𝓝 ((8 * π * G / 3) * ρ)) := by
      simpa [mul_one] using hmul
    have hsum := hmul'.add
      (tendsto_const_nhds : Tendsto (fun _ : ℝ => Λ / 3) atTop (𝓝 (Λ / 3)))
    simpa [add_comm, add_left_comm, add_assoc] using hsum

/-- `σ = +ρ_c/2` is not the LQC polynomial when the density term is present. -/
theorem wrong_dictionary_plus (G ρ ρc Λ : ℝ) (hG : G ≠ 0) (hρ : ρ ≠ 0) (hρc : ρc ≠ 0) :
    h2Rs G ρ (ρc / 2) Λ ≠ h2Lqc G ρ ρc Λ := by
  unfold h2Rs h2Lqc
  intro h
  field_simp [hG, hρ, hρc, pi_ne_zero] at h
  have hcoef : (8 : ℝ) * π * G * ρ ≠ 0 :=
    mul_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num) pi_ne_zero) hG) hρ
  have hsub : (8 : ℝ) * π * G * ρ * (ρc + ρ) = (8 : ℝ) * π * G * ρ * (ρc - ρ) := by
    linear_combination h
  have heq : ρc + ρ = ρc - ρ := mul_left_cancel₀ hcoef hsub
  have hzero : (2 : ℝ) * ρ = 0 := by linear_combination heq
  exact hρ (by simpa [mul_eq_zero, two_ne_zero] using hzero)

end PhysJS.QuantumBounce
