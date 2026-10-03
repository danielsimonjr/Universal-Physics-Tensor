/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.PlaneWave
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-67`. Bridge. The Alfvén speed at total mass density.

The catalog equation is

```
v_A = B / √(μ0 ρ)
```

`speed_eq` derives the phase speed of one transverse polarization of a
monochromatic wave propagating along a uniform background field. The two
premises are the parallel, incompressible, ideal-MHD linearization:

```
∂b/∂t = B ∂v/∂z
ρ ∂v/∂t = (B / μ0) ∂b/∂z
```

The magnetic amplitude has the same phase as the velocity. `ρ` in that
momentum equation is the inertia density. The catalog reads it as the
total mass density `n_i m_i + n_e m_e`. Proton-only `ρ = n m_p` is a
named special case: `proton_only_not_total` separates the sum from
`n m_p`, and `proton_only_differs` separates the speeds.

`coefficient_not_fixed` says a factor other than `1` is a different
number. Dimensional homogeneity of `{v, B, μ0, ρ}` is not formalized
here, so this file does not claim that the exponent vector is the only
one. The ideal-MHD linearization fixes the coefficient that the monomial
would have left free.

`gaussian_dictionary` is the unit conversion: gauss, grams per cubic
centimetre, and centimetres per second, brought back to metres per
second, agree with `B / √((4π × 10⁻⁷) ρ)`. `gaussian_needs_dictionary`
inserts tesla and the SI density into `B / √(4π ρ)` and fails.
`4π × 10⁻⁷` is the permeability stand-in inside this comparison. It is
not a claim of bit-level agreement with a measured `μ0`.

Not a kinetic dispersion relation. Not the slow or fast magnetosonic
speed. Physlib has no MHD module; the two linearized equations are
hypotheses, not a theorem of that library.
-/

namespace PhysJS.AlfvenSpeed

open PhysJS.PlaneWave Real

/-- First derivative along the background field. -/
noncomputable def spaceFirst (u : ℝ → ℝ → ℝ) (z t : ℝ) : ℝ :=
  deriv (fun y => u y t) z

/-- Total mass density `n_i m_i + n_e m_e`. Proton-only drops the second term. -/
def totalMassDensity (ni mi ne me : ℝ) : ℝ :=
  ni * mi + ne * me

/-- Alfvén speed at a positive field. The root is the non-negative one. -/
noncomputable def alfvenSpeed (B μ0 ρ : ℝ) : ℝ :=
  B / Real.sqrt (μ0 * ρ)

lemma spaceFirst_planeWave (A k ω φ z t : ℝ) :
    spaceFirst (planeWave A k ω φ) z t =
      -(A * k * Real.sin (k * z - ω * t + φ)) :=
  deriv_planeWave_space A k ω φ t z

lemma sin_as_planeWave (k ω φ z t : ℝ) :
    Real.sin (k * z - ω * t + φ) =
      planeWave 1 k ω (φ - Real.pi / 2) z t := by
  unfold planeWave
  have harg : k * z - ω * t + (φ - Real.pi / 2) =
      (k * z - ω * t + φ) - Real.pi / 2 := by ring
  rw [one_mul, harg, Real.cos_sub_pi_div_two]

lemma induction_residual (A C k ω φ B z t : ℝ) :
    timeFirst (planeWave C k ω φ) z t - B * spaceFirst (planeWave A k ω φ) z t =
      (C * ω + B * A * k) * Real.sin (k * z - ω * t + φ) := by
  rw [show timeFirst (planeWave C k ω φ) z t =
      deriv (fun s => planeWave C k ω φ z s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

lemma momentum_residual (A C k ω φ B μ0 ρ z t : ℝ) :
    ρ * timeFirst (planeWave A k ω φ) z t -
        (B / μ0) * spaceFirst (planeWave C k ω φ) z t =
      (ρ * A * ω + (B / μ0) * C * k) * Real.sin (k * z - ω * t + φ) := by
  rw [show timeFirst (planeWave A k ω φ) z t =
      deriv (fun s => planeWave A k ω φ z s) t from rfl,
    deriv_planeWave_time, spaceFirst_planeWave]
  ring

/-- The two linearized equations fix `ω² = B² k² / (μ0 ρ)`.

`hinduction` is ideal induction for a uniform field `B` and a
wavevector along that field. `hmomentum` is the Lorentz force
`(∇ × b) × B / μ0` reduced to this polarization. The velocity wave is
not identically zero, and `k ≠ 0`. -/
theorem dispersion_eq (A C k ω φ B μ0 ρ : ℝ) (hk : k ≠ 0) (hμ : μ0 ≠ 0) (hρ : ρ ≠ 0)
    (hnt : ∃ z t, planeWave A k ω φ z t ≠ 0)
    (hinduction : ∀ z t,
      timeFirst (planeWave C k ω φ) z t = B * spaceFirst (planeWave A k ω φ) z t)
    (hmomentum : ∀ z t,
      ρ * timeFirst (planeWave A k ω φ) z t =
        (B / μ0) * spaceFirst (planeWave C k ω φ) z t) :
    ω ^ 2 = B ^ 2 / (μ0 * ρ) * k ^ 2 := by
  have hind : ∀ z t, (C * ω + B * A * k) * Real.sin (k * z - ω * t + φ) = 0 := by
    intro z t
    have hzero : timeFirst (planeWave C k ω φ) z t -
        B * spaceFirst (planeWave A k ω φ) z t = 0 := sub_eq_zero.mpr (hinduction z t)
    rw [← induction_residual, hzero]
  have hmom : ∀ z t,
      (ρ * A * ω + (B / μ0) * C * k) * Real.sin (k * z - ω * t + φ) = 0 := by
    intro z t
    have hzero : ρ * timeFirst (planeWave A k ω φ) z t -
        (B / μ0) * spaceFirst (planeWave C k ω φ) z t = 0 :=
      sub_eq_zero.mpr (hmomentum z t)
    rw [← momentum_residual, hzero]
  have hsin : ∃ z t, planeWave 1 k ω (φ - Real.pi / 2) z t ≠ 0 :=
    planeWave_ne_zero_of_amplitude one_ne_zero (Or.inl hk)
  have hcoeff : C * ω + B * A * k = 0 :=
    coeff_of_not_identically_zero
      (fun z t => by rw [← sin_as_planeWave k ω φ z t]; exact hind z t) hsin
  have hcoeff2 : ρ * A * ω + (B / μ0) * C * k = 0 :=
    coeff_of_not_identically_zero
      (fun z t => by rw [← sin_as_planeWave k ω φ z t]; exact hmom z t) hsin
  have hA : A ≠ 0 := by
    obtain ⟨z, t, hzt⟩ := hnt
    intro hA0
    apply hzt
    simp [planeWave, hA0]
  have hCω : C * ω = -(A * k * B) := by linear_combination hcoeff
  have hsub : ρ * A * ω ^ 2 - A * k ^ 2 * B ^ 2 / μ0 = 0 := by
    have hmul : ρ * A * ω ^ 2 + (B / μ0) * k * (C * ω) = 0 := by
      calc
        ρ * A * ω ^ 2 + (B / μ0) * k * (C * ω)
            = ω * (ρ * A * ω + (B / μ0) * C * k) := by ring
        _ = ω * 0 := by rw [hcoeff2]
        _ = 0 := by ring
    rw [hCω] at hmul
    linear_combination hmul
  have hfactor : A * (ρ * ω ^ 2 - k ^ 2 * B ^ 2 / μ0) = 0 := by
    linear_combination hsub
  have hrest : ρ * ω ^ 2 - k ^ 2 * B ^ 2 / μ0 = 0 :=
    (mul_eq_zero.mp hfactor).resolve_left hA
  have hρdisp : ρ * ω ^ 2 = k ^ 2 * B ^ 2 / μ0 := by linarith
  field_simp [hμ, hρ] at hρdisp ⊢
  linarith

/-- Phase speed of that wave. For `B > 0` it is the catalog value
`B / √(μ0 ρ)`.

Kind `bridge` on `PhysJS.AlfvenSpeed.speed_eq`. The covers line still
begins with `derivation-step`. `ρ` is the density in the momentum
premise, read as the total mass density. Not a kinetic dispersion. -/
theorem speed_eq (A C k ω φ B μ0 ρ : ℝ) (hk : k ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρ)
    (hB : 0 < B) (hnt : ∃ z t, planeWave A k ω φ z t ≠ 0)
    (hinduction : ∀ z t,
      timeFirst (planeWave C k ω φ) z t = B * spaceFirst (planeWave A k ω φ) z t)
    (hmomentum : ∀ z t,
      ρ * timeFirst (planeWave A k ω φ) z t =
        (B / μ0) * spaceFirst (planeWave C k ω φ) z t) :
    |ω / k| = alfvenSpeed B μ0 ρ := by
  have hdisp := dispersion_eq A C k ω φ B μ0 ρ hk hμ.ne' hρ.ne' hnt hinduction hmomentum
  have hsq : (ω / k) ^ 2 = B ^ 2 / (μ0 * ρ) := by
    field_simp [hk, hμ.ne', hρ.ne'] at hdisp ⊢
    linarith
  unfold alfvenSpeed
  calc
    |ω / k| = Real.sqrt ((ω / k) ^ 2) := by rw [Real.sqrt_sq_eq_abs]
    _ = Real.sqrt (B ^ 2 / (μ0 * ρ)) := by rw [hsq]
    _ = Real.sqrt (B ^ 2) / Real.sqrt (μ0 * ρ) := by rw [Real.sqrt_div (sq_nonneg B)]
    _ = |B| / Real.sqrt (μ0 * ρ) := by rw [Real.sqrt_sq_eq_abs]
    _ = B / Real.sqrt (μ0 * ρ) := by rw [abs_of_pos hB]

/-- The same hypotheses put the velocity wave on the wave equation at
`B² / (μ0 ρ)`. -/
theorem solves_wave_equation (A C k ω φ B μ0 ρ : ℝ) (hk : k ≠ 0) (hμ : 0 < μ0)
    (hρ : 0 < ρ) (_hB : 0 < B) (hnt : ∃ z t, planeWave A k ω φ z t ≠ 0)
    (hinduction : ∀ z t,
      timeFirst (planeWave C k ω φ) z t = B * spaceFirst (planeWave A k ω φ) z t)
    (hmomentum : ∀ z t,
      ρ * timeFirst (planeWave A k ω φ) z t =
        (B / μ0) * spaceFirst (planeWave C k ω φ) z t) :
    ∀ z t, timeSecond (planeWave A k ω φ) z t =
      (B ^ 2 / (μ0 * ρ)) * spaceSecond (planeWave A k ω φ) z t := by
  have hdisp := dispersion_eq A C k ω φ B μ0 ρ hk hμ.ne' hρ.ne' hnt hinduction hmomentum
  have hwave : ω ^ 2 = (B ^ 2 / (μ0 * ρ)) * k ^ 2 := by rw [hdisp]
  exact (wave_solves_iff A k ω φ (B ^ 2 / (μ0 * ρ)) hnt).2 hwave

/-- Electrons make the total density differ from proton-only `n m_p`. -/
theorem proton_only_not_total (n mp me : ℝ) (hn : 0 < n) (hme : 0 < me) :
    totalMassDensity n mp n me ≠ n * mp := by
  unfold totalMassDensity
  intro hEq
  have : n * me = 0 := by linarith
  exact (mul_pos hn hme).ne' this

/-- `v = C * B / sqrt(μ0 * ρ)`. `C` is unfixed. Covers a derivation step only. -/
theorem coefficient_not_fixed
    (B μ0 ρ C : ℝ) (hB : B ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρ) (hC : C ≠ 1) :
    C * B / Real.sqrt (μ0 * ρ) ≠ B / Real.sqrt (μ0 * ρ) := by
  intro hEq
  have hden : Real.sqrt (μ0 * ρ) ≠ 0 := by positivity
  field_simp [hden, hB] at hEq
  exact hC hEq

/-- Proton-only density and a heavier density are different speeds when `B ≠ 0`. -/
theorem proton_only_differs
    (B μ0 ρp r : ℝ) (hB : B ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρp) (hr : 0 < r) (hne : r ≠ 1) :
    B / Real.sqrt (μ0 * ρp) ≠ B / Real.sqrt (μ0 * (r * ρp)) := by
  intro hEq
  have hs1 : Real.sqrt (μ0 * ρp) ≠ 0 := by positivity
  have hs2 : Real.sqrt (μ0 * (r * ρp)) ≠ 0 := by positivity
  field_simp [hB, hs1, hs2] at hEq
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt (by positivity : (0 : ℝ) ≤ μ0 * ρp * r),
    sq_sqrt (by positivity : (0 : ℝ) ≤ μ0 * ρp)] at hsq
  field_simp [hμ.ne', hρ.ne'] at hsq
  exact hne hsq

/-- The Gaussian formula agrees with the SI stand-in after the unit dictionary.

`B` is in tesla and `ρ` in kilograms per cubic metre. The left side converts
to gauss and grams per cubic centimetre, evaluates `B / √(4π ρ)`, and
converts centimetres per second back to metres per second. `4π × 10⁻⁷` is
the permeability stand-in, not a measured `μ0`. -/
theorem gaussian_dictionary (B ρ : ℝ) (hρ : 0 < ρ) :
    (B * 10 ^ 4) / Real.sqrt (4 * π * (ρ * 10 ^ (-3 : ℤ))) / 100 =
      B / Real.sqrt ((4 * π * 10 ^ (-7 : ℤ)) * ρ) := by
  have hdenG : 0 < 4 * π * (ρ * 10 ^ (-3 : ℤ)) := by positivity
  have hdenS : 0 < (4 * π * 10 ^ (-7 : ℤ)) * ρ := by positivity
  have hsqrt : (100 : ℝ) ^ 2 * ((4 * π * 10 ^ (-7 : ℤ)) * ρ) =
      4 * π * (ρ * 10 ^ (-3 : ℤ)) := by
    have hscale : (100 : ℝ) ^ 2 * (10 ^ (-7 : ℤ)) = 10 ^ (-3 : ℤ) := by norm_num
    calc
      (100 : ℝ) ^ 2 * ((4 * π * 10 ^ (-7 : ℤ)) * ρ)
          = ((100 : ℝ) ^ 2 * 10 ^ (-7 : ℤ)) * (4 * π * ρ) := by ring
      _ = 10 ^ (-3 : ℤ) * (4 * π * ρ) := by rw [hscale]
      _ = 4 * π * (ρ * 10 ^ (-3 : ℤ)) := by ring
  have hroot : Real.sqrt (4 * π * (ρ * 10 ^ (-3 : ℤ))) =
      100 * Real.sqrt ((4 * π * 10 ^ (-7 : ℤ)) * ρ) := by
    have hsq := congrArg Real.sqrt hsqrt.symm
    rw [Real.sqrt_mul (sq_nonneg (100 : ℝ)), Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 100)] at hsq
    exact hsq
  have hsG : Real.sqrt (4 * π * (ρ * 10 ^ (-3 : ℤ))) ≠ 0 := (Real.sqrt_pos.mpr hdenG).ne'
  have hsS : Real.sqrt ((4 * π * 10 ^ (-7 : ℤ)) * ρ) ≠ 0 := (Real.sqrt_pos.mpr hdenS).ne'
  have h100 : (100 : ℝ) ≠ 0 := by norm_num
  calc
    (B * 10 ^ 4) / Real.sqrt (4 * π * (ρ * 10 ^ (-3 : ℤ))) / 100
        = B * 100 / Real.sqrt (4 * π * (ρ * 10 ^ (-3 : ℤ))) := by
          field_simp [hsG, h100]
          norm_num
    _ = B * 100 / (100 * Real.sqrt ((4 * π * 10 ^ (-7 : ℤ)) * ρ)) := by rw [hroot]
    _ = B / Real.sqrt ((4 * π * 10 ^ (-7 : ℤ)) * ρ) := by field_simp [hsS, h100]

/-- The Gaussian formula agrees with SI only after the unit dictionary.

Inserting tesla and the SI density into `B / sqrt(4π ρ)` fails. -/
theorem gaussian_needs_dictionary
    (B ρ vSi : ℝ) (hB : 0 < B) (hρ : 0 < ρ)
    (hv : vSi = B / Real.sqrt ((4 * π * (1e-7 : ℝ)) * ρ)) :
    B / Real.sqrt (4 * π * ρ) ≠ vSi := by
  intro hEq
  have hμ : (1e-7 : ℝ) ≠ 1 := by norm_num
  have hμpos : (0 : ℝ) < 1e-7 := by norm_num
  have hdenG : 0 < 4 * π * ρ := by positivity
  have hdenS : 0 < (4 * π * (1e-7 : ℝ)) * ρ := by positivity
  rw [hv] at hEq
  have hsG : Real.sqrt (4 * π * ρ) ≠ 0 := (Real.sqrt_pos.mpr hdenG).ne'
  have hsS : Real.sqrt ((4 * π * (1e-7 : ℝ)) * ρ) ≠ 0 := (Real.sqrt_pos.mpr hdenS).ne'
  field_simp [hB.ne', hsG, hsS] at hEq
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt (by positivity : (0 : ℝ) ≤ 4 * π * ρ * (1e-7 : ℝ)),
    sq_sqrt hdenG.le] at hsq
  field_simp [hρ.ne', Real.pi_ne_zero] at hsq
  exact hμ hsq

end PhysJS.AlfvenSpeed
