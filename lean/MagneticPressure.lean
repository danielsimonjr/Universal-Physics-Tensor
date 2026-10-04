/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Dimensional
import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-74`. Bridge. Isotropic magnetic pressure.

The catalog equation is

```
p_B = B² / (2 μ0)
```

Units fix the monomial `p ∝ B² / μ0` and do not fix the `2`. `pressure_monomial`
is that Buckingham step: `p = C B² / μ0` with `C = f(1, 1)` unfixed.
`coefficient_not_fixed` separates any other factor from `1/2`.
`full_monomial_not_pressure` is the prefactor `1` that `B² / μ0` recovers.

`pressure_eq` derives the `2`. A linear inductor obeys `dU/dI = L I` with
`U(0) = 0`, so `stored_energy` is `U = (L/2) I²`. The `1/2` is the integral
of `L I`, not an assumption. A long solenoid has `B = μ0 n I` and flux linkage
`Λ = N B A`, so `solenoid_inductance` is `L = μ0 n² V`. At fixed current the
battery supplies `I ΔΛ`. The stored energy rises by half of that. The
difference is the mechanical work `p ΔV` done by the field. That balance is a
hypothesis: quasistatic, no radiation. It is not the Maxwell stress tensor
derived from a field Lagrangian.

`battery_not_mechanical` keeps the battery work `I² ΔL` and drops the stored
half. That is `B² / μ0` per volume, not this pressure. Not a kinetic pressure.
-/

namespace PhysJS.MagneticPressure

open Real Set

/-- Catalog magnetic pressure. The factor `2` is `pressure_eq`. -/
noncomputable def magneticPressure (B μ0 : ℝ) : ℝ :=
  B ^ 2 / (2 * μ0)

/-- `dU/dI = L I` and `U(0) = 0` integrate to `(L/2) I²`.

`hderiv` is the linear inductor: the power `I · (L dI/dt)` is the derivative
of `U` along the current. The factor `1/2` is this integral. -/
theorem stored_energy (U : ℝ → ℝ) (L I0 : ℝ)
    (hderiv : ∀ J, HasDerivAt U (L * J) J) (h0 : U 0 = 0) :
    U I0 = (L / 2) * I0 ^ 2 := by
  by_cases hI : I0 = 0
  · simp [hI, h0]
  let energy : ℝ → ℝ := fun J => (L / 2) * J ^ 2
  let f : ℝ → ℝ := U - energy
  have hf : ∀ J, HasDerivAt f 0 J := by
    intro J
    have hsq : HasDerivAt (fun K => K ^ 2) (2 * J) J := by
      simpa using hasDerivAt_pow 2 J
    have hE : HasDerivAt energy (L * J) J := by
      have hmul := hsq.const_mul (L / 2)
      simpa [energy] using hmul.congr_deriv (by ring : (L / 2) * (2 * J) = L * J)
    exact ((hderiv J).sub hE).congr_deriv (by ring)
  have hcont : ContinuousOn f (Icc (min 0 I0) (max 0 I0)) :=
    fun J _ => (hf J).continuousAt.continuousWithinAt
  have hab : min 0 I0 < max 0 I0 := by
    cases le_total (0 : ℝ) I0 with
    | inl hle =>
      rw [min_eq_left hle, max_eq_right hle]
      exact lt_of_le_of_ne hle (Ne.symm hI)
    | inr hle =>
      rw [min_eq_right hle, max_eq_left hle]
      exact lt_of_le_of_ne hle hI
  have hff : ∀ J ∈ Ioo (min 0 I0) (max 0 I0), HasDerivAt f 0 J := fun J _ => hf J
  obtain ⟨_c, _hc, hslope⟩ :=
    exists_hasDerivAt_eq_slope f (fun _ => (0 : ℝ)) hab hcont hff
  have hspan : max 0 I0 - min 0 I0 ≠ 0 := sub_ne_zero.mpr hab.ne'
  have hflat : f (max 0 I0) = f (min 0 I0) := by
    have hzero : (f (max 0 I0) - f (min 0 I0)) / (max 0 I0 - min 0 I0) = 0 := hslope.symm
    rw [div_eq_zero_iff] at hzero
    rcases hzero with h | h
    · linarith
    · exact absurd h hspan
  have hend : f I0 = f 0 := by
    cases le_total (0 : ℝ) I0 with
    | inl hle =>
      simpa [min_eq_left hle, max_eq_right hle] using hflat
    | inr hle =>
      simpa [min_eq_right hle, max_eq_left hle] using hflat.symm
  have hf0 : f 0 = 0 := by simp [f, energy, h0, Pi.sub_apply]
  have hzero : f I0 = 0 := hend.trans hf0
  have hsub : U I0 - (L / 2) * I0 ^ 2 = 0 := by
    simpa [f, energy, Pi.sub_apply] using hzero
  linarith

/-- Ampere's law and the flux linkage of a long solenoid give `L = μ0 n² V`.

`hAmpere` is `B = μ0 n I`. `hFlux` is `N = n ℓ` turns, each of flux `B A`.
`hInductance` is `L = Λ / I`. `n` is turns per length. -/
theorem solenoid_inductance
    (L Λ B μ0 nTurns I Area length V : ℝ) (hI : I ≠ 0)
    (hAmpere : B = μ0 * nTurns * I) (hVolume : V = Area * length)
    (hFlux : Λ = (nTurns * length) * (B * Area)) (hInductance : L = Λ / I) :
    L = μ0 * nTurns ^ 2 * V := by
  have hΛ : Λ = μ0 * nTurns ^ 2 * I * V := by
    rw [hFlux, hAmpere, hVolume]
    ring
  rw [hInductance, hΛ]
  field_simp [hI]

/-- Fixed-current expansion of a long solenoid. The mechanical work per volume
is `B² / (2 μ0)`.

`hderiv₁` and `hderiv₂` are the linear inductor at the two areas, same
current and same turns per length. `hBattery` is `I` times the change in flux
linkage. `hBalance` splits that work into the rise in stored energy and the
mechanical work. `hMech` is `p ΔV`. `μ0 ≠ 0` and `ΔV ≠ 0`.

Kind `bridge` on `PhysJS.MagneticPressure.pressure_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a kinetic
pressure, and not a Lagrangian derivation of the Maxwell stress tensor. -/
theorem pressure_eq
    (U1 U2 : ℝ → ℝ)
    (L1 L2 Λ1 Λ2 B μ0 nTurns I Area1 Area2 length V1 V2 p Wbat Wmech : ℝ)
    (hI : I ≠ 0) (hμ : μ0 ≠ 0)
    (hderiv1 : ∀ J, HasDerivAt U1 (L1 * J) J) (h01 : U1 0 = 0)
    (hderiv2 : ∀ J, HasDerivAt U2 (L2 * J) J) (h02 : U2 0 = 0)
    (hAmpere : B = μ0 * nTurns * I)
    (hV1 : V1 = Area1 * length) (hV2 : V2 = Area2 * length)
    (hFlux1 : Λ1 = (nTurns * length) * (B * Area1))
    (hFlux2 : Λ2 = (nTurns * length) * (B * Area2))
    (hL1 : L1 = Λ1 / I) (hL2 : L2 = Λ2 / I)
    (hBattery : Wbat = I * (Λ2 - Λ1))
    (hBalance : Wbat = (U2 I - U1 I) + Wmech)
    (hMech : Wmech = p * (V2 - V1))
    (hΔV : V2 - V1 ≠ 0) :
    p = magneticPressure B μ0 := by
  have hU1 := stored_energy U1 L1 I hderiv1 h01
  have hU2 := stored_energy U2 L2 I hderiv2 h02
  have hsol1 :=
    solenoid_inductance L1 Λ1 B μ0 nTurns I Area1 length V1 hI hAmpere hV1 hFlux1 hL1
  have hsol2 :=
    solenoid_inductance L2 Λ2 B μ0 nTurns I Area2 length V2 hI hAmpere hV2 hFlux2 hL2
  have hΔL : L2 - L1 = μ0 * nTurns ^ 2 * (V2 - V1) := by
    rw [hsol1, hsol2]
    ring
  have hΔU : U2 I - U1 I = ((L2 - L1) / 2) * I ^ 2 := by
    rw [hU1, hU2]
    ring
  have hlink1 : Λ1 = L1 * I := by
    rw [hL1]
    field_simp [hI]
  have hlink2 : Λ2 = L2 * I := by
    rw [hL2]
    field_simp [hI]
  have hbat : Wbat = I ^ 2 * (L2 - L1) := by
    rw [hBattery, hlink1, hlink2]
    ring
  have hW : Wmech = ((L2 - L1) / 2) * I ^ 2 := by
    have hsplit : Wmech = Wbat - (U2 I - U1 I) := by
      rw [hBalance]
      ring
    rw [hsplit, hbat, hΔU]
    ring
  have hwork : p * (V2 - V1) = (μ0 * nTurns ^ 2 * I ^ 2 / 2) * (V2 - V1) := by
    calc
      p * (V2 - V1) = Wmech := hMech.symm
      _ = ((L2 - L1) / 2) * I ^ 2 := hW
      _ = (μ0 * nTurns ^ 2 * (V2 - V1) / 2) * I ^ 2 := by rw [hΔL]
      _ = (μ0 * nTurns ^ 2 * I ^ 2 / 2) * (V2 - V1) := by ring
  have hp : p = μ0 * nTurns ^ 2 * I ^ 2 / 2 := by
    apply mul_right_cancel₀ hΔV
    exact hwork
  unfold magneticPressure
  rw [hp, hAmpere]
  field_simp [hμ]

