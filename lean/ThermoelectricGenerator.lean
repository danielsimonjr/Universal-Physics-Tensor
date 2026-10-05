/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-130`. Bridge. Thermoelectric generator efficiency at optimum current.

The catalog equation is

```
η = (1 − T_c / T_h) (√(1 + Z T_m) − 1) / (√(1 + Z T_m) + T_c / T_h)
```

with `Z = S² / (R K)` and `T_m = (T_h + T_c) / 2`. `efficiency_eq` derives
it. Properties are constant. The hot-junction heat is

```
Q = S T_h I − I² R / 2 − K ΔT
```

where `ΔT = T_c − T_h`, so `−K ΔT` is the conduction the hot reservoir
replaces. The `1/2` splits Joule heat between the junctions. Electrical
power is `I² R_load`, written `P = I (S (T_h − T_c) − I R)` because the
load that draws current `I` is `R_load = S (T_h − T_c) / I − R`.
`dη/dI = 0` is `P' Q = P Q'`. The positive root is the current at
`m = √(1 + Z T_m)`, with `m = R_load / R`. Matched load is `m = 1`, a
different stationary point. Carnot's `1 − T_c/T_h` is not this efficiency.
-/

namespace PhysJS.ThermoelectricGenerator

/-- Load power `P = I (S Δ − I R)`, with `Δ = T_h − T_c`. -/
noncomputable def electricPower (S R Δ I : ℝ) : ℝ :=
  I * (S * Δ - I * R)

/-- Hot-junction heat. `ΔT = T_c − T_h`, so the conduction term is `−K ΔT`. -/
noncomputable def hotHeat (S R K Th ΔT I : ℝ) : ℝ :=
  S * Th * I - I ^ 2 * R / 2 - K * ΔT

/-- The `2` in `P'` is the derivative of `I²`. -/
theorem power_slope (S R Δ I : ℝ) :
    HasDerivAt (electricPower S R Δ) (S * Δ - 2 * R * I) I := by
  have hid := hasDerivAt_id I
  have hlin : HasDerivAt (fun t => S * Δ * t) (S * Δ * 1) I := hid.const_mul (S * Δ)
  have hsq : HasDerivAt (fun t => t ^ 2) (2 * I) I := by
    simpa using hasDerivAt_pow 2 I
  have hjoule : HasDerivAt (fun t => R * t ^ 2) (R * (2 * I)) I := hsq.const_mul R
  have hsub := hlin.sub hjoule
  have hfun : (fun t => S * Δ * t - R * t ^ 2) = electricPower S R Δ := by
    ext t
    simp [electricPower]
    ring
  rw [← hfun]
  exact hsub.congr_deriv (by ring)

/-- The Joule `1/2` differentiates to one factor of `R I`, not two. -/
theorem heat_slope (S R K Th ΔT I : ℝ) :
    HasDerivAt (hotHeat S R K Th ΔT) (S * Th - R * I) I := by
  have hid := hasDerivAt_id I
  have hlin : HasDerivAt (fun t => S * Th * t) (S * Th) I := by
    simpa [mul_one] using hid.const_mul (S * Th)
  have hsq : HasDerivAt (fun t => t ^ 2) (2 * I) I := by
    simpa using hasDerivAt_pow 2 I
  have hjoule : HasDerivAt (fun t => (R / 2) * t ^ 2) ((R / 2) * (2 * I)) I := hsq.const_mul (R / 2)
  have hconst : HasDerivAt (fun _ : ℝ => K * ΔT) 0 I := hasDerivAt_const I _
  have hsum := (hlin.sub hjoule).sub hconst
  have hfun : (fun t => S * Th * t - (R / 2) * t ^ 2 - K * ΔT) = hotHeat S R K Th ΔT := by
    ext t
    simp [hotHeat, div_eq_mul_inv]
    ring
  rw [← hfun]
  exact hsum.congr_deriv (by ring)

/-- `P' Q − P Q'` is the quadratic whose root is the efficiency optimum.
`Δ = T_h − T_c` and `T_m = (T_h + T_c) / 2`. The sign in front of `K`
uses `Q = S T_h I − I² R / 2 + K Δ`, the report's `−K ΔT` at `ΔT = −Δ`. -/
theorem balance_quadratic (S R K Th Tc I P Q Δ Tm : ℝ)
    (hΔ : Δ = Th - Tc) (hTm : Tm = (Th + Tc) / 2)
    (hP : P = I * (S * Δ - I * R))
    (hQ : Q = S * Th * I - I ^ 2 * R / 2 + K * Δ) :
    (S * Δ - 2 * R * I) * Q - P * (S * Th - R * I) =
      -(R * S * Tm * I ^ 2 + 2 * R * K * Δ * I - S * K * Δ ^ 2) := by
  rw [hP, hQ, hΔ, hTm]
  ring

