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
`be-242`. Bridge. Stokes-Kirchhoff classical sound absorption.

The catalog equation is

```
α = ω² / (2 ρ c³) · [ 4μ/3 + μ_B + κ (1/c_v − 1/c_p) ]
```

The bracket `b` collects shear viscosity `μ`, bulk viscosity `μ_B` and heat
conduction `κ`. Taking the linearised viscous and thermal fluid equations as
the premise, they enter the plane-wave problem only through the combination
`b`: `ρ u_tt = (ρ c² + b ∂_t) u_xx`. This file takes `b` as that hypothesis
(the bracket, `bracket_def`) and does not derive it from the Navier-Stokes
and heat equations.

For a mode `exp(i(k x − ω t))` with `k = a + i α` (`a` the phase
wavenumber, `α` the spatial attenuation) the dispersion relation is
`k² (ρ c² − i ω b) = ρ ω²`. `attenuation_bounds` solves its real and
imaginary parts exactly. With `ε = ω b / (ρ c²)` it proves

```
α = α₀ q,   α₀ = ω² b / (2 ρ c³),   q ≤ 1,   q² ≥ 1 − 5 ε² / 4
```

so the catalog prefactor `ω²/(2ρc³)` is the leading term, with a relative
correction of order `ε²`. That is the regime `ω τ ≪ 1` of the report; it
does not cover molecular relaxation. The bulk-viscosity and thermal terms
are only as good as their identification with `b`, and the thermal term is
non-negative because `c_p ≥ c_v`.
-/

namespace PhysJS.StokesKirchhoff

/-- The dissipation bracket `4μ/3 + μ_B + κ (1/c_v − 1/c_p)`. -/
noncomputable def bracket (μ μB κ cv cp : ℝ) : ℝ :=
  4 * μ / 3 + μB + κ * (1 / cv - 1 / cp)

/-- Leading prefactor `ω² b / (2 ρ c³)`. -/
noncomputable def alpha0 (ω ρ c b : ℝ) : ℝ := ω ^ 2 * b / (2 * ρ * c ^ 3)

lemma poly_lower (x : ℝ) (hx : 0 ≤ x) : (1 - 5 * x) * (1 + x) ^ 2 ≤ (1 - x) ^ 3 := by
  have h : (1 - x) ^ 3 - (1 - 5 * x) * (1 + x) ^ 2 = 12 * x ^ 2 + 4 * x ^ 3 := by ring
  have : 0 ≤ 12 * x ^ 2 + 4 * x ^ 3 := by positivity
  linarith

lemma poly_upper (x : ℝ) (hx : 0 ≤ x) : (1 - x) ^ 3 ≤ 1 * (1 + x) ^ 2 := by
  have h : 1 * (1 + x) ^ 2 - (1 - x) ^ 3 = x * ((x - 1) ^ 2 + 4) := by ring
  have : 0 ≤ x * ((x - 1) ^ 2 + 4) := by positivity
  linarith

/-- Exact solution of the attenuated-wave dispersion relation against the
catalog prefactor.

`hre` and `him` are the real and imaginary parts of
`k² (ρ c² − i ω b) = ρ ω²` at `k = a + i α`, with `a, α > 0`.

