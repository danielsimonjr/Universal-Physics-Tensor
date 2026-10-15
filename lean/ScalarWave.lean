/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.ContDiff.Defs
import Mathlib.Analysis.Calculus.ContDiff.Deriv
import Mathlib.Analysis.Calculus.FDeriv.Symmetric
import Mathlib.Analysis.Calculus.FDeriv.CompCLM
import Mathlib.Analysis.Calculus.FDeriv.Prod
import Mathlib.Analysis.Calculus.Deriv.Prod
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus

/-!
Scalar form of the one-dimensional wave equation on `ℝ × ℝ`.

A jointly `C²` solution of `u_tt = c² u_xx`, with `c ≠ 0`, is
`F(x − c t) + G(x + c t)`. The speed hypothesis is the one the identity
needs: at `c = 0` the equation is `u_tt = 0`, whose solutions are linear in
`t`.
-/

namespace PhysJS.ScalarWave

open scoped ContDiff Interval Topology
open MeasureTheory

lemma deriv_lambda_add {f g : ℝ → ℝ} {x : ℝ}
    (hf : DifferentiableAt ℝ f x) (hg : DifferentiableAt ℝ g x) :
    deriv (fun y => f y + g y) x = deriv f x + deriv g x :=
  deriv_add hf hg

lemma deriv_lambda_sub {f g : ℝ → ℝ} {x : ℝ}
    (hf : DifferentiableAt ℝ f x) (hg : DifferentiableAt ℝ g x) :
    deriv (fun y => f y - g y) x = deriv f x - deriv g x :=
  deriv_sub hf hg

variable {U : ℝ × ℝ → ℝ}

/-- Time derivative, as a derivative in the first coordinate. -/
noncomputable def partialT (U : ℝ × ℝ → ℝ) (p : ℝ × ℝ) : ℝ :=
  deriv (fun s => U (s, p.2)) p.1

/-- Space derivative, as a derivative in the second coordinate. -/
noncomputable def partialX (U : ℝ × ℝ → ℝ) (p : ℝ × ℝ) : ℝ :=
  deriv (fun y => U (p.1, y)) p.2

lemma two_ne_zero_smoothness : (2 : ℕ∞ω) ≠ 0 := by decide

lemma one_ne_zero_smoothness : (1 : ℕ∞ω) ≠ 0 := by decide

lemma one_add_one_le_two : (1 : ℕ∞ω) + 1 ≤ 2 := by norm_num

lemma two_eq_one_add_one : (2 : ℕ∞ω) = (1 : ℕ) + 1 := by norm_num

lemma partialT_eq_fderiv (t x : ℝ) (hU : DifferentiableAt ℝ U (t, x)) :
    partialT U (t, x) = fderiv ℝ U (t, x) (1, 0) := by
  have hpath : HasFDerivAt (fun s : ℝ => (s, x)) (ContinuousLinearMap.inl ℝ ℝ ℝ) t :=
    hasFDerivAt_prodMk_left t x
  have hcomp := hU.hasFDerivAt.comp t hpath
  rw [partialT]
  have hfun : (fun s => U (s, (t, x).2)) = U ∘ fun s => (s, x) := by
    funext s; rfl
  rw [hfun, hcomp.hasDerivAt.deriv]
  simp [ContinuousLinearMap.inl_apply, ContinuousLinearMap.comp_apply]

lemma partialX_eq_fderiv (t x : ℝ) (hU : DifferentiableAt ℝ U (t, x)) :
    partialX U (t, x) = fderiv ℝ U (t, x) (0, 1) := by
  have hpath : HasFDerivAt (fun y : ℝ => (t, y)) (ContinuousLinearMap.inr ℝ ℝ ℝ) x :=
    hasFDerivAt_prodMk_right t x
  have hcomp := hU.hasFDerivAt.comp x hpath
  rw [partialX]
  have hfun : (fun y => U ((t, x).1, y)) = U ∘ fun y => (t, y) := by
    funext y; rfl
  rw [hfun, hcomp.hasDerivAt.deriv]
  simp [ContinuousLinearMap.inr_apply, ContinuousLinearMap.comp_apply]

lemma contDiff_one_partialT (hU : ContDiff ℝ 2 U) : ContDiff ℝ 1 (partialT U) := by
  have heq : partialT U = fun p => fderiv ℝ U p (1, 0) := by
    funext p
    exact partialT_eq_fderiv p.1 p.2 (hU.differentiable two_ne_zero_smoothness p)
  rw [heq]
  exact (hU.fderiv_right one_add_one_le_two).clm_apply contDiff_const

