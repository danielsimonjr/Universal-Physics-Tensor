/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-102`. Bridge. Landauer conductance.

The catalog equation is

```
G = (2 e² / h) Σ_n T_n
```

`conductance_eq` derives it. In one dimension a mode of speed `v` in a
length `L` has density of states `L / (h v)` per spin, and the flux of
that mode is the density times `v / L`. Those factors cancel to `1/h`.
Charge `e` times the bias window `Δμ = e V`, times a spin factor `2`,
times the sum of transmissions, is the current. A spin-resolved factor
`1` is `e²/h`. The quantum Hall conductance is not this row, and neither
is the Landauer erasure energy.
-/

namespace PhysJS.LandauerConductance

/-- One spin-resolved mode: density of states times velocity is `1/h`. -/
theorem channel_rate (L h v : ℝ) (hh : h ≠ 0) (hv : v ≠ 0) (hL : L ≠ 0) :
    (L / (h * v)) * (v / L) = 1 / h := by
  field_simp [hh, hv, hL]

/-- Landauer conductance. `hrate` is `channel_rate`. `hspin` is two spin
states. `hbias` is the window `Δμ = e V`. `Tsum` is `Σ_n T_n`.

Kind `bridge` on `PhysJS.LandauerConductance.conductance_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not the Hall conductance. -/
theorem conductance_eq (G I V e h Tsum Δμ rate spin : ℝ)
    (he : e ≠ 0) (hh : h ≠ 0) (hV : V ≠ 0)
    (hrate : rate = 1 / h)
    (hspin : spin = 2)
    (hI : I = spin * e * Tsum * rate * Δμ)
    (hbias : Δμ = e * V)
    (hG : G = I / V) :
    G = (2 * e ^ 2 / h) * Tsum := by
  rw [hG, hI, hbias, hrate, hspin]
  field_simp [he, hh, hV]

/-- One spin is `e²/h`, not `2 e²/h`. -/
theorem spin_resolved_not_two (e h Tsum : ℝ) (he : e ≠ 0) (hh : h ≠ 0) (hT : Tsum ≠ 0) :
    (1 * e ^ 2 / h) * Tsum ≠ (2 * e ^ 2 / h) * Tsum := by
  intro hEq
  have hfac : e ^ 2 / h * Tsum ≠ 0 :=
    mul_ne_zero (div_ne_zero (pow_ne_zero 2 he) hh) hT
  have : (1 : ℝ) = 2 := by
    apply mul_left_cancel₀ hfac
    calc
      (e ^ 2 / h) * Tsum * 1 = (1 * e ^ 2 / h) * Tsum := by ring
      _ = (2 * e ^ 2 / h) * Tsum := hEq
      _ = (e ^ 2 / h) * Tsum * 2 := by ring
  norm_num at this

end PhysJS.LandauerConductance
