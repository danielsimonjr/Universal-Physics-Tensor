/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-110`. Bridge. The magnetic-mirror loss cone.

Proved under these hypotheses. The magnetic moment
`μ = m v_⊥² / (2 B)` and the kinetic energy are constant along a field
line. The loss-cone boundary is the pitch, at the minimum field `B₀`,
whose parallel speed vanishes at the mirror field `B_m`. Then
`sin² θ_lc = B₀ / B_m`. With the mirror ratio `R_m = B_m / B₀` this is
`1 / R_m`. The factor `2` in the kinetic energy cancels and is not a
separate bridge. Pitch-angle scattering is not this statement.
-/

namespace PhysJS.LossCone

/-- Loss-cone pitch at the field minimum.

`hμ` is magnetic-moment conservation between the minimum and the
mirror. `henergy` is energy conservation. `hmirror` says the parallel
speed is zero at `B_m`, so the whole speed there is perpendicular.
`hpitch` is `sin² θ = v_⊥² / v²` at the minimum. -/
theorem loss_cone_eq (m v vPerp0 vPerpM B0 Bm sin2 Rm μ0 μM energy0 energyM : ℝ)
    (hm : m ≠ 0) (hv : v ≠ 0) (hB0 : B0 ≠ 0) (hBm : Bm ≠ 0)
    (hμ0 : μ0 = m * vPerp0 ^ 2 / (2 * B0))
    (hμM : μM = m * vPerpM ^ 2 / (2 * Bm))
    (hμ : μ0 = μM)
    (hE0 : energy0 = m * v ^ 2 / 2)
    (hEM : energyM = m * vPerpM ^ 2 / 2)
    (henergy : energy0 = energyM)
    (hpitch : sin2 = vPerp0 ^ 2 / v ^ 2)
    (hR : Rm = Bm / B0) :
    sin2 = B0 / Bm ∧ sin2 = 1 / Rm := by
  have hv2 : vPerpM ^ 2 = v ^ 2 := by
    have h := henergy
    rw [hE0, hEM] at h
    have hmul : m * vPerpM ^ 2 = (m * v ^ 2 / 2) * 2 :=
      (div_eq_iff (by norm_num : (2 : ℝ) ≠ 0)).mp h.symm
    have hc : (m * v ^ 2 / 2) * 2 = m * v ^ 2 := by field_simp
    exact mul_left_cancel₀ hm (hmul.trans hc)
  have hmom : vPerp0 ^ 2 / B0 = vPerpM ^ 2 / Bm := by
    have h := hμ
    rw [hμ0, hμM] at h
    have hscaled := congrArg (fun z => z * (2 * B0 * Bm)) h
    have hclear : m * vPerp0 ^ 2 * Bm = m * vPerpM ^ 2 * B0 := by
      convert hscaled using 1 <;> field_simp [hB0, hBm]
    have hcancel : vPerp0 ^ 2 * Bm = vPerpM ^ 2 * B0 := by
      apply mul_left_cancel₀ hm
      calc
        m * (vPerp0 ^ 2 * Bm) = m * vPerp0 ^ 2 * Bm := by ring
        _ = m * vPerpM ^ 2 * B0 := hclear
        _ = m * (vPerpM ^ 2 * B0) := by ring
    have hdiv := congrArg (fun z => z / (B0 * Bm)) hcancel
    convert hdiv using 1 <;> field_simp [hB0, hBm]
  have hsin : sin2 = B0 / Bm := by
    have hvM : vPerpM ^ 2 ≠ 0 := by
      rw [hv2]
      exact pow_ne_zero 2 hv
    rw [hpitch, ← hv2]
    have hdiv : vPerp0 ^ 2 / vPerpM ^ 2 = (vPerp0 ^ 2 / B0) * (B0 / vPerpM ^ 2) := by
      field_simp [hB0, hvM]
    have hvM0 : vPerpM ≠ 0 := by
      intro hz
      exact hvM (by simp [hz])
    rw [hdiv, hmom]
    field_simp [hBm, hvM0]
  refine ⟨hsin, ?_⟩
  rw [hsin, hR]
  field_simp [hB0, hBm]

/-- A factor other than `1` is a different pitch. -/
theorem coefficient_not_fixed (B0 Bm C : ℝ) (hB0 : B0 ≠ 0) (hBm : Bm ≠ 0) (hC : C ≠ 1) :
    C * (B0 / Bm) ≠ B0 / Bm := by
  have hden : B0 / Bm ≠ 0 := div_ne_zero hB0 hBm
  intro hEq
  field_simp [hden] at hEq
  exact hC hEq

end PhysJS.LossCone
