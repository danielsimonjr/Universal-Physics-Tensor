/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-220`. Bridge. Matter-dominated age of the universe.

The catalog equation is

```
t₀ = 2 / (3 H₀)
```

Premises (hypotheses): a flat Friedmann universe, `(ȧ/a)² = (8πG/3) ρ`
(`hfried`), filled with pressureless dust whose energy density dilutes as
`ρ a³ = ρ₀` (`hdust`), an expanding scale factor (`ȧ > 0`), and a big bang
`a(0) = 0` with `a` continuous at `0`. Then `ȧ² a = C` with
`C = 8πGρ₀/3` (`friedmann_dust`); `aux_deriv` shows `w = a^{3/2}` has the constant derivative
`(3/2)√C`, so `w(t) = (3/2)√C t` by the mean value theorem
(`three_halves_law`), that is `a ∝ t^{2/3}` (`a³ = (9/4) C t²`). The Hubble
rate is `H = ȧ/a = 2/(3t)` (`hubble_eq`), so the age at which the
measured rate is `H₀` is `t₀ = 2/(3 H₀)` (`age_eq`).

Premises: flat, matter only, no radiation, no Λ. This is a limit relation;
it is known to be wrong for our universe (`age_lt_hubble_time` is the
algebraic comparison with `1/H₀`). The 9.31 Gyr figure is not evaluated.
-/

namespace PhysJS.MatterDominatedAge

open Real

/-- Flat Friedmann with dust: `(ȧ/a)² = (8πG/3) ρ` and `ρ a³ = ρ₀` give `ȧ² a = 8πGρ₀/3`. -/
theorem friedmann_dust (G ρ ρ₀ a a' : ℝ) (ha : 0 < a)
    (hfried : (a' / a) ^ 2 = 8 * Real.pi * G / 3 * ρ) (hdust : ρ * a ^ 3 = ρ₀) :
    a' ^ 2 * a = 8 * Real.pi * G * ρ₀ / 3 := by
  rw [← hdust]
  have : a' ^ 2 = a ^ 2 * (8 * Real.pi * G / 3 * ρ) := by
    rw [← hfried]; field_simp
  rw [this]; ring

/-- `a^{3/2}` written as `a √a`. -/
noncomputable def w (a : ℝ → ℝ) (t : ℝ) : ℝ := a t * Real.sqrt (a t)

/-- Derivative of `a^{3/2}`. -/
theorem aux_deriv (a : ℝ → ℝ) (a' t C : ℝ) (hpos : 0 < a t) (hd : HasDerivAt a a' t)
    (hap : 0 < a') (hC : a' ^ 2 * a t = C) :
    HasDerivAt (w a) (3 / 2 * Real.sqrt C) t := by
  have hs : 0 < Real.sqrt (a t) := Real.sqrt_pos.mpr hpos
  have h := hd.mul (hd.sqrt hpos.ne')
  have hsq : Real.sqrt (a t) ^ 2 = a t := Real.sq_sqrt hpos.le
  have hCs : Real.sqrt C = a' * Real.sqrt (a t) := by
    have : C = (a' * Real.sqrt (a t)) ^ 2 := by rw [← hC]; nlinarith [hsq]
    rw [this]
    exact Real.sqrt_sq (by positivity)
  refine h.congr_deriv ?_
  rw [hCs]
  field_simp
  nlinarith [hsq]

/-- `a^{3/2} = (3/2) √C t`. -/
theorem three_halves_law (a a' : ℝ → ℝ) (C : ℝ)
    (hpos : ∀ t, 0 < t → 0 < a t)
    (hd : ∀ t, 0 < t → HasDerivAt a (a' t) t)
    (hap : ∀ t, 0 < t → 0 < a' t)
    (hC : ∀ t, 0 < t → a' t ^ 2 * a t = C)
    (hcont : ContinuousOn a (Set.Ici 0)) (h0 : a 0 = 0) :
    ∀ t, 0 < t → w a t = 3 / 2 * Real.sqrt C * t := by
  intro t ht
  have hwc : ContinuousOn (w a) (Set.Icc 0 t) := by
    have h1 : ContinuousOn a (Set.Icc 0 t) := hcont.mono Set.Icc_subset_Ici_self
    exact h1.mul (Real.continuous_sqrt.comp_continuousOn h1)
  obtain ⟨c, hc, hslope⟩ := exists_hasDerivAt_eq_slope (w a) (fun _ => 3 / 2 * Real.sqrt C) ht
    hwc (fun x hx => aux_deriv a (a' x) x C (hpos x hx.1) (hd x hx.1) (hap x hx.1) (hC x hx.1))
  have hw0 : w a 0 = 0 := by simp [w, h0]
  rw [hw0] at hslope
  simp only [sub_zero] at hslope
  field_simp at hslope
  linarith

/-- Hubble rate in the dust era: `H = 2 / (3 t)`. -/
theorem hubble_eq (a a' : ℝ → ℝ) (C : ℝ) (hC0 : 0 < C)
    (hpos : ∀ t, 0 < t → 0 < a t)
    (hd : ∀ t, 0 < t → HasDerivAt a (a' t) t)
    (hap : ∀ t, 0 < t → 0 < a' t)
    (hC : ∀ t, 0 < t → a' t ^ 2 * a t = C)
    (hcont : ContinuousOn a (Set.Ici 0)) (h0 : a 0 = 0) :
    ∀ t, 0 < t → a' t / a t = 2 / (3 * t) := by
  intro t ht
  have hw := three_halves_law a a' C hpos hd hap hC hcont h0 t ht
  have hs : 0 < Real.sqrt (a t) := Real.sqrt_pos.mpr (hpos t ht)
  have hsq : Real.sqrt (a t) ^ 2 = a t := Real.sq_sqrt (hpos t ht).le
  have hCs : Real.sqrt C = a' t * Real.sqrt (a t) := by
    have : C = (a' t * Real.sqrt (a t)) ^ 2 := by rw [← hC t ht]; nlinarith [hsq]
    rw [this]
    exact Real.sqrt_sq (by have := hap t ht; positivity)
  have hCp : 0 < Real.sqrt C := Real.sqrt_pos.mpr hC0
  unfold w at hw
  rw [hCs] at hw
  have hat : 0 < a t := hpos t ht
  have hap' : 0 < a' t := hap t ht
  field_simp
  nlinarith [hw, hs, hap', hat]

/-- Age from the Hubble rate: if `H(t₀) = H₀` then `t₀ = 2/(3 H₀)`. -/
theorem age_eq (a a' : ℝ → ℝ) (C t₀ H₀ : ℝ) (hC0 : 0 < C)
    (hpos : ∀ t, 0 < t → 0 < a t)
    (hd : ∀ t, 0 < t → HasDerivAt a (a' t) t)
    (hap : ∀ t, 0 < t → 0 < a' t)
    (hC : ∀ t, 0 < t → a' t ^ 2 * a t = C)
    (hcont : ContinuousOn a (Set.Ici 0)) (h0 : a 0 = 0)
    (ht₀ : 0 < t₀) (hH : H₀ = a' t₀ / a t₀) :
    t₀ = 2 / (3 * H₀) := by
  have h := hubble_eq a a' C hC0 hpos hd hap hC hcont h0 t₀ ht₀
  rw [← hH] at h
  rw [h]
  field_simp

/-- The dust age is shorter than the Hubble time `1/H₀`. -/
theorem age_lt_hubble_time (H₀ : ℝ) (hH : 0 < H₀) : 2 / (3 * H₀) < 1 / H₀ := by
  rw [div_lt_div_iff₀ (by positivity) hH]
  nlinarith

/-- A radiation-era coefficient (`a ∝ t^{1/2}`, `H = 1/(2t)`) is a different number. -/
theorem radiation_coefficient_differs : (2 : ℝ) / 3 ≠ 1 / 2 := by norm_num

end PhysJS.MatterDominatedAge
