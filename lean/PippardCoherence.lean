/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-184`. Bridge. Pippard coherence length.

The catalog equation is

```
1/ξ = 1/ξ₀ + 1/(α ℓ)
```

`ξ₀ = ℏ v_F / (π Δ)` is the clean BCS coherence length and `ℓ = v_F τ` the
mean free path (`be-182`). `pippard_eq` derives the harmonic sum from one
hypothesis: the energy scale `ℏ v_F / ξ` that sets the pair size is the sum of
the clean gap scale `π Δ` and an impurity-broadening scale `ℏ / (α τ)`.
Dividing by `ℏ v_F` and using `ℓ = v_F τ` gives the sum of inverse lengths.

The numerical constant `α` is convention-dependent (it depends on the
reference and on how the scattering time is defined) and is taken as a
positive hypothesis, not derived. The additivity of the two energy scales is
the physical premise, not a theorem here; BCS theory and the nonlocal kernel
are not proved. `ξ` is then `ξ₀ α ℓ / (ξ₀ + α ℓ)`; `coherence_le` gives the
clean and dirty bounds, and `sum_of_lengths_not_pippard` separates the
arithmetic sum from the harmonic one.
-/

namespace PhysJS.PippardCoherence

/-- Pippard harmonic sum from additive energy scales.

`hξ0` is `ξ₀ = ℏ v_F / (π Δ)`. `hℓ` is `ℓ = v_F τ`. `hscale` is
`ℏ v_F / ξ = π Δ + ℏ / (α τ)`. `π` is passed as a positive real `p` so that
the statement does not depend on its value.

Kind `bridge` on `PhysJS.PippardCoherence.pippard_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. `α` is a
convention-dependent hypothesis; not a derivation of BCS `ξ₀`. -/
theorem pippard_eq (ξ ξ0 ℓ ħ vF τ Δ p α : ℝ)
    (hħ : 0 < ħ) (hv : 0 < vF) (hτ : 0 < τ) (hΔ : 0 < Δ) (hp : 0 < p) (hα : 0 < α)
    (hξ : 0 < ξ)
    (hξ0 : ξ0 = ħ * vF / (p * Δ))
    (hℓ : ℓ = vF * τ)
    (hscale : ħ * vF / ξ = p * Δ + ħ / (α * τ)) :
    1 / ξ = 1 / ξ0 + 1 / (α * ℓ) := by
  have h1 : 1 / ξ0 = p * Δ / (ħ * vF) := by
    rw [hξ0]; field_simp
  have h2 : 1 / (α * ℓ) = (ħ / (α * τ)) / (ħ * vF) := by
    rw [hℓ]; field_simp
  have h3 : 1 / ξ = (ħ * vF / ξ) / (ħ * vF) := by
    field_simp
  rw [h3, hscale, h1, h2]
  ring

/-- Closed form `ξ = ξ₀ α ℓ / (ξ₀ + α ℓ)`. -/
theorem pippard_closed (ξ ξ0 ℓ α : ℝ) (hξ : 0 < ξ) (hξ0 : 0 < ξ0) (hℓ : 0 < ℓ) (hα : 0 < α)
    (h : 1 / ξ = 1 / ξ0 + 1 / (α * ℓ)) :
    ξ = ξ0 * (α * ℓ) / (ξ0 + α * ℓ) := by
  have hαℓ : 0 < α * ℓ := mul_pos hα hℓ
  field_simp at h
  field_simp
  nlinarith [h]

/-- The coherence length is shorter than both the clean length and `α ℓ`. -/
theorem coherence_le (ξ ξ0 ℓ α : ℝ) (hξ : 0 < ξ) (hξ0 : 0 < ξ0) (hℓ : 0 < ℓ) (hα : 0 < α)
    (h : 1 / ξ = 1 / ξ0 + 1 / (α * ℓ)) :
    ξ ≤ ξ0 ∧ ξ ≤ α * ℓ := by
  have hαℓ : 0 < α * ℓ := mul_pos hα hℓ
  have a1 : 0 < 1 / ξ0 := by positivity
  have a2 : 0 < 1 / (α * ℓ) := by positivity
  constructor
  · have : 1 / ξ0 ≤ 1 / ξ := by linarith
    exact (one_div_le_one_div hξ0 hξ).1 this
  · have : 1 / (α * ℓ) ≤ 1 / ξ := by linarith
    exact (one_div_le_one_div hαℓ hξ).1 this

/-- The arithmetic sum of the two lengths is not the Pippard length. -/
theorem sum_of_lengths_not_pippard (ξ0 ℓ α : ℝ) (hξ0 : 0 < ξ0) (hℓ : 0 < ℓ) (hα : 0 < α) :
    ξ0 + α * ℓ ≠ ξ0 * (α * ℓ) / (ξ0 + α * ℓ) := by
  intro h
  have hαℓ : 0 < α * ℓ := mul_pos hα hℓ
  have hs : 0 < ξ0 + α * ℓ := by linarith
  rw [eq_div_iff hs.ne'] at h
  nlinarith [mul_pos hξ0 hαℓ, sq_nonneg ξ0, sq_nonneg (α * ℓ)]

end PhysJS.PippardCoherence
