/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.ScalarWave
import Physlib.ClassicalMechanics.WaveEquation.Basic

/-!
`ab-wave-dalembert`. The missing direction of d'Alembert's formula.

Physlib proves that a plane wave solves `WaveEquation`. A jointly `C²`
solution in one dimension is the sum of two profiles, `F(x − c t) + G(x + c t)`.
The speed is nonzero because that is what the identity requires: at speed zero
the equation says the second time derivative vanishes, and a solution linear in
`t` is not a sum of profiles of `x`.

`F` and `G` take values in `EuclideanSpace ℝ (Fin 1)`, the codomain of
`WaveEquation` at `d = 1`. The profile argument is the coordinate
`Space.oneEquiv`.
-/

namespace PhysJS.WaveDalembert

open ClassicalMechanics Space
open scoped ContDiff

/-- The single coordinate of a vector in `EuclideanSpace ℝ (Fin 1)`. -/
noncomputable def componentCLM : EuclideanSpace ℝ (Fin 1) →L[ℝ] ℝ where
  toFun v := v.ofLp 0
  map_add' _ _ := by simp
  map_smul' _ _ := by simp
  cont := by fun_prop

lemma componentCLM_apply (v : EuclideanSpace ℝ (Fin 1)) : componentCLM v = v 0 := by
  rfl

/-- The scalar profile of a one-dimensional vector field, in the coordinates
`Time.toRealCLE` and `Space.oneEquiv`. -/
noncomputable def scalarOf (f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)) (t x : ℝ) : ℝ :=
  componentCLM (f (Time.toRealCLE.symm t) (oneEquiv.symm x))

lemma scalarOf_contDiff {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) :
    ContDiff ℝ 2 (fun p : ℝ × ℝ => scalarOf f p.1 p.2) := by
  have hchart : ContDiff ℝ 2 (fun p : ℝ × ℝ =>
      ((Time.toRealCLE.symm p.1, oneEquiv.symm p.2) : Time × Space 1)) := by
    fun_prop
  exact componentCLM.contDiff.comp (hf.comp hchart)

lemma contDiff_time_slice {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) (x : Space 1) :
    ContDiff ℝ 2 (fun s : Time => f s x) :=
  hf.comp (by fun_prop : ContDiff ℝ 2 (fun s : Time => (s, x)))

lemma contDiff_space_slice {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) (t : Time) :
    ContDiff ℝ 2 (fun y : Space 1 => f t y) :=
  hf.comp (by fun_prop : ContDiff ℝ 2 (fun y : Space 1 => (t, y)))

lemma contDiff_time_deriv_slice {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) (x : Space 1) :
    ContDiff ℝ 1 (Time.deriv (fun s => f s x)) := by
  have hslice := contDiff_time_slice hf x
  rw [ScalarWave.two_eq_one_add_one] at hslice
  have hfd : ContDiff ℝ 1 (fderiv ℝ (fun s => f s x)) :=
    hslice.fderiv_right (le_rfl : (1 : ℕ∞ω) + 1 ≤ (1 : ℕ) + 1)
  have heq : Time.deriv (fun s => f s x) =
      fun u => fderiv ℝ (fun s => f s x) u (1 : Time) := by
    funext u; rfl
  rw [heq]
  exact hfd.clm_apply contDiff_const

lemma symm_one_eq_basis : oneEquiv.symm (1 : ℝ) = basis 0 := by
  apply oneEquiv.injective
  rw [oneEquiv.apply_symm_apply]
  simp [oneEquiv_coe, basis_self]

lemma oneEquivCLE_symm_apply (y : ℝ) : oneEquivCLE.symm y = oneEquiv.symm y := rfl