lemma contDiff_one_partialX (hU : ContDiff ℝ 2 U) : ContDiff ℝ 1 (partialX U) := by
  have heq : partialX U = fun p => fderiv ℝ U p (0, 1) := by
    funext p
    exact partialX_eq_fderiv p.1 p.2 (hU.differentiable two_ne_zero_smoothness p)
  rw [heq]
  exact (hU.fderiv_right one_add_one_le_two).clm_apply contDiff_const

lemma fderiv_partialT_eq (hU : ContDiff ℝ 2 U) (t x : ℝ) (w : ℝ × ℝ) :
    fderiv ℝ (partialT U) (t, x) w = fderiv ℝ (fderiv ℝ U) (t, x) w (1, 0) := by
  have heq : partialT U = fun p => fderiv ℝ U p (1, 0) := by
    funext p
    exact partialT_eq_fderiv p.1 p.2 (hU.differentiable two_ne_zero_smoothness p)
  rw [heq]
  have hc : HasFDerivAt (fderiv ℝ U) (fderiv ℝ (fderiv ℝ U) (t, x)) (t, x) :=
    ((hU.fderiv_right one_add_one_le_two).differentiable one_ne_zero_smoothness (t, x)).hasFDerivAt
  have hu : HasFDerivAt (fun _ : ℝ × ℝ => ((1, 0) : ℝ × ℝ))
      (0 : (ℝ × ℝ) →L[ℝ] ℝ × ℝ) (t, x) :=
    hasFDerivAt_const (1, 0) (t, x)
  have happly := hc.clm_apply hu
  rw [happly.fderiv]
  simp [ContinuousLinearMap.flip_apply]

lemma fderiv_partialX_eq (hU : ContDiff ℝ 2 U) (t x : ℝ) (w : ℝ × ℝ) :
    fderiv ℝ (partialX U) (t, x) w = fderiv ℝ (fderiv ℝ U) (t, x) w (0, 1) := by
  have heq : partialX U = fun p => fderiv ℝ U p (0, 1) := by
    funext p
    exact partialX_eq_fderiv p.1 p.2 (hU.differentiable two_ne_zero_smoothness p)
  rw [heq]
  have hc : HasFDerivAt (fderiv ℝ U) (fderiv ℝ (fderiv ℝ U) (t, x)) (t, x) :=
    ((hU.fderiv_right one_add_one_le_two).differentiable one_ne_zero_smoothness (t, x)).hasFDerivAt
  have hu : HasFDerivAt (fun _ : ℝ × ℝ => ((0, 1) : ℝ × ℝ))
      (0 : (ℝ × ℝ) →L[ℝ] ℝ × ℝ) (t, x) :=
    hasFDerivAt_const (0, 1) (t, x)
  have happly := hc.clm_apply hu
  rw [happly.fderiv]
  simp [ContinuousLinearMap.flip_apply]

lemma mixed_partials (hU : ContDiff ℝ 2 U) (t x : ℝ) :
    deriv (fun y => partialT U (t, y)) x = deriv (fun s => partialX U (s, x)) t := by
  have hsym := (hU.contDiffAt (x := (t, x))).isSymmSndFDerivAt (n := 2)
    (by norm_num : minSmoothness ℝ 2 ≤ 2)
  have hleft : deriv (fun y => partialT U (t, y)) x =
      fderiv ℝ (fderiv ℝ U) (t, x) (0, 1) (1, 0) := by
    have hstep : deriv (fun y => partialT U (t, y)) x = partialX (partialT U) (t, x) := by
      simp [partialX]
    rw [hstep, partialX_eq_fderiv (U := partialT U) t x
      ((contDiff_one_partialT hU).differentiable one_ne_zero_smoothness (t, x)),
      fderiv_partialT_eq hU t x (0, 1)]
  have hright : deriv (fun s => partialX U (s, x)) t =
      fderiv ℝ (fderiv ℝ U) (t, x) (1, 0) (0, 1) := by
    have hstep : deriv (fun s => partialX U (s, x)) t = partialT (partialX U) (t, x) := by
      simp [partialT]
    rw [hstep, partialT_eq_fderiv (U := partialX U) t x
      ((contDiff_one_partialX hU).differentiable one_ne_zero_smoothness (t, x)),
      fderiv_partialX_eq hU t x (1, 0)]
  rw [hleft, hright]
  exact (hsym.eq (0, 1) (1, 0))

