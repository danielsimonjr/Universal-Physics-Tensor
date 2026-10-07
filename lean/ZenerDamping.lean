/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-246`. Bridge. Zener thermoelastic damping, Debye form.

The catalog equation is

```
Q⁻¹ = Δ · ωτ / (1 + (ωτ)²)        Δ = E α² T / C_v
```

with `ω` the flexural frequency, `τ` the thermal relaxation time, `E` the
Young modulus, `α` the thermal expansion coefficient, `T` the temperature and
`C_v` the volumetric heat capacity.

The premise is a single relaxation process. An internal variable `ξ`
follows the strain `ε` by `τ ξ' + ξ = ε`, and the stress is
`σ = E_R ε + ΔE (ε − ξ)`: relaxed modulus `E_R` at `ξ = ε`, unrelaxed
modulus `E_R + ΔE` at `ξ = 0`. For `ε = cos(ω t)` the steady response is
`ξ = A cos(ω t) + B sin(ω t)`. `debye_coefficients` solves the ODE for
`A = 1/(1+x²)`, `B = x/(1+x²)` with `x = ω τ`. Writing
`σ = E' cos(ω t) − E'' sin(ω t)` gives the loss tangent
`Q⁻¹ = E''/E'`, and `loss_tangent_eq` proves

```
Q⁻¹ = Δ x / (1 + (1 + Δ) x²)    when ΔE = Δ E_R.
```

`debye_error` shows the catalog Debye form `D = Δ x/(1+x²)` agrees to
first order in `Δ`: `0 ≤ D − Q⁻¹ ≤ Δ D`. `debye_peak` shows `D ≤ Δ/2` with
equality at `ωτ = 1`.

The strength `Δ = E α² T / C_v` is taken as the hypothesis `ΔE = Δ E_R`
with `Δ` given by that formula. The thermodynamic identity behind it, the
adiabatic-isothermal modulus difference, and the heat-conduction derivation
of `τ` are not proved. Only the single-`τ` shape is. At
order `Δ` the model's relaxation time and Zener's differ by `√(1+Δ)`.
-/

namespace PhysJS.ZenerDamping

open Real

