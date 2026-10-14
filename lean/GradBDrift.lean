/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-111`. Bridge. Grad-B and curvature drifts, as signed scalar speeds.

Proved under these hypotheses. The magnetic moment is
`μ = m v_⊥² / (2 B)`. The grad-B speed along the direction of
`B × ∇B` is `μ |∇B| / (q B)`, hence
`m v_⊥² |∇B| / (2 q B²)`. This is the coefficient of the vector
`(m v_⊥² / (2 q)) (B × ∇B) / B³` when `|B × ∇B| = B |∇_⊥ B|`.
The cross product's direction is not formalized. Vacuum low-β
curvature uses `κ = |∇B| / B`, so the curvature speed is
`m v_∥² |∇B| / (q B²)`. The sum is
`m (v_∥² + v_⊥² / 2) |∇B| / (q B²)`. High-β curvature, where `κ` is
not `|∇B| / B`, is a different vector. `q` is the signed charge.
-/

namespace PhysJS.GradBDrift

/-- Signed grad-B speed, curvature speed, and their vacuum sum.

`hμ` is the magnetic moment. `hgrad` is `μ |∇B| / (q B)`.
`hκ` is the low-β identification `κ = |∇B| / B`. `hcurv` is
`m v_∥² κ / (q B)`. -/
theorem drift_magnitude (m vPerp vPar B q gradB μ κ vGrad vCurv : ℝ)
    (hB : B ≠ 0) (hq : q ≠ 0)
    (hμ : μ = m * vPerp ^ 2 / (2 * B))
    (hgrad : vGrad = μ * gradB / (q * B))
    (hκ : κ = gradB / B)
    (hcurv : vCurv = m * vPar ^ 2 * κ / (q * B)) :
    vGrad = m * vPerp ^ 2 * gradB / (2 * q * B ^ 2) ∧
      vCurv = m * vPar ^ 2 * gradB / (q * B ^ 2) ∧
      vGrad + vCurv = m * (vPar ^ 2 + vPerp ^ 2 / 2) * gradB / (q * B ^ 2) := by
  have hvG : vGrad = m * vPerp ^ 2 * gradB / (2 * q * B ^ 2) := by
    rw [hgrad, hμ]
    field_simp [hB, hq]
  have hvC : vCurv = m * vPar ^ 2 * gradB / (q * B ^ 2) := by
    rw [hcurv, hκ]
    field_simp [hB, hq]
  refine ⟨hvG, hvC, ?_⟩
  rw [hvG, hvC]
  field_simp [hB, hq]
  ring

/-- Curvature without the low-β identification is not this sum. The mass is nonzero. -/
theorem high_beta_not_vacuum (m vPerp vPar B q gradB κ : ℝ)
    (hm : m ≠ 0) (hB : B ≠ 0) (hq : q ≠ 0) (hκ : κ ≠ gradB / B) (hv : vPar ≠ 0) :
    m * vPar ^ 2 * κ / (q * B) ≠ m * vPar ^ 2 * gradB / (q * B ^ 2) := by
  intro hEq
  have hscaled := congrArg (fun z => z * (q * B ^ 2)) hEq
  have hclear : m * vPar ^ 2 * κ * B = m * vPar ^ 2 * gradB := by
    convert hscaled using 1 <;> field_simp [hq, hB]
  apply hκ
  rw [eq_div_iff hB]
  apply mul_left_cancel₀ (mul_ne_zero hm (pow_ne_zero 2 hv))
  have hassoc : m * vPar ^ 2 * κ * B = m * vPar ^ 2 * (κ * B) := by ring
  rw [← hassoc]
  exact hclear

end PhysJS.GradBDrift