/-- The battery work at fixed current is twice the mechanical work.

Dropping the stored-energy half leaves `I² ΔL`, which is not `(ΔL/2) I²`. -/
theorem battery_not_mechanical (ΔL I : ℝ) (hΔ : ΔL ≠ 0) (hI : I ≠ 0) :
    I ^ 2 * ΔL ≠ (ΔL / 2) * I ^ 2 := by
  intro hEq
  have hhalf : I ^ 2 * ΔL = I ^ 2 * ΔL / 2 := by
    calc
      I ^ 2 * ΔL = (ΔL / 2) * I ^ 2 := hEq
      _ = I ^ 2 * ΔL / 2 := by ring
  field_simp [hI, hΔ] at hhalf
  norm_num at hhalf

/-- `[B] = M T⁻² I⁻¹`. -/
def fieldDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 0
  | 2 => -2
  | 3 => -1

/-- `[μ0] = M L T⁻² I⁻²`. -/
def permeabilityDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 1
  | 2 => -2
  | 3 => -2

/-- `[p] = M L⁻¹ T⁻²`. -/
def pressureDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => -1
  | 2 => -2
  | 3 => 0

/-- The two inputs, in the order `(B, μ0)`. -/
def pressureInputs : Fin 2 → Dimensional.Dim 4
  | 0 => fieldDim
  | 1 => permeabilityDim

