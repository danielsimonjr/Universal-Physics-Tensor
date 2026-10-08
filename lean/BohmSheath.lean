/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-103`. Bridge. Bohm sheath for cold ions, and the one-dimensional warm-ion speed.

`be-103.warmSound`. Derivation step. `warm_sound_eq`.

Proved under these hypotheses. Ions are singly charged with `e > 0`. The sheath
potential is zero at the edge and negative in the sheath. Cold ions fall from
the edge speed `u₀`, so

```
n_i(φ) = n₀ / √(1 − 2 e φ / (m_i u₀²))
```

Electrons are Boltzmann, `n_e = n₀ exp(e φ / (k_B T_e))`. Poisson's source near
the edge has the sheath sign when the electron slope is at least the ion slope.
That comparison is `u₀² ≥ k_B T_e / m_i`. The Mach number is `u₀` over
`√(k_B T_e / m_i)`.

Warm ions use a fluid closure, not a kinetic sheath integral. One-dimensional
adiabatic compression has `p ∝ n³`, so `γ_i = 3` and `dp/dn = 3 p/n`.
Isothermal electrons contribute `k_B T_e`. The quasineutral sound speed is

```
c_s² = (k_B T_e + 3 k_B T_i) / m_i
```

The three-dimensional index `5/3` is a different closure.
-/

namespace PhysJS.BohmSheath

open Real Filter

/-- Cold-ion density. The potential is zero at the sheath edge. -/
noncomputable def coldIonDensity (n0 e φ m u0 : ℝ) : ℝ :=
  n0 / Real.sqrt (1 - 2 * e * φ / (m * u0 ^ 2))

/-- Boltzmann electrons at the same potential. -/
noncomputable def boltzmannElectron (n0 e φ kT : ℝ) : ℝ :=
  n0 * Real.exp (e * φ / kT)

/-- Cold Bohm speed `√(k_B T_e / m_i)`. The root is the non-negative one. -/
noncomputable def coldBohmSpeed (kT m : ℝ) : ℝ :=
  Real.sqrt (kT / m)

/-- Fluid sound speed with `γ_e = 1` and `γ_i = 3`. -/
noncomputable def warmSoundSpeed (kTe kTi m : ℝ) : ℝ :=
  Real.sqrt ((kTe + 3 * kTi) / m)

/-- Edge value and potential slope of the cold-ion density.

The radicand equals `1` at `φ = 0`, so the density equals `n₀`. The chain rule
on `n₀ / √s` produces `n₀ e / (m_i u₀²)`. -/
theorem cold_ion_slope (n0 e m u0 : ℝ) (hm : m ≠ 0) (hu : u0 ≠ 0) :
    coldIonDensity n0 e 0 m u0 = n0 ∧
      deriv (fun φ => coldIonDensity n0 e φ m u0) 0 = n0 * e / (m * u0 ^ 2) := by
  have hden : m * u0 ^ 2 ≠ 0 := mul_ne_zero hm (pow_ne_zero 2 hu)
  have hs0 : (1 : ℝ) - 2 * e * 0 / (m * u0 ^ 2) = 1 := by ring
  let s : ℝ → ℝ := fun φ => 1 - 2 * e * φ / (m * u0 ^ 2)
  have hs0' : s 0 = 1 := by simp [s, hs0]
  constructor
  · unfold coldIonDensity
    rw [hs0, Real.sqrt_one, div_one]
  · have hcoeff : HasDerivAt (fun φ : ℝ => (2 * e / (m * u0 ^ 2)) * φ)
        (2 * e / (m * u0 ^ 2)) 0 :=
      ((hasDerivAt_id 0).const_mul (2 * e / (m * u0 ^ 2))).congr_deriv (by ring)
    have hconst : HasDerivAt (fun _ : ℝ => (1 : ℝ)) 0 0 := hasDerivAt_const 0 1
    have hdiff : HasDerivAt (fun φ => (1 : ℝ) - (2 * e / (m * u0 ^ 2)) * φ)
        (0 - 2 * e / (m * u0 ^ 2)) 0 := hconst.sub hcoeff
    have hdiff' := hdiff.congr_deriv
      (by ring : (0 : ℝ) - 2 * e / (m * u0 ^ 2) = -(2 * e / (m * u0 ^ 2)))
    have hs' : HasDerivAt s (-(2 * e / (m * u0 ^ 2))) 0 := by
      apply hdiff'.congr_of_eventuallyEq
      refine Eventually.of_forall ?_
      intro φ
      simp [s]
      field_simp [hden]
    have hsqrt : HasDerivAt (fun φ => Real.sqrt (s φ))
        ((-(2 * e / (m * u0 ^ 2))) / (2 * Real.sqrt (s 0))) 0 :=
      hs'.sqrt (by simp [hs0'])
    have hsq1 : Real.sqrt (s 0) = 1 := by simp [hs0']
    have hconstN : HasDerivAt (fun _ : ℝ => n0) 0 0 := hasDerivAt_const 0 n0
    have hdiv : HasDerivAt (fun φ => n0 / Real.sqrt (s φ))
        ((0 * Real.sqrt (s 0) -
            n0 * ((-(2 * e / (m * u0 ^ 2))) / (2 * Real.sqrt (s 0)))) /
          Real.sqrt (s 0) ^ 2) 0 :=
      hconstN.fun_div hsqrt (by simp [hsq1])
    have hfunEq : (fun φ => coldIonDensity n0 e φ m u0) =
        fun φ => n0 / Real.sqrt (s φ) := by
      funext φ
      unfold coldIonDensity s
      rfl
    rw [congrArg (fun f => deriv f 0) hfunEq, hdiv.deriv, hsq1]
    field_simp [hden]
    ring

/-- Boltzmann slope at the sheath edge: `n₀ e / (k_B T_e)`. -/
theorem boltzmann_slope (n0 e kT : ℝ) (hkT : kT ≠ 0) :
    deriv (fun φ => boltzmannElectron n0 e φ kT) 0 = n0 * e / kT := by
  unfold boltzmannElectron
  have hid : HasDerivAt (fun φ : ℝ => φ) 1 0 := hasDerivAt_id 0
  have harg : HasDerivAt (fun φ => e * φ / kT) (e / kT) 0 := by
    have hmul := hid.const_mul (e / kT)
    simpa [div_eq_mul_inv, mul_assoc, mul_comm, mul_left_comm] using hmul
  have hexp := (harg.exp).const_mul n0
  rw [hexp.deriv]
  have hzero : e * 0 / kT = 0 := by ring
  rw [hzero, Real.exp_zero]
  field_simp [hkT]

/-- Sheath inequality for cold ions.

`elecSlope` and `ionSlope` are the edge derivatives of `n_e` and `n_i`.
Both carry the positive factor `n₀ e`, so `elecSlope ≥ ionSlope` if and only
if `|u₀| ≥ √(k_B T_e / m_i)`. -/
theorem cold_bohm_threshold (elecSlope ionSlope n0 e kT m u0 : ℝ)
    (hn : 0 < n0) (he : 0 < e) (hkT : 0 < kT) (hm : 0 < m) (hu : u0 ≠ 0)
    (hElec : elecSlope = n0 * e / kT)
    (hIon : ionSlope = n0 * e / (m * u0 ^ 2)) :
    ionSlope ≤ elecSlope ↔ coldBohmSpeed kT m ≤ |u0| := by
  have hfac : 0 < n0 * e := mul_pos hn he
  have hmu : 0 < m * u0 ^ 2 := by positivity
  have hdiff : elecSlope - ionSlope =
      n0 * e * (1 / kT - 1 / (m * u0 ^ 2)) := by
    rw [hElec, hIon]
    field_simp [hkT.ne', hmu.ne']
  have hsign : ionSlope ≤ elecSlope ↔ 0 ≤ 1 / kT - 1 / (m * u0 ^ 2) := by
    rw [← sub_nonneg, hdiff]
    exact mul_nonneg_iff_of_pos_left hfac
  have hrecip : 0 ≤ 1 / kT - 1 / (m * u0 ^ 2) ↔ kT ≤ m * u0 ^ 2 := by
    constructor
    · intro h
      have hle : 1 / (m * u0 ^ 2) ≤ 1 / kT := by linarith
      exact (one_div_le_one_div hmu hkT).mp hle
    · intro h
      have hle : 1 / (m * u0 ^ 2) ≤ 1 / kT := (one_div_le_one_div hmu hkT).mpr h
      linarith
  have hspeed : kT ≤ m * u0 ^ 2 ↔ coldBohmSpeed kT m ≤ |u0| := by
    unfold coldBohmSpeed
    rw [← Real.sqrt_sq_eq_abs]
    have hy : 0 ≤ u0 ^ 2 := sq_nonneg u0
    constructor
    · intro h
      have hdiv : kT / m ≤ u0 ^ 2 := by
        rw [div_le_iff₀ hm]
        linarith
      exact (Real.sqrt_le_sqrt_iff hy).mpr hdiv
    · intro h
      have hdiv : kT / m ≤ u0 ^ 2 := (Real.sqrt_le_sqrt_iff hy).mp h
      rw [div_le_iff₀ hm] at hdiv
      linarith
  exact hsign.trans (hrecip.trans hspeed)

/-- `p = C n³` differentiates to `3 C n²`, which is `3 p / n`.

This is the one-dimensional adiabatic law. `f = 1` gives `γ = 3`. -/
theorem gamma_three (C n : ℝ) (hn : n ≠ 0) :
    (3 * (C * n ^ 3)) / n = 3 * C * n ^ 2 := by
  field_simp [hn]

/-- Isothermal electrons plus `γ_i = 3` fix the sound speed squared. -/
theorem warm_sound_eq (kTe kTi m : ℝ) (hm : 0 < m) (hsum : 0 ≤ kTe + 3 * kTi) :
    (kTe + 3 * kTi) / m = warmSoundSpeed kTe kTi m ^ 2 := by
  unfold warmSoundSpeed
  rw [Real.sq_sqrt (by positivity : (0 : ℝ) ≤ (kTe + 3 * kTi) / m)]

/-- `γ_i = 5/3` is not the one-dimensional closure. -/
theorem three_fifths_not_one_dimensional (kTe kTi m : ℝ) (hm : m ≠ 0) (hTi : kTi ≠ 0) :
    (kTe + (5 / 3) * kTi) / m ≠ (kTe + 3 * kTi) / m := by
  intro hEq
  have : (5 / 3 : ℝ) * kTi = 3 * kTi := by
    field_simp [hm] at hEq
    linarith
  have : (5 / 3 : ℝ) = 3 := by
    apply mul_right_cancel₀ hTi
    linarith
  norm_num at this

end PhysJS.BohmSheath
