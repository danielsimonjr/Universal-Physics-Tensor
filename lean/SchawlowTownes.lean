/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-233`. Bridge. Schawlow-Townes laser linewidth.

The catalog equation is

```
Δν = π h ν (Δν_c)² / P
```

`linewidth_eq` derives it from a phase-diffusion model. With `N` photons
in the mode the output power is `P = N h ν γ`, where `γ = 2π Δν_c` is the
energy decay rate of the passive cavity (`Δν_c` its full width in Hz).
Spontaneous emission into the mode occurs at the rate `R_sp = n_sp γ`; at
full inversion `n_sp = 1`. Each event adds a unit-amplitude phasor with
uniformly random phase `χ` to a field of amplitude `√N`, rotating the field
phase by `Δφ ≈ sin χ / √N`. Its mean square is `m / N` with
`m = (1/2π) ∫₀^{2π} sin² χ dχ = 1/2` (`meanSinSq_eq`). The phase variance
grows at `V = R_sp m / N`, the field correlation decays as `exp(−V t/2)`
and the Lorentzian full width in Hz is `Δν = V / (2π)`. Substituting gives
`Δν = 2π m n_sp h ν (Δν_c)² / P`, which is the catalog form for `m = 1/2`,
`n_sp = 1`.

Scope. The coefficient is model dependent: the literature quotes forms
differing by a factor of 2, depending on whether the output power, the
intracavity power or the energy decay rate is used and on the treatment of
the spontaneous-emission phasor. `coefficient_not_fixed` shows that a
different per-event phase variance `m` rescales the result, so the
coefficient is a premise of the stated model and not a unit consequence.
This file does not derive the model from quantum noise theory. It is an
ideal four-level, single-mode, above-threshold statement.
-/

namespace PhysJS.SchawlowTownes

open Real MeasureTheory intervalIntegral

/-- Mean square of `sin χ` over a uniformly random phase. -/
noncomputable def meanSinSq : ℝ :=
  (1 / (2 * π)) * ∫ x in (0 : ℝ)..(2 * π), sin x ^ 2

/-- The phase average of `sin²` is `1/2`. -/
theorem meanSinSq_eq : meanSinSq = 1 / 2 := by
  unfold meanSinSq
  rw [integral_sin_sq]
  simp only [sin_zero, cos_zero, mul_one, sin_two_pi, cos_two_pi,
    sub_zero, zero_add]
  field_simp

/-- Linewidth for a general per-event phase variance `m / N`. -/
theorem linewidth_general (hpl ν Δνc P N γ Rsp nsp m V Δν : ℝ)
    (hP : 0 < P) (hN : 0 < N) (hγ : γ = 2 * π * Δνc)
    (hpow : P = N * hpl * ν * γ) (hR : Rsp = nsp * γ)
    (hV : V = Rsp * (m / N)) (hΔ : Δν = V / (2 * π)) :
    Δν = 2 * π * m * nsp * hpl * ν * Δνc ^ 2 / P := by
  have hpi : 0 < π := Real.pi_pos
  have hP' : P ≠ 0 := hP.ne'
  have hN' : N ≠ 0 := hN.ne'
  have h1 : hpl ≠ 0 := by
    intro h0
    apply hP'
    rw [hpow, h0]
    ring
  have h2 : ν ≠ 0 := by
    intro h0
    apply hP'
    rw [hpow, h0]
    ring
  have h3 : γ ≠ 0 := by
    intro h0
    apply hP'
    rw [hpow, h0]
    ring
  have hΔc : Δνc ≠ 0 := by
    intro h0
    apply h3
    rw [hγ, h0]
    ring
  rw [hΔ, hV, hR, hpow, hγ]
  field_simp

/-- Schawlow-Townes linewidth at full inversion, `m = 1/2`.

`hm` is the phase average of `sin²`, taken from `meanSinSq`.

Not a
quantum-noise derivation of the model, and the coefficient is that of the
stated phase-diffusion model. -/
theorem linewidth_eq (hpl ν Δνc P N γ Rsp m V Δν : ℝ)
    (hP : 0 < P) (hN : 0 < N) (hγ : γ = 2 * π * Δνc)
    (hpow : P = N * hpl * ν * γ) (hR : Rsp = 1 * γ)
    (hm : m = meanSinSq)
    (hV : V = Rsp * (m / N)) (hΔ : Δν = V / (2 * π)) :
    Δν = π * hpl * ν * Δνc ^ 2 / P := by
  have h := linewidth_general hpl ν Δνc P N γ Rsp 1 m V Δν hP hN hγ hpow hR hV hΔ
  rw [h, hm, meanSinSq_eq]
  ring

/-- A different per-event phase variance rescales the linewidth: `m = 1`
gives twice the `m = 1/2` value. -/
theorem coefficient_not_fixed (hpl ν Δνc P : ℝ) (hP : 0 < P) (hh : 0 < hpl)
    (hν : 0 < ν) (hΔ : 0 < Δνc) :
    2 * π * 1 * 1 * hpl * ν * Δνc ^ 2 / P ≠
      2 * π * (1 / 2) * 1 * hpl * ν * Δνc ^ 2 / P := by
  intro h
  have hpi : 0 < π := Real.pi_pos
  have hpos : 0 < π * hpl * ν * Δνc ^ 2 / P := by positivity
  have : 2 * π * 1 * 1 * hpl * ν * Δνc ^ 2 / P =
      2 * (π * hpl * ν * Δνc ^ 2 / P) := by ring
  have h2 : 2 * π * (1 / 2) * 1 * hpl * ν * Δνc ^ 2 / P =
      π * hpl * ν * Δνc ^ 2 / P := by ring
  rw [this, h2] at h
  linarith

/-- The linewidth scales as `Δν_c²`: halving the cavity width divides the
linewidth by 4, so an exponent of 1 is wrong. -/
theorem exponent_two (hpl ν Δνc P : ℝ) (hP : 0 < P) :
    π * hpl * ν * (Δνc / 2) ^ 2 / P = (π * hpl * ν * Δνc ^ 2 / P) / 4 := by
  field_simp
  ring

end PhysJS.SchawlowTownes
