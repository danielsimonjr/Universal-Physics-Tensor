/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import lean.CoaxialCapacitance

/-!
`be-175`. Bridge. Coaxial characteristic impedance.

The catalog equation is

```
Z₀ = √(L' / C') = (1 / 2π) √(μ / ε) ln(b / a)
```

for a lossless, uniform, TEM coaxial line with inner radius `a` and outer
radius `b`. `impedance_from_gauss` derives it from three steps.

1. Inductance per length. Ampère gives `B = μ I / (2π r)`. The flux per
   length between the conductors is `∫_a^b B dr = (μ I / 2π) ln(b/a)`, so
   `L' = (μ / 2π) ln(b/a)` (`flux_per_length`).
2. Capacitance per length is `C' = 2π ε / ln(b/a)`, taken from `be-132`
   (`PhysJS.CoaxialCapacitance`).
3. Telegrapher equations `∂V/∂z = −L' ∂I/∂t`, `∂I/∂z = −C' ∂V/∂t`. A
   forward wave `V = f(t − z/v)`, `I = V / Z₀` with `f' ≠ 0` matches
   coefficients to `Z₀ = L' v` and `1 = C' v Z₀`, so `Z₀² = L' / C'`
   (`impedance_sq`). Also `L' C' = μ ε`, so the phase speed is
   `1 / √(μ ε)` whatever the geometry (`lc_product`).

`vacuum_form` writes `Z₀` with the wave impedance of the medium:
`Z₀ = (Z_w / 2π) ln(b/a)`, `Z_w = √(μ/ε)`. The decimal `59.96 Ω` is not
evaluated here. `dropping_two_pi` separates `Z₀` without the `2π`.
Premises: lossless, TEM, uniform, `a < b`. This is not the microstrip or
twin-lead line.
-/

namespace PhysJS.CoaxialImpedance

open intervalIntegral

/-- Flux per length of the Ampère field between the conductors. -/
theorem flux_per_length (a b μ I : ℝ) (ha : 0 < a) (hb : 0 < b) :
    (∫ r in a..b, μ * I / (2 * Real.pi * r)) =
      (μ * I / (2 * Real.pi)) * Real.log (b / a) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hcoef : ∀ r, μ * I / (2 * Real.pi * r) = (μ * I / (2 * Real.pi)) * (1 / r) := by
    intro r
    by_cases hr : r = 0
    · simp [hr]
    · field_simp [hπ, hr]
  rw [integral_congr (fun r _ => hcoef r), integral_const_mul, integral_one_div_of_pos ha hb]

/-- Telegrapher coefficient matching for a forward wave.

