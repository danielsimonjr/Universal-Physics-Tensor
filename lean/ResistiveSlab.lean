/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-117`. Bridge. Resistive decay of a slab, with `Rm` and the Lundquist number.

`be-117.lundquist`. Derivation step. `lundquist_ratio`.

Proved under these hypotheses. The magnetic diffusivity is
`η_m = 1 / (μ0 σ)`, and the induction equation has already been reduced
to `∂B/∂t = η_m ∂²B/∂x²`. The fundamental slab mode on a layer of
thickness `L`, vanishing at the endpoints, is
`B = B₀ sin(π x / L) exp(−t/τ)`. Its decay time is
`τ = μ0 σ L² / π²`. The magnetic Reynolds number `Rm = μ0 σ v L` and
the Lundquist number `S = μ0 σ v_A L` are the same diffusivity with a
flow speed and with the Alfvén speed. `S / Rm = v_A / v` when `v ≠ 0`.
A Gaussian fundamental with `4π` in the denominator is not `π²`. This
is not the Reynolds analogy.
-/

namespace PhysJS.ResistiveSlab

noncomputable def slab (B0 L τ x t : ℝ) : ℝ :=
  B0 * Real.sin (Real.pi * x / L) * Real.exp (-t / τ)

lemma sin_slope (L x : ℝ) (hL : L ≠ 0) :
    deriv (fun y => Real.sin (Real.pi * y / L)) x =
      Real.pi / L * Real.cos (Real.pi * x / L) := by
  have hlin : HasDerivAt (fun y => Real.pi * y / L) (Real.pi / L) x := by
    have hmul := (hasDerivAt_id x).const_mul (Real.pi / L)
    simpa [div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using hmul
  rw [hlin.sin.deriv]
  ring

lemma sin_second (L x : ℝ) (hL : L ≠ 0) :
    deriv (fun y => deriv (fun z => Real.sin (Real.pi * z / L)) y) x =
      -(Real.pi / L) ^ 2 * Real.sin (Real.pi * x / L) := by
  have hfun : (fun y => deriv (fun z => Real.sin (Real.pi * z / L)) y) =
      fun y => Real.pi / L * Real.cos (Real.pi * y / L) := by
    funext y
    exact sin_slope L y hL
  rw [congrArg (fun f => deriv f x) hfun]
  have hlin : HasDerivAt (fun y => Real.pi * y / L) (Real.pi / L) x := by
    have hmul := (hasDerivAt_id x).const_mul (Real.pi / L)
    simpa [div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using hmul
  rw [(hlin.cos.const_mul (Real.pi / L)).deriv]
  ring

/-- The slab mode decays at `τ = μ0 σ L² / π²`.

`hη` is the magnetic diffusivity. `hτ` is the fundamental decay time. -/
theorem decay_time (B0 L τ x t μ0 σ η : ℝ)
    (hL : L ≠ 0) (hτ0 : τ ≠ 0) (hμ : μ0 ≠ 0) (hσ : σ ≠ 0)
    (hη : η = 1 / (μ0 * σ))
    (hτ : τ = μ0 * σ * L ^ 2 / Real.pi ^ 2) :
    deriv (fun s => slab B0 L τ x s) t =
      η * deriv (fun y => deriv (fun z => slab B0 L τ z t) y) x := by
  have htime : deriv (fun s => slab B0 L τ x s) t =
      -(1 / τ) * slab B0 L τ x t := by
    unfold slab
    have hlin : HasDerivAt (fun s => -s / τ) (-(1 / τ)) t := by
      have hmul := (hasDerivAt_id t).const_mul (-(1 / τ))
      simpa [div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using hmul
    have hexp := hlin.exp
    have hconst : HasDerivAt (fun _ : ℝ => B0 * Real.sin (Real.pi * x / L)) 0 t :=
      hasDerivAt_const t _
    have hmulD := hconst.mul hexp
    have hpoint : HasDerivAt (fun s => B0 * Real.sin (Real.pi * x / L) * Real.exp (-s / τ))
        (0 * Real.exp (-t / τ) +
          B0 * Real.sin (Real.pi * x / L) * (Real.exp (-t / τ) * -(1 / τ))) t :=
      hmulD.congr_of_eventuallyEq <| Filter.Eventually.of_forall fun s => by
        simp only [Pi.mul_apply]
    have hclean : 0 * Real.exp (-t / τ) +
        B0 * Real.sin (Real.pi * x / L) * (Real.exp (-t / τ) * -(1 / τ)) =
        -(1 / τ) * (B0 * Real.sin (Real.pi * x / L) * Real.exp (-t / τ)) := by ring
    rw [(hpoint.congr_deriv hclean).deriv]
  have hspace : deriv (fun y => deriv (fun z => slab B0 L τ z t) y) x =
      -(Real.pi / L) ^ 2 * slab B0 L τ x t := by
    have hfun : (fun z => slab B0 L τ z t) =
        fun z => (B0 * Real.exp (-t / τ)) * Real.sin (Real.pi * z / L) := by
      funext z
      unfold slab
      ring
    have hfun2 : (fun y => deriv (fun z => slab B0 L τ z t) y) =
        fun y => (B0 * Real.exp (-t / τ)) *
          deriv (fun z => Real.sin (Real.pi * z / L)) y := by
      funext y
      rw [congrArg (fun f => deriv f y) hfun]
      have hsin := sin_slope L y hL
      have hd : DifferentiableAt ℝ (fun z => Real.sin (Real.pi * z / L)) y := by
        have hlin : HasDerivAt (fun z => Real.pi * z / L) (Real.pi / L) y := by
          have hmul := (hasDerivAt_id y).const_mul (Real.pi / L)
          simpa [div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using hmul
        exact hlin.sin.differentiableAt
      rw [deriv_const_mul _ hd, hsin]
    rw [congrArg (fun f => deriv f x) hfun2]
    have hd2 : DifferentiableAt ℝ
        (fun y => deriv (fun z => Real.sin (Real.pi * z / L)) y) x := by
      have hfunS : (fun y => deriv (fun z => Real.sin (Real.pi * z / L)) y) =
          fun y => Real.pi / L * Real.cos (Real.pi * y / L) := by
        funext y
        exact sin_slope L y hL
      rw [hfunS]
      have hlin : HasDerivAt (fun y => Real.pi * y / L) (Real.pi / L) x := by
        have hmul := (hasDerivAt_id x).const_mul (Real.pi / L)
        simpa [div_eq_mul_inv, mul_assoc, mul_left_comm, mul_comm] using hmul
      exact (hlin.cos.const_mul (Real.pi / L)).differentiableAt
    rw [deriv_const_mul _ hd2, sin_second L x hL]
    unfold slab
    ring
  rw [htime, hspace, hη, hτ]
  field_simp [hL, hτ0, hμ, hσ, Real.pi_ne_zero]

/-- `4π` in the denominator is not `π²`. -/
theorem four_pi_not_pi_squared (μ0 σ L : ℝ) (h : μ0 * σ * L ^ 2 ≠ 0) :
    μ0 * σ * L ^ 2 / (4 * Real.pi) ≠ μ0 * σ * L ^ 2 / Real.pi ^ 2 := by
  intro hEq
  have hscaled := congrArg (fun z => z * ((4 * Real.pi) * Real.pi ^ 2)) hEq
  have hclear : (μ0 * σ * L ^ 2) * Real.pi ^ 2 =
      (μ0 * σ * L ^ 2) * (4 * Real.pi) := by
    convert hscaled using 1 <;> field_simp [h, Real.pi_ne_zero]
  have hpiEq : Real.pi ^ 2 = 4 * Real.pi := mul_left_cancel₀ h hclear
  have hlt : Real.pi ^ 2 < 4 * Real.pi := by
    have hmul := mul_lt_mul_of_pos_right Real.pi_lt_four Real.pi_pos
    simpa [pow_two] using hmul
  linarith

/-- Lundquist number over magnetic Reynolds number. -/
theorem lundquist_ratio (Rm S μ0 σ v vA L : ℝ) (hv : v ≠ 0) (hμ : μ0 ≠ 0) (hσ : σ ≠ 0)
    (hL : L ≠ 0)
    (hRm : Rm = μ0 * σ * v * L)
    (hS : S = μ0 * σ * vA * L) :
    S / Rm = vA / v := by
  rw [hRm, hS]
  field_simp [hv, hμ, hσ, hL]

end PhysJS.ResistiveSlab
