/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.PlaneWave
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-104`. Bridge. Ion-acoustic dispersion for cold ions.

The catalog equation is

```
ω² = k² c_s² / (1 + k² λ_De²)
```

with `c_s² = k_B T_e / m_i` and `λ_De² = ε0 k_B T_e / (n₀ e²)`.

Proved under these hypotheses. Electrons are Boltzmann,
`δn_e = n₀ e φ / (k_B T_e)`. Ions are a cold fluid. The wave is
electrostatic and monochromatic, with the same phase on the ion
velocity, the ion density, and the potential:

```
∂δn_i/∂t = −n₀ ∂v/∂x
m_i ∂v/∂t = −e ∂φ/∂x
ε0 ∂²φ/∂x² = −e (δn_i − δn_e)
```

`e` is the elementary charge, taken positive. `ω ≪ ω_pe` is the regime
in which the displacement current was already dropped by using Poisson
rather than the full Ampere law; it is not a second formula. Warm ions
are a different numerator. This is not the perpendicular fast mode of
`PhysJS.FastMagnetosonic`.
-/

namespace PhysJS.IonAcoustic

open PhysJS.PlaneWave Real

noncomputable def spaceFirst (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun y => u y t) x

/-- Squared ion sound speed `k_B T_e / m_i`. -/
noncomputable def soundSq (kT m : ℝ) : ℝ :=
  kT / m

/-- Squared electron Debye length `ε0 k_B T_e / (n₀ e²)`. -/
noncomputable def debyeSq (eps kT n e : ℝ) : ℝ :=
  eps * kT / (n * e ^ 2)

lemma spaceFirst_planeWave (A k ω φ x t : ℝ) :
    spaceFirst (planeWave A k ω φ) x t =
      -(A * k * Real.sin (k * x - ω * t + φ)) :=
  deriv_planeWave_space A k ω φ t x

lemma sin_as_planeWave (k ω φ x t : ℝ) :
    Real.sin (k * x - ω * t + φ) =
      planeWave 1 k ω (φ - Real.pi / 2) x t := by
  unfold planeWave
  have harg : k * x - ω * t + (φ - Real.pi / 2) =
      (k * x - ω * t + φ) - Real.pi / 2 := by ring
  rw [one_mul, harg, Real.cos_sub_pi_div_two]

lemma continuity_residual (A D k ω φ n0 x t : ℝ) :
    timeFirst (planeWave D k ω φ) x t - (-n0) * spaceFirst (planeWave A k ω φ) x t =
      (D * ω - n0 * A * k) * Real.sin (k * x - ω * t + φ) := by
  rw [show timeFirst (planeWave D k ω φ) x t =
      deriv (fun s => planeWave D k ω φ x s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

lemma momentum_residual (A P k ω φ e m x t : ℝ) :
    m * timeFirst (planeWave A k ω φ) x t - (-e) * spaceFirst (planeWave P k ω φ) x t =
      (m * A * ω - e * P * k) * Real.sin (k * x - ω * t + φ) := by
  rw [show timeFirst (planeWave A k ω φ) x t =
      deriv (fun s => planeWave A k ω φ x s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

/-- Cold-ion Boltzmann dispersion.

`hcontinuity` is ion mass conservation. `hmomentum` is the ion momentum
with `E = −∂φ/∂x`. `hpoisson` already contains the linearized Boltzmann
response `δn_e = n₀ e φ / (k_B T_e)`. The velocity wave is not identically
zero, and `k ≠ 0`. The Debye denominator is nonzero because `n₀`, `e`,
`k_B T_e`, and `ε0` are positive. -/
theorem dispersion_eq (A D P k ω φ n0 e m kT eps : ℝ)
    (hk : k ≠ 0) (he : 0 < e) (hm : 0 < m) (hn : 0 < n0) (hkT : 0 < kT) (hε : 0 < eps)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0)
    (hcontinuity : ∀ x t,
      timeFirst (planeWave D k ω φ) x t = -n0 * spaceFirst (planeWave A k ω φ) x t)
    (hmomentum : ∀ x t,
      m * timeFirst (planeWave A k ω φ) x t = -e * spaceFirst (planeWave P k ω φ) x t)
    (hpoisson : ∀ x t,
      eps * spaceSecond (planeWave P k ω φ) x t =
        -e * (planeWave D k ω φ x t - n0 * e * planeWave P k ω φ x t / kT)) :
    ω ^ 2 = k ^ 2 * soundSq kT m / (1 + k ^ 2 * debyeSq eps kT n0 e) := by
  have hcont : ∀ x t, (D * ω - n0 * A * k) * Real.sin (k * x - ω * t + φ) = 0 := by
    intro x t
    have hzero : timeFirst (planeWave D k ω φ) x t -
        (-n0) * spaceFirst (planeWave A k ω φ) x t = 0 := sub_eq_zero.mpr (hcontinuity x t)
    rw [← continuity_residual, hzero]
  have hmom : ∀ x t, (m * A * ω - e * P * k) * Real.sin (k * x - ω * t + φ) = 0 := by
    intro x t
    have hzero : m * timeFirst (planeWave A k ω φ) x t -
        (-e) * spaceFirst (planeWave P k ω φ) x t = 0 := sub_eq_zero.mpr (hmomentum x t)
    rw [← momentum_residual, hzero]
  have hsin : ∃ x t, planeWave 1 k ω (φ - Real.pi / 2) x t ≠ 0 :=
    planeWave_ne_zero_of_amplitude one_ne_zero (Or.inl hk)
  have hD : D * ω - n0 * A * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by rw [← sin_as_planeWave k ω φ x t]; exact hcont x t) hsin
  have hP : m * A * ω - e * P * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by rw [← sin_as_planeWave k ω φ x t]; exact hmom x t) hsin
  have hA : A ≠ 0 := by
    obtain ⟨x, t, hxt⟩ := hnt
    intro hA0
    apply hxt
    simp [planeWave, hA0]
  have hDω : D * ω = n0 * A * k := by linear_combination hD
  have hPω : m * A * ω = e * P * k := by linear_combination hP
  have hω : ω ≠ 0 := by
    intro hω0
    have : n0 * A * k = 0 := by simpa [hω0] using hDω
    exact mul_ne_zero (mul_ne_zero hn.ne' hA) hk this
  have hsec : ∀ x t, spaceSecond (planeWave P k ω φ) x t =
      -(k ^ 2) * planeWave P k ω φ x t := fun x t => spaceSecond_planeWave P k ω φ x t
  have hpois : eps * (-(k ^ 2) * P) = -e * (D - n0 * e * P / kT) := by
    have hxt : ∃ x t, planeWave 1 k ω φ x t ≠ 0 :=
      planeWave_ne_zero_of_amplitude one_ne_zero (Or.inl hk)
    have hcoeff : ∀ x t,
        (eps * (-(k ^ 2) * P) + e * (D - n0 * e * P / kT)) *
          planeWave 1 k ω φ x t = 0 := by
      intro x t
      have hraw := hpoisson x t
      rw [hsec x t] at hraw
      have hscale : planeWave P k ω φ x t = P * planeWave 1 k ω φ x t := by
        unfold planeWave
        ring
      have hscaleD : planeWave D k ω φ x t = D * planeWave 1 k ω φ x t := by
        unfold planeWave
        ring
      rw [hscale, hscaleD] at hraw
      linear_combination hraw
    have hzero : eps * (-(k ^ 2) * P) + e * (D - n0 * e * P / kT) = 0 :=
      coeff_of_not_identically_zero hcoeff hxt
    linarith
  have hPeq : P = m * A * ω / (e * k) := by
    field_simp [he.ne', hk] at hPω ⊢
    linarith
  have hDeq : D = n0 * A * k / ω := by
    field_simp [hω] at hDω ⊢
    linarith
  have hcleared : eps * k ^ 2 * m * ω ^ 2 * kT =
      n0 * e ^ 2 * k ^ 2 * kT - n0 * e ^ 2 * m * ω ^ 2 := by
    rw [hPeq, hDeq] at hpois
    field_simp [he.ne', hk, hω, hkT.ne'] at hpois
    linarith
  have hform : ω ^ 2 * m * (n0 * e ^ 2 + eps * k ^ 2 * kT) =
      n0 * e ^ 2 * k ^ 2 * kT := by
    linear_combination hcleared
  have hden : m * (n0 * e ^ 2 + eps * k ^ 2 * kT) ≠ 0 := by positivity
  have hωsq : ω ^ 2 =
      n0 * e ^ 2 * k ^ 2 * kT / (m * (n0 * e ^ 2 + eps * k ^ 2 * kT)) := by
    rw [eq_div_iff hden]
    linarith
  unfold soundSq debyeSq
  rw [hωsq]
  field_simp [hk, he.ne', hm.ne', hn.ne', hkT.ne', hε.ne']

end PhysJS.IonAcoustic
