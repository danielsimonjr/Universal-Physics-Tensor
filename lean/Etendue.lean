/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-232`. Bridge. Etendue and basic-radiance invariance.

The catalog equations are

```
G = n² A Ω,     L / n² = const
```

`etendue_density_eq` derives the refraction invariant. At a planar
interface the area element `dA` is common to both sides. A ray bundle at
polar angle `θ` has projected throughput `dA cos θ dΩ` with
`dΩ = sin θ dθ dφ`, so the étendue element is
`dG = n² dA cos θ sin θ dθ dφ`. Snell's law `n₁ sin θ₁ = n₂ sin θ₂` holds
as an identity in `θ₁` (`θ₂` a differentiable function of `θ₁`);
differentiating gives `n₁ cos θ₁ = n₂ cos θ₂ θ₂'`, and multiplying the two
gives `n₁² cos θ₁ sin θ₁ = n₂² cos θ₂ sin θ₂ θ₂'`: the étendue element is
unchanged by refraction. `radiance_invariant_eq` combines that with power
conservation `L₁ p₁ = L₂ p₂` to give `L₁/n₁² = L₂/n₂²`.
`cone_etendue_eq` is the finite cone, `G = π A (n sin θ)²`, which depends
only on the numerical aperture. Premises: geometric optics, lossless
interface, no scattering. Reflection loss would break the power balance.
-/

namespace PhysJS.Etendue

open Real

/-- Snell's law, differentiated and multiplied back, conserves the
étendue element.

`hsnell` is Snell's law for all angles of the function `θ₂`; `hd` is its
derivative at `θ₁`.