lemma deriv_along_chart (y : ℝ) {g : Space 1 → ℝ} (hg : DifferentiableAt ℝ g (oneEquiv.symm y)) :
    _root_.deriv (fun z => g (oneEquiv.symm z)) y = Space.deriv 0 g (oneEquiv.symm y) := by
  have hfun : (fun z => g (oneEquiv.symm z)) = g ∘ oneEquivCLE.symm := by
    funext z
    rw [← oneEquivCLE_symm_apply]
    rfl
  have hchart : HasDerivAt oneEquivCLE.symm (oneEquivCLE.symm (1 : ℝ)) y :=
    (oneEquivCLE.symm : ℝ →L[ℝ] Space 1).hasDerivAt
  have hderiv :
      _root_.deriv (g ∘ oneEquivCLE.symm) y =
        (fderiv ℝ g (oneEquiv.symm y)) (oneEquivCLE.symm (1 : ℝ)) :=
    (hg.hasFDerivAt.comp_hasDerivAt y hchart).deriv
  rw [hfun, hderiv, Space.deriv_eq, oneEquivCLE_symm_apply, symm_one_eq_basis]

lemma time_second_component {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) (x : Space 1) (t : ℝ) :
    _root_.deriv (_root_.deriv (fun s => scalarOf f s (oneEquiv x))) t =
      componentCLM (Time.deriv (Time.deriv (fun s => f s x)) (Time.toRealCLE.symm t)) := by
  have hslice := contDiff_time_slice hf x
  have h1 : _root_.deriv (fun s => scalarOf f s (oneEquiv x)) =
      fun s => componentCLM (Time.deriv (fun u => f u x) (Time.toRealCLE.symm s)) := by
    funext s
    have hw : DifferentiableAt ℝ (fun u => f u x) (Time.toRealCLE.symm s) :=
      (hslice.differentiable ScalarWave.two_ne_zero_smoothness).differentiableAt
    have hproj : DifferentiableAt ℝ (fun u => componentCLM (f u x)) (Time.toRealCLE.symm s) := by
      have hcomp : (fun u => componentCLM (f u x)) = componentCLM ∘ fun u => f u x := by
        funext u; rfl
      rw [hcomp]
      exact componentCLM.differentiableAt.comp (Time.toRealCLE.symm s) hw
    have hderiv :=
      (Time.hasDerivAt_comp_toRealCLE_symm (fun u => componentCLM (f u x)) s hproj).deriv
    have hcomm : Time.deriv (fun u => componentCLM (f u x)) (Time.toRealCLE.symm s) =
        componentCLM (Time.deriv (fun u => f u x) (Time.toRealCLE.symm s)) := by
      simp only [Time.deriv]
      have hcomp : (fun u => componentCLM (f u x)) = componentCLM ∘ fun u => f u x := by
        funext u; rfl
      rw [hcomp, fderiv_comp (Time.toRealCLE.symm s) componentCLM.differentiableAt hw,
        ContinuousLinearMap.fderiv]
      simp
    simpa [scalarOf, oneEquiv_symm_apply, hcomm] using hderiv
  have htd := contDiff_time_deriv_slice hf x
  rw [h1]
  have hw : DifferentiableAt ℝ (Time.deriv (fun u => f u x)) (Time.toRealCLE.symm t) :=
    (htd.differentiable ScalarWave.one_ne_zero_smoothness).differentiableAt
  have hproj : DifferentiableAt ℝ
      (fun u => componentCLM (Time.deriv (fun v => f v x) u)) (Time.toRealCLE.symm t) := by
    have hcomp : (fun u => componentCLM (Time.deriv (fun v => f v x) u)) =
        componentCLM ∘ Time.deriv (fun v => f v x) := by funext u; rfl
    rw [hcomp]
    exact componentCLM.differentiableAt.comp (Time.toRealCLE.symm t) hw
  have hderiv := (Time.hasDerivAt_comp_toRealCLE_symm
    (fun u => componentCLM (Time.deriv (fun v => f v x) u)) t hproj).deriv
  have hcomm : Time.deriv (fun u => componentCLM (Time.deriv (fun v => f v x) u))
      (Time.toRealCLE.symm t) =
      componentCLM (Time.deriv (Time.deriv (fun v => f v x)) (Time.toRealCLE.symm t)) := by
    have hcomp : (fun u => componentCLM (Time.deriv (fun v => f v x) u)) =
        componentCLM ∘ Time.deriv (fun v => f v x) := by funext u; rfl
    rw [Time.deriv_eq, hcomp, Time.deriv_eq,
      fderiv_comp (Time.toRealCLE.symm t) componentCLM.differentiableAt hw,
      ContinuousLinearMap.fderiv]
    simp
  simpa [hcomm] using hderiv

