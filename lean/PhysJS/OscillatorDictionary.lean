/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Physlib.ClassicalMechanics.DampedHarmonicOscillator.Basic

/-!
`ab-spring-lc` and `ab-damped-rlc`. Time rescaling takes a solution of one
oscillator to a solution of the other.

Physlib states both sides. An LC circuit is the harmonic oscillator with
`m ↦ L` and `k ↦ 1/C`. An RLC circuit is the damped oscillator with the same
replacement and `γ ↦ R`. Those names are the dictionary's reading of the
parameters; Physlib has no circuit. The damped side also asks the damping
ratios `γ / (2 √(m k))` to agree.

`ContDiff ℝ ∞` makes `Time.deriv` the classical derivative and supplies the
hypothesis of the undamped Newton-law equivalence.
-/

namespace PhysJS.OscillatorDictionary

open scoped ContDiff
open Time ClassicalMechanics ClassicalMechanics.HarmonicOscillator
  ClassicalMechanics.DampedHarmonicOscillator

/-- Scalar multiplication on `Time`, as a continuous linear map. -/
noncomputable def timeScale (α : ℝ) : Time →L[ℝ] Time :=
  Time.toRealCLE.symm.toContinuousLinearMap.comp
    ((α • ContinuousLinearMap.id ℝ ℝ).comp Time.toRealCLE.toContinuousLinearMap)

lemma timeScale_apply (α : ℝ) (t : Time) : timeScale α t = α • t := by
  apply Time.ext
  simp [timeScale, Time.smul_real_val]

lemma contDiff_time_deriv {M : Type} [NormedAddCommGroup M] [NormedSpace ℝ M]
    {x : Time → M} (hx : ContDiff ℝ ∞ x) : ContDiff ℝ ∞ (∂ₜ x) := by
  have hmn : ∞ + 1 ≤ ∞ := by simp
  have hfd : ContDiff ℝ ∞ (fderiv ℝ x) := hx.fderiv_right (m := ∞) hmn
  have happly : ContDiff ℝ ∞ (fun t => fderiv ℝ x t (1 : Time)) :=
    hfd.clm_apply contDiff_const
  have heq : ∂ₜ x = fun t => fderiv ℝ x t (1 : Time) := by
    funext t
    rfl
  simpa [heq] using happly

lemma contDiff_comp_scale {M : Type} [NormedAddCommGroup M] [NormedSpace ℝ M]
    (α : ℝ) {x : Time → M} (hx : ContDiff ℝ ∞ x) :
    ContDiff ℝ ∞ (fun s => x (α • s)) := by
  have hcomp : (fun s => x (α • s)) = fun s => x (timeScale α s) := by
    funext s
    rw [timeScale_apply]
  rw [hcomp]
  exact hx.comp (timeScale α).contDiff

lemma contDiff_rescale (β α : ℝ) {x : Time → EuclideanSpace ℝ (Fin 1)}
    (hx : ContDiff ℝ ∞ x) :
    ContDiff ℝ ∞ (fun t => β • x (α • t)) := by
  have hcomp : (fun t => β • x (α • t)) =
      (β • ContinuousLinearMap.id ℝ (EuclideanSpace ℝ (Fin 1))) ∘ fun t => x (α • t) := by
    funext t
    rfl
  rw [hcomp]
  exact (β • ContinuousLinearMap.id ℝ (EuclideanSpace ℝ (Fin 1))).contDiff.comp
    (contDiff_comp_scale α hx)

lemma deriv_comp_scale {M : Type} [NormedAddCommGroup M] [NormedSpace ℝ M]
    (x : Time → M) (α : ℝ) (t : Time) (hx : DifferentiableAt ℝ x (α • t)) :
    ∂ₜ (fun s => x (α • s)) t = α • ∂ₜ x (α • t) := by
  simp only [Time.deriv_eq]
  have hcomp : (fun s => x (α • s)) = fun s => x (timeScale α s) := by
    funext s
    rw [timeScale_apply]
  rw [hcomp]
  change (fderiv ℝ (x ∘ ⇑(timeScale α)) t) 1 = α • (fderiv ℝ x (α • t)) 1
  have hx' : DifferentiableAt ℝ x (timeScale α t) := by
    simpa [timeScale_apply] using hx
  rw [fderiv_comp (g := x) (f := ⇑(timeScale α)) (x := t) hx' (timeScale α).differentiableAt,
    ContinuousLinearMap.fderiv]
  simp [ContinuousLinearMap.comp_apply, timeScale_apply, map_smul]

