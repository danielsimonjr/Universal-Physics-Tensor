/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Inequalities
import lean.PlaneWave

/-!
`ab-telegraph-diffusion`. Covers `bound.delta` exactly, at the dispersion relation.

A Fourier mode of `τ u_tt + u_t = D u_xx` decays, on the slow branch, at
`(1 - √(1 - 4ε)) / (2ε)` times the diffusion rate `D q²`, with `ε = τ D q²`.
That ratio is `2 / (1 + √(1 - 4ε))`, including the limit `1` at `ε = 0`.
UPT's `telegraphSlowRateRatio - 1` is the relative error. It increases with
`ε` on `0 ≤ ε ≤ 0.05`, so the edge value is the supremum `bound.delta`.

`covers_bound_delta` does not derive the dispersion relation from the PDE.
`planeWave_iff_dispersion` does, for a decay mode that is not identically
zero: `τ u_tt + u_t = D u_xx` holds if and only if `τ σ² + σ + D q² = 0`, and
Fick's equation `u_t = D u_xx` holds if and only if `σ = −D q²`. It covers
that statement only. The slow-rate approximation is still `covers_bound_delta`.
-/

namespace PhysJS.TelegraphDiffusion

open Real PhysJS

/-- Regime edge `ε = τ D q² ≤ 0.05`. -/
noncomputable def regimeEdge : ℝ := 1 / 20

/-- Slow-rate ratio `2 / (1 + √(1 - 4ε))`, the continuous form of
`(1 - √(1 - 4ε)) / (2ε)`. -/
noncomputable def telegraphSlowRateRatio (ε : ℝ) : ℝ :=
  2 / (1 + sqrt (1 - 4 * ε))

/-- Relative error of the slow decay rate. -/
noncomputable def telegraphDiffusionError (ε : ℝ) : ℝ :=
  telegraphSlowRateRatio ε - 1

/-- `bound.delta`: the error at the regime edge. -/
noncomputable def delta : ℝ := telegraphDiffusionError regimeEdge

theorem telegraphSlowRateRatio_eq {ε : ℝ} (hε : 0 < ε) (hdisc : 4 * ε ≤ 1) :
    telegraphSlowRateRatio ε = (1 - sqrt (1 - 4 * ε)) / (2 * ε) := by
  set s := sqrt (1 - 4 * ε)
  have hs0 : 0 ≤ 1 - 4 * ε := by linarith
  have hs_sq : s ^ 2 = 1 - 4 * ε := sq_sqrt hs0
  have hfac : (1 - s) * (1 + s) = 4 * ε := by nlinarith [hs_sq]
  have hden : 1 + s ≠ 0 := by
    have : 0 ≤ s := sqrt_nonneg _
    linarith
  have hε2 : 2 * ε ≠ 0 := by linarith
  unfold telegraphSlowRateRatio
  symm
  rw [div_eq_div_iff hε2 hden]
  nlinarith [hfac]

theorem telegraphDiffusionError_eq {ε : ℝ} (hε : 0 < ε) (hdisc : 4 * ε ≤ 1) :
    telegraphDiffusionError ε = (1 - sqrt (1 - 4 * ε)) / (1 + sqrt (1 - 4 * ε)) := by
  set s := sqrt (1 - 4 * ε)
  have hs0 : 0 ≤ s := sqrt_nonneg _
  have hden : 1 + s ≠ 0 := by linarith
  have hratio : telegraphSlowRateRatio ε = 2 / (1 + s) := by simp [telegraphSlowRateRatio, s]
  have hsub : 2 / (1 + s) - 1 = (1 - s) / (1 + s) := by
    calc
      2 / (1 + s) - 1 = 2 / (1 + s) - (1 + s) / (1 + s) := by rw [div_self hden]
      _ = (2 - (1 + s)) / (1 + s) := by rw [div_sub_div_same]
      _ = (1 - s) / (1 + s) := by ring
  simp only [telegraphDiffusionError, hratio, hsub]

