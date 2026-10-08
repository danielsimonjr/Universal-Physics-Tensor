/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-237`. Bridge. Electro-optic half-wave voltage.

The catalog equation is

```
V_π = λ d / (n³ r L)
```

`half_wave_eq` derives it for a transverse Pockels modulator. The linear
electro-optic effect changes the optical impermeability by
`Δ(1/n²) = r E` for the relevant tensor component `r`. The derivative of
`n ↦ 1/n²` is `−2/n³` (`hasDerivAt_index`), so to first order
`Δn = −(1/2) n³ r E`. With a uniform field `E = V/d` across the electrode
gap `d` and an interaction length `L`, the phase shift is
`Γ = 2π |Δn| L / λ = π n³ r V L / (λ d)`. The half-wave voltage is the `V`
with `Γ = π`. Premises: one crystal axis, one polarisation, a field uniform
across the gap, first order in `E`, `r` the single effective tensor
component. The tensor component `r` and the index `n` are inputs; this does
not derive the crystal tensor.
-/

namespace PhysJS.PockelsHalfWave

/-- Impermeability `1/n²`. -/
noncomputable def impermeability (n : ℝ) : ℝ := 1 / n ^ 2

/-- `d(1/n²)/dn = −2/n³`. -/
theorem hasDerivAt_index (n : ℝ) (hn : n ≠ 0) :
    HasDerivAt impermeability (-2 / n ^ 3) n := by
  have h := (hasDerivAt_pow 2 n).inv (pow_ne_zero 2 hn)
  have hfun : impermeability = fun x : ℝ => ((x ^ 2 : ℝ))⁻¹ := by
    ext x
    simp [impermeability]
  rw [hfun]
  refine h.congr_deriv ?_
  field_simp
  ring

/-- First-order index change from the impermeability change.

`hlin` is `(d(1/n²)/dn) Δn = r E`. -/
theorem delta_n_eq (n r E Δn : ℝ) (hn : n ≠ 0)
    (hlin : (-2 / n ^ 3) * Δn = r * E) :
    Δn = -(1 / 2) * n ^ 3 * r * E := by
  have h3 : n ^ 3 ≠ 0 := pow_ne_zero 3 hn
  field_simp at hlin ⊢
  linarith

/-- Half-wave voltage from the phase shift `Γ = 2π |Δn| L / λ`.

`hΓ` is the phase for `Δn = −(1/2) n³ r E`, `E = V/d`. `Vπ` is the voltage
with `Γ = π`.

Not a
derivation of `r` or of the crystal tensor. -/
theorem half_wave_eq (lam d n r L V Γ Vπ : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hn : 0 < n) (hr : 0 < r) (hL : 0 < L)
    (hΓ : Γ = 2 * Real.pi * ((1 / 2) * n ^ 3 * r * (V / d)) * L / lam)
    (hhalf : (2 * Real.pi * ((1 / 2) * n ^ 3 * r * (Vπ / d)) * L / lam) = Real.pi) :
    Vπ = lam * d / (n ^ 3 * r * L) ∧ Γ = Real.pi * V / Vπ := by
  have hpi : 0 < Real.pi := Real.pi_pos
  have hden : 0 < n ^ 3 * r * L := by positivity
  have hV : Vπ = lam * d / (n ^ 3 * r * L) := by
    rw [eq_div_iff hden.ne']
    field_simp at hhalf
    linear_combination hhalf
  refine ⟨hV, ?_⟩
  rw [hΓ, hV]
  have hlam' : lam ≠ 0 := hlam.ne'
  have hd' : d ≠ 0 := hd.ne'
  field_simp

/-- Lithium niobate numbers: `n = 2.14`, `r = 30.8e-12`, `L = 2e-2`,
`d = 5e-6`, `λ = 1.55e-6` are inputs; the voltage scales linearly in `d/L`
and as `n^{-3}`: doubling the index divides `V_π` by 8. -/
theorem index_cubed (lam d n r L : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hn : 0 < n) (hr : 0 < r) (hL : 0 < L) :
    lam * d / ((2 * n) ^ 3 * r * L) = (lam * d / (n ^ 3 * r * L)) / 8 := by
  field_simp
  ring

/-- Treating the index change as `n r E` (no `n³`, no `1/2`) gives a
different voltage. -/
theorem wrong_power_differs (lam d n r L : ℝ) (hlam : 0 < lam) (hd : 0 < d)
    (hn : 1 < n) (hr : 0 < r) (hL : 0 < L) :
    lam * d / (n ^ 3 * r * L) ≠ lam * d / (n * r * L) := by
  intro h
  have hn0 : 0 < n := by linarith
  have h1 : 0 < n * r * L := by positivity
  have h2 : 0 < n ^ 3 * r * L := by positivity
  have hld : 0 < lam * d := by positivity
  rw [div_eq_div_iff h2.ne' h1.ne'] at h
  have : n ^ 3 * r * L = n * r * L := by
    have := mul_left_cancel₀ hld.ne' (by linarith : lam * d * (n * r * L) = lam * d * (n ^ 3 * r * L))
    linarith
  have h3 : n * r * L * (n ^ 2 - 1) = 0 := by nlinarith
  have h4 : n ^ 2 - 1 > 0 := by nlinarith
  have := mul_pos h1 h4
  linarith

end PhysJS.PockelsHalfWave
