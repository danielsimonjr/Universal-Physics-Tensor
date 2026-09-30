/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Inequalities

/-!
`ab-klein-gordon-wave`. Covers `bound.delta` exactly, at the dispersion relation.

`ω(k) = √(c²k² + ω₀²)` against the dispersion-free speed `ck`. The relative
phase-velocity error is `√(1 + r²) - 1` with `r = ω₀/(ck)`. UPT's
`kleinGordonPhaseError` is this quantity. It increases with `r`, and the
regime is `r ≤ 1/10`, so the edge value is the supremum `bound.delta`.

This does not derive the dispersion relation from the PDE.
-/

namespace PhysJS.KleinGordonWave

open Real

/-- Regime edge `ω₀/(ck) ≤ 0.1`. -/
noncomputable def regimeEdge : ℝ := 1 / 10

/-- Relative phase-velocity error `√(1 + r²) - 1`. -/
noncomputable def kleinGordonPhaseError (r : ℝ) : ℝ := sqrt (1 + r ^ 2) - 1

/-- `bound.delta`: the error at the regime edge. -/
noncomputable def delta : ℝ := kleinGordonPhaseError regimeEdge

theorem kleinGordonPhaseError_monotone {r s : ℝ} (hr : 0 ≤ r) (hrs : r ≤ s) :
    kleinGordonPhaseError r ≤ kleinGordonPhaseError s := by
  unfold kleinGordonPhaseError
  have : r ^ 2 ≤ s ^ 2 := pow_le_pow_left₀ hr hrs 2
  have : sqrt (1 + r ^ 2) ≤ sqrt (1 + s ^ 2) := by
    apply sqrt_le_sqrt
    linarith
  linarith

/-- The phase velocity is `√(c²k² + ω₀²) / k`, and dividing by `c` leaves
`√(1 + (ω₀/(ck))²)`. -/
theorem eq_phase_velocity_ratio (ω0 c k : ℝ) (hc : 0 < c) (hk : 0 < k) :
    sqrt (c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k) - 1 =
      kleinGordonPhaseError (ω0 / (c * k)) := by
  have hck : 0 < c * k := mul_pos hc hk
  have hck0 : 0 ≤ c * k := hck.le
  have hsq : 0 ≤ c ^ 2 * k ^ 2 + ω0 ^ 2 := by nlinarith [sq_nonneg ω0, sq_nonneg c, sq_nonneg k]
  unfold kleinGordonPhaseError
  have hdiv : sqrt (c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k) =
      sqrt ((c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k) ^ 2) := by
    have hsqden : sqrt ((c * k) ^ 2) = c * k := sqrt_sq hck0
    calc
      sqrt (c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k)
          = sqrt (c ^ 2 * k ^ 2 + ω0 ^ 2) / sqrt ((c * k) ^ 2) := by rw [hsqden]
      _ = sqrt ((c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k) ^ 2) := by
        symm
        exact sqrt_div hsq ((c * k) ^ 2)
  have harg : (c ^ 2 * k ^ 2 + ω0 ^ 2) / (c * k) ^ 2 =
      1 + (ω0 / (c * k)) ^ 2 := by
    field_simp [hck.ne']
  rw [hdiv, harg]

/-- The error is monotone on `0 ≤ r ≤ 1/10`, and its edge value is `delta`.

Covers `bound.delta` of `ab-klein-gordon-wave` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ r s : ℝ, 0 ≤ r → r ≤ s → s ≤ regimeEdge →
      kleinGordonPhaseError r ≤ kleinGordonPhaseError s) ∧
    kleinGordonPhaseError regimeEdge = delta := by
  refine ⟨?_, rfl⟩
  intro r s hr hrs _hs
  exact kleinGordonPhaseError_monotone hr hrs

/-- `√(1 + r) - 1` is the stiff-string dictionary (`β` in place of `r²`).
The two disagree at the regime edge. -/
theorem wrong_dictionary :
    sqrt (1 + regimeEdge) - 1 ≠ kleinGordonPhaseError regimeEdge := by
  intro h
  have hsq : sqrt (1 + regimeEdge) = sqrt (1 + regimeEdge ^ 2) := by
    unfold kleinGordonPhaseError at h
    linarith
  have hleft : 0 ≤ 1 + regimeEdge := by norm_num [regimeEdge]
  have hright : 0 ≤ 1 + regimeEdge ^ 2 := by norm_num [regimeEdge]
  have : 1 + regimeEdge = 1 + regimeEdge ^ 2 := by
    have := congrArg (· ^ 2) hsq
    simpa [sq_sqrt hleft, sq_sqrt hright] using this
  norm_num [regimeEdge] at this

end PhysJS.KleinGordonWave
