/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Deriv
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-194`. Bridge. Sedov-Taylor blast radius, dimensional exponents.

The catalog equation is

```
R = ξ(γ) (E t² / ρ)^(1/5)
```

Proved under these hypotheses. A strong point explosion in a uniform
medium has no length scale other than the one built from the energy `E`,
the ambient density `ρ` and the time `t`, so the front radius is
`R = ξ E^a t^b ρ^c` with a dimensionless constant `ξ`. Writing the
dimensions `[E] = M L² T⁻²`, `[ρ] = M L⁻³`, `[t] = T`, `[R] = L` gives a
three-by-three linear system in `(a, b, c)`. `exponents_iff` solves it:
the unique solution is `(1/5, 2/5, -1/5)`. `radius_eq` turns that into
`R = ξ (E t²/ρ)^(1/5)`, and `front_speed` is the time derivative
`dR/dt = (2/5) R / t`.

Not proved: the value of `ξ(γ)`. It comes from the energy integral of the
similarity solution (about 1.15 at γ = 5/3) and is a hypothesis here;
`coefficient_not_fixed` shows units leave it free. The premises
(adiabatic, strong shock, negligible ambient pressure, no radiative loss)
are what make the dimensional ansatz valid, and they are not derived.
-/

namespace PhysJS.SedovTaylor

open Real

/-- The dimensional-analysis system. The mass, length and time exponents of
`E^a t^b ρ^c` must equal those of a length `(0, 1, 0)`. -/
theorem exponents_iff (a b c : ℝ) :
    (a + c = 0 ∧ 2 * a - 3 * c = 1 ∧ -2 * a + b = 0) ↔
      (a = 1 / 5 ∧ b = 2 / 5 ∧ c = -(1 / 5)) := by
  constructor
  · rintro ⟨h1, h2, h3⟩
    refine ⟨?_, ?_, ?_⟩ <;> linarith
  · rintro ⟨rfl, rfl, rfl⟩
    refine ⟨?_, ?_, ?_⟩ <;> norm_num

/-- `(E t² / ρ)^(1/5) = E^(1/5) t^(2/5) ρ^(-1/5)` for positive arguments. -/
theorem combo_rpow (E t ρ : ℝ) (hE : 0 < E) (ht : 0 < t) (hρ : 0 < ρ) :
    (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ) =
      E ^ (1 / 5 : ℝ) * t ^ (2 / 5 : ℝ) * ρ ^ (-(1 / 5) : ℝ) := by
  have ht2 : (t ^ 2) ^ (1 / 5 : ℝ) = t ^ (2 / 5 : ℝ) := by
    rw [← Real.rpow_natCast, ← Real.rpow_mul ht.le]
    norm_num
  rw [Real.div_rpow (by positivity) hρ.le, Real.mul_rpow hE.le (by positivity), ht2,
    Real.rpow_neg hρ.le, div_eq_mul_inv]

/-- Sedov-Taylor radius from dimensional analysis. `hdim` is the
mass/length/time exponent balance of `E^a t^b ρ^c` against a length;
`hR` is the power-law ansatz with a dimensionless constant `ξ`. -/
theorem radius_eq (E t ρ ξ a b c R : ℝ)
    (hE : 0 < E) (ht : 0 < t) (hρ : 0 < ρ)
    (hdim : a + c = 0 ∧ 2 * a - 3 * c = 1 ∧ -2 * a + b = 0)
    (hR : R = ξ * (E ^ a * t ^ b * ρ ^ c)) :
    R = ξ * (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ) := by
  obtain ⟨ha, hb, hc⟩ := (exponents_iff a b c).mp hdim
  rw [hR, combo_rpow E t ρ hE ht hρ, ha, hb, hc]

/-- The fifth power of the radius is `ξ⁵ E t² / ρ`. -/
theorem radius_fifth (E t ρ ξ : ℝ) (hE : 0 < E) (ht : 0 < t) (hρ : 0 < ρ) :
    (ξ * (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ)) ^ 5 = ξ ^ 5 * (E * t ^ 2 / ρ) := by
  rw [mul_pow, ← Real.rpow_natCast ((E * t ^ 2 / ρ) ^ (1 / 5 : ℝ)) 5,
    ← Real.rpow_mul (by positivity)]
  norm_num

/-- Front speed: for `R(t) = ξ (E t²/ρ)^(1/5)` the derivative in `t` is
`(2/5) R / t`. -/
theorem front_speed (E ρ ξ t : ℝ) (hE : 0 < E) (ht : 0 < t) (hρ : 0 < ρ) :
    HasDerivAt (fun s : ℝ => ξ * (E * s ^ 2 / ρ) ^ (1 / 5 : ℝ))
      ((2 / 5) * (ξ * (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ)) / t) t := by
  have hfun : (fun s : ℝ => ξ * (E * s ^ 2 / ρ) ^ (1 / 5 : ℝ)) =ᶠ[nhds t]
      fun s : ℝ => (ξ * (E / ρ) ^ (1 / 5 : ℝ)) * s ^ (2 / 5 : ℝ) := by
    filter_upwards [lt_mem_nhds ht] with s hs
    have e1 : E * s ^ 2 / ρ = (E / ρ) * s ^ 2 := by ring
    have hs2 : (s ^ 2) ^ (1 / 5 : ℝ) = s ^ (2 / 5 : ℝ) := by
      rw [← Real.rpow_natCast, ← Real.rpow_mul hs.le]
      norm_num
    simp only [e1]
    rw [Real.mul_rpow (by positivity) (by positivity), hs2]
    ring
  have hd : HasDerivAt (fun s : ℝ => (ξ * (E / ρ) ^ (1 / 5 : ℝ)) * s ^ (2 / 5 : ℝ))
      ((ξ * (E / ρ) ^ (1 / 5 : ℝ)) * ((2 / 5) * t ^ (2 / 5 - 1 : ℝ))) t :=
    (Real.hasDerivAt_rpow_const (Or.inl ht.ne')).const_mul _
  refine (hd.congr_of_eventuallyEq hfun).congr_deriv ?_
  have hcombo := combo_rpow E t ρ hE ht hρ
  have hE' : (E / ρ) ^ (1 / 5 : ℝ) = E ^ (1 / 5 : ℝ) * ρ ^ (-(1 / 5) : ℝ) := by
    rw [Real.div_rpow hE.le hρ.le, Real.rpow_neg hρ.le, div_eq_mul_inv]
  rw [hcombo, hE', Real.rpow_sub_one ht.ne']
  field_simp

/-- Units leave `ξ` free: two different constants give two different radii
with the same exponents. -/
theorem coefficient_not_fixed (E t ρ ξ₁ ξ₂ : ℝ)
    (hE : 0 < E) (ht : 0 < t) (hρ : 0 < ρ) (hξ : ξ₁ ≠ ξ₂) :
    ξ₁ * (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ) ≠ ξ₂ * (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ) := by
  intro h
  have hpos : 0 < (E * t ^ 2 / ρ) ^ (1 / 5 : ℝ) := by positivity
  exact hξ (mul_right_cancel₀ hpos.ne' h)

/-- Any other exponent triple fails the dimensional balance. -/
theorem wrong_exponent (a b c : ℝ) (h : a ≠ 1 / 5) :
    ¬ (a + c = 0 ∧ 2 * a - 3 * c = 1 ∧ -2 * a + b = 0) := by
  intro hd
  exact h ((exponents_iff a b c).mp hd).1

end PhysJS.SedovTaylor