/-- The monomial exponents forced by `[p] = [B]² [μ0]⁻¹`. -/
def pressureExponent : Fin 2 → ℚ
  | 0 => 2
  | 1 => -1

lemma pressure_dimension_eq :
    ∀ i, pressureDim i = ∑ j : Fin 2, pressureExponent j * pressureInputs j i := by
  intro i
  fin_cases i <;>
    simp [pressureDim, pressureExponent, pressureInputs, fieldDim, permeabilityDim,
      Fin.sum_univ_two] <;> norm_num

/-- Every positive `(B, μ0)` is a unit change of `(1, 1)`. -/
lemma pressure_reach (x : Fin 2 → ℝ) (hx : ∀ j, 0 < x j) :
    ∃ lam : Fin 4 → ℝ, (∀ i, 0 < lam i) ∧
      ∀ j, Dimensional.factor lam (pressureInputs j) = x j := by
  let lam : Fin 4 → ℝ := fun i => if i = 0 then x 0 else if i = 1 then x 1 / x 0 else 1
  refine ⟨lam, ?_, ?_⟩
  · intro i
    fin_cases i
    · simpa [lam] using hx 0
    · simpa [lam] using div_pos (hx 1) (hx 0)
    · simp [lam]
    · simp [lam]
  · intro j
    fin_cases j
    · unfold Dimensional.factor
      rw [Fin.prod_univ_four]
      have hlam0 : lam 0 = x 0 := by simp [lam]
      have hlam1 : lam 1 = x 1 / x 0 := by simp [lam]
      have hlam2 : lam 2 = 1 := by simp [lam]
      have hlam3 : lam 3 = 1 := by simp [lam]
      simp only [pressureInputs, fieldDim, hlam0, hlam1, hlam2, hlam3]
      simp [rpow_one, rpow_zero, one_rpow, mul_one]
    · unfold Dimensional.factor
      rw [Fin.prod_univ_four]
      have hlam0 : lam 0 = x 0 := by simp [lam]
      have hlam1 : lam 1 = x 1 / x 0 := by simp [lam]
      have hlam2 : lam 2 = 1 := by simp [lam]
      have hlam3 : lam 3 = 1 := by simp [lam]
      simp only [pressureInputs, permeabilityDim, hlam0, hlam1, hlam2, hlam3]
      simp [rpow_one, mul_one]
      field_simp [(hx 0).ne']

/-- Hypothesis: a positive pressure is dimensionally homogeneous in `B` and
`μ0` alone. Then `p = C B² / μ0` and `C = f(1, 1)`.

`C = 1/2` is not derived. `pressure_eq` is the step that fixes it. -/
theorem pressure_monomial (f : (Fin 2 → ℝ) → ℝ)
    (hf : Dimensional.Homogeneous pressureInputs pressureDim f) {x : Fin 2 → ℝ}
    (hx : ∀ j, 0 < x j) :
    f x = f (fun _ => 1) * x 0 ^ 2 / x 1 := by
  have hform := Dimensional.monomial_form pressureInputs pressureDim pressureExponent
    pressure_dimension_eq pressure_reach hf hx
  rw [hform, Fin.prod_univ_two]
  simp only [pressureExponent]
  rw [show ((2 : ℚ) : ℝ) = (2 : ℝ) by norm_num, rpow_two,
    show ((-1 : ℚ) : ℝ) = (-1 : ℝ) by norm_num, rpow_neg_one, ← mul_assoc, ← div_eq_mul_inv]

/-- `p = C B² / μ0`. `C = 1/2` is not the dimensional conclusion. -/
theorem coefficient_not_fixed (B μ0 C : ℝ) (hB : B ≠ 0) (hμ : μ0 ≠ 0) (hC : C ≠ 1 / 2) :
    C * (B ^ 2 / μ0) ≠ magneticPressure B μ0 := by
  intro hEq
  unfold magneticPressure at hEq
  have : C * 2 = 1 := by
    field_simp [hB, hμ] at hEq
    linarith
  have : C = 1 / 2 := by
    field_simp at this
    linarith
  exact hC this

/-- The monomial with prefactor `1` is not the magnetic pressure. -/
theorem full_monomial_not_pressure (B μ0 : ℝ) (hB : B ≠ 0) (hμ : μ0 ≠ 0) :
    B ^ 2 / μ0 ≠ magneticPressure B μ0 := by
  have hC : (1 : ℝ) ≠ 1 / 2 := by norm_num
  simpa using coefficient_not_fixed B μ0 1 hB hμ hC

end PhysJS.MagneticPressure
