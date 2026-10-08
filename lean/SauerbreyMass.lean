/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-176`. Bridge. Sauerbrey mass loading.

The catalog equation is

```
Δf = −2 f₀² Δm / (A √(ρ_q μ_q))
```

for a thickness-shear quartz resonator. The fundamental has a half
wavelength across the thickness `h`, so `f₀ = v / (2 h)` with shear speed
`v = √(μ_q / ρ_q)`. A thin rigid film of mass `Δm` on area `A` acts as
extra crystal thickness `Δh = Δm / (ρ_q A)`. `sauerbrey_eq` linearizes
`f(h) = v / (2 h)`: `df/dh = −v / (2 h²) = −f₀ / h`, so

```
Δf = (df/dh) Δh = −f₀ Δh / h
```

and eliminating `h = v / (2 f₀)` gives `−2 f₀² Δm / (ρ_q A v)`, where
`ρ_q v = √(ρ_q μ_q)`. `exact_shift` is the unlinearized shift
`−f₀ Δh / (h + Δh)`, of which Sauerbrey is the first order.
`coefficient_not_fixed` separates any prefactor other than `2` and
`not_linear_in_f0` separates a single power of `f₀`.

Premises: film acoustically like the crystal, rigid and uniform,
`Δh ≪ h`. This is not the viscoelastic film (Kanazawa) or a liquid load.
-/

namespace PhysJS.SauerbreyMass

/-- `f(h) = v / (2 h)` has slope `−v / (2 h²)`. -/
theorem freq_slope (v h : ℝ) (hh : h ≠ 0) :
    HasDerivAt (fun t : ℝ => v / (2 * t)) (-v / (2 * h ^ 2)) h := by
  have hlin : HasDerivAt (fun t : ℝ => 2 * t) 2 h := by
    simpa using (hasDerivAt_id h).const_mul 2
  have hinv := hlin.inv (mul_ne_zero two_ne_zero hh)
  have hmul := hinv.const_mul v
  have hfun : (fun t : ℝ => v / (2 * t)) = fun t => v * (fun t : ℝ => 2 * t)⁻¹ t := by
    ext t
    simp [div_eq_mul_inv]
  rw [hfun]
  refine hmul.congr_deriv ?_
  field_simp

/-- `ρ v = √(ρ μ)` for `v = √(μ / ρ)`. -/
theorem impedance_sqrt (ρ μ v : ℝ) (hρ : 0 < ρ) (hμ : 0 < μ) (hv : v = Real.sqrt (μ / ρ)) :
    ρ * v = Real.sqrt (ρ * μ) := by
  have hv0 : 0 < v := by rw [hv]; exact Real.sqrt_pos.mpr (div_pos hμ hρ)
  have hv2 : v ^ 2 = μ / ρ := by rw [hv]; exact Real.sq_sqrt (div_pos hμ hρ).le
  have : ρ * μ = (ρ * v) ^ 2 := by
    rw [mul_pow, hv2]
    field_simp
  rw [this, Real.sqrt_sq (by positivity)]

/-- Sauerbrey's shift from the thickness-shear resonance and a thickness
equivalent of the film.

`hf0` is `f₀ = v / (2 h)`. `hv` is `v = √(μ_q / ρ_q)`. `hΔh` is
`Δh = Δm / (ρ_q A)`. `hΔf` is the first-order shift
`Δf = (df/dh) Δh`.

Not a
viscoelastic or liquid load, and not valid for `Δm` comparable to the
crystal mass. -/
theorem sauerbrey_eq (f0 v h Δh Δm A ρ μ Δf : ℝ)
    (hρ : 0 < ρ) (hμ : 0 < μ) (hA : 0 < A) (hh : 0 < h)
    (hf0 : f0 = v / (2 * h)) (hv : v = Real.sqrt (μ / ρ))
    (hΔh : Δh = Δm / (ρ * A)) (hΔf : Δf = (-v / (2 * h ^ 2)) * Δh) :
    Δf = -f0 * Δh / h ∧ Δf = -2 * f0 ^ 2 * Δm / (A * Real.sqrt (ρ * μ)) := by
  have hv0 : 0 < v := by rw [hv]; exact Real.sqrt_pos.mpr (div_pos hμ hρ)
  have hs := impedance_sqrt ρ μ v hρ hμ hv
  have hρv : 0 < ρ * v := by positivity
  refine ⟨?_, ?_⟩
  · rw [hΔf, hf0]
    field_simp
  · rw [← hs, hΔf, hΔh, hf0]
    field_simp

/-- Without linearizing, the shift is `−f₀ Δh / (h + Δh)`. -/
theorem exact_shift (v h Δh : ℝ) (hh : h ≠ 0) (hhh : h + Δh ≠ 0) :
    v / (2 * (h + Δh)) - v / (2 * h) = -(v / (2 * h)) * Δh / (h + Δh) := by
  field_simp
  ring

/-- Any other prefactor is a different shift. -/
theorem coefficient_not_fixed (c f0 Δm A s : ℝ) (hc : c ≠ -2) (hf : f0 ≠ 0) (hm : Δm ≠ 0)
    (hA : A ≠ 0) (hs : s ≠ 0) :
    c * f0 ^ 2 * Δm / (A * s) ≠ -2 * f0 ^ 2 * Δm / (A * s) := by
  intro h
  field_simp at h
  exact hc h

/-- One power of `f₀` in place of two is a different shift. -/
theorem not_linear_in_f0 (f0 Δm A s : ℝ) (hf : f0 ≠ 0) (hf1 : f0 ≠ 1) (hm : Δm ≠ 0)
    (hA : A ≠ 0) (hs : s ≠ 0) :
    -2 * f0 * Δm / (A * s) ≠ -2 * f0 ^ 2 * Δm / (A * s) := by
  intro h
  field_simp at h
  exact hf1 (by linarith)

end PhysJS.SauerbreyMass