/-- A `C¹` quantity with `v_t = c v_x` is constant along the lines `x + c t`. -/
lemma const_along_right (c : ℝ) (v : ℝ × ℝ → ℝ) (hv : ContDiff ℝ 1 v)
    (h : ∀ t x, partialT v (t, x) = c * partialX v (t, x)) :
    ∀ t x, v (t, x) = v (0, x + c * t) := by
  intro t x
  let γ : ℝ → ℝ := fun s => v (s, x + c * (t - s))
  have hpathDiff : Differentiable ℝ (fun r => (r, x + c * (t - r))) := by fun_prop
  have hdiff : Differentiable ℝ γ := fun s =>
    (hv.differentiable one_ne_zero_smoothness _).comp s (hpathDiff s)
  have hderiv : ∀ s, deriv γ s = 0 := by
    intro s
    let p : ℝ × ℝ := (s, x + c * (t - s))
    have h1 : HasDerivAt (fun r => r) 1 s := hasDerivAt_id s
    have h2 : HasDerivAt (fun r => x + c * (t - r)) (-c) s := by
      have hfun : (fun r => x + c * (t - r)) = fun r => x + c * t - c * r := by
        ext r; ring
      rw [hfun]
      simpa [sub_eq_add_neg] using
        (((hasDerivAt_id s).const_mul (-c)).const_add (x + c * t))
    have hpath := h1.prodMk h2
    have hd : DifferentiableAt ℝ v p := hv.differentiable one_ne_zero_smoothness p
    have hcomp := hd.hasFDerivAt.comp s hpath.hasFDerivAt
    have hγfun : γ = v ∘ fun r => (r, x + c * (t - r)) := by funext r; rfl
    rw [hγfun, hcomp.hasDerivAt.deriv]
    have happ : (fderiv ℝ v p ∘SL ContinuousLinearMap.toSpanSingleton ℝ ((1, -c) : ℝ × ℝ)) 1 =
        fderiv ℝ v p (1, -c) := by
      simp [ContinuousLinearMap.toSpanSingleton_apply]
    rw [happ]
    have hsplit : fderiv ℝ v p (1, -c) =
        fderiv ℝ v p (1, 0) + (-c) * fderiv ℝ v p (0, 1) := by
      have hvec : ((1, -c) : ℝ × ℝ) = (1, 0) + (-c) • (0, 1) := by ext <;> simp
      rw [hvec, map_add, map_smul, smul_eq_mul]
    rw [hsplit, ← partialT_eq_fderiv s _ hd, ← partialX_eq_fderiv s _ hd, h s _]
    ring
  simpa [γ] using is_const_of_deriv_eq_zero hdiff hderiv t 0

lemma contDiff_fix_time (hU : ContDiff ℝ 2 U) (t : ℝ) : ContDiff ℝ 2 (fun y => U (t, y)) := by
  exact hU.comp (by fun_prop : ContDiff ℝ 2 (fun y : ℝ => (t, y)))

lemma contDiff_fix_space (hU : ContDiff ℝ 2 U) (x : ℝ) : ContDiff ℝ 2 (fun s => U (s, x)) := by
  exact hU.comp (by fun_prop : ContDiff ℝ 2 (fun s : ℝ => (s, x)))

lemma contDiff_deriv_of_two {F : ℝ → ℝ} (hF : ContDiff ℝ 2 F) : ContDiff ℝ 1 (deriv F) := by
  rw [two_eq_one_add_one] at hF
  exact hF.deriv'

lemma deriv_right_time {F : ℝ → ℝ} (hF : Differentiable ℝ F) (c x t : ℝ) :
    deriv (fun s => F (x - c * s)) t = deriv F (x - c * t) * (-c) := by
  have hinner : HasDerivAt (fun s => x - c * s) (-c) t := by
    have hfun : (fun s => x - c * s) = fun s => x + (-c) * s := by
      ext s; ring
    rw [hfun]
    simpa using ((hasDerivAt_id t).const_mul (-c)).const_add x
  have hfun : (fun s => F (x - c * s)) = F ∘ fun s => x - c * s := by funext s; rfl
  rw [hfun]
  exact ((hF (x - c * t)).hasDerivAt.comp t hinner).deriv

lemma deriv_right_space {F : ℝ → ℝ} (hF : Differentiable ℝ F) (c x t : ℝ) :
    deriv (fun y => F (y - c * t)) x = deriv F (x - c * t) := by
  have hinner : HasDerivAt (fun y => y - c * t) 1 x := by
    simpa [sub_eq_add_neg] using (hasDerivAt_id x).add_const (-(c * t))
  have hfun : (fun y => F (y - c * t)) = F ∘ fun y => y - c * t := by funext y; rfl
  rw [hfun, ((hF (x - c * t)).hasDerivAt.comp x hinner).deriv]
  ring

