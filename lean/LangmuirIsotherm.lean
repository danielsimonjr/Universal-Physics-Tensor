/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-209`. Bridge. Langmuir adsorption isotherm.

The catalog equation is

```
θ = K P / (1 + K P),    K = k_a / k_d
```

`langmuir_eq` derives it from the site balance of one-site-per-molecule,
non-interacting, single-layer, reversible adsorption,

```
dθ/dt = k_a P (1 − θ) − k_d θ
```

at steady state. `relaxation_eq` solves the same rate equation: any
solution on `[0, T]` with `θ(0) = θ₀` is
`θ(t) = θ_eq + (θ₀ − θ_eq) exp(−(k_a P + k_d) t)`, so the isotherm is the
attractor, not an extra postulate. `coverage_between` gives `0 < θ < 1`,
`henry_bound` the low-pressure Henry limit `θ ≤ K P`, and `half_coverage`
the point `K P = 1`.

Scope: ideal Langmuir assumptions; `k_a`, `k_d` are inputs (the Arrhenius
dependence of `K` is `be-147`, not this row). `θ` depends on `K` and `P` only
through the pure number `K P` (`depends_only_on_KP`), so units alone do not
fix the form.
-/

namespace PhysJS.LangmuirIsotherm

open Set

/-- A function with zero derivative on `[0, L]` is constant there. -/
lemma const_of_deriv_zero (f : ℝ → ℝ) (L : ℝ)
    (h : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt f 0 x) :
    ∀ x ∈ Icc (0 : ℝ) L, f x = f 0 := by
  have hcont : ContinuousOn f (Icc 0 L) := fun x hx => (h x hx).continuousAt.continuousWithinAt
  exact constant_of_has_deriv_right_zero hcont
    (fun x hx => (h x (Ico_subset_Icc_self hx)).hasDerivWithinAt)

/-- Exponential decay along `[0, L]` from a linear ODE. -/
lemma exp_decay (g : ℝ → ℝ) (κ L : ℝ)
    (h : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt g (-κ * g x) x) :
    ∀ x ∈ Icc (0 : ℝ) L, g x = g 0 * Real.exp (-κ * x) := by
  have hk : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => g t * Real.exp (κ * t)) 0 x := by
    intro x hx
    have he : HasDerivAt (fun t : ℝ => Real.exp (κ * t)) (Real.exp (κ * x) * κ) x := by
      have := ((hasDerivAt_id x).const_mul κ).exp
      simpa using this
    have := (h x hx).mul he
    refine this.congr_deriv ?_
    ring
  intro x hx
  have h0 := const_of_deriv_zero _ L hk x hx
  simp only [mul_zero, Real.exp_zero, mul_one] at h0
  have hex : Real.exp (κ * x) * Real.exp (-κ * x) = 1 := by
    rw [← Real.exp_add]; ring_nf; exact Real.exp_zero
  calc g x = g x * (Real.exp (κ * x) * Real.exp (-κ * x)) := by rw [hex, mul_one]
    _ = (g x * Real.exp (κ * x)) * Real.exp (-κ * x) := by ring
    _ = g 0 * Real.exp (-κ * x) := by rw [h0]

/-- Steady site balance gives the Langmuir isotherm.

`hbal`: adsorption flux equals desorption flux, `k_a P (1 − θ) = k_d θ`.
`hK`: `K = k_a / k_d`.

Kind `bridge` on `PhysJS.LangmuirIsotherm.langmuir_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a model of
`k_a`, `k_d`, multilayers or interactions. -/
theorem langmuir_eq (θ K P ka kd : ℝ) (hkd : 0 < kd) (hka : 0 < ka) (hP : 0 ≤ P)
    (hK : K = ka / kd) (hbal : ka * P * (1 - θ) = kd * θ) :
    θ = K * P / (1 + K * P) := by
  have hkd0 : kd ≠ 0 := hkd.ne'
  have hpos : 0 < 1 + K * P := by
    have : 0 ≤ K * P := mul_nonneg (by rw [hK]; positivity) hP
    linarith
  rw [eq_div_iff hpos.ne', hK]
  field_simp
  linarith

/-- The Langmuir rate equation relaxes to the isotherm exponentially. -/
theorem relaxation_eq (θ : ℝ → ℝ) (ka kd P T θ₀ : ℝ)
    (hka : 0 < ka) (hkd : 0 < kd) (hP : 0 ≤ P)
    (hode : ∀ t ∈ Icc (0 : ℝ) T, HasDerivAt θ (ka * P * (1 - θ t) - kd * θ t) t)
    (h0 : θ 0 = θ₀) :
    ∀ t ∈ Icc (0 : ℝ) T,
      θ t = ka * P / (ka * P + kd) +
        (θ₀ - ka * P / (ka * P + kd)) * Real.exp (-((ka * P + kd) * t)) := by
  intro t ht
  have hden : ka * P + kd ≠ 0 := by
    have : 0 ≤ ka * P := by positivity
    linarith
  set eq : ℝ := ka * P / (ka * P + kd) with heq
  have hg : ∀ s ∈ Icc (0 : ℝ) T,
      HasDerivAt (fun u => θ u - eq) (-(ka * P + kd) * (θ s - eq)) s := by
    intro s hs
    have := (hode s hs).sub_const eq
    refine this.congr_deriv ?_
    rw [heq]
    field_simp
    ring
  have := exp_decay _ (ka * P + kd) T hg t ht
  simp only [h0] at this
  rw [show -(ka * P + kd) * t = -((ka * P + kd) * t) by ring] at this
  linarith

/-- The isotherm is a stationary solution of the rate equation. -/
theorem equilibrium_stationary (ka kd P : ℝ) (hden : ka * P + kd ≠ 0) :
    ka * P * (1 - ka * P / (ka * P + kd)) - kd * (ka * P / (ka * P + kd)) = 0 := by
  field_simp
  ring

/-- Coverage lies strictly between 0 and 1 for `K P > 0`. -/
theorem coverage_between (K P : ℝ) (h : 0 < K * P) :
    0 < K * P / (1 + K * P) ∧ K * P / (1 + K * P) < 1 := by
  constructor
  · positivity
  · rw [div_lt_one (by linarith)]; linarith

/-- Henry limit: the coverage never exceeds the linear estimate `K P`. -/
theorem henry_bound (K P : ℝ) (h : 0 ≤ K * P) : K * P / (1 + K * P) ≤ K * P := by
  rw [div_le_iff₀ (by linarith)]
  nlinarith [mul_nonneg h h]

/-- Half coverage at `K P = 1`. -/
theorem half_coverage (K P : ℝ) (h : K * P = 1) : K * P / (1 + K * P) = 1 / 2 := by
  rw [h]; norm_num

/-- Control: only the pure number `K P` enters; scaling `K` up and `P` down
leaves `θ` unchanged. -/
theorem depends_only_on_KP (K P s : ℝ) (hs : s ≠ 0) :
    (s * K) * (P / s) / (1 + (s * K) * (P / s)) = K * P / (1 + K * P) := by
  have : (s * K) * (P / s) = K * P := by field_simp
  rw [this]

end PhysJS.LangmuirIsotherm