`f'` is the derivative of the waveform at a point where it is nonzero.
`hV` matches `∂V/∂z = −L' ∂I/∂t`; `hI` matches `∂I/∂z = −C' ∂V/∂t`. -/
theorem impedance_sq (L' C' v Z f' : ℝ) (hv : v ≠ 0) (hZ : Z ≠ 0) (hf : f' ≠ 0)
    (hV : -(f' / v) = -(L' * (f' / Z)))
    (hI : -(f' / (v * Z)) = -(C' * f')) :
    Z = L' * v ∧ C' * v * Z = 1 ∧ Z ^ 2 * C' = L' := by
  have h1 : Z = L' * v := by
    field_simp at hV
    linarith
  have h2 : C' * v * Z = 1 := by
    field_simp at hI
    linarith
  refine ⟨h1, h2, ?_⟩
  have hC : C' ≠ 0 := by
    intro h
    rw [h] at h2
    simp at h2
  have : Z ^ 2 * C' = Z * (C' * v * Z) / v := by field_simp
  rw [this, h2, h1]
  field_simp

/-- The product `L' C'` is `μ ε`, independent of `a` and `b`. -/
theorem lc_product (a b μ ε : ℝ) (ha : 0 < a) (hb : 0 < b) (hab : a ≠ b) (hε : 0 < ε) :
    (μ / (2 * Real.pi) * Real.log (b / a)) * (2 * Real.pi * ε / Real.log (b / a)) = μ * ε := by
  have hlog : Real.log (b / a) ≠ 0 := by
    intro hzero
    have hrev := congrArg Real.exp hzero
    rw [Real.exp_log (div_pos hb ha), Real.exp_zero] at hrev
    have hb_eq : b = a := by
      field_simp [ha.ne'] at hrev
      linarith
    exact hab hb_eq.symm
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp

/-- Characteristic impedance of the coaxial line.

`hL` is `L' = Φ / I` with the flux from the Ampère field. `hC` is the
`be-132` capacitance per length. `hZ` is the wave relation `Z₀² C' = L'`
(`impedance_sq`), with `Z₀ > 0`.

`impedance_eq` is the same with `C'` assumed. Not a
lossy line, and not the decimal `59.96 Ω`. -/
theorem impedance_eq (a b μ ε I Φ L' C' Z : ℝ)
    (ha : 0 < a) (hb : 0 < b) (hab : a < b) (hμ : 0 < μ) (hε : 0 < ε) (hI : I ≠ 0)
    (hΦ : Φ = ∫ r in a..b, μ * I / (2 * Real.pi * r))
    (hL : L' = Φ / I) (hC : C' = 2 * Real.pi * ε / Real.log (b / a))
    (hZpos : 0 < Z) (hZ : Z ^ 2 * C' = L') :
    L' = μ / (2 * Real.pi) * Real.log (b / a) ∧
      Z = Real.sqrt (L' / C') ∧
      Z = (1 / (2 * Real.pi)) * Real.sqrt (μ / ε) * Real.log (b / a) := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hlogpos : 0 < Real.log (b / a) := Real.log_pos ((one_lt_div ha).mpr hab)
  have hL' : L' = μ / (2 * Real.pi) * Real.log (b / a) := by
    rw [hL, hΦ, flux_per_length a b μ I ha hb]
    field_simp
  have hCpos : 0 < C' := by rw [hC]; positivity
  have hLC : L' / C' = Z ^ 2 := by
    rw [← hZ]
    field_simp
  have hZs : Z = Real.sqrt (L' / C') := by
    rw [hLC, Real.sqrt_sq hZpos.le]
  refine ⟨hL', hZs, ?_⟩
  have hLC2 : L' / C' = ((1 / (2 * Real.pi)) * Real.sqrt (μ / ε) * Real.log (b / a)) ^ 2 := by
    rw [hL', hC, mul_pow, mul_pow, Real.sq_sqrt (div_pos hμ hε).le]
    field_simp
  rw [hZs, hLC2, Real.sqrt_sq (by positivity)]

/-- With the wave impedance `Z_w = √(μ/ε)` of the medium. -/
theorem vacuum_form (a b μ ε Z : ℝ) (hπ : Real.pi ≠ 0)
    (hZ : Z = (1 / (2 * Real.pi)) * Real.sqrt (μ / ε) * Real.log (b / a)) :
    Z = Real.sqrt (μ / ε) / (2 * Real.pi) * Real.log (b / a) := by
  rw [hZ]
  field_simp

/-- Without the `2π` the impedance is different, for `ln(b/a) ≠ 0`. -/
theorem dropping_two_pi (μ ε r : ℝ) (hμ : 0 < μ) (hε : 0 < ε) (hr : r ≠ 0) :
    Real.sqrt (μ / ε) * r ≠ (1 / (2 * Real.pi)) * Real.sqrt (μ / ε) * r := by
  intro h
  have hs : 0 < Real.sqrt (μ / ε) := Real.sqrt_pos.mpr (div_pos hμ hε)
  have hπ : 0 < Real.pi := Real.pi_pos
  have h' : Real.sqrt (μ / ε) * r * (1 - 1 / (2 * Real.pi)) = 0 := by linarith
  have hpi3 : 3 < Real.pi := Real.pi_gt_three
  have hfac : 1 - 1 / (2 * Real.pi) ≠ 0 := by
    have : 1 / (2 * Real.pi) < 1 := by
      rw [div_lt_one (by positivity)]
      linarith
    linarith
  rcases mul_eq_zero.mp h' with h1 | h1
  · rcases mul_eq_zero.mp h1 with h2 | h2
    · exact hs.ne' h2
    · exact hr h2
  · exact hfac h1

/-- The same, with `C'` derived from the Gauss field by `be-132`
(`PhysJS.CoaxialCapacitance.capacitance_per_length`) instead of assumed. -/
theorem impedance_from_gauss (a b μ ε I Φ lam V L' C' Z : ℝ)
    (ha : 0 < a) (hb : 0 < b) (hab : a < b) (hμ : 0 < μ) (hε : 0 < ε) (hI : I ≠ 0)
    (hlam : lam ≠ 0)
    (hΦ : Φ = ∫ r in a..b, μ * I / (2 * Real.pi * r))
    (hL : L' = Φ / I)
    (hV : V = ∫ r in a..b, lam / (2 * Real.pi * ε * r)) (hC : C' = lam / V)
    (hZpos : 0 < Z) (hZ : Z ^ 2 * C' = L') :
    Z = (1 / (2 * Real.pi)) * Real.sqrt (μ / ε) * Real.log (b / a) := by
  have hC' := PhysJS.CoaxialCapacitance.capacitance_per_length a b lam ε V C' ha hb hab.ne
    hε.ne' hlam hV hC
  exact (impedance_eq a b μ ε I Φ L' C' Z ha hb hab hμ hε hI hΦ hL hC' hZpos hZ).2.2

end PhysJS.CoaxialImpedance