/-- Solving `τ ξ' + ξ = cos(ω t)` for the in-phase and quadrature response. -/
theorem debye_coefficients (ξ ξ' : ℝ → ℝ) (A B ω τ : ℝ) (hω : 0 < ω)
    (hξdef : ∀ t, ξ t = A * Real.cos (ω * t) + B * Real.sin (ω * t))
    (hξ : ∀ t, HasDerivAt ξ (ξ' t) t)
    (hode : ∀ t, τ * ξ' t + ξ t = Real.cos (ω * t)) :
    A = 1 / (1 + (ω * τ) ^ 2) ∧ B = ω * τ / (1 + (ω * τ) ^ 2) := by
  have hxf : ξ = fun t => A * Real.cos (ω * t) + B * Real.sin (ω * t) := funext hξdef
  have hd : ∀ t, HasDerivAt ξ (-(A * ω) * Real.sin (ω * t) + B * ω * Real.cos (ω * t)) t := by
    intro t
    have hc := ((Real.hasDerivAt_cos (ω * t)).comp t ((hasDerivAt_id t).const_mul ω)).const_mul A
    have hs := ((Real.hasDerivAt_sin (ω * t)).comp t ((hasDerivAt_id t).const_mul ω)).const_mul B
    rw [hxf]
    convert hc.fun_add hs using 1
    simp; ring
  have hξ' : ξ' = fun t => -(A * ω) * Real.sin (ω * t) + B * ω * Real.cos (ω * t) :=
    funext fun t => (hξ t).unique (hd t)
  -- t = 0
  have h0 := hode 0
  rw [hξ', hξdef] at h0
  simp at h0
  -- t = π / (2 ω)
  have h1 := hode (Real.pi / (2 * ω))
  have harg : ω * (Real.pi / (2 * ω)) = Real.pi / 2 := by field_simp
  rw [hξ', hξdef] at h1
  simp only [harg, Real.sin_pi_div_two, Real.cos_pi_div_two] at h1
  simp at h1
  have hx2 : 0 < 1 + (ω * τ) ^ 2 := by positivity
  have hB : B = ω * τ * A := by linarith
  have hA : A * (1 + (ω * τ) ^ 2) = 1 := by
    rw [hB] at h0
    nlinarith
  refine ⟨?_, ?_⟩
  · rw [eq_div_iff hx2.ne']; exact hA
  · rw [hB, eq_div_iff hx2.ne']
    have : ω * τ * A * (1 + (ω * τ) ^ 2) = ω * τ * (A * (1 + (ω * τ) ^ 2)) := by ring
    rw [this, hA]; ring

/-- Loss tangent of a standard linear solid: with `E' = E + ΔE (1 − A)`
and `E'' = ΔE B`, `ΔE = Δ E`, `x = ω τ`: `E''/E' = Δ x / (1 + (1+Δ) x²)`.

Kind `bridge` on `PhysJS.ZenerDamping.loss_tangent_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a derivation
of `Δ = E α² T / C_v` or of `τ` from heat conduction. -/
theorem loss_tangent_eq (A B ω τ E dE α T Cv : ℝ)
    (hE : 0 < E) (hα : α ≠ 0) (hT : 0 < T) (hCv : 0 < Cv)
    (hA : A = 1 / (1 + (ω * τ) ^ 2)) (hB : B = ω * τ / (1 + (ω * τ) ^ 2))
    (hdE : dE = (E * α ^ 2 * T / Cv) * E) :
    (dE * B) / (E + dE * (1 - A)) =
      (E * α ^ 2 * T / Cv) * (ω * τ) / (1 + (1 + E * α ^ 2 * T / Cv) * (ω * τ) ^ 2) := by
  have hΔ : 0 < E * α ^ 2 * T / Cv := by
    have : 0 < α ^ 2 := by positivity
    positivity
  generalize E * α ^ 2 * T / Cv = Δ at hΔ hdE ⊢
  have hx2 : 0 < 1 + (ω * τ) ^ 2 := by positivity
  rw [hA, hB, hdE]
  have e : E + Δ * E * (1 - 1 / (1 + (ω * τ) ^ 2))
      = E * (1 + (1 + Δ) * (ω * τ) ^ 2) / (1 + (ω * τ) ^ 2) := by
    field_simp
    ring
  rw [e]
  have : 0 < 1 + (1 + Δ) * (ω * τ) ^ 2 := by positivity
  field_simp

/-- The Debye form `Δ x/(1+x²)`. -/
noncomputable def debye (Δ x : ℝ) : ℝ := Δ * x / (1 + x ^ 2)

/-- The exact loss tangent. -/
noncomputable def lossTangent (Δ x : ℝ) : ℝ := Δ * x / (1 + (1 + Δ) * x ^ 2)

/-- First-order agreement with the catalog Debye form. -/
theorem debye_error (Δ x : ℝ) (hΔ : 0 < Δ) (hx : 0 ≤ x) :
    0 ≤ debye Δ x - lossTangent Δ x ∧
      debye Δ x - lossTangent Δ x ≤ Δ * debye Δ x := by
  unfold debye lossTangent
  have h1 : 0 < 1 + x ^ 2 := by positivity
  have h2 : 0 < 1 + (1 + Δ) * x ^ 2 := by positivity
  have hdiff : Δ * x / (1 + x ^ 2) - Δ * x / (1 + (1 + Δ) * x ^ 2)
      = Δ ^ 2 * x ^ 3 / ((1 + x ^ 2) * (1 + (1 + Δ) * x ^ 2)) := by
    field_simp
    ring
  rw [hdiff]
  constructor
  · positivity
  · rw [div_le_iff₀ (by positivity)]
    have : Δ * (Δ * x / (1 + x ^ 2)) * ((1 + x ^ 2) * (1 + (1 + Δ) * x ^ 2))
        = Δ ^ 2 * x * (1 + (1 + Δ) * x ^ 2) := by
      field_simp
    rw [this]
    have hx3 : x ^ 3 = x * x ^ 2 := by ring
    have : Δ ^ 2 * x * (1 + (1 + Δ) * x ^ 2) - Δ ^ 2 * x ^ 3
        = Δ ^ 2 * x * (1 + Δ * x ^ 2) := by ring
    have h3 : 0 ≤ Δ ^ 2 * x * (1 + Δ * x ^ 2) := by positivity
    linarith

/-- Peak value: `D ≤ Δ/2`, with equality at `x = 1`. -/
theorem debye_peak (Δ x : ℝ) (hΔ : 0 < Δ) :
    debye Δ x ≤ Δ / 2 ∧ debye Δ 1 = Δ / 2 := by
  constructor
  · unfold debye
    rw [div_le_div_iff₀ (by positivity) (by norm_num)]
    nlinarith [mul_nonneg hΔ.le (sq_nonneg (x - 1))]
  · unfold debye; norm_num

/-- Units alone do not entail the Debye form: `x/(1+x²)` at `x = 2` is not
the monotone `x/(1+x)`. -/
theorem shape_not_fixed : (2 : ℝ) / (1 + 2 ^ 2) ≠ 2 / (1 + 2) := by norm_num

end PhysJS.ZenerDamping
