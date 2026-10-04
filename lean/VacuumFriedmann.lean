/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Einstein
import Physlib.Cosmology.FLRW.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-20`, the Friedmann corollary only. The density is already
`PhysJS.Einstein.vacuum_density`. There is no `be-20` key.

From `ρ = c² Λ / (8π G)`,

```
(8π G / 3) ρ = Λ c² / 3
```

That is the cosmological term of `FirstOrderFriedmann`. A fluid of this
density, added to a matter density with the explicit `Λ` set to zero, is
that equation at `k = 0`. The Einstein-static density
`ρ = Λ c² / (4π G)`, Physlib's `einsteinStatic_density`, is twice that
term. Dropping `c²` identifies this `Λ` with the `[T⁻²]` symbol of
BE-19. They agree only at `c² = 1`.
-/

namespace PhysJS.Einstein

open Real Time
open Cosmology.FLRW.FriedmannEquation

/-- The vacuum density is the cosmological term, and a fluid of that
density reproduces `FirstOrderFriedmann` at `k = 0`.

Covers the Friedmann corollary of `be-20`. The density is
`vacuum_density` and is not reproved. BE-20 has no reference of its own. -/
theorem friedmann_corollary (g T : M) (a ρmatter : Time → ℝ) (Λ κ G c ρ : ℝ) (t : Time)
    (hg : g ≠ 0) (hG : G ≠ 0) (hc : c ≠ 0) (hκ : κ = kappa G c)
    (hT : T = -(ρ * c ^ 2) • g) (hid : Λ • g = -κ • T)
    (hH : (∂ₜ a t / a t) ^ 2 = (8 * π * G / 3) * (ρmatter t + ρ)) :
    (8 * π * G / 3) * ρ = Λ * c ^ 2 / 3 ∧
      FirstOrderFriedmann a ρmatter 0 Λ G c t := by
  have hρ := vacuum_density g T Λ κ G c ρ hg hG hc hκ hT hid
  refine ⟨?_, ?_⟩
  · rw [hρ]
    field_simp [hG]
  · unfold FirstOrderFriedmann
    rw [hH, hρ]
    field_simp [hG]
    ring

/-- The Einstein-static density is twice the Friedmann term, and dropping
`c²` is not that term when `c² ≠ 1`. -/
theorem wrong_dictionary_static (G c Λ : ℝ) (hG : G ≠ 0) (hc : c ≠ 0) (hΛ : Λ ≠ 0)
    (hc2 : c ^ 2 ≠ 1) :
    (8 * π * G / 3) * (Λ * c ^ 2 / (4 * π * G)) = 2 * (Λ * c ^ 2 / 3) ∧
      (8 * π * G / 3) * (Λ * c ^ 2 / (4 * π * G)) ≠ Λ * c ^ 2 / 3 ∧
      (8 * π * G / 3) * (Λ / (8 * π * G)) ≠ Λ * c ^ 2 / 3 := by
  refine ⟨?_, ?_, ?_⟩
  · field_simp [hG]
    ring
  · intro h
    have htwice : (8 * π * G / 3) * (Λ * c ^ 2 / (4 * π * G)) = 2 * (Λ * c ^ 2 / 3) := by
      field_simp [hG]
      ring
    rw [htwice] at h
    field_simp [hΛ, hc] at h
    linarith
  · intro h
    field_simp [hG, hΛ] at h
    exact hc2 h.symm

end PhysJS.Einstein