lemma deriv_deriv_comp_scale {x : Time → EuclideanSpace ℝ (Fin 1)} (α : ℝ)
    (hx : ContDiff ℝ ∞ x) (t : Time) :
    ∂ₜ (∂ₜ (fun s => x (α • s))) t = α ^ 2 • ∂ₜ (∂ₜ x) (α • t) := by
  have hpoint : ∂ₜ (fun s => x (α • s)) = fun s => α • ∂ₜ x (α • s) := by
    funext s
    exact deriv_comp_scale x α s (hx.differentiable (by simp)).differentiableAt
  rw [hpoint]
  have hinner : Differentiable ℝ (fun s => ∂ₜ x (α • s)) :=
    (contDiff_comp_scale α (contDiff_time_deriv hx)).differentiable (by simp)
  rw [Time.deriv_smul (t := t) (fun s => ∂ₜ x (α • s)) α hinner]
  rw [deriv_comp_scale (∂ₜ x) α t
    ((contDiff_time_deriv hx).differentiable (by simp)).differentiableAt]
  rw [smul_smul, ← pow_two]

lemma accel_eq_frequency (S : HarmonicOscillator) (x : Time → EuclideanSpace ℝ (Fin 1))
    (hx : ContDiff ℝ ∞ x) (hsol : S.EquationOfMotion x) (t : Time) :
    ∂ₜ (∂ₜ x) t = -S.ω ^ 2 • x t := by
  have hnewton := (equationOfMotion_iff_newtons_2nd_law S x hx).mp hsol t
  rw [force_eq_linear] at hnewton
  have hm : S.m ≠ 0 := S.m_ne_zero
  have hinv : ∂ₜ (∂ₜ x) t = S.m⁻¹ • (S.m • ∂ₜ (∂ₜ x) t) := by
    rw [smul_smul, inv_mul_cancel₀ hm, one_smul]
  rw [hinv, hnewton, smul_smul, ω_sq]
  congr 1
  field_simp [hm]

/-- Rescaling time by `ω_target / ω_source` and the amplitude by `β` sends a
smooth solution of `S` to a smooth solution of `T`. -/
lemma rescale_preserves_equationOfMotion
    (S T : HarmonicOscillator) (β : ℝ) (x : Time → EuclideanSpace ℝ (Fin 1))
    (hx : ContDiff ℝ ∞ x) (hsol : S.EquationOfMotion x) :
    T.EquationOfMotion (fun t => β • x ((T.ω / S.ω) • t)) := by
  set α := T.ω / S.ω
  set y := fun t => β • x (α • t)
  have hy : ContDiff ℝ ∞ y := contDiff_rescale β α hx
  rw [equationOfMotion_iff_newtons_2nd_law T y hy]
  intro t
  have hfirst : ∂ₜ y = fun s => β • ∂ₜ (fun u => x (α • u)) s := by
    funext s
    exact Time.deriv_smul (t := s) (fun u => x (α • u)) β
      ((contDiff_comp_scale α hx).differentiable (by simp))
  have hsecond : ∂ₜ (∂ₜ y) t = β • ∂ₜ (∂ₜ (fun u => x (α • u))) t := by
    have hfun : ∂ₜ y = fun s => β • ∂ₜ (fun u => x (α • u)) s := hfirst
    rw [hfun]
    exact Time.deriv_smul (t := t) (fun s => ∂ₜ (fun u => x (α • u)) s) β
      ((contDiff_time_deriv (contDiff_comp_scale α hx)).differentiable (by simp))
  rw [hsecond, deriv_deriv_comp_scale α hx t, accel_eq_frequency S x hx hsol (α • t)]
  have hα : α ^ 2 * S.ω ^ 2 = T.ω ^ 2 := by
    unfold α
    field_simp [S.ω_ne_zero]
  rw [smul_smul, smul_smul, smul_smul, force_eq_linear, smul_smul]
  congr 1
  calc
    T.m * β * α ^ 2 * -S.ω ^ 2 = -(T.m * β * (α ^ 2 * S.ω ^ 2)) := by ring
    _ = -(T.m * β * T.ω ^ 2) := by rw [hα]
    _ = -T.k * β := by rw [ω_sq]; field_simp [T.m_ne_zero]

