/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Inequalities
import lean.PlaneWave

/-!
`ab-telegraph-wave`. Bridge. Covers `bound.delta` exactly, at the dispersion relation.

`ab-telegraph-wave.planeWave`. Derivation step. `planeWave_iff_dispersion`.

On the underdamped branch the oscillation frequency, divided by the undamped
wave frequency `c q` with `c² = D/τ`, is `√(1 - 1/(4ε))` for `ε = τ D q²`.
UPT's error is `1` minus that ratio. The regime is `ε ≥ 25`. The error falls
as `ε` grows, so the value at `ε = 25` is the supremum `bound.delta`.

`covers_bound_delta` does not derive the dispersion relation from the PDE.
`planeWave_iff_dispersion` does. With `τ ≠ 0` and the telegraph decay
`β = 1/(2τ)`, a non-trivial mode `A exp(−β t) cos(ω t − q x + φ)` solves
`τ u_tt + u_t = D u_xx` if and only if `ω² = (D/τ) q² − 1/(4 τ²)`. A
non-trivial plane wave solves the wave equation at speed-squared `D/τ` if and
only if `ω² = (D/τ) q²`. It covers that statement only.
-/

namespace PhysJS.TelegraphWave

open Real

/-- Regime edge `ε = τ D q² ≥ 25`. -/
def regimeEdge : ℝ := 25

/-- Frequency ratio `√(1 - 1/(4ε))`. -/
noncomputable def telegraphWaveFrequencyRatio (ε : ℝ) : ℝ :=
  sqrt (1 - 1 / (4 * ε))

/-- Relative error of the oscillation frequency. -/
noncomputable def telegraphWaveError (ε : ℝ) : ℝ :=
  1 - telegraphWaveFrequencyRatio ε

/-- `bound.delta`: the error at the regime edge. -/
noncomputable def delta : ℝ := telegraphWaveError regimeEdge

theorem telegraphWaveError_antitone {ε η : ℝ} (hε : regimeEdge ≤ ε) (h : ε ≤ η) :
    telegraphWaveError η ≤ telegraphWaveError ε := by
  have hεpos : 0 < ε := by
    have : (0 : ℝ) < regimeEdge := by norm_num [regimeEdge]
    linarith
  have hηpos : 0 < η := by linarith
  have hinv : 1 / (4 * η) ≤ 1 / (4 * ε) := by
    have h4ε : 0 < 4 * ε := by linarith
    have h4 : 4 * ε ≤ 4 * η := by linarith
    simpa [div_div] using one_div_le_one_div_of_le h4ε h4
  have harg : 1 - 1 / (4 * ε) ≤ 1 - 1 / (4 * η) := by linarith
  have harg0 : 0 ≤ 1 - 1 / (4 * ε) := by
    have : 1 / (4 * ε) ≤ 1 / (4 * regimeEdge) := by
      have h4e : 0 < 4 * regimeEdge := by norm_num [regimeEdge]
      have h4 : 4 * regimeEdge ≤ 4 * ε := by linarith
      simpa [div_div] using one_div_le_one_div_of_le h4e h4
    have : 1 / (4 * regimeEdge) ≤ 1 := by norm_num [regimeEdge]
    linarith
  have hsqrt : sqrt (1 - 1 / (4 * ε)) ≤ sqrt (1 - 1 / (4 * η)) := sqrt_le_sqrt harg
  unfold telegraphWaveError telegraphWaveFrequencyRatio
  linarith

/-- The error decreases on `ε ≥ 25`, and its edge value is `delta`.

Covers `bound.delta` of `ab-telegraph-wave` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ ε η : ℝ, regimeEdge ≤ ε → ε ≤ η → telegraphWaveError η ≤ telegraphWaveError ε) ∧
    telegraphWaveError regimeEdge = delta := by
  refine ⟨?_, rfl⟩
  intro ε η hε hεη
  exact telegraphWaveError_antitone hε hεη

/-- The diffusion dictionary is not real at `ε = 25`: `1 - 4ε < 0`.
The slow-rate expression, read with Lean's `sqrt` of a negative, is `1`,
which is not the wave error. -/
theorem wrong_dictionary :
    1 - 4 * regimeEdge < 0 ∧
      2 / (1 + sqrt (1 - 4 * regimeEdge)) - 1 ≠ telegraphWaveError regimeEdge := by
  have hneg : 1 - 4 * regimeEdge < 0 := by norm_num [regimeEdge]
  refine ⟨hneg, ?_⟩
  intro h
  have hsqrt : sqrt (1 - 4 * regimeEdge) = 0 := sqrt_eq_zero_of_nonpos hneg.le
  rw [hsqrt] at h
  have hleft : (1 : ℝ) = telegraphWaveError regimeEdge := by
    norm_num at h
    exact h
  unfold telegraphWaveError telegraphWaveFrequencyRatio at hleft
  have hpos : 0 < sqrt (1 - 1 / (4 * regimeEdge)) := by
    rw [sqrt_pos]
    norm_num [regimeEdge]
  linarith

open PhysJS.PlaneWave

/-- A non-trivial damped oscillation with `β = 1/(2τ)` solves the telegraph
equation if and only if `ω² = (D/τ) q² − 1/(4 τ²)`, and a non-trivial plane
wave solves `u_tt = (D/τ) u_xx` if and only if `ω² = (D/τ) q²`.

Covers the rank-1a transformation of `ab-telegraph-wave`. It does not prove
`covers_bound_delta`. -/
theorem planeWave_iff_dispersion
    (A β ω q φ τ D : ℝ) (Aw qw ωw φw : ℝ)
    (hτ : τ ≠ 0) (hβ : β = 1 / (2 * τ))
    (hnt : ∃ x t, oscMode A β ω q φ x t ≠ 0)
    (hntw : ∃ x t, planeWave Aw qw ωw φw x t ≠ 0) :
    ((∀ x t, τ * timeSecond (oscMode A β ω q φ) x t + timeFirst (oscMode A β ω q φ) x t =
        D * spaceSecond (oscMode A β ω q φ) x t) ↔
      ω ^ 2 = D / τ * q ^ 2 - 1 / (4 * τ ^ 2)) ∧
    ((∀ x t, timeSecond (planeWave Aw qw ωw φw) x t =
        (D / τ) * spaceSecond (planeWave Aw qw ωw φw) x t) ↔
      ωw ^ 2 = D / τ * qw ^ 2) :=
  ⟨telegraph_osc_solves_iff A β ω q φ τ D hτ hβ hnt,
    wave_solves_iff Aw qw ωw φw (D / τ) hntw⟩

/-- The undamped wave dispersion is not the underdamped telegraph dispersion
when `τ ≠ 0`. -/
theorem planeWave_wrong_dictionary (τ D q : ℝ) (hτ : τ ≠ 0) :
    D / τ * q ^ 2 - 1 / (4 * τ ^ 2) ≠ D / τ * q ^ 2 := by
  intro h
  have hzero : 1 / (4 * τ ^ 2) = 0 := by linarith
  have h4 : (4 : ℝ) * τ ^ 2 ≠ 0 := mul_ne_zero (by norm_num) (pow_ne_zero 2 hτ)
  have : (1 : ℝ) = 0 := by
    field_simp [h4] at hzero
    linarith
  exact one_ne_zero this

end PhysJS.TelegraphWave
