/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-243`. Bridge. Helmholtz resonator frequency.

The catalog equation is

```
f = (c / 2π) √(A / (V L_eff))
```

The premises are lumped-element acoustics. The air in the neck (area `A`,
effective length `L_eff`, density `ρ`) moves as a rigid slug of mass
`ρ A L_eff` with displacement `x(t)`. The cavity of volume `V` is compressed
adiabatically: a volume change `A x` gives a pressure change
`δp = −ρ c² A x / V` (bulk modulus `ρ c²`). Newton's law for the slug is
`ρ A L_eff x'' = −A δp`, that is `ρ A L_eff x'' = −(ρ c² A² / V) x`.

`frequency_eq` takes a harmonic solution `x(t) = X cos(ω t)` with `X ≠ 0`
and proves `ω² = c² A / (V L_eff)`, hence `f = ω / (2π)` is the catalog
value. It does not derive the lumped model, and assumes a cavity small
against the wavelength with the end correction folded into `L_eff`.
-/

namespace PhysJS.HelmholtzResonator

open Real

/-- Harmonic slug motion with Newton's law for the neck air and the
adiabatic cavity restoring force forces `ω² = c² A / (V L)`.

`hx` and `hv` say `v = x'` and `a = x''`; `hN` is `ρ A L a = −(ρ c² A² / V) x`.

Kind `bridge` on `PhysJS.HelmholtzResonator.frequency_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
derivation of the lumped-element model. -/
theorem frequency_eq (x v a : ℝ → ℝ) (X ω ρ c A V L : ℝ)
    (hρ : 0 < ρ) (hA : 0 < A) (hV : 0 < V) (hL : 0 < L) (hX : X ≠ 0)
    (hxdef : ∀ t, x t = X * Real.cos (ω * t))
    (hx : ∀ t, HasDerivAt x (v t) t) (hv : ∀ t, HasDerivAt v (a t) t)
    (hN : ∀ t, ρ * A * L * a t = -(ρ * c ^ 2 * A ^ 2 / V) * x t) :
    ω ^ 2 = c ^ 2 * A / (V * L) := by
  have hxf : x = fun t => X * Real.cos (ω * t) := funext hxdef
  have hd1 : ∀ t, HasDerivAt x (-(X * ω) * Real.sin (ω * t)) t := by
    intro t
    have h := ((Real.hasDerivAt_cos (ω * t)).comp t ((hasDerivAt_id t).const_mul ω)).const_mul X
    rw [hxf]
    convert h using 1
    simp; ring
  have hvv : v = fun t => -(X * ω) * Real.sin (ω * t) :=
    funext fun t => (hx t).unique (hd1 t)
  have hd2 : ∀ t, HasDerivAt v (-(X * ω ^ 2) * Real.cos (ω * t)) t := by
    intro t
    have h := ((Real.hasDerivAt_sin (ω * t)).comp t ((hasDerivAt_id t).const_mul ω)).const_mul
      (-(X * ω))
    rw [hvv]
    convert h using 1
    simp; ring
  have ha : a 0 = -(X * ω ^ 2) := by
    have := (hv 0).unique (hd2 0)
    simpa using this
  have h0 := hN 0
  rw [ha, hxdef] at h0
  simp only [mul_zero, Real.cos_zero, mul_one] at h0
  have hV0 : V ≠ 0 := hV.ne'
  have hρ0 : ρ ≠ 0 := hρ.ne'
  have hA0 : A ≠ 0 := hA.ne'
  have hL0 : L ≠ 0 := hL.ne'
  rw [eq_div_iff (by positivity)]
  field_simp at h0
  linarith

/-- The catalog frequency `f = ω/(2Real.pi) = (c/2Real.pi) √(A/(V L))` for `ω > 0`. -/
theorem catalog_form (ω c A V L : ℝ) (hω : 0 < ω) (hc : 0 < c) (hA : 0 < A)
    (hV : 0 < V) (hL : 0 < L) (h : ω ^ 2 = c ^ 2 * A / (V * L)) :
    ω / (2 * Real.pi) = c / (2 * Real.pi) * Real.sqrt (A / (V * L)) := by
  have hω' : ω = c * Real.sqrt (A / (V * L)) := by
    rw [← Real.sqrt_sq hω.le, h, show c ^ 2 * A / (V * L) = c ^ 2 * (A / (V * L)) by ring,
      Real.sqrt_mul (by positivity), Real.sqrt_sq hc.le]
  rw [hω']; ring

/-- Quadrupling the cavity volume halves the frequency. -/
theorem volume_scaling (A V L : ℝ) (hV : 0 < V) (hL : 0 < L) (hA : 0 < A) :
    Real.sqrt (A / ((4 * V) * L)) = Real.sqrt (A / (V * L)) / 2 := by
  have h : A / ((4 * V) * L) = (A / (V * L)) / 4 := by field_simp
  rw [h, Real.sqrt_div' _ (by norm_num : (0:ℝ) ≤ 4)]
  have : Real.sqrt 4 = 2 := by
    rw [show (4:ℝ) = 2 ^ 2 by norm_num]; exact Real.sqrt_sq (by norm_num)
  rw [this]

/-- A longer neck lowers the resonance: `L < L'` gives a strictly smaller
`A / (V L')`, so the frequency is not independent of the neck length. -/
theorem neck_length_matters (A V L L' : ℝ) (hA : 0 < A) (hV : 0 < V) (hL : 0 < L)
    (hLL : L < L') : A / (V * L') < A / (V * L) := by
  apply div_lt_div_of_pos_left hA (by positivity)
  exact mul_lt_mul_of_pos_left hLL hV

end PhysJS.HelmholtzResonator