/-- The current `I = S Δ / (R (1 + m))` at `m² = 1 + Z T_m` kills that quadratic. -/
theorem quadratic_zero (S R K I Δ Tm Z m : ℝ)
    (hS : S ≠ 0) (hR : R ≠ 0) (hK : K ≠ 0) (hΔ : Δ ≠ 0) (_hTm : Tm ≠ 0)
    (hm1 : (1 : ℝ) + m ≠ 0) (_hZ0 : Z ≠ 0)
    (hZ : Z = S ^ 2 / (R * K))
    (hm : m ^ 2 = 1 + Z * Tm)
    (hI : I = S * Δ / (R * (1 + m))) :
    R * S * Tm * I ^ 2 + 2 * R * K * Δ * I - S * K * Δ ^ 2 = 0 := by
  have hZm : Z * Tm = m ^ 2 - 1 := by linarith
  have hS2 : S ^ 2 = Z * R * K := by
    have h := hZ
    field_simp [hR, hK] at h
    linarith
  have hnorm : (R * S * Tm * (S * Δ / (R * (1 + m))) ^ 2 +
        2 * R * K * Δ * (S * Δ / (R * (1 + m))) - S * K * Δ ^ 2) / (S * K * Δ ^ 2) =
      Z * Tm / (1 + m) ^ 2 + 2 / (1 + m) - 1 := by
    field_simp [hR, hK, hS, hΔ, hm1]
    rw [hS2]
    field_simp [hR, hK, hm1]
  have hrest : Z * Tm / (1 + m) ^ 2 + 2 / (1 + m) - 1 = 0 := by
    rw [hZm]
    have hm2 : m ^ 2 - 1 = (m - 1) * (m + 1) := by ring
    rw [hm2]
    field_simp [hm1]
    ring
  have hdiv : (R * S * Tm * I ^ 2 + 2 * R * K * Δ * I - S * K * Δ ^ 2) / (S * K * Δ ^ 2) = 0 := by
    rw [hI, hnorm, hrest]
  have hden : S * K * Δ ^ 2 ≠ 0 := mul_ne_zero (mul_ne_zero hS hK) (pow_ne_zero 2 hΔ)
  exact (div_eq_zero_iff.mp hdiv).resolve_right hden

/-- Optimum efficiency. `Δ = T_h − T_c`. -/
theorem efficiency_value (S R K Th Tc I P Q η Z Tm m Δ : ℝ)
    (hS : S ≠ 0) (hR : R ≠ 0) (hK : K ≠ 0) (hTh : Th ≠ 0) (hΔ0 : Δ ≠ 0)
    (hm1 : (1 : ℝ) + m ≠ 0) (hQ0 : Q ≠ 0) (hden : Th * m + Tc ≠ 0)
    (hΔ : Δ = Th - Tc) (hTm : Tm = (Th + Tc) / 2) (hTm0 : Tm ≠ 0) (hZ0 : Z ≠ 0)
    (hmne : m ≠ 1)
    (hZ : Z = S ^ 2 / (R * K))
    (hm : m ^ 2 = 1 + Z * Tm)
    (hI : I = S * Δ / (R * (1 + m)))
    (hP : P = I * (S * Δ - I * R))
    (hQ : Q = S * Th * I - I ^ 2 * R / 2 + K * Δ)
    (hη : η = P / Q) :
    η = (Δ / Th) * (m - 1) / (m + Tc / Th) := by
  have hPsimp : P = S ^ 2 * Δ ^ 2 * m / (R * (1 + m) ^ 2) := by
    rw [hP, hI]
    field_simp [hR, hm1]
    ring
  have hQsimp : Q = S ^ 2 * Th * Δ / (R * (1 + m)) -
      S ^ 2 * Δ ^ 2 / (2 * R * (1 + m) ^ 2) + K * Δ := by
    rw [hQ, hI]
    field_simp [hR, hm1]
  have hKR : K * R = S ^ 2 / Z := by
    have h := hZ
    field_simp [hR, hK, hZ0] at h ⊢
    linarith
  have hZm : Z * Tm = m ^ 2 - 1 := by linarith
  have hKsub : K = S ^ 2 / (Z * R) := by
    have h := hKR
    field_simp [hR, hZ0] at h ⊢
    linarith
  have hcross : P * (Th * m + Tc) = Q * Δ * (m - 1) := by
    rw [hPsimp, hQsimp, hKsub]
    field_simp [hR, hm1, hZ0, hΔ0]
    have hTh' : Th = Tm + Δ / 2 := by
      rw [hTm, hΔ]
      ring
    have hTc' : Tc = Tm - Δ / 2 := by
      rw [hTm, hΔ]
      ring
    rw [hTh', hTc']
    have hZval : Z = (m ^ 2 - 1) / Tm := by
      have h := hZm
      field_simp [hTm0] at h ⊢
      linarith
    rw [hZval]
    field_simp [hTm0]
    ring
  have htarget : (Δ / Th) * (m - 1) / (m + Tc / Th) = Δ * (m - 1) / (Th * m + Tc) := by
    field_simp [hTh]
  rw [hη, htarget]
  apply (div_eq_div_iff hQ0 hden).mpr
  calc
    P * (Th * m + Tc) = Q * Δ * (m - 1) := hcross
    _ = Δ * (m - 1) * Q := by ring

