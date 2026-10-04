/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.AlfvenSpeed
import PhysJS.PlaneWave
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-69`. Bridge. Perpendicular fast magnetosonic speed.

The catalog equation is

```
ω² = (c_s² + v_A²) k_⊥²
```

for propagation perpendicular to a uniform background field in ideal MHD.
`speed_eq` derives the phase speed of one compressional monochromatic
polarization. The premises are the perpendicular linearization

```
∂b/∂t = −B ∂v/∂x
∂δρ/∂t = −ρ ∂v/∂x
δp = c_s² δρ
ρ ∂v/∂t = −∂δp/∂x − (B / μ0) ∂b/∂x
```

`c_s²` is the adiabatic closure constant. `c_s² = γ p / ρ` is a named
reading of that constant, not an energy equation. `v_A² = B² / (μ0 ρ)`.
`ρ` is the inertia density in the continuity and momentum premises, the
same reading as `PhysJS.AlfvenSpeed`.

`perpendicular_of_dispersion` is the other route: the textbook quartic

```
ω⁴ − ω² k² (c_s² + v_A²) + c_s² v_A² k² k_∥² = 0
```

at `k_∥ = 0` has roots `ω² = 0` and `ω² = (c_s² + v_A²) k²`. The quartic
is a hypothesis. `zero_frequency_not_compressional` says the zero root
does not solve compressional induction for a nontrivial velocity wave, so
the polarization in `speed_eq` selects the fast root.

`not_sound_speed`, `not_alfven_speed`, and `not_linear_sum` separate the
quadrature from `c_s`, from `v_A`, and from `c_s + v_A`. `c_s = 0`
recovers `B / √(μ0 ρ)`, the Alfvén value of a different polarization.
`coefficient_not_fixed` separates any other factor from `1`.

Not a kinetic dispersion relation. Not the oblique fast or slow mode.
Physlib has no MHD module. The linearized equations are hypotheses.
-/

namespace PhysJS.FastMagnetosonic

open PhysJS.PlaneWave Real

/-- First derivative along the perpendicular direction. -/
noncomputable def spaceFirst (u : ℝ → ℝ → ℝ) (x t : ℝ) : ℝ :=
  deriv (fun y => u y t) x

/-- Phase speed `√(c_s² + B² / (μ0 ρ))`. The root is the non-negative one. -/
noncomputable def phaseSpeed (cs B μ0 ρ : ℝ) : ℝ :=
  Real.sqrt (cs ^ 2 + B ^ 2 / (μ0 * ρ))

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

lemma induction_residual (A C k ω φ B x t : ℝ) :
    timeFirst (planeWave C k ω φ) x t - (-B) * spaceFirst (planeWave A k ω φ) x t =
      (C * ω - A * B * k) * Real.sin (k * x - ω * t + φ) := by
  rw [show timeFirst (planeWave C k ω φ) x t =
      deriv (fun s => planeWave C k ω φ x s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

lemma continuity_residual (A D k ω φ ρ x t : ℝ) :
    timeFirst (planeWave D k ω φ) x t - (-ρ) * spaceFirst (planeWave A k ω φ) x t =
      (D * ω - ρ * A * k) * Real.sin (k * x - ω * t + φ) := by
  rw [show timeFirst (planeWave D k ω φ) x t =
      deriv (fun s => planeWave D k ω φ x s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

lemma momentum_residual (A C P k ω φ B μ0 ρ x t : ℝ) :
    ρ * timeFirst (planeWave A k ω φ) x t -
        (-spaceFirst (planeWave P k ω φ) x t -
          (B / μ0) * spaceFirst (planeWave C k ω φ) x t) =
      (ρ * A * ω - P * k - (B / μ0) * C * k) * Real.sin (k * x - ω * t + φ) := by
  rw [show timeFirst (planeWave A k ω φ) x t =
      deriv (fun s => planeWave A k ω φ x s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave, spaceFirst_planeWave]
  ring

/-- The compressional linearization fixes `ω² = (c_s² + B² / (μ0 ρ)) k²`.

`hinduction` is ideal induction for a uniform field `B` and a wavevector
perpendicular to it. `hcontinuity` is mass conservation at density `ρ`.
`hclosure` is the adiabatic closure `δp = c_s² δρ` on the amplitudes.
`hmomentum` is the gas-pressure gradient plus the magnetic-pressure
gradient `(B / μ0) ∂b/∂x`. The velocity wave is not identically zero,
and `k ≠ 0`. -/
theorem dispersion_eq (A C D P k ω φ B μ0 ρ cs : ℝ) (hk : k ≠ 0) (hμ : μ0 ≠ 0) (hρ : ρ ≠ 0)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0)
    (hinduction : ∀ x t,
      timeFirst (planeWave C k ω φ) x t = -B * spaceFirst (planeWave A k ω φ) x t)
    (hcontinuity : ∀ x t,
      timeFirst (planeWave D k ω φ) x t = -ρ * spaceFirst (planeWave A k ω φ) x t)
    (hclosure : P = cs ^ 2 * D)
    (hmomentum : ∀ x t,
      ρ * timeFirst (planeWave A k ω φ) x t =
        -spaceFirst (planeWave P k ω φ) x t -
          (B / μ0) * spaceFirst (planeWave C k ω φ) x t) :
    ω ^ 2 = (cs ^ 2 + B ^ 2 / (μ0 * ρ)) * k ^ 2 := by
  have hind : ∀ x t, (C * ω - A * B * k) * Real.sin (k * x - ω * t + φ) = 0 := by
    intro x t
    have hzero : timeFirst (planeWave C k ω φ) x t -
        (-B) * spaceFirst (planeWave A k ω φ) x t = 0 := sub_eq_zero.mpr (hinduction x t)
    rw [← induction_residual, hzero]
  have hcont : ∀ x t, (D * ω - ρ * A * k) * Real.sin (k * x - ω * t + φ) = 0 := by
    intro x t
    have hzero : timeFirst (planeWave D k ω φ) x t -
        (-ρ) * spaceFirst (planeWave A k ω φ) x t = 0 := sub_eq_zero.mpr (hcontinuity x t)
    rw [← continuity_residual, hzero]
  have hmom : ∀ x t,
      (ρ * A * ω - P * k - (B / μ0) * C * k) * Real.sin (k * x - ω * t + φ) = 0 := by
    intro x t
    have hzero : ρ * timeFirst (planeWave A k ω φ) x t -
        (-spaceFirst (planeWave P k ω φ) x t -
          (B / μ0) * spaceFirst (planeWave C k ω φ) x t) = 0 :=
      sub_eq_zero.mpr (hmomentum x t)
    rw [← momentum_residual, hzero]
  have hsin : ∃ x t, planeWave 1 k ω (φ - Real.pi / 2) x t ≠ 0 :=
    planeWave_ne_zero_of_amplitude one_ne_zero (Or.inl hk)
  have hcoeff : C * ω - A * B * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by rw [← sin_as_planeWave k ω φ x t]; exact hind x t) hsin
  have hcoeffD : D * ω - ρ * A * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by rw [← sin_as_planeWave k ω φ x t]; exact hcont x t) hsin
  have hcoeffM : ρ * A * ω - P * k - (B / μ0) * C * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by rw [← sin_as_planeWave k ω φ x t]; exact hmom x t) hsin
  have hA : A ≠ 0 := by
    obtain ⟨x, t, hxt⟩ := hnt
    intro hA0
    apply hxt
    simp [planeWave, hA0]
  have hCω : C * ω = A * B * k := by linear_combination hcoeff
  have hDω : D * ω = ρ * A * k := by linear_combination hcoeffD
  have hsub : ρ * A * ω ^ 2 - cs ^ 2 * ρ * A * k ^ 2 - A * k ^ 2 * B ^ 2 / μ0 = 0 := by
    have hmul : ρ * A * ω ^ 2 - P * k * ω - (B / μ0) * k * (C * ω) = 0 := by
      calc
        ρ * A * ω ^ 2 - P * k * ω - (B / μ0) * k * (C * ω)
            = ω * (ρ * A * ω - P * k - (B / μ0) * C * k) := by ring
        _ = ω * 0 := by rw [hcoeffM]
        _ = 0 := by ring
    rw [hclosure] at hmul
    have hmul' : ρ * A * ω ^ 2 - cs ^ 2 * (D * ω) * k - (B / μ0) * (C * ω) * k = 0 := by
      convert hmul using 1
      ring
    rw [hDω, hCω] at hmul'
    linear_combination hmul'
  have hfactor : A * (ρ * ω ^ 2 - cs ^ 2 * ρ * k ^ 2 - k ^ 2 * B ^ 2 / μ0) = 0 := by
    calc
      A * (ρ * ω ^ 2 - cs ^ 2 * ρ * k ^ 2 - k ^ 2 * B ^ 2 / μ0)
          = ρ * A * ω ^ 2 - cs ^ 2 * ρ * A * k ^ 2 - A * k ^ 2 * B ^ 2 / μ0 := by ring
      _ = 0 := hsub
  have hrest : ρ * ω ^ 2 - cs ^ 2 * ρ * k ^ 2 - k ^ 2 * B ^ 2 / μ0 = 0 :=
    (mul_eq_zero.mp hfactor).resolve_left hA
  have hρdisp : ρ * ω ^ 2 = k ^ 2 * ρ * cs ^ 2 + k ^ 2 * B ^ 2 / μ0 := by linarith
  field_simp [hμ, hρ] at hρdisp ⊢
  linarith

/-- Phase speed of that compressional wave.

Kind `bridge` on `PhysJS.FastMagnetosonic.speed_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`.
`ρ` is the density in the continuity and momentum premises. Not a
kinetic dispersion, and not the oblique fast mode. -/
theorem speed_eq (A C D P k ω φ B μ0 ρ cs : ℝ) (hk : k ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρ)
    (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0)
    (hinduction : ∀ x t,
      timeFirst (planeWave C k ω φ) x t = -B * spaceFirst (planeWave A k ω φ) x t)
    (hcontinuity : ∀ x t,
      timeFirst (planeWave D k ω φ) x t = -ρ * spaceFirst (planeWave A k ω φ) x t)
    (hclosure : P = cs ^ 2 * D)
    (hmomentum : ∀ x t,
      ρ * timeFirst (planeWave A k ω φ) x t =
        -spaceFirst (planeWave P k ω φ) x t -
          (B / μ0) * spaceFirst (planeWave C k ω φ) x t) :
    |ω / k| = phaseSpeed cs B μ0 ρ := by
  have hdisp := dispersion_eq A C D P k ω φ B μ0 ρ cs hk hμ.ne' hρ.ne' hnt
    hinduction hcontinuity hclosure hmomentum
  have hsq : (ω / k) ^ 2 = cs ^ 2 + B ^ 2 / (μ0 * ρ) := by
    field_simp [hk, hμ.ne', hρ.ne'] at hdisp ⊢
    linarith
  unfold phaseSpeed
  calc
    |ω / k| = Real.sqrt ((ω / k) ^ 2) := by rw [Real.sqrt_sq_eq_abs]
    _ = Real.sqrt (cs ^ 2 + B ^ 2 / (μ0 * ρ)) := by rw [hsq]

/-- The same hypotheses put the velocity wave on the wave equation at
`c_s² + B² / (μ0 ρ)`. -/
theorem solves_wave_equation (A C D P k ω φ B μ0 ρ cs : ℝ) (hk : k ≠ 0) (hμ : 0 < μ0)
    (hρ : 0 < ρ) (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0)
    (hinduction : ∀ x t,
      timeFirst (planeWave C k ω φ) x t = -B * spaceFirst (planeWave A k ω φ) x t)
    (hcontinuity : ∀ x t,
      timeFirst (planeWave D k ω φ) x t = -ρ * spaceFirst (planeWave A k ω φ) x t)
    (hclosure : P = cs ^ 2 * D)
    (hmomentum : ∀ x t,
      ρ * timeFirst (planeWave A k ω φ) x t =
        -spaceFirst (planeWave P k ω φ) x t -
          (B / μ0) * spaceFirst (planeWave C k ω φ) x t) :
    ∀ x t, timeSecond (planeWave A k ω φ) x t =
      (cs ^ 2 + B ^ 2 / (μ0 * ρ)) * spaceSecond (planeWave A k ω φ) x t := by
  have hdisp := dispersion_eq A C D P k ω φ B μ0 ρ cs hk hμ.ne' hρ.ne' hnt
    hinduction hcontinuity hclosure hmomentum
  exact (wave_solves_iff A k ω φ (cs ^ 2 + B ^ 2 / (μ0 * ρ)) hnt).2 hdisp

/-- The quadrature is `√(c_s² + v_A²)` for `v_A = B / √(μ0 ρ)`. -/
theorem phaseSpeed_quadrature (cs B μ0 ρ : ℝ) (hμ : 0 < μ0) (hρ : 0 < ρ) :
    phaseSpeed cs B μ0 ρ =
      Real.sqrt (cs ^ 2 + (B / Real.sqrt (μ0 * ρ)) ^ 2) := by
  unfold phaseSpeed
  have hden : 0 ≤ μ0 * ρ := by positivity
  have hsq : (B / Real.sqrt (μ0 * ρ)) ^ 2 = B ^ 2 / (μ0 * ρ) := by
    rw [div_pow, Real.sq_sqrt hden]
  rw [hsq]

/-- Reading the closure as `c_s² = γ p / ρ` rewrites the speed squared. -/
theorem gamma_closure (cs γ p ρ B μ0 : ℝ) (hρ : ρ ≠ 0) (hμ : μ0 ≠ 0)
    (hcs : cs ^ 2 = γ * p / ρ) :
    cs ^ 2 + B ^ 2 / (μ0 * ρ) = (γ * p + B ^ 2 / μ0) / ρ := by
  rw [hcs]
  field_simp [hρ, hμ]

/-- The textbook quartic at perpendicular propagation.

`hdisp` is the ideal-MHD magnetosonic dispersion relation. It is not
derived in this file. `k_∥ = 0` splits it into the slow root `ω² = 0`
and the fast root `ω² = (c_s² + v_A²) k²`. -/
theorem perpendicular_of_dispersion (ω k cs vA kParallel : ℝ)
    (hdisp : ω ^ 4 - ω ^ 2 * k ^ 2 * (cs ^ 2 + vA ^ 2) +
        cs ^ 2 * vA ^ 2 * k ^ 2 * kParallel ^ 2 = 0)
    (hperp : kParallel = 0) :
    ω ^ 2 = 0 ∨ ω ^ 2 = (cs ^ 2 + vA ^ 2) * k ^ 2 := by
  rw [hperp] at hdisp
  have h0 : ω ^ 4 - ω ^ 2 * k ^ 2 * (cs ^ 2 + vA ^ 2) = 0 := by
    convert hdisp using 1
    ring
  have hfac : ω ^ 2 * (ω ^ 2 - k ^ 2 * (cs ^ 2 + vA ^ 2)) = 0 := by
    linear_combination h0
  rcases mul_eq_zero.mp hfac with h | h
  · exact Or.inl h
  · exact Or.inr (by linarith)

/-- The slow root does not solve compressional induction.

A nontrivial velocity wave with `k ≠ 0` and `B ≠ 0` has a nonzero
spatial derivative, so `ω = 0` cannot match `∂b/∂t = −B ∂v/∂x`. -/
theorem zero_frequency_not_compressional (A C k φ B : ℝ) (hA : A ≠ 0) (hk : k ≠ 0)
    (hB : B ≠ 0) :
    ¬ ∀ x t, timeFirst (planeWave C k 0 φ) x t =
      -B * spaceFirst (planeWave A k 0 φ) x t := by
  intro hall
  have hsin : ∃ x t, planeWave 1 k 0 (φ - Real.pi / 2) x t ≠ 0 :=
    planeWave_ne_zero_of_amplitude one_ne_zero (Or.inl hk)
  have hcoeff : C * (0 : ℝ) - A * B * k = 0 :=
    coeff_of_not_identically_zero
      (fun x t => by
        rw [← sin_as_planeWave k 0 φ x t]
        have hzero : timeFirst (planeWave C k 0 φ) x t -
            (-B) * spaceFirst (planeWave A k 0 φ) x t = 0 := sub_eq_zero.mpr (hall x t)
        rw [← induction_residual, hzero]) hsin
  have hprod : A * B * k = 0 := by linear_combination -hcoeff
  exact mul_ne_zero (mul_ne_zero hA hB) hk hprod

/-- With no gas pressure the compressional speed is the Alfvén value.

The polarization is still compressional. It is not the shear wave of
`PhysJS.AlfvenSpeed.speed_eq`. -/
theorem reduces_to_alfven (B μ0 ρ : ℝ) (hμ : 0 < μ0) (hρ : 0 < ρ) (hB : 0 ≤ B) :
    phaseSpeed 0 B μ0 ρ = PhysJS.AlfvenSpeed.alfvenSpeed B μ0 ρ := by
  have _hden : 0 < μ0 * ρ := by positivity
  unfold phaseSpeed PhysJS.AlfvenSpeed.alfvenSpeed
  rw [show ((0 : ℝ) ^ 2) = 0 by norm_num, zero_add, Real.sqrt_div (sq_nonneg B),
    Real.sqrt_sq_eq_abs, abs_of_nonneg hB]

/-- The quadrature is not the sound speed when `v_A ≠ 0`. -/
theorem not_sound_speed (cs vA : ℝ) (hv : vA ≠ 0) :
    Real.sqrt (cs ^ 2 + vA ^ 2) ≠ cs := by
  intro hEq
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt (by positivity : (0 : ℝ) ≤ cs ^ 2 + vA ^ 2)] at hsq
  have : vA ^ 2 = 0 := by linear_combination hsq
  exact hv (sq_eq_zero_iff.mp this)

/-- The quadrature is not the Alfvén speed when `c_s ≠ 0`. -/
theorem not_alfven_speed (cs vA : ℝ) (hcs : cs ≠ 0) :
    Real.sqrt (cs ^ 2 + vA ^ 2) ≠ vA := by
  intro hEq
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt (by positivity : (0 : ℝ) ≤ cs ^ 2 + vA ^ 2)] at hsq
  have : cs ^ 2 = 0 := by linear_combination hsq
  exact hcs (sq_eq_zero_iff.mp this)

/-- The quadrature is not the linear sum when both speeds are positive. -/
theorem not_linear_sum (cs vA : ℝ) (hcs : 0 < cs) (hv : 0 < vA) :
    Real.sqrt (cs ^ 2 + vA ^ 2) ≠ cs + vA := by
  intro hEq
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt (by positivity : (0 : ℝ) ≤ cs ^ 2 + vA ^ 2), add_sq] at hsq
  have hcross : cs * vA = 0 := by linarith
  exact (mul_pos hcs hv).ne' hcross

/-- `v = C √(c_s² + B² / (μ0 ρ))`. `C` is unfixed. -/
theorem coefficient_not_fixed (cs B μ0 ρ C : ℝ) (hμ : 0 < μ0) (hρ : 0 < ρ)
    (hsum : cs ^ 2 + B ^ 2 / (μ0 * ρ) ≠ 0) (hC : C ≠ 1) :
    C * phaseSpeed cs B μ0 ρ ≠ phaseSpeed cs B μ0 ρ := by
  intro hEq
  have hpos : 0 < cs ^ 2 + B ^ 2 / (μ0 * ρ) :=
    lt_of_le_of_ne (by positivity) (Ne.symm hsum)
  have hden : phaseSpeed cs B μ0 ρ ≠ 0 := by
    unfold phaseSpeed
    exact (Real.sqrt_pos.mpr hpos).ne'
  field_simp [hden] at hEq
  exact hC hEq

end PhysJS.FastMagnetosonic
