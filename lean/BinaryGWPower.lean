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
`be-217`. Bridge. Gravitational-wave power of a circular binary.

The catalog equation is

```
P = (32/5) G⁴ m₁² m₂² (m₁ + m₂) / (c⁵ a⁵)
```

The quadrupole formula for a circular orbit is taken as the hypothesis

```
P = (32/5) (G / c⁵) μ² a⁴ ω⁶,   μ = m₁ m₂ / (m₁ + m₂)
```

(`hquad`; the derivation of the factor `32/5` from the linearised field
equations is not done here). With Kepler's third law `ω² = G (m₁ + m₂) / a³`
(`hkepler`), `power_eq` eliminates `μ` and `ω` and proves the catalog form.
`power_scaling` shows `P ∝ a⁻⁵` at fixed masses.

Premises: weak field, slow motion, circular orbit, point masses. Not
a derivation of the quadrupole coefficient and not the eccentric
enhancement `f(e)`. The numerical 6.57e23 W for PSR B1913+16 is not evaluated.
-/

namespace PhysJS.BinaryGWPower

/-- Catalog power from the quadrupole hypothesis and Kepler's third law. -/
theorem power_eq (G c m₁ m₂ a ω μ P : ℝ) (hG : 0 < G) (hc : 0 < c)
    (hm₁ : 0 < m₁) (hm₂ : 0 < m₂) (ha : 0 < a)
    (hμ : μ = m₁ * m₂ / (m₁ + m₂))
    (hkepler : ω ^ 2 = G * (m₁ + m₂) / a ^ 3)
    (hquad : P = 32 / 5 * (G / c ^ 5) * μ ^ 2 * a ^ 4 * ω ^ 6) :
    P = 32 / 5 * G ^ 4 * m₁ ^ 2 * m₂ ^ 2 * (m₁ + m₂) / (c ^ 5 * a ^ 5) := by
  have hM : m₁ + m₂ ≠ 0 := by positivity
  have hω6 : ω ^ 6 = (G * (m₁ + m₂) / a ^ 3) ^ 3 := by
    rw [← hkepler]; ring
  rw [hquad, hω6, hμ]
  field_simp

/-- Doubling the separation divides the power by `32`. -/
theorem power_scaling (G c m₁ m₂ a : ℝ) (hc : c ≠ 0) (ha : a ≠ 0) :
    (32 / 5 * G ^ 4 * m₁ ^ 2 * m₂ ^ 2 * (m₁ + m₂) / (c ^ 5 * (2 * a) ^ 5)) =
      (32 / 5 * G ^ 4 * m₁ ^ 2 * m₂ ^ 2 * (m₁ + m₂) / (c ^ 5 * a ^ 5)) / 32 := by
  field_simp
  ring

/-- Wrong-power separation: `a⁻⁴` (the exponent units alone would allow together
with a different mass dependence) does not reproduce the formula. For positive
quantities, `P a⁵ = P a⁴ · a` equals `P a⁴` only at `a = 1`. -/
theorem exponent_not_four (K a : ℝ) (hK : 0 < K) (ha : 0 < a) (ha1 : a ≠ 1) :
    K / a ^ 5 ≠ K / a ^ 4 := by
  intro h
  have h5 : a ^ 5 ≠ 0 := by positivity
  have h4 : a ^ 4 ≠ 0 := by positivity
  field_simp at h
  exact ha1 h.symm

/-- The mass dependence is not just `(m₁ + m₂)⁵`-symmetric: swapping to an
equal-mass pair at fixed total mass `M` changes the power, so the mass-ratio
factor `m₁² m₂²` is part of the content (units give three free groups). -/
theorem mass_ratio_matters (M : ℝ) (hM : 0 < M) :
    (M / 2) ^ 2 * (M / 2) ^ 2 ≠ (M / 4) ^ 2 * (3 * M / 4) ^ 2 := by
  intro h
  have : M ^ 4 * (1 / 16 - 9 / 256) = 0 := by nlinarith [h]
  have hM4 : M ^ 4 ≠ 0 := by positivity
  rcases mul_eq_zero.mp this with h' | h'
  · exact hM4 h'
  · norm_num at h'

end PhysJS.BinaryGWPower
