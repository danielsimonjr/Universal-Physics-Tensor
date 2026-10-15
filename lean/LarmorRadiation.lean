/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.MeasureTheory.Integral.IntervalIntegral.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-201`. Bridge. Larmor radiated power.

The catalog equation is

```
P = q² a² / (6 π ε0 c³)
```

Proved under these hypotheses. A non-relativistic point charge `q` with
acceleration `a` has the far-zone radiation field
`E(θ) = q a sin θ / (4π ε0 c² r)`, with `θ` the angle from the
acceleration. The radiative Poynting flux is `S = ε0 c E²` (since
`B = E/c`). The total power is the flux through a sphere of radius `r`,
`P = ∫₀^π S(θ) 2π r² sin θ dθ`. `sin_cubed` is `∫₀^π sin³ = 4/3`;
`larmor_eq` then gives the displayed power and the radius `r` cancels.
`cyclotron_power` substitutes the gyration acceleration `a = ω_c v_⊥` with
`ω_c = q B / m`.

Not proved: the radiation field `E(θ)` itself (it is a premise, the
`1/r` part of the retarded field), the non-relativistic limit
`v ≪ c`, or radiation reaction. `coefficient_not_fixed` shows units leave
`1/(6π)` free.
-/

namespace PhysJS.LarmorRadiation

open intervalIntegral

/-- `∫₀^π sin³ θ dθ = 4/3`. -/
theorem sin_cubed : ∫ x in (0 : ℝ)..Real.pi, Real.sin x ^ 3 = 4 / 3 := by
  have h : ∫ x in (0 : ℝ)..Real.pi, Real.sin x ^ 3 = _ :=
    integral_sin_pow (a := 0) (b := Real.pi) 1
  rw [h]
  simp only [pow_one, integral_sin]
  simp
  norm_num

/-- Larmor power from the far-zone field and Poynting flux. -/
theorem larmor_eq (q a ε0 c r P : ℝ) (E S : ℝ → ℝ)
    (hε : ε0 ≠ 0) (hc : c ≠ 0) (hr : r ≠ 0)
    (hE : ∀ θ, E θ = q * a * Real.sin θ / (4 * Real.pi * ε0 * c ^ 2 * r))
    (hS : ∀ θ, S θ = ε0 * c * (E θ) ^ 2)
    (hP : P = ∫ θ in (0 : ℝ)..Real.pi, S θ * (2 * Real.pi * r ^ 2 * Real.sin θ)) :
    P = q ^ 2 * a ^ 2 / (6 * Real.pi * ε0 * c ^ 3) := by
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  have hfun : (fun θ => S θ * (2 * Real.pi * r ^ 2 * Real.sin θ)) =
      fun θ => (q ^ 2 * a ^ 2 / (8 * Real.pi * ε0 * c ^ 3)) * Real.sin θ ^ 3 := by
    funext θ
    rw [hS θ, hE θ]
    field_simp
    ring
  rw [hP, hfun, intervalIntegral.integral_const_mul, sin_cubed]
  field_simp
  ring

/-- Cyclotron emission by gyration: `a = ω_c v_⊥`, `ω_c = q B / m`. -/
theorem cyclotron_power (q B m vperp ωc a ε0 c P : ℝ)
    (hm : m ≠ 0) (hε : ε0 ≠ 0) (hc : c ≠ 0)
    (hωc : ωc = q * B / m) (ha : a = ωc * vperp)
    (hP : P = q ^ 2 * a ^ 2 / (6 * Real.pi * ε0 * c ^ 3)) :
    P = q ^ 4 * B ^ 2 * vperp ^ 2 / (6 * Real.pi * ε0 * m ^ 2 * c ^ 3) := by
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  rw [hP, ha, hωc]
  field_simp

/-- Units leave the numerical coefficient free: `1/(6π)` and `1/(4π)`
give different powers for a radiating charge. -/
theorem coefficient_not_fixed (q a ε0 c : ℝ) (hq : q ≠ 0) (ha : a ≠ 0)
    (hε : 0 < ε0) (hc : 0 < c) :
    q ^ 2 * a ^ 2 / (6 * Real.pi * ε0 * c ^ 3) ≠
      q ^ 2 * a ^ 2 / (4 * Real.pi * ε0 * c ^ 3) := by
  have hpi : 0 < Real.pi := Real.pi_pos
  have hn : 0 < q ^ 2 * a ^ 2 := by positivity
  have := div_lt_div_of_pos_left hn (by positivity : 0 < 4 * Real.pi * ε0 * c ^ 3)
    (by nlinarith [mul_pos (mul_pos hpi hε) (pow_pos hc 3)] :
      4 * Real.pi * ε0 * c ^ 3 < 6 * Real.pi * ε0 * c ^ 3)
  exact ne_of_lt this

end PhysJS.LarmorRadiation
