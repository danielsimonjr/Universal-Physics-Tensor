/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Inequalities
import lean.PlaneWave

/-!
`ab-klein-gordon-wave`. Bridge. Covers `bound.delta` exactly, at the dispersion relation.

`ab-klein-gordon-wave.planeWave`. Derivation step. `planeWave_iff_dispersion`.

`ω(k) = √(c²k² + ω₀²)` against the dispersion-free speed `ck`. The relative
phase-velocity error is `√(1 + r²) - 1` with `r = ω₀/(ck)`. UPT's
`kleinGordonPhaseError` is this quantity. It increases with `r`, and the
regime is `r ≤ 1/10`, so the edge value is the supremum `bound.delta`.

`covers_bound_delta` does not derive the dispersion relation from the PDE.
`planeWave_iff_dispersion` does: a non-trivial plane wave solves
`u_tt = c² u_xx − ω₀² u` if and only if `ω² = c² k² + ω₀²`, and a non-trivial
plane wave solves `u_tt = c² u_xx` if and only if `ω² = c² k²`. That is the
rank-1a transformation. It covers that statement only.
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

open PhysJS.PlaneWave

/-- A non-trivial plane wave solves the Klein–Gordon equation if and only if
`ω² = c² k² + ω₀²`, and a non-trivial plane wave solves the wave equation at
the same `c` if and only if `ω² = c² k²`.

Covers the rank-1a transformation of `ab-klein-gordon-wave`. It does not prove
`covers_bound_delta`. -/
theorem planeWave_iff_dispersion (A k ω φ c ω0 : ℝ) (Aw kw ωw φw : ℝ)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0)
    (hntw : ∃ x t, planeWave Aw kw ωw φw x t ≠ 0) :
    ((∀ x t, timeSecond (planeWave A k ω φ) x t =
        c ^ 2 * spaceSecond (planeWave A k ω φ) x t
          - ω0 ^ 2 * planeWave A k ω φ x t) ↔
      ω ^ 2 = c ^ 2 * k ^ 2 + ω0 ^ 2) ∧
    ((∀ x t, timeSecond (planeWave Aw kw ωw φw) x t =
        c ^ 2 * spaceSecond (planeWave Aw kw ωw φw) x t) ↔
      ωw ^ 2 = c ^ 2 * kw ^ 2) :=
  ⟨kg_solves_iff A k ω φ c ω0 hnt, wave_solves_iff Aw kw ωw φw (c ^ 2) hntw⟩

/-- Dropping `ω₀²` changes the dispersion relation when `ω₀ ≠ 0`. -/
theorem planeWave_wrong_dictionary (c k ω0 : ℝ) (hω0 : ω0 ≠ 0) :
    c ^ 2 * k ^ 2 + ω0 ^ 2 ≠ c ^ 2 * k ^ 2 := by
  intro h
  have : ω0 ^ 2 = 0 := by linarith
  exact hω0 (sq_eq_zero_iff.mp this)

end PhysJS.KleinGordonWave