/-- The rescaling is an equivalence of smooth solutions when `β ≠ 0`. -/
theorem time_rescale_iff (S T : HarmonicOscillator) (β : ℝ) (hβ : β ≠ 0)
    (x : Time → EuclideanSpace ℝ (Fin 1)) (hx : ContDiff ℝ ∞ x) :
    S.EquationOfMotion x ↔
      T.EquationOfMotion (fun t => β • x ((T.ω / S.ω) • t)) := by
  constructor
  · exact fun hsol => rescale_preserves_equationOfMotion S T β x hx hsol
  · intro hT
    set α := T.ω / S.ω
    set y := fun t => β • x (α • t)
    have hy : ContDiff ℝ ∞ y := contDiff_rescale β α hx
    have hback := rescale_preserves_equationOfMotion T S β⁻¹ y hy hT
    have heq : (fun t => β⁻¹ • y ((S.ω / T.ω) • t)) = x := by
      funext t
      have hcancel : α * (S.ω / T.ω) = 1 := by
        unfold α
        field_simp [S.ω_ne_zero, T.ω_ne_zero]
      rw [smul_smul, ← mul_smul, hcancel, one_smul, inv_mul_cancel₀ hβ, one_smul]
    rw [heq] at hback
    exact hback

/-- The LC circuit, read as Physlib's harmonic oscillator: `m ↦ L`, `k ↦ 1/C`. -/
noncomputable def lcOscillator (L C : ℝ) (hL : 0 < L) (hC : 0 < C) : HarmonicOscillator where
  m := L
  k := 1 / C
  m_pos := hL
  k_pos := one_div_pos.mpr hC

/-- Damping ratio `γ / (2 √(m k))`. For the RLC reading this is `(R / 2) √(C / L)`. -/
noncomputable def dampingRatio (S : DampedHarmonicOscillator) : ℝ :=
  S.γ / (2 * Real.sqrt (S.m * S.k))

lemma sqrt_mass_spring (S : DampedHarmonicOscillator) :
    Real.sqrt (S.m * S.k) = S.m * S.ω := by
  have hsq : (S.m * S.ω) ^ 2 = S.m * S.k := by
    rw [mul_pow, ω_sq]
    field_simp
  rw [← hsq]
  exact Real.sqrt_sq (mul_nonneg S.m_pos.le S.ω_pos.le)

lemma gamma_div_mass (S : DampedHarmonicOscillator) :
    S.γ / S.m = 2 * dampingRatio S * S.ω := by
  unfold dampingRatio
  rw [sqrt_mass_spring]
  field_simp [S.m_ne_zero, S.ω_ne_zero]

/-- The RLC circuit, read as Physlib's damped oscillator: `m ↦ L`, `k ↦ 1/C`, `γ ↦ R`. -/
noncomputable def rlcOscillator (L C R : ℝ) (hL : 0 < L) (hC : 0 < C) (hR : 0 ≤ R) :
    DampedHarmonicOscillator where
  m := L
  k := 1 / C
  m_pos := hL
  k_pos := one_div_pos.mpr hC
  γ := R
  γ_nonneg := hR

