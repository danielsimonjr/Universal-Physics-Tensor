/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-208`. Bridge. Ideal Brayton cycle efficiency.

The catalog equation is

```
η = 1 − r_p^((1 − γ) / γ)
```

`brayton_eq` derives it from two isentropic legs between the same pressures,
`T2 / T1 = T3 / T4 = r_p^((γ − 1) / γ)`, and the isobaric heats
`Q_in = c_p (T3 − T2)`, `Q_out = c_p (T4 − T1)`. `poisson_ratio` proves
the isentropic temperature ratio itself from `p V^γ = const` and the ideal
gas law `p V = n R T`, so the exponent `(γ − 1) / γ` is derived, not assumed.
`brayton_ne_otto` records that this is not the Otto exponent `1 − γ` of
`be-162`. A temperature-dependent heat capacity or losses are not this row.
-/

namespace PhysJS.BraytonCycle

open Real

/-- Isentropic temperature ratio from `p V^γ = const` and `p V = k T`
(`k = n R`): `T2 = T1 (p2 / p1)^((γ − 1) / γ)`. -/
theorem poisson_ratio (T1 T2 p1 p2 V1 V2 k γ : ℝ)
    (hT1 : 0 < T1) (hT2 : 0 < T2) (hp1 : 0 < p1) (hp2 : 0 < p2) (hk : 0 < k)
    (hγ : 0 < γ)
    (hV1 : p1 * V1 = k * T1) (hV2 : p2 * V2 = k * T2)
    (hadiab : p1 * V1 ^ γ = p2 * V2 ^ γ) :
    T2 = T1 * (p2 / p1) ^ ((γ - 1) / γ) := by
  have hV1' : V1 = k * T1 / p1 := by field_simp; linarith
  have hV2' : V2 = k * T2 / p2 := by field_simp; linarith
  have hk' : 0 < k ^ γ := Real.rpow_pos_of_pos hk _
  have hT1' : 0 < T1 ^ γ := Real.rpow_pos_of_pos hT1 _
  have hT2' : 0 < T2 ^ γ := Real.rpow_pos_of_pos hT2 _
  have hp1' : 0 < p1 ^ γ := Real.rpow_pos_of_pos hp1 _
  have hp2' : 0 < p2 ^ γ := Real.rpow_pos_of_pos hp2 _
  rw [hV1', hV2', Real.div_rpow (by positivity) hp1.le, Real.div_rpow (by positivity) hp2.le,
    Real.mul_rpow hk.le hT1.le, Real.mul_rpow hk.le hT2.le] at hadiab
  -- (T2/T1)^γ = (p2/p1)^(γ-1)
  have hratio : (T2 / T1) ^ γ = (p2 / p1) ^ (γ - 1) := by
    rw [Real.div_rpow hT2.le hT1.le, Real.rpow_sub_one (by positivity), Real.div_rpow hp2.le hp1.le]
    field_simp
    field_simp at hadiab
    nlinarith [hadiab]
  have hx : 0 ≤ T2 / T1 := by positivity
  have hγ0 : γ ≠ 0 := hγ.ne'
  have h1 : T2 / T1 = ((T2 / T1) ^ γ) ^ γ⁻¹ := (Real.rpow_rpow_inv hx hγ0).symm
  rw [hratio, ← Real.rpow_mul (by positivity)] at h1
  have : T2 / T1 = (p2 / p1) ^ ((γ - 1) / γ) := by
    rw [h1]; congr 1
  field_simp at this ⊢
  linarith

/-- Ideal Brayton efficiency from the two isentropic ratios and the isobaric
heats.

`h2`, `h3` are the isentropic temperature ratios of the compression `1 → 2` and
the expansion `3 → 4`. `hη` is `η = 1 − Q_out / Q_in`.

Constant `γ` and
`c_p`; no component losses. -/
theorem brayton_eq (η rp γ T1 T2 T3 T4 cp Qin Qout : ℝ)
    (hrp : 0 < rp) (hcp : cp ≠ 0) (hspan : T3 - T2 ≠ 0)
    (h2 : T2 = T1 * rp ^ ((γ - 1) / γ))
    (h3 : T3 = T4 * rp ^ ((γ - 1) / γ))
    (hQin : Qin = cp * (T3 - T2))
    (hQout : Qout = cp * (T4 - T1))
    (hη : η = 1 - Qout / Qin) :
    η = 1 - rp ^ ((1 - γ) / γ) := by
  have hdiff : T3 - T2 = (T4 - T1) * rp ^ ((γ - 1) / γ) := by
    rw [h2, h3]; ring
  have hrpow : rp ^ ((γ - 1) / γ) ≠ 0 := (Real.rpow_pos_of_pos hrp _).ne'
  have hTdiff : T4 - T1 ≠ 0 := by
    intro hzero
    apply hspan
    rw [hdiff, hzero, zero_mul]
  have hratio : Qout / Qin = rp ^ ((1 - γ) / γ) := by
    rw [hQin, hQout, hdiff]
    have hstep : (cp * (T4 - T1)) / (cp * ((T4 - T1) * rp ^ ((γ - 1) / γ))) =
        1 / rp ^ ((γ - 1) / γ) := by
      field_simp [hcp, hTdiff, hrpow]
    rw [hstep, one_div, ← Real.rpow_neg hrp.le]
    exact congrArg (fun z => rp ^ z) (by ring)
  rw [hη, hratio]

/-- Control: for `γ ≠ 1` the Brayton exponent is not the Otto exponent `1 − γ`,
and for `r_p > 1` the two efficiencies differ. -/
theorem brayton_ne_otto (rp γ : ℝ) (hrp : 1 < rp) (hγ : 0 < γ) (hγ1 : γ ≠ 1) :
    1 - rp ^ ((1 - γ) / γ) ≠ 1 - rp ^ (1 - γ) := by
  intro h
  have h1 : rp ^ ((1 - γ) / γ) = rp ^ (1 - γ) := by linarith
  have h2 : (1 - γ) / γ = 1 - γ := by
    apply le_antisymm
    · exact (Real.rpow_le_rpow_left_iff hrp).mp h1.le
    · exact (Real.rpow_le_rpow_left_iff hrp).mp h1.ge
  have hγ0 : γ ≠ 0 := hγ.ne'
  field_simp at h2
  apply hγ1
  nlinarith [h2]

/-- Control: `0 < η < 1` for `r_p > 1` and `γ > 1`. -/
theorem efficiency_between (rp γ : ℝ) (hrp : 1 < rp) (hγ : 1 < γ) :
    0 < 1 - rp ^ ((1 - γ) / γ) ∧ 1 - rp ^ ((1 - γ) / γ) < 1 := by
  have hneg : (1 - γ) / γ < 0 := div_neg_of_neg_of_pos (by linarith) (by linarith)
  constructor
  · have := Real.rpow_lt_one_of_one_lt_of_neg hrp hneg
    linarith
  · have := Real.rpow_pos_of_pos (by linarith : (0 : ℝ) < rp) ((1 - γ) / γ)
    linarith

end PhysJS.BraytonCycle
