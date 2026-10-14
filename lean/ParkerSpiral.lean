/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-119`. Bridge. The Parker spiral.

Proved under these hypotheses. The radial wind speed `v_r` is steady.
Ideal induction in the rotating frame, written here as the azimuthal
lag `dφ/dr = −Ω / v_r`, freezes the footpoint. A divergenceless field
in spherical coordinates gives the ratio of the azimuthal and radial
components as `B_φ / B_r = r sin θ · dφ/dr`. Therefore
`B_φ / B_r = −Ω r sin θ / v_r`. The solar-wind acceleration profile is
not derived in this file.
-/

namespace PhysJS.ParkerSpiral

/-- Azimuthal-to-radial field ratio on the Parker spiral.

`hlag` is the ideal footpoint lag. `hdiv` is the divergenceless ratio
`B_φ / B_r = r sin θ · dφ/dr`. -/
theorem spiral_ratio (Bφ Br r sinθ Ω vr dφ : ℝ) (hvr : vr ≠ 0) (_hBr : Br ≠ 0)
    (hlag : dφ = -Ω / vr)
    (hdiv : Bφ / Br = r * sinθ * dφ) :
    Bφ / Br = -(Ω * r * sinθ) / vr := by
  rw [hdiv, hlag]
  field_simp [hvr]

/-- The sign is the sense of rotation. Dropping it is a different spiral. -/
theorem sign_not_dropped (Ω r sinθ vr : ℝ) (hΩ : Ω ≠ 0) (hr : r ≠ 0) (hθ : sinθ ≠ 0)
    (hvr : vr ≠ 0) :
    Ω * r * sinθ / vr ≠ -(Ω * r * sinθ) / vr := by
  intro hEq
  field_simp [hΩ, hr, hθ, hvr] at hEq
  linarith

end PhysJS.ParkerSpiral