lemma space_second_component {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2)) (t : Time) (x : ℝ) :
    _root_.deriv (_root_.deriv (fun y => scalarOf f (Time.toRealCLE t) y)) x =
      laplacian (fun y => componentCLM (f t y)) (oneEquiv.symm x) := by
  have hspace := contDiff_space_slice hf t
  let g : Space 1 → ℝ := fun z => componentCLM (f t z)
  have hg : ContDiff ℝ 2 g := by
    have hcomp : g = componentCLM ∘ fun z => f t z := by funext z; rfl
    rw [hcomp]
    exact componentCLM.contDiff.comp hspace
  have hscalar : (fun y => scalarOf f (Time.toRealCLE t) y) = fun y => g (oneEquiv.symm y) := by
    funext y
    simp [scalarOf, g, ContinuousLinearEquiv.symm_apply_apply]
  have hfirst : _root_.deriv (fun y => g (oneEquiv.symm y)) =
      fun y => Space.deriv 0 g (oneEquiv.symm y) := by
    funext y
    exact deriv_along_chart y
      ((hg.differentiable ScalarWave.two_ne_zero_smoothness).differentiableAt)
  have hdg : ContDiff ℝ 1 (Space.deriv 0 g) := by
    rw [ScalarWave.two_eq_one_add_one] at hg
    have hfd : ContDiff ℝ 1 (fderiv ℝ g) :=
      hg.fderiv_right (le_rfl : (1 : ℕ∞ω) + 1 ≤ (1 : ℕ) + 1)
    have heq : Space.deriv 0 g = fun p => fderiv ℝ g p (basis 0) := by funext p; rfl
    rw [heq]
    exact hfd.clm_apply (contDiff_const : ContDiff ℝ 1 (fun _ : Space 1 => basis 0))
  have hsecond : _root_.deriv (_root_.deriv (fun y => g (oneEquiv.symm y))) x =
      Space.deriv 0 (Space.deriv 0 g) (oneEquiv.symm x) := by
    rw [hfirst]
    exact deriv_along_chart x
      ((hdg.differentiable ScalarWave.one_ne_zero_smoothness).differentiableAt)
  rw [hscalar, hsecond, laplacian_eq_sum_snd_deriv]
  simp [g, Finset.univ_unique, Fin.default_eq_zero]

