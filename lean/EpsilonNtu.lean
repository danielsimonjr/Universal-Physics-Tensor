/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-205`. Bridge. Counterflow effectiveness, the ε–NTU relation.

The catalog equation is

```
ε = (1 − e^{−NTU (1 − C_r)}) / (1 − C_r e^{−NTU (1 − C_r)})
```

with `NTU = U A / C_min`, `C_r = C_min / C_max`, and
`ε = Q / (C_min (T_h,in − T_c,in))`. `eps_ntu_eq` derives it from the steady
counterflow equations along `x ∈ [0, L]` (constant conductance per length `a`,
so `U A = a L`; hot stream toward `+x`, cold stream toward `−x`):

```
C_h dT_h/dx = −a (T_h − T_c),    C_c dT_c/dx = −a (T_h − T_c)
```

The local difference decays as `exp(−κ x)` with `κ = a (1/C_h − 1/C_c)`; the
two stream energy balances give the terminal temperatures in terms of `ε`;
eliminating them yields the formula. Both orientations (hot stream is
`C_min`, or cold stream is `C_min`) are proved, for `C_r < 1`.
`eps_ntu_balanced` is the `C_r = 1` limit `NTU / (1 + NTU)`, which the
general formula only reaches as a `0/0` limit.

Scope: constant `U`, constant heat capacity rates, steady state, no phase
change. The exponential form comes from the ODE solution, not from units;
`cr_zero_form_wrong` separates the one-term `1 − e^{−NTU}` from the
`C_r > 0` formula.
-/

namespace PhysJS.EpsilonNtu

open Real Set

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

/-- Algebra: the key relation fixes `ε`. -/
lemma eps_of_key (D ε Cr e : ℝ) (hD : D ≠ 0) (hden : 1 - Cr * e ≠ 0)
    (key : D * (1 - ε) = D * (1 - ε * Cr) * e) :
    ε = (1 - e) / (1 - Cr * e) := by
  rw [eq_div_iff hden]
  apply mul_left_cancel₀ hD
  linear_combination (-1 : ℝ) * key

lemma exp_le_one_of_nonpos' {x : ℝ} (hx : 0 ≤ x) : Real.exp (-x) ≤ 1 := by
  rw [Real.exp_le_one_iff]; linarith

/-- Counterflow effectiveness from the steady ODEs, `C_min < C_max`.

`Cmin = min C_h C_c`, `Cmax = max C_h C_c`, `ε = Q/(C_min (T_h,in − T_c,in))`
with `Q = C_h (T_h(0) − T_h(L))`; `T_h,in = T_h(0)`, `T_c,in = T_c(L)`.

Not a
derivation of `U`; `C_r = 1` is `eps_ntu_balanced`. -/
theorem eps_ntu_eq (Th Tc : ℝ → ℝ) (Ch Cc a L Cmin Cmax ε : ℝ)
    (hCh : 0 < Ch) (hCc : 0 < Cc) (ha : 0 < a) (hL : 0 < L)
    (hmin : Cmin = min Ch Cc) (hmax : Cmax = max Ch Cc) (hlt : Cmin < Cmax)
    (hTh : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Th (-(a / Ch) * (Th x - Tc x)) x)
    (hTc : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Tc (-(a / Cc) * (Th x - Tc x)) x)
    (hD : Th 0 - Tc L ≠ 0)
    (hε : ε = Ch * (Th 0 - Th L) / (Cmin * (Th 0 - Tc L))) :
    ε = (1 - Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax)))) /
        (1 - (Cmin / Cmax) * Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax)))) := by
  have hCh0 : Ch ≠ 0 := hCh.ne'
  have hCc0 : Cc ≠ 0 := hCc.ne'
  have hLL : L ∈ Icc (0 : ℝ) L := ⟨hL.le, le_refl _⟩
  have hbal : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => Ch * Th t - Cc * Tc t) 0 x := by
    intro x hx
    have := ((hTh x hx).const_mul Ch).sub ((hTc x hx).const_mul Cc)
    refine this.congr_deriv ?_
    field_simp
    ring
  have hb := const_of_deriv_zero _ L hbal L hLL
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
  rcases le_total Ch Cc with hle | hle
  · -- hot stream is the minimum
    have hm : Cmin = Ch := by rw [hmin]; exact min_eq_left hle
    have hM : Cmax = Cc := by rw [hmax]; exact max_eq_right hle
    subst hm hM
    have hCr : Cmin / Cmax < 1 := by rw [div_lt_one hCc]; exact hlt
    have hCr0 : 0 < Cmin / Cmax := div_pos hCh hCc
    have hx : 0 ≤ (a * L / Cmin) * (1 - Cmin / Cmax) :=
      mul_nonneg (by positivity) (by linarith)
    have hE := exp_le_one_of_nonpos' hx
    have hEp := Real.exp_pos (-((a * L / Cmin) * (1 - Cmin / Cmax)))
    have hden : 1 - (Cmin / Cmax) * Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax))) ≠ 0 := by
      nlinarith
    have hkap : -κ * L = -((a * L / Cmin) * (1 - Cmin / Cmax)) := by
      rw [hκ]; field_simp
    rw [hkap] at hdec
    have e1 : Th 0 - Th L = ε * (Th 0 - Tc L) := by
      rw [hε]; field_simp
    have e2 : Tc 0 - Tc L = ε * (Th 0 - Tc L) * (Cmin / Cmax) := by
      have : Cmax * (Tc 0 - Tc L) = Cmin * (Th 0 - Th L) := by linarith
      rw [e1] at this
      field_simp
      linarith
    apply eps_of_key (Th 0 - Tc L) ε _ _ hD hden
    linear_combination hdec + e1 - (Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax)))) * e2
  · -- cold stream is the minimum
    have hm : Cmin = Cc := by rw [hmin]; exact min_eq_right hle
    have hM : Cmax = Ch := by rw [hmax]; exact max_eq_left hle
    subst hm hM
    have hCr : Cmin / Cmax < 1 := by rw [div_lt_one hCh]; exact hlt
    have hCr0 : 0 < Cmin / Cmax := div_pos hCc hCh
    have hx : 0 ≤ (a * L / Cmin) * (1 - Cmin / Cmax) :=
      mul_nonneg (by positivity) (by linarith)
    have hE := exp_le_one_of_nonpos' hx
    have hEp := Real.exp_pos (-((a * L / Cmin) * (1 - Cmin / Cmax)))
    have hden : 1 - (Cmin / Cmax) * Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax))) ≠ 0 := by
      nlinarith
    have hkap : -κ * L = ((a * L / Cmin) * (1 - Cmin / Cmax)) := by
      rw [hκ]; field_simp; ring
    rw [hkap] at hdec
    have hinv : Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax))) *
        Real.exp ((a * L / Cmin) * (1 - Cmin / Cmax)) = 1 := by
      rw [← Real.exp_add]; ring_nf; exact Real.exp_zero
    -- ε in terms of the cold stream
    have e1 : Tc 0 - Tc L = ε * (Th 0 - Tc L) := by
      have h1 : Cmax * (Th 0 - Th L) = Cmin * (Tc 0 - Tc L) := by linarith
      rw [hε, h1]; field_simp
    have e2 : Th 0 - Th L = ε * (Th 0 - Tc L) * (Cmin / Cmax) := by
      have : Cmax * (Th 0 - Th L) = Cmin * (Tc 0 - Tc L) := by linarith
      rw [e1] at this
      field_simp
      linarith
    apply eps_of_key (Th 0 - Tc L) ε _ _ hD hden
    -- D(1-εCr) = D(1-ε) E',  E' E = 1
    have h2 : (Th 0 - Tc L) * (1 - ε * (Cmin / Cmax)) =
        (Th 0 - Tc L) * (1 - ε) * Real.exp ((a * L / Cmin) * (1 - Cmin / Cmax)) := by
      linear_combination hdec + e2 - (Real.exp ((a * L / Cmin) * (1 - Cmin / Cmax))) * e1
    linear_combination (-(Real.exp (-((a * L / Cmin) * (1 - Cmin / Cmax))))) * h2
      - ((Th 0 - Tc L) * (1 - ε)) * hinv

/-- Balanced streams, `C_h = C_c = C`: `ε = NTU / (1 + NTU)`. -/
theorem eps_ntu_balanced (Th Tc : ℝ → ℝ) (C a L ε : ℝ)
    (hC : 0 < C) (ha : 0 < a) (hL : 0 < L)
    (hTh : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Th (-(a / C) * (Th x - Tc x)) x)
    (hTc : ∀ x ∈ Icc (0 : ℝ) L, HasDerivAt Tc (-(a / C) * (Th x - Tc x)) x)
    (hε : ε = C * (Th 0 - Th L) / (C * (Th 0 - Tc L)))
    (hD : Th 0 - Tc L ≠ 0) :
    ε = (a * L / C) / (1 + a * L / C) := by
  have hC0 : C ≠ 0 := hC.ne'
  have hLL : L ∈ Icc (0 : ℝ) L := ⟨hL.le, le_refl _⟩
  have hΔode : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => Th t - Tc t) (-(0 : ℝ) * (Th x - Tc x)) x := by
    intro x hx
    have := (hTh x hx).sub (hTc x hx)
    refine this.congr_deriv ?_
    ring
  have hdec : ∀ x ∈ Icc (0 : ℝ) L, Th x - Tc x = Th 0 - Tc 0 := by
    intro x hx
    have := exp_decay _ 0 L hΔode x hx
    simpa using this
  have hlin : ∀ x ∈ Icc (0 : ℝ) L,
      HasDerivAt (fun t => Th t + (a / C) * (Th 0 - Tc 0) * t) 0 x := by
    intro x hx
    have := (hTh x hx).add (((hasDerivAt_id x).const_mul ((a / C) * (Th 0 - Tc 0))))
    refine this.congr_deriv ?_
    rw [hdec x hx]; simp
  have hl := const_of_deriv_zero _ L hlin L hLL
  simp only [mul_zero, add_zero] at hl
  have hdrop : Th 0 - Th L = (a / C) * (Th 0 - Tc 0) * L := by linarith
  have hLd := hdec L hLL
  -- hot inlet minus cold inlet, and the terminal difference are equal
  have e1 : Th 0 - Th L = ε * (Th 0 - Tc L) := by rw [hε]; field_simp
  have hcold : Tc 0 - Tc L = Th 0 - Th L := by linarith
  have hD0 : Th 0 - Tc 0 = (Th 0 - Tc L) - (Th 0 - Th L) := by linarith
  rw [hD0, e1] at hdrop
  have hNTU : 0 < a * L / C := by positivity
  rw [eq_div_iff (by positivity)]
  apply mul_left_cancel₀ hD
  field_simp at hdrop ⊢
  linear_combination hdrop

/-- `ε` is not the one-term `1 − e^{−NTU}` (the `C_r → 0` limit) once
`C_r > 0`: the denominators differ. -/
theorem cr_zero_form_wrong (E Cr : ℝ) (hE : E ≠ 1) (hCr : 0 < Cr) (hE0 : E ≠ 0) :
    (1 - E) / (1 - Cr * E) ≠ 1 - E := by
  intro h
  have h1 : (1 - E) ≠ 0 := sub_ne_zero.mpr (Ne.symm hE)
  by_cases hden : 1 - Cr * E = 0
  · rw [hden, div_zero] at h
    exact h1 h.symm
  · rw [div_eq_iff hden] at h
    have h3 : (1 - E) * 1 = (1 - E) * (1 - Cr * E) := by linarith
    have h4 := mul_left_cancel₀ h1 h3
    have : Cr * E = 0 := by linarith
    exact (mul_ne_zero hCr.ne' hE0) this

end PhysJS.EpsilonNtu
