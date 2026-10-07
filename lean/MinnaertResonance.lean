/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Pow.Deriv
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-245`. Bridge. Minnaert resonance of a gas bubble in a liquid.

The catalog equation is

```
f = (1 / (2π R₀)) √(3 γ p / ρ)
```

The premises are a spherical bubble of equilibrium radius `R₀` in an
incompressible liquid of density `ρ` and ambient pressure `p`, with small
radial oscillations `R = R₀ + x`, no surface tension and no viscosity.

1. Liquid inertia (linearised Rayleigh equation): `ρ R₀ x'' = p_g(R₀ + x) − p`
   to first order, that is `ρ R₀ x'' = k x` with `k = p_g'(R₀)`.
2. Polytropic gas: `p_g R³ᵞ = p R₀³ᵞ`, so `p_g(R) = p R₀^{3γ} R^{−3γ}`.

`gas_stiffness` differentiates the polytropic law: `k = −3 γ p / R₀`.
`frequency_eq` takes a harmonic motion `x = X cos(ω t)` with `X ≠ 0` and
proves `ω² = 3 γ p / (ρ R₀²)`, so `f = ω / (2π)` is the catalog value.
`isothermal_ratio` shows the `γ = 1` (isothermal) bubble is lower by `√γ`.

It does not derive the Rayleigh equation, and it omits surface tension,
viscous and radiative damping and any finite-size correction to `R₀ ≪ λ`.
-/

namespace PhysJS.MinnaertResonance

open Real

/-- Polytropic gas pressure `p R₀^{3γ} R^{−3γ}`. -/
noncomputable def gasPressure (p R₀ γ R : ℝ) : ℝ := p * R₀ ^ (3 * γ) * R ^ (-(3 * γ))

/-- The stiffness `d p_g / d R` at `R₀` is `−3 γ p / R₀`. -/
theorem gas_stiffness (p R₀ γ : ℝ) (hR : 0 < R₀) :
    HasDerivAt (gasPressure p R₀ γ) (-(3 * γ * p / R₀)) R₀ := by
  have h := (Real.hasDerivAt_rpow_const (x := R₀) (p := -(3 * γ)) (Or.inl hR.ne')).const_mul
    (p * R₀ ^ (3 * γ))
  unfold gasPressure
  convert h using 1
  have h1 : R₀ ^ (3 * γ) * R₀ ^ (-(3 * γ) - 1) = R₀⁻¹ := by
    rw [← Real.rpow_add hR]
    have : 3 * γ + (-(3 * γ) - 1) = -1 := by ring
    rw [this, Real.rpow_neg_one]
  calc -(3 * γ * p / R₀) = -(3 * γ) * p * R₀⁻¹ := by ring
    _ = p * R₀ ^ (3 * γ) * (-(3 * γ) * R₀ ^ (-(3 * γ) - 1)) := by
      rw [show p * R₀ ^ (3 * γ) * (-(3 * γ) * R₀ ^ (-(3 * γ) - 1))
        = -(3 * γ) * p * (R₀ ^ (3 * γ) * R₀ ^ (-(3 * γ) - 1)) by ring, h1]

/-- Harmonic radial motion with linearised liquid inertia and the polytropic
gas stiffness forces `ω² = 3 γ p / (ρ R₀²)`.

`hx` and `hv` say `v = x'` and `a = x''`; `hI` is `ρ R₀ a = k x` with
`k` the stiffness `d p_g / d R` at `R₀` (`hk`).

Kind `bridge` on `PhysJS.MinnaertResonance.frequency_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
derivation of the Rayleigh equation and with no damping. -/
theorem frequency_eq (x v a : ℝ → ℝ) (X ω ρ R₀ γ p k : ℝ)
    (hρ : 0 < ρ) (hR : 0 < R₀) (hX : X ≠ 0)
    (hk : HasDerivAt (gasPressure p R₀ γ) k R₀)
    (hxdef : ∀ t, x t = X * Real.cos (ω * t))
    (hx : ∀ t, HasDerivAt x (v t) t) (hv : ∀ t, HasDerivAt v (a t) t)
    (hI : ∀ t, ρ * R₀ * a t = k * x t) :
    ω ^ 2 = 3 * γ * p / (ρ * R₀ ^ 2) := by
  have hkval : k = -(3 * γ * p / R₀) := hk.unique (gas_stiffness p R₀ γ hR)
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
  have h0 := hI 0
  rw [ha, hxdef, hkval] at h0
  simp only [mul_zero, Real.cos_zero, mul_one] at h0
  have hR0 : R₀ ≠ 0 := hR.ne'
  have hρ0 : ρ ≠ 0 := hρ.ne'
  rw [eq_div_iff (by positivity)]
  field_simp at h0
  nlinarith [h0]

/-- The catalog form `f = (1/(2π R₀)) √(3γp/ρ)` for `ω > 0`. -/
theorem catalog_form (ω ρ R₀ γ p : ℝ) (hω : 0 < ω) (hρ : 0 < ρ) (hR : 0 < R₀)
    (hγ : 0 < γ) (hp : 0 < p) (h : ω ^ 2 = 3 * γ * p / (ρ * R₀ ^ 2)) :
    ω / (2 * π) = 1 / (2 * π * R₀) * Real.sqrt (3 * γ * p / ρ) := by
  have hω' : ω = Real.sqrt (3 * γ * p / ρ) / R₀ := by
    rw [← Real.sqrt_sq hω.le, h,
      show 3 * γ * p / (ρ * R₀ ^ 2) = (3 * γ * p / ρ) / R₀ ^ 2 by field_simp,
      Real.sqrt_div' _ (sq_nonneg R₀), Real.sqrt_sq hR.le]
  rw [hω']
  field_simp

/-- Isothermal (`γ = 1`) against polytropic: `ω²` differs by exactly `γ`. -/
theorem isothermal_ratio (ρ R₀ γ p : ℝ) (hρ : 0 < ρ) (hR : 0 < R₀) (hp : 0 < p) :
    3 * γ * p / (ρ * R₀ ^ 2) = γ * (3 * 1 * p / (ρ * R₀ ^ 2)) := by
  field_simp

/-- Units alone do not entail the pure number: with air (`γ = 7/5`) the
squared frequency is not the `γ = 1` value. -/
theorem gamma_matters (ρ R₀ p : ℝ) (hρ : 0 < ρ) (hR : 0 < R₀) (hp : 0 < p) :
    3 * 1 * p / (ρ * R₀ ^ 2) < 3 * (7 / 5) * p / (ρ * R₀ ^ 2) := by
  apply div_lt_div_of_pos_right _ (by positivity)
  nlinarith

end PhysJS.MinnaertResonance
