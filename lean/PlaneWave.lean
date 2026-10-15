/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Complex.RealDeriv
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv

/-!
Plane-wave calculus for rank 1a.

A monochromatic wave solves the linear constant-coefficient PDE if and only if
its frequency and wavenumber obey that PDE's dispersion relation. The zero wave
solves every linear equation and does not determine the frequency, so each
equivalence assumes the wave is not identically zero.

These lemmas derive the dispersion relation from the PDE. They do not compare
two dispersion relations, and they do not prove an approximation bound.
-/

namespace PhysJS.PlaneWave

open scoped ComplexConjugate
open Real Complex Filter

/-- Replace both the differentiated function and the derivative value. -/
lemma hasDerivAt_eq {f g : ℝ → ℝ} {f' g' x : ℝ} (h : HasDerivAt f f' x)
    (hfg : ∀ y, g y = f y) (hd : f' = g') : HasDerivAt g g' x :=
  (h.congr_of_eventuallyEq (Eventually.of_forall hfg)).congr_deriv hd

/-- The same replacement for a curve `ℝ → ℂ`. -/
lemma hasDerivAt_eq_ℂ {f g : ℝ → ℂ} {f' g' : ℂ} {x : ℝ} (h : HasDerivAt f f' x)
    (hfg : ∀ y, g y = f y) (hd : f' = g') : HasDerivAt g g' x :=
  (h.congr_of_eventuallyEq (Eventually.of_forall hfg)).congr_deriv hd

/-- Real monochromatic plane wave `A cos(kx − ωt + φ)`. -/
noncomputable def planeWave (A k ω φ x t : ℝ) : ℝ :=
  A * Real.cos (k * x - ω * t + φ)

/-- Real Fourier mode `A exp(σ t) cos(qx + φ)`, the decay ansatz. -/
noncomputable def decayMode (A σ q φ x t : ℝ) : ℝ :=
  A * Real.exp (σ * t) * Real.cos (q * x + φ)

/-- Damped oscillation `A exp(−β t) cos(ωt − qx + φ)`. -/
noncomputable def oscMode (A β ω q φ x t : ℝ) : ℝ :=
  A * Real.exp (-β * t) * Real.cos (ω * t - q * x + φ)

/-- The sine companion of `oscMode`, with the same amplitude and decay. -/
noncomputable def oscSin (A β ω q φ x t : ℝ) : ℝ :=
  A * Real.exp (-β * t) * Real.sin (ω * t - q * x + φ)

/-- Complex plane wave `A exp(i(kx − ωt))`. -/
noncomputable def cPlane (A : ℂ) (k ω x t : ℝ) : ℂ :=
  A * Complex.exp (Complex.I * ↑(k * x - ω * t))

/-- Second time derivative. -/
noncomputable def timeSecond (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun s => deriv (fun s => u x s) s) t

/-- Second space derivative. -/
noncomputable def spaceSecond (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun y => deriv (fun y => u y t) y) x

/-- Fourth space derivative. -/
noncomputable def spaceFourth (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun y => deriv (fun y => spaceSecond u y t) y) x

/-- First time derivative. -/
noncomputable def timeFirst (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun s => u x s) t

lemma hasDerivAt_linear (a b t : ℝ) : HasDerivAt (fun s => a * s + b) a t := by
  have h := ((hasDerivAt_id' t).const_mul a).add_const b
  exact h.congr_deriv (by ring)

lemma coeff_of_not_identically_zero {c : ℝ} {u : ℝ → ℝ → ℝ}
    (h : ∀ x t, c * u x t = 0) (hnt : ∃ x t, u x t ≠ 0) : c = 0 := by
  obtain ⟨x, t, hxt⟩ := hnt
  exact (mul_eq_zero.mp (h x t)).resolve_right hxt

/-! ## Real plane wave -/

lemma hasDerivAt_planeWave_time (A k ω φ x t : ℝ) :
    HasDerivAt (fun s => planeWave A k ω φ x s) (A * ω * Real.sin (k * x - ω * t + φ)) t := by
  unfold planeWave
  have hlin := hasDerivAt_linear (-ω) (k * x + φ) t
  refine hasDerivAt_eq ((hlin.cos.const_mul A)) ?_ ?_
  · intro s
    apply congrArg (fun z => A * Real.cos z)
    ring
  · have harg : -ω * t + (k * x + φ) = k * x - ω * t + φ := by ring
    rw [harg]
    ring

lemma deriv_planeWave_time (A k ω φ x t : ℝ) :
    deriv (fun s => planeWave A k ω φ x s) t = A * ω * Real.sin (k * x - ω * t + φ) :=
  (hasDerivAt_planeWave_time A k ω φ x t).deriv

lemma hasDerivAt_planeWave_time_formula (A k ω φ x t : ℝ) :
    HasDerivAt (fun s => A * ω * Real.sin (k * x - ω * s + φ))
      (-(A * ω ^ 2 * Real.cos (k * x - ω * t + φ))) t := by
  have hlin := hasDerivAt_linear (-ω) (k * x + φ) t
  refine hasDerivAt_eq ((hlin.sin.const_mul (A * ω))) ?_ ?_
  · intro s
    apply congrArg (fun z => A * ω * Real.sin z)
    ring
  · have harg : -ω * t + (k * x + φ) = k * x - ω * t + φ := by ring
    rw [harg]
    ring

lemma timeSecond_planeWave (A k ω φ x t : ℝ) :
    timeSecond (planeWave A k ω φ) x t = -(ω ^ 2) * planeWave A k ω φ x t := by
  have hfun : (fun s => deriv (fun r => planeWave A k ω φ x r) s) =
      fun s => A * ω * Real.sin (k * x - ω * s + φ) := by
    funext s
    exact deriv_planeWave_time A k ω φ x s
  unfold timeSecond
  rw [hfun]
  rw [(hasDerivAt_planeWave_time_formula A k ω φ x t).deriv]
  unfold planeWave
  ring

lemma hasDerivAt_planeWave_space (A k ω φ t x : ℝ) :
    HasDerivAt (fun y => planeWave A k ω φ y t) (-(A * k * Real.sin (k * x - ω * t + φ))) x := by
  unfold planeWave
  have hlin := hasDerivAt_linear k (-ω * t + φ) x
  refine hasDerivAt_eq ((hlin.cos.const_mul A)) ?_ ?_
  · intro y
    apply congrArg (fun z => A * Real.cos z)
    ring
  · have harg : k * x + (-ω * t + φ) = k * x - ω * t + φ := by ring
    rw [harg]
    ring

lemma deriv_planeWave_space (A k ω φ t x : ℝ) :
    deriv (fun y => planeWave A k ω φ y t) x = -(A * k * Real.sin (k * x - ω * t + φ)) :=
  (hasDerivAt_planeWave_space A k ω φ t x).deriv

lemma hasDerivAt_planeWave_space_formula (A k ω φ t x : ℝ) :
    HasDerivAt (fun y => -(A * k * Real.sin (k * y - ω * t + φ)))
      (-(A * k ^ 2 * Real.cos (k * x - ω * t + φ))) x := by
  have hlin := hasDerivAt_linear k (-ω * t + φ) x
  refine hasDerivAt_eq ((hlin.sin.const_mul (-(A * k)))) ?_ ?_
  · intro y
    have harg : k * y + (-ω * t + φ) = k * y - ω * t + φ := by ring
    rw [harg]
    ring
  · have harg : k * x + (-ω * t + φ) = k * x - ω * t + φ := by ring
    rw [harg]
    ring

lemma spaceSecond_planeWave (A k ω φ x t : ℝ) :
    spaceSecond (planeWave A k ω φ) x t = -(k ^ 2) * planeWave A k ω φ x t := by
  have hfun : (fun y => deriv (fun z => planeWave A k ω φ z t) y) =
      fun y => -(A * k * Real.sin (k * y - ω * t + φ)) := by
    funext y
    exact deriv_planeWave_space A k ω φ t y
  unfold spaceSecond
  rw [hfun]
  rw [(hasDerivAt_planeWave_space_formula A k ω φ t x).deriv]
  unfold planeWave
  ring

lemma spaceSecond_eq_scaled_planeWave (A k ω φ t : ℝ) :
    (fun y => spaceSecond (planeWave A k ω φ) y t) =
      fun y => planeWave (-(A * k ^ 2)) k ω φ y t := by
  funext y
  rw [spaceSecond_planeWave]
  unfold planeWave
  ring

lemma spaceFourth_planeWave (A k ω φ x t : ℝ) :
    spaceFourth (planeWave A k ω φ) x t = k ^ 4 * planeWave A k ω φ x t := by
  unfold spaceFourth
  rw [spaceSecond_eq_scaled_planeWave]
  change spaceSecond (planeWave (-(A * k ^ 2)) k ω φ) x t = _
  rw [spaceSecond_planeWave]
  unfold planeWave
  ring

lemma wave_residual (A k ω φ c x t : ℝ) :
    timeSecond (planeWave A k ω φ) x t - c ^ 2 * spaceSecond (planeWave A k ω φ) x t =
      (c ^ 2 * k ^ 2 - ω ^ 2) * planeWave A k ω φ x t := by
  rw [timeSecond_planeWave, spaceSecond_planeWave]
  ring

lemma kg_residual (A k ω φ c ω0 x t : ℝ) :
    timeSecond (planeWave A k ω φ) x t - c ^ 2 * spaceSecond (planeWave A k ω φ) x t
      + ω0 ^ 2 * planeWave A k ω φ x t =
      (c ^ 2 * k ^ 2 + ω0 ^ 2 - ω ^ 2) * planeWave A k ω φ x t := by
  rw [timeSecond_planeWave, spaceSecond_planeWave]
  ring

lemma stiff_residual (A k ω φ μ F EI x t : ℝ) :
    μ * timeSecond (planeWave A k ω φ) x t
      - (F * spaceSecond (planeWave A k ω φ) x t
          - EI * spaceFourth (planeWave A k ω φ) x t) =
      (F * k ^ 2 + EI * k ^ 4 - μ * ω ^ 2) * planeWave A k ω φ x t := by
  rw [timeSecond_planeWave, spaceSecond_planeWave, spaceFourth_planeWave]
  ring

lemma string_residual (A k ω φ μ F x t : ℝ) :
    μ * timeSecond (planeWave A k ω φ) x t - F * spaceSecond (planeWave A k ω φ) x t =
      (F * k ^ 2 - μ * ω ^ 2) * planeWave A k ω φ x t := by
  rw [timeSecond_planeWave, spaceSecond_planeWave]
  ring

/-! ## Decay mode -/

lemma hasDerivAt_decayMode_time (A σ q φ x t : ℝ) :
    HasDerivAt (fun s => decayMode A σ q φ x s) (σ * decayMode A σ q φ x t) t := by
  unfold decayMode
  have hexp : HasDerivAt (fun s => Real.exp (σ * s)) (σ * Real.exp (σ * t)) t := by
    have hlin := hasDerivAt_linear σ 0 t
    refine hasDerivAt_eq (hlin.exp) ?_ ?_
    · intro s
      apply congrArg Real.exp
      ring
    · have : σ * t + 0 = σ * t := by ring
      rw [this]
      ring
  have hcos : HasDerivAt (fun _ : ℝ => Real.cos (q * x + φ)) 0 t := hasDerivAt_const t _
  refine hasDerivAt_eq (((hexp.mul hcos).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma deriv_decayMode_time (A σ q φ x t : ℝ) :
    timeFirst (decayMode A σ q φ) x t = σ * decayMode A σ q φ x t := by
  unfold timeFirst
  exact (hasDerivAt_decayMode_time A σ q φ x t).deriv

lemma timeSecond_decayMode (A σ q φ x t : ℝ) :
    timeSecond (decayMode A σ q φ) x t = σ ^ 2 * decayMode A σ q φ x t := by
  have hfun : (fun s => deriv (fun r => decayMode A σ q φ x r) s) =
      fun s => σ * decayMode A σ q φ x s := by
    funext s
    simpa [timeFirst] using deriv_decayMode_time A σ q φ x s
  unfold timeSecond
  rw [hfun]
  have h := (hasDerivAt_decayMode_time A σ q φ x t).const_mul σ
  rw [h.deriv]
  ring

lemma hasDerivAt_decayMode_space (A σ q φ t x : ℝ) :
    HasDerivAt (fun y => decayMode A σ q φ y t)
      (-(q * A * Real.exp (σ * t) * Real.sin (q * x + φ))) x := by
  unfold decayMode
  have hexp : HasDerivAt (fun _ : ℝ => Real.exp (σ * t)) 0 x := hasDerivAt_const x _
  have hcos : HasDerivAt (fun y => Real.cos (q * y + φ)) (-(q * Real.sin (q * x + φ))) x := by
    have hlin := hasDerivAt_linear q φ x
    exact hlin.cos.congr_deriv (by ring)
  refine hasDerivAt_eq (((hexp.mul hcos).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma deriv_decayMode_space (A σ q φ t x : ℝ) :
    deriv (fun y => decayMode A σ q φ y t) x =
      -(q * A * Real.exp (σ * t) * Real.sin (q * x + φ)) :=
  (hasDerivAt_decayMode_space A σ q φ t x).deriv

lemma hasDerivAt_decayMode_space_formula (A σ q φ t x : ℝ) :
    HasDerivAt (fun y => -(q * A * Real.exp (σ * t) * Real.sin (q * y + φ)))
      (-(q ^ 2) * decayMode A σ q φ x t) x := by
  have hlin := hasDerivAt_linear q φ x
  refine hasDerivAt_eq ((hlin.sin.const_mul (-(q * A * Real.exp (σ * t))))) ?_ ?_
  · intro _
    ring
  · unfold decayMode
    ring

lemma spaceSecond_decayMode (A σ q φ x t : ℝ) :
    spaceSecond (decayMode A σ q φ) x t = -(q ^ 2) * decayMode A σ q φ x t := by
  have hfun : (fun y => deriv (fun z => decayMode A σ q φ z t) y) =
      fun y => -(q * A * Real.exp (σ * t) * Real.sin (q * y + φ)) := by
    funext y
    exact deriv_decayMode_space A σ q φ t y
  unfold spaceSecond
  rw [hfun]
  rw [(hasDerivAt_decayMode_space_formula A σ q φ t x).deriv]

lemma telegraph_decay_residual (A σ q φ τ D x t : ℝ) :
    τ * timeSecond (decayMode A σ q φ) x t + timeFirst (decayMode A σ q φ) x t
      - D * spaceSecond (decayMode A σ q φ) x t =
      (τ * σ ^ 2 + σ + D * q ^ 2) * decayMode A σ q φ x t := by
  rw [timeSecond_decayMode, deriv_decayMode_time, spaceSecond_decayMode]
  ring

lemma fick_residual (A σ q φ D x t : ℝ) :
    timeFirst (decayMode A σ q φ) x t - D * spaceSecond (decayMode A σ q φ) x t =
      (σ + D * q ^ 2) * decayMode A σ q φ x t := by
  rw [deriv_decayMode_time, spaceSecond_decayMode]
  ring

/-! ## Damped oscillation -/

lemma hasDerivAt_oscMode_time (A β ω q φ x t : ℝ) :
    HasDerivAt (fun s => oscMode A β ω q φ x s)
      (-β * oscMode A β ω q φ x t - ω * oscSin A β ω q φ x t) t := by
  unfold oscMode oscSin
  have hexp : HasDerivAt (fun s => Real.exp (-β * s)) (-β * Real.exp (-β * t)) t := by
    have hlin := hasDerivAt_linear (-β) 0 t
    refine hasDerivAt_eq (hlin.exp) ?_ ?_
    · intro s
      apply congrArg Real.exp
      ring
    · have : -β * t + 0 = -β * t := by ring
      rw [this]
      ring
  have hcos : HasDerivAt (fun s => Real.cos (ω * s - q * x + φ))
      (-(ω * Real.sin (ω * t - q * x + φ))) t := by
    have hlin := hasDerivAt_linear ω (-q * x + φ) t
    refine hasDerivAt_eq (hlin.cos) ?_ ?_
    · intro s
      apply congrArg Real.cos
      ring
    · have harg : ω * t + (-q * x + φ) = ω * t - q * x + φ := by ring
      rw [harg]
      ring
  refine hasDerivAt_eq (((hexp.mul hcos).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma hasDerivAt_oscSin_time (A β ω q φ x t : ℝ) :
    HasDerivAt (fun s => oscSin A β ω q φ x s)
      (-β * oscSin A β ω q φ x t + ω * oscMode A β ω q φ x t) t := by
  unfold oscMode oscSin
  have hexp : HasDerivAt (fun s => Real.exp (-β * s)) (-β * Real.exp (-β * t)) t := by
    have hlin := hasDerivAt_linear (-β) 0 t
    refine hasDerivAt_eq (hlin.exp) ?_ ?_
    · intro s
      apply congrArg Real.exp
      ring
    · have : -β * t + 0 = -β * t := by ring
      rw [this]
      ring
  have hsin : HasDerivAt (fun s => Real.sin (ω * s - q * x + φ))
      (ω * Real.cos (ω * t - q * x + φ)) t := by
    have hlin := hasDerivAt_linear ω (-q * x + φ) t
    refine hasDerivAt_eq (hlin.sin) ?_ ?_
    · intro s
      apply congrArg Real.sin
      ring
    · have harg : ω * t + (-q * x + φ) = ω * t - q * x + φ := by ring
      rw [harg]
      ring
  refine hasDerivAt_eq (((hexp.mul hsin).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma deriv_oscMode_time (A β ω q φ x t : ℝ) :
    timeFirst (oscMode A β ω q φ) x t =
      -β * oscMode A β ω q φ x t - ω * oscSin A β ω q φ x t := by
  unfold timeFirst
  exact (hasDerivAt_oscMode_time A β ω q φ x t).deriv

lemma hasDerivAt_oscMode_time₂ (A β ω q φ x t : ℝ) :
    HasDerivAt (fun s => -β * oscMode A β ω q φ x s - ω * oscSin A β ω q φ x s)
      ((β ^ 2 - ω ^ 2) * oscMode A β ω q φ x t + (2 * β * ω) * oscSin A β ω q φ x t) t := by
  have h1 := (hasDerivAt_oscMode_time A β ω q φ x t).const_mul (-β)
  have h2 := (hasDerivAt_oscSin_time A β ω q φ x t).const_mul (-ω)
  refine hasDerivAt_eq ((h1.add h2)) ?_ ?_
  · intro _
    simp only [Pi.add_apply]
    ring
  · ring

lemma timeSecond_oscMode (A β ω q φ x t : ℝ) :
    timeSecond (oscMode A β ω q φ) x t =
      (β ^ 2 - ω ^ 2) * oscMode A β ω q φ x t + (2 * β * ω) * oscSin A β ω q φ x t := by
  have hfun : (fun s => deriv (fun r => oscMode A β ω q φ x r) s) =
      fun s => -β * oscMode A β ω q φ x s - ω * oscSin A β ω q φ x s := by
    funext s
    simpa [timeFirst] using deriv_oscMode_time A β ω q φ x s
  unfold timeSecond
  rw [hfun]
  exact (hasDerivAt_oscMode_time₂ A β ω q φ x t).deriv

lemma hasDerivAt_oscMode_space (A β ω q φ t x : ℝ) :
    HasDerivAt (fun y => oscMode A β ω q φ y t) (q * oscSin A β ω q φ x t) x := by
  unfold oscMode oscSin
  have hexp : HasDerivAt (fun _ : ℝ => Real.exp (-β * t)) 0 x := hasDerivAt_const x _
  have hcos : HasDerivAt (fun y => Real.cos (ω * t - q * y + φ))
      (q * Real.sin (ω * t - q * x + φ)) x := by
    have hlin := hasDerivAt_linear (-q) (ω * t + φ) x
    refine hasDerivAt_eq (hlin.cos) ?_ ?_
    · intro y
      apply congrArg Real.cos
      ring
    · have harg : -q * x + (ω * t + φ) = ω * t - q * x + φ := by ring
      rw [harg]
      ring
  refine hasDerivAt_eq (((hexp.mul hcos).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma hasDerivAt_oscSin_space (A β ω q φ t x : ℝ) :
    HasDerivAt (fun y => oscSin A β ω q φ y t) (-q * oscMode A β ω q φ x t) x := by
  unfold oscMode oscSin
  have hexp : HasDerivAt (fun _ : ℝ => Real.exp (-β * t)) 0 x := hasDerivAt_const x _
  have hsin : HasDerivAt (fun y => Real.sin (ω * t - q * y + φ))
      (-q * Real.cos (ω * t - q * x + φ)) x := by
    have hlin := hasDerivAt_linear (-q) (ω * t + φ) x
    refine hasDerivAt_eq (hlin.sin) ?_ ?_
    · intro y
      apply congrArg Real.sin
      ring
    · have harg : -q * x + (ω * t + φ) = ω * t - q * x + φ := by ring
      rw [harg]
      ring
  refine hasDerivAt_eq (((hexp.mul hsin).const_mul A)) ?_ ?_
  · intro _
    simp only [Pi.mul_apply]
    ring
  · ring

lemma deriv_oscSin_space (A β ω q φ t x : ℝ) :
    deriv (fun y => oscSin A β ω q φ y t) x = -q * oscMode A β ω q φ x t :=
  (hasDerivAt_oscSin_space A β ω q φ t x).deriv

lemma deriv_oscMode_space (A β ω q φ t x : ℝ) :
    deriv (fun y => oscMode A β ω q φ y t) x = q * oscSin A β ω q φ x t :=
  (hasDerivAt_oscMode_space A β ω q φ t x).deriv

lemma spaceSecond_oscMode (A β ω q φ x t : ℝ) :
    spaceSecond (oscMode A β ω q φ) x t = -(q ^ 2) * oscMode A β ω q φ x t := by
  have hfun : (fun y => deriv (fun z => oscMode A β ω q φ z t) y) =
      fun y => q * oscSin A β ω q φ y t := by
    funext y
    exact deriv_oscMode_space A β ω q φ t y
  unfold spaceSecond
  rw [hfun]
  have h := (hasDerivAt_oscSin_space A β ω q φ t x).const_mul q
  rw [h.deriv]
  ring

/-- With the telegraph decay `β = 1/(2τ)`, the sine piece of the residual drops
and the cosine piece is the dispersion factor. -/
lemma telegraph_osc_residual (A β ω q φ τ D x t : ℝ) (hβ : 2 * τ * β = 1) :
    τ * timeSecond (oscMode A β ω q φ) x t + timeFirst (oscMode A β ω q φ) x t
      - D * spaceSecond (oscMode A β ω q φ) x t =
      (τ * (β ^ 2 - ω ^ 2) - β + D * q ^ 2) * oscMode A β ω q φ x t := by
  rw [timeSecond_oscMode, deriv_oscMode_time, spaceSecond_oscMode]
  have hsin : 2 * τ * β * ω - ω = 0 := by
    linear_combination ω * hβ
  set mode := oscMode A β ω q φ x t
  set scomp := oscSin A β ω q φ x t
  have :
      τ * ((β ^ 2 - ω ^ 2) * mode + (2 * β * ω) * scomp) + (-β * mode - ω * scomp)
        - D * (-(q ^ 2) * mode)
        = (τ * (β ^ 2 - ω ^ 2) - β + D * q ^ 2) * mode + (2 * τ * β * ω - ω) * scomp := by
    ring
  rw [this, hsin]
  ring

lemma dispersion_factor_eq (τ β ω D q : ℝ) (hτ : τ ≠ 0) (hβ : β = 1 / (2 * τ)) :
    τ * (β ^ 2 - ω ^ 2) - β + D * q ^ 2 = 0 ↔ ω ^ 2 = D / τ * q ^ 2 - 1 / (4 * τ ^ 2) := by
  subst hβ
  have h4τ : (4 : ℝ) * τ ≠ 0 := mul_ne_zero (by norm_num) hτ
  have h4τ2 : -((4 : ℝ) * τ ^ 2) ≠ 0 := by
    exact neg_ne_zero.mpr (mul_ne_zero (by norm_num) (pow_ne_zero 2 hτ))
  have hscale :
      (τ * ((1 / (2 * τ)) ^ 2 - ω ^ 2) - 1 / (2 * τ) + D * q ^ 2) * (4 * τ)
        = (ω ^ 2 - (D / τ * q ^ 2 - 1 / (4 * τ ^ 2))) * (-(4 * τ ^ 2)) := by
    field_simp [hτ]
    ring
  constructor
  · intro h
    rw [h, zero_mul] at hscale
    have hdiff : ω ^ 2 - (D / τ * q ^ 2 - 1 / (4 * τ ^ 2)) = 0 :=
      (mul_eq_zero.mp hscale.symm).resolve_right h4τ2
    exact sub_eq_zero.mp hdiff
  · intro h
    have hdiff : ω ^ 2 - (D / τ * q ^ 2 - 1 / (4 * τ ^ 2)) = 0 := sub_eq_zero.mpr h
    rw [hdiff, zero_mul] at hscale
    exact (mul_eq_zero.mp hscale).resolve_right h4τ

/-! ## Complex plane wave -/

lemma hasDerivAt_cPlane_time (A : ℂ) (k ω x t : ℝ) :
    HasDerivAt (fun s => cPlane A k ω x s) (-Complex.I * (ω : ℂ) * cPlane A k ω x t) t := by
  unfold cPlane
  have hreal : HasDerivAt (fun s => k * x - ω * s) (-ω) t := by
    refine hasDerivAt_eq ((hasDerivAt_linear (-ω) (k * x) t)) ?_ ?_
    · intro s
      ring
    · ring
  have h := ((hreal.ofReal_comp.const_mul Complex.I).cexp).const_mul A
  refine hasDerivAt_eq_ℂ (h) ?_ ?_
  · intro _
    ring
  · simp only [ofReal_neg]
    ring

lemma deriv_cPlane_time (A : ℂ) (k ω x t : ℝ) :
    deriv (fun s => cPlane A k ω x s) t = -Complex.I * (ω : ℂ) * cPlane A k ω x t :=
  (hasDerivAt_cPlane_time A k ω x t).deriv

lemma hasDerivAt_cPlane_space (A : ℂ) (k ω t x : ℝ) :
    HasDerivAt (fun y => cPlane A k ω y t) (Complex.I * (k : ℂ) * cPlane A k ω x t) x := by
  unfold cPlane
  have hreal : HasDerivAt (fun y => k * y - ω * t) k x := by
    refine hasDerivAt_eq ((hasDerivAt_linear k (-ω * t) x)) ?_ ?_
    · intro y
      ring
    · ring
  have h := ((hreal.ofReal_comp.const_mul Complex.I).cexp).const_mul A
  refine hasDerivAt_eq_ℂ (h) ?_ ?_
  · intro _
    ring
  · ring

lemma deriv_cPlane_space (A : ℂ) (k ω t x : ℝ) :
    deriv (fun y => cPlane A k ω y t) x = Complex.I * (k : ℂ) * cPlane A k ω x t :=
  (hasDerivAt_cPlane_space A k ω t x).deriv

lemma deriv_cPlane_space₂ (A : ℂ) (k ω x t : ℝ) :
    deriv (fun y => deriv (fun y => cPlane A k ω y t) y) x =
      -((k : ℂ) ^ 2) * cPlane A k ω x t := by
  have hfun : (fun y => deriv (fun z => cPlane A k ω z t) y) =
      fun y => Complex.I * (k : ℂ) * cPlane A k ω y t := by
    funext y
    exact deriv_cPlane_space A k ω t y
  rw [hfun]
  have h := (hasDerivAt_cPlane_space A k ω t x).const_mul (Complex.I * (k : ℂ))
  rw [h.deriv]
  have hI : Complex.I * Complex.I = -1 := by simp [Complex.I_mul_I]
  calc
    Complex.I * (k : ℂ) * (Complex.I * (k : ℂ) * cPlane A k ω x t)
        = (Complex.I * Complex.I) * ((k : ℂ) * (k : ℂ)) * cPlane A k ω x t := by ring
    _ = -1 * ((k : ℂ) ^ 2) * cPlane A k ω x t := by rw [hI]; ring
    _ = -((k : ℂ) ^ 2) * cPlane A k ω x t := by ring

lemma cPlane_ne_zero {A : ℂ} (hA : A ≠ 0) (k ω x t : ℝ) : cPlane A k ω x t ≠ 0 := by
  unfold cPlane
  exact mul_ne_zero hA (Complex.exp_ne_zero _)

lemma schrodinger_residual (A : ℂ) (k ω κ x t : ℝ) :
    Complex.I * deriv (fun s => cPlane A k ω x s) t
      - (-κ) * deriv (fun y => deriv (fun y => cPlane A k ω y t) y) x =
      ((ω : ℂ) - (κ : ℂ) * (k : ℂ) ^ 2) * cPlane A k ω x t := by
  rw [deriv_cPlane_time, deriv_cPlane_space₂]
  have hI : Complex.I * (-Complex.I) = 1 := by
    simp [Complex.I_mul_I]
  calc
    Complex.I * (-Complex.I * (ω : ℂ) * cPlane A k ω x t)
        - -κ * (-((k : ℂ) ^ 2) * cPlane A k ω x t)
      = (Complex.I * -Complex.I) * (ω : ℂ) * cPlane A k ω x t
          - (κ : ℂ) * (k : ℂ) ^ 2 * cPlane A k ω x t := by
          ring
    _ = (ω : ℂ) * cPlane A k ω x t - (κ : ℂ) * (k : ℂ) ^ 2 * cPlane A k ω x t := by
          rw [hI]
          ring
    _ = ((ω : ℂ) - (κ : ℂ) * (k : ℂ) ^ 2) * cPlane A k ω x t := by ring

/-- A residual that equals a constant times the profile vanishes at every point
if and only if the constant is zero, when the profile is not identically zero. -/
lemma residual_iff_coeff {u expr : ℝ → ℝ → ℝ} {coeff : ℝ}
    (hres : ∀ x t, expr x t = coeff * u x t) (hnt : ∃ x t, u x t ≠ 0) :
    (∀ x t, expr x t = 0) ↔ coeff = 0 := by
  constructor
  · intro h
    exact coeff_of_not_identically_zero (fun x t => by rw [← hres x t, h x t]) hnt
  · intro hc x t
    rw [hres x t, hc, zero_mul]

lemma coeff_of_not_identically_zero_ℂ {c : ℂ} {u : ℝ → ℝ → ℂ}
    (h : ∀ x t, c * u x t = 0) (hnt : ∃ x t, u x t ≠ 0) : c = 0 := by
  obtain ⟨x, t, hu⟩ := hnt
  exact (mul_eq_zero.mp (h x t)).resolve_right hu

/-- `A ≠ 0` is not enough: `A cos(π/2)` is the zero function. A non-zero
amplitude whose phase is somewhere not an odd multiple of `π/2` is enough. -/
lemma planeWave_ne_zero_of_amplitude {A k ω φ : ℝ} (hA : A ≠ 0)
    (hphase : k ≠ 0 ∨ ω ≠ 0 ∨ Real.cos φ ≠ 0) :
    ∃ x t, planeWave A k ω φ x t ≠ 0 := by
  have hcos0 : Real.cos 0 ≠ 0 := by simp [Real.cos_zero]
  rcases hphase with hk | hω | hφ
  · refine ⟨-φ / k, 0, ?_⟩
    unfold planeWave
    have harg : k * (-φ / k) - ω * 0 + φ = 0 := by field_simp [hk]; ring
    rw [harg]
    exact mul_ne_zero hA hcos0
  · refine ⟨0, φ / ω, ?_⟩
    unfold planeWave
    have harg : k * 0 - ω * (φ / ω) + φ = 0 := by field_simp [hω]; ring
    rw [harg]
    exact mul_ne_zero hA hcos0
  · refine ⟨0, 0, ?_⟩
    unfold planeWave
    have harg : k * 0 - ω * 0 + φ = φ := by ring
    rw [harg]
    exact mul_ne_zero hA hφ

lemma decayMode_ne_zero_of_amplitude {A σ q φ : ℝ} (hA : A ≠ 0)
    (hphase : q ≠ 0 ∨ Real.cos φ ≠ 0) :
    ∃ x t, decayMode A σ q φ x t ≠ 0 := by
  have hcos0 : Real.cos 0 ≠ 0 := by simp [Real.cos_zero]
  rcases hphase with hq | hφ
  · refine ⟨-φ / q, 0, ?_⟩
    unfold decayMode
    have harg : q * (-φ / q) + φ = 0 := by field_simp [hq]; ring
    rw [harg]
    exact mul_ne_zero (mul_ne_zero hA (Real.exp_ne_zero _)) hcos0
  · refine ⟨0, 0, ?_⟩
    unfold decayMode
    have harg : q * 0 + φ = φ := by ring
    rw [harg]
    exact mul_ne_zero (mul_ne_zero hA (Real.exp_ne_zero _)) hφ

lemma oscMode_ne_zero_of_amplitude {A β ω q φ : ℝ} (hA : A ≠ 0)
    (hphase : ω ≠ 0 ∨ q ≠ 0 ∨ Real.cos φ ≠ 0) :
    ∃ x t, oscMode A β ω q φ x t ≠ 0 := by
  have hcos0 : Real.cos 0 ≠ 0 := by simp [Real.cos_zero]
  rcases hphase with hω | hq | hφ
  · refine ⟨0, -φ / ω, ?_⟩
    unfold oscMode
    have harg : ω * (-φ / ω) - q * 0 + φ = 0 := by field_simp [hω]; ring
    rw [harg]
    exact mul_ne_zero (mul_ne_zero hA (Real.exp_ne_zero _)) hcos0
  · refine ⟨φ / q, 0, ?_⟩
    unfold oscMode
    have harg : ω * 0 - q * (φ / q) + φ = 0 := by field_simp [hq]; ring
    rw [harg]
    exact mul_ne_zero (mul_ne_zero hA (Real.exp_ne_zero _)) hcos0
  · refine ⟨0, 0, ?_⟩
    unfold oscMode
    have harg : ω * 0 - q * 0 + φ = φ := by ring
    rw [harg]
    exact mul_ne_zero (mul_ne_zero hA (Real.exp_ne_zero _)) hφ

/-! ## Solving the PDE iff the dispersion relation -/

lemma wave_solves_iff (A k ω φ speedSq : ℝ)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0) :
    (∀ x t, timeSecond (planeWave A k ω φ) x t =
        speedSq * spaceSecond (planeWave A k ω φ) x t) ↔
      ω ^ 2 = speedSq * k ^ 2 := by
  have hres : ∀ x t,
      timeSecond (planeWave A k ω φ) x t - speedSq * spaceSecond (planeWave A k ω φ) x t =
        (speedSq * k ^ 2 - ω ^ 2) * planeWave A k ω φ x t := by
    intro x t
    rw [timeSecond_planeWave, spaceSecond_planeWave]
    ring
  constructor
  · intro hpde
    have hcoeff :=
      (residual_iff_coeff hres hnt).mp (fun x t => sub_eq_zero.mpr (hpde x t))
    linarith
  · intro hdisp x t
    have hcoeff : speedSq * k ^ 2 - ω ^ 2 = 0 := by linarith
    exact sub_eq_zero.mp ((residual_iff_coeff hres hnt).mpr hcoeff x t)

lemma kg_solves_iff (A k ω φ c ω0 : ℝ)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0) :
    (∀ x t, timeSecond (planeWave A k ω φ) x t =
        c ^ 2 * spaceSecond (planeWave A k ω φ) x t
          - ω0 ^ 2 * planeWave A k ω φ x t) ↔
      ω ^ 2 = c ^ 2 * k ^ 2 + ω0 ^ 2 := by
  have hres : ∀ x t,
      timeSecond (planeWave A k ω φ) x t - c ^ 2 * spaceSecond (planeWave A k ω φ) x t
          + ω0 ^ 2 * planeWave A k ω φ x t =
        (c ^ 2 * k ^ 2 + ω0 ^ 2 - ω ^ 2) * planeWave A k ω φ x t :=
    fun x t => kg_residual A k ω φ c ω0 x t
  constructor
  · intro hpde
    have hzero : ∀ x t,
        timeSecond (planeWave A k ω φ) x t - c ^ 2 * spaceSecond (planeWave A k ω φ) x t
            + ω0 ^ 2 * planeWave A k ω φ x t = 0 := by
      intro x t
      rw [hpde x t]
      ring
    have hcoeff := (residual_iff_coeff hres hnt).mp hzero
    linarith
  · intro hdisp x t
    have hcoeff : c ^ 2 * k ^ 2 + ω0 ^ 2 - ω ^ 2 = 0 := by linarith
    have hzero := (residual_iff_coeff hres hnt).mpr hcoeff x t
    linarith

lemma stiff_solves_iff (A k ω φ μ F EI : ℝ) (hμ : μ ≠ 0)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0) :
    (∀ x t, μ * timeSecond (planeWave A k ω φ) x t =
        F * spaceSecond (planeWave A k ω φ) x t
          - EI * spaceFourth (planeWave A k ω φ) x t) ↔
      ω ^ 2 = F / μ * k ^ 2 + EI / μ * k ^ 4 := by
  have hres : ∀ x t,
      μ * timeSecond (planeWave A k ω φ) x t
          - (F * spaceSecond (planeWave A k ω φ) x t
              - EI * spaceFourth (planeWave A k ω φ) x t) =
        (F * k ^ 2 + EI * k ^ 4 - μ * ω ^ 2) * planeWave A k ω φ x t :=
    fun x t => stiff_residual A k ω φ μ F EI x t
  have hclear : F * k ^ 2 + EI * k ^ 4 - μ * ω ^ 2 = 0 ↔
      μ * ω ^ 2 = F * k ^ 2 + EI * k ^ 4 := by
    constructor <;> intro h <;> linarith
  have hdiv : μ * ω ^ 2 = F * k ^ 2 + EI * k ^ 4 ↔
      ω ^ 2 = F / μ * k ^ 2 + EI / μ * k ^ 4 := by
    constructor
    · intro h
      calc
        ω ^ 2 = μ * ω ^ 2 / μ := by field_simp [hμ]
        _ = (F * k ^ 2 + EI * k ^ 4) / μ := by rw [h]
        _ = F / μ * k ^ 2 + EI / μ * k ^ 4 := by field_simp [hμ]
    · intro h
      calc
        μ * ω ^ 2 = μ * (F / μ * k ^ 2 + EI / μ * k ^ 4) := by rw [h]
        _ = F * k ^ 2 + EI * k ^ 4 := by field_simp [hμ]
  constructor
  · intro hpde
    have hzero : ∀ x t,
        μ * timeSecond (planeWave A k ω φ) x t
            - (F * spaceSecond (planeWave A k ω φ) x t
                - EI * spaceFourth (planeWave A k ω φ) x t) = 0 := by
      intro x t
      rw [hpde x t]
      ring
    have hcoeff := (residual_iff_coeff hres hnt).mp hzero
    exact hdiv.mp ((hclear.mp hcoeff))
  · intro hdisp x t
    have hcoeff : F * k ^ 2 + EI * k ^ 4 - μ * ω ^ 2 = 0 :=
      hclear.mpr (hdiv.mpr hdisp)
    have hzero := (residual_iff_coeff hres hnt).mpr hcoeff x t
    linarith

lemma string_solves_iff (A k ω φ μ F : ℝ) (hμ : μ ≠ 0)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0) :
    (∀ x t, μ * timeSecond (planeWave A k ω φ) x t =
        F * spaceSecond (planeWave A k ω φ) x t) ↔
      ω ^ 2 = F / μ * k ^ 2 := by
  have hres : ∀ x t,
      μ * timeSecond (planeWave A k ω φ) x t - F * spaceSecond (planeWave A k ω φ) x t =
        (F * k ^ 2 - μ * ω ^ 2) * planeWave A k ω φ x t :=
    fun x t => string_residual A k ω φ μ F x t
  have hclear : F * k ^ 2 - μ * ω ^ 2 = 0 ↔ μ * ω ^ 2 = F * k ^ 2 := by
    constructor <;> intro h <;> linarith
  have hdiv : μ * ω ^ 2 = F * k ^ 2 ↔ ω ^ 2 = F / μ * k ^ 2 := by
    constructor
    · intro h
      calc
        ω ^ 2 = μ * ω ^ 2 / μ := by field_simp [hμ]
        _ = F * k ^ 2 / μ := by rw [h]
        _ = F / μ * k ^ 2 := by field_simp [hμ]
    · intro h
      calc
        μ * ω ^ 2 = μ * (F / μ * k ^ 2) := by rw [h]
        _ = F * k ^ 2 := by field_simp [hμ]
  constructor
  · intro hpde
    have hzero : ∀ x t,
        μ * timeSecond (planeWave A k ω φ) x t
            - F * spaceSecond (planeWave A k ω φ) x t = 0 :=
      fun x t => sub_eq_zero.mpr (hpde x t)
    have hcoeff := (residual_iff_coeff hres hnt).mp hzero
    exact hdiv.mp (hclear.mp hcoeff)
  · intro hdisp x t
    have hcoeff : F * k ^ 2 - μ * ω ^ 2 = 0 := hclear.mpr (hdiv.mpr hdisp)
    exact sub_eq_zero.mp ((residual_iff_coeff hres hnt).mpr hcoeff x t)

lemma telegraph_decay_solves_iff (A σ q φ τ D : ℝ)
    (hnt : ∃ x t, decayMode A σ q φ x t ≠ 0) :
    (∀ x t, τ * timeSecond (decayMode A σ q φ) x t + timeFirst (decayMode A σ q φ) x t =
        D * spaceSecond (decayMode A σ q φ) x t) ↔
      τ * σ ^ 2 + σ + D * q ^ 2 = 0 := by
  have hres : ∀ x t,
      τ * timeSecond (decayMode A σ q φ) x t + timeFirst (decayMode A σ q φ) x t
          - D * spaceSecond (decayMode A σ q φ) x t =
        (τ * σ ^ 2 + σ + D * q ^ 2) * decayMode A σ q φ x t :=
    fun x t => telegraph_decay_residual A σ q φ τ D x t
  constructor
  · intro hpde
    exact (residual_iff_coeff hres hnt).mp (fun x t => sub_eq_zero.mpr (hpde x t))
  · intro hcoeff x t
    exact sub_eq_zero.mp ((residual_iff_coeff hres hnt).mpr hcoeff x t)

lemma fick_solves_iff (A σ q φ D : ℝ)
    (hnt : ∃ x t, decayMode A σ q φ x t ≠ 0) :
    (∀ x t, timeFirst (decayMode A σ q φ) x t =
        D * spaceSecond (decayMode A σ q φ) x t) ↔
      σ = -D * q ^ 2 := by
  have hres : ∀ x t,
      timeFirst (decayMode A σ q φ) x t - D * spaceSecond (decayMode A σ q φ) x t =
        (σ + D * q ^ 2) * decayMode A σ q φ x t :=
    fun x t => fick_residual A σ q φ D x t
  constructor
  · intro hpde
    have hcoeff :=
      (residual_iff_coeff hres hnt).mp (fun x t => sub_eq_zero.mpr (hpde x t))
    linarith
  · intro hdisp x t
    have hcoeff : σ + D * q ^ 2 = 0 := by linarith
    exact sub_eq_zero.mp ((residual_iff_coeff hres hnt).mpr hcoeff x t)

lemma telegraph_osc_solves_iff (A β ω q φ τ D : ℝ) (hτ : τ ≠ 0) (hβ : β = 1 / (2 * τ))
    (hnt : ∃ x t, oscMode A β ω q φ x t ≠ 0) :
    (∀ x t, τ * timeSecond (oscMode A β ω q φ) x t + timeFirst (oscMode A β ω q φ) x t =
        D * spaceSecond (oscMode A β ω q φ) x t) ↔
      ω ^ 2 = D / τ * q ^ 2 - 1 / (4 * τ ^ 2) := by
  have hβlin : 2 * τ * β = 1 := by
    rw [hβ]
    field_simp [hτ]
  have hres : ∀ x t,
      τ * timeSecond (oscMode A β ω q φ) x t + timeFirst (oscMode A β ω q φ) x t
          - D * spaceSecond (oscMode A β ω q φ) x t =
        (τ * (β ^ 2 - ω ^ 2) - β + D * q ^ 2) * oscMode A β ω q φ x t :=
    fun x t => telegraph_osc_residual A β ω q φ τ D x t hβlin
  constructor
  · intro hpde
    have hcoeff :=
      (residual_iff_coeff hres hnt).mp (fun x t => sub_eq_zero.mpr (hpde x t))
    exact (dispersion_factor_eq τ β ω D q hτ hβ).mp hcoeff
  · intro hdisp x t
    have hcoeff := (dispersion_factor_eq τ β ω D q hτ hβ).mpr hdisp
    exact sub_eq_zero.mp ((residual_iff_coeff hres hnt).mpr hcoeff x t)

lemma schrodinger_solves_iff (B : ℂ) (k ω κ : ℝ) (hB : B ≠ 0) :
    (∀ x t, Complex.I * deriv (fun s => cPlane B k ω x s) t =
        (-κ) * deriv (fun y => deriv (fun y => cPlane B k ω y t) y) x) ↔
      ω = κ * k ^ 2 := by
  have hnt : ∃ x t, cPlane B k ω x t ≠ 0 := ⟨0, 0, cPlane_ne_zero hB k ω 0 0⟩
  have hres : ∀ x t,
      Complex.I * deriv (fun s => cPlane B k ω x s) t
          - (-κ) * deriv (fun y => deriv (fun y => cPlane B k ω y t) y) x =
        ((ω : ℂ) - (κ : ℂ) * (k : ℂ) ^ 2) * cPlane B k ω x t :=
    fun x t => schrodinger_residual B k ω κ x t
  constructor
  · intro hpde
    have hzero : ∀ x t,
        Complex.I * deriv (fun s => cPlane B k ω x s) t
            - (-κ) * deriv (fun y => deriv (fun y => cPlane B k ω y t) y) x = 0 :=
      fun x t => sub_eq_zero.mpr (hpde x t)
    have hcoeff : (ω : ℂ) - (κ : ℂ) * (k : ℂ) ^ 2 = 0 :=
      coeff_of_not_identically_zero_ℂ (fun x t => by rw [← hres x t, hzero x t]) hnt
    apply Complex.ofReal_injective
    rw [sub_eq_zero] at hcoeff
    simpa [Complex.ofReal_mul, Complex.ofReal_pow] using hcoeff
  · intro hdisp x t
    have hcoeff : (ω : ℂ) - (κ : ℂ) * (k : ℂ) ^ 2 = 0 := by
      rw [hdisp]
      simp [Complex.ofReal_mul, Complex.ofReal_pow]
    exact sub_eq_zero.mp (by rw [hres x t, hcoeff, zero_mul])

end PhysJS.PlaneWave
