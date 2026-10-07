/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-204`. Bridge. Log-mean temperature difference of a counterflow exchanger.

The catalog equation is

```
Q = U A ΔT_lm,    ΔT_lm = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)
```

`lmtd_eq` derives it from the steady counterflow equations along the
exchanger, `x ∈ [0, L]`, with constant conductance per length `a` (so
`U A = a L`) and constant stream heat capacity rates `C_h`, `C_c`:

```
C_h dT_h/dx = −a (T_h − T_c),    C_c dT_c/dx = −a (T_h − T_c)
```

(hot stream flows toward `+x`, cold stream toward `−x`). The proof solves for
the local difference `Δ(x) = T_h − T_c`, which decays as `exp(−κ x)` with
`κ = a (1/C_h − 1/C_c)`, gets the stream energy balance from the same
equations, and eliminates the heat duty `Q = C_h (T_h(0) − T_h(L))`. The balanced
case `C_h = C_c` (where `Δ` is constant and the formula is `0/0`) is included
with the removable-singularity convention `lmtd x x = x`.

Scope: constant `U`, constant heat capacities, steady state, no phase change,
no losses. Not a derivation of `U`. The logarithmic mean is not the
arithmetic mean (`arithmetic_mean_wrong`).
-/

namespace PhysJS.LmtdCounterflow

open Real Set

/-- Logarithmic mean, with the removable singularity `lmtd x x = x`. -/
noncomputable def lmtd (x y : ℝ) : ℝ :=
  if x = y then x else (x - y) / Real.log (x / y)

lemma lmtd_of_eq {x y : ℝ} (h : x = y) : lmtd x y = x := by
  unfold lmtd; simp [h]

lemma lmtd_of_ne {x y : ℝ} (h : x ≠ y) : lmtd x y = (x - y) / Real.log (x / y) := by
  unfold lmtd; simp [h]

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

/-- Counterflow heat exchanger: duty `Q = C_h (T_h(0) − T_h(L))` equals
`U A ΔT_lm`, with `U A = a L`, `ΔT₁ = T_h(0) − T_c(0)` (hot inlet, cold outlet)
and `ΔT₂ = T_h(L) − T_c(L)` (hot outlet, cold inlet).

`hTh`, `hTc` are the steady stream energy equations. `hΔ` requires the
terminal difference at the hot inlet to be positive.

Kind `bridge` on `PhysJS.LmtdCounterflow.lmtd_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a derivation
of `U`, and no phase change or heat loss. -/
theorem lmtd_eq (Th Tc : ℝ → ℝ) (Ch Cc a L : ℝ)
    (hCh : 0 < Ch) (hCc : 0 < Cc) (ha : 0 < a) (hL : 0 < L)
    (hTh : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Th (-(a / Ch) * (Th x - Tc x)) x)
    (hTc : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Tc (-(a / Cc) * (Th x - Tc x)) x)
    (hΔ : 0 < Th 0 - Tc 0) :
    Ch * (Th 0 - Th L) = (a * L) * lmtd (Th 0 - Tc 0) (Th L - Tc L) := by
  have hCh0 : Ch ≠ 0 := hCh.ne'
  have hCc0 : Cc ≠ 0 := hCc.ne'
  have hL0 : (0 : ℝ) ∈ Icc (0 : ℝ) L := ⟨le_refl _, hL.le⟩
  have hLL : L ∈ Icc (0 : ℝ) L := ⟨hL.le, le_refl _⟩
  -- stream energy balance
  have hbal : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => Ch * Th t - Cc * Tc t) 0 x := by
    intro x hx
    have := ((hTh x hx).const_mul Ch).sub ((hTc x hx).const_mul Cc)
    refine this.congr_deriv ?_
    field_simp
    ring
  have hb := const_of_deriv_zero _ L hbal L hLL
  -- local difference
  set κ : ℝ := a * (1 / Ch - 1 / Cc) with hκ
  have hΔode : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => Th t - Tc t) (-κ * (Th x - Tc x)) x := by
    intro x hx
    have := (hTh x hx).sub (hTc x hx)
    refine this.congr_deriv ?_
    rw [hκ]
    field_simp
    ring
  have hdec := exp_decay _ κ L hΔode L hLL
  have hQ2 : Ch * (Th 0 - Th L) = Cc * (Tc 0 - Tc L) := by linarith
  by_cases hc : Ch = Cc
  · -- balanced case
    have hκ0 : κ = 0 := by rw [hκ, hc]; ring
    have hconst : Th L - Tc L = Th 0 - Tc 0 := by
      rw [hdec, hκ0]; simp
    rw [lmtd_of_eq hconst.symm]
    -- hot stream is linear
    have hlin : ∀ x ∈ Icc (0 : ℝ) L,
        HasDerivAt (fun t => Th t + (a / Ch) * (Th 0 - Tc 0) * t) 0 x := by
      intro x hx
      have hd := hΔode x hx
      have hx' := exp_decay _ κ L hΔode x hx
      have hxc : Th x - Tc x = Th 0 - Tc 0 := by rw [hx', hκ0]; simp
      have := (hTh x hx).add (((hasDerivAt_id x).const_mul ((a / Ch) * (Th 0 - Tc 0))))
      refine this.congr_deriv ?_
      rw [hxc]; simp
    have hl := const_of_deriv_zero _ L hlin L hLL
    simp only [mul_zero, add_zero] at hl
    have : Th 0 - Th L = (a / Ch) * (Th 0 - Tc 0) * L := by linarith
    rw [this]
    field_simp
  · have hκne : κ ≠ 0 := by
      rw [hκ]
      have : 1 / Ch - 1 / Cc ≠ 0 := by
        intro h0
        apply hc
        field_simp at h0
        linarith
      exact mul_ne_zero ha.ne' this
    have hne : ¬ (Th 0 - Tc 0 = Th L - Tc L) := by
      intro h0
      have : Real.exp (-κ * L) = 1 := by
        have hpos : Th 0 - Tc 0 ≠ 0 := hΔ.ne'
        have h1 : Th 0 - Tc 0 = (Th 0 - Tc 0) * Real.exp (-κ * L) := by
          rw [← hdec]; exact h0
        have := mul_left_cancel₀ hpos (by linarith : (Th 0 - Tc 0) * Real.exp (-κ * L) = (Th 0 - Tc 0) * 1)
        exact this
      have h2 : -κ * L = 0 := Real.exp_injective (this.trans Real.exp_zero.symm)
      rcases mul_eq_zero.mp h2 with h3 | h3
      · exact hκne (neg_eq_zero.mp h3)
      · exact hL.ne' h3
    rw [lmtd_of_ne hne]
    have hlog : Real.log ((Th 0 - Tc 0) / (Th L - Tc L)) = κ * L := by
      rw [hdec]
      have hp : (Th 0 - Tc 0) ≠ 0 := hΔ.ne'
      have : (Th 0 - Tc 0) / ((Th 0 - Tc 0) * Real.exp (-κ * L)) = Real.exp (κ * L) := by
        rw [div_mul_eq_div_div, div_self hp, one_div, ← Real.exp_neg]
        ring_nf
      rw [this, Real.log_exp]
    rw [hlog]
    have hdiff : (Th 0 - Tc 0) - (Th L - Tc L) = Ch * (Th 0 - Th L) * (1 / Ch - 1 / Cc) := by
      field_simp
      linarith
    rw [hdiff, hκ]
    have hd : (1 / Ch - 1 / Cc) ≠ 0 := by
      intro h0
      apply hc
      field_simp at h0
      linarith
    field_simp

/-- The balanced case on its own: constant difference, `Q = U A ΔT`. -/
theorem lmtd_self (x : ℝ) : lmtd x x = x := lmtd_of_eq rfl

/-- Control: the arithmetic mean of `60 K` and `20 K` is not the log mean. -/
theorem arithmetic_mean_wrong : lmtd 60 20 ≠ (60 + 20) / 2 := by
  rw [lmtd_of_ne (by norm_num)]
  have h3 : Real.log (60 / 20 : ℝ) ≠ 1 := by
    intro h
    have : (60 / 20 : ℝ) = Real.exp 1 := by
      rw [← h, Real.exp_log (by norm_num)]
    have h2 := Real.exp_one_lt_d9
    norm_num at this
    linarith
  intro h
  apply h3
  have hp : Real.log (60 / 20 : ℝ) ≠ 0 := by
    intro h0; rw [h0] at h; norm_num at h
  field_simp at h
  linarith

end PhysJS.LmtdCounterflow