lemma second_right_time {F : ℝ → ℝ} (hF : ContDiff ℝ 2 F) (c x t : ℝ) :
    deriv (deriv (fun s => F (x - c * s))) t =
      c ^ 2 * deriv (deriv F) (x - c * t) := by
  have hfun : deriv (fun s => F (x - c * s)) = fun s => deriv F (x - c * s) * (-c) := by
    funext s
    exact deriv_right_time (hF.differentiable two_ne_zero_smoothness) c x s
  rw [hfun]
  have hF' : Differentiable ℝ (deriv F) :=
    (contDiff_deriv_of_two hF).differentiable one_ne_zero_smoothness
  rw [deriv_mul_const_field, deriv_right_time hF' c x t]
  ring

lemma second_right_space {F : ℝ → ℝ} (hF : ContDiff ℝ 2 F) (c x t : ℝ) :
    deriv (deriv (fun y => F (y - c * t))) x = deriv (deriv F) (x - c * t) := by
  have hfun : deriv (fun y => F (y - c * t)) = fun y => deriv F (y - c * t) := by
    funext y
    exact deriv_right_space (hF.differentiable two_ne_zero_smoothness) c y t
  rw [hfun]
  exact deriv_right_space
    ((contDiff_deriv_of_two hF).differentiable one_ne_zero_smoothness) c x t

lemma right_wave {F : ℝ → ℝ} (hF : ContDiff ℝ 2 F) (c x t : ℝ) :
    deriv (deriv (fun s => F (x - c * s))) t =
      c ^ 2 * deriv (deriv (fun y => F (y - c * t))) x := by
  rw [second_right_time hF, second_right_space hF]

lemma deriv_left_time {G : ℝ → ℝ} (hG : Differentiable ℝ G) (c x t : ℝ) :
    deriv (fun s => G (x + c * s)) t = deriv G (x + c * t) * c := by
  have hinner : HasDerivAt (fun s => x + c * s) c t := by
    convert (hasDerivAt_const t x).add ((hasDerivAt_id t).const_mul c) using 1
    · ext s; rfl
    · ring
  have hfun : (fun s => G (x + c * s)) = G ∘ fun s => x + c * s := by funext s; rfl
  rw [hfun]
  exact ((hG (x + c * t)).hasDerivAt.comp t hinner).deriv

lemma deriv_left_space {G : ℝ → ℝ} (hG : Differentiable ℝ G) (c x t : ℝ) :
    deriv (fun y => G (y + c * t)) x = deriv G (x + c * t) := by
  have hinner : HasDerivAt (fun y => y + c * t) 1 x := by
    convert (hasDerivAt_id x).add (hasDerivAt_const x (c * t)) using 1
    · ext y; rfl
    · ring
  have hfun : (fun y => G (y + c * t)) = G ∘ fun y => y + c * t := by funext y; rfl
  rw [hfun, ((hG (x + c * t)).hasDerivAt.comp x hinner).deriv]
  ring

lemma second_left_time {G : ℝ → ℝ} (hG : ContDiff ℝ 2 G) (c x t : ℝ) :
    deriv (deriv (fun s => G (x + c * s))) t =
      c ^ 2 * deriv (deriv G) (x + c * t) := by
  have hfun : deriv (fun s => G (x + c * s)) = fun s => deriv G (x + c * s) * c := by
    funext s
    exact deriv_left_time (hG.differentiable two_ne_zero_smoothness) c x s
  rw [hfun]
  have hG' : Differentiable ℝ (deriv G) :=
    (contDiff_deriv_of_two hG).differentiable one_ne_zero_smoothness
  rw [deriv_mul_const_field, deriv_left_time hG' c x t]
  ring

lemma second_left_space {G : ℝ → ℝ} (hG : ContDiff ℝ 2 G) (c x t : ℝ) :
    deriv (deriv (fun y => G (y + c * t))) x = deriv (deriv G) (x + c * t) := by
  have hfun : deriv (fun y => G (y + c * t)) = fun y => deriv G (y + c * t) := by
    funext y
    exact deriv_left_space (hG.differentiable two_ne_zero_smoothness) c y t
  rw [hfun]
  exact deriv_left_space
    ((contDiff_deriv_of_two hG).differentiable one_ne_zero_smoothness) c x t

lemma left_wave {G : ℝ → ℝ} (hG : ContDiff ℝ 2 G) (c x t : ℝ) :
    deriv (deriv (fun s => G (x + c * s))) t =
      c ^ 2 * deriv (deriv (fun y => G (y + c * t))) x := by
  rw [second_left_time hG, second_left_space hG]

lemma deriv_integral (ψ : ℝ → ℝ) (hψ : Continuous ψ) (ξ : ℝ) :
    deriv (fun u => ∫ s in (0 : ℝ)..u, ψ s) ξ = ψ ξ := by
  exact (intervalIntegral.integral_hasDerivAt_right (hψ.intervalIntegrable 0 ξ)
    (hψ.stronglyMeasurableAtFilter volume (𝓝 ξ)) hψ.continuousAt).deriv

lemma contDiff_integral {ψ : ℝ → ℝ} (hψ : ContDiff ℝ 1 ψ) :
    ContDiff ℝ 2 (fun u => ∫ s in (0 : ℝ)..u, ψ s) := by
  have hcont : Continuous ψ := hψ.continuous
  have hderiv : deriv (fun u => ∫ s in (0 : ℝ)..u, ψ s) = ψ := by
    funext ξ
    exact deriv_integral ψ hcont ξ
  have hdiff : Differentiable ℝ (fun u => ∫ s in (0 : ℝ)..u, ψ s) := by
    intro ξ
    exact (intervalIntegral.integral_hasDerivAt_right (hcont.intervalIntegrable 0 ξ)
      (hcont.stronglyMeasurableAtFilter volume (𝓝 ξ)) hcont.continuousAt).differentiableAt
  rw [two_eq_one_add_one, contDiff_succ_iff_deriv]
  refine ⟨hdiff, ?_, ?_⟩
  · intro hω
    simp at hω
  · simpa [hderiv] using hψ

/-- Every jointly `C²` solution of the scalar wave equation is a sum of a
right-going profile and a left-going profile. -/
theorem solution_eq_profiles (c : ℝ) (hc : c ≠ 0) (U : ℝ × ℝ → ℝ) (hU : ContDiff ℝ 2 U)
    (hw : ∀ t x, deriv (deriv (fun s => U (s, x))) t =
      c ^ 2 * deriv (deriv (fun y => U (t, y))) x) :
    ∃ F G : ℝ → ℝ, ∀ t x, U (t, x) = F (x - c * t) + G (x + c * t) := by
  classical
  let φ : ℝ → ℝ := fun x => U (0, x)
  let ψ : ℝ → ℝ := fun x => partialT U (0, x)
  let Iξ : ℝ → ℝ := fun ξ => ∫ s in (0 : ℝ)..ξ, ψ s
  let F : ℝ → ℝ := fun ξ => φ ξ / 2 - Iξ ξ / (2 * c)
  let G : ℝ → ℝ := fun η => φ η / 2 + Iξ η / (2 * c)
  have hφ : ContDiff ℝ 2 φ := contDiff_fix_time hU 0
  have hψ : ContDiff ℝ 1 ψ := by
    have heq : ψ = partialT U ∘ fun x : ℝ => ((0 : ℝ), x) := by funext x; rfl
    rw [heq]
    exact (contDiff_one_partialT hU).comp
      (by fun_prop : ContDiff ℝ 1 (fun x : ℝ => ((0 : ℝ), x)))
  have hI : ContDiff ℝ 2 Iξ := contDiff_integral hψ
  have hF : ContDiff ℝ 2 F := (hφ.div_const 2).sub (hI.div_const (2 * c))
  have hG : ContDiff ℝ 2 G := (hφ.div_const 2).add (hI.div_const (2 * c))
  refine ⟨F, G, ?_⟩
  intro t x
  let D : ℝ × ℝ → ℝ := fun p => F (p.2 - c * p.1) + G (p.2 + c * p.1)
  let W : ℝ × ℝ → ℝ := fun p => U p - D p
  have hDcont : ContDiff ℝ 2 D :=
    (hF.comp (by fun_prop)).add (hG.comp (by fun_prop))
  have hWcont : ContDiff ℝ 2 W := hU.sub hDcont
  have hDwave : ∀ t x, deriv (deriv (fun s => D (s, x))) t =
      c ^ 2 * deriv (deriv (fun y => D (t, y))) x := by
    intro t x
    have hsum_t : deriv (deriv (fun s => F (x - c * s) + G (x + c * s))) t =
        deriv (deriv (fun s => F (x - c * s))) t +
          deriv (deriv (fun s => G (x + c * s))) t := by
      have hf : ContDiff ℝ 2 (fun s => F (x - c * s)) :=
        hF.comp (by fun_prop : ContDiff ℝ 2 (fun s : ℝ => x - c * s))
      have hg : ContDiff ℝ 2 (fun s => G (x + c * s)) :=
        hG.comp (by fun_prop : ContDiff ℝ 2 (fun s : ℝ => x + c * s))
      have h1 : deriv (fun s => F (x - c * s) + G (x + c * s)) =
          fun s => deriv (fun r => F (x - c * r)) s + deriv (fun r => G (x + c * r)) s := by
        funext s
        exact deriv_lambda_add (hf.differentiable two_ne_zero_smoothness).differentiableAt
          (hg.differentiable two_ne_zero_smoothness).differentiableAt
      rw [h1, deriv_lambda_add]
      · exact ((contDiff_deriv_of_two hf).differentiable one_ne_zero_smoothness).differentiableAt
      · exact ((contDiff_deriv_of_two hg).differentiable one_ne_zero_smoothness).differentiableAt
    have hsum_x : deriv (deriv (fun y => F (y - c * t) + G (y + c * t))) x =
        deriv (deriv (fun y => F (y - c * t))) x +
          deriv (deriv (fun y => G (y + c * t))) x := by
      have hf : ContDiff ℝ 2 (fun y => F (y - c * t)) :=
        hF.comp (by fun_prop : ContDiff ℝ 2 (fun y : ℝ => y - c * t))
      have hg : ContDiff ℝ 2 (fun y => G (y + c * t)) :=
        hG.comp (by fun_prop : ContDiff ℝ 2 (fun y : ℝ => y + c * t))
      have h1 : deriv (fun y => F (y - c * t) + G (y + c * t)) =
          fun y => deriv (fun r => F (r - c * t)) y + deriv (fun r => G (r + c * t)) y := by
        funext y
        exact deriv_lambda_add (hf.differentiable two_ne_zero_smoothness).differentiableAt
          (hg.differentiable two_ne_zero_smoothness).differentiableAt
      rw [h1, deriv_lambda_add]
      · exact ((contDiff_deriv_of_two hf).differentiable one_ne_zero_smoothness).differentiableAt
      · exact ((contDiff_deriv_of_two hg).differentiable one_ne_zero_smoothness).differentiableAt
    have hDs : (fun s => D (s, x)) = fun s => F (x - c * s) + G (x + c * s) := rfl
    have hDy : (fun y => D (t, y)) = fun y => F (y - c * t) + G (y + c * t) := rfl
    rw [hDs, hDy, hsum_t, hsum_x, right_wave hF c x t, left_wave hG c x t]
    ring
  have hWwave : ∀ t x, deriv (deriv (fun s => W (s, x))) t =
      c ^ 2 * deriv (deriv (fun y => W (t, y))) x := by
    intro t x
    have hUs : ContDiff ℝ 2 (fun s => U (s, x)) := contDiff_fix_space hU x
    have hDs : ContDiff ℝ 2 (fun s => D (s, x)) := contDiff_fix_space hDcont x
    have hUy : ContDiff ℝ 2 (fun y => U (t, y)) := contDiff_fix_time hU t
    have hDy : ContDiff ℝ 2 (fun y => D (t, y)) := contDiff_fix_time hDcont t
    have hsub_t : deriv (deriv (fun s => U (s, x) - D (s, x))) t =
        deriv (deriv (fun s => U (s, x))) t - deriv (deriv (fun s => D (s, x))) t := by
      have h1 : deriv (fun s => U (s, x) - D (s, x)) =
          fun s => deriv (fun r => U (r, x)) s - deriv (fun r => D (r, x)) s := by
        funext s
        exact deriv_lambda_sub (hUs.differentiable two_ne_zero_smoothness).differentiableAt
          (hDs.differentiable two_ne_zero_smoothness).differentiableAt
      rw [h1, deriv_lambda_sub]
      · exact ((contDiff_deriv_of_two hUs).differentiable one_ne_zero_smoothness).differentiableAt
      · exact ((contDiff_deriv_of_two hDs).differentiable one_ne_zero_smoothness).differentiableAt
    have hsub_x : deriv (deriv (fun y => U (t, y) - D (t, y))) x =
        deriv (deriv (fun y => U (t, y))) x - deriv (deriv (fun y => D (t, y))) x := by
      have h1 : deriv (fun y => U (t, y) - D (t, y)) =
          fun y => deriv (fun r => U (t, r)) y - deriv (fun r => D (t, r)) y := by
        funext y
        exact deriv_lambda_sub (hUy.differentiable two_ne_zero_smoothness).differentiableAt
          (hDy.differentiable two_ne_zero_smoothness).differentiableAt
      rw [h1, deriv_lambda_sub]
      · exact ((contDiff_deriv_of_two hUy).differentiable one_ne_zero_smoothness).differentiableAt
      · exact ((contDiff_deriv_of_two hDy).differentiable one_ne_zero_smoothness).differentiableAt
    have hWs : (fun s => W (s, x)) = fun s => U (s, x) - D (s, x) := rfl
    have hWy : (fun y => W (t, y)) = fun y => U (t, y) - D (t, y) := rfl
    rw [hWs, hWy, hsub_t, hsub_x, hw t x, hDwave t x]
    ring
  have hW0 : ∀ x, W (0, x) = 0 := by
    intro x
    simp only [W, D, mul_zero, sub_zero, add_zero]
    rw [show F x = φ x / 2 - Iξ x / (2 * c) from rfl,
      show G x = φ x / 2 + Iξ x / (2 * c) from rfl]
    field_simp [hc]
    ring
  have hFderiv : ∀ ξ, deriv F ξ = deriv φ ξ / 2 - ψ ξ / (2 * c) := by
    intro ξ
    have hφd : DifferentiableAt ℝ φ ξ := (hφ.differentiable two_ne_zero_smoothness).differentiableAt
    have hId : DifferentiableAt ℝ Iξ ξ := (hI.differentiable two_ne_zero_smoothness).differentiableAt
    have hfun : F = fun ξ => φ ξ / 2 - Iξ ξ / (2 * c) := rfl
    rw [hfun, deriv_lambda_sub (hφd.div_const _) (hId.div_const _), deriv_div_const, deriv_div_const,
      deriv_integral ψ hψ.continuous ξ]
  have hGderiv : ∀ η, deriv G η = deriv φ η / 2 + ψ η / (2 * c) := by
    intro η
    have hφd : DifferentiableAt ℝ φ η := (hφ.differentiable two_ne_zero_smoothness).differentiableAt
    have hId : DifferentiableAt ℝ Iξ η := (hI.differentiable two_ne_zero_smoothness).differentiableAt
    have hfun : G = fun η => φ η / 2 + Iξ η / (2 * c) := rfl
    rw [hfun, deriv_lambda_add (hφd.div_const _) (hId.div_const _), deriv_div_const, deriv_div_const,
      deriv_integral ψ hψ.continuous η]
  have hWt0 : ∀ x, partialT W (0, x) = 0 := by
    intro x
    have hD' : deriv (fun s => D (s, x)) 0 = ψ x := by
      have hfun : (fun s => D (s, x)) = fun s => F (x - c * s) + G (x + c * s) := rfl
      rw [hfun, deriv_lambda_add, deriv_right_time (hF.differentiable two_ne_zero_smoothness) c x 0,
        deriv_left_time (hG.differentiable two_ne_zero_smoothness) c x 0, hFderiv, hGderiv]
      · field_simp [hc]
        ring_nf
      · exact ((hF.differentiable two_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s => x - c * s))).differentiableAt
      · exact ((hG.differentiable two_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s => x + c * s))).differentiableAt
    have hsub : deriv (fun s => W (s, x)) 0 =
        deriv (fun s => U (s, x)) 0 - deriv (fun s => D (s, x)) 0 := by
      exact deriv_lambda_sub
        ((contDiff_fix_space hU x).differentiable two_ne_zero_smoothness).differentiableAt
        ((contDiff_fix_space hDcont x).differentiable two_ne_zero_smoothness).differentiableAt
    have hψx : deriv (fun s => U (s, x)) 0 = ψ x := by simp [ψ, partialT]
    rw [partialT, hsub, hψx, hD']
    ring
  have hWx0 : ∀ x, partialX W (0, x) = 0 := by
    intro x
    have hzero : (fun y => W (0, y)) = fun _ => (0 : ℝ) := by
      funext y; exact hW0 y
    simp [partialX, hzero]
  let P : ℝ × ℝ → ℝ := fun p => partialT W p + c * partialX W p
  let Q : ℝ × ℝ → ℝ := fun p => partialT W p - c * partialX W p
  have hPW : ContDiff ℝ 1 (partialT W) := contDiff_one_partialT hWcont
  have hPX : ContDiff ℝ 1 (partialX W) := contDiff_one_partialX hWcont
  have hP : ContDiff ℝ 1 P := hPW.add (hPX.const_smul c)
  have hQ : ContDiff ℝ 1 Q := hPW.sub (hPX.const_smul c)
  have hPtrans : ∀ t x, partialT P (t, x) = c * partialX P (t, x) := by
    intro t x
    have hmix := mixed_partials hWcont t x
    have hPt : partialT P (t, x) =
        deriv (deriv (fun s => W (s, x))) t + c * deriv (fun s => partialX W (s, x)) t := by
      have hfun : (fun s => P (s, x)) =
          fun s => partialT W (s, x) + c * partialX W (s, x) := rfl
      rw [partialT, hfun, deriv_lambda_add, deriv_const_mul_field]
      rfl
      · have hcomp : (fun s => partialT W (s, x)) = partialT W ∘ fun s => (s, x) := by
          funext s; rfl
        rw [hcomp]
        exact ((hPW.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s : ℝ => (s, x)))).differentiableAt
      · have hcomp : (fun s => c * partialX W (s, x)) =
            fun s => c * (partialX W ∘ fun r => (r, x)) s := by
          funext s; rfl
        rw [hcomp]
        exact (((hPX.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s : ℝ => (s, x)))).const_mul c).differentiableAt
    have hPx : partialX P (t, x) =
        deriv (fun y => partialT W (t, y)) x +
          c * deriv (deriv (fun y => W (t, y))) x := by
      have hfun : (fun y => P (t, y)) =
          fun y => partialT W (t, y) + c * partialX W (t, y) := rfl
      rw [partialX, hfun, deriv_lambda_add, deriv_const_mul_field]
      rfl
      · have hcomp : (fun y => partialT W (t, y)) = partialT W ∘ fun y => (t, y) := by
          funext y; rfl
        rw [hcomp]
        exact ((hPW.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun y : ℝ => (t, y)))).differentiableAt
      · have hcomp : (fun y => c * partialX W (t, y)) =
            fun y => c * (partialX W ∘ fun r => (t, r)) y := by
          funext y; rfl
        rw [hcomp]
        exact (((hPX.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun y : ℝ => (t, y)))).const_mul c).differentiableAt
    rw [hPt, hPx, hmix, hWwave t x]
    ring
  have hQtrans : ∀ t x, partialT Q (t, x) = (-c) * partialX Q (t, x) := by
    intro t x
    have hmix := mixed_partials hWcont t x
    have hQt : partialT Q (t, x) =
        deriv (deriv (fun s => W (s, x))) t - c * deriv (fun s => partialX W (s, x)) t := by
      have hfun : (fun s => Q (s, x)) =
          fun s => partialT W (s, x) - c * partialX W (s, x) := rfl
      rw [partialT, hfun, deriv_lambda_sub, deriv_const_mul_field]
      rfl
      · have hcomp : (fun s => partialT W (s, x)) = partialT W ∘ fun s => (s, x) := by
          funext s; rfl
        rw [hcomp]
        exact ((hPW.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s : ℝ => (s, x)))).differentiableAt
      · have hcomp : (fun s => c * partialX W (s, x)) =
            fun s => c * (partialX W ∘ fun r => (r, x)) s := by
          funext s; rfl
        rw [hcomp]
        exact (((hPX.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun s : ℝ => (s, x)))).const_mul c).differentiableAt
    have hQx : partialX Q (t, x) =
        deriv (fun y => partialT W (t, y)) x -
          c * deriv (deriv (fun y => W (t, y))) x := by
      have hfun : (fun y => Q (t, y)) =
          fun y => partialT W (t, y) - c * partialX W (t, y) := rfl
      rw [partialX, hfun, deriv_lambda_sub, deriv_const_mul_field]
      rfl
      · have hcomp : (fun y => partialT W (t, y)) = partialT W ∘ fun y => (t, y) := by
          funext y; rfl
        rw [hcomp]
        exact ((hPW.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun y : ℝ => (t, y)))).differentiableAt
      · have hcomp : (fun y => c * partialX W (t, y)) =
            fun y => c * (partialX W ∘ fun r => (t, r)) y := by
          funext y; rfl
        rw [hcomp]
        exact (((hPX.differentiable one_ne_zero_smoothness).comp
          (by fun_prop : Differentiable ℝ (fun y : ℝ => (t, y)))).const_mul c).differentiableAt
    rw [hQt, hQx, hmix, hWwave t x]
    ring
  have hPalong := const_along_right c P hP hPtrans
  have hQalong := const_along_right (-c) Q hQ hQtrans
  have hP0 : ∀ y, P (0, y) = 0 := by
    intro y
    simp [P, hWt0, hWx0]
  have hQ0 : ∀ y, Q (0, y) = 0 := by
    intro y
    simp [Q, hWt0, hWx0]
  have hslice : Differentiable ℝ (fun s => W (s, x)) :=
    (hWcont.differentiable two_ne_zero_smoothness).comp
      (by fun_prop : Differentiable ℝ (fun s => (s, x)))
  have hzero_deriv : ∀ s, deriv (fun r => W (r, x)) s = 0 := by
    intro s
    have hsum : P (s, x) + Q (s, x) = 2 * partialT W (s, x) := by
      simp [P, Q]; ring
    rw [hPalong, hQalong, hP0, hQ0] at hsum
    have : (2 : ℝ) * partialT W (s, x) = 0 := by linarith
    have hpt : partialT W (s, x) = 0 := (mul_eq_zero.mp this).resolve_left two_ne_zero
    simpa [partialT] using hpt
  have hconst := is_const_of_deriv_eq_zero hslice hzero_deriv t 0
  have : W (t, x) = 0 := by simpa [hW0] using hconst
  have hgoal : U (t, x) - (F (x - c * t) + G (x + c * t)) = 0 := by
    simpa [W, D] using this
  exact sub_eq_zero.mp hgoal

/-- Sending both profiles the same way is a different dictionary. -/
theorem wrong_dictionary (c : ℝ) (hc : c ≠ 0) :
    ∃ (F G : ℝ → ℝ) (t x : ℝ),
      F (x - c * t) + G (x + c * t) ≠ F (x - c * t) + G (x - c * t) := by
  refine ⟨fun _ => 0, fun s => s, 1, 0, ?_⟩
  intro h
  apply hc
  linarith

end PhysJS.ScalarWave