lemma scalar_wave (c : ℝ) {f : Time → Space 1 → EuclideanSpace ℝ (Fin 1)}
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2))
    (hw : ∀ t x, WaveEquation f t x c) (t x : ℝ) :
    _root_.deriv (_root_.deriv (fun s => scalarOf f s x)) t =
      c ^ 2 * _root_.deriv (_root_.deriv (fun y => scalarOf f t y)) x := by
  have hvec := hw (Time.toRealCLE.symm t) (oneEquiv.symm x)
  rw [WaveEquation] at hvec
  have htime := time_second_component hf (oneEquiv.symm x) t
  have hspace := space_second_component hf (Time.toRealCLE.symm t) x
  have hlap : componentCLM (Δᵥ (f (Time.toRealCLE.symm t)) (oneEquiv.symm x)) =
      laplacian (fun y => componentCLM (f (Time.toRealCLE.symm t) y)) (oneEquiv.symm x) := by
    rw [laplacianVec]
    simp only [componentCLM_apply, laplacian_eq_sum_snd_deriv, Finset.univ_unique,
      Fin.default_eq_zero, Finset.sum_singleton]
  have hcomp := congr_arg componentCLM hvec
  simp only [map_sub, map_smul, smul_eq_mul, map_zero] at hcomp
  rw [hlap] at hcomp
  have htime' :
      componentCLM (Time.deriv (Time.deriv (fun s => f s (oneEquiv.symm x))) (Time.toRealCLE.symm t)) =
        _root_.deriv (_root_.deriv (fun s => scalarOf f s x)) t := by
    simpa [oneEquiv.apply_symm_apply] using htime.symm
  have hspace' :
      laplacian (fun y => componentCLM (f (Time.toRealCLE.symm t) y)) (oneEquiv.symm x) =
        _root_.deriv (_root_.deriv (fun y => scalarOf f t y)) x := by
    simpa [ContinuousLinearEquiv.symm_apply_apply] using hspace.symm
  rw [htime', hspace'] at hcomp
  linarith

/-- A jointly `C²` solution of Physlib's one-dimensional wave equation is the
sum of a right-going profile and a left-going profile.

Covers the missing direction of d'Alembert's formula for `ab-wave-dalembert`. -/
theorem solution_eq_profiles (c : ℝ) (hc : c ≠ 0)
    (f : Time → Space 1 → EuclideanSpace ℝ (Fin 1))
    (hf : ContDiff ℝ 2 (fun p : Time × Space 1 => f p.1 p.2))
    (hwave : ∀ t x, WaveEquation f t x c) :
    ∃ F G : ℝ → EuclideanSpace ℝ (Fin 1),
      ∀ t x, f t x =
        F (oneEquiv x - c * Time.toRealCLE t) + G (oneEquiv x + c * Time.toRealCLE t) := by
  have hU : ContDiff ℝ 2 (fun p : ℝ × ℝ => scalarOf f p.1 p.2) := scalarOf_contDiff hf
  obtain ⟨F0, G0, hscalar⟩ := ScalarWave.solution_eq_profiles c hc
    (fun p => scalarOf f p.1 p.2) hU (fun t x => scalar_wave c hf hwave t x)
  refine ⟨fun r => PiLp.single 2 0 (F0 r), fun r => PiLp.single 2 0 (G0 r), ?_⟩
  intro t x
  apply PiLp.ext
  intro i
  fin_cases i
  have hsc := hscalar (Time.toRealCLE t) (oneEquiv x)
  simp [scalarOf, componentCLM_apply, PiLp.single_eq_same] at hsc ⊢
  exact hsc

/-- Sending both profiles the same way is a different dictionary. -/
theorem wrong_dictionary (c : ℝ) (hc : c ≠ 0) :
    ∃ (F G : ℝ → EuclideanSpace ℝ (Fin 1)) (t : Time) (x : Space 1),
      F (oneEquiv x - c * Time.toRealCLE t) + G (oneEquiv x + c * Time.toRealCLE t) ≠
        F (oneEquiv x - c * Time.toRealCLE t) + G (oneEquiv x - c * Time.toRealCLE t) := by
  obtain ⟨F0, G0, t0, x0, h⟩ := ScalarWave.wrong_dictionary c hc
  refine ⟨fun r => PiLp.single 2 0 (F0 r), fun r => PiLp.single 2 0 (G0 r),
    Time.toRealCLE.symm t0, oneEquiv.symm x0, ?_⟩
  intro hEq
  apply h
  have hcomp := congr_arg componentCLM hEq
  simpa [map_add, componentCLM_apply, PiLp.single_eq_same, oneEquiv.apply_symm_apply,
    ContinuousLinearEquiv.apply_symm_apply] using hcomp

end PhysJS.WaveDalembert