theorem telegraphDiffusionError_monotone {ε η : ℝ} (hε : 0 ≤ ε) (hη : η ≤ 1 / 4)
    (h : ε ≤ η) : telegraphDiffusionError ε ≤ telegraphDiffusionError η := by
  have hε4 : 4 * ε ≤ 1 := by linarith
  have hη4 : 0 ≤ 1 - 4 * η := by linarith
  have hs : sqrt (1 - 4 * η) ≤ sqrt (1 - 4 * ε) := by
    apply sqrt_le_sqrt
    linarith
  have hεs : 0 ≤ sqrt (1 - 4 * ε) := sqrt_nonneg _
  have hηs : 0 ≤ sqrt (1 - 4 * η) := sqrt_nonneg _
  have herr : telegraphDiffusionError ε = (1 - sqrt (1 - 4 * ε)) / (1 + sqrt (1 - 4 * ε)) := by
    by_cases h0 : ε = 0
    · simp [telegraphDiffusionError, telegraphSlowRateRatio, h0, sqrt_one]; norm_num
    · have hεpos : 0 < ε := lt_of_le_of_ne hε (Ne.symm h0)
      exact telegraphDiffusionError_eq hεpos hε4
  have herr' : telegraphDiffusionError η = (1 - sqrt (1 - 4 * η)) / (1 + sqrt (1 - 4 * η)) := by
    by_cases h0 : η = 0
    · have : ε = 0 := by linarith
      simp [telegraphDiffusionError, telegraphSlowRateRatio, h0, sqrt_one]; norm_num
    · have hηpos : 0 < η := lt_of_le_of_ne (hε.trans h) (Ne.symm h0)
      have : 4 * η ≤ 1 := by linarith
      exact telegraphDiffusionError_eq hηpos this
  rw [herr, herr']
  exact div_one_sub_antitone hηs hεs hs

/-- The error is monotone on `0 ≤ ε ≤ 1/20`, and its edge value is `delta`.

Covers `bound.delta` of `ab-telegraph-diffusion` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ ε η : ℝ, 0 ≤ ε → ε ≤ η → η ≤ regimeEdge →
      telegraphDiffusionError ε ≤ telegraphDiffusionError η) ∧
    telegraphDiffusionError regimeEdge = delta ∧
    telegraphSlowRateRatio regimeEdge =
      (1 - sqrt (1 - 4 * regimeEdge)) / (2 * regimeEdge) := by
  refine ⟨?_, rfl, ?_⟩
  · intro ε η hε hεη hη
    have hbound : η ≤ 1 / 4 := by
      have : regimeEdge ≤ 1 / 4 := by norm_num [regimeEdge]
      linarith
    exact telegraphDiffusionError_monotone hε hbound hεη
  · exact telegraphSlowRateRatio_eq (by norm_num [regimeEdge]) (by norm_num [regimeEdge])

/-- The wave-frequency dictionary is not real at `ε = 0.05`: `1 - 1/(4ε) < 0`.
Lean's `sqrt` of that negative number is `0`, so the wrong error is `1`,
which is not the diffusion error. -/
theorem wrong_dictionary :
    1 - 1 / (4 * regimeEdge) < 0 ∧
      1 - sqrt (1 - 1 / (4 * regimeEdge)) ≠ telegraphDiffusionError regimeEdge := by
  have hneg : 1 - 1 / (4 * regimeEdge) < 0 := by norm_num [regimeEdge]
  refine ⟨hneg, ?_⟩
  intro h
  have hsqrt : sqrt (1 - 1 / (4 * regimeEdge)) = 0 := sqrt_eq_zero_of_nonpos hneg.le
  rw [hsqrt] at h
  have hleft : (1 : ℝ) = telegraphDiffusionError regimeEdge := by
    norm_num at h
    exact h
  have herr : telegraphDiffusionError regimeEdge =
      (1 - sqrt (1 - 4 * regimeEdge)) / (1 + sqrt (1 - 4 * regimeEdge)) :=
    telegraphDiffusionError_eq (by norm_num [regimeEdge]) (by norm_num [regimeEdge])
  have hspos : 0 < sqrt (1 - 4 * regimeEdge) := by
    rw [sqrt_pos]
    norm_num [regimeEdge]
  rw [herr] at hleft
  have hden : 1 + sqrt (1 - 4 * regimeEdge) ≠ 0 := by linarith
  have : (1 : ℝ) * (1 + sqrt (1 - 4 * regimeEdge)) =
      1 - sqrt (1 - 4 * regimeEdge) := by
    have := congrArg (· * (1 + sqrt (1 - 4 * regimeEdge))) hleft
    simpa [hden] using this
  linarith

open PhysJS.PlaneWave

/-- A non-trivial decay mode `A exp(σ t) cos(qx + φ)` solves the telegraph
equation if and only if `τ σ² + σ + D q² = 0`, and a non-trivial decay mode
solves Fick's equation if and only if `σ = −D q²`.

Covers the rank-1a transformation of `ab-telegraph-diffusion`. It does not
prove `covers_bound_delta`. -/
theorem planeWave_iff_dispersion
    (A σ q φ τ D : ℝ) (Af σf qf φf Df : ℝ)
    (hnt : ∃ x t, decayMode A σ q φ x t ≠ 0)
    (hntf : ∃ x t, decayMode Af σf qf φf x t ≠ 0) :
    ((∀ x t, τ * timeSecond (decayMode A σ q φ) x t + timeFirst (decayMode A σ q φ) x t =
        D * spaceSecond (decayMode A σ q φ) x t) ↔
      τ * σ ^ 2 + σ + D * q ^ 2 = 0) ∧
    ((∀ x t, timeFirst (decayMode Af σf qf φf) x t =
        Df * spaceSecond (decayMode Af σf qf φf) x t) ↔
      σf = -Df * qf ^ 2) :=
  ⟨telegraph_decay_solves_iff A σ q φ τ D hnt, fick_solves_iff Af σf qf φf Df hntf⟩

/-- The telegraph quadratic is not the Fick factor when `τ σ² ≠ 0`. -/
theorem planeWave_wrong_dictionary (τ σ D q : ℝ) (hτσ : τ * σ ^ 2 ≠ 0) :
    τ * σ ^ 2 + σ + D * q ^ 2 ≠ σ + D * q ^ 2 := by
  intro h
  have : τ * σ ^ 2 = 0 := by linarith
  exact hτσ this

end PhysJS.TelegraphDiffusion