/-- Generator efficiency at the current that maximizes it.

`ΔT = T_c − T_h` is the report's conduction sign. `m` is the positive
square root of `1 + Z T_m`. Power and heat are `electricPower` and
`hotHeat`. Stationarity is `P' Q = P Q'`.

Kind `bridge` on `PhysJS.ThermoelectricGenerator.efficiency_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not Carnot alone, and not the matched load `m = 1`. -/
theorem efficiency_eq
    (S R K Th Tc I P Q η Z Tm m Δ ΔT : ℝ)
    (hS : S ≠ 0) (hR : R ≠ 0) (hK : K ≠ 0) (hTh : Th ≠ 0) (hTc : Th ≠ Tc)
    (hTm0 : Tm ≠ 0) (hZ0 : Z ≠ 0) (hm1 : (1 : ℝ) + m ≠ 0) (hmne : m ≠ 1)
    (hQ0 : Q ≠ 0) (hden : Th * m + Tc ≠ 0) (hmnonneg : 0 ≤ m)
    (hΔT : ΔT = Tc - Th) (hΔ : Δ = Th - Tc) (hTm : Tm = (Th + Tc) / 2)
    (hZ : Z = S ^ 2 / (R * K))
    (hm : m ^ 2 = 1 + Z * Tm)
    (hI : I = S * Δ / (R * (1 + m)))
    (hP : P = electricPower S R Δ I)
    (hheat : Q = hotHeat S R K Th ΔT I)
    (hη : η = P / Q) :
    HasDerivAt (electricPower S R Δ) (S * Δ - 2 * R * I) I ∧
      HasDerivAt (hotHeat S R K Th ΔT) (S * Th - R * I) I ∧
      (S * Δ - 2 * R * I) * Q = P * (S * Th - R * I) ∧
      m = Real.sqrt (1 + Z * Tm) ∧
      η = (1 - Tc / Th) * (m - 1) / (m + Tc / Th) := by
  have hΔ0 : Δ ≠ 0 := by
    rw [hΔ]
    exact sub_ne_zero.mpr hTc
  have hQdef : Q = S * Th * I - I ^ 2 * R / 2 + K * Δ := by
    rw [hheat, hotHeat, hΔT, hΔ]
    ring
  have hPdef : P = I * (S * Δ - I * R) := by rw [hP, electricPower]
  have hquad := quadratic_zero S R K I Δ Tm Z m hS hR hK hΔ0 hTm0 hm1 hZ0 hZ hm hI
  have hbal := balance_quadratic S R K Th Tc I P Q Δ Tm hΔ hTm hPdef hQdef
  have hstat : (S * Δ - 2 * R * I) * Q - P * (S * Th - R * I) = 0 := by
    rw [hbal, hquad]
    ring
  have hηval := efficiency_value S R K Th Tc I P Q η Z Tm m Δ hS hR hK hTh hΔ0 hm1 hQ0 hden
    hΔ hTm hTm0 hZ0 hmne hZ hm hI hPdef hQdef hη
  have hcarnot : (1 - Tc / Th) * (m - 1) / (m + Tc / Th) =
      (Δ / Th) * (m - 1) / (m + Tc / Th) := by
    rw [hΔ]
    field_simp [hTh]
  refine ⟨power_slope S R Δ I, heat_slope S R K Th ΔT I, by linarith, ?_, ?_⟩
  · calc
      m = Real.sqrt (m ^ 2) := (Real.sqrt_sq hmnonneg).symm
      _ = Real.sqrt (1 + Z * Tm) := by rw [hm]
  · rw [hηval, hcarnot]

/-- Matched load `R_load = R` is `I = S Δ / (2 R)`. It is not stationary when `Z T_m ≠ 0`. -/
theorem matched_not_optimum (S R K Th Tc I P Q Δ Tm Z : ℝ)
    (hS : S ≠ 0) (hR : R ≠ 0) (hK : K ≠ 0) (hΔ : Δ ≠ 0) (hTm : Tm ≠ 0) (hZ : Z ≠ 0)
    (hlink : S ^ 2 = Z * R * K)
    (hΔdef : Δ = Th - Tc) (hTmdef : Tm = (Th + Tc) / 2)
    (hI : I = S * Δ / (2 * R))
    (hP : P = I * (S * Δ - I * R))
    (hQ : Q = S * Th * I - I ^ 2 * R / 2 + K * Δ) :
    (S * Δ - 2 * R * I) * Q ≠ P * (S * Th - R * I) := by
  intro hEq
  have hbal := balance_quadratic S R K Th Tc I P Q Δ Tm hΔdef hTmdef hP hQ
  have hquad : R * S * Tm * I ^ 2 + 2 * R * K * Δ * I - S * K * Δ ^ 2 = 0 := by
    have hdiff : (S * Δ - 2 * R * I) * Q - P * (S * Th - R * I) = 0 := by linarith
    rw [hbal] at hdiff
    linarith
  have hE : R * S * Tm * I ^ 2 + 2 * R * K * Δ * I - S * K * Δ ^ 2 =
      S * S ^ 2 * Tm * Δ ^ 2 / (4 * R) := by
    rw [hI]
    field_simp [hR]
    ring
  rw [hE, hlink] at hquad
  field_simp [hR] at hquad
  have hzero : S * Z * K * Tm * Δ ^ 2 = 0 := by linarith
  exact mul_ne_zero (mul_ne_zero (mul_ne_zero (mul_ne_zero hS hZ) hK) hTm)
    (pow_ne_zero 2 hΔ) hzero

/-- The Carnot factor alone is not the generator efficiency when `T_h + T_c ≠ 0`
and the junctions differ. -/
theorem not_carnot (Th Tc m : ℝ) (hTh : Th ≠ 0) (hsum : Th + Tc ≠ 0) (hΔ : Th ≠ Tc)
    (hmden : m + Tc / Th ≠ 0) :
    (1 - Tc / Th) * (m - 1) / (m + Tc / Th) ≠ 1 - Tc / Th := by
  intro hEq
  have hcar : (1 : ℝ) - Tc / Th ≠ 0 := by
    intro hzero
    have : Th = Tc := by
      have h := congrArg (fun y => y * Th) hzero
      have hleft : ((1 : ℝ) - Tc / Th) * Th = Th - Tc := by
        calc
          ((1 : ℝ) - Tc / Th) * Th = Th - Tc / Th * Th := by ring
          _ = Th - Tc := by rw [div_mul_cancel₀ Tc hTh]
      rw [hleft] at h
      linarith
    exact hΔ this
  rw [div_eq_iff hmden] at hEq
  have hdiff : (1 - Tc / Th) * ((m - 1) - (m + Tc / Th)) = 0 := by
    have : (1 - Tc / Th) * (m - 1) - (1 - Tc / Th) * (m + Tc / Th) = 0 := by linarith
    convert this using 1
    ring
  have hfac : (1 - Tc / Th) * (-(1 + Tc / Th)) = 0 := by
    convert hdiff using 1
    ring
  rcases mul_eq_zero.mp hfac with h | h
  · exact hcar h
  · have hratio : (1 : ℝ) + Tc / Th = 0 := by linarith
    have hzero : Th + Tc = 0 := by
      calc
        Th + Tc = (1 + Tc / Th) * Th := by
          calc
            Th + Tc = Th + Tc / Th * Th := by rw [div_mul_cancel₀ Tc hTh]
            _ = (1 + Tc / Th) * Th := by ring
        _ = 0 := by rw [hratio, zero_mul]
    exact hsum hzero

end PhysJS.ThermoelectricGenerator
