/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Inequalities

/-!
`ab-stiff-string`. Covers `bound.delta` exactly, at the dispersion relation.

The stiff-string frequency satisfies `ω² = (F/μ) k² + (EI/μ) k⁴`. Against the
flexible-string speed `√(F/μ)`, the relative phase-velocity error is
`√(1 + β) - 1` with `β = EI k² / F`. UPT's `stiffStringPhaseError` is this
quantity. It increases with `β`, and the regime is `β ≤ 0.01`, so the edge
value is the supremum `bound.delta`.

This does not derive the dispersion relation from the PDE.
-/

namespace PhysJS.StiffString

open Real

/-- Regime edge `β = EIk²/F ≤ 0.01`. -/
noncomputable def regimeEdge : ℝ := 1 / 100

/-- Relative phase-velocity error `√(1 + β) - 1`. -/
noncomputable def stiffStringPhaseError (β : ℝ) : ℝ := sqrt (1 + β) - 1

/-- `bound.delta`: the error at the regime edge. -/
noncomputable def delta : ℝ := stiffStringPhaseError regimeEdge

theorem stiffStringPhaseError_monotone {β γ : ℝ} (_hβ : -1 ≤ β) (h : β ≤ γ) :
    stiffStringPhaseError β ≤ stiffStringPhaseError γ := by
  unfold stiffStringPhaseError
  have : sqrt (1 + β) ≤ sqrt (1 + γ) := by
    apply sqrt_le_sqrt
    linarith
  linarith

/-- `√(F/μ + (EI/μ) k²) / √(F/μ) - 1 = √(1 + EI k² / F) - 1`. -/
theorem eq_phase_velocity_ratio (F EI μ k : ℝ) (hF : 0 < F) (hμ : 0 < μ) (hEI : 0 ≤ EI)
    (_hk : 0 ≤ k) :
    sqrt (F / μ + EI / μ * k ^ 2) / sqrt (F / μ) - 1 =
      stiffStringPhaseError (EI * k ^ 2 / F) := by
  have hμ0 : μ ≠ 0 := hμ.ne'
  have hF0 : F ≠ 0 := hF.ne'
  have hFμ : 0 < F / μ := div_pos hF hμ
  have hinner : 0 ≤ F / μ + EI / μ * k ^ 2 := by
    have : 0 ≤ EI / μ * k ^ 2 := by
      apply mul_nonneg
      · exact div_nonneg hEI hμ.le
      · exact sq_nonneg k
    linarith
  unfold stiffStringPhaseError
  have hdiv : sqrt (F / μ + EI / μ * k ^ 2) / sqrt (F / μ) =
      sqrt ((F / μ + EI / μ * k ^ 2) / (F / μ)) := by
    symm
    exact sqrt_div hinner (F / μ)
  have harg : (F / μ + EI / μ * k ^ 2) / (F / μ) = 1 + EI * k ^ 2 / F := by
    field_simp [hμ0, hF0]
  rw [hdiv, harg]

/-- The error is monotone on `0 ≤ β ≤ 1/100`, and its edge value is `delta`.

Covers `bound.delta` of `ab-stiff-string` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ β γ : ℝ, 0 ≤ β → β ≤ γ → γ ≤ regimeEdge →
      stiffStringPhaseError β ≤ stiffStringPhaseError γ) ∧
    stiffStringPhaseError regimeEdge = delta := by
  refine ⟨?_, rfl⟩
  intro β γ hβ hγ _he
  exact stiffStringPhaseError_monotone (by linarith) hγ

/-- `√(1 + β²) - 1` is the Klein–Gordon wave dictionary. It is not the
stiff-string error at the regime edge. -/
theorem wrong_dictionary :
    sqrt (1 + regimeEdge ^ 2) - 1 ≠ stiffStringPhaseError regimeEdge := by
  intro h
  have hsq : sqrt (1 + regimeEdge ^ 2) = sqrt (1 + regimeEdge) := by
    unfold stiffStringPhaseError at h
    linarith
  have hleft : 0 ≤ 1 + regimeEdge ^ 2 := by norm_num [regimeEdge]
  have hright : 0 ≤ 1 + regimeEdge := by norm_num [regimeEdge]
  have : 1 + regimeEdge ^ 2 = 1 + regimeEdge := by
    have := congrArg (· ^ 2) hsq
    simpa [sq_sqrt hleft, sq_sqrt hright] using this
  norm_num [regimeEdge] at this

end PhysJS.StiffString
