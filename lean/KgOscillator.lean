/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Physlib.ClassicalMechanics.HarmonicOscillator.Basic

/-!
`ab-kg-oscillator`. Bridge. A spatially uniform solution of the Klein–Gordon equation
solves Physlib's harmonic oscillator.

The field `u : ℝ → Time → ℝ` is uniform when it does not depend on `x`:
`u x = f`. Its second space derivative is then zero, so
`u_tt = c² u_xx − ω₀² u` reduces to `f'' = −ω₀² f`. Embedding `f` as the
first coordinate of `EuclideanSpace ℝ (Fin 1)` produces a trajectory whose
Newton law is `m x'' = −k x` once `S.ω = ω₀`. Physlib's
`equationOfMotion_iff_newtons_2nd_law` turns that law into
`EquationOfMotion`, and it asks for `ContDiff ℝ ∞`.

This covers the uniform-mode restriction in Physlib's own terms. It does not
prove a dispersion bound, and it says nothing about a field that depends on `x`.
-/

namespace PhysJS.KgOscillator

open scoped ContDiff
open Time ClassicalMechanics.HarmonicOscillator

/-- The inclusion of a scalar into the first coordinate of the oscillator's line. -/
noncomputable def singleCLM : ℝ →L[ℝ] EuclideanSpace ℝ (Fin 1) :=
  (ContinuousLinearMap.id ℝ ℝ).smulRight (EuclideanSpace.single 0 (1 : ℝ))

/-- A scalar history, read as a trajectory in Physlib's one-dimensional space. -/
noncomputable def embed (f : Time → ℝ) : Time → EuclideanSpace ℝ (Fin 1) :=
  singleCLM ∘ f

lemma embed_apply (f : Time → ℝ) (t : Time) :
    embed f t = EuclideanSpace.single 0 (f t) := by
  ext i
  fin_cases i
  simp [embed, singleCLM, Function.comp_apply, smul_eq_mul]

lemma embed_contDiff {f : Time → ℝ} (hf : ContDiff ℝ ∞ f) : ContDiff ℝ ∞ (embed f) := by
  simpa [embed] using (singleCLM.contDiff.comp hf)

lemma contDiff_deriv {f : Time → ℝ} (hf : ContDiff ℝ ∞ f) : ContDiff ℝ ∞ (∂ₜ f) := by
  have hmn : ∞ + 1 ≤ ∞ := by simp
  have hfd : ContDiff ℝ ∞ (fderiv ℝ f) := hf.fderiv_right (m := ∞) hmn
  have happly : ContDiff ℝ ∞ (fun t => fderiv ℝ f t (1 : Time)) :=
    hfd.clm_apply contDiff_const
  have heq : ∂ₜ f = fun t => fderiv ℝ f t (1 : Time) := by
    funext t
    rfl
  simpa [heq] using happly

lemma deriv_embed {f : Time → ℝ} {t : Time} (hf : DifferentiableAt ℝ f t) :
    ∂ₜ (embed f) t = singleCLM (∂ₜ f t) := by
  simp only [Time.deriv_eq, embed]
  rw [fderiv_comp t singleCLM.differentiableAt hf, ContinuousLinearMap.fderiv]
  rfl

lemma deriv_deriv_embed {f : Time → ℝ} (hf : ContDiff ℝ ∞ f) (t : Time) :
    ∂ₜ (∂ₜ (embed f)) t = singleCLM (∂ₜ (∂ₜ f) t) := by
  have hfun : ∂ₜ (embed f) = embed (∂ₜ f) := by
    funext s
    exact deriv_embed (hf.differentiable (by simp)).differentiableAt
  rw [hfun]
  exact deriv_embed ((contDiff_deriv hf).differentiable (by simp)).differentiableAt

/-- The second space derivative of a field that does not depend on `x` is zero. -/
lemma spaceSecond_uniform {u : ℝ → Time → ℝ} {f : Time → ℝ}
    (huniform : ∀ x, u x = f) (x : ℝ) (t : Time) :
    _root_.deriv (fun y => _root_.deriv (fun z => u z t) y) x = 0 := by
  have h1 : ∀ y, _root_.deriv (fun z => u z t) y = 0 := by
    intro y
    have hfun : (fun z => u z t) = fun _ => f t := by
      funext z
      rw [huniform]
    rw [hfun, _root_.deriv_const]
  have hfun : (fun y => _root_.deriv (fun z => u z t) y) = fun _ => 0 := by
    funext y
    exact h1 y
  rw [hfun, _root_.deriv_const]

/-- A smooth spatially uniform solution of `u_tt = c² u_xx − ω₀² u` is a solution
of `S.EquationOfMotion` when `S.ω = ω₀`.

`ContDiff ℝ ∞` is the hypothesis of Physlib's Newton-law equivalence. The
speed `c` is part of the PDE and drops out because the uniform field has
vanishing second space derivative.

Covers the uniform-mode restriction of `ab-kg-oscillator`, in Physlib's own terms. -/
theorem uniform_solves_equationOfMotion
    (S : ClassicalMechanics.HarmonicOscillator) (u : ℝ → Time → ℝ) (f : Time → ℝ) (c ω0 : ℝ)
    (huniform : ∀ x, u x = f)
    (hKG : ∀ x t, ∂ₜ (∂ₜ (u x)) t =
      c ^ 2 * _root_.deriv (fun y => _root_.deriv (fun z => u z t) y) x - ω0 ^ 2 * u x t)
    (hω : S.ω = ω0) (hf : ContDiff ℝ ∞ f) :
    S.EquationOfMotion (embed f) := by
  have hode : ∀ t, ∂ₜ (∂ₜ f) t = -ω0 ^ 2 * f t := by
    intro t
    have h := hKG 0 t
    rw [huniform, spaceSecond_uniform huniform 0 t] at h
    simpa using h
  have hmk : S.m * S.ω ^ 2 = S.k := by
    rw [ω_sq]
    field_simp
  rw [equationOfMotion_iff_newtons_2nd_law _ _ (embed_contDiff hf)]
  intro t
  rw [deriv_deriv_embed hf t, hode, force_eq_linear]
  ext i
  fin_cases i
  simp [embed, singleCLM, Function.comp_apply, smul_eq_mul]
  rw [← hω]
  linear_combination (f t) * hmk

/-- A travelling wave's dispersion `c² k² + ω₀²` is not the uniform-mode frequency
`ω₀²` when `c k ≠ 0`. -/
theorem wrong_dictionary (c k ω0 : ℝ) (hck : c * k ≠ 0) :
    c ^ 2 * k ^ 2 + ω0 ^ 2 ≠ ω0 ^ 2 := by
  intro h
  have : (c * k) ^ 2 = 0 := by
    have : c ^ 2 * k ^ 2 = 0 := by linarith
    simpa [mul_pow] using this
  exact hck (sq_eq_zero_iff.mp this)

end PhysJS.KgOscillator