Not
absorbing or scattering optics. -/
theorem etendue_density_eq (n₁ n₂ θ₁ θ₂' : ℝ) (θ₂ : ℝ → ℝ)
    (hsnell : ∀ t, n₁ * sin t = n₂ * sin (θ₂ t))
    (hd : HasDerivAt θ₂ θ₂' θ₁) :
    n₁ ^ 2 * (cos θ₁ * sin θ₁) = n₂ ^ 2 * (cos (θ₂ θ₁) * sin (θ₂ θ₁)) * θ₂' := by
  have hL : HasDerivAt (fun t => n₁ * sin t) (n₁ * cos θ₁) θ₁ :=
    (hasDerivAt_sin θ₁).const_mul n₁
  have hR : HasDerivAt (fun t => n₂ * sin (θ₂ t)) (n₂ * (cos (θ₂ θ₁) * θ₂')) θ₁ :=
    (hd.sin).const_mul n₂
  have hfun : (fun t => n₁ * sin t) = fun t => n₂ * sin (θ₂ t) := funext hsnell
  rw [hfun] at hL
  have hder : n₁ * cos θ₁ = n₂ * (cos (θ₂ θ₁) * θ₂') := hL.unique hR
  have hs := hsnell θ₁
  calc n₁ ^ 2 * (cos θ₁ * sin θ₁) = (n₁ * sin θ₁) * (n₁ * cos θ₁) := by ring
    _ = (n₂ * sin (θ₂ θ₁)) * (n₂ * (cos (θ₂ θ₁) * θ₂')) := by rw [hs, hder]
    _ = n₂ ^ 2 * (cos (θ₂ θ₁) * sin (θ₂ θ₁)) * θ₂' := by ring

/-- Basic radiance `L/n²` is the same on both sides of a lossless interface.

`p₁ = cos θ₁ sin θ₁`, `p₂ = cos θ₂ sin θ₂ θ₂'` are the geometric
throughput elements (common `dA dφ` dropped) and `hpow` is power
conservation `L₁ p₁ = L₂ p₂`. -/
theorem radiance_invariant_eq (n₁ n₂ L₁ L₂ θ₁ θ₂' : ℝ) (θ₂ : ℝ → ℝ)
    (hn₁ : n₁ ≠ 0) (hn₂ : n₂ ≠ 0)
    (hsnell : ∀ t, n₁ * sin t = n₂ * sin (θ₂ t))
    (hd : HasDerivAt θ₂ θ₂' θ₁)
    (hp : cos θ₁ * sin θ₁ ≠ 0)
    (hpow : L₁ * (cos θ₁ * sin θ₁) = L₂ * (cos (θ₂ θ₁) * sin (θ₂ θ₁) * θ₂')) :
    L₁ / n₁ ^ 2 = L₂ / n₂ ^ 2 := by
  have he := etendue_density_eq n₁ n₂ θ₁ θ₂' θ₂ hsnell hd
  have h1 : n₂ ^ 2 * (L₁ * (cos θ₁ * sin θ₁)) =
      n₁ ^ 2 * (L₂ * (cos θ₁ * sin θ₁)) := by
    calc n₂ ^ 2 * (L₁ * (cos θ₁ * sin θ₁))
        = n₂ ^ 2 * (L₂ * (cos (θ₂ θ₁) * sin (θ₂ θ₁) * θ₂')) := by rw [hpow]
      _ = L₂ * (n₂ ^ 2 * (cos (θ₂ θ₁) * sin (θ₂ θ₁)) * θ₂') := by ring
      _ = L₂ * (n₁ ^ 2 * (cos θ₁ * sin θ₁)) := by rw [he]
      _ = n₁ ^ 2 * (L₂ * (cos θ₁ * sin θ₁)) := by ring
  have h2 : (n₂ ^ 2 * L₁ - n₁ ^ 2 * L₂) * (cos θ₁ * sin θ₁) = 0 := by linarith
  rcases mul_eq_zero.mp h2 with h | h
  · field_simp
    linarith
  · exact absurd h hp

/-- Finite cone: `n₁² sin² θ₁ = n₂² sin² θ₂`, so `G = Real.pi A (NA)²` agrees on
both sides. -/
theorem cone_etendue_eq (n₁ n₂ A θ₁ θ₂ : ℝ)
    (hsnell : n₁ * sin θ₁ = n₂ * sin θ₂) :
    n₁ ^ 2 * (Real.pi * A * sin θ₁ ^ 2) = n₂ ^ 2 * (Real.pi * A * sin θ₂ ^ 2) := by
  have : (n₁ * sin θ₁) ^ 2 = (n₂ * sin θ₂) ^ 2 := by rw [hsnell]
  calc n₁ ^ 2 * (Real.pi * A * sin θ₁ ^ 2) = Real.pi * A * (n₁ * sin θ₁) ^ 2 := by ring
    _ = Real.pi * A * (n₂ * sin θ₂) ^ 2 := by rw [this]
    _ = n₂ ^ 2 * (Real.pi * A * sin θ₂ ^ 2) := by ring

/-- The exponent 2 is forced. If the throughput ratio `y₂/y₁` makes
`n^2` conserved and also `n^p`, then `p = 2` as soon as the indices differ. -/
theorem power_two_forced (n₁ n₂ y₁ y₂ : ℝ) (p : ℕ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂)
    (hne : n₁ ≠ n₂) (hy₁ : y₁ ≠ 0)
    (h2 : n₁ ^ 2 * y₁ = n₂ ^ 2 * y₂) (hp : n₁ ^ p * y₁ = n₂ ^ p * y₂) :
    p = 2 := by
  have hy₂ : y₂ ≠ 0 := by
    intro h0
    rw [h0, mul_zero] at h2
    exact hy₁ ((mul_eq_zero.mp h2).resolve_left (by positivity))
  have hq : (n₁ / n₂) ^ 2 = y₂ / y₁ := by
    field_simp
    linarith
  have hq' : (n₁ / n₂) ^ p = y₂ / y₁ := by
    rw [div_pow]
    field_simp
    linarith
  have hpos : 0 < n₁ / n₂ := div_pos hn₁ hn₂
  have hne1 : n₁ / n₂ ≠ 1 := by
    intro h
    rw [div_eq_one_iff_eq hn₂.ne'] at h
    exact hne h
  have heq : (n₁ / n₂) ^ p = (n₁ / n₂) ^ 2 := hq'.trans hq.symm
  exact pow_right_injective₀ hpos hne1 heq

end PhysJS.Etendue