Kind `bridge` on `PhysJS.StokesKirchhoff.attenuation_bounds`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
derivation of the bracket from the fluid equations and not a relaxation
(`ω τ ~ 1`) result. -/
theorem attenuation_bounds (ρ c ω b a α : ℝ)
    (hρ : 0 < ρ) (hc : 0 < c) (hω : 0 < ω) (hb : 0 < b) (ha : 0 < a) (hα : 0 < α)
    (hre : (a ^ 2 - α ^ 2) * (ρ * c ^ 2) + 2 * a * α * (ω * b) = ρ * ω ^ 2)
    (him : 2 * a * α * (ρ * c ^ 2) = (a ^ 2 - α ^ 2) * (ω * b)) :
    α ≤ alpha0 ω ρ c b ∧
      (1 - 5 * (ω * b / (ρ * c ^ 2)) ^ 2 / 4) * alpha0 ω ρ c b ^ 2 ≤ α ^ 2 := by
  set ε := ω * b / (ρ * c ^ 2) with hεdef
  have hρc : 0 < ρ * c ^ 2 := by positivity
  have hε : 0 < ε := by positivity
  have hεm : ω * b = ε * (ρ * c ^ 2) := by rw [hεdef]; field_simp
  set s := α / a with hs
  have hs0 : 0 < s := by positivity
  have hαs : α = s * a := by rw [hs]; field_simp
  -- imaginary part: 2 s = (1 - s²) ε
  have h2s : 2 * s = (1 - s ^ 2) * ε := by
    rw [hαs, hεm] at him
    have h : (2 * s - (1 - s ^ 2) * ε) * (a ^ 2 * (ρ * c ^ 2)) = 0 := by nlinarith
    rcases mul_eq_zero.mp h with h0 | h0
    · linarith
    · exfalso
      have : 0 < a ^ 2 * (ρ * c ^ 2) := by positivity
      linarith
  have hs1 : s < 1 := by
    by_contra hcon
    have h0 : 0 ≤ s ^ 2 - 1 := by nlinarith
    have := mul_nonneg h0 hε.le
    nlinarith
  have hs2 : s ^ 2 < 1 := by nlinarith
  have h1s : 0 < 1 - s ^ 2 := by linarith
  -- real part: a² c² (1+s²)² = ω² (1 - s²)
  have hE1 : a ^ 2 * c ^ 2 * (1 + s ^ 2) ^ 2 = ω ^ 2 * (1 - s ^ 2) := by
    rw [hαs, hεm] at hre
    have h : (a ^ 2 * c ^ 2 * ((1 - s ^ 2) + 2 * s * ε) - ω ^ 2) * ρ = 0 := by nlinarith
    have hρ0 : ρ ≠ 0 := hρ.ne'
    have h' : a ^ 2 * c ^ 2 * ((1 - s ^ 2) + 2 * s * ε) = ω ^ 2 := by
      rcases mul_eq_zero.mp h with h0 | h0
      · linarith
      · exact absurd h0 hρ0
    have hε' : ε = 2 * s / (1 - s ^ 2) := by
      rw [eq_div_iff h1s.ne']; linarith
    rw [hε'] at h'
    field_simp at h'
    nlinarith
  -- α₀ = ω ε / (2 c)
  have hα0 : alpha0 ω ρ c b = ω * ε / (2 * c) := by
    unfold alpha0; rw [hεdef]; field_simp
  have hα0pos : 0 < alpha0 ω ρ c b := by unfold alpha0; positivity
  -- q = α / α₀ = a c (1 - s²) / ω
  have hq : α = alpha0 ω ρ c b * (a * c * (1 - s ^ 2) / ω) := by
    rw [hα0, hαs]
    have hεs : ε = 2 * s / (1 - s ^ 2) := by
      rw [eq_div_iff h1s.ne']; linarith
    rw [hεs]
    field_simp
  have hqsq : (a * c * (1 - s ^ 2) / ω) ^ 2 * (1 + s ^ 2) ^ 2 = (1 - s ^ 2) ^ 3 := by
    have : (a * c * (1 - s ^ 2) / ω) ^ 2 = a ^ 2 * c ^ 2 * (1 - s ^ 2) ^ 2 / ω ^ 2 := by
      field_simp
    rw [this]
    field_simp
    nlinarith [hE1]
  set q := a * c * (1 - s ^ 2) / ω with hqdef
  have hqpos : 0 < q := by rw [hqdef]; positivity
  have hx : 0 ≤ s ^ 2 := sq_nonneg s
  have hq1 : q ^ 2 ≤ 1 := by
    have h1 : q ^ 2 * (1 + s ^ 2) ^ 2 ≤ 1 * (1 + s ^ 2) ^ 2 := by
      rw [hqsq]; exact poly_upper _ hx
    exact le_of_mul_le_mul_right h1 (by positivity)
  have hq1' : q ≤ 1 := (pow_le_one_iff_of_nonneg hqpos.le two_ne_zero).mp hq1
  -- s ≤ ε / 2
  have hsε : s ≤ ε / 2 := by
    have e1 : (1 - s ^ 2) * ε = ε - s ^ 2 * ε := by ring
    have e2 := mul_nonneg hx hε.le
    linarith
  have hq2 : 1 - 5 * s ^ 2 ≤ q ^ 2 := by
    have h1 : (1 - 5 * s ^ 2) * (1 + s ^ 2) ^ 2 ≤ q ^ 2 * (1 + s ^ 2) ^ 2 := by
      rw [hqsq]; exact poly_lower _ hx
    exact le_of_mul_le_mul_right h1 (by positivity)
  constructor
  · rw [hq]
    have := mul_le_mul_of_nonneg_left hq1' hα0pos.le
    linarith
  · rw [hq]
    have hss : s ^ 2 ≤ ε ^ 2 / 4 := by
      have := pow_le_pow_left₀ hs0.le hsε 2
      linarith [this, show (ε / 2) ^ 2 = ε ^ 2 / 4 by ring]
    have h3 : 1 - 5 * ε ^ 2 / 4 ≤ q ^ 2 := by linarith
    have h4 := mul_le_mul_of_nonneg_left h3 (sq_nonneg (alpha0 ω ρ c b))
    calc (1 - 5 * ε ^ 2 / 4) * alpha0 ω ρ c b ^ 2
        = alpha0 ω ρ c b ^ 2 * (1 - 5 * ε ^ 2 / 4) := by ring
      _ ≤ alpha0 ω ρ c b ^ 2 * q ^ 2 := h4
      _ = (alpha0 ω ρ c b * q) ^ 2 := by ring

/-- The thermal term of the bracket is non-negative since `c_p ≥ c_v > 0`. -/
theorem thermal_term_nonneg (κ cv cp : ℝ) (hκ : 0 ≤ κ) (hcv : 0 < cv) (hcp : cv ≤ cp) :
    0 ≤ κ * (1 / cv - 1 / cp) := by
  have hcp0 : 0 < cp := lt_of_lt_of_le hcv hcp
  apply mul_nonneg hκ
  rw [sub_nonneg]
  exact one_div_le_one_div_of_le hcv hcp

/-- Shear-only bracket: `4μ/3`. -/
theorem bracket_shear_only (μ : ℝ) : bracket μ 0 0 1 1 = 4 * μ / 3 := by
  unfold bracket; ring

/-- Frequency scaling: the prefactor is quadratic in `ω`. -/
theorem alpha0_quadratic (ω ρ c b : ℝ) : alpha0 (2 * ω) ρ c b = 4 * alpha0 ω ρ c b := by
  unfold alpha0; ring

/-- Wrong power: `ω²/(2ρc²)` (units of `c²` instead of `c³` per length) is
not the prefactor. -/
theorem wrong_power_separated : ∃ ω ρ c b : ℝ, 0 < c ∧ c ≠ 1 ∧
    alpha0 ω ρ c b ≠ ω ^ 2 * b / (2 * ρ * c ^ 2) := by
  refine ⟨1, 1, 2, 1, by norm_num, by norm_num, ?_⟩
  unfold alpha0; norm_num

end PhysJS.StokesKirchhoff
