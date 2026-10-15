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
`be-121`. Bridge. Lawson breakeven for a 50–50 deuterium–tritium plasma.

Proved under these hypotheses. Both species are Maxwellian at the same
temperature, with `n_e = n_i = n`, and bremsstrahlung is neglected.
The reactivity is the Maxwellian rate coefficient `⟨σv⟩`. A 50–50 mix
makes the reaction rate `n² ⟨σv⟩ / 4`. The thermal energy of electrons
and ions together is `3 n k_B T`. Breakeven equates the fusion power
to that energy over the confinement time `τ`:

```
(n² ⟨σv⟩ / 4) E = 3 n k_B T / τ
```

Hence `n τ = 12 k_B T / (⟨σv⟩ E)`. The `12` is `4 × 3`. Ignition uses
the same `12` with the alpha energy in place of `E`; this file does
not evaluate a triple product. The Maxwellian average itself is not
computed here.
-/

namespace PhysJS.LawsonBreakeven

/-- Breakeven product `n τ` for 50–50 DT.

`hrate` is the fusion power density. `hheat` is the thermal power
density at confinement time `τ`. `hbalance` is breakeven. -/
theorem breakeven_eq (n τ σv E kT power heat : ℝ)
    (hn : n ≠ 0) (hσ : σv ≠ 0) (hE : E ≠ 0) (hτ : τ ≠ 0)
    (hrate : power = n ^ 2 * σv / 4 * E)
    (hheat : heat = 3 * n * kT / τ)
    (hbalance : power = heat) :
    n * τ = 12 * kT / (σv * E) := by
  have h := hbalance
  rw [hrate, hheat] at h
  have h1 : n ^ 2 * σv * E * τ = 12 * n * kT := by
    have hscaled := congrArg (fun z => z * (4 * τ)) h
    have hl : n ^ 2 * σv / 4 * E * (4 * τ) = n ^ 2 * σv * E * τ := by field_simp [hτ]
    have hr : 3 * n * kT / τ * (4 * τ) = 12 * n * kT := by
      field_simp [hτ]
      ring
    rw [← hl, ← hr]
    exact hscaled
  rw [eq_div_iff (mul_ne_zero hσ hE)]
  apply mul_left_cancel₀ hn
  calc
    n * (n * τ * (σv * E)) = n ^ 2 * σv * E * τ := by ring
    _ = 12 * n * kT := h1
    _ = n * (12 * kT) := by ring

/-- The `12` is four times the three degrees of freedom, not either factor alone. -/
theorem factors_not_separate (kT σv E : ℝ) (hσ : σv ≠ 0) (hE : E ≠ 0) (hk : kT ≠ 0) :
    4 * kT / (σv * E) ≠ 12 * kT / (σv * E) ∧ 3 * kT / (σv * E) ≠ 12 * kT / (σv * E) := by
  have hc : ∀ a : ℝ, a / (σv * E) * (σv * E) = a := by
    intro a
    field_simp [hσ, hE]
  constructor
  · intro hEq
    have hmul := congrArg (fun z => z * (σv * E)) hEq
    rw [hc, hc] at hmul
    have : (4 : ℝ) = 12 := by
      apply mul_right_cancel₀ hk
      linarith
    norm_num at this
  · intro hEq
    have hmul := congrArg (fun z => z * (σv * E)) hEq
    rw [hc, hc] at hmul
    have : (3 : ℝ) = 12 := by
      apply mul_right_cancel₀ hk
      linarith
    norm_num at this

end PhysJS.LawsonBreakeven