lemma rescale_preserves_damped
    (S T : DampedHarmonicOscillator) (β : ℝ) (hζ : dampingRatio S = dampingRatio T)
    (x : Time → EuclideanSpace ℝ (Fin 1)) (hx : ContDiff ℝ ∞ x)
    (hsol : S.EquationOfMotion x) :
    T.EquationOfMotion (fun t => β • x ((T.ω / S.ω) • t)) := by
  set α := T.ω / S.ω
  set y := fun t => β • x (α • t)
  intro t
  have hfirst : ∂ₜ y = fun s => β • ∂ₜ (fun u => x (α • u)) s := by
    funext s
    exact Time.deriv_smul (t := s) (fun u => x (α • u)) β
      ((contDiff_comp_scale α hx).differentiable (by simp))
  have hvel : ∂ₜ y t = (β * α) • ∂ₜ x (α • t) := by
    rw [hfirst]
    change β • ∂ₜ (fun u => x (α • u)) t = (β * α) • ∂ₜ x (α • t)
    rw [deriv_comp_scale x α t (hx.differentiable (by simp)).differentiableAt, smul_smul]
  have hacc : ∂ₜ (∂ₜ y) t = (β * α ^ 2) • ∂ₜ (∂ₜ x) (α • t) := by
    have hfun : ∂ₜ y = fun s => β • ∂ₜ (fun u => x (α • u)) s := hfirst
    rw [hfun]
    rw [Time.deriv_smul (t := t) (fun s => ∂ₜ (fun u => x (α • u)) s) β
      ((contDiff_time_deriv (contDiff_comp_scale α hx)).differentiable (by simp))]
    rw [deriv_deriv_comp_scale α hx t, smul_smul]
  rw [hacc, hvel]
  ext i
  have hsrc0 := congr_arg (fun v : EuclideanSpace ℝ (Fin 1) => v i) (hsol (α • t))
  simp only [PiLp.add_apply, PiLp.smul_apply, PiLp.zero_apply, smul_eq_mul] at hsrc0 ⊢
  set a := (∂ₜ (∂ₜ x) (α • t)).ofLp i
  set b := (∂ₜ x (α • t)).ofLp i
  set c := (x (α • t)).ofLp i
  have hm : S.m ≠ 0 := S.m_ne_zero
  have hγ : S.γ = 2 * dampingRatio S * S.ω * S.m := by
    have := gamma_div_mass S
    field_simp [hm] at this
    linarith
  have hγT : T.γ = 2 * dampingRatio T * T.ω * T.m := by
    have := gamma_div_mass T
    field_simp [T.m_ne_zero] at this
    linarith
  have hα : α * S.ω = T.ω := by
    unfold α
    field_simp [S.ω_ne_zero]
  have hk : S.k = S.m * S.ω ^ 2 := by
    rw [ω_sq]
    field_simp [hm]
  have hkT : T.k = T.m * T.ω ^ 2 := by
    rw [ω_sq]
    field_simp [T.m_ne_zero]
  have hsrc : S.m * a = -(S.γ * b) - S.k * c := by
    linear_combination hsrc0
  have hcancel : S.m⁻¹ * (S.m * a) = a := by
    rw [← mul_assoc, inv_mul_cancel₀ hm, one_mul]
  have hfac : T.m * (β * α ^ 2 * a) = T.m * β * α ^ 2 * (S.m⁻¹ * (S.m * a)) := by
    rw [hcancel]
    ring
  calc
    T.m * (β * α ^ 2 * a) + T.γ * (β * α * b) + T.k * (β * c)
        = T.m * β * α ^ 2 * (S.m⁻¹ * (S.m * a)) + T.γ * (β * α * b) + T.k * (β * c) := by
          rw [hfac]
    _ = T.m * β * α ^ 2 * (S.m⁻¹ * (-(S.γ * b) - S.k * c)) + T.γ * (β * α * b) +
          T.k * (β * c) := by
          rw [hsrc]
    _ = 0 := by
          rw [hγ, hζ, hγT, hk, hkT]
          have hpull :
              S.m⁻¹ * (-(2 * dampingRatio T * S.ω * S.m * b) - S.m * S.ω ^ 2 * c) =
                -(2 * dampingRatio T * S.ω * b) - S.ω ^ 2 * c := by
            have hgroup :
                -(2 * dampingRatio T * S.ω * S.m * b) - S.m * S.ω ^ 2 * c =
                  S.m * (-(2 * dampingRatio T * S.ω * b) - S.ω ^ 2 * c) := by
              ring
            rw [hgroup, ← mul_assoc, inv_mul_cancel₀ hm, one_mul]
          rw [hpull, ← hα]
          ring

/-- The rescaling is an equivalence of smooth solutions when `β ≠ 0` and the
damping ratios agree. -/
theorem time_rescale_damped_iff (S T : DampedHarmonicOscillator) (β : ℝ) (hβ : β ≠ 0)
    (hζ : dampingRatio S = dampingRatio T) (x : Time → EuclideanSpace ℝ (Fin 1))
    (hx : ContDiff ℝ ∞ x) :
    S.EquationOfMotion x ↔
      T.EquationOfMotion (fun t => β • x ((T.ω / S.ω) • t)) := by
  constructor
  · exact fun hsol => rescale_preserves_damped S T β hζ x hx hsol
  · intro hT
    set α := T.ω / S.ω
    set y := fun t => β • x (α • t)
    have hy : ContDiff ℝ ∞ y := contDiff_rescale β α hx
    have hback := rescale_preserves_damped T S β⁻¹ hζ.symm y hy hT
    have heq : (fun t => β⁻¹ • y ((S.ω / T.ω) • t)) = x := by
      funext t
      have hcancel : α * (S.ω / T.ω) = 1 := by
        unfold α
        field_simp [S.ω_ne_zero, T.ω_ne_zero]
      rw [smul_smul, ← mul_smul, hcancel, one_smul, inv_mul_cancel₀ hβ, one_smul]
    rw [heq] at hback
    exact hback

end PhysJS.OscillatorDictionary

namespace PhysJS.SpringLc

open scoped ContDiff
open Time ClassicalMechanics

/-- A smooth solution of a spring oscillator, rescaled in time by `ω_LC / ω`
and in amplitude by `β ≠ 0`, solves the LC oscillator `m ↦ L`, `k ↦ 1/C`,
and every smooth solution of that LC oscillator arises this way.

Covers the dictionary of `ab-spring-lc`. The names inductance and capacitance
are the dictionary's reading; Physlib has no circuit. -/
theorem time_rescale_equationOfMotion
    (spring : HarmonicOscillator) (L C β : ℝ) (hL : 0 < L) (hC : 0 < C) (hβ : β ≠ 0)
    (x : Time → EuclideanSpace ℝ (Fin 1)) (hx : ContDiff ℝ ∞ x) :
    spring.EquationOfMotion x ↔
      (OscillatorDictionary.lcOscillator L C hL hC).EquationOfMotion
        (fun t => β • x
          (((OscillatorDictionary.lcOscillator L C hL hC).ω / spring.ω) • t)) :=
  OscillatorDictionary.time_rescale_iff spring (OscillatorDictionary.lcOscillator L C hL hC)
    β hβ x hx

/-- Using the source frequency as the target frequency is a different dictionary. -/
theorem wrong_dictionary (S T : HarmonicOscillator) (h : S.ω ≠ T.ω) :
    T.ω / S.ω ≠ 1 := by
  intro hEq
  have : T.ω = S.ω := by
    field_simp [S.ω_ne_zero] at hEq
    exact hEq
  exact h this.symm

end PhysJS.SpringLc

namespace PhysJS.DampedRlc

open scoped ContDiff
open Time ClassicalMechanics ClassicalMechanics.DampedHarmonicOscillator

/-- A smooth solution of a damped spring, rescaled in time by `ω_RLC / ω`
and in amplitude by `β ≠ 0`, solves the RLC oscillator `m ↦ L`, `k ↦ 1/C`,
`γ ↦ R` when the damping ratios agree, and every smooth solution of that
RLC oscillator arises this way.

Covers the dictionary of `ab-damped-rlc`. The names resistance, inductance,
and capacitance are the dictionary's reading; Physlib has no circuit. The
damping-ratio hypothesis is `γ / (2 √(m k))` on each side, which is
`b / (2 √(m k)) = (R / 2) √(C / L)` in the dictionary's names. -/
theorem time_rescale_equationOfMotion
    (mech : DampedHarmonicOscillator) (L C R β : ℝ) (hL : 0 < L) (hC : 0 < C) (hR : 0 ≤ R)
    (hβ : β ≠ 0)
    (hζ : OscillatorDictionary.dampingRatio mech =
      OscillatorDictionary.dampingRatio (OscillatorDictionary.rlcOscillator L C R hL hC hR))
    (x : Time → EuclideanSpace ℝ (Fin 1)) (hx : ContDiff ℝ ∞ x) :
    mech.EquationOfMotion x ↔
      (OscillatorDictionary.rlcOscillator L C R hL hC hR).EquationOfMotion
        (fun t => β • x
          (((OscillatorDictionary.rlcOscillator L C R hL hC hR).ω / mech.ω) • t)) :=
  OscillatorDictionary.time_rescale_damped_iff mech
    (OscillatorDictionary.rlcOscillator L C R hL hC hR) β hβ hζ x hx

/-- Matching `γ / m` is a different dictionary from matching the damping ratios,
once the damping ratio is nonzero and the frequencies differ. -/
theorem wrong_dictionary (S T : DampedHarmonicOscillator) (hζ : OscillatorDictionary.dampingRatio S ≠ 0)
    (hω : S.ω ≠ T.ω) (hrate : S.γ / S.m = T.γ / T.m) :
    OscillatorDictionary.dampingRatio S ≠ OscillatorDictionary.dampingRatio T := by
  intro hEq
  have hS := OscillatorDictionary.gamma_div_mass S
  have hT := OscillatorDictionary.gamma_div_mass T
  have hprod : 2 * OscillatorDictionary.dampingRatio S * S.ω =
      2 * OscillatorDictionary.dampingRatio T * T.ω := by
    rw [← hS, ← hT]
    exact hrate
  rw [hEq] at hprod
  have hζT : OscillatorDictionary.dampingRatio T ≠ 0 := hEq ▸ hζ
  have : S.ω = T.ω := by
    apply mul_left_cancel₀ (mul_ne_zero two_ne_zero hζT)
    simpa [mul_assoc] using hprod
  exact hω this

end PhysJS.DampedRlc
